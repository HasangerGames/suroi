import { DEFAULT_HEALTH, DEFAULT_INVENTORY, DEFAULT_USERNAME, INVENTORY_MAX_WEAPONS, MAX_ADRENALINE } from "../../../../common/src/constants";
import { Ammos } from "../../../../common/src/definitions/ammos";
import { Loots } from "../../../../common/src/definitions/loots";
import { Scopes, type ScopeDefinition } from "../../../../common/src/definitions/scopes";
import { type PlayerData } from "../../../../common/src/packets/updatePacket";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { type Game } from "../game";
import { UI_DEBUG_MODE } from "./constants";

function safeRound(value: number): number {
    // this looks more math-y and easier to read, so eslint can shove it
    // eslint-disable-next-line yoda
    if (0 < value && value <= 1) return 1;
    return Math.round(value);
}

/**
 * This class manages the game UI
 */
export class GameUi {
    readonly game: Game;

    name = DEFAULT_USERNAME;

    maxHealth = DEFAULT_HEALTH;
    health = DEFAULT_HEALTH;

    maxAdrenaline = MAX_ADRENALINE;
    minAdrenaline = 0;
    adrenaline = 0;

    inventory = {
        activeWeaponIndex: 0,
        weapons: new Array(INVENTORY_MAX_WEAPONS).fill(undefined) as PlayerData["inventory"]["weapons"],
        items: JSON.parse(JSON.stringify(DEFAULT_INVENTORY)),
        scope: Loots.fromString<ScopeDefinition>("1x_scope")
    };

    constructor(game: Game) {
        this.game = game;
    }

    private readonly _ui = {
        activeWeapon: $("#weapon-ammo-container"),
        activeAmmo: $("#weapon-clip-ammo"),
        killStreakIndicator: $("#killstreak-indicator-container"),
        killStreakCounter: $("#killstreak-indicator-counter"),

        weaponsContainer: $("#weapons-container"),

        minMaxAdren: $("#adrenaline-bar-min-max"),
        maxHealth: $("#health-bar-max"),

        healthBar: $("#health-bar"),
        healthBarAmount: $("#health-bar-percentage"),
        healthAnim: $("#health-bar-animation"),

        adrenalineBar: $("#adrenaline-bar"),
        adrenalineBarPercentage: $("#adrenaline-bar-percentage")
    };

    updateUi(data: PlayerData): void {
        if (data.id) this.game.activePlayerID = data.id;

        if (data.zoom) this.game.camera.zoom = data.zoom;

        if (data.dirty.maxMinStats) {
            this.maxHealth = data.maxHealth;
            this.minAdrenaline = data.minAdrenaline;
            this.maxAdrenaline = data.maxAdrenaline;

            if (this.maxHealth === DEFAULT_HEALTH) {
                this._ui.maxHealth.text("").hide();
            } else {
                this._ui.maxHealth.text(safeRound(this.maxHealth)).show();
            }

            if (
                this.maxAdrenaline === MAX_ADRENALINE &&
                this.minAdrenaline === 0
            ) {
                this._ui.minMaxAdren.text("").hide();
            } else {
                this._ui.minMaxAdren.text(`${this.minAdrenaline === 0 ? "" : `${safeRound(this.minAdrenaline)}/`}${safeRound(this.maxAdrenaline)}`).show();
            }
        }

        if (data.dirty.health) {
            const oldHealth = this.health;
            this.health = data.health;

            const realPercentage = 100 * this.health / this.maxHealth;
            const percentage = safeRound(realPercentage);

            this._ui.healthBar.width(`${realPercentage}%`);

            if (oldHealth > this.health) this._ui.healthAnim.width(`${realPercentage}%`);

            this._ui.healthBarAmount.text(safeRound(this.health));

            if (percentage === 100) {
                this._ui.healthBar.css("background-color", "#bdc7d0");
            } else if (percentage < 60 && percentage > 25) {
                this._ui.healthBar.css("background-color", `rgb(255, ${(percentage - 10) * 4}, ${(percentage - 10) * 4})`);
            } else if (percentage <= 25) {
                this._ui.healthBar.css("background-color", "#ff0000");
            } else {
                this._ui.healthBar.css("background-color", "#f8f9fa");
            }
            this._ui.healthBar.toggleClass("flashing", percentage <= 25);

            this._ui.healthBarAmount.css("color", percentage <= 40 ? "#ffffff" : "#000000");
        }

        if (data.dirty.adrenaline) {
            this.adrenaline = data.adrenaline;

            const percentage = 100 * this.adrenaline / this.maxAdrenaline;

            this._ui.adrenalineBar.width(`${percentage}%`);

            this._ui.adrenalineBarPercentage.text(safeRound(this.adrenaline))
                .css("color", this.adrenaline < 7 ? "#ffffff" : "#000000");
        }

        const inventory = data.inventory;

        if (inventory.weapons) {
            this.inventory.weapons = inventory.weapons;
            this.inventory.activeWeaponIndex = inventory.activeWeaponIndex;
            this._updateWeapons();
        }

        if (inventory.items) {
            this.inventory.items = inventory.items;
            this.inventory.scope = inventory.scope;
            this._updateItems();
        }
    }

