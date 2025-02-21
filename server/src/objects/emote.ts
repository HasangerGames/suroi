import { EmoteDefinition } from "@common/definitions/emotes";
import { type Player } from "./player";

export class Emote {
    readonly playerID: number;

    constructor(
        readonly definition: EmoteDefinition,
        readonly player: Player
    ) {
        this.playerID = player.id;
    }
}
