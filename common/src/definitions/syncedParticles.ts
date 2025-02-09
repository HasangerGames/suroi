import { ZIndexes } from "../constants";
import { type Variation } from "../typings";
import { CircleHitbox } from "../utils/hitbox";
import { type EaseFunctions } from "../utils/math";
import { DeepPartial, mergeDeep } from "../utils/misc";
import { ObjectDefinitions, type ObjectDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { randomFloat } from "../utils/random";
import { Vec, type Vector } from "../utils/vector";
import { type ScopeDefinition } from "./items/scopes";

export type SyncedParticleDefinition = ObjectDefinition & {
    readonly scale: Animated<number> | NumericSpecifier
    readonly alpha: (Animated<number> & { creatorMult?: number }) | NumericSpecifier
    readonly lifetime: NumericSpecifier
    readonly angularVelocity: NumericSpecifier
    readonly velocity: VectorSpecifier & { easing?: keyof typeof EaseFunctions }
    readonly zIndex: ZIndexes

    readonly frame: string
    readonly tint?: number

    readonly depletePerMs?: {
        readonly health: number
        readonly adrenaline: number
    }

    readonly hasCreatorID?: boolean
} & ({
    readonly variations?: undefined
    readonly variationBits?: never
} | {
    readonly variations: Variation
    readonly variationBits: number // TODO Auto generate this property if synced particles w/ variations are added
}) & ({
    readonly hitbox?: undefined
} | {
    readonly hitbox: CircleHitbox
    readonly snapScopeTo?: ReferenceTo<ScopeDefinition>
    /**
     * How long before the particle disappears do players zoom back out.
     */
    readonly scopeOutPreMs?: number
});

export interface SyncedParticleSpawnerDefinition {
    readonly type: ReferenceTo<SyncedParticleDefinition>
    readonly count: number
    readonly deployAnimation?: {
        readonly duration?: number
        readonly staggering?: {
            readonly delay: number
            readonly spawnPerGroup?: number
            readonly initialAmount?: number
        }
    }
    readonly spawnRadius: number
}

export type ValueSpecifier<T> = T | { readonly min: T, readonly max: T };
export type NumericSpecifier = ValueSpecifier<number>;
export type VectorSpecifier = ValueSpecifier<Vector>;

export interface Animated<T> {
    readonly start: ValueSpecifier<T>
    readonly end: ValueSpecifier<T>
    readonly easing?: keyof typeof EaseFunctions
}

export interface InternalAnimation<T> {
    readonly start: T
    readonly end: T
    readonly easing: (typeof EaseFunctions)[keyof typeof EaseFunctions]
}

export function resolveNumericSpecifier(numericSpecifier: NumericSpecifier): number {
    return typeof numericSpecifier === "number"
        ? numericSpecifier
        : randomFloat(numericSpecifier.min, numericSpecifier.max);
}

export function resolveVectorSpecifier(vectorSpecifier: VectorSpecifier): Vector {
    if ("x" in vectorSpecifier) return vectorSpecifier;

    const { min, max } = vectorSpecifier;
    return Vec.create(
        randomFloat(min.x, max.x),
        randomFloat(min.y, max.y)
    );
}

// the cast to SyncedParticleDefinition is technically incorrect, but it makes ts shut up so
const smokeLike = (def: DeepPartial<SyncedParticleDefinition>): SyncedParticleDefinition => mergeDeep({
    frame: "smoke_grenade_particle",
    scale: {
        start: {
            min: 1.5,
            max: 2
        },
        end: {
            min: 1.75,
            max: 2.25
        }
    },
    alpha: {
        start: 1,
        end: 0,
        easing: "expoIn"
    },
    angularVelocity: {
        min: -0.0005,
        max: 0.0005
    },
    velocity: {
        min: {
            x: -0.0002,
            y: -0.0002
        },
        max: {
            x: 0.0002,
            y: 0.0002
        }
    },
    lifetime: {
        min: 19000,
        max: 21000
    },
    zIndex: ZIndexes.BuildingsCeiling - 1,
    scopeOutPreMs: 3200
} as SyncedParticleDefinition, def);

export const SyncedParticles = new ObjectDefinitions<SyncedParticleDefinition>([
    smokeLike({
        idString: "smoke_grenade_particle",
        name: "Smoke Grenade Particle",
        hitbox: new CircleHitbox(5),
        snapScopeTo: "1x_scope"
    }),
    smokeLike({
        idString: "plumpkin_smoke_grenade_particle",
        name: "Plumpkin Smoke Grenade Particle",
        tint: 0x854770,
        hitbox: new CircleHitbox(5),
        snapScopeTo: "1x_scope"
    }),
    smokeLike({
        idString: "shrouded_particle",
        name: "Shrouded Particle",
        tint: 0xaaaaaa,
        hitbox: new CircleHitbox(5),
        snapScopeTo: "1x_scope",
        alpha: {
            start: 0.5,
            end: 0,
            creatorMult: 0.15
        },
        velocity: {
            easing: "circOut"
        },
        lifetime: {
            min: 1800,
            max: 2200
        }
    }),
    smokeLike({
        idString: "tear_gas_particle",
        name: "Tear Gas Particle",
        tint: 0xa0e6ff,
        hitbox: new CircleHitbox(5),
        snapScopeTo: "1x_scope",
        depletePerMs: {
            adrenaline: 0.0055
        }
    }),
    smokeLike({
        idString: "airdrop_smoke_particle",
        name: "Airdrop Smoke Particle",
        velocity: {
            min: {
                x: -0.002,
                y: -0.002
            },
            max: {
                x: 0.002,
                y: 0.002
            },
            easing: "circOut"
        },
        lifetime: {
            min: 1500,
            max: 2500
        },
        hitbox: new CircleHitbox(5)
    })
]);
