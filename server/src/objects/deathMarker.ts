import { ObjectCategory } from "@common/constants";
import { type FullData } from "@common/utils/objectsSerializations";

import { RectangleHitbox } from "@common/utils/hitbox";
import { BaseGameObject } from "./gameObject";
import { type Player } from "./player";

export class DeathMarker extends BaseGameObject.derive(ObjectCategory.DeathMarker) {
    override readonly fullAllocBytes = 8;
    override readonly partialAllocBytes = 4;
    override readonly hitbox: RectangleHitbox;

    readonly player: Player;
    isNew = true;

    constructor(player: Player, layer: number) {
        super(player.game, player.position);
        this.player = player;
        this.layer = layer;
        this.hitbox = RectangleHitbox.fromRect(5, 5, player.position);

        this.game.addTimeout(() => {
            this.isNew = false;
            this.setPartialDirty();
        }, 100);
    }

    override get data(): FullData<ObjectCategory.DeathMarker> {
        return {
            position: this.position,
            isNew: this.isNew,
            playerID: this.player.id,
            layer: this.layer
        };
    }

    override damage(): void { /* can't damage a death marker */ }
}
