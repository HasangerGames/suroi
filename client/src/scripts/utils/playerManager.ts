import core from "../core";
import { type Game } from "../game";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import {
    INVENTORY_MAX_WEAPONS, ObjectCategory, InputActions
} from "../../../../common/src/constants";
import { type MeleeDefinition } from "../../../../common/src/definitions/melees";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { localStorageInstance } from "./localStorageHandler";
import { type LootDefinition } from "../../../../common/src/definitions/loots";
import { Backpacks } from "../../../../common/src/definitions/backpacks";
import { ItemPacket } from "../packets/sending/itemPacket";
import { type ScopeDefinition, Scopes } from "../../../../common/src/definitions/scopes";
import { mod } from "../../../../common/src/utils/math";

/**
 * This class manages the active player data and inventory
 */
export class PlayerManager {
    game: Game;

    name!: string;

    private _health = 100;

    private _adrenaline = 100;

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

    readonly items: Record<string, number> = {
        gauze: 0,
        medikit: 0,
        cola: 0,
        tablets: 0,
        "12g": 0,
        "556mm": 0,
        "762mm": 0,
        "9mm": 0,
        "1x_scope": 1,
        "2x_scope": 0,
        "4x_scope": 0,
        "8x_scope": 0,
        "15x_scope": 0
    };

    scope!: ObjectType<ObjectCategory.Loot, ScopeDefinition>;

    readonly weapons = new Array<ObjectType<ObjectCategory.Loot, LootDefinition> | undefined>(INVENTORY_MAX_WEAPONS);

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

    get health(): number {
        return this._health;
    }

    set health(health: number) {
        this._health = health;
    }

    get adrenaline(): number {
        return this._adrenaline;
    }

    set adrenaline(adrenaline: number) {
        this._adrenaline = adrenaline;
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

    deserializeInventory(stream: SuroiBitStream): void {
        // Active item index
        if (stream.readBoolean()) {
            this.activeItemIndex = stream.readBits(2);
            $("#weapons-container").children(".inventory-slot").removeClass("active");
            const slotContainer = $(`#weapon-slot-${this.activeItemIndex + 1}`);
            slotContainer.addClass("active");

            $("#active-weapon-ammo").text(slotContainer.children(".item-ammo").text());
        }

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
                    const itemDef = item.definition as MeleeDefinition | GunDefinition;
                    container.children(".item-image").attr("src", `/img/game/weapons/${itemDef.idString}.svg`).show();

                    if (itemDef.itemType === ItemType.Gun) {
                        const ammo = stream.readUint8().toString();
                        const gunDef = item.definition as GunDefinition;
                        const ammoText = (`${ammo === "0" ? '<span style="color: #ff0000">0</span>' : ammo} / ${gunDef.capacity}`);
                        container.children(".item-ammo").html(ammoText);
                        if (i === this.activeItemIndex) $("#active-weapon-ammo").html(ammoText);
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
        }

        // Inventory dirty
        if (stream.readBoolean()) {
            const backpackLevel = stream.readBits(2);
            const readInventoryCount = (): number => stream.readBoolean() ? stream.readBits(9) : 0;
            for (const item in this.items) {
                const num = readInventoryCount();
                this.items[item] = num;
                const ammoText = (num >= Backpacks[backpackLevel].maxCapacity[item] ? `<span style="color: #FFAF2C">${num}</span>` : num.toString());
                $(`#${item}-count`).html(ammoText);

                if (item.includes("scope")) {
                    $(`#${item}-slot`).toggle(num > 0).removeClass("active");
                }
            }

            this.scope = stream.readObjectTypeNoCategory(ObjectCategory.Loot);

            $(`#${this.scope.idString}-slot`).addClass("active");
        }
    }
}
