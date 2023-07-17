import type Phaser from "phaser";
import gsap from "gsap";

import type { Game } from "../game";
import type { GameScene } from "../scenes/gameScene";
import { GameObject } from "../types/gameObject";

import { ArmorType, LootRadius, type ObjectCategory } from "../../../../common/src/constants";
import type { SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import type { ObjectType } from "../../../../common/src/utils/objectType";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import type { LootDefinition } from "../../../../common/src/definitions/loots";
import { type PlayerManager } from "../utils/playerManager";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { type AmmoDefinition } from "../../../../common/src/definitions/ammos";

export class Loot extends GameObject<ObjectCategory.Loot, LootDefinition> {
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

        this.container.add([this.images.background, this.images.item]).setDepth(2);

        // Set the loot texture based on the type
        const definition = this.type.definition;
        let backgroundTexture: string | undefined;
        switch (definition.itemType) {
            case ItemType.Gun: {
                backgroundTexture = `loot_background_gun_${definition.ammoType}.svg`;
                this.images.item.setScale(0.85);
                break;
            }
            //
            // No background for ammo
            //
            case ItemType.Melee: {
                backgroundTexture = "loot_background_melee.svg";
                const imageScale = definition.image?.lootScale;
                if (imageScale !== undefined) this.images.item.setScale(imageScale);
                break;
            }
            case ItemType.Healing: {
                backgroundTexture = "loot_background_healing.svg";
                break;
            }
            case ItemType.Armor:
            case ItemType.Backpack:
            case ItemType.Scope: {
                backgroundTexture = "loot_background_equipment.svg";
                break;
            }
        }
        if (backgroundTexture !== undefined) {
            this.images.background.setTexture("main", backgroundTexture);
        } else {
            this.images.background.setVisible(false);
            // fixme Figure out why destroy doesn't work
            // I think you can't destroy a container child without destroying the container first
            // - Leo
        }

        this.radius = LootRadius[(this.type.definition).itemType];
    }

    override deserializePartial(stream: SuroiBitStream): void {
        this.position = stream.readPosition();
    }

    override deserializeFull(stream: SuroiBitStream): void {
        // Loot should only be fully updated on creation
        if (this.created) {
            console.warn("Full update of existing loot");
        }

        this.count = stream.readBits(9);
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
        const activePlayer = this.game.activePlayer;
        const definition = this.type.definition;

        switch (definition.itemType) {
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
                const currentCount = player.items[idString];
                const maxCapacity = Backpacks[this.game.activePlayer.backpackLevel].maxCapacity[idString];
                return (definition as AmmoDefinition).ephemeral === true || currentCount + 1 <= maxCapacity;
            }
            case ItemType.Armor: {
                if (definition.armorType === ArmorType.Helmet) return definition.level > activePlayer.helmetLevel;
                else if (definition.armorType === ArmorType.Vest) return definition.level > activePlayer.vestLevel;
                else return false;
            }
            case ItemType.Backpack: {
                return definition.level > activePlayer.backpackLevel;
            }
            case ItemType.Scope: {
                return player.items[this.type.idString] === 0;
            }
        }
        return false;
    }
}
