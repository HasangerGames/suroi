import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { Decals, type DecalDefinition } from "../../../../common/src/definitions/decals";
import { type ReferenceTo, reifyDefinition } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import type { Game } from "../game";
import { GameObject } from "../types/gameObject";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";

export class Decal<Def extends DecalDefinition = DecalDefinition> extends GameObject<ObjectCategory.Decal> {
    override readonly type = ObjectCategory.Decal;

    readonly definition: Def;

    readonly image: SuroiSprite;

    constructor(game: Game, definition: Def | ReferenceTo<Def>, id: number) {
        super(game, id);

        this.definition = definition = reifyDefinition<DecalDefinition, Def>(definition, Decals);

        this.image = new SuroiSprite(definition.image ?? definition.idString);
        this.container.addChild(this.image);
        this.container.zIndex = definition.zIndex ?? ZIndexes.Decals;
        this.container.scale.set(definition.scale ?? 1);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Decal]): void {
        this.position = data.position;

        this.container.position.copyFrom(toPixiCoords(this.position));
        this.container.rotation = data.rotation;
    }
}
