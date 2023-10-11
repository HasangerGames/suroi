import { ObjectCategory } from "../../../../common/src/constants";
import { type SkinDefinition } from "../../../../common/src/definitions/skins";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { Config } from "../../config";
import { hasBadWords } from "../../utils/badWordFilter";
import sanitizeHtml from "sanitize-html";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";

export class JoinPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;

        let name = stream.readPlayerName().trim();
        if (name.length === 0 || (Config.censorUsernames && hasBadWords(name))) {
            name = "Player";
        } else {
            name = sanitizeHtml(name, {
                allowedTags: [],
                allowedAttributes: {}
            });
        }
        player.name = name;

        player.isMobile = stream.readBoolean();
        const skin = stream.readObjectTypeNoCategory<ObjectCategory.Loot, SkinDefinition>(ObjectCategory.Loot);

        const definition = skin.definition;

        if (
            definition.itemType === ItemType.Skin &&
            !definition.notInLoadout &&
            (definition.roleRequired === undefined || definition.roleRequired === player.role)
        ) {
            player.loadout.skin = skin;
        }
        for (let i = 0; i < 4; i++) {
            player.loadout.emotes[i] = stream.readObjectTypeNoCategory(ObjectCategory.Emote);
        }
        player.game.activatePlayer(player);
    }
}
