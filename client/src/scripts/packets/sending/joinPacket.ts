import { PacketType } from "../../../../../common/src/constants";
import { Emotes } from "../../../../../common/src/definitions/emotes";
import { Loots } from "../../../../../common/src/definitions/loots";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";

export class JoinPacket extends SendingPacket {
    override readonly allocBytes = 24;
    override readonly type = PacketType.Join;

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        const con = this.game.console;

        stream.writePlayerName(con.getBuiltInCVar("cv_player_name"));
        stream.writeBoolean(this.game.inputManager.isMobile);

        Loots.writeToStream(stream, con.getBuiltInCVar("cv_loadout_skin"));
        Emotes.writeToStream(stream, con.getBuiltInCVar("cv_loadout_top_emote"));
        Emotes.writeToStream(stream, con.getBuiltInCVar("cv_loadout_right_emote"));
        Emotes.writeToStream(stream, con.getBuiltInCVar("cv_loadout_bottom_emote"));
        Emotes.writeToStream(stream, con.getBuiltInCVar("cv_loadout_left_emote"));
    }
}
