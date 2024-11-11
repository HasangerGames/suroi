import { ObjectCategory, ZIndexes } from "@common/constants";
import { type BadgeDefinition } from "@common/definitions/badges";
import { getEffectiveZIndex } from "@common/utils/layer";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { Vec, type Vector } from "@common/utils/vector";
import { Text, type Container } from "pixi.js";
import { type Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";

export class DeathMarker extends GameObject.derive(ObjectCategory.DeathMarker) {
    playerName!: string;
    nameColor = 0xdcdcdc;
    playerBadge!: BadgeDefinition;

    readonly image: SuroiSprite;
    playerNameText: Text;

    scaleAnim?: Tween<Vector>;
    alphaAnim?: Tween<Container>;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.DeathMarker]) {
        super(game, id);

        this.image = new SuroiSprite("death_marker");
        this.playerNameText = new Text({
            text: "",
            style: {
                fontSize: 36,
                fontFamily: "Inter",
                dropShadow: {
                    alpha: 0.8,
                    color: "black",
                    blur: 2,
                    distance: 2
                }
            }
        });
        this.playerNameText.y = 95;
        this.playerNameText.anchor.set(0.5);
        this.container.addChild(this.image, this.playerNameText);

        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.DeathMarker], isNew = false): void {
        this.position = data.position;

        this.layer = data.layer;

        this.container.position.copyFrom(toPixiCoords(this.position));

        this.updateZIndex();

        const player = this.game.playerNames.get(data.playerID);

        const playerName = this.game.uiManager.getRawPlayerName(data.playerID);

        if (player) {
            this.playerName = playerName;
            this.playerNameText.text = this.playerName;

            if (player.badge) {
                const badgeSprite = new SuroiSprite(player.badge.idString);

                const oldWidth = badgeSprite.width;
                badgeSprite.width = this.playerNameText.height / 1.25;
                badgeSprite.height *= badgeSprite.width / oldWidth;
                badgeSprite.position = Vec.create(
                    this.playerNameText.width / 2 + 20,
                    96
                );

                this.container.addChild(badgeSprite);
            }

            if (player.hasColor) {
                this.nameColor = player.nameColor.toNumber();
            }
        }

        this.playerNameText.style.fill = this.nameColor;

        // Play an animation if this is a new death marker.
        if (data.isNew && isNew) {
            this.container.scale.set(0.5);
            this.container.alpha = 0;
            this.scaleAnim = this.game.addTween({
                target: this.container.scale,
                to: { x: 1, y: 1 },
                duration: 400,
                onComplete: () => {
                    this.scaleAnim = undefined;
                }
            });

            this.alphaAnim = this.game.addTween({
                target: this.container,
                to: { alpha: 1 },
                duration: 400,
                onComplete: () => {
                    this.alphaAnim = undefined;
                }
            });
        }
    }

    override updateZIndex(): void {
        this.container.zIndex = getEffectiveZIndex(
            this.doOverlay() ? ZIndexes.UnderWaterDeadObstacles : ZIndexes.DeathMarkers,
            this.layer,
            this.game.layer
        );
    }

    override destroy(): void {
        super.destroy();

        this.image.destroy();
        this.playerNameText.destroy();
        this.scaleAnim?.kill();
        this.alphaAnim?.kill();
    }
}
