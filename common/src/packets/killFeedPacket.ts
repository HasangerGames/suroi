import { Packet } from "./packet";
import { KILL_FEED_MESSAGE_TYPE_BITS, type SuroiBitStream } from "../utils/suroiBitStream";
import { KillFeedMessageType, PacketType } from "../constants";
import { type LootDefinition, Loots } from "../definitions/loots";
import { type ExplosionDefinition, Explosions } from "../definitions/explosions";

export class KillFeedPacket extends Packet {
    readonly allocBytes = 1 << 6;
    readonly type = PacketType.KillFeed;

    messageType!: KillFeedMessageType;
    playerID!: number;

    twoPartyInteraction?: boolean;
    killerID?: number;
    kills?: number;
    weaponUsed?: LootDefinition | ExplosionDefinition;
    killstreak?: number;

    gasKill = false;

    serialize(): void {
        super.serialize();
        const stream = this.stream;
        stream.writeBits(this.messageType, KILL_FEED_MESSAGE_TYPE_BITS);
        switch (this.messageType) {
            case KillFeedMessageType.Kill: {
                stream.writeObjectID(this.playerID);

                this.twoPartyInteraction = this.killerID !== undefined;
                stream.writeBoolean(this.twoPartyInteraction);
                if (this.twoPartyInteraction) {
                    stream.writeObjectID(this.killerID as number);
                    stream.writeBits(this.kills as number, 7);
                }

                /* eslint-disable @typescript-eslint/no-non-null-assertion */
                const weaponWasUsed = this.weaponUsed !== undefined;
                stream.writeBoolean(weaponWasUsed);
                if (weaponWasUsed) {
                    const isExplosion = "shrapnelCount" in this.weaponUsed!; //fixme hack to check if weapon used is an explosion
                    stream.writeBoolean(isExplosion);
                    if (isExplosion) {
                        Explosions.writeToStream(stream, this.weaponUsed as ExplosionDefinition);
                    } else {
                        Loots.writeToStream(stream, this.weaponUsed as LootDefinition);
                    }

                    const trackKillstreak = !isExplosion && "killstreak" in this.weaponUsed! && this.weaponUsed.killstreak === true;
                    stream.writeBoolean(trackKillstreak);
                    if (trackKillstreak) {
                        stream.writeBits(this.killstreak!, 7);
                    }
                }

                stream.writeBoolean(this.gasKill);
                break;
            }

            case KillFeedMessageType.KillLeaderAssigned: {
                stream.writeObjectID(this.playerID);
                stream.writeBits(this.kills as number, 7);
                break;
            }

            case KillFeedMessageType.KillLeaderUpdated: {
                stream.writeBits(this.kills as number, 7);
                break;
            }

            case KillFeedMessageType.KillLeaderDead: {
                stream.writeObjectID(this.killerID!);
                break;
            }
        }
    }

    deserialize(stream: SuroiBitStream): void {
        this.messageType = stream.readBits(KILL_FEED_MESSAGE_TYPE_BITS);
        switch (this.messageType) {
            case KillFeedMessageType.Kill: {
                this.playerID = stream.readObjectID();

                this.twoPartyInteraction = stream.readBoolean();
                if (this.twoPartyInteraction) {
                    this.killerID = stream.readObjectID();
                    this.kills = stream.readBits(7);
                }

                if (stream.readBoolean()) { // used a weapon
                    this.weaponUsed = stream.readBoolean() // is explosion
                        ? Explosions.readFromStream(stream)
                        : Loots.readFromStream(stream);

                    if (stream.readBoolean()) { // track killstreak
                        this.killstreak = stream.readBits(7);
                    }
                }

                this.gasKill = stream.readBoolean();
                break;
            }

            case KillFeedMessageType.KillLeaderAssigned: {
                this.playerID = stream.readObjectID();
                this.kills = stream.readBits(7);
                break;
            }

            case KillFeedMessageType.KillLeaderUpdated: {
                this.kills = stream.readBits(7);
                break;
            }

            case KillFeedMessageType.KillLeaderDead: {
                this.killerID = stream.readObjectID();
                break;
            }
        }
    }
}
