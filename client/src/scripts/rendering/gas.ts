import $ from "jquery";
import { Graphics } from "pixi.js";
import { GameConstants, GasState, ZIndexes } from "../../../../common/src/constants";
import { type UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { Numeric } from "../../../../common/src/utils/math";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { COLORS, UI_DEBUG_MODE } from "../utils/constants";
import { formatDate } from "../utils/misc";

export class Gas {
    state = GasState.Inactive;
    currentDuration = 0;
    oldPosition = Vec.create(0, 0);
    lastPosition = Vec.create(0, 0);
    position = Vec.create(0, 0);
    newPosition = Vec.create(0, 0);
    oldRadius = 2048;
    lastRadius = 2048;
    radius = 2048;
    newRadius = 2048;

    lastUpdateTime = Date.now();

    game: Game;

    private readonly _ui = {
        msgText: $("#gas-msg-info"),
        msgContainer: $("#gas-msg"),

        timer: $("#gas-timer"),
        timerText: $("#gas-timer-text"),
        timerImg: $("#gas-timer-image")
    };

    constructor(game: Game) {
        this.game = game;
    }

    updateFrom(data: UpdatePacket): void {
        const gas = data.gas;

        const gasProgress = data.gasProgress?.value;

        if (gas) {
            this.state = gas.state;
            this.currentDuration = gas.currentDuration;
            this.oldPosition = gas.oldPosition;
            this.newPosition = gas.newPosition;
            this.oldRadius = gas.oldRadius;
            this.newRadius = gas.newRadius;

            const [isInactive, isAdvancing] = [
                gas.state === GasState.Inactive,
                gas.state === GasState.Advancing
            ];

            const time = this.currentDuration - Math.round(this.currentDuration * (gasProgress ?? 1));

            let gasMessage = "";
            switch (this.state) {
                case GasState.Waiting: {
                    gasMessage = `Toxic gas advances in ${formatDate(time)}`;
                    break;
                }
                case GasState.Advancing: {
                    gasMessage = "Toxic gas is advancing! Move to the safe zone";
                    break;
                }
                case GasState.Inactive: {
                    gasMessage = "Waiting for players...";
                    break;
                }
            }

            if (isAdvancing) {
                this._ui.timer.addClass("advancing");
                this._ui.timerImg.attr("src", "./img/misc/gas-advancing-icon.svg");
            } else {
                this._ui.timer.removeClass("advancing");
                this._ui.timerImg.attr("src", "./img/misc/gas-waiting-icon.svg");
            }

            if (
                (isInactive || gas.currentDuration !== 0) &&
                !UI_DEBUG_MODE &&
                (!this.game.gameOver || this.game.spectating)
            ) {
                this._ui.msgText.text(gasMessage);
                this._ui.msgContainer.fadeIn();
                if (isInactive) {
                    this._ui.msgText.css("color", "white");
                } else {
                    this._ui.msgText.css("color", "cyan");
                    setTimeout(() => $("#gas-msg").fadeOut(1000), 5000);
                }
            }
        }

        if (gasProgress !== undefined) {
            const time = this.currentDuration - Math.round(this.currentDuration * gasProgress);
            this._ui.timerText.text(`${Math.floor(time / 60)}:${(time % 60) < 10 ? "0" : ""}${time % 60}`);

            if (this.state !== GasState.Advancing) {
                this.position = this.oldPosition;
                this.radius = this.oldRadius;
            }

            if (this.state === GasState.Advancing) {
                this.lastPosition = Vec.clone(this.position);
                this.lastRadius = this.radius;
                this.position = Vec.lerp(this.oldPosition, this.newPosition, gasProgress);
                this.radius = Numeric.lerp(this.oldRadius, this.newRadius, gasProgress);
                this.lastUpdateTime = Date.now();
            }
        }
    }
}

export class GasRender {
    private readonly _graphics: Graphics;
    public get graphics(): Graphics { return this._graphics; }

    private readonly _scale: number;

    private static readonly _overdraw = 100 * 1000;
    private static readonly _segments = 512;

    constructor(scale: number) {
        this._scale = scale;

        this._graphics = new Graphics();

        this._graphics.zIndex = ZIndexes.Gas;

        // Generate a giant planar mesh with a tiny circular hole in
        // the center to act as the gas overlay
        this.graphics.clear()
            .beginPath()
            .moveTo(-GasRender._overdraw, -GasRender._overdraw)
            .lineTo(GasRender._overdraw, -GasRender._overdraw)
            .lineTo(GasRender._overdraw, GasRender._overdraw)
            .lineTo(-GasRender._overdraw, GasRender._overdraw)
            .closePath()
            .fill(COLORS.gas)
            .moveTo(0, 1);
        for (let i = 1; i < GasRender._segments; i++) {
            const theta = i / GasRender._segments;
            const s = Math.sin(2 * Math.PI * theta);
            const c = Math.cos(2 * Math.PI * theta);
            this.graphics.lineTo(s, c);
        }
        this.graphics
            .closePath()
            .cut();
    }

    update(gas: Gas): void {
        let position: Vector;
        let radius: number;

        if (gas.state === GasState.Advancing) {
            const interpFactor = Numeric.clamp((Date.now() - gas.lastUpdateTime) / GameConstants.msPerTick, 0, 1);
            position = Vec.lerp(gas.lastPosition, gas.position, interpFactor);
            radius = Numeric.lerp(gas.lastRadius, gas.radius, interpFactor);
        } else {
            position = gas.position;
            radius = gas.radius;
        }

        const center = Vec.scale(position, this._scale);
        // Once the hole gets small enough, just fill the entire
        // screen with some random part of the geometry
        let rad = radius * this._scale;
        if (rad < 0.1) {
            rad = 1.0;
            center.x += 0.5 * GasRender._overdraw;
        }
        this._graphics.position.copyFrom(center);
        this._graphics.scale.set(rad);
    }
}
