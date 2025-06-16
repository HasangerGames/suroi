import { Layer, type ObjectCategory } from "@common/constants";
import { makeGameObjectTemplate } from "@common/utils/gameObject";
import { Angle, Numeric } from "@common/utils/math";
import { type Timeout } from "@common/utils/misc";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { Vec, type Vector } from "@common/utils/vector";
import { Container } from "pixi.js";
import { Game } from "../game";
import { SoundManager, type GameSound, type SoundOptions } from "../managers/soundManager";
import { toPixiCoords } from "../utils/pixi";
import { CameraManager } from "../managers/cameraManager";
import { getLayerContainer } from "@common/utils/layer";

export abstract class GameObject<Cat extends ObjectCategory = ObjectCategory> extends makeGameObjectTemplate() {
    damageable = false;
    destroyed = false;

    layer!: Layer;

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
                Numeric.min(
                    (Date.now() - this._lastPositionChange) / Game.serverDt,
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
            Numeric.min(
                (Date.now() - this._lastRotationChange) / Game.serverDt,
                1
            )
        );
    }

    dead = false;

    readonly container = new Container();

    readonly timeouts = new Set<Timeout>();

    addTimeout(callback: () => void, delay?: number): Timeout {
        const timeout = Game.addTimeout(callback, delay);
        this.timeouts.add(timeout);
        return timeout;
    }

    constructor(readonly id: number) {
        super();
    }

    destroy(): void {
        this.destroyed = true;
        for (const timeout of this.timeouts) {
            timeout.kill();
        }
        this.container.destroy();
    }

    playSound(name: string, options?: Partial<Omit<SoundOptions, "position">>): GameSound {
        return SoundManager.play(name, {
            position: this.position,
            layer: this.layer,
            ...options
        });
    }

    abstract updateFromData(data: ObjectsNetData[Cat], isNew: boolean): void;

    layerContainer?: Container;
    layerContainerIndex?: number;
    readonly containers: Container[] = [this.container];
    updateLayer(forceUpdate = false): void {
        const oldContainer = this.layerContainer;
        const newContainer = CameraManager.getContainer(this.layer, this.layerContainerIndex);
        if (oldContainer === newContainer && !forceUpdate) return;

        this.layerContainer = newContainer;
        this.layerContainerIndex = getLayerContainer(this.layer, Game.layer);

        for (const container of this.containers) {
            oldContainer?.removeChild(container);
            newContainer.addChild(container);
        }
    }

    abstract update(): void;
    abstract updateInterpolation(): void;

    abstract updateDebugGraphics(): void;
}
