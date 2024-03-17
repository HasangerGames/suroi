import { DEFAULT_INVENTORY, GameConstants, KillFeedMessageType, KillType, PacketType, type GasState, type ObjectCategory } from "../constants";
import { Badges, type BadgeDefinition } from "../definitions/badges";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { Explosions, type ExplosionDefinition } from "../definitions/explosions";
import { Loots, type LootDefinition, type WeaponDefinition } from "../definitions/loots";
import { Scopes, type ScopeDefinition } from "../definitions/scopes";
import { BaseBullet, type BulletOptions } from "../utils/baseBullet";
import { ObjectDefinitions } from "../utils/objectDefinitions";
import { ObjectSerializations, type FullData, type ObjectsNetData } from "../utils/objectsSerializations";
import { Vec, type Vector } from "../utils/vector";
import { calculateEnumPacketBits, OBJECT_ID_BITS, type SuroiBitStream } from "../utils/suroiBitStream";

import { Packet } from "./packet";

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
        items: boolean
        id: boolean
        teammates: boolean
        zoom: boolean
        throwable: boolean
    }

    id: number
    spectating: boolean

    teammates: Array<{
        id: number
        position: Vector
        normalizedHealth: number
        knocked: boolean
    }>

    health: number
    adrenaline: number

    maxHealth: number
    minAdrenaline: number
    maxAdrenaline: number

    zoom: number

    inventory: {
        activeWeaponIndex: number
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
        stream.writeFloat(data.health, 0, data.maxHealth, 12);
    }

    stream.writeBoolean(dirty.adrenaline);
    if (dirty.adrenaline) {
        stream.writeFloat(data.adrenaline, data.minAdrenaline, data.maxAdrenaline, 12);
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
            stream.writeBoolean(player.knocked);
        });
    }

    const inventory = data.inventory;
    stream.writeBoolean(dirty.weapons);
    if (dirty.weapons) {
        stream.writeBits(inventory.activeWeaponIndex, 2);

        for (const weapon of inventory.weapons ?? []) {
            stream.writeBoolean(weapon !== undefined);

            if (weapon !== undefined) {
                Loots.writeToStream(stream, weapon.definition);

                const hasCount = weapon.count !== undefined;
                stream.writeBoolean(hasCount);
                if (hasCount) {
                    stream.writeUint8(weapon.count!);
                }

                if (weapon.definition.killstreak) {
                    stream.writeUint8(weapon.stats!.kills!);
                }
            }
        }
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

interface PreviousData {
    readonly maxHealth: number
    readonly minAdrenaline: number
    readonly maxAdrenaline: number
}

function deserializePlayerData(stream: SuroiBitStream, previousData: PreviousData): PlayerData {
    /* eslint-disable @typescript-eslint/consistent-type-assertions, no-cond-assign */
    const dirty = {} as PlayerData["dirty"];
    const inventory = {} as PlayerData["inventory"];
    const data = { dirty, inventory } as PlayerData;

    if (dirty.maxMinStats = stream.readBoolean()) {
        data.maxHealth = stream.readFloat32();
        data.minAdrenaline = stream.readFloat32();
        data.maxAdrenaline = stream.readFloat32();
    }

    if (dirty.health = stream.readBoolean()) {
        data.health = stream.readFloat(0, data.maxHealth ?? previousData.maxHealth, 12);
    }

    if (dirty.adrenaline = stream.readBoolean()) {
        data.adrenaline = stream.readFloat(
            data.minAdrenaline ?? previousData.minAdrenaline,
            data.maxAdrenaline ?? previousData.maxAdrenaline,
            12
        );
    }

    if (dirty.zoom = stream.readBoolean()) {
        data.zoom = stream.readUint8();
    }

    if (dirty.id = stream.readBoolean()) {
        data.id = stream.readObjectID();
        data.spectating = stream.readBoolean();
    }

    if (dirty.teammates = stream.readBoolean()) {
        data.teammates = [];
        stream.readArray(data.teammates, 2, () => {
            return {
                id: stream.readObjectID(),
                position: stream.readPosition(),
                normalizedHealth: stream.readFloat(0, 1, 8),
                knocked: stream.readBoolean()
            };
        });
    }

    if (dirty.weapons = stream.readBoolean()) {
        inventory.activeWeaponIndex = stream.readBits(2);

        const maxWeapons = GameConstants.player.maxWeapons;

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

    if (dirty.items = stream.readBoolean()) {
        inventory.items = {};

        for (const item in DEFAULT_INVENTORY) {
            inventory.items[item] = stream.readBoolean() ? stream.readBits(9) : 0;
        }

        inventory.scope = Scopes.readFromStream(stream);
    }

    return data;
}

const KILL_FEED_MESSAGE_TYPE_BITS = calculateEnumPacketBits(KillFeedMessageType);
const KILL_TYPE_BITS = calculateEnumPacketBits(KillType);

const damageSourcesDefinitions = ObjectDefinitions.create<LootDefinition | ExplosionDefinition>([...Loots, ...Explosions]);

function serializeKillFeedMessage(stream: SuroiBitStream, message: KillFeedMessage): void {
    stream.writeBits(message.messageType, KILL_FEED_MESSAGE_TYPE_BITS);
    switch (message.messageType) {
        case KillFeedMessageType.Kill: {
            stream.writeObjectID(message.playerID!);

            stream.writeBits(message.killType ?? KillType.Suicide, KILL_TYPE_BITS);
            if (message.killType === KillType.TwoPartyInteraction) {
                stream.writeObjectID(message.killerID!);
                stream.writeUint8(message.kills!);
            }

            const weaponWasUsed = message.weaponUsed !== undefined;
            stream.writeBoolean(weaponWasUsed);
            if (weaponWasUsed) {
                damageSourcesDefinitions.writeToStream(stream, message.weaponUsed!);
                if (
                    message.weaponUsed !== undefined &&
                    "killstreak" in message.weaponUsed &&
                    message.weaponUsed.killstreak
                ) {
                    stream.writeUint8(message.killstreak!);
                }
            }
            break;
        }

        case KillFeedMessageType.KillLeaderAssigned: {
            stream.writeObjectID(message.playerID!);
            stream.writeUint8(message.kills!);
            stream.writeBoolean(message.hideInKillfeed ?? false);
            break;
        }

        case KillFeedMessageType.KillLeaderUpdated: {
            stream.writeUint8(message.kills!);
            break;
        }

        case KillFeedMessageType.KillLeaderDead: {
            stream.writeObjectID(message.playerID!);
            stream.writeObjectID(message.killerID!);
            break;
        }
    }
}

export interface KillFeedMessage {
    messageType: KillFeedMessageType
    playerID?: number
    playerBadge?: BadgeDefinition
    killType?: KillType
    killerID?: number
    killerBadge?: BadgeDefinition
    kills?: number
    killstreak?: number
    hideInKillfeed?: boolean
    weaponUsed?: LootDefinition | ExplosionDefinition
}

function deserializeKillFeedMessage(stream: SuroiBitStream): KillFeedMessage {
    const message = {
        messageType: stream.readBits(KILL_FEED_MESSAGE_TYPE_BITS)
    } as KillFeedMessage;

    switch (message.messageType) {
        case KillFeedMessageType.Kill: {
            message.playerID = stream.readObjectID();

            message.killType = stream.readBits(KILL_TYPE_BITS);
            if (message.killType === KillType.TwoPartyInteraction) {
                message.killerID = stream.readObjectID();
                message.kills = stream.readUint8();
            }

            if (stream.readBoolean()) { // used a weapon
                message.weaponUsed = damageSourcesDefinitions.readFromStream(stream);

                if (
                    message.weaponUsed !== undefined &&
                    "killstreak" in message.weaponUsed &&
                    message.weaponUsed.killstreak
                ) {
                    message.killstreak = stream.readUint8();
                }
            }
            break;
        }

        case KillFeedMessageType.KillLeaderAssigned: {
            message.playerID = stream.readObjectID();
            message.kills = stream.readUint8();
            message.hideInKillfeed = stream.readBoolean();
            break;
        }

        case KillFeedMessageType.KillLeaderUpdated: {
            message.kills = stream.readUint8();
            break;
        }

        case KillFeedMessageType.KillLeaderDead: {
            message.playerID = stream.readObjectID();
            message.killerID = stream.readObjectID();
            break;
        }
    }
    return message;
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
    KillFeedMessages: 1 << 12,
    Planes: 1 << 13,
    MapPings: 1 << 14
});

const UPDATE_FLAGS_BITS = Object.keys(UpdateFlags).length;

export class UpdatePacket extends Packet {
    override readonly allocBytes = 1 << 16;
    override readonly type = PacketType.Update;

    playerData!: PlayerData;

    // client side only
    // used to store previous sent max and min health / adrenaline
    previousData!: PreviousData;

    deletedObjects: number[] = [];

    fullDirtyObjects: ObjectFullData[] = [];

    partialDirtyObjects: ObjectPartialData[] = [];

    // server side only

    fullObjectsCache: Array<{
        stream: SuroiBitStream
    }> = [];

    partialObjectsCache: Array<{
        stream: SuroiBitStream
        partialLength: number
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
    }> = [];

    deletedPlayers: number[] = [];

    aliveCountDirty?: boolean;
    aliveCount?: number;

    killFeedMessages: KillFeedMessage[] = [];

    planes: Array<{ readonly position: Vector, readonly direction: number }> = [];

    mapPings: Vector[] = [];

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        const playerDataDirty = Object.values(this.playerData.dirty).some(v => v);

        const flags =
            (+!!playerDataDirty && UpdateFlags.PlayerData) |
            (+!!this.deletedObjects.length && UpdateFlags.DeletedObjects) |
            (+!!this.fullObjectsCache.length && UpdateFlags.FullObjects) |
            (+!!this.partialObjectsCache.length && UpdateFlags.PartialObjects) |
            (+!!this.bullets.length && UpdateFlags.Bullets) |
            (+!!this.explosions.length && UpdateFlags.Explosions) |
            (+!!this.emotes.length && UpdateFlags.Emotes) |
            (+!!this.gas?.dirty && UpdateFlags.Gas) |
            (+!!this.gasProgress?.dirty && UpdateFlags.GasPercentage) |
            (+!!this.newPlayers.length && UpdateFlags.NewPlayers) |
            (+!!this.deletedPlayers.length && UpdateFlags.DeletedPlayers) |
            (+!!this.aliveCountDirty && UpdateFlags.AliveCount) |
            (+!!this.killFeedMessages.length && UpdateFlags.KillFeedMessages) |
            (+!!this.planes.length && UpdateFlags.Planes) |
            (+!!this.mapPings.length && UpdateFlags.MapPings);

        stream.writeBits(flags, UPDATE_FLAGS_BITS);

        if (flags & UpdateFlags.PlayerData) {
            serializePlayerData(stream, this.playerData);
        }

        if (flags & UpdateFlags.DeletedObjects) {
            stream.writeArray(this.deletedObjects, OBJECT_ID_BITS, (id) => {
                stream.writeObjectID(id);
            });
        }

        if (flags & UpdateFlags.FullObjects) {
            stream.writeAlignToNextByte();
            stream.writeArray(this.fullObjectsCache, 16, (object) => {
                stream.writeBytes(object.stream, 0, object.stream.byteIndex);
            });
        }

        if (flags & UpdateFlags.PartialObjects) {
            stream.writeAlignToNextByte();
            stream.writeArray(this.partialObjectsCache, 16, (object) => {
                stream.writeBytes(object.stream, 0, object.partialLength);
            });
        }

        if (flags & UpdateFlags.Bullets) {
            stream.writeArray(this.bullets, 8, bullet => {
                bullet.serialize(stream);
            });
        }

        if (flags & UpdateFlags.Explosions) {
            stream.writeArray(this.explosions, 8, (explosion) => {
                Explosions.writeToStream(stream, explosion.definition);
                stream.writePosition(explosion.position);
            });
        }

        if (flags & UpdateFlags.Emotes) {
            stream.writeArray(this.emotes, 8, (emote) => {
                Emotes.writeToStream(stream, emote.definition);
                stream.writeObjectID(emote.playerID);
            });
        }

        if (flags & UpdateFlags.Gas) {
            const gas = this.gas!;
            stream.writeBits(gas.state, 2);
            stream.writeBits(gas.currentDuration, 7);
            stream.writePosition(gas.oldPosition);
            stream.writePosition(gas.newPosition);
            stream.writeFloat(gas.oldRadius, 0, 2048, 16);
            stream.writeFloat(gas.newRadius, 0, 2048, 16);
        }

        if (flags & UpdateFlags.GasPercentage) {
            stream.writeFloat(this.gasProgress!.value, 0, 1, 16);
        }

        if (flags & UpdateFlags.NewPlayers) {
            stream.writeArray(this.newPlayers, 8, (player) => {
                stream.writeObjectID(player.id);
                stream.writePlayerName(player.name);
                stream.writeBoolean(player.hasColor);
                if (player.hasColor) stream.writeBits(player.nameColor, 24);

                Badges.writeOptional(stream, player.loadout.badge);
            });
        }

        if (flags & UpdateFlags.DeletedPlayers) {
            stream.writeArray(this.deletedPlayers, 8, (id) => {
                stream.writeObjectID(id);
            });
        }

        if (flags & UpdateFlags.AliveCount) {
            stream.writeUint8(this.aliveCount!);
        }

        if (flags & UpdateFlags.KillFeedMessages) {
            stream.writeArray(this.killFeedMessages, 8, (message) => {
                serializeKillFeedMessage(stream, message);
            });
        }

        if (flags & UpdateFlags.Planes) {
            stream.writeArray(this.planes, 4, (plane) => {
                stream.writeVector(
                    plane.position,
                    -GameConstants.maxPosition,
                    -GameConstants.maxPosition,
                    GameConstants.maxPosition * 2,
                    GameConstants.maxPosition * 2,
                    24);
                stream.writeRotation(plane.direction, 16);
            });
        }

        if (flags & UpdateFlags.MapPings) {
            stream.writeArray(this.mapPings, 4, (ping) => {
                stream.writePosition(ping);
            });
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        const flags = stream.readBits(UPDATE_FLAGS_BITS);

        if (flags & UpdateFlags.PlayerData) {
            this.playerData = deserializePlayerData(stream, this.previousData);
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

        if (flags & UpdateFlags.KillFeedMessages) {
            stream.readArray(this.killFeedMessages, 8, () => {
                return deserializeKillFeedMessage(stream);
            });
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
                return stream.readPosition();
            });
        }
    }
}
