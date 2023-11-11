import { Graphics } from "pixi.js";
import { GasState, TICKS_PER_SECOND, ZIndexes } from "../../../../common/src/constants";
import { clamp, lerp, vecLerp } from "../../../../common/src/utils/math";
import { v, type Vector, vMul, vClone } from "../../../../common/src/utils/vector";
import { COLORS, UI_DEBUG_MODE } from "../utils/constants";
import { type UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { formatDate } from "../utils/misc";
import { type Game } from "../game";

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

        const gasPercentage = data.gasPercentage?.value;

        if (gas) {
            this.state = gas.state;
            this.initialDuration = gas.initialDuration;
            this.oldPosition = gas.oldPosition;
            this.newPosition = gas.newPosition;
            this.oldRadius = gas.oldRadius;
            this.newRadius = gas.newRadius;

            const [isInactive, isAdvancing] = [
                gas.state === GasState.Inactive,
                gas.state === GasState.Advancing
            ];

            const time = this.initialDuration - Math.round(this.initialDuration * (gasPercentage ?? 1));

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
                (isInactive || gas.initialDuration !== 0) &&
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

        if (gasPercentage !== undefined) {
            const time = this.initialDuration - Math.round(this.initialDuration * gasPercentage);
            this._ui.timerText.text(`${Math.floor(time / 60)}:${(time % 60) < 10 ? "0" : ""}${time % 60}`);

            if (this.state !== GasState.Advancing) {
                this.position = this.oldPosition;
                this.radius = this.oldRadius;
            }

            if (this.state === GasState.Advancing) {
                this.lastPosition = vClone(this.position);
                this.lastRadius = this.radius;
                this.position = vecLerp(this.oldPosition, this.newPosition, gasPercentage);
                this.radius = lerp(this.oldRadius, this.newRadius, gasPercentage);
                this.lastUpdateTime = Date.now();
            }
        }
    }
}

export class GasRender {
    graphics: Graphics;

    scale: number;

    constructor(scale: number) {
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
    }

    update(gas: Gas): void {
        let position: Vector;
        let radius: number;

        if (gas.state === GasState.Advancing) {
            const interpFactor = clamp((Date.now() - gas.lastUpdateTime) / TICKS_PER_SECOND, 0, 1);
            position = vecLerp(gas.lastPosition, gas.position, interpFactor);
            radius = lerp(gas.lastRadius, gas.radius, interpFactor);
        } else {
            position = gas.position;
            radius = gas.radius;
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
}
