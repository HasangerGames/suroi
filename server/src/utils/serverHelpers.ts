import { ColorStyles, Logger, styleText } from "@common/utils/logging";
import { Cron } from "croner";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { Numeric } from "@common/utils/math";
import { PunishmentMessage } from "@common/typings";
import { Config } from "./config";

export function serverLog(...message: unknown[]): void {
    Logger.log(styleText("[Server]", ColorStyles.foreground.magenta.normal), ...message);
}

export function serverWarn(...message: unknown[]): void {
    Logger.warn(styleText("[Server] [WARNING]", ColorStyles.foreground.yellow.normal), ...message);
}

export function serverError(...message: unknown[]): void {
    Logger.warn(styleText("[Server] [ERROR]", ColorStyles.foreground.red.normal), ...message);
}

export function writeCorsHeaders(resp: HttpResponse): void {
    resp.writeHeader("Access-Control-Allow-Origin", "*")
        .writeHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        .writeHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with")
        .writeHeader("Access-Control-Max-Age", "3600");
}

export function forbidden(resp: HttpResponse): void {
    resp.cork(() => {
        resp.writeStatus("403 Forbidden")
            .writeHeader("Content-Type", "text/plain")
            .end("403 Forbidden");
    });
}

export const textDecoder = new TextDecoder();

export function getIP(res: HttpResponse, req: HttpRequest): string {
    return Config.ipHeader ? req.getHeader(Config.ipHeader) : textDecoder.decode(res.getRemoteAddressAsText());
}

interface IPCheckResponse {
    readonly flagged: boolean
    readonly message: string
}

interface Punishment {
    readonly id: string
    readonly ip: string
    readonly reportId: string
    readonly reason: string
    readonly reporter: string
    readonly expires?: number
    readonly punishmentType: "warn" | "temp" | "perma"
}

export async function getPunishment(ip: string): Promise<PunishmentMessage | undefined> {
    if (!Config.apiServer) return;

    const url = Config.apiServer.url;
    const opts: RequestInit = { headers: { "api-key": Config.apiServer.apiKey } };

    // Check for VPN/proxy
    const ipCheck = await (
        await fetch(`${url}/ipcheck/${ip}`, opts)
    ).json() as IPCheckResponse;
    if (ipCheck.flagged) {
        return { message: "vpn" };
    }

    // Check punishments
    const punishments = await (
        await fetch(`${url}/punishments/${ip}`, opts)
    ).json() as Punishment[];
    if (Array.isArray(punishments) && punishments.length) {
        const punishment = punishments[0];
        if (punishment.punishmentType === "warn") {
            await fetch(`${url}/punishments/${ip}`, { method: "DELETE", ...opts });
        }
        return {
            message: punishment.punishmentType,
            reason: punishment.reason,
            reportID: punishment.reportId
        };
    }
}

export function parseRole(searchParams: URLSearchParams): { readonly role?: string, readonly isDev: boolean, readonly nameColor?: number } {
    const password = searchParams.get("password");
    const givenRole = searchParams.get("role");
    let role: string | undefined;
    let isDev = false;
    let nameColor: number | undefined;
    if (
        password !== null
        && givenRole !== null
        && Config.roles
        && givenRole in Config.roles
        && Config.roles[givenRole].password === password
    ) {
        role = givenRole;
        isDev = Config.roles[givenRole].isDev ?? false;

        if (isDev) {
            try {
                const colorString = searchParams.get("nameColor");
                if (colorString) nameColor = Numeric.clamp(parseInt(colorString), 0, 0xffffff);
            } catch { /* guess your color sucks lol */ }
        }
    }
    return { role, isDev, nameColor };
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

export type Switchable = string | number;
export interface Switched<T extends Switchable> {
    /**
     * List of items to rotate between.
     * When the end is reached, it will loop back to the beginning.
     */
    readonly rotation: T[]
    /**
     * Cron pattern to use for switching
     */
    readonly cron: string
}
export type StaticOrSwitched<T extends Switchable> = T | Switched<T>;

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

            this._index = existsSync(filename)
                ? parseInt(readFileSync(filename, "utf8"))
                : 0;

            this._current = rotation[this._index % length];
            this._next = rotation[(this._index + 1) % length];

            this._cron = new Cron(schedule.cron, () => {
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
