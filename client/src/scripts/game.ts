import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../common/src/packets/packet";
import { type Player } from "../../../common/src/objects/player";

export class Game {
    players: Set<Player> = new Set<Player>();

    activePlayer: Player;

    constructor (address: string) {
        if (address === undefined) return;

        const ws = new WebSocket(address);
        ws.onmessage = (message: MessageEvent) => {
            const stream = new SuroiBitStream(message.data);
            switch (stream.readUint8()) {
                case PacketType.UpdatePacket: {
                    const updatePacket = new UpdatePacket(this.activePlayer);
                    updatePacket.deserialize(stream);
                }
            }
        };

        $("canvas").addClass("active");
        global.phaser.scene.start("game");
    }
}
