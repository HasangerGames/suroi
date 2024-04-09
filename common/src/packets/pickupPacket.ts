import { Loots, type LootDefinition } from "../definitions/loots";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

export class PickupPacket extends Packet {
    item!: LootDefinition;

    override serialize(stream: SuroiBitStream): void {
        Loots.writeToStream(stream, this.item);
    }

    override deserialize(stream: SuroiBitStream): void {
        this.item = Loots.readFromStream(stream);
    }
}
