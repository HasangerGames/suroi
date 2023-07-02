import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { KILL_FEED_MESSAGE_TYPE_BITS, KillFeedMessageType, PacketType } from "../../../../common/src/constants";
import { type JoinKillFeedMessage, type KillFeedMessage, type KillKillFeedMessage } from "../../types/killFeedMessage";

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

        switch (this.message.type) {
            case KillFeedMessageType.Kill: {
                const killMessage = this.message as KillKillFeedMessage;
                const killed = killMessage.killed;
                const killedBy = killMessage.killedBy;
                const suicide = killed === killedBy;

                stream.writeBoolean(suicide); // suicide
                stream.writePlayerNameWithColor(killed.name, killed.isDev, killed.nameColor);
                stream.writeObjectID(killed.id);
                if (!suicide) {
                    stream.writePlayerNameWithColor(killedBy.name, killedBy.isDev, killedBy.nameColor);
                    stream.writeObjectID(killedBy.id);
                }

                const usedWeapon = killMessage.weaponUsed !== undefined;
                stream.writeBoolean(usedWeapon);
                if (killMessage.weaponUsed !== undefined) stream.writeObjectType(killMessage.weaponUsed);
                break;
            }
            case KillFeedMessageType.Join: {
                const joinMessage = this.message as JoinKillFeedMessage;
                stream.writePlayerNameWithColor(
                    joinMessage.player.name,
                    joinMessage.player.isDev,
                    joinMessage.player.nameColor
                );
                stream.writeBoolean(joinMessage.joined);
                break;
            }
        }
    }
}
