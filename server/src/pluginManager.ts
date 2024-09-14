import { EmoteDefinition } from "@common/definitions/emotes";
import { type PlayerPing } from "@common/definitions/mapPings";
import { type PlayerInputData } from "@common/packets/inputPacket";
import { ExtendedMap } from "@common/utils/misc";
import { Vector } from "@common/utils/vector";

import type { Layer } from "@common/constants";
import type { LootDefinition } from "@common/definitions";
import type { BuildingDefinition } from "@common/definitions/buildings";
import type { ObstacleDefinition } from "@common/definitions/obstacles";
import type { JoinPacketData } from "@common/packets/joinPacket";
import type { Orientation, Variation } from "@common/typings";
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

function makeEvent<Cancellable extends boolean | undefined = false>(
    ...[cancellable]: Cancellable extends true ? [Cancellable] : []
): { readonly cancellable: Cancellable } {
    return { get cancellable(): Cancellable { return cancellable as Cancellable; } };
}

/*
    ok so i'd use "::" as a namespace indicator, but doing
    so forces all enum access to be done as SomeEnum["Foo::Bar"].

    that sounds fine, but for some very strange reason, in the
    context of computed properties on interfaces/types,
    SomeEnum["ABC"] is not regarded as being a literal type,
    whereas SomeEnum.ABC is

    so we're forced to use "_" instead
*/
export const Events = {
    /**
     * Emitted when a player is about to be connected
     * to the server. No game object will have been created
     * at this point
     *
     * Cancelling this event will result in the corresponding
     * websocket being closed, preventing the player from
     * joining
     */
    Player_Will_Connect: makeEvent(true),
    /**
     * Emitted after the instantiation of
     * the {@link Player} object and its placement
     *
     * This event cannot be cancelled
     */
    Player_Did_Connect: makeEvent(),

    /**
     * Emitted at the start of {@link Game.activatePlayer()}.
     * Notably, a {@link JoinedPacket} will have been sent, but
     * the player will not have been added to any collections
     * (except a team, which is done before {@link Events.Player_Did_Connect}
     * is fired), and the game will not have been started if need be
     *
     * Cancelling this event will disconnect the corresponding player
     */
    Player_Will_Join: makeEvent(true),
    /**
     * Emitted at the end of {@link Game.activatePlayer()}.
     * Notably, a {@link JoinedPacket} will have been sent,
     * the player will have been added to all the relevant
     * collections, and the game will have been started if
     * need be
     *
     * This event cannot be cancelled
     */
    Player_Did_Join: makeEvent(),

    /**
     * Emitted after the end {@link Game.removePlayer()}.
     * Notably, the socket will have been closed, the player
     * object may have been despawned, and the player will
     * have been removed from their team
     */
    Player_Disconnect: makeEvent(),
    /**
     * Emitted at the end of a player's {@link Player.update() first update pass}
     * (which is in charge of updating physical quantities,
     * updating health/adren/zoom, and using items)
     */
    Player_Update: makeEvent(),
    /**
     * Emitted on the first tick that a player is attacking (more
     * formally, on the first tick where a player is attacking
     * following a tick where the player was not attacking)
     */
    Player_StartAttacking: makeEvent(),
    /**
     * Emitted on the first tick that a player stops attacking
     * (more formally, on the first tick where a player is not
     * attacking following a tick where the player was attacking)
     */
    Player_StopAttacking: makeEvent(),
    /**
     * Emitted every time an {@link InputPacket} is received.
     * All side-effects from inputs will have already occurred
     * by the time this event is fired.
     */
    Player_Input: makeEvent(),
    /**
     * Emitted when a player is about to use a valid emote
     *
     * Cancelling this event will prevent the emote from being used
     */
    Player_Will_Emote: makeEvent(true),
    /**
     * Emitted when a player uses a valid emote
     */
    Player_Did_Emote: makeEvent(),
    /**
     * Emitted when a player is about to use a player ping
     *
     * Cancelling this event will prevent the player ping from being used
     */
    Player_Will_MapPing: makeEvent(true),
    /**
     * Emitted when a player uses a player ping
     */
    Player_Did_MapPing: makeEvent(),
    /**
     * Emitted when the player is about to receive damage.
     * The damage amount received is not clamped and does
     * not take protective modifiers into account; use the
     * {@link Events.Player_Will_PiercingDamaged} for that purpose
     */
    Player_Damage: makeEvent(),
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
     *
     * Cancelling this event will prevent the payer from being
     * damaged
     */
    Player_Will_PiercingDamaged: makeEvent(true),
    /**
     * Emitted after the player has received piercing
     * damage, which is simply defined as damage that ignores
     * protective modifiers (like gas or airdrop damage). Note
     * that regular damage is routed through this event as
     * well, after having been reduced appropriately.
     *
     * Damage dealt, damage taken, and on-hit effects will have
     * been applied, but the check for player death will not yet
     * have happened (meaning {@link Events.Player_Will_Die} will
     * always fire after this event if applicable). Item modifiers
     * will also not yet have been updated (since those depend on
     * the death check), meaning that {@link Events.InvItem_StatsChanged}
     * will not have been fired
     */
    Player_Did_PiercingDamaged: makeEvent(),
    /**
     * Emitted when the player is about to die. Health is guaranteed
     * to be less than or equal to 0, and the `dead` flag will not
     * have been set.
     */
    Player_Will_Die: makeEvent(),
    /**
     * Emitted when the player dies. By the time this event is
     * emitted, all player cleanup will have been finished;
     * the current action will have been cancelled; `health`,
     * `dead`, `downed`, and `canDespawn` flags will have been
     * set; `KillFeedPacket` will have been created; and the
     * killer's kill count incremented. Movement variables,
     * attacking variables, and adrenaline will have been set,
     * A death emote will have been sent, and the inventory will
     * have been cleared. The player will not be present in the
     * game's object list, will have thrown their active
     * throwable at their feet (if present). The player's team
     * will have been wiped (if applicable), the player's death marker will
     * have been created, the game over packet will have been
     * sent, and this player will have been removed from kill
     * leader (if they were there)
     */
    Player_Did_Die: makeEvent(),
    /**
     * Emitted for each winning player. By the time this event
     * is dispatched, win emote and game over packet will have
     * been sent
     */
    Player_Did_Win: makeEvent(),

    /**
     * Emitted whenever an inventory item is equipped
     * When swapping between two items, the old item is
     * marked as unequipped before the new one is marked
     * as equipped
     */
    InvItem_Equip: makeEvent(),

    /**
     * Emitted whenever an inventory item is unequipped
     * When swapping between two items, the old item is
     * marked as unequipped before the new one is marked
     * as equipped
     */
    InvItem_Unequip: makeEvent(),

    /**
     * Emitted whenever a weapon's stats have been changed
     */
    InvItem_StatsChanged: makeEvent(),

    /**
     * Emitted whenever a weapon's modifiers have
     * been changed, usually as a result of stat changes
     */
    InvItem_ModifiersChanged: makeEvent(),

    /**
     * Emitted at the start of the {@link GameMap.generateObstacle()}
     * method, which is invoked during map generation
     *
     * Also invoked when airdrops land
     *
     * Cancelling this event will lead to the obstacle not being generated
     */
    Obstacle_Will_Generate: makeEvent(true),
    /**
     * Emitted at the end of the {@link GameMap.generateObstacle()}
     * method, which is invoked during map generation
     *
     * Also invoked when airdrops land
     */
    Obstacle_Did_Generate: makeEvent(),
    /**
     * Emitted when an obstacle is about to sustain damage.
     * This event will not be fired for "invalid" attempts
     * to deal damage (such as trying to damage an `indestructible`
     * obstacle), and the obstacle's health will not have been
     * diminished (and therefore, no side-effects of obstacle
     * death will have occurred)
     *
     * Cancelling this event will lead to the obstacle sustaining no damage
     */
    Obstacle_Will_Damage: makeEvent(true),
    /**
     * Emitted when an obstacle has sustained damage, but before
     * any death logic has been run or checked; {@link Events.Obstacle_Will_Destroy}
     * will thus always fire after this event if applicable
     */
    Obstacle_Did_Damage: makeEvent(),
    /**
     * Emitted when an obstacle is destroyed. Health and death
     * variables will have been updated, but no side-effects
     * (spawning explosions/decals/particles/loot) will have
     * occurred yet
     *
     * Cancelling this event will lead to no side effects occurring;
     * the obstacle will vanish, but no explosions, nor loot, nor decal,
     * (nor etc) will spawn
     */
    Obstacle_Will_Destroy: makeEvent(true),
    /**
     * Emitted when an obstacle is destroyed. Health and death
     * variables will have been updated, and all side-effects
     * (spawning explosions/decals/particles/loot) will have
     * occurred
     */
    Obstacle_Did_Destroy: makeEvent(),
    /**
     * Emitted when a player is about to interact with an obstacle.
     * All checks for validity will have succeeded ({@link Obstacle.canInteract()}
     * will have already returned `true`), but no side effects will
     * have occurred
     *
     * Cancelling this event will prevent the interaction from occurring
     */
    Obstacle_Will_Interact: makeEvent(true),
    /**
     * Emitted after a player has interacted with an obstacle.
     * All checks for validity will have succeeded ({@link Obstacle.canInteract()}
     * will have already returned `true`), and all side effects will
     * have occurred
     */
    Obstacle_Did_Interact: makeEvent(),

    /**
     * Emitted whenever {@link Game.addLoot()} is called,
     * before the loot object has both been created and added
     *
     * Cancelling this event will prevent the loot from being generated
     */
    Loot_Will_Generate: makeEvent(true),
    /**
     * Emitted whenever {@link Game.addLoot()} is called,
     * after the loot object has both been created and added
     */
    Loot_Did_Generate: makeEvent(),
    /**
     * Emitted when a player is about to interact
     * {@link Loot} object. All checks for validity
     * will have passed (in other words, {@link Loot.canInteract()}
     * will hav returned `true`); however, the redundancy
     * check (indicated by the `noPickup` argument) will
     * not have run; if `noPickup` is `true`,
     * {@link Events.Loot_Did_Interact} will not be fired.
     *
     * Cancelling this event will prevent the interaction from occurring
     */
    Loot_Will_Interact: makeEvent(true),
    /**
     * Emitted after a player successfully interacts with a
     * {@link Loot} object. By the time this event is fired,
     * the player's inventory will have (possibly) been mutated,
     * a {@link PickupPacket} will have been sent, and the loot
     * object will have been removed; the "new" loot
     * item (which is created if the old one isn't completely
     * consumed) will have also been created (meaning that
     * {@link Events.Loot_Will_Generate} and
     * {@link Events.Loot_Did_Generate} will have fired)
     */
    Loot_Did_Interact: makeEvent(),

    /**
     * Emitted at the start of the {@link GameMap.generateBuilding()}
     * method, which is invoked during map generation
     *
     * Cancelling this event will prevent the building in question from generating
     */
    Building_Will_Generate: makeEvent(true),
    /**
     * Emitted at the end of the {@link GameMap.generateBuilding()}
     * method, which is invoked during map generation
     */
    Building_Did_Generate: makeEvent(),
    /**
     * Emitted when a building with a damageable ceiling has had
     * its ceiling damaged. This usually happens by destroying
     * one of the building's walls
     *
     * Cancelling this event prevents the damage from being applied
     */
    Building_Will_DamageCeiling: makeEvent(true),
    /**
     * Emitted when a building with a damageable ceiling is about
     * to receive damage to said ceiling, usually by means of
     * destroying one of its walls
     */
    Building_Did_DamageCeiling: makeEvent(),
    /**
     * Emitted when a building's ceiling is destroyed by means
     * of having too many of its walls destroyed. The building
     * will have been marked as "dead" and "partially dirty".
     */
    Building_Did_DestroyCeiling: makeEvent(),

    /**
     * Emitted when {@link Game.summonAirdrop()} is called.
     * A desired position will be received, but the actual
     * position will not have yet been determined
     *
     * Cancelling this event will prevent the airdrop from being summoned
     */
    Airdrop_Will_Summon: makeEvent(true),
    /**
     * Emitted when {@link Game.summonAirdrop()} is called.
     * The position of the airdrop and its plane will have
     * been decided, and it will have been scheduled.
     */
    Airdrop_Did_Summon: makeEvent(),
    /**
     * Emitted when a {@link Parachute} object hits the ground.
     * The parachute object will have been removed, and the
     * corresponding airdrop crate will have been generated
     * (meaning that this event is always fired after an
     * {@link Events.Obstacle_Did_Generate}). No particles will
     * have been spawned, and no crushing damage will have been
     * applied
     */
    Airdrop_Landed: makeEvent(),

    /**
     * Emitted when a game is created, near the end of
     * {@link Game}'s constructor. Relevant websocket
     * listeners will have been set up, plugins will have been
     * loaded, and the {@link Grid grid}, {@link GameMap game map},
     * and {@link Gas gas} will have been loaded. The game
     * loop will not have been started
     */
    Game_Created: makeEvent(),
    /**
     * Emitted at the end of a game tick. All side-effects
     * will have occurred (including the potential dispatch
     * of {@link Events.Game_End}), but the next tick will
     * not have been scheduled.
     */
    Game_Tick: makeEvent(),
    /**
     * Emitted when a player or team is determined to have
     * won the game, thereby ending it. The server will not
     * have been stopped yet
     */
    Game_End: makeEvent()
};

