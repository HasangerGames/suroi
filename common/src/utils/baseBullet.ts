import { Layer } from "../constants";
import { Bullets, type BulletDefinition } from "../definitions/bullets";
import type { CommonGameObject } from "./gameObject";
import { type Hitbox } from "./hitbox";
import { equalLayer, equivLayer } from "./layer";
import { Geometry, Numeric } from "./math";
import { type ReifiableDef } from "./objectDefinitions";
import { type SuroiBitStream } from "./suroiBitStream";
import { Vec, type Vector } from "./vector";

export interface BulletOptions {
    readonly position: Vector
    readonly rotation: number
    readonly layer: Layer
    readonly source: ReifiableDef<BulletDefinition>
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

    constructor(options: BulletOptions) {
        this.initialPosition = Vec.clone(options.position);
        this._oldPosition = this.position = options.position;
        this.rotation = options.rotation;
        this.layer = options.layer;
        this.reflectionCount = options.reflectionCount ?? 0;
        this.sourceID = options.sourceID;
        this.rangeVariance = options.variance ?? 0;

        this.definition = Bullets.reify(options.source);

        let range = this.definition.range;

        if (this.definition.allowRangeOverride && options.rangeOverride !== undefined) {
            range = Numeric.clamp(options.rangeOverride, 0, this.definition.range);
        }
        this.maxDistance = (range * (this.rangeVariance + 1)) / (this.reflectionCount + 1);
        this.maxDistanceSquared = this.maxDistance ** 2;

        this.direction = Vec.create(Math.sin(this.rotation), -Math.cos(this.rotation));

        this.velocity = Vec.scale(this.direction, this.definition.speed * (this.rangeVariance + 1));

        this.canHitShooter = this.definition.shrapnel || this.reflectionCount > 0;
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
                    || object.definition.noCollisions
                    || !equivLayer(object, this)
                ))
                || (isPlayer && !equalLayer(this.layer, object.layer))
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

    serialize(stream: SuroiBitStream): void {
        Bullets.writeToStream(stream, this.definition);
        stream.writePosition(this.initialPosition);
        stream.writeRotation(this.rotation, 16);
        stream.writeLayer(this.layer);
        stream.writeFloat(this.rangeVariance, 0, 1, 4);
        stream.writeBits(this.reflectionCount, 2);
        stream.writeObjectID(this.sourceID);

        if (this.definition.allowRangeOverride) {
            stream.writeFloat(this.maxDistance, 0, this.definition.range, 16);
        }
    }

    static deserialize(stream: SuroiBitStream): BulletOptions {
        const source = Bullets.readFromStream(stream);
        const position = stream.readPosition();
        const rotation = stream.readRotation(16);
        const layer = stream.readLayer();
        const variance = stream.readFloat(0, 1, 4);
        const reflectionCount = stream.readBits(2);
        const sourceID = stream.readObjectID();
        const clipDistance = source.allowRangeOverride ? stream.readFloat(0, source.range, 16) : undefined;

        return {
            source,
            position,
            rotation,
            layer,
            variance,
            reflectionCount,
            sourceID,
            rangeOverride: clipDistance
        };
    }
}
