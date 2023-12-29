import { GasState } from "../../common/src/constants";
import { CircleHitbox } from "../../common/src/utils/hitbox";
import { Geometry, Numeric } from "../../common/src/utils/math";
import { MapObjectSpawnMode } from "../../common/src/utils/objectDefinitions";
import { randomPointInsideCircle } from "../../common/src/utils/random";
import { Vec, type Vector } from "../../common/src/utils/vector";
import { Config, GasMode } from "./config";
import { GasStages } from "./data/gasStages";
import { type Game } from "./game";

export class Gas {
    stage = 0;
    state = GasState.Inactive;
    currentDuration = 0;
    countdownStart = 0;
    completionRatio = 0;

    oldPosition: Vector;
    newPosition: Vector;
    currentPosition: Vector;

    oldRadius: number;
    newRadius: number;
    currentRadius: number;

    dps = 0;
    private _lastDamageTimestamp;

    dirty = false;
    completionRatioDirty = false;

    private _doDamage = false;
    get doDamage(): boolean { return this._doDamage; }

    private readonly _game: Game;
    get game(): Game { return this._game; }

    private readonly _mapSize: number;
    get mapSize(): number { return this._mapSize; }

    constructor(game: Game) {
        this._game = game;

        this._mapSize = (this._game.map.width + this._game.map.height) / 2;

        this.oldRadius = GasStages[0].oldRadius * this._mapSize;
        this.newRadius = GasStages[0].newRadius * this._mapSize;
        this.currentRadius = GasStages[0].oldRadius * this._mapSize;

        this.oldPosition = Vec.create(game.map.width / 2, game.map.height / 2);
        this.newPosition = Vec.clone(this.oldPosition);
        this.currentPosition = Vec.clone(this.oldPosition);
        this._lastDamageTimestamp = this._game.now;
    }

    tick(): void {
        if (this.state !== GasState.Inactive) {
            this.completionRatio = (this._game.now - this.countdownStart) / (1000 * this.currentDuration);
            this.completionRatioDirty = true;
        }

        this._doDamage = false;

        if (this._game.now - this._lastDamageTimestamp >= 1000) {
            this._lastDamageTimestamp = this._game.now;
            this._doDamage = true;

            if (this.state === GasState.Advancing) {
                this.currentPosition = Vec.lerp(this.oldPosition, this.newPosition, this.completionRatio);
                this.currentRadius = Numeric.lerp(this.oldRadius, this.newRadius, this.completionRatio);
            }
        }
    }

    advanceGasStage(): void {
        if (Config.gas.mode === GasMode.Disabled) return;
        const currentStage = GasStages[this.stage + 1];
        if (currentStage === undefined) return;

        const duration = Config.gas.mode === GasMode.Debug && currentStage.duration !== 0
            ? Config.gas.overrideDuration
            : currentStage.duration;

        this.stage++;
        this.state = currentStage.state;
        this.currentDuration = duration;
        this.completionRatio = 1;
        this.countdownStart = this._game.now;

        if (currentStage.state === GasState.Waiting) {
            this.oldPosition = Vec.clone(this.newPosition);
            if (currentStage.newRadius !== 0) {
                if (Config.gas.mode === GasMode.Debug) {
                    this.newPosition = Vec.create(this._game.map.width / 2, this._game.map.height / 2);
                } else {
                    this.newPosition = randomPointInsideCircle(this.oldPosition, (currentStage.oldRadius - currentStage.newRadius) * this.mapSize);
                    const radius = currentStage.newRadius * this.mapSize;
                    this.newPosition.x = Numeric.clamp(this.newPosition.x, radius, this._game.map.width - radius);
                    this.newPosition.y = Numeric.clamp(this.newPosition.y, radius, this._game.map.height - radius);
                }
            } else {
                this.newPosition = Vec.clone(this.oldPosition);
            }
            this.currentPosition = Vec.clone(this.oldPosition);
            this.currentRadius = currentStage.oldRadius * this.mapSize;
        }

        this.oldRadius = currentStage.oldRadius * this.mapSize;
        this.newRadius = currentStage.newRadius * this.mapSize;
        this.dps = currentStage.dps;
        this.dirty = true;
        this.completionRatioDirty = true;

        if (currentStage.summonAirdrop) {
            this._game.summonAirdrop(
                this._game.map.getRandomPosition(
                    new CircleHitbox(15),
                    {
                        maxAttempts: 500,
                        spawnMode: MapObjectSpawnMode.GrassAndSand,
                        collides: position => Geometry.distanceSquared(position, this.currentPosition) >= this.newRadius ** 2
                    }
                ) ?? this.newPosition
            );
        }

        // Start the next stage
        if (duration !== 0) {
            this._game.addTimeout(() => this.advanceGasStage(), duration * 1000);
        }
    }

    isInGas(position: Vector): boolean {
        return Geometry.distanceSquared(position, this.currentPosition) >= this.currentRadius ** 2;
    }
}
