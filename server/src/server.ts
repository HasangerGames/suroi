// noinspection ES6PreferShortImport
import { Config } from "./config";
import { version } from "../../package.json";

import {
    App,
    DEDICATED_COMPRESSOR_256KB,
    type HttpResponse,
    SSLApp,
    type WebSocket
} from "uWebSockets.js";
import sanitizeHtml from "sanitize-html";

import { Game } from "./game";
import type { Player } from "./objects/player";

import { InputPacket } from "./packets/receiving/inputPacket";
import { JoinPacket } from "./packets/receiving/joinPacket";
import { PingedPacket } from "./packets/receiving/pingedPacket";

import { log } from "../../common/src/utils/misc";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import { PacketType, PLAYER_NAME_MAX_LENGTH } from "../../common/src/constants";
import { hasBadWords } from "./utils/badWordFilter";
import { URLSearchParams } from "node:url";
import { ItemPacket } from "./packets/receiving/itemPacket";

/**
 * Apply CORS headers to a response.
 * @param res The response sent by the server.
 */
const cors = (res: HttpResponse): void => {
    res.writeHeader("Access-Control-Allow-Origin", "*");
    res.writeHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.writeHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with");
    res.writeHeader("Access-Control-Max-Age", "3600");
};

// Initialize the server
const app = Config.ssl.enable
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
    clearTimeout(game.gas.timeoutId);
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

const simultaneousConnections: Record<string, number> = {};
let connectionAttempts: Record<string, number> = {};
const bannedIPs: string[] = [];

app.get("/api/getGame", async(res, req) => {
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    let aborted = false;
    res.onAborted(() => { aborted = true; });
    cors(res);

    let response: { success: boolean, address?: string, gameID?: number };

    const searchParams = new URLSearchParams(req.getQuery());

    const region = searchParams.get("region") ?? Config.defaultRegion;

    if (region === Config.thisRegion) {
        let gameID: number | undefined;
        if (allowJoin(0)) {
            gameID = 0;
        } else if (allowJoin(1)) {
            gameID = 1;
        } else {
            response = { success: false };
        }
        if (gameID !== undefined) {
            response = { success: true, address: Config.regions[region], gameID };
        }
    } else if (Config.regions[region] !== undefined && region !== Config.thisRegion) {
        // Fetch the find game api for the region and return that.
        const url = `${Config.regions[region].replace("ws", "http")}/api/getGame?region=${region}`;
        try {
            response = await (await fetch(url, { signal: AbortSignal.timeout(5000) })).json();
        } catch (e) {
            response = { success: false };
        }
    } else {
        response = { success: false };
    }
    if (!aborted) {
        res.cork(() => {
            res.writeHeader("Content-Type", "application/json").end(JSON.stringify(response));
        });
    }
});

export interface PlayerContainer {
    gameID: number
    player: Player
    name: string
    ip: string | undefined
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
        res.onAborted((): void => {});

        const ip = req.getHeader("cf-connecting-ip") ?? res.getRemoteAddressAsText();
        if (Config.botProtection) {
            if (Config.bannedIPs.includes(ip) || bannedIPs.includes(ip) || simultaneousConnections[ip] >= 5 || connectionAttempts[ip] >= 5) {
                if (!bannedIPs.includes(ip)) bannedIPs.push(ip);
                res.endWithoutBody(0, true);
                log(`Connection blocked: ${ip}`);
                return;
            } else {
                simultaneousConnections[ip] = (simultaneousConnections[ip] ?? 0) + 1;
                connectionAttempts[ip] = (connectionAttempts[ip] ?? 0) + 1;

                log(`${simultaneousConnections[ip]} simultaneous connections: ${ip}`);
                log(`${connectionAttempts[ip]}/5 connection attempts in the last 5 seconds: ${ip}`);
            }
        }

        const searchParams = new URLSearchParams(req.getQuery());

        let gameID = Number(searchParams.get("gameID"));
        if (gameID < 0 || gameID > 1) gameID = 0;
        const game = games[gameID];

        if (game === undefined || !allowJoin(gameID)) {
            res.endWithoutBody(0, true);
            return;
        }

        let name = searchParams.get("name");

        name = decodeURIComponent(name ?? "").trim();
        if (name.length > PLAYER_NAME_MAX_LENGTH || name.length === 0 || (Config.censorUsernames && hasBadWords(name))) {
            name = "Player";
        } else {
            name = sanitizeHtml(name, {
                allowedTags: [],
                allowedAttributes: {}
            });
        }

        let isDev = false;
        const devPassword = searchParams.get("devPassword");
        if (devPassword !== null && devPassword === Config.devPassword) isDev = true;

        let color = searchParams.get("nameColor") ?? "";

        if (color.match(/^([A-F0-9]{3,4}){1,2}$/i)) {
            color = `#${color}`;
        }

        const lobbyClearing = searchParams.get("lobbyClearing") !== null;

        res.upgrade(
            {
                gameID,
                player: undefined,
                name,
                ip,
                isDev,
                nameColor: isDev ? color : "",
                lobbyClearing
            },
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
        const userData = socket.getUserData();
        const game = games[userData.gameID];
        if (game === undefined) return;
        userData.player = game.addPlayer(socket, userData.name, userData.isDev, userData.nameColor, userData.lobbyClearing);
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
        const p = socket.getUserData();
        if (Config.botProtection) simultaneousConnections[p.ip as string]--;
        log(`"${p.name}" left game #${p.gameID}`);
        const game = games[p.gameID];
        if (game === undefined) return;
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

    if (Config.botProtection) {
        setInterval((): void => {
            connectionAttempts = {};
        }, 5000);
    }
});
