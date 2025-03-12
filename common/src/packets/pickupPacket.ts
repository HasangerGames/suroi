import { InventoryMessages } from "../constants";
import { Loots, type LootDefinition } from "../definitions/loots";
import { DataSplitTypes, Packet, PacketType } from "./packet";

export interface PickupData {
    readonly type: PacketType.Pickup
    readonly message?: InventoryMessages
    readonly item?: LootDefinition
};

export const PickupPacket = new Packet<PickupData>(PacketType.Pickup, {
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

    deserialize(stream, data, saveIndex, recordTo) {
        saveIndex();

        const pickupData = stream.readUint8();

        const hasItem = (pickupData & 128) !== 0;
        const hasMessage = (pickupData & 64) !== 0;

        if (hasItem) {
            data.item = Loots.readFromStream(stream);
        } else if (hasMessage) {
            data.message = (pickupData & 0b111) as InventoryMessages;
        }

        recordTo(DataSplitTypes.GameObjects);
    }
});
