import { SuroiByteStream } from "../utils/suroiByteStream";
import { DisconnectPacket } from "./disconnectPacket";
import { GameOverPacket } from "./gameOverPacket";
import { PlayerInputPacket } from "./inputPacket";
import { JoinPacket } from "./joinPacket";
import { JoinedPacket } from "./joinedPacket";
import { KillFeedPacket } from "./killFeedPacket";
import { MapPacket } from "./mapPacket";
import { type DataSplit, type InputPacket, type OutputPacket, type PacketTemplate } from "./packet";
import { PickupPacket } from "./pickupPacket";
import { ReportPacket } from "./reportPacket";
import { SpectatePacket } from "./spectatePacket";
import { UpdatePacket } from "./updatePacket";

class PacketRegister {
    private _nextTypeId = 0;
    readonly typeToId = new Map<PacketTemplate, number>();
    readonly idToTemplate: PacketTemplate[] = [];

    constructor(...packets: PacketTemplate[]) {
        for (const packet of packets) {
            this._register(packet);
        }
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
    JoinPacket,
    SpectatePacket
);

export const ServerToClientPackets = new PacketRegister(
    UpdatePacket,
    KillFeedPacket,
    PickupPacket,
    JoinedPacket,
    MapPacket,
    GameOverPacket,
    ReportPacket,
    DisconnectPacket
);

export class PacketStream {
    readonly stream: SuroiByteStream;

    constructor(source: SuroiByteStream | ArrayBuffer) {
        if (source instanceof ArrayBuffer) {
            this.stream = new SuroiByteStream(source);
        } else {
            this.stream = source;
        }
    }

    serializeServerPacket(packet: InputPacket): void {
        this._serializePacket(packet, ServerToClientPackets);
    }

    deserializeServerPacket(splitData?: { splits: DataSplit, activePlayerId: number }): OutputPacket | undefined {
        return this._deserializePacket(ServerToClientPackets, splitData);
    }

    serializeClientPacket(packet: InputPacket): void {
        this._serializePacket(packet, ClientToServerPackets);
    }

    deserializeClientPacket(): OutputPacket | undefined {
        return this._deserializePacket(ClientToServerPackets);
    }

    private _deserializePacket(register: PacketRegister, splitData?: { splits: DataSplit, activePlayerId: number }): OutputPacket | undefined {
        if (this.stream.buffer.byteLength > this.stream.index) {
            return register.idToTemplate[this.stream.readUint8()].read(this.stream, splitData);
        }
        return undefined;
    }

    private _serializePacket(packet: InputPacket, register: PacketRegister): void {
        const name = packet.constructor.name;
        const type = register.typeToId.get(packet.constructor as PacketTemplate);
        if (type === undefined) {
            throw new Error(`Unknown packet type: ${name}, did you forget to register it?`);
        }

        this.stream.writeUint8(type);
        packet.serialize(this.stream);
    }

    getBuffer(): ArrayBuffer {
        return this.stream.buffer.slice(0, this.stream.index);
    }
}
