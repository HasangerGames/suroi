import { ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { type AmmoDefinition } from "../../../../common/src/definitions/ammos";
import { ArmorType } from "../../../../common/src/definitions/armors";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { CircleHitbox } from "../../../../common/src/utils/hitbox";
import { EaseFunctions } from "../../../../common/src/utils/math";
import { ItemType, LootRadius } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { FloorTypes } from "../../../../common/src/utils/terrain";
import { type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { GHILLIE_TINT, HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { Tween } from "../utils/tween";
import { GameObject } from "./gameObject";
import { type Player } from "./player";

export class Loot extends GameObject {
    override readonly type = ObjectCategory.Loot;
    definition!: LootDefinition;

    readonly images: {
        readonly background: SuroiSprite
        readonly item: SuroiSprite
    };

    private _count = 0;
    get count(): number { return this._count; }

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
                    if (definition.itemType === ItemType.Skin) {
                        if (definition.grassTint) {
                            this.images.item.setTint(GHILLIE_TINT);
                        }

                        this.images.item.setAngle(90).setScale(0.75);
                    }
                    break;
                }
                case ItemType.Throwable: {
                    backgroundTexture = "loot_background_throwable";
                    break;
                }
            }

            if (backgroundTexture !== undefined) {
                this.images.background.setFrame(backgroundTexture);
            } else {
                this.images.background.setVisible(false);
            }

            this.hitbox = new CircleHitbox(LootRadius[itemType]);

            /*
                Infinity is serialized as 0 in the bit stream
                0 isn't a valid count value on the server
                thus
                If we receive 0 here, it must mean the count on
                the server is Infinity (or NaN lol)
            */
            this._count = data.full.count || Infinity;

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

        const floorType = this.game.map.terrain.getFloor(this.position);

        this.container.zIndex = FloorTypes[floorType].overlay ? ZIndexes.UnderWaterLoot : ZIndexes.Loot;

        if (!this.game.console.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(this.position);
        }

        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics.clear();
            drawHitbox(this.hitbox, HITBOX_COLORS.loot, this.debugGraphics);
        }
    }

    destroy(): void {
        super.destroy();
        this.images.background.destroy();
        this.images.item.destroy();
        this.animation?.kill();
    }

    canInteract(player: Player): boolean {
        const inventory = this.game.uiManager.inventory;
        const definition = this.definition;

        switch (definition.itemType) {
            case ItemType.Gun: {
                for (const weapon of inventory.weapons) {
                    if (
                        weapon?.definition.itemType === ItemType.Gun &&
                        (
                            definition.idString === weapon.definition.dualVariant ||
                            (
                                definition === weapon.definition &&
                                weapon.definition.dualVariant
                            )
                        )
                    ) {
                        return true;
                    }
                }

                return !inventory.weapons[0] ||
                    !inventory.weapons[1] ||
                    (inventory.activeWeaponIndex < 2 && definition !== inventory.weapons[inventory.activeWeaponIndex]?.definition);
            }
            case ItemType.Melee: {
                return definition !== inventory.weapons[2]?.definition;
            }
            case ItemType.Healing:
            case ItemType.Ammo:
            case ItemType.Throwable: {
                const idString = definition.idString;

                return (definition as AmmoDefinition).ephemeral ?? (inventory.items[idString] + 1 <= player.equipment.backpack.maxCapacity[idString]);
            }
            case ItemType.Armor: {
                switch (true) {
                    case definition.armorType === ArmorType.Helmet: return definition.level > player.helmetLevel;
                    case definition.armorType === ArmorType.Vest: return definition.level > player.vestLevel;
                    default: return false;
                }
            }
            case ItemType.Backpack: {
                return definition.level > player.backpackLevel;
            }
            case ItemType.Scope: {
                return inventory.items[definition.idString] === 0;
            }
            case ItemType.Skin: {
                return true;
            }
        }
    }
}
