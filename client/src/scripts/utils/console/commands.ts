// noinspection JSConstantReassignment
import $ from "jquery";
import { Rectangle, RendererType, Sprite, VERSION } from "pixi.js";
import { GameConstants, InputActions, SpectateActions } from "../../../../../common/src/constants";
import { HealingItems, type HealingItemDefinition } from "../../../../../common/src/definitions/healingItems";
import { Loots } from "../../../../../common/src/definitions/loots";
import { Scopes, type ScopeDefinition } from "../../../../../common/src/definitions/scopes";
import { Throwables } from "../../../../../common/src/definitions/throwables";
import { SpectatePacket } from "../../../../../common/src/packets/spectatePacket";
import { Numeric } from "../../../../../common/src/utils/math";
import { handleResult, type Result } from "../../../../../common/src/utils/misc";
import { ItemType, type ReferenceTo } from "../../../../../common/src/utils/objectDefinitions";
import { Vec } from "../../../../../common/src/utils/vector";
import { Config } from "../../config";
import { type Game } from "../../game";
import { COLORS } from "../constants";
import { type InputManager } from "../../managers/inputManager";
import { sanitizeHTML, stringify } from "../misc";
import { type PossibleError, type Stringable } from "./gameConsole";
import { Casters, ConVar } from "./variables";

type CommandExecutor<ErrorType = never> = (
    this: Game,
    ...args: Array<string | undefined>
) => PossibleError<ErrorType>;

interface CommandInfo {
    readonly short: string
    readonly long: string
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
    ErrorType extends Stringable | never = never
> {
    private readonly _name: string;
    get name(): string {
        return this._name;
    }

    private readonly _executor: CommandExecutor<ErrorType>;
    run(args: Array<string | undefined> = []): PossibleError<ErrorType> {
        return this._executor.call(this._game, ...args);
    }

    private readonly _game: Game;

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

    static createInvertiblePair<ErrorType extends Stringable | never = never>(
        name: string,
        on: CommandExecutor<ErrorType>,
        off: CommandExecutor<ErrorType>,
        game: Game,
        infoOn: CommandInfo,
        infoOff?: CommandInfo
    ): void {
        const plus = new Command<true, ErrorType>(
            `+${name}`,
            on,
            game,
            infoOn,
            true
        );
        const minus = new Command<true, ErrorType>(
            `-${name}`,
            off,
            game,
            infoOff ?? infoOn,
            true
        );

        // @ts-expect-error not worth marking the field as not mutable
        plus._inverse = minus;
        // @ts-expect-error not worth marking the field as not mutable
        minus._inverse = plus;
    }

    static createCommand<ErrorType extends Stringable | never = never>(
        name: string,
        executor: CommandExecutor<ErrorType>,
        game: Game,
        info: CommandInfo
    ): void {
        /* eslint-disable no-new */
        new Command(name, executor, game, info);
    }

    private constructor(
        name: string,
        executor: CommandExecutor<ErrorType>,
        game: Game,
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
        this._executor = executor.bind(game);
        this._game = game;
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
                        // @ts-expect-error meh
                        arg.rest = false;
                        console.warn(
                            `Found illegal rest argument in info string of command '${this._name}' (signature ${index}, argument '${arg.name}', position ${i})`
                        );
                    }
                }

                if (new Set(args.map((arg) => arg.name)).size !== args.length) {
                    console.error(
                        `Found duplicate argument names in info string of command '${this._name}' (signature ${index})`
                    );
                }
            });
        }

        if (game.console.commands.has(this._name)) {
            console.warn(`Overwriting command '${this._name}'`);
        }
        game.console.commands.set(this._name, this);
    }

    toString(): string {
        return this._name;
    }
}

