import { Packet, PacketType } from "./packet";
import { Player } from "../objects/player";
import { SuroiBitStream } from "../utils/suroiBitStream";

export class MapPacket extends Packet {

    constructor(player: Player) {
        super(player);
        this.type = PacketType.MapPacket;
        this.allocBytes = 8192;
    }

    serialize(stream: SuroiBitStream) {
        super.serialize(stream);
    }

    deserialize(stream: SuroiBitStream) {
    }

}
