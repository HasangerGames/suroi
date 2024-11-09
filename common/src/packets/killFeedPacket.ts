import { KillfeedEventSeverity, KillfeedEventType, KillfeedMessageType } from "../constants";
import { type ExplosionDefinition } from "../definitions/explosions";
import { type GunDefinition } from "../definitions/guns";
import { type MeleeDefinition } from "../definitions/melees";
import { type ThrowableDefinition } from "../definitions/throwables";
import { type DeepMutable, type Mutable } from "../utils/misc";
import { ObjectDefinitions } from "../utils/objectDefinitions";
import { calculateEnumPacketBits } from "../utils/suroiBitStream";
import { createPacket } from "./packet";

const KILLFEED_MESSAGE_TYPE_BITS = calculateEnumPacketBits(KillfeedMessageType);
const KILLFEED_EVENT_TYPE_BITS = calculateEnumPacketBits(KillfeedEventType);
const KILLFEED_EVENT_SEVERITY_BITS = calculateEnumPacketBits(KillfeedEventSeverity);

export type KillDamageSources = GunDefinition
    | MeleeDefinition
    | ThrowableDefinition
    | ExplosionDefinition;

const damageSourcesDefinitions = ObjectDefinitions.create<KillDamageSources>([...Guns, ...Melees, ...Throwables, ...Explosions]);

/**
 * {@link KillfeedEventType}s that allow an attacker to be specified
 */
type IncludeAttacker =
    | KillfeedEventType.NormalTwoParty
    | KillfeedEventType.FinishedOff
    | KillfeedEventType.FinallyKilled
    | KillfeedEventType.Gas
    | KillfeedEventType.BleedOut
    | KillfeedEventType.Airdrop;

/**
 * {@link KillfeedEventType}s that don't allow a weapon to be specified
 */
type ExcludeWeapon =
    | KillfeedEventType.FinallyKilled
    | KillfeedEventType.Gas
    | KillfeedEventType.BleedOut
    | KillfeedEventType.Airdrop;

export type KillFeedPacketData = ({
    readonly messageType: KillfeedMessageType.DeathOrDown
    readonly victimId: number
    readonly severity: KillfeedEventSeverity
} & (({
    readonly eventType: IncludeAttacker
} & ({
    readonly attackerId?: undefined
} | {
    readonly attackerId: number
    readonly attackerKills: number
})) | {
    readonly eventType: Exclude<KillfeedEventType, IncludeAttacker>
}) & ((
    {
        readonly eventType: ExcludeWeapon
        readonly weaponUsed?: never
    }
) | (
    {
        readonly eventType: Exclude<KillfeedEventType, ExcludeWeapon>
    } & ({
        readonly weaponUsed?: undefined
    } | {
        readonly weaponUsed: KillDamageSources
        readonly killstreak?: number
    })
))) | {
    readonly messageType: KillfeedMessageType.KillLeaderAssigned
    readonly victimId: number
    readonly attackerKills: number
    readonly hideFromKillfeed?: boolean
} | {
    readonly messageType: KillfeedMessageType.KillLeaderUpdated
    readonly attackerKills: number
} | {
    readonly messageType: KillfeedMessageType.KillLeaderDeadOrDisconnected
    readonly victimId: number
    readonly attackerId: number
    readonly disconnected?: boolean
};

const attackerFilter: readonly IncludeAttacker[] = [
    KillfeedEventType.NormalTwoParty,
    KillfeedEventType.FinishedOff,
    KillfeedEventType.FinallyKilled,

    KillfeedEventType.Gas,
    KillfeedEventType.BleedOut,
    KillfeedEventType.Airdrop
    // ^^ for these three, attackerId corresponds to the player who downed
] satisfies readonly IncludeAttacker[];

// this is kinda stupid, but ts doesn't wanna narrow types otherwise
const hasAttackerData = (obj: { eventType: KillfeedEventType }): obj is { eventType: IncludeAttacker } => (attackerFilter.includes as (value: unknown) => boolean)(obj.eventType);

