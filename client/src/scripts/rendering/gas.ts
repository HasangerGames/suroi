import { GasState } from "@common/constants";
import { type UpdatePacketDataOut } from "@common/packets/updatePacket";
import { Numeric } from "@common/utils/math";
import { Vec, type Vector } from "@common/utils/vector";
import $ from "jquery";
import { Graphics } from "pixi.js";
import { getTranslatedString } from "../../translations";
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

    private readonly _ui: {
        readonly msgText: JQuery<HTMLDivElement>
        readonly msgContainer: JQuery<HTMLDivElement>
        readonly timer: JQuery<HTMLDivElement>
        readonly timerText: JQuery<HTMLSpanElement>
        readonly timerImg: JQuery<HTMLImageElement>
    };

    private static _instantiated = false;
    constructor(readonly game: Game) {
        if (Gas._instantiated) {
            throw new Error("Class 'Gas' has already been instantiated");
        }
        Gas._instantiated = true;

        this._ui = {
            msgText: this.game.uiManager.ui.gasMsgInfo,
            msgContainer: this.game.uiManager.ui.gasMsg,

            timer: $<HTMLDivElement>("#gas-timer"),
            timerText: $<HTMLSpanElement>("#gas-timer-text"),
            timerImg: $<HTMLImageElement>("#gas-timer-image")
        };
    }

    updateFrom(data: UpdatePacketDataOut): void {
        const gas = data.gas;

        const gasProgress = data.gasProgress;

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
                    gasMessage = getTranslatedString("gas_waiting", { time: formatDate(time) });
                    break;
                }
                case GasState.Advancing: {
                    gasMessage = getTranslatedString("gas_advancing");
                    break;
                }
                case GasState.Inactive: {
                    gasMessage = getTranslatedString("gas_inactive");
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
                (isInactive || gas.currentDuration !== 0)
                && !UI_DEBUG_MODE
                && (!this.game.gameOver || this.game.spectating)
            ) {
                this._ui.msgText.text(gasMessage);
                this._ui.msgContainer.fadeIn();
                if (isInactive) {
                    this._ui.msgText.css("color", "white");
                } else {
                    this._ui.msgText.css("color", "cyan");
                    setTimeout(() => this._ui.msgContainer.fadeOut(1000), 5000);
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

        this._graphics.zIndex = 996;

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

        const tau = 2 * Math.PI;
        for (let i = 0; i < GasRender._segments; i++) {
            const interp = i / GasRender._segments;
            this.graphics.lineTo(
                Math.sin(tau * interp),
                Math.cos(tau * interp)
            );
        }
        this.graphics
            .closePath()
            .cut();
    }

    update(gas: Gas): void {
        let position: Vector;
        let radius: number;

        if (gas.state === GasState.Advancing) {
            const interpFactor = Numeric.clamp((Date.now() - gas.lastUpdateTime) / gas.game.serverDt, 0, 1);
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
