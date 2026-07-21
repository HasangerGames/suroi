import Cluster, { type Worker } from "node:cluster";
import { random } from "$common/utils/random";
import { MapName } from "./data/maps";
import { Game } from "./game";
import { PlayerSocketData } from "./objects/player";
import { Config } from "./utils/config";
import { modeFromMap, randomId } from "./utils/misc";
import { getIP, getPunishment, getSearchParams, parseRole, RateLimiter, serverLog } from "./utils/serverHelpers";
import { TeamMode } from "$common/schemas/misc";
import { GameInfo } from "$common/schemas/api/games";

export interface GameData {
    aliveCount: number
    allowJoin: boolean
    over: boolean
    startedTime: number
}

export class GameContainer {
    readonly worker: Worker;

    readonly id: string;
    readonly port: number;
    readonly map: string;
    readonly teamMode: TeamMode;

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

    get gameInfo(): GameInfo {
        return {
            id: this.id,
            port: this.port,
            gameMode: modeFromMap(this.map),
            teamMode: this.teamMode,
            playerCount: this._data.aliveCount,
            startedTime: this._data.startedTime
        };
    }

    constructor(
        gameManager: GameManager,
        id: string,
        port: number,
        map: MapName,
        teamMode: TeamMode,
        resolve: (game: GameContainer) => void
    ) {
        this.id = id;
        this.port = port;
        this.map = map;
        this.teamMode = teamMode;

        this.worker = Cluster.fork({ id, port, map, teamMode });

        this.worker.on("message", (data: Partial<GameData>): void => {
            this._data = { ...this._data, ...data };

            if (data.allowJoin === true) { // This means the game was just created
                resolve(this);
            }
        });

        this.worker.on("exit", () => {
            gameManager.games.delete(id);
            gameManager.availablePorts.push(port);
        });
    }
}

export class GameManager {
    readonly games = new Map<string, GameContainer>();
    readonly availablePorts: number[];

    constructor() {
        const [minPort, maxPort] = Config.gamePortRange;
        const numPorts = maxPort - minPort;
        this.availablePorts = new Array(numPorts);
        for (let i = 0; i < numPorts; i++) {
            this.availablePorts[i] = minPort + i;
        }
    }

    get playerCount(): number {
        return this.games
            .values()
            .filter(g => !g?.over)
            .reduce((a, b) => (a + (b?.aliveCount ?? 0)), 0);
    }

    newGame(map: MapName, teamMode: TeamMode): Promise<GameContainer | undefined> {
        return new Promise<GameContainer | undefined>(resolve => {
            if (this.games.size >= Config.maxGames || this.availablePorts.length === 0) {
                resolve(undefined);
                return;
            }
            const id = randomId(6);
            const port = this.availablePorts.splice(random(0, this.availablePorts.length - 1), 1)[0];
            serverLog(`Creating new game with ID ${id}`);
            this.games.set(id, new GameContainer(this, id, port, map, teamMode, resolve));
        });
    }

    killAll(): void {
        for (const game of this.games.values()) {
            game.worker.kill();
        }
        this.games.clear();
    }
}

if (!Cluster.isPrimary) {
    const { id, port, map, teamMode } = process.env as {
        readonly id: string
        readonly port: string
        readonly map: string
        readonly teamMode: TeamMode
    };

    const game = new Game(id, teamMode, map, {
        // just hard coding these settings for now, not expecting a lot of players anytime soon
        scale: 0.7,
        maxMajorBuildings: 1,
        gameSpawnWindow: 114
    });

    process.on("uncaughtException", e => {
        game.error("An unhandled error occurred. Details:", e);
        game.exit("Game crashed", "Crashed!", 1);
    });

    const { maxSimultaneousConnections, maxJoinAttempts } = Config;
    const simultaneousConnections = maxSimultaneousConnections
        ? new RateLimiter(maxSimultaneousConnections)
        : undefined;
    const joinAttempts = maxJoinAttempts
        ? new RateLimiter(maxJoinAttempts.count, maxJoinAttempts.duration)
        : undefined;

    Bun.serve({
        hostname: Config.hostname,
        port,
        routes: {
            "/": async(req, res) => {
                if (!game.allowJoin) {
                    return new Response("403 Forbidden");
                }

                const ip = getIP(req, res);
                const searchParams = getSearchParams(req);

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
                if (punishment && punishment.message !== "noname") {
                    return new Response("403 Forbidden");
                }

                const { role, isDev, nameColor } = parseRole(searchParams);
                res.upgrade(req, {
                    data: {
                        ip,
                        teamID: searchParams.get("teamID") ?? undefined,
                        autoFill: Boolean(searchParams.get("autoFill")),
                        noName: punishment?.message === "noname",
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

            message(socket: Bun.ServerWebSocket<PlayerSocketData>, message: string | Buffer<ArrayBuffer>) {
                try {
                    game.onMessage(socket.data.player, (message as Buffer<ArrayBuffer>).buffer);
                } catch (e) {
                    console.warn("Error parsing message:", e);
                }
            },

            close(socket: Bun.ServerWebSocket<PlayerSocketData>) {
                const { player, ip } = socket.data;

                if (player) game.removePlayer(player);
                if (ip) simultaneousConnections?.decrement(ip);
            }
        } satisfies Bun.WebSocketHandler<PlayerSocketData>
    });

    game.setGameData({ allowJoin: true });
    game.log(`Listening on ${Config.hostname}:${port}`);
}
