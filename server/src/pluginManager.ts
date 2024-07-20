import { EmoteDefinition } from "@common/definitions/emotes";
import { type PlayerPing } from "@common/definitions/mapPings";
import { type PlayerInputData } from "@common/packets/inputPacket";
import { ExtendedMap } from "@common/utils/misc";
import { Vector } from "@common/utils/vector";

import { Config } from "./config";
import { Airdrop, Game } from "./game";
import { type InventoryItem } from "./inventory/inventoryItem";
import { Building } from "./objects/building";
import { DamageParams } from "./objects/gameObject";
import { Loot } from "./objects/loot";
import { Obstacle } from "./objects/obstacle";
import { Player } from "./objects/player";
import { Logger } from "./utils/misc";

interface PlayerDamageEvent extends DamageParams {
    readonly player: Player
}
interface ObstacleDamageEvent extends DamageParams {
    readonly obstacle: Obstacle
    readonly position?: Vector
}

/*
    ok so i'd use "::" as a namespace indicator, but doing
    so forces all enum access to be done as SomeEnum["Foo::Bar"].

    that sounds fine, but for some very strange reason, in the
    context of computed properties on interfaces/types,
    SomeEnum["ABC"] is not regarded as being a literal type,
    whereas SomeEnum.ABC is

    so we're forced to use "_" instead

    FIXME alsooooo the times when these events are fired are
    superrrrr inconsistent—some happen after side effects,
    some before, some in the middle! either pick a single
    convention, or pick both before and after, splitting the
    events into "Will-" and "Did-" categories (ex: WillDoSomething
    and DidDoSomething; you'd expect the former to precede
    both the latter and any side effects)

    TODO add event cancelling (but only to events preceding
    side effects)?
*/
export enum Events {
    /**
     * Emitted after the instantiation of
     * the {@link Player} object
     */
    Player_Connect,
    /**
     * Emitted at the end of {@link Game.activatePlayer()}.
     * Notably, a {@link JoinedPacket} will have been sent,
     * the player will have been added to all the relevant
     * collections, and the game will have been started if
     * need be
     */
    Player_Join,
    /**
     * Emitted after the end {@link Game.removePlayer()}.
     * Notably, the socket will have been closed, the player
     * object may have been despawned, and the player will
     * have been removed from their team
     */
    Player_Disconnect,
    /**
     * Emitted at the end of a player's {@link Player.update() first update pass}
     * (which is in charge of updating physical quantities,
     * updating health/adren/zoom, and using items)
     */
    Player_Update,
    /**
     * Emitted on the first tick that a player is attacking (more
     * formally, on the first tick where a player is attacking
     * following a tick where the player was not attacking)
     */
    Player_StartAttacking,
    /**
     * Emitted on the first tick that a player stops attacking
     * (more formally, on the first tick where a player is not
     * attacking following a tick where the player was attacking)
     */
    Player_StopAttacking,
    /**
     * Emitted every time an {@link InputPacket} is received.
     * All side-effects from inputs will have already occurred
     * by the time this event is fired.
     */
    Player_Input,
    /**
     * Emitted when a player uses a valid emote
     */
    Player_Emote,
    /**
     * Emitted when a player uses a player ping
     */
    Player_MapPing,
    /**
     * Emitted when the player is about to receive damage.
     * The damage amount received is not clamped and does
     * not take protective modifiers into account; use the
     * {@link Events.Player_PiercingDamage} for that purpose
     */
    Player_Damage,
    /**
     * Emitted when the player is about to receive piercing
     * damage, which is simply defined as damage that ignores
     * protective modifiers (like gas or airdrop damage). Note
     * that regular damage is routed through this event as
     * well, after having been reduced appropriately.
     *
     * Also note that no fields will have been mutated by the
     * time this event is emitted; damage will not have been
     * applied, stats will not have been updated, and relevant
     * packets will not have been sent
     */
    Player_PiercingDamage,
    /**
     * Emitted when the player dies. By the time this event is
     * emitted, player cleanup will mostly not have been started;
     * the current action will have been cancelled; `health`,
     * `dead`, `downed`, and `canDespawn` flags will have been
     * set; KillFeedPacket will have been created; and the
     * killer's kill count incremented.
     *
     * However, movement variables, attacking variables, and
     * adrenaline will not have been set. Death emote will not
     * have been sent, and the inventory will not have been
     * cleared. The player will be present in the game's object
     * list, will not have dropped their active throwable (if
     * present). The player's team will not have been wiped, the
     * player's death marker will not have been created, the game
     * over packet will not have been sent, and this player will
     * not have been removed from kill leader (if they were there)
     */
    Player_Death,
    /**
     * Emitted for each winning player. By the time this event
     * is dispatched, win emote and game over packet will have
     * been sent
     */
    Player_Win,