export interface EventDataMap {
    readonly Player_Will_Connect: never
    readonly Player_Did_Connect: Player

    readonly Player_Will_Join: {
        readonly player: Player
        readonly joinPacket: JoinPacketData
    }
    readonly Player_Did_Join: {
        readonly player: Player
        readonly joinPacket: JoinPacketData
    }

    readonly Player_Disconnect: Player
    readonly Player_Update: Player
    readonly Player_StartAttacking: Player
    readonly Player_StopAttacking: Player
    readonly Player_Input: {
        readonly player: Player
        readonly packet: PlayerInputData
    }
    readonly Player_Will_Emote: {
        readonly player: Player
        readonly emote: EmoteDefinition
    }
    readonly Player_Did_Emote: {
        readonly player: Player
        readonly emote: EmoteDefinition
    }
    readonly Player_Will_MapPing: {
        readonly player: Player
        readonly ping: PlayerPing
        readonly position: Vector
    }
    readonly Player_Did_MapPing: {
        readonly player: Player
        readonly ping: PlayerPing
        readonly position: Vector
    }
    readonly Player_Damage: PlayerDamageEvent
    readonly Player_Will_PiercingDamaged: PlayerDamageEvent
    readonly Player_Did_PiercingDamaged: PlayerDamageEvent
    readonly Player_Will_Die: Omit<PlayerDamageEvent, "amount">
    readonly Player_Did_Die: Omit<PlayerDamageEvent, "amount">
    readonly Player_Did_Win: Player

