import { SuroiBitStream } from "../utils/suroiBitStream";
import { DisconnectPacket } from "./disconnectPacket";
import { GameOverPacket } from "./gameOverPacket";
import { PlayerInputPacket } from "./inputPacket";
import { JoinPacket } from "./joinPacket";
import { JoinedPacket } from "./joinedPacket";
import { KillFeedPacket } from "./killFeedPacket";
import { MapPacket } from "./mapPacket";
import { type InputPacket, type OutputPacket, type PacketTemplate } from "./packet";
import { PickupPacket } from "./pickupPacket";
import { PingPacket } from "./pingPacket";
import { ReportPacket } from "./reportPacket";
import { SpectatePacket } from "./spectatePacket";
import { UpdatePacket } from "./updatePacket";

class PacketRegister {
    private _nextTypeId = 0;
    readonly typeToId = new Map<PacketTemplate, number>();
    readonly idToTemplate: PacketTemplate[] = [];
    readonly bits: number;

    constructor(...packets: PacketTemplate[]) {
        for (const packet of packets) {
            this._register(packet);
        }
        this.bits = Math.ceil(Math.log2(this._nextTypeId));
    }

    private _register(packet: PacketTemplate): void {
        let name: string;
        if ((name = packet.name) in this.typeToId) {
            console.warn(`Packet ${name} registered multiple times`);
            return;
        }

        const id = this._nextTypeId++;
        this.typeToId.set(packet, id);
        this.idToTemplate[id] = packet;
    }
}

export const ClientToServerPackets = new PacketRegister(
    PlayerInputPacket,
    PingPacket,
    JoinPacket,
    SpectatePacket
);

export const ServerToClientPackets = new PacketRegister(
    UpdatePacket,
    KillFeedPacket,
    PickupPacket,
    PingPacket,
    JoinedPacket,
    MapPacket,
    GameOverPacket,
    ReportPacket,
    DisconnectPacket
);

export class PacketStream {
    stream: SuroiBitStream;

    constructor(source: SuroiBitStream | ArrayBuffer) {
        if (source instanceof ArrayBuffer) {
            this.stream = new SuroiBitStream(source);
        } else {
            this.stream = source;
        }
    }

    serializeServerPacket(packet: InputPacket): void {
        this._serializePacket(packet, ServerToClientPackets);
    }

    deserializeServerPacket(): OutputPacket | undefined {
        return this._deserializePacket(ServerToClientPackets);
    }

    serializeClientPacket(packet: InputPacket): void {
        this._serializePacket(packet, ClientToServerPackets);
    }

    deserializeClientPacket(): OutputPacket | undefined {
        return this._deserializePacket(ClientToServerPackets);
    }

    private _deserializePacket(register: PacketRegister): OutputPacket | undefined {
        if (this.stream.length - this.stream.byteIndex * 8 >= 1) {
            const id = this.stream.readBits(register.bits);
            const packet = register.idToTemplate[id].read(this.stream);
            this.stream.readAlignToNextByte();
            return packet;
        }
        return undefined;
    }

    private _serializePacket(packet: InputPacket, register: PacketRegister): void {
        const name = packet.constructor.name;
        const type = register.typeToId.get(packet.constructor as PacketTemplate);
        if (type === undefined) {
            throw new Error(`Unknown packet type: ${name}, did you forget to register it?`);
        }

        this.stream.writeBits(type, register.bits);
        packet.serialize(this.stream);
        this.stream.writeAlignToNextByte();
    }

    getBuffer(): ArrayBuffer {
        return this.stream.buffer.slice(0, this.stream.byteIndex);
    }
}
