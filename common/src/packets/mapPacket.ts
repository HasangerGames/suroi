import { Packet, PacketType } from "./packet";
import { type Player } from "../objects/player";
import { type SuroiBitStream } from "../utils/suroiBitStream";

export class MapPacket extends Packet {
    constructor (player: Player) {
        super(player);
        this.type = PacketType.MapPacket;
        this.allocBytes = 8192;
    }

    serialize (stream: SuroiBitStream): void {
        super.serialize(stream);
    }

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    deserialize (stream: SuroiBitStream): void {}
}
