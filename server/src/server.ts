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

import { existsSync, readFile, writeFile, writeFileSync } from "fs";
import os from "os";

import { URLSearchParams } from "node:url";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import { Game } from "./game";
import { type Player } from "./objects/player";
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

export function newGame(id?: number): number {
    if (id !== undefined) {
        if (!games[id] || games[id]?.stopped) {
            Logger.log(`Game ${id} | Creating...`);
            games[id] = new Game(id);
            return id;
        }
    } else {
        for (let i = 0; i < Config.maxGames; i++) {
            if (!games[i] || games[i]?.stopped) return newGame(i);
        }
    }
    return -1;
}

export function endGame(id: number, createNewGame: boolean): void {
    const game = games[id];
    if (game === undefined) return;
    game.allowJoin = false;
    game.stopped = true;
    clearTimeout(game.startTimeoutID);
    clearTimeout(game.gas.timeoutID);
    for (const player of game.connectedPlayers) {
        player.socket.close();
    }
    Logger.log(`Game ${id} | Ended`);
    if (createNewGame) {
        Logger.log(`Game ${id} | Creating...`);
        games[id] = new Game(id);
    } else {
        games[id] = undefined;
    }
}

function canJoin(game?: Game): boolean {
    return game !== undefined && game.aliveCount < Config.maxPlayersPerGame && !game.over;
}

const decoder = new TextDecoder();
function getIP(res: HttpResponse, req: HttpRequest): string {
    return Config.ipHeader
        ? req.getHeader(Config.ipHeader) ?? decoder.decode(res.getRemoteAddressAsText())
        : decoder.decode(res.getRemoteAddressAsText());
}

const simultaneousConnections: Record<string, number> = {};
let connectionAttempts: Record<string, number> = {};

export interface Punishment { readonly type: "rateLimit" | "warning" | "tempBan" | "permaBan", readonly expires?: number }
let punishments: Record<string, Punishment> = {};

function removePunishment(ip: string): void {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete punishments[ip];
    if (!Config.protection?.punishments?.url) {
        writeFile(
            "punishments.json",
            JSON.stringify(punishments, null, 4),
            "utf8",
            (err) => {
                if (err) console.error(err);
            }
        );
    }
}

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
        message?: "rateLimit" | "warning" | "tempBan" | "permaBan"
    };

    const ip = getIP(res, req);
    const punishment = punishments[ip];
    if (punishment) {
        response = { success: false, message: punishment.type };
        if (punishment.type === "warning") {
            const protection = Config.protection;
            if (protection?.punishments?.url) {
                fetch(`${protection.punishments.url}/api/removePunishment?ip=${ip}`, { headers: { Password: protection.punishments.password } })
                    .catch(e => console.error("Error acknowledging warning. Details: ", e));
            }
            removePunishment(ip);
        }
    } else {
        let foundGame = false;
        for (let gameID = 0; gameID < Config.maxGames; gameID++) {
            const game = games[gameID];
            if (canJoin(game) && game?.allowJoin) {
                response = { success: true, gameID };
                foundGame = true;
                break;
            }
        }
        if (!foundGame) {
            // Create a game if there's a free slot
            const gameID = newGame();
            if (gameID !== -1) {
                response = { success: true, gameID };
            } else {
                // Join the game that most recently started
                const game = games
                    .filter(g => g && !g.over)
                    .reduce((a, b) => (a as Game).startedTime > (b as Game).startedTime ? a : b);

                if (game) response = { success: true, gameID: game.id };
                else response = { success: false };
            }
        }
    }

    if (!aborted) {
        res.cork(() => {
            res.writeHeader("Content-Type", "application/json").end(JSON.stringify(response));
        });
    }
});

app.get("/api/punishments", (res, req) => {
    cors(res);

    if (req.getHeader("password") === Config.protection?.punishments?.password) {
        res.writeHeader("Content-Type", "application/json").end(JSON.stringify(punishments));
    } else {
        forbidden(res);
    }
});

