// noinspection ES6PreferShortImport
import { Config, Debug } from "./.config/config";

import {
    Box, Fixture, Settings, Vec2, World
} from "planck";
import type { WebSocket } from "uWebSockets.js";

import { type PlayerContainer } from "./server";
import { Map } from "./map";

import { Player } from "./objects/player";
import { type Obstacle } from "./objects/obstacle";
import { type Explosion } from "./objects/explosion";
import { v2v } from "./utils/misc";

import { UpdatePacket } from "./packets/sending/updatePacket";
import { type GameObject } from "./types/gameObject";

import { log } from "../../common/src/utils/misc";
import { ObjectCategory } from "../../common/src/constants";
import { ObjectType } from "../../common/src/utils/objectType";
import { Bullet, DamageRecord } from "./objects/bullet";
import { type BulletDefinition } from "../../common/src/definitions/bullets";
import { type GunDefinition } from "../../common/src/definitions/guns";
import { type KillFeedPacket } from "./packets/sending/killFeedPacket";

export class Game {
    map: Map;

    world: World;

    staticObjects = new Set<GameObject>(); // A Set of all the static objects in the world
    dynamicObjects = new Set<GameObject>(); // A Set of all the dynamic (moving) objects in the world
    visibleObjects: Record<number, Record<number, Record<number, Set<GameObject>>>> = {};
    updateObjects = false;

    private _aliveCount = 0;
    aliveCountDirty = false;

    partialDirtyObjects = new Set<GameObject>();
    fullDirtyObjects = new Set<GameObject>();
    deletedObjects = new Set<GameObject>();

    kills = new Set<KillFeedPacket>(); // All kills this tick

    players: Set<Player> = new Set<Player>();
    livingPlayers: Set<Player> = new Set<Player>();
    connectedPlayers: Set<Player> = new Set<Player>();

    explosions: Set<Explosion> = new Set<Explosion>();
    bullets = new Set<Bullet>(); // All bullets that currently exist
    newBullets = new Set<Bullet>(); // All bullets created this tick
    damageRecords = new Set<DamageRecord>(); // All records of damage by bullets this tick

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

        // Handle bullet collisions
        this.world.on("begin-contact", contact => {
            const objectA = contact.getFixtureA().getUserData();
            const objectB = contact.getFixtureB().getUserData();
            if (objectA instanceof Bullet && objectA.distance <= objectA.maxDistance && !objectA.dead) {
                objectA.dead = true;
                this.damageRecords.add(new DamageRecord(objectB as GameObject, objectA.shooter, objectA));
            } else if (objectB instanceof Bullet && objectB.distance <= objectB.maxDistance && !objectB.dead) {
                objectB.dead = true;
                this.world.destroyBody(objectB.body);
                this.bullets.delete(objectB);
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
                }
            }

            // Do damage to objects hit by bullets
            for (const damageRecord of this.damageRecords) {
                const bullet = damageRecord.bullet;
                const definition = bullet.type.definition as BulletDefinition;
                //if (damageRecord.damaged.damageable) {
                if (damageRecord.damaged instanceof Player) {
                    damageRecord.damaged.damage(definition.damage, damageRecord.damager);
                } else if (damageRecord.damaged.damage !== undefined) {
                    damageRecord.damaged.damage(definition.damage * definition.obstacleMultiplier, damageRecord.damager);
                }
                //}
                this.world.destroyBody(bullet.body);
                this.bullets.delete(bullet);
                this.damageRecords.delete(damageRecord);
            }

            // Update physics
            this.world.step(30);

            // First loop over players: Calculate movement
            for (const p of this.livingPlayers) {
                // This system allows opposite movement keys to cancel each other out.
                let xMovement = 0; let yMovement = 0;
                if (p.movingUp) yMovement++;
                if (p.movingDown) yMovement--;
                if (p.movingLeft) xMovement--;
                if (p.movingRight) xMovement++;
                const speed: number = (xMovement !== 0 && yMovement !== 0) ? Config.diagonalSpeed : Config.movementSpeed;
                p.setVelocity(xMovement * speed, yMovement * speed);

                if (p.moving || xMovement !== 0 || yMovement !== 0) {
                    p.moving = false;
                    this.partialDirtyObjects.add(p);
                }

                if (p.attackStart) {
                    p.attackStart = false;
                    if (p.weaponCooldownOver) {
                        if (p.activeWeapon.category === "melee") p.useMelee();
                        else if (p.activeWeapon.category === "gun") p.shootGun();
                    }
                } else if (p.attackHold && p.activeWeapon.category === "gun" && (p.activeWeaponDef as GunDefinition).fireMode === "auto") {
                    if (p.weaponCooldownOver) p.shootGun();
                }
            }

            for (const explosion of this.explosions) {
                explosion.explode();
            }

            // Second loop over players: calculate visible objects & send updates
            for (const p of this.connectedPlayers) {
                if (!p.joined) continue;

                // Calculate visible objects
                if (p.movesSinceLastUpdate > 8 || this.updateObjects) {
                    p.updateVisibleObjects();
                }

                // Full objects
                if (this.fullDirtyObjects.size !== 0) {
                    for (const object of this.fullDirtyObjects) {
                        if (p.visibleObjects.has(object)) {
                            p.fullDirtyObjects.add(object);
                        }
                    }
                }

                // Partial objects
                if (this.partialDirtyObjects.size !== 0) { // && !p.fullUpdate) {
                    for (const object of this.partialDirtyObjects) {
                        if (p.visibleObjects.has(object) && !p.fullDirtyObjects.has(object)) {
                            p.partialDirtyObjects.add(object);
                        }
                    }
                }

                // Deleted objects
                if (this.deletedObjects.size !== 0) {
                    for (const object of this.deletedObjects) {
                        if (p.visibleObjects.has(object) && object !== p) {
                            p.deletedObjects.add(object);
                        }
                    }
                }

                for (const kill of this.kills) p.sendPacket(kill);
                p.sendPacket(new UpdatePacket(p));
            }

            // Reset everything
            this.fullDirtyObjects.clear();
            this.partialDirtyObjects.clear();
            this.deletedObjects.clear();
            this.explosions.clear();
            this.newBullets.clear();
            this.aliveCountDirty = false;
            if (this.kills.size > 0) this.kills = new Set<KillFeedPacket>();

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
        if (Debug.fixedSpawnLocation) {
            spawnLocation = Debug.spawnLocation;
        } else {
            spawnLocation = v2v(this.map.getRandomPositionFor(ObjectType.categoryOnly(ObjectCategory.Player)));
        }
        // Player is added to the players array in server/src/packets/receiving/joinPacket.ts
        return new Player(this, name, socket, spawnLocation);
    }

    removePlayer(player: Player): void {
        player.disconnected = true;
        if (!player.dead) this.aliveCount--;
        player.rotation = 0;
        this.partialDirtyObjects.add(player);
        this.players.delete(player);
        this.livingPlayers.delete(player);
        this.connectedPlayers.delete(player);
        try {
            player.socket.close();
        } catch (e) {}
    }

    get aliveCount(): number {
        return this._aliveCount;
    }

    set aliveCount(aliveCount: number) {
        this._aliveCount = aliveCount;
        this.aliveCountDirty = true;
    }

    _nextObjectId = -1;
    get nextObjectId(): number {
        this._nextObjectId++;
        return this._nextObjectId;
    }
}
