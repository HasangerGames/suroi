import gsap from "gsap";

import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../../common/src/utils/objectType";

export class DeathMarker extends GameObject {
    override readonly type = ObjectType.categoryOnly(ObjectCategory.DeathMarker);

    playerName!: string;
    nameColor = "#dcdcdc";

    image: Phaser.GameObjects.Image;
    playerNameText: Phaser.GameObjects.Text;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.DeathMarker>, id: number) {
        super(game, scene, type, id);

        this.image = this.scene.add.image(0, 0, "main", "death_marker.svg");
        this.playerNameText = this.scene.add.text(0, 95, "",
            {
                fontSize: 36,
                fontFamily: "Inter"
            })
            .setOrigin(0.5, 0.5)
            .setShadow(2, 2, "#000", 2, true, true);
        this.container.add([this.image, this.playerNameText]).setDepth(1);
    }

    override deserializePartial(stream: SuroiBitStream): void {
        this.position = stream.readPosition();
    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.playerName = stream.readPlayerName();

        if (stream.readBoolean()) {
            this.nameColor = stream.readUTF8String(10);
        }
        this.playerNameText.setText(this.playerName).setColor(this.nameColor);

        // Play an animation if this is a new death marker.
        if (stream.readBoolean()) {
            this.container.setScale(0.5).setAlpha(0);
            gsap.to(this.container, {
                scale: 1,
                alpha: 1,
                duration: 0.4
            });
        }
    }

    destroy(): void {
        super.destroy();
        this.image.destroy(true);
        this.playerNameText.destroy(true);
    }
}
