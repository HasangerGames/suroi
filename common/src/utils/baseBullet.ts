import { distanceSquared } from "../../../common/src/utils/math";
import { type Vector, v, vAdd, vMul, vClone } from "../../../common/src/utils/vector";
import { type GunDefinition } from "../../../common/src/definitions/guns";
import { type ObjectType } from "./objectType";
import { type ObjectCategory } from "../constants";
import { type Hitbox } from "./hitbox";

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
    readonly reflectedFromID: number;

    dead = false;

    readonly source: ObjectType<ObjectCategory.Loot, GunDefinition>;

    readonly definition: GunDefinition["ballistics"];

    constructor(position: Vector, rotation: number, source: ObjectType<ObjectCategory.Loot, GunDefinition>, reflectionCount = 0, reflectedFromID = -1) {
        this.initialPosition = vClone(position);
        this.position = position;
        this.rotation = rotation;
        this.source = source;
        this.reflectionCount = reflectionCount;
        this.reflectedFromID = reflectedFromID;

        this.definition = this.source.definition.ballistics;

        this.maxDistance = (this.definition.maxDistance / (reflectionCount + 1));

        this.maxDistanceSquared = this.maxDistance ** 2;

        this.velocity = vMul(v(Math.sin(rotation), -Math.cos(rotation)), this.definition.speed);
    }

    /**
     * Update the bullet and check for collisions
     * @param delta The delta time between ticks
     * @param objects A set containing objects to check for collision
     * @returns An array containing the objects that the bullet collided and the intersection data
     */
    updateAndGetCollisions(delta: number, objects: Set<GameObject>): Collision[] {
        const oldPosition = vClone(this.position);

        this.position = vAdd(this.position, vMul(this.velocity, delta));

        if (distanceSquared(this.initialPosition, this.position) > this.maxDistanceSquared) {
            this.dead = true;
            this.position = vAdd(this.initialPosition, (vMul(v(Math.sin(this.rotation), -Math.cos(this.rotation)), this.maxDistance)));
        }

        const collisions: Collision[] = [];

        for (const object of objects) {
            if (object.damageable && !object.dead && object.id !== this.reflectedFromID) {
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
