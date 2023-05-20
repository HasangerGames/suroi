import { log } from "../../common/src/utils/misc";

import { Player } from "./objects/player";
import {
    Box,
    Fixture,
    Settings,
    Vec2,
    World
} from "planck";
import { Config } from "./configuration";
import { type WebSocket } from "uWebSockets.js";
import { type PlayerContainer } from "./server";
import { UpdatePacket } from "./packets/sending/updatePacket";
import { type GameObject } from "./types/gameObject";
import { Map } from "./map";
import { AnimationType } from "../../common/src/constants";
import { vRotate } from "../../common/src/utils/vector";
import { type CollisionRecord } from "../../common/src/utils/math";
import { CircleHitbox, type Hitbox } from "../../common/src/utils/hitbox";
import { type Obstacle } from "./objects/obstacle";
import { type Explosion } from "./objects/explosion";

export class Game {
    map: Map;

    world: World;

    staticObjects = new Set<GameObject>(); // A Set of all the static objects in the world
    dynamicObjects = new Set<GameObject>(); // A Set of all the dynamic (moving) objects in the world
    visibleObjects = {};
    updateObjects = false;

    private _aliveCount = 0;
    aliveCountDirty = false;

    partialDirtyObjects = new Set<GameObject>();
    fullDirtyObjects = new Set<GameObject>();
    deletedObjects = new Set<GameObject>();

    players: Set<Player> = new Set<Player>();
    livingPlayers: Set<Player> = new Set<Player>();
    connectedPlayers: Set<Player> = new Set<Player>();

    explosions: Set<Explosion> = new Set<Explosion>();

    tickTimes: number[] = [];

    constructor() {
        this.world = new World({ gravity: Vec2(0, 0) }); // Create the Planck.js World
        Settings.maxLinearCorrection = 0; // Prevents collision jitter
        Settings.maxTranslation = 5.0; // Allows bullets to travel fast

        // Collision filtering code:
        // - Players should collide with obstacles, but not with each other or with loot.
        // - Bullets should collide with players and obstacles, but not with each other or with loot.
        // - Loot should only collide with obstacles and other loot.
        Fixture.prototype.shouldCollide = function(that: Fixture): boolean {
            // Get the objects
            const thisObject = this.getUserData() as GameObject;
            const thatObject = that.getUserData() as GameObject;

            // Check if they should collide
            if (thisObject.isPlayer) return (thatObject as Player).collidesWith.player;
            else if (thisObject.isObstacle) return (thatObject as Obstacle).collidesWith.obstacle;
            else return false;
        };

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
            this.world.step(30);

            // First loop over players: Calculate movement
            for (const p of this.livingPlayers) {
                if (!p.joined) continue; // TODO Create a separate Set for active players

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

                if (p.punching) {
                    p.punching = false;
                    if (Date.now() - p.weaponCooldown > 250) {
                        p.weaponCooldown = Date.now();
                        p.animation.type = AnimationType.Punch;

                        /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */
                        p.animation.seq = !p.animation.seq;

                        const offset = Vec2(2.5, 0);
                        const rotated = vRotate(offset, p.rotation);
                        const position = Vec2(p.position.x + rotated.x, p.position.y - rotated.y);
                        const radius = 1.5;
                        const hitbox: Hitbox = new CircleHitbox(radius, position);

                        // Damage the closest object
                        let minDist = Number.MAX_VALUE;
                        let closestObject: GameObject | undefined;
                        for (const object of p.visibleObjects) {
                            if (!object.dead && object !== p) {
                                const record: CollisionRecord | undefined = object.hitbox?.distanceTo(hitbox);
                                if (record?.collided === true && record.distance < minDist) {
                                    minDist = record.distance;
                                    closestObject = object;
                                }
                            }
                        }
                        if (closestObject !== undefined) {
                            setTimeout(() => {
                                if (closestObject?.dead === false) closestObject.damage(20, p);
                            }, 50);
                            //if (closestObject.interactable) this.interactWith(closestObject as Obstacle);
                        }
                    }
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

                p.sendPacket(new UpdatePacket(p));
            }

            // Reset everything
            this.fullDirtyObjects.clear();
            this.partialDirtyObjects.clear();
            this.deletedObjects.clear();
            this.explosions.clear();
            this.aliveCountDirty = false;

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
        const player = new Player(this, name, socket, Vec2(10, 10));
        this.players.add(player);
        this.livingPlayers.add(player);
        this.aliveCount++;
        this.connectedPlayers.add(player);
        return player;
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
