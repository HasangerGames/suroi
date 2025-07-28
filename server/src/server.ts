import { GameConstants, TeamMode } from "@common/constants";
import { Badges } from "@common/definitions/badges";
import { Skins } from "@common/definitions/items/skins";
import { CustomTeamMessage, PunishmentMessage } from "@common/typings";
import Cluster from "node:cluster";
import { URLSearchParams } from "node:url";
import os from "os";
import { App, WebSocket } from "uWebSockets.js";
import { version } from "../../package.json";
import { GameManager } from "./gameManager";
import { CustomTeam, CustomTeamPlayer, CustomTeamPlayerContainer } from "./team";
import { Config } from "./utils/config";
import { cleanUsername } from "./utils/misc";
import { forbidden, getIP, getPunishment, parseRole, RateLimiter, serverError, serverLog, textDecoder, writeCorsHeaders } from "./utils/serverHelpers";

let customTeams: Map<string, CustomTeam> | undefined;
let teamsCreated: RateLimiter | undefined;

export function resetTeams(): void {
    if (!customTeams) return;

    for (const team of customTeams.values()) {
        for (const player of team.players) player.socket?.close();
    }
    customTeams.clear();
    teamsCreated?.reset();
}

if (Cluster.isPrimary && require.main === module) {
    //                   ^^^^^^^^^^^^^^^^^^^^^^^ only starts server if called directly from command line (not imported)

    process.on("uncaughtException", e => serverError("An unhandled error occurred. Details:", e));

    const gameManager = new GameManager();

    let exiting = false;
    const exit = (): void => {
        if (exiting) return;
        exiting = true;
        serverLog("Shutting down...");
        for (const game of gameManager.games) {
            game?.worker.kill();
        }
        process.exit();
    };
    process.on("exit", exit);
    process.on("SIGINT", exit);
    process.on("SIGTERM", exit);
    process.on("SIGUSR2", exit);

    setInterval(() => {
        const memoryUsage = process.memoryUsage().rss;

        let perfString = `RAM usage: ${Math.round(memoryUsage / 1024 / 1024 * 100) / 100} MB`;

        // windows L
        if (os.platform() !== "win32") {
            const load = os.loadavg().join("%, ");
            perfString += ` | CPU usage (1m, 5m, 15m): ${load}%`;
        }

        serverLog(perfString);

        gameManager.updateMapScaleRange();
    }, 60000);

    customTeams = new Map<string, CustomTeam>();

    teamsCreated = Config.maxCustomTeams
        ? new RateLimiter(Config.maxCustomTeams)
        : undefined;

    const app = App();

    app.get("/api/serverInfo", async(res, req) => {
        let aborted = false;
        res.onAborted(() => aborted = true);

        let punishment: PunishmentMessage | undefined;
        if (new URLSearchParams(req.getQuery()).get("checkPunishments") === "true") {
            punishment = await getPunishment(getIP(res, req));
        }

        if (aborted) return;

        const { playerCount, teamMode, map, mode, nextMode } = gameManager;

        res.cork(() => {
            writeCorsHeaders(res);
            res.writeHeader("Content-Type", "application/json").end(JSON.stringify({
                protocolVersion: GameConstants.protocolVersion,
                playerCount,
                teamMode: teamMode.current,
                nextTeamMode: teamMode.next,
                teamModeSwitchTime: teamMode.nextSwitch ? teamMode.nextSwitch - Date.now() : undefined,
                mode,
                nextMode,
                modeSwitchTime: map.nextSwitch ? map.nextSwitch - Date.now() : undefined,
                punishment
            }));
        });
    });

    app.get("/api/getGame", async(res, req) => {
        let aborted = false;
        res.onAborted(() => aborted = true);

        let gameID: number | undefined;
        const teamID = gameManager.teamMode.current !== TeamMode.Solo && new URLSearchParams(req.getQuery()).get("teamID");
        if (teamID) {
            gameID = customTeams?.get(teamID)?.gameID;
        } else {
            gameID = await gameManager.findGame();
        }

        if (aborted) return;

        res.cork(() => {
            writeCorsHeaders(res);
            res.writeHeader("Content-Type", "application/json").end(JSON.stringify(
                gameID !== undefined
                    ? { success: true, gameID, mode: gameManager.mode }
                    : { success: false }
            ));
        });
    });

    app.ws("/team", {
        async upgrade(res, req, context) {
            let aborted = false;
            res.onAborted(() => aborted = true);

            // These lines must be before the await to prevent uWS errors
            // Accessing req isn't allowed after an await
            const ip = getIP(res, req);
            const searchParams = new URLSearchParams(req.getQuery());
            const webSocketKey = req.getHeader("sec-websocket-key");
            const webSocketProtocol = req.getHeader("sec-websocket-protocol");
            const webSocketExtensions = req.getHeader("sec-websocket-extensions");

            // Prevent connection if it's solos + check rate limits & punishments
            if (
                gameManager.teamMode.current === TeamMode.Solo
                || teamsCreated?.isLimited(ip)
                || await getPunishment(ip)
            ) {
                if (!aborted) forbidden(res);
                return;
            }

            if (aborted) return;

            // Get team
            const teamID = searchParams.get("teamID");
            let team: CustomTeam;
            if (teamID !== null) {
                const givenTeam = customTeams?.get(teamID);
                if (!givenTeam || givenTeam.locked || givenTeam.players.length >= (gameManager.teamMode.current as number)) {
                    forbidden(res); // TODO "Team is locked" and "Team is full" messages
                    return;
                }
                team = givenTeam;
            } else {
                team = new CustomTeam(gameManager);
                customTeams?.set(team.id, team);
            }

            // Get name, skin, badge, & role
            const name = cleanUsername(searchParams.get("name"));
            let skin = searchParams.get("skin") ?? GameConstants.player.defaultSkin;
            let badge = searchParams.get("badge") ?? undefined;
            const { role = "", nameColor } = parseRole(searchParams);

            // Validate skin
            const skinDefinition = Skins.fromStringSafe(skin);
            const rolesRequired = skinDefinition?.rolesRequired;
            if (!skinDefinition || (rolesRequired && !rolesRequired.includes(role))) {
                skin = GameConstants.player.defaultSkin;
            }

            // Validate badge
            const badgeDefinition = badge ? Badges.fromStringSafe(badge) : undefined;
            if (!badgeDefinition || (badgeDefinition.roles && !badgeDefinition.roles.includes(role))) {
                badge = undefined;
            }

            // Upgrade the connection
            res.cork(() => res.upgrade(
                { player: new CustomTeamPlayer(ip, team, name, skin, badge, nameColor) },
                webSocketKey,
                webSocketProtocol,
                webSocketExtensions,
                context
            ));
        },

        open(socket: WebSocket<CustomTeamPlayerContainer>) {
            const { player } = socket.getUserData();
            player.socket = socket;
            player.team.addPlayer(player);
        },

        message(socket: WebSocket<CustomTeamPlayerContainer>, message: ArrayBuffer) {
            try {
                const { player } = socket.getUserData();
                void player.team.onMessage(player, JSON.parse(textDecoder.decode(message)) as CustomTeamMessage);
            } catch (e) {
                serverError("Error parsing team socket message. Details:", e);
            }
        },

        close(socket: WebSocket<CustomTeamPlayerContainer>) {
            const { player } = socket.getUserData();
            const team = player.team;
            team.removePlayer(player);
            if (!team.players.length) {
                customTeams?.delete(team.id);
            }
            teamsCreated?.decrement(player.ip);
        }
    });

    app.listen(Config.hostname, Config.port, token => {
        if (!token) {
            serverError("Unable to start server.");
            process.exit(1);
        }

        process.stdout.write("\x1Bc"); // clears screen
        serverLog(`Suroi Server v${version}`);
        serverLog(`Listening on ${Config.hostname}:${Config.port}`);
        serverLog("Press Ctrl+C to exit.");

        void gameManager.newGame(0);
    });
}
