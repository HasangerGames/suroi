import { ObjectCategory } from "@common/constants";
import { type NumericSpecifier, type SyncedParticleDefinition, type VectorSpecifier } from "@common/definitions/syncedParticles";
import { type Variation } from "@common/typings";
import { CircleHitbox } from "@common/utils/hitbox";
import { Angle, EaseFunctions, Numeric } from "@common/utils/math";
import { type FullData } from "@common/utils/objectsSerializations";
import { random, randomFloat } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { BaseGameObject } from "./gameObject";

function resolveNumericSpecifier(numericSpecifier: NumericSpecifier): number {
    if (typeof numericSpecifier === "number") return numericSpecifier;

    const [min, max] = "min" in numericSpecifier
        ? [numericSpecifier.min, numericSpecifier.max]
        : [
            numericSpecifier.mean - numericSpecifier.deviation,
            numericSpecifier.mean + numericSpecifier.deviation
        ];

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
    readonly easing: (typeof EaseFunctions)[keyof typeof EaseFunctions]
}

export class SyncedParticle extends BaseGameObject.derive(ObjectCategory.SyncedParticle) {
    override readonly fullAllocBytes = 0;
    override readonly partialAllocBytes = 22;
    override readonly hitbox?: CircleHitbox | undefined;

    private readonly _positionAnim: InternalAnimation<Vector>;

    alpha: number;
    alphaActive = false;
    private readonly _alphaAnim?: InternalAnimation<number>;

    scale: number;
    scaleActive = false;
    private readonly _scaleAnim?: InternalAnimation<number>;

    angularVelocity = 0;

    readonly definition: SyncedParticleDefinition;

    readonly _creationDate: number;
    readonly _lifetime: number;
    _interpFactor = 0;

    private readonly variant?: Variation;

    creatorID?: number;

    constructor(
        game: Game,
        definition: SyncedParticleDefinition,
        position: Vector,
        endPosition?: Vector,
        layer?: number,
        creatorID?: number
    ) {
        super(game, position);
        this._creationDate = game.now;
        this.definition = definition;

        this.layer = layer ?? 0;

        this.creatorID = creatorID;
        if (definition.hasCreatorID && creatorID === undefined) {
            throw new Error("creatorID not specified for SyncedParticle which requires it");
        }

        this._lifetime = resolveNumericSpecifier(definition.lifetime);

        const { alpha, scale, velocity } = definition;

        const easing = EaseFunctions[velocity?.easing ?? "linear"];
        this._positionAnim = {
            start: position,
            end: endPosition ?? Vec.add(position, Vec.scale(resolveVectorSpecifier(velocity), this._lifetime)),
            easing
        };

        this._position = Vec.lerp(this._positionAnim.start, this._positionAnim.end, easing(0));

        if (typeof alpha === "object" && "start" in alpha) {
            const easing = EaseFunctions[alpha.easing ?? "linear"];
            this._alphaAnim = {
                start: resolveNumericSpecifier(alpha.start),
                end: resolveNumericSpecifier(alpha.end),
                easing
            };

            this.alpha = Numeric.lerp(this._alphaAnim.start, this._alphaAnim.end, easing(0));
            this.alphaActive = true;
        } else {
            this.alpha = resolveNumericSpecifier(alpha);
        }

        if (typeof scale === "object" && "start" in scale) {
            const easing = EaseFunctions[scale.easing ?? "linear"];
            this._scaleAnim = {
                start: resolveNumericSpecifier(scale.start),
                end: resolveNumericSpecifier(scale.end),
                easing
            };

            this.scale = Numeric.lerp(this._scaleAnim.start, this._scaleAnim.end, easing(0));
            this.scaleActive = true;
        } else {
            this.scale = resolveNumericSpecifier(scale);
        }

        this.angularVelocity = resolveNumericSpecifier(definition.angularVelocity);

        if (definition.variations !== undefined) {
            this.variant = random(0, definition.variations) as Variation;
        }

        if (definition.hitbox !== undefined) {
            this.hitbox = this.definition.hitbox?.transform(this.position, this.scale);
        }

        this.setPartialDirty();
    }

    override damage(): void { /* can't damage a synced particle */ }

    update(): void {
        const age = this.game.now - this._creationDate;
        if (age > this._lifetime) {
            this.game.removeSyncedParticle(this);
            return;
        }
        const interpFactor = this._interpFactor = age / this._lifetime;

        this._rotation = Angle.normalize(this._rotation + this.angularVelocity * this.game.dt);

        const positionAnim = this._positionAnim;
        this._position = Vec.lerp(positionAnim.start, positionAnim.end, interpFactor);

        const alphaAnim = this._alphaAnim;
        if (alphaAnim) {
            this.alpha = Numeric.lerp(alphaAnim.start, alphaAnim.end, interpFactor);
        }

        const scaleAnim = this._scaleAnim;
        if (scaleAnim) {
            this.scale = Numeric.lerp(scaleAnim.start, scaleAnim.end, interpFactor);
        }

        if (this.hitbox instanceof CircleHitbox && this.definition.hitbox !== undefined) {
            this.hitbox.position = this.position;
            this.hitbox.radius = this.definition.hitbox.radius * this.scale;
            this.game.grid.updateObject(this);
        }
    }

    override get data(): FullData<ObjectCategory.SyncedParticle> {
        return {
            definition: this.definition,
            position: this.position,
            endPosition: this._positionAnim.end,
            rotation: this.rotation,
            layer: this.layer,
            angularVelocity: this.angularVelocity,
            interpFactor: this._interpFactor,
            // scaleActive and alphaActive guarantee the existence of _scaleAnim and _alphaAnim respectively
            /* eslint-disable @typescript-eslint/no-non-null-assertion */
            scale: this.scaleActive
                ? {
                    start: this._scaleAnim!.start,
                    end: this._scaleAnim!.end
                }
                : undefined,
            alpha: this.alphaActive
                ? {
                    start: this._alphaAnim!.start,
                    end: this._alphaAnim!.end
                }
                : undefined,
            variant: this.variant,
            creatorID: this.creatorID
        };
    }
}
