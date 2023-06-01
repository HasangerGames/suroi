// noinspection ES6PreferShortImport
import { Config } from "./config";

import {
    Box, Fixture, Settings, Vec2, World
} from "planck";
import type { WebSocket } from "uWebSockets.js";

import { type PlayerContainer } from "./server";
import { Map } from "./map";

import { Player } from "./objects/player";
import { type Obstacle } from "./objects/obstacle";
import { type Explosion } from "./objects/explosion";
import {
    lerp, v2v, vecLerp
} from "./utils/misc";

import { UpdatePacket } from "./packets/sending/updatePacket";
import { type GameObject } from "./types/gameObject";

import { log } from "../../common/src/utils/misc";
import { ObjectCategory } from "../../common/src/constants";
import { ObjectType } from "../../common/src/utils/objectType";
import { Bullet, DamageRecord } from "./objects/bullet";
import { KillFeedPacket } from "./packets/sending/killFeedPacket";
import { JoinKillFeedMessage } from "./types/killFeedMessage";
import { randomPointInsideCircle } from "../../common/src/utils/random";
import { GasMode, GasStages } from "./data/gasStages";
import { JoinedPacket } from "./packets/sending/joinedPacket";
import {
    v, vClone, type Vector
} from "../../common/src/utils/vector";
import { distance } from "../../common/src/utils/math";

export class Game {
    map: Map;

    world: World;

    staticObjects = new Set<GameObject>(); // A Set of all the static objects in the world
    dynamicObjects = new Set<GameObject>(); // A Set of all the dynamic (moving) objects in the world
    visibleObjects: Record<number, Record<number, Record<number, Set<GameObject>>>> = {};
    updateObjects = false;

    aliveCountDirty = false;

    partialDirtyObjects = new Set<GameObject>();
    fullDirtyObjects = new Set<GameObject>();
    deletedObjects = new Set<GameObject>();

    killFeedMessages = new Set<KillFeedPacket>(); // All kill feed messages this tick

    livingPlayers: Set<Player> = new Set<Player>();
    connectedPlayers: Set<Player> = new Set<Player>();

    explosions: Set<Explosion> = new Set<Explosion>();
    bullets = new Set<Bullet>(); // All bullets that currently exist
    newBullets = new Set<Bullet>(); // All bullets created this tick
    deletedBulletIDs = new Set<number>();
    damageRecords = new Set<DamageRecord>(); // All records of damage by bullets this tick

    started = false;

    readonly gas = {
        stage: 0,
        mode: GasMode.Inactive,
        initialDuration: 0,
        countdownStart: 0,
        percentage: 0,
        oldPosition: v(360, 360),
        newPosition: v(360, 360),
        oldRadius: 534.6,
        newRadius: 534.6,
        currentPosition: v(360, 360),
        currentRadius: 534.6,
        damage: 0,
        ticksSinceLastDamage: 0
    };

    gasDirty = false;
    gasDurationDirty = false;

    tickTimes: number[] = [];

    constructor() {
        this.world = new World({ gravity: Vec2(0, 0) }); // Create the Planck.js World
        Settings.maxLinearCorrection = 0; // Prevents collision jitter
        Settings.maxTranslation = 12.5; // Allows bullets to travel fast

        // Collision filtering code:
        // - Players should collide with obstacles, but not with each other or with loot.
        // - Bullets should collide with players and obstacles, but not with each other or with loot.
        // - Loot should only collide with obstacles and other loot.
        Fixture.prototype.shouldCollide = function(that: Fixture): boolean {
            // Get the objects
            const thisObject = this.getUserData() as GameObject;
            const thatObject = that.getUserData() as GameObject;

            // Check if they should collide
            if (thisObject.is.player) return (thatObject as Player).collidesWith.player;
            else if (thisObject.is.obstacle) return (thatObject as Obstacle).collidesWith.obstacle;
            else if (thisObject.is.bullet) return (thatObject as Obstacle).collidesWith.bullet;
            else return false;
        };

        // this return type is technically not true, but it gets typescript to shut up
        const shouldDie = (object: unknown): object is Bullet => object instanceof Bullet && object.distance <= object.maxDistance && !object.dead;

        // Handle bullet collisions
        this.world.on("begin-contact", contact => {
            const objectA = contact.getFixtureA().getUserData();
            const objectB = contact.getFixtureB().getUserData();

            if (shouldDie(objectA)) {
                objectA.dead = true;
                this.damageRecords.add(new DamageRecord(objectB as GameObject, objectA.shooter, objectA));
            } else if (shouldDie(objectB)) {
                objectB.dead = true;
                this.damageRecords.add(new DamageRecord(objectA as GameObject, objectB.shooter, objectB));
            }
        });

        // Create world boundaries
        this.createWorldBoundary(360, -0.25, 360, 0);
        this.createWorldBoundary(-0.25, 360, 0, 360);
        this.createWorldBoundary(360, 720.25, 360, 0);
        this.createWorldBoundary(720.25, 360, 0, 360);

        // Generate map
        this.map = new Map(this);

        // Start the tick loop
        this.tick(30);
    }

