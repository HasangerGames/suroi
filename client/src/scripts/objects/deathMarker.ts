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

    image: Phaser.GameObjects.Image;
    playerNameText: Phaser.GameObjects.Text;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.DeathMarker>, id: number) {
        super(game, scene, type, id);

        this.image = this.scene.add.image(0, 0, "main", "death_marker.svg");
        this.playerNameText = this.scene.add.text(0, 0, "",
            {
                fontSize: 36,
                fontFamily: "Inter",
                color: "#dcdcdc"
            })
            .setOrigin(0.5, 0.5)
            .setShadow(2, 2, "#000", 2, true, true);
    }

    override deserializePartial(stream: SuroiBitStream): void {
        this.position = stream.readPosition();
        this.image.setPosition(this.position.x * 20, this.position.y * 20);
    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.playerName = stream.readPlayerName();

        this.playerNameText.setPosition(this.position.x * 20, (this.position.y * 20) + 105)
            .setText(this.playerName);

        // Play an animation if this is a new death marker.
        if (stream.readBoolean()) {
            this.image.setScale(0.5).setAlpha(0);
            gsap.to(this.image, {
                scale: 1,
                alpha: 1,
                duration: 0.4
            });
        }
    }

    override destroy(): void {
        this.image.destroy(true);
        this.playerNameText.destroy(true);
    }
}
