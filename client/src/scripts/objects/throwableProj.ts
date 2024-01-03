import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Game } from "../game";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class ThrowableProjectile extends GameObject<ObjectCategory.ThrowableProjectile> {
    override readonly type = ObjectCategory.ThrowableProjectile;

    readonly image = new SuroiSprite();
    radius?: number;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.ThrowableProjectile]) {
        super(game, id);

        this.container.addChild(this.image);
        this.container.zIndex = ZIndexes.ObstaclesLayer3;
        this.updateFromData(data);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.ThrowableProjectile], isNew = false): void {
        if (data.full) {
            this.image.setFrame(data.full.definition.animation.liveImage);
            this.radius = data.full.definition.radius;
        }

        this.position = data.position;
        this.rotation = data.rotation;

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
