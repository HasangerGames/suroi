import { Cron } from "croner";
import { existsSync, readFile, writeFile, writeFileSync } from "fs";
import { URLSearchParams } from "node:url";
import os from "os";
import { type WebSocket } from "uWebSockets.js";
import { isMainThread } from "worker_threads";
import { GameConstants, TeamSize } from "../../common/src/constants";
import { Badges } from "../../common/src/definitions/badges";
import { Skins } from "../../common/src/definitions/skins";
import { type GetGameResponse } from "../../common/src/typings";
import { Numeric } from "../../common/src/utils/math";
import { version } from "../../package.json";
import { Config } from "./config";
import { findGame, games, newGame } from "./gameManager";
import { CustomTeam, CustomTeamPlayer, type CustomTeamPlayerContainer } from "./team";
import { Logger } from "./utils/misc";
import { cors, createServer, forbidden, getIP, textDecoder } from "./utils/serverHelpers";
import { cleanUsername } from "./utils/usernameFilter";

export interface Punishment {
    readonly id: string
    readonly ip: string
    readonly reportId: string
    readonly reason: string
    readonly reporter: string
    readonly expires?: number
    readonly punishmentType: "warn" | "temp" | "perma"
}

let punishments: Punishment[] = [];

let ipBlocklist: string[] | undefined;

function removePunishment(ip: string): void {
    punishments = punishments.filter(p => p.ip !== ip);

    if (Config.protection?.punishments?.url) {
        fetch(
            `${Config.protection.punishments.url}/punishments/${ip}`,
            { method: "DELETE", headers: { "api-key": Config.protection.punishments.password } }
        ).catch(err => console.error("Error removing punishment from server. Details:", err));
    } else {
        writeFile(
            "punishments.json",
            JSON.stringify(punishments, null, 4),
            "utf8",
            err => {
                if (err) console.error(err);
            }
        );
    }
}

export const customTeams: Map<string, CustomTeam> = new Map<string, CustomTeam>();

export let maxTeamSize = typeof Config.maxTeamSize === "number" ? Config.maxTeamSize : Config.maxTeamSize.rotation[0];
let teamSizeRotationIndex = 0;

let maxTeamSizeSwitchCron: Cron | undefined;