    private createWorldBoundary(x: number, y: number, width: number, height: number): void {
        const boundary = this.world.createBody({
            type: "static",
            position: Vec2(x, y)
        });

        boundary.createFixture({
            shape: Box(width, height),
            userData: {
                isPlayer: false,
                isObstacle: true,
                collidesWith: {
                    player: true,
                    obstacle: false
                }
            }
        });
    }

    tick(delay: number): void {
        setTimeout(() => {
            const tickStart = Date.now();

            // Update bullets
            for (const bullet of this.bullets) {
                if (bullet.distance >= bullet.maxDistance) {
                    this.world.destroyBody(bullet.body);
                    this.bullets.delete(bullet);
                    // Note: Bullets that pass their maximum distance are automatically deleted by the client,
                    // so there's no need to add them to the list of deleted bullets
                }
            }

            // Do damage to objects hit by bullets
            for (const damageRecord of this.damageRecords) {
                const bullet = damageRecord.bullet;
                const definition = bullet.source.ballistics;
                //if (damageRecord.damaged.damageable) {
                if (damageRecord.damaged instanceof Player) {
                    damageRecord.damaged.damage(definition.damage, damageRecord.damager, bullet.sourceType);
                } else if (damageRecord.damaged.damage !== undefined) {
                    damageRecord.damaged.damage(definition.damage * definition.obstacleMultiplier, damageRecord.damager);
                }
                //}
                this.world.destroyBody(bullet.body);
                this.bullets.delete(bullet);
                this.deletedBulletIDs.add(bullet.id);
            }
            this.damageRecords.clear();

            // Handle explosions
            for (const explosion of this.explosions) {
                explosion.explode();
            }

            // Update gas
            if (this.gas.mode !== 0) {
                this.gas.percentage = (Date.now() - this.gas.countdownStart) / 1000 / this.gas.initialDuration;
                this.gasDurationDirty = true;
            }

            // Red zone damage
            this.gas.ticksSinceLastDamage++;
            let gasDamage = false;
            if (this.gas.ticksSinceLastDamage >= 67) {
                this.gas.ticksSinceLastDamage = 0;
                gasDamage = true;
                if (this.gas.mode === 2) {
                    this.gas.currentPosition = vecLerp(this.gas.oldPosition, this.gas.newPosition, this.gas.percentage);
                    this.gas.currentRadius = lerp(this.gas.percentage, this.gas.oldRadius, this.gas.newRadius);
                }
            }

            // Update physics
            this.world.step(30);

            // First loop over players: Movement, animations, & actions
            for (const player of this.livingPlayers) {
                // This system allows opposite movement keys to cancel each other out.
                const movement: Vector = v(0, 0);
                if (player.movement.up) movement.y++;
                if (player.movement.down) movement.y--;
                if (player.movement.left) movement.x--;
                if (player.movement.right) movement.x++;

                // This is the same as checking if they're both non-zero, because if either of them is zero, the product will be zero
                const speed = movement.x * movement.y !== 0 ? Config.diagonalSpeed : Config.movementSpeed;

                player.setVelocity(movement.x * speed, movement.y * speed);

                if (player.isMoving || player.turning) {
                    this.partialDirtyObjects.add(player);
                }

                // Shoot gun/use melee
                if (player.startedAttacking) {
                    player.activeItem.useItem();
                }

                // Gas damage
                if (gasDamage && this.isInGas(player.position)) {
                    player.damage(this.gas.damage);
                }

                player.turning = false;
                player.startedAttacking = false;
                player.stoppedAttacking = false;
            }

            // Second loop over players: calculate visible objects & send updates
            for (const player of this.connectedPlayers) {
                if (!player.joined) continue;

                // Calculate visible objects
                if (player.movesSinceLastUpdate > 8 || this.updateObjects) {
                    player.updateVisibleObjects();
                }

                // Full objects
                if (this.fullDirtyObjects.size !== 0) {
                    for (const object of this.fullDirtyObjects) {
                        if (player.visibleObjects.has(object)) {
                            player.fullDirtyObjects.add(object);
                        }
                    }
                }

                // Partial objects
                if (this.partialDirtyObjects.size !== 0) { // && !p.fullUpdate) {
                    for (const object of this.partialDirtyObjects) {
                        if (player.visibleObjects.has(object) && !player.fullDirtyObjects.has(object)) {
                            player.partialDirtyObjects.add(object);
                        }
                    }
                }

                // Deleted objects
                if (this.deletedObjects.size !== 0) {
                    for (const object of this.deletedObjects) {
                        if (player.visibleObjects.has(object) && object !== player) {
                            player.deletedObjects.add(object);
                        }
                    }
                }

                for (const message of this.killFeedMessages) player.sendPacket(message);
                player.sendPacket(new UpdatePacket(player));
            }

            // Reset everything
            this.fullDirtyObjects.clear();
            this.partialDirtyObjects.clear();
            this.deletedObjects.clear();
            this.newBullets.clear();
            this.deletedBulletIDs.clear();
            this.explosions.clear();
            this.aliveCountDirty = false;
            if (this.killFeedMessages.size > 0) this.killFeedMessages = new Set<KillFeedPacket>();

            for (const player of this.livingPlayers) {
                player.hitEffect = false;
            }

            // Record performance and start the next tick
            // THIS TICK COUNTER IS WORKING CORRECTLY!
            // It measures the time it takes to calculate a tick, not the time between ticks.
            const tickTime = Date.now() - tickStart;
            this.tickTimes.push(tickTime);

            if (this.tickTimes.length >= 200) {
                const mspt: number = this.tickTimes.reduce((a, b) => a + b) / this.tickTimes.length;
                log(`Average ms/tick: ${mspt}`, true);
                log(`Server load: ${((mspt / 30) * 100).toFixed(1)}%`);
                this.tickTimes = [];
            }

            const newDelay: number = Math.max(0, 30 - tickTime);
            this.tick(newDelay);
        }, delay);
    }

