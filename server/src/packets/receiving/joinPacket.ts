import { ReceivingPacket } from "../../types/receivingPacket";
import { JoinedPacket } from "../sending/joinedPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { JoinKillFeedMessage } from "../../types/killFeedMessage";
import { KillFeedPacket } from "../sending/killFeedPacket";

export class JoinPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;
        const game = player.game;

        game.livingPlayers.add(player);
        game.connectedPlayers.add(player);
        game.dynamicObjects.add(player);
        game.fullDirtyObjects.add(player);
        game.updateObjects = true;
        game.aliveCountDirty = true;
        game.killFeedMessages.add(new KillFeedPacket(player, new JoinKillFeedMessage(player.name, true)));

        player.updateVisibleObjects();
        player.joined = true;
        player.sendPacket(new JoinedPacket(player));
    }
}