app.get("/api/removePunishment", (res, req) => {
    cors(res);

    if (req.getHeader("password") === Config.protection?.punishments?.password) {
        const ip = new URLSearchParams(req.getQuery()).get("ip");
        if (ip) removePunishment(ip);
        res.writeStatus("204 No Content").endWithoutBody(0);
    } else {
        forbidden(res);
    }
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
            const exceededRateLimits =
                (maxSimultaneousConnections !== undefined && simultaneousConnections[ip] >= maxSimultaneousConnections) ||
                (maxJoinAttempts !== undefined && connectionAttempts[ip] >= maxJoinAttempts.count);

            if (
                punishments[ip] ||
                exceededRateLimits
            ) {
                if (exceededRateLimits && !punishments[ip]) punishments[ip] = { type: "rateLimit" };
                forbidden(res);
                Logger.log(`Connection blocked: ${ip}`);
                return;
            } else {
                if (maxSimultaneousConnections) {
                    simultaneousConnections[ip] = (simultaneousConnections[ip] ?? 0) + 1;
                    Logger.log(`${simultaneousConnections[ip]}/${maxSimultaneousConnections} simultaneous connections: ${ip}`);
                }
                if (maxJoinAttempts) {
                    connectionAttempts[ip] = (connectionAttempts[ip] ?? 0) + 1;
                    Logger.log(`${connectionAttempts[ip]}/${maxJoinAttempts.count} join attempts in the last ${maxJoinAttempts.duration} ms: ${ip}`);
                }
            }
        }

        const searchParams = new URLSearchParams(req.getQuery());

        //
        // Validate game ID
        //
        let gameID = Number(searchParams.get("gameID"));
        if (gameID < 0 || gameID > Config.maxGames - 1) gameID = 0;
        if (!canJoin(games[gameID])) {
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
        // data.player.sendGameOverPacket(false) // uncomment to test game over screen
    },

    /**
     * Handle messages coming from the socket.
     * @param socket The socket in question.
     * @param message The message to handle.
     */
    message(socket: WebSocket<PlayerContainer>, message) {
        const stream = new SuroiBitStream(message);
        try {
            const player = socket.getUserData().player;
            if (player === undefined) return;
            player.game.handlePacket(stream, player);
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
        Logger.log(`Game ${data.gameID} | "${player.name}" left`);
        game.removePlayer(player);
    }
});

// Start the server
app.listen(Config.host, Config.port, (): void => {
    console.log(
        `
 _____ _   _______ _____ _____
/  ___| | | | ___ \\  _  |_   _|
\\ \`--.| | | | |_/ / | | | | |
 \`--. \\ | | |    /| | | | | |
/\\__/ / |_| | |\\ \\\\ \\_/ /_| |_
\\____/ \\___/\\_| \\_|\\___/ \\___/
        `);

    Logger.log(`Suroi Server v${version}`);
    Logger.log(`Listening on ${Config.host}:${Config.port}`);
    Logger.log("Press Ctrl+C to exit.");

    newGame(0);

    const protection = Config.protection;
    if (protection) {
        if (protection.maxJoinAttempts) {
            setInterval((): void => {
                connectionAttempts = {};
            }, protection.maxJoinAttempts.duration);
        }

        setInterval(() => {
            if (protection.punishments?.url) {
                void (async() => {
                    try {
                        if (!protection.punishments?.url) return;
                        const response = await fetch(`${protection.punishments.url}/api/punishments`, { headers: { Password: protection.punishments.password } });
                        if (response.ok) punishments = await response.json();
                        else console.error("Error: Unable to fetch punishment list.");
                    } catch (e) {
                        console.error("Error: Unable to fetch punishment list. Details:", e);
                    }
                })();
            } else {
                if (!existsSync("punishments.json")) writeFileSync("punishments.json", "{}");
                readFile("punishments.json", "utf8", (error, data) => {
                    if (!error) {
                        try {
                            punishments = data === "" ? {} : JSON.parse(data);
                        } catch (e) {
                            console.error("Error: Unable to parse punishment list. Details:", e);
                        }
                    } else {
                        console.error("Error: Unable to load punishment list. Details:", error);
                    }
                });
            }

            const now = Date.now();
            for (const [ip, punishment] of Object.entries(punishments)) {
                if (
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    (punishment.expires && punishment.expires < now) ||
                    punishment.type === "rateLimit"
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                ) delete punishments[ip];
            }

            Logger.log("Reloaded punishment list");
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
