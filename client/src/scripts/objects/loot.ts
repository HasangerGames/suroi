import { GameObject } from "../types/gameObject";

import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectCategory } from "../../../../common/src/constants";
import gsap from "gsap";
import Phaser from "phaser";
import { type Game } from "../game";
import { type GameScene } from "../scenes/gameScene";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";

export class Loot extends GameObject<ObjectCategory.Loot> {
    readonly images: {
        readonly background: Phaser.GameObjects.Image
        readonly item: Phaser.GameObjects.Image
        readonly container: Phaser.GameObjects.Container
    };

    created = false;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Loot>, id: number) {
        super(game, scene, type, id);
        const images = {
            background: this.scene.add.image(0, 0, "main"),
            item: this.scene.add.image(0, 0, "main"),
            container: undefined as unknown as Phaser.GameObjects.Container
        };
        images.container = this.scene.add.container(0, 0, [images.background, images.item]).setDepth(1);
        this.images = images;
    }

    override deserializePartial(stream: SuroiBitStream): void {
        this.position = stream.readPosition();
        this.rotation = stream.readRotation(8);
        if (!this.created) {
            this.images.container.setPosition(this.position.x * 20, this.position.y * 20).setRotation(this.rotation);
        } else {
            const oldAngle: number = this.images.container.angle;
            const newAngle: number = Phaser.Math.RadToDeg(this.rotation);
            const finalAngle: number = oldAngle + Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);
            gsap.to(this.images.container, {
                x: this.position.x * 20,
                y: this.position.y * 20,
                angle: finalAngle,
                duration: 0.03
            });
        }
    }

    override deserializeFull(stream: SuroiBitStream): void {
        // Loot should only be fully updated on creation
        if (this.created) {
            console.warn("Full update of existing loot");
            return;
        }

        this.type = stream.readObjectType() as ObjectType<ObjectCategory.Loot>;

        // Set the loot texture based on the type
        this.images.item.setTexture("main", `${this.type.idString}.svg`);
        let backgroundTexture: string | undefined;
        switch ((this.type.definition as LootDefinition).itemType) {
            case ItemType.Gun:
                backgroundTexture = "loot_background_gun.svg";
                this.images.item.setScale(0.75);
                break;
            case ItemType.Melee:
                backgroundTexture = "loot_background_melee.svg";
                break;
            case ItemType.Healing:
                backgroundTexture = "loot_background_healing.svg";
                break;
        }
        this.images.background.setTexture("main", backgroundTexture);

        // Play an animation if this is new loot
        if (stream.readBoolean()) {
            this.images.container.setScale(0.5);
            gsap.to(this.images.container, {
                scale: 1,
                ease: "elastic.out(1.01, 0.3)",
                duration: 1
            });
        }

        this.created = true;
    }

    override destroy(): void {
        this.images.container.destroy(true);
        this.images.item.destroy(true);
        this.images.background.destroy(true);
    }
}
