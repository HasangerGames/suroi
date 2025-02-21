import { GameConstants, TeamSize } from "@common/constants";
import { Badges } from "@common/definitions/badges";
import { Skins } from "@common/definitions/items/skins";
import { Mode } from "@common/definitions/modes";
import { CustomTeamMessage, PunishmentMessage } from "@common/typings";
import { Logger } from "@common/utils/logging";
import { Cron } from "croner";
import Cluster from "node:cluster";
import { createServer, IncomingMessage } from "node:http";
import { URLSearchParams } from "node:url";
import os from "os";
import { WebSocketServer } from "ws";
import { version } from "../../package.json";
import { Config } from "./config";
import { findGame, GameContainer, games, newGame, WorkerMessage, WorkerMessages } from "./gameManager";
import { CustomTeam, CustomTeamPlayer } from "./team";
import IPChecker, { Punishment } from "./utils/apiHelper";
import { cleanUsername, modeFromMap } from "./utils/misc";
import { forbidden, notFound, RateLimiter, serverError, serverLog, serverWarn } from "./utils/serverHelpers";
import { Numeric } from "@common/utils/math";

let punishments: Punishment[] = [];

const protection = Config.protection;

const ipCheck = protection?.ipChecker
    ? new IPChecker(protection.ipChecker.baseUrl, protection.ipChecker.key)
    : undefined;

const joinAttempts = protection?.maxJoinAttempts
    ? new RateLimiter(protection.maxJoinAttempts.count, protection.maxJoinAttempts.duration)
    : undefined;

const teamsCreated = protection?.maxTeams
    ? new RateLimiter(protection.maxTeams)
    : undefined;

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

    const teamWs = new WebSocketServer({ noServer: true });

    function parseRole(searchParams: URLSearchParams): { readonly role?: string, readonly isDev: boolean, readonly nameColor?: number } {
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
        return { role, isDev, nameColor };
    }

    async function checkPunishments(ip?: string): Promise<PunishmentMessage | undefined> {
        if (!ip) return;

        const punishment = punishments.find(p => p.ip === ip);
        if (punishment) {
            if (punishment.punishmentType === "warn") {
                punishments = punishments.filter(p => p.ip !== ip);
                if (protection?.punishments?.url) {
                    fetch(
                        `${protection.punishments.url}/punishments/${ip}`,
                        { method: "DELETE", headers: { "api-key": protection.punishments.password } }
                    ).catch(err => console.error("Error acknowledging warning. Details:", err));
                }
            }
            return {
                message: punishment.punishmentType,
                reason: punishment.reason,
                reportID: punishment.reportId
            };
        } else if (ipCheck && ip && (await ipCheck.check(ip)).flagged) {
            return { message: "vpn" };
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    createServer(async(req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with");
        res.setHeader("Access-Control-Max-Age", "3600");

        if (req.method !== "GET" || !req.url) {
            notFound(res);
            return;
        }

        const ip = Config.ipHeader ? req.headers[Config.ipHeader] as string : req.socket.remoteAddress;

        //
        // GET /api/serverInfo
        //
        if (req.url.startsWith("/api/serverInfo")) {
            res.setHeader("Content-Type", "application/json").end(JSON.stringify({
                protocolVersion: GameConstants.protocolVersion,
                playerCount: games.reduce((a, b) => (a + (b?.aliveCount ?? 0)), 0),
                maxTeamSize,
                maxTeamSizeSwitchTime: maxTeamSizeSwitchCron?.nextRun()?.getTime(),
                nextTeamSize,
                mode,
                modeSwitchTime: mapSwitchCron?.nextRun()?.getTime(),
                nextMode,
                punishment: await checkPunishments(ip)
            }));

        //
        // WebSocket /play
        //
        } else if (req.url.startsWith("/play")) {
            // Rate limit join attempts
            if (joinAttempts?.isLimited(ip)) {
                serverWarn(ip, "exceeded join attempt limit");
                forbidden(res);
                return;
            }
            joinAttempts?.increment(ip);

            // Check punishments
            const punishment = await checkPunishments(ip);
            if (punishment) {
                forbidden(res);
                return;
            }

            // Find game
            const searchParams = new URLSearchParams(req.url.slice(req.url.indexOf("?")));
            const teamID = maxTeamSize !== TeamSize.Solo ? (searchParams.get("teamID") ?? undefined) : undefined;
            let game: GameContainer | undefined;
            if (teamID) {
                const gameID = customTeams.get(teamID)?.gameID;
                if (gameID !== undefined) {
                    game = games[gameID];
                }
            } else {
                game = await findGame();
            }
            if (!game?.allowJoin) {
                forbidden(res);
                return;
            }

            // Upgrade the connection
            const { role, isDev, nameColor } = parseRole(searchParams);
            game.worker.send({
                type: WorkerMessages.AddPlayer,
                request: { headers: req.headers, method: req.method } as IncomingMessage,
                playerData: {
                    ip,
                    teamID,
                    autoFill: Boolean(searchParams.get("autoFill")),
                    role,
                    isDev,
                    nameColor,
                    lobbyClearing: searchParams.get("lobbyClearing") === "true",
                    weaponPreset: searchParams.get("weaponPreset") ?? ""
                }
            } satisfies WorkerMessage, req.socket);

        //
        // WebSocket /team
        //
        } else if (req.url.startsWith("/team")) {
            // Prevent connection if it's solos + check punishments & rate limits
            if (
                maxTeamSize === TeamSize.Solo
                || teamsCreated?.isLimited(ip)
                || await checkPunishments(ip)
            ) {
                forbidden(res);
                return;
            }

            // Get team
            const searchParams = new URLSearchParams(req.url.slice(req.url.indexOf("?")));
            const teamID = searchParams.get("teamID");
            let team: CustomTeam;
            if (teamID !== null) {
                const givenTeam = customTeams.get(teamID);
                if (!givenTeam || givenTeam.locked || givenTeam.players.length >= (maxTeamSize as number)) {
                    forbidden(res); // TODO "Team is locked" and "Team is full" messages
                    return;
                }
                team = givenTeam;
            } else {
                team = new CustomTeam();
                customTeams.set(team.id, team);
                teamsCreated?.increment(ip);
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
            // @ts-expect-error despite what the typings say, the headers don't have to be a Buffer
            teamWs.handleUpgrade(req, req.socket, req.headers, socket => {
                const player = new CustomTeamPlayer(team, socket, name, skin, badge, nameColor);

                socket.on("message", (message: string) => {
                    try {
                        void player.team.onMessage(player, JSON.parse(message) as CustomTeamMessage);
                    } catch (e) {
                        serverError("Error parsing team socket message. Details:", e);
                    }
                });

                socket.on("close", () => {
                    teamsCreated?.decrement(ip);
                    player.team.removePlayer(player);
                });
            });

        //
        // 404
        //
        } else {
            notFound(res);
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

    if (protection?.punishments) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setInterval(async() => {
            if (!protection.punishments) return; // should never happen, but adding this check makes ts shut up
            try {
                const response = await fetch(`${protection.punishments.url}/punishments`, { headers: { "api-key": protection.punishments.password } });

                // we hope that this is safe
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                if (response.ok) punishments = await response.json();
                else console.error("Error: Unable to fetch punishment list.");
            } catch (e) {
                console.error("Error: Unable to fetch punishment list. Details:", e);
            }
            Logger.log("Reloaded punishment list");
        }, protection.punishments.refreshDuration);
    }
}
