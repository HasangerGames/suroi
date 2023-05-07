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
import type { Player } from "./objects/player";
import { Game } from "./game";
import sanitizeHtml from "sanitize-html";
import { PacketType } from "../../common/src/constants/packetType";
import { InputPacket } from "./packets/receiving/inputPacket";

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
    res.writeHeader("Content-Type", "application/json").end(`{ "addr": "ws://127.0.0.1:${Config.port}/api/playGame" }`);
});

export interface PlayerContainer {
    player: Player
    playerName: string
}

app.get("/", (res) => { res.end("test"); });

app.ws("/api/playGame", {
    compression: DEDICATED_COMPRESSOR_256KB,
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade: (res, req, context) => {
        //cors(res);
        let name: string;
        if (req.getQuery() !== undefined) {
            const split: string[] = req.getQuery().split("=");
            if (split.length !== 2) {
                name = "Player";
            } else {
                name = sanitizeHtml(split[1], {
                    allowedTags: [],
                    allowedAttributes: {},
                    disallowedTagsMode: "recursiveEscape"
                });
            }
        } else {
            name = "Player";
        }
        res.upgrade(
            { player: undefined, playerName: name },
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
    open: (socket: WebSocket<PlayerContainer>) => {
        socket.getUserData().player = game.addPlayer(socket);
        log(`"${socket.getUserData().playerName}" joined the game`);
    },

    /**
     * Handle messages coming from the socket.
     * @param socket The socket in question.
     * @param message The message to handle.
     */
    message: (socket: WebSocket<PlayerContainer>, message) => {
        const stream = new SuroiBitStream(message);
        try {
            const packetType = stream.readUint8();
            switch (packetType) {
                case PacketType.Input: {
                    new InputPacket(socket.getUserData().player).deserialize(stream);
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
    close: (socket: WebSocket<PlayerContainer>) => {
        const p: Player = socket.getUserData().player;
        log(`"${p.name}" left the game`);
        game.removePlayer(p);
    }
});

// Start the server
log("Suroi v0.1.0");
app.listen(Config.host, Config.port, () => {
    log(`Listening on ${Config.host}:${Config.port}`);
    log("Press Ctrl+C to exit.");
});
