import { type Application, Container, type DisplayObject } from "pixi.js";
import { randomFloat } from "../../../../common/src/utils/random";
import { v, vAdd, vAdd2, type Vector, vMul } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { consoleVariables } from "../utils/console/variables";
import { EaseFunctions, Tween } from "../utils/tween";

export class Camera {
    pixi: Application;
    container: Container;
    game: Game;

    position = v(0, 0);

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
                ease: EaseFunctions.outCubic
            });
        } else {
            this.container.scale.set(scale);
        }
    }

    update(): void {
        let position = this.position;

        if (this.shaking) {
            const s = this.shakeIntensity;
            position = vAdd2(position, randomFloat(-s, s), randomFloat(-s, s));
            if (Date.now() - this.shakeStart > this.shakeDuration) this.shaking = false;
        }

        const cameraPos = vAdd(
            vMul(position, this.container.scale.x),
            v(-this.width / 2, -this.height / 2)
        );

        this.container.position.set(-cameraPos.x, -cameraPos.y);
    }

    shake(duration: number, intensity: number): void {
        if (!consoleVariables.get.builtIn("cv_camera_shake_fx").value) return;
        this.shaking = true;
        this.shakeStart = Date.now();
        this.shakeDuration = duration;
        this.shakeIntensity = intensity;
    }

    addObject(...objects: DisplayObject[]): void {
        this.container.addChild(...objects);
    }
}
