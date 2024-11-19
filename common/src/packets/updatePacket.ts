import { Constants, DEFAULT_INVENTORY, Derived, itemKeys, itemKeysLength, Layer, ObjectCategory, type GasState } from "../constants";
import { Badges, type BadgeDefinition } from "../definitions/badges";
import { Explosions, type ExplosionDefinition } from "../definitions/explosions";
import { Loots, type WeaponDefinition } from "../definitions/loots";
import { MapPings, type MapPing, type PlayerPing } from "../definitions/mapPings";
import { Perks, type PerkDefinition } from "../definitions/perks";
import { Scopes, type ScopeDefinition } from "../definitions/scopes";
import { BaseBullet, type BulletOptions } from "../utils/baseBullet";
import { GlobalRegistrar } from "../utils/definitionRegistry";
import { type Mutable, type SDeepMutable } from "../utils/misc";
import { ObjectSerializations, type FullData, type ObjectsNetData } from "../utils/objectsSerializations";
import { type SuroiByteStream } from "../utils/suroiByteStream";
import { Vec, type Vector } from "../utils/vector";
import type { AllowedEmoteSources } from "./inputPacket";
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

function serializePlayerData(
    strm: SuroiByteStream,
    {
        minMax,
        health,
        adrenaline,
        zoom,
        layer,
        id,
        teammates,
        inventory,
        lockedSlots,
        items,
        activeC4s,
        perks
    }: PlayerData
): void {
    /* eslint-disable @stylistic/no-multi-spaces */
    const hasMinMax      = minMax !== undefined;
    const hasHealth      = health !== undefined;
    const hasAdrenaline  = adrenaline !== undefined;
    const hasZoom        = zoom !== undefined;
    const hasLayer       = layer !== undefined;
    const hasId          = id !== undefined;
    const hasTeammates   = teammates !== undefined;
    const hasInventory   = inventory !== undefined;
    const hasLockedSlots = lockedSlots !== undefined;
    const hasItems       = items !== undefined;
    const hasActiveC4s   = activeC4s !== undefined;
    const hasPerks       = perks !== undefined;
    /* eslint-enable @stylistic/no-multi-spaces */

    strm.writeBooleanGroup2(
        hasMinMax,
        hasHealth,
        hasAdrenaline,
        hasZoom,
        hasLayer,
        hasId,
        hasTeammates,
        hasInventory,
        hasLockedSlots,
        hasItems,
        hasActiveC4s,
        hasPerks
    );

    if (hasMinMax) {
        const { maxHealth, minAdrenaline, maxAdrenaline } = minMax;
        strm.writeFloat32(maxHealth)
            .writeFloat32(minAdrenaline)
            .writeFloat32(maxAdrenaline);
    }

    if (hasHealth) {
        strm.writeFloat(health, 0, 1, 2);
    }

    if (hasAdrenaline) {
        strm.writeFloat(adrenaline, 0, 1, 2);
    }

    if (hasZoom) {
        strm.writeUint8(zoom);
    }

    if (hasLayer) {
        strm.writeLayer(layer);
    }

    if (hasId) {
        const { id: targetId, spectating } = id;
        strm.writeUint8(spectating ? -1 : 0)
            .writeObjectId(targetId);
    }

    if (hasTeammates) {
        strm.writeArray(
            teammates,
            ({
                id,
                position,
                normalizedHealth,
                downed,
                disconnected,
                colorIndex
            }) => {
                strm.writeUint8(
                    (downed ? 2 : 0) + (disconnected ? 1 : 0)
                )
                    .writeObjectId(id)
                    .writePosition(position ?? Vec.create(0, 0))
                    .writeFloat(normalizedHealth, 0, 1, 1)
                    .writeUint8(colorIndex);
            },
            1
        );
    }

    if (hasInventory) {
        const { activeWeaponIndex, weapons = [] } = inventory;

        /*
            activeWeaponIndex is 2 bits
            4 weapon slots, each takes up to 2 bits (2 booleans), for a total of 8 bits
            alright well, we'll just write the activeWeaponIndex as-is (can't pack
            it with anything else) and write the 8 booleans in a group
        */

        strm.writeUint8(activeWeaponIndex)
            .writeBooleanGroup(
                weapons[0] !== undefined,
                weapons[1] !== undefined,
                weapons[2] !== undefined,
                weapons[3] !== undefined,
                weapons[0]?.count !== undefined,
                weapons[1]?.count !== undefined,
                weapons[2]?.count !== undefined,
                weapons[3]?.count !== undefined
            );

        for (let i = 0; i < 4; i++) {
            const weapon = weapons[i];
            if (weapon === undefined) continue;

            const { definition, count, stats } = weapon;
            Loots.writeToStream(strm, definition);

            if (count !== undefined) {
                strm.writeUint8(count);
            }

            if (definition.killstreak) {
                strm.writeUint8(stats?.kills ?? 0);
            }
        }
    }

    if (hasLockedSlots) {
        strm.writeUint8(lockedSlots);
    }

    if (hasItems) {
        const { items: invItems, scope } = items;
        /*
            we have here an unknown amount of booleans
            so we'll write them in chunks of 8

            in essence, we'll first write a bitfield
            indicating which keys have non-zero counts,
            and then we'll write said non-zero counts

            for example, consider this inventory:
            { a: 3, b: 0, c: 4, d: 6, e: 0 }

            there are only five items, so 3 of the bits are
            unused. the first portion would write 0000 1101,
            with the first three bits never being used. the reason
            it's reversed is because we start with 2**0, then move
            to 2**1, and so on. this makes deserialization easier.

            to be explicit, the association is (with 'x' = don't care):
            0 0 0 0 1 1 0 1
            |___| | | | | |
              x   e d c b a

            after writing this, we write all the non-zero counts, giving
            0000 0000 0000 0011 (a)
            0000 0000 0000 0100 (c)
            0000 0000 0000 0110 (d)
            (16 bits are used because the old api used 9)

            thus resulting in a payload of
            00001101000000000000001100000000000001000000000000000110
        */

        const nonNullCounts: number[] = [];

        let itemPresent = 0;
        let itemIdx = 0;
        while (itemIdx < itemKeysLength) {
            for (
                let i = 0;
                i < 8 && itemIdx < itemKeysLength;
                i++, itemIdx++
            ) {
                const count = invItems[itemKeys[itemIdx]];
                if (count <= 0) continue;
                itemPresent += 2 ** i;
                nonNullCounts.push(count);
            }

            // write this byte
            strm.writeUint8(itemPresent);
            // reset
            itemPresent = 0;
        }

        // now write all the non-zero counts
        for (const count of nonNullCounts) {
            // old api used 9 bits
            strm.writeUint16(count);
        }

        Scopes.writeToStream(strm, scope);
    }

    if (hasActiveC4s) {
        // lol ok
        strm.writeUint8(activeC4s ? -1 : 0);
    }

    if (hasPerks) {
        let bitfield = perks.asBitfield();

        /*
            let n = Perks.definitions.length;
            this is a bit field, so there are n bits to write => ceil(n / 8) bytes to write
        */
        const bytes = Math.ceil(Perks.definitions.length / 8);
        for (let i = 0; i < bytes; i++) {
            // now write the bitfield in chunks of 8
            strm.writeUint8(bitfield); // no need to do '& 255', only the 8 LSB's are taken anyways
            bitfield >>= 8;
        }
    }
}