    /**
     * Emitted whenever an inventory item is equipped
     * When swapping between two items, the old item is
     * marked as unequipped before the new one is
     */
    InvItem_Equip,
    /**
     * Emitted whenever an inventory item is unequipped
     * When swapping between two items, the old item is
     * marked as unequipped before the new one is
     */
    InvItem_Unequip,
    /**
     * Emitted whenever a weapon's stats have been changed
     */
    InvItem_StatsChanged,
    /**
     * Emitted whenever a weapon's modifiers have
     * been changed, usually as a result of stat changes
     */
    InvItem_ModifiersChanged,

    /**
     * Emitted at the end of the {@link GameMap.generateObstacle()}
     * method, which is invoked during map generation
     *
     * Also invoked when airdrops land
     */
    Obstacle_Generated,
    /**
     * Emitted when an obstacle is about to sustain damage.
     * This event will not be fired for "invalid" attempts
     * to deal damage (such as trying to damage an `indestructible`
     * obstacle), and the obstacle's health will not have been
     * diminished (and therefore, no side-effects of obstacle
     * death will have occurred)
     */
    Obstacle_Damage,
    /**
     * Emitted when an obstacle is destroyed. Health and death
     * variables will have been updated, but no side-effects
     * (spawning explosions/decals/particles/loot) will have
     * occurred yet.
     */
    Obstacle_Destroy,
    /**
     * Emitted when a player successfully interacts with an
     * obstacle, but before any side-effects occur.
     */
    Obstacle_Interact,

    /**
     * Emitted whenever {@link Game.addLoot()} is called,
     * after the loot object has both been created and added
     */
    Loot_Generated,
    /**
     * Emitted after a player successfully interacts with a
     * {@link Loot} object. By the time this event is fired,
     * the player's inventory will have (possibly) been mutated,
     * a {@link PickupPacket} will have been sent, and the loot
     * object will have been removed; however, the "new" loot
     * item (which is created if the old one isn't completely
     * consumed) will not have yet been created.
     */
    Loot_Interact,

    /**
     * Emitted at the end of the {@link GameMap.generateBuilding()}
     * method, which is invoked during map generation
     */
    Building_Generated,
    /**
     * Emitted when a building with a damageable ceiling has
     * its ceiling damaged. This usually happens by destroying
     * one of the building's walls. This event is emitted
     * before the "walls to destroy" count is updated
     */
    Building_CeilingDamage,
    /**
     * Emitted when a building's ceiling is destroyed by means
     * of having too many of its walls destroyed. The building
     * will have been marked as "dead" and "partially dirty".
     */
    Building_CeilingDestroy,

    /**
     * Emitted when {@link Game.summonAirdrop()} is called.
     * The position of the airdrop and its plane will have
     * been decided, but nothing will have yet been scheduled.
     */
    Airdrop_Summoned,
    /**
     * Emitted when a {@link Parachute} object hits the ground.
     * The parachute object will have been removed, and the
     * corresponding airdrop crate will have been generated
     * (meaning that this event is always fired after an
     * {@link Events.Obstacle_Generated}). No particles will
     * have been spawned, and no crushing damage will have been
     * applied
     */
    Airdrop_Landed,

    /**
     * Emitted when a game is created, near the end of
     * {@link Game}'s constructor. Relevant websocket
     * listeners will have been set up, plugins will have been
     * loaded, and the {@link Grid grid}, {@link GameMap game map},
     * and {@link Gas gas} will have been loaded. The game
     * loop will not have been started
     */
    Game_Created,
    /**
     * Emitted at the end of a game tick. All side-effects
     * will have occurred (including the potential dispatch
     * of {@link Events.Game_End}), but the next tick will
     * not have been scheduled.
     */
    Game_Tick,
    /**
     * Emitted when a player or team is determined to have
     * won the game, thereby ending it. The server will not
     * have been stopped yet
     */
    Game_End
}

export interface EventDataMap {
    [Events.Player_Connect]: Player
    [Events.Player_Join]: Player
    [Events.Player_Disconnect]: Player
    [Events.Player_Update]: Player
    [Events.Player_StartAttacking]: Player
    [Events.Player_StopAttacking]: Player
    [Events.Player_Input]: {
        readonly player: Player
        readonly packet: PlayerInputData
    }
    [Events.Player_Emote]: {
        readonly player: Player
        readonly emote: EmoteDefinition
    }
    [Events.Player_MapPing]: {
        readonly player: Player
        readonly ping: PlayerPing
        readonly position: Vector
    }
    [Events.Player_Damage]: PlayerDamageEvent
    [Events.Player_PiercingDamage]: PlayerDamageEvent
    [Events.Player_Death]: Omit<PlayerDamageEvent, "amount">
    [Events.Player_Win]: Player

