import { Text, type Container } from "pixi.js";
import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { Tween } from "../utils/tween";
import { GameObject } from "./gameObject";
import type { BadgeDefinition } from "../../../../common/src/definitions/badges";

export class DeathMarker extends GameObject<ObjectCategory.DeathMarker> {
    override readonly type = ObjectCategory.DeathMarker;

    playerName!: string;
    nameColor = 0xdcdcdc;
    playerBadge!: BadgeDefinition;

    readonly image: SuroiSprite;
    playerNameText: Text;

    scaleAnim?: Tween<Vector>;
    alphaAnim?: Tween<Container>;

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.DeathMarker]>) {
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

        this.container.position.copyFrom(toPixiCoords(this.position));

        this.container.zIndex = ZIndexes.DeathMarkers;
        if (FloorTypes[this.game.map.terrain.getFloor(this.position)].overlay) {
            this.container.zIndex = ZIndexes.UnderWaterDeadObstacles;
        }

        const player = this.game.playerNames.get(data.playerID);

        const playerName = this.game.uiManager.getRawPlayerName(data.playerID);

        if (player) {
            this.playerName = playerName;
            this.playerNameText.text = this.playerName;

            if (player.badge) {
                const badgeSprite = new SuroiSprite(player.badge.idString);

                const oldWidth = badgeSprite.width;
                badgeSprite.width = this.playerNameText.height / 1.25;
                badgeSprite.height = badgeSprite.height * (badgeSprite.width / oldWidth);
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

    override destroy(): void {
        super.destroy();

        this.image.destroy();
        this.playerNameText.destroy();
        this.scaleAnim?.kill();
        this.alphaAnim?.kill();
    }
}
