import { Explosions, type ExplosionDefinition } from "../definitions/explosions";
import { Guns, type GunDefinition } from "../definitions/items/guns";
import { Melees, type MeleeDefinition } from "../definitions/items/melees";
import { Throwables, type ThrowableDefinition } from "../definitions/items/throwables";
import { ObstacleDefinition, Obstacles } from "../definitions/obstacles";
import { DefinitionType } from "../utils/objectDefinitions";
import { DataSplitTypes, Packet, PacketType } from "./packet";

export enum DamageSources {
    Gun,
    Melee,
    Throwable,
    Explosion,
    Gas,
    Obstacle,
    BleedOut,
    FinallyKilled,
    Disconnect
}

export interface KillData {
    readonly type: PacketType.Kill
    readonly victimId: number
    readonly attackerId?: number
    readonly creditedId?: number
    readonly kills?: number
    readonly damageSource: DamageSources
    readonly weaponUsed?: GunDefinition | MeleeDefinition | ThrowableDefinition | ExplosionDefinition | ObstacleDefinition
    readonly killstreak?: number
    readonly downed: boolean
    readonly killed: boolean
}

export const KillPacket = new Packet<KillData>(PacketType.Kill, {
    serialize(stream, data) {
        const hasAttackerId = data.attackerId !== undefined;
        const victimIsCreditedId = data.victimId === data.creditedId;
        const hasCreditedId = data.creditedId !== undefined;

        /*
            for this message type, kfData has the following format:

            a c c d k s s s s s r r r r r r

            a = attackerId present (hasAttackerId)
            c = credited state (bits 8-7)
                00 = no creditedId
                01 = victimId === creditedId
                10 = creditedId present (different from victim)
            d = downed
            k = killed
            s = damageSource (allows up to 32 values)
            r = reserved
        */
        let kfData = data.damageSource & 0b1_1111;
        if (data.killed) kfData += 1 << 5;
        if (data.downed) kfData += 1 << 6;
        if (victimIsCreditedId) {
            kfData += 0b01 << 7;
        } else if (hasCreditedId) {
            kfData += 0b10 << 7;
        }
        if (hasAttackerId) kfData += 1 << 9;
        stream.writeUint16(kfData);

        stream.writeObjectId(data.victimId);

        if (hasAttackerId) {
            stream.writeObjectId(data.attackerId);
        }

        if (hasCreditedId && !victimIsCreditedId) {
            stream.writeObjectId(data.creditedId);
        }

        if (hasAttackerId || hasCreditedId) {
            stream.writeUint8(data.kills ?? 0);
        }

        switch (data.damageSource) {
            case DamageSources.Gun:
                Guns.writeToStream(stream, data.weaponUsed as GunDefinition);
                break;
            case DamageSources.Melee:
                Melees.writeToStream(stream, data.weaponUsed as MeleeDefinition);
                break;
            case DamageSources.Throwable:
                Throwables.writeToStream(stream, data.weaponUsed as ThrowableDefinition);
                break;
            case DamageSources.Explosion:
                Explosions.writeToStream(stream, data.weaponUsed as ExplosionDefinition);
                break;
            case DamageSources.Obstacle:
                Obstacles.writeToStream(stream, data.weaponUsed as ObstacleDefinition);
                break;
        }

        if (
            data.weaponUsed !== undefined
            && data.weaponUsed.defType !== DefinitionType.Explosion
            && "killstreak" in data.weaponUsed
            && data.weaponUsed.killstreak
        ) {
            stream.writeUint8(data.killstreak ?? 0);
        }
    },

    deserialize(stream, data, saveIndex, recordTo) {
        saveIndex();

        // see the comments in the serialization method to
        // understand the format and what's going on
        const kfData = stream.readUint16();

        const hasAttackerId = (kfData & (1 << 9)) !== 0;
        const creditedBits = (kfData >> 7) & 0b11;
        const victimIsCreditedId = creditedBits === 0b01;
        const hasCreditedId = creditedBits === 0b10;

        data.damageSource = kfData & 0b1_1111;
        data.downed = (kfData & (1 << 6)) !== 0;
        data.killed = (kfData & (1 << 5)) !== 0;

        data.victimId = stream.readObjectId();

        if (hasAttackerId) {
            data.attackerId = stream.readObjectId();
        }

        if (victimIsCreditedId) {
            data.creditedId = data.victimId;
        } else if (hasCreditedId) {
            data.creditedId = stream.readObjectId();
        }

        if (hasAttackerId || hasCreditedId) {
            data.kills = stream.readUint8();
        }

        switch (data.damageSource) {
            case DamageSources.Gun:
                data.weaponUsed = Guns.readFromStream(stream);
                break;
            case DamageSources.Melee:
                data.weaponUsed = Melees.readFromStream(stream);
                break;
            case DamageSources.Throwable:
                data.weaponUsed = Throwables.readFromStream(stream);
                break;
            case DamageSources.Explosion:
                data.weaponUsed = Explosions.readFromStream(stream);
                break;
            case DamageSources.Obstacle:
                data.weaponUsed = Obstacles.readFromStream(stream);
                break;
        }

        if (
            data.weaponUsed
            && "killstreak" in data.weaponUsed
            && data.weaponUsed.killstreak
        ) {
            data.killstreak = stream.readUint8();
        }

        recordTo(DataSplitTypes.Killfeed);
    }
});
