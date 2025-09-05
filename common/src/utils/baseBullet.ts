import { Layer, ZIndexes } from "../constants";
import { Bullets, type BulletDefinition } from "../definitions/bullets";
import { ExplosionDefinition } from "../definitions/explosions";
import { type MeleeDefinition } from "../definitions/items/melees";
import { PerkDefinition } from "../definitions/items/perks";
import { ThrowableDefinition } from "../definitions/items/throwables";
import type { CommonGameObject } from "./gameObject";
import { type Hitbox } from "./hitbox";
import { adjacentOrEqualLayer, equivLayer } from "./layer";
import { Collision, Geometry, type IntersectionResponse, Numeric } from "./math";
import { DefinitionType, ReferenceTo, type ReifiableDef } from "./objectDefinitions";
import type { SuroiByteStream } from "./suroiByteStream";
import { Vec, type Vector } from "./vector";

export type BaseBulletDefinition = {
    readonly damage: number
    readonly obstacleMultiplier: number
    readonly speed: number
    readonly range: number
    readonly rangeVariance?: number
    readonly shrapnel?: boolean
    readonly allowRangeOverride?: boolean
    readonly lastShotFX?: boolean
    readonly noCollision?: boolean
    readonly noReflect?: boolean
    readonly ignoreCoolerGraphics?: boolean
    readonly infection?: number

    readonly teammateHeal?: number
    readonly enemySpeedMultiplier?: {
        duration: number
        multiplier: number
    }
    readonly removePerk?: ReferenceTo<PerkDefinition>

    readonly tracer?: {
        /**
         * @default 1
         */
        readonly opacity?: number
        /**
         * @default 1
         */
        readonly width?: number
        /**
         * @default 1
         */
        readonly length?: number
        readonly image?: string
        /**
         * Used by the radio bullet
         * This will make it scale and fade in and out
         */
        readonly particle?: boolean
        readonly zIndex?: ZIndexes
        /**
         * A value of `-1` causes a random color to be chosen
         */
        readonly color?: number
        readonly saturatedColor?: number

        /**
         * How fast tracer images spin (useful for projectiles)
        */
        readonly spinSpeed?: number
    }

    readonly trail?: {
        readonly interval: number
        readonly amount?: number
        readonly frame: string
        readonly scale: {
            readonly min: number
            readonly max: number
        }
        readonly alpha: {
            readonly min: number
            readonly max: number
        }
        readonly spreadSpeed: {
            readonly min: number
            readonly max: number
        }
        readonly lifetime: {
            readonly min: number
            readonly max: number
        }
        readonly tint: number
    }
} & ({
    readonly onHitExplosion?: never
} | {
    readonly onHitExplosion: ReferenceTo<ExplosionDefinition>
    /**
     * When hitting a reflective surface:
     * - `true` causes the explosion to be spawned
     * - `false` causes the projectile to be reflected (default)
     */
    readonly explodeOnImpact?: boolean
}) & ({
    readonly onHitProjectile?: never
} | {
    readonly onHitProjectile: ReferenceTo<ThrowableDefinition>
});

export interface BulletOptions {
    readonly position: Vector
    readonly rotation: number
    readonly layer: Layer
    readonly source: ReifiableDef<BulletDefinition>
    readonly modifiers?: {
        // all multiplicative
        readonly damage?: number
        readonly dtc?: number
        readonly speed?: number
        readonly range?: number
        readonly tracer?: {
            readonly opacity?: number
            readonly width?: number
            readonly length?: number
        }
    }
    readonly saturate?: boolean
    readonly thin?: boolean
    readonly split?: boolean
    readonly sourceID: number
    readonly reflectionCount?: number
    readonly variance?: number
    readonly rangeOverride?: number
    readonly shotFX?: boolean
    readonly lastShot?: boolean
}

type GameObject = {
    readonly hitbox?: Hitbox
    readonly damageable: boolean
    readonly id: number
} & CommonGameObject;

interface BulletCollision {
    readonly intersection: {
        readonly point: Vector
        readonly normal: Vector
    }
    readonly object: GameObject
    readonly reflected: boolean
    readonly dealDamage: boolean
    readonly reflectedMeleeDefinition?: MeleeDefinition
}

export class BaseBullet {
    protected _oldPosition: Vector;
    position: Vector;
    readonly initialPosition: Vector;

    readonly rotation: number;

    layer: Layer;
    readonly initialLayer: Layer;

    readonly velocity: Vector;
    readonly direction: Vector;

    readonly maxDistance: number;
    readonly maxDistanceSquared: number;

    readonly reflectionCount: number;

