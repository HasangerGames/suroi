import { DEFAULT_INVENTORY, GameConstants, KillFeedMessageType, KillType, PacketType, type GasState, type ObjectCategory } from "../constants";
import { Emotes, type EmoteDefinition } from "../definitions/emotes";
import { Explosions, type ExplosionDefinition } from "../definitions/explosions";
import { type GunDefinition } from "../definitions/guns";
import { Loots, type LootDefinition, type WeaponDefinition } from "../definitions/loots";
import { Scopes, type ScopeDefinition } from "../definitions/scopes";
import { BaseBullet, type BulletOptions } from "../utils/baseBullet";
import { type FullData, ObjectSerializations, type ObjectsNetData } from "../utils/objectsSerializations";
import { calculateEnumPacketBits, type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";
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
        zoom: boolean
        throwable: boolean
    }

    id: number
    spectating: boolean

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

                if (weapon.definition.killstreak !== undefined) {
                    stream.writeBits(weapon.stats!.kills!, 7);
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
    const data = {
        dirty: {},
        inventory: {}
    } as PlayerData;

    if (data.dirty.maxMinStats = stream.readBoolean()) {
        data.maxHealth = stream.readFloat32();
        data.minAdrenaline = stream.readFloat32();
        data.maxAdrenaline = stream.readFloat32();
    }

    if (data.dirty.health = stream.readBoolean()) {
        data.health = stream.readFloat(0, data.maxHealth ?? previousData.maxHealth, 12);
    }

    if (data.dirty.adrenaline = stream.readBoolean()) {
        data.adrenaline = stream.readFloat(
            data.minAdrenaline ?? previousData.minAdrenaline,
            data.maxAdrenaline ?? previousData.maxAdrenaline,
            12
        );
    }

    if (data.dirty.zoom = stream.readBoolean()) {
        data.zoom = stream.readUint8();
    }

    if (data.dirty.id = stream.readBoolean()) {
        data.id = stream.readObjectID();
        data.spectating = stream.readBoolean();
    }

    if (data.dirty.weapons = stream.readBoolean()) {
        data.inventory.activeWeaponIndex = stream.readBits(2);

        const maxWeapons = GameConstants.player.maxWeapons;

        data.inventory.weapons = Array.from({ length: maxWeapons }, () => undefined);
        for (let i = 0; i < maxWeapons; i++) {
            if (stream.readBoolean()) { // has item
                const definition = Loots.readFromStream<WeaponDefinition>(stream);

                data.inventory.weapons[i] = {
                    definition,
                    count: stream.readBoolean() ? stream.readUint8() : undefined,
                    stats: {
                        kills: definition.killstreak ? stream.readBits(7) : undefined
                    }
                };
            }
        }
    }

    if (data.dirty.items = stream.readBoolean()) {
        data.inventory.items = {};

        for (const item in DEFAULT_INVENTORY) {
            data.inventory.items[item] = stream.readBoolean() ? stream.readBits(9) : 0;
        }

        data.inventory.scope = Scopes.readFromStream(stream);
    }

    return data;
}

const KILL_FEED_MESSAGE_TYPE_BITS = calculateEnumPacketBits(KillFeedMessageType);
const KILL_TYPE_BITS = calculateEnumPacketBits(KillType);

