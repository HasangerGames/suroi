import type Phaser from "phaser";
import gsap from "gsap";

import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { type ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import type { ObjectType } from "../../../../common/src/utils/objectType";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import type { LootDefinition } from "../../../../common/src/definitions/loots";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { type MeleeDefinition } from "../../../../common/src/definitions/melees";

export class Loot extends GameObject<ObjectCategory.Loot> {
    readonly images: {
        background: Phaser.GameObjects.Image
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
        if (!this.created) {
            this.images.container.setPosition(this.position.x * 20, this.position.y * 20);
        } else {
            this.scene.tweens.add({
                targets: this.images.container,
                x: this.position.x * 20,
                y: this.position.y * 20,
                duration: 30
            });
        }
    }

    override deserializeFull(stream: SuroiBitStream): void {
        // Loot should only be fully updated on creation
        if (this.created) {
            console.warn("Full update of existing loot");
            return;
        }

        // Set the loot texture based on the type
        this.images.item.setTexture("main", `${this.type.idString}.svg`);
        const definition = this.type.definition;
        let backgroundTexture: string | undefined;
        switch ((definition as LootDefinition).itemType) {
            case ItemType.Gun: {
                backgroundTexture = `loot_background_gun_${(definition as GunDefinition).ammoType as string}.svg`;
                this.images.item.setScale(0.85);
                break;
            }
            case ItemType.Melee: {
                backgroundTexture = "loot_background_melee.svg";
                const imageScale = (definition as MeleeDefinition).image?.lootScale;
                if (imageScale !== undefined) this.images.item.setScale(imageScale);
                break;
            }
            case ItemType.Healing: {
                backgroundTexture = "loot_background_healing.svg";
                break;
            }
        }
        if (backgroundTexture !== undefined) {
            this.images.background.setTexture("main", backgroundTexture);
        } else {
            this.images.background.setVisible(false); // TODO Figure out why destroy doesn't work
        }

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
