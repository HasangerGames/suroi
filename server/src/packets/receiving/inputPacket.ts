import { ReceivingPacket } from "../../types/receivingPacket";
import { type Player } from "../../objects/player";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

export class InputPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const p: Player = this.player;
        if (p.dead) return; // Ignore input packets from dead players

        p.moving = true;
        p.movingUp = stream.readBoolean();
        p.movingDown = stream.readBoolean();
        p.movingLeft = stream.readBoolean();
        p.movingRight = stream.readBoolean();
        p.attackStart = stream.readBoolean();
        p.attackHold = stream.readBoolean();

        if (stream.readBoolean()) { // switch guns
            if (p.activeWeapon.category === "melee") {
                p.activeWeapon = p.weapons[1];
            } else {
                p.activeWeapon = p.weapons[0];
            }
            p.game.fullDirtyObjects.add(p);
            p.fullDirtyObjects.add(p);
        }

        p.rotation = stream.readRotation(16);
    }
}
