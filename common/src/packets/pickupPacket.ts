import { Packet } from "./packet.js";
import { type SuroiBitStream } from "../utils/suroiBitStream.js";
import { PacketType } from "../constants.js";
import { type LootDefinition, Loots } from "../definitions/loots.js";

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
