import { InventoryMessages } from "../constants";
import { Loots, type LootDefinition } from "../definitions/loots";
import { calculateEnumPacketBits } from "../utils/suroiBitStream";
import { createPacket } from "./packet";

export type PickupPacketData = {
    readonly message?: InventoryMessages
    readonly item?: LootDefinition
};

const INVENTORY_MESSAGE_BITS = calculateEnumPacketBits(InventoryMessages);

export const PickupPacket = createPacket("PickupPacket")<PickupPacketData>({
    serialize(stream, data) {
        const { message, item } = data;

        stream.writeBoolean(item !== undefined);
        if (item !== undefined) {
            Loots.writeToStream(stream, item);
        } else if (message !== undefined) {
            stream.writeBits(message, INVENTORY_MESSAGE_BITS);
        }
    },

    deserialize(stream) {
        return stream.readBoolean()
            ? {
                item: Loots.readFromStream(stream)
            }
            : {
                message: stream.readBits(INVENTORY_MESSAGE_BITS)
            };
    }
});
