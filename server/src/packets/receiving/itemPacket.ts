import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ObjectCategory } from "../../../../common/src/constants";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type LootDefinition } from "../../../../common/src/definitions/loots";

export class ItemPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;
        if (player.dead) return; // Ignore packets from dead players

        const item = stream.readObjectTypeNoCategory(ObjectCategory.Loot) as ObjectType<ObjectCategory.Loot, LootDefinition>;
        player.inventory.useItem(item.idString);
    }
}
