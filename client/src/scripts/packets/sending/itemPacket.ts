import { SendingPacket } from "../../types/sendingPacket";

import {
    type ObjectCategory,
    PacketType
} from "../../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type PlayerManager } from "../../utils/playerManager";
import { type ObjectType } from "../../../../../common/src/utils/objectType";

export class ItemPacket extends SendingPacket {
    override readonly allocBytes = 16;
    override readonly type = PacketType.Item;

    item: ObjectType<ObjectCategory.Loot>;

    constructor(playerManager: PlayerManager, item: ObjectType<ObjectCategory.Loot>) {
        super(playerManager);
        this.item = item;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        stream.writeObjectTypeNoCategory(this.item);
    }
}
