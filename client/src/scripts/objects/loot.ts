import { GameConstants, ObjectCategory, ZIndexes } from "@common/constants";
import { ArmorType } from "@common/definitions/items/armors";
import { PerkCategories, PerkIds } from "@common/definitions/items/perks";
import { type LootDefinition } from "@common/definitions/loots";
import { CircleHitbox } from "@common/utils/hitbox";
import { EaseFunctions } from "@common/utils/math";
import { DefinitionType } from "@common/utils/objectDefinitions";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { type Vector } from "@common/utils/vector";
import { GameConsole } from "../console/gameConsole";
import { Game } from "../game";
import { PerkManager } from "../managers/perkManager";
import { UIManager } from "../managers/uiManager";
import { DIFF_LAYER_HITBOX_OPACITY, HITBOX_COLORS } from "../utils/constants";
import { DebugRenderer } from "../utils/debugRenderer";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
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

    constructor(id: number, data: ObjectsNetData[ObjectCategory.Loot]) {
        super(id);

        this.container.zIndex = ZIndexes.Loot;

        this.images = {
            background: new SuroiSprite(),
            item: new SuroiSprite(),
            skinFistLeft: new SuroiSprite(),
            skinFistRight: new SuroiSprite()
        };

        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.Loot], isNew = false): void {
        if (data.full) {
            const definition = this.definition = data.full.definition;
            const idString = definition.idString;
            const defType = definition.defType;

            this.container.addChild(this.images.background, this.images.item);

            if (defType === DefinitionType.Skin) {
                this.images.item
                    .setFrame(definition.baseImage ?? `${idString}_base`)
                    .setPos(0, -3)
                    .setScale(0.65)
                    .setAngle(90)
                    .setTint(definition.baseTint ?? 0xffffff);

                const skinFist = definition.fistImage ?? `${idString}_fist`;
                this.images.skinFistLeft
                    .setFrame(skinFist)
                    .setPos(22, 20)
                    .setScale(0.65)
                    .setAngle(90)
                    .setTint(definition.fistTint ?? 0xffffff);
                this.images.skinFistRight
                    .setFrame(skinFist)
                    .setPos(-22, 20)
                    .setScale(0.65)
                    .setAngle(90)
                    .setTint(definition.fistTint ?? 0xffffff);

                if (definition.grassTint) {
                    const ghillieTint = Game.colors.ghillie;
                    this.images.item.setTint(ghillieTint);
                    this.images.skinFistLeft.setTint(ghillieTint);
                    this.images.skinFistRight.setTint(ghillieTint);
                }

                this.container.addChild(this.images.skinFistLeft, this.images.skinFistRight);
            } else {
                this.images.item.setFrame(idString);
                if (defType === DefinitionType.Gun) {
                    this.images.item.setAngle(-15);
                }
            }

            const { backgroundTexture, scale } = Loot.getBackgroundAndScale(definition);
            if (backgroundTexture) {
                this.images.background.setFrame(backgroundTexture);
            } else {
                this.images.background.setVisible(false);
            }
            if (scale) this.images.item.setScale(scale);

            this.hitbox = new CircleHitbox(GameConstants.lootRadius[defType]);

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
                this.animation = Game.addTween({
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
        if (this.layer !== data.layer) {
            this.layer = data.layer;
            this.updateLayer();
        }
        this.hitbox.position = this.position;

        if (!GameConsole.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(this.position);
        }
    }

    static getBackgroundAndScale(definition?: LootDefinition): { backgroundTexture?: string, scale?: number } {
        switch (definition?.defType) {
            case DefinitionType.Gun:
                return {
                    backgroundTexture: `loot_background_gun_${definition.ammoType}`,
                    scale: 0.85
                };

            case DefinitionType.Melee:
                return {
                    backgroundTexture: "loot_background_melee",
                    scale: definition.image?.lootScale
                };

            case DefinitionType.HealingItem:
                return { backgroundTexture: "loot_background_healing" };

            case DefinitionType.Armor:
            case DefinitionType.Backpack:
            case DefinitionType.Scope:
            case DefinitionType.Skin:
                return { backgroundTexture: "loot_background_equipment" };

            case DefinitionType.Throwable:
                return { backgroundTexture: "loot_background_throwable" };

            case DefinitionType.Perk:
                return {
                    backgroundTexture: definition.mechanical
                        ? "loot_background_mechanical_perk"
                        : "loot_background_perk"
                };

            case DefinitionType.Ammo:
            default:
                return {};
        }
    }

    override updateDebugGraphics(): void {
        if (!DEBUG_CLIENT) return;

        DebugRenderer.addHitbox(
            this.hitbox,
            HITBOX_COLORS.loot,
            this.layer === Game.layer ? 1 : DIFF_LAYER_HITBOX_OPACITY
        );
    }

    override update(): void { /* bleh */ }
    override updateInterpolation(): void {
        this.updateContainerPosition();
    }

    destroy(): void {
        super.destroy();
        this.images.background.destroy();
        this.images.item.destroy();
        this.animation?.kill();
    }

    canInteract(player: Player): boolean {
        if (player.dead || player.downed) return false;

        const inventory = UIManager.inventory;
        const { weapons, lockedSlots } = inventory;
        const definition = this.definition;

        switch (definition.defType) {
            case DefinitionType.Gun: {
                let i = 0;
                for (const weapon of weapons) {
                    if (
                        weapon?.definition.defType === DefinitionType.Gun
                        && (
                            definition.idString === weapon.definition.dualVariant
                            || (
                                definition === weapon.definition
                                && weapon.definition.dualVariant
                            )
                        )
                        && !(lockedSlots & (1 << i))
                    ) {
                        return true;
                    }
                    ++i;
                }

                const activeWeaponIndex = inventory.activeWeaponIndex;
                return (!weapons[0] && !(lockedSlots & 0b01))
                    || (!weapons[1] && !(lockedSlots & 0b10))
                    || (
                        GameConstants.player.inventorySlotTypings[activeWeaponIndex] === DefinitionType.Gun
                        && definition !== weapons[activeWeaponIndex]?.definition
                        && !(lockedSlots & (1 << activeWeaponIndex))
                    );
            }
            case DefinitionType.Melee: {
                return definition !== weapons[2]?.definition && !(lockedSlots & 0b100);
            }
            case DefinitionType.HealingItem:
            case DefinitionType.Ammo:
            case DefinitionType.Throwable: {
                const { idString } = definition;

                return !(lockedSlots & 0b1000) && inventory.items[idString] + 1 <= player.equipment.backpack.maxCapacity[idString];
            }
            case DefinitionType.Armor: {
                switch (true) {
                    case definition.armorType === ArmorType.Helmet: return definition.level > player.helmetLevel;
                    case definition.armorType === ArmorType.Vest: return definition.level > player.vestLevel;
                    default: return false;
                }
            }
            case DefinitionType.Backpack: {
                return definition.level > player.backpackLevel;
            }
            case DefinitionType.Scope: {
                return inventory.items[definition.idString] === 0;
            }
            case DefinitionType.Skin: {
                return true;
            }
            case DefinitionType.Perk: {
                return !PerkManager.perks[0]?.noSwap && !PerkManager.has(definition);
            }
        }
    }
}
