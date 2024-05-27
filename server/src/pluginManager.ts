import { Vector } from "../../common/src/utils/vector";
import { Airdrop, Game } from "./game";
import { Player } from "./objects/player";
import { Config } from "./config";
import { Logger } from "./utils/misc";
import { EmoteDefinition } from "../../common/src/definitions/emotes";
import { MapPingDefinition } from "../../common/src/definitions/mapPings";
import { DamageParams } from "./objects/gameObject";
import { Obstacle } from "./objects/obstacle";
import { Building } from "./objects/building";
import { Loot } from "./objects/loot";
import { InputPacket } from "../../common/src/packets/inputPacket";

interface PlayerDamageEvent extends DamageParams {
    player: Player
}
interface ObstacleDamageEvent extends DamageParams {
    obstacle: Obstacle
    position?: Vector
}

interface GameEvents {
    // player events
    playerConnect: Player
    playerJoin: Player
    playerDisconnect: Player
    playerUpdate: Player
    playerStartAttacking: Player
    playerStopAttacking: Player
    playerInput: {
        player: Player
        packet: InputPacket
    }
    playerEmote: {
        player: Player
        emote: EmoteDefinition
    }
    playerMapPing: {
        player: Player
        ping: MapPingDefinition
        position: Vector
    }
    playerDamage: PlayerDamageEvent
    playerPiercingDamage: PlayerDamageEvent
    playerKill: Omit<PlayerDamageEvent, "amount">
    playerWin: Player
    // obstacle events
    obstacleGenerated: Obstacle
    obstacleDamage: ObstacleDamageEvent
    obstacleDestroy: ObstacleDamageEvent
    obstacleInteract: {
        obstacle: Obstacle
        player?: Player
    }
    // loot events
    lootGenerated: Loot
    lootInteract: {
        loot: Loot
        player: Player
    }
    // building events
    buildingGenerated: Building
    buildingCeilingDamage: {
        building: Building
        damage: number
    }
    buildingCeilingDestroy: Building
    // air drop events
    airdropSummoned: Airdrop
    airdropLanded: Airdrop
    // game events
    gameCreated: Game
    gameTick: Game
    gameEnd: Game
}

export type GameEvent = keyof GameEvents;

type Events = Partial<Record<GameEvent, Set<(data: GameEvents[GameEvent]) => void> | undefined>>;

export abstract class GamePlugin {
    readonly events: Events = {};

    constructor(public readonly game: Game) {
        this.initListeners();
    }

    protected abstract initListeners(): void;

    on<E extends GameEvent>(eventType: E, cb: (data: GameEvents[E]) => void): void {
        this.game.pluginManager.on(eventType, cb);
        ((this.events[eventType] as Set<typeof cb>) ??= new Set()).add(cb);
    }

    off<E extends GameEvent>(eventType: E, cb: (data: GameEvents[E]) => void): void {
        this.game.pluginManager.off(eventType, cb);
        (this.events[eventType] as Set<typeof cb>).delete(cb);
    }
}

/**
 * This class manages plugins and game events
 */
export class PluginManager {
    readonly game: Game;
    private readonly _events: Events = {};

    private readonly _plugins = new Set<GamePlugin>();

    constructor(game: Game) {
        this.game = game;
    }

    on<E extends GameEvent>(eventType: E, cb: (data: GameEvents[E]) => void): void {
        ((this._events[eventType] as Set<typeof cb>) ??= new Set()).add(cb);
    }

    off<E extends GameEvent>(eventType: E, cb: (data: GameEvents[E]) => void): void {
        if (!this._events[eventType]) return;
        (this._events[eventType] as Set<typeof cb>).delete(cb);
    }

    emit<E extends GameEvent>(eventType: E, data: GameEvents[E]): void {
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

        for (const eventType in plugin.events) {
            const events = plugin.events[eventType as GameEvent];
            if (events === undefined) continue;
            for (const event of events) {
                plugin.off(eventType as GameEvent, event);
            }
        }
    }

    loadPlugins(): void {
        for (const plugin of Config.plugins) {
            this.loadPlugin(plugin);
        }
    }
}