const weaponFilter: readonly ExcludeWeapon[] = [
    KillfeedEventType.FinallyKilled,

    KillfeedEventType.Gas,
    KillfeedEventType.BleedOut,
    KillfeedEventType.Airdrop
] satisfies readonly ExcludeWeapon[];

const noWeaponData = (obj: { eventType: KillfeedEventType }): obj is { eventType: ExcludeWeapon } => (weaponFilter.includes as (value: unknown) => boolean)(obj.eventType);

export const createKillfeedMessage = <Type extends KillfeedMessageType>(type: Type): ReturnType<(typeof factories)[Type]> => {
    return factories[type]() as ReturnType<(typeof factories)[Type]>;
};

export type ForEventType<Ev extends KillfeedEventType> =
    & BaseDoDMessage<Ev>
    & (Ev extends IncludeAttacker ? {
        attackerId<T extends number | undefined>(id: T): ForEventType<Ev> & (T extends number ? AttackerFactory<Ev> : unknown)
    } : unknown)
    & (Ev extends ExcludeWeapon ? unknown : {
        weaponUsed<T extends KillDamageSources | undefined>(weaponUsed: T): ForEventType<Ev> & (T extends KillDamageSources ? WeaponFactory<Ev> : unknown)
    });

export type BaseDoDMessage<Ev extends KillfeedEventType | undefined> = {
    victimId(): number
    victimId(id: number): Ev extends KillfeedEventType ? ForEventType<Ev> : BaseDoDMessage<undefined>

    severity(): KillfeedEventSeverity
    severity(severity: KillfeedEventSeverity): Ev extends KillfeedEventType ? ForEventType<Ev> : BaseDoDMessage<undefined>

    eventType(): Ev
    eventType<EvTy extends KillfeedEventType>(eventType: EvTy): ForEventType<EvTy>

    build(): DeathOrDownMessage // too lazy to narrow this based on Ev, someone else can do it lol
};

type DeathOrDownMessage = KillFeedPacketData & {
    readonly messageType: KillfeedMessageType.DeathOrDown
};

type AttackerFactory<Ev extends KillfeedEventType> = {
    attackerKills(): number
    attackerKills(kills: number): ForEventType<Ev> & AttackerFactory<Ev>
};

type WeaponFactory<Ev extends KillfeedEventType> = {
    killstreak(): number
    killstreak(killstreak: number): ForEventType<Ev> & WeaponFactory<Ev>
};

