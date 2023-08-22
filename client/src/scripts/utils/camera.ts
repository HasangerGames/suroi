import { type Application, Container } from "pixi.js";
import { type Vector, v, vAdd, vMul, vSub, vDiv, vClone } from "../../../../common/src/utils/vector";
import { gsap } from "gsap";
import { toPixiCords } from "./pixi";

export class Camera {
    pixi: Application;
    container: Container;

    zoom = 48;

    position = v(0, 0);

    oldPosition = v(0, 0);

    zoomTween?: gsap.core.Tween;

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

    setPosition(pos: Vector): void {
        this.oldPosition = vClone(this.position);
        this.position = pos;
        this.updatePosition();
    }

    updatePosition(): void {
        const cameraPos = vAdd(
            vMul(toPixiCords(this.position), this.container.scale.x),
            v(-this.pixi.screen.width / 2, -this.pixi.screen.height / 2));

        this.container.position.set(-cameraPos.x, -cameraPos.y);
    }

    setZoom(zoom: number): void {
        this.zoom = zoom;
        this.resize(true);
    }

    update(delta: number): void {
        const posToAdd = vDiv(vSub(this.oldPosition, this.position), delta);
        const position = vAdd(this.oldPosition, posToAdd);

        const cameraPos = vMul(vAdd(
            vMul(toPixiCords(position), this.container.scale.x),
            v(-this.pixi.screen.width / 2, -this.pixi.screen.height / 2)), -1);

        this.container.position.set(cameraPos.x, cameraPos.y);
    }
}
