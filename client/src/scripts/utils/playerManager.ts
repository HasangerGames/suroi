import core from "../core";
import { type Game } from "../game";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { INVENTORY_MAX_WEAPONS, ObjectCategory } from "../../../../common/src/constants";
import { type MeleeDefinition } from "../../../../common/src/definitions/melees";
import { type GunDefinition } from "../../../../common/src/definitions/guns";

// This class manages the active player data and inventory
export class PlayerManager {
    game: Game;

    name!: string;

    private _health = 100;

    private _adrenaline = 100;

    get isMobile(): boolean {
        if (core.phaser === undefined) return false;
        return !core.phaser.device.os.desktop;
    }

    readonly movement = {
        up: false,
        left: false,
        down: false,
        right: false,
        // mobile
        moving: false
    };

    // had to put it here because its not a boolean
    // and inputManager assumes all keys of `movement` are booleans
    movementAngle = 0;

    readonly dirty = {
        health: true,
        adrenaline: true,
        inputs: true
    };

    rotation = 0;

    private _attacking = false;
    get attacking(): boolean { return this._attacking; }
    set attacking(attacking: boolean) {
        this._attacking = attacking;
        this.dirty.inputs = true;
    }

    interacting = false;

    turning = false;

    _lastItemIndex = 0;
    get lastItemIndex(): number { return this._lastItemIndex; }

    private _activeItemIndex = 2;
    get activeItemIndex(): number { return this._activeItemIndex; }
    set activeItemIndex(v: number) {
        if (this.activeItemIndex === v) return;
        if (this._lastItemIndex !== this._activeItemIndex) this._lastItemIndex = this._activeItemIndex;

        this._activeItemIndex = v;
        this.dirty.inputs = true;
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

    constructor(game: Game) {
        this.game = game;
    }

    deserializeInventory(stream: SuroiBitStream): void {
        // Active item index
        if (stream.readBoolean()) {
            this.activeItemIndex = stream.readUint8();
            $(".inventory-slot").removeClass("active");
            $(`#weapon-slot-${this.activeItemIndex + 1}`).addClass("active");
        }

        // Items dirty
        if (stream.readBoolean()) {
            for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
                const container = $(`#weapon-slot-${i + 1}`);
                if (stream.readBoolean()) {
                    // if the slot is not empty
                    const item = stream.readObjectTypeNoCategory(ObjectCategory.Loot);
                    container.children(".item-name").text(item.definition.name);
                    const itemDef = item.definition as MeleeDefinition | GunDefinition;
                    container.children(".item-image").attr("src", require(`../../assets/img/game/weapons/${itemDef.idString}.svg`)).show();
                } else {
                    // empty slot
                    container.children(".item-name").text("");
                    container.children(".item-image").removeAttr("src").hide();
                }
            }
        }
    }
}
