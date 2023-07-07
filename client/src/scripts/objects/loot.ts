import type Phaser from "phaser";
import gsap from "gsap";

import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { LootRadius, MaxInventoryCapacity, type ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import type { ObjectType } from "../../../../common/src/utils/objectType";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import type { LootDefinition } from "../../../../common/src/definitions/loots";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { type MeleeDefinition } from "../../../../common/src/definitions/melees";
import { type PlayerManager } from "../utils/playerManager";

export class Loot extends GameObject<ObjectCategory.Loot> {
    readonly images: {
        readonly background: Phaser.GameObjects.Image
        readonly item: Phaser.GameObjects.Image
    };

    created = false;

    count = 0;

    radius: number;

    constructor(game: Game, scene: GameScene, type: ObjectType<ObjectCategory.Loot, LootDefinition>, id: number) {
        super(game, scene, type, id);
        this.images = {
            background: this.scene.add.image(0, 0, "main"),
            item: this.scene.add.image(0, 0, "main", `${this.type.idString}.svg`)
        };

        this.container.add([this.images.background, this.images.item]).setDepth(1);

        // Set the loot texture based on the type
        const definition = this.type.definition;
        let backgroundTexture: string | undefined;
        switch ((definition as LootDefinition).itemType) {
            case ItemType.Gun: {
                backgroundTexture = `loot_background_gun_${(definition as GunDefinition).ammoType}.svg`;
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
            this.images.background.setVisible(false); // @TODO Figure out why destroy doesn't work
            // I think you can't destroy a container child without destroying the container first
            // - Leo
        }

        this.radius = LootRadius[(this.type.definition as LootDefinition).itemType];
    }

    override deserializePartial(stream: SuroiBitStream): void {
        this.position = stream.readPosition();
    }

    override deserializeFull(stream: SuroiBitStream): void {
        // Loot should only be fully updated on creation
        if (this.created) {
            console.warn("Full update of existing loot");
        }

        this.count = stream.readUint8();
        const isNew = stream.readBoolean();

        // Play an animation if this is new loot
        if (isNew) {
            this.container.setScale(0.5);
            gsap.to(this.container, {
                scale: 1,
                ease: "elastic.out(1.01, 0.3)",
                duration: 1
            });
        }

        this.created = true;
    }

    destroy(): void {
        super.destroy();
        this.images.item.destroy(true);
        this.images.background.destroy(true);
    }

    canInteract(player: PlayerManager): boolean {
        const definition = this.type.definition as LootDefinition;
        switch (definition.itemType) {
            // eslint-disable-next-line no-fallthrough
            case ItemType.Gun: {
                return !player.weapons[0] ||
                    !player.weapons[1] ||
                    (player.activeItemIndex < 2 && this.type.idNumber !== player.weapons[player.activeItemIndex]?.idNumber);
            }
            case ItemType.Melee: {
                return this.type.idNumber !== player.weapons[2]?.idNumber;
            }
            case ItemType.Healing:
            case ItemType.Ammo: {
                const idString = this.type.idString;
                const currentCount: number = player.items[idString];
                const maxCapacity: number = MaxInventoryCapacity[idString];
                return currentCount + 1 <= maxCapacity;
            }
        }
        return false;
    }
}
