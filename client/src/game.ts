import Phaser from "phaser";
import { SuroiScene } from "./suroiScene";
import { UpdatePacket } from "../../common/dist/packets/updatePacket";
import { SuroiBitStream } from "../../common/dist/utils/suroiBitStream";
import { PacketType } from "../../common/dist/packets/packet";
import { Player } from "../../common/dist/objects/player";

export class Game {

    players: Set<Player> = new Set<Player>();

    activePlayer: Player;

    constructor(address: string) {
        const config = {
            type: Phaser.AUTO,
            width: 1600,
            height: 900,
            scene: SuroiScene,
            backgroundColor: "#317229"
        };
        const game = new Phaser.Game(config);

        const ws = new WebSocket(address);
        ws.onmessage = function(message) {
            const stream = new SuroiBitStream(message.data);
            switch (stream.readUint8()) {
                case PacketType.UpdatePacket:
                    new UpdatePacket();
                    break;
            }
        };
    }

}
