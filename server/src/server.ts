import { GameConstants, TeamSize } from "@common/constants";
import { Mode } from "@common/definitions/modes";
import { ColorStyles, Logger, styleText } from "@common/utils/logging";
import { Numeric } from "@common/utils/math";
import { pickRandomInArray } from "@common/utils/random";
import { Cron } from "croner";
import { existsSync, readFile, writeFileSync } from "fs";
import Cluster from "node:cluster";
import { createServer, IncomingMessage } from "node:http";
import { URLSearchParams } from "node:url";
import os from "os";
import { version } from "../../package.json";
import { Config } from "./config";
import { GameContainer, games, newGame, WorkerMessages } from "./gameManager";
import { CustomTeam } from "./team";
import IPChecker, { Punishment } from "./utils/apiHelper";
import { modeFromMap } from "./utils/misc";
import { getIP } from "./utils/serverHelpers";

export function serverLog(...message: unknown[]): void {
    Logger.log(styleText("[Server]", ColorStyles.foreground.magenta.normal), ...message);
}

export function serverWarn(...message: unknown[]): void {
    Logger.warn(styleText("[Server] [WARNING]", ColorStyles.foreground.yellow.normal), ...message);
}

export function serverError(...message: unknown[]): void {
    Logger.warn(styleText("[Server] [ERROR]", ColorStyles.foreground.red.normal), ...message);
}

let punishments: Punishment[] = [];

const ipCheck = Config.protection?.ipChecker
    ? new IPChecker(Config.protection.ipChecker.baseUrl, Config.protection.ipChecker.key)
    : undefined;

export const simultaneousConnections: Record<string, number> = {};
let joinAttempts: Record<string, number> = {};
let teamsCreated: Record<string, number> = {};

export const customTeams: Map<string, CustomTeam> = new Map<string, CustomTeam>();

export let maxTeamSize = typeof Config.maxTeamSize === "number"
    ? Config.maxTeamSize
    : Config.maxTeamSize.rotation[0];

let nextTeamSize = typeof Config.maxTeamSize === "number"
    ? undefined
    : (Config.maxTeamSize.rotation[1] ?? Config.maxTeamSize.rotation[0]);

let teamSizeRotationIndex = 0;

let maxTeamSizeSwitchCron: Cron | undefined;

export let map = typeof Config.map === "string" ? Config.map : Config.map.rotation[0];

let mapRotationIndex = 0;

let mapSwitchCron: Cron | undefined;

let mode: Mode;
let nextMode: Mode;

