import { GameConstants, ObjectCategory } from "../../../common/src/constants";
import { type Animation, type NumericSpecifier, type SyncedParticleDefinition, type VectorSpecifier } from "../../../common/src/definitions/syncedParticles";
import { type Variation } from "../../../common/src/typings";
import { EaseFunctions, Numeric } from "../../../common/src/utils/math";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { random, randomFloat } from "../../../common/src/utils/random";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { BaseGameObject } from "./gameObject";

function resolveNumericSpecifier(numericSpecifier: NumericSpecifier): number {
    if (typeof numericSpecifier === "number") return numericSpecifier;

    const [min, max] = "min" in numericSpecifier
        ? [numericSpecifier.min, numericSpecifier.max]
        : [numericSpecifier.mean - numericSpecifier.deviation, numericSpecifier.mean + numericSpecifier.deviation];

    return randomFloat(min, max);
}

function resolveVectorSpecifier(vectorSpecifier: VectorSpecifier): Vector {
    if ("x" in vectorSpecifier) return vectorSpecifier;

    const [min, max] = "min" in vectorSpecifier
        ? [vectorSpecifier.min, vectorSpecifier.max]
        : [
            Vec.sub(vectorSpecifier.mean, vectorSpecifier.deviation),
            Vec.add(vectorSpecifier.mean, vectorSpecifier.deviation)
        ];

    return Vec.create(
        randomFloat(min.x, max.x),
        randomFloat(min.y, max.y)
    );
}

export class SyncedParticle extends BaseGameObject<ObjectCategory.SyncedParticle> {
    readonly type = ObjectCategory.SyncedParticle;

    alpha: number;
    alphaActive = false;
    private readonly _alphaAnim?: Omit<Animation<number>, "duration" | "easing"> & {
        readonly duration: number
        readonly easing: (typeof EaseFunctions)[keyof typeof EaseFunctions]
    };

    scale: number;
    scaleActive = false;
    private readonly _scaleAnim?: Omit<Animation<number>, "duration" | "easing"> & {
        readonly duration: number
        readonly easing: (typeof EaseFunctions)[keyof typeof EaseFunctions]
    };

    angularVelocity = 0;

    readonly definition: SyncedParticleDefinition;

    private readonly _creationDate: number;
    private readonly _lifetime: number;

    private readonly _velocityAnim?: Omit<Animation<Vector>, "duration" | "easing"> & {
        readonly duration: number
        readonly easing: (typeof EaseFunctions)[keyof typeof EaseFunctions]
    };

    private _velocity: Vector;

    private readonly variant?: Variation;

    constructor(game: Game, definition: SyncedParticleDefinition, position: Vector) {
        super(game, position);
        this._creationDate = game.now;
        this.definition = definition;

        this._lifetime = resolveNumericSpecifier(definition.lifetime ?? Infinity);

        if (typeof definition.alpha === "object" && "duration" in definition.alpha) {
            this._alphaAnim = {
                ...definition.alpha,
                easing: EaseFunctions[definition.alpha.easing],
                duration: definition.alpha.duration === "lifetime" ? this._lifetime : resolveNumericSpecifier(definition.alpha.duration)
            };

            this.alpha = Numeric.lerp(definition.alpha.min, definition.alpha.max, EaseFunctions[definition.alpha.easing](0));
        } else {
            this.alpha = resolveNumericSpecifier(definition.alpha ?? 1);
        }

        if (typeof definition.scale === "object" && "duration" in definition.scale) {
            this._scaleAnim = {
                ...definition.scale,
                easing: EaseFunctions[definition.scale.easing],
                duration: definition.scale.duration === "lifetime" ? this._lifetime : resolveNumericSpecifier(definition.scale.duration)
            };

            this.scale = Numeric.lerp(definition.scale.min, definition.scale.max, EaseFunctions[definition.scale.easing](0));
        } else {
            this.scale = resolveNumericSpecifier(definition.scale ?? 1);
        }

        this.angularVelocity = resolveNumericSpecifier(definition.angularVelocity ?? 0);

        if (typeof definition.velocity === "object" && "duration" in definition.velocity) {
            this._velocityAnim = {
                ...definition.velocity,
                easing: EaseFunctions[definition.velocity.easing],
                duration: definition.velocity.duration === "lifetime" ? this._lifetime : resolveNumericSpecifier(definition.velocity.duration)
            };

            this._velocity = Vec.lerp(definition.velocity.min, definition.velocity.max, EaseFunctions[definition.velocity.easing](0));
        } else {
            this._velocity = resolveVectorSpecifier(definition.velocity ?? Vec.create(0, 0));
        }

        if (definition.variations !== undefined) {
            this.variant = random(0, definition.variations) as Variation;
        }
    }

    override damage(amount: number, source?: unknown): void {}

    update(): void {
        const age = this.game.now - this._creationDate;
        if (age > this._lifetime) {
            this.game.removeSyncedParticle(this);
        }

        const dt = GameConstants.msPerTick;

        this._rotation += this.angularVelocity * dt;

        const velocityAnim = this._velocityAnim;
        if (velocityAnim) {
            const halfDt = dt / 2;

            this._position = Vec.add(
                this._position,
                Vec.scale(this._velocity, halfDt)
            );

            this._velocity = Vec.lerp(velocityAnim.min, velocityAnim.max, velocityAnim.easing(age / velocityAnim.duration));

            this._position = Vec.add(
                this._position,
                Vec.scale(this._velocity, halfDt)
            );
        } else {
            this._position = Vec.add(
                this._position,
                Vec.scale(this._velocity, dt)
            );
        }

        const alphaAnim = this._alphaAnim;
        if (alphaAnim) {
            this.alpha = Numeric.lerp(alphaAnim.min, alphaAnim.max, alphaAnim.easing(age / alphaAnim.duration));
        }

        const scaleAnim = this._scaleAnim;
        if (scaleAnim) {
            this.scale = Numeric.lerp(scaleAnim.min, scaleAnim.max, scaleAnim.easing(age / scaleAnim.duration));
        }
    }

    override get data(): FullData<ObjectCategory.SyncedParticle> {
        const data: FullData<ObjectCategory.SyncedParticle> = {
            position: this.position,
            rotation: this.rotation,
            full: {
                definition: this.definition
            }
        };

        if (this.variant !== undefined) data.full.variant = this.variant;
        if (this.alphaActive) data.alpha = this.alpha;
        if (this.scaleActive) data.scale = this.scale;

        return data;
    }
}
