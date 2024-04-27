import { Vector } from "../../common/src/utils/vector";
import { Game } from "./game";
import { Player } from "./objects/player";
import { Config } from "./config";
import { Logger } from "./utils/misc";
import { EmoteDefinition } from "../../common/src/definitions/emotes";
import { MapPingDefinition } from "../../common/src/definitions/mapPings";

// TODO: add more events
export const GameEvents = [
    "playerConnected",
    "playerJoined",
    "playerDisconnect",
    "playerUpdate",
    "playerStartAttacking",
    "playerStopAttacking",
    "playerEmote",
    "playerMapPing",
    "gameCreated"
] as const;

type GameEventType = typeof GameEvents[number];

interface EventData {
    playerConnected: Player
    playerJoined: Player
    playerDisconnect: Player
    playerUpdate: Player
    playerStartAttacking: Player
    playerStopAttacking: Player
    playerEmote: {
        player: Player
        emote: EmoteDefinition
    }
    playerMapPing: {
        player: Player
        ping: MapPingDefinition
        position: Vector
    }
    gameCreated: Game
}

type Events = Record<GameEventType, Set<(data: EventData[GameEventType]) => void>>;

export abstract class GamePlugin {
    readonly events = {} as Events;

    constructor(public game: Game) {
        for (const event of GameEvents) {
            this.events[event] = new Set();
        }
    }

    on<E extends GameEventType>(eventType: E, cb: (data: EventData[E]) => void): void {
        this.game.pluginManager.on(eventType, cb, this);
    }

    off<E extends GameEventType>(eventType: E, cb: (data: EventData[E]) => void): void {
        this.game.pluginManager.off(eventType, cb, this);
    }
}

/**
 * This class manages plugins and game events
 */
export class PluginManager {
    readonly game: Game;
    private readonly _events = {} as Events;

    private readonly _plugins = new Set<GamePlugin>();

    constructor(game: Game) {
        this.game = game;

        for (const event of GameEvents) {
            this._events[event] = new Set();
        }
    }

    on<E extends GameEventType>(eventType: E, cb: (data: EventData[E]) => void, plugin: GamePlugin): void {
        (this._events[eventType] as Set<typeof cb>).add(cb);
        (plugin.events[eventType] as Set<typeof cb>).add(cb);
    }

    off<E extends GameEventType>(eventType: E, cb: (data: EventData[E]) => void, plugin: GamePlugin): void {
        (this._events[eventType] as Set<typeof cb>).delete(cb);
        (plugin.events[eventType] as Set<typeof cb>).delete(cb);
    }

    emit<E extends GameEventType>(eventType: E, data: EventData[E]): void {
        for (const event of this._events[eventType]) {
            event(data);
        }
    }

    loadPlugin(pluginClass: new (game: Game) => GamePlugin): void {
        try {
            const plugin = new pluginClass(this.game);
            this._plugins.add(plugin);
            Logger.log(`Game ${this.game.id} | Plugin ${pluginClass.name} loaded`);
        } catch (error) {
            console.error(`Failed to load plugin ${pluginClass.name}, err:`, error);
        }
    }

    unloadPlugin(plugin: GamePlugin): void {
        this._plugins.delete(plugin);

        for (const eventType in plugin.events) {
            for (const event of plugin.events[eventType as GameEventType]) {
                this.off(eventType as GameEventType, event, plugin);
            }
        }
    }

    loadPlugins(): void {
        for (const plugin of Config.plugins) {
            this.loadPlugin(plugin);
        }
    }
}
