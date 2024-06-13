import { Loots, type LootDefinition } from "../definitions/loots";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Packet } from "./packet";

export class PickupPacket implements Packet {
    item!: LootDefinition;

    serialize(stream: SuroiBitStream): void {
        Loots.writeToStream(stream, this.item);
    }

    deserialize(stream: SuroiBitStream): void {
        this.item = Loots.readFromStream(stream);
    }
}
