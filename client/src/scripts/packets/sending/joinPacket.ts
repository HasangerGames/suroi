import { SendingPacket } from "../../types/sendingPacket";

import { ObjectCategory, PacketType } from "../../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type Config, localStorageInstance } from "../../utils/localStorageHandler";
import { ObjectType } from "../../../../../common/src/utils/objectType";

export class JoinPacket extends SendingPacket {
    override readonly allocBytes = 8;
    override readonly type = PacketType.Join;

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        stream.writeBoolean(this.playerManager.isMobile);
        const writeLoadoutItem = (propertyName: keyof Config["loadout"], category = ObjectCategory.Emote): void => {
            stream.writeObjectTypeNoCategory(ObjectType.fromString(category, localStorageInstance.config.loadout[propertyName]));
        };

        writeLoadoutItem("skin", ObjectCategory.Loot);
        writeLoadoutItem("topEmote");
        writeLoadoutItem("rightEmote");
        writeLoadoutItem("bottomEmote");
        writeLoadoutItem("leftEmote");
    }
}
