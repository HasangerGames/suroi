import { INVENTORY_MAX_WEAPONS } from "../../../../common/src/constants";
import { Ammos } from "../../../../common/src/definitions/ammos";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { HealingItems } from "../../../../common/src/definitions/healingItems";
import { Loots, type LootDefinition } from "../../../../common/src/definitions/loots";
import { Scopes, type ScopeDefinition } from "../../../../common/src/definitions/scopes";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Game } from "../game";
import { UI_DEBUG_MODE } from "./constants";

/**
 * This class manages the active player data and inventory
 */
export class PlayerManager {
    readonly game: Game;

    name!: string;

    // TODO: move to a common constant to sync with server
    static readonly defaultMaxHealth = 100;
    static readonly defaultMinAdrenaline = 0;
    static readonly defaultMaxAdrenaline = 100;

    maxHealth = PlayerManager.defaultMaxHealth;
    health = this.maxHealth;

    maxAdrenaline = PlayerManager.defaultMaxAdrenaline;
    minAdrenaline = PlayerManager.defaultMinAdrenaline;
    adrenaline = 0;

    zoom = 48;

    readonly itemKills: Array<number | undefined> = new Array(INVENTORY_MAX_WEAPONS).fill(undefined);

    readonly items: Record<string, number> = {};

    scope!: ScopeDefinition;

    readonly weapons = new Array<LootDefinition | undefined>(INVENTORY_MAX_WEAPONS);

    readonly weaponsAmmo = new Array<number>(INVENTORY_MAX_WEAPONS);

    constructor(game: Game) {
        this.game = game;

        for (const item of [...HealingItems, ...Ammos, ...Scopes]) {
            let amount = 0;

            switch (true) {
                case item.itemType === ItemType.Ammo && item.ephemeral: amount = Infinity; break;
                case item.itemType === ItemType.Scope && item.giveByDefault: amount = 1; break;
            }

            this.items[item.idString] = amount;
        }
    }

    private _updateActiveWeaponUi(): void {
        const activeIndex = this.game.inputManager.activeItemIndex;
        if (!(this.weapons[activeIndex]?.itemType === ItemType.Gun || UI_DEBUG_MODE)) {
            $("#weapon-ammo-container").hide();
        } else {
            $("#weapon-ammo-container").show();
            const ammo = this.weaponsAmmo[activeIndex];
            $("#weapon-clip-ammo").text(ammo).css("color", ammo > 0 ? "inherit" : "red");

            const ammoType = (this.weapons[activeIndex] as GunDefinition).ammoType;
            let totalAmmo: number | string = this.items[ammoType];

            for (const ammo of Ammos) {
                if (ammo.idString === ammoType && ammo.ephemeral) {
                    totalAmmo = "∞";
                    break;
                }
            }

            $("#weapon-inventory-ammo").text(totalAmmo).css("visibility", totalAmmo === 0 ? "hidden" : "visible");
        }

        const kills = this.itemKills[activeIndex];
        if (kills === undefined) { // killstreaks
            $("#killstreak-indicator-container").hide();
        } else {
            $("#killstreak-indicator-container").show();
            $("#killstreak-indicator-counter").text(`Streak: ${kills}`);
        }
    }

    deserializeInventory(stream: SuroiBitStream): void {
        // TODO: clean up this mess lmfao
        // Weapons dirty
        const weaponsDirty = stream.readBoolean();
        if (weaponsDirty) {
            for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
                const container = $(`#weapon-slot-${i + 1}`);
                if (stream.readBoolean()) {
                    // if the slot is not empty
                    container.addClass("has-item");
                    const item = Loots.definitions[stream.readUint8()];

                    this.weapons[i] = item;
                    container.children(".item-name").text(item.name);
                    container.children(".item-image").attr("src", `./img/game/weapons/${item.idString}.svg`).show();

                    if (item.itemType === ItemType.Gun) {
                        const ammo = stream.readUint8();
                        this.weaponsAmmo[i] = ammo;

                        container.children(".item-ammo").text(ammo)
                            .css("color", ammo > 0 ? "inherit" : "red");
                    }

                    this.itemKills[i] = stream.readBoolean() ? stream.readUint8() : undefined;
                } else {
                    // empty slot
                    this.itemKills[i] = this.weapons[i] = undefined;
                    container.removeClass("has-item");
                    container.children(".item-name").text("");
                    container.children(".item-image").removeAttr("src").hide();
                    container.children(".item-ammo").text("");
                }
            }
        }

        // Active item index
        const activeWeaponIndexDirty = stream.readBoolean();
        if (activeWeaponIndexDirty) {
            this.game.inputManager.activeItemIndex = stream.readBits(2);
            $("#weapons-container").children(".inventory-slot").removeClass("active");
            $(`#weapon-slot-${this.game.inputManager.activeItemIndex + 1}`).addClass("active");
        }

        // Inventory dirty
        const inventoryDirty = stream.readBoolean();
        if (inventoryDirty) {
            const backpackLevel = stream.readBits(2);
            const scopeNames = Scopes.map(sc => sc.idString);
            const adjustItemUi = (itemName: string, count: number): void => {
                const num = count;
                this.items[itemName] = num;

                $(`#${itemName}-count`).text(num);

                const itemSlot = $(`#${itemName}-slot`);
                itemSlot.toggleClass("full", num >= Backpacks[backpackLevel].maxCapacity[itemName]);
                itemSlot.toggleClass("has-item", num > 0);

                if (scopeNames.includes(itemName) && !UI_DEBUG_MODE) {
                    itemSlot.toggle(num > 0).removeClass("active");
                }
            };

            const amount = stream.readBoolean() ? 0 : undefined;
            //             ^^^^^^^^^^^^^^^^^^^^^^^^ Dead owner => everything is 0
            for (const item in this.items) {
                adjustItemUi(item, amount ?? (stream.readBoolean() ? stream.readBits(9) : 0));
            }

            this.scope = Scopes[stream.readUint8()];
            $(`#${this.scope.idString}-slot`).addClass("active");
        }

        if (
            weaponsDirty ||
            activeWeaponIndexDirty ||
            inventoryDirty
        ) {
            this._updateActiveWeaponUi();
        }
    }
}