if (isMainThread) {
    // Initialize the server
    createServer().get("/api/serverInfo", res => {
        cors(res);
        res
            .writeHeader("Content-Type", "application/json")
            .end(JSON.stringify({
                playerCount: games.reduce((a, b) => (a + (b?.data.aliveCount ?? 0)), 0),
                maxTeamSize,

                nextSwitchTime: maxTeamSizeSwitchCron?.nextRun()?.getTime(),
                protocolVersion: GameConstants.protocolVersion
            }));
    }).get("/api/getGame", async(res, req) => {
        let aborted = false;
        res.onAborted(() => { aborted = true; });
        cors(res);

        const ip = getIP(res, req);

        let response: GetGameResponse;

        const punishment = punishments.find(p => p.ip === ip);
        if (punishment) {
            if (punishment.punishmentType === "warn") {
                const protection = Config.protection;
                if (protection?.punishments?.url) {
                    fetch(
                        `${protection.punishments.url}/punishments/${ip}`,
                        { headers: { "api-key": protection.punishments.password } }
                    ).catch(e => console.error("Error acknowledging warning. Details: ", e));
                }
                removePunishment(ip);
            }
            response = { success: false, message: punishment.punishmentType, reason: punishment.reason, reportID: punishment.reportId };
        } else if (ipBlocklist?.includes(ip)) {
            response = { success: false, message: "perma" };
        } else {
            const teamID = new URLSearchParams(req.getQuery()).get("teamID");
            if (teamID) {
                const team = customTeams.get(teamID);
                if (team?.gameID !== undefined) {
                    response = games[team.gameID]
                        ? { success: true, gameID: team.gameID }
                        : { success: false };
                } else {
                    response = { success: false };
                }
            } else {
                response = findGame();
            }

            if (response.success) {
                await games[response.gameID]?.allowIP(ip);
            }
        }

        if (!aborted) {
            res.cork(() => {
                res.writeHeader("Content-Type", "application/json").end(JSON.stringify(response));
            });
        }
    }).get("/api/punishments", (res, req) => {
        cors(res);

        if (req.getHeader("password") === Config.protection?.punishments?.password) {
            res.writeHeader("Content-Type", "application/json").end(JSON.stringify(punishments));
        } else {
            forbidden(res);
        }
    }).get("/api/removePunishment", (res, req) => {
        cors(res);

        if (req.getHeader("password") === Config.protection?.punishments?.password) {
            const ip = new URLSearchParams(req.getQuery()).get("ip");
            if (ip) removePunishment(ip);
            res.writeStatus("204 No Content").endWithoutBody(0);
        } else {
            forbidden(res);
        }
    }).ws("/team", {
        idleTimeout: 30,

        /**
         * Upgrade the connection to WebSocket.
         */
        upgrade(res, req, context) {
            res.onAborted((): void => { /* (why is this handler here?) */ });

            const searchParams = new URLSearchParams(req.getQuery());

            const teamID = searchParams.get("teamID");

            let team!: CustomTeam;
            const noTeamIdGiven = teamID !== null;
            if (
                maxTeamSize === TeamSize.Solo
                || (
                    noTeamIdGiven
                    // @ts-expect-error cleanest overall way to do this (`undefined` gets filtered out anyways)
                    && (team = customTeams.get(teamID)) === undefined
                )
            ) {
                forbidden(res);
                return;
            }

            let isLeader: boolean;
            if (noTeamIdGiven) {
                isLeader = false;
                if (team.locked || team.players.length >= (maxTeamSize as number)) {
                    forbidden(res); // TODO "Team is locked" and "Team is full" messages
                    return;
                }
            } else {
                isLeader = true;
                team = new CustomTeam();
                customTeams.set(team.id, team);
            }

            const name = cleanUsername(searchParams.get("name"));
            let skin = searchParams.get("skin") ?? GameConstants.player.defaultSkin;
            let badge = searchParams.get("badge") ?? undefined;

            //
            // Role
            //
            const password = searchParams.get("password");
            const givenRole = searchParams.get("role");
            let role = "";
            let nameColor: number | undefined;

            if (
                password !== null
                && givenRole !== null
                && givenRole in Config.roles
                && Config.roles[givenRole].password === password
            ) {
                role = givenRole;

                if (Config.roles[givenRole].isDev) {
                    try {
                        const colorString = searchParams.get("nameColor");
                        if (colorString) nameColor = Numeric.clamp(parseInt(colorString), 0, 0xffffff);
                    } catch { /* lol your color sucks */ }
                }
            }

            // Validate skin
            const roleRequired = Skins.fromStringSafe(skin)?.roleRequired;
            if (roleRequired && roleRequired !== role) {
                skin = GameConstants.player.defaultSkin;
            }

            // Validate badge
            const roles = badge ? Badges.fromStringSafe(badge)?.roles : undefined;
            if (roles?.length && !roles.includes(role)) {
                badge = undefined;
            }

            res.upgrade(
                {
                    player: new CustomTeamPlayer(
                        team,
                        isLeader,
                        name,
                        skin,
                        badge,
                        nameColor
                    )
                },
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
        open(socket: WebSocket<CustomTeamPlayerContainer>) {
            const player = socket.getUserData().player;
            player.socket = socket;
            player.team.addPlayer(player);
        },

        /**
         * Handle messages coming from the socket.
         * @param socket The socket in question.
         * @param message The message to handle.
         */
        message(socket: WebSocket<CustomTeamPlayerContainer>, message: ArrayBuffer) {
            const player = socket.getUserData().player;
            // we pray
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            void player.team.onMessage(player, JSON.parse(textDecoder.decode(message)));
        },

        /**
         * Handle closing of the socket.
         * @param socket The socket being closed.
         */
        close(socket: WebSocket<CustomTeamPlayerContainer>) {
            const player = socket.getUserData().player;
            player.team.removePlayer(player);
        }
    }).listen(Config.host, Config.port, (): void => {
        console.log(
            `
 _____ _   _______ _____ _____
/  ___| | | | ___ \\  _  |_   _|
\\ \`--.| | | | |_/ / | | | | |
 \`--. \\ | | |    /| | | | | |
/\\__/ / |_| | |\\ \\\\ \\_/ /_| |_
\\____/ \\___/\\_| \\_|\\___/ \\___/
            `);

        Logger.log(`Suroi Server v${version}`);
        Logger.log(`Listening on ${Config.host}:${Config.port}`);
        Logger.log("Press Ctrl+C to exit.");

        newGame(0);

        setInterval(() => {
            const memoryUsage = process.memoryUsage().rss;

            let perfString = `Server | Memory usage: ${Math.round(memoryUsage / 1024 / 1024 * 100) / 100} MB`;

            // windows L
            if (os.platform() !== "win32") {
                const load = os.loadavg().join("%, ");
                perfString += ` | Load (1m, 5m, 15m): ${load}%`;
            }

            Logger.log(perfString);
        }, 60000);

        const teamSize = Config.maxTeamSize;
        if (typeof teamSize === "object") {
            maxTeamSizeSwitchCron = Cron(teamSize.switchSchedule, () => {
                maxTeamSize = teamSize.rotation[teamSizeRotationIndex = (teamSizeRotationIndex + 1) % teamSize.rotation.length];

                const humanReadableTeamSizes = [undefined, "solos", "duos", "trios", "squads"];
                Logger.log(`Switching to ${humanReadableTeamSizes[maxTeamSize] ?? `team size ${maxTeamSize}`}`);
            });
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
                } else {
                    if (!existsSync("punishments.json")) writeFileSync("punishments.json", "{}");
                    readFile("punishments.json", "utf8", (error, data) => {
                        if (error) {
                            console.error("Error: Unable to load punishment list. Details:", error);
                            return;
                        }

                        try {
                            // we also hope that this is safe
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            punishments = data.trim().length ? JSON.parse(data) : [];
                        } catch (e) {
                            console.error("Error: Unable to parse punishment list. Details:", e);
                        }
                    });
                }

                const now = Date.now();

                for (let i = 0; i < punishments.length; i++) {
                    const punishment = punishments[i];
                    if (punishment.expires && new Date(punishment.expires).getTime() < now) {
                        punishments.splice(i, 1);
                        i--;
                    }
                }

                Logger.log("Reloaded punishment list");
            }, protection.refreshDuration);

            const ipBlocklistURL = protection.ipBlocklistURL;

            if (ipBlocklistURL !== undefined) {
                void (async() => {
                    try {
                        const response = await fetch(ipBlocklistURL);
                        ipBlocklist = (await response.text()).split("\n").map(line => line.split("/")[0]);
                    } catch (e) {
                        console.error("Error: Unable to load IP blocklist. Details:", e);
                    }
                })();
            }
        }
    });
}