function deserializePlayerData(strm: SuroiByteStream): PlayerData {
    const [
        hasMinMax,
        hasHealth,
        hasAdrenaline,
        hasZoom,
        hasLayer,
        hasId,
        hasTeammates,
        hasInventory,
        hasLockedSlots,
        hasItems,
        hasActiveC4s,
        hasPerks
    ] = strm.readBooleanGroup2();

    const data: SDeepMutable<PlayerData> = {};

    if (hasMinMax) {
        data.minMax = {
            maxHealth: strm.readFloat32(),
            minAdrenaline: strm.readFloat32(),
            maxAdrenaline: strm.readFloat32()
        };
    }

    if (hasHealth) {
        data.health = strm.readFloat(0, 1, 2);
    }

    if (hasAdrenaline) {
        data.adrenaline = strm.readFloat(0, 1, 2);
    }

    if (hasZoom) {
        data.zoom = strm.readUint8();
    }

    if (hasLayer) {
        data.layer = strm.readLayer();
    }

    if (hasId) {
        data.id = {
            spectating: strm.readUint8() !== 0,
            id: strm.readObjectId()
        };
    }

    if (hasTeammates) {
        data.teammates = strm.readArray(
            () => {
                const status = strm.readUint8();
                return {
                    id: strm.readObjectId(),
                    position: strm.readPosition(),
                    normalizedHealth: strm.readFloat(0, 1, 1),
                    downed: (status & 2) !== 0,
                    disconnected: (status & 1) !== 0,
                    colorIndex: strm.readUint8()
                };
            },
            1
        );
    }

    if (hasInventory) {
        const activeWeaponIndex = strm.readUint8();
        const slotData = strm.readBooleanGroup();

        data.inventory = {
            activeWeaponIndex,
            weapons: Array.from(
                { length: 4 },
                (_, i) => {
                    if (!slotData[i]) return;

                    const definition = Loots.readFromStream<WeaponDefinition>(strm);

                    return {
                        definition,
                        count: slotData[i + 4] ? strm.readUint8() : undefined,
                        stats: {
                            kills: definition.killstreak ? strm.readUint8() : undefined
                        }
                    };
                }
            )
        };
    }

    if (hasLockedSlots) {
        data.lockedSlots = strm.readUint8();
    }

    if (hasItems) {
        /*
            let's work backwards with the inventory given as
            example in the serialization portion's comment.
            as a reminder, the payload in the stream is
            0000 1101 0000 0000 0000 0011 0000 0000 0000 0100 0000 0000 0000 0110,
            and the 5 items that exist are a, b, c, d, and e.

            we call readBooleanGroup to succinctly read a byte and convert it to
            a bitfield. thus we obtain 0000 1101, and from that, checkIndices contains
            0, 2, and 3 after the while loop is done

            we then consult the keys at those indices and associate the 16-bit
            integer count from the stream to that item's count, giving

            0 -> item 'a' -> 0000 0000 0000 0011 -> 3
            2 -> item 'c' -> 0000 0000 0000 0100 -> 4
            3 -> item 'd' -> 0000 0000 0000 0110 -> 6

            and for the other keys, we put 0
            thus our inventory is { a: 3, b: 0, c: 4, d: 6, e: 0 }
            which matches the inventory we started with on the server. ta-da!
        */

        const checkIndices = new Set<number>();
        let itemIdx = 0;
        while (itemIdx < itemKeysLength) {
            // read 8 booleans at once
            const group = strm.readBooleanGroup();
            for (
                let i = 0;
                i < 8 && itemIdx < itemKeysLength;
                i++, itemIdx++
            ) {
                if (group[i]) {
                    checkIndices.add(itemIdx);
                }
            }
        }

        const items: typeof DEFAULT_INVENTORY = {};
        for (let i = 0; i < itemKeysLength; i++) {
            items[itemKeys[i]] = checkIndices.has(i) ? strm.readUint16() : 0;
        }

        data.items = {
            items,
            scope: Scopes.readFromStream(strm)
        };
    }

    if (hasActiveC4s) {
        data.activeC4s = strm.readUint8() !== 0;
    }

    if (hasPerks) {
        const bytes = Math.ceil(Perks.definitions.length / 8);

        let bitfield = 0;
        for (let i = 0; i < bytes; i++) {
            // append new chunks "leftwards"
            bitfield += strm.readUint8() << (8 * i);
        }

        let list: PerkDefinition[] | undefined;
        data.perks = {
            asBitfield: () => bitfield,
            asList: () => [...(list ??= Perks.definitions.filter((_, i) => (bitfield & (1 << i)) !== 0))]
        };
    }

    return data;
}

