import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { Decals, type DecalDefinition } from "../../../../common/src/definitions/decals";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import type { Game } from "../game";
import { GameObject } from "../types/gameObject";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";

import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type DecalDefinition } from "../../../../common/src/definitions/decals";

export class Decal extends GameObject {
    declare readonly type: ObjectType<ObjectCategory.Decal, DecalDefinition>;

    readonly image: SuroiSprite;

    constructor(game: Game, type: ObjectType, id: number) {
        super(game, type, id);

        const def = this.type.definition;

        this.image = new SuroiSprite(def.image ?? def.idString);
        this.container.addChild(this.image);
        this.container.zIndex = def.zIndex ?? ZIndexes.Decals;
        this.container.scale.set(def.scale ?? 1);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Decal]): void {
        this.position = data.position;

        this.container.position.copyFrom(toPixiCoords(this.position));
        this.container.rotation = data.rotation;
    }
}
