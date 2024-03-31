import { PacketType } from "../constants";
import { SuroiBitStream } from "../utils/suroiBitStream";
import { GameOverPacket } from "./gameOverPacket";
import { InputPacket } from "./inputPacket";
import { JoinPacket } from "./joinPacket";
import { JoinedPacket } from "./joinedPacket";
import { MapPacket } from "./mapPacket";
import { type AbstractPacket } from "./packet";
import { PickupPacket } from "./pickupPacket";
import { PingPacket } from "./pingPacket";
import { ReportPacket } from "./reportPacket";
import { SpectatePacket } from "./spectatePacket";
import { UpdatePacket } from "./updatePacket";

const PacketTypeToConstructor = {
    [PacketType.Join]: JoinPacket,
    [PacketType.Joined]: JoinedPacket,
    [PacketType.Map]: MapPacket,
    [PacketType.Update]: UpdatePacket,
    [PacketType.Input]: InputPacket,
    [PacketType.GameOver]: GameOverPacket,
    [PacketType.Pickup]: PickupPacket,
    [PacketType.Ping]: PingPacket,
    [PacketType.Spectate]: SpectatePacket,
    [PacketType.Report]: ReportPacket,
    [PacketType.MapPing]: MapPacket
};

export type Packet = JoinPacket |
JoinedPacket |
MapPacket |
UpdatePacket |
InputPacket |
GameOverPacket |
PickupPacket |
PingPacket |
SpectatePacket |
ReportPacket;

export class PacketStream {
    stream: SuroiBitStream;

    constructor(source: ArrayBuffer | SuroiBitStream) {
        this.stream = source instanceof ArrayBuffer ? new SuroiBitStream(source) : source;
    }

    serializePacket(packet: AbstractPacket): void {
        this.stream.writePacketType(packet.type);
        packet.serialize(this.stream);
        this.stream.writeAlignToNextByte();
    }

    readPacket(): Packet | undefined {
        const packetType = this.stream.readPacketType();
        if (packetType === undefined) return undefined;

        const packet = new PacketTypeToConstructor[packetType]();
        packet.deserialize(this.stream);

        this.stream.readAlignToNextByte();
        return packet as Packet;
    }

    getBuffer(): ArrayBuffer {
        return this.stream.buffer.slice(0, Math.ceil(this.stream.index / 8));
    }
}
