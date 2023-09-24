import { Config } from "./config";
import { version } from "../../package.json";

import {
    App,
    DEDICATED_COMPRESSOR_256KB,
    type HttpResponse,
    SSLApp,
    type WebSocket,
    type HttpRequest
} from "uWebSockets.js";
import sanitizeHtml from "sanitize-html";

import { Game } from "./game";
import type { Player } from "./objects/player";

import { InputPacket } from "./packets/receiving/inputPacket";
import { JoinPacket } from "./packets/receiving/joinPacket";
import { PingedPacket } from "./packets/receiving/pingedPacket";

import { log, stripNonASCIIChars } from "../../common/src/utils/misc";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import {
    ALLOW_NON_ASCII_USERNAME_CHARS,
    DEFAULT_USERNAME,
    PacketType,
    PLAYER_NAME_MAX_LENGTH
} from "../../common/src/constants";
import { hasBadWords } from "./utils/badWordFilter";
import { URLSearchParams } from "node:url";
import { ItemPacket } from "./packets/receiving/itemPacket";
import { SpectatePacket } from "./packets/receiving/spectatePacket";
import { existsSync, readFile, writeFileSync } from "fs";

/**
 * Apply CORS headers to a response.
 * @param res The response sent by the server.
 */
function cors(res: HttpResponse): void {
    res.writeHeader("Access-Control-Allow-Origin", "*")
        .writeHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        .writeHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with")
        .writeHeader("Access-Control-Max-Age", "3600");
}

function forbidden(res: HttpResponse): void {
    res.writeStatus("403 Forbidden").end("403 Forbidden");
}

// Initialize the server
const app = Config.ssl
    ? SSLApp({
        key_file_name: Config.ssl.keyFile,
        cert_file_name: Config.ssl.certFile
    })
    : App();

const games: Array<Game | undefined> = [];
createNewGame(0);

export function createNewGame(id: number): void {
    if (games[id] === undefined || games[id]?.stopped) {
        log(`Creating new game with ID #${id}`);
        games[id] = new Game(id);
    }
}

export function endGame(id: number): void {
    const game = games[id];
    if (game === undefined) return;
    game.allowJoin = false;
    game.stopped = true;
    clearTimeout(game.startTimeoutID);
    clearTimeout(game.gas.timeoutID);
    for (const player of game.connectedPlayers) {
        player.socket.close();
    }
    games[id] = undefined;
    log(`Game #${id} ended`);
}

export function allowJoin(gameID: number): boolean {
    const game = games[gameID];
    if (game !== undefined) {
        return game.allowJoin && game.aliveCount < Config.playerLimit;
    }
    return false;
}

const decoder = new TextDecoder();
function getIP(res: HttpResponse, req: HttpRequest): string {
    return Config.ipHeader
        ? req.getHeader(Config.ipHeader) ?? decoder.decode(res.getRemoteAddressAsText())
        : decoder.decode(res.getRemoteAddressAsText());
}

const simultaneousConnections: Record<string, number> = {};
let connectionAttempts: Record<string, number> = {};
const permaBannedIPs = new Set<string>();
const tempBannedIPs = new Set<string>();
const rateLimitedIPs = new Set<string>();
interface BanRecord { ip: string, expires?: number }
let rawBanRecords: BanRecord[] = [];

let playerCount = 0;

app.get("/api/playerCount", (res) => {
    cors(res);
    res.writeHeader("Content-Type", "text/plain").end(playerCount.toString());
});

app.get("/api/getGame", async(res, req) => {
    let aborted = false;
    res.onAborted(() => { aborted = true; });
    cors(res);

    let response: {
        success: boolean
        gameID?: number
        message?: "tempBanned" | "permaBanned" | "rateLimited"
    };

    const ip = getIP(res, req);
    if (tempBannedIPs.has(ip)) {
        response = { success: false, message: "tempBanned" };
    } else if (permaBannedIPs.has(ip)) {
        response = { success: false, message: "permaBanned" };
    } else if (rateLimitedIPs.has(ip)) {
        response = { success: false, message: "rateLimited" };
    } else {
        let gameID: number | undefined;
        if (allowJoin(0)) {
            gameID = 0;
        } else if (allowJoin(1)) {
            gameID = 1;
        } else {
            response = { success: false };
        }
        if (gameID !== undefined) {
            response = { success: true, gameID };
        }
    }

    if (!aborted) {
        res.cork(() => {
            res.writeHeader("Content-Type", "application/json").end(JSON.stringify(response));
        });
    }
});

