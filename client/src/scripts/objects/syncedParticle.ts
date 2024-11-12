import { ObjectCategory } from "@common/constants";
import { type SyncedParticleDefinition } from "@common/definitions/syncedParticles";
import { getEffectiveZIndex } from "@common/utils/layer";
import { Numeric } from "@common/utils/math";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { type Game } from "../game";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { drawHitbox, SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class SyncedParticle extends GameObject.derive(ObjectCategory.SyncedParticle) {
    readonly image = new SuroiSprite();

    private _alpha = 1;
    private _alphaMult = 1;

    private _oldScale?: number;
    private _lastScaleChange?: number;
    private _scaleManuallySet = false;
    private _scale = 0;
    get scale(): number { return this._scale; }
    set scale(scale: number) {
        if (this._scaleManuallySet) {
            this._oldScale = this._scale;
        }
        this._scaleManuallySet = true;

        this._lastScaleChange = Date.now();
        this._scale = scale;
    }

    private _definition!: SyncedParticleDefinition;
    get definition(): SyncedParticleDefinition { return this._definition; }

    updateContainerScale(): void {
        if (
            this._oldScale === undefined
            || this._lastScaleChange === undefined
            || this.container.scale === undefined
        ) return;

        this.container.scale.set(Numeric.lerp(
            this._oldScale,
            this._scale,
            Numeric.min(
                (Date.now() - this._lastScaleChange) / this.game.serverDt,
                1
            )
        ));
    }

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.SyncedParticle]) {
        super(game, id);

        this.container.addChild(this.image);
        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.SyncedParticle], isNew = false): void {
        const full = data.full;
        if (full) {
            const { variant, definition } = full;

            this._definition = definition;
            this.layer = data.layer;

            if (
                full.creatorID === this.game.activePlayerID
                && typeof definition.alpha === "object"
                && "creatorMult" in definition.alpha
                && definition.alpha.creatorMult !== undefined
            ) this._alphaMult = definition.alpha.creatorMult;

            this.image.setFrame(`${definition.frame}${variant !== undefined ? `_${variant}` : ""}`);
            if (definition.tint) this.image.tint = definition.tint;
            this.updateZIndex();
        }

        this.position = data.position;
        this.rotation = data.rotation;
        this.scale = data.scale ?? this._scale;
        this.container.alpha = (this._alpha = data.alpha ?? this._alpha) * this._alphaMult;

        if (!this.game.console.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(this.position);
            this.container.rotation = this.rotation;
            this.container.scale.set(this._scale);
        }

        this.updateDebugGraphics();
    }

    override updateZIndex(): void {
        this.container.zIndex = getEffectiveZIndex(this.definition.zIndex, this.layer, this.game.layer);
    }

    override updateDebugGraphics(): void {
        if (!HITBOX_DEBUG_MODE || !this.definition.hitbox) return;

        this.debugGraphics.clear();

        drawHitbox(
            this.definition.hitbox.transform(this.position, this._scale),
            HITBOX_COLORS.obstacleNoCollision,
            this.debugGraphics,
            this.layer === this.game.activePlayer?.layer as number | undefined ? 1 : DIFF_LAYER_HITBOX_OPACITY
        );
    }

    override destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
