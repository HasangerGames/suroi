import { ObjectCategory } from "../constants";
import { SDeepMutable, SDeepPartial } from "../utils/misc";
import { SuroiByteStream } from "../utils/suroiByteStream";
import { type Packets } from "./packetStream";

export enum PacketType {
    Disconnect,
    GameOver,
    Input,
    Joined,
    Join,
    Kill,
    Map,
    Pickup,
    Report,
    Spectate,
    Update
}

export const enum DataSplitTypes {
    PlayerData,
    Players,
    Obstacles,
    Loots,
    SyncedParticles,
    GameObjects,
    Killfeed
}

export function getSplitTypeForCategory(category: ObjectCategory): DataSplitTypes {
    /* eslint-disable @stylistic/no-multi-spaces */
    switch (category) {
        case ObjectCategory.Player:              return DataSplitTypes.Players;
        case ObjectCategory.Obstacle:            return DataSplitTypes.Obstacles;
        case ObjectCategory.DeathMarker:         return DataSplitTypes.GameObjects;
        case ObjectCategory.Loot:                return DataSplitTypes.Loots;
        case ObjectCategory.Building:            return DataSplitTypes.GameObjects;
        case ObjectCategory.Decal:               return DataSplitTypes.GameObjects;
        case ObjectCategory.Parachute:           return DataSplitTypes.GameObjects;
        case ObjectCategory.Projectile: return DataSplitTypes.GameObjects;
        case ObjectCategory.SyncedParticle:      return DataSplitTypes.SyncedParticles;
    }
    /* eslint-enable @stylistic/no-multi-spaces */
};

export type DataSplit = Record<DataSplitTypes, number>;

export type AnyPacket = typeof Packets[number]; // Packets is declared in a separate file (packetStream.ts) to prevent circular imports

export type PacketDataIn<T extends AnyPacket = AnyPacket> = T extends Packet<infer DataIn> ? DataIn : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type PacketDataOut<T extends AnyPacket = AnyPacket> = T extends Packet<infer _DataIn, infer DataOut> ? DataOut : never;

export type MutablePacketDataIn = PacketDataIn | SDeepMutable<PacketDataIn>;

interface BasePacketData { readonly type: PacketType }
export class Packet<DataIn extends BasePacketData, DataOut extends BasePacketData = DataIn> {
    serialize: (stream: SuroiByteStream, data: DataIn) => void;
    deserialize: (stream: SuroiByteStream, splits?: DataSplit) => DataOut;

    constructor(
        readonly type: PacketType,
        { serialize, deserialize }: {
            serialize: (stream: SuroiByteStream, data: DataIn) => void
            deserialize: (
                stream: SuroiByteStream,
                data: SDeepMutable<DataOut>,
                saveIndex: () => void,
                recordTo: (target: DataSplitTypes) => void
            ) => void
        }
    ) {
        this.serialize = serialize;
        this.deserialize = (stream, splits): DataOut => {
            let savedIndex: number;
            const data = { type: this.type } as unknown as SDeepMutable<DataOut>;
            deserialize(
                stream,
                data,
                () => savedIndex = stream.index,
                target => splits && (splits[target] += stream.index - savedIndex)
            );
            return data as DataOut;
        };
    }

    create(data = {} as SDeepPartial<DataIn>): SDeepMutable<DataIn> {
        return { ...data, type: this.type } as SDeepMutable<DataIn>;
    }
}
