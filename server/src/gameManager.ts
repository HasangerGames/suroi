import { TeamSize } from "@common/constants";
import { type GetGameResponse } from "@common/typings";
import { Numeric } from "@common/utils/math";
import { SuroiByteStream } from "@common/utils/suroiByteStream";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import { WebSocket } from "uWebSockets.js";
import { Config } from "./config";
import { Game } from "./game";
import { PlayerContainer } from "./objects/player";
import { maxTeamSize } from "./server";
import { Logger } from "./utils/misc";
import { createServer, forbidden, getIP } from "./utils/serverHelpers";

export interface WorkerInitData {
    readonly id: number
    readonly maxTeamSize: number
}

export enum WorkerMessages {
    AllowIP,
    IPAllowed,
    UpdateGameData,
    UpdateMaxTeamSize,
    CreateNewGame,
    Reset
}

export type WorkerMessage =
    | {
        readonly type: WorkerMessages.AllowIP | WorkerMessages.IPAllowed
        readonly ip: string
    }
    | {
        readonly type: WorkerMessages.UpdateGameData
        readonly data: Partial<GameData>
    }
    | {
        readonly type: WorkerMessages.UpdateMaxTeamSize
        readonly maxTeamSize: TeamSize
    }
    | {
        readonly type:
            | WorkerMessages.CreateNewGame
            | WorkerMessages.Reset
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

    resolve: (id: number) => void;

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

    private readonly _ipPromiseMap = new Map<string, Array<() => void>>();

    constructor(readonly id: number, resolve: (id: number) => void) {
        this.resolve = resolve;
        (
            this.worker = new Worker(
                __filename,
                {
                    workerData: { id, maxTeamSize } satisfies WorkerInitData,
                    execArgv: __filename.endsWith(".ts")
                        ? ["-r", "ts-node/register", "-r", "tsconfig-paths/register"]
                        : undefined
                }
            )
        ).on("message", (message: WorkerMessage): void => {
            switch (message.type) {
                case WorkerMessages.UpdateGameData: {
                    this._data = { ...this._data, ...message.data };

                    if (message.data.allowJoin === true) { // This means the game was just created
                        creatingID = -1;
                        this.resolve(this.id);
                    }
                    break;
                }
                case WorkerMessages.CreateNewGame: {
                    void newGame();
                    break;
                }
                case WorkerMessages.IPAllowed: {
                    const promises = this._ipPromiseMap.get(message.ip);
                    if (!promises) break;
                    for (const resolve of promises) resolve();
                    this._ipPromiseMap.delete(message.ip);
                    break;
                }
            }
        });
    }

    sendMessage(message: WorkerMessage): void {
        this.worker.postMessage(message);
    }

    async allowIP(ip: string): Promise<void> {
        return await new Promise(resolve => {
            const promises = this._ipPromiseMap.get(ip);
            if (promises) {
                promises.push(resolve);
            } else {
                this.sendMessage({ type: WorkerMessages.AllowIP, ip });

                this._ipPromiseMap.set(ip, [resolve]);
            }
        });
    }
}

export async function findGame(): Promise<GetGameResponse> {
    let gameID: number;
    let eligibleGames = games.filter((g?: GameContainer): g is GameContainer => !!g && g.allowJoin && !g.over);

    // Attempt to create a new game if one isn't available
    if (!eligibleGames.length) {
        gameID = await newGame();
        if (gameID !== -1) {
            return { success: true, gameID };
        } else {
            eligibleGames = games.filter((g?: GameContainer): g is GameContainer => !!g && !g.over);
        }
    }

    if (!eligibleGames.length) {
        return { success: false };
    }

    gameID = eligibleGames
        .reduce((a, b) =>
            (
                a.allowJoin && b.allowJoin
                    ? a.aliveCount < b.aliveCount
                    : a.startedTime > b.startedTime
            )
                ? a
                : b
        )
        ?.id;
    return gameID !== undefined
        ? { success: true, gameID }
        : { success: false };
}

let creatingID = -1;

export async function newGame(id?: number): Promise<number> {
    return new Promise<number>(resolve => {
        if (creatingID !== -1) {
            resolve(creatingID);
        } else if (id !== undefined) {
            creatingID = id;
            Logger.log(`Game ${id} | Creating...`);
            const game = games[id];
            if (!game) {
                games[id] = new GameContainer(id, resolve);
            } else if (game.stopped) {
                game.resolve = resolve;
                game.sendMessage({ type: WorkerMessages.Reset });
            } else {
                Logger.warn(`Game ${id} | Already exists`);
                resolve(id);
            }
        } else {
            const maxGames = Config.maxGames;
            for (let i = 0; i < maxGames; i++) {
                const game = games[i];
                if (!game || game.stopped) {
                    void newGame(i).then(id => resolve(id));
                    return;
                }
            }
            resolve(-1);
        }
    });
}

