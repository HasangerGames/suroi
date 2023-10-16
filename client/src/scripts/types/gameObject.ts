import { Container, Graphics } from "pixi.js";
import { type ObjectCategory, TICKS_PER_SECOND } from "../../../../common/src/constants";
import { vecLerp } from "../../../../common/src/utils/math";
import { type ObjectDefinition } from "../../../../common/src/utils/objectDefinitions";
import { type ObjectType } from "../../../../common/src/utils/objectType";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { v, vClone, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { HITBOX_DEBUG_MODE } from "../utils/constants";
import { toPixiCoords } from "../utils/pixi";
import { type Sound } from "../utils/soundManager";

export abstract class GameObject<T extends ObjectCategory = ObjectCategory, U extends ObjectDefinition = ObjectDefinition> {
    id: number;
    type: ObjectType<T, U>;

    readonly game: Game;

    damageable = false;

    oldPosition!: Vector;
    lastPositionChange!: number;
    _position!: Vector;

    destroyed = false;

    debugGraphics!: Graphics;

    get position(): Vector { return this._position; }
    set position(position: Vector) {
        if (this._position !== undefined) this.oldPosition = vClone(this._position);
        this.lastPositionChange = Date.now();
        this._position = position;
    }

    updateContainerPosition(): void {
        if (this.destroyed || this.oldPosition === undefined || this.container.position === undefined) return;
        const interpFactor = (Date.now() - this.lastPositionChange) / TICKS_PER_SECOND;
        this.container.position = toPixiCoords(vecLerp(this.oldPosition, this.position, Math.min(interpFactor, 1)));
    }

    oldRotation!: Vector;
    lastRotationChange!: number;
    _rotation!: number;
    rotationVector!: Vector;
    get rotation(): number { return this._rotation; }
    set rotation(rotation: number) {
        if (this._rotation !== undefined) {
            this.oldRotation = v(Math.cos(this._rotation), Math.sin(this._rotation));
        }
        this.lastRotationChange = Date.now();
        this._rotation = rotation;
        this.rotationVector = v(Math.cos(this.rotation), Math.sin(this.rotation));
    }

    updateContainerRotation(): void {
        if (this.oldRotation === undefined || this.container.rotation === undefined) return;
        const interpFactor = (Date.now() - this.lastRotationChange) / TICKS_PER_SECOND;

        const interpolated = vecLerp(this.oldRotation, this.rotationVector, Math.min(interpFactor, 1));

        this.container.rotation = Math.atan2(interpolated.y, interpolated.x);
    }

    dead = false;

    readonly container: Container;

    protected constructor(game: Game, type: ObjectType<T, U>, id: number) {
        this.game = game;
        this.type = type;
        this.id = id;

        this.container = new Container();

        this.game.camera.container.addChild(this.container);

        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics = new Graphics();
            this.debugGraphics.zIndex = 999;
            this.game.camera.container.addChild(this.debugGraphics);
        }
    }

    destroy(): void {
        this.destroyed = true;
        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics.destroy();
        }
        this.container.destroy();
    }

    playSound(key: string, fallOff?: number, maxDistance?: number): Sound {
        return this.game.soundManager.play(key, this.position, fallOff, maxDistance);
    }

    abstract updateFromData(data: ObjectsNetData[T]): void;
}
