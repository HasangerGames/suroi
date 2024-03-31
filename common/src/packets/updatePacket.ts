import { DEFAULT_INVENTORY, GameConstants, KillfeedEventSeverity, KillfeedEventType, KillfeedMessageType, PacketType, type GasState, type ObjectCategory } from "../constants";
import { Badges, type BadgeDefinition } from "../definitions/badges";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { Explosions, type ExplosionDefinition } from "../definitions/explosions";
import { Loots, type LootDefinition, type WeaponDefinition } from "../definitions/loots";
import { Scopes, type ScopeDefinition } from "../definitions/scopes";
import { BaseBullet, type BulletOptions } from "../utils/baseBullet";
import { ObjectDefinitions } from "../utils/objectDefinitions";
import { ObjectSerializations, type FullData, type ObjectsNetData } from "../utils/objectsSerializations";
import { calculateEnumPacketBits, OBJECT_ID_BITS, type SuroiBitStream } from "../utils/suroiBitStream";
import { Vec, type Vector } from "../utils/vector";

import { MapPings, type MapPingDefinition } from "../definitions/mapPings";
import { AbstractPacket } from "./packet";

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

function deserializePlayerData(stream: SuroiBitStream): PlayerData {
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
        data.teammates = [];
        stream.readArray(data.teammates, 2, () => {
            return {
                id: stream.readObjectID(),
                position: stream.readPosition(),
                normalizedHealth: stream.readFloat(0, 1, 8),
                downed: stream.readBoolean(),
                disconnected: stream.readBoolean()
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

const KILLFEED_MESSAGE_TYPE_BITS = calculateEnumPacketBits(KillfeedMessageType);
const KILLFEED_EVENT_TYPE_BITS = calculateEnumPacketBits(KillfeedEventType);
const KILLFEED_EVENT_SEVERITY_BITS = calculateEnumPacketBits(KillfeedEventSeverity);

const damageSourcesDefinitions = ObjectDefinitions.create<LootDefinition | ExplosionDefinition>([...Loots, ...Explosions]);

function serializeKillFeedMessage(stream: SuroiBitStream, message: KillFeedMessage): void {
    stream.writeBits(message.messageType, KILLFEED_MESSAGE_TYPE_BITS);
    switch (message.messageType) {
        case KillfeedMessageType.DeathOrDown: {
            stream.writeObjectID(message.victimId!);

            const type = message.eventType ?? KillfeedEventType.Suicide;
            stream.writeBits(type, KILLFEED_EVENT_TYPE_BITS);
            if (
                [
                    KillfeedEventType.NormalTwoParty,
                    KillfeedEventType.FinishedOff,
                    KillfeedEventType.FinallyKilled
                ].includes(type)
            ) {
                const hasAttacker = message.attackerId !== undefined;
                stream.writeBoolean(hasAttacker);
                if (hasAttacker) {
                    stream.writeObjectID(message.attackerId!);
                    stream.writeUint8(message.attackerKills!);
                }
            }
            stream.writeBits(message.severity ?? KillfeedEventSeverity.Kill, KILLFEED_EVENT_SEVERITY_BITS);

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

        case KillfeedMessageType.KillLeaderAssigned: {
            stream.writeObjectID(message.victimId!);
            stream.writeUint8(message.attackerKills!);
            stream.writeBoolean(message.hideFromKillfeed ?? false);
            break;
        }

        case KillfeedMessageType.KillLeaderUpdated: {
            stream.writeUint8(message.attackerKills!);
            break;
        }

        case KillfeedMessageType.KillLeaderDead: {
            stream.writeObjectID(message.victimId!);
            stream.writeObjectID(message.attackerId!);
            break;
        }
    }
}

export interface KillFeedMessage {
    messageType: KillfeedMessageType
    victimId?: number
    victimBadge?: BadgeDefinition
    eventType?: KillfeedEventType
    severity?: KillfeedEventSeverity
    attackerId?: number
    attackBadge?: BadgeDefinition
    attackerKills?: number
    killstreak?: number
    hideFromKillfeed?: boolean
    weaponUsed?: LootDefinition | ExplosionDefinition
}

function deserializeKillFeedMessage(stream: SuroiBitStream): KillFeedMessage {
    const message = {
        messageType: stream.readBits(KILLFEED_MESSAGE_TYPE_BITS)
    } as KillFeedMessage;

    switch (message.messageType) {
        case KillfeedMessageType.DeathOrDown: {
            message.victimId = stream.readObjectID();

            const type = message.eventType = stream.readBits(KILLFEED_EVENT_TYPE_BITS);
            if (
                [
                    KillfeedEventType.NormalTwoParty,
                    KillfeedEventType.FinishedOff,
                    KillfeedEventType.FinallyKilled
                ].includes(type) &&
                stream.readBoolean() // attacker present
            ) {
                message.attackerId = stream.readObjectID();
                message.attackerKills = stream.readUint8();
            }
            message.severity = stream.readBits(KILLFEED_EVENT_SEVERITY_BITS);

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

        case KillfeedMessageType.KillLeaderAssigned: {
            message.victimId = stream.readObjectID();
            message.attackerKills = stream.readUint8();
            message.hideFromKillfeed = stream.readBoolean();
            break;
        }

        case KillfeedMessageType.KillLeaderUpdated: {
            message.attackerKills = stream.readUint8();
            break;
        }

        case KillfeedMessageType.KillLeaderDead: {
            message.victimId = stream.readObjectID();
            message.attackerId = stream.readObjectID();
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

export class UpdatePacket extends AbstractPacket {
    override readonly allocBytes = 1 << 16;
    override readonly type = PacketType.Update;

    playerData!: PlayerData;

    deletedObjects: number[] = [];

    fullDirtyObjects: ObjectFullData[] = [];

    partialDirtyObjects: ObjectPartialData[] = [];

    // server side only

    fullObjectsCache: Array<{
        partialStream: SuroiBitStream
        fullStream: SuroiBitStream
    }> = [];

    partialObjectsCache: Array<{
        partialStream: SuroiBitStream
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

    planes: Array<{
        readonly position: Vector
        readonly direction: number
    }> = [];

    mapPings: Array<{
        readonly position: Vector
        readonly definition: MapPingDefinition
        readonly playerId?: number
    }> = [];

    override serialize(stream: SuroiBitStream): void {
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
                stream.writeBytes(object.partialStream, 0, object.partialStream.byteIndex);
                stream.writeBytes(object.fullStream, 0, object.fullStream.byteIndex);
            });
        }

        if (flags & UpdateFlags.PartialObjects) {
            stream.writeAlignToNextByte();
            stream.writeArray(this.partialObjectsCache, 16, (object) => {
                stream.writeBytes(object.partialStream, 0, object.partialStream.byteIndex);
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
                MapPings.writeToStream(stream, ping.definition);
                stream.writePosition(ping.position);
                if (ping.definition.isPlayerPing) {
                    stream.writeObjectID(ping.playerId!);
                }
            });
        }
    }

    override deserialize(stream: SuroiBitStream): void {
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
                const definition = MapPings.readFromStream(stream);
                const position = stream.readPosition();
                const playerId = definition.isPlayerPing ? stream.readObjectID() : undefined;
                return {
                    definition,
                    position,
                    playerId
                };
            });
        }
    }
}
