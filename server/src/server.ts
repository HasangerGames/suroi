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
import { InputPacket } from "./packets/receiving/inputPacket";
import { PacketType } from "../../common/src/constants";
import { JoinPacket } from "./packets/receiving/joinPacket";
import { Config } from "./config";

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
    res.writeHeader("Content-Type", "application/json").end(`{ "addr": "${Config.webSocketAddress}/play" }`);
});

export interface PlayerContainer {
    player: Player
    playerName: string
}

app.ws("/play", {
    compression: DEDICATED_COMPRESSOR_256KB,
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade: (res, req, context) => {
        const split: string[] = req.getQuery().split("=");
        let name: string = decodeURIComponent(split[1]);
        if (split.length !== 2 || name.length > 16 || name.trim().length === 0) {
            name = "Player";
        } else {
            name = sanitizeHtml(name, {
                allowedTags: [],
                allowedAttributes: {},
                disallowedTagsMode: "recursiveEscape"
            });
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
        socket.getUserData().player = game.addPlayer(socket, socket.getUserData().playerName);
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
            const packetType = stream.readPacketType();
            const p = socket.getUserData().player;
            switch (packetType) {
                case PacketType.Join: {
                    new JoinPacket(p).deserialize(stream);
                    break;
                }
                case PacketType.Input: {
                    new InputPacket(p).deserialize(stream);
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
    close: (socket: WebSocket<PlayerContainer>) => {
        const p: Player = socket.getUserData().player;
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
    log("Suroi Server v0.1.0", true);
    log(`Listening on ${Config.host}:${Config.port}`, true);
    log("Press Ctrl+C to exit.");
});
