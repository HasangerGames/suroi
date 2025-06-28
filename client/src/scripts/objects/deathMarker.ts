import { ObjectCategory, ZIndexes } from "@common/constants";
import { type BadgeDefinition } from "@common/definitions/badges";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { Vec, type Vector } from "@common/utils/vector";
import { Text, type Container } from "pixi.js";
import { Game } from "../game";
import { UIManager } from "../managers/uiManager";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS } from "../utils/constants";
import { DebugRenderer } from "../utils/debugRenderer";
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

    constructor(id: number, data: ObjectsNetData[ObjectCategory.DeathMarker]) {
        super(id);

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

        this.layer = data.layer;
        this.updateLayer();

        const player = Game.playerNames.get(data.playerID);

        const playerName = UIManager.getRawPlayerName(data.playerID);

        if (player) {
            this.playerName = playerName;
            this.playerNameText.text = this.playerName;

            if (player.badge) {
                const badgeSprite = new SuroiSprite(player.badge.idString);

                const oldWidth = badgeSprite.width;
                badgeSprite.width = this.playerNameText.height / 1.25;
                badgeSprite.height *= badgeSprite.width / oldWidth;
                badgeSprite.position = Vec(
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
            this.scaleAnim = Game.addTween({
                target: this.container.scale,
                to: { x: 1, y: 1 },
                duration: 400,
                onComplete: () => {
                    this.scaleAnim = undefined;
                }
            });

            this.alphaAnim = Game.addTween({
                target: this.container,
                to: { alpha: 1 },
                duration: 400,
                onComplete: () => {
                    this.alphaAnim = undefined;
                }
            });
        }
    }

    override update(): void { /* bleh */ }
    override updateInterpolation(): void { /* bleh */ }
    updateDebugGraphics(): void {
        if (!DEBUG_CLIENT) return;

        DebugRenderer.addCircle(
            0.1,
            this.position,
            HITBOX_COLORS.obstacleNoCollision,
            this.layer === Game.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY
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
