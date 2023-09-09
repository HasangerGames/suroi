import { Player } from "./player";
import { type Game } from "../game";
import { normalizeAngle } from "../../../common/src/utils/math";
import { GunItem } from "../inventory/gunItem";
import { vAdd, vMul, type Vector } from "../../../common/src/utils/vector";
import { BaseBullet, BulletOptions } from "../../../common/src/utils/baseBullet";
import { Obstacle } from "./obstacle";
import { type GameObject } from "../types/gameObject";
import { ObjectCategory, TICK_SPEED } from "../../../common/src/constants";
import { RectangleHitbox } from "../../../common/src/utils/hitbox";
import { ObjectType } from "../../../common/src/utils/objectType";
import { ExplosionDefinition } from "../../../common/src/definitions/explosions";
import { Explosion } from "./explosion";
import { randomFloat } from "../../../common/src/utils/random";

type Weapon = GunItem | ObjectType<ObjectCategory.Explosion, ExplosionDefinition>

export interface DamageRecord {
    object: Obstacle | Player
    damage: number
    weapon: Weapon
    source: GameObject
}

export interface ServerBulletOptions {
    position: Vector
    rotation: number
    reflectionCount?: number
    reflectedFromID?: number
    variance?: number
}
export class Bullet extends BaseBullet {
    readonly game: Game;

    readonly sourceGun: GunItem | Explosion;
    readonly shooter: GameObject;

    constructor(game: Game, source: GunItem | Explosion, shooter: GameObject, options: ServerBulletOptions) {
        const variance = source.type.definition.ballistics.variance;
        const bulletOptions: BulletOptions = {
            ...options,
            source: source.type,
            sourceID: options.reflectedFromID ?? shooter.id,
            variance: variance ? randomFloat(0, variance) : undefined
        }
        super(bulletOptions);

        this.game = game;
        this.sourceGun = source;
        this.shooter = shooter;
    }

    update(): DamageRecord[] {
        const lineRect = RectangleHitbox.fromLine(this.position, vAdd(this.position, vMul(this.velocity, TICK_SPEED)));

        const objects = this.game.grid.intersectsRect(lineRect);
        const collisions = this.updateAndGetCollisions(TICK_SPEED, objects);

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
            const weapon = this.sourceGun instanceof GunItem ? this.sourceGun : this.sourceGun.type;
            if (object instanceof Player) {
                this.position = collision.intersection.point;
                this.damagedIDs.add(object.id);
                records.push({
                    object,
                    damage: this.definition.damage / (this.reflectionCount + 1),
                    weapon,
                    source: this.shooter
                });
                this.dead = true;
                break;
            } else if (object instanceof Obstacle) {
                this.damagedIDs.add(object.id);
                records.push({
                    object,
                    damage: this.definition.damage / (this.reflectionCount + 1) * this.definition.obstacleMultiplier,
                    weapon,
                    source: this.shooter
                });

                // skip killing the bullet for obstacles with noCollisions like bushes
                if (!object.definition.noCollisions) {
                    this.position = collision.intersection.point;

                    if (object.definition.reflectBullets && this.reflectionCount < 3) {
                        this.reflect(collision.intersection.normal, object.id);
                    }

                    this.dead = true;
                    break;
                }
            }
        }
        return records;
    }

    reflect(normal: Vector, objectId: number): void {
        const normalAngle = Math.atan2(normal.y, normal.x);

        const rotation = normalizeAngle(this.rotation + (normalAngle - this.rotation) * 2);

        this.game.addBullet(this.sourceGun, this.shooter, {
            position: this.position,
            rotation,
            reflectedFromID: objectId,
            reflectionCount: this.reflectionCount + 1,
            variance: this.variance
        })
    }
}
