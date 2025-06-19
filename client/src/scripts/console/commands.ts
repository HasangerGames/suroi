// noinspection JSConstantReassignment
import { GameConstants, InputActions, SpectateActions, TeamSize } from "@common/constants";
import { HealingItems, type HealingItemDefinition } from "@common/definitions/items/healingItems";
import { Scopes, type ScopeDefinition } from "@common/definitions/items/scopes";
import { Throwables } from "@common/definitions/items/throwables";
import { Loots } from "@common/definitions/loots";
import { type InputAction } from "@common/packets/inputPacket";
import { SpectatePacket } from "@common/packets/spectatePacket";
import { Numeric } from "@common/utils/math";
import { handleResult, type Result } from "@common/utils/misc";
import { ItemType, type ReferenceTo } from "@common/utils/objectDefinitions";
import { Rectangle, RendererType, Sprite, VERSION } from "pixi.js";
import { Config, type ServerInfo } from "../config";
import { Game } from "../game";
import { CameraManager } from "../managers/cameraManager";
import { EmoteWheelManager, MapPingWheelManager } from "../managers/emoteWheelManager";
import { InputManager, type CompiledAction, type CompiledTuple } from "../managers/inputManager";
import { MapManager } from "../managers/mapManager";
import { ScreenRecordManager } from "../managers/screenRecordManager";
import { UIManager } from "../managers/uiManager";
import { requestFullscreen, sanitizeHTML, stringify } from "../utils/misc";
import { GameConsole, type PossibleError, type Stringable } from "./gameConsole";
import { Casters, ConVar } from "./variables";

