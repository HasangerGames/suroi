import { Emotes } from "../../../../common/src/definitions/emotes";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { Config } from "../../config";
import { ReceivingPacket } from "../../types/receivingPacket";
import { hasBadWords } from "../../utils/badWordFilter";
import { DEFAULT_USERNAME } from "../../../../common/src/constants";
import { Loots } from "../../../../common/src/definitions/loots";

export class JoinPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;

        let name = stream.readPlayerName().replaceAll(/<[^>]+>/g, "").trim(); // Regex strips out HTML
        if (name.length === 0 || (Config.censorUsernames && hasBadWords(name))) name = DEFAULT_USERNAME;
        player.name = name;

        player.isMobile = stream.readBoolean();
        const skin = Loots.readFromStream(stream);

        if (
            skin.itemType === ItemType.Skin &&
            !skin.notInLoadout &&
            (skin.roleRequired === undefined || skin.roleRequired === player.role)
        ) {
            player.loadout.skin = skin;
        }
        for (let i = 0; i < 4; i++) {
            player.loadout.emotes[i] = Emotes.readFromStream(stream);
        }
        player.game.activatePlayer(player);
    }
}
