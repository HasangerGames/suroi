import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class SyncedParticle extends GameObject<ObjectCategory.SyncedParticle> {
    readonly type = ObjectCategory.SyncedParticle;

    readonly image = new SuroiSprite();

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.SyncedParticle]) {
        super(game, id);

        this.container.addChild(this.image);
        this.updateFromData(data);
    }

    updateFromData(data: ObjectsNetData[ObjectCategory.SyncedParticle], isNew = false): void {
        const full = data.full;
        if (full) {
            const { variant, definition } = full;

            this.image.setFrame(`${definition.idString}${variant !== undefined ? `_${variant}` : ""}`);
            this.image.setZIndex(definition.zIndex ?? ZIndexes.ObstaclesLayer1);
        }

        this.position = data.position;
        this.rotation = data.rotation;

        this.container.position.copyFrom(toPixiCoords(this.position));
        this.container.rotation = this.rotation;

        this.image.setAlpha(data.alpha ?? 1);
        this.image.setScale(data.scale ?? 1);
    }

    override destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