function serializeKillFeedMessage(stream: SuroiBitStream, message: KillFeedMessage): void {
    stream.writeBits(message.messageType, KILL_FEED_MESSAGE_TYPE_BITS);
    switch (message.messageType) {
        case KillFeedMessageType.Kill: {
            stream.writeObjectID(message.playerID!);

            stream.writeBits(message.killType ?? KillType.Suicide, KILL_TYPE_BITS);
            if (message.killType === KillType.TwoPartyInteraction) {
                stream.writeObjectID(message.killerID!);
                stream.writeBits(message.kills!, 7);
            }

            const weaponWasUsed = message.weaponUsed !== undefined;
            stream.writeBoolean(weaponWasUsed);
            if (weaponWasUsed) {
                const isExplosion = "shrapnelCount" in message.weaponUsed!; // hack to check if weapon used is an explosion
                stream.writeBoolean(isExplosion);
                if (isExplosion) {
                    Explosions.writeToStream(stream, message.weaponUsed as ExplosionDefinition);
                } else {
                    Loots.writeToStream(stream, message.weaponUsed as LootDefinition);
                }

                if (
                    message.weaponUsed !== undefined &&
                    "killstreak" in message.weaponUsed &&
                    message.weaponUsed.killstreak
                ) {
                    stream.writeBits(message.killstreak!, 7);
                }

                if ("dual" in message.weaponUsed!) {
                    stream.writeBoolean((message as KillFeedMessage & { weaponUsed: GunDefinition, dual: boolean }).dual);
                }
            }
            break;
        }

        case KillFeedMessageType.KillLeaderAssigned: {
            stream.writeObjectID(message.playerID!);
            stream.writeBits(message.kills!, 7);
            stream.writeBoolean(message.hideInKillfeed ?? false);
            break;
        }

        case KillFeedMessageType.KillLeaderUpdated: {
            stream.writeBits(message.kills!, 7);
            break;
        }

        case KillFeedMessageType.KillLeaderDead: {
            stream.writeObjectID(message.playerID!);
            stream.writeObjectID(message.killerID!);
            break;
        }
    }
}

