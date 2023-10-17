import { ObjectCategory, PacketType } from "../../../../../common/src/constants";
import { ObjectType } from "../../../../../common/src/utils/objectType";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";
import { consoleVariables, type CVarTypeMapping } from "../../utils/console/variables";

export class JoinPacket extends SendingPacket {
    override readonly allocBytes = 24;
    override readonly type = PacketType.Join;

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        stream.writePlayerName(consoleVariables.get.builtIn("cv_player_name").value);

        stream.writeBoolean(this.playerManager.isMobile);

        const writeLoadoutItem = (
            propertyName: keyof CVarTypeMapping,
            category = ObjectCategory.Emote
        ): void => {
            stream.writeObjectTypeNoCategory(ObjectType.fromString(category, consoleVariables.get.builtIn(propertyName).value as string));
        };
        writeLoadoutItem("cv_loadout_skin", ObjectCategory.Loot);
        writeLoadoutItem("cv_loadout_top_emote");
        writeLoadoutItem("cv_loadout_right_emote");
        writeLoadoutItem("cv_loadout_bottom_emote");
        writeLoadoutItem("cv_loadout_left_emote");
    }
}
