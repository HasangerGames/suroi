import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type DecalDefinition } from "../../../../common/src/definitions/decals";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { type Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class Decal extends GameObject<ObjectCategory.Decal> {
    override readonly type = ObjectCategory.Decal;

    definition!: DecalDefinition;

    readonly image: SuroiSprite;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.Decal]) {
        super(game, id);

        this.image = new SuroiSprite();

        this.updateFromData(data);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Decal]): void {
        this.position = data.position;

        const definition = this.definition = data.definition;

        this.image.setFrame(definition.image);
        this.container.addChild(this.image);
        this.container.zIndex = definition.zIndex ?? ZIndexes.Decals;
        this.container.scale.set(definition.scale);

        this.container.position.copyFrom(toPixiCoords(this.position));
        this.container.rotation = data.rotation;

        if (FloorTypes[this.game.map.terrain.getFloor(this.position)].overlay && definition.zIndex === undefined) {
            this.container.zIndex = ZIndexes.UnderWaterDeadObstacles;
        }
    }

    override destroy(): void {
        this.image.destroy();
    }
}
