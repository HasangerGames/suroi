import { InputActions, INVENTORY_MAX_WEAPONS } from "../../../../../common/src/constants";
import { HealingItems, type HealingItemDefinition } from "../../../../../common/src/definitions/healingItems";
import { type LootDefinition, Loots } from "../../../../../common/src/definitions/loots";
import { Scopes, type ScopeDefinition } from "../../../../../common/src/definitions/scopes";
import { absMod } from "../../../../../common/src/utils/math";
import { reifyDefinition, type ReferenceTo } from "../../../../../common/src/utils/objectDefinitions";
import { v } from "../../../../../common/src/utils/vector";
import { type Game } from "../../game";
import { EmoteSlot } from "../constants";
import { generateBindsConfigScreen } from "../inputManager";
import { type PlayerManager } from "../playerManager";
import { aliases, commands, gameConsole, keybinds, type PossibleError, type Stringable } from "./gameConsole";
import { consoleVariables, ConVar } from "./variables";

type CommandExecutor<ErrorType = never> = (this: Game, ...args: Array<string | undefined>) => PossibleError<ErrorType>;

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

export class Command<Invertible extends boolean = false, ErrorType extends Stringable | never = never> {
    private readonly _name: string;
    get name(): string { return this._name; }

    private readonly _executor: CommandExecutor<ErrorType>;
    run(args: Array<string | undefined> = []): PossibleError<ErrorType> { return this._executor.call(this._game, ...args); }

    private readonly _game: Game;

    private readonly _inverse!: Invertible extends true ? Command<true> : undefined;
    get inverse(): Invertible extends true ? Command<true> : undefined { return this._inverse; }

    private readonly _info: CommandInfo;
    get info(): CommandInfo { return this._info; }

    static createInvertiblePair<ErrorType extends Stringable | never = never>(name: string, on: CommandExecutor<ErrorType>, off: CommandExecutor<ErrorType>, game: Game, infoOn: CommandInfo, infoOff?: CommandInfo): void {
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

        //@ts-expect-error not worth marking the field as not mutable
        plus._inverse = minus;
        //@ts-expect-error not worth marking the field as not mutable
        minus._inverse = plus;
    }

    static createCommand<ErrorType extends Stringable | never = never>(name: string, executor: CommandExecutor<ErrorType>, game: Game, info: CommandInfo): void {
        /* eslint-disable no-new */
        new Command(name, executor, game, info);
    }

    private constructor(name: string, executor: CommandExecutor<ErrorType>, game: Game, info: CommandInfo, creatingPair?: boolean) {
        const anyLetterAndUnderscore = "A-Z-a-z_";
        const firstCharacterRegEx = `[${creatingPair ? `${anyLetterAndUnderscore}+-` : anyLetterAndUnderscore}]`;
        const commandNameRegExpFilter = new RegExp(`^${firstCharacterRegEx}[${anyLetterAndUnderscore}0-9]*$`);

        if (!name.match(commandNameRegExpFilter)) {
            throw new Error(`Command names must be comprised only of alphanumeric characters and underscores, and their name's first character cannot be a number. (Received '${name}')`);
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
                        console.warn(`Found illegal rest argument in info string of command '${this._name}' (signature ${index}, argument '${arg.name}', position ${i})`);
                    }
                }

                if (new Set(args.map(arg => arg.name)).size !== args.length) {
                    console.error(`Found duplicate argument names in info string of command '${this._name}' (signature ${index})`);
                }
            });
        }

        if (commands.has(this._name)) {
            console.warn(`Overwriting command '${this._name}'`);
        }
        commands.set(this._name, this);
    }

    toString(): string {
        return this._name;
    }
}