    addPlayer(socket: WebSocket<PlayerContainer>, name: string): Player {
        let spawnLocation: Vec2;
        if (Config.spawn.mode === "fixed") {
            spawnLocation = Config.spawn.position;
        } else {
            spawnLocation = v2v(this.map.getRandomPositionFor(ObjectType.categoryOnly(ObjectCategory.Player)));
        }
        // Player is added to the players array in server/src/packets/receiving/joinPacket.ts
        return new Player(this, name, socket, spawnLocation);
    }

    // Called when a JoinPacket is sent by the client
    activatePlayer(player: Player): void {
        const game = player.game;

        game.livingPlayers.add(player);
        game.connectedPlayers.add(player);
        game.dynamicObjects.add(player);
        game.fullDirtyObjects.add(player);
        game.updateObjects = true;
        game.aliveCountDirty = true;
        game.killFeedMessages.add(new KillFeedPacket(player, new JoinKillFeedMessage(player.name, true)));

        player.updateVisibleObjects();
        player.joined = true;
        player.sendPacket(new JoinedPacket(player));

        if (this.aliveCount > 1 && !this.started) {
            this.started = true;
            this.advanceGas();
        }
    }

    removePlayer(player: Player): void {
        player.disconnected = true;
        this.aliveCountDirty = true;
        if (!player.dead) {
            this.killFeedMessages.add(new KillFeedPacket(player, new JoinKillFeedMessage(player.name, false)));
        }
        player.rotation = 0;
        this.partialDirtyObjects.add(player);
        this.livingPlayers.delete(player);
        this.connectedPlayers.delete(player);
        try {
            player.socket.close();
        } catch (e) {}
    }

    get aliveCount(): number {
        return this.livingPlayers.size;
    }

    advanceGas(): void {
        if (Config.disableGas) return;
        const currentStage = GasStages[this.gas.stage + 1];
        if (currentStage === undefined) return;
        this.gas.stage++;
        this.gas.mode = currentStage.mode;
        this.gas.initialDuration = currentStage.duration;
        this.gas.percentage = 1;
        this.gas.countdownStart = Date.now();
        if (currentStage.mode === 1) {
            this.gas.oldPosition = vClone(this.gas.newPosition);
            if (currentStage.newRadius !== 0) {
                this.gas.newPosition = randomPointInsideCircle(this.gas.oldPosition, currentStage.oldRadius - currentStage.newRadius);
            } else {
                this.gas.newPosition = vClone(this.gas.oldPosition);
            }
            this.gas.currentPosition = vClone(this.gas.oldPosition);
            this.gas.currentRadius = currentStage.oldRadius;
        }
        this.gas.oldRadius = currentStage.oldRadius;
        this.gas.newRadius = currentStage.newRadius;
        this.gas.damage = currentStage.damage;
        this.gasDirty = true;
        this.gasDurationDirty = true;

        // Start the next stage
        if (currentStage.duration !== 0) {
            setTimeout(() => this.advanceGas(), currentStage.duration * 1000);
        }
    }

    isInGas(position: Vector): boolean {
        return distance(position, this.gas.currentPosition) >= this.gas.currentRadius;
    }

    _nextObjectID = -1;
    get nextObjectID(): number {
        this._nextObjectID++;
        return this._nextObjectID;
    }

    _nextBulletID = -1;
    get nextBulletID(): number {
        this._nextBulletID = (this._nextBulletID + 1) % 256; // Bullet IDs wrap back to 0 when they reach 255
        return this._nextBulletID;
    }
}
