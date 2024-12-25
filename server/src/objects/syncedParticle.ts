import { ObjectCategory } from "@common/constants";
import { type Animated, type NumericSpecifier, type SyncedParticleDefinition, type VectorSpecifier } from "@common/definitions/syncedParticles";
import { type Variation } from "@common/typings";
import { CircleHitbox } from "@common/utils/hitbox";
import { Angle, EaseFunctions, Numeric, type EasingFunction } from "@common/utils/math";
import { type SDeepMutable } from "@common/utils/misc";
import { type FullData } from "@common/utils/objectsSerializations";
import { random, randomFloat } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
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

interface InternalAnimation<T> {
    readonly start: T
    readonly end: T
    readonly duration: number
    readonly easing: (typeof EaseFunctions)[keyof typeof EaseFunctions]
}

export class SyncedParticle extends BaseGameObject.derive(ObjectCategory.SyncedParticle) {
    override readonly fullAllocBytes = 8;
    override readonly partialAllocBytes = 14;
    override readonly hitbox?: CircleHitbox | undefined;

    alpha: number;
    alphaActive = false;
    private readonly _alphaAnim?: InternalAnimation<number>;

    scale: number;
    scaleActive = false;
    private readonly _scaleAnim?: InternalAnimation<number>;

    angularVelocity = 0;

    private _firstPacket = true;

    readonly definition: SyncedParticleDefinition;

    readonly _creationDate: number;
    readonly _lifetime: number;

    private _velocity: Vector;
    private readonly _velocityAnim?: InternalAnimation<Vector>;

    private readonly variant?: Variation;

    private _target?: {
        readonly target: Vector
        readonly _startPosition: Vector
        readonly _start: number
        readonly easing: EasingFunction
        readonly duration: number
    };

    creatorID?: number;

    constructor(game: Game, definition: SyncedParticleDefinition, position: Vector, layer?: number, creatorID?: number) {
        super(game, position);
        this._creationDate = game.now;
        this.definition = definition;

        this.layer = layer ?? 0;

        this.creatorID = creatorID;

        this._lifetime = resolveNumericSpecifier(definition.lifetime);

        const resolveDuration = (duration: Animated<unknown>["duration"]): number => duration === "lifetime" || duration === undefined
            ? this._lifetime
            : resolveNumericSpecifier(duration);

        const { alpha, scale, velocity } = definition;

        if (typeof alpha === "object" && "start" in alpha) {
            const easingFn = EaseFunctions[alpha.easing ?? "linear"];
            this._alphaAnim = {
                start: resolveNumericSpecifier(alpha.start),
                end: resolveNumericSpecifier(alpha.end),
                easing: easingFn,
                duration: resolveDuration(alpha.duration)
            };

            this.alpha = Numeric.lerp(this._alphaAnim.start, this._alphaAnim.end, easingFn(0));
            this.alphaActive = true;
        } else {
            this.alpha = resolveNumericSpecifier(alpha);
        }

        if (typeof scale === "object" && "start" in scale) {
            const easingFn = EaseFunctions[scale.easing ?? "linear"];
            this._scaleAnim = {
                start: resolveNumericSpecifier(scale.start),
                end: resolveNumericSpecifier(scale.end),
                easing: easingFn,
                duration: resolveDuration(scale.duration)
            };

            this.scale = Numeric.lerp(this._scaleAnim.start, this._scaleAnim.end, easingFn(0));
            this.scaleActive = true;
        } else {
            this.scale = resolveNumericSpecifier(scale);
        }

        this.angularVelocity = resolveNumericSpecifier(definition.angularVelocity);

        if (typeof velocity === "object" && "start" in velocity) {
            const easingFn = EaseFunctions[velocity.easing ?? "linear"];
            this._velocityAnim = {
                start: resolveVectorSpecifier(velocity.start),
                end: resolveVectorSpecifier(velocity.end),
                easing: easingFn,
                duration: resolveDuration(velocity.duration)
            };

            this._velocity = Vec.lerp(this._velocityAnim.start, this._velocityAnim.end, easingFn(0));
        } else {
            this._velocity = resolveVectorSpecifier(velocity);
        }

        if (definition.variations !== undefined) {
            this.variant = random(0, definition.variations) as Variation;
        }

        if (definition.hitbox !== undefined) {
            this.hitbox = this.definition.hitbox?.transform(this.position, this.scale);
        }
    }

    override damage(): void { /* can't damage a synced particle */ }

    setTarget(target: Vector, timespan: number, easing: EasingFunction): void {
        this._target = {
            target,
            _start: this.game.now,
            _startPosition: Vec.clone(this._position),
            easing,
            duration: timespan
        };
    }

    deleteTarget(): void {
        this._target = undefined;
    }

    update(): void {
        const age = this.game.now - this._creationDate;
        if (age > this._lifetime) {
            this.game.removeSyncedParticle(this);
            return;
        }

        this.setPartialDirty();

        const dt = this.game.dt;

        this._rotation = Angle.normalize(this._rotation + this.angularVelocity * dt);

        const target = this._target;
        if (target) {
            const targetInterp = (this.game.now - target._start) / target.duration;

            this._position = Vec.lerp(
                target._startPosition,
                target.target,
                target.easing(targetInterp)
            );

            if (targetInterp >= 1) this.deleteTarget();
        } else {
            const velocityAnim = this._velocityAnim;
            if (velocityAnim) {
                const halfDt = dt / 2;

                this._position = Vec.add(
                    this._position,
                    Vec.scale(this._velocity, halfDt)
                );

                this._velocity = Vec.lerp(velocityAnim.start, velocityAnim.end, velocityAnim.easing(age / velocityAnim.duration));

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
        }

        const alphaAnim = this._alphaAnim;
        if (alphaAnim) {
            this.alpha = Numeric.lerp(alphaAnim.start, alphaAnim.end, alphaAnim.easing(age / alphaAnim.duration));
        }

        const scaleAnim = this._scaleAnim;
        if (scaleAnim) {
            this.scale = Numeric.lerp(scaleAnim.start, scaleAnim.end, scaleAnim.easing(age / scaleAnim.duration));
        }

        if (this.hitbox instanceof CircleHitbox && this.definition.hitbox !== undefined) {
            this.hitbox.position = this.position;
            this.hitbox.radius = this.definition.hitbox.radius * this.scale;
            this.game.grid.updateObject(this);
        }
    }

    override get data(): FullData<ObjectCategory.SyncedParticle> {
        const data: SDeepMutable<FullData<ObjectCategory.SyncedParticle>> = {
            position: this.position,
            rotation: this.rotation,
            layer: this.layer,
            full: {
                definition: this.definition,
                creatorID: this.creatorID
            }
        };

        if (this.variant !== undefined) data.full.variant = this.variant;
        if (this.alphaActive || this._firstPacket) data.alpha = this.alpha;
        if (this.scaleActive || this._firstPacket) data.scale = this.scale;

        this._firstPacket = false;

        return data;
    }
}
