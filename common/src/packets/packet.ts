import { ObjectCategory } from "../constants";
import { SDeepMutable } from "../utils/misc";
import { SuroiByteStream } from "../utils/suroiByteStream";

export const enum PacketType {
    Disconnect,
    GameOver,
    Input,
    Joined,
    Join,
    Killfeed,
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
export default DataSplitTypes;

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
        case ObjectCategory.ThrowableProjectile: return DataSplitTypes.GameObjects;
        case ObjectCategory.SyncedParticle:      return DataSplitTypes.SyncedParticles;
    }
    /* eslint-enable @stylistic/no-multi-spaces */
};

export type DataSplit = Record<DataSplitTypes, number>;

interface BasicPacket { readonly type: PacketType }

export class Packet<DataIn extends BasicPacket, DataOut extends BasicPacket = DataIn> {
    serialize: (stream: SuroiByteStream, data: DataIn) => void;
    deserialize: (stream: SuroiByteStream, splits: DataSplit) => DataOut;

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
            const data = {} as SDeepMutable<DataOut>;
            deserialize(
                stream,
                data,
                () => savedIndex = stream.index,
                target => splits[target] += stream.index - savedIndex
            );
            return data as DataOut;
        };
    }

    create(): SDeepMutable<DataIn> {
        return { type: this.type } as SDeepMutable<DataIn>;
    }
}
