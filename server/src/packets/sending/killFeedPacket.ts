import { SendingPacket } from "../../types/sendingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../common/src/constants";
import { type ObjectType } from "../../../../common/src/utils/objectType";

export class KillFeedPacket extends SendingPacket {
    override readonly allocBytes = 1 << 6;
    override readonly type = PacketType.KillFeed;

    readonly killed: Player;
    readonly killedBy?: Player;
    readonly weaponUsed?: ObjectType;

    constructor(player: Player, killed: Player, weaponUsed?: ObjectType) {
        super(player);

        this.killed = killed;
        this.killedBy = player.killedBy;
        this.weaponUsed = weaponUsed;
    }

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        // *NOTE: WIP, will change later
        const killedBy = this.killed?.killedBy?.name ?? "Player";

        stream.writeUTF8String(this.killed.name, 16);
        stream.writeUTF8String(killedBy, 16);

        const usedWeapon: boolean = this.weaponUsed !== undefined;
        stream.writeBoolean(usedWeapon);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (usedWeapon) stream.writeObjectType(this.weaponUsed!);
    }
}
