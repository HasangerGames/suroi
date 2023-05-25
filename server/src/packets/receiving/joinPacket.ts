import { ReceivingPacket } from "../../types/receivingPacket";
import { JoinedPacket } from "../sending/joinedPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

export class JoinPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const p = this.player;
        const game = p.game;

        game.players.add(p);
        game.livingPlayers.add(p);
        game.connectedPlayers.add(p);
        game.dynamicObjects.add(p);
        game.fullDirtyObjects.add(p);
        game.updateObjects = true;

        p.updateVisibleObjects();
        p.joined = true;
        p.sendPacket(new JoinedPacket(p));
    }
}
