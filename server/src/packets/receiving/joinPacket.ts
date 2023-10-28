import { Emotes } from "../../../../common/src/definitions/emotes";
import { Skins } from "../../../../common/src/definitions/skins";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { Config } from "../../config";
import { ReceivingPacket } from "../../types/receivingPacket";
import { hasBadWords } from "../../utils/badWordFilter";
import { DEFAULT_USERNAME } from "../../../../common/src/constants";

export class JoinPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;

        let name = stream.readPlayerName().replaceAll(/<[^>]+>/g, "").trim(); // Regex strips out HTML
        if (name.length === 0 || (Config.censorUsernames && hasBadWords(name))) name = DEFAULT_USERNAME;
        player.name = name;

        player.isMobile = stream.readBoolean();
        const skin = Skins[stream.readUint8()];

        if (
            skin.itemType === ItemType.Skin &&
            !skin.notInLoadout &&
            (skin.roleRequired === undefined || skin.roleRequired === player.role)
        ) {
            player.loadout.skin = skin;
        }
        for (let i = 0; i < 4; i++) {
            player.loadout.emotes[i] = Emotes.definitions[stream.readUint8()];
        }
        player.game.activatePlayer(player);
    }
}
