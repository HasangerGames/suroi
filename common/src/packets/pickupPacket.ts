import { InventoryMessages } from "../constants";
import { Loots, type LootDefinition } from "../definitions/loots";
import type { SDeepMutable } from "../utils/misc";
import { createPacket } from "./packet";

export type PickupPacketData = {
    readonly message?: InventoryMessages
    readonly item?: LootDefinition
};

export const PickupPacket = createPacket("PickupPacket")<PickupPacketData>({
    serialize(stream, data) {
        const { message, item } = data;

        const hasItem = item !== undefined;
        const hasMessage = message !== undefined;
        // inventory message is 3 bits, so let's use an 8 bit number
        // we'll set its 1st MSB to hasItem, 2nd MSB to hasMessage,
        // and 3 LSB's as the inventory message
        let pickupData = (hasItem ? 128 : 0) + (hasMessage ? 64 : 0);
        if (!hasItem && hasMessage) {
            pickupData += message;
        }

        stream.writeUint8(pickupData);

        if (hasItem) {
            Loots.writeToStream(stream, item);
        }
    },

    deserialize(stream) {
        const pickupData = stream.readUint8();

        const hasItem = (pickupData & 128) !== 0;
        const hasMessage = (pickupData & 64) !== 0;

        const obj: SDeepMutable<PickupPacketData> = {};

        if (hasItem) {
            obj.item = Loots.readFromStream(stream);
        } else if (hasMessage) {
            obj.message = (pickupData & 0b111) as InventoryMessages;
        }

        return obj;
    }
});
