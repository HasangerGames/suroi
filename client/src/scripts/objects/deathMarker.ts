import gsap from "gsap";

import type { Game } from "../game";
import { GameObject } from "../types/gameObject";

import { ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { SuroiSprite } from "../utils/pixi";

import { Text } from "pixi.js";

export class DeathMarker extends GameObject {
    override readonly type = ObjectType.categoryOnly(ObjectCategory.DeathMarker);

    playerName!: string;
    nameColor = "#dcdcdc";

    image: SuroiSprite;
    playerNameText: Text;

    constructor(game: Game, type: ObjectType<ObjectCategory.DeathMarker>, id: number) {
        super(game, type, id);

        this.image = new SuroiSprite("death_marker.svg");
        this.playerNameText = new Text("",
            {
                fontSize: 36,
                fontFamily: "Inter",
                dropShadow: true,
                dropShadowBlur: 2,
                dropShadowDistance: 2,
                dropShadowColor: 0
            });
        this.playerNameText.y = 95;
        this.playerNameText.anchor.set(0.5);
        this.container.addChild(this.image, this.playerNameText);

        this.container.zIndex = 0;
    }

    override deserializePartial(stream: SuroiBitStream): void {
        this.position = stream.readPosition();
    }

    override deserializeFull(stream: SuroiBitStream): void {
        this.playerName = stream.readPlayerName();

        if (stream.readBoolean()) {
            this.nameColor = stream.readUTF8String(10);
        }
        this.playerNameText.text = this.playerName;

        this.playerNameText.style.fill = this.nameColor;

        // Play an animation if this is a new death marker.
        if (stream.readBoolean()) {
            this.container.scale.set(0.5);
            this.container.alpha = 0;
            gsap.to(this.container, {
                scale: 1,
                alpha: 1,
                duration: 0.4
            });
        }
    }

    destroy(): void {
        super.destroy();
    }
}
