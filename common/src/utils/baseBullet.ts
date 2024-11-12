import { Layer } from "../constants";
import { Bullets, type BulletDefinition } from "../definitions/bullets";
import type { CommonGameObject } from "./gameObject";
import { type Hitbox } from "./hitbox";
import { adjacentOrEqualLayer, equivLayer } from "./layer";
import { Geometry, Numeric } from "./math";
import { type ReifiableDef } from "./objectDefinitions";
import type { SuroiByteStream } from "./suroiByteStream";
import { Vec, type Vector } from "./vector";

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
    readonly sourceID: number
    readonly reflectionCount?: number
    readonly variance?: number
    readonly rangeOverride?: number
}

type GameObject = {
    readonly hitbox?: Hitbox
    readonly damageable: boolean
    readonly id: number
} & CommonGameObject;

interface Collision {
    readonly intersection: {
        readonly point: Vector
        readonly normal: Vector
    }
    readonly object: GameObject
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

    readonly sourceID: number;

    readonly damagedIDs = new Set<number>();

    readonly rangeVariance: number;

    dead = false;

    readonly definition: BulletDefinition;

    readonly canHitShooter: boolean;

    readonly modifiers?: BulletOptions["modifiers"];

    readonly saturate: boolean;
    readonly thin: boolean;

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

        this.direction = Vec.create(Math.sin(this.rotation), -Math.cos(this.rotation));

        this.velocity = Vec.scale(
            this.direction,
            (this.modifiers?.speed ?? 1) * this.definition.speed * (this.rangeVariance + 1)
        );

        this.canHitShooter = this.definition.shrapnel || this.reflectionCount > 0;

        this.saturate = options.saturate ?? false;
        this.thin = options.thin ?? false;
    }

    /**
     * Update the bullet and check for collisions
     * @param delta The delta time between ticks
     * @param objects An iterable containing objects to check for collision
     * @returns An array containing the objects that the bullet collided and the intersection data for each,
     * sorted by closest to furthest
     */
    updateAndGetCollisions(delta: number, objects: Iterable<GameObject>): Collision[] {
        const oldPosition = this._oldPosition = Vec.clone(this.position);

        this.position = Vec.add(this.position, Vec.scale(this.velocity, delta));

        if (Geometry.distanceSquared(this.initialPosition, this.position) > this.maxDistanceSquared) {
            this.dead = true;
            this.position = Vec.add(this.initialPosition, Vec.scale(this.direction, this.maxDistance));
        }

        if (this.definition.noCollision) return [];

        const collisions: Collision[] = [];

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
                || this.damagedIDs.has(object.id)
                || (object.id === this.sourceID && !this.canHitShooter)
            ) continue;

            const intersection = object.hitbox?.intersectsLine(oldPosition, this.position);

            if (intersection) {
                collisions.push({ intersection, object });
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

        stream.writeBooleanGroup(
            hasMods,
            speedMod,
            rangeMod,
            traceOpacityMod,
            traceWidthMod,
            traceLengthMod,
            this.saturate,
            this.thin
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
            thin
        ] = stream.readBooleanGroup();

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
            thin
        };
    }
}