export function setUpCommands(game: Game): void {
    const createMovementCommand = (name: keyof PlayerManager["movement"]): void => {
        Command.createInvertiblePair(
            name,
            function(): undefined {
                this.playerManager.movement[name] = true;
            },
            function(): undefined {
                this.playerManager.movement[name] = false;
            },
            game,
            {
                short: `Moves the player in the '${name}' direction.`,
                long: `Starts moving the player in the '${name}' direction when invoked.`,
                signatures: [
                    {
                        args: [],
                        noexcept: true
                    }
                ]
            },
            {
                short: `Halts the player's movement in the '${name}' direction.`,
                long: `Stops moving the player in the '${name}' direction when invoked.`,
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
    createMovementCommand("left");
    createMovementCommand("down");
    createMovementCommand("right");

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
            const slotNumber = +(slot ?? "");
            if (Number.isNaN(slotNumber)) {
                return { err: `Attempted to swap to invalid slot '${slot}'` };
            }

            this.playerManager.equipItem(slotNumber);
        },
        game,
        {
            short: "Attempts to switch to the item in a given slot. The slot number is 0-indexed.",
            long: "When invoked, an attempt to swap to the slot passed in argument will be made. The slot number " +
                "is zero-indexed, meaning that 0 designates the first slot, 1 designates the second and 2 designates the third.",
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
            const player = this.playerManager;

            player.equipItem(player.lastItemIndex);
        },
        game,
        {
            short: "Attempts to switch to the last item the player deployed.",
            long: "When invoked, the player's last active slot will be switched to, if possible.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "other_weapon",
        function(): undefined {
            const player = this.playerManager;
            let index = player.activeItemIndex > 1
                ? 0
                : 1 - player.activeItemIndex;

            // fallback to melee if there's no weapon on the slot
            if (player.weapons[index] === undefined) index = 2;
            player.equipItem(index);
        },
        game,
        {
            short: "Attempts to switch to the other weapon in the player's inventory.",
            long: "When invoked, the player will swap to the other weapon slot if there is a weapon there. If not, melee will be switched to.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "swap_gun_slots",
        function(): undefined {
            this.playerManager.swapGunSlots();
        },
        game,
        {
            short: "Exchanges the guns' slots in the player's inventory.",
            long: "When invoked, the item in slot 0 will be placed in slot 1 and vice versa. Empty slots are treated normally, meaning " +
                "that invoking this command with only one gun in an inventory will send it to the other slot, leaving the original slot empty.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand<string>(
        "cycle_items",
        function(offset) {
            const step = +(offset ?? "");

            //                         ______________|> decimal check
            if (Number.isNaN(step) || (step % 1 !== 0)) {
                return { err: `Attempted to cycle items by an invalid offset of '${offset}' slots` };
            }

            const player = game.playerManager;

            let index = absMod((player.activeItemIndex + step), INVENTORY_MAX_WEAPONS);

            let iterationCount = 0;
            while (!player.weapons[index]) {
                index = absMod((index + step), INVENTORY_MAX_WEAPONS);

                /*
                    If, through some weirdness/oversight, the while loop were
                    to run forever, this would prevent that
                */
                if (++iterationCount > 100) {
                    index = player.activeItemIndex;
                    break;
                }
            }

            player.equipItem(index);
        },
        game,
        {
            short: "Switches to the item <em>n</em> slots over, where <em>n</em> is some integer.",
            long: "When invoked with an integer argument <em>n</em>, the slot offset from the current one by <em>n</em> slots will be " +
                "switched to. If the offset is beyond the slots' range (< 0 or > 2), wrap-around is performed. Empty slots are ignored " +
                "and cannot be swapped to.",
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
            this.playerManager.interact();
        },
        game,
        {
            short: "Interacts with an object, if there is one",
            long: "When invoked, the player will attempt to interact with the closest interactable object that is in range",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createInvertiblePair(
        "attack",
        function(): undefined {
            const player = this.playerManager;
            if (player.attacking) return;

            player.attacking = true;
        },
        function(): undefined {
            const player = this.playerManager;
            if (!player.attacking) return;

            player.attacking = false;
        },
        game,
        {
            short: "Starts attacking",
            long: "When invoked, the player will start trying to attack as if the attack button was held down. Does nothing if the player isn't attacking.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        },
        {
            short: "Stops attacking",
            long: "When invoked, the player will stop trying to attack, as if the attack button was released. Does nothing if the player isn't attacking.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "drop",
        function(): undefined {
            this.playerManager.dropItem(this.playerManager.activeItemIndex);
        },
        game,
        {
            short: "Drops the current active item",
            long: "When invoked, the player will attempt to drop the item they're currently holding",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand<string>(
        "cycle_scopes",
        function(offset) {
            const step = +(offset ?? "");

            //                         ______________|> decimal check
            if (Number.isNaN(step) || (step % 1 !== 0)) {
                return { err: `Attempted to cycle scopes by an invalid offset of '${offset}'` };
            }
            game.playerManager.cycleScope(step);
        },
        game,
        {
            short: "Switches to the scope <em>n</em> slots over, where <em>n</em> is some integer.",
            long: "When invoked with an integer argument <em>n</em>, the scope offset from the current one by <em>n</em> slots will be " +
                "switched to. If the offset is beyond the slots' range (< 0 or > 2), wrap-around is performed if the user has " +
                "<code>cl_loop_scope_selection</code> set to <code>true</code>.",
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

    Command.createCommand<ReferenceTo<HealingItemDefinition>>(
        "use_consumable",
        function(idString) {
            // This is technically unneeded, since "undefined in {}" returns false, but
            // for the sake of typescript (and the better error message), I'll leave it in
            if (idString === undefined) {
                return { err: "Expected a string argument, received nothing." };
            }

            if (!(HealingItems as Array<HealingItemDefinition | ScopeDefinition>).concat(Scopes).some(h => h.idString === idString)) {
                return { err: `No consumable with idString '${idString}' exists.` };
            }

            game.playerManager.useItem(reifyDefinition<LootDefinition, HealingItemDefinition | ScopeDefinition>(idString, Loots));
        },
        game,
        {
            short: "Uses the item designated by the given <code>idString</code>.",
            long: "When invoked with a string argument, if a consumable item of that name exists, it will be used.",
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
            game.playerManager.cancelAction();
        },
        game,
        {
            short: "Cancels the action (reloading and or consuming) the player is currently executing",
            long: "When invoked, the current action the player is executing will be stopped, if there is one.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
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
            long: "When invoked, the fullscreen map will be toggled.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "toggle_minimap",
        function(): undefined {
            game.map.toggleMiniMap();
        },
        game,
        {
            short: "Toggles the game minimap",
            long: "When invoked, the minimap will be toggled.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "reload",
        function(): undefined {
            this.playerManager.reload();
        },
        game,
        {
            short: "Reloads the current active item",
            long: "When invoked, the player will attempt to reload the item they're currently holding",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "toggle_console",
        function(): undefined {
            gameConsole.toggle();
        },
        game,
        {
            short: "Toggles the game's console.",
            long: "When invoked, this command will close the console if it is open, and will open the console if it is closed.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createInvertiblePair(
        "emote_wheel",
        function(): undefined {
            if (game.gameOver) return;
            const player = game.playerManager;

            $("#emote-wheel")
                //                              ___|> mystery constant (hint: use translate(-50%, 50%) if you're trynna center)
                .css("left", `${player.mouseX - 143}px`)
                .css("top", `${player.mouseY - 143}px`)
                .css("background-image", 'url("./img/misc/emote_wheel.svg")')
                .show();
            player.emoteWheelActive = true;
            player.emoteWheelPosition = v(player.mouseX, player.mouseY);
        },
        function(): undefined {
            $("#emote-wheel").hide();
            const player = game.playerManager;

            switch (player.selectedEmoteSlot) {
                case EmoteSlot.Top: {
                    player.action = InputActions.TopEmoteSlot;
                    break;
                }
                case EmoteSlot.Right: {
                    player.action = InputActions.RightEmoteSlot;
                    break;
                }
                case EmoteSlot.Bottom: {
                    player.action = InputActions.BottomEmoteSlot;
                    break;
                }
                case EmoteSlot.Left: {
                    player.action = InputActions.LeftEmoteSlot;
                    break;
                }
            }

            player.dirty.inputs = true;
            player.emoteWheelActive = false;
            player.selectedEmoteSlot = EmoteSlot.None;
        },
        game,
        {
            short: "Opens the emote wheel",
            long: "When invoked, the emote wheel will be opened, allowing the user to pick an emote",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        },
        {
            short: "Closes the emote wheel, using the designated emote, if any",
            long: "When invoked, the emote wheel will be closed, and if an emote has been selected, it will be displayed",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
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
            long: "When invoked, the game console's contents will be erased.",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand(
        "echo",
        function(...messages): undefined {
            gameConsole.log((messages ?? []).join(" "));
        },
        game,
        {
            short: "Echoes whatever is passed to it.",
            long: "When invoked with any number of arguments, the arguments will be re-printed to the console in same order they were given.",
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
                return { err: `Expected 2 arguments, received ${arguments.length}` };
            }

            keybinds.addActionsToInput(key.toUpperCase(), query);
            gameConsole.writeToLocalStorage();
            generateBindsConfigScreen();
        },
        game,
        {
            short: "Binds an input to an action.",
            long: "Given the name of an input (such as a key or mouse button) and a console query, this command establishes a new link between the two.<br>" +
                "For alphanumeric keys, simply giving the ley as-is (e.g. \"a\", or \"1\") will do. However, keys with no textual representation, or that represent " +
                "punctuation will have to given by name, such as \"Enter\" or \"Period\".<br>" +
                "Remember that if your query contains spaces, you must enclose the whole query in double quotes (\"\") so that it is properly parsed.",
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

            keybinds.unbindInput(key.toUpperCase());
            gameConsole.writeToLocalStorage();
            generateBindsConfigScreen();
        },
        game,
        {
            short: "Removes all actions from a given input.",
            long: "Given the name of an input (refer to the <code>bind</code> command for more information on naming), this command removes all actions bound to it.",
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
            generateBindsConfigScreen();
        },
        game,
        {
            short: "Removes all keybinds.",
            long: "When invoked, all inputs will have their actions removed. <b>This is a very dangerous command!!</b>",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand<string>(
        "alias",
        function(name, query) {
            if (name === undefined || query === undefined) {
                return { err: `Expected 2 arguments, received ${arguments.length}` };
            }

            if (commands.has(name)) {
                return { err: `Cannot override built-in command '${name}'` };
            }

            if (consoleVariables.has(name)) {
                return { err: `Cannot shadow cvar '${name}'` };
            }

            aliases.set(name, query);

            gameConsole.writeToLocalStorage();
        },
        game,
        {
            short: "Creates a shorthand for a console query.",
            long: "This command's first argument is the alias' name, and its second is the query; an <em>alias</em> is created, which can be called like any " +
                "other command. When the alias is called, the query said alias is bound to will be executed, as if it had been entered into the console manually.<br>" +
                "If the query contains spaces, remember to wrap the whole thing in double quotes (\"\") so it can be parsed correctly. An alias' name cannot match that " +
                "of a built-in command. However, if it matches an existing alias, said existing alias will be replaced by the new one.",
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
        "list_binds",
        function(key) {
            const logBinds = (key: string, actions: Array<Command<boolean, Stringable> | string>): void => {
                if (key === "") return;
                gameConsole.log({
                    main: `Actions bound to input '${key}'`,
                    detail: actions.map(bind => bind instanceof Command ? bind.name : bind).join("\n")
                });
            };

            if (key) {
                const actions = keybinds.getActionsBoundToInput(key);

                if (actions.length) {
                    logBinds(key, actions);
                } else {
                    return { err: `The input '${key}' hasn't been bound to any action.` };
                }
            } else {
                for (const input of keybinds.listBoundInputs()) {
                    logBinds(input, keybinds.getActionsBoundToInput(input));
                }
            }
        },
        game,
        {
            short: "Lists all the actions bound to a key, or all the keys and their respective actions.",
            long: "If this command is invoked without an argument, all keys which have an action to them will be printed, along with " +
                "the actions bound to each respective key. If it is invoked with an input's name, then only the actions bound to that input " +
                "will be shown, if any.",
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
                detail: `<ul>${consoleVariables.dump()}</ul>`
            });
        },
        game,
        {
            short: "",
            long: "",
            signatures: [
                {
                    args: [],
                    noexcept: true
                }
            ]
        }
    );

    Command.createCommand<string>(
        "let",
        (name, value, archive, readonly) => {
            if (name === undefined || value === undefined) {
                return { err: `Expected at least 4 arguments, received ${arguments.length}.` };
            }

            if (!name.startsWith("uv_")) {
                return { err: "Custom CVar name must start with <code>uv_</code>." };
            }

            if (!name.match(/^uv_[a-zA-Z0-9_]+$/)) {
                return { err: "Custom CVar name be at least one character long (not including the prefix) and can only contain letters, numbers and underscores." };
            }

            if (consoleVariables.has.custom(name)) {
                return { err: `Custom CVar '${name}' already exists. (To change its value to ${value}, do <code>${name}=${value}</code>)` };
            }

            const toBoolean = (str: string | undefined): boolean => [undefined, "true", "false", "0", "1"].includes(str);

            consoleVariables.declareCVar(new ConVar<Stringable>(name, value, { archive: toBoolean(archive), readonly: toBoolean(readonly) }));
            gameConsole.writeToLocalStorage();
        },
        game,
        {
            short: "Creates a new custom console variable, with a name and value.",
            long: "When invoked, this command attempts to create a new CVar with the given name and value. <b>Names must being with <code>uv_</code>, " +
                "must be at least one character long (not counting the prefix) and can only contain letters, numbers and underscores.</b> Invalid names will " +
                "result in an error.<br>" +
                "CVars marked as <code>archive</code> will be saved when the game closes and reinitialized when the game boots up again. Readonly CVars cannot " +
                "have their value changed after being created.",
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
        "list_alias",
        function(name) {
            if (name === undefined) {
                return { err: "Expected a string argument, received nothing" };
            }

            const alias = aliases.get(name);

            if (alias) {
                gameConsole.log(`Alias '${name}' is defined as '${alias}'`);
            } else {
                return { err: `No alias named '${name}' exists` };
            }
        },
        game,
        {
            short: "Gives the definition of an alias.",
            long: "When given the name of an alias, if that alias exists, this command will print the query associated with it.",
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
                gameConsole.log({ main: "List of commands", detail: [...commands.keys()] });
                gameConsole.log({ main: "List of aliases", detail: [...aliases.keys()] });
                return;
            }

            const command = commands.get(name);

            if (!command) {
                return { err: `Cannot find command named '${name}'` };
            }

            const info = command.info;
            gameConsole.log.raw({
                main: info.short,
                detail: [
                    info.long,
                    ...info.signatures.map(
                        signature => {
                            const noexcept = signature.noexcept ? "<span class=\"command-desc-noexcept\">noexcept</span> " : "";
                            const commandName = `<span class="command-desc-cmd-name">${command.name}</span>`;
                            const args = signature.args.length
                                ? ` ${signature.args.map(
                                    arg => `<em>${arg.rest ? "..." : ""}${arg.name}${arg.optional ? "?" : ""}: ${arg.type.map(type => `<span class="command-desc-arg-type">${type}</span>`).join(" | ")}</em>`
                                ).join(", ")}`
                                : "";

                            return `<code>${noexcept + commandName + args}</code>`;
                        }
                    )
                ]
            });
        },
        game,
        {
            short: "Displays help about a certain command, or a list of commands and aliases.",
            long: "If given the name of a command, this command logs that command's help info. If not given an argument, this command " +
                "logs a list of all defined commands and aliases. Passing the name of an alias to this command results in an error.",
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
}
