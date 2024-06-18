import { DEFAULT_INVENTORY, GameConstants, type GasState, type ObjectCategory } from "../constants";
import { Badges, type BadgeDefinition } from "../definitions/badges";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { Explosions, type ExplosionDefinition } from "../definitions/explosions";
import { Loots, type WeaponDefinition } from "../definitions/loots";
import { MapPings, type MapPing, type MapPingDefinition, type PlayerPing } from "../definitions/mapPings";
import { Scopes, type ScopeDefinition } from "../definitions/scopes";
import { BaseBullet, type BulletOptions } from "../utils/baseBullet";
import { ObjectSerializations, type FullData, type ObjectsNetData } from "../utils/objectsSerializations";
import { OBJECT_ID_BITS, type SuroiBitStream } from "../utils/suroiBitStream";
import { Vec, type Vector } from "../utils/vector";
import { type Packet } from "./packet";

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

export interface PlayerData {
    dirty: {
        maxMinStats: boolean
        health: boolean
        adrenaline: boolean
        weapons: boolean
        slotLocks: boolean
        items: boolean
        id: boolean
        teammates: boolean
        zoom: boolean
    }

    id: number
    spectating: boolean

    teammates: Array<{
        id: number
        position: Vector
        normalizedHealth: number
        downed: boolean
        disconnected: boolean
    }>

    normalizedHealth: number
    normalizedAdrenaline: number

    maxHealth: number
    minAdrenaline: number
    maxAdrenaline: number

    zoom: number

    inventory: {
        activeWeaponIndex: number
        lockedSlots: number
        weapons?: Array<undefined | {
            definition: WeaponDefinition
            count?: number
            stats?: {
                kills?: number
            }
        }>
        items: typeof DEFAULT_INVENTORY
        scope: ScopeDefinition
    }
}

