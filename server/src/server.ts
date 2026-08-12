import Cluster from "node:cluster";
import { BunRequest } from "bun";
import os from "os";
import { GameConstants } from "$common/constants";
import { GameMode, TeamMode } from "$common/schemas/misc";
import { PunishmentMessage } from "$common/typings";
import { version } from "../../package.json";
import { MapName } from "./data/maps";
import { GameContainer, GameManager } from "./gameManager";
import { Config } from "./utils/config";
import { memoryUsageMb } from "./utils/misc";
import { corsHeaders, getIP, getPunishment, getSearchParams, serverError, serverLog } from "./utils/serverHelpers";

declare global {
    var initialSetupComplete: boolean | undefined
}

if (Cluster.isPrimary && require.main === module) {
    //                   ^^^^^^^^^^^^^^^^^^^^^^^ only starts server if called directly from command line (not imported)

    // Cleans up workers from previous runs if the process is hot reloaded
    for (const worker of Object.values(Cluster.workers ?? {})) {
        worker?.kill();
    }

    const gameManager = new GameManager();

    // Prevents multiple loops from piling up if the process is hot reloaded
    if (!globalThis.initialSetupComplete) {
        let exiting = false;
        const exit = (): void => {
            if (exiting) return;
            exiting = true;
            serverLog("Shutting down...");
            gameManager.killAll();
            process.exit();
        };
        process.on("exit", exit);
        process.on("SIGINT", exit);
        process.on("SIGTERM", exit);
        process.on("SIGUSR2", exit);

        process.on("uncaughtException", e => {
            serverError("An unhandled error occurred. Details:", e);
            gameManager.killAll();
            process.exit(1);
        });

        setInterval(() => {
            let perfString = `RAM usage: ${memoryUsageMb()} MB`;

            // windows L
            if (os.platform() !== "win32") {
                const load = os.loadavg().map(n => n.toFixed(2)).join("%, ");
                perfString += ` | CPU usage (1m, 5m, 15m): ${load}%`;
            }

            serverLog(perfString);
        }, 60000);
    }
    globalThis.initialSetupComplete = true;

    Bun.serve({
        hostname: Config.hostname,
        port: Config.mainPort,
        routes: {
            "/api/serverInfo": async(req, res) => {
                let punishment: PunishmentMessage | undefined;
                if (getSearchParams(req).get("checkPunishments") === "true") {
                    punishment = await getPunishment(getIP(req, res));
                }

                return Response.json({
                    protocolVersion: GameConstants.protocolVersion,
                    playerCount: gameManager.playerCount,
                    punishment
                }, corsHeaders);
            },
            "/api/game/list": () => {
                const response = gameManager.games
                    .values()
                    .filter((g): g is GameContainer => g !== undefined)
                    .map(({ gameInfo }) => gameInfo)
                    .toArray();
                return Response.json(response, corsHeaders);
            },
            "/api/game/new/:gameMode/:teamMode": async(req: BunRequest) => {
                const gameMode = GameMode.parse(req.params.gameMode);
                const teamMode = TeamMode.parse(req.params.teamMode);
                const game = await gameManager.newGame(gameMode as MapName, teamMode);
                if (game !== undefined) {
                    return Response.json(game.gameInfo, corsHeaders);
                } else {
                    return new Response("403 Forbidden");
                }
            },
        }
    });

    process.stdout.write("\x1Bc"); // clears screen
    serverLog(`Suroi Server v${version}`);
    serverLog(`Listening on ${Config.hostname}:${Config.mainPort}`);
    serverLog("Press Ctrl+C to exit.");
}
