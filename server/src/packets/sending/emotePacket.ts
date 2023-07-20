import { SendingPacket } from "../../types/sendingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectCategory, PacketType } from "../../../../common/src/constants";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type Player } from "../../objects/player";
import { type EmoteDefinition } from "../../../../common/src/definitions/emotes";

export class EmotePacket extends SendingPacket {
    override readonly allocBytes = 3;
    override readonly type = PacketType.Emote;
    readonly emoteType: ObjectType<ObjectCategory.Emote, EmoteDefinition>;
    readonly playerID: number;

    constructor(player: Player, itemType: ObjectType<ObjectCategory.Emote, EmoteDefinition>, playerID: number) {
        super(player);
        this.emoteType = itemType;
        this.playerID = playerID;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        stream.writeObjectTypeNoCategory(this.emoteType);
        stream.writeObjectID(this.playerID);
    }
}
