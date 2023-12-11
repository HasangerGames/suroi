import { ObjectCategory, ZIndexes } from "../../../../common/src/constants.js";
import { type DecalDefinition } from "../../../../common/src/definitions/decals.js";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations.js";
import type { Game } from "../game.js";
import { GameObject } from "./gameObject.js";
import { SuroiSprite, toPixiCoords } from "../utils/pixi.js";
import { FloorTypes } from "../../../../common/src/utils/terrain.js";

export class Decal extends GameObject<ObjectCategory.Decal> {
    override readonly type = ObjectCategory.Decal;

    definition!: DecalDefinition;

    readonly image: SuroiSprite;

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.Decal]>) {
        super(game, id);

        this.image = new SuroiSprite();

        this.updateFromData(data);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Decal]): void {
        this.position = data.position;

        const definition = this.definition = data.definition;

        this.image.setFrame(definition.image ?? definition.idString);
        this.container.addChild(this.image);
        this.container.zIndex = definition.zIndex ?? ZIndexes.Decals;
        this.container.scale.set(definition.scale ?? 1);

        this.container.position.copyFrom(toPixiCoords(this.position));
        this.container.rotation = data.rotation;

        if (FloorTypes[this.game.map.terrain.getFloor(this.position)].overlay && !definition.zIndex) {
            this.container.zIndex = ZIndexes.UnderWaterDeadObstacles;
        }
    }
}
