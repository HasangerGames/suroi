import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";
import { type ObjectType } from "../../../../common/src/utils/objectType";

export class KillPacket extends SendingPacket {
    override readonly allocBytes = 1 << 5;
    override readonly type = PacketType.Kill;

    readonly killed: Player;
    readonly weaponUsed?: ObjectType;

    constructor(player: Player, killed: Player, weaponUsed?: ObjectType) {
        super(player);

        this.killed = killed;
        this.weaponUsed = weaponUsed;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        stream.writeBits(this.player.kills, 7);
        stream.writePlayerName(this.killed.name);

        const usedWeapon = this.weaponUsed !== undefined;
        stream.writeBoolean(usedWeapon);

        if (this.weaponUsed !== undefined) stream.writeObjectType(this.weaponUsed);
    }
}
