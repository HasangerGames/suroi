import { SuroiByteStream } from "../utils/suroiByteStream";
import { GameOverPacket } from "./gameOverPacket";
import { InputPacket } from "./inputPacket";
import { JoinPacket } from "./joinPacket";
import { JoinedPacket } from "./joinedPacket";
import { KillPacket } from "./killPacket";
import { MapPacket } from "./mapPacket";
import { DataSplit, MutablePacketDataIn, PacketDataOut } from "./packet";
import { PickupPacket } from "./pickupPacket";
import { ReportPacket } from "./reportPacket";
import { SpectatePacket } from "./spectatePacket";
import { UpdatePacket } from "./updatePacket";

export const Packets = [
    GameOverPacket,
    InputPacket,
    JoinedPacket,
    JoinPacket,
    KillPacket,
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
        const type = data.type - 1;
        this.stream.writeUint8(type);
        Packets[type].serialize(this.stream, data as never);
    }

    deserialize(splits?: DataSplit): PacketDataOut | undefined {
        if (this.stream.buffer.byteLength <= this.stream.index) return;

        const type = this.stream.readUint8();
        return Packets[type].deserialize(this.stream, splits) as PacketDataOut;
    }

    getBuffer(): ArrayBuffer {
        // it is, in fact, a necessary type assertion; ts isn't happy without it
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        return this.stream.buffer.slice(0, this.stream.index) as ArrayBuffer;
    }
}
