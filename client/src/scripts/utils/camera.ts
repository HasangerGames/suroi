import { type Application, Container } from "pixi.js";
import { type Vector, v, vAdd, vMul } from "../../../../common/src/utils/vector";
import { gsap } from "gsap";
import { localStorageInstance } from "./localStorageHandler";

export class Camera {
    pixi: Application;
    container: Container;

    zoom = 48;

    position = v(0, 0);

    zoomTween?: gsap.core.Tween;
    positionTween?: gsap.core.Tween;

    constructor(pixi: Application) {
        this.pixi = pixi;
        this.container = new Container();
        this.container.sortableChildren = true;
        pixi.stage.addChild(this.container);

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
                onUpdate: () => { this.updatePosition(); }
            });
        } else {
            this.container.scale.set(scale);
            this.updatePosition();
        }
    }

    setPosition(pos: Vector) {
        this.position = pos;
        this.updatePosition(true);
    }

    updatePosition(anim = false) {
        const cameraPos = vAdd(
            vMul(vMul(this.position, 20), this.container.scale.x),
            v(-this.pixi.screen.width / 2, -this.pixi.screen.height / 2));

        this.positionTween?.kill();
        if (anim && localStorageInstance.config.movementSmoothing) {
            this.positionTween = gsap.to(this.container, {
                x: -cameraPos.x,
                y: -cameraPos.y,
                duration: 0.03
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
