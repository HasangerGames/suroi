import { GameObject } from "./gameObject";
import { SuroiBitStream } from "../utils/suroiBitStream";
import { Vector } from "../utils/vector";

export class Player extends GameObject {

    direction: Vector;

    private _health= 100;
    healthDirty = true;

    private _adrenaline = 100;
    adrenalineDirty = true;

    constructor() {
        super();
    }

    get health(): number {
        return this._health;
    }

    get adrenaline(): number {
        return this._adrenaline;
    }

    deserializePartial(stream: SuroiBitStream): void {

    }

    deserializeFull(stream: SuroiBitStream): void {

    }

    serializePartial(stream: SuroiBitStream): void {

    }

    serializeFull(stream: SuroiBitStream): void {

    }

}
