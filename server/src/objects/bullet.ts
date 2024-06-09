import { ObjectCategory } from "../../../common/src/constants";
import { Bullets } from "../../../common/src/definitions/bullets";
import { type SingleGunNarrowing } from "../../../common/src/definitions/guns";
import { Loots } from "../../../common/src/definitions/loots";
import { BaseBullet } from "../../../common/src/utils/baseBullet";
import { RectangleHitbox } from "../../../common/src/utils/hitbox";
import { Angle } from "../../../common/src/utils/math";
import { randomFloat } from "../../../common/src/utils/random";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GunItem } from "../inventory/gunItem";
import { type Explosion } from "./explosion";
import { type GameObject } from "./gameObject";
import { type Obstacle } from "./obstacle";
import { type Player } from "./player";

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
    readonly rangeOverride?: number
}

export class Bullet extends BaseBullet {
    readonly game: Game;

    readonly sourceGun: Weapon;
    readonly shooter: GameObject;

    readonly clipDistance: number;
    reflected = false;

    readonly finalPosition: Vector;

    constructor(
        game: Game,
        source: Weapon,
        shooter: GameObject,
        options: ServerBulletOptions
    ) {
        const reference = source instanceof GunItem && source.definition.isDual ? Loots.fromString<SingleGunNarrowing>(source.definition.singleVariant) : source.definition;
        const definition = Bullets.fromString(`${reference.idString}_bullet`);
        const variance = definition.rangeVariance;

        super({
            ...options,
            rotation: Angle.normalize(options.rotation),
            source: definition,
            sourceID: shooter.id,
            variance: variance ? randomFloat(0, variance) : undefined
        });

        this.clipDistance = options.rangeOverride ?? this.definition.range;
        this.game = game;
        this.sourceGun = source;
        this.shooter = shooter;

        this.finalPosition = Vec.add(this.position, Vec.scale(this.direction, this.maxDistance));
    }

    update(): DamageRecord[] {
        const lineRect = RectangleHitbox.fromLine(this.position, Vec.add(this.position, Vec.scale(this.velocity, this.game.dt)));
        const { grid, dt, map: { width: mapWidth, height: mapHeight } } = this.game;

        const objects = grid.intersectsHitbox(lineRect);
        const collisions = this.updateAndGetCollisions(dt, objects);

        // Bullets from dead players should not deal damage so delete them
        // Also delete bullets out of map bounds
        if (
            this.shooter.dead
            || this.position.x < 0 || this.position.x > mapWidth
            || this.position.y < 0 || this.position.y > mapHeight
        ) {
            this.dead = true;
            return [];
        }

        const records: DamageRecord[] = [];
        const definition = this.definition;

        for (const collision of collisions) {
            const object = collision.object;

            if (object.type === ObjectCategory.Player) {
                this.position = collision.intersection.point;
                this.damagedIDs.add(object.id);
                records.push({
                    object: object as Player,
                    damage: definition.damage / (this.reflectionCount + 1),
                    weapon: this.sourceGun,
                    source: this.shooter,
                    position: collision.intersection.point
                });

                if (definition.penetration.players) continue;
                this.dead = true;
                break;
            }

            if (object.type === ObjectCategory.Obstacle) {
                this.damagedIDs.add(object.id);

                records.push({
                    object: object as Obstacle,
                    damage: definition.damage / (this.reflectionCount + 1) * definition.obstacleMultiplier,
                    weapon: this.sourceGun,
                    source: this.shooter,
                    position: collision.intersection.point
                });

                if (definition.penetration.obstacles) continue;

                // skip killing the bullet for obstacles with noCollisions like bushes
                if (!object.definition.noCollisions) {
                    const { point, normal } = collision.intersection;
                    this.position = point;

                    if (object.definition.reflectBullets && this.reflectionCount < 3) {
                        /*
                            no matter what, nudge the bullet

                            if the bullet reflects, we do this to ensure that it doesn't re-collide
                            with the same obstacle instantly

                            if it doesn't, then we do this to avoid having the obstacle eat the
                            explosion, thereby shielding others from its effects
                        */
                        const rotation = 2 * Math.atan2(normal.y, normal.x) - this.rotation;
                        this.position = Vec.add(this.position, Vec.create(Math.sin(rotation), -Math.cos(rotation)));

                        if (definition.onHitExplosion === undefined || !definition.explodeOnImpact) {
                            this.reflect(rotation);
                            this.reflected = true;
                        }
                    }

                    this.dead = true;
                    break;
                }
            }
        }

        return records;
    }

    reflect(direction: number): void {
        this.game.addBullet(
            this.sourceGun,
            this.shooter,
            {
                position: Vec.clone(this.position),
                rotation: direction,
                reflectionCount: this.reflectionCount + 1,
                variance: this.rangeVariance,
                rangeOverride: this.clipDistance
            }
        );
    }
}
