import { ObjectCategory } from "@common/constants";
import { resolveNumericSpecifier, type InternalAnimation, type NumericSpecifier, type SyncedParticleDefinition } from "@common/definitions/syncedParticles";
import { Angle, EaseFunctions, Numeric } from "@common/utils/math";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { Vec, type Vector } from "@common/utils/vector";
import { Game } from "../game";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS } from "../utils/constants";
import { DebugRenderer } from "../utils/debugRenderer";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class SyncedParticle extends GameObject.derive(ObjectCategory.SyncedParticle) {
    readonly image = new SuroiSprite();

    private _spawnTime = 0;
    private _age = 0;
    private _lifetime = 0;

    private _positionAnim?: InternalAnimation<Vector>;
    private _scaleAnim?: InternalAnimation<number>;
    private _alphaAnim?: InternalAnimation<number>;

    private _alphaMult = 1;

    angularVelocity = 0;

    private _definition!: SyncedParticleDefinition;
    get definition(): SyncedParticleDefinition { return this._definition; }

    constructor(id: number, data: ObjectsNetData[ObjectCategory.SyncedParticle]) {
        super(id);

        this.container.addChild(this.image);
        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.SyncedParticle], isNew = false): void {
        const {
            definition,
            startPosition,
            endPosition,
            layer,
            age,
            lifetime,
            angularVelocity,
            scale,
            alpha,
            variant,
            creatorID
        } = data;

        this._definition = definition;

        const easing = EaseFunctions[definition.velocity.easing ?? "linear"];
        this._positionAnim = {
            start: toPixiCoords(startPosition),
            end: toPixiCoords(endPosition),
            easing,
            duration: endPosition ? definition.velocity?.duration : undefined
        };
        this.container.position = startPosition;

        if (layer !== this.layer) {
            this.layer = layer;
            this.updateLayer();
        }
        this._lifetime = lifetime ?? definition.lifetime as number;
        this._age = age;
        this._spawnTime = Date.now() - this._age * this._lifetime;
        this.angularVelocity = angularVelocity ?? definition.angularVelocity as number;

        if (typeof definition.scale === "object" && "start" in definition.scale) {
            this._scaleAnim = {
                start: scale?.start ?? definition.scale.start as number,
                end: scale?.end ?? definition.scale.end as number,
                easing: EaseFunctions[definition.scale.easing ?? "linear"]
            };
            this.updateScale();
        } else {
            const scale = resolveNumericSpecifier(definition.scale as NumericSpecifier);
            this.container.scale.set(scale, scale);
        }

        if (
            creatorID === Game.activePlayerID
            && typeof definition.alpha === "object"
            && "creatorMult" in definition.alpha
            && definition.alpha.creatorMult !== undefined
        ) this._alphaMult = definition.alpha.creatorMult;

        if (typeof definition.alpha === "object" && "start" in definition.alpha) {
            this._alphaAnim = {
                start: alpha?.start ?? definition.alpha.start as number,
                end: alpha?.end ?? definition.alpha.end as number,
                easing: EaseFunctions[definition.alpha.easing ?? "linear"]
            };
            this.updateAlpha();
        } else {
            this.container.alpha = resolveNumericSpecifier(definition.alpha as NumericSpecifier);
        }

        this.image.setFrame(`${definition.frame}${variant !== undefined ? `_${variant}` : ""}`);
        if (definition.tint) this.image.tint = definition.tint;
        this.container.zIndex = this.definition.zIndex;
    }

    override updateDebugGraphics(): void {
        if (!DEBUG_CLIENT) return;
        if (!this.definition.hitbox) return;

        DebugRenderer.addHitbox(
            this.definition.hitbox.transform(this.position, this.container.scale.x),
            HITBOX_COLORS.obstacleNoCollision,
            this.layer === Game.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY
        );
    }

    updateScale(): void {
        if (!this._scaleAnim) return;

        const { start, end, easing } = this._scaleAnim;
        this.container.scale.set(Numeric.lerp(start, end, easing(this._age)));
    }

    updateAlpha(): void {
        if (!this._alphaAnim) return;

        const { start, end, easing } = this._alphaAnim;
        this.container.alpha = Numeric.lerp(start, end, easing(this._age)) * this._alphaMult;
    }

    override update(): void {
        const ageMs = Date.now() - this._spawnTime;
        this._age = ageMs / this._lifetime;
        if (this._age > 1 || this._positionAnim === undefined) return;

        const { start, end, easing, duration } = this._positionAnim;
        const interpFactor = duration ? ageMs / duration : this._age;
        this.container.position = Vec.lerp(start, end, easing(Numeric.clamp(interpFactor, 0, 1)));

        this.container.rotation = Angle.normalize(this.angularVelocity * ageMs);

        this.updateScale();
        this.updateAlpha();
    }

    override updateInterpolation(): void { /* bleh */ }

    override destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
