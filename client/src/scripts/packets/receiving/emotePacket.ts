import { ReceivingPacket } from "../../types/receivingPacket";

import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ObjectCategory } from "../../../../../common/src/constants";
import { type EmoteDefinition } from "../../../../../common/src/definitions/emotes";
import { Player } from "../../objects/player";

export class EmotePacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const type = stream.readObjectTypeNoCategory<ObjectCategory.Emote, EmoteDefinition>(ObjectCategory.Emote);
        const playerID = stream.readObjectID();
        const player = this.playerManager.game.objects.get(playerID);
        if (player === undefined || !(player instanceof Player)) return;
        player.emote(type);
    }
}
