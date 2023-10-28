import { PacketType } from "../../../../common/src/constants";
import { Loots, type LootDefinition } from "../../../../common/src/definitions/loots";
import { type ReferenceTo } from "../../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";
import { SendingPacket } from "../../types/sendingPacket";

export class PickupPacket extends SendingPacket {
    override readonly allocBytes = 3;
    override readonly type = PacketType.Pickup;
    readonly itemType: ReferenceTo<LootDefinition>;

    constructor(player: Player, itemType: ReferenceTo<LootDefinition>) {
        super(player);
        this.itemType = itemType;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        Loots.writeToStream(stream, this.itemType);
    }
}