function serializePlayerData(stream: SuroiBitStream, data: Required<PlayerData>): void {
    const dirty = data.dirty;

    stream.writeBoolean(dirty.maxMinStats);
    if (dirty.maxMinStats) {
        stream.writeFloat32(data.maxHealth);
        stream.writeFloat32(data.minAdrenaline);
        stream.writeFloat32(data.maxAdrenaline);
    }

    stream.writeBoolean(dirty.health);
    if (dirty.health) {
        stream.writeFloat(data.normalizedHealth, 0, 1, 12);
    }

    stream.writeBoolean(dirty.adrenaline);
    if (dirty.adrenaline) {
        stream.writeFloat(data.normalizedAdrenaline, 0, 1, 12);
    }

    stream.writeBoolean(dirty.zoom);
    if (dirty.zoom) {
        stream.writeUint8(data.zoom);
    }

    stream.writeBoolean(dirty.id);
    if (dirty.id) {
        stream.writeObjectID(data.id);
        stream.writeBoolean(data.spectating);
    }

    stream.writeBoolean(dirty.teammates);
    if (dirty.teammates) {
        stream.writeArray(data.teammates, 2, player => {
            stream.writeObjectID(player.id);
            stream.writePosition(player.position ?? Vec.create(0, 0));
            stream.writeFloat(player.normalizedHealth, 0, 1, 8);
            stream.writeBoolean(player.downed);
            stream.writeBoolean(player.disconnected);
        });
    }

    const inventory = data.inventory;
    stream.writeBoolean(dirty.weapons);
    if (dirty.weapons) {
        stream.writeBits(inventory.activeWeaponIndex, 2);

        for (const weapon of inventory.weapons ?? []) {
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
    }

    stream.writeBoolean(dirty.slotLocks);
    if (dirty.slotLocks) {
        stream.writeBits(inventory.lockedSlots, GameConstants.player.maxWeapons);
    }

    stream.writeBoolean(dirty.items);
    if (dirty.items) {
        for (const item in DEFAULT_INVENTORY) {
            const count = inventory.items[item];

            stream.writeBoolean(count > 0);

            if (count > 0) {
                stream.writeBits(count, 9);
            }
        }

        Scopes.writeToStream(stream, inventory.scope);
    }
}

function deserializePlayerData(stream: SuroiBitStream): PlayerData {
    const dirty = {} as PlayerData["dirty"];
    const inventory = {} as PlayerData["inventory"];
    const data = { dirty, inventory } as PlayerData;

    if (dirty.maxMinStats = stream.readBoolean()) {
        data.maxHealth = stream.readFloat32();
        data.minAdrenaline = stream.readFloat32();
        data.maxAdrenaline = stream.readFloat32();
    }

    if (dirty.health = stream.readBoolean()) {
        data.normalizedHealth = stream.readFloat(0, 1, 12);
    }

    if (dirty.adrenaline = stream.readBoolean()) {
        data.normalizedAdrenaline = stream.readFloat(0, 1, 12);
    }

    if (dirty.zoom = stream.readBoolean()) {
        data.zoom = stream.readUint8();
    }

    if (dirty.id = stream.readBoolean()) {
        data.id = stream.readObjectID();
        data.spectating = stream.readBoolean();
    }

    if (dirty.teammates = stream.readBoolean()) {
        stream.readArray(data.teammates = [], 2, () => {
            return {
                id: stream.readObjectID(),
                position: stream.readPosition(),
                normalizedHealth: stream.readFloat(0, 1, 8),
                downed: stream.readBoolean(),
                disconnected: stream.readBoolean()
            };
        });
    }

    const maxWeapons = GameConstants.player.maxWeapons;

    if (dirty.weapons = stream.readBoolean()) {
        inventory.activeWeaponIndex = stream.readBits(2);

        inventory.weapons = Array.from({ length: maxWeapons }, () => undefined);
        for (let i = 0; i < maxWeapons; i++) {
            if (stream.readBoolean()) { // has item
                const definition = Loots.readFromStream<WeaponDefinition>(stream);

                inventory.weapons[i] = {
                    definition,
                    count: stream.readBoolean() ? stream.readUint8() : undefined,
                    stats: {
                        kills: definition.killstreak ? stream.readUint8() : undefined
                    }
                };
            }
        }
    }

    if (dirty.slotLocks = stream.readBoolean()) {
        inventory.lockedSlots = stream.readBits(maxWeapons);
    }

    if (dirty.items = stream.readBoolean()) {
        inventory.items = {};

        for (const item in DEFAULT_INVENTORY) {
            inventory.items[item] = stream.readBoolean() ? stream.readBits(9) : 0;
        }

        inventory.scope = Scopes.readFromStream(stream);
    }

    return data;
}

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
} & ({
    readonly definition: PlayerPing
    readonly playerId: number
} | {
    readonly definition: MapPing
    readonly playerId?: undefined
});

export class UpdatePacket implements Packet {
    // obligatory on server, optional on client
    playerData?: Required<PlayerData>;

    deletedObjects: number[] = [];

    fullDirtyObjects: ObjectFullData[] = [];

    partialDirtyObjects: ObjectPartialData[] = [];

    // server side only

    fullObjectsCache: Array<{
        get partialStream(): SuroiBitStream
        get fullStream(): SuroiBitStream
    }> = [];

    partialObjectsCache: Array<{
        get partialStream(): SuroiBitStream
    }> = [];

    bullets: BaseBullet[] = [];

    deserializedBullets: BulletOptions[] = [];

    explosions: Array<{ readonly definition: ExplosionDefinition, readonly position: Vector }> = [];

    emotes: Array<{ readonly definition: EmoteDefinition, readonly playerID: number }> = [];

    gas?: {
        readonly state: GasState
        readonly currentDuration: number
        readonly oldPosition: Vector
        readonly newPosition: Vector
        readonly oldRadius: number
        readonly newRadius: number
        readonly dirty: boolean
    };

    gasProgress?: {
        readonly dirty: boolean
        readonly value: number
    };

