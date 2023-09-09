import { GasState } from "../../common/src/constants";
import { distanceSquared, lerp, vecLerp } from "../../common/src/utils/math";
import { log } from "../../common/src/utils/misc";
import { randomPointInsideCircle } from "../../common/src/utils/random";
import { type Vector, v, vClone } from "../../common/src/utils/vector";
import { Config, GasMode } from "./config";
import { GasStages } from "./data/gasStages";
import { type Game } from "./game";
import { createNewGame } from "./server";

export class Gas {
    stage = 0;
    state = GasState.Inactive;
    initialDuration = 0;
    countdownStart = 0;
    percentage = 0;

    oldPosition: Vector;
    newPosition: Vector;
    currentPosition: Vector;

    oldRadius = GasStages[0].oldRadius;
    newRadius = GasStages[0].newRadius;

    currentRadius = GasStages[0].oldRadius;
    dps = 0;
    ticksSinceLastDamage = 0;

    dirty = false;
    percentageDirty = false;

    doDamage = false;

    game: Game;
    timeoutID: NodeJS.Timeout | undefined;

    constructor(game: Game) {
        this.game = game;

        this.oldPosition = v(game.map.width / 2, game.map.height / 2);
        this.newPosition = vClone(this.oldPosition);
        this.currentPosition = vClone(this.oldPosition);
    }

    tick(): void {
        if (this.state !== GasState.Inactive) {
            this.percentage = (this.game.now - this.countdownStart) / (1000 * this.initialDuration);
            this.percentageDirty = true;
        }

        this.ticksSinceLastDamage++;
        this.doDamage = false;
        if (this.ticksSinceLastDamage >= 30) {
            this.ticksSinceLastDamage = 0;
            this.doDamage = true;
            if (this.state === GasState.Advancing) {
                this.currentPosition = vecLerp(this.oldPosition, this.newPosition, this.percentage);
                this.currentRadius = lerp(this.oldRadius, this.newRadius, this.percentage);
            }
        }
    }

    advanceGas(): void {
        if (Config.gas.mode === GasMode.Disabled) return;
        const currentStage = GasStages[this.stage + 1];
        if (currentStage === undefined) return;
        const duration = Config.gas.mode === GasMode.Debug && currentStage.duration !== 0 ? Config.gas.overrideDuration : currentStage.duration;
        this.stage++;
        this.state = currentStage.state;
        this.initialDuration = duration;
        this.percentage = 1;
        this.countdownStart = this.game.now;

        if (currentStage.preventJoin) {
            log(`Game #${this.game.id} is preventing new players from joining`);
            this.game.allowJoin = false;
            const id = this.game.id === 0 ? 1 : 0;
            createNewGame(id);
        }

        if (currentStage.state === GasState.Waiting) {
            this.oldPosition = vClone(this.newPosition);
            if (currentStage.newRadius !== 0) {
                this.newPosition = Config.gas.mode !== GasMode.Debug
                    ? randomPointInsideCircle(this.oldPosition, currentStage.oldRadius - currentStage.newRadius)
                    : v(this.game.map.width / 2, this.game.map.height / 2);
            } else {
                this.newPosition = vClone(this.oldPosition);
            }
            this.currentPosition = vClone(this.oldPosition);
            this.currentRadius = currentStage.oldRadius;
        }
        this.oldRadius = currentStage.oldRadius;
        this.newRadius = currentStage.newRadius;
        this.dps = currentStage.dps;
        this.dirty = true;
        this.percentageDirty = true;

        // Start the next stage
        if (duration !== 0) {
            this.timeoutID = setTimeout(() => this.advanceGas(), duration * 1000);
        }
    }

    isInGas(position: Vector): boolean {
        return distanceSquared(position, this.currentPosition) >= this.currentRadius ** 2;
    }
}
