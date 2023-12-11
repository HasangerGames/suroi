import { ObjectCategory } from "../../../common/src/constants.js";
import { Decals, type DecalDefinition } from "../../../common/src/definitions/decals.js";
import { type ReifiableDef } from "../../../common/src/utils/objectDefinitions.js";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations.js";
import { randomRotation } from "../../../common/src/utils/random.js";
import { type Vector } from "../../../common/src/utils/vector.js";
import { type Game } from "../game.js";
import { GameObject } from "./gameObject.js";

export class Decal extends GameObject<ObjectCategory.Decal> {
    override readonly type = ObjectCategory.Decal;

    readonly definition: DecalDefinition;

    constructor(game: Game, definition: ReifiableDef<DecalDefinition>, position: Vector, rotation?: number) {
        super(game, position);

        this.definition = Decals.reify(definition);

        this.rotation = rotation ?? randomRotation();
    }

    override get data(): Required<ObjectsNetData[ObjectCategory.Decal]> {
        return this;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    override damage(): void { }
}