    newPlayers: Array<{
        readonly id: number
        readonly name: string
        readonly loadout: { readonly badge?: BadgeDefinition }
        readonly hasColor: boolean
        readonly nameColor: number
        readonly teamID?: number
    }> = [];

    deletedPlayers: number[] = [];

    aliveCountDirty?: boolean;
    aliveCount?: number;

    planes: Array<{
        readonly position: Vector
        readonly direction: number
    }> = [];

    mapPings: Array<{
        readonly position: Vector
        readonly definition: MapPingDefinition
        readonly playerId?: number
    }> = [];

    serialize(stream: SuroiBitStream): void {
        let flags = 0;
        // save the current index to write flags latter
        const flagsIdx = stream.index;
        stream.writeBits(flags, UPDATE_FLAGS_BITS);

        if (this.playerData) {
            if (Object.keys(this.playerData).length > 0) {
                serializePlayerData(stream, this.playerData);
                flags |= UpdateFlags.PlayerData;
            }
        }

        if (this.deletedObjects.length) {
            stream.writeArray(this.deletedObjects, OBJECT_ID_BITS, id => {
                stream.writeObjectID(id);
            });
            flags |= UpdateFlags.DeletedObjects;
        }

        if (this.fullObjectsCache.length) {
            stream.writeAlignToNextByte();
            stream.writeArray(this.fullObjectsCache, 16, object => {
                stream.writeBytes(object.partialStream, 0, object.partialStream.byteIndex);
                stream.writeBytes(object.fullStream, 0, object.fullStream.byteIndex);
            });
            flags |= UpdateFlags.FullObjects;
        }

        if (this.partialObjectsCache.length) {
            stream.writeAlignToNextByte();
            stream.writeArray(this.partialObjectsCache, 16, object => {
                stream.writeBytes(object.partialStream, 0, object.partialStream.byteIndex);
            });
            flags |= UpdateFlags.PartialObjects;
        }

        if (this.bullets.length) {
            stream.writeArray(this.bullets, 8, bullet => {
                bullet.serialize(stream);
            });
            flags |= UpdateFlags.Bullets;
        }

        if (this.explosions.length) {
            stream.writeArray(this.explosions, 8, explosion => {
                Explosions.writeToStream(stream, explosion.definition);
                stream.writePosition(explosion.position);
            });
            flags |= UpdateFlags.Explosions;
        }

        if (this.emotes.length) {
            stream.writeArray(this.emotes, 8, emote => {
                Emotes.writeToStream(stream, emote.definition);
                stream.writeObjectID(emote.playerID);
            });
            flags |= UpdateFlags.Emotes;
        }

        if (this.gas?.dirty) {
            const gas = this.gas;
            stream.writeBits(gas.state, 2);
            stream.writeBits(gas.currentDuration, 7);
            stream.writePosition(gas.oldPosition);
            stream.writePosition(gas.newPosition);
            stream.writeFloat(gas.oldRadius, 0, 2048, 16);
            stream.writeFloat(gas.newRadius, 0, 2048, 16);
            flags |= UpdateFlags.Gas;
        }

        if (this.gasProgress?.dirty) {
            stream.writeFloat(this.gasProgress.value, 0, 1, 16);
            flags |= UpdateFlags.GasPercentage;
        }

        if (this.newPlayers.length) {
            stream.writeArray(this.newPlayers, 8, player => {
                stream.writeObjectID(player.id);
                stream.writePlayerName(player.name);
                stream.writeBoolean(player.hasColor);
                if (player.hasColor) stream.writeBits(player.nameColor, 24);

                Badges.writeOptional(stream, player.loadout.badge);
            });
            flags |= UpdateFlags.NewPlayers;
        }

        if (this.deletedPlayers.length) {
            stream.writeArray(this.deletedPlayers, 8, id => {
                stream.writeObjectID(id);
            });
            flags |= UpdateFlags.DeletedPlayers;
        }

        if (this.aliveCountDirty) {
            // the troubles of loosely-typing packets
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            stream.writeUint8(this.aliveCount!);
            flags |= UpdateFlags.AliveCount;
        }

        if (this.planes.length) {
            stream.writeArray(this.planes, 4, plane => {
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

        if (this.mapPings.length) {
            stream.writeArray(this.mapPings, 4, ping => {
                MapPings.writeToStream(stream, ping.definition);
                stream.writePosition(ping.position);
                if (ping.definition.isPlayerPing) {
                    // the troubles of loosely-typing packets
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    stream.writeObjectID(ping.playerId!);
                }
            });
            flags |= UpdateFlags.MapPings;
        }

        const idx = stream.index;
        stream.index = flagsIdx;
        stream.writeBits(flags, UPDATE_FLAGS_BITS);
        // restore steam index
        stream.index = idx;
    }

    deserialize(stream: SuroiBitStream): void {
        const flags = stream.readBits(UPDATE_FLAGS_BITS);

        if (flags & UpdateFlags.PlayerData) {
            this.playerData = deserializePlayerData(stream);
        }

        if (flags & UpdateFlags.DeletedObjects) {
            stream.readArray(this.deletedObjects, OBJECT_ID_BITS, () => {
                return stream.readObjectID();
            });
        }

        if (flags & UpdateFlags.FullObjects) {
            stream.readAlignToNextByte();

            stream.readArray(this.fullDirtyObjects, 16, () => {
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

            stream.readArray(this.partialDirtyObjects, 16, () => {
                const id = stream.readObjectID();
                const type = stream.readObjectType();
                const data = ObjectSerializations[type].deserializePartial(stream);
                stream.readAlignToNextByte();
                return { id, type, data };
            });
        }

        if (flags & UpdateFlags.Bullets) {
            stream.readArray(this.deserializedBullets, 8, () => {
                return BaseBullet.deserialize(stream);
            });
        }

        if (flags & UpdateFlags.Explosions) {
            stream.readArray(this.explosions, 8, () => {
                return {
                    definition: Explosions.readFromStream(stream),
                    position: stream.readPosition()
                };
            });
        }

        if (flags & UpdateFlags.Emotes) {
            stream.readArray(this.emotes, 8, () => {
                return {
                    definition: Emotes.readFromStream(stream),
                    playerID: stream.readObjectID()
                };
            });
        }

        if (flags & UpdateFlags.Gas) {
            this.gas = {
                dirty: true,
                state: stream.readBits(2),
                currentDuration: stream.readBits(7),
                oldPosition: stream.readPosition(),
                newPosition: stream.readPosition(),
                oldRadius: stream.readFloat(0, 2048, 16),
                newRadius: stream.readFloat(0, 2048, 16)
            };
        }

        if (flags & UpdateFlags.GasPercentage) {
            this.gasProgress = {
                dirty: true,
                value: stream.readFloat(0, 1, 16)
            };
        }

        if (flags & UpdateFlags.NewPlayers) {
            stream.readArray(this.newPlayers, 8, () => {
                const id = stream.readObjectID();
                const name = stream.readPlayerName();
                const hasColor = stream.readBoolean();

                return {
                    id,
                    name,
                    hasColor,
                    nameColor: hasColor ? stream.readBits(24) : 0,
                    loadout: {
                        badge: Badges.readOptional(stream)
                    }
                };
            });
        }

        if (flags & UpdateFlags.DeletedPlayers) {
            stream.readArray(this.deletedPlayers, 8, () => {
                return stream.readObjectID();
            });
        }

        if (flags & UpdateFlags.AliveCount) {
            this.aliveCountDirty = true;
            this.aliveCount = stream.readUint8();
        }

        if (flags & UpdateFlags.Planes) {
            stream.readArray(this.planes, 4, () => {
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
            stream.readArray(this.mapPings, 4, () => {
                const definition = MapPings.readFromStream(stream);

                return {
                    definition,
                    position: stream.readPosition(),
                    ...(definition.isPlayerPing ? { playerId: stream.readObjectID() } : {})
                } as MapPingSerialization;
            });
        }
    }
}
