import { ObjectCategory, type Layer } from "../constants";
import { type BuildingDefinition } from "../definitions/buildings";
import { type DecalDefinition } from "../definitions/decals";
import { type LootDefinition } from "../definitions/loots";
import { type ObstacleDefinition } from "../definitions/obstacles";
import { type SyncedParticleDefinition } from "../definitions/syncedParticles";
import { type ThrowableDefinition } from "../definitions/throwables";
import { type Orientation } from "../typings";
import { type CircleHitbox } from "./hitbox";
import { type AbstractConstructor, type Constructor, type GetEnumMemberName } from "./misc";
import { type Vector } from "./vector";

export type BaseGameObject = InstanceType<ReturnType<typeof makeGameObjectTemplate>>;

type PredicateFor<Cat extends ObjectCategory = ObjectCategory> = { readonly type: Cat } & (
    ObjectCategory extends Cat
        ? {
            // if Cat === ObjectCategory, then they should all be boolean | undefined; if not, narrow as appropriate
            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
            readonly [K in (keyof typeof ObjectCategory & string) as `is${K}`]?: boolean | undefined
        }
        : Readonly<Record<`is${GetName<Cat>}`, true>> & {
            readonly [K in Exclude<ObjectCategory, Cat> as `is${GetName<K>}`]?: K extends GetName<Cat> ? never : false
        }
);

// a simpler version of PredicateFor that typescript seems to digest better when used as a class
type LoosePredicateFor<Cat extends ObjectCategory = ObjectCategory> = { readonly type: Cat } & {
    // if Cat === ObjectCategory, then they should all be boolean | undefined; if not, narrow as appropriate
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    readonly [K in (keyof typeof ObjectCategory & string) as `is${K}`]: ObjectCategory extends Cat
        ? boolean | undefined
        : (typeof ObjectCategory)[K] extends Cat
            ? true
            : false | undefined
};

type GetName<Member extends number> = GetEnumMemberName<typeof ObjectCategory, Member>;

/**
 * For each object category, we define here properties that both the server and client
 * classes have in common. Helps with portability for code in `common` such as bullets
 * and packets
 *
 * Note that this serves as an interop easer—it is not meant to
 * be exhaustive.
 */
export type CommonObjectMapping = {
    [K in ObjectCategory]: PredicateFor<K> & {
        position: Vector
        rotation: number
        dead: boolean
        layer: Layer
    }
} & {
    [ObjectCategory.Player]: {
        readonly hitbox: CircleHitbox
    }
    [ObjectCategory.Obstacle]: {
        readonly definition: ObstacleDefinition
    }
    [ObjectCategory.DeathMarker]: object
    [ObjectCategory.Loot]: {
        readonly definition: LootDefinition
    }
    [ObjectCategory.Building]: {
        readonly definition: BuildingDefinition
        orientation: Orientation
    }
    [ObjectCategory.Decal]: {
        readonly definition: DecalDefinition
    }
    [ObjectCategory.Parachute]: object
    [ObjectCategory.ThrowableProjectile]: {
        readonly definition: ThrowableDefinition
    }
    [ObjectCategory.SyncedParticle]: {
        readonly definition: SyncedParticleDefinition
    }
};

/**
 * Common interface by which all game object derivatives—whether they be on server or client—abide by
 */
export type CommonGameObject = CommonObjectMapping[ObjectCategory];

// lol you're so funny eslint
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const makeGameObjectTemplate = () => {
    type RealType<Cat extends ObjectCategory = ObjectCategory> = typeof GameObjectBase<Cat> & AbstractConstructor<LoosePredicateFor<Cat>>;

    abstract class GameObjectBase<Cat extends ObjectCategory = ObjectCategory> {
        abstract readonly type: Cat;

        private static _subclasses: { [K in ObjectCategory]?: Constructor<GameObjectBase<K> & PredicateFor<K>> } = {};

        protected constructor() {
            if (
                !Object.values(GameObjectBase._subclasses).some(cls => new.target.prototype instanceof cls)
            ) {
                throw new Error(`Illegal subclass of BaseGameObject '${new.target.name}'; subclasses must be obtained by calling BaseGameObject.derive, or must be a subclass thereof`);
            }
        }

        static derive<
            This extends AbstractConstructor,
            Cat extends ObjectCategory = ObjectCategory
        >(this: This, category: Cat): new (...args: ConstructorParameters<This>) => InstanceType<This> & PredicateFor<Cat> {
            if (category in GameObjectBase._subclasses) {
                throw new Error(`Subclass for category '${ObjectCategory[category]}' already registered`);
            }

            // @ts-expect-error i don't know
            return GameObjectBase._subclasses[category] = class extends (this as RealType<Cat>) {
                override readonly type = category;

                constructor(...args: ConstructorParameters<This>) {
                    // @ts-expect-error this has type This (no way)
                    super(...args);
                    // @ts-expect-error it's easier this way lol
                    this[`is${ObjectCategory[category]}`] = true;
                }
            };
        }
    }

    return GameObjectBase as RealType;
};
