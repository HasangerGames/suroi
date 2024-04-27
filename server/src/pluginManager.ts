import { Vector } from "../../common/src/utils/vector";
import { Game } from "./game";
import { Player } from "./objects/player";
import { Config } from "./config";
import { Logger } from "./utils/misc";
import { EmoteDefinition } from "../../common/src/definitions/emotes";
import { MapPingDefinition } from "../../common/src/definitions/mapPings";
import { GameObject } from "./objects/gameObject";
import { Explosion } from "./objects/explosion";
import { ThrowableItem } from "./inventory/throwableItem";
import { MeleeItem } from "./inventory/meleeItem";
import { GunItem } from "./inventory/gunItem";
import { KillfeedEventType } from "../../common/src/constants";

// TODO: add more events
export enum GameEvent {
    // Player events
    PlayerConnect,
    PlayerJoin,
    PlayerDisconnect,
    PlayerUpdate,
    PlayerStartAttacking,
    PlayerStopAttacking,
    PlayerEmote,
    PlayerMapPing,
    PlayerWin,
    PlayerDamage,
    PlayerPiercingDamage,
    PlayerKill,
    // Game Events
    GameCreated,
    GameTick,
    GameEnd
}

interface EventData {
    [GameEvent.PlayerConnect]: Player
    [GameEvent.PlayerJoin]: Player
    [GameEvent.PlayerDisconnect]: Player
    [GameEvent.PlayerUpdate]: Player
    [GameEvent.PlayerStartAttacking]: Player
    [GameEvent.PlayerStopAttacking]: Player
    [GameEvent.PlayerEmote]: {
        player: Player
        emote: EmoteDefinition
    }
    [GameEvent.PlayerMapPing]: {
        player: Player
        ping: MapPingDefinition
        position: Vector
    }
    [GameEvent.PlayerDamage]: {
        player: Player
        amount: number
        source?: GameObject
        weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion
    }
    [GameEvent.PlayerPiercingDamage]: {
        player: Player
        amount: number
        source?: GameObject | KillfeedEventType.Gas | KillfeedEventType.Airdrop | KillfeedEventType.BleedOut
        weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion
    }
    [GameEvent.PlayerKill]: {
        player: Player
        source?: GameObject | (typeof KillfeedEventType)["Gas" | "Airdrop" | "BleedOut" | "FinallyKilled"]
        weaponUsed?: GunItem | MeleeItem | ThrowableItem | Explosion
    }
    [GameEvent.PlayerWin]: Player
    [GameEvent.GameCreated]: Game
    [GameEvent.GameTick]: Game
    [GameEvent.GameEnd]: Game
}

const eventKeys = Object.keys(GameEvent).filter(e => !Number.isNaN(+e)) as unknown as GameEvent[];

type Events = Array<Set<(data: EventData[GameEvent]) => void> | undefined>;

export abstract class GamePlugin {
    readonly events: Events = [];

    constructor(public readonly game: Game) {
        this.initListeners();
    }

    protected abstract initListeners(): void;

    on<E extends GameEvent>(eventType: E, cb: (data: EventData[E]) => void): void {
        this.game.pluginManager.on(eventType, cb);
        ((this.events[eventType] as Set<typeof cb>) ??= new Set()).add(cb);
    }

    off<E extends GameEvent>(eventType: E, cb: (data: EventData[E]) => void): void {
        this.game.pluginManager.off(eventType, cb);
        (this.events[eventType] as Set<typeof cb>).delete(cb);
    }
}

/**
 * This class manages plugins and game events
 */
export class PluginManager {
    readonly game: Game;
    private readonly _events: Events = [];

    private readonly _plugins = new Set<GamePlugin>();

    constructor(game: Game) {
        this.game = game;
    }

    on<E extends GameEvent>(eventType: E, cb: (data: EventData[E]) => void): void {
        ((this._events[eventType] as Set<typeof cb>) ??= new Set()).add(cb);
    }

    off<E extends GameEvent>(eventType: E, cb: (data: EventData[E]) => void): void {
        if (!this._events[eventType]) return;
        (this._events[eventType] as Set<typeof cb>).delete(cb);
    }

    emit<E extends GameEvent>(eventType: E, data: EventData[E]): void {
        const events = this._events[eventType];
        if (events === undefined) return;
        for (const event of events) {
            event(data);
        }
    }

    loadPlugin(pluginClass: new (game: Game) => GamePlugin): void {
        for (const plugin of this._plugins) {
            if (plugin instanceof pluginClass) {
                console.warn(`Plugin ${pluginClass.name} already loaded`);
                return;
            }
        }
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

        for (const eventType of eventKeys) {
            const events = plugin.events[eventType];
            if (events === undefined) continue;
            for (const event of events) {
                plugin.off(eventType, event);
            }
        }
    }

    loadPlugins(): void {
        for (const plugin of Config.plugins) {
            this.loadPlugin(plugin);
        }
    }
}
