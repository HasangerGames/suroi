import { SuroiByteStream } from "../utils/suroiByteStream";
import { DisconnectPacket } from "./disconnectPacket";
import { GameOverPacket } from "./gameOverPacket";
import { PlayerInputPacket } from "./inputPacket";
import { JoinPacket } from "./joinPacket";
import { JoinedPacket } from "./joinedPacket";
import { KillFeedPacket } from "./killFeedPacket";
import { MapPacket } from "./mapPacket";
import { BasePacket, DataSplit, PacketDataIn, PacketsDataIn, PacketType } from "./packet";
import { PickupPacket } from "./pickupPacket";
import { ReportPacket } from "./reportPacket";
import { SpectatePacket } from "./spectatePacket";
import { UpdatePacket } from "./updatePacket";

export const Packets = [
    DisconnectPacket,
    GameOverPacket,
    PlayerInputPacket,
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

    serialize(packet: PacketsDataIn): void {
        const type = packet.type;
        if (type === undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            throw new Error(`Unknown packet type: ${PacketType[packet.type]}, did you forget to register it?`);
        }

        this.stream.writeUint8(type);
        Packets[type].serialize(this.stream, packet as never);
    }

    deserialize(splits?: DataSplit): BasePacket | undefined {
        if (this.stream.buffer.byteLength <= this.stream.index) return;

        const type = this.stream.readUint8();
        return Packets[type].deserialize(this.stream, splits);
    }

    getBuffer(): ArrayBuffer {
        return this.stream.buffer.slice(0, this.stream.index);
    }
}