const factories = Object.freeze({
    [KillfeedMessageType.DeathOrDown]() {
        type WithPossibleAttacker = DeathOrDownMessage & {
            readonly eventType: IncludeAttacker
        };

        type WithAttacker = WithPossibleAttacker & {
            readonly attackerId: number
        };

        type WithPossibleWeapon = DeathOrDownMessage & {
            readonly eventType: Exclude<KillfeedEventType, ExcludeWeapon>
        };

        type WithWeapon = WithPossibleWeapon & {
            readonly weaponUsed: KillDamageSources
        };

        const msg: Partial<Mutable<DeathOrDownMessage>> = {
            messageType: KillfeedMessageType.DeathOrDown
        };

        /*
            because of how this is implemented, it's way more practical to
            have all the methods be there, but simply be unannounced by the
            type system, instead of having them actually not be there

            don't take this as an excuse to strongarm some dumb code, otherwise
            you void the entire point of this api
        */
        const base: BaseDoDMessage<KillfeedEventType | undefined> = {
            victimId(id?: number) {
                if (!arguments.length) return msg.victimId;

                msg.victimId = id;
                return base;
            },
            severity(severity?: KillfeedEventSeverity) {
                if (!arguments.length) return msg.severity;

                msg.severity = severity;
                return base;
            },

            eventType<Ev extends KillfeedEventType>(eventType?: Ev) {
                if (!arguments.length) return msg.eventType;

                msg.eventType = eventType;

                return base;
            },

            attackerId<Ev extends KillfeedEventType, T extends number | undefined>(id?: T) {
                (msg as Mutable<WithPossibleAttacker>).attackerId = id;
                return base as ForEventType<Ev> & AttackerFactory<Ev>;
            },
            attackerKills<Ev extends KillfeedEventType>(kills?: number) {
                if (kills === undefined) return (msg as Mutable<WithAttacker>).attackerKills;

                (msg as Mutable<WithAttacker>).attackerKills = kills;
                return base as ForEventType<Ev> & AttackerFactory<Ev>;
            },

            weaponUsed<Ev extends KillfeedEventType, T extends KillDamageSources | undefined>(weaponUsed?: T) {
                (msg as Mutable<WithPossibleWeapon>).weaponUsed = weaponUsed;
                return base as ForEventType<Ev> & WeaponFactory<Ev>;
            },
            killstreak<Ev extends KillfeedEventType>(kills?: number) {
                if (!arguments.length) return (msg as Mutable<WithWeapon>).killstreak;

                (msg as Mutable<WithWeapon>).killstreak = kills;
                return base as ForEventType<Ev> & WeaponFactory<Ev>;
            },

            build() {
                if (msg.victimId === undefined) throw new Error("victimId missing for killfeed message of type DeathOrDown");

                return msg as DeathOrDownMessage;
            }
        } as BaseDoDMessage<KillfeedEventType | undefined>;

        return base;
    },
    [KillfeedMessageType.KillLeaderAssigned]() {
        type KillLeaderAssignedMessage = KillFeedPacketData & {
            readonly messageType: KillfeedMessageType.KillLeaderAssigned
        };

        const msg: Partial<Mutable<KillLeaderAssignedMessage>> = {
            messageType: KillfeedMessageType.KillLeaderAssigned
        };

        const obj = {
            victimId(id: number) {
                msg.victimId = id;
                return obj;
            },
            attackerKills(kills: number) {
                msg.attackerKills = kills;
                return obj;
            },
            hideFromKillfeed() {
                msg.hideFromKillfeed = true;
                return obj;
            },
            showInKillfeed() {
                msg.hideFromKillfeed = false;
                return obj;
            },

            build() {
                if (msg.victimId === undefined) throw new Error("victimId missing for killfeed message of type KillLeaderAssigned");
                if (msg.attackerKills === undefined) throw new Error("attackerKills missing for killfeed message of type KillLeaderAssigned");

                return msg as KillLeaderAssignedMessage;
            }
        };

        return obj;
    },
    [KillfeedMessageType.KillLeaderDeadOrDisconnected]() {
        type KillLeaderDeadMessage = KillFeedPacketData & {
            readonly messageType: KillfeedMessageType.KillLeaderDeadOrDisconnected
        };

        const msg: Partial<Mutable<KillLeaderDeadMessage>> = {
            messageType: KillfeedMessageType.KillLeaderDeadOrDisconnected
        };

        const obj = {
            victimId(id: number) {
                msg.victimId = id;
                return obj;
            },
            attackerId(id: number) {
                msg.attackerId = id;
                return obj;
            },
            disconnected(didDisconnect: boolean) {
                msg.disconnected = didDisconnect;
                return obj;
            },

            build() {
                if (msg.victimId === undefined) throw new Error("victimId missing for killfeed message of type KillLeaderDead");
                if (msg.attackerId === undefined) throw new Error("attackerId missing for killfeed message of type KillLeaderDead");

                return msg as KillLeaderDeadMessage;
            }
        };

        return obj;
    },
    [KillfeedMessageType.KillLeaderUpdated]() {
        type KillLeaderUpdatedMessage = KillFeedPacketData & {
            readonly messageType: KillfeedMessageType.KillLeaderUpdated
        };

        const msg: Partial<Mutable<KillLeaderUpdatedMessage>> = {
            messageType: KillfeedMessageType.KillLeaderUpdated
        };

        const obj = {
            attackerKills(kills: number) {
                msg.attackerKills = kills;
                return obj;
            },

            build() {
                if (msg.attackerKills === undefined) throw new Error("attackerKills missing for killfeed message of type KillLeaderUpdated");

                return msg as KillLeaderUpdatedMessage;
            }
        };

        return obj;
    }
});