app.get("/api/bannedIPs", (res, req) => {
    cors(res);
    if (req.getHeader("password") === Config.protection?.ipBanList?.password) {
        res.writeHeader("Content-Type", "application/json").end(JSON.stringify(rawBanRecords));
    } else {
        forbidden(res);
    }
});

export interface PlayerContainer {
    gameID: number
    player?: Player
    name: string
    ip: string | undefined
    role?: string
    isDev: boolean
    nameColor: string
    lobbyClearing: boolean
}

app.ws("/play", {
    compression: DEDICATED_COMPRESSOR_256KB,
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade(res, req, context) {
        /* eslint-disable-next-line @typescript-eslint/no-empty-function */
        res.onAborted((): void => { });

        // Bot protection
        const ip = getIP(res, req);
        if (Config.protection) {
            const maxSimultaneousConnections = Config.protection.maxSimultaneousConnections;
            const maxJoinAttempts = Config.protection.maxJoinAttempts;
            const rateLimited = rateLimitedIPs.has(ip);
            const exceededRateLimits =
                (maxSimultaneousConnections !== undefined && simultaneousConnections[ip] >= maxSimultaneousConnections) ||
                (maxJoinAttempts !== undefined && connectionAttempts[ip] >= maxJoinAttempts.count);
            if (
                tempBannedIPs.has(ip) ||
                permaBannedIPs.has(ip) ||
                rateLimited ||
                exceededRateLimits
            ) {
                if (exceededRateLimits && !rateLimited) rateLimitedIPs.add(ip);
                forbidden(res);
                log(`Connection blocked: ${ip}`);
                return;
            } else {
                if (maxSimultaneousConnections) {
                    simultaneousConnections[ip] = (simultaneousConnections[ip] ?? 0) + 1;
                    log(`${simultaneousConnections[ip]}/${maxSimultaneousConnections} simultaneous connections: ${ip}`);
                }
                if (maxJoinAttempts) {
                    connectionAttempts[ip] = (connectionAttempts[ip] ?? 0) + 1;
                    log(`${connectionAttempts[ip]}/${maxJoinAttempts.count} join attempts in the last ${maxJoinAttempts.duration} ms: ${ip}`);
                }
            }
        }

        const searchParams = new URLSearchParams(req.getQuery());

        let gameID = Number(searchParams.get("gameID"));
        if (gameID < 0 || gameID > 1) gameID = 0;
        const game = games[gameID];

        if (game === undefined || !allowJoin(gameID)) {
            forbidden(res);
            return;
        }

        // Name
        let name = searchParams.get("name");
        name = decodeURIComponent(name ?? "").trim();
        if (name.length > PLAYER_NAME_MAX_LENGTH || name.length === 0 || (Config.censorUsernames && hasBadWords(name))) {
            name = DEFAULT_USERNAME;
        } else {
            if (!ALLOW_NON_ASCII_USERNAME_CHARS) name = stripNonASCIIChars(name);
            name = sanitizeHtml(name, {
                allowedTags: [],
                allowedAttributes: {}
            });
            if (name.trim().length === 0) name = DEFAULT_USERNAME;
        }

        // Role
        const password = searchParams.get("password");
        const givenRole = searchParams.get("role");
        let role: string | undefined;
        let isDev = false;
        if (
            password !== null &&
            givenRole !== null &&
            givenRole in Config.roles &&
            Config.roles[givenRole].password === password
        ) {
            role = givenRole;
            isDev = !Config.roles[givenRole].noPrivileges;
        }

        // Name color
        let color = searchParams.get("nameColor");
        if (color?.match(/^([A-F0-9]{3,4}){1,2}$/i)) {
            color = `#${color}`;
        }

        // Upgrade the connection
        const userData: PlayerContainer = {
            gameID,
            player: undefined,
            name,
            ip,
            role,
            isDev,
            nameColor: isDev ? (color ?? "") : "",
            lobbyClearing: searchParams.get("lobbyClearing") === "true"
        };
        res.upgrade(
            userData,
            req.getHeader("sec-websocket-key"),
            req.getHeader("sec-websocket-protocol"),
            req.getHeader("sec-websocket-extensions"),
            context
        );
    },

    /**
     * Handle opening of the socket.
     * @param socket The socket being opened.
     */
    open(socket: WebSocket<PlayerContainer>) {
        playerCount++;
        const userData = socket.getUserData();
        const game = games[userData.gameID];
        if (game === undefined) return;
        userData.player = game.addPlayer(socket);
        log(`"${userData.name}" joined game #${userData.gameID}`);
    },

    /**
     * Handle messages coming from the socket.
     * @param socket The socket in question.
     * @param message The message to handle.
     */
    message(socket: WebSocket<PlayerContainer>, message) {
        const stream = new SuroiBitStream(message);
        try {
            const packetType = stream.readPacketType();
            const player = socket.getUserData().player;
            if (player === undefined) return;
            switch (packetType) {
                case PacketType.Join: {
                    new JoinPacket(player).deserialize(stream);
                    break;
                }
                case PacketType.Input: {
                    new InputPacket(player).deserialize(stream);
                    break;
                }
                case PacketType.Ping: {
                    new PingedPacket(player).deserialize(stream);
                    break;
                }
                case PacketType.Item: {
                    new ItemPacket(player).deserialize(stream);
                    break;
                }
                case PacketType.Spectate: {
                    new SpectatePacket(player).deserialize(stream);
                    break;
                }
            }
        } catch (e) {
            console.warn("Error parsing message:", e);
        }
    },

    /**
     * Handle closing of the socket.
     * @param socket The socket being closed.
     */
    close(socket: WebSocket<PlayerContainer>) {
        playerCount--;
        const p = socket.getUserData();
        if (Config.protection) simultaneousConnections[p.ip as string]--;
        log(`"${p.name}" left game #${p.gameID}`);
        const game = games[p.gameID];
        if (game === undefined || p.player === undefined) return;
        game.removePlayer(p.player);
    }
});

