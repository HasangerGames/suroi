import { ZIndexes } from "../constants";
import { type Variation } from "../typings";
import { type EaseFunctions } from "../utils/math";
import { ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";
import { type Vector } from "../utils/vector";

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

export interface Animation<T> extends MinMax<T> {
    readonly duration: NumericSpecifier | "lifetime"
    readonly easing: keyof typeof EaseFunctions
}

export interface SyncedParticleDefinition extends ObjectDefinition {
    /**
     * @default {1}
     */
    readonly scale?: Animation<number> | NumericSpecifier
    /**
     * @default {1}
     */
    readonly alpha?: Animation<number> | NumericSpecifier
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
    readonly velocity?: Animation<Vector> | VectorSpecifier
    /**
     * @default {undefined}
     */
    readonly variations?: Variation
    /**
     * @default {ZIndexes.ObstaclesLayer1}
     */
    readonly zIndex?: ZIndexes
}

export const SyncedParticles = new ObjectDefinitions<SyncedParticleDefinition>([
    {
        idString: "smoke_grenade_particle",
        name: "Smoke grenade particle",
        zIndex: ZIndexes.ObstaclesLayer4
    }
]);
