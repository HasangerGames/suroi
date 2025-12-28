import { GameConstants, TeamMode } from "@common/constants";
import { Badges } from "@common/definitions/badges";
import { Skins } from "@common/definitions/items/skins";
import { CustomTeamMessage, PunishmentMessage } from "@common/typings";
import Cluster from "node:cluster";
import { URLSearchParams } from "node:url";
import os from "os";
import { version } from "../../package.json";
import { GameManager, createGameHandlers } from "./gameManager";
import { Game } from "./game";
import { CustomTeam, CustomTeamPlayer, CustomTeamPlayerContainer } from "./team";
import { Config } from "./utils/config";
import { cleanUsername } from "./utils/misc";
import { corsHeaders, getIP, getPunishment, getSearchParams, parseRole, RateLimiter, serverError, serverLog } from "./utils/serverHelpers";

let customTeams: Map<string, CustomTeam> | undefined;
let teamsCreated: RateLimiter | undefined;

// Render sets the PORT environment variable. We use this as a flag to enable single-process mode.
const IS_SINGLE_PROCESS = !!process.env.PORT || !!process.env.RENDER || !!process.env.SINGLE_PROCESS;

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

    // In single process mode, we instantiate one game directly in the main thread
    let singleGame: Game | undefined;

    if (IS_SINGLE_PROCESS) {
        serverLog("Running in SINGLE PROCESS mode (Render/Cloud compatible)");
        // Force settings for single process
        Config.maxGames = 1;

        // Initialize the single game
        const teamMode = gameManager.teamMode.current;
        const map = gameManager.map.current;
        singleGame = new Game(0, teamMode, map, {});

        // Mock the GameContainer structure that gameManager expects
        // This is a bit hacky but allows gameManager to 'see' the game
        // We override newGame to return this existing game
        gameManager.newGame = async () => {
             // In single process, the game is always running.
             // We just return a mock container that resolves immediately.
             return {
                 id: 0,
                 aliveCount: singleGame!.aliveCount,
                 allowJoin: singleGame!.allowJoin,
                 over: singleGame!.over,
                 startedTime: singleGame!.startedTime,
                 worker: { kill: () => singleGame!.kill() } as any, // Mock worker
                 sendMessage: () => {}, // TODO: Handle message passing if needed in single process
                 promiseCallbacks: []
             } as any;
        };

        // Populate the games array so findGame works
        // @ts-ignore
        gameManager.games[0] = await gameManager.newGame(0);
        singleGame.setGameData({ allowJoin: true });
    }

    // Prevents multiple loops from piling up if the process is hot reloaded
    if (!globalThis.initialSetupComplete) {
        let exiting = false;
        const exit = (): void => {
            if (exiting) return;
            exiting = true;
            serverLog("Shutting down...");
            if (IS_SINGLE_PROCESS && singleGame) {
                singleGame.kill();
            } else {
                for (const game of gameManager.games) {
                    game?.worker.kill();
                }
            }
            process.exit();
        };
        process.on("exit", exit);
        process.on("SIGINT", exit);
        process.on("SIGTERM", exit);
        process.on("SIGUSR2", exit);

        process.on("uncaughtException", e => {
            serverError("An unhandled error occurred. Details:", e);
             if (IS_SINGLE_PROCESS && singleGame) {
                singleGame.kill();
            } else {
                for (const game of gameManager.games) {
                    game?.worker.kill();
                }
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

            if (!IS_SINGLE_PROCESS) {
                gameManager.updateMapScaleRange();
            }
        }, 60000);
    }
    globalThis.initialSetupComplete = true;

    customTeams = new Map<string, CustomTeam>();

    teamsCreated = Config.maxCustomTeams
        ? new RateLimiter(Config.maxCustomTeams)
        : undefined;

    const gameHandlers = IS_SINGLE_PROCESS && singleGame ? createGameHandlers(singleGame) : { routes: {}, websocket: {} };

    Bun.serve({
        hostname: Config.hostname,
        port: Config.port,
        routes: {
            // Merge game routes if in single process mode
            ...gameHandlers.routes,

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
                let punishmentMessage: string | undefined;

                // Prevent connection if it's solos + check rate limits & punishments
                if (
                    gameManager.teamMode.current === TeamMode.Solo
                    || teamsCreated?.isLimited(ip)
                    || (punishmentMessage = (await getPunishment(ip))?.message) && punishmentMessage !== "noname"
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
        },
        websocket: {
             open(socket: any) {
                 if (IS_SINGLE_PROCESS && singleGame) {
                     // Check if this connection belongs to the game
                     // The game WebSocket handlers expect PlayerSocketData
                     // But the Team handlers expect CustomTeamPlayerContainer
                     // We need to route based on some data or URL?
                     // Bun.serve routes upgrade requests to 'websocket' handler.
                     // The 'data' in socket depends on what was passed to res.upgrade()

                     // If it has 'player' and 'team' properties, it's likely a CustomTeam connection (lobby)
                     if (socket.data.player && socket.data.player.team) {
                        const { player } = socket.data as CustomTeamPlayerContainer;
                        player.socket = socket;
                        player.team.addPlayer(player);
                        return;
                     }

                     // Otherwise, assume it's a Game connection if we are in single process mode
                     // Call the game handler
                     // @ts-ignore
                     gameHandlers.websocket.open(socket);
                 } else {
                     // Original behavior (only team/lobby sockets)
                     const { player } = socket.data as CustomTeamPlayerContainer;
                     player.socket = socket;
                     player.team.addPlayer(player);
                 }
            },
            message(socket: any, message: any) {
                 if (IS_SINGLE_PROCESS && singleGame) {
                     if (socket.data.player && socket.data.player.team && socket.data.player instanceof CustomTeamPlayer) {
                         // Team/Lobby message
                         try {
                            const { player } = socket.data as CustomTeamPlayerContainer;
                            void player.team.onMessage(player, JSON.parse(String(message)) as CustomTeamMessage);
                        } catch (e) {
                            serverError("Error parsing team socket message. Details:", e);
                        }
                     } else {
                         // Game message
                         // @ts-ignore
                         gameHandlers.websocket.message(socket, message);
                     }
                 } else {
                      try {
                        const { player } = socket.data as CustomTeamPlayerContainer;
                        void player.team.onMessage(player, JSON.parse(String(message)) as CustomTeamMessage);
                    } catch (e) {
                        serverError("Error parsing team socket message. Details:", e);
                    }
                 }
            },
            close(socket: any) {
                 if (IS_SINGLE_PROCESS && singleGame) {
                      if (socket.data.player && socket.data.player.team && socket.data.player instanceof CustomTeamPlayer) {
                          // Team/Lobby close
                            const { player } = socket.data as CustomTeamPlayerContainer;
                            const team = player.team;
                            team.removePlayer(player);
                            if (!team.players.length) {
                                customTeams?.delete(team.id);
                            }
                            teamsCreated?.decrement(player.ip);
                      } else {
                          // Game close
                          // @ts-ignore
                          gameHandlers.websocket.close(socket);
                      }
                 } else {
                    const { player } = socket.data as CustomTeamPlayerContainer;
                    const team = player.team;
                    team.removePlayer(player);
                    if (!team.players.length) {
                        customTeams?.delete(team.id);
                    }
                    teamsCreated?.decrement(player.ip);
                 }
            },
            drain: (socket: any) => {
                 // Game handlers might have drain? No, original gameManager didn't have drain.
            }
        }
    });

    process.stdout.write("\x1Bc"); // clears screen
    serverLog(`Suroi Server v${version}`);
    serverLog(`Listening on ${Config.hostname}:${Config.port}`);
    serverLog("Press Ctrl+C to exit.");

    if (!IS_SINGLE_PROCESS) {
        void gameManager.newGame(0);
    }
}
