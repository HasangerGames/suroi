import { Armors, type ArmorDefinition } from "../definitions/items/armors";
import { Loots, type LootDefinition } from "../definitions/loots";
import { Packet, PacketType } from "./packet";

export interface DebugPacket {
    readonly type: PacketType.Debug

    readonly speed: number
    readonly overrideZoom: boolean
    readonly zoom: number

    readonly noClip: boolean
    readonly invulnerable: boolean

    readonly spawnLootType?: LootDefinition
    readonly spawnDummy: boolean
    readonly dummyVest?: ArmorDefinition
    readonly dummyHelmet?: ArmorDefinition

    readonly layerOffset: number
}

export const DebugPacket = new Packet<DebugPacket>(PacketType.Debug, {
    serialize(strm, data) {
        strm.writeBooleanGroup(
            data.overrideZoom,
            data.noClip,
            data.invulnerable,
            data.spawnLootType !== undefined,
            data.spawnDummy,
            data.dummyVest !== undefined,
            data.dummyHelmet !== undefined
        );

        strm.writeFloat32(data.speed);

        strm.writeInt8(data.layerOffset);

        if (data.overrideZoom) {
            strm.writeUint8(data.zoom);
        }

        if (data.spawnLootType) {
            Loots.writeToStream(strm, data.spawnLootType);
        }
        if (data.spawnDummy) {
            if (data.dummyVest !== undefined) {
                Armors.writeToStream(strm, data.dummyVest);
            }
            if (data.dummyHelmet !== undefined) {
                Armors.writeToStream(strm, data.dummyHelmet);
            }
        }
    },

    deserialize(strm, data) {
        const [
            overrideZoom,
            noClip,
            invulnerable,
            spawnLoot,
            spawnDummy,
            dummyHasVest,
            dummyHasHelmet
        ] = strm.readBooleanGroup();

        data.speed = strm.readFloat32();

        data.overrideZoom = overrideZoom;
        data.noClip = noClip;
        data.invulnerable = invulnerable;

        data.layerOffset = strm.readInt8();

        if (overrideZoom) {
            data.zoom = strm.readUint8();
        } else {
            data.zoom = 0;
        }

        if (spawnLoot) {
            data.spawnLootType = Loots.readFromStream(strm);
        }
        data.spawnDummy = spawnDummy;
        if (data.spawnDummy) {
            if (dummyHasVest) {
                data.dummyVest = Armors.readFromStream(strm);
            }
            if (dummyHasHelmet) {
                data.dummyHelmet = Armors.readFromStream(strm);
            }
        }
    }
});
