import { GasState } from "../../common/src/constants";
import { clamp, distanceSquared, lerp, vecLerp } from "../../common/src/utils/math";
import { randomPointInsideCircle } from "../../common/src/utils/random";
import { v, vClone, type Vector } from "../../common/src/utils/vector";
import { Config, GasMode } from "./config";
import { GasStages } from "./data/gasStages";
import { type Game } from "./game";
import { Logger } from "./utils/misc";
import { newGame } from "./server";

export class Gas {
    stage = 0;
    state = GasState.Inactive;
    initialDuration = 0;
    countdownStart = 0;
    percentage = 0;

    oldPosition: Vector;
    newPosition: Vector;
    currentPosition: Vector;

    oldRadius: number;
    newRadius: number;
    currentRadius: number;

    dps = 0;
    ticksSinceLastDamage = 0;

    dirty = false;
    percentageDirty = false;

    doDamage = false;

    game: Game;
    timeoutID: NodeJS.Timeout | undefined;
    mapSize: number;

    constructor(game: Game) {
        this.game = game;

        this.mapSize = (this.game.map.width + this.game.map.height) / 2;

        this.oldRadius = GasStages[0].oldRadius * this.mapSize;
        this.newRadius = GasStages[0].newRadius * this.mapSize;
        this.currentRadius = GasStages[0].oldRadius * this.mapSize;

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
            newGame();
            Logger.log(`Game #${this.game.id} | Preventing new players from joining`);
            this.game.allowJoin = false;
        }

        if (currentStage.state === GasState.Waiting) {
            this.oldPosition = vClone(this.newPosition);
            if (currentStage.newRadius !== 0) {
                if (Config.gas.mode === GasMode.Debug) {
                    this.newPosition = v(this.game.map.width / 2, this.game.map.height / 2);
                } else {
                    this.newPosition = randomPointInsideCircle(this.oldPosition, currentStage.oldRadius - currentStage.newRadius);
                    const radius = currentStage.newRadius;
                    this.newPosition.x = clamp(this.newPosition.x, radius, this.game.map.width - radius);
                    this.newPosition.y = clamp(this.newPosition.y, radius, this.game.map.height - radius);
                }
            } else {
                this.newPosition = vClone(this.oldPosition);
            }
            this.currentPosition = vClone(this.oldPosition);
            this.currentRadius = currentStage.oldRadius * this.mapSize;
        }
        this.oldRadius = currentStage.oldRadius * this.mapSize;
        this.newRadius = currentStage.newRadius * this.mapSize;
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
