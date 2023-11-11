import { type GasState, type ObjectCategory, PacketType, DEFAULT_INVENTORY, INVENTORY_MAX_WEAPONS } from "../constants";
import { type EmoteDefinition, Emotes } from "../definitions/emotes";
import { type ExplosionDefinition, Explosions } from "../definitions/explosions";
import { type WeaponDefinition, Loots } from "../definitions/loots";
import { type ScopeDefinition } from "../definitions/scopes";
import { BaseBullet, type BulletOptions } from "../utils/baseBullet";
import { ItemType } from "../utils/objectDefinitions";
import { ObjectSerializations, type ObjectsNetData } from "../utils/objectsSerializations";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";
import { Packet } from "./packet";

// SHUT UP SHUT UP SHUT UP SHUT UP
/* eslint-disable @typescript-eslint/no-non-null-assertion */

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
    AliveCount: 1 << 9
};

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

        Loots.writeToStream(stream, data.inventory.scope);
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

        data.inventory.scope = Loots.readFromStream(stream);
    }

    return data;
}

export class UpdatePacket extends Packet {
    override readonly allocBytes = 2 ** 13;
    override readonly type = PacketType.Update;

    playerData!: PlayerData;

    // client side only
    // used to store previous sent max and min health / adrenaline
    previousData!: PreviousData;

    deletedObjects?: number[];

    fullDirtyObjects?: ObjectFullData[];

    partialDirtyObjects?: ObjectPartialData[];

    // server side only
    bullets?: BaseBullet[];

    deserializedBullets?: BulletOptions[];

    explosions?: Array<{ definition: ExplosionDefinition, position: Vector }>;

    emotes?: Array<{ definition: EmoteDefinition, playerId: number }>;

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

    aliveCountDirty?: boolean;
    aliveCount?: number;

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
        if (this.deletedObjects?.length) flags += UpdateFlags.DeletedObjects;
        if (this.fullDirtyObjects?.length) flags += UpdateFlags.FullObjects;
        if (this.partialDirtyObjects?.length) flags += UpdateFlags.PartialObjects;
        if (this.bullets?.length) flags += UpdateFlags.Bullets;
        if (this.explosions?.length) flags += UpdateFlags.Explosions;
        if (this.emotes?.length) flags += UpdateFlags.Emotes;
        if (this.gas?.dirty) flags += UpdateFlags.Gas;
        if (this.gasPercentage?.dirty) flags += UpdateFlags.GasPercentage;
        if (this.aliveCountDirty) flags += UpdateFlags.AliveCount;

        stream.writeUint16(flags);

        if ((flags & UpdateFlags.PlayerData) !== 0) {
            serializePlayerData(stream, this.playerData as Required<PlayerData>);
        }

        if ((flags & UpdateFlags.DeletedObjects) !== 0) {
            stream.writeUint16(this.deletedObjects!.length);
            for (const id of this.deletedObjects!) stream.writeObjectID(id);
        }

        if ((flags & UpdateFlags.FullObjects) !== 0) {
            stream.writeUint16(this.fullDirtyObjects!.length);
            for (const object of this.fullDirtyObjects!) {
                stream.writeObjectID(object.id);
                stream.writeObjectType(object.type);
                (ObjectSerializations[object.type]
                    .serializeFull as (stream: SuroiBitStream, data: typeof object.data) => void)(stream, object.data);
            }
        }

        if ((flags & UpdateFlags.PartialObjects) !== 0) {
            stream.writeUint16(this.partialDirtyObjects!.length);
            for (const object of this.partialDirtyObjects!) {
                stream.writeObjectID(object.id);
                stream.writeObjectType(object.type);
                (ObjectSerializations[object.type]
                    .serializePartial as (stream: SuroiBitStream, data: typeof object.data) => void)(stream, object.data);
            }
        }

        if ((flags & UpdateFlags.Bullets) !== 0) {
            stream.writeUint8(this.bullets!.length);
            for (const bullet of this.bullets!) {
                bullet.serialize(stream);
            }
        }

        if ((flags & UpdateFlags.Explosions) !== 0) {
            stream.writeUint8(this.explosions!.length);
            for (const explosion of this.explosions!) {
                Explosions.writeToStream(stream, explosion.definition);
                stream.writePosition(explosion.position);
            }
        }

        if ((flags & UpdateFlags.Emotes) !== 0) {
            stream.writeBits(this.emotes!.length, 7);
            for (const emote of this.emotes!) {
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

        if ((flags & UpdateFlags.AliveCount) !== 0) {
            stream.writeBits(this.aliveCount!, 7);
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        const flags = stream.readUint16();

        if ((flags & UpdateFlags.PlayerData) !== 0) {
            this.playerData = deserializePlayerData(stream, this.previousData);
        }

        if ((flags & UpdateFlags.DeletedObjects) !== 0) {
            const count = stream.readUint16();
            this.deletedObjects = Array.from(
                { length: count },
                () => stream.readObjectID());
        }

        if ((flags & UpdateFlags.FullObjects) !== 0) {
            const count = stream.readUint16();

            this.fullDirtyObjects = new Array(count);

            for (let i = 0; i < count; i++) {
                const id = stream.readObjectID();
                const type = stream.readObjectType();
                const data = ObjectSerializations[type].deserializeFull(stream);

                this.fullDirtyObjects[i] = {
                    id,
                    type,
                    data
                };
            }
        }

        if ((flags & UpdateFlags.PartialObjects) !== 0) {
            const count = stream.readUint16();

            this.partialDirtyObjects = new Array(count);

            for (let i = 0; i < count; i++) {
                const id = stream.readObjectID();
                const type = stream.readObjectType();
                const data = ObjectSerializations[type].deserializePartial(stream);

                this.partialDirtyObjects[i] = {
                    id,
                    type,
                    data
                };
            }
        }

        if ((flags & UpdateFlags.Bullets) !== 0) {
            const count = stream.readUint8();
            this.deserializedBullets = Array.from(
                { length: count },
                () => BaseBullet.deserialize(stream));
        }

        if ((flags & UpdateFlags.Explosions) !== 0) {
            const count = stream.readInt8();
            this.explosions = Array.from({ length: count }, () => {
                return {
                    definition: Explosions.readFromStream(stream),
                    position: stream.readPosition()
                };
            });
        }

        if ((flags & UpdateFlags.Emotes) !== 0) {
            const count = stream.readBits(7);
            this.emotes = Array.from({ length: count }, () => {
                return {
                    definition: Emotes.readFromStream(stream),
                    playerId: stream.readObjectID()
                };
            });
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

        if ((flags & UpdateFlags.AliveCount) !== 0) {
            this.aliveCountDirty = true;
            this.aliveCount = stream.readBits(7);
        }
    }
}
