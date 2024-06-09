import { ObjectCategory } from "../../../common/src/constants";
import { Decals, type DecalDefinition } from "../../../common/src/definitions/decals";
import { type ReifiableDef } from "../../../common/src/utils/objectDefinitions";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { randomRotation } from "../../../common/src/utils/random";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { BaseGameObject } from "./gameObject";

export class Decal extends BaseGameObject<ObjectCategory.Decal> {
    override readonly type = ObjectCategory.Decal;
    override readonly fullAllocBytes = 4;
    override readonly partialAllocBytes = 4;

    readonly definition: DecalDefinition;

    constructor(game: Game, definition: ReifiableDef<DecalDefinition>, position: Vector, rotation?: number) {
        super(game, position);

        this.definition = Decals.reify(definition);

        this.rotation = rotation ?? randomRotation();
    }

    override get data(): FullData<ObjectCategory.Decal> {
        return this;
    }

    override damage(): void { /* can't damage a decal */ }
}
