/* eslint-disable */
/*
    FIXME
    HACK
    TODO
    ANY-OTHER-TAG-YOU-CAN-THINK-OF

    fix the typings for this packet especially (and the rest of the packet api)
*/

import { KillfeedEventSeverity, KillfeedEventType, KillfeedMessageType } from "../constants";
import { type ExplosionDefinition, Explosions } from "../definitions/explosions";
import { type LootDefinition, Loots } from "../definitions/loots";
import { ObjectDefinitions } from "../utils/objectDefinitions";
import { type SuroiBitStream, calculateEnumPacketBits } from "../utils/suroiBitStream";
import { type Packet } from "./packet";

const KILLFEED_MESSAGE_TYPE_BITS = calculateEnumPacketBits(KillfeedMessageType);
const KILLFEED_EVENT_TYPE_BITS = calculateEnumPacketBits(KillfeedEventType);
const KILLFEED_EVENT_SEVERITY_BITS = calculateEnumPacketBits(KillfeedEventSeverity);

const damageSourcesDefinitions = ObjectDefinitions.create<LootDefinition | ExplosionDefinition>([...Loots, ...Explosions]);

interface KillFeedMessageOptions {
    messageType: KillfeedMessageType
    victimId?: number
    eventType?: KillfeedEventType
    severity?: KillfeedEventSeverity
    attackerId?: number
    attackerKills?: number
    killstreak?: number
    hideFromKillfeed?: boolean
    weaponUsed?: LootDefinition | ExplosionDefinition
}

export class KillFeedPacket implements Packet, KillFeedMessageOptions {
    messageType!: KillfeedMessageType;
    victimId?: number;
    eventType?: KillfeedEventType;
    severity?: KillfeedEventSeverity;
    attackerId?: number;
    attackerKills?: number;
    killstreak?: number;
    hideFromKillfeed?: boolean;
    weaponUsed?: LootDefinition | ExplosionDefinition;

    static create(options: KillFeedMessageOptions): KillFeedPacket {
        const packet = new KillFeedPacket();
        packet.messageType = options.messageType;
        packet.victimId = options.victimId;
        packet.eventType = options.eventType;
        packet.severity = options.severity;
        packet.attackerId = options.attackerId;
        packet.attackerKills = options.attackerKills;
        packet.killstreak = options.killstreak;
        packet.hideFromKillfeed = options.hideFromKillfeed;
        packet.weaponUsed = options.weaponUsed;
        return packet;
    }

    serialize(stream: SuroiBitStream): void {
        stream.writeBits(this.messageType, KILLFEED_MESSAGE_TYPE_BITS);

        switch (this.messageType) {
            case KillfeedMessageType.DeathOrDown: {
                stream.writeObjectID(this.victimId!);

                const type = this.eventType ?? KillfeedEventType.Suicide;
                stream.writeBits(type, KILLFEED_EVENT_TYPE_BITS);
                if (
                    [
                        KillfeedEventType.NormalTwoParty,
                        KillfeedEventType.FinishedOff,
                        KillfeedEventType.FinallyKilled,

                        KillfeedEventType.Gas,
                        KillfeedEventType.BleedOut,
                        KillfeedEventType.Airdrop
                        // ^^ for these three, attackerId corresponds to the player who downed
                    ].includes(type)
                ) {
                    const hasAttacker = this.attackerId !== undefined;
                    stream.writeBoolean(hasAttacker);
                    if (hasAttacker) {
                        stream.writeObjectID(this.attackerId!);
                        stream.writeUint8(this.attackerKills!);
                    }
                }
                stream.writeBits(this.severity ?? KillfeedEventSeverity.Kill, KILLFEED_EVENT_SEVERITY_BITS);

                const weaponWasUsed = this.weaponUsed !== undefined
                    && ![
                        KillfeedEventType.FinallyKilled,
                        KillfeedEventType.Gas,
                        KillfeedEventType.BleedOut,
                        KillfeedEventType.Airdrop
                    ].includes(type);

                stream.writeBoolean(weaponWasUsed);
                if (weaponWasUsed) {
                    damageSourcesDefinitions.writeToStream(stream, this.weaponUsed!);
                    if ("killstreak" in this.weaponUsed!) {
                        stream.writeUint8(this.killstreak!);
                    }
                }
                break;
            }

            case KillfeedMessageType.KillLeaderAssigned:
                stream.writeObjectID(this.victimId!);
                stream.writeUint8(this.attackerKills!);
                stream.writeBoolean(this.hideFromKillfeed ?? false);
                break;

            case KillfeedMessageType.KillLeaderUpdated:
                stream.writeUint8(this.attackerKills!);
                break;

            case KillfeedMessageType.KillLeaderDead:
                stream.writeObjectID(this.victimId!);
                stream.writeObjectID(this.attackerId!);
                break;
        }
    }

    deserialize(stream: SuroiBitStream): void {
        this.messageType = stream.readBits(KILLFEED_MESSAGE_TYPE_BITS);

        switch (this.messageType) {
            case KillfeedMessageType.DeathOrDown: {
                this.victimId = stream.readObjectID();

                const type = this.eventType = stream.readBits(KILLFEED_EVENT_TYPE_BITS);
                if (
                    [
                        KillfeedEventType.NormalTwoParty,
                        KillfeedEventType.FinishedOff,
                        KillfeedEventType.FinallyKilled,

                        KillfeedEventType.Gas,
                        KillfeedEventType.BleedOut,
                        KillfeedEventType.Airdrop
                        // ^^ attackerId is whoever downed
                    ].includes(type)
                    && stream.readBoolean() // attacker present
                ) {
                    this.attackerId = stream.readObjectID();
                    this.attackerKills = stream.readUint8();
                }
                this.severity = stream.readBits(KILLFEED_EVENT_SEVERITY_BITS);

                if (stream.readBoolean()) { // used a weapon
                    this.weaponUsed = damageSourcesDefinitions.readFromStream(stream);

                    if ("killstreak" in this.weaponUsed) {
                        this.killstreak = stream.readUint8();
                    }
                }
                break;
            }

            case KillfeedMessageType.KillLeaderAssigned:
                this.victimId = stream.readObjectID();
                this.attackerKills = stream.readUint8();
                this.hideFromKillfeed = stream.readBoolean();
                break;

            case KillfeedMessageType.KillLeaderUpdated:
                this.attackerKills = stream.readUint8();
                break;

            case KillfeedMessageType.KillLeaderDead:
                this.victimId = stream.readObjectID();
                this.attackerId = stream.readObjectID();
                break;
        }
    }
}
