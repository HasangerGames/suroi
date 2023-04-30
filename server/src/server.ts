import { App, DEDICATED_COMPRESSOR_256KB, SSLApp, type WebSocket } from "uWebSockets.js";
import * as fs from "fs";

import { Config, Debug, getContentType, log } from "../../common/src/utils/misc";
import { SuroiBitStream } from "../../common/src/utils/suroiBitStream";
import { type Player } from "../../common/src/objects/player";
import { Game } from "./game";

// Initialize the server
let app;
if (Config.https) {
    app = SSLApp({
        key_file_name: Config.keyFile,
        cert_file_name: Config.certFile
    });
} else {
    app = App();
}

const game = new Game();

// Set up static files
const staticFiles = {};
function walk (dir: string, files: string[] = []): string[] {
    if (dir.includes(".git") || dir.includes("src") || dir.includes(".vscode") || dir.includes(".idea")) return files;
    const dirFiles = fs.readdirSync(dir);
    for (const f of dirFiles) {
        const stat = fs.lstatSync(`${dir}/${f}`);
        if (stat.isDirectory()) {
            walk(`${dir}/${f}`, files);
        } else {
            files.push(`${dir.slice(12)}/${f}`);
        }
    }
    return files;
}
for (const file of walk("client/dist")) {
    staticFiles[file] = fs.readFileSync(`client/dist/${file}`);
}

app.get("/*", async (res, req) => {
    const path: string = req.getUrl() === "/" ? "/index.html" : req.getUrl();
    let file: Buffer | undefined;
    if (Debug.disableStaticFileCache) {
        try {
            file = fs.readFileSync(`client/dist${path}`);
        } catch (e) {
            file = undefined;
        }
    } else {
        file = staticFiles[path];
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    res.onAborted(() => {});

    if (file === undefined) {
        res.writeStatus("404 Not Found");
        res.end(`<!DOCTYPE html><html lang="en"><body><pre>404 Not Found: ${req.getUrl()}</pre></body></html>`);
        return;
    }

    res.writeHeader("Content-Type", getContentType(path)).end(file);
});

app.ws("/play", {
    compression: DEDICATED_COMPRESSOR_256KB,
    idleTimeout: 30,

    /**
     * Upgrade the connection to WebSocket.
     */
    upgrade: (res, req, context) => {
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
            switch (msgType) {

            }
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
