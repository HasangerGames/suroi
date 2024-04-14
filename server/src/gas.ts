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

    readonly game: Game;
    readonly mapSize: number;

    constructor(game: Game) {
        this.game = game;
        this.mapSize = (this.game.map.width + this.game.map.height) / 2;

        const firstStage = GasStages[0];
        this.oldRadius = firstStage.oldRadius * this.mapSize;
        this.newRadius = firstStage.newRadius * this.mapSize;
        this.currentRadius = firstStage.oldRadius * this.mapSize;

        this.oldPosition = Vec.create(game.map.width / 2, game.map.height / 2);
        this.newPosition = Vec.clone(this.oldPosition);
        this.currentPosition = Vec.clone(this.oldPosition);
        this._lastDamageTimestamp = this.game.now;
    }

    tick(): void {
        if (this.state !== GasState.Inactive) {
            this.completionRatio = (this.game.now - this.countdownStart) / (1000 * this.currentDuration);
            this.completionRatioDirty = true;
        }

        this._doDamage = false;

        if (this.game.now - this._lastDamageTimestamp >= 1000) {
            this._lastDamageTimestamp = this.game.now;
            this._doDamage = true;

            if (this.state === GasState.Advancing) {
                this.currentPosition = Vec.lerp(this.oldPosition, this.newPosition, this.completionRatio);
                this.currentRadius = Numeric.lerp(this.oldRadius, this.newRadius, this.completionRatio);
            }
        }
    }

    // Get current quadrant of provided coordinates
    getQuadrant(x: number, y: number, width: number, height: number): number {
        if (x < width / 2 && y < height / 2) {
            return 1;
        } else if (x >= width / 2 && y < height / 2) {
            return 2;
        } else if (x < width / 2 && y >= height / 2) {
            return 3;
        } else {
            return 4;
        }
    }

    // Generate random coordinate within quadrant
    genQuadCoord(x: number, y: number, width: number, height: number): { x: number, y: number } {
        // Get the current int quadrant.
        const quad = this.getQuadrant(x, y, width, height);
        // Define initial offsets by dividing width and height into 4ths and multiplying it by a random number between 0 and 1
        let xOffset = Math.ceil(width / 4 * Math.random());
        let yOffset = Math.ceil(height / 4 * Math.random());
        // Randomly toggle weighting
        const isWeighted = Math.random() < 0.5;
        // Apply weighting to the outer corners
        if (isWeighted) {
            xOffset = Math.random() < 0.5 ? Math.ceil(xOffset * 0.2) : xOffset;
            yOffset = Math.random() < 0.5 ? Math.ceil(yOffset * 0.2) : yOffset;
        }
        // Case switch to depending on the quadrant generate the random offset for said quadrant with a random weight towards outer or inner map.
        switch (quad) {
            case 1:
                return { x: Math.ceil(width / 4 + xOffset), y: Math.ceil(height / 4 + yOffset) };
            case 2:
                return { x: Math.ceil(3 * width / 4 - xOffset), y: Math.ceil(height / 4 + yOffset) };
            case 3:
                return { x: Math.ceil(width / 4 + xOffset), y: Math.ceil(3 * height / 4 - yOffset) };
            case 4:
            default:
                return { x, y };
        }
    }

    // Calc the delta from 2 coordinates
    checkGDelta(x: number, y: number, _x: number, _y: number): number {
        const _dx = x - _x;
        const _dy = y - _y;
        return Math.ceil(Math.sqrt(_dx * _dx + _dy * _dy));
    }

    advanceGasStage(): void {
        if (Config.gas.mode === GasMode.Disabled) return;
        const currentStage = GasStages[this.stage + 1];
        if (currentStage === undefined) return;

        const duration = Config.gas.mode === GasMode.Debug && Config.gas.overrideDuration !== undefined && currentStage.duration !== 0
            ? Config.gas.overrideDuration
            : currentStage.duration;

        this.stage++;
        this.state = currentStage.state;
        this.currentDuration = duration;
        this.completionRatio = 1;
        this.countdownStart = this.game.now;

        if (currentStage.state === GasState.Waiting) {
            this.oldPosition = Vec.clone(this.newPosition);
            if (currentStage.newRadius !== 0) {
                if (Config.gas.mode === GasMode.Debug && Config.gas.overridePosition) {
                    this.newPosition = Vec.create(this.game.map.width / 2, this.game.map.height / 2);
                } else {
                    this.newPosition = randomPointInsideCircle(this.oldPosition, currentStage.newRadius * this.mapSize);
                    //const radius = currentStage.newRadius * this.mapSize;
                    // Get the coordinate in quadrant
                    let _quadCoord = this.genQuadCoord(this.newPosition.x, this.newPosition.y, this.game.map.width, this.game.map.height);
                    // While the current stage is greater then 2 (ignore the 2 largest stages) and if the deviation/delta of the old circle center to new circle center is greater then the old circle radius * 1.2, then regenerate a new coordinate until its within range.
                    while (this.stage > 2 && this.checkGDelta(this.oldPosition.x, this.oldPosition.y, _quadCoord.x, _quadCoord.y) > (this.oldRadius) * 1.2) {
                        console.log("Gas gen exceded max deviation distance, regenerating...");
                        _quadCoord = this.genQuadCoord(this.newPosition.x, this.newPosition.y, this.game.map.width, this.game.map.height);
                    }

                    this.newPosition.x = _quadCoord.x;
                    this.newPosition.y = _quadCoord.y;
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
            this.game.summonAirdrop(
                this.game.map.getRandomPosition(
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
            this.game.addTimeout(() => this.advanceGasStage(), duration * 1000);
        }
    }

    isInGas(position: Vector): boolean {
        return Geometry.distanceSquared(position, this.currentPosition) >= this.currentRadius ** 2;
    }
}
