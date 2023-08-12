import { Player } from "./player";
import { type Game } from "../game";
import { distanceSquared } from "../../../common/src/utils/math";
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

    dead = false;

    readonly source: GunItem;
    readonly shooter: Player;

    readonly velocity: Vector;

    definition: GunDefinition["ballistics"];

    constructor(game: Game, position: Vector, rotation: number, source: GunItem, shooter: Player) {
        this.game = game;
        this.initialPosition = vClone(position);
        this.position = position;
        this.rotation = rotation;
        this.source = source;
        this.shooter = shooter;

        this.definition = this.source.type.definition.ballistics;

        this.maxDistanceSquared = this.definition.maxDistance ** 2;

        this.velocity = vMul(vMul(v(Math.sin(rotation), -Math.cos(rotation)), this.definition.speed), 30);
    }

    update(): void {
        const oldPosition = vClone(this.position);

        this.position = vAdd(this.position, this.velocity);

        // Bullets from dead players should not deal damage
        if (this.shooter.dead || distanceSquared(this.initialPosition, this.position) > this.maxDistanceSquared) {
            this.dead = true;
            return;
        }

        const objects = new Set([...this.game.getVisibleObjects(this.position), ...this.game.livingPlayers]);

        const collisions: Array<{ pos: Vector, object: GameObject }> = [];

        for (const object of objects) {
            if (object.damageable && !object.dead && (object instanceof Obstacle || object instanceof Player)) {
                const collision = object.hitbox?.intersectsLine(oldPosition, this.position);

                if (collision) {
                    collisions.push({
                        pos: collision,
                        object
                    });
                }
            }
        }

        // Sort by closest to initial position
        collisions.sort((a, b) => {
            return distanceSquared(a.pos, this.initialPosition) - distanceSquared(b.pos, this.initialPosition);
        });

        for (const collision of collisions) {
            const object = collision.object;

            this.position = collision.pos;

            if (object instanceof Player) {
                object.damage(this.definition.damage, this.shooter, this.source.type);
                this.dead = true;
                break;
            } else if (object instanceof Obstacle) {
                object.damage?.(this.definition.damage * this.definition.obstacleMultiplier, this.shooter, this.source.type);

                // Obstacles with noCollisions like bushes
                if (!object.definition.noCollisions) {
                    this.dead = true;
                    break;
                }
            }
        }
    }
}
