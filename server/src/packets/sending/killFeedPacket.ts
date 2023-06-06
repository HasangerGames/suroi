import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import {
    KILL_FEED_MESSAGE_TYPE_BITS, KillFeedMessageType, PacketType
} from "../../../../common/src/constants";
import {
    type JoinKillFeedMessage, type KillFeedMessage, type KillKillFeedMessage
} from "../../types/killFeedMessage";

export class KillFeedPacket extends SendingPacket {
    override readonly allocBytes = 1 << 6;
    override readonly type = PacketType.KillFeed;
    readonly message: KillFeedMessage;

    constructor(player: Player, message: KillFeedMessage) {
        super(player);
        this.message = message;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        stream.writeBits(this.message.type, KILL_FEED_MESSAGE_TYPE_BITS);
        if (this.message.type === KillFeedMessageType.Join) {
            const joinMessage = this.message as JoinKillFeedMessage;
            stream.writePlayerName(joinMessage.name);
            stream.writeBoolean(joinMessage.joined);
        } else if (this.message.type === KillFeedMessageType.Kill) {
            const killMessage = this.message as KillKillFeedMessage;
            stream.writePlayerName(killMessage.killedName);
            stream.writePlayerName(killMessage.killedByName);

            const usedWeapon: boolean = killMessage.weaponUsed !== undefined;
            stream.writeBoolean(usedWeapon);
            if (killMessage.weaponUsed !== undefined) stream.writeObjectType(killMessage.weaponUsed);
        }
    }
}
