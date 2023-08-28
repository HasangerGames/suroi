import { GameObject } from "../types/gameObject";
import { type Player } from "./player";

import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { ObjectCategory } from "../../../common/src/constants";
import { ObjectType } from "../../../common/src/utils/objectType";

export class DeathMarker extends GameObject {
    player: Player;
    isNew = true;

    constructor(player: Player) {
        super(player.game, ObjectType.categoryOnly(ObjectCategory.DeathMarker), player.position);
        this.player = player;

        setTimeout((): void => { this.isNew = false; }, 100);
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    override damage(amount: number, source: GameObject): void {}

    override serializePartial(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
    }

    override serializeFull(stream: SuroiBitStream): void {
        stream.writePlayerNameWithColor(this.player);
        stream.writeBoolean(this.isNew);
    }
}
