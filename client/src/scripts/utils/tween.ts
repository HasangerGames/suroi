import { DisplayObject } from "pixi.js";
import { lerp } from "../../../../common/src/utils/math";
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
            (this.target[key as keyof T] as number) = lerp(startValue, endValue, this.ease ? this.ease(interpFactor) : interpFactor);
        }
        this.onUpdate?.();
    }

    kill(): void {
        this.dead = true;
        this.game.tweens.delete(this);
    }
}

// Credit to https://easings.net/
export const EaseFunctions = {
    quartIn: (x: number) => x * x * x * x,
    sextIn: (x: number) => Math.pow(x, 6),
    sineIn: (x: number) => 1 - Math.cos((x * Math.PI) / 2),
    sineOut: (x: number) => Math.sin((x * Math.PI) / 2),
    expoOut: (x: number): number => x === 1 ? 1 : 1 - Math.pow(2, -10 * x),
    elasticOut: (x: number): number => {
        const c4 = (2 * Math.PI) / 3;

        return x === 0
            ? 0
            : x === 1
                ? 1
                : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    },
    backOut: (x: number): number => {
        const c1 = 1.70158;
        const c3 = c1 + 1;

        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
    outCubic: (x: number): number => {
        return 1 - Math.pow(1 - x, 3);
    }
};
