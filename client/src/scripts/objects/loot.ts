import { ArmorType, type ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type AmmoDefinition } from "../../../../common/src/definitions/ammos";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { ItemType, LootRadius } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { drawHitbox, SuroiSprite, toPixiCoords } from "../utils/pixi";
import { type PlayerManager } from "../utils/playerManager";
import { EaseFunctions, Tween } from "../utils/tween";

export class Loot extends GameObject {
    declare readonly type: ObjectType<ObjectCategory.Loot, LootDefinition>;

    readonly images: {
        readonly background: SuroiSprite
        readonly item: SuroiSprite
    };

    created = false;

    count = 0;

    hitbox: CircleHitbox;

    animation?: Tween<Vector>;

    constructor(game: Game, type: ObjectType, id: number) {
        super(game, type, id);

        const definition = this.type.definition;

        this.images = {
            background: new SuroiSprite(),
            item: new SuroiSprite(`${this.type.idString}${definition.itemType === ItemType.Skin ? "_base" : ""}`)
        };

        if (definition.itemType === ItemType.Skin) this.images.item.setAngle(90).scale.set(0.75);

        this.container.addChild(this.images.background, this.images.item);

        this.container.zIndex = ZIndexes.Loot;

        // Set the loot texture based on the type
        let backgroundTexture: string | undefined;
        switch (definition.itemType) {
            case ItemType.Gun: {
                backgroundTexture = `loot_background_gun_${definition.ammoType}`;
                this.images.item.scale.set(0.85);
                break;
            }
            //
            // No background for ammo
            //
            case ItemType.Melee: {
                backgroundTexture = "loot_background_melee";
                const imageScale = definition.image?.lootScale;
                if (imageScale !== undefined) this.images.item.scale.set(imageScale);
                break;
            }
            case ItemType.Healing: {
                backgroundTexture = "loot_background_healing";
                break;
            }
            case ItemType.Armor:
            case ItemType.Backpack:
            case ItemType.Scope:
            case ItemType.Skin: {
                backgroundTexture = "loot_background_equipment";
                break;
            }
        }
        if (backgroundTexture !== undefined) {
            this.images.background.setFrame(backgroundTexture);
        } else {
            this.images.background.setVisible(false);
        }

        this.hitbox = new CircleHitbox(LootRadius[definition.itemType]);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Loot]): void {
        this.position = data.position;
        this.hitbox.position = this.position;

        const pos = toPixiCoords(this.position);
        this.container.position.copyFrom(pos);

        if (data.fullUpdate) {
            this.count = data.count;

            // Play an animation if this is new loot
            if (data.isNew) {
                this.container.scale.set(0.5);
                this.animation = new Tween(this.game, {
                    target: this.container.scale,
                    to: { x: 1, y: 1 },
                    duration: 1000,
                    ease: EaseFunctions.elasticOut
                });
            }
        }
        this.created = true;

        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics.clear();
            drawHitbox(this.hitbox, HITBOX_COLORS.loot, this.debugGraphics);
        }
    }

    destroy(): void {
        this.animation?.kill();
        super.destroy();
    }

    canInteract(player: PlayerManager): boolean {
        const activePlayer = this.game.activePlayer;
        if (!activePlayer) return false;
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
                return (definition as AmmoDefinition).ephemeral ?? currentCount + 1 <= maxCapacity;
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
            case ItemType.Skin: {
                return true;
            }
        }
    }
}
