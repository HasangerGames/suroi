import { type Player } from "../../objects/player";
import { SendingPacket } from "../../types/sendingPacket";

import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../../../common/src/constants";

export class InputPacket extends SendingPacket {
    override readonly allocBytes = 8;
    override readonly type = PacketType.Input;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        const player: Player = this.player;
        stream.writeBoolean(player.movement.up);
        stream.writeBoolean(player.movement.down);
        stream.writeBoolean(player.movement.left);
        stream.writeBoolean(player.movement.right);
        stream.writeBoolean(player.punching);
        player.punching = false;
        stream.writeBoolean(player.switchGun);
        player.switchGun = false;
        stream.writeRotation(player.rotation);
    }
}