    private _updateWeapons(): void {
        const inventory = this.inventory;

        const activeIndex = inventory.activeWeaponIndex;

        const activeWeapon = inventory.weapons[activeIndex];

        if (activeWeapon?.ammo === undefined || UI_DEBUG_MODE) {
            this._ui.activeWeapon.hide();
        } else {
            this._ui.activeWeapon.show();
            const ammo = activeWeapon?.ammo;
            this._ui.activeAmmo.text(ammo).css("color", ammo > 0 ? "inherit" : "red");

            if (activeWeapon.definition.itemType === ItemType.Gun) {
                const ammoType = activeWeapon.definition.ammoType;
                let totalAmmo: number | string = this.inventory.items[ammoType];

                for (const ammo of Ammos) {
                    if (ammo.idString === ammoType && ammo.ephemeral) {
                        totalAmmo = "∞";
                        break;
                    }
                }

                $("#weapon-inventory-ammo").text(totalAmmo).css("visibility", totalAmmo === 0 ? "hidden" : "visible");
            }
        }

        if (activeWeapon?.kills === undefined) { // killstreaks
            this._ui.killStreakIndicator.hide();
        } else {
            this._ui.killStreakIndicator.show();
            this._ui.killStreakCounter.text(`Streak: ${activeWeapon?.kills}`);
        }

        for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
            const container = $(`#weapon-slot-${i + 1}`);

            const weapon = inventory.weapons[i];

            if (weapon) {
                container.addClass("has-item");

                container.children(".item-name").text(weapon.definition.name);
                container.children(".item-image").attr(
                    "src",
                    `./img/game/weapons/${weapon.definition.idString}.svg`).show();

                if (weapon.ammo !== undefined) {
                    container.children(".item-ammo").text(weapon.ammo)
                        .css("color", weapon.ammo > 0 ? "inherit" : "red");
                }
            } else {
                container.removeClass("has-item");
                container.children(".item-name").text("");
                container.children(".item-image").removeAttr("src").hide();
                container.children(".item-ammo").text("");
            }
        }

        this._ui.weaponsContainer.children(".inventory-slot").removeClass("active");
        $(`#weapon-slot-${this.inventory.activeWeaponIndex + 1}`).addClass("active");
    }

    private _updateItems(): void {
        const scopeNames = Scopes.map(sc => sc.idString);

        for (const item in this.inventory.items) {
            const count = this.inventory.items[item];

            $(`#${item}-count`).text(count);

            const itemSlot = $(`#${item}-slot`);
            if (this.game.activePlayer) {
                const backpack = this.game.activePlayer.equipment.backpack;
                itemSlot.toggleClass("full", count >= backpack.maxCapacity[item]);
            }
            itemSlot.toggleClass("has-item", count > 0);

            if (scopeNames.includes(item) && !UI_DEBUG_MODE) {
                itemSlot.toggle(count > 0).removeClass("active");
            }
        }

        $(`#${this.inventory.scope.idString}-slot`).addClass("active");
    }
}