export function setUpCommands(game: Game): void {
    const gameConsole = game.console;
    const keybinds = game.inputManager.binds;

    const createMovementCommand = (
        name: keyof InputManager["movement"],
        spectateAction?: SpectateActions
    ): void => {
        Command.createInvertiblePair(
            name,
            spectateAction
                ? function(): undefined {
                    this.inputManager.movement[name] = true;
                    if (this.spectating) {
                        const packet = new SpectatePacket();
                        packet.spectateAction = spectateAction;
                        this.sendPacket(packet);
                    }
                }
                : function(): undefined {
                    this.inputManager.movement[name] = true;
                },
            function(): undefined {
                this.inputManager.movement[name] = false;
            },
            game,
            {
                short: `Moves the player in the '${name}' direction`,
                long: `Starts moving the player in the '${name}' direction when invoked`,
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
        the callbacks have their this value bound, leaving them as
        function expressions instead of arrow functions allows us to
        quickly switch to using this if needed, instead of having to
        change back from an arrow function
    */
    /* eslint-disable prefer-arrow-callback */
    Command.createCommand<string>(
        "slot",
        function(slot) {
            const slotNumber = Casters.toInt(slot ?? "NaN");
            if ("err" in slotNumber) {
                return { err: `Attempted to swap to invalid slot '${slot}'` };
            }

            this.inputManager.addAction({
                type: InputActions.EquipItem,
                slot: slotNumber.res
            });
        },
        game,
        {
            short: "Attempts to switch to the item in a given slot. The slot number is 0-indexed",
            long:
                "When invoked, an attempt to swap to the slot passed in argument will be made. The slot number " +
                "is zero-indexed, meaning that 0 designates the first slot, 1 designates the second and 2 designates the third",
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
        function(): undefined {
            this.inputManager.addAction(InputActions.EquipLastItem);
        },
        game,
        {
            short: "Attempts to switch to the last item the player deployed",
            long: "When invoked, the player's last active slot will be switched to, if possible",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "other_weapon",
        function(): undefined {
            let index =
                this.uiManager.inventory.activeWeaponIndex === 0 || (
                    this.uiManager.inventory.weapons[0] === undefined &&
                    this.uiManager.inventory.activeWeaponIndex !== 1
                )
                    ? 1
                    : 0;

            // fallback to melee if there's no weapon on the slot
            if (this.uiManager.inventory.weapons[index] === undefined) { index = 2; }
            this.inputManager.addAction({
                type: InputActions.EquipItem,
                slot: index
            });
        },
        game,
        {
            short: "Attempts to switch to the other weapon in the player's inventory",
            long: "When invoked, the player will swap to the other weapon slot if there is a weapon there. If not, melee will be switched to",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "swap_gun_slots",
        function(): undefined {
            this.inputManager.addAction(InputActions.SwapGunSlots);
        },
        game,
        {
            short: "Exchanges the guns' slots in the player's inventory",
            long:
                "When invoked, the item in slot 0 will be placed in slot 1 and vice versa. Empty slots are treated normally, meaning " +
                "that invoking this command with only one gun in an inventory will send it to the other slot, leaving the original slot empty",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand<string>(
        "cycle_items",
        function(offset) {
            const step = Casters.toInt(offset ?? "NaN");

            if ("err" in step) {
                return {
                    err: `Attempted to cycle items by an invalid offset of '${offset}' slots`
                };
            }

            let index = Numeric.absMod(
                this.uiManager.inventory.activeWeaponIndex + step.res,
                GameConstants.player.maxWeapons
            );

            let iterationCount = 0;
            while (!this.uiManager.inventory.weapons[index]) {
                index = Numeric.absMod(index + step.res, GameConstants.player.maxWeapons);

                /*
                    If, through some weirdness/oversight, the while loop were
                    to run forever, this would prevent that
                */
                if (++iterationCount > 100) {
                    index = this.uiManager.inventory.activeWeaponIndex;
                    break;
                }
            }

            this.inputManager.addAction({
                type: InputActions.EquipItem,
                slot: index
            });
        },
        game,
        {
            short: "Switches to the item <em>n</em> slots over, where <em>n</em> is some integer",
            long:
                "When invoked with an integer argument <em>n</em>, the slot offset from the current one by <em>n</em> slots will be " +
                "switched to. If the offset is beyond the slots' range (< 0 or > 2), wrap-around is performed. Empty slots are ignored " +
                "and cannot be swapped to",
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
        function(): undefined {
            this.inputManager.addAction(InputActions.Interact);
        },
        game,
        {
            short: "Interacts with an object, if there is one",
            long: "When invoked, the player will attempt to interact with the closest interactable object that is in range",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "loot",
        function(): undefined {
            this.inputManager.addAction(InputActions.Loot);
        },
        game,
        {
            short: "Loots closest object",
            long: "Loots closest object, this command is also invoked with interact if there is no key bound to loot",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createInvertiblePair(
        "attack",
        function(): undefined {
            if (this.inputManager.attacking) return;

            this.inputManager.attacking = true;
        },
        function(): undefined {
            if (!this.inputManager.attacking) return;

            this.inputManager.attacking = false;
        },
        game,
        {
            short: "Starts attacking",
            long: "When invoked, the player will start trying to attack as if the attack button was held down. Does nothing if the player is attacking",
            signatures: [{ args: [], noexcept: true }]
        },
        {
            short: "Stops attacking",
            long: "When invoked, the player will stop trying to attack, as if the attack button was released. Does nothing if the player isn't attacking",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "drop",
        function(): undefined {
            this.inputManager.addAction({
                type: InputActions.DropWeapon,
                slot: this.uiManager.inventory.activeWeaponIndex
            });
        },
        game,
        {
            short: "Drops the current active item",
            long: "When invoked, the player will attempt to drop the item they're currently holding",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand<string>(
        "cycle_scopes",
        function(offset) {
            const step = Casters.toInt(offset ?? "NaN");

            if ("err" in step) {
                return {
                    err: `Attempted to cycle scopes by an invalid offset of '${offset}'`
                };
            }
            game.inputManager.cycleScope(step.res);
        },
        game,
        {
            short: "Switches to the scope <em>n</em> slots over, where <em>n</em> is some integer",
            long:
                "When invoked with an integer argument <em>n</em>, the scope offset from the current one by <em>n</em> slots will be " +
                "switched to. If the offset is beyond the slots' range, wrap-around is performed if the user has " +
                "<code>cl_loop_scope_selection</code> set to <code>true</code>",
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

    Command.createCommand<string>(
        "equip_or_cycle_throwables",
        function(offset) {
            // If we're already on a throwable slot, start cycling. Otherwise, make that slot active
            if (this.activePlayer?.activeItem.itemType === ItemType.Throwable) {
                const step = Casters.toInt(offset ?? "NaN");

                if ("err" in step) {
                    return {
                        err: `Attempted to cycle throwables by an invalid offset of '${offset}'`
                    };
                }

                game.inputManager.cycleThrowable(step.res);
            } else {
                const throwableSlot = GameConstants.player.inventorySlotTypings.findIndex(slot => slot === ItemType.Throwable);

                if (throwableSlot !== -1) {
                    this.inputManager.addAction({
                        type: InputActions.EquipItem,
                        slot: throwableSlot
                    });
                }
            }
        },
        game,
        {
            short: "Selects the throwable slot, but if it already is, then switches to the throwable <em>n</em> slots over, where <em>n</em> is some integer",
            long:
                "When invoked, this command will switch to the first throwable slot it finds if the active slot isn't a throwable slot—in this case, the " +
                "'offset' argument is ignored. If a throwable slot is selected, then the throwable offset from the current one by <em>n</em> slots will be " +
                "selected, with the indices wrapping around if need be",
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
                    err: `There is no scope, consumable nor throwable whose idString is '${idString}'`
                };
            }

            game.inputManager.addAction({
                type: InputActions.UseItem,
                item: Loots.fromString(idString)
            });
        },
        game,
        {
            short: "Uses the item designated by the given <code>idString</code>",
            long: "When invoked with a string argument, an attempt will be made to use the consumable, scope, or throwable whose <code>idString</code> matches it",
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
        function(): undefined {
            game.inputManager.addAction(InputActions.Cancel);
        },
        game,
        {
            short: "Cancels the action (reloading and or consuming) the player is currently executing",
            long: "When invoked, the current action the player is executing will be stopped, if there is one",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createInvertiblePair(
        "view_map",
        function(): undefined {
            game.map.switchToBigMap();
        },
        function(): undefined {
            game.map.switchToSmallMap();
        },
        game,
        {
            short: "Shows the game map",
            long: "When invoked, the fullscreen map will be toggled",
            signatures: [{ args: [], noexcept: true }]
        },
        {
            short: "Hides the game map",
            long: "When invoked, the fullscreen map will be hidden",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "toggle_map",
        function(): undefined {
            game.map.toggle();
        },
        game,
        {
            short: "Toggles the game map",
            long: "When invoked, the fullscreen map will be toggled",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "toggle_minimap",
        function(): undefined {
            if (!$("canvas").hasClass("over-hud")) {
                game.console.setBuiltInCVar("cv_minimap_minimized", !game.console.getBuiltInCVar("cv_minimap_minimized"));
            }
        },
        game,
        {
            short: "Toggles the game minimap",
            long: "When invoked, the minimap will be toggled",
            signatures: [{ args: [], noexcept: true }]
        }
    );
    Command.createCommand(
        "toggle_hud",
        function(): undefined {
            $("#game-ui").toggle();
            if (game.map.visible) { game.map.toggleMinimap(); }
        },
        game,
        {
            short: "Toggles the game HUD",
            long: "When invoked, the Heads Up Display will be toggled",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "reload",
        function(): undefined {
            game.inputManager.addAction(InputActions.Reload);
        },
        game,
        {
            short: "Reloads the current active item",
            long: "When invoked, the player will attempt to reload the item they're currently holding",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "toggle_console",
        function(): undefined {
            gameConsole.toggle();
        },
        game,
        {
            short: "Toggles the game's console",
            long: "When invoked, this command will close the console if it is open, and will open the console if it is closed",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createInvertiblePair(
        "emote_wheel",
        function(): undefined {
            if (game.console.getBuiltInCVar("cv_hide_emotes")) return;
            if (this.gameOver) return;
            const { mouseX, mouseY } = this.inputManager;

            const scale = this.console.getBuiltInCVar("cv_ui_scale");

            if (!this.inputManager.pingWheelMinimap) {
                this.inputManager.pingWheelPosition = Vec.clone(this.inputManager.gameMousePosition);
            }

            $("#emote-wheel")
                .css("left", `${mouseX / scale}px`)
                .css("top", `${mouseY / scale}px`)
                .css("background-image", 'url("./img/misc/emote_wheel.svg")')
                .show();
            this.inputManager.emoteWheelActive = true;
            this.inputManager.emoteWheelPosition = Vec.create(mouseX, mouseY);
        },
        function(): undefined {
            if (this.inputManager.emoteWheelActive) {
                this.inputManager.emoteWheelActive = false;
                this.inputManager.pingWheelMinimap = false;

                $("#emote-wheel").hide();

                if (this.inputManager.selectedEmote === undefined) return;

                const emote = this.uiManager.emotes[this.inputManager.selectedEmote];
                if (emote && !this.inputManager.pingWheelActive) {
                    this.inputManager.addAction({
                        type: InputActions.Emote,
                        emote
                    });
                } else if (this.inputManager.pingWheelActive) {
                    this.inputManager.addAction({
                        type: InputActions.MapPing,
                        ping: this.uiManager.mapPings[this.inputManager.selectedEmote],
                        position: this.inputManager.pingWheelPosition
                    });
                }
                this.inputManager.selectedEmote = undefined;
            }
        },
        game,
        {
            short: "Opens the emote wheel",
            long: "When invoked, the emote wheel will be opened, allowing the user to pick an emote",
            signatures: [{ args: [], noexcept: true }]
        },
        {
            short: "Closes the emote wheel, using the designated emote, if any",
            long: "When invoked, the emote wheel will be closed, and if an emote has been selected, it will be displayed",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createInvertiblePair(
        "map_ping_wheel",
        function(): undefined {
            this.inputManager.pingWheelActive = true;
            this.uiManager.updateEmoteWheel();
        },
        function(): undefined {
            this.inputManager.pingWheelActive = false;
            this.uiManager.updateEmoteWheel();
        },
        game,
        {
            short: "Enables the emote wheel to ping mode",
            long: "When invoked, the emote wheel will switch from triggering emotes to trigger map pings",
            signatures: [{ args: [], noexcept: true }]
        },
        {
            short: "Disables the emote wheel's ping mode",
            long: "When invoked, the emote wheel will revert back to trigger emotes",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "screenshot_map",
        function() {
            // create a new sprite since the map one has opacity
            const sprite = new Sprite();
            sprite.texture = game.map.sprite.texture;
            const canvas = game.pixi.renderer.extract.canvas(sprite);
            if (canvas.toBlob) {
                canvas.toBlob((blob) => {
                    if (blob) window.open(URL.createObjectURL(blob));
                });
            } else {
                return { err: "canvas.toBlob is undefined" };
            }
            sprite.destroy();
        },
        game,
        {
            short: "Screenshot the game map texture and open it on a new tab as a blob image",
            long: "Attempts to generate a downloadable image from the minimap's contents, then opening that image in a new tab",
            signatures: [{ args: [], noexcept: false }]
        }
    );

    Command.createCommand(
        "screenshot_game",
        function() {
            const { width, height } = game.camera;
            const container = game.camera.container;

            const rectangle = new Rectangle(
                game.camera.position.x - (width / 2 / container.scale.x),
                game.camera.position.y - (height / 2 / container.scale.y),
                width / container.scale.x,
                height / container.scale.y
            );

            const canvas = game.pixi.renderer.extract.canvas({
                clearColor: COLORS.grass,
                target: container,
                frame: rectangle,
                resolution: container.scale.x,
                antialias: true
            });

            if (canvas.toBlob) {
                canvas.toBlob((blob) => {
                    if (blob) window.open(URL.createObjectURL(blob));
                });
            } else {
                return { err: "canvas.toBlob is undefined" };
            }
        },
        game,
        {
            short: "Screenshot the game camera and open it on a new tab as a blob image",
            long: "Attempts to take a screenshot of the game without any of its HUD elements, and then attempts to open this image in a new tab",
            signatures: [{ args: [], noexcept: false }]
        }
    );

    Command.createCommand(
        "disconnect",
        function(): undefined {
            this.endGame();
        },
        game,
        {
            short: "Leaves the current game",
            long: "When invoked, the player is disconnected from their current game",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "clear",
        function(): undefined {
            gameConsole.clear();
        },
        game,
        {
            short: "Clears the console",
            long: "When invoked, the game console's contents will be erased",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "clear_history",
        function(): undefined {
            gameConsole.clearHistory();
        },
        game,
        {
            short: "Clears the query history",
            long: "When invoked, the game console's history is cleared",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand(
        "echo",
        function(...messages): undefined {
            gameConsole.log.raw((messages ?? []).join(" "));
        },
        game,
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

    Command.createCommand<string>(
        "bind",
        function(key, query) {
            if (key === undefined || query === undefined) {
                return {
                    err: `Expected 2 arguments, received ${arguments.length}`
                };
            }

            keybinds.addActionsToInput(key.length > 1 ? key : key.toUpperCase(), query);
            gameConsole.writeToLocalStorage();
            this.inputManager.generateBindsConfigScreen();
        },
        game,
        {
            short: "Binds an input to an action",
            long:
                "Given the name of an input (such as a key or mouse button) and a console query, this command establishes a new link between the two.<br>" +
                'For alphanumeric keys, simply giving the key as-is (e.g. "a", or "1") will do. However, keys with no textual representation, or that represent ' +
                'punctuation will have to given by name, such as "Enter" or "Period".<br>' +
                `For mouse buttons, the encodings are as follows:<br><table><tbody>${(
                    [
                        ["Primary (usually left click)", "Mouse0"],
                        ["Auxillary (usually middle click)", "Mouse1"],
                        ["Secondary (usually right click)", "Mouse2"],
                        ["Backwards (usually back-left side-button)", "Mouse3"],
                        ["Forwards (usually front-left side-button)", "Mouse4"]
                    ] as Array<[string, string]>
                ).map(([name, code]) => `<tr><td>${name}</td><td><code>${code}</td></tr>`).join("")
                }</tbody></table>` +
                "For the scroll wheel, the encoding is simply <code>MWheel</code>, followed by the capitalized direction (ex: <code>MWheelUp</code>)<br>" +
                'Remember that if your query contains spaces, you must enclose the whole query in double quotes ("") so that it is properly parsed.',
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

    Command.createCommand<string>(
        "unbind",
        function(key) {
            if (key === undefined) {
                return { err: "Expected an argument, received none" };
            }

            keybinds.unbindInput(key.length > 1 ? key : key.toUpperCase());
            gameConsole.writeToLocalStorage();
            this.inputManager.generateBindsConfigScreen();
        },
        game,
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
        function(): undefined {
            keybinds.unbindAll();
            gameConsole.writeToLocalStorage();
            this.inputManager.generateBindsConfigScreen();
        },
        game,
        {
            short: "Removes all keybinds",
            long: "When invoked, all inputs will have their actions removed. <b>This is a very dangerous command!!</b>",
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand<string>(
        "alias",
        function(name, query) {
            if (name === undefined || query === undefined) {
                return {
                    err: `Expected 2 arguments, received ${arguments.length}`
                };
            }

            if (gameConsole.commands.has(name)) {
                return { err: `Cannot override built-in command '${name}'` };
            }

            if (gameConsole.variables.has(name)) {
                return { err: `Cannot shadow cvar '${name}'` };
            }

            if (name.match(/^\w{2}_/)) {
                return { err: "Alias name must not match regular expression <code>^\\w{2}_</code>" };
            }

            gameConsole.aliases.set(name, query);

            gameConsole.writeToLocalStorage();
        },
        game,
        {
            short: "Creates a shorthand for a console query",
            long:
                "This command's first argument is the alias' name, and its second is the query; an <em>alias</em> is created, which can be called like any " +
                "other command. When the alias is called, the query said alias is bound to will be executed, as if it had been entered into the console manually.<br>" +
                'If the query contains spaces, remember to wrap it in double quotes ("") so it can be parsed correctly. An alias\' name cannot match that ' +
                "of a built-in command, nor can it start with two alphanumeric characters followed by an underscore (in other words, the name mustn't match " +
                "<code>^\\w{2}_</code>, because those prefixes may be used for future CVars). However, if it matches an existing alias, said existing alias " +
                "will be replaced by the new one",
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

    Command.createCommand<string>(
        "remove_alias",
        function(name) {
            if (name === undefined) {
                return { err: "Expected a string argument, received nothing" };
            }

            if (!gameConsole.aliases.delete(name)) {
                return { err: `No alias by the name of '${name}' exists` };
            }

            gameConsole.writeToLocalStorage();
        },
        game,
        {
            short: "Removes an alias from the list of aliases",
            long: "When given the name of an alias, this command removes it from the list of alises if it exists",
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

    Command.createCommand<string>(
        "list_binds",
        function(key) {
            const logBinds = (
                key: string,
                actions: Array<Command<boolean, Stringable> | string>
            ): void => {
                if (key === "") return;

                gameConsole.log.raw({
                    main: `Actions bound to input '${key}'`,
                    detail: actions
                        .map(bind => bind instanceof Command ? bind.name : bind)
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
                for (const input of keybinds.listBoundInputs()) {
                    logBinds(input, keybinds.getActionsBoundToInput(input));
                }
            }
        },
        game,
        {
            short: "Lists all the actions bound to a key, or all the keys and their respective actions",
            long:
                "If this command is invoked without an argument, all keys which have an action to them will be printed, along with " +
                "the actions bound to each respective key. If it is invoked with an input's name, then only the actions bound to that input " +
                "will be shown, if any",
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

    Command.createCommand<string>(
        "list_cvars",
        (): undefined => {
            gameConsole.log.raw({
                main: "List of CVars",
                detail: `<ul>${gameConsole.variables.dump()}</ul>`
            });
        },
        game,
        {
            short: "Prints out the values of CVars",
            long: "When invoked, will print out every at-the-time registered CVar and its value. The value's color corresponds to its type:" +
            `<ul>${(
                [
                    [null, "null"],
                    [undefined, "undefined"],
                    ["abcd", "string"],
                    [1234, "number"],
                    [false, "boolean"],
                    [5678n, "bigint"],
                    [Symbol.for("efgh"), "symbol"],
                    [function sin(x: number): void {}, "function"],
                    [{}, "object"]
                ] as Array<[unknown, string]>
            ).map(([val, type]) => `<li><b>${type}</b>: <code class="cvar-value-${type}">${stringify(val)}</code></li>`).join("")}</ul>`,
            signatures: [{ args: [], noexcept: true }]
        }
    );

    Command.createCommand<string>(
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

            if (gameConsole.variables.has.custom(name)) {
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

            gameConsole.variables.declareCVar(
                new ConVar<Stringable>(
                    name,
                    casted,
                    gameConsole,
                    caster,
                    {
                        archive: handleResult(Casters.toBoolean(archive ?? "0"), () => false),
                        readonly: handleResult(Casters.toBoolean(readonly ?? "0"), () => false)
                    }
                )
            );
            gameConsole.writeToLocalStorage();
        },
        game,
        {
            short: "Creates a new custom console variable, with a name and value",
            long:
                "When invoked, this command attempts to create a new CVar with the given name and value. <b>Names must being with <code>uv_</code>, " +
                "must be at least one character long (not counting the prefix) and can only contain letters, numbers and underscores.</b> Invalid names will " +
                "result in an error.<br>" +
                "CVars marked as <code>archive</code> will be saved when the game closes and reinitialized when the game boots up again. Readonly CVars cannot " +
                "have their value changed after being created",
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

    Command.createCommand<string>(
        "assign",
        (name, value) => {
            if (name === undefined || value === undefined) {
                return {
                    err: `Expected 2 arguments, received ${arguments.length}`
                };
            }

            if (!gameConsole.variables.has(name)) {
                return {
                    err: `CVar '${name}' doesn't exist`
                };
            }

            const retVal = gameConsole.variables.set(name, value);
            gameConsole.writeToLocalStorage();

            return retVal;
        },
        game,
        {
            short: "Assigns a value to a CVar",
            long: "When invoked, this command attempts to assign a new value to a CVar",
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
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand<string>(
        "toggle",
        (name, ...values) => {
            if (name === undefined) {
                return {
                    err: "Expected at least 1 argument, received none"
                };
            }

            if (!gameConsole.variables.has(name)) {
                return {
                    err: `CVar '${name}' doesn't exist`
                };
            }

            const cvar = gameConsole.variables.get(name)!;

            if (values.length === 0) {
                values = ["true", "false"];
            }

            const index = values.indexOf(`${cvar.value}`);

            if (index === -1) {
                return {
                    err: `CVar '${name}' has a value not contained in the list of options (${cvar.value})`
                };
            }

            return cvar.setValue(values[(index + 1) % values.length]);
        },
        game,
        {
            short: "Cycles a CVar's value through a set of values",
            long:
                "When invoked, this command retrieves the CVar designated by <code>name</code>. If its current value is not in " +
                "<code>values</code>, or if the CVar doesn't exist, an error is thrown. Otherwise, the CVar is assigned to the " +
                "element in the list following the one corresponding to the current CVar's value. Any errors from this assignment are " +
                "rethrown by this command. Invoking this command with only a CVar's name is equivalent to passing in <code>true false</code>" +
                "for <code>values</code>",
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
                            rest: true
                        }
                    ],
                    noexcept: false
                }
            ]
        }
    );

    Command.createCommand<string>(
        "delete",
        function(name) {
            if (name === undefined) {
                return { err: "Expected a string argument, received nothing" };
            }

            if (gameConsole.variables.has.builtIn(name)) {
                return { err: `Cannot delete built-in CVar '${name}'` };
            }

            const err = gameConsole.variables.removeCVar(name);
            if (err === undefined) gameConsole.writeToLocalStorage();

            return err;
        },
        game,
        {
            short: "Removes a user CVar from the list of variables",
            long:
                "When given the name of a user variable, this command removes it from the list of variables. " +
                "Passing in the name of a built-in CVar causes an error",
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

    Command.createCommand<string>(
        "list_alias",
        function(name) {
            if (name === undefined) {
                return { err: "Expected a string argument, received nothing" };
            }

            const alias = gameConsole.aliases.get(name);

            if (alias) {
                gameConsole.log.raw(`Alias '${name}' is defined as <code>${sanitizeHTML(alias)}</code>`);
            } else {
                return { err: `No alias named '${name}' exists` };
            }
        },
        game,
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

    Command.createCommand<string>(
        "help",
        function(name) {
            if (name === undefined) {
                gameConsole.log({
                    main: "List of commands",
                    detail: [...gameConsole.commands.keys()]
                });
                gameConsole.log({
                    main: "List of aliases",
                    detail: [...gameConsole.aliases.keys()]
                });
                return;
            }

            const command = gameConsole.commands.get(name);

            if (!command) {
                return { err: `Cannot find command named '${name}'` };
            }

            const info = command.info;
            gameConsole.log.raw({
                main: info.short,
                detail: [
                    info.long,
                    ...info.signatures.map((signature) => {
                        const noexcept = "noexcept" in signature && signature.noexcept
                            ? '<span class="command-desc-noexcept">noexcept</span> '
                            : "";
                        const commandName = `<span class="command-desc-cmd-name">${command.name}</span>`;
                        const args = signature.args.length
                            ? ` ${signature.args
                                .map(
                                    (arg) =>
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
        game,
        {
            short: "Displays help about a certain command, or a list of commands and aliases",
            long:
                // eslint-disable-next-line prefer-template
                "If given the name of a command, this command logs that command's help info, along with its signatures.<br>" +
                "The signatures of a command are all the different possible ways in can be invoked. Each signature follows " +
                "the following format: <code>noexcept-marker? command-name params</code>" +
                `<ul>${(
                    [
                        ["noexcept-marker", "If included, it indicates that this signature never returns an error. Styled as blue, bold and in italics"],
                        ["command-name", "Simply the command's name. Styled as bold and yellow"],
                        [
                            "params",
                            "A space-separated list of parameters, where each parameter follows the form <em><code>name: type</code></em>," +
                            " where <code>name</code> is the parameter's name and <code>type</code> is its data type"
                        ]
                    ] as Array<[string, string]>
                ).map(([name, desc]) => `<li><code>${name}</code>: ${desc}</li>`).join("")}</ul>` +
                "If not given an argument, this command logs a list of all defined commands and aliases. " +
                "Passing the name of an alias to this command results in an error. " +
                "If you want to see the query bound to an alias, use <code>list_alias</code>",
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

    Command.createCommand<string>(
        "throw",
        function(doThrow) {
            if (handleResult(Casters.toBoolean(doThrow ?? "false"), () => false)) {
                return { err: "Thrown error" };
            }
        },
        game,
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

    Command.createCommand<string>(
        "dump_client_info",
        function(raw): undefined {
            const data = {
                version: APP_VERSION,
                api_url: API_URL,
                client_protocol_version: GameConstants.protocolVersion,
                pixi: {
                    version: VERSION,
                    renderer_info: {
                        type: RendererType[game.pixi.renderer.type],
                        resolution: game.pixi.renderer.resolution
                    }
                },
                user_agent: {
                    ua_string: navigator.userAgent,
                    language: navigator.language,
                    online: navigator.onLine
                },
                regions: Config.regions,
                mode: Config.mode,
                default_region: Config.defaultRegion
            };

            if (handleResult(Casters.toBoolean(raw ?? "false"), () => false)) {
                game.console.log.raw(
                    JSON.stringify(data, null, 2)
                        .replace(/\n| /g, r => ({ "\n": "<br>", " ": "&nbsp;" }[r] ?? ""))
                );
            } else {
                const construct = (obj: Record<string, unknown>, namespace = ""): string => {
                    let retVal = "<ul>";

                    for (const [key, value] of Object.entries(obj)) {
                        retVal += `<li><b>${key}</b>: ${typeof value === "object" && value !== null ? construct(value as Record<string, unknown>) : String(value)}</li>`;
                    }

                    return `${retVal}</ul>`;
                };

                game.console.log.raw(
                    construct(data)
                );
            }
        },
        game,
        {
            short: "Gives info about the client",
            long: "Dumps a variety of information about the current client. For debugging purposes. If <code>raw</code> is set to true, " +
                "the data is outputted as raw JSON; otherwise, it is displayed in a list (default option).",
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
}
