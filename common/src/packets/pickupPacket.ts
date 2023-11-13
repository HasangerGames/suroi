import { Packet } from "./packet";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { PacketType } from "../constants";
import { type LootDefinition, Loots } from "../definitions/loots";

export class PickupPacket extends Packet {
    override readonly allocBytes = 2;
    override readonly type = PacketType.Pickup;

    item!: LootDefinition;

    override serialize(): void {
        super.serialize();
        Loots.writeToStream(this.stream, this.item);
    }

    override deserialize(stream: SuroiBitStream): void {
        this.item = Loots.readFromStream(stream);
    }
}
