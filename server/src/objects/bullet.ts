import { Bullets, type BulletDefinition } from "@common/definitions/bullets";
import { PerkIds } from "@common/definitions/items/perks";
import { BaseBullet, type BulletOptions } from "@common/utils/baseBullet";
import { RectangleHitbox } from "@common/utils/hitbox";
import { Angle } from "@common/utils/math";
import { DefinitionType, type ReferenceTo } from "@common/utils/objectDefinitions";
import { randomFloat } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { GunItem } from "../inventory/gunItem";
import { Building } from "./building";
import { type Explosion } from "./explosion";
import { type GameObject } from "./gameObject";
import { Obstacle } from "./obstacle";
import { type Player } from "./player";
import { adjacentOrEquivLayer } from "@common/utils/layer";

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
    readonly split?: boolean
    readonly modifiers?: BulletOptions["modifiers"]
    readonly shotFX?: boolean
    readonly lastShot?: boolean
    readonly cycle?: boolean
    readonly reflective?: boolean
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

        this.shotFX = options.shotFX ?? false;

        this.lastShot = options.lastShot ?? false;

        this.cycle = options.cycle ?? false;

        this.reflective = options.reflective ?? false;
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

        const objects = grid.intersectsHitbox(lineRect, this.layer);

        const damageMod = (this.modifiers?.damage ?? 1) / (this.reflectionCount + 1);
        for (const collision of this.updateAndGetCollisions(dt, objects)) {
            const object = collision.object as DamageRecord["object"];
            const { isObstacle, isProjectile } = object;

            if (isObstacle && object.definition.isStair) {
                object.handleStairInteraction(this);
                continue;
            }

            // We check for projectiles first, not obstacles, otherwise stuff like tables or bushes won't be damaged by bullets.
            if (isProjectile && !adjacentOrEquivLayer(object, this.layer)) continue;

            const { point, normal } = collision.intersection;
            const reflected = (
                collision.reflected
                && this.reflectionCount < 3
                && !definition.noReflect
                && (definition.onHitExplosion === undefined || !definition.explodeOnImpact)
            );

            const isBlockedReflectionGun = this.sourceGun.definition.ballistics.onHitExplosion || this.sourceGun.definition.ballistics.onHitProjectile;
            const reflectiveRounds = !object.isPlayer && this.shooter.isPlayer && this.shooter.hasPerk(PerkIds.ReflectiveRounds) && !isBlockedReflectionGun;

            let rotation: number | undefined;
            if (reflected || definition.onHitExplosion || definition.onHitProjectile || reflectiveRounds) {
                /*
                    nudge the bullet

                    if the bullet reflects, we do this to ensure that it doesn't re-collide
                    with the same obstacle instantly

                    if it doesn't, then we do this to avoid having the obstacle eat the
                    explosion, thereby shielding others from its effects
                */
                rotation = 2 * Math.atan2(normal.y, normal.x) - this.rotation;
                this.position = Vec.add(point, Vec(Math.sin(rotation), -Math.cos(rotation)));
            } else {
                // atan2 is expensive so we avoid the above calculation if possible
                this.position = point;
            }

            if (collision.dealDamage) {
                const damageAmount = (
                    definition.teammateHeal
                    && this.game.isTeamMode
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

                if (object.isPlayer) {
                    if (this.shooter.isPlayer && definition.infection !== undefined && object.teamID !== this.shooter.teamID) object.infection += definition.infection; // evil 1
                    if (definition.teammateHeal !== undefined) object.infection -= definition.teammateHeal * 10; // evil 2
                }

                if (
                    this.sourceGun.definition.defType === DefinitionType.Gun
                    && this.shooter.isPlayer
                    && this.shooter.hasPerk(PerkIds.PrecisionRecycling)
                ) {
                    if (object.isPlayer) {
                        this.shooter.tryRefund(this.sourceGun as GunItem);
                    } else {
                        this.shooter.bulletTargetHitCount = 0;
                        this.shooter.targetHitCountExpiration?.kill();
                        this.shooter.targetHitCountExpiration = undefined;
                    }
                }
            }

            this.collidedIDs.add(object.id);

            // We check here for obstacles, after the collision was done, in order to damage tables and bushes.
            // think of it as bullet penetration.
            if (isObstacle && object.definition.noCollisions) continue;

            if (reflected || reflectiveRounds) {
                this.reflect(rotation ?? 0, reflectiveRounds ?? false);
                this.reflected = true;
            }

            this.dead = true;
            break;
        }

        return records;
    }

    reflect(direction: number, reflective = false): void {
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
                thin: this.thin,
                shotFX: false,
                reflective
            }
        );
    }
}
