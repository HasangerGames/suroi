import { DEFAULT_SCOPE, Scopes } from "@common/definitions/items/scopes";
import { EaseFunctions, Numeric } from "@common/utils/math";
import { randomPointInsideCircle } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { ShockwaveFilter } from "pixi-filters";
import { Container, type Application } from "pixi.js";
import { Game } from "../game";
import { PIXI_SCALE } from "../utils/constants";
import { SuroiSprite } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import type { Layer } from "@common/constants";
import { GameConsole } from "../console/gameConsole";

class CameraManagerClass {
    pixi!: Application;
    container!: Container;

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

    readonly shockwaves = new Set<Shockwave>();

    width = 1;
    height = 1;

    private _initialized = false;
    init(): void {
        if (this._initialized) {
            throw new Error("CameraManager has already been initialized");
        }
        this._initialized = true;

        this.pixi = Game.pixi;
        this.container = new Container({
            isRenderGroup: true,
            sortableChildren: true,
            filters: []
        });
    }

    resize(animation = false): void {
        this.width = this.pixi.screen.width;
        this.height = this.pixi.screen.height;

        const minDimension = Numeric.min(this.width, this.height);
        const maxDimension = Numeric.max(this.width, this.height);
        const maxScreenDim = Numeric.max(minDimension * (16 / 9), maxDimension);
        const scale = (maxScreenDim * 0.5) / (this._zoom * PIXI_SCALE);

        this.zoomTween?.kill();

        if (animation) {
            this.zoomTween = Game.addTween(
                {
                    target: this.container.scale,
                    to: { x: scale, y: scale },
                    duration: 1250,
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
            position = Vec.add(position, randomPointInsideCircle(Vec.create(0, 0), this.shakeIntensity));
            if (Date.now() - this.shakeStart > this.shakeDuration) this.shaking = false;
        }

        for (const shockwave of this.shockwaves) {
            shockwave.update();
        }

        const cameraPos = Vec.add(
            Vec.scale(position, this.container.scale.x),
            Vec.create(-this.width / 2, -this.height / 2)
        );

        this.container.position.set(-cameraPos.x, -cameraPos.y);
    }

    shake(duration: number, intensity: number): void {
        if (!GameConsole.getBuiltInCVar("cv_camera_shake_fx")) return;
        this.shaking = true;
        this.shakeStart = Date.now();
        this.shakeDuration = duration;
        this.shakeIntensity = intensity;
    }

    shockwave(duration: number, position: Vector, amplitude: number, wavelength: number, speed: number, layer: Layer): void {
        if (!GameConsole.getBuiltInCVar("cv_cooler_graphics")) return;
        this.shockwaves.add(new Shockwave(duration, position, amplitude, wavelength, speed, layer));
    }

    addObject(...objects: Container[]): void {
        this.container.addChild(...objects);
    }

    reset(): void {
        this.container.removeChildren();
        this.zoom = Scopes.definitions[0].zoomLevel;
    }
}

export const CameraManager = new CameraManagerClass();

export class Shockwave {
    lifeStart: number;
    lifeEnd: number;
    filter: ShockwaveFilter;
    anchorContainer: SuroiSprite;

    constructor(
        lifetime: number,
        position: Vector,
        public amplitude: number,
        public wavelength: number,
        public speed: number,
        public layer: Layer
    ) {
        this.lifeStart = Date.now();
        this.lifeEnd = this.lifeStart + lifetime;
        this.anchorContainer = new SuroiSprite();
        this.wavelength = wavelength;

        CameraManager.addObject(this.anchorContainer);
        this.anchorContainer.setVPos(position);

        this.filter = new ShockwaveFilter();

        this.update();

        CameraManager.container.filters = [CameraManager.container.filters].flat().concat(this.filter);
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
        return PIXI_SCALE / CameraManager.zoom;
    }

    destroy(): void {
        CameraManager.container.filters = [CameraManager.container.filters].flat().filter(filter => this.filter !== filter);
        CameraManager.shockwaves.delete(this);
        this.anchorContainer.destroy();
    }
}
