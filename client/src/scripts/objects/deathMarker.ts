import { Text, type Container } from "pixi.js";
import { DEFAULT_USERNAME, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { consoleVariables } from "../utils/console/variables";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { Tween } from "../utils/tween";

export class DeathMarker extends GameObject<ObjectCategory.DeathMarker> {
    override readonly type = ObjectCategory.DeathMarker;

    playerName!: string;
    nameColor = "#dcdcdc";

    image: SuroiSprite;
    playerNameText: Text;

    scaleAnim?: Tween<Vector>;
    alphaAnim?: Tween<Container>;

    constructor(game: Game, id: number) {
        super(game, id);

        this.image = new SuroiSprite("death_marker");
        this.playerNameText = new Text(
            consoleVariables.get.builtIn("cv_anonymize_player_names").value ? DEFAULT_USERNAME : "",
            {
                fontSize: 36,
                fontFamily: "Inter",
                dropShadow: true,
                dropShadowBlur: 2,
                dropShadowDistance: 2,
                dropShadowColor: 0
            }
        );
        this.playerNameText.y = 95;
        this.playerNameText.anchor.set(0.5);
        this.container.addChild(this.image, this.playerNameText);

        this.container.zIndex = ZIndexes.DeathMarkers;
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.DeathMarker]): void {
        this.position = data.position;

        const pos = toPixiCoords(this.position);
        this.container.position.copyFrom(pos);

        this.playerName = data.player.name;
        this.playerNameText.text = this.playerName;

        if (data.player.isDev) {
            this.nameColor = data.player.nameColor;
        }

        this.playerNameText.style.fill = this.nameColor;

        // Play an animation if this is a new death marker.
        if (data.isNew) {
            this.container.scale.set(0.5);
            this.container.alpha = 0;
            this.scaleAnim = new Tween(
                this.game,
                {
                    target: this.container.scale,
                    to: { x: 1, y: 1 },
                    duration: 400
                }
            );

            this.alphaAnim = new Tween(
                this.game,
                {
                    target: this.container,
                    to: { alpha: 1 },
                    duration: 400
                }
            );
        }
    }

    destroy(): void {
        super.destroy();
        this.scaleAnim?.kill();
        this.alphaAnim?.kill();
    }
}
