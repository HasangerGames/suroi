import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Game } from "../game";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class Projectile extends GameObject<ObjectCategory.Projectile> {
    override readonly type = ObjectCategory.Projectile;

    readonly image = new SuroiSprite();
    radius?: number;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.Projectile]) {
        super(game, id);

        this.container.addChild(this.image);
        this.container.zIndex = ZIndexes.ObstaclesLayer3;
        this.updateFromData(data);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Projectile], isNew = false): void {
        if (data.full) {
            this.image.setFrame(data.full.definition.animation.cook.liveImage);
            this.radius = data.full.hitboxRadius;
        }

        this.position = data.position;
        this.rotation = data.rotation;

        this.container.position.copyFrom(toPixiCoords(this.position));
        this.container.rotation = this.rotation;

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
