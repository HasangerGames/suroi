import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { type Game } from "../game";
import { COLORS, HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";

export class ThrowableProjectile extends GameObject<ObjectCategory.ThrowableProjectile> {
    override readonly type = ObjectCategory.ThrowableProjectile;

    readonly image = new SuroiSprite();
    readonly waterOverlay = new SuroiSprite("water_overlay").setVisible(false).setScale(0.75).setTint(COLORS.water);
    private _waterAnim?: Tween<SuroiSprite>;

    radius?: number;

    floorType: keyof typeof FloorTypes = "grass";

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.ThrowableProjectile]) {
        super(game, id);

        this.container.addChild(this.image, this.waterOverlay);
        this.updateFromData(data);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.ThrowableProjectile], isNew = false): void {
        if (data.full) {
            this.image.setFrame(data.full.definition.animation.liveImage);
            this.radius = data.full.definition.hitboxRadius;
        }

        this.position = data.position;
        this.rotation = data.rotation;

        if (data.airborne) {
            this.container.zIndex = ZIndexes.AirborneThrowables;
        } else {
            const floorType = this.game.map.terrain.getFloor(this.position);
            const doOverlay = FloorTypes[floorType].overlay;

            this.container.zIndex = doOverlay
                ? ZIndexes.UnderwaterGroundedThrowables
                : ZIndexes.GroundedThrowables;

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

        if (HITBOX_DEBUG_MODE && this.radius) {
            this.debugGraphics.clear();

            drawHitbox(
                new CircleHitbox(this.radius, this.position),
                HITBOX_COLORS.obstacle,
                this.debugGraphics
            );
        }
    }

    override destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
