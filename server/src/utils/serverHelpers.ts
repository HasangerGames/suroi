import { PunishmentMessage } from "$common/typings";
import { ColorStyles, Logger, styleText } from "$common/utils/logging";
import { Numeric } from "$common/utils/math";
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

export function getSearchParams(req: Bun.BunRequest): URLSearchParams {
    return new URLSearchParams(req.url.slice(req.url.indexOf("?")));
}

export const corsHeaders = {
    headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "origin, content-type, accept, x-requested-with",
        "Access-Control-Max-Age": "3600"
    }
};

export function getIP(req: Bun.BunRequest, res: Bun.Server<unknown>): string {
    return (
        Config.ipHeader
            ? req.headers.get(Config.ipHeader)
            : res.requestIP(req)?.address
    ) ?? "";
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
    readonly punishmentType: "warn" | "temp" | "perma" | "noname"
}

export async function getPunishment(ip: string): Promise<PunishmentMessage | undefined> {
    if (!Config.apiServer) return;

    const url = Config.apiServer.url;
    const opts: RequestInit = { headers: { "api-key": Config.apiServer.apiKey } };

    try {
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
            return {
                message: punishment.punishmentType,
                reason: punishment.reason,
                reportID: punishment.reportId
            };
        }
    } catch(e) {
        console.error(e);
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
