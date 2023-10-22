import { TICKS_PER_SECOND } from "../../../common/src/constants";
import { BaseBullet } from "../../../common/src/utils/baseBullet";
import { RectangleHitbox } from "../../../common/src/utils/hitbox";
import { normalizeAngle } from "../../../common/src/utils/math";
import { randomFloat } from "../../../common/src/utils/random";
import { v, vAdd, vMul, type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GunItem } from "../inventory/gunItem";
import { type GameObject } from "../types/gameObject";
import { type Explosion } from "./explosion";
import { Obstacle } from "./obstacle";
import { Player } from "./player";

type Weapon = GunItem | Explosion;

export interface DamageRecord {
    readonly object: Obstacle | Player
    readonly damage: number
    readonly weapon: Weapon
    readonly source: GameObject
    readonly position: Vector
}

export interface ServerBulletOptions {
    readonly position: Vector
    readonly rotation: number
    readonly reflectionCount?: number
    readonly variance?: number
}

export class Bullet extends BaseBullet {
    readonly game: Game;

    readonly sourceGun: Weapon;
    readonly shooter: GameObject;

    constructor(
        game: Game,
        source: Weapon,
        shooter: GameObject,
        options: ServerBulletOptions
    ) {
        const variance = source.definition.ballistics.variance;
        super({
            ...options,
            rotation: normalizeAngle(options.rotation),
            source: source.definition,
            sourceID: shooter.id,
            variance: variance ? randomFloat(0, variance) : undefined
        });

        this.game = game;
        this.sourceGun = source;
        this.shooter = shooter;
    }

    update(): DamageRecord[] {
        const lineRect = RectangleHitbox.fromLine(this.position, vAdd(this.position, vMul(this.velocity, TICKS_PER_SECOND)));

        const objects = this.game.grid.intersectsRect(lineRect);
        const collisions = this.updateAndGetCollisions(TICKS_PER_SECOND, objects);

        // Bullets from dead players should not deal damage so delete them
        // Also delete bullets out of map bounds
        if (this.shooter.dead ||
            this.position.x < 0 || this.position.x > this.game.map.width ||
            this.position.y < 0 || this.position.y > this.game.map.height) {
            this.dead = true;
            return [];
        }

        const records: DamageRecord[] = [];

        for (const collision of collisions) {
            const object = collision.object;

            if (object instanceof Player) {
                this.position = collision.intersection.point;
                this.damagedIDs.add(object.id);
                records.push({
                    object,
                    damage: this.definition.damage / (this.reflectionCount + 1),
                    weapon: this.sourceGun,
                    source: this.shooter,
                    position: collision.intersection.point
                });

                if (this.definition.penetration?.players) continue;
                this.dead = true;
                break;
            }

            if (object instanceof Obstacle) {
                this.damagedIDs.add(object.id);
                records.push({
                    object,
                    damage: this.definition.damage / (this.reflectionCount + 1) * this.definition.obstacleMultiplier,
                    weapon: this.sourceGun,
                    source: this.shooter,
                    position: collision.intersection.point
                });

                if (this.definition.penetration?.obstacles && !object.definition.impenetrable) continue;

                // skip killing the bullet for obstacles with noCollisions like bushes
                if (!object.definition.noCollisions) {
                    this.position = collision.intersection.point;

                    if (object.definition.reflectBullets && this.reflectionCount < 3) {
                        this.reflect(collision.intersection.normal);
                    }

                    this.dead = true;
                    break;
                }
            }
        }

        return records;
    }

    reflect(normal: Vector): void {
        const rotation = normalizeAngle(2 * Math.atan2(normal.y, normal.x) - this.rotation);

        this.game.addBullet(
            this.sourceGun,
            this.shooter,
            {
                // move it a bit so it won't collide again with the same hitbox
                position: vAdd(this.position, v(Math.sin(rotation), -Math.cos(rotation))),
                rotation,
                reflectionCount: this.reflectionCount + 1,
                variance: this.variance
            }
        );
    }
}
