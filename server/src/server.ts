import { GameConstants, TeamMode } from "@common/constants";
import { Badges } from "@common/definitions/badges";
import { Skins } from "@common/definitions/items/skins";
import { CustomTeamMessage, PunishmentMessage } from "@common/typings";
import Cluster from "node:cluster";
import { URLSearchParams } from "node:url";
import os from "os";
import { version } from "../../package.json";
import { GameManager } from "./gameManager";
import { CustomTeam, CustomTeamPlayer, CustomTeamPlayerContainer } from "./team";
import { Config } from "./utils/config";
import { cleanUsername } from "./utils/misc";
import { corsHeaders, getIP, getPunishment, getSearchParams, parseRole, RateLimiter, serverError, serverLog } from "./utils/serverHelpers";

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
            for (const game of gameManager.games) {
                game?.worker.kill();
            }
            process.exit();
        };
        process.on("exit", exit);
        process.on("SIGINT", exit);
        process.on("SIGTERM", exit);
        process.on("SIGUSR2", exit);

        process.on("uncaughtException", e => {
            serverError("An unhandled error occurred. Details:", e);
            for (const game of gameManager.games) {
                game?.worker.kill();
            }
            process.exit(1);
        });

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
    }
    globalThis.initialSetupComplete = true;

    customTeams = new Map<string, CustomTeam>();

    teamsCreated = Config.maxCustomTeams
        ? new RateLimiter(Config.maxCustomTeams)
        : undefined;

    Bun.serve({
        hostname: Config.hostname,
        port: Config.port,
        routes: {
            "/api/serverInfo": async(req, res) => {
                let punishment: PunishmentMessage | undefined;
                if (new URLSearchParams(req.url.slice(req.url.indexOf("?"))).get("checkPunishments") === "true") {
                    punishment = await getPunishment(getIP(req, res));
                }

                const { playerCount, teamMode, map, mode, nextMode } = gameManager;

                return Response.json({
                    protocolVersion: GameConstants.protocolVersion,
                    playerCount,
                    teamMode: teamMode.current,
                    nextTeamMode: teamMode.next,
                    teamModeSwitchTime: teamMode.nextSwitch ? teamMode.nextSwitch - Date.now() : undefined,
                    mode,
                    nextMode,
                    modeSwitchTime: map.nextSwitch ? map.nextSwitch - Date.now() : undefined,
                    punishment
                }, corsHeaders);
            },
            "/api/getGame": async req => {
                let gameID: number | undefined;
                const teamID = gameManager.teamMode.current !== TeamMode.Solo && getSearchParams(req).get("teamID");
                if (teamID) {
                    gameID = customTeams?.get(teamID)?.gameID;
                } else {
                    gameID = await gameManager.findGame();
                }

                return Response.json(
                    gameID !== undefined
                        ? { success: true, gameID, mode: gameManager.mode }
                        : { success: false },
                    corsHeaders
                );
            },
            "/team": async(req, res) => {
                const ip = getIP(req, res);
                const searchParams = getSearchParams(req);

                // Prevent connection if it's solos + check rate limits & punishments
                if (
                    gameManager.teamMode.current === TeamMode.Solo
                    || teamsCreated?.isLimited(ip)
                    || await getPunishment(ip)
                ) {
                    return new Response("403 Forbidden");
                }

                // Get team
                const teamID = searchParams.get("teamID");
                let team: CustomTeam;
                if (teamID !== null) {
                    const givenTeam = customTeams?.get(teamID);
                    if (!givenTeam || givenTeam.locked || givenTeam.players.length >= (gameManager.teamMode.current as number)) {
                        return new Response("403 Forbidden"); // TODO "Team is locked" and "Team is full" messages
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
                res.upgrade(req, {
                    data: { player: new CustomTeamPlayer(ip, team, name, skin, badge, nameColor) }
                });
            }
        },
        websocket: {
            idleTimeout: 960,
            open(socket: Bun.ServerWebSocket<CustomTeamPlayerContainer>) {
                const { player } = socket.data;
                player.socket = socket;
                player.team.addPlayer(player);
            },

            message(socket: Bun.ServerWebSocket<CustomTeamPlayerContainer>, message: Buffer) {
                try {
                    const { player } = socket.data;
                    void player.team.onMessage(player, JSON.parse(String(message)) as CustomTeamMessage);
                } catch (e) {
                    serverError("Error parsing team socket message. Details:", e);
                }
            },

            close(socket: Bun.ServerWebSocket<CustomTeamPlayerContainer>) {
                const { player } = socket.data;
                const team = player.team;
                team.removePlayer(player);
                if (!team.players.length) {
                    customTeams?.delete(team.id);
                }
                teamsCreated?.decrement(player.ip);
            }
        }
    });

    process.stdout.write("\x1Bc"); // clears screen
    serverLog(`Suroi Server v${version}`);
    serverLog(`Listening on ${Config.hostname}:${Config.port}`);
    serverLog("Press Ctrl+C to exit.");

    void gameManager.newGame(0);
}
