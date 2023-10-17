import { type Container, Graphics } from "pixi.js";
import { GasState, TICKS_PER_SECOND, ZIndexes } from "../../../../common/src/constants";
import { clamp, lerp, vecLerp } from "../../../../common/src/utils/math";
import { v, type Vector, vMul } from "../../../../common/src/utils/vector";
import { COLORS } from "../utils/constants";

const kOverdraw = 100 * 1000;
const kSegments = 512;

export class Gas {
    state = GasState.Inactive;
    initialDuration = 0;
    oldPosition = v(0, 0);
    lastPosition = v(0, 0);
    position = v(0, 0);
    newPosition = v(0, 0);
    oldRadius = 2048;
    lastRadius = 2048;
    radius = 2048;
    newRadius = 2048;
    firstPercentageReceived = false;
    firstRadiusReceived = false;
    lastUpdateTime = Date.now();

    graphics: Graphics;

    scale: number;

    constructor(scale: number, container: Container) {
        this.scale = scale;

        this.graphics = new Graphics();

        this.graphics.zIndex = ZIndexes.Gas;

        // Generate a giant planar mesh with a tiny circular hole in
        // the center to act as the gas overlay
        this.graphics.clear()
            .beginFill(COLORS.gas)
            .moveTo(-kOverdraw, -kOverdraw)
            .lineTo(kOverdraw, -kOverdraw)
            .lineTo(kOverdraw, kOverdraw)
            .lineTo(-kOverdraw, kOverdraw)
            .closePath()
            .beginHole()
            .moveTo(0, 1);
        for (let i = 1; i < kSegments; i++) {
            const theta = i / kSegments;
            const s = Math.sin(2 * Math.PI * theta);
            const c = Math.cos(2 * Math.PI * theta);
            this.graphics.lineTo(s, c);
        }
        this.graphics.endHole()
            .closePath()
            .endFill();

        container.addChild(this.graphics);
    }

    update(): void {
        let position: Vector;
        let radius: number;
        if (this.state === GasState.Advancing) {
            const interpFactor = clamp((Date.now() - this.lastUpdateTime) / TICKS_PER_SECOND, 0, 1);
            position = vecLerp(this.lastPosition, this.position, interpFactor);
            radius = lerp(this.lastRadius, this.radius, interpFactor);
        } else {
            position = this.position;
            radius = this.radius;
        }

        const center = vMul(position, this.scale);
        // Once the hole gets small enough, just fill the entire
        // screen with some random part of the geometry
        let rad = radius * this.scale;
        if (rad < 0.1) {
            rad = 1.0;
            center.x += 0.5 * kOverdraw;
        }
        this.graphics.position.copyFrom(center);
        this.graphics.scale.set(rad);
    }

    updateFrom(gas: Gas): void {
        this.state = gas.state;
        this.initialDuration = gas.initialDuration;
        this.oldPosition = gas.oldPosition;
        this.lastPosition = gas.lastPosition;
        this.position = gas.position;
        this.newPosition = gas.newPosition;
        this.oldRadius = gas.oldRadius;
        this.lastRadius = gas.lastRadius;
        this.radius = gas.radius;
        this.newRadius = gas.newRadius;
        this.lastUpdateTime = gas.lastUpdateTime;
    }
}
