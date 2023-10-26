import { PacketType } from "../../../../../common/src/constants";
import { Emotes } from "../../../../../common/src/definitions/emotes";
import { Skins } from "../../../../../common/src/definitions/skins";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";

export class JoinPacket extends SendingPacket {
    override readonly allocBytes = 24;
    override readonly type = PacketType.Join;

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        const con = this.game.console;

        stream.writePlayerName(con.getConfig("cv_player_name"));
        stream.writeBoolean(this.game.inputManager.isMobile);

        const skin = con.getConfig("cv_loadout_skin");
        // TODO: remove hardcoded uint8's
        stream.writeUint8(Skins.findIndex(s => s.idString === skin));
        stream.writeUint8(Emotes.idStringToNumber[con.getConfig("cv_loadout_top_emote")]);
        stream.writeUint8(Emotes.idStringToNumber[con.getConfig("cv_loadout_right_emote")]);
        stream.writeUint8(Emotes.idStringToNumber[con.getConfig("cv_loadout_bottom_emote")]);
        stream.writeUint8(Emotes.idStringToNumber[con.getConfig("cv_loadout_left_emote")]);
    }
}
