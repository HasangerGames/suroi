import { ObjectCategory } from "../../../common/src/constants";
import { Emotes, type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { type Player } from "./player";

export class Emote<Def extends EmoteDefinition = EmoteDefinition> {
    readonly type = ObjectCategory.Emote;
    readonly definition: Def;
    createObjectType(): ObjectType<ObjectCategory.Emote, Def> {
        return ObjectType.fromString(this.type, this.definition.idString);
    }

    readonly player: Player;

    constructor(definition: ReferenceTo<Def> | Def, player: Player) {
        this.definition = typeof definition === "string" ? (definition = Emotes.getByIDString<Def>(definition)) : definition;
        this.player = player;
    }
}
