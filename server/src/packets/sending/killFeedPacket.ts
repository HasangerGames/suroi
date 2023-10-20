import { KILL_FEED_MESSAGE_TYPE_BITS, KillFeedMessageType, ObjectCategory, PacketType } from "../../../../common/src/constants";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { GunItem } from "../../inventory/gunItem";
import { MeleeItem } from "../../inventory/meleeItem";
import { type Explosion } from "../../objects/explosion";
import { Player } from "../../objects/player";
import { SendingPacket } from "../../types/sendingPacket";

interface KillFeedPacketOptions {
    killedBy?: Player | "gas"
    weaponUsed?: GunItem | MeleeItem | Explosion
    kills: number
}

export class KillFeedPacket extends SendingPacket {
    override readonly allocBytes = 1 << 6;
    override readonly type = PacketType.KillFeed;
    readonly messageType: KillFeedMessageType;
    readonly options?: KillFeedPacketOptions;

    constructor(player: Player, messageType: KillFeedMessageType, options?: KillFeedPacketOptions) {
        super(player);
        this.messageType = messageType;
        this.options = options;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        stream.writeBits(this.messageType, KILL_FEED_MESSAGE_TYPE_BITS);
        switch (this.messageType) {
            case KillFeedMessageType.Kill: {
                const options = this.options;
                if (options === undefined) throw new Error("No options specified for kill packet");

                const killed = this.player;
                stream.writePlayerNameWithColor(killed);
                stream.writeObjectID(killed.id);

                const killedBy = options.killedBy;
                const twoPartyInteraction = killedBy instanceof Player;
                stream.writeBoolean(twoPartyInteraction);
                if (twoPartyInteraction) {
                    stream.writePlayerNameWithColor(killedBy);
                    stream.writeObjectID(killedBy.id);
                }

                const weaponUsed = options.weaponUsed;
                const weaponWasUsed = weaponUsed !== undefined;
                stream.writeBoolean(weaponWasUsed);
                if (weaponWasUsed) {
                    const canTrackStats = weaponUsed instanceof GunItem || weaponUsed instanceof MeleeItem;
                    const shouldTrackStats = canTrackStats && weaponUsed.definition.killstreak === true;

                    stream.writeObjectType(
                        ObjectType.fromString(
                            canTrackStats
                                ? ObjectCategory.Loot
                                : ObjectCategory.Explosion,
                            weaponUsed.definition.idString
                        )
                    );
                    stream.writeBoolean(shouldTrackStats);
                    if (shouldTrackStats) {
                        stream.writeBits(options.kills, 7);
                    }
                }

                stream.writeBoolean(killedBy === "gas");
                break;
            }

            case KillFeedMessageType.KillLeaderAssigned: {
                stream.writePlayerNameWithColor(this.player);
                stream.writeBits(this.player.kills, 7);
                break;
            }

            case KillFeedMessageType.KillLeaderUpdated: {
                stream.writeBits(this.player.kills, 7);
                break;
            }
        }
    }
}
