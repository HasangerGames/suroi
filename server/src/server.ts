/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

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
import { InputPacket } from "./packets/receiving/inputPacket";
import { PacketType } from "../../common/src/constants";

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

export interface PlayerContainer {
    player: Player
    playerName: string
}

app.get("/", (res) => { res.end("test"); });

app.ws("/play", {
    compression: DEDICATED_COMPRESSOR_256KB,
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade: (res, req, context) => {
        // cors(res);
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
app.listen(Config.host, Config.port, () => {
    log(`
 _____ _   _______ _____ _____ 
/  ___| | | | ___ \\  _  |_   _|
\\ \`--.| | | | |_/ / | | | | |  
 \`--. \\ | | |    /| | | | | |  
/\\__/ / |_| | |\\ \\\\ \\_/ /_| |_ 
\\____/ \\___/\\_| \\_|\\___/ \\___/ 
        `);
    log("Suroi Server v0.1.0");
    log(`Listening on ${Config.host}:${Config.port}`);
    log("Press Ctrl+C to exit.");
    log("===========================");
});
