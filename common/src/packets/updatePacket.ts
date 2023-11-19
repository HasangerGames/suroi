import {
    type GasState,
    type ObjectCategory,
    PacketType,
    DEFAULT_INVENTORY,
    INVENTORY_MAX_WEAPONS,
    KillFeedMessageType
} from "../constants";
import { type EmoteDefinition, Emotes } from "../definitions/emotes";
import { type ExplosionDefinition, Explosions } from "../definitions/explosions";
import { type WeaponDefinition, Loots, type LootDefinition } from "../definitions/loots";
import { Scopes, type ScopeDefinition } from "../definitions/scopes";
import { BaseBullet, type BulletOptions } from "../utils/baseBullet";
import { ItemType } from "../utils/objectDefinitions";
import { ObjectSerializations, type ObjectsNetData } from "../utils/objectsSerializations";
import { KILL_FEED_MESSAGE_TYPE_BITS, type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";
import { Packet } from "./packet";

// SHUT UP SHUT UP SHUT UP SHUT UP
/* eslint-disable @typescript-eslint/no-non-null-assertion */

interface ObjectFullData {
    readonly id: number
    readonly type: ObjectCategory
    readonly data: Required<ObjectsNetData[ObjectFullData["type"]]>
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
        weapons: Array<undefined | {
            definition: WeaponDefinition
            ammo?: number
            kills?: number
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

    stream.writeBoolean(dirty.weapons);
    if (dirty.weapons) {
        stream.writeBits(data.inventory.activeWeaponIndex, 2);

        for (const weapon of data.inventory.weapons) {
            stream.writeBoolean(weapon !== undefined);

            if (weapon !== undefined) {
                Loots.writeToStream(stream, weapon.definition);

                if (weapon.definition.itemType === ItemType.Gun) {
                    stream.writeUint8(weapon.ammo!);
                }

                if (weapon.definition.killstreak !== undefined) {
                    stream.writeUint8(weapon.kills!);
                }
            }
        }
    }

    stream.writeBoolean(dirty.items);
    if (dirty.items) {
        for (const item in data.inventory.items) {
            const count = data.inventory.items[item];

            stream.writeBoolean(count > 0);

            if (count > 0) {
                stream.writeBits(count, 9);
            }
        }

        Scopes.writeToStream(stream, data.inventory.scope);
    }
}

interface PreviousData {
    maxHealth: number
    minAdrenaline: number
    maxAdrenaline: number
}

function deserializePlayerData(stream: SuroiBitStream, previousData: PreviousData): PlayerData {
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    const data = {
        dirty: {},
        inventory: {}
    } as PlayerData;

    data.dirty.maxMinStats = stream.readBoolean();

    if (data.dirty.maxMinStats) {
        data.maxHealth = stream.readFloat32();
        data.minAdrenaline = stream.readFloat32();
        data.maxAdrenaline = stream.readFloat32();
    }

    data.dirty.health = stream.readBoolean();
    if (data.dirty.health) {
        data.health = stream.readFloat(0, data.maxHealth ?? previousData.maxHealth, 12);
    }

    data.dirty.adrenaline = stream.readBoolean();
    if (data.dirty.adrenaline) {
        data.adrenaline = stream.readFloat(
            data.minAdrenaline ?? previousData.minAdrenaline,
            data.maxAdrenaline ?? previousData.maxAdrenaline,
            12);
    }

    data.dirty.zoom = stream.readBoolean();
    if (data.dirty.zoom) {
        data.zoom = stream.readUint8();
    }

    data.dirty.id = stream.readBoolean();

    if (data.dirty.id) {
        data.id = stream.readObjectID();
        data.spectating = stream.readBoolean();
    }

    data.dirty.weapons = stream.readBoolean();
    if (data.dirty.weapons) {
        data.inventory.activeWeaponIndex = stream.readBits(2);

        data.inventory.weapons = new Array(INVENTORY_MAX_WEAPONS).fill(undefined);

        for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
            const hasItem = stream.readBoolean();

            if (hasItem) {
                const definition = Loots.readFromStream<WeaponDefinition>(stream);

                let ammo: number | undefined;
                if (definition.itemType === ItemType.Gun) {
                    ammo = stream.readUint8();
                }

                let kills: number | undefined;
                if (definition.killstreak) {
                    kills = stream.readUint8();
                }

                data.inventory.weapons[i] = { definition, ammo, kills };
            }
        }
    }

    data.dirty.items = stream.readBoolean();
    if (data.dirty.items) {
        data.inventory.items = {};

        for (const item in DEFAULT_INVENTORY) {
            data.inventory.items[item] = stream.readBoolean() ? stream.readBits(9) : 0;
        }

        data.inventory.scope = Scopes.readFromStream(stream);
    }

    return data;
}

function serializeKillFeedMessage(stream: SuroiBitStream, message: KillFeedMessage): void {
    stream.writeBits(message.messageType, KILL_FEED_MESSAGE_TYPE_BITS);
    switch (message.messageType) {
        case KillFeedMessageType.Kill: {
            stream.writeObjectID(message.playerID!);

            message.twoPartyInteraction = message.killerID !== undefined;
            stream.writeBoolean(message.twoPartyInteraction);
            if (message.twoPartyInteraction) {
                stream.writeObjectID(message.killerID as number);
                stream.writeBits(message.kills as number, 7);
            }

            /* eslint-disable @typescript-eslint/no-non-null-assertion */
            const weaponWasUsed = message.weaponUsed !== undefined;
            stream.writeBoolean(weaponWasUsed);
            if (weaponWasUsed) {
                const isExplosion = "shrapnelCount" in message.weaponUsed!; //fixme hack to check if weapon used is an explosion
                stream.writeBoolean(isExplosion);
                if (isExplosion) {
                    Explosions.writeToStream(stream, message.weaponUsed as ExplosionDefinition);
                } else {
                    Loots.writeToStream(stream, message.weaponUsed as LootDefinition);
                }

                const trackKillstreak = !isExplosion && "killstreak" in message.weaponUsed! && message.weaponUsed.killstreak === true;
                stream.writeBoolean(trackKillstreak);
                if (trackKillstreak) {
                    stream.writeBits(message.killstreak!, 7);
                }
            }

            stream.writeBoolean(message.gasKill ?? false);
            break;
        }

        case KillFeedMessageType.KillLeaderAssigned: {
            stream.writeObjectID(message.playerID!);
            stream.writeBits(message.kills as number, 7);
            stream.writeBoolean(message.hideInKillFeed ?? false);
            break;
        }

        case KillFeedMessageType.KillLeaderUpdated: {
            stream.writeBits(message.kills as number, 7);
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

    twoPartyInteraction?: boolean
    killerID?: number
    kills?: number
    weaponUsed?: LootDefinition | ExplosionDefinition
    killstreak?: number

    gasKill?: boolean

    hideInKillFeed?: boolean
}

function deserializeKillFeedMessage(stream: SuroiBitStream): KillFeedMessage {
    const message: KillFeedMessage = {
        messageType: stream.readBits(KILL_FEED_MESSAGE_TYPE_BITS)
    };
    switch (message.messageType) {
        case KillFeedMessageType.Kill: {
            message.playerID = stream.readObjectID();

            message.twoPartyInteraction = stream.readBoolean();
            if (message.twoPartyInteraction) {
                message.killerID = stream.readObjectID();
                message.kills = stream.readBits(7);
            }

            if (stream.readBoolean()) { // used a weapon
                message.weaponUsed = stream.readBoolean() // is explosion
                    ? Explosions.readFromStream(stream)
                    : Loots.readFromStream(stream);

                if (stream.readBoolean()) { // track killstreak
                    message.killstreak = stream.readBits(7);
                }
            }

            message.gasKill = stream.readBoolean();
            break;
        }

        case KillFeedMessageType.KillLeaderAssigned: {
            message.playerID = stream.readObjectID();
            message.kills = stream.readBits(7);
            message.hideInKillFeed = stream.readBoolean();
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

const UpdateFlags = {
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
    KillFeedMessages: 1 << 12
};
const UPDATE_FLAGS_BITS = 13;

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

    explosions = new Set<{ definition: ExplosionDefinition, position: Vector }>();

    emotes = new Set<{ definition: EmoteDefinition, playerId: number }>();

    gas?: {
        state: GasState
        initialDuration: number
        oldPosition: Vector
        newPosition: Vector
        oldRadius: number
        newRadius: number
        dirty: boolean
    };

    gasPercentage?: {
        dirty: boolean
        value: number
    };

    newPlayers = new Set<{
        id: number
        name: string
        hasColor: boolean
        nameColor: string
    }>();

    deletedPlayers = new Set<number>();

    aliveCountDirty?: boolean;
    aliveCount?: number;

    killFeedMessages = new Set<KillFeedMessage>();

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        let playerDataDirty = false;
        for (const key in this.playerData.dirty) {
            if (this.playerData.dirty[key as keyof PlayerData["dirty"]]) {
                playerDataDirty = true;
            }
        }

        let flags = 0;
        if (playerDataDirty) flags += UpdateFlags.PlayerData;
        if (this.deletedObjects.size) flags += UpdateFlags.DeletedObjects;
        if (this.fullDirtyObjects.size) flags += UpdateFlags.FullObjects;
        if (this.partialDirtyObjects.size) flags += UpdateFlags.PartialObjects;
        if (this.bullets.size) flags += UpdateFlags.Bullets;
        if (this.explosions.size) flags += UpdateFlags.Explosions;
        if (this.emotes.size) flags += UpdateFlags.Emotes;
        if (this.gas?.dirty) flags += UpdateFlags.Gas;
        if (this.gasPercentage?.dirty) flags += UpdateFlags.GasPercentage;
        if (this.newPlayers.size) flags += UpdateFlags.NewPlayers;
        if (this.deletedPlayers.size) flags += UpdateFlags.DeletedPlayers;
        if (this.aliveCountDirty) flags += UpdateFlags.AliveCount;
        if (this.killFeedMessages.size) flags += UpdateFlags.KillFeedMessages;

        stream.writeBits(flags, UPDATE_FLAGS_BITS);

        if ((flags & UpdateFlags.PlayerData) !== 0) {
            serializePlayerData(stream, this.playerData as Required<PlayerData>);
        }

        if ((flags & UpdateFlags.DeletedObjects) !== 0) {
            stream.writeUint16(this.deletedObjects.size);
            for (const id of this.deletedObjects) stream.writeObjectID(id);
        }

        if ((flags & UpdateFlags.FullObjects) !== 0) {
            stream.writeUint16(this.fullDirtyObjects.size);
            for (const object of this.fullDirtyObjects) {
                stream.writeObjectID(object.id);
                stream.writeObjectType(object.type);
                (ObjectSerializations[object.type]
                    .serializeFull as (stream: SuroiBitStream, data: typeof object.data) => void)(stream, object.data);
            }
        }

        if ((flags & UpdateFlags.PartialObjects) !== 0) {
            stream.writeUint16(this.partialDirtyObjects.size);
            for (const object of this.partialDirtyObjects) {
                stream.writeObjectID(object.id);
                stream.writeObjectType(object.type);
                (ObjectSerializations[object.type]
                    .serializePartial as (stream: SuroiBitStream, data: typeof object.data) => void)(stream, object.data);
            }
        }

        if ((flags & UpdateFlags.Bullets) !== 0) {
            stream.writeUint8(this.bullets.size);
            for (const bullet of this.bullets) {
                bullet.serialize(stream);
            }
        }

        if ((flags & UpdateFlags.Explosions) !== 0) {
            stream.writeUint8(this.explosions.size);
            for (const explosion of this.explosions) {
                Explosions.writeToStream(stream, explosion.definition);
                stream.writePosition(explosion.position);
            }
        }

        if ((flags & UpdateFlags.Emotes) !== 0) {
            stream.writeBits(this.emotes.size, 7);
            for (const emote of this.emotes) {
                Emotes.writeToStream(stream, emote.definition);
                stream.writeObjectID(emote.playerId);
            }
        }

        if ((flags & UpdateFlags.Gas) !== 0) {
            const gas = this.gas!;
            stream.writeBits(gas.state, 2);
            stream.writeBits(gas.initialDuration, 7);
            stream.writePosition(gas.oldPosition);
            stream.writePosition(gas.newPosition);
            stream.writeFloat(gas.oldRadius, 0, 2048, 16);
            stream.writeFloat(gas.newRadius, 0, 2048, 16);
        }

        if ((flags & UpdateFlags.GasPercentage) !== 0) {
            stream.writeFloat(this.gasPercentage!.value, 0, 1, 16);
        }

        if ((flags & UpdateFlags.NewPlayers) !== 0) {
            stream.writeUint8(this.newPlayers.size);

            for (const player of this.newPlayers) {
                stream.writeObjectID(player.id);
                stream.writePlayerName(player.name);
                stream.writeBoolean(player.hasColor);
                if (player.hasColor) {
                    stream.writeUTF8String(player.nameColor, 10);
                }
            }
        }

        if ((flags & UpdateFlags.DeletedPlayers) !== 0) {
            stream.writeUint8(this.deletedPlayers.size);

            for (const player of this.deletedPlayers) {
                stream.writeObjectID(player);
            }
        }

        if ((flags & UpdateFlags.AliveCount) !== 0) {
            stream.writeBits(this.aliveCount!, 7);
        }

        if ((flags & UpdateFlags.KillFeedMessages) !== 0) {
            stream.writeUint8(this.killFeedMessages.size);

            for (const message of this.killFeedMessages) {
                serializeKillFeedMessage(stream, message);
            }
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        const flags = stream.readBits(UPDATE_FLAGS_BITS);

        if ((flags & UpdateFlags.PlayerData) !== 0) {
            this.playerData = deserializePlayerData(stream, this.previousData);
        }

        if ((flags & UpdateFlags.DeletedObjects) !== 0) {
            const count = stream.readUint16();

            for (let i = 0; i < count; i++) {
                this.deletedObjects.add(stream.readObjectID());
            }
        }

        if ((flags & UpdateFlags.FullObjects) !== 0) {
            const count = stream.readUint16();

            for (let i = 0; i < count; i++) {
                const id = stream.readObjectID();
                const type = stream.readObjectType();
                const data = ObjectSerializations[type].deserializeFull(stream);

                this.fullDirtyObjects.add({ id, type, data });
            }
        }

        if ((flags & UpdateFlags.PartialObjects) !== 0) {
            const count = stream.readUint16();

            for (let i = 0; i < count; i++) {
                const id = stream.readObjectID();
                const type = stream.readObjectType();
                const data = ObjectSerializations[type].deserializePartial(stream);

                this.partialDirtyObjects.add({ id, type, data });
            }
        }

        if ((flags & UpdateFlags.Bullets) !== 0) {
            const count = stream.readUint8();

            for (let i = 0; i < count; i++) {
                this.deserializedBullets.add(BaseBullet.deserialize(stream));
            }
        }

        if ((flags & UpdateFlags.Explosions) !== 0) {
            const count = stream.readUint8();

            for (let i = 0; i < count; i++) {
                this.explosions.add({
                    definition: Explosions.readFromStream(stream),
                    position: stream.readPosition()
                });
            }
        }

        if ((flags & UpdateFlags.Emotes) !== 0) {
            const count = stream.readBits(7);

            for (let i = 0; i < count; i++) {
                this.emotes.add({
                    definition: Emotes.readFromStream(stream),
                    playerId: stream.readObjectID()
                });
            }
        }

        if ((flags & UpdateFlags.Gas) !== 0) {
            this.gas = {
                dirty: true,
                state: stream.readBits(2),
                initialDuration: stream.readBits(7),
                oldPosition: stream.readPosition(),
                newPosition: stream.readPosition(),
                oldRadius: stream.readFloat(0, 2048, 16),
                newRadius: stream.readFloat(0, 2048, 16)
            };
        }

        if ((flags & UpdateFlags.GasPercentage) !== 0) {
            this.gasPercentage = {
                dirty: true,
                value: stream.readFloat(0, 1, 16)
            };
        }

        if ((flags & UpdateFlags.NewPlayers) !== 0) {
            const count = stream.readUint8();

            for (let i = 0; i < count; i++) {
                const id = stream.readObjectID();
                const name = stream.readPlayerName();
                const hasColor = stream.readBoolean();
                const nameColor = hasColor ? stream.readUTF8String(10) : "";
                this.newPlayers.add({
                    id,
                    name,
                    hasColor,
                    nameColor
                });
            }
        }

        if ((flags & UpdateFlags.DeletedPlayers) !== 0) {
            const size = stream.readUint8();

            for (let i = 0; i < size; i++) {
                this.deletedPlayers.add(stream.readObjectID());
            }
        }

        if ((flags & UpdateFlags.AliveCount) !== 0) {
            this.aliveCountDirty = true;
            this.aliveCount = stream.readBits(7);
        }

        if ((flags & UpdateFlags.KillFeedMessages) !== 0) {
            const count = stream.readUint8();

            for (let i = 0; i < count; i++) {
                this.killFeedMessages.add(deserializeKillFeedMessage(stream));
            }
        }
    }
}
