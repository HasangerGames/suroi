import { type ObjectCategory } from "../constants";
import { type ExplosionDefinition } from "../definitions/explosions";
import { type GunDefinition } from "../definitions/guns";
import { type Hitbox } from "./hitbox";
import { distanceSquared } from "./math";
import { type BulletDefinition } from "./objectDefinitions";
import { type ObjectType } from "./objectType";
import { v, vAdd, vClone, type Vector, vMul } from "./vector";

export interface BulletOptions {
    position: Vector
    rotation: number
    source: ObjectType<ObjectCategory.Explosion, ExplosionDefinition> | ObjectType<ObjectCategory.Loot, GunDefinition>
    sourceID: number
    reflectionCount?: number
    variance?: number
}

interface GameObject {
    position: Vector
    hitbox?: Hitbox
    dead: boolean
    damageable: boolean
    id: number
}

interface Collision {
    intersection: { point: Vector, normal: Vector }
    object: GameObject
}

export class BaseBullet {
    position: Vector;
    readonly initialPosition: Vector;

    readonly rotation: number;
    readonly velocity: Vector;

    readonly maxDistance: number;
    readonly maxDistanceSquared: number;

    readonly reflectionCount: number;

    readonly sourceID: number;

    readonly damagedIDs = new Set<number>();

    readonly variance: number;

    dead = false;

    readonly source: ObjectType<ObjectCategory.Loot, GunDefinition> | ObjectType<ObjectCategory.Explosion, ExplosionDefinition>;

    readonly definition: BulletDefinition;

    readonly canHitShooter: boolean;

    constructor(options: BulletOptions) {
        this.initialPosition = vClone(options.position);
        this.position = options.position;
        this.rotation = options.rotation;
        this.source = options.source;
        this.reflectionCount = options.reflectionCount ?? 0;
        this.sourceID = options.sourceID;
        this.variance = options.variance ?? 0;

        this.definition = this.source.definition.ballistics;
        this.maxDistance = (this.definition.maxDistance * (this.variance + 1)) / (this.reflectionCount + 1);

        this.maxDistanceSquared = this.maxDistance ** 2;

        this.velocity = vMul(v(Math.sin(this.rotation), -Math.cos(this.rotation)), this.definition.speed * (this.variance + 1));

        this.canHitShooter = (this.definition.shrapnel ?? this.reflectionCount > 0);
    }

    /**
     * Update the bullet and check for collisions
     * @param delta The delta time between ticks
     * @param objects A set containing objects to check for collision
     * @returns An array containing the objects that the bullet collided and the intersection data
     */
    updateAndGetCollisions(delta: number, objects: { [Symbol.iterator]: () => Iterator<GameObject> }): Collision[] {
        const oldPosition = vClone(this.position);

        this.position = vAdd(this.position, vMul(this.velocity, delta));

        if (distanceSquared(this.initialPosition, this.position) > this.maxDistanceSquared) {
            this.dead = true;
            this.position = vAdd(this.initialPosition, (vMul(v(Math.sin(this.rotation), -Math.cos(this.rotation)), this.maxDistance)));
        }

        const collisions: Collision[] = [];

        for (const object of objects) {
            if (object.damageable && !object.dead &&
                !(!this.canHitShooter && object.id === this.sourceID) &&
                !this.damagedIDs.has(object.id)) {
                const collision = object.hitbox?.intersectsLine(oldPosition, this.position);

                if (collision) {
                    collisions.push({
                        intersection: collision,
                        object
                    });
                }
            }
        }

        // Sort by closest to initial position
        collisions.sort((a, b) => {
            return distanceSquared(a.intersection?.point, this.initialPosition) - distanceSquared(b.intersection?.point, this.initialPosition);
        });

        return collisions;
    }
}
