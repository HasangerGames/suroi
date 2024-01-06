import { DisplayObject } from "pixi.js";
import { Numeric } from "../../../../common/src/utils/math";
import { type Game } from "../game";

export class Tween<T> {
    readonly game: Game;

    startTime = Date.now();
    endTime: number;

    readonly target: T;
    readonly duration!: number;

    startValues: Record<string, number> = {};
    endValues: Record<string, number> = {};

    readonly ease?: (x: number) => number;

    yoyo?: boolean;

    readonly onUpdate?: () => void;
    readonly onComplete?: () => void;

    dead = false;

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
        this.ease = config.ease;
        this.yoyo = config.yoyo;
        this.onUpdate = config.onUpdate;
        this.onComplete = config.onComplete;
        this.endTime = this.startTime + this.duration;
        this.game.tweens.add(this);
    }

    update(): void {
        const now = Date.now();

        // fix tweens trying to change properties of destroyed pixi objects and crashing the client
        if (this.target instanceof DisplayObject && (this.target.destroyed || this.target.transform === undefined)) {
            this.kill();
            return;
        }

        if (now >= this.endTime) {
            for (const [key, value] of Object.entries(this.endValues)) {
                (this.target[key as keyof T] as number) = value;
            }

            if (this.yoyo) {
                this.yoyo = false;
                this.startTime = now;
                this.endTime = this.startTime + this.duration;
                [this.startValues, this.endValues] = [this.endValues, this.startValues];
            } else {
                this.kill();
                this.onComplete?.();
            }
            return;
        }

        for (const key in this.startValues) {
            const startValue = this.startValues[key];
            const endValue = this.endValues[key];
            const interpFactor = (now - this.startTime) / this.duration;
            (this.target[key as keyof T] as number) = Numeric.lerp(startValue, endValue, (this.ease ?? (t => t))(interpFactor));
        }

        this.onUpdate?.();
    }

    kill(): void {
        this.dead = true;
        this.game.tweens.delete(this);
    }
}
