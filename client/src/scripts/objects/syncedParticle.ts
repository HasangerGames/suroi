import { ObjectCategory } from "../../../../common/src/constants";
import { type SyncedParticleDefinition } from "../../../../common/src/definitions/syncedParticles";
import { Numeric } from "../../../../common/src/utils/math";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Game } from "../game";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class SyncedParticle extends GameObject<ObjectCategory.SyncedParticle> {
    readonly type = ObjectCategory.SyncedParticle;

    readonly image = new SuroiSprite();

    private _alpha = 1;

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
            Math.min(((Date.now() - this._lastScaleChange) / this.game.serverDt), 1)
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

            this.image.setFrame(`${definition.frame}${variant !== undefined ? `_${variant}` : ""}`);
            if (definition.tint) this.image.tint = definition.tint;
            this.container.zIndex = definition.zIndex;
        }

        this.position = data.position;
        this.rotation = data.rotation;
        this.scale = data.scale ?? this._scale;
        this.container.alpha = this._alpha = data.alpha ?? this._alpha;

        if (!this.game.console.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(this.position);
            this.container.rotation = this.rotation;
            this.container.scale.set(this._scale);
        }

        if (HITBOX_DEBUG_MODE && this.definition.hitbox) {
            this.debugGraphics.clear();

            drawHitbox(
                this.definition.hitbox.transform(this.position, this._scale),
                HITBOX_COLORS.obstacleNoCollision,
                this.debugGraphics
            );
        }
    }

    override destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