export type CommandExecutor<ErrorType> = (
    ...args: Array<string | undefined>
    // this a return type bruh
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => void | PossibleError<ErrorType>;

interface CommandInfo {
    readonly short: string
    readonly long: string
    /**
     * @default false
     */
    readonly allowOnlyWhenGameStarted?: boolean
    readonly signatures: Array<{
        readonly args: Array<{
            readonly name: string
            readonly optional?: boolean
            readonly type: string[]
            readonly rest?: boolean
        }>
        readonly noexcept: boolean
    }>
}

export class Command<
    Invertible extends boolean = false,
    ErrorType extends Stringable = never
> {
    private readonly _name: string;
    get name(): string { return this._name; }

    private readonly _executor: CommandExecutor<ErrorType>;
    get executor(): CommandExecutor<ErrorType> { return this._executor; }

    run(args: ReadonlyArray<string | undefined> = []): PossibleError<ErrorType> {
        if (!this._info.allowOnlyWhenGameStarted || Game.gameStarted) {
            return this._executor(...args) as PossibleError<ErrorType>;
        }
    }

    private readonly _inverse!: Invertible extends true
        ? Command<true>
        : undefined;

    get inverse(): Invertible extends true ? Command<true> : undefined {
        return this._inverse;
    }

    private readonly _info: CommandInfo;
    get info(): CommandInfo {
        return this._info;
    }

    static createInvertiblePair<ErrorType extends Stringable = never>(
        name: string,
        on: CommandExecutor<ErrorType>,
        off: CommandExecutor<ErrorType>,
        infoOn: CommandInfo,
        infoOff?: CommandInfo
    ): void {
        const plus = new Command<true, ErrorType>(
            `+${name}`,
            on,
            infoOn,
            true
        );
        const minus = new Command<true, ErrorType>(
            `-${name}`,
            off,
            infoOff ?? infoOn,
            true
        );

        // @ts-expect-error not worth marking the field as mutable
        plus._inverse = minus;
        // @ts-expect-error not worth marking the field as mutable
        minus._inverse = plus;
    }

    static createCommand<ErrorType extends Stringable = undefined>(
        name: string,
        executor: CommandExecutor<ErrorType>,
        info: CommandInfo
    ): void {
        new Command(name, executor, info);
    }

    private constructor(
        name: string,
        executor: CommandExecutor<ErrorType>,
        info: CommandInfo,
        creatingPair?: boolean
    ) {
        const anyLetterAndUnderscore = "A-Z-a-z_";
        const firstCharacterRegEx = `[${creatingPair
            ? `${anyLetterAndUnderscore}+-`
            : anyLetterAndUnderscore
        }]`;
        const commandNameRegExpFilter = new RegExp(
            `^${firstCharacterRegEx}[${anyLetterAndUnderscore}0-9]*$`
        );

        if (!name.match(commandNameRegExpFilter)) {
            throw new Error(
                `Command names must be comprised only of alphanumeric characters and underscores, and their name's first character cannot be a number. (Received '${name}')`
            );
        }

        this._name = name;
        this._executor = executor;
        this._info = info;

        if (this._info.signatures.length === 0) {
            console.warn(`No signatures given for command '${this._name}'`);
        } else {
            this._info.signatures.forEach((signature, index) => {
                const args = signature.args;

                if (args.length === 0) return;

                for (
                    let i = 0, l = args.length - 2, arg = args[0];
                    i < l;
                    i++, arg = args[i]
                ) {
                    if (arg.rest) {
                        // @ts-expect-error not worth making the prop mutable just for this edge-case
                        arg.rest = false;
                        console.warn(
                            `Found illegal rest argument in info string of command '${this._name}' (signature ${index}, argument '${arg.name}', position ${i})`
                        );
                    }
                }

                if (new Set(args.map(arg => arg.name)).size !== args.length) {
                    console.error(
                        `Found duplicate argument names in info string of command '${this._name}' (signature ${index})`
                    );
                }
            });
        }

        if (GameConsole.commands.has(this._name)) {
            console.warn(`Overwriting command '${this._name}'`);
        }
        GameConsole.commands.set(this._name, this);
    }

    toString(): string {
        return this._name;
    }
}

export function setUpCommands(): void {
    const keybinds = InputManager.binds;

    const createMovementCommand = (
        name: keyof typeof InputManager["movement"],
        spectateAction?: Exclude<SpectateActions, SpectateActions.SpectateSpecific>
    ): void => {
        Command.createInvertiblePair(
            name,
            spectateAction
                ? () => {
                    InputManager.movement[name] = true;
                    if (Game.spectating) {
                        Game.sendPacket(
                            SpectatePacket.create({
                                spectateAction
                            })
                        );
                    }
                }
                : () => {
                    InputManager.movement[name] = true;
                },
            () => {
                InputManager.movement[name] = false;
            },
            {
                short: `Moves the player in the '${name}' direction`,
                long: `Starts moving the player in the '${name}' direction when invoked`,
                allowOnlyWhenGameStarted: true,
                signatures: [
                    {
                        args: [],
                        noexcept: true
                    }
                ]
            },
            {
                short: `Halts the player's movement in the '${name}' direction`,
                long: `Stops moving the player in the '${name}' direction when invoked`,
                allowOnlyWhenGameStarted: true,
                signatures: [
                    {
                        args: [],
                        noexcept: true
                    }
                ]
            }
        );
    };

    createMovementCommand("up");
    createMovementCommand("left", SpectateActions.SpectatePrevious);
    createMovementCommand("down");
    createMovementCommand("right", SpectateActions.SpectateNext);

    // shut
    /*
        Normally, arrow function would be preferred, but since
        the callbacks have their `this` value bound, leaving them as
        function expressions instead of arrow functions allows us to
        quickly switch to using `this` if needed, instead of having to
        change back from an arrow function
    */
    /* eslint-disable prefer-arrow-callback */
    Command.createCommand(
        "slot",
        function(slot) {
            const slotNumber = Casters.toInt(slot ?? "NaN");
            if ("err" in slotNumber) {
                return { err: `Attempted to swap to invalid slot '${slot}'` };
            }

            InputManager.addAction({
                type: InputActions.EquipItem,
                slot: slotNumber.res
            });
        },
        {
            short: "Attempts to switch to the item in a given slot. The slot number is 0-indexed",
            long:
                "When invoked, an attempt to swap to the slot passed in argument will be made. The slot number "
                + "is zero-indexed, meaning that 0 designates the first slot, 1 designates the second and 2 designates the third",
            allowOnlyWhenGameStarted: true,
            signatures: [
                {
                    args: [
                        {
                            name: "id",
                            type: ["number"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "last_item",
        function() {
            InputManager.addAction(InputActions.EquipLastItem);
        },
        {
            short: "Attempts to switch to the last item the player deployed",
            long: "When invoked, the player's last active slot will be switched to, if possible",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "other_weapon",
        function() {
            const { weapons, activeWeaponIndex } = UIManager.inventory;
            let index
                = activeWeaponIndex === 0 || (
                    weapons[0] === undefined
                    && activeWeaponIndex !== 1
                )
                    ? 1
                    : 0;

            // fallback to melee if there's no weapon on the slot
            if (weapons[index] === undefined) { index = 2; }
            InputManager.addAction({
                type: InputActions.EquipItem,
                slot: index
            });
        },
        {
            short: "Attempts to switch to the other weapon in the player's inventory",
            long: "When invoked, the player will swap to the other weapon slot if there is a weapon there. If not, melee will be switched to",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "swap_gun_slots",
        function() {
            InputManager.addAction(InputActions.SwapGunSlots);
        },
        {
            short: "Exchanges the guns' slots in the player's inventory",
            long:
                "When invoked, the item in slot 0 will be placed in slot 1 and vice versa. Empty slots are treated normally, meaning "
                + "that invoking this command with only one gun in an inventory will send it to the other slot, leaving the original slot empty",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "cycle_items",
        function(offset) {
            const step = Casters.toInt(offset ?? "NaN");

            if ("err" in step) {
                return {
                    err: `Attempted to cycle items by an invalid offset of '${offset}' slots`
                };
            }

            let index = Numeric.absMod(
                UIManager.inventory.activeWeaponIndex + step.res,
                GameConstants.player.maxWeapons
            );

            let iterationCount = 0;
            while (!UIManager.inventory.weapons[index]) {
                index = Numeric.absMod(index + step.res, GameConstants.player.maxWeapons);

                /*
                    If, through some weirdness/oversight, the while loop were
                    to run forever, this would prevent that
                */
                if (++iterationCount > 100) {
                    index = UIManager.inventory.activeWeaponIndex;
                    break;
                }
            }

            InputManager.addAction({
                type: InputActions.EquipItem,
                slot: index
            });
        },
        {
            short: "Switches to the item <em>n</em> slots over, where <em>n</em> is some integer",
            long:
                "When invoked with an integer argument <em>n</em>, the slot offset from the current one by <em>n</em> slots will be "
                + "switched to. If the offset is beyond the slots' range (< 0 or > 2), wrap-around is performed. Empty slots are ignored "
                + "and cannot be swapped to",
            allowOnlyWhenGameStarted: true,
            signatures: [
                {
                    args: [
                        {
                            name: "offset",
                            type: ["integer"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "interact",
        function() {
            InputManager.addAction(InputActions.Interact);
        },
        {
            short: "Interacts with an object, if there is one",
            long: "When invoked, the player will attempt to interact with the closest interactable object that is in range.",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    for (const [cmdName, action, shortDesc, longDesc] of [
        [
            "lock_slot",
            InputActions.LockSlot,
            "Locks a slot, rendering it immutable",
            "Locks a weapon slot. A locked weapon slot cannot have its weapon changed, neither by dropping it, "
            + "nor by replacing the weapon with one on the ground. However, locked slots may still be swapped via"
            + "<code>swap_gun_slots</code>, which will transfer the lock appropriately. Use <code>unlock_slot</code> "
            + "to undo a lock."
        ],
        [
            "unlock_slot",
            InputActions.UnlockSlot,
            "Unlocks a slot, rendering it mutable",
            "Unlocks a weapon slot. A locked weapon slot cannot have its weapon changed, neither by dropping it, "
            + "nor by replacing the weapon with one on the ground. However, locked slots may still be swapped via"
            + "<code>swap_gun_slots</code>, which will transfer the lock appropriately. Use <code>lock_slot</code> "
            + "to lock a slot."

        ],
        [
            "toggle_slot_lock",
            InputActions.ToggleSlotLock,
            "Toggles the lock on a slot, either locking or unlocking it",
            "Either locks or unlocks a weapon slot. Locked slots cannot have their contents changed."

        ]
    ] as ReadonlyArray<
        readonly [
            string,
            (
                InputAction extends infer I
                    ? I extends { readonly slot: number }
                        ? I
                        : never
                    : never
            )["type"],
            string,
            string
        ]
    >) {
        Command.createCommand(
            cmdName,
            function(slot) {
                let target = UIManager.inventory.activeWeaponIndex;

                if (slot) { // <- excludes explicit empty string
                    const newTarget = Casters.toInt(slot ?? "NaN");

                    if ("err" in newTarget) {
                        return {
                            err: `Cannot lock invalid slot '${slot}'`
                        };
                    }

                    target = newTarget.res;
                }

                InputManager.addAction({
                    type: action,
                    slot: target
                });
            },
            {
                short: shortDesc,
                long: longDesc,
                allowOnlyWhenGameStarted: true,
                signatures: [
                    {
                        args: [
                            {
                                name: "target",
                                type: ["integer"],
                                optional: true
                            }
                        ],
                        noexcept: false
                    }
                ]
            }
        );
    }

    Command.createCommand(
        "loot",
        function() {
            InputManager.addAction(InputActions.Loot);
        },
        {
            short: "Loots closest object",
            long: "When invoked, the player will attempt to pick up the closest loot that is in range.",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createInvertiblePair(
        "attack",
        function() {
            if (InputManager.attacking) return;

            InputManager.attacking = true;
        },
        function() {
            if (!InputManager.attacking) return;

            InputManager.attacking = false;
        },
        {
            short: "Starts attacking",
            long: "When invoked, the player will start trying to attack as if the attack button was held down. Does nothing if the player is attacking",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        },
        {
            short: "Stops attacking",
            long: "When invoked, the player will stop trying to attack, as if the attack button was released. Does nothing if the player isn't attacking",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "drop",
        function() {
            InputManager.addAction({
                type: InputActions.DropWeapon,
                slot: UIManager.inventory.activeWeaponIndex
            });
        },
        {
            short: "Drops the current active item",
            long: "When invoked, the player will attempt to drop the item they're currently holding",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "cycle_scopes",
        function(offset) {
            const step = Casters.toInt(offset ?? "NaN");

            if ("err" in step) {
                return {
                    err: `Attempted to cycle scopes by an invalid offset of '${offset}'`
                };
            }
            InputManager.cycleScope(step.res);
        },
        {
            short: "Switches to the scope <em>n</em> slots over, where <em>n</em> is some integer",
            long:
                "When invoked with an integer argument <em>n</em>, the scope offset from the current one by <em>n</em> slots will be "
                + "switched to. If the offset is beyond the slots' range, wrap-around is performed if the user has "
                + "<code>cl_loop_scope_selection</code> set to <code>true</code>",
            allowOnlyWhenGameStarted: true,
            signatures: [
                {
                    args: [
                        {
                            name: "offset",
                            type: ["integer"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "equip_or_cycle_throwables",
        function(offset) {
            // If we're already on a throwable slot, start cycling. Otherwise, make that slot active
            if (Game.activePlayer?.activeItem.itemType === ItemType.Throwable) {
                const step = Casters.toInt(offset ?? "NaN");

                if ("err" in step) {
                    return {
                        err: `Attempted to cycle throwables by an invalid offset of '${offset}'`
                    };
                }

                InputManager.cycleThrowable(step.res);
            } else {
                const throwableSlot = GameConstants.player.inventorySlotTypings.findIndex(slot => slot === ItemType.Throwable);

                if (throwableSlot !== -1) {
                    InputManager.addAction({
                        type: InputActions.EquipItem,
                        slot: throwableSlot
                    });
                }
            }
        },
        {
            short: "Selects the throwable slot, but if it already is, then switches to the throwable <em>n</em> slots over, where <em>n</em> is some integer",
            long:
                "When invoked, this command will switch to the first throwable slot it finds if the active slot isn't a throwable slot—in this case, the "
                + "'offset' argument is ignored. If a throwable slot is selected, then the throwable offset from the current one by <em>n</em> slots will be "
                + "selected, with the indices wrapping around if need be",
            allowOnlyWhenGameStarted: true,
            signatures: [
                {
                    args: [
                        {
                            name: "offset",
                            type: ["integer"],
                            optional: true
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand<ReferenceTo<HealingItemDefinition | ScopeDefinition>>(
        "use_consumable",
        function(idString) {
            // This is technically unneeded, since "undefined in {}" returns false, but
            // for the sake of typescript (and the better error message), I'll leave it in
            if (idString === undefined) {
                return { err: "Expected a string argument, received nothing" };
            }

            if (
                ![...HealingItems, ...Scopes, ...Throwables].some(h => h.idString === idString)
            ) {
                return {
                    err: `There is no scope, consumable, nor throwable whose idString is '${idString}'`
                };
            }

            InputManager.addAction({
                type: InputActions.UseItem,
                item: Loots.fromString(idString)
            });
        },
        {
            short: "Uses the item designated by the given <code>idString</code>",
            long: "When invoked with a string argument, an attempt will be made to use the consumable, scope, or throwable whose <code>idString</code> matches it",
            allowOnlyWhenGameStarted: true,
            signatures: [
                {
                    args: [
                        {
                            name: "idString",
                            type: ["string"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "cancel_action",
        function() {
            InputManager.addAction(InputActions.Cancel);
        },
        {
            short: "Cancels the action (reloading and or consuming) the player is currently executing",
            long: "When invoked, the current action the player is executing will be stopped, if there is one",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createInvertiblePair(
        "view_map",
        function() {
            MapManager.switchToBigMap();
        },
        function() {
            MapManager.switchToSmallMap();
        },
        {
            short: "Shows the game map",
            long: "When invoked, the fullscreen map will be toggled",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        },
        {
            short: "Hides the game map",
            long: "When invoked, the fullscreen map will be hidden",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "reload",
        function() {
            InputManager.addAction(InputActions.Reload);
        },
        {
            short: "Reloads the current active item",
            long: "When invoked, the player will attempt to reload the item they're currently holding",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "explode_c4",
        function() {
            InputManager.addAction(InputActions.ExplodeC4);
        },
        {
            short: "Explodes all deployed pieces of C4 belonging to this player",
            long: "When invoked, the game will attempt to detonate all pieces of C4 this player has deployed.",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createInvertiblePair(
        "emote_wheel",
        function() {
            EmoteWheelManager.enabled = true;
        },
        function() {
            EmoteWheelManager.enabled = false;
        },
        {
            short: "Opens the emote wheel",
            long: "When invoked, the emote wheel will be opened, allowing the user to pick an emote",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        },
        {
            short: "Closes the emote wheel, using the designated emote, if any",
            long: "When invoked, the emote wheel will be closed, and if an emote has been selected, it will be displayed",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createInvertiblePair(
        "map_ping_wheel",
        function() {
            MapPingWheelManager.enabled = true;
            UIManager.updateRequestableItems();
        },
        function() {
            MapPingWheelManager.enabled = false;
            UIManager.updateRequestableItems();
        },
        {
            short: "Enables the emote wheel's ping mode",
            long: "When invoked, the map ping wheel will be opened, allowing the user to pick a map ping",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        },
        {
            short: "Disables the emote wheel's ping mode",
            long: "When invoked, the map ping wheel will be closed, and if a map ping has been selected, it will be displayed",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "screenshot_map",
        function() {
            // create a new sprite since the map one has opacity
            const sprite = new Sprite();
            sprite.texture = MapManager.sprite.texture;
            const canvas = Game.pixi.renderer.extract.canvas(sprite);
            if (canvas.toBlob) {
                canvas.toBlob(blob => {
                    if (blob) window.open(URL.createObjectURL(blob));
                });
            } else {
                return { err: "canvas.toBlob is undefined" };
            }
            sprite.destroy();
        },
        {
            short: "Screenshot the game map texture and open it on a new tab as a blob image",
            long: "Attempts to generate a downloadable image from the minimap's contents, then opening that image in a new tab",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: false }]
        }
    );

    Command.createCommand(
        "screenshot_game",
        function() {
            const { width, height, container } = CameraManager;

            const rectangle = new Rectangle(
                CameraManager.position.x - (width / 2 / container.scale.x),
                CameraManager.position.y - (height / 2 / container.scale.y),
                width / container.scale.x,
                height / container.scale.y
            );

            const canvas = Game.pixi.renderer.extract.canvas({
                clearColor: Game.colors.grass,
                target: container,
                frame: rectangle,
                resolution: container.scale.x,
                antialias: true
            });

            if (canvas.toBlob) {
                canvas.toBlob(blob => {
                    if (blob) window.open(URL.createObjectURL(blob));
                });
            } else {
                return { err: "canvas.toBlob is undefined" };
            }
        },
        {
            short: "Screenshot the game camera and open it on a new tab as a blob image",
            long: "Attempts to take a screenshot of the game without any of its HUD elements, and then attempts to open this image in a new tab",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: false }]
        }
    );

    Command.createCommand(
        "disconnect",
        function() {
            void Game.endGame();
        },
        {
            short: "Leaves the current game",
            long: "When invoked, the player is disconnected from their current game",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "clear",
        function() {
            GameConsole.clear();
        },
        {
            short: "Clears the console",
            long: "When invoked, the game console's contents will be erased",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "clear_history",
        function() {
            GameConsole.clearHistory();
        },
        {
            short: "Clears the query history",
            long: "When invoked, the game console's history is cleared",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "echo",
        function(...messages): undefined {
            GameConsole.log.raw(messages.join(" "));
        },
        {
            short: "Echoes whatever is passed to it",
            long: "When invoked with any number of arguments, the arguments will be re-printed to the console in same order they were given",
            signatures: [
                {
                    args: [
                        {
                            name: "args",
                            optional: true,
                            type: ["string[]"],
                            rest: true
                        }
                    ],
                    noexcept: true
                }
            ]
        }
    );

    const isMac = navigator.userAgent.match(/mac|darwin/ig);
    Command.createCommand(
        "bind",
        function(key, query) {
            if (key === undefined || query === undefined) {
                return {
                    err: `Expected 2 arguments, received ${arguments.length}`
                };
            }

            keybinds.addActionsToInput(key.length > 1 ? key : key.toUpperCase(), query);
            GameConsole.writeToLocalStorage();
            InputManager.generateBindsConfigScreen();
        },
        {
            short: "Binds an input to an action",
            long:
                "Given the name of an input (such as a key or mouse button) and a console query, this command establishes a new link between the two.<br><p>"
                + "For alphanumeric keys, simply giving the key as-is (e.g. \"a\", or \"1\") will do. However, keys with no textual representation, or that represent "
                + "punctuation will have to given by name, such as \"Enter\" or \"Period\".</p><p>"
                + "Note that actions bound to mouse buttons or the scroll wheel/trackpad will only be triggered when ingame, and that binding to mouse "
                + "side-buttons is unreliable.</p><p>"
                + "For the scroll wheel, the encoding is simply <code>MWheel</code>, followed by the capitalized direction (ex: <code>MWheelUp</code>)<br>"
                + "Remember that if your query contains spaces, you must enclose the whole query in double quotes (\"\") so that it is properly parsed.</p><p>"
                + "Note that Escape and Backspace may be used to bind actions, but doing so must be done through the console and cannot be done through "
                + "the settings menu. Also note that Escape will always bring up the pause menu, and that this cannot be changed</p><p>"

                + "<details><summary>Full list of inputs and their corresponding names</summary><ul>"

                + "<li><details><summary>Alphanumeric keys (case insensitive)</summary>"
                + `<table style="text-align: center"><thead><tr><td>Input</td><td>"Console" name</td></tr></thead><tbody>${(
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("").map(
                        s => [s, s] as const
                    )
                ).map(([name, code]) => `<tr><td>${name}</td><td><code>${code}</td></tr>`).join("")}</tbody></table>`
                + "</details></li>"

                + "<li><details><summary>Modifier keys, system keys, and others (case sensitive)</summary>"
                + `<table style="text-align: center"><thead><tr><td>Input</td><td>"Console" name</td></tr></thead><tbody>${(
                    [
                        ["Shift ⇧", "Shift"],
                        [isMac ? "Command ⌘" : "Windows ⊞", "Meta"],
                        [isMac ? "Option ⌥" : "Alt", "Alt"],
                        [isMac ? "Control ⌃" : "Control", "Control"],
                        ["Escape ⎋", "Escape"],
                        ["Backspace ←", "Backspace"],
                        ["Tab ⇆", "Tab"],
                        ["Caps Lock ⇪", "CapsLock"],
                        ["Enter ↵", "Enter"],
                        ["§", "IntlBackslash"],
                        ["Left arrow", "ArrowLeft"],
                        ["Right arrow", "ArrowRight"],
                        ["Up arrow", "ArrowUp"],
                        ["Down arrow", "ArrowDown"],
                        ["Lock numpad", "NumLock"],
                        ["Home", "Home"],
                        ["Page up", "PageUp"],
                        ["Page down", "PageDown"],
                        ["Clear", "Clear"],
                        ["End", "End"],
                        ["Insert", "Insert"],
                        ["Print Screen", "PrintScreen"],
                        ["Scroll Lock", "ScrollLock"],
                        ["Pause", "Pause"],
                        ["Numpad add", "NumpadAdd"],
                        ["Numpad subtract", "NumpadSubtract"],
                        ["Numpad multiply", "NumpadMultiply"],
                        ["Numpad divide", "NumpadDivide"],
                        ["Numpad period", "NumpadDecimal"],
                        ["Numpad equal", "NumpadEqual"],
                        ["Numpad enter", "NumpadEnter"]
                    ] as ReadonlyArray<readonly [string, string]>
                ).map(([name, code]) => `<tr><td>${name}</td><td><code>${code}</td></tr>`).join("")}</tbody>`
                + `<tfoot><tr><td colspan=2>Note that for keys appearing in two locations, (namely ${[
                    "Shift",
                    isMac ? "Command" : "Windows",
                    isMac ? "Option" : "Alt",
                    "Control"
                ].map(s => `<code>${s}</code>`).join(", ")
                }) it is possible to bind either the left or right variant only. For example, binding only left Shift `
                + "can be done with <code>LeftShift</code>, and right Shift can be done with <code>RightShift</code>; in all "
                + "cases, <code>Shift</code> will allow both the left and right variant to trigger the action</td></tr></tfoot></table>"
                + "</details></li>"

                + "<li><details><summary>Number pad—<code>NumLock</code> required (case sensitive)</summary>"
                + `<table style="text-align: center"><thead><tr><td>Input</td><td>"Console" name</td></tr></thead><tbody>${(
                    Array.from(
                        { length: 10 },
                        (_, i) => [`Number pad ${i}`, `Numpad${i}`] as const
                    )
                ).map(([name, code]) => `<tr><td>${name}</td><td><code>${code}</td></tr>`).join("")}</tbody></table>`
                + "</details></li>"

                + "<li><details><summary>Punctuation (case sensitive)</summary>"
                + `<table style="text-align: center"><thead><tr><td>Input</td><td>"Console" name</td></tr></thead><tbody>${(
                    [
                        ["Hyphen-minus (<code>-</code>)", "Minus"],
                        ["Equals (<code>=</code>)", "Equal"],
                        ["Opening square bracket (<code>[</code>)", "BracketLeft"],
                        ["Closing square bracket (<code>]</code>)", "BracketRight"],
                        ["Semicolon (<code>;</code>)", "Semicolon"],
                        ["Quote/apostrophe (<code>'</code>)", "Quote"],
                        ["Backslash (<code>\\</code>)", "Backslash"],
                        ["Comma (<code>,</code>)", "Comma"],
                        ["Period (<code>.</code>)", "Period"],
                        ["Forward slash (<code>/</code>)", "Slash"],
                        ["Backtick (<code>`</code>)", "Backquote"]
                    ] as ReadonlyArray<readonly [string, string]>
                ).map(([name, code]) => `<tr><td>${name}</td><td><code>${code}</td></tr>`).join("")}</tbody></table>`
                + "</details></li>"

                + "<li><details><summary>Function keys (case sensitive)</summary>"
                + `<table style="text-align: center"><thead><tr><td>Input</td><td>"Console" name</td></tr></thead><tbody>${(
                    Array.from(
                        { length: 24 },
                        (_, i) => [`F${++i}`, `F${i}`] as const
                    )
                ).map(([name, code]) => `<tr><td>${name}</td><td><code>${code}</td></tr>`).join("")}</tbody></table>`
                + "</details></li>"

                + "<li><details><summary>Mouse buttons (case sensitive)</summary>"
                + `<table style="text-align: center"><thead><tr><td>Input</td><td>"Console" name</td></tr></thead><tbody>${(
                    [
                        ["Primary (usually left click)", "Mouse0"],
                        ["Auxillary (usually middle click)", "Mouse1"],
                        ["Secondary (usually right click)", "Mouse2"],
                        ["Backwards (usually back-left side-button)", "Mouse3"],
                        ["Forwards (usually front-left side-button)", "Mouse4"]
                    ] as ReadonlyArray<readonly [string, string]>
                ).map(([name, code]) => `<tr><td>${name}</td><td><code>${code}</td></tr>`).join("")}</tbody></table>`
                + "</details></li>"

                + "<li><details><summary>Scroll wheel / trackpad (case sensitive)</summary>"
                + `<table style="text-align: center"><thead><tr><td>Input</td><td>"Console" name</td></tr></thead><tbody>${(
                    [
                        ["Scroll down", "MWheelDown"],
                        ["Scroll up", "MWheelUp"],
                        ["Scroll right", "MWheelRight"],
                        ["Scroll left", "MWheelLeft"],
                        ["Scroll forwards", "MWheelForwards"],
                        ["Scroll backwards", "MWheelBackwards"]
                    ] as ReadonlyArray<readonly [string, string]>
                ).map(([name, code]) => `<tr><td>${name}</td><td><code>${code}</td></tr>`).join("")}</tbody></table>`
                + "</details></li>"

                + "</ul></details><br>",
            signatures: [
                {
                    args: [
                        {
                            name: "input",
                            type: ["string"]
                        },
                        {
                            name: "query",
                            type: ["string"]
                        }
                    ],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "unbind",
        function(key) {
            if (key === undefined) {
                return { err: "Expected an argument, received none" };
            }

            keybinds.unbindInput(key.length > 1 ? key : key.toUpperCase());
            GameConsole.writeToLocalStorage();
            InputManager.generateBindsConfigScreen();
        },
        {
            short: "Removes all actions from a given input",
            long: "Given the name of an input (refer to the <code>bind</code> command for more information on naming), this command removes all actions bound to it",
            signatures: [
                {
                    args: [
                        {
                            name: "input",
                            type: ["string"]
                        }
                    ],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "unbind_all",
        function() {
            keybinds.unbindAll();
            GameConsole.writeToLocalStorage();
            InputManager.generateBindsConfigScreen();
        },
        {
            short: "Removes all keybinds",
            long: "When invoked, all inputs will have their actions removed. <b>This is a very dangerous command!!</b>",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "alias",
        function(name, query) {
            if (name === undefined || query === undefined) {
                return {
                    err: `Expected 2 arguments, received ${arguments.length}`
                };
            }

            if (GameConsole.commands.has(name)) {
                return { err: `Cannot override built-in command '${name}'` };
            }

            if (GameConsole.variables.has(name)) {
                return { err: `Cannot shadow cvar '${name}'` };
            }

            if (name.match(/^\w{2}_/)) {
                return { err: "Alias name must not match regular expression <code>^\\w{2}_</code>" };
            }

            GameConsole.aliases.set(name, query);

            GameConsole.writeToLocalStorage();
        },
        {
            short: "Creates a shorthand for a console query",
            long:
                "This command's first argument is the alias' name, and its second is the query; an <em>alias</em> is created, which can be called like any "
                + "other command. When the alias is called, the query said alias is bound to will be executed, as if it had been entered into the console manually.<br>"
                + 'If the query contains spaces, remember to wrap it in double quotes ("") so it can be parsed correctly. An alias\' name cannot match that '
                + "of a built-in command, nor can it start with two alphanumeric characters followed by an underscore (in other words, the name mustn't match "
                + "<code>^\\w{2}_</code>, because those prefixes may be used for future CVars). However, if it matches an existing alias, said existing alias "
                + "will be replaced by the new one",
            signatures: [
                {
                    args: [
                        {
                            name: "alias_name",
                            type: ["string"]
                        },
                        {
                            name: "query",
                            type: ["string"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "remove_alias",
        function(name, removeInverse) {
            if (name === undefined) {
                return { err: "Expected a string argument, received nothing" };
            }

            if (
                !GameConsole.aliases.delete(
                    name,
                    handleResult(Casters.toBoolean(removeInverse ?? "false"), () => false)
                )
            ) {
                return { err: `No alias by the name of '${name}' exists` };
            }

            GameConsole.writeToLocalStorage();
        },
        {
            short: "Removes an alias from the list of aliases",
            long:
                "When given the name of an alias, this command removes it from the list of alises if it exists. If <code>remove_inverse</code> "
                + "is set to <code>true</code> and the alias pointed to by <code>alias_name</code> is <em>invertible</em> (in other words, has "
                + "a <code>+</code> form and a <code>-</code> form, like <code>+command</code> and <code>-command</code>), then both aliases will "
                + "be removed. In this case, <code>alias_name</code> may be either one of the two forms, or the \"base\" name with no +/- (for "
                + "example, removing <code>+command</code> and <code>-command</code> could be done by calling <code>remove_alias command true</code>, "
                + "<code>remove_alias +command true</code>, or <code>remove_alias -command true</code>.) If <code>remove_inverse</code> is set to <code>"
                + "true</code> but the targeted alias is not invertible, the value of <code>remove_inverse</code> is ignored. <code>remove_inverse</code> "
                + "defaults to <code>false</code>.",
            signatures: [
                {
                    args: [
                        {
                            name: "alias_name",
                            type: ["string"]
                        },
                        {
                            name: "remove_inverse",
                            optional: true,
                            type: ["boolean"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "list_binds",
        function(key) {
            const logBinds = (
                key: string,
                actions: ReadonlyArray<Command<boolean, Stringable> | string | CompiledAction | CompiledTuple>
            ): void => {
                if (key === "") return;

                GameConsole.log.raw({
                    main: `Actions bound to input '${key}'`,
                    detail: actions
                        .map(bind => {
                            switch (true) {
                                case bind instanceof Command: return bind.name;
                                case typeof bind === "function": return bind.original;
                                case bind instanceof Array: return bind[0].original;
                                default: return bind;
                            }
                        })
                        .join("<br>")
                });
            };

            if (key) {
                const actions = keybinds.getActionsBoundToInput(key);

                if (actions.length) {
                    logBinds(key, actions);
                } else {
                    return {
                        err: `The input '${key}' hasn't been bound to any action`
                    };
                }
            } else {
                const ul = document.createElement("ul");

                ul.append(
                    ...keybinds.listBoundInputs()
                        .map(
                            input => {
                                const ul = document.createElement("ul");
                                ul.append(
                                    ...keybinds.getActionsBoundToInput(input)
                                        .map(e => {
                                            const li = document.createElement("li");

                                            switch (true) {
                                                case typeof e === "function": {
                                                    li.innerText = e.original; break;
                                                }
                                                case e instanceof Array: {
                                                    li.innerText = e[0].original; break;
                                                }
                                                default: {
                                                    li.innerText = e;
                                                    break;
                                                }
                                            }

                                            return li;
                                        })
                                );

                                const wrapper = document.createElement("li");
                                wrapper.append(input, ul);
                                return wrapper;
                            }
                        )
                );

                GameConsole.log.raw(ul.outerHTML);
            }
        },
        {
            short: "Lists all the actions bound to a key, or all the keys and their respective actions",
            long:
                "If this command is invoked without an argument, all keys which have an action to them will be printed, along with "
                + "the actions bound to each respective key. If it is invoked with an input's name, then only the actions bound to that input "
                + "will be shown, if any",
            signatures: [
                {
                    args: [],
                    noexcept: true
                },
                {
                    args: [
                        {
                            name: "input_name",
                            type: ["string"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "list_cvars",
        (): undefined => {
            GameConsole.log.raw({
                main: "List of CVars",
                detail: `<table>
                    <thead><tr>
                        <td>Flags</td>
                        <td>Name</td>
                        <td>Value</td>
                    </tr></thead>
                    <tbody>${GameConsole.variables.dump()}</tbody>
                </table>`
            });
        },
        {
            short: "Prints out the values of CVars",
            long: "When invoked, will print out every at-the-time registered CVar and its value. The value's color corresponds to its type:"
                + `<ul>${(
                    [
                        [null, "null"],
                        [undefined, "undefined"],
                        ["abcd", "string"],
                        [1234, "number"],
                        [false, "boolean"],
                        [5678n, "bigint"],
                        [Symbol.for("efgh"), "symbol"],
                        [function sin(x: number): void { /* lol ok */ }, "function"],
                        [{}, "object"]
                    ] as Array<[unknown, string]>
                ).map(([val, type]) => `<li><b>${type}</b>: <code class="cvar-value-${type}">${stringify(val)}</code></li>`).join("")}</ul>`,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "let",
        (name, value, type, archive, readonly) => {
            if (name === undefined || value === undefined) {
                return {
                    err: `Expected at least 2 arguments, received ${arguments.length}`
                };
            }

            if (!name.startsWith("uv_")) {
                return {
                    err: "Custom CVar name must start with <code>uv_</code>"
                };
            }

            if (!name.match(/^uv_[a-zA-Z0-9_]+$/)) {
                return {
                    err: "Custom CVar name be at least one character long (not including the prefix) and can only contain letters, numbers and underscores"
                };
            }

            if (GameConsole.variables.has.custom(name)) {
                return {
                    err: `Custom CVar '${name}' already exists. (To change its value to ${value}, do 'assign ${name} ${value}')`
                };
            }

            const caster: ((val: string) => Result<Stringable, string>) | undefined = {
                string: Casters.toString,
                number: Casters.toNumber,
                integer: Casters.toInt,
                boolean: Casters.toBoolean
            }[type ?? "string"];

            if (caster === undefined) {
                return { err: `Unknown type '${type}'` };
            }

            const cast = caster(value);
            if ("err" in cast) {
                return { err: `Provided type '${type}' does not match with provided value '${value}' (the given value is not assignable to the given type)` };
            }
            const casted = cast.res;

            GameConsole.variables.declareCVar(
                new ConVar<Stringable>(
                    name,
                    casted,
                    caster,
                    {
                        archive: handleResult(Casters.toBoolean(archive ?? "0"), () => false),
                        readonly: handleResult(Casters.toBoolean(readonly ?? "0"), () => false)
                    }
                )
            );
            GameConsole.writeToLocalStorage();
        },
        {
            short: "Creates a new custom console variable, with a name and value",
            long:
                "When invoked, this command attempts to create a new CVar with the given name and value. <b>Names must being with <code>uv_</code>, "
                + "must be at least one character long (not counting the prefix) and can only contain letters, numbers and underscores.</b> Invalid names will "
                + "result in an error.<br>"
                + "CVars marked as <code>archive</code> will be saved when the game closes and reinitialized when the game boots up again. Readonly CVars cannot "
                + "have their value changed after being created",
            signatures: [
                {
                    args: [
                        {
                            name: "name",
                            type: ["string"]
                        },
                        {
                            name: "value",
                            type: ["string", "number", "boolean"]
                        },
                        {
                            name: "type",
                            type: ["\"string\"", "\"number\"", "\"integer\"", "\"boolean\""],
                            optional: true
                        },
                        {
                            name: "archive",
                            type: ["boolean"],
                            optional: true
                        },
                        {
                            name: "readonly",
                            type: ["boolean"],
                            optional: true
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "assign",
        (name, value, forceWrite) => {
            if (name === undefined || value === undefined) {
                return {
                    err: `Expected 2 arguments, received ${arguments.length}`
                };
            }

            if (!GameConsole.variables.has(name)) {
                return {
                    err: `CVar '${name}' doesn't exist`
                };
            }

            const doForceWrite = Casters.toBoolean(forceWrite ?? "false");

            const retVal = GameConsole.variables.set(name, value);
            GameConsole.writeToLocalStorage({ includeNoArchive: "res" in doForceWrite && doForceWrite.res });

            return retVal;
        },
        {
            short: "Assigns a value to a CVar",
            long:
                "When invoked, this command attempts to assign a new value to a CVar. If the CVar is not archived, its "
                + "value can still be written to permanent storage by passing <code>true</code> to this command's third "
                + "parameter",
            signatures: [
                {
                    args: [
                        {
                            name: "name",
                            type: ["string"]
                        },
                        {
                            name: "value",
                            type: ["string", "number", "boolean"]
                        },
                        {
                            name: "forceWrite",
                            type: ["boolean"],
                            optional: true
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "toggle",
        (name, ...values) => {
            if (name === undefined) {
                return {
                    err: "Expected at least 1 argument, received none"
                };
            }

            let cvar: ConVar<Stringable> | undefined;
            if ((cvar = GameConsole.variables.get(name)) === undefined) {
                return {
                    err: `CVar '${name}' doesn't exist`
                };
            }

            if (values.length === 0) {
                values = ["true", "false"];
            }

            const index = values.indexOf(`${cvar.value}`);

            if (index === -1) {
                return {
                    err: `CVar '${name}' has a value not contained in the list of options (${cvar.value})`
                };
            }

            return GameConsole.variables.set(cvar.name, values[(index + 1) % values.length], true);
        },
        {
            short: "Cycles a CVar's value through a set of values",
            long:
                "When invoked, this command retrieves the CVar designated by <code>name</code>. If its current value is not in "
                + "<code>values</code>, or if the CVar doesn't exist, an error is thrown. Otherwise, the CVar is assigned to the "
                + "element in the list following the one corresponding to the current CVar's value. Any errors from this assignment are "
                + "rethrown by this command. Invoking this command with only a CVar's name is equivalent to passing in <code>true false</code>"
                + "for <code>values</code>",
            signatures: [
                {
                    args: [
                        {
                            name: "name",
                            type: ["string"]
                        },
                        {
                            name: "values",
                            type: ["string", "number", "boolean"],
                            optional: true,
                            rest: true
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "delete",
        function(name) {
            if (name === undefined) {
                return { err: "Expected a string argument, received nothing" };
            }

            if (GameConsole.variables.has.builtIn(name)) {
                return { err: `Cannot delete built-in CVar '${name}'` };
            }

            const err = GameConsole.variables.removeCVar(name);
            if (err === undefined) GameConsole.writeToLocalStorage();

            return err;
        },
        {
            short: "Removes a user CVar from the list of variables",
            long:
                "When given the name of a user variable, this command removes it from the list of variables. "
                + "Passing in the name of a built-in CVar causes an error",
            signatures: [
                {
                    args: [
                        {
                            name: "variable_name",
                            type: ["string"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "list_alias",
        function(name) {
            if (name === undefined) {
                return { err: "Expected a string argument, received nothing" };
            }

            const alias = GameConsole.aliases.get(name);

            if (alias !== undefined) {
                GameConsole.log.raw(`Alias '${name}' is defined as <code>${sanitizeHTML(alias)}</code>`);
            } else {
                return { err: `No alias named '${name}' exists` };
            }
        },
        {
            short: "Gives the definition of an alias",
            long: "When given the name of an alias, if that alias exists, this command will print the query associated with it",
            signatures: [
                {
                    args: [
                        {
                            name: "alias_name",
                            type: ["string"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "help",
        function(name) {
            if (name === undefined) {
                GameConsole.log({
                    main: "List of commands",
                    detail: Array.from(GameConsole.commands.keys())
                });
                GameConsole.log({
                    main: "List of aliases",
                    detail: Array.from(GameConsole.aliases.keys())
                });
                return;
            }

            const command = GameConsole.commands.get(name);

            if (!command) {
                return { err: `Cannot find command named '${name}'` };
            }

            const info = command.info;
            GameConsole.log.raw({
                main: info.short,
                detail: [
                    info.long,
                    ...info.signatures.map(signature => {
                        const noexcept = "noexcept" in signature && signature.noexcept
                            ? '<span class="command-desc-noexcept">noexcept</span> '
                            : "";
                        const commandName = `<span class="command-desc-cmd-name">${command.name}</span>`;
                        const args = signature.args.length
                            ? ` ${signature.args
                                .map(
                                    arg =>
                                        `<em>${arg.rest ? ".." : ""}${arg.name}${arg.optional ? "?" : ""}: ${arg.type
                                            .map(type => `<span class="command-desc-arg-type">${type}</span>`)
                                            .join(" | ")
                                        }</em>`
                                )
                                .join(", ")}`
                            : "";

                        return `<code>${noexcept + commandName + args}</code>`;
                    })
                ]
            });
        },
        {
            short: "Displays help about a certain command, or a list of commands and aliases",
            long:

                "If given the name of a command, this command logs that command's help info, along with its signatures.<br>"
                + "The signatures of a command are all the different possible ways in can be invoked. Each signature follows "
                + "the following format: <code>noexcept-marker? command-name params</code>"
                + `<ul>${(
                    [
                        ["noexcept-marker", "If included, it indicates that this signature never returns an error. Styled as blue, bold and in italics"],
                        ["command-name", "Simply the command's name. Styled as bold and yellow"],
                        [
                            "params",
                            "A space-separated list of parameters, where each parameter follows the form <em><code>name: type</code></em>,"
                            + " where <code>name</code> is the parameter's name and <code>type</code> is its data type"
                        ]
                    ] as Array<[string, string]>
                ).map(([name, desc]) => `<li><code>${name}</code>: ${desc}</li>`).join("")}</ul>`
                + "If not given an argument, this command logs a list of all defined commands and aliases. "
                + "Passing the name of an alias to this command results in an error. "
                + "If you want to see the query bound to an alias, use <code>list_alias</code>",
            signatures: [
                {
                    args: [],
                    noexcept: true
                },
                {
                    args: [
                        {
                            name: "command_name",
                            type: ["string"]
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "throw",
        function(doThrow) {
            if (handleResult(Casters.toBoolean(doThrow ?? "false"), () => false)) {
                return { err: "Thrown error" };
            }
        },
        {
            short: "Optionally throws a value. For debugging purposes",
            long: "If supplied with a truthy argument, this command raises an exception; otherwise, it does nothing.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                },
                {
                    args: [{
                        name: "doThrow",
                        type: ["boolean"]
                    }],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand(
        "dump_client_info",
        function(raw): undefined {
            const data = {
                version: APP_VERSION,
                api_url: API_URL,
                client_protocol_version: GameConstants.protocolVersion,
                pixi: {
                    version: VERSION,
                    renderer_info: {
                        type: RendererType[Game.pixi.renderer.type],
                        resolution: Game.pixi.renderer.resolution
                    }
                },
                user_agent: {
                    ua_string: navigator.userAgent,
                    language: navigator.language,
                    online: navigator.onLine
                },
                regions: Config.regions as unknown as Record<string, ServerInfo>,
                default_region: Config.defaultRegion
            };

            if (handleResult(Casters.toBoolean(raw ?? "false"), () => false)) {
                GameConsole.log.raw(
                    JSON.stringify(data, null, 2)
                        .replace(/\n| /g, r => ({ "\n": "<br>", " ": "&nbsp;" }[r] ?? ""))
                );
            } else {
                GameConsole.log.raw(
                    (function construct(obj: Record<string, unknown>): string {
                        let retVal = "<ul>";

                        for (const [key, value] of Object.entries(obj)) {
                            retVal += `<li><b>${key}</b>: ${
                                typeof value === "object" && value !== null && !(value instanceof Date)
                                    ? construct(value as Record<string, unknown>)
                                    : String(value)
                            }</li>`;
                        }

                        return `${retVal}</ul>`;
                    })({
                        ...data,
                        regions: Object.fromEntries(
                            Object.entries(data.regions).map(
                                ([k, v]) => [
                                    k,
                                    {
                                        ...v,
                                        ...(typeof v.teamSizeSwitchTime === "number" ? { teamSizeSwitchTime: new Date(v.teamSizeSwitchTime) } : {}),
                                        ...(typeof v.teamSize === "number" ? { teamSize: TeamSize[v.teamSize] } : {})
                                    }
                                ]
                            )
                        )
                    })
                );
            }
        },
        {
            short: "Gives info about the client",
            long: "Dumps a variety of information about the current client. For debugging purposes. If <code>raw</code> is set to true, "
                + "the data is outputted as raw JSON; otherwise, it is displayed in a list (default option).",
            signatures: [
                {
                    args: [
                        {
                            name: "raw",
                            type: ["boolean"],
                            optional: true
                        }
                    ],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "screen_record",
        function() {
            if (ScreenRecordManager.recording) ScreenRecordManager.endRecording();
            else void ScreenRecordManager.beginRecording();
        },
        {
            short: "Use the screen recorder",
            long: "If the screen recorder is not recording, begin recording. If the screen recorder is recording, stop recording",
            allowOnlyWhenGameStarted: true,
            signatures: [{ args: [], noexcept: false }]
        }
    );

    Command.createCommand(
        "fullscreen",
        requestFullscreen,
        {
            short: "Fullscreen",
            long: "Activate fullscreen mode",
            signatures: [{ args: [], noexcept: false }]
        }
    );

    GameConsole.handleQuery(`
        alias +map_ping "+emote_wheel; +map_ping_wheel" & alias -map_ping "-emote_wheel; -map_ping_wheel";\
        alias toggle_minimap "toggle cv_minimap_minimized";\
        alias toggle_hud "toggle cv_draw_hud";\
        alias toggle_map "toggle cv_map_expanded";\
        alias toggle_console "toggle cv_console_open";
    `, "never");
}