export const KillFeedPacket = createPacket("KillFeedPacket")<KillFeedPacketData>({
    serialize(stream, data) {
        stream.writeBits(data.messageType, KILLFEED_MESSAGE_TYPE_BITS);

        switch (data.messageType) {
            case KillfeedMessageType.DeathOrDown: {
                stream.writeObjectID(data.victimId);

                stream.writeBits(data.eventType, KILLFEED_EVENT_TYPE_BITS);
                if (hasAttackerData(data)) {
                    const hasAttacker = data.attackerId !== undefined;
                    stream.writeBoolean(hasAttacker);
                    if (hasAttacker) {
                        stream.writeObjectID(data.attackerId);
                        stream.writeUint8(data.attackerKills);
                    }
                }
                stream.writeBits(data.severity, KILLFEED_EVENT_SEVERITY_BITS);

                const weaponWasUsed = !noWeaponData(data) && data.weaponUsed !== undefined;

                stream.writeBoolean(weaponWasUsed);
                if (weaponWasUsed) {
                    damageSourcesDefinitions.writeToStream(stream, data.weaponUsed);
                    if ("killstreak" in data.weaponUsed && data.weaponUsed.killstreak) {
                        if (data.killstreak === undefined) {
                            console.error(`Killfeed packet with weapon '${data.weaponUsed.idString}' is missing a killstreak amount, but weapon schema in question mandates it`);
                            stream.writeUint8(0);
                        } else {
                            stream.writeUint8(data.killstreak);
                        }
                    }
                }
                break;
            }

            case KillfeedMessageType.KillLeaderAssigned:
                stream.writeObjectID(data.victimId);
                stream.writeUint8(data.attackerKills);
                stream.writeBoolean(data.hideFromKillfeed ?? false);
                break;

            case KillfeedMessageType.KillLeaderUpdated:
                stream.writeUint8(data.attackerKills);
                break;

            case KillfeedMessageType.KillLeaderDeadOrDisconnected:
                stream.writeObjectID(data.victimId);
                stream.writeObjectID(data.attackerId);
                stream.writeBoolean(data.disconnected ?? false);
                break;
        }
    },

    deserialize(stream) {
        const data = {
            messageType: stream.readBits(KILLFEED_MESSAGE_TYPE_BITS)
        } as DeepMutable<KillFeedPacketData>;

        switch (data.messageType) {
            case KillfeedMessageType.DeathOrDown: {
                data.victimId = stream.readObjectID();
                data.eventType = stream.readBits(KILLFEED_EVENT_TYPE_BITS);

                if (
                    hasAttackerData(data)
                    && stream.readBoolean() // attacker present
                ) {
                    data.attackerId = stream.readObjectID();
                    (data as KillFeedPacketData & { attackerKills: number }).attackerKills = stream.readUint8();
                }
                data.severity = stream.readBits(KILLFEED_EVENT_SEVERITY_BITS);

                if (stream.readBoolean()) { // used a weapon
                    type WithWeapon = KillFeedPacketData & {
                        weaponUsed: KillDamageSources
                        killstreak?: number
                    };

                    const weaponUsed = (data as WithWeapon).weaponUsed = damageSourcesDefinitions.readFromStream(stream);

                    if ("killstreak" in weaponUsed && weaponUsed.killstreak) {
                        (data as WithWeapon).killstreak = stream.readUint8();
                    }
                }
                break;
            }

            case KillfeedMessageType.KillLeaderAssigned:
                data.victimId = stream.readObjectID();
                data.attackerKills = stream.readUint8();
                data.hideFromKillfeed = stream.readBoolean();
                break;

            case KillfeedMessageType.KillLeaderUpdated:
                data.attackerKills = stream.readUint8();
                break;

            case KillfeedMessageType.KillLeaderDeadOrDisconnected:
                data.victimId = stream.readObjectID();
                data.attackerId = stream.readObjectID();
                data.disconnected = stream.readBoolean();
                break;
        }

        return data as KillFeedPacketData;
    }
});
