import { Container, Graphics } from "pixi.js";
import { GameConstants, type ObjectCategory } from "../../../../common/src/constants.js";
import { vLerp } from "../../../../common/src/utils/math.js";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations.js";
import { v, vClone, type Vector } from "../../../../common/src/utils/vector.js";
import { type Game } from "../game.js";
import { HITBOX_DEBUG_MODE } from "../utils/constants.js";
import { toPixiCoords } from "../utils/pixi.js";
import type { Timeout } from "../../../../common/src/utils/misc.js";
import type { GameSound, SoundOptions } from "../utils/soundManager.js";

export abstract class GameObject<Cat extends ObjectCategory = ObjectCategory> {
    id: number;
    abstract readonly type: Cat;

    readonly game: Game;

    damageable = false;
    destroyed = false;

    debugGraphics!: Graphics;

    oldPosition!: Vector;
    lastPositionChange!: number;
    _position!: Vector;
    get position(): Vector { return this._position; }
    set position(position: Vector) {
        if (this._position !== undefined) this.oldPosition = vClone(this._position);
        this.lastPositionChange = Date.now();
        this._position = position;
    }

    updateContainerPosition(): void {
        if (this.destroyed || this.oldPosition === undefined || this.container.position === undefined) return;
        const interpFactor = (Date.now() - this.lastPositionChange) / GameConstants.tps;
        this.container.position = toPixiCoords(vLerp(this.oldPosition, this.position, Math.min(interpFactor, 1)));
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
        const interpFactor = (Date.now() - this.lastRotationChange) / GameConstants.tps;

        const interpolated = vLerp(this.oldRotation, this.rotationVector, Math.min(interpFactor, 1));

        this.container.rotation = Math.atan2(interpolated.y, interpolated.x);
    }

    dead = false;

    readonly container: Container;

    readonly timeouts = new Set<Timeout>();

    addTimeout(callback: () => void, delay?: number): Timeout {
        const timeout = this.game.addTimeout(callback, delay);
        this.timeouts.add(timeout);
        return timeout;
    }

    protected constructor(game: Game, id: number) {
        this.game = game;
        this.id = id;

        this.container = new Container();

        this.game.camera.addObject(this.container);

        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics = new Graphics();
            this.debugGraphics.zIndex = 999;
            this.game.camera.addObject(this.debugGraphics);
        }
    }

    destroy(): void {
        this.destroyed = true;
        if (HITBOX_DEBUG_MODE) {
            this.debugGraphics.destroy();
        }
        for (const timeout of this.timeouts) {
            timeout.kill();
        }
        this.container.destroy();
    }

    playSound(name: string, options?: Partial<Omit<SoundOptions, "position">>): GameSound {
        return this.game.soundManager.play(name, {
            position: this.position,
            ...options
        });
    }

    abstract updateFromData(data: ObjectsNetData[Cat], isNew: boolean): void;
}
