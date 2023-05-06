import Config from "../../config.json";

import {
    App,
    DEDICATED_COMPRESSOR_256KB,
    type HttpResponse,
    SSLApp,
    type WebSocket
} from "uWebSockets.js";

import { log } from "../../common/src/utils/misc";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import type { Player } from "../../common/src/objects/player";
import { Game } from "./game";

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
const app = Config.ssl?.enable
    ? SSLApp({
        key_file_name: Config.ssl.keyFile,
        cert_file_name: Config.ssl.certFile
    })
    : App();

const game = new Game();

app.get("/api/getGame", (res) => {
    cors(res);
    res.writeHeader("Content-Type", "application/json").end(`{ "addr": "ws://127.0.0.1:${Config.port}/play" }`);
});

app.ws("/play", {
    compression: DEDICATED_COMPRESSOR_256KB,
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade: (res, req, context) => {
        cors(res);
        const player = game.addPlayer();
        res.upgrade(
            {},
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
    open: (socket: WebSocket<Player>) => {
        socket.getUserData().socket = socket;
        // let playerName = socket.cookies["player-name"]?.trim().substring(0, 16) ?? "Player";
        // if (typeof playerName !== "string" || playerName.length < 1) playerName = "Player";
        // log(`"${playerName}" joined the game.`);
        log("Player joined the game.");
    },

    /**
     * Handle messages coming from the socket.
     * @param socket The socket in question.
     * @param message The message to handle.
     */
    message: (socket: WebSocket<Player>, message) => {
        const stream = new SuroiBitStream(message);
        try {
            const msgType = stream.readUint8();
            // switch (msgType) {}
        } catch (e) {
            console.warn("Error parsing message:", e);
        }
    },

    /**
     * Handle closing of the socket.
     * @param socket The socket being closed.
     */
    close: (socket: WebSocket<Player>) => {
        // log(`"${socket.player.name}" left the game.`);

        game.removePlayer(socket.getUserData());
    }
});

// Start the servers
log("Suroi v0.1.0");
app.listen(Config.host, Config.port, () => {
    log(`Listening on ${Config.host}:${Config.port}`);
    log("Press Ctrl+C to exit.");
});
