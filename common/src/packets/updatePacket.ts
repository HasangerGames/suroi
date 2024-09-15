import { type BitStream } from "@damienvesper/bit-buffer";
import { DEFAULT_INVENTORY, GameConstants, Layer, type GasState, type ObjectCategory } from "../constants";
import { Badges, type BadgeDefinition } from "../definitions/badges";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { Explosions, type ExplosionDefinition } from "../definitions/explosions";
import { Loots, type WeaponDefinition } from "../definitions/loots";
import { MapPings, type MapPing, type PlayerPing } from "../definitions/mapPings";
import { Scopes, type ScopeDefinition } from "../definitions/scopes";
import { BaseBullet, type BulletOptions } from "../utils/baseBullet";
import { type Mutable } from "../utils/misc";
import { ObjectSerializations, type FullData, type ObjectsNetData } from "../utils/objectsSerializations";
import { OBJECT_ID_BITS, type SuroiBitStream } from "../utils/suroiBitStream";
import { Vec, type Vector } from "../utils/vector";
import { createPacket } from "./packet";

interface ObjectFullData {
    readonly id: number
    readonly type: ObjectCategory
    readonly data: FullData<ObjectFullData["type"]>
}

interface ObjectPartialData {
    readonly id: number
    readonly type: ObjectCategory
    readonly data: ObjectsNetData[ObjectCategory]
}

