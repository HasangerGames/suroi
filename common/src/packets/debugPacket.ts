import { Loots, type LootDefinition } from "../definitions/loots";
import { Packet, PacketType } from "./packet";

export interface DebugPacket {
    readonly type: PacketType.Debug

    readonly speed: number
    readonly overrideZoom: boolean
    readonly zoom: number

    readonly spawnLootType?: LootDefinition

    readonly layerOffset: number
}

export const DebugPacket = new Packet<DebugPacket>(PacketType.Debug, {
    serialize(strm, data) {
        strm.writeBooleanGroup(
            data.overrideZoom,
            data.spawnLootType !== undefined
        );

        strm.writeFloat32(data.speed);

        strm.writeInt8(data.layerOffset);

        if (data.overrideZoom) {
            strm.writeUint8(data.zoom);
        }

        if (data.spawnLootType) {
            Loots.writeToStream(strm, data.spawnLootType);
        }
    },

    deserialize(strm, data) {
        const [
            overrideZoom,
            spawnLoot
        ] = strm.readBooleanGroup();

        data.speed = strm.readFloat32();

        data.overrideZoom = overrideZoom;

        data.layerOffset = strm.readInt8();

        if (overrideZoom) {
            data.zoom = strm.readUint8();
        } else {
            data.zoom = 0;
        }

        if (spawnLoot) {
            data.spawnLootType = Loots.readFromStream(strm);
        }
    }
});
