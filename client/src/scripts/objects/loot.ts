import { ObjectCategory, ZIndexes } from "@common/constants";
import { ArmorType } from "@common/definitions/armors";
import { type LootDefinition } from "@common/definitions/loots";
import { PerkIds } from "@common/definitions/perks";
import { CircleHitbox } from "@common/utils/hitbox";
import { getEffectiveZIndex } from "@common/utils/layer";
import { EaseFunctions } from "@common/utils/math";
import { ItemType, LootRadius } from "@common/utils/objectDefinitions";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { type Vector } from "@common/utils/vector";
import { type Game } from "../game";
import { DIFF_LAYER_HITBOX_OPACITY, GHILLIE_TINT, HITBOX_COLORS, HITBOX_DEBUG_MODE } from "../utils/constants";
import { SuroiSprite, drawHitbox, toPixiCoords } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { GameObject } from "./gameObject";
import { type Player } from "./player";

export class Loot extends GameObject.derive(ObjectCategory.Loot) {
    definition!: LootDefinition;

    readonly images: {
        readonly background: SuroiSprite
        readonly item: SuroiSprite
        readonly skinFistLeft: SuroiSprite
        readonly skinFistRight: SuroiSprite
    };

    private _count = 0;
    get count(): number { return this._count; }

    hitbox!: CircleHitbox;

    animation?: Tween<Vector>;

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.Loot]) {
        super(game, id);

        this.images = {
            background: new SuroiSprite(),
            item: new SuroiSprite(),
            skinFistLeft: new SuroiSprite(),
            skinFistRight: new SuroiSprite()
        };

        this.layer = data.layer;

        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Loot], isNew = false): void {
        if (data.full) {
            const definition = this.definition = data.full.definition;
            const itemType = definition.itemType;

            this.container.addChild(this.images.background, this.images.item);

            if (itemType === ItemType.Skin) {
                this.images.item
                    .setFrame(`${this.definition.idString}_base`)
                    .setPos(0, -3)
                    .setScale(0.65)
                    .setAngle(90);

                const skinFist = `${this.definition.idString}_fist`;
                this.images.skinFistLeft
                    .setFrame(skinFist)
                    .setPos(22, 20)
                    .setScale(0.65)
                    .setAngle(90);
                this.images.skinFistRight
                    .setFrame(skinFist)
                    .setPos(-22, 20)
                    .setScale(0.65)
                    .setAngle(90);

                if (definition.grassTint) {
                    this.images.item.setTint(GHILLIE_TINT);
                    this.images.skinFistLeft.setTint(GHILLIE_TINT);
                    this.images.skinFistRight.setTint(GHILLIE_TINT);
                }

                this.container.addChild(this.images.skinFistLeft, this.images.skinFistRight);
            } else {
                this.images.item.setFrame(definition.idString);
            }

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
                case ItemType.Throwable: {
                    backgroundTexture = "loot_background_throwable";
                    break;
                }
                case ItemType.Perk: {
                    // FIXME bad
                    backgroundTexture = definition.idString === PerkIds.PlumpkinGamble
                        ? "loot_background_plumpkin_gamble"
                        : "loot_background_perk";
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
                the server is Infinity (or NaN lol) (or a decimal number, lmao)
            */
            this._count = data.full.count || Infinity;

            // Play an animation if this is new loot
            if (data.full.isNew && isNew) {
                this.container.scale.set(0);
                this.animation = this.game.addTween({
                    target: this.container.scale,
                    to: { x: 1, y: 1 },
                    duration: 1000,
                    ease: EaseFunctions.elasticOut2,
                    onComplete: () => {
                        this.animation = undefined;
                    }
                });
            }
        }

        this.position = data.position;
        this.layer = data.layer;
        this.hitbox.position = this.position;

        this.updateZIndex();

        if (!this.game.console.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(this.position);
        }

        this.updateDebugGraphics();
    }

    override updateZIndex(): void {
        this.container.zIndex = getEffectiveZIndex(this.doOverlay() ? ZIndexes.UnderWaterLoot : ZIndexes.Loot, this.layer, this.game.layer);
    }

    override updateDebugGraphics(): void {
        if (!HITBOX_DEBUG_MODE) return;

        this.debugGraphics.clear();
        drawHitbox(
            this.hitbox,
            HITBOX_COLORS.loot,
            this.debugGraphics,
            this.layer === this.game.activePlayer?.layer as number | undefined ? 1 : DIFF_LAYER_HITBOX_OPACITY
        );
    }

    destroy(): void {
        super.destroy();
        this.images.background.destroy();
        this.images.item.destroy();
        this.animation?.kill();
    }

    canInteract(player: Player): boolean {
        if (player.dead || player.downed) return false;

        const inventory = this.game.uiManager.inventory;
        const { weapons, lockedSlots } = inventory;
        const definition = this.definition;

        switch (definition.itemType) {
            case ItemType.Gun: {
                for (const weapon of weapons) {
                    if (
                        weapon?.definition.itemType === ItemType.Gun
                        && (
                            definition.idString === weapon.definition.dualVariant
                            || (
                                definition === weapon.definition
                                && weapon.definition.dualVariant
                            )
                        )
                    ) {
                        return true;
                    }
                }

                const activeWeaponIndex = inventory.activeWeaponIndex;
                return (!weapons[0] && !(lockedSlots & 0b01))
                    || (!weapons[1] && !(lockedSlots & 0b10))
                    || (activeWeaponIndex < 2 && definition !== weapons[activeWeaponIndex]?.definition && !(lockedSlots & (1 << activeWeaponIndex)));
            }
            case ItemType.Melee: {
                return definition !== weapons[2]?.definition && !(lockedSlots & 0b100);
            }
            case ItemType.Healing:
            case ItemType.Ammo:
            case ItemType.Throwable: {
                const { idString } = definition;

                return !(lockedSlots & 0b1000) && inventory.items[idString] + 1 <= player.equipment.backpack.maxCapacity[idString];
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
            case ItemType.Perk: {
                const perks = this.game.uiManager.perks;
                return !perks.asList()[0]?.noSwap && !perks.hasItem(definition);
            }
        }
    }
}
