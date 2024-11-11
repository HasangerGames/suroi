import { ObjectCategory, ZIndexes } from "@common/constants";
import { type DecalDefinition } from "@common/definitions/decals";
import { getEffectiveZIndex } from "@common/utils/layer";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { type Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class Decal extends GameObject.derive(ObjectCategory.Decal) {
    definition!: DecalDefinition;

    readonly image: SuroiSprite;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.Decal]) {
        super(game, id);

        this.image = new SuroiSprite();

        this.layer = data.layer;

        this.updateFromData(data);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Decal]): void {
        this.position = data.position;

        this.layer = data.layer;

        const definition = this.definition = data.definition;

        this.image.setFrame(definition.image);
        this.container.addChild(this.image);
        this.container.scale.set(definition.scale);

        this.container.position.copyFrom(toPixiCoords(this.position));
        this.container.rotation = data.rotation;

        this.updateZIndex();
    }

    override updateZIndex(): void {
        const zIndex = this.doOverlay() && this.definition.zIndex === undefined
            ? ZIndexes.UnderWaterDeadObstacles
            : this.definition.zIndex ?? ZIndexes.Decals;
        this.container.zIndex = getEffectiveZIndex(zIndex, this.layer, this.game.layer);
    }

    override destroy(): void {
        this.image.destroy();
    }
}
