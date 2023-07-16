import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ObjectCategory } from "../../../../common/src/constants";
import { type LootDefinition } from "../../../../common/src/definitions/loots";

export class ItemPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;
        if (player.dead) return; // Ignore packets from dead players

        player.inventory.useItem(stream.readObjectTypeNoCategory<ObjectCategory.Loot, LootDefinition>(ObjectCategory.Loot).idString);
    }
}
