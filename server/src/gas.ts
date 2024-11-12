import { GameConstants, GasState } from "@common/constants";
import { CircleHitbox } from "@common/utils/hitbox";
import { Geometry, Numeric } from "@common/utils/math";
import { MapObjectSpawnMode } from "@common/utils/objectDefinitions";
import { randomBoolean, randomPointInsideCircle } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
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

    // Generate random coordinate within quadrant
    private static _genQuadCoord(v: Vector, width: number, height: number): Vector {
        // Define initial offsets by dividing width and height into 4ths and multiplying it by a random number between 0 and 1
        let xOffset = Math.ceil(width / 4 * Math.random());
        let yOffset = Math.ceil(height / 4 * Math.random());

        // Apply weighting to the outer corners
        if (randomBoolean()) {
            xOffset = randomBoolean() ? Math.ceil(xOffset * 0.2) : xOffset;
            yOffset = randomBoolean() ? Math.ceil(yOffset * 0.2) : yOffset;
        }

        // Case switch to, depending on the quadrant, generate the random offset for said
        // quadrant, with a random weight towards this outside or the inside of the map
        const { x, y } = v;
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        if (x < halfWidth && y < halfHeight) {
            return Vec.create(Math.ceil(width / 4 + xOffset), Math.ceil(height / 4 + yOffset));
        } else if (x >= halfWidth && y < halfHeight) {
            return Vec.create(Math.ceil(3 * width / 4 - xOffset), Math.ceil(height / 4 + yOffset));
        } else if (x < halfWidth && y >= halfHeight) {
            return Vec.create(Math.ceil(width / 4 + xOffset), Math.ceil(3 * height / 4 - yOffset));
        } else {
            return Vec.create(x, y);
        }
    }

    scaledDamage(position: Vector): number {
        const distIntoGas = Geometry.distance(position, this.currentPosition) - this.currentRadius;
        return this.dps + Numeric.clamp(distIntoGas - GameConstants.gas.unscaledDamageDist, 0, Infinity) * GameConstants.gas.damageScaleFactor;
    }

    advanceGasStage(): void {
        const { gas } = Config;
        if (gas.mode === GasMode.Disabled) return;

        const currentStage = GasStages[this.stage + 1];
        if (currentStage === undefined) return;

        const isDebug = gas.mode === GasMode.Debug;
        const duration = isDebug && gas.overrideDuration !== undefined && currentStage.duration !== 0
            ? gas.overrideDuration
            : currentStage.duration;

        this.stage++;
        this.state = currentStage.state;
        this.currentDuration = duration;
        this.completionRatio = 1;
        this.countdownStart = this.game.now;

        if (currentStage.state === GasState.Waiting) {
            this.oldPosition = Vec.clone(this.newPosition);
            if (currentStage.newRadius !== 0) {
                const { width, height } = this.game.map;
                if (isDebug && gas.overridePosition) {
                    this.newPosition = Vec.create(width / 2, height / 2);
                } else {
                    const maxDistance = (currentStage.oldRadius - currentStage.newRadius) * this.mapSize;
                    const maxDistanceSquared = maxDistance ** 2;

                    this.newPosition = randomPointInsideCircle(this.oldPosition, maxDistance);

                    let quadCoord = Gas._genQuadCoord(this.newPosition, width, height);
                    let foundPosition = false;
                    for (let attempts = 0; attempts < 100; attempts++) {
                        quadCoord = Gas._genQuadCoord(this.newPosition, width, height);
                        if (Geometry.distanceSquared(quadCoord, this.oldPosition) <= maxDistanceSquared) {
                            foundPosition = true;
                            break;
                        }
                    }

                    if (foundPosition) this.newPosition = quadCoord;
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