if (Cluster.isPrimary && require.main === module) {
    //                   ^^^^^^^^^^^^^^^^^^^^^^^ only starts server if called directly from command line (not imported)

    process.on("uncaughtException", e => serverError("An unhandled error occurred. Details:", e));

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    createServer(async(req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with");
        res.setHeader("Access-Control-Max-Age", "3600");

        if (req.method !== "GET") {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain").end("404 Not Found");
            return;
        }

        type ErrorResponse = { message: string, reason?: string, reportID?: string };
        const forbidden = (message: ErrorResponse): void => {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json").end(JSON.stringify(message));
        };

        const ip = getIP(req);

        const punishment = punishments.find(p => p.ip === ip);
        if (punishment) {
            if (punishment.punishmentType === "warn") {
                const protection = Config.protection;
                if (protection?.punishments?.url) {
                    punishments = punishments.filter(p => p.ip !== ip);
                    fetch(
                        `${protection.punishments.url}/punishments/${ip}`,
                        { method: "DELETE", headers: { "api-key": protection.punishments.password } }
                    ).catch(err => console.error("Error acknowledging warning. Details:", err));
                }
            }
            forbidden({
                message: punishment.punishmentType,
                reason: punishment.reason,
                reportID: punishment.reportId
            });
            return;
        }

        if (ipCheck && (await ipCheck.check(ip)).flagged) {
            forbidden({ message: "vpn" });
            return;
        }

        if (req.url === "/api/serverInfo") {
            res.setHeader("Content-Type", "application/json").end(JSON.stringify({
                protocolVersion: GameConstants.protocolVersion,
                playerCount: games.reduce((a, b) => (a + (b?.aliveCount ?? 0)), 0),
                maxTeamSize,
                maxTeamSizeSwitchTime: maxTeamSizeSwitchCron?.nextRun()?.getTime(),
                nextTeamSize,
                mode,
                modeSwitchTime: mapSwitchCron?.nextRun()?.getTime(),
                nextMode
            }));
        } else if (req.url?.startsWith("/play") && req.headers.upgrade?.toLowerCase() === "websocket") {
            //
            // Rate limits
            //
            if (Config.protection) {
                const { maxSimultaneousConnections, maxJoinAttempts } = Config.protection;

                if (
                    simultaneousConnections[ip] >= (maxSimultaneousConnections ?? Infinity)
                    || joinAttempts[ip] >= (maxJoinAttempts?.count ?? Infinity)
                ) {
                    serverWarn(`Rate limited: ${ip}`);
                    forbidden({ message: "rateLimit" });
                    return;
                } else {
                    if (maxSimultaneousConnections) {
                        simultaneousConnections[ip] = (simultaneousConnections[ip] ?? 0) + 1;
                        serverLog(`${simultaneousConnections[ip]}/${maxSimultaneousConnections} simultaneous connections: ${ip}`);
                    }
                    if (maxJoinAttempts) {
                        joinAttempts[ip] = (joinAttempts[ip] ?? 0) + 1;
                        serverLog(`${joinAttempts[ip]}/${maxJoinAttempts.count} join attempts in the last ${maxJoinAttempts.duration} ms: ${ip}`);
                    }
                }
            }

            //
            // Find game
            //
            const searchParams = new URLSearchParams(req.url.slice(req.url.indexOf("?")));
            const teamID = maxTeamSize !== TeamSize.Solo && searchParams.get("teamID");
            let game: GameContainer | undefined;
            if (teamID) {
                const team = customTeams.get(teamID);
                if (team?.gameID !== undefined) {
                    game = games[team.gameID];
                }
            } else {
                const eligibleGames = games.filter((g?: GameContainer): g is GameContainer =>
                    g !== undefined
                    && g.allowJoin
                    && g.aliveCount < Config.maxPlayersPerGame
                );

                game = eligibleGames.length
                    ? pickRandomInArray(eligibleGames) // Pick randomly from the available games
                    : await newGame(); // If a game isn't available, attempt to create a new one
            }

            if (!game || game.over) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "text/plain").end("500 Internal Server Error");
                return;
            }

            //
            // Validate and parse role and name color
            //
            const password = searchParams.get("password");
            const givenRole = searchParams.get("role");
            let role: string | undefined;
            let isDev = false;

            let nameColor: number | undefined;
            if (
                password !== null
                && givenRole !== null
                && givenRole in Config.roles
                && Config.roles[givenRole].password === password
            ) {
                role = givenRole;
                isDev = Config.roles[givenRole].isDev ?? false;

                if (isDev) {
                    try {
                        const colorString = searchParams.get("nameColor");
                        if (colorString) nameColor = Numeric.clamp(parseInt(colorString), 0, 0xffffff);
                    } catch { /* guess your color sucks lol */ }
                }
            }

            //
            // Upgrade the connection
            //
            const { headers, method, socket } = req;
            game.worker.send({
                type: WorkerMessages.AddPlayer,
                request: { headers, method } as IncomingMessage,
                head: headers,
                playerData: {
                    teamID,
                    autoFill: Boolean(searchParams.get("autoFill")),
                    player: undefined,
                    ip,
                    role,
                    isDev,
                    nameColor,
                    lobbyClearing: searchParams.get("lobbyClearing") === "true",
                    weaponPreset: searchParams.get("weaponPreset") ?? ""
                }
            }, socket);
        }
    }).listen(Config.port, Config.host);

    process.stdout.write("\x1Bc"); // clears screen
    serverLog(`Suroi Server v${version}`);
    serverLog(`Listening on ${Config.host}:${Config.port}`);
    serverLog("Press Ctrl+C to exit.");

    void newGame(0);

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

    const teamSize = Config.maxTeamSize;
    if (typeof teamSize === "object") {
        maxTeamSizeSwitchCron = Cron(teamSize.switchSchedule, () => {
            maxTeamSize = teamSize.rotation[++teamSizeRotationIndex % teamSize.rotation.length];
            nextTeamSize = teamSize.rotation[(teamSizeRotationIndex + 1) % teamSize.rotation.length];

            for (const game of games) {
                game?.sendMessage({ type: WorkerMessages.UpdateMaxTeamSize, maxTeamSize });
            }

            const humanReadableTeamSizes = [undefined, "solos", "duos", "trios", "squads"];
            serverLog(`Switching to ${humanReadableTeamSizes[maxTeamSize] ?? `team size ${maxTeamSize}`}`);
        });
    }

    mode = modeFromMap(map);

    const _map = Config.map;
    if (typeof _map === "object") {
        mapSwitchCron = Cron(_map.switchSchedule, () => {
            map = _map.rotation[++mapRotationIndex % _map.rotation.length];
            mode = modeFromMap(map);
            nextMode = modeFromMap(_map.rotation[(mapRotationIndex + 1) % _map.rotation.length]);

            for (const game of games) {
                game?.sendMessage({ type: WorkerMessages.UpdateMap, map });
            }

            serverLog(`Switching to "${map}" map`);
        });
        nextMode = modeFromMap(_map.rotation[1] ?? _map.rotation[0]);
    }

    const { protection } = Config;
    if (protection) {
        setInterval(() => {
            if (protection.punishments?.url) {
                void (async() => {
                    try {
                        if (!protection.punishments?.url) return;
                        const response = await fetch(`${protection.punishments.url}/punishments`, { headers: { "api-key": protection.punishments.password } });

                        // we hope that this is safe
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        if (response.ok) punishments = await response.json();
                        else console.error("Error: Unable to fetch punishment list.");
                    } catch (e) {
                        console.error("Error: Unable to fetch punishment list. Details:", e);
                    }
                })();
            }

            teamsCreated = {};

            Logger.log("Reloaded punishment list");
        }, protection.refreshDuration);

        if (protection.maxJoinAttempts) {
            setInterval((): void => {
                joinAttempts = {};
            }, protection.maxJoinAttempts.duration);
        }
    }
    // }).ws("/team", {
    //     idleTimeout: 30,

    //     /**
    //      * Upgrade the connection to WebSocket.
    //      */
    //     upgrade(res, req, context) {
    //         res.onAborted((): void => { /* Handle errors in WS connection */ });

    //         const ip = getIP(res, req);
    //         const maxTeams = Config.protection?.maxTeams;
    //         if (
    //             maxTeamSize === TeamSize.Solo
    //             || (maxTeams && teamsCreated[ip] > maxTeams)
    //         ) {
    //             forbidden(res);
    //             return;
    //         }

    //         const searchParams = new URLSearchParams(req.getQuery());
    //         const teamID = searchParams.get("teamID");

    //         let team!: CustomTeam;
    //         const noTeamIdGiven = teamID !== null;
    //         if (
    //             noTeamIdGiven
    //             // @ts-expect-error cleanest overall way to do this (`undefined` gets filtered out anyways)
    //             && (team = customTeams.get(teamID)) === undefined
    //         ) {
    //             forbidden(res);
    //             return;
    //         }

    //         if (noTeamIdGiven) {
    //             if (team.locked || team.players.length >= (maxTeamSize as number)) {
    //                 forbidden(res); // TODO "Team is locked" and "Team is full" messages
    //                 return;
    //             }
    //         } else {
    //             team = new CustomTeam();
    //             customTeams.set(team.id, team);

    //             if (Config.protection?.maxTeams) {
    //                 teamsCreated[ip] = (teamsCreated[ip] ?? 0) + 1;
    //             }
    //         }

    //         const name = cleanUsername(searchParams.get("name"));
    //         let skin = searchParams.get("skin") ?? GameConstants.player.defaultSkin;
    //         let badge = searchParams.get("badge") ?? undefined;

    //         //
    //         // Role
    //         //
    //         const password = searchParams.get("password");
    //         const givenRole = searchParams.get("role");
    //         let role = "";
    //         let nameColor: number | undefined;

    //         if (
    //             password !== null
    //             && givenRole !== null
    //             && givenRole in Config.roles
    //             && Config.roles[givenRole].password === password
    //         ) {
    //             role = givenRole;

    //             if (Config.roles[givenRole].isDev) {
    //                 try {
    //                     const colorString = searchParams.get("nameColor");
    //                     if (colorString) nameColor = Numeric.clamp(parseInt(colorString), 0, 0xffffff);
    //                 } catch { /* lol your color sucks */ }
    //             }
    //         }

    //         // Validate skin
    //         const skinDefinition = Skins.fromStringSafe(skin);
    //         const rolesRequired = skinDefinition?.rolesRequired;
    //         if (!skinDefinition || (rolesRequired && !rolesRequired.includes(role))) {
    //             skin = GameConstants.player.defaultSkin;
    //         }

    //         // Validate badge
    //         const badgeDefinition = badge ? Badges.fromStringSafe(badge) : undefined;
    //         if (!badgeDefinition || (badgeDefinition.roles && !badgeDefinition.roles.includes(role))) {
    //             badge = undefined;
    //         }

    //         res.upgrade(
    //             {
    //                 player: new CustomTeamPlayer(
    //                     team,
    //                     name,
    //                     skin,
    //                     badge,
    //                     nameColor
    //                 )
    //             },
    //             req.getHeader("sec-websocket-key"),
    //             req.getHeader("sec-websocket-protocol"),
    //             req.getHeader("sec-websocket-extensions"),
    //             context
    //         );
    //     },

    //     /**
    //      * Handle opening of the socket.
    //      * @param socket The socket being opened.
    //      */
    //     open(socket: WebSocket<CustomTeamPlayerContainer>) {
    //         const player = socket.getUserData().player;
    //         player.socket = socket;
    //         player.team.addPlayer(player);
    //     },

    //     /**
    //      * Handle messages coming from the socket.
    //      * @param socket The socket in question.
    //      * @param message The message to handle.
    //      */
    //     message(socket: WebSocket<CustomTeamPlayerContainer>, message: ArrayBuffer) {
    //         const player = socket.getUserData().player;
    //         try {
    //             void player.team.onMessage(player, JSON.parse(textDecoder.decode(message)) as CustomTeamMessage);
    //         } catch (e) {
    //             serverError("Error parsing team socket message. Details:", e);
    //         }
    //     },

    //     /**
    //      * Handle closing of the socket.
    //      * @param socket The socket being closed.
    //      */
    //     close(socket: WebSocket<CustomTeamPlayerContainer>) {
    //         const player = socket.getUserData().player;
    //         player.team.removePlayer(player);
    //     }
    // }).listen(Config.host, Config.port, (): void => {
}
