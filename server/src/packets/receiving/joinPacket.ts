import { ReceivingPacket } from "../../types/receivingPacket";
import { JoinedPacket } from "../sending/joinedPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

export class JoinPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;
        const game = player.game;

        game.players.add(player);
        game.livingPlayers.add(player);
        game.connectedPlayers.add(player);
        game.dynamicObjects.add(player);
        game.fullDirtyObjects.add(player);
        game.updateObjects = true;
        game.aliveCount++;

        player.updateVisibleObjects();
        player.joined = true;
        player.sendPacket(new JoinedPacket(player));
    }
}
