import { ObjectCategory } from "../../../common/src/constants";
import { Decals, type DecalDefinition } from "../../../common/src/definitions/decals";
import { type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { randomRotation } from "../../../common/src/utils/random";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";

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
