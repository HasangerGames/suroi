import { Config } from "./config";
import { version } from "../../package.json";

import {
    App,
    DEDICATED_COMPRESSOR_256KB,
    type HttpRequest,
    type HttpResponse,
    SSLApp,
    type WebSocket
} from "uWebSockets.js";

import { existsSync, readFile, writeFileSync } from "fs";
import os from "os";

import { URLSearchParams } from "node:url";
import { PacketType } from "../../common/src/constants";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import { Game } from "./game";
import { type Player } from "./objects/player";
import { InputPacket } from "./packets/receiving/inputPacket";
import { JoinPacket } from "./packets/receiving/joinPacket";
import { PingedPacket } from "./packets/receiving/pingedPacket";
import { SpectatePacket } from "./packets/receiving/spectatePacket";
import { Logger } from "./utils/misc";

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

function createNewGame(id: number): void {
    if (games[id] === undefined || games[id]?.stopped) {
        Logger.log(`Game #${id} | Creating...`);
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
    Logger.log(`Game #${id} | Ended`);
}

function allowJoin(gameID: number): boolean {
    const game = games[gameID];
    return game !== undefined && game.allowJoin && game.aliveCount < Config.maxPlayersPerGame;
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
interface BanRecord { readonly ip: string, readonly expires?: number }
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
        let foundGame = false;
        for (let gameID = 0; gameID < Config.maxGames; gameID++) {
            if (games[gameID] === undefined) createNewGame(gameID);
            if (allowJoin(gameID)) {
                response = { success: true, gameID };
                foundGame = true;
                break;
            }
        }
        if (!foundGame) response = { success: false };
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
        return;
    }

    forbidden(res);
});

export interface PlayerContainer {
    readonly gameID: number
    player?: Player
    readonly ip: string | undefined
    readonly role?: string
    readonly isDev: boolean
    readonly nameColor: string
    readonly lobbyClearing: boolean
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

        //
        // Bot & cheater protection
        //
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
                Logger.warn(`Connection blocked: ${ip}`);
                return;
            } else {
                if (maxSimultaneousConnections) {
                    simultaneousConnections[ip] = (simultaneousConnections[ip] ?? 0) + 1;
                    Logger.warn(`${simultaneousConnections[ip]}/${maxSimultaneousConnections} simultaneous connections: ${ip}`);
                }
                if (maxJoinAttempts) {
                    connectionAttempts[ip] = (connectionAttempts[ip] ?? 0) + 1;
                    Logger.warn(`${connectionAttempts[ip]}/${maxJoinAttempts.count} join attempts in the last ${maxJoinAttempts.duration} ms: ${ip}`);
                }
            }
        }

        const searchParams = new URLSearchParams(req.getQuery());

        //
        // Validate game ID
        //
        let gameID = Number(searchParams.get("gameID"));
        if (gameID < 0 || gameID > Config.maxGames - 1) gameID = 0;
        if (!allowJoin(gameID)) {
            forbidden(res);
            return;
        }

        //
        // Role
        //
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

        //
        // Name color
        //
        let color = searchParams.get("nameColor");
        if (color?.match(/^([A-F0-9]{3,4}){1,2}$/i)) {
            color = `#${color}`;
        }

        //
        // Upgrade the connection
        //
        const userData: PlayerContainer = {
            gameID,
            player: undefined,
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
        const data = socket.getUserData();
        const game = games[data.gameID];
        if (game === undefined) return;
        data.player = game.addPlayer(socket);
        playerCount++;
        //userData.player.sendPacket(new GameOverPacket(userData.player, false)); // uncomment to test game over screen
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
        const data = socket.getUserData();
        if (Config.protection) simultaneousConnections[data.ip as string]--;
        const game = games[data.gameID];
        const player = data.player;
        if (game === undefined || player === undefined) return;
        playerCount--;
        Logger.log(`Game #${data.gameID} | "${player.name}" left`);
        game.removePlayer(player);
    }
});

// Start the server
app.listen(Config.host, Config.port, (): void => {
    console.log(
        ` _____ _   _______ _____ _____
/  ___| | | | ___ \\  _  |_   _|
\\ \`--.| | | | |_/ / | | | | |
 \`--. \\ | | |    /| | | | | |
/\\__/ / |_| | |\\ \\\\ \\_/ /_| |_
\\____/ \\___/\\_| \\_|\\___/ \\___/
        `);

    Logger.log(`Suroi Server v${version}`);
    Logger.log(`Listening on ${Config.host}:${Config.port}`);
    Logger.log("Press Ctrl+C to exit.");

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
                Logger.log("Reloaded list of banned IPs");
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

setInterval(() => {
    const memoryUsage = process.memoryUsage().rss;

    let perfString = `Server | Memory usage: ${Math.round(memoryUsage / 1024 / 1024 * 100) / 100} MB`;

    // windows L
    if (os.platform() !== "win32") {
        const load = os.loadavg().join("%, ");
        perfString += ` | Load (1m, 5m, 15m): ${load}%`;
    }

    Logger.log(perfString);
}, 60000);
