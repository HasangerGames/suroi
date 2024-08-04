import { Loots, type LootDefinition } from "../definitions/loots";
import { createPacket } from "./packet";

export type PickupPacketData = {
    readonly item: LootDefinition
};

export const PickupPacket = createPacket("PickupPacket")<PickupPacketData>({
    serialize(stream, data) {
        Loots.writeToStream(stream, data.item);
    },

    deserialize(stream) {
        return {
            item: Loots.readFromStream(stream)
        };
    }
});
