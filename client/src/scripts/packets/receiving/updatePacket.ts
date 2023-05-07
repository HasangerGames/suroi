import { ReceivingPacket } from "../../types/receivingPacket";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";

export class UpdatePacket extends ReceivingPacket {
    public constructor(player: Player) {
        super(player);
    }

    deserialize(stream: SuroiBitStream): void {
        const p: Player = this.player;
        if (p === undefined) return;
        p.position = stream.readVector(0, 0, 1024, 1024, 16);
        p.serverData.rotation = stream.readUnitVector(8);
        p.scene.tweens.add({
            targets: p.container,
            x: p.position.x * 20,
            y: p.position.y * 20,
            duration: 30
        });
        p.scene.tweens.add({
            targets: p.container,
            rotation: Math.atan2(p.serverData.rotation.y, p.serverData.rotation.x),
            duration: 30
        });
    }
}
