import core from "../core";
import { type Game } from "../game";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import {
    INVENTORY_MAX_WEAPONS, ObjectCategory, InputActions
} from "../../../../common/src/constants";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { localStorageInstance } from "./localStorageHandler";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { ItemPacket } from "../packets/sending/itemPacket";
import { type ScopeDefinition, Scopes } from "../../../../common/src/definitions/scopes";
import { mod } from "../../../../common/src/utils/math";
import { Ammos } from "../../../../common/src/definitions/ammos";
import { HealingItems } from "../../../../common/src/definitions/healingItems";
import { EmoteSlot, UI_DEBUG_MODE } from "./constants";
import { v } from "../../../../common/src/utils/vector";

/**
 * This class manages the active player data and inventory
 */
export class PlayerManager {
    game: Game;

    name!: string;

    maxHealth = 100;
    health = this.maxHealth;

    maxAdrenaline = 100;
    minAdrenaline = 0;
    adrenaline = 0;

    get isMobile(): boolean {
        return this.isActuallyMobile && localStorageInstance.config.mobileControls;
    }

    get isActuallyMobile(): boolean {
        return core.phaser !== undefined && !core.phaser.device.os.desktop;
    }

    readonly movement = {
        up: false,
        left: false,
        down: false,
        right: false,
        // mobile
        moving: false
    };

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

    action = InputActions.None;
    itemToSwitch = 0;
    itemToDrop = 0;

    private _attacking = false;
    get attacking(): boolean { return this._attacking; }
    set attacking(attacking: boolean) {
        this._attacking = attacking;
        this.dirty.inputs = true;
    }

    turning = false;

    zoom = 48;

    // Shove it
    /* eslint-disable @typescript-eslint/indent */
    readonly items: Record<string, number> = [HealingItems, Ammos, Scopes]
        .flat()
        .reduce<Record<string, number>>(
            (acc, cur) => {
                let amount = 0;

                if (cur.itemType === ItemType.Ammo && cur.ephemeral) {
                    amount = Infinity;
                }

                if (cur.itemType === ItemType.Scope && cur.giveByDefault) {
                    amount = 1;
                }

                acc[cur.idString] = amount;

                return acc;
            },
            {}
        );

    scope!: ObjectType<ObjectCategory.Loot, ScopeDefinition>;

    readonly weapons = new Array<ObjectType<ObjectCategory.Loot, LootDefinition> | undefined>(INVENTORY_MAX_WEAPONS);

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
        this.dirty.inputs = true;
    }

    dropItem(i: number): void {
        this.action = InputActions.DropItem;
        this.itemToDrop = i;
        this.dirty.inputs = true;
    }

    swapGunSlots(): void {
        this.action = InputActions.SwapGunSlots;
        this.dirty.inputs = true;
    }

    interact(): void {
        this.action = InputActions.Interact;
        this.dirty.inputs = true;
    }

    reload(): void {
        this.action = InputActions.Reload;
        this.dirty.inputs = true;
    }

    cancelAction(): void {
        this.action = InputActions.Cancel;
        this.dirty.inputs = true;
    }

    useItem(item: string): void {
        this.game.sendPacket(new ItemPacket(this, ObjectType.fromString(ObjectCategory.Loot, item)));
    }

    switchScope(direction: number): void {
        const scopeId = Scopes.indexOf(this.scope.definition);
        let scopeString = this.scope.idString;
        for (let i = mod(scopeId + direction, Scopes.length); i < Scopes.length && i >= 0; i += direction) {
            if (this.items[Scopes[i].idString]) {
                scopeString = Scopes[i].idString;
                break;
            }
        }
        if (scopeString !== this.scope.idString) this.useItem(scopeString);
    }

    constructor(game: Game) {
        this.game = game;
    }

    private updateActiveWeaponAmmoUi(): void {
        if (!(this.weapons[this.activeItemIndex]?.definition.itemType === ItemType.Gun || UI_DEBUG_MODE)) {
            $("#weapon-ammo-container").hide();
            return;
        }

        $("#weapon-ammo-container").show();
        const ammo = this.weaponsAmmo[this.activeItemIndex];
        $("#weapon-clip-ammo").text(ammo).css("color", ammo > 0 ? "inherit" : "red");

        const ammoType = (this.weapons[this.activeItemIndex]?.definition as GunDefinition).ammoType;
        let totalAmmo: number | string = this.items[ammoType];

        for (const ammo of Ammos) {
            if (ammo.idString === ammoType && ammo.ephemeral) {
                totalAmmo = "∞";
                break;
            }
        }

        $("#weapon-inventory-ammo").text(totalAmmo);
    }

    deserializeInventory(stream: SuroiBitStream): void {
        // TODO: clean up this mess lmfao
        // Weapons dirty
        if (stream.readBoolean()) {
            for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
                const container = $(`#weapon-slot-${i + 1}`);
                if (stream.readBoolean()) {
                    // if the slot is not empty
                    container.addClass("has-item");
                    const item = stream.readObjectTypeNoCategory<ObjectCategory.Loot, LootDefinition>(ObjectCategory.Loot);

                    this.weapons[i] = item;
                    container.children(".item-name").text(item.definition.name);
                    const itemDef = item.definition;
                    container.children(".item-image").attr("src", `/img/game/weapons/${itemDef.idString}.svg`).show();

                    if (itemDef.itemType === ItemType.Gun) {
                        const ammo = stream.readUint8();
                        this.weaponsAmmo[i] = ammo;

                        container.children(".item-ammo").text(ammo)
                            .css("color", ammo > 0 ? "inherit" : "red");
                    }
                } else {
                    // empty slot
                    this.weapons[i] = undefined;
                    container.removeClass("has-item");
                    container.children(".item-name").text("");
                    container.children(".item-image").removeAttr("src").hide();
                    container.children(".item-ammo").text("");
                }
            }
            this.updateActiveWeaponAmmoUi();
        }

        // Active item index
        if (stream.readBoolean()) {
            this.activeItemIndex = stream.readBits(2);
            $("#weapons-container").children(".inventory-slot").removeClass("active");
            const slotContainer = $(`#weapon-slot-${this.activeItemIndex + 1}`);
            slotContainer.addClass("active");

            this.updateActiveWeaponAmmoUi();
        }

        // Inventory dirty
        if (stream.readBoolean()) {
            const backpackLevel = stream.readBits(2);
            const readInventoryCount = (): number => stream.readBoolean() ? stream.readBits(9) : 0;

            for (const item in this.items) {
                const num = readInventoryCount();
                this.items[item] = num;

                $(`#${item}-count`).text(num);

                const itemSlot = $(`#${item}-slot`);
                itemSlot.toggleClass("full", num >= Backpacks[backpackLevel].maxCapacity[item]);
                itemSlot.toggleClass("has-item", num > 0);

                if (item.includes("scope") && !UI_DEBUG_MODE) {
                    itemSlot.toggle(num > 0).removeClass("active");
                }
            }

            this.scope = stream.readObjectTypeNoCategory(ObjectCategory.Loot);
            $(`#${this.scope.idString}-slot`).addClass("active");

            this.updateActiveWeaponAmmoUi();
        }
    }
}
