import { ColorStyles, Logger, styleText } from "@common/utils/logging";
import { ServerResponse } from "node:http";
import { StaticOrSwitched, Switchable } from "../config";
import Cron from "croner";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export function serverLog(...message: unknown[]): void {
    Logger.log(styleText("[Server]", ColorStyles.foreground.magenta.normal), ...message);
}

export function serverWarn(...message: unknown[]): void {
    Logger.warn(styleText("[Server] [WARNING]", ColorStyles.foreground.yellow.normal), ...message);
}

export function serverError(...message: unknown[]): void {
    Logger.warn(styleText("[Server] [ERROR]", ColorStyles.foreground.red.normal), ...message);
}

export function forbidden(res: ServerResponse): void {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain").end("403 Forbidden");
}

export function notFound(res: ServerResponse): void {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain").end("404 Not Found");
}

export class RateLimiter {
    private _ipMap: Record<string, number> = {};

    constructor(readonly max: number, readonly resetInterval?: number) {
        if (resetInterval) {
            setInterval(() => this._ipMap = {}, resetInterval);
        }
    }

    increment(ip?: string): void {
        if (!ip) return;
        this._ipMap[ip] = (this._ipMap[ip] ?? 0) + 1;
    }

    decrement(ip?: string): void {
        if (!ip) return;
        const val = this._ipMap[ip] = (this._ipMap[ip] ?? 1) - 1;
        if (val < 0) {
            console.warn("Warning: Value in rate limiter dropped below 0, desync likely");
        }
    }

    isLimited(ip?: string): boolean {
        return !!ip && this._ipMap[ip] > this.max;
    }

    reset(): void {
        this._ipMap = {};
    }
}

export class Switcher<T extends Switchable> {
    private readonly _cron: Cron | undefined;

    private _index = 0;
    get index(): number { return this._index; }

    private _current: T;
    get current(): T { return this._current; }

    private _next: T | undefined;
    get next(): T | undefined { return this._next; }

    get nextSwitch(): number | undefined { return this._cron?.nextRun()?.getTime(); }

    constructor(name: string, schedule: StaticOrSwitched<T>, callback: (current: T, next: T) => void) {
        if (typeof schedule === "object") {
            const rotation = schedule.rotation;
            const length = rotation.length;

            const filename = `${name}.txt`;
            const initialIndex = existsSync(filename)
                ? parseInt(readFileSync(filename, "utf8"))
                : 0;

            this._current = rotation[initialIndex % length];
            this._next = rotation[(initialIndex + 1) % length];

            this._cron = Cron(schedule.cron, () => {
                this._current = rotation[++this._index % length];
                this._next = rotation[(this._index + 1) % length];
                writeFileSync(filename, this._index.toString());
                callback(this._current, this._next);
            });
        } else {
            this._current = schedule;
            this._next = undefined;
        }
    }
}
