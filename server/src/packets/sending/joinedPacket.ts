import { PacketType } from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";

export class JoinedPacket extends SendingPacket {
    override readonly allocBytes = 6;
    override readonly type = PacketType.Joined;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        for (let i = 0; i < this.player.loadout.emotes.length; i++) {
            stream.writeObjectTypeNoCategory(this.player.loadout.emotes[i]);
        }
    }
}
