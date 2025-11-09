import { TeamMode } from "@common/constants";
import { ModeName } from "@common/definitions/modes";
import { pickRandomInArray } from "@common/utils/random";
import Cluster, { type Worker } from "node:cluster";
import { Game } from "./game";
import { PlayerSocketData } from "./objects/player";
import { resetTeams } from "./server";
import { Config } from "./utils/config";
import { modeFromMap } from "./utils/misc";
import { getIP, getPunishment, parseRole, RateLimiter, serverLog, serverWarn, StaticOrSwitched, Switcher } from "./utils/serverHelpers";

export enum WorkerMessages {
    UpdateTeamMode,
    UpdateMap,
    UpdateMapOptions,
    NewGame
}

export type WorkerMessage =
    | {
        readonly type: WorkerMessages.UpdateTeamMode
        readonly teamMode: TeamMode
    }
    | {
        readonly type: WorkerMessages.UpdateMap
        readonly map: string
    }
    | {
        readonly type: WorkerMessages.UpdateMapOptions
        readonly mapScaleRange: number
    }
    | {
        readonly type: WorkerMessages.NewGame
    };

export interface GameData {
    aliveCount: number
    allowJoin: boolean
    over: boolean
    startedTime: number
}

export class GameContainer {
    readonly worker: Worker;

    readonly promiseCallbacks: Array<(game: GameContainer) => void> = [];

    private _data: GameData = {
        aliveCount: 0,
        allowJoin: false,
        over: false,
        startedTime: -1
    };

    get aliveCount(): number { return this._data.aliveCount; }
    get allowJoin(): boolean { return this._data.allowJoin; }
    get over(): boolean { return this._data.over; }
    get startedTime(): number { return this._data.startedTime; }

    constructor(
        readonly id: number,
        gameManager: GameManager,
        resolve: (game: GameContainer) => void
    ) {
        this.promiseCallbacks.push(resolve);
        this.worker = Cluster.fork({
            id,
            teamMode: gameManager.teamMode.current,
            map: gameManager.map.current,
            mapScaleRange: gameManager.mapScaleRange
        }).on("message", (data: Partial<GameData>): void => {
            this._data = { ...this._data, ...data };

            if (data.allowJoin === true) { // This means the game was just created
                gameManager.creating = undefined;
                for (const resolve of this.promiseCallbacks) resolve(this);
                this.promiseCallbacks.length = 0;
            }
        });
    }

    sendMessage(message: WorkerMessage): void {
        this.worker.send(message);
    }
}

export class GameManager {
    readonly games: Array<GameContainer | undefined> = [];
    creating: GameContainer | undefined;

    get playerCount(): number {
        return this.games.filter(g => !g?.over).reduce((a, b) => (a + (b?.aliveCount ?? 0)), 0);
    }

    teamMode: Switcher<TeamMode>;
    map: Switcher<string>;
    mode: ModeName;
    nextMode?: ModeName;
    mapScaleRange = -1;

    constructor() {
        const stringToTeamMode = (teamMode: string): TeamMode => {
            switch (teamMode) {
                case "solo": default: return TeamMode.Solo;
                case "duo": return TeamMode.Duo;
                case "squad": return TeamMode.Squad;
            }
        };

        let teamModeSchedule: StaticOrSwitched<TeamMode>;
        if (typeof Config.teamMode === "string") {
            teamModeSchedule = stringToTeamMode(Config.teamMode);
        } else {
            const { rotation, cron } = Config.teamMode;
            teamModeSchedule = { rotation: rotation.map(t => stringToTeamMode(t)), cron };
        }

        const humanReadableTeamModes = {
            [TeamMode.Solo]: "solos",
            [TeamMode.Duo]: "duos",
            [TeamMode.Squad]: "squads"
        };

        this.teamMode = new Switcher("teamMode", teamModeSchedule, teamMode => {
            for (const game of this.games) {
                game?.sendMessage({ type: WorkerMessages.UpdateTeamMode, teamMode });
            }

            resetTeams();

            serverLog(`Switching to ${humanReadableTeamModes[teamMode] ?? `team mode ${teamMode}`}`);
        });

        this.map = new Switcher("map", Config.map, (map, nextMap) => {
            this.mode = modeFromMap(map);
            this.nextMode = modeFromMap(nextMap);

            for (const game of this.games) {
                game?.sendMessage({ type: WorkerMessages.UpdateMap, map });
            }

            resetTeams();

            serverLog(`Switching to "${map}" map`);
        });

        this.mode = modeFromMap(this.map.current);
        this.nextMode = this.map.next ? modeFromMap(this.map.next) : undefined;
    }

    async findGame(): Promise<number | undefined> {
        if (this.creating) return this.creating.id;

        const eligibleGames = this.games.filter((g?: GameContainer): g is GameContainer =>
            // biome-ignore lint/complexity/useOptionalChain: can't use an optional chain because the return type must be a boolean
            g !== undefined
            && g.allowJoin
            && g.aliveCount < (Config.maxPlayersPerGame ?? Infinity)
        );

        return (
            eligibleGames.length
                ? pickRandomInArray(eligibleGames)
                : await this.newGame(undefined)
        )?.id;
    }

