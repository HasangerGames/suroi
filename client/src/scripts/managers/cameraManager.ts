import { Layer } from "@common/constants";
import { DEFAULT_SCOPE, Scopes } from "@common/definitions/items/scopes";
import { EaseFunctions, Numeric } from "@common/utils/math";
import { removeFrom } from "@common/utils/misc";
import { randomPointInsideCircle } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { ShockwaveFilter } from "pixi-filters";
import { Container, Filter } from "pixi.js";
import { GameConsole } from "../console/gameConsole";
import { Game } from "../game";
import { LAYER_TRANSITION_DELAY, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite } from "../utils/pixi";
import { type Tween } from "../utils/tween";

class CameraManagerClass {
    container = new Container();

    layerContainers = new Map<Layer, Container>([
        [Layer.Basement1, new Container()],
        [Layer.ToBasement1, new Container()],
        [Layer.Ground, new Container()],
        [Layer.ToFloor1, new Container()],
        [Layer.Floor1, new Container()]
    ]);

    layerTweens = new Set<Tween<Container>>();

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

        for (const [layer, container] of this.layerContainers) {
            container.zIndex = layer;
            this.container.addChild(container);
        }
    }

    resize(animation = false): void {
        this.width = Game.pixi.screen.width;
        this.height = Game.pixi.screen.height;

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

    updateLayer(initial = false): void {
        for (const tween of this.layerTweens) {
            tween.complete();
        }
        this.layerTweens.clear();

        const newLayer = Game.layer;

        for (const [layer, layerContainer] of this.layerContainers) {
            let zIndex: number;
            if (layer === Layer.Basement1) {
                zIndex = newLayer <= Layer.ToBasement1 ? 998 : Layer.Basement1;
            } else if (layer === Layer.ToBasement1) {
                if (newLayer <= Layer.ToBasement1) {
                    zIndex = 999;
                } else if (newLayer === Layer.Ground) {
                    zIndex = Layer.Ground + 0.1;
                } else {
                    zIndex = Layer.ToBasement1;
                }
            } else {
                zIndex = layer;
            }
            layerContainer.zIndex = zIndex;

            const visible = (
                (newLayer < Layer.ToBasement1 && layer <= Layer.ToBasement1)
                || newLayer === Layer.ToBasement1
                || (
                    newLayer > Layer.ToBasement1
                    && layer >= Layer.ToBasement1
                    && (
                        newLayer !== Layer.Ground
                        || !Game.hideSecondFloor
                        || layer !== Layer.Floor1
                    )
                )
            );

            if (visible === layerContainer.visible) continue;

            if (initial) {
                layerContainer.visible = visible;
                continue;
            }

            layerContainer.alpha = visible ? 0 : 1;
            // if showing the container, it needs to be visible from the start or the transition won't work
            if (visible) layerContainer.visible = true;

            const tween = Game.addTween({
                target: layerContainer,
                to: { alpha: visible ? 1 : 0 },
                duration: LAYER_TRANSITION_DELAY,
                ease: EaseFunctions.sineOut,
                onComplete: () => {
                    this.layerTweens.delete(tween);
                    layerContainer.visible = visible;
                }
            });
            this.layerTweens.add(tween);
        }
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

    getLayer(layer: Layer): Container {
        const container = this.layerContainers.get(layer);
        if (!container) {
            throw new Error(`No container found for layer: ${layer}`);
        }
        return container;
    }

    addObject(...objects: Container[]): void {
        this.container.addChild(...objects);
    }

    addObjectToLayer(layer: Layer, ...objects: Container[]): void {
        this.getLayer(layer).addChild(...objects);
    }

    removeObjectFromLayer(layer: Layer, ...objects: Container[]): void {
        this.getLayer(layer).removeChild(...objects);
    }

    changeObjectLayer(oldLayer: Layer | undefined, newLayer: Layer, ...objects: Container[]): void {
        if (oldLayer !== undefined) this.removeObjectFromLayer(oldLayer, ...objects);
        this.addObjectToLayer(newLayer, ...objects);
    }

    addFilter(layer: Layer, filter: Filter): void {
        (this.getLayer(layer).filters as Filter[]).push(filter);
    }

    removeFilter(layer: Layer, filter: Filter): void {
        removeFrom(this.getLayer(layer).filters as Filter[], filter);
    }

    reset(): void {
        const layerContainers = Array.from(this.layerContainers.values());
        for (const container of layerContainers) {
            container.removeChildren();
        }
        // remove all children except layer containers
        for (const child of this.container.children) {
            if (layerContainers.includes(child)) continue;
            this.container.removeChild(child);
        }
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

        CameraManager.addObjectToLayer(layer, this.anchorContainer);
        this.anchorContainer.setVPos(position);

        this.filter = new ShockwaveFilter();

        this.update();

        CameraManager.addFilter(layer, this.filter);
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
        CameraManager.removeFilter(this.layer, this.filter);
        CameraManager.shockwaves.delete(this);
        this.anchorContainer.destroy();
    }
}
