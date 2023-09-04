import { type Application, Container } from "pixi.js";
import { type Vector, v, vAdd, vMul, vClone } from "../../../../common/src/utils/vector";
import { toPixiCoords } from "../utils/pixi";
import { EaseFunctions, Tween } from "../utils/tween";
import { type Game } from "../game";

export class Camera {
    pixi: Application;
    container: Container;
    game: Game;

    zoom = 48;

    position = v(0, 0);

    oldPosition = v(0, 0);

    zoomTween?: Tween<Vector>;

    constructor(game: Game) {
        this.game = game;
        this.pixi = game.pixi;
        this.container = new Container();
        this.container.sortableChildren = true;
        this.pixi.stage.addChild(this.container);

        this.pixi.renderer.on("resize", this.updatePosition.bind(this));

        this.resize();
    }

    resize(animation = false): void {
        let size = window.innerWidth;
        if (window.innerHeight > window.innerWidth) size = window.innerHeight;

        const scale = (size / 2560) * (48 / this.zoom); // 2560 = 1x, 5120 = 2x

        this.zoomTween?.kill();

        if (animation) {
            this.zoomTween = new Tween(this.game, {
                target: this.container.scale,
                to: { x: scale, y: scale },
                duration: 800,
                ease: EaseFunctions.sineOut,
                onUpdate: () => { this.updatePosition(); }
            });
        } else {
            this.container.scale.set(scale);
            this.updatePosition();
        }
    }

    setPosition(pos: Vector): void {
        this.oldPosition = vClone(this.position);
        this.position = pos;
        this.updatePosition();
    }

    updatePosition(): void {
        const cameraPos = vAdd(
            vMul(toPixiCoords(this.position), this.container.scale.x),
            v(-this.pixi.screen.width / 2, -this.pixi.screen.height / 2)
        );
        this.container.position.set(-cameraPos.x, -cameraPos.y);
    }

    setZoom(zoom: number): void {
        this.zoom = zoom;
        this.resize(true);
    }
}
