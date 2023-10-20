import { ObjectCategory } from "../../../common/src/constants";
import { Decals, type DecalDefinition } from "../../../common/src/definitions/decals";
import { type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { ObjectSerializations } from "../../../common/src/utils/objectsSerializations";
import { randomRotation } from "../../../common/src/utils/random";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type Vector } from "../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";

export class Decal<Def extends DecalDefinition = DecalDefinition> extends GameObject {
    override readonly type = ObjectCategory.Decal;
    override createObjectType(): ObjectType<this["type"], Def> {
        return ObjectType.fromString(this.type, this.definition.idString);
    }

    readonly definition: Def;

    constructor(game: Game, definition: ReferenceTo<Def> | Def, position: Vector, rotation?: number) {
        super(game, position);

        this.definition = typeof definition === "string" ? (definition = Decals.getByIDString<Def>(definition)) : definition;

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