    shotFX = false;

    lastShot = false;

    readonly sourceID: number;

    readonly collidedIDs = new Set<number>();

    readonly rangeVariance: number;

    dead = false;

    readonly definition: BulletDefinition;

    readonly canHitShooter: boolean;

    readonly modifiers?: BulletOptions["modifiers"];

    readonly saturate: boolean;
    readonly thin: boolean;
    readonly split: boolean;

    constructor(options: BulletOptions) {
        this.initialPosition = Vec.clone(options.position);
        this._oldPosition = this.position = options.position;
        this.rotation = options.rotation;
        this.layer = this.initialLayer = options.layer;
        this.reflectionCount = options.reflectionCount ?? 0;
        this.sourceID = options.sourceID;
        this.rangeVariance = options.variance ?? 0;

        this.definition = Bullets.reify(options.source);

        this.modifiers = options.modifiers === undefined || Object.keys(options.modifiers).length === 0
            ? undefined
            : options.modifiers;

        let range = (this.modifiers?.range ?? 1) * this.definition.range;

        if (this.definition.allowRangeOverride && options.rangeOverride !== undefined) {
            range = Numeric.clamp(options.rangeOverride, 0, range);
        }

        this.maxDistance = (range * (this.rangeVariance + 1)) / (this.reflectionCount + 1);
        this.maxDistanceSquared = this.maxDistance ** 2;

        this.direction = Vec(Math.sin(this.rotation), -Math.cos(this.rotation));

        this.velocity = Vec.scale(
            this.direction,
            (this.modifiers?.speed ?? 1) * this.definition.speed * (this.rangeVariance + 1)
        );

        this.canHitShooter = this.definition.shrapnel || this.reflectionCount > 0;

        this.saturate = options.saturate ?? false;
        this.thin = options.thin ?? false;
        this.split = options.split ?? false;

        this.shotFX = options.shotFX ?? false;

        this.lastShot = options.lastShot ?? false;
    }

    /**
     * Update the bullet and check for collisions
     * @param delta The delta time between ticks
     * @param objects An iterable containing objects to check for collision
     * @returns An array containing the objects that the bullet collided and the intersection data for each,
     * sorted by closest to furthest
     */
    updateAndGetCollisions(delta: number, objects: Iterable<GameObject>): BulletCollision[] {
        const oldPosition = this._oldPosition = Vec.clone(this.position);

        this.position = Vec.add(this.position, Vec.scale(this.velocity, delta));

        if (Geometry.distanceSquared(this.initialPosition, this.position) > this.maxDistanceSquared) {
            this.dead = true;
            this.position = Vec.add(this.initialPosition, Vec.scale(this.direction, this.maxDistance));
        }

        if (this.definition.noCollision) return [];

        const collisions: BulletCollision[] = [];

        for (const object of objects) {
            const { isPlayer, isObstacle, isBuilding } = object;
            if (
                ((isObstacle || isBuilding) && (
                    object.definition.noBulletCollision
                    || !equivLayer(object, this)
                ))
                || (isPlayer && !adjacentOrEqualLayer(this.layer, object.layer))
                || !object.damageable
                || object.dead
                || this.collidedIDs.has(object.id)
                || (object.id === this.sourceID && !this.canHitShooter)
            ) continue;

            if (isPlayer) {
                const getIntersection = (surface: { pointA: Vector, pointB: Vector }): IntersectionResponse => {
                    const pointA = Vec.add(
                        object.position,
                        Vec.rotate(surface.pointA, object.rotation)
                    );
                    const pointB = Vec.add(
                        object.position,
                        Vec.rotate(surface.pointB, object.rotation)
                    );
                    const point = Collision.lineIntersectsLine(
                        oldPosition,
                        this.position,
                        pointA,
                        pointB
                    );
                    if (!point) return null;
                    const s = Vec.sub(pointA, pointB);
                    const normal = Vec.normalize(Vec(-s.y, s.x));
                    return { point, normal };
                };

                const activeDef = object.activeItemDefinition;
                const backDef = object.backEquippedMelee;

                if (activeDef.defType === DefinitionType.Melee && activeDef.reflectiveSurface) {
                    const intersection = getIntersection(activeDef.reflectiveSurface);
                    if (intersection) {
                        collisions.push({
                            intersection: intersection,
                            object,
                            dealDamage: false,
                            reflected: true,
                            reflectedMeleeDefinition: activeDef
                        });
                    }
                }

                if (backDef?.onBack?.reflectiveSurface) {
                    const intersection = getIntersection(backDef?.onBack.reflectiveSurface);
                    if (intersection) {
                        collisions.push({
                            intersection: intersection,
                            object,
                            dealDamage: false,
                            reflected: true,
                            reflectedMeleeDefinition: backDef
                        });
                    }
                }
            }

            const intersection = object.hitbox?.intersectsLine(oldPosition, this.position);

            if (intersection) {
                collisions.push({
                    intersection,
                    object,
                    dealDamage: true,
                    reflected: ((object.isObstacle || object.isBuilding)
                        && object.definition.reflectBullets) ?? false
                });
            }
        }

        // Sort by closest to initial position
        collisions.sort(
            (a, b) =>
                Geometry.distanceSquared(a.intersection.point, this.initialPosition)
                - Geometry.distanceSquared(b.intersection.point, this.initialPosition)
        );

        return collisions;
    }

