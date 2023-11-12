import { Packet } from "./packet";
import { KILL_FEED_MESSAGE_TYPE_BITS, type SuroiBitStream } from "../utils/suroiBitStream";
import { KillFeedMessageType, PacketType } from "../constants";
import { LootDefinition, Loots } from "../definitions/loots";
import { ExplosionDefinition, Explosions } from "../definitions/explosions";

export class KillFeedPacket extends Packet {
    readonly allocBytes = 1 << 6;
    readonly type = PacketType.KillFeed;

    messageType!: KillFeedMessageType;
    id!: number;
    killedByID?: number;
    kills?: number;
    weaponUsed: LootDefinition | ExplosionDefinition | undefined;
    killstreak?: number;
    gasKill = false;

    // TODO
    //weaponUsed?: GunDefinition | MeleeDefinition;

    serialize(): void {
        super.serialize();
        const stream = this.stream;
        stream.writeBits(this.messageType, KILL_FEED_MESSAGE_TYPE_BITS);
        switch (this.messageType) {
            case KillFeedMessageType.Kill: {
                stream.writeObjectID(this.id);

                const twoPartyInteraction = this.killedByID !== undefined;
                stream.writeBoolean(twoPartyInteraction);
                if (twoPartyInteraction) {
                    stream.writeObjectID(this.killedByID as number);
                    stream.writeBits(this.kills as number, 7);
                }

                const weaponWasUsed = this.weaponUsed !== undefined;
                stream.writeBoolean(weaponWasUsed);
                if (weaponWasUsed) { /* eslint-disable @typescript-eslint/no-non-null-assertion */
                    const canTrackStats = "shrapnelCount" in this.weaponUsed!; //fixme hack to check if weapon used is an explosion
                    const shouldTrackStats = canTrackStats && "killstreak" in this.weaponUsed! && this.weaponUsed.killstreak === true;

                    stream.writeBoolean(canTrackStats);

                    if (canTrackStats) {
                        Loots.writeToStream(stream, this.weaponUsed as LootDefinition);
                    } else {
                        Explosions.writeToStream(stream, this.weaponUsed as ExplosionDefinition);
                    }

                    stream.writeBoolean(shouldTrackStats);
                    if (shouldTrackStats) {
                        stream.writeBits(this.killstreak!, 7);
                    }
                }

                stream.writeBoolean(this.gasKill);
                break;
            }

            case KillFeedMessageType.KillLeaderAssigned: {
                stream.writeObjectID(this.id);
                stream.writeBits(this.kills as number, 7);
                break;
            }

            case KillFeedMessageType.KillLeaderUpdated: {
                stream.writeBits(this.kills as number, 7);
                break;
            }
        }
    }

    deserialize(stream: SuroiBitStream): void {
        switch (stream.readBits(KILL_FEED_MESSAGE_TYPE_BITS)) {
            case KillFeedMessageType.Kill: {
                this.id = stream.readObjectID();

                const twoPartyInteraction = stream.readBoolean();
                if (twoPartyInteraction) {
                    this.killedByID = stream.readObjectID();
                    this.kills = stream.readBits(7);
                }

                if (stream.readBoolean()) { // used a weapon
                    if (stream.readBoolean()) {
                        this.weaponUsed = Loots.readFromStream(stream);
                    } else {
                        this.weaponUsed = Explosions.readFromStream(stream);
                    }

                    if (stream.readBoolean()) { // weapon tracks killstreaks
                        this.killstreak = stream.readBits(7);
                    }
                }

                this.gasKill = stream.readBoolean();
                break;
            }

            case KillFeedMessageType.KillLeaderAssigned: {
                this.id = stream.readObjectID();
                this.kills = stream.readBits(7);
                break;
            }

            case KillFeedMessageType.KillLeaderUpdated: {
                this.kills = stream.readBits(7);
                break;
            }
        }
    }
}