const [serializePlayerData, deserializePlayerData] = (() => {
    const generateReadWritePair = <T, Stream extends BitStream = BitStream>(
        writer: (val: Exclude<T, undefined>, stream: Stream) => void,
        reader: (stream: Stream) => T
    ): {
        readonly write: (stream: Stream, val: T | undefined) => void
        readonly read: (stream: Stream) => T | undefined
    } => ({
        write: (stream: Stream, val: T | undefined): void => {
            const present = val !== undefined;
            stream.writeBoolean(present);

            if (present) {
                writer(val as Exclude<T, undefined>, stream);
            }
        },
        read: stream => {
            if (stream.readBoolean()) return reader(stream);
        }
    });

    const minMax = generateReadWritePair<PlayerData["minMax"]>(
        ({ maxHealth, minAdrenaline, maxAdrenaline }, stream) => {
            stream.writeFloat32(maxHealth);
            stream.writeFloat32(minAdrenaline);
            stream.writeFloat32(maxAdrenaline);
        },
        stream => ({
            maxHealth: stream.readFloat32(),
            minAdrenaline: stream.readFloat32(),
            maxAdrenaline: stream.readFloat32()
        })
    );

    const health = generateReadWritePair<PlayerData["health"], SuroiBitStream>(
        (health, stream) => stream.writeFloat(health, 0, 1, 12),
        stream => stream.readFloat(0, 1, 12)
    );

    const adrenaline = generateReadWritePair<PlayerData["adrenaline"], SuroiBitStream>(
        (adrenaline, stream) => stream.writeFloat(adrenaline, 0, 1, 12),
        stream => stream.readFloat(0, 1, 12)
    );

    const zoom = generateReadWritePair<PlayerData["zoom"]>(
        (zoom, stream) => stream.writeUint8(zoom),
        stream => stream.readUint8()
    );

    const layer = generateReadWritePair<PlayerData["layer"]>(
        (layer, stream) => stream.writeUint8(layer),
        stream => stream.readUint8()
    );

    const id = generateReadWritePair<PlayerData["id"], SuroiBitStream>(
        ({ id, spectating }, stream) => {
            stream.writeObjectID(id);
            stream.writeBoolean(spectating);
        },
        stream => ({
            id: stream.readObjectID(),
            spectating: stream.readBoolean()
        })
    );

    const teammates = generateReadWritePair<PlayerData["teammates"], SuroiBitStream>(
        (teammates, stream) => {
            stream.writeArray(teammates, 2, player => {
                stream.writeObjectID(player.id);
                stream.writePosition(player.position ?? Vec.create(0, 0));
                stream.writeFloat(player.normalizedHealth, 0, 1, 8);
                stream.writeBoolean(player.downed);
                stream.writeBoolean(player.disconnected);
            });
        },
        stream => stream.readAndCreateArray(2, () => ({
            id: stream.readObjectID(),
            position: stream.readPosition(),
            normalizedHealth: stream.readFloat(0, 1, 8),
            downed: stream.readBoolean(),
            disconnected: stream.readBoolean()
        }))
    );

    const inventory = generateReadWritePair<PlayerData["inventory"]>(
        ({ activeWeaponIndex, weapons }, stream) => {
            stream.writeBits(activeWeaponIndex, 2);

            for (const weapon of weapons ?? []) {
                stream.writeBoolean(weapon !== undefined);

                if (weapon !== undefined) {
                    const { definition, count, stats } = weapon;
                    Loots.writeToStream(stream, definition);

                    const hasCount = count !== undefined;
                    stream.writeBoolean(hasCount);
                    if (hasCount) {
                        stream.writeUint8(count);
                    }

                    if (definition.killstreak) {
                        // we pray that these nna's are correct at runtime
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        stream.writeUint8(stats!.kills!);
                    }
                }
            }
        },
        stream => ({
            activeWeaponIndex: stream.readBits(2),
            weapons: Array.from(
                { length: GameConstants.player.maxWeapons },
                () => {
                    if (!stream.readBoolean()) return;

                    const definition = Loots.readFromStream<WeaponDefinition>(stream);

                    return ({
                        definition,
                        count: stream.readBoolean() ? stream.readUint8() : undefined,
                        stats: {
                            kills: definition.killstreak ? stream.readUint8() : undefined
                        }
                    });
                }
            )
        })
    );

    const slotLocks = generateReadWritePair<PlayerData["lockedSlots"]>(
        (lockedSlots, stream) => stream.writeBits(lockedSlots, GameConstants.player.maxWeapons),
        stream => stream.readBits(GameConstants.player.maxWeapons)
    );

    const items = generateReadWritePair<PlayerData["items"]>(
        ({ items, scope }, stream) => {
            for (const item in DEFAULT_INVENTORY) {
                const count = items[item];

                stream.writeBoolean(count > 0);

                if (count > 0) {
                    stream.writeBits(count, 9);
                }
            }

            Scopes.writeToStream(stream, scope);
        },
        stream => {
            const items: typeof DEFAULT_INVENTORY = {};

            for (const item in DEFAULT_INVENTORY) {
                items[item] = stream.readBoolean() ? stream.readBits(9) : 0;
            }

            return {
                items,
                scope: Scopes.readFromStream(stream)
            };
        }
    );

    const activeC4s = generateReadWritePair<PlayerData["activeC4s"]>(
        (activeC4s, stream) => stream.writeBoolean(activeC4s),
        stream => stream.readBoolean()
    );

    return [
        (stream: SuroiBitStream, data: PlayerData): void => {
            minMax.write(stream, data.minMax);
            health.write(stream, data.health);
            adrenaline.write(stream, data.adrenaline);
            zoom.write(stream, data.zoom);
            layer.write(stream, data.layer);
            id.write(stream, data.id);
            teammates.write(stream, data.teammates);
            inventory.write(stream, data.inventory);
            slotLocks.write(stream, data.lockedSlots);
            items.write(stream, data.items);
            activeC4s.write(stream, data.activeC4s);
        },

        (stream: SuroiBitStream): PlayerData => {
            return {
                minMax: minMax.read(stream),
                health: health.read(stream),
                adrenaline: adrenaline.read(stream),
                zoom: zoom.read(stream),
                layer: layer.read(stream),
                id: id.read(stream),
                teammates: teammates.read(stream),
                inventory: inventory.read(stream),
                lockedSlots: slotLocks.read(stream),
                items: items.read(stream),
                activeC4s: activeC4s.read(stream)
            };
        }
    ];
})();

const UpdateFlags = Object.freeze({
    PlayerData: 1 << 0,
    DeletedObjects: 1 << 1,
    FullObjects: 1 << 2,
    PartialObjects: 1 << 3,
    Bullets: 1 << 4,
    Explosions: 1 << 5,
    Emotes: 1 << 6,
    Gas: 1 << 7,
    GasPercentage: 1 << 8,
    NewPlayers: 1 << 9,
    DeletedPlayers: 1 << 10,
    AliveCount: 1 << 11,
    Planes: 1 << 12,
    MapPings: 1 << 13
});

