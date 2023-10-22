import { PacketType } from "../../../../../common/src/constants";
import { Emotes } from "../../../../../common/src/definitions/emotes";
import { Skins } from "../../../../../common/src/definitions/skins";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";
import { consoleVariables } from "../../utils/console/variables";

export class JoinPacket extends SendingPacket {
    override readonly allocBytes = 24;
    override readonly type = PacketType.Join;

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        stream.writePlayerName(consoleVariables.get.builtIn("cv_player_name").value);
        stream.writeBoolean(this.playerManager.isMobile);

        const skin = consoleVariables.get.builtIn("cv_loadout_skin").value;
        stream.writeUint8(Skins.findIndex(s => s.idString === skin));
        stream.writeUint8(Emotes.idStringToNumber[consoleVariables.get.builtIn("cv_loadout_top_emote").value]);
        stream.writeUint8(Emotes.idStringToNumber[consoleVariables.get.builtIn("cv_loadout_right_emote").value]);
        stream.writeUint8(Emotes.idStringToNumber[consoleVariables.get.builtIn("cv_loadout_bottom_emote").value]);
        stream.writeUint8(Emotes.idStringToNumber[consoleVariables.get.builtIn("cv_loadout_left_emote").value]);
    }
}
