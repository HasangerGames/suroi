import { ArmorType, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type AmmoDefinition } from "../../../../common/src/definitions/ammos";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { ItemType, LootRadius } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { GameObject } from "../types/gameObject";
import { HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { type PlayerManager } from "../utils/playerManager";
import { EaseFunctions, Tween } from "../utils/tween";

export class Loot extends GameObject {
    override readonly type = ObjectCategory.Loot;
    definition!: LootDefinition;

    readonly images: {
        readonly background: SuroiSprite
        readonly item: SuroiSprite
    };

    count = 0;

    hitbox!: CircleHitbox;

    animation?: Tween<Vector>;

    constructor(game: Game, id: number, data: Required<ObjectsNetData[ObjectCategory.Loot]>) {
        super(game, id);

        this.images = {
            background: new SuroiSprite(),
            item: new SuroiSprite()
        };

        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Loot], isNew = false): void {
        if (data.full) {
            const definition = this.definition = data.full.definition;
            const itemType = definition.itemType;

            this.images.item.setFrame(`${definition.idString}${itemType === ItemType.Skin ? "_base" : ""}`);

            if (itemType === ItemType.Skin) this.images.item.setAngle(90).scale.set(0.75);

            this.container.addChild(this.images.background, this.images.item);

            this.container.zIndex = ZIndexes.Loot;

            // Set the loot texture based on the type
            let backgroundTexture: string | undefined;
            switch (itemType) {
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

            this.hitbox = new CircleHitbox(LootRadius[itemType]);

            this.count = data.full.count;

            // Play an animation if this is new loot
            if (data.full.isNew && isNew) {
                this.container.scale.set(0.5);
                this.animation = new Tween(this.game, {
                    target: this.container.scale,
                    to: { x: 1, y: 1 },
                    duration: 1000,
                    ease: EaseFunctions.elasticOut
                });
            }
        }

        this.position = data.position;
        this.hitbox.position = this.position;

        if (!this.game.console.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(this.position);
        }

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

        const definition = this.definition;

        switch (definition.itemType) {
            case ItemType.Gun: {
                return !player.weapons[0] ||
                    !player.weapons[1] ||
                    (this.game.inputManager.activeItemIndex < 2 && this.definition.idString !== player.weapons[this.game.inputManager.activeItemIndex]?.idString);
            }
            case ItemType.Melee: {
                return this.definition.idString !== player.weapons[2]?.idString;
            }
            case ItemType.Healing:
            case ItemType.Ammo: {
                const idString = this.definition.idString;

                return (definition as AmmoDefinition).ephemeral ?? (player.items[idString] + 1 <= Backpacks[this.game.activePlayer.backpackLevel].maxCapacity[idString]);
            }
            case ItemType.Armor: {
                switch (true) {
                    case definition.armorType === ArmorType.Helmet: return definition.level > activePlayer.helmetLevel;
                    case definition.armorType === ArmorType.Vest: return definition.level > activePlayer.vestLevel;
                    default: return false;
                }
            }
            case ItemType.Backpack: {
                return definition.level > activePlayer.backpackLevel;
            }
            case ItemType.Scope: {
                return player.items[this.definition.idString] === 0;
            }
            case ItemType.Skin: {
                return true;
            }
        }
    }
}
