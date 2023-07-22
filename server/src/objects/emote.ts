import { type ObjectCategory } from "../../../common/src/constants";
import { type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { type ObjectType } from "../../../common/src/utils/objectType";
import { type Player } from "./player";

export class Emote {
    type: ObjectType<ObjectCategory.Emote, EmoteDefinition>;
    player: Player;

    constructor(type: ObjectType<ObjectCategory.Emote, EmoteDefinition>, player: Player) {
        this.type = type;
        this.player = player;
    }
}
