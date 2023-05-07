import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Player } from "../objects/player";

export enum PacketType {
    JoinPacket, MapPacket, UpdatePacket
}

export abstract class Packet {
    allocBytes: number;
    type: PacketType;

    player: Player;

    protected constructor(player: Player) {
        this.player = player;
    }

    serialize(stream: SuroiBitStream): void {
        stream.writeUint8(this.type);
    }

    abstract deserialize(stream: SuroiBitStream);
}
