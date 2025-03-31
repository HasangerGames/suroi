import { Bullets, type BulletDefinition } from "@common/definitions/bullets";
import { BaseBullet, type BulletOptions } from "@common/utils/baseBullet";
import { RectangleHitbox } from "@common/utils/hitbox";
import { Angle } from "@common/utils/math";
import type { ReferenceTo } from "@common/utils/objectDefinitions";
import { randomFloat } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { GunItem } from "../inventory/gunItem";
import { Building } from "./building";
import { type Explosion } from "./explosion";
import { type GameObject } from "./gameObject";
import { Obstacle } from "./obstacle";
import { type Player } from "./player";

type Weapon = GunItem | Explosion;

export interface DamageRecord {
    readonly object: Obstacle | Building | Player
    readonly damage: number
    readonly weapon: Weapon
    readonly source: GameObject
    readonly position: Vector
}

export interface ServerBulletOptions {
    readonly idString: ReferenceTo<BulletDefinition>
    readonly position: Vector
    readonly rotation: number
    readonly layer: number
    readonly reflectionCount?: number
    readonly variance?: number
    readonly rangeOverride?: number
    readonly saturate?: boolean
    readonly thin?: boolean
    readonly modifiers?: BulletOptions["modifiers"]
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
        const definition = Bullets.fromString(options.idString);
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

        this.layer = options.layer ?? shooter.layer;

        this.finalPosition = Vec.add(this.position, Vec.scale(this.direction, this.maxDistance));
    }

    update(): DamageRecord[] {
        const lineRect = RectangleHitbox.fromLine(
            this.position,
            Vec.add(this.position, Vec.scale(this.velocity, this.game.dt))
        );
        const { grid, dt, map: { width: mapWidth, height: mapHeight } } = this.game;

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

        const objects = grid.intersectsHitbox(lineRect);

        const damageMod = (this.modifiers?.damage ?? 1) / (this.reflectionCount + 1);
        for (const collision of this.updateAndGetCollisions(dt, objects)) {
            const object = collision.object as DamageRecord["object"];
            const { isObstacle } = object;

            if (isObstacle && object.definition.isStair) {
                object.handleStairInteraction(this);
                continue;
            }

            const { point, normal } = collision.intersection;
            const reflected = (
                collision.reflected
                && this.reflectionCount < 3
                && !definition.noReflect
                && (definition.onHitExplosion === undefined || !definition.explodeOnImpact)
            );

            let rotation: number | undefined;
            if (reflected || definition.onHitExplosion || definition.onHitProjectile) {
                /*
                    nudge the bullet

                    if the bullet reflects, we do this to ensure that it doesn't re-collide
                    with the same obstacle instantly

                    if it doesn't, then we do this to avoid having the obstacle eat the
                    explosion, thereby shielding others from its effects
                */
                rotation = 2 * Math.atan2(normal.y, normal.x) - this.rotation;
                this.position = Vec.add(point, Vec.create(Math.sin(rotation), -Math.cos(rotation)));
            } else {
                // atan2 is expensive so we avoid the above calculation if possible
                this.position = point;
            }

            if (collision.dealDamage) {
                const damageAmount = (
                    definition.teammateHeal
                    && this.game.teamMode
                    && this.shooter.isPlayer
                    && object.isPlayer
                    && object.teamID === this.shooter.teamID
                    && object.id !== this.shooter.id
                )
                    ? -definition.teammateHeal
                    : definition.damage;
                records.push({
                    object,
                    damage: damageMod * damageAmount * (isObstacle ? (this.modifiers?.dtc ?? 1) * definition.obstacleMultiplier : 1),
                    weapon: this.sourceGun,
                    source: this.shooter,
                    position: this.position
                });
            }

            this.collidedIDs.add(object.id);

            if (isObstacle && object.definition.noCollisions) continue;

            if (reflected) {
                this.reflect(rotation ?? 0);
                this.reflected = true;
            }

            this.dead = true;
            break;
        }

        for (const object of objects) {
            if (
                object.isProjectile
                && object.definition.health
                && lineRect.collidesWith(object.hitbox)
            ) {
                object.damage({ amount: definition.damage });
            }
        }

        return records;
    }

    reflect(direction: number): void {
        this.game.addBullet(
            this.sourceGun,
            this.shooter,
            {
                idString: this.definition.idString,
                position: Vec.clone(this.position),
                rotation: direction,
                layer: this.layer,
                reflectionCount: this.reflectionCount + 1,
                variance: this.rangeVariance,
                modifiers: this.modifiers,
                rangeOverride: this.clipDistance,
                saturate: this.saturate,
                thin: this.thin
            }
        );
    }
}