export const games: Array<GameContainer | undefined> = [];

if (!isMainThread) {
    const id = (workerData as WorkerInitData).id;
    let maxTeamSize = (workerData as WorkerInitData).maxTeamSize;

    let game = new Game(id, maxTeamSize);

    // string = ip, number = expire time
    const allowedIPs = new Map<string, number>();

    const simultaneousConnections: Record<string, number> = {};
    let joinAttempts: Record<string, number> = {};

    parentPort?.on("message", (message: WorkerMessage) => {
        switch (message.type) {
            case WorkerMessages.AllowIP: {
                allowedIPs.set(message.ip, game.now + 10000);
                parentPort?.postMessage({
                    type: WorkerMessages.IPAllowed,
                    ip: message.ip
                });
                break;
            }
            case WorkerMessages.Reset: {
                game = new Game(id, maxTeamSize);
                break;
            }
            case WorkerMessages.UpdateMaxTeamSize: {
                maxTeamSize = message.maxTeamSize;
                break;
            }
        }
    });

    createServer().ws("/play", {
        idleTimeout: 30,

        /**
         * Upgrade the connection to WebSocket.
         */
        upgrade(res, req, context) {
            res.onAborted((): void => { /* Handle errors in WS connection */ });

            const ip = getIP(res, req);

            //
            // Rate limits
            //
            if (Config.protection) {
                const { maxSimultaneousConnections, maxJoinAttempts } = Config.protection;

                if (
                    (simultaneousConnections[ip] >= (maxSimultaneousConnections ?? Infinity))
                    || (joinAttempts[ip] >= (maxJoinAttempts?.count ?? Infinity))
                ) {
                    Logger.log(`Game ${id} | Rate limited: ${ip}`);
                    forbidden(res);
                    return;
                } else {
                    if (maxSimultaneousConnections) {
                        simultaneousConnections[ip] = (simultaneousConnections[ip] ?? 0) + 1;
                        Logger.log(`Game ${id} | ${simultaneousConnections[ip]}/${maxSimultaneousConnections} simultaneous connections: ${ip}`);
                    }
                    if (maxJoinAttempts) {
                        joinAttempts[ip] = (joinAttempts[ip] ?? 0) + 1;
                        Logger.log(`Game ${id} | ${joinAttempts[ip]}/${maxJoinAttempts.count} join attempts in the last ${maxJoinAttempts.duration} ms: ${ip}`);
                    }
                }
            }

            const searchParams = new URLSearchParams(req.getQuery());

            //
            // Ensure IP is allowed
            //
            if ((allowedIPs.get(ip) ?? 0) < game.now) {
                forbidden(res);
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
            res.upgrade(
                {
                    teamID: searchParams.get("teamID") ?? undefined,
                    autoFill: Boolean(searchParams.get("autoFill")),
                    player: undefined,
                    ip,
                    role,
                    isDev,
                    nameColor,
                    lobbyClearing: searchParams.get("lobbyClearing") === "true",
                    weaponPreset: searchParams.get("weaponPreset") ?? ""
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
        open(socket: WebSocket<PlayerContainer>) {
            const data = socket.getUserData();
            if ((data.player = game.addPlayer(socket)) === undefined) {
                socket.close();
            }

            // data.player.sendGameOverPacket(false); // uncomment to test game over screen
        },

        /**
         * Handle messages coming from the socket.
         * @param socket The socket in question.
         * @param message The message to handle.
         */
        message(socket: WebSocket<PlayerContainer>, message) {
            const stream = new SuroiByteStream(message);
            try {
                const player = socket.getUserData().player;
                if (player === undefined) return;
                game.onMessage(stream, player);
            } catch (e) {
                console.warn("Error parsing message:", e);
            }
        },

        /**
         * Handle closing of the socket.
         * @param socket The socket being closed.
         */
        close(socket: WebSocket<PlayerContainer>) {
            const { player, ip } = socket.getUserData();

            // this should never be null-ish, but will leave it here for any potential race conditions (i.e. TFO? (verification required))
            if (Config.protection && ip !== undefined) simultaneousConnections[ip]--;

            if (!player) return;

            Logger.log(`Game ${id} | "${player.name}" left`);
            game.removePlayer(player);
        }
    }).listen(Config.host, Config.port + id + 1, (): void => {
        Logger.log(`Game ${id} | Listening on ${Config.host}:${Config.port + id + 1}`);
    });

    if (Config.protection?.maxJoinAttempts) {
        setInterval((): void => {
            joinAttempts = {};
        }, Config.protection.maxJoinAttempts.duration);
    }
}
