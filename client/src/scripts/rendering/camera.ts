import { Container, Filter, type Application } from "pixi.js";
import { DEFAULT_SCOPE } from "../../../../common/src/definitions/scopes";
import { EaseFunctions } from "../../../../common/src/utils/math";
import { randomFloat } from "../../../../common/src/utils/random";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { PIXI_SCALE } from "../utils/constants";
import { type Tween } from "../utils/tween";
import { ShockwaveFilter } from "pixi-filters";
import { SuroiSprite } from "../utils/pixi";

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

    shockwaves: Shockwave[] = [];

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
            sortableChildren: true,
            filters: []
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

        if (this.shockwaves.length > 0) {
            for (const shockwave of this.shockwaves) {
                shockwave.update();
            }
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

    shockwave(duration: number, position: Vector, amplitude: number, wavelength: number, speed: number): void {
        if (!this.game.console.getBuiltInCVar("cv_cooler_graphics")) return;
        this.shockwaves.push(new Shockwave(this.game, duration, position, amplitude, wavelength, speed));
    }

    addObject(...objects: Container[]): void {
        this.container.addChild(...objects);
    }
}

export class Shockwave {
    game: Game;
    wavelength: number;
    amplitude: number;
    speed: number;
    lifeStart: number;
    lifeEnd: number;
    filter: ShockwaveFilter;
    anchorContainer: SuroiSprite;

    constructor(game: Game, lifetime: number, position: Vector, amplitude: number, wavelength: number, speed: number) {
        this.game = game;
        this.lifeStart = Date.now();
        this.lifeEnd = this.lifeStart + lifetime;
        this.anchorContainer = new SuroiSprite();
        this.wavelength = wavelength;
        this.amplitude = amplitude;
        this.speed = speed;

        this.game.camera.addObject(this.anchorContainer);
        this.anchorContainer.setVPos(position);

        this.filter = new ShockwaveFilter();

        this.update();

        this.game.camera.container.filters = [...(this.game.camera.container.filters as Filter[]), this.filter];
    }

    update(): void {
        const now = Date.now();
        if (now > this.lifeEnd) {
            this.destroy();
            return;
        }

        const scale = this.scale();

        const position = this.anchorContainer.getGlobalPosition();

        this.filter.centerX = position.x;
        this.filter.centerY = position.y;

        this.filter.wavelength = this.wavelength * scale;

        this.filter.speed = this.speed * scale;

        this.filter.time = now - this.lifeStart;

        this.filter.amplitude = this.amplitude * EaseFunctions.linear(1 - ((now - this.lifeStart) / (this.lifeEnd - this.lifeStart)));
    }

    scale(): number {
        return PIXI_SCALE / this.game.camera.zoom;
    }

    destroy(): void {
        this.game.camera.container.filters = (this.game.camera.container.filters as Filter[]).filter(filter => !Object.is(this.filter, filter));
        this.game.camera.shockwaves = this.game.camera.shockwaves.filter(shockwave => !Object.is(this, shockwave));
        this.anchorContainer.destroy();
        this.filter.destroy();
    }
}
