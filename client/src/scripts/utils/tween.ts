import { Container } from "pixi.js";
import { Numeric } from "../../../../common/src/utils/math";
import { type Game } from "../game";

export class Tween<T> {
    readonly game: Game;

    startTime = Date.now();
    private _endTime: number;
    get endTime(): number { return this._endTime; }

    readonly target: T;
    readonly duration: number;

    startValues: Record<string, number> = {};
    endValues: Record<string, number> = {};

    readonly ease: (x: number) => number;

    yoyo: boolean;

    readonly onUpdate?: () => void;
    readonly onComplete?: () => void;

    constructor(
        game: Game,
        config: {
            target: T
            to: Partial<T>
            duration: number
            ease?: (x: number) => number
            yoyo?: boolean
            onUpdate?: () => void
            onComplete?: () => void
        }
    ) {
        this.game = game;
        this.target = config.target;
        for (const key in config.to) {
            this.startValues[key] = config.target[key] as number;
            this.endValues[key] = config.to[key] as number;
        }

        this.duration = config.duration;
        this.ease = config.ease ?? (t => t);
        this.yoyo = config.yoyo ?? false;
        this.onUpdate = config.onUpdate;
        this.onComplete = config.onComplete;
        this._endTime = this.startTime + this.duration;
    }

    update(): void {
        const now = Date.now();

        // fix tweens trying to change properties of destroyed pixi objects and crashing the client
        if (this.target instanceof Container && this.target.destroyed) {
            this.kill();
            return;
        }

        const interpFactor = Numeric.clamp((now - this.startTime) / this.duration, 0, 1);
        for (const key in this.startValues) {
            const startValue = this.startValues[key];
            const endValue = this.endValues[key];

            (this.target[key as keyof T] as number) = Numeric.lerp(startValue, endValue, this.ease(interpFactor));
        }
        this.onUpdate?.();

        if (now >= this.endTime) {
            if (this.yoyo) {
                this.yoyo = false;
                this.startTime = now;
                this._endTime = this.startTime + this.duration;
                [this.startValues, this.endValues] = [this.endValues, this.startValues];
            } else {
                this.kill();
                this.onComplete?.();
            }
        }
    }

    kill(): void {
        this.game.removeTween(this);
    }
}
