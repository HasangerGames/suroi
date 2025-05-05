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

    readonly layerTweens: Array<Tween<Container> | undefined> = [];

    // Used when moving objects between layers to prevent flickering.
    // Suppose an object is moving onto some bunker stairs. This moves the object to the basement container.
    // However, the basement container isn't currently visible, so it needs to be faded in.
    // This causes the object to go from fully visible to fading in with the basement container, which looks janky.
    // The solution is to move the object to a temporary container (i.e. this one) with the same Z index as the container that's fading in.
    // When the fade in is complete, the object is moved to the proper container.
    readonly tempLayerContainer = new Container();

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

    objectUpdateTimeout?: Timeout;

    layerTransition = false;

    updateLayer(initial = false, oldLayer?: Layer): void {
        this.objectUpdateTimeout?.kill();

        if (!initial) {
            this.objectUpdateTimeout = Game.addTimeout(() => {
                for (const object of Game.objects) {
                    object.updateLayer();
                }
            }, LAYER_TRANSITION_DELAY);
        }

        const newLayer = Game.layer;

        for (let i = 0, len = this.layerContainers.length; i < len; i++) {
            const container = this.layerContainers[i];

            // Display bunkers above everything else when on stairs or below
            // If the bunker is already above everything else, we wait until the tween completes to change the Z index
            // Otherwise, if there's a building above (e.g. in the blue house), it'll show on top and make the bunker immediately invisible
            if (i === 0 && container.zIndex !== 999) {
                container.zIndex = newLayer <= Layer.ToBasement ? 999 : 0;
            }

            let visible = true;
            switch (i) {
                case 0:
                    visible = newLayer <= Layer.ToBasement;
                    break;
                case 1:
                    visible = newLayer >= Layer.ToBasement;
                    break;
                case 2:
                    visible = newLayer >= (Game.hideSecondFloor ? Layer.ToUpstairs : Layer.ToBasement);
                    break;
            }
            const targetAlpha = visible ? 1 : 0;

            const existingTween = this.layerTweens[i];
            if (existingTween ? existingTween.endValues.alpha === targetAlpha : visible === container.visible) continue;

            if (initial) {
                container.visible = visible;
                continue;
            }

            container.alpha = visible ? 0 : 1;
            // if showing the container, it needs to be visible from the start or the transition won't work
            container.visible = true;

            this.layerTweens[i] = Game.addTween({
                target: container,
                to: { alpha: targetAlpha },
                duration: LAYER_TRANSITION_DELAY,
                ease: EaseFunctions.sineOut,
                onComplete: () => {
                    this.layerTweens[i] = undefined;
                    container.visible = visible;

                    if (i === 0) {
                        container.zIndex = newLayer <= Layer.ToBasement ? 999 : 0;
                    }
                }
            });
        }

        let tempContainerIndex = getLayerContainerIndex(Game.layer, Game.layer);
        if (oldLayer !== undefined) {
            const oldIndex = getLayerContainerIndex(oldLayer, oldLayer);
            if (oldIndex > tempContainerIndex && newLayer >= Layer.Ground) {
                tempContainerIndex = oldIndex;
            }
        }
        if (tempContainerIndex === LayerContainer.Basement && newLayer <= Layer.ToBasement) {
            tempContainerIndex = 999 as LayerContainer;
        }
        tempContainerIndex += 0.1;
        this.tempLayerContainer.zIndex = tempContainerIndex;

        this.layerTransition = true;
        for (const object of Game.objects) {
            object.updateLayer();
        }
        this.layerTransition = false;
    }

    getContainer(layer: Layer, oldContainerIndex?: LayerContainer): Container {
        const containerIndex = getLayerContainerIndex(layer, Game.layer);
        if (this.layerTransition && oldContainerIndex !== undefined && containerIndex !== oldContainerIndex) {
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
