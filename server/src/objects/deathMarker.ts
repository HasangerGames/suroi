import { ObjectCategory } from "../../../common/src/constants";
import { ObjectSerializations } from "../../../common/src/utils/objectsSerializations";
import { type SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { GameObject } from "../types/gameObject";
import { type Player } from "./player";

export class DeathMarker extends GameObject {
    override readonly type = ObjectCategory.DeathMarker;

    readonly player: Player;
    isNew = true;

    constructor(player: Player) {
        super(player.game, player.position);
        this.player = player;

        setTimeout((): void => { this.isNew = false; }, 100);
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    override damage(amount: number, source: GameObject): void { }

    override serializePartial(stream: SuroiBitStream): void {
        ObjectSerializations[ObjectCategory.DeathMarker].serializePartial(stream, {
            position: this.position,
            player: {
                isDev: this.player.isDev,
                name: this.player.name,
                nameColor: this.player.nameColor
            },
            isNew: this.isNew
        });
    }

    override serializeFull(stream: SuroiBitStream): void {
        this.serializePartial(stream);
    }
}
