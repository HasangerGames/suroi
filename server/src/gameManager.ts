import { TeamSize } from "@common/constants";
import { pickRandomInArray } from "@common/utils/random";
import Cluster, { type Worker } from "node:cluster";
import { App, WebSocket } from "uWebSockets.js";
import { Config, MapWithParams } from "./config";
import { Game } from "./game";
import { PlayerSocketData } from "./objects/player";
import { hasPunishment, forbidden, getIP, parseRole, RateLimiter, serverLog, serverWarn } from "./utils/serverHelpers";

export enum WorkerMessages {
    UpdateTeamSize,
    UpdateMap,
    NewGame
}

export type WorkerMessage =
    | {
        readonly type: WorkerMessages.UpdateTeamSize
        readonly teamSize: TeamSize
    }
    | {
        readonly type: WorkerMessages.UpdateMap
        readonly map: MapWithParams
    }
    | {
        readonly type: WorkerMessages.NewGame
    };

export interface GameData {
    aliveCount: number
    allowJoin: boolean
    over: boolean
    stopped: boolean
    startedTime: number
}

export class GameContainer {
    readonly worker: Worker;

    readonly promiseCallbacks: Array<(game: GameContainer) => void> = [];

    private _data: GameData = {
        aliveCount: 0,
        allowJoin: false,
        over: false,
        stopped: false,
        startedTime: -1
    };

    get aliveCount(): number { return this._data.aliveCount; }
    get allowJoin(): boolean { return this._data.allowJoin; }
    get over(): boolean { return this._data.over; }
    get stopped(): boolean { return this._data.stopped; }
    get startedTime(): number { return this._data.startedTime; }

    constructor(
        readonly id: number,
        teamSize: TeamSize,
        map: MapWithParams,
        resolve: (game: GameContainer) => void
    ) {
        this.promiseCallbacks.push(resolve);
        this.worker = Cluster.fork({ id, teamSize, map }).on("message", (data: Partial<GameData>): void => {
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

export async function findGame(teamSize: TeamSize, map: MapWithParams): Promise<number | undefined> {
    if (creating) return creating.id;

    const eligibleGames = games.filter((g?: GameContainer): g is GameContainer =>
        g !== undefined
        && g.allowJoin
        && g.aliveCount < Config.maxPlayersPerGame
    );

    return (
        eligibleGames.length
            ? pickRandomInArray(eligibleGames)
            : await newGame(undefined, teamSize, map)
    )?.id;
}

export async function newGame(id: number | undefined, teamSize: TeamSize, map: MapWithParams): Promise<GameContainer | undefined> {
    return new Promise<GameContainer | undefined>(resolve => {
        if (creating) {
            creating.promiseCallbacks.push(resolve);
        } else if (id !== undefined) {
            serverLog(`Creating new game with ID ${id}`);
            const game = games[id];
            if (!game) {
                creating = games[id] = new GameContainer(id, teamSize, map, resolve);
            } else if (game.stopped) {
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
                serverLog("Game", i, "exists:", !!game, "stopped:", game?.stopped);
                if (!game || game.stopped) {
                    void newGame(i, teamSize, map).then(resolve);
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
        readonly teamSize: string
        readonly map: MapWithParams
    };
    const id = parseInt(data.id);
    let teamSize = parseInt(data.teamSize);
    let map = data.map;

    let game = new Game(id, teamSize, map);

    process.on("uncaughtException", e => game.error("An unhandled error occurred. Details:", e));

    process.on("message", (message: WorkerMessage) => {
        switch (message.type) {
            case WorkerMessages.UpdateTeamSize: {
                teamSize = message.teamSize;
                break;
            }
            case WorkerMessages.UpdateMap: {
                map = message.map;
                game.kill();
                break;
            }
            case WorkerMessages.NewGame: {
                game = new Game(id, teamSize, map);
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
            res.onAborted(() => { /* no-op */ });

            if (!game.allowJoin) {
                forbidden(res);
                return;
            }

            const ip = getIP(res, req);

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

            if (await hasPunishment(ip, res)) return;

            const searchParams = new URLSearchParams(req.getQuery());
            const { role, isDev, nameColor } = parseRole(searchParams);
            res.upgrade(
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
                req.getHeader("sec-websocket-key"),
                req.getHeader("sec-websocket-protocol"),
                req.getHeader("sec-websocket-extensions"),
                context
            );
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
    }).listen(Config.host, Config.port + id + 1, () => {
        game.log(`Listening on ${Config.host}:${Config.port + id + 1}`);
    });
}
