import { GameConstants, TeamSize } from "@common/constants";
import { Badges } from "@common/definitions/badges";
import { Skins } from "@common/definitions/items/skins";
import { Mode } from "@common/definitions/modes";
import { CustomTeamMessage, PunishmentMessage } from "@common/typings";
import { Logger } from "@common/utils/logging";
import { Numeric } from "@common/utils/math";
import Cluster from "node:cluster";
import { IncomingMessage } from "node:http";
import { URLSearchParams } from "node:url";
import os from "os";
import { WebSocketServer } from "ws";
import { version } from "../../package.json";
import { Config } from "./config";
import { findGame, GameContainer, games, newGame, WorkerMessage, WorkerMessages } from "./gameManager";
import { CustomTeam, CustomTeamPlayer } from "./team";
import IPChecker, { Punishment } from "./utils/apiHelper";
import { cleanUsername, modeFromMap } from "./utils/misc";
import { getIP, RateLimiter, serverError, serverLog, serverWarn, Switcher } from "./utils/serverHelpers";
import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";

if (Cluster.isPrimary && require.main === module) {
    //                   ^^^^^^^^^^^^^^^^^^^^^^^ only starts server if called directly from command line (not imported)

    process.on("uncaughtException", e => serverError("An unhandled error occurred. Details:", e));

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

    const customTeams: Map<string, CustomTeam> = new Map<string, CustomTeam>();
    const customTeamWs = new WebSocketServer({ noServer: true });

    const resetTeams = (): void => {
        for (const team of customTeams.values()) {
            for (const player of team.players) player.socket.close();
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

    const server = Config.ssl
        ? https.createServer({
            key: readFileSync(Config.ssl.key, "utf8"),
            cert: readFileSync(Config.ssl.cert, "utf8"),
            ca: readFileSync(Config.ssl.ca, "utf8")
        })
        : http.createServer();

    //
    // GET /serverInfo
    //
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server.on("request", async(req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, x-requested-with");
        res.setHeader("Access-Control-Max-Age", "3600");

        if (req.method !== "GET" || !req.url?.startsWith("/api/serverInfo")) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain").end("404 Not Found");
            return;
        }

        res.setHeader("Content-Type", "application/json").end(JSON.stringify({
            protocolVersion: GameConstants.protocolVersion,
            playerCount: games.reduce((a, b) => (a + (b?.aliveCount ?? 0)), 0),
            teamSize: teamSize.current,
            nextTeamSize: teamSize.next,
            teamSizeSwitchTime: teamSize.nextSwitch ? teamSize.nextSwitch - Date.now() : undefined,
            mode,
            nextMode,
            modeSwitchTime: map.nextSwitch ? map.nextSwitch - Date.now() : undefined,
            punishment: await checkPunishments(getIP(req))
        }));
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server.on("upgrade", async(req, socket, head) => {
        const ip = getIP(req);

        //
        // WS /play
        //
        if (req.url?.startsWith("/play")) {
            // Rate limit join attempts
            if (joinAttempts?.isLimited(ip)) {
                serverWarn(ip, "exceeded join attempt limit");
                socket.emit("close");
                return;
            }
            joinAttempts?.increment(ip);

            // Check punishments
            const punishment = await checkPunishments(ip);
            if (punishment) {
                socket.emit("close");
                return;
            }

            // Find game
            const searchParams = new URLSearchParams(req.url.slice(req.url.indexOf("?")));
            const teamID = teamSize.current !== TeamSize.Solo ? (searchParams.get("teamID") ?? undefined) : undefined;
            let game: GameContainer | undefined;
            if (teamID) {
                const gameID = customTeams.get(teamID)?.gameID;
                if (gameID !== undefined) {
                    game = games[gameID];
                }
            } else {
                game = await findGame(teamSize.current, map.current);
            }
            if (!game?.allowJoin) {
                socket.emit("close");
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
        // WS /team
        //
        } else if (req.url?.startsWith("/team")) {
            // Prevent connection if it's solos + check punishments & rate limits
            if (
                teamSize.current === TeamSize.Solo
                || teamsCreated?.isLimited(ip)
                || await checkPunishments(ip)
            ) {
                socket.emit("close");
                return;
            }

            // Get team
            const searchParams = new URLSearchParams(req.url.slice(req.url.indexOf("?")));
            const teamID = searchParams.get("teamID");
            let team: CustomTeam;
            if (teamID !== null) {
                const givenTeam = customTeams.get(teamID);
                if (!givenTeam || givenTeam.locked || givenTeam.players.length >= (teamSize.current as number)) {
                    socket.emit("close"); // TODO "Team is locked" and "Team is full" messages
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
            customTeamWs.handleUpgrade(req, socket, head, socket => {
                teamsCreated?.increment(ip);
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
                    const team = player.team;
                    team.removePlayer(player);
                    if (!team.players.length) {
                        customTeams.delete(team.id);
                    }
                });
            });

        //
        // Invalid/unknown route
        //
        } else {
            socket.emit("close");
        }
    }).listen(Config.port, Config.host);

    process.stdout.write("\x1Bc"); // clears screen
    serverLog(`Suroi Server v${version}`);
    serverLog(`Listening on ${Config.host}:${Config.port}`);
    serverLog("Press Ctrl+C to exit.");

    void newGame(0, teamSize.current, map.current);

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
