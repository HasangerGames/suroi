import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ObjectCategory } from "../../../../common/src/constants";
import { type SkinDefinition } from "../../../../common/src/definitions/skins";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";

export class JoinPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        this.player.isMobile = stream.readBoolean();
        const skin = stream.readObjectTypeNoCategory<ObjectCategory.Loot, SkinDefinition>(ObjectCategory.Loot);

        const definition = skin.definition;

        if (definition.itemType === ItemType.Skin &&
            !definition.notInLoadout &&
            (definition.roleRequired === undefined ||
                definition.roleRequired === this.player.role)) {
            this.player.loadout.skin = skin;
        }
        for (let i = 0; i < 4; i++) {
            this.player.loadout.emotes[i] = stream.readObjectTypeNoCategory(ObjectCategory.Emote);
        }
        this.player.game.activatePlayer(this.player);
    }
}
