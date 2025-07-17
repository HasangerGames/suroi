import { TeamMode } from "@common/constants";
import { pickRandomInArray } from "@common/utils/random";
import Cluster, { type Worker } from "node:cluster";
import { App, WebSocket } from "uWebSockets.js";
import { Config } from "./utils/config";
import { Game } from "./game";
import { PlayerSocketData } from "./objects/player";
import { getPunishment, forbidden, getIP, parseRole, RateLimiter, serverLog, serverWarn } from "./utils/serverHelpers";

export enum WorkerMessages {
    UpdateTeamMode,
    UpdateMap,
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
        teamMode: TeamMode,
        map: string,
        resolve: (game: GameContainer) => void
    ) {
        this.promiseCallbacks.push(resolve);
        this.worker = Cluster.fork({ id, teamMode, map }).on("message", (data: Partial<GameData>): void => {
            this._data = { ...this._data, ...data };

            if (data.allowJoin === true) { // This means the game was just created
                creating = undefined;
                for (const resolve of this.promiseCallbacks) resolve(this);
                this.promiseCallbacks.length = 0;
            }
        });
    }

    sendMessage(message: WorkerMessage): void {
        this.worker.send(message);
    }
}

export const games: Array<GameContainer | undefined> = [];
let creating: GameContainer | undefined;

export async function findGame(teamMode: TeamMode, map: string): Promise<number | undefined> {
    if (creating) return creating.id;

    const eligibleGames = games.filter((g?: GameContainer): g is GameContainer =>
        g !== undefined
        && g.allowJoin
        && g.aliveCount < (Config.maxPlayersPerGame ?? Infinity)
    );

    return (
        eligibleGames.length
            ? pickRandomInArray(eligibleGames)
            : await newGame(undefined, teamMode, map)
    )?.id;
}

export async function newGame(id: number | undefined, teamMode: TeamMode, map: string): Promise<GameContainer | undefined> {
    return new Promise<GameContainer | undefined>(resolve => {
        if (creating) {
            creating.promiseCallbacks.push(resolve);
        } else if (id !== undefined) {
            serverLog(`Creating new game with ID ${id}`);
            const game = games[id];
            if (!game) {
                creating = games[id] = new GameContainer(id, teamMode, map, resolve);
            } else if (game.over) {
                game.promiseCallbacks.push(resolve);
                game.sendMessage({ type: WorkerMessages.NewGame });
                creating = game;
            } else {
                serverWarn(`Game with ID ${id} already exists`);
                resolve(game);
            }
        } else {
            const maxGames = Config.maxGames;
            for (let i = 0; i < maxGames; i++) {
                const game = games[i];
                serverLog(
                    "Game", i,
                    "exists:", !!game,
                    "over:", game?.over ?? "-",
                    "runtime:", game ? `${Math.round((Date.now() - (game.startedTime ?? 0)) / 1000)}s` : "-",
                    "aliveCount:", game?.aliveCount ?? "-"
                );
                if (!game || game.over) {
                    void newGame(i, teamMode, map).then(resolve);
                    return;
                }
            }
            serverWarn("Unable to create new game, no slots left");
            resolve(undefined);
        }
    });
}

if (!Cluster.isPrimary) {
    const data = process.env as {
        readonly id: string
        readonly teamMode: string
        readonly map: string
    };
    const id = parseInt(data.id);
    let teamMode = parseInt(data.teamMode);
    let map = data.map;

    let game = new Game(id, teamMode, map);

    process.on("uncaughtException", e => {
        game.error("An unhandled error occurred. Details:", e);
        game.kill();
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
            case WorkerMessages.NewGame: {
                game.kill();
                game = new Game(id, teamMode, map);
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

    App().ws("/play", {
        async upgrade(res, req, context) {
            let aborted = false;
            res.onAborted(() => aborted = true);

            if (!game.allowJoin) {
                forbidden(res);
                return;
            }

            // These lines must be before the await to prevent uWS errors
            // Accessing req isn't allowed after an await
            const ip = getIP(res, req);
            const searchParams = new URLSearchParams(req.getQuery());
            const webSocketKey = req.getHeader("sec-websocket-key");
            const webSocketProtocol = req.getHeader("sec-websocket-protocol");
            const webSocketExtensions = req.getHeader("sec-websocket-extensions");

            if (simultaneousConnections?.isLimited(ip)) {
                game.warn(ip, "exceeded maximum simultaneous connections");
                forbidden(res);
                return;
            }
            if (joinAttempts?.isLimited(ip)) {
                game.warn(ip, "exceeded maximum join attempts");
                forbidden(res);
                return;
            }
            joinAttempts?.increment(ip);

            const punishment = await getPunishment(ip);

            if (aborted) return;

            if (punishment) {
                forbidden(res);
                return;
            }

            const { role, isDev, nameColor } = parseRole(searchParams);
            res.cork(() => res.upgrade(
                {
                    ip,
                    teamID: searchParams.get("teamID") ?? undefined,
                    autoFill: Boolean(searchParams.get("autoFill")),
                    role,
                    isDev,
                    nameColor,
                    lobbyClearing: searchParams.get("lobbyClearing") === "true",
                    weaponPreset: searchParams.get("weaponPreset") ?? ""
                } satisfies PlayerSocketData,
                webSocketKey,
                webSocketProtocol,
                webSocketExtensions,
                context
            ));
        },

        open(socket: WebSocket<PlayerSocketData>) {
            const data = socket.getUserData();
            data.player = game.addPlayer(socket);
            if (data.player === undefined) return;

            simultaneousConnections?.increment(data.ip);
            // data.player.sendGameOverPacket(false); // uncomment to test game over screen
        },

        message(socket: WebSocket<PlayerSocketData>, message: ArrayBuffer) {
            try {
                game.onMessage(socket.getUserData().player, message);
            } catch (e) {
                console.warn("Error parsing message:", e);
            }
        },

        close(socket: WebSocket<PlayerSocketData>) {
            const { player, ip } = socket.getUserData();

            if (player) game.removePlayer(player);
            if (ip) simultaneousConnections?.decrement(ip);
        }
    }).listen(Config.hostname, Config.port + id + 1, () => {
        game.setGameData({ allowJoin: true });
        game.log(`Listening on ${Config.hostname}:${Config.port + id + 1}`);
    });
}