// Start the server
app.listen(Config.host, Config.port, (): void => {
    log(`
 _____ _   _______ _____ _____
/  ___| | | | ___ \\  _  |_   _|
\\ \`--.| | | | |_/ / | | | | |
 \`--. \\ | | |    /| | | | | |
/\\__/ / |_| | |\\ \\\\ \\_/ /_| |_
\\____/ \\___/\\_| \\_|\\___/ \\___/
        `);

    log(`Suroi Server v${version}`, true);
    log(`Listening on ${Config.host}:${Config.port}`, true);
    log("Press Ctrl+C to exit.");

    const protection = Config.protection;
    if (protection) {
        if (protection.maxJoinAttempts) {
            setInterval((): void => {
                connectionAttempts = {};
            }, protection.maxJoinAttempts.duration);
        }

        setInterval(() => {
            rateLimitedIPs.clear();
            const processBanRecords = (records: BanRecord[]): void => {
                permaBannedIPs.clear();
                tempBannedIPs.clear();
                const now = Date.now();
                for (const record of records) {
                    if (record.expires === undefined) {
                        permaBannedIPs.add(record.ip);
                    } else if (record.expires > now) {
                        tempBannedIPs.add(record.ip);
                    }
                }
                log("Reloaded list of banned IPs");
            };
            if (protection.ipBanList?.url) {
                void (async() => {
                    try {
                        if (!protection.ipBanList?.url) return;
                        const response = await fetch(protection.ipBanList.url, { headers: { Password: protection.ipBanList.password } });
                        if (response.ok) processBanRecords(await response.json());
                        else console.error("Error: Unable to fetch list of banned IPs.");
                    } catch (e) {
                        console.error("Error: Unable to fetch list of banned IPs. Details:", e);
                    }
                })();
            } else {
                if (!existsSync("bannedIPs.json")) writeFileSync("bannedIPs.json", "[]");
                readFile("bannedIPs.json", "utf8", (error, data) => {
                    if (error) {
                        console.error(error);
                        return;
                    }
                    rawBanRecords = JSON.parse(data);
                    processBanRecords(rawBanRecords);
                });
            }
        }, protection.refreshDuration);
    }
});
