import { isMobile } from "pixi.js";
import { InputActions, INVENTORY_MAX_WEAPONS } from "../../../../common/src/constants";
import { Ammos } from "../../../../common/src/definitions/ammos";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { HealingItems, type HealingItemDefinition } from "../../../../common/src/definitions/healingItems";
import { Loots, type LootDefinition } from "../../../../common/src/definitions/loots";
import { Scopes, type ScopeDefinition } from "../../../../common/src/definitions/scopes";
import { absMod, clamp } from "../../../../common/src/utils/math";
import { ItemType, reifyDefinition } from "../../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { v } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { consoleVariables } from "./console/variables";
import { EmoteSlot, UI_DEBUG_MODE } from "./constants";

/**
 * This class manages the active player data and inventory
 */
export class PlayerManager {
    readonly game: Game;

    name!: string;

    static readonly defaultMaxHealth = 100;
    static readonly defaultMinAdrenaline = 0;
    static readonly defaultMaxAdrenaline = 100;

    maxHealth = PlayerManager.defaultMaxHealth;
    health = this.maxHealth;

    maxAdrenaline = PlayerManager.defaultMaxAdrenaline;
    minAdrenaline = PlayerManager.defaultMinAdrenaline;
    adrenaline = 0;

    get isMobile(): boolean {
        return isMobile.any && consoleVariables.get.builtIn("mb_controls_enabled").value;
    }

    readonly movement = (() => {
        let up = false;
        let left = false;
        let down = false;
        let right = false;
        let moving = false;

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const T = this;

        return {
            get up() { return up; },
            set up(u: boolean) {
                up = u;
                T.dirty.inputs = true;
            },

            get left() { return left; },
            set left(l: boolean) {
                left = l;
                T.dirty.inputs = true;
            },

            get down() { return down; },
            set down(d: boolean) {
                down = d;
                T.dirty.inputs = true;
            },

            get right() { return right; },
            set right(r: boolean) {
                right = r;
                T.dirty.inputs = true;
            },

            get moving() { return moving; },
            set moving(m: boolean) {
                moving = m;
                T.dirty.inputs = true;
            }

        };
    })();

    // had to put it here because it's not a boolean
    // and inputManager assumes all keys of `movement` are booleans
    movementAngle = 0;

    mouseX = 0;
    mouseY = 0;

    emoteWheelActive = false;
    emoteWheelPosition = v(0, 0);
    selectedEmoteSlot = EmoteSlot.None;

    readonly dirty = {
        health: true,
        adrenaline: true,
        inputs: true
    };

    rotation = 0;

    private _action = InputActions.None;
    get action(): InputActions { return this._action; }
    set action(value) {
        this._action = value;
        this.dirty.inputs = true;
    }

    itemToSwitch = -1;
    itemToDrop = -1;
    consumableToConsume?: HealingItemDefinition | ScopeDefinition;

    private _attacking = false;
    get attacking(): boolean { return this._attacking; }
    set attacking(attacking: boolean) {
        this._attacking = attacking;
        this.dirty.inputs = true;
    }

    resetAttacking = false;

    turning = false;

    zoom = 48;

    readonly itemKills: Array<number | undefined> = new Array(INVENTORY_MAX_WEAPONS).fill(undefined);

    readonly items: Record<string, number> = {};

    scope!: ScopeDefinition;

    readonly weapons = new Array<LootDefinition | undefined>(INVENTORY_MAX_WEAPONS);

    readonly weaponsAmmo = new Array<number>(INVENTORY_MAX_WEAPONS);

    private _lastItemIndex = 0;
    get lastItemIndex(): number { return this._lastItemIndex; }

    private _activeItemIndex = 2;
    get activeItemIndex(): number { return this._activeItemIndex; }
    set activeItemIndex(i: number) {
        if (this._lastItemIndex !== this._activeItemIndex) this._lastItemIndex = this._activeItemIndex;
        this._activeItemIndex = i;
    }

    equipItem(i: number): void {
        this.action = InputActions.EquipItem;
        this.itemToSwitch = i;
    }

    dropItem(i: number): void {
        this.action = InputActions.DropItem;
        this.itemToDrop = i;
    }

    swapGunSlots(): void {
        this.action = InputActions.SwapGunSlots;
    }

    interact(): void {
        this.action = InputActions.Interact;
    }

    reload(): void {
        this.action = InputActions.Reload;
    }

    cancelAction(): void {
        this.action = InputActions.Cancel;
    }

    useItem(item: HealingItemDefinition | ScopeDefinition): void {
        this.action = InputActions.UseConsumableItem;
        this.consumableToConsume = item;
    }

    cycleScope(offset: number): void {
        const scopeId = Scopes.indexOf(this.scope);
        let scopeString = this.scope.idString;
        let searchIndex = scopeId;

        let iterationCount = 0;
        // Prevent possible infinite loops
        while (iterationCount++ < 100) {
            searchIndex = consoleVariables.get.builtIn("cv_loop_scope_selection").value
                ? absMod(searchIndex + offset, Scopes.length)
                : clamp(0, Scopes.length - 1, searchIndex + offset);

            const scopeCandidate = Scopes[searchIndex].idString;
            if (this.items[scopeCandidate]) {
                scopeString = scopeCandidate;
                break;
            }
        }

        if (scopeString !== this.scope.idString) this.useItem(reifyDefinition<ScopeDefinition>(scopeString, Scopes));
    }

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
        if (!(this.weapons[this.activeItemIndex]?.itemType === ItemType.Gun || UI_DEBUG_MODE)) {
            $("#weapon-ammo-container").hide();
        } else {
            $("#weapon-ammo-container").show();
            const ammo = this.weaponsAmmo[this.activeItemIndex];
            $("#weapon-clip-ammo").text(ammo).css("color", ammo > 0 ? "inherit" : "red");

            const ammoType = (this.weapons[this.activeItemIndex] as GunDefinition).ammoType;
            let totalAmmo: number | string = this.items[ammoType];

            for (const ammo of Ammos) {
                if (ammo.idString === ammoType && ammo.ephemeral) {
                    totalAmmo = "∞";
                    break;
                }
            }

            $("#weapon-inventory-ammo").text(totalAmmo).css("visibility", totalAmmo === 0 ? "hidden" : "visible");
        }

        const kills = this.itemKills[this._activeItemIndex];
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
            this.activeItemIndex = stream.readBits(2);
            $("#weapons-container").children(".inventory-slot").removeClass("active");
            $(`#weapon-slot-${this.activeItemIndex + 1}`).addClass("active");
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
