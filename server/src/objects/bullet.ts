import { Player } from "./player";
import { type Game } from "../game";
import { normalizeAngle } from "../../../common/src/utils/math";
import { type GunItem } from "../inventory/gunItem";
import { vAdd, vMul, type Vector } from "../../../common/src/utils/vector";
import { BaseBullet } from "../../../common/src/utils/baseBullet";
import { Obstacle } from "./obstacle";
import { type GameObject } from "../types/gameObject";
import { TICK_SPEED } from "../../../common/src/constants";
import { RectangleHitbox } from "../../../common/src/utils/hitbox";

export interface DamageRecord {
    object: Obstacle | Player
    damage: number
    weapon: GunItem
    source: GameObject
}

export class Bullet extends BaseBullet {
    readonly game: Game;

    readonly sourceGun: GunItem;
    readonly shooter: Player;

    constructor(game: Game, position: Vector, rotation: number, source: GunItem, shooter: Player, reflectionCount = 0, reflectedFromID?: number) {
        super(position, rotation, source.type, reflectedFromID ?? shooter.id, reflectionCount);

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

            if (object instanceof Player) {
                this.position = collision.intersection.point;
                this.damagedIDs.add(object.id);
                records.push({
                    object,
                    damage: this.definition.damage / (this.reflectionCount + 1),
                    weapon: this.sourceGun,
                    source: this.shooter
                });
                this.dead = true;
                break;
            } else if (object instanceof Obstacle) {
                this.damagedIDs.add(object.id);
                records.push({
                    object,
                    damage: this.definition.damage / (this.reflectionCount + 1) * this.definition.obstacleMultiplier,
                    weapon: this.sourceGun,
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

        this.game.addBullet(this.position, rotation, this.sourceGun, this.shooter, this.reflectionCount + 1, objectId);
    }
}
