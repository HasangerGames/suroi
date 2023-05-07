import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../common/src/constants/packetType";
import { type SendingPacket } from "./types/sendingPacket";
import { type Player } from "./objects/player";
import { UpdatePacket } from "./packets/receiving/updatePacket";

export class Game {
    socket: WebSocket;

    players: Set<Player> = new Set<Player>();
    activePlayer: Player;

    constructor(address: string) {
        if (address === undefined) return;

        this.socket = new WebSocket(address);
        this.socket.binaryType = "arraybuffer";
        this.socket.onmessage = (message: MessageEvent) => {
            const stream = new SuroiBitStream(message.data);
            switch (stream.readUint8()) {
                case PacketType.Update: {
                    new UpdatePacket(this.activePlayer).deserialize(stream);
                }
            }
        };

        $("canvas").addClass("active");
        global.activeGame = this;
        global.phaser.scene.start("game");
    }

    sendPacket(packet: SendingPacket): void {
        const stream = SuroiBitStream.alloc(packet.allocBytes);
        try {
            packet.serialize(stream);
        } catch (e) {
            console.error("Error serializing packet. Details:", e);
        }
        this.sendData(stream);
    }

    sendData(stream: SuroiBitStream): void {
        try {
            this.socket.send(stream.buffer.slice(0, Math.ceil(stream.index / 8)));
        } catch (e) {
            console.warn("Error sending packet. Details:", e);
        }
    }
}
