import { ObjectCategory } from "../constants";
import { Explosions, type ExplosionDefinition } from "../definitions/explosions";
import { Guns, type GunDefinition } from "../definitions/guns";
import { Loots, type LootDefinition } from "../definitions/loots";
import { type Hitbox } from "./hitbox";
import { clamp, distanceSquared } from "./math";
import { reifyDefinition, type BulletDefinition, type ReferenceTo } from "./objectDefinitions";
import { ObjectType } from "./objectType";
import { v, vAdd, vClone, vMul, type Vector } from "./vector";

export interface BulletOptions {
    readonly position: Vector
    readonly rotation: number
    readonly source: GunDefinition | ExplosionDefinition | ReferenceTo<GunDefinition> | ReferenceTo<ExplosionDefinition>
    readonly sourceID: number
    readonly reflectionCount?: number
    readonly variance?: number
    readonly clipDistance?: number
}

interface GameObject {
    readonly position: Vector
    readonly hitbox?: Hitbox
    readonly dead: boolean
    readonly damageable: boolean
    readonly id: number
}

interface Collision {
    readonly intersection: {
        readonly point: Vector
        readonly normal: Vector
    }
    readonly object: GameObject
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

    readonly source: GunDefinition | ExplosionDefinition;
    private readonly _sourceObjectType: ObjectType<ObjectCategory.Loot, GunDefinition> | ObjectType<ObjectCategory.Explosion, ExplosionDefinition>;
    public get sourceObjectType(): ObjectType<ObjectCategory.Loot, GunDefinition> | ObjectType<ObjectCategory.Explosion, ExplosionDefinition> {
        return this._sourceObjectType;
    }

    readonly definition: BulletDefinition;

    readonly canHitShooter: boolean;

    constructor(options: BulletOptions) {
        this.initialPosition = vClone(options.position);
        this.position = options.position;
        this.rotation = options.rotation;

        //! evil code starts here
        // pros: flexible
        // cons: fugly

        // this conditional is very evil!
        if (Loots.definitions.some(def => def === options.source || def.idString === options.source)) {
            this.source = reifyDefinition<LootDefinition, GunDefinition>(options.source as string, Guns);
            this._sourceObjectType = ObjectType.fromString<ObjectCategory.Loot, GunDefinition>(ObjectCategory.Loot, this.source.idString);
        } else {
            this.source = reifyDefinition<ExplosionDefinition>(options.source as string, Explosions);
            this._sourceObjectType = ObjectType.fromString<ObjectCategory.Explosion, ExplosionDefinition>(ObjectCategory.Explosion, this.source.idString);
        }

        //! evil code ends here

        this.reflectionCount = options.reflectionCount ?? 0;
        this.sourceID = options.sourceID;
        this.variance = options.variance ?? 0;

        this.definition = this.source.ballistics;

        let dist = this.definition.maxDistance;

        if (this.definition.clipDistance && options.clipDistance !== undefined) {
            dist = clamp(options.clipDistance, 1, this.definition.maxDistance);
        }
        this.maxDistance = (dist * (this.variance + 1)) / (this.reflectionCount + 1);

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
            if (
                object.damageable && !object.dead &&
                !(!this.canHitShooter && object.id === this.sourceID) &&
                !this.damagedIDs.has(object.id)
            ) {
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
        collisions.sort(
            (a, b) =>
                distanceSquared(a.intersection?.point, this.initialPosition) -
                distanceSquared(b.intersection?.point, this.initialPosition)
        );

        return collisions;
    }
}