const UPDATE_FLAGS_BITS = Object.keys(UpdateFlags).length;

export type MapPingSerialization = {
    readonly position: Vector
    readonly definition: MapPing
};

export type PlayerPingSerialization = {
    readonly position: Vector
    readonly definition: PlayerPing
    readonly playerId: number
};

export type PingSerialization = MapPingSerialization | PlayerPingSerialization;

export type ExplosionSerialization = {
    readonly definition: ExplosionDefinition
    readonly position: Vector
    readonly layer: Layer
};

export type EmoteSerialization = {
    readonly definition: EmoteDefinition
    readonly playerID: number
};

export type PlayerData = {
    readonly minMax?: {
        readonly maxHealth: number
        readonly minAdrenaline: number
        readonly maxAdrenaline: number
    }
    readonly health?: number
    readonly adrenaline?: number
    readonly zoom?: number
    readonly layer?: number
    readonly id?: {
        readonly id: number
        readonly spectating: boolean
    }
    readonly teammates?: ReadonlyArray<{
        readonly id: number
        readonly position: Vector
        readonly normalizedHealth: number
        readonly downed: boolean
        readonly disconnected: boolean
    }>
    readonly inventory?: {
        readonly activeWeaponIndex: number
        readonly weapons?: ReadonlyArray<undefined | {
            readonly definition: WeaponDefinition
            readonly count?: number
            readonly stats?: {
                readonly kills?: number
            }
        }>
    }
    readonly lockedSlots?: number
    readonly items?: {
        readonly items: typeof DEFAULT_INVENTORY
        readonly scope: ScopeDefinition
    }
    readonly activeC4s?: boolean
};

export type UpdatePacketDataCommon = {
    readonly flags: number
    readonly playerData?: PlayerData
    readonly deletedObjects?: readonly number[]
    readonly explosions?: readonly ExplosionSerialization[]
    readonly emotes?: readonly EmoteSerialization[]
    readonly gas?: {
        readonly state: GasState
        readonly currentDuration: number
        readonly oldPosition: Vector
        readonly newPosition: Vector
        readonly oldRadius: number
        readonly newRadius: number
    }
    readonly gasProgress?: number
    readonly newPlayers?: ReadonlyArray<{
        readonly id: number
        readonly name: string
        readonly badge?: BadgeDefinition
    } & ({
        readonly hasColor: false
        readonly nameColor?: undefined
    } | {
        readonly hasColor: true
        readonly nameColor: number
    })>
    readonly deletedPlayers?: readonly number[]
    readonly aliveCount?: number
    readonly planes?: ReadonlyArray<{
        readonly position: Vector
        readonly direction: number
    }>
    readonly mapPings?: readonly PingSerialization[]
};

export type ServerOnly = {
    readonly bullets?: readonly BaseBullet[]
    readonly fullObjectsCache: ReadonlyArray<{
        get partialStream(): SuroiBitStream
        get fullStream(): SuroiBitStream
    }>

    readonly partialObjectsCache: ReadonlyArray<{
        get partialStream(): SuroiBitStream
    }>
};

export type ClientOnly = {
    readonly deserializedBullets?: readonly BulletOptions[]
    readonly fullDirtyObjects?: readonly ObjectFullData[]
    readonly partialDirtyObjects?: readonly ObjectPartialData[]
};

/**
 * For server use
 */
export type UpdatePacketDataIn = UpdatePacketDataCommon & ServerOnly;
/**
 * For client use
 */
export type UpdatePacketDataOut = UpdatePacketDataCommon & ClientOnly;

