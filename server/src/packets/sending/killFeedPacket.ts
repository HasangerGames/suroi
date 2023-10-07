import { KILL_FEED_MESSAGE_TYPE_BITS, KillFeedMessageType, PacketType } from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { GunItem } from "../../inventory/gunItem";
import { MeleeItem } from "../../inventory/meleeItem";
import { Player } from "../../objects/player";
import { type JoinKillFeedMessage, type KillFeedMessage, type KillKillFeedMessage } from "../../types/killFeedMessage";
import { SendingPacket } from "../../types/sendingPacket";

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
                const twoPartyInteraction = killedBy instanceof Player;

                stream.writeBoolean(twoPartyInteraction);
                stream.writePlayerNameWithColor(killed);
                stream.writeObjectID(killed.id);
                if (twoPartyInteraction) {
                    stream.writePlayerNameWithColor(killedBy);
                    stream.writeObjectID(killedBy.id);
                }

                const weaponUsed = killMessage.weaponUsed;
                const weaponWasUsed = weaponUsed !== undefined;
                stream.writeBoolean(weaponWasUsed);
                if (weaponWasUsed) {
                    const canTrackStats = weaponUsed instanceof GunItem || weaponUsed instanceof MeleeItem;
                    const shouldTrackStats = canTrackStats && weaponUsed.definition.killstreak === true;

                    stream.writeObjectType(canTrackStats ? weaponUsed.type : weaponUsed);
                    stream.writeBoolean(shouldTrackStats);
                    if (shouldTrackStats) {
                        stream.writeUint8(killMessage.kills);
                    }
                }

                stream.writeBoolean(killedBy === "gas");

                break;
            }
            case KillFeedMessageType.Join: {
                const joinMessage = this.message as JoinKillFeedMessage;
                stream.writePlayerNameWithColor(joinMessage.player);
                stream.writeBoolean(joinMessage.joined);
                break;
            }
        }
    }
}
