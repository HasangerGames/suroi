// noinspection ES6PreferShortImport
import { Config } from "./config";

import {
    App,
    DEDICATED_COMPRESSOR_256KB,
    type HttpResponse,
    SSLApp,
    type WebSocket
} from "uWebSockets.js";
import sanitizeHtml from "sanitize-html";
import process from "node:process";

import { Game } from "./game";
import type { Player } from "./objects/player";

import { InputPacket } from "./packets/receiving/inputPacket";
import { JoinPacket } from "./packets/receiving/joinPacket";

import { log } from "../../common/src/utils/misc";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import { PacketType, PLAYER_NAME_MAX_LENGTH } from "../../common/src/constants";
import { hasBadWords } from "./utils/badWordFilter";

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

const game = new Game();

const simultaneousConnections: Record<string, number> = {};
let connectionAttempts: Record<string, number> = {};
const bannedIPs: string[] = [];

app.get("/api/getGame", (res) => {
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    res.onAborted(() => {});

    cors(res);
    res.writeHeader("Content-Type", "application/json").end(`{ "addr": "${Config.address}/play" }`);
});

export interface PlayerContainer {
    player: Player
    playerName: string
    ip: string | undefined
}

app.ws("/play", {
    compression: DEDICATED_COMPRESSOR_256KB,
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade(res, req, context) {
        /* eslint-disable-next-line @typescript-eslint/no-empty-function */
        res.onAborted(() => {});

        const ip = req.getHeader("cf-connecting-ip") ?? res.getRemoteAddressAsText();
        if (Config.botProtection) {
            if (bannedIPs.includes(ip) || simultaneousConnections[ip] >= 5 || connectionAttempts[ip] >= 5) {
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

        const split: string[] = req.getQuery().split("=");
        let name: string;
        if (split.length !== 2) {
            name = "Player";
        } else {
            name = decodeURIComponent(split[1]).trim();
            if (name.length > PLAYER_NAME_MAX_LENGTH || name.length === 0 || (Config.censorUsernames && hasBadWords(name))) {
                name = "Player";
            } else {
                name = sanitizeHtml(name, {
                    allowedTags: [],
                    allowedAttributes: {}
                });
            }
        }

        res.upgrade(
            {
                player: undefined,
                playerName: name,
                ip
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
        socket.getUserData().player = game.addPlayer(socket, socket.getUserData().playerName);
        log(`"${socket.getUserData().playerName}" joined the game`);
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
        const p: Player = socket.getUserData().player;
        if (Config.botProtection) simultaneousConnections[socket.getUserData().ip as string]--;
        log(`"${p.name}" left the game`);
        game.removePlayer(p);
    }
});

// Start the server
app.listen(Config.host, Config.port, () => {
    log(`
 _____ _   _______ _____ _____
/  ___| | | | ___ \\  _  |_   _|
\\ \`--.| | | | |_/ / | | | | |
 \`--. \\ | | |    /| | | | | |
/\\__/ / |_| | |\\ \\\\ \\_/ /_| |_
\\____/ \\___/\\_| \\_|\\___/ \\___/
        `);

    log("Suroi Server v0.2.0", true);
    log(`Listening on ${Config.host}:${Config.port}`, true);

    if (Config.stopServerAfter !== -1) {
        log(`Automatically stopping server after ${Config.stopServerAfter} ms`, true);
        setTimeout(() => {
            log("Stopping server...", true);
            process.exit(1);
        }, Config.stopServerAfter);
    }

    log("Press Ctrl+C to exit.");

    if (Config.botProtection) {
        setInterval(() => {
            connectionAttempts = {};
        }, 5000);
    }
});