const enum UpdateFlags {
    PlayerData = 1 << 0,
    DeletedObjects = 1 << 1,
    FullObjects = 1 << 2,
    PartialObjects = 1 << 3,
    Bullets = 1 << 4,
    Explosions = 1 << 5,
    Emotes = 1 << 6,
    Gas = 1 << 7,
    GasPercentage = 1 << 8,
    NewPlayers = 1 << 9,
    DeletedPlayers = 1 << 10,
    AliveCount = 1 << 11,
    Planes = 1 << 12,
    MapPings = 1 << 13
}

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
    readonly definition: AllowedEmoteSources
    readonly playerID: number
};

export interface PerkCollection {
    asBitfield(): number
    asList(): PerkDefinition[]
}

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
        readonly colorIndex: number
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
    readonly perks?: PerkCollection
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
        get partialStream(): SuroiByteStream
        get fullStream(): SuroiByteStream
    }>

    readonly partialObjectsCache: ReadonlyArray<{
        get partialStream(): SuroiByteStream
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
    serialize(strm, data) {
        let flags = 0;
        // save the current index to write flags later
        const flagsIdx = strm.index;
        strm.writeUint16(0);

        if (data.playerData) {
            if (Object.keys(data.playerData).length > 0) {
                serializePlayerData(strm, data.playerData);
                flags |= UpdateFlags.PlayerData;
            }
        }

        if (data.deletedObjects?.length) {
            strm.writeArray(
                data.deletedObjects,
                id => {
                    strm.writeObjectId(id);
                },
                2
            );
            flags |= UpdateFlags.DeletedObjects;
        }

        if (data.fullObjectsCache?.length) {
            strm.writeArray(
                data.fullObjectsCache,
                object => {
                    strm.writeStream(object.partialStream)
                        .writeStream(object.fullStream);
                },
                2
            );
            flags |= UpdateFlags.FullObjects;
        }

        if (data.partialObjectsCache?.length) {
            strm.writeArray(
                data.partialObjectsCache,
                object => {
                    strm.writeStream(object.partialStream);
                },
                2
            );
            flags |= UpdateFlags.PartialObjects;
        }

        if (data.bullets?.length) {
            strm.writeArray(
                data.bullets,
                bullet => { bullet.serialize(strm); },
                1
            );
            flags |= UpdateFlags.Bullets;
        }

        if (data.explosions?.length) {
            strm.writeArray(
                data.explosions,
                explosion => {
                    Explosions.writeToStream(strm, explosion.definition);
                    strm.writePosition(explosion.position)
                        .writeLayer(explosion.layer);
                },
                1
            );
            flags |= UpdateFlags.Explosions;
        }

        if (data.emotes?.length) {
            strm.writeArray(
                data.emotes,
                emote => {
                    GlobalRegistrar.writeToStream(strm, emote.definition);
                    strm.writeObjectId(emote.playerID);
                },
                1
            );
            flags |= UpdateFlags.Emotes;
        }

        if (data.gas) {
            const gas = data.gas;
            strm.writeUint8(gas.state)
                .writeUint8(gas.currentDuration)
                .writePosition(gas.oldPosition)
                .writePosition(gas.newPosition)
                .writeFloat(gas.oldRadius, 0, 2048, 2)
                .writeFloat(gas.newRadius, 0, 2048, 2);
            flags |= UpdateFlags.Gas;
        }

        if (data.gasProgress !== undefined) {
            strm.writeFloat(data.gasProgress, 0, 1, 2);
            flags |= UpdateFlags.GasPercentage;
        }

        if (data.newPlayers?.length) {
            strm.writeArray(
                data.newPlayers,
                player => {
                    const hasColor = player.hasColor;
                    const hasBadge = player.badge !== undefined;
                    strm.writeObjectId(player.id)
                        .writePlayerName(player.name)
                        .writeUint8(
                            (hasColor ? 2 : 0) + (hasBadge ? 1 : 0)
                        );

                    if (hasColor) {
                        strm.writeUint24(player.nameColor);
                    }

                    if (hasBadge) {
                        Badges.writeToStream(strm, player.badge);
                    }
                },
                1
            );
            flags |= UpdateFlags.NewPlayers;
        }

        if (data.deletedPlayers?.length) {
            strm.writeArray(
                data.deletedPlayers,
                id => { strm.writeObjectId(id); },
                1
            );
            flags |= UpdateFlags.DeletedPlayers;
        }

        if (data.aliveCount !== undefined) {
            strm.writeUint8(data.aliveCount);
            flags |= UpdateFlags.AliveCount;
        }

        if (data.planes?.length) {
            strm.writeArray(
                data.planes,
                plane => {
                    strm.writeVector(
                        plane.position,
                        -Constants.MAX_POSITION,
                        -Constants.MAX_POSITION,
                        Derived.DOUBLE_MAX_POS,
                        Derived.DOUBLE_MAX_POS,
                        3
                    );
                    strm.writeRotation2(plane.direction);
                },
                1
            );
            flags |= UpdateFlags.Planes;
        }

        if (data.mapPings?.length) {
            strm.writeArray(
                data.mapPings,
                ping => {
                    MapPings.writeToStream(strm, ping.definition);
                    strm.writePosition(ping.position);
                    if (ping.definition.isPlayerPing) {
                        strm.writeObjectId((ping as PlayerPingSerialization).playerId);
                    }
                },
                1
            );
            flags |= UpdateFlags.MapPings;
        }

        const idx = strm.index;
        strm.index = flagsIdx;
        strm.writeUint16(flags);
        // restore steam index
        strm.index = idx;
    },

    deserialize(stream) {
        const data = {} as Mutable<UpdatePacketDataOut>;

        const flags = stream.readUint16();

        if (flags & UpdateFlags.PlayerData) {
            data.playerData = deserializePlayerData(stream);
        }

        if (flags & UpdateFlags.DeletedObjects) {
            data.deletedObjects = stream.readArray(() => stream.readObjectId(), 2);
        }

        if (flags & UpdateFlags.FullObjects) {
            data.fullDirtyObjects = stream.readArray(() => {
                const id = stream.readObjectId();
                const type = stream.readObjectType();

                const serializers = ObjectSerializations[type];
                return {
                    id,
                    type,
                    data: {
                        ...serializers.deserializePartial(stream),
                        full: serializers.deserializeFull(stream)
                    } as ObjectsNetData[typeof type]
                };
            }, 2);
        }

        if (flags & UpdateFlags.PartialObjects) {
            data.partialDirtyObjects = stream.readArray(() => {
                const id = stream.readObjectId();
                const type = stream.readObjectType();
                return {
                    id,
                    type,
                    data: ObjectSerializations[type].deserializePartial(stream)
                };
            }, 2);
        }

        if (flags & UpdateFlags.Bullets) {
            data.deserializedBullets = stream.readArray(() => BaseBullet.deserialize(stream), 1);
        }

        if (flags & UpdateFlags.Explosions) {
            data.explosions = stream.readArray(() => ({
                definition: Explosions.readFromStream(stream),
                position: stream.readPosition(),
                layer: stream.readLayer()
            }), 1);
        }

        if (flags & UpdateFlags.Emotes) {
            data.emotes = stream.readArray(() => ({
                definition: GlobalRegistrar.readFromStream(stream),
                playerID: stream.readObjectId()
            }), 1);
        }

        if (flags & UpdateFlags.Gas) {
            data.gas = {
                state: stream.readUint8(),
                currentDuration: stream.readUint8(),
                oldPosition: stream.readPosition(),
                newPosition: stream.readPosition(),
                oldRadius: stream.readFloat(0, 2048, 2),
                newRadius: stream.readFloat(0, 2048, 2)
            };
        }

        if (flags & UpdateFlags.GasPercentage) {
            data.gasProgress = stream.readFloat(0, 1, 2);
        }

        if (flags & UpdateFlags.NewPlayers) {
            data.newPlayers = stream.readArray(() => {
                const id = stream.readObjectId();
                const name = stream.readPlayerName();
                const decorations = stream.readUint8();
                const hasColor = (decorations & 2) !== 0;

                return {
                    id,
                    name,
                    hasColor,
                    nameColor: hasColor ? stream.readUint24() : undefined,
                    badge: (decorations & 1) !== 0 ? Badges.readFromStream(stream) : undefined
                } as (UpdatePacketDataCommon["newPlayers"] & object)[number];
            }, 1);
        }

        if (flags & UpdateFlags.DeletedPlayers) {
            data.deletedPlayers = stream.readArray(() => stream.readObjectId(), 1);
        }

        if (flags & UpdateFlags.AliveCount) {
            data.aliveCount = stream.readUint8();
        }

        if (flags & UpdateFlags.Planes) {
            data.planes = stream.readArray(() => ({
                position: stream.readVector(
                    -Constants.MAX_POSITION,
                    -Constants.MAX_POSITION,
                    Derived.DOUBLE_MAX_POS,
                    Derived.DOUBLE_MAX_POS,
                    3
                ),
                direction: stream.readRotation2()
            }), 1);
        }

        if (flags & UpdateFlags.MapPings) {
            data.mapPings = stream.readArray(() => {
                const definition = MapPings.readFromStream(stream);

                return {
                    definition,
                    position: stream.readPosition(),
                    ...(definition.isPlayerPing ? { playerId: stream.readObjectId() } : {})
                } as MapPingSerialization;
            }, 1);
        }

        return data as UpdatePacketDataOut;
    }
});
