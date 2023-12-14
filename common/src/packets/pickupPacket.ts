import { PacketType } from "../constants";
import { Loots, type LootDefinition } from "../definitions/loots";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { Packet } from "./packet";

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
