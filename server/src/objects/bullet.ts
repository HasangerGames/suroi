import { Player } from "./player";
import { type Game } from "../game";
import { distance, distanceSquared, normalizeAngle } from "../../../common/src/utils/math";
import { type GunItem } from "../inventory/gunItem";
import { type Vector, v, vAdd, vMul, vClone } from "../../../common/src/utils/vector";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { Obstacle } from "./obstacle";
import { type GameObject } from "../types/gameObject";

export class Bullet {
    readonly game: Game;

    readonly initialPosition: Vector;

    position: Vector;

    rotation: number;

    readonly maxDistanceSquared: number;

    maxDistance: number;

    dead = false;

    readonly reflectionCount: number;
    readonly reflectedFromID: number;

    readonly source: GunItem;
    readonly shooter: Player;

    readonly velocity: Vector;

    definition: GunDefinition["ballistics"];

    constructor(game: Game, position: Vector, rotation: number, source: GunItem, shooter: Player, maxDistance = 0, reflectionCount = 0, reflectedFromID = -1) {
        this.game = game;
        this.initialPosition = vClone(position);
        this.position = position;
        this.rotation = rotation;
        this.source = source;
        this.shooter = shooter;
        this.reflectionCount = reflectionCount;
        this.reflectedFromID = reflectedFromID;

        this.definition = this.source.type.definition.ballistics;

        this.maxDistance = (maxDistance === 0) ? this.definition.maxDistance : maxDistance;

        this.maxDistanceSquared = this.maxDistance ** 2;

        this.velocity = vMul(vMul(v(Math.sin(rotation), -Math.cos(rotation)), this.definition.speed), 30);
    }

    update(): void {
        const oldPosition = vClone(this.position);

        this.position = vAdd(this.position, this.velocity);

        // Bullets from dead players should not deal damage
        if (this.shooter.dead) {
            this.dead = true;
            return;
        }

        if (distanceSquared(this.initialPosition, this.position) > this.maxDistanceSquared) {
            this.dead = true;
            this.position = vAdd(this.initialPosition, (vMul(v(Math.sin(this.rotation), -Math.cos(this.rotation)), this.maxDistance)));
        }

        const objects = new Set([...this.game.getVisibleObjects(this.position), ...this.game.livingPlayers]);

        const collisions: Array<{ intersection: { point: Vector, normal: Vector }, object: GameObject }> = [];

        for (const object of objects) {
            if (object.damageable && !object.dead && (object instanceof Obstacle || object instanceof Player) && object.id !== this.reflectedFromID) {
                const collision = object.hitbox?.intersectsLine(oldPosition, this.position);

                if (collision) {
                    collisions.push({
                        intersection: collision,
                        object
                    });
                }
            }
        }

        // Sort by closest to initial position
        collisions.sort((a, b) => {
            return distanceSquared(a.intersection?.point, this.initialPosition) - distanceSquared(b.intersection?.point, this.initialPosition);
        });

        for (const collision of collisions) {
            const object = collision.object;

            if (object instanceof Player) {
                this.position = collision.intersection.point;

                object.damage(this.definition.damage / (this.reflectionCount + 1), this.shooter, this.source.type);
                this.dead = true;
                break;
            } else if (object instanceof Obstacle) {
                object.damage(this.definition.damage / (this.reflectionCount + 1) * this.definition.obstacleMultiplier, this.shooter, this.source.type);

                // skip killing the bullet for obstacles with noCollisions like bushes
                if (!object.definition.noCollisions) {
                    this.position = collision.intersection.point;

                    if (object.definition.reflectBullets && this.reflectionCount < 4) {
                        this.reflect(collision.intersection.normal, object.id);
                    }

                    this.dead = true;
                    break;
                }
            }
        }
    }

    reflect(normal: Vector, objectId: number): void {
        const normalAngle = Math.atan2(normal.y, normal.x);

        const rotation = normalizeAngle(this.rotation + (normalAngle - this.rotation) * 2);

        this.game.addBullet(this.position, rotation, this.source, this.shooter, makeMaxDistance(this.maxDistance - distance(this.position, this.initialPosition), this.reflectionCount), this.reflectionCount + 1, objectId);
    }
}
function makeMaxDistance(leftDistance: number, reflectionCount: number): number {
    //If you want bullets to be the 'same' they were before then just return leftDistance
    return leftDistance * (1 - reflectionCount / 10);
}
