import Phaser from "phaser";
import { SuroiScene } from "./suroiScene";
import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../common/src/packets/packet";
import { type Player } from "../../../common/src/objects/player";

export class Game {
    players: Set<Player> = new Set<Player>();

    activePlayer: Player;

    constructor (address: string) {
        const config = {
            type: Phaser.AUTO,
            width: 1600,
            height: 900,
            scene: SuroiScene,
            backgroundColor: "#317229",
            scale: {
                parent: "body",
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };

        if (address === undefined) return;

        /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        const game = new Phaser.Game(config);
        const ws = new WebSocket(address);

        ws.onmessage = (message) => {
            const stream = new SuroiBitStream(message.data);
            switch (stream.readUint8()) {
                case PacketType.UpdatePacket: {
                    const updatePacket = new UpdatePacket(this.activePlayer);
                    updatePacket.deserialize(stream);
                }
            }
        };
    }
}
