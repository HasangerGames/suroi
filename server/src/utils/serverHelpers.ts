import { ColorStyles, Logger, styleText } from "@common/utils/logging";
import { ServerResponse } from "node:http";

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
