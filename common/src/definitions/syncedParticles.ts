import { ZIndexes } from "../constants";
import { type Variation } from "../typings";
import { CircleHitbox } from "../utils/hitbox";
import { type EaseFunctions } from "../utils/math";
import { ObjectDefinitions, type ObjectDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { type Vector } from "../utils/vector";
import type { ScopeDefinition } from "./scopes";

export interface MinMax<T> {
    readonly min: T
    readonly max: T
}

export interface MeanDeviation<T> {
    readonly mean: T
    readonly deviation: T
}

export type ValueSpecifier<T> = T | MinMax<T> | MeanDeviation<T>;
export type NumericSpecifier = ValueSpecifier<number>;
export type VectorSpecifier = ValueSpecifier<Vector>;

export interface Animated<T> {
    readonly start: ValueSpecifier<T>
    readonly end: ValueSpecifier<T>
    readonly duration?: NumericSpecifier | "lifetime"
    readonly easing?: keyof typeof EaseFunctions
}

export type SyncedParticleDefinition = ObjectDefinition & {
    /**
     * @default {1}
     */
    readonly scale?: Animated<number> | NumericSpecifier
    /**
     * @default {1}
     */
    readonly alpha?: Animated<number> | NumericSpecifier
    /**
     * @default {Infinity}
     */
    readonly lifetime?: NumericSpecifier
    /**
     * @default {0}
     */
    readonly angularVelocity?: NumericSpecifier
    /**
     * @default {Vec.create(0,0)}
     */
    readonly velocity?: Animated<Vector> | VectorSpecifier
    /**
     * @default {undefined}
     */
    readonly variations?: Variation
    /**
     * @default {ZIndexes.ObstaclesLayer1}
     */
    readonly zIndex?: ZIndexes

    readonly frame?: string
    readonly tint?: number

    readonly depletePerMs?: {
        readonly health?: number
        readonly adrenaline?: number
    }
} & ({
    readonly hitbox?: undefined
} | {
    readonly hitbox: CircleHitbox
    readonly snapScopeTo?: ReferenceTo<ScopeDefinition>
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

// inheritance when™
function createParticle(idString: string, name: string, options?: Partial<SyncedParticleDefinition>): SyncedParticleDefinition {
    return {
        idString,
        name,
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
            mean: 20000,
            deviation: 1000
        },
        zIndex: ZIndexes.ObstaclesLayer4,
        frame: idString === "smoke_grenade_particle" ? undefined : "smoke_grenade_particle",
        ...options
    };
}

export const SyncedParticles = new ObjectDefinitions<SyncedParticleDefinition>([
    createParticle(
        "smoke_grenade_particle",
        "Smoke Grenade Particle",
        {
            hitbox: new CircleHitbox(5),
            snapScopeTo: "1x_scope"
        }
    ),
    createParticle(
        "tear_gas_particle",
        "Tear Gas Particle",
        {
            tint: 0xa0e6ff,
            hitbox: new CircleHitbox(5),
            snapScopeTo: "1x_scope",
            depletePerMs: {
                adrenaline: 0.0055
            }
        }
    ),
    createParticle(
        "airdrop_smoke_particle",
        "Airdrop Smoke Particle",
        {
            velocity: {
                min: {
                    x: -0.002,
                    y: -0.002
                },
                max: {
                    x: 0.002,
                    y: 0.002
                }
            },
            lifetime: {
                mean: 2000,
                deviation: 500
            },
            hitbox: new CircleHitbox(5),
            snapScopeTo: "1x_scope"
        }
    )
]);
