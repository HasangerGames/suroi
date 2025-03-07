import { type ExplosionDefinition } from "../definitions/explosions";
import { type GunDefinition } from "../definitions/items/guns";
import { type MeleeDefinition } from "../definitions/items/melees";
import { type ThrowableDefinition } from "../definitions/items/throwables";
import { Weapons } from "../definitions/weapons";
import { DataSplitTypes, Packet, PacketType } from "./packet";

export enum KillEventType {
    Suicide,
    NormalTwoParty,
    FinishedOff,
    FinallyKilled,
    Gas,
    BleedOut,
    Airdrop
}

export const enum KillEventSeverity {
    Kill,
    Down
}

export type KillDamageSources = GunDefinition
    | MeleeDefinition
    | ThrowableDefinition
    | ExplosionDefinition;

/**
 * {@link KillEventType}s that allow an attacker to be specified
 */
type IncludeAttacker =
    | KillEventType.NormalTwoParty
    | KillEventType.FinishedOff
    | KillEventType.FinallyKilled
    | KillEventType.Gas
    | KillEventType.BleedOut
    | KillEventType.Airdrop;

/**
 * {@link KillEventType}s that don't allow a weapon to be specified
 */
type ExcludeWeapon =
    | KillEventType.FinallyKilled
    | KillEventType.Gas
    | KillEventType.BleedOut
    | KillEventType.Airdrop;

export type KillData = { readonly type: PacketType.Kill } & (({
    readonly victimId: number
    readonly severity: KillEventSeverity
} & (({
    readonly eventType: IncludeAttacker
} & ({
    readonly attackerId?: undefined
} | {
    readonly attackerId: number
    readonly attackerKills: number
})) | {
    readonly eventType: Exclude<KillEventType, IncludeAttacker>
}) & ((
    {
        readonly eventType: ExcludeWeapon
        readonly weaponUsed?: never
    }
) | (
    {
        readonly eventType: Exclude<KillEventType, ExcludeWeapon>
    } & ({
        readonly weaponUsed?: undefined
    } | {
        readonly weaponUsed: KillDamageSources
        readonly killstreak?: number
    })
))));

export const KillPacket = new Packet<KillData>(PacketType.Kill, {
    serialize(stream, data) {
        // messageType is 2 bits. we put them as the LSB, and everything else takes
        // up the 6 other bits
        let kfData = data.messageType;

        // save the index of this state so we can come back and write the kfData later
        // this leads to simpler code structure
        const kfDataIndex = stream.index;
        stream.writeUint8(0);

        /*
            for this message type, kfData has the following format:
            w s a e e e m m
            | | | |___| |_|
            | | |   |    |
            | | |   |    messageType
            | | |   |
            | | | eventType
            | | |
            | | hasAttacker
            | |
            | severity
            |
            weaponUsed
        */
        stream.writeObjectId(data.victimId);

        // eventType is 3 bits, make it take up the next 3 LSB
        kfData += data.eventType << 2;
        if (hasAttackerData(data)) {
            const hasAttacker = data.attackerId !== undefined;
            // next LSB is the 6th one (000e eemm, with 'e' for event type and 'm' for message type)
            kfData += hasAttacker ? 32 : 0;
            if (hasAttacker) {
                stream.writeObjectId(data.attackerId);
                stream.writeUint8(data.attackerKills);
            }
        }
        // the 6th LSB is off-limits (used by thing above)
        // use the 7th LSB for this (severity is effectively a boolean)
        kfData += data.severity ? 64 : 0;

        const weaponWasUsed = !noWeaponData(data) && data.weaponUsed !== undefined;

        // and our last bit is for this
        kfData += weaponWasUsed ? 128 : 0;
        if (weaponWasUsed) {
            Weapons.writeToStream(stream, data.weaponUsed);
            if ("killstreak" in data.weaponUsed && data.weaponUsed.killstreak) {
                if (data.killstreak === undefined) {
                    console.error(`Killfeed packet with weapon '${data.weaponUsed.idString}' is missing a killstreak amount, but weapon schema in question mandates it`);
                    stream.writeUint8(0);
                } else {
                    stream.writeUint8(data.killstreak);
                }
            }
        }

        // now we go back to our saved index
        const curIndex = stream.index;
        stream.index = kfDataIndex;

        // write our stuff
        stream.writeUint8(kfData);

        // and skip back forwards to where we were
        stream.index = curIndex;
    },

    deserialize(stream, data, saveIndex, recordTo) {
        saveIndex();
        const kfData = stream.readUint8();

        // see the comments in the serialization method to
        // understand the format and what's going on
        data.victimId = stream.readObjectId();
        data.eventType = (kfData & 0b11100) >> 2;

        if (
            hasAttackerData(data)
            && ((kfData & 32) !== 0) // attacker present
        ) {
            data.attackerId = stream.readObjectId();
            (data as KillData & { attackerKills: number }).attackerKills = stream.readUint8();
        }
        data.severity = (kfData >> 6) & 1;

        if ((kfData & 128) !== 0) { // used a weapon
            type WithWeapon = KillData & {
                weaponUsed: KillDamageSources
                killstreak?: number
            };

            const weaponUsed = (data as WithWeapon).weaponUsed = Weapons.readFromStream(stream);

            if ("killstreak" in weaponUsed && weaponUsed.killstreak) {
                (data as WithWeapon).killstreak = stream.readUint8();
            }
        }

        recordTo(DataSplitTypes.Killfeed);
        return data as KillData;
    }
});
