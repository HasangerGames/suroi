import { SuroiBitStream } from "../utils/suroiBitStream";
import { DisconnectPacket } from "./disconnectPacket";
import { GameOverPacket } from "./gameOverPacket";
import { InputPacket } from "./inputPacket";
import { JoinPacket } from "./joinPacket";
import { JoinedPacket } from "./joinedPacket";
import { KillFeedPacket } from "./killFeedPacket";
import { MapPacket } from "./mapPacket";
import { type Packet } from "./packet";
import { PickupPacket } from "./pickupPacket";
import { PingPacket } from "./pingPacket";
import { ReportPacket } from "./reportPacket";
import { SpectatePacket } from "./spectatePacket";
import { UpdatePacket } from "./updatePacket";

class PacketRegister {
    private _nextTypeId = 1;
    readonly typeToId: Record<string, number> = {};
    readonly idToCtor: Array<new () => Packet> = [];
    readonly bits: number;

    constructor(...packets: Array<new () => Packet>) {
        for (const packet of packets) {
            this._register(packet);
        }
        this.bits = Math.ceil(Math.log2(this._nextTypeId));
    }

    private _register(packet: new () => Packet): void {
        let name: string;
        if ((name = packet.name) in this.typeToId) {
            console.warn(`Packet ${packet.name} registered multiple times`);
            return;
        }

        const id = this._nextTypeId++;
        this.typeToId[name] = id;
        this.idToCtor[id] = packet;
    }
}

export const ClientToServerPackets = new PacketRegister(
    InputPacket,
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

    serializeServerPacket(packet: Packet): void {
        this._serializePacket(packet, ServerToClientPackets);
    }

    deserializeServerPacket(): Packet | undefined {
        return this._deserializePacket(ServerToClientPackets);
    }

    serializeClientPacket(packet: Packet): void {
        this._serializePacket(packet, ClientToServerPackets);
    }

    deserializeClientPacket(): Packet | undefined {
        return this._deserializePacket(ClientToServerPackets);
    }

    private _deserializePacket(register: PacketRegister): Packet | undefined {
        if (this.stream.length - this.stream.byteIndex * 8 >= 1) {
            const id = this.stream.readBits(register.bits);
            const packet = new register.idToCtor[id]();
            packet.deserialize(this.stream);
            this.stream.readAlignToNextByte();
            return packet;
        }
        return undefined;
    }

    private _serializePacket(packet: Packet, register: PacketRegister): void {
        const name = packet.constructor.name;
        if (!(name in register.typeToId)) {
            throw new Error(`Unknown packet type: ${name}, did you forget to register it?`);
        }

        const type = register.typeToId[name];
        this.stream.writeBits(type, register.bits);
        packet.serialize(this.stream);
        this.stream.writeAlignToNextByte();
    }

    getBuffer(): ArrayBuffer {
        return this.stream.buffer.slice(0, this.stream.byteIndex);
    }
}
