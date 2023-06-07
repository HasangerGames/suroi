import gsap from "gsap";

import { GameObject } from "../types/gameObject";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { ObjectCategory } from "../../../../common/src/constants";

export class DeathMarker extends GameObject {
    override readonly type = ObjectType.categoryOnly(ObjectCategory.DeathMarker);

    playerName!: string;

    image!: Phaser.GameObjects.Image;
    playerNameText!: Phaser.GameObjects.Text;

    override deserializePartial(stream: SuroiBitStream): void {
        this.position = stream.readPosition();
        if (this.image === undefined) {
            this.image = this.scene.add.image(this.position.x * 20, this.position.y * 20, "main", "death_marker.svg");
        }
    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.playerName = stream.readPlayerName();

        if (this.playerNameText === undefined) {
            this.playerNameText = this.scene.add.text(
                this.position.x * 20,
                (this.position.y * 20) + 105,
                this.playerName,
                {
                    fontSize: 36,
                    fontFamily: "Inter",
                    color: "#dcdcdc"
                })
                .setOrigin(0.5, 0.5)
                .setShadow(2, 2, "#000", 2, true, true);
        }

        // Play an animation if this is a new death marker
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
