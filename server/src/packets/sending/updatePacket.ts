import { SendingPacket } from "../../types/sendingPacket";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";
import { PacketType } from "../../../../common/src/constants/packetType";
import { Vec2 } from "planck";

export class UpdatePacket extends SendingPacket {
    constructor(player: Player) {
        super(player);
        this.type = PacketType.Update;
        this.allocBytes = 8192;
    }

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        const p = this.player;
        stream.writeVector(Vec2(p.position.x, (720 - p.position.y)), 0, 0, 1024, 1024, 16);
        stream.writeUnitVector(p.rotation, 8);
        /*stream.writeBoolean(p.healthDirty);
        if (p.healthDirty) stream.writeFloat(p.health, 0, 100, 8);

        stream.writeBoolean(p.adrenalineDirty);
        if (p.adrenalineDirty) stream.writeFloat(p.adrenaline, 0, 100, 8);*/
    }
}
