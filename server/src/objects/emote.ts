import { ObjectCategory } from "../../../common/src/constants";
import { type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { type Player } from "./player";

export class Emote<Def extends EmoteDefinition = EmoteDefinition> {
    readonly type: ObjectType<ObjectCategory.Emote>;

    readonly player: Player;

    constructor(definition: ReferenceTo<Def> | Def, player: Player) {
        const idString = typeof definition === "string" ? definition : definition.idString;
        this.type = ObjectType.fromString(ObjectCategory.Emote, idString);
        this.player = player;
    }
}
