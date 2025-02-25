import { ObjectCategory } from "../constants";
import { type SuroiByteStream } from "../utils/suroiByteStream";

/*
    eslint-disable

    @typescript-eslint/explicit-function-return-type
*/

/*
    `@typescript-eslint/explicit-function-return-type`: Most of the return types in this file can't be written out if you wanted to
*/

export const enum DataSplitTypes {
    PlayerData,
    OtherPlayers,
    Obstacles,
    Loots,
    SyncedParticles,
    GameObjects,
    Killfeed
}

export function getSplitTypeForCategory(category: ObjectCategory): DataSplitTypes {
    /* eslint-disable @stylistic/no-multi-spaces */
    switch (category) {
        case ObjectCategory.Player:              return DataSplitTypes.OtherPlayers;
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

/**
 * `Input` refers to the type associated with serialization, while `Output`
 * refers to the type associated with deserialization
 */
export type PacketTemplate<Input = unknown, Output = Input> = (new (...args: never[]) => InputPacket<Input> & OutputPacket<Output>) & {
    readonly name: string // === Function.name
    create(value: Input): InputPacket<Input>
    read(stream: SuroiByteStream, splitData?: { splits: DataSplit, activePlayerId: number }): OutputPacket<Output>
};

export type InputPacket<Input = unknown> = {
    readonly input: Input
    serialize(stream: SuroiByteStream): void
};

export type OutputPacket<Output = unknown> = {
    readonly output: Output
};

export type Packet<Input = never, Output = unknown> = {
    readonly value: Input | Output
};

export function createPacket<const Name extends string = string>(name: Name) {
    return <const Input, const Output = Input>(
        { serialize, deserialize }: {
            serialize: (stream: SuroiByteStream, value: Input) => void
            deserialize: (
                stream: SuroiByteStream,
                [
                    saveIndex,
                    recordTo,
                    activePlayerId
                ]: readonly [() => void, (target: DataSplitTypes) => void, number]
            ) => Output
        }
    ) => {
        let constructing = false;
        const cls = {
            [name]: class implements InputPacket<Input>, OutputPacket<Output> {
                static create(value: Input) {
                    constructing = true;
                    const inst = new this(value);
                    constructing = false;
                    return inst;
                }

                static read(stream: SuroiByteStream, splitData?: { splits: DataSplit, activePlayerId: number }) {
                    const { splits, activePlayerId } = splitData ?? {};

                    constructing = true;
                    const inst = new this(deserialize(
                        stream,
                        (() => {
                            let ref = 0;

                            return [
                                () => { ref = stream.index; },
                                splits === undefined
                                    ? () => { /* noop */ }
                                    : (target: DataSplitTypes) => { splits[target] += stream.index - ref; },
                                activePlayerId ?? NaN
                            ];
                        })()
                    ));
                    constructing = false;
                    return inst;
                }

                // unsafe—proper usage is up to the caller
                get input(): Input { return this._value as Input; }
                get output(): Output { return this._value as Output; }

                constructor(private readonly _value: Input | Output) {
                    if (!constructing) {
                        throw new Error("Do not manually instantiate a packet, use its static 'create' method instead");
                    }
                }

                serialize(stream: SuroiByteStream): void { serialize(stream, this.input); }
            }
        }[name];

        return cls as PacketTemplate<Input, Output>;
    };
}