    [Events.InvItem_Equip]: InventoryItem
    [Events.InvItem_Unequip]: InventoryItem
    [Events.InvItem_StatsChanged]: {
        readonly item: InventoryItem
        /**
         * Specific type will be `(typeof item)["stats"]`
         */
        readonly oldStats: InventoryItem["stats"]
        /**
         * Specific type will be `(typeof item)["stats"]`
         */
        readonly newStats: InventoryItem["stats"]
        /**
         * Specific type will be `{ readonly [K in (typeof item)["stats"]]: boolean }`
         */
        readonly diff: {
            readonly [K in keyof InventoryItem["stats"]]: boolean
        }
    }
    [Events.InvItem_ModifiersChanged]: {
        readonly item: InventoryItem
        /**
         * Specific type will be `(typeof item)["modifiers"]`
         */
        readonly oldMods: InventoryItem["modifiers"]
        /**
         * Specific type will be `(typeof item)["modifiers"]`
         */
        readonly newMods: InventoryItem["modifiers"]
        /**
         * Specific type will be `{ readonly [K in (typeof item)["modifiers"]]: boolean }`
         */
        readonly diff: {
            readonly [K in keyof InventoryItem["modifiers"]]: boolean
        }
    }

    [Events.Obstacle_Generated]: Obstacle
    [Events.Obstacle_Damage]: ObstacleDamageEvent
    [Events.Obstacle_Destroy]: ObstacleDamageEvent
    [Events.Obstacle_Interact]: {
        readonly obstacle: Obstacle
        readonly player?: Player
    }

    [Events.Loot_Generated]: Loot
    [Events.Loot_Interact]: {
        readonly loot: Loot
        readonly player: Player
    }

    [Events.Building_Generated]: Building
    [Events.Building_CeilingDamage]: {
        readonly building: Building
        readonly damage: number
    }
    [Events.Building_CeilingDestroy]: Building

    [Events.Airdrop_Summoned]: Airdrop
    [Events.Airdrop_Landed]: Airdrop

    [Events.Game_Created]: Game
    [Events.Game_Tick]: Game
    [Events.Game_End]: Game
}

export type EventHandler<Ev extends Events = Events> = (data: EventDataMap[Ev]) => void;

// array === a record with numeric keys
type EventHandlers = Array<EventHandler[] | undefined>;

// basically file-scoped access to an emit method
const pluginDispatchers = new ExtendedMap<GamePlugin, <Ev extends Events>(eventType: Ev, data: EventDataMap[Ev]) => void>();

export abstract class GamePlugin {
    private readonly _events: EventHandlers = [];

    constructor(public readonly game: Game) {
        this.initListeners();
        pluginDispatchers.set(
            this,
            <Ev extends Events>(eventType: Ev, data: EventDataMap[Ev]) => {
                const events = this._events[eventType];
                if (events === undefined) return;

                let i = 0;
                for (const event of events) {
                    try {
                        event(data);
                    } catch (e) {
                        console.error(
                            `While dispatching event '${Events[eventType]}', listener at index ${i}`
                            + `(source: ${this.constructor.name} threw an error (provided below):`
                        );
                        console.error(e);
                    }
                    ++i;
                }
            }
        );
    }

    /**
     * Method responsible for adding any listeners regulating this plugin's behavior
     */
    protected abstract initListeners(): void;

    on<Ev extends Events>(eventType: Ev, cb: (data: EventDataMap[Ev]) => void): void {
        ((this._events[eventType] as Set<typeof cb> | undefined) ??= new Set()).add(cb);
    }

    off<Ev extends Events>(eventType: Ev, cb?: (data: EventDataMap[Ev]) => void): void {
        if (!cb) {
            // usage of delete is intentional! we _don't_ want to shift over other keys
            // eslint-disable-next-line @typescript-eslint/no-array-delete, @typescript-eslint/no-dynamic-delete
            delete this._events[eventType];
            return;
        }

        (this._events[eventType] as Set<typeof cb> | undefined)?.delete(cb);
    }
}

/**
 * This class manages plugins and game events
 */
export class PluginManager {
    private readonly _plugins = new Set<GamePlugin>();

    constructor(readonly game: Game) {}

    emit<Ev extends Events>(eventType: Ev, data: EventDataMap[Ev]): void {
        for (const plugin of this._plugins) pluginDispatchers.get(plugin)?.(eventType, data);
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
    }

    loadPlugins(): void {
        for (const plugin of Config.plugins) {
            this.loadPlugin(plugin);
        }
    }
}