    readonly InvItem_Equip: InventoryItem
    readonly InvItem_Unequip: InventoryItem
    readonly InvItem_StatsChanged: {
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
    readonly InvItem_ModifiersChanged: {
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

    readonly Obstacle_Will_Generate: {
        readonly type: ObstacleDefinition
        readonly position: Vector
        readonly rotation: number
        readonly layer: number
        readonly scale: number
        readonly variation?: Variation
        readonly lootSpawnOffset?: Vector
        readonly parentBuilding?: Building
        readonly puzzlePiece?: string | boolean
        readonly locked?: boolean
    }
    readonly Obstacle_Did_Generate: Obstacle
    readonly Obstacle_Will_Damage: ObstacleDamageEvent
    readonly Obstacle_Did_Damage: ObstacleDamageEvent
    readonly Obstacle_Will_Destroy: ObstacleDamageEvent
    readonly Obstacle_Did_Destroy: ObstacleDamageEvent
    readonly Obstacle_Will_Interact: {
        readonly obstacle: Obstacle
        readonly player?: Player
    }
    readonly Obstacle_Did_Interact: {
        readonly obstacle: Obstacle
        readonly player?: Player
    }

    readonly Loot_Will_Generate: {
        readonly definition: LootDefinition
        readonly position: Vector
        readonly layer: Layer
        readonly count?: number
        readonly pushVel?: number
        readonly jitterSpawn?: boolean
    }
    readonly Loot_Did_Generate: {
        readonly loot: Loot
        readonly position: Vector
        readonly layer: Layer
        readonly count?: number
        readonly pushVel?: number
        readonly jitterSpawn?: boolean
    }
    readonly Loot_Will_Interact: {
        readonly loot: Loot
        readonly noPickup: boolean
        readonly player: Player
    }
    readonly Loot_Did_Interact: {
        readonly loot: Loot
        readonly player: Player
    }

    readonly Building_Will_Generate: {
        readonly definition: BuildingDefinition
        readonly position: Vector
        readonly orientation: Orientation
        readonly layer: number
    }
    readonly Building_Did_Generate: Building
    readonly Building_Will_DamageCeiling: {
        readonly building: Building
        readonly damage: number
    }
    readonly Building_Did_DamageCeiling: {
        readonly building: Building
        readonly damage: number
    }
    readonly Building_Did_DestroyCeiling: Building

    readonly Airdrop_Will_Summon: {
        /**
         * This is the airdrop's _desired_ location, which may
         * or may not differ from where it will end up, all depending
         * on the terrain present at that location
         */
        readonly position: Vector
    }
    readonly Airdrop_Did_Summon: {
        readonly airdrop: Airdrop
        /**
         * This is the airdrop's _actual_ location, which may
         * or may not differ from where it requested to land, all
         * depending on the terrain present at its requested location
         */
        readonly position: Vector
    }
    readonly Airdrop_Landed: Airdrop

    readonly Game_Created: Game
    readonly Game_Tick: Game
    readonly Game_End: Game
}

type EventTypes = keyof typeof Events;

type ArgsFor<Key extends EventTypes> = [EventDataMap[Key]] extends [never] ? [] : [EventDataMap[Key]];
type EventData<Key extends EventTypes> = [
    {
        /**
         * Prevents any listener after this one from executing
         */
        // you're actually so stupid
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        stopImmediatePropagation(this: void): void
    } & (
        (typeof Events)[Key]["cancellable"] extends true
            ? {
                /**
                 * Marks the event as "to be cancelled", meaning that side-effects related to
                 * this event should not occur. Check each event's documentation for what exactly
                 * cancelling an event entails
                 */
                // sod off
                // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
                cancel(this: void): void
                /**
                 * Whether this event has been cancelled. This value is accurate as of the start
                 * of the callback
                 */
                readonly isCancelled: boolean
            }
            : object
    )
];

export type EventHandler<Ev extends EventTypes = EventTypes> = (...[data, cancel]: [...ArgsFor<Ev>, ...EventData<Ev>]) => void;

type EventHandlers = {
    [K in EventTypes]?: Array<EventHandler<K>>
};

// basically file-scoped access to an emit method
const pluginDispatchers = new ExtendedMap<
    GamePlugin,
    <Ev extends EventTypes = EventTypes>(eventType: Ev, ...[data, cancel]: [...ArgsFor<Ev>, ...EventData<Ev>]) => void
>();

export abstract class GamePlugin {
    private readonly _events: EventHandlers = {};

    constructor(public readonly game: Game) {
        this.initListeners();
        pluginDispatchers.set(
            this,
            <Ev extends EventTypes>(eventType: Ev, ...args: [...ArgsFor<Ev>, ...EventData<Ev>]) => {
                const events = this._events[eventType];
                if (events === undefined) return;

                let i = 0;
                for (const event of events) {
                    try {
                        event(...args);
                    } catch (e) {
                        console.error(
                            `While dispatching event '${eventType}', listener at index ${i}`
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

    on<Ev extends EventTypes>(eventType: Ev, cb: EventHandler<Ev>): void {
        ((this._events[eventType] as Set<typeof cb> | undefined) ??= new Set()).add(cb);
    }

    off<Ev extends EventTypes>(eventType: Ev, cb?: EventHandler<Ev>): void {
        if (!cb) {
            this._events[eventType] = undefined;
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

    /**
     * Returns the `GamePlugin` instance which cancelled the event, or `undefined`
     * if the event was not cancelled
     */
    emit<Ev extends EventTypes>(eventType: Ev, ...args: ArgsFor<Ev>): GamePlugin | undefined {
        let cancelSource = undefined;
        let isCancelled = false;
        let plugin: GamePlugin;
        let continueDispatch = true;

        const evData = [{
            stopImmediatePropagation() { continueDispatch = false; },
            ...(
                Events[eventType].cancellable
                    ? {
                        cancel() { isCancelled = true; cancelSource = plugin; },
                        isCancelled: isCancelled
                    }
                    : {}
            )
        }] as EventData<Ev>;

        for (plugin of this._plugins) {
            pluginDispatchers.get(plugin)?.(eventType, ...args, ...evData);
            if (!continueDispatch) break;
        }

        return cancelSource;
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
