import { PacketType } from "../constants";
import { Loots, type LootDefinition } from "../definitions/loots";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { AbstractPacket } from "./packet";

export class PickupPacket extends AbstractPacket {
    override readonly allocBytes = 2;
    override readonly type = PacketType.Pickup;

    item!: LootDefinition;

    override serialize(stream: SuroiBitStream): void {
        Loots.writeToStream(stream, this.item);
    }

    override deserialize(stream: SuroiBitStream): void {
        this.item = Loots.readFromStream(stream);
    }
}
