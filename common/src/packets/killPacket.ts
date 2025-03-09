import { Explosions, type ExplosionDefinition } from "../definitions/explosions";
import { Guns, type GunDefinition } from "../definitions/items/guns";
import { Melees, type MeleeDefinition } from "../definitions/items/melees";
import { Throwables, type ThrowableDefinition } from "../definitions/items/throwables";
import { DataSplitTypes, Packet, PacketType } from "./packet";

export enum DamageSources {
    Gun,
    Melee,
    Throwable,
    Explosion,
    Gas,
    Airdrop,
    BleedOut,
    FinallyKilled
}

export interface KillData {
    readonly type: PacketType.Kill
    readonly victimId: number
    readonly attackerId?: number
    readonly creditedId?: number
    readonly kills?: number
    readonly damageSource: DamageSources
    readonly weaponUsed?: GunDefinition | MeleeDefinition | ThrowableDefinition | ExplosionDefinition
    readonly killstreak?: number
    readonly downed: boolean
    readonly killed: boolean
}

export const KillPacket = new Packet<KillData>(PacketType.Kill, {
    serialize(stream, data) {
        /*
            for this message type, kfData has the following format:

            u a c d k s s s

            u = unused
            a = attackerId present
            c = creditedId present
            d = downed
            k = killed
            s = damageSource
        */
        let kfData = data.damageSource;
        if (data.attackerId !== undefined) kfData += 64;
        if (data.creditedId !== undefined) kfData += 32;
        if (data.downed) kfData += 16;
        if (data.killed) kfData += 8;
        stream.writeUint8(kfData);

        stream.writeObjectId(data.victimId);

        if (data.attackerId !== undefined) {
            stream.writeObjectId(data.attackerId);
            stream.writeUint8(data.kills ?? 0);
        }

        if (data.creditedId !== undefined) {
            stream.writeObjectId(data.creditedId);
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
        }

        if (
            data.killstreak !== undefined
            && data.weaponUsed
            && "killstreak" in data.weaponUsed
            && data.weaponUsed.killstreak
        ) {
            stream.writeUint8(data.killstreak);
        }
    },

    deserialize(stream, data, saveIndex, recordTo) {
        saveIndex();

        // see the comments in the serialization method to
        // understand the format and what's going on
        const kfData = stream.readUint8();

        data.damageSource = kfData & 0b111;
        data.downed = (kfData & 16) !== 0;
        data.killed = (kfData & 8) !== 0;

        data.victimId = stream.readObjectId();

        if ((kfData & 64) !== 0) {
            data.attackerId = stream.readObjectId();
            data.kills = stream.readUint8();
        }

        if ((kfData & 32) !== 0) {
            data.creditedId = stream.readObjectId();
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
        }

        if (
            data.weaponUsed
            && "killstreak" in data.weaponUsed
            && data.weaponUsed.killstreak
        ) {
            data.killstreak = stream.readUint8();
        }

        recordTo(DataSplitTypes.Killfeed);
        console.log({ ...data, damageSource: DamageSources[data.damageSource] });
    }
});
