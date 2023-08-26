import { type Application, Container } from "pixi.js";
import { type Vector, v, vAdd, vMul, vClone } from "../../../../common/src/utils/vector";
import { gsap } from "gsap";
import { toPixiCords } from "./pixi";
import { localStorageInstance } from "./localStorageHandler";
import { TICK_SPEED } from "../../../../common/src/constants";

export class Camera {
    pixi: Application;
    container: Container;

    zoom = 48;

    position = v(0, 0);

    oldPosition = v(0, 0);

    zoomTween?: gsap.core.Tween;
    moveTween?: gsap.core.Tween;

    constructor(pixi: Application) {
        this.pixi = pixi;
        this.container = new Container();
        this.container.sortableChildren = true;
        pixi.stage.addChild(this.container);

        pixi.renderer.on("resize", this.updatePosition.bind(this));

        this.resize();
    }

    resize(animation = false): void {
        let size = window.innerWidth;
        if (window.innerHeight > window.innerWidth) size = window.innerHeight;

        const scale = (size / 2560) * (48 / this.zoom); // 2560 = 1x, 5120 = 2x

        this.zoomTween?.kill();

        if (animation) {
            this.zoomTween = gsap.to(this.container.scale, {
                x: scale,
                y: scale,
                duration: 0.8,
                onUpdate: () => { this.updatePosition(false); }
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

    updatePosition(anim = true): void {
        const cameraPos = vAdd(
            vMul(toPixiCords(this.position), this.container.scale.x),
            v(-this.pixi.screen.width / 2, -this.pixi.screen.height / 2));

        this.moveTween?.kill();
        if (localStorageInstance.config.movementSmoothing && anim) {
            this.moveTween = gsap.to(this.container.position, {
                x: -cameraPos.x,
                y: -cameraPos.y,
                duration: TICK_SPEED / 1000
            });
        } else {
            this.container.position.set(-cameraPos.x, -cameraPos.y);
        }
    }

    setZoom(zoom: number): void {
        this.zoom = zoom;
        this.resize(true);
    }
}
