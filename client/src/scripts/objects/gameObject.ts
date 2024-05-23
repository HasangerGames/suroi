import { Container, Graphics } from "pixi.js";
import { type ObjectCategory } from "../../../../common/src/constants";
import { Angle, Numeric } from "../../../../common/src/utils/math";
import { type Timeout } from "../../../../common/src/utils/misc";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameSound, type SoundOptions } from "../managers/soundManager";
import { HITBOX_DEBUG_MODE } from "../utils/constants";
import { toPixiCoords } from "../utils/pixi";

export abstract class GameObject<Cat extends ObjectCategory = ObjectCategory> {
    id: number;
    abstract readonly type: Cat;

    readonly game: Game;

    damageable = false;
    destroyed = false;

    debugGraphics!: Graphics;

    private _oldPosition?: Vector;
    private _lastPositionChange?: number;
    private _position = Vec.create(0, 0);
    private _positionManuallySet = false;
    get position(): Vector { return this._position; }
    set position(position: Vector) {
        if (this._positionManuallySet) {
            this._oldPosition = Vec.clone(this._position);
        }
        this._positionManuallySet = true;

        this._lastPositionChange = Date.now();
        this._position = position;
    }

    updateContainerPosition(): void {
        if (
            this.destroyed
            || this._oldPosition === undefined
            || this._lastPositionChange === undefined
        ) return;

        this.container.position = toPixiCoords(
            Vec.lerp(
                this._oldPosition,
                this.position,
                Math.min(
                    (Date.now() - this._lastPositionChange) / this.game.serverDt,
                    1
                )
            )
        );
    }

    private _oldRotation?: number;
    private _lastRotationChange?: number;
    private _rotationManuallySet = false;
    private _rotation = 0;
    get rotation(): number { return this._rotation; }
    set rotation(rotation: number) {
        if (this._rotationManuallySet) {
            this._oldRotation = this._rotation;
        }
        this._rotationManuallySet = true;

        this._lastRotationChange = Date.now();
        this._rotation = rotation;
    }

    updateContainerRotation(): void {
        if (
            this._oldRotation === undefined
            || this._lastRotationChange === undefined
        ) return;

        this.container.rotation = Numeric.lerp(
            this._oldRotation,
            this._oldRotation + Angle.minimize(this._oldRotation, this._rotation),
            Math.min(((Date.now() - this._lastRotationChange) / this.game.serverDt), 1)
        );
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
