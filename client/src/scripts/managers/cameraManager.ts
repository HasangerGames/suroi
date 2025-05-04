import { Layer } from "@common/constants";
import { DEFAULT_SCOPE, Scopes } from "@common/definitions/items/scopes";
import { EaseFunctions, Numeric } from "@common/utils/math";
import { randomPointInsideCircle } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { ShockwaveFilter } from "pixi-filters";
import { Container, Filter } from "pixi.js";
import { GameConsole } from "../console/gameConsole";
import { Game } from "../game";
import { LAYER_TRANSITION_DELAY, PIXI_SCALE } from "../utils/constants";
import { SuroiSprite } from "../utils/pixi";
import { type Tween } from "../utils/tween";
import { getLayerContainer as getLayerContainerIndex, LayerContainer } from "@common/utils/layer";
import { removeFrom, type Timeout } from "@common/utils/misc";

class CameraManagerClass {
    container = new Container();

    // basement, ground, upstairs
    // objects on stairs are shown on the same level as one of the floors
    // so they don't need a separate container
    readonly layerContainers = [new Container(), new Container(), new Container()];

    // used when moving objects between layers to prevent flickering
    readonly tempLayerContainer = new Container();

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

        for (let i = 0, len = this.layerContainers.length; i < len; i++) {
            const container = this.layerContainers[i];
            container.zIndex = i;
            this.container.addChild(container);
        }
        this.container.addChild(this.tempLayerContainer);
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

    transitioningContainers: number[] = [];

    objectUpdateTimeout?: Timeout;

    updateLayer(initial = false): void {
        for (const tween of this.layerTweens) {
            tween.complete();
        }
        this.layerTweens.clear();
        this.objectUpdateTimeout?.kill();
        this.transitioningContainers.length = 0;

        if (!initial) {
            this.objectUpdateTimeout = Game.addTimeout(() => {
                this.transitioningContainers.length = 0;
                for (const object of Game.objects) {
                    object.updateLayer();
                }
            }, LAYER_TRANSITION_DELAY);
        }

        const newLayer = Game.layer;

        for (let i = 0, len = this.layerContainers.length; i < len; i++) {
            const container = this.layerContainers[i];

            // Display bunkers above everything else when on stairs or below
            if (i === 0) {
                container.zIndex = newLayer <= Layer.ToBasement ? Number.MAX_SAFE_INTEGER : 0;
            }

            const visible = (
                (i === 0 && newLayer <= Layer.ToBasement)
                || (i === 1 && newLayer >= Layer.ToBasement)
                || (i === 2 && newLayer >= (Game.hideSecondFloor ? Layer.ToUpstairs : Layer.ToBasement))
            );

            if (visible === container.visible) continue;

            if (initial) {
                container.visible = visible;
                continue;
            }

            this.transitioningContainers.push(i);

            container.alpha = visible ? 0 : 1;
            // if showing the container, it needs to be visible from the start or the transition won't work
            if (visible) container.visible = true;

            const tween = Game.addTween({
                target: container,
                to: { alpha: visible ? 1 : 0 },
                duration: LAYER_TRANSITION_DELAY,
                ease: EaseFunctions.sineOut,
                onComplete: () => {
                    this.layerTweens.delete(tween);
                    container.visible = visible;
                }
            });
            this.layerTweens.add(tween);
        }

        const containerIndex = getLayerContainerIndex(Game.layer, Game.layer);
        this.tempLayerContainer.zIndex = containerIndex === LayerContainer.Basement && newLayer <= Layer.ToBasement ? Number.MAX_SAFE_INTEGER : containerIndex;
        for (const object of Game.objects) {
            object.updateLayer();
        }
    }

    getContainer(layer: Layer, oldContainerIndex?: LayerContainer): Container {
        const containerIndex = getLayerContainerIndex(layer, Game.layer);
        if (
            oldContainerIndex !== undefined
            && containerIndex !== oldContainerIndex
            && this.transitioningContainers.includes(containerIndex)
        ) {
            return this.tempLayerContainer;
        } else {
            return this.layerContainers[containerIndex];
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

    addObject(...objects: Container[]): void {
        this.container.addChild(...objects);
    }

    addFilter(layer: Layer, filter: Filter): void {
        (this.getContainer(layer).filters as Filter[]).push(filter);
    }

    removeFilter(layer: Layer, filter: Filter): void {
        removeFrom(this.getContainer(layer).filters as Filter[], filter);
    }

    reset(): void {
        const containers = this.layerContainers.concat(this.tempLayerContainer);
        for (const container of containers) {
            container.removeChildren();
        }

        // remove all children except layer containers
        for (const child of this.container.children) {
            if (containers.includes(child)) continue;
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

        CameraManager.getContainer(layer).addChild(this.anchorContainer);
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
