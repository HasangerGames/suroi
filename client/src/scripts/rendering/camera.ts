import { Container, type Application, type DisplayObject } from "pixi.js";
import { randomFloat } from "../../../../common/src/utils/random";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { Tween } from "../utils/tween";
import { EaseFunctions } from "../../../../common/src/utils/math";

export class Camera {
    pixi: Application;
    container: Container;
    game: Game;

    position = Vec.create(0, 0);

    private _zoom = 48;
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

    constructor(game: Game) {
        this.game = game;
        this.pixi = game.pixi;
        this.container = new Container();
        this.container.sortableChildren = true;
        this.pixi.stage.addChild(this.container);

        this.resize();

        this.pixi.renderer.on("resize", this.resize.bind(this));
    }

    resize(animation = false): void {
        this.width = this.pixi.screen.width;
        this.height = this.pixi.screen.height;

        const size = this.height < this.width ? this.width : this.height;
        const scale = (size / 2560) * (48 / this.zoom); // 2560 = 1x, 5120 = 2x

        this.zoomTween?.kill();

        if (animation) {
            this.zoomTween = new Tween(this.game, {
                target: this.container.scale,
                to: { x: scale, y: scale },
                duration: 800,
                ease: EaseFunctions.cubicOut
            });
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

    addObject(...objects: DisplayObject[]): void {
        this.container.addChild(...objects);
    }
}
