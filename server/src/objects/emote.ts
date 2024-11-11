import type { AllowedEmoteSources } from "@common/packets/inputPacket";
import { type Player } from "./player";

export class Emote {
    readonly playerID: number;

    constructor(
        readonly definition: AllowedEmoteSources,
        readonly player: Player
    ) {
        this.playerID = player.id;
    }
}
