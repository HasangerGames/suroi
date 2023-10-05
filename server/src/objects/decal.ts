import { ObjectCategory } from "../../../common/src/constants";
import { type DecalDefinition } from "../../../common/src/definitions/decals";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { ObjectSerializations } from "../../../common/src/utils/objectsSerializations";
import { randomRotation } from "../../../common/src/utils/random";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";

export class Decal extends GameObject {
    constructor(game: Game, type: ObjectType<ObjectCategory.Decal, DecalDefinition>, position: Vector, rotation?: number) {
        super(game, type, position);
        this.rotation = rotation ?? randomRotation();
    }

    override serializeFull(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Decal].serializeFull(stream, this);
    }

    override serializePartial(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.Decal].serializePartial(stream, this);
    }

    override damage(): void { }
}
