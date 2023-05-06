import type { WebSocket } from "uWebSockets.js";

import { GameObject } from "./gameObject";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";

export class Player extends GameObject {
    direction: Vector;

    private readonly _health = 100;
    healthDirty = true;

    private readonly _adrenaline = 100;
    adrenalineDirty = true;

    socket: WebSocket<Player>;

    get health (): number {
        return this._health;
    }

    get adrenaline (): number {
        return this._adrenaline;
    }

    /* eslint-disable @typescript-eslint/no-empty-function */
    deserializePartial (stream: SuroiBitStream): void {}

    deserializeFull (stream: SuroiBitStream): void {}

    serializePartial (stream: SuroiBitStream): void {}

    serializeFull (stream: SuroiBitStream): void {}
}
