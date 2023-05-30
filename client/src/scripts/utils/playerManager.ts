import { type Game } from "../game";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

// This class manages the active player data and inventory
export class PlayerManager {
    game: Game;

    name!: string;

    private _health = 100;

    private _adrenaline = 100;

    readonly movement = {
        up: false,
        left: false,
        down: false,
        right: false
    };

    readonly dirty = {
        health: true,
        adrenaline: true,
        inputs: true
    };

    rotation = 0;

    private _attacking = false;
    get attacking(): boolean { return this._attacking; }
    set attacking(v: boolean) {
        this._attacking = v;
        this.dirty.inputs = true;
    }

    turning = false;

    _lastItemIndex = 0;
    get lastItemIndex(): number { return this._lastItemIndex; }

    private _activeItemIndex = 2;
    get activeItemIndex(): number { return this._activeItemIndex; }
    set activeItemIndex(v: number) {
        this._lastItemIndex = this._activeItemIndex;
        this._activeItemIndex = v;
        this.dirty.inputs = true;
        this.updateInventoryUI();
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

    updateInventoryUI(): void {
        $("#weapons-container").children("*").each((index, ele) => {
            if (index !== this._activeItemIndex) {
                ele.classList.remove("active");
            } else {
                ele.classList.add("active");
            }
        });
    }

    deserializeInventory(stream: SuroiBitStream): void {
        // Active item index
        if (stream.readBoolean()) this.activeItemIndex = stream.readUint8();
    }
}
