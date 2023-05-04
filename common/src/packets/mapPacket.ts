import { Packet, PacketType } from "./packet";
import { type Player } from "../objects/player";
import { type SuroiBitStream } from "../utils/suroiBitStream";

export class MapPacket extends Packet {
    constructor (player: Player) {
        super(player);
        this.type = PacketType.MapPacket;
        this.allocBytes = 8192;
    }

    serialize (stream: SuroiBitStream) {
        super.serialize(stream);
    }

    deserialize (stream: SuroiBitStream) {
    }
}
