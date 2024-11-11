import { ObjectCategory } from "@common/constants";
import { Decals, type DecalDefinition } from "@common/definitions/decals";
import { type ReifiableDef } from "@common/utils/objectDefinitions";
import { type FullData } from "@common/utils/objectsSerializations";
import { randomRotation } from "@common/utils/random";
import { type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { BaseGameObject } from "./gameObject";

export class Decal extends BaseGameObject.derive(ObjectCategory.Decal) {
    override readonly fullAllocBytes = 1;
    override readonly partialAllocBytes = 12;

    declare hitbox?: undefined;

    readonly definition: DecalDefinition;

    constructor(game: Game, definition: ReifiableDef<DecalDefinition>, position: Vector, rotation?: number, layer?: number) {
        super(game, position);

        this.definition = Decals.reify(definition);

        this.rotation = rotation ?? randomRotation();
        this.layer = layer ?? 0;
    }

    override get data(): FullData<ObjectCategory.Decal> {
        return this;
    }

    override damage(): void { /* can't damage a decal */ }
}
