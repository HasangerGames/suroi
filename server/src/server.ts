import { GameConstants, TeamSize } from "@common/constants";
import { Badges } from "@common/definitions/badges";
import { Skins } from "@common/definitions/items/skins";
import { Mode } from "@common/definitions/modes";
import { CustomTeamMessage, PunishmentMessage } from "@common/typings";
import Cluster from "node:cluster";
import { URLSearchParams } from "node:url";
import os from "os";
import { App, WebSocket } from "uWebSockets.js";
import { version } from "../../package.json";
import { Config } from "./config";
import { findGame, games, newGame, WorkerMessages } from "./gameManager";
import { CustomTeam, CustomTeamPlayer, CustomTeamPlayerContainer } from "./team";
import { cleanUsername, modeFromMap } from "./utils/misc";
import { forbidden, getIP, getPunishment, parseRole, RateLimiter, serverError, serverLog, Switcher, textDecoder, writeCorsHeaders } from "./utils/serverHelpers";

if (Cluster.isPrimary && require.main === module) {
    //                   ^^^^^^^^^^^^^^^^^^^^^^^ only starts server if called directly from command line (not imported)

    process.on("uncaughtException", e => serverError("An unhandled error occurred. Details:", e));

    let exiting = false;
    const exit = (): void => {
        if (exiting) return;
        exiting = true;
        serverLog("Shutting down...");
        for (const game of games) {
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
    }, 60000);

    const teamsCreated = Config.maxTeams
        ? new RateLimiter(Config.maxTeams)
        : undefined;

    const customTeams: Map<string, CustomTeam> = new Map<string, CustomTeam>();

    const resetTeams = (): void => {
        for (const team of customTeams.values()) {
            for (const player of team.players) player.socket?.close();
        }
        customTeams.clear();
        teamsCreated?.reset();
    };

    const teamSize = new Switcher("teamSize", Config.teamSize, teamSize => {
        for (const game of games) {
            game?.sendMessage({ type: WorkerMessages.UpdateTeamSize, teamSize });
        }

        resetTeams();

        const humanReadableTeamSizes = [undefined, "solos", "duos", "trios", "squads"];
        serverLog(`Switching to ${humanReadableTeamSizes[teamSize] ?? `team size ${teamSize}`}`);
    });

    let mode: Mode;
    let nextMode: Mode | undefined;
    const map = new Switcher("map", Config.map, (map, nextMap) => {
        mode = modeFromMap(map);
        nextMode = modeFromMap(nextMap);

        for (const game of games) {
            game?.sendMessage({ type: WorkerMessages.UpdateMap, map });
        }

        resetTeams();

        serverLog(`Switching to "${map}" map`);
    });
    mode = modeFromMap(map.current);
    nextMode = map.next ? modeFromMap(map.next) : undefined;

    const app = App();

    app.get("/api/serverInfo", async(res, req) => {
        res.onAborted(() => { /* no-op */ });

        let punishment: PunishmentMessage | undefined;
        if (new URLSearchParams(req.getQuery()).get("checkPunishments") === "true") {
            punishment = await getPunishment(getIP(res, req));
        }

        res.cork(() => {
            writeCorsHeaders(res);
            res.writeHeader("Content-Type", "application/json").end(JSON.stringify({
                protocolVersion: GameConstants.protocolVersion,
                playerCount: games.reduce((a, b) => (a + (b?.aliveCount ?? 0)), 0),
                teamSize: teamSize.current,
                nextTeamSize: teamSize.next,
                teamSizeSwitchTime: teamSize.nextSwitch ? teamSize.nextSwitch - Date.now() : undefined,
                mode,
                nextMode,
                modeSwitchTime: map.nextSwitch ? map.nextSwitch - Date.now() : undefined,
                punishment
            }));
        });
    });

    app.get("/api/getGame", async(res, req) => {
        res.onAborted(() => { /* no-op */ });

        let gameID: number | undefined;
        const teamID = teamSize.current !== TeamSize.Solo && new URLSearchParams(req.getQuery()).get("teamID");
        if (teamID) {
            gameID = customTeams.get(teamID)?.gameID;
        } else {
            gameID = await findGame(teamSize.current, map.current);
        }

        res.cork(() => {
            writeCorsHeaders(res);
            res.writeHeader("Content-Type", "application/json").end(JSON.stringify(
                gameID !== undefined
                    ? { success: true, gameID }
                    : { success: false }
            ));
        });
    });

    app.ws("/team", {
        async upgrade(res, req, context) {
            res.onAborted((): void => { /* no-op */ });

            // These lines must be before the await to prevent uWS errors
            // Accessing req isn't allowed after an await
            const ip = getIP(res, req);
            const searchParams = new URLSearchParams(req.getQuery());
            const webSocketKey = req.getHeader("sec-websocket-key");
            const webSocketProtocol = req.getHeader("sec-websocket-protocol");
            const webSocketExtensions = req.getHeader("sec-websocket-extensions");

            // Prevent connection if it's solos + check rate limits & punishments
            if (
                teamSize.current === TeamSize.Solo
                || teamsCreated?.isLimited(ip)
                || await getPunishment(ip)
            ) {
                forbidden(res);
                return;
            }

            // Get team
            const teamID = searchParams.get("teamID");
            let team: CustomTeam;
            if (teamID !== null) {
                const givenTeam = customTeams.get(teamID);
                if (!givenTeam || givenTeam.locked || givenTeam.players.length >= (teamSize.current as number)) {
                    forbidden(res); // TODO "Team is locked" and "Team is full" messages
                    return;
                }
                team = givenTeam;
            } else {
                team = new CustomTeam(teamSize.current, map.current);
                customTeams.set(team.id, team);
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
            res.upgrade(
                { player: new CustomTeamPlayer(ip, team, name, skin, badge, nameColor) },
                webSocketKey,
                webSocketProtocol,
                webSocketExtensions,
                context
            );
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
                customTeams.delete(team.id);
            }
            teamsCreated?.decrement(player.ip);
        }
    });

    app.listen(Config.host, Config.port, token => {
        if (!token) {
            serverError("Unable to start server.");
            process.exit(1);
        }

        process.stdout.write("\x1Bc"); // clears screen
        serverLog(`Suroi Server v${version}`);
        serverLog(`Listening on ${Config.host}:${Config.port}`);
        serverLog("Press Ctrl+C to exit.");

        void newGame(0, teamSize.current, map.current);
    });
}
