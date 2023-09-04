import { type Game } from "../game";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { vClone, type Vector } from "../../../../common/src/utils/vector";
import { type ObjectCategory, TICK_SPEED } from "../../../../common/src/constants";
import { type ObjectDefinition } from "../../../../common/src/utils/objectDefinitions";
import { Container } from "pixi.js";
import { type Sound } from "../utils/soundManager";
import { vecLerp } from "../../../../common/src/utils/math";
import { toPixiCoords } from "../utils/pixi";

export abstract class GameObject<T extends ObjectCategory = ObjectCategory, U extends ObjectDefinition = ObjectDefinition> {
    id: number;
    type: ObjectType<T, U>;

    readonly game: Game;

    damageable = false;

    oldPosition!: Vector;
    lastPositionChange!: number;
    _position!: Vector;
    get position(): Vector { return this._position; }
    set position(pos: Vector) {
        if (this._position !== undefined) this.oldPosition = vClone(this._position);
        this.lastPositionChange = Date.now();
        this._position = pos;
    }

    exactPosition?: Vector;

    updatePosition(): void {
        if (this.oldPosition === undefined || this.container.position === undefined) return;
        const interpFactor = (Date.now() - this.lastPositionChange) / TICK_SPEED;
        this.exactPosition = vecLerp(this.oldPosition, this.position, Math.min(interpFactor, 1));
        this.container.position = toPixiCoords(this.exactPosition);
    }

    rotation!: number;

    dead = false;

    readonly container: Container;

    protected constructor(game: Game, type: ObjectType<T, U>, id: number) {
        this.game = game;
        this.type = type;
        this.id = id;

        this.container = new Container();

        this.game.camera.container.addChild(this.container);
    }

    destroy(): void {
        this.container.destroy();
    }

    playSound(key: string, fallOff?: number, maxDistance?: number): Sound {
        return this.game.soundManager.play(key, this.position, fallOff, maxDistance);
    }

    abstract deserializePartial(stream: SuroiBitStream): void;
    abstract deserializeFull(stream: SuroiBitStream): void;
}
