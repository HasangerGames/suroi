import Cluster from "node:cluster";
import { BunRequest } from "bun";
import os from "os";
import { GameConstants } from "$common/constants";
import { Badges } from "$common/definitions/badges";
import { Skins } from "$common/definitions/items/skins";
import { GameMode, TeamMode } from "$common/schemas/misc";
import { CustomTeamMessage, PunishmentMessage } from "$common/typings";
import { version } from "../../package.json";
import { MapName } from "./data/maps";
import { GameContainer, GameManager } from "./gameManager";
import { CustomTeam, CustomTeamPlayer } from "./team";
import { Config } from "./utils/config";
import { cleanUsername, memoryUsageMb } from "./utils/misc";
import { corsHeaders, getIP, getPunishment, getSearchParams, parseRole, RateLimiter, serverError, serverLog } from "./utils/serverHelpers";

let customTeams: Map<string, CustomTeam> | undefined;
let teamsCreated: RateLimiter | undefined;

declare global {
    var initialSetupComplete: boolean | undefined
}

//
// Code for finding all buildings/obstacles for a mode
//
// const name = "infection";
// const mapDef = Maps[name];
// console.log(
//     getReachableBuildings(mapDef)
//         .map(o => `static/img/game/buildings/${o.idString}`)
//         .sort()
//         .join("\n")
// );
// console.log(
//     Array.from(new Set([
//         ...[
//             ...Object.keys(mapDef.obstacles ?? {}),
//             ...Object.keys(mapDef.rivers?.obstacles ?? {}),
//             ...(mapDef.obstacleClumps ?? []).flatMap(c => c.clump.obstacles),
//         ].map(o => Obstacles.fromString(o)),
//         ...getReachableObstacles(mapDef, getReachableBuildings(mapDef))
//     ]))
//         .filter(o => !o.wall && !o.invisible)
//         .map(o => `static/img/game/obstacles/${o.idString}`)
//         .sort()
//         .join("\n")
// );

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
                const load = os.loadavg().join("%, ");
                perfString += ` | CPU usage (1m, 5m, 15m): ${load}%`;
            }

            serverLog(perfString);
        }, 60000);
    }
    globalThis.initialSetupComplete = true;

    customTeams = new Map<string, CustomTeam>();

    teamsCreated = Config.maxCustomTeams
        ? new RateLimiter(Config.maxCustomTeams)
        : undefined;

    Bun.serve<CustomTeamPlayer>({
        hostname: Config.hostname,
        port: Config.mainPort,
        routes: {
            "/api/serverInfo": async(req: BunRequest, res: Bun.Server<CustomTeamPlayer>) => {
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
            "/team": async(req: BunRequest, res: Bun.Server<CustomTeamPlayer>) => {
                const ip = getIP(req, res);

                if (teamsCreated?.isLimited(ip)) {
                    return new Response("403 Forbidden");
                }

                const punishmentMessage = (await getPunishment(ip))?.message;
                if (punishmentMessage && punishmentMessage !== "noname") {
                    return new Response("403 Forbidden");
                }

                // Get team
                const searchParams = getSearchParams(req);
                const teamID = searchParams.get("teamID");
                let team: CustomTeam;
                if (teamID !== null) {
                    const givenTeam = customTeams?.get(teamID);
                    if (!givenTeam || givenTeam.locked || givenTeam.players.length >= 4) {
                        return new Response("403 Forbidden"); // TODO "Team is locked" and "Team is full" messages
                    }
                    team = givenTeam;
                } else {
                    team = new CustomTeam(gameManager);
                    customTeams?.set(team.id, team);
                }

                // Get name, skin, badge, & role
                const name = punishmentMessage === "noname" ? GameConstants.player.defaultName : cleanUsername(searchParams.get("name"));
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
                    data: new CustomTeamPlayer(ip, team, name, skin, badge, nameColor)
                });
            }
        },
        websocket: {
            idleTimeout: 960,
            open(socket: Bun.ServerWebSocket<CustomTeamPlayer>) {
                const player = socket.data;
                player.socket = socket;
                player.team.addPlayer(player);
            },

            message(socket: Bun.ServerWebSocket<CustomTeamPlayer>, message: string | Buffer<ArrayBuffer>) {
                try {
                    const player = socket.data;
                    void player.team.onMessage(player, JSON.parse(String(message)) as CustomTeamMessage);
                } catch (e) {
                    serverError("Error parsing team socket message. Details:", e);
                }
            },

            close(socket: Bun.ServerWebSocket<CustomTeamPlayer>) {
                const player = socket.data;
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
    serverLog(`Listening on ${Config.hostname}:${Config.mainPort}`);
    serverLog("Press Ctrl+C to exit.");
}
