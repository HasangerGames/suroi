import { Packet, PacketType } from "./packet";
import { SuroiBitStream } from "../utils/suroiBitStream";
import { Player } from "../objects/player";

export class UpdatePacket extends Packet {

    constructor(player: Player) {
        super(player);
        this.type = PacketType.UpdatePacket;
        this.allocBytes = 8192;
    }

    serialize(stream: SuroiBitStream) {
        super.serialize(stream);
        const p = this.player;
        stream.writeBoolean(p.healthDirty);
        if (p.healthDirty) stream.writeFloat(p.health, 0, 100, 8);
        stream.writeBoolean(p.adrenalineDirty);
        if (p.adrenalineDirty) stream.writeFloat(p.adrenaline, 0, 100, 8);
    }

    deserialize(stream: SuroiBitStream) {
    }

}
