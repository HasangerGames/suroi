import { PacketType } from "../../../../common/src/constants";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { GunItem } from "../../inventory/gunItem";
import { MeleeItem } from "../../inventory/meleeItem";
import { type Player } from "../../objects/player";
import { SendingPacket } from "../../types/sendingPacket";

export class KillPacket extends SendingPacket {
    override readonly allocBytes = 1 << 5;
    override readonly type = PacketType.Kill;

    readonly killed: Player;
    readonly weaponUsed?: GunItem | MeleeItem | ObjectType;
    readonly kills: number;

    constructor(player: Player, killed: Player, weaponUsed?: GunItem | MeleeItem | ObjectType) {
        super(player);

        this.killed = killed;
        this.weaponUsed = weaponUsed;
        this.kills = (weaponUsed instanceof GunItem || weaponUsed instanceof MeleeItem) && weaponUsed.definition.killstreak === true ? weaponUsed.stats.kills : 0;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        stream.writeBits(this.player.kills, 7);
        stream.writePlayerNameWithColor(this.killed);

        const weaponUsed = this.weaponUsed;
        const weaponWasUsed = weaponUsed !== undefined;
        stream.writeBoolean(weaponWasUsed);

        if (weaponWasUsed) {
            const canTrackStats = weaponUsed instanceof GunItem || weaponUsed instanceof MeleeItem;
            const shouldTrackStats = canTrackStats && weaponUsed.definition.killstreak === true;

            stream.writeObjectType(canTrackStats ? weaponUsed.type : weaponUsed);
            stream.writeBoolean(shouldTrackStats);
            if (shouldTrackStats) {
                stream.writeUint8(this.kills);
            }
        }
    }
}