export type KillFeedMessage = {
    messageType: KillFeedMessageType
    playerID?: number

    killType?: KillType
    killerID?: number
    kills?: number
    killstreak?: number
    hideInKillfeed?: boolean
} & (
    {
        weaponUsed?: LootDefinition | ExplosionDefinition
    } | {
        weaponUsed: GunDefinition
        dual: boolean
    }
);

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
                message.kills = stream.readBits(7);
            }

            if (stream.readBoolean()) { // used a weapon
                message.weaponUsed = stream.readBoolean() // is explosion
                    ? Explosions.readFromStream(stream)
                    : Loots.readFromStream(stream);

                if (
                    message.weaponUsed !== undefined &&
                    "killstreak" in message.weaponUsed &&
                    message.weaponUsed.killstreak
                ) {
                    message.killstreak = stream.readBits(7);
                }

                if ("dual" in message.weaponUsed) { // might be dual
                    (message as KillFeedMessage & { weaponUsed: GunDefinition, dual: boolean }).dual = stream.readBoolean();
                }
            }
            break;
        }

        case KillFeedMessageType.KillLeaderAssigned: {
            message.playerID = stream.readObjectID();
            message.kills = stream.readBits(7);
            message.hideInKillfeed = stream.readBoolean();
            break;
        }

        case KillFeedMessageType.KillLeaderUpdated: {
            message.kills = stream.readBits(7);
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

    deletedObjects = new Set<number>();

    fullDirtyObjects = new Set<ObjectFullData>();

    partialDirtyObjects = new Set<ObjectPartialData>();

    // server side only
    bullets = new Set<BaseBullet>();

    deserializedBullets = new Set<BulletOptions>();

    explosions = new Set<{ readonly definition: ExplosionDefinition, readonly position: Vector }>();

    emotes = new Set<{ readonly definition: EmoteDefinition, readonly playerID: number }>();

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

    newPlayers = new Set<{
        readonly id: number
        readonly name: string
        readonly hasColor: boolean
        readonly nameColor: number
    }>();

    deletedPlayers = new Set<number>();

    aliveCountDirty?: boolean;
    aliveCount?: number;

    killFeedMessages = new Set<KillFeedMessage>();

    planes = new Set<{ readonly position: Vector, readonly direction: number }>();

    mapPings = new Set<Vector>();

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        const playerDataDirty = Object.values(this.playerData.dirty).some(v => v);

        const flags =
            (+!!playerDataDirty && UpdateFlags.PlayerData) |
            (+!!this.deletedObjects.size && UpdateFlags.DeletedObjects) |
            (+!!this.fullDirtyObjects.size && UpdateFlags.FullObjects) |
            (+!!this.partialDirtyObjects.size && UpdateFlags.PartialObjects) |
            (+!!this.bullets.size && UpdateFlags.Bullets) |
            (+!!this.explosions.size && UpdateFlags.Explosions) |
            (+!!this.emotes.size && UpdateFlags.Emotes) |
            (+!!this.gas?.dirty && UpdateFlags.Gas) |
            (+!!this.gasProgress?.dirty && UpdateFlags.GasPercentage) |
            (+!!this.newPlayers.size && UpdateFlags.NewPlayers) |
            (+!!this.deletedPlayers.size && UpdateFlags.DeletedPlayers) |
            (+!!this.aliveCountDirty && UpdateFlags.AliveCount) |
            (+!!this.killFeedMessages.size && UpdateFlags.KillFeedMessages) |
            (+!!this.planes.size && UpdateFlags.Planes) |
            (+!!this.mapPings.size && UpdateFlags.MapPings);

        stream.writeBits(flags, UPDATE_FLAGS_BITS);

        if (flags & UpdateFlags.PlayerData) {
            serializePlayerData(stream, this.playerData);
        }

        if (flags & UpdateFlags.DeletedObjects) {
            stream.writeUint16(this.deletedObjects.size);
            for (const id of this.deletedObjects) stream.writeObjectID(id);
        }

        if (flags & UpdateFlags.FullObjects) {
            stream.writeUint16(this.fullDirtyObjects.size);
            for (const object of this.fullDirtyObjects) {
                stream.writeObjectID(object.id);
                stream.writeObjectType(object.type);
                (ObjectSerializations[object.type].serializeFull as (stream: SuroiBitStream, data: typeof object.data) => void)(stream, object.data);
            }
        }

        if (flags & UpdateFlags.PartialObjects) {
            stream.writeUint16(this.partialDirtyObjects.size);
            for (const object of this.partialDirtyObjects) {
                stream.writeObjectID(object.id);
                stream.writeObjectType(object.type);
                (ObjectSerializations[object.type].serializePartial as (stream: SuroiBitStream, data: typeof object.data) => void)(stream, object.data);
            }
        }

        if (flags & UpdateFlags.Bullets) {
            stream.writeUint8(this.bullets.size);
            for (const bullet of this.bullets) {
                bullet.serialize(stream);
            }
        }

        if (flags & UpdateFlags.Explosions) {
            stream.writeUint8(this.explosions.size);
            for (const explosion of this.explosions) {
                Explosions.writeToStream(stream, explosion.definition);
                stream.writePosition(explosion.position);
            }
        }

        if (flags & UpdateFlags.Emotes) {
            stream.writeBits(this.emotes.size, 7);
            for (const emote of this.emotes) {
                Emotes.writeToStream(stream, emote.definition);
                stream.writeObjectID(emote.playerID);
            }
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
            stream.writeUint8(this.newPlayers.size);

            for (const player of this.newPlayers) {
                stream.writeObjectID(player.id);
                stream.writePlayerName(player.name);
                stream.writeBoolean(player.hasColor);
                if (player.hasColor) {
                    stream.writeBits(player.nameColor, 24);
                }
            }
        }

        if (flags & UpdateFlags.DeletedPlayers) {
            stream.writeUint8(this.deletedPlayers.size);

            for (const player of this.deletedPlayers) {
                stream.writeObjectID(player);
            }
        }

        if (flags & UpdateFlags.AliveCount) {
            stream.writeBits(this.aliveCount!, 7);
        }

        if (flags & UpdateFlags.KillFeedMessages) {
            stream.writeUint8(this.killFeedMessages.size);

            for (const message of this.killFeedMessages) {
                serializeKillFeedMessage(stream, message);
            }
        }

        if (flags & UpdateFlags.Planes) {
            stream.writeBits(this.planes.size, 4);

            for (const plane of this.planes) {
                stream.writeVector(
                    plane.position,
                    -GameConstants.maxPosition,
                    -GameConstants.maxPosition,
                    GameConstants.maxPosition * 2,
                    GameConstants.maxPosition * 2,
                    24);
                stream.writeRotation(plane.direction, 16);
            }
        }

        if (flags & UpdateFlags.MapPings) {
            stream.writeBits(this.mapPings.size, 4);

            for (const ping of this.mapPings) {
                stream.writePosition(ping);
            }
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        const flags = stream.readBits(UPDATE_FLAGS_BITS);

        if (flags & UpdateFlags.PlayerData) {
            this.playerData = deserializePlayerData(stream, this.previousData);
        }

        if (flags & UpdateFlags.DeletedObjects) {
            const count = stream.readUint16();

            for (let i = 0; i < count; i++) {
                this.deletedObjects.add(stream.readObjectID());
            }
        }

        if (flags & UpdateFlags.FullObjects) {
            const count = stream.readUint16();

            for (let i = 0; i < count; i++) {
                const id = stream.readObjectID();
                const type = stream.readObjectType();
                const data = ObjectSerializations[type].deserializeFull(stream);

                this.fullDirtyObjects.add({ id, type, data });
            }
        }

        if (flags & UpdateFlags.PartialObjects) {
            const count = stream.readUint16();

            for (let i = 0; i < count; i++) {
                const id = stream.readObjectID();
                const type = stream.readObjectType();
                const data = ObjectSerializations[type].deserializePartial(stream);

                this.partialDirtyObjects.add({ id, type, data });
            }
        }

        if (flags & UpdateFlags.Bullets) {
            const count = stream.readUint8();

            for (let i = 0; i < count; i++) {
                this.deserializedBullets.add(BaseBullet.deserialize(stream));
            }
        }

        if (flags & UpdateFlags.Explosions) {
            const count = stream.readUint8();

            for (let i = 0; i < count; i++) {
                this.explosions.add({
                    definition: Explosions.readFromStream(stream),
                    position: stream.readPosition()
                });
            }
        }

        if (flags & UpdateFlags.Emotes) {
            const count = stream.readBits(7);

            for (let i = 0; i < count; i++) {
                this.emotes.add({
                    definition: Emotes.readFromStream(stream),
                    playerID: stream.readObjectID()
                });
            }
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
            const count = stream.readUint8();

            for (let i = 0; i < count; i++) {
                const id = stream.readObjectID();
                const name = stream.readPlayerName();
                const hasColor = stream.readBoolean();
                const nameColor = hasColor ? stream.readBits(24) : 0;
                this.newPlayers.add({
                    id,
                    name,
                    hasColor,
                    nameColor
                });
            }
        }

        if (flags & UpdateFlags.DeletedPlayers) {
            const size = stream.readUint8();

            for (let i = 0; i < size; i++) {
                this.deletedPlayers.add(stream.readObjectID());
            }
        }

        if (flags & UpdateFlags.AliveCount) {
            this.aliveCountDirty = true;
            this.aliveCount = stream.readBits(7);
        }

        if (flags & UpdateFlags.KillFeedMessages) {
            const count = stream.readUint8();

            for (let i = 0; i < count; i++) {
                this.killFeedMessages.add(deserializeKillFeedMessage(stream));
            }
        }

        if (flags & UpdateFlags.Planes) {
            const count = stream.readBits(4);

            for (let i = 0; i < count; i++) {
                const position = stream.readVector(
                    -GameConstants.maxPosition,
                    -GameConstants.maxPosition,
                    GameConstants.maxPosition * 2,
                    GameConstants.maxPosition * 2,
                    24
                );
                const direction = stream.readRotation(16);

                this.planes.add({ position, direction });
            }
        }

        if (flags & UpdateFlags.MapPings) {
            const count = stream.readBits(4);
            for (let i = 0; i < count; i++) {
                this.mapPings.add(stream.readPosition());
            }
        }
    }
}
