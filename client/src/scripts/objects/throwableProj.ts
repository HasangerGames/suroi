import { getEffectiveZIndex, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import type { ThrowableDefinition } from "../../../../common/src/definitions";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { PI } from "../../../../common/src/utils/math";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { randomBoolean, randomFloat } from "../../../../common/src/utils/random";
import { FloorNames, FloorTypes } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import type { GameSound } from "../managers/soundManager";
import { COLORS, HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";

export class ThrowableProjectile extends GameObject.derive(ObjectCategory.ThrowableProjectile) {
    readonly image = new SuroiSprite();
    readonly waterOverlay = new SuroiSprite("water_overlay").setVisible(false).setScale(0.75).setTint(COLORS.water);

    private _definition!: ThrowableDefinition;
    get definition(): ThrowableDefinition { return this._definition; }

    private _waterAnim?: Tween<SuroiSprite>;

    radius?: number;
    hitbox: CircleHitbox;
    hitSound?: GameSound;

    c4?: boolean;

    floorType: FloorNames = FloorNames.Grass;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.ThrowableProjectile]) {
        super(game, id);

        this.hitbox = new CircleHitbox(1, this.position);

        this.container.addChild(this.image, this.waterOverlay);
        this.layer = data.layer;
        this.updateFromData(data);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.ThrowableProjectile], isNew = false): void {
        if (data.full) {
            this.image.setFrame((this._definition ??= data.full.definition).animation.liveImage);
            this.radius = this._definition.hitboxRadius;
            this.c4 = true;
        }

        if (data.activated && this._definition?.animation.activatedImage) this.image.setFrame(this._definition.animation.activatedImage);

        this.position = data.position;
        this.rotation = data.rotation;
        this.hitbox.radius = this.radius ?? 1;
        this.hitbox.position = this.position;
        this.layer = data.layer;

        if (data.airborne) {
            this.container.zIndex = getEffectiveZIndex(ZIndexes.AirborneThrowables, this.layer);
        } else {
            const floorType = this.game.map.terrain.getFloor(this.position, this.layer);
            const doOverlay = FloorTypes[floorType].overlay;

            const zIndex = doOverlay
                ? ZIndexes.UnderwaterGroundedThrowables
                : ZIndexes.GroundedThrowables;

            this.container.zIndex = getEffectiveZIndex(zIndex, this.layer);

            if (floorType !== this.floorType) {
                if (doOverlay) this.waterOverlay.setVisible(true);

                this._waterAnim?.kill();
                this._waterAnim = this.game.addTween({
                    target: this.waterOverlay,
                    to: {
                        alpha: doOverlay ? 1 : 0
                    },
                    duration: 200,
                    onComplete: () => {
                        if (!doOverlay) this.waterOverlay.setVisible(false);
                        this._waterAnim = undefined;
                    }
                });
            }
            this.floorType = floorType;
        }

        if (!this.game.console.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(this.position);
            this.container.rotation = this.rotation;
        }

        this.updateDebugGraphics();
    }

    override updateDebugGraphics(): void {
        if (!HITBOX_DEBUG_MODE || !this.radius) return;

        this.debugGraphics.clear();

        drawHitbox(
            this.hitbox,
            HITBOX_COLORS.obstacle,
            this.debugGraphics
        );
    }

    hitEffect(position: Vector, angle: number): void {
        if (this.c4) {
            this.hitSound?.stop();
            this.hitSound = this.game.soundManager.play(
                `stone_hit_${randomBoolean() ? "1" : "2"}`,
                {
                    position,
                    falloff: 0.2,
                    maxRange: 96
                }
            );

            this.game.particleManager.spawnParticles(4, () => {
                return {
                    frames: "metal_particle",
                    position,
                    layer: this.layer,
                    zIndex: Math.max(ZIndexes.Players + 1, 4),
                    lifetime: 600,
                    scale: { start: 0.9, end: 0.2 },
                    alpha: { start: 1, end: 0.65 },
                    speed: Vec.fromPolar((angle + randomFloat(0, 2 * PI)), randomFloat(2.5, 4.5))
                };
            });
        }
    }

    override destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
