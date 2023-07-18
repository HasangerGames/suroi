import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { type ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";

export class Building extends GameObject {
    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Building>, id: number) {
        super(game, scene, type, id);

        const text = this.scene.add.text(0, 0, this.type.definition.name, {
            fontSize: 64
        });

        this.container.add(text);
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    override deserializePartial(stream: SuroiBitStream): void {

    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.position = stream.readPosition();
    }

    destroy(): void {
        super.destroy();
    }
}
