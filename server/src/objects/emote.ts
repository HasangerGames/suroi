import { Emotes, type EmoteDefinition } from "../../../common/src/definitions/emotes.js";
import { type ReifiableDef } from "../../../common/src/utils/objectDefinitions.js";
import { type Player } from "./player.js";

export class Emote {
    readonly definition: EmoteDefinition;

    readonly player: Player;
    readonly playerID: number;

    constructor(definition: ReifiableDef<EmoteDefinition>, player: Player) {
        this.definition = Emotes.reify(definition);
        this.player = player;
        this.playerID = player.id;
    }
}