    serialize(stream: SuroiByteStream): void {
        Bullets.writeToStream(stream, this.definition);
        stream.writePosition(this.initialPosition);
        stream.writeRotation2(this.rotation);
        stream.writeLayer(this.layer);
        stream.writeFloat(this.rangeVariance, 0, 1, 4);
        stream.writeUint8(this.reflectionCount);
        stream.writeObjectId(this.sourceID);

        // don't care about damage
        // don't care about dtc
        const {
            speed,
            range,
            tracer: {
                opacity,
                width,
                length
            } = {}
        } = this.modifiers ?? {};

        const hasMods = this.modifiers !== undefined;
        const speedMod = speed !== undefined;
        const rangeMod = range !== undefined;
        const traceOpacityMod = opacity !== undefined;
        const traceWidthMod = width !== undefined;
        const traceLengthMod = length !== undefined;

        stream.writeBooleanGroup2(
            hasMods,
            speedMod,
            rangeMod,
            traceOpacityMod,
            traceWidthMod,
            traceLengthMod,
            this.saturate,
            this.thin,
            this.split,
            this.shotFX,
            this.lastShot
        );

        if (hasMods) {
            /*
                some overrides aren't sent for performance, space, and security
                reasons; if the client doesn't use value X, then don't send it for
                those three reasons
            */

            if (speedMod) {
                stream.writeFloat(speed, 0, 4, 1);
            }

            if (rangeMod) {
                stream.writeFloat(range, 0, 4, 1);
            }

            if (traceOpacityMod) {
                stream.writeFloat(opacity, 0, 4, 1);
            }

            if (traceWidthMod) {
                stream.writeFloat(width, 0, 4, 1);
            }

            if (traceLengthMod) {
                stream.writeFloat(length, 0, 4, 1);
            }
        }

        if (this.definition.allowRangeOverride) {
            stream.writeFloat(this.maxDistance, 0, this.definition.range * (this.modifiers?.range ?? 1), 2);
        }
    }

    static deserialize(stream: SuroiByteStream): BulletOptions {
        const source = Bullets.readFromStream(stream);
        const position = stream.readPosition();
        const rotation = stream.readRotation2();
        const layer = stream.readLayer();
        const variance = stream.readFloat(0, 1, 4);
        const reflectionCount = stream.readUint8();
        const sourceID = stream.readObjectId();

        const [
            hasMods,
            speedMod,
            rangeMod,
            traceOpacityMod,
            traceWidthMod,
            traceLengthMod,
            saturate,
            thin,
            split,
            shotFX,
            lastShot
        ] = stream.readBooleanGroup2();

        const modifiers = hasMods
            ? {
                get damage(): number {
                    console.warn("damage modifier is not sent to the client; accessing it is a mistake");
                    return 1;
                },
                get dtc(): number {
                    console.warn("dtc modifier is not sent to the client; accessing it is a mistake");
                    return 1;
                },
                speed: speedMod ? stream.readFloat(0, 4, 1) : undefined,
                range: rangeMod ? stream.readFloat(0, 4, 1) : undefined,
                tracer: {
                    opacity: traceOpacityMod ? stream.readFloat(0, 4, 1) : undefined,
                    width: traceWidthMod ? stream.readFloat(0, 4, 1) : undefined,
                    length: traceLengthMod ? stream.readFloat(0, 4, 1) : undefined
                }
            }
            : undefined;

        const rangeOverride = source.allowRangeOverride ? stream.readFloat(0, source.range * (modifiers?.range ?? 1), 2) : undefined;

        return {
            source,
            position,
            rotation,
            layer,
            variance,
            reflectionCount,
            sourceID,
            rangeOverride,
            modifiers,
            saturate,
            thin,
            split,
            shotFX,
            lastShot
        };
    }
}