    newGame(id: number | undefined): Promise<GameContainer | undefined> {
        return new Promise<GameContainer | undefined>(resolve => {
            if (this.creating) {
                this.creating.promiseCallbacks.push(resolve);
            } else if (id !== undefined) {
                serverLog(`Creating new game with ID ${id}`);
                const game = this.games[id];
                if (!game) {
                    this.creating = this.games[id] = new GameContainer(id, this, resolve);
                } else if (game.over) {
                    game.promiseCallbacks.push(resolve);
                    game.sendMessage({ type: WorkerMessages.NewGame });
                    this.creating = game;
                } else {
                    serverWarn(`Game with ID ${id} already exists`);
                    resolve(game);
                }
            } else {
                const maxGames = Config.maxGames;
                for (let i = 0; i < maxGames; i++) {
                    const game = this.games[i];
                    serverLog(
                        "Game", i,
                        "exists:", !!game,
                        "over:", game?.over ?? "-",
                        "runtime:", game ? `${Math.round((Date.now() - (game.startedTime ?? 0)) / 1000)}s` : "-",
                        "aliveCount:", game?.aliveCount ?? "-"
                    );
                    if (!game || game.over) {
                        void this.newGame(i).then(resolve);
                        return;
                    }
                }
                serverWarn("Unable to create new game, no slots left");
                resolve(undefined);
            }
        });
    }

    updateMapScaleRange(): void {
        const mapScaleRanges = Config.mapScaleRanges;
        if (!mapScaleRanges) return;

        const playerCount = this.playerCount;
        this.mapScaleRange = -1;
        for (let i = 0, len = mapScaleRanges.length; i < len; i++) {
            const { minPlayers, maxPlayers } = mapScaleRanges[i];
            if (playerCount < minPlayers || playerCount > maxPlayers) continue;
            this.mapScaleRange = i;
        }

        for (const game of this.games) {
            game?.sendMessage({ type: WorkerMessages.UpdateMapOptions, mapScaleRange: this.mapScaleRange });
        }
    }
}

if (!Cluster.isPrimary) {
    const data = process.env as {
        readonly id: string
        readonly teamMode: string
        readonly map: string
        readonly mapScaleRange: string
    };
    const id = parseInt(data.id);
    let teamMode = parseInt(data.teamMode);
    let map = data.map;
    let mapOptions = data.mapScaleRange ? Config.mapScaleRanges?.[parseInt(data.mapScaleRange)] : undefined;

    let game = new Game(id, teamMode, map, mapOptions);

    process.on("uncaughtException", e => {
        game.error("An unhandled error occurred. Details:", e);
        game.kill();
        // TODO Gracefully shut down the game
    });

    process.on("message", (message: WorkerMessage) => {
        switch (message.type) {
            case WorkerMessages.UpdateTeamMode: {
                teamMode = message.teamMode;
                break;
            }
            case WorkerMessages.UpdateMap: {
                map = message.map;
                game.kill();
                break;
            }
            case WorkerMessages.UpdateMapOptions: {
                mapOptions = Config.mapScaleRanges?.[message.mapScaleRange];
                break;
            }
            case WorkerMessages.NewGame: {
                game.kill();
                game = new Game(id, teamMode, map, mapOptions);
                game.setGameData({ allowJoin: true });
                break;
            }
        }
    });

    setInterval(() => {
        const memoryUsage = process.memoryUsage().rss;
        game.log(`RAM usage: ${Math.round(memoryUsage / 1024 / 1024 * 100) / 100} MB`);
    }, 60000);

    const { maxSimultaneousConnections, maxJoinAttempts } = Config;
    const simultaneousConnections = maxSimultaneousConnections
        ? new RateLimiter(maxSimultaneousConnections)
        : undefined;
    const joinAttempts = maxJoinAttempts
        ? new RateLimiter(maxJoinAttempts.count, maxJoinAttempts.duration)
        : undefined;

    Bun.serve({
        hostname: Config.hostname,
        port: Config.port + id + 1,
        routes: {
            "/play": async(req, res) => {
                if (!game.allowJoin) {
                    return new Response("403 Forbidden");
                }

                const ip = getIP(req, res);
                const searchParams = new URLSearchParams(req.url.slice(req.url.indexOf("?")));

                if (simultaneousConnections?.isLimited(ip)) {
                    game.warn(ip, "exceeded maximum simultaneous connections");
                    return new Response("403 Forbidden");
                }
                if (joinAttempts?.isLimited(ip)) {
                    game.warn(ip, "exceeded maximum join attempts");
                    return new Response("403 Forbidden");
                }
                joinAttempts?.increment(ip);

                const punishment = await getPunishment(ip);
                if (punishment) {
                    return new Response("403 Forbidden");
                }

                const { role, isDev, nameColor } = parseRole(searchParams);
                res.upgrade(req, {
                    data: {
                        ip,
                        teamID: searchParams.get("teamID") ?? undefined,
                        autoFill: Boolean(searchParams.get("autoFill")),
                        role,
                        isDev,
                        nameColor,
                        lobbyClearing: searchParams.get("lobbyClearing") === "true",
                        weaponPreset: searchParams.get("weaponPreset") ?? ""
                    } satisfies PlayerSocketData
                });
            }
        },
        websocket: {
            open(socket: Bun.ServerWebSocket<PlayerSocketData>) {
                const data = socket.data;
                data.player = game.addPlayer(socket);
                if (data.player === undefined) return;

                simultaneousConnections?.increment(data.ip);
                // data.player.sendGameOverPacket(false); // uncomment to test game over screen
            },

            message(socket: Bun.ServerWebSocket<PlayerSocketData>, message: Buffer) {
                try {
                    game.onMessage(socket.data.player, message.buffer as ArrayBuffer);
                } catch (e) {
                    console.warn("Error parsing message:", e);
                }
            },

            close(socket: Bun.ServerWebSocket<PlayerSocketData>) {
                const { player, ip } = socket.data;

                if (player) game.removePlayer(player);
                if (ip) simultaneousConnections?.decrement(ip);
            }
        }
    });

    game.setGameData({ allowJoin: true });
    game.log(`Listening on ${Config.hostname}:${Config.port + id + 1}`);
}