export const UpdatePacket = createPacket("UpdatePacket")<UpdatePacketDataIn, UpdatePacketDataOut>({
    serialize(stream, data) {
        let flags = 0;
        // save the current index to write flags latter
        const flagsIdx = stream.index;
        stream.writeBits(flags, UPDATE_FLAGS_BITS);

        if (data.playerData) {
            if (Object.keys(data.playerData).length > 0) {
                serializePlayerData(stream, data.playerData);
                flags |= UpdateFlags.PlayerData;
            }
        }

        if (data.deletedObjects?.length) {
            stream.writeArray(data.deletedObjects, OBJECT_ID_BITS, id => {
                stream.writeObjectID(id);
            });
            flags |= UpdateFlags.DeletedObjects;
        }

        if (data.fullObjectsCache?.length) {
            stream.writeAlignToNextByte();
            stream.writeArray(data.fullObjectsCache, 16, object => {
                stream.writeBytes(object.partialStream, 0, object.partialStream.byteIndex);
                stream.writeBytes(object.fullStream, 0, object.fullStream.byteIndex);
            });
            flags |= UpdateFlags.FullObjects;
        }

        if (data.partialObjectsCache?.length) {
            stream.writeAlignToNextByte();
            stream.writeArray(data.partialObjectsCache, 16, object => {
                stream.writeBytes(object.partialStream, 0, object.partialStream.byteIndex);
            });
            flags |= UpdateFlags.PartialObjects;
        }

        if (data.bullets?.length) {
            stream.writeArray(data.bullets, 8, bullet => {
                bullet.serialize(stream);
            });
            flags |= UpdateFlags.Bullets;
        }

        if (data.explosions?.length) {
            stream.writeArray(data.explosions, 8, explosion => {
                Explosions.writeToStream(stream, explosion.definition);
                stream.writePosition(explosion.position);
                stream.writeInt8(explosion.layer);
            });
            flags |= UpdateFlags.Explosions;
        }

        if (data.emotes?.length) {
            stream.writeArray(data.emotes, 8, emote => {
                Emotes.writeToStream(stream, emote.definition);
                stream.writeObjectID(emote.playerID);
            });
            flags |= UpdateFlags.Emotes;
        }

        if (data.gas) {
            const gas = data.gas;
            stream.writeBits(gas.state, 2);
            stream.writeBits(gas.currentDuration, 7);
            stream.writePosition(gas.oldPosition);
            stream.writePosition(gas.newPosition);
            stream.writeFloat(gas.oldRadius, 0, 2048, 16);
            stream.writeFloat(gas.newRadius, 0, 2048, 16);
            flags |= UpdateFlags.Gas;
        }

        if (data.gasProgress !== undefined) {
            stream.writeFloat(data.gasProgress, 0, 1, 16);
            flags |= UpdateFlags.GasPercentage;
        }

        if (data.newPlayers?.length) {
            stream.writeArray(data.newPlayers, 8, player => {
                stream.writeObjectID(player.id);
                stream.writePlayerName(player.name);
                stream.writeBoolean(player.hasColor);
                if (player.hasColor) stream.writeBits(player.nameColor, 24);

                Badges.writeOptional(stream, player.badge);
            });
            flags |= UpdateFlags.NewPlayers;
        }

        if (data.deletedPlayers?.length) {
            stream.writeArray(data.deletedPlayers, 8, id => {
                stream.writeObjectID(id);
            });
            flags |= UpdateFlags.DeletedPlayers;
        }

        if (data.aliveCount !== undefined) {
            stream.writeUint8(data.aliveCount);
            flags |= UpdateFlags.AliveCount;
        }

        if (data.planes?.length) {
            stream.writeArray(data.planes, 4, plane => {
                stream.writeVector(
                    plane.position,
                    -GameConstants.maxPosition,
                    -GameConstants.maxPosition,
                    GameConstants.maxPosition * 2,
                    GameConstants.maxPosition * 2,
                    24);
                stream.writeRotation(plane.direction, 16);
            });
            flags |= UpdateFlags.Planes;
        }

        if (data.mapPings?.length) {
            stream.writeArray(data.mapPings, 4, ping => {
                MapPings.writeToStream(stream, ping.definition);
                stream.writePosition(ping.position);
                if (ping.definition.isPlayerPing) {
                    stream.writeObjectID((ping as PlayerPingSerialization).playerId);
                }
            });
            flags |= UpdateFlags.MapPings;
        }

        const idx = stream.index;
        stream.index = flagsIdx;
        stream.writeBits(flags, UPDATE_FLAGS_BITS);
        // restore steam index
        stream.index = idx;
    },

    deserialize(stream) {
        const data = {} as Mutable<UpdatePacketDataOut>;

        const flags = stream.readBits(UPDATE_FLAGS_BITS);

        if (flags & UpdateFlags.PlayerData) {
            data.playerData = deserializePlayerData(stream);
        }

        if (flags & UpdateFlags.DeletedObjects) {
            data.deletedObjects = stream.readAndCreateArray(OBJECT_ID_BITS, () => stream.readObjectID());
        }

        if (flags & UpdateFlags.FullObjects) {
            stream.readAlignToNextByte();

            data.fullDirtyObjects = stream.readAndCreateArray(16, () => {
                const id = stream.readObjectID();
                const type = stream.readObjectType();

                const partialData = ObjectSerializations[type].deserializePartial(stream);
                stream.readAlignToNextByte();
                const fullData = ObjectSerializations[type].deserializeFull(stream);
                stream.readAlignToNextByte();

                return {
                    id,
                    type,
                    data: {
                        ...partialData,
                        full: fullData
                    } as ObjectsNetData[typeof type]
                };
            });
        }

        if (flags & UpdateFlags.PartialObjects) {
            stream.readAlignToNextByte();

            data.partialDirtyObjects = stream.readAndCreateArray(16, () => {
                const id = stream.readObjectID();
                const type = stream.readObjectType();
                const data = ObjectSerializations[type].deserializePartial(stream);
                stream.readAlignToNextByte();

                return { id, type, data };
            });
        }

        if (flags & UpdateFlags.Bullets) {
            data.deserializedBullets = stream.readAndCreateArray(8, () => BaseBullet.deserialize(stream));
        }

        if (flags & UpdateFlags.Explosions) {
            data.explosions = stream.readAndCreateArray(8, () => ({
                definition: Explosions.readFromStream(stream),
                position: stream.readPosition(),
                layer: stream.readInt8()
            }));
        }

        if (flags & UpdateFlags.Emotes) {
            data.emotes = stream.readAndCreateArray(8, () => ({
                definition: Emotes.readFromStream(stream),
                playerID: stream.readObjectID()
            }));
        }

        if (flags & UpdateFlags.Gas) {
            data.gas = {
                state: stream.readBits(2),
                currentDuration: stream.readBits(7),
                oldPosition: stream.readPosition(),
                newPosition: stream.readPosition(),
                oldRadius: stream.readFloat(0, 2048, 16),
                newRadius: stream.readFloat(0, 2048, 16)
            };
        }

        if (flags & UpdateFlags.GasPercentage) {
            data.gasProgress = stream.readFloat(0, 1, 16);
        }

        if (flags & UpdateFlags.NewPlayers) {
            data.newPlayers = stream.readAndCreateArray(8, () => {
                const id = stream.readObjectID();
                const name = stream.readPlayerName();
                const hasColor = stream.readBoolean();

                return {
                    id,
                    name,
                    hasColor,
                    nameColor: hasColor ? stream.readBits(24) : undefined,
                    badge: Badges.readOptional(stream)
                } as (UpdatePacketDataCommon["newPlayers"] & object)[number];
            });
        }

        if (flags & UpdateFlags.DeletedPlayers) {
            data.deletedPlayers = stream.readAndCreateArray(8, () => {
                return stream.readObjectID();
            });
        }

        if (flags & UpdateFlags.AliveCount) {
            data.aliveCount = stream.readUint8();
        }

        if (flags & UpdateFlags.Planes) {
            data.planes = stream.readAndCreateArray(4, () => {
                const position = stream.readVector(
                    -GameConstants.maxPosition,
                    -GameConstants.maxPosition,
                    GameConstants.maxPosition * 2,
                    GameConstants.maxPosition * 2,
                    24
                );
                const direction = stream.readRotation(16);

                return { position, direction };
            });
        }

        if (flags & UpdateFlags.MapPings) {
            data.mapPings = stream.readAndCreateArray(4, () => {
                const definition = MapPings.readFromStream(stream);

                return {
                    definition,
                    position: stream.readPosition(),
                    ...(definition.isPlayerPing ? { playerId: stream.readObjectID() } : {})
                } as MapPingSerialization;
            });
        }

        return data as UpdatePacketDataOut;
    }
});
