import { SuroiByteStream } from "../utils/suroiByteStream";
import { DisconnectPacket } from "./disconnectPacket";
import { GameOverPacket } from "./gameOverPacket";
import { InputPacket } from "./inputPacket";
import { JoinPacket } from "./joinPacket";
import { JoinedPacket } from "./joinedPacket";
import { KillFeedPacket } from "./killFeedPacket";
import { MapPacket } from "./mapPacket";
import { DataSplit, MutablePacketDataIn, PacketDataOut } from "./packet";
import { PickupPacket } from "./pickupPacket";
import { ReportPacket } from "./reportPacket";
import { SpectatePacket } from "./spectatePacket";
import { UpdatePacket } from "./updatePacket";

export const Packets = [
    DisconnectPacket,
    GameOverPacket,
    InputPacket,
    JoinedPacket,
    JoinPacket,
    KillFeedPacket,
    MapPacket,
    PickupPacket,
    ReportPacket,
    SpectatePacket,
    UpdatePacket
] as const;

export class PacketStream {
    readonly stream: SuroiByteStream;

    constructor(source: SuroiByteStream | ArrayBuffer) {
        if (source instanceof ArrayBuffer) {
            this.stream = new SuroiByteStream(source);
        } else {
            this.stream = source;
        }
    }

    serialize(data: MutablePacketDataIn): void {
        const type = data.type;
        this.stream.writeUint8(type);
        Packets[type].serialize(this.stream, data as never);
    }

    deserialize(splits?: DataSplit): PacketDataOut | undefined {
        if (this.stream.buffer.byteLength <= this.stream.index) return;

        const type = this.stream.readUint8();
        return Packets[type].deserialize(this.stream, splits) as PacketDataOut;
    }

    getBuffer(): ArrayBuffer {
        return this.stream.buffer.slice(0, this.stream.index);
    }
}
