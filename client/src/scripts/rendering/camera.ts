import { Container, type Application } from "pixi.js";
import { DEFAULT_SCOPE } from "../../../../common/src/definitions/scopes";
import { EaseFunctions } from "../../../../common/src/utils/math";
import { randomFloat } from "../../../../common/src/utils/random";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { PIXI_SCALE } from "../utils/constants";
import { type Tween } from "../utils/tween";

export class Camera {
    readonly pixi: Application;
    readonly container: Container;

    position = Vec.create(0, 0);

    private _zoom = DEFAULT_SCOPE.zoomLevel;
    get zoom(): number { return this._zoom; }
    set zoom(zoom: number) {
        this._zoom = zoom;
        this.resize(true);
    }

    zoomTween?: Tween<Vector>;

    shaking = false;
    shakeStart!: number;
    shakeDuration!: number;
    shakeIntensity!: number;

    width = 1;
    height = 1;

    private static _instantiated = false;
    constructor(readonly game: Game) {
        if (Camera._instantiated) {
            throw new Error("Class 'Camera' has already been instantiated");
        }
        Camera._instantiated = true;

        this.pixi = game.pixi;
        this.container = new Container({
            isRenderGroup: true,
            sortableChildren: true
        });
    }

    resize(animation = false): void {
        this.width = this.pixi.screen.width;
        this.height = this.pixi.screen.height;

        const minDimension = Math.min(this.width, this.height);
        const maxDimension = Math.max(this.width, this.height);
        const maxScreenDim = Math.max(minDimension * (16 / 9), maxDimension);
        const scale = (maxScreenDim * 0.5) / (this._zoom * PIXI_SCALE);

        this.zoomTween?.kill();

        if (animation) {
            this.zoomTween = this.game.addTween(
                {
                    target: this.container.scale,
                    to: { x: scale, y: scale },
                    duration: 800,
                    ease: EaseFunctions.cubicOut,
                    onComplete: () => {
                        this.zoomTween = undefined;
                    }
                }
            );
        } else {
            this.container.scale.set(scale);
        }
    }

    update(): void {
        let position = this.position;

        if (this.shaking) {
            const intensity = this.shakeIntensity;
            position = Vec.addComponent(position, randomFloat(-intensity, intensity), randomFloat(-intensity, intensity));
            if (Date.now() - this.shakeStart > this.shakeDuration) this.shaking = false;
        }

        const cameraPos = Vec.add(
            Vec.scale(position, this.container.scale.x),
            Vec.create(-this.width / 2, -this.height / 2)
        );

        this.container.position.set(-cameraPos.x, -cameraPos.y);
    }

    shake(duration: number, intensity: number): void {
        if (!this.game.console.getBuiltInCVar("cv_camera_shake_fx")) return;
        this.shaking = true;
        this.shakeStart = Date.now();
        this.shakeDuration = duration;
        this.shakeIntensity = intensity;
    }

    addObject(...objects: Container[]): void {
        this.container.addChild(...objects);
    }
}
