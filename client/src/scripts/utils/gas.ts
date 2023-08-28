import { type Container, Graphics } from "pixi.js";
import { type Game } from "../game";
import { v, vMul } from "../../../../common/src/utils/vector";
import { GasState } from "../../../../common/src/constants";
import { COLORS } from "./constants";

const kOverdraw = 100 * 1000;
const kSegments = 512;

export class Gas {
    game: Game;

    state = GasState.Inactive;
    initialDuration = 0;
    oldPosition = v(0, 0);
    position = v(0, 0);
    newPosition = v(0, 0);
    oldRadius = 2048;
    radius = 2048;
    newRadius = 2048;
    firstPercentageReceived = false;

    graphics: Graphics;

    scale: number;

    constructor(game: Game, scale: number, container: Container) {
        this.game = game;
        this.scale = scale;

        this.graphics = new Graphics();

        this.graphics.zIndex = 99;

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

    render(): void {
        const center = vMul(this.position, this.scale);
        // Once the hole gets small enough, just fill the entire
        // screen with some random part of the geometry
        let rad = this.radius * this.scale;
        if (rad < 0.1) {
            rad = 1.0;
            center.x += 0.5 * kOverdraw;
        }
        this.graphics.position.copyFrom(center);
        this.graphics.scale.set(rad, rad);
    }
}
