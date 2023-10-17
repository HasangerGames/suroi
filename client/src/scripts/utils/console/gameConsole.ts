import { clamp } from "../../../../../common/src/utils/math";
import { mergeDeep } from "../../../../../common/src/utils/misc";
import { type Game } from "../../game";
import { type Command, setUpCommands } from "./commands";
import { defaultBinds, defaultClientCVars } from "./defaultClientCVars";
import { consoleVariables, ConVar, type CVarFlags, type CVarTypeMapping } from "./variables";

enum MessageType {
    Log = "log",
    Important = "important",
    Warn = "warn",
    SevereWarn = "severe_warn",
    Error = "error",
    FatalError = "fatal_error"
}

interface ConsoleData {
    readonly timestamp: number
    readonly type: MessageType
    readonly content: string | {
        readonly main: string
        readonly detail: string | string[]
    }
}

export interface GameSettings {
    variables: Record<string, { value: Stringable, flags?: CVarFlags }>
    aliases: Record<string, string>
    binds: Record<string, string[]>
}

const readySystem = (() => {
    let isReady = false;
    const callbacks: Array<() => void> = [];

    return {
        get isReady() { return isReady; },
        markReady() {
            if (isReady) return;

            isReady = true;
            for (const callback of callbacks) {
                callback();
            }

            callbacks.length = 0;
            // destroy refs we no longer need
        },
        addReadyCallback(callback: () => void): void {
            callbacks.push(callback);
        }
    };
})();

// When opening the console with a key, the key will be typed to the console,
// because the keypress event is triggered for the input field
let invalidateNextCharacter = false;
export const gameConsole = new (class GameConsole {
    private _isOpen = false;
    get isOpen(): boolean { return this._isOpen; }
    set isOpen(value: boolean) {
        this._isOpen = value;

        if (this._isOpen) {
            this._ui.container.show();
            this._ui.input.trigger("focus");
            this._ui.input.val("");
            invalidateNextCharacter = true;
        } else {
            this._ui.container.hide();
        }
    }

    private readonly _ui = {
        container: $("#console-container"),
        header: $("#console-header"),
        closeButton: $("#console-close"),
        output: $("#console-out"),
        input: $("#console-in")
    };

    get isReady(): boolean { return readySystem.isReady; }
    addReadyCallback(callback: () => void): void {
        readySystem.addReadyCallback(callback);
    }

    private readonly _dimensions = (() => {
        let width = NaN;
        let height = NaN;

        /*
            eslint-disable @typescript-eslint/no-this-alias
        */
        // Whoever made this rule should use object literals more often
        const T = this;

        const proxy = {
            get width() { return width; },
            set width(w: number) {
                w = clamp(
                    w,
                    0,
                    window.innerWidth - (Number.isNaN(T._position?.left ?? NaN) ? -Infinity : T._position.left)
                );

                if (width !== w) {
                    consoleVariables.set.builtIn("cv_console_width", width = w);

                    if (!T._ui.container[0].style.width) {
                        T._ui.container.css("width", width);
                    }
                }
            },

            get height() { return height; },
            set height(h: number) {
                h = clamp(
                    h,
                    0,
                    window.innerHeight - (Number.isNaN(T._position?.top ?? NaN) ? -Infinity : T._position.top)
                );

                if (height !== h) {
                    consoleVariables.set.builtIn("cv_console_height", height = h);

                    if (!T._ui.container[0].style.height) {
                        T._ui.container.css("height", height);
                    }
                }
            }
        };

        return proxy;
    })();

    private readonly _position = (() => {
        let left = NaN;
        let top = NaN;

        const magicalPadding /* that prevents scroll bars from showing up */ = 1;

        const T = this;

        const proxy = {
            get left() { return left; },
            set left(l: number) {
                l = clamp(
                    l,
                    0,
                    window.innerWidth - T._dimensions.width - magicalPadding
                );

                if (left !== l) {
                    consoleVariables.set.builtIn("cv_console_left", left = l);

                    if (!T._ui.container[0].style.left) {
                        T._ui.container.css("left", left);
                    }
                }
            },

            get top() { return top; },
            set top(t: number) {
                t = clamp(
                    t,
                    0,
                    window.innerHeight - T._dimensions.height - magicalPadding
                );

                if (top !== t) {
                    consoleVariables.set.builtIn("cv_console_top", top = t);

                    if (!T._ui.container[0].style.top) {
                        T._ui.container.css("top", top);
                    }
                }
            }
        };

        return proxy;
    })();

    private readonly _entries: ConsoleData[] = [];

    private readonly localStorageKey = "suroi_config";

    writeToLocalStorage(): void {
        const settings: GameSettings = {
            variables: consoleVariables.getAll(),
            aliases: Object.fromEntries(aliases),
            binds: keybinds.getAll()
        };

        localStorage.setItem(this.localStorageKey, JSON.stringify(settings));
    }

    readFromLocalStorage(): void {
        const storedConfig = localStorage.getItem(this.localStorageKey);

        let binds = defaultBinds as GameSettings["binds"];

        if (storedConfig) {
            const config = JSON.parse(storedConfig) as GameSettings;

            for (const name in config.variables) {
                const variable = config.variables[name];

                if (defaultClientCVars[name as keyof CVarTypeMapping]) {
                    consoleVariables.set.builtIn(name as keyof CVarTypeMapping, variable.value as string);
                } else {
                    const cvar = new ConVar(name, variable.value, variable.flags);
                    consoleVariables.declareCVar(cvar);
                }
            }
            binds = mergeDeep({}, defaultBinds, config.binds);

            for (const alias in config.aliases) {
                aliases.set(alias, config.aliases[alias]);
            }
        }

        for (const command in binds) {
            for (const bind of binds[command]) {
                keybinds.addActionsToInput(bind, command);
            }
        }
    }

    constructor() {
        this._ui.container.css("left", this._position.left);
        this._ui.container.css("top", this._position.top);
        this._ui.container.css("width", this._dimensions.width);
        this._ui.container.css("height", this._dimensions.height);

        this._attachListeners();

        this.isOpen = this._isOpen;
        // sanity check
    }

    private _attachListeners(): void {
        /*
            eslint-disable no-lone-blocks
        */

        // Close button
        {
            this._ui.closeButton.on("click", e => {
                if (e.button === 0) this.close();
            });
        }

        // Dragging
        {
            let dragging = false;
            const offset = {
                x: NaN,
                y: NaN
            };

            const mouseUpHandler = (): void => {
                if (!dragging) return;

                dragging = false;

                window.removeEventListener("mouseup", mouseUpHandler);
                window.removeEventListener("mousemove", mouseMoveHandler);
            };

            const mouseMoveHandler = (event: MouseEvent): void => {
                this._ui.container.css(
                    "left",
                    (this._position.left = event.clientX + offset.x, this._position.left)
                );

                this._ui.container.css(
                    "top",
                    (this._position.top = event.clientY + offset.y, this._position.top)
                );
            };

            this._ui.header.on("mousedown", e => {
                dragging = true;

                // This does _not_ equal e.offsetX
                offset.x = parseInt(this._ui.container.css("left")) - e.clientX;
                offset.y = parseInt(this._ui.container.css("top")) - e.clientY;

                window.addEventListener("mouseup", mouseUpHandler);
                window.addEventListener("mousemove", mouseMoveHandler);
            });
        }

        // Resize
        {
            new ResizeObserver(e => {
                // Ignore for closed consoles
                if (!this._isOpen) return;

                const size = e[0]?.borderBoxSize[0];
                // Shouldn't ever happen
                if (size === undefined) return;

                // With a left-to-right writing mode, inline is horizontal and block is vertical
                // This might not work with languages where inline is vertical

                this._dimensions.width = size.inlineSize;
                this._dimensions.height = size.blockSize;
            }).observe(this._ui.container[0]);
        }

        // Input
        {
            this._ui.input.on("keypress", e => {
                if (invalidateNextCharacter) {
                    invalidateNextCharacter = false;
                    e.preventDefault();
                    return;
                }

                if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    const input = this._ui.input.val() as string;

                    this._ui.input.val("");

                    this.log(`> ${input}`);
                    this.handleQuery(input);
                }
            });
        }
    }

    // The part everyone cares about
    handleQuery(query: string): void {
        if (query.length === 0) return;

        class CommandSyntaxError extends SyntaxError { }

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        function extractCommandsAndArgs(input: string) {
            interface Command {
                name: string
                args: string[]
            }

            let current: Command = {
                name: "",
                args: [""]
            };
            const commands: Command[] = [current];

            let parserPhase = "cmd" as "cmd" | "args";
            let inString = false;

            const handlers: Record<typeof parserPhase, (char: string) => void> = {
                cmd(char: string) {
                    switch (char) {
                        case " ": {
                            if (current.name) {
                                parserPhase = "args";
                            }
                            break;
                        }
                        case "=": {
                            parserPhase = "args";
                            break;
                        }
                        case ";": {
                            commands.push(current = {
                                name: "",
                                args: [""]
                            });
                            break;
                        }
                        default: {
                            current.name += char;
                        }
                    }
                },
                args(char: string) {
                    switch (char) {
                        case " ": {
                            if (inString) {
                                current.args[current.args.length - 1] += char;
                            } else {
                                current.args.push("");
                            }
                            break;
                        }
                        case ";": {
                            if (inString) {
                                current.args[current.args.length - 1] += char;
                            } else {
                                commands.push(current = {
                                    name: "",
                                    args: [""]
                                });
                                parserPhase = "cmd";
                            }
                            break;
                        }
                        case "\"": {
                            if (inString) {
                                current.args.push("");
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            } else if (current.args.at(-1)!.length) {
                                // If we encounter a " in the middle of an argument
                                // such as `say hel"lo`
                                throw new CommandSyntaxError("Unexpected double-quote (\") character found.");
                            }
                            inString = !inString;
                            break;
                        }
                        default: {
                            current.args[current.args.length - 1] += char;
                        }
                    }
                }
            };

            for (const char of input) {
                handlers[parserPhase](char);
            }

            if (inString) {
                throw new CommandSyntaxError("Unterminated string argument");
            }

            return commands
                .filter(command => command.name)
                .map(command => {
                    command.args = command.args.filter(arg => arg.trim().length);
                    return command;
                });
        }

        try {
            for (const command of extractCommandsAndArgs(query)) {
                const target = commands.get(command.name);
                if (target) {
                    const result = target.run(command.args);

                    if (typeof result === "object") {
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        this.error.raw(`${result.err}`);
                    }
                    continue;
                }

                const alias = aliases.get(command.name);
                if (alias) {
                    this.handleQuery(alias);
                    continue;
                }

                const cvar = consoleVariables.get(command.name);
                if (cvar) {
                    const result = cvar.setValue(command.args[0]);

                    if (typeof result === "object") {
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        this.error.raw(`${result.err}`);
                    }
                    continue;
                }

                this.error(`Unknown command '${command.name}'`);
            }
        } catch (e) {
            if (e instanceof CommandSyntaxError) {
                this.error({ main: "Parsing error", detail: e.message });
            } else {
                // forward the error
                throw e;
            }
        }
    }

    open(): void { this.isOpen = true; }
    close(): void { this.isOpen = false; }
    toggle(): void { this.isOpen = !this._isOpen; }

    resizeAndMove(info: { dimensions?: { width?: number, height?: number }, position?: { left?: number, top?: number } }): void {
        if (info.dimensions) {
            info.dimensions.width !== undefined && (this._dimensions.width = info.dimensions.width);
            info.dimensions.height !== undefined && (this._dimensions.height = info.dimensions.height);
        }

        if (info.position) {
            info.position.left !== undefined && (this._position.left = info.position.left);
            info.position.top !== undefined && (this._position.top = info.position.top);
        }
    }

    private _pushAndLog(entry: ConsoleData, raw = false): void {
        this._entries.push(entry);
        this._ui.output.append(this._generateHTML(entry, raw));
    }

    private readonly _generateHTML = (() => {
        const allowedTags = [
            // Headings
            "h1", "h2", "h3", "h4", "h5", "h6",

            // Text stuff
            "blockquote", "p", "pre", "span",

            // List stuff
            "li", "ol", "ul",

            // Inline elements
            "a", "em", "b", "bdi", "br", "cite", "code", "del", "ins",
            "kbd", "mark", "q", "s", "samp", "small", "span", "strong",
            "sub", "sup", "time", "u", "var",

            // Table stuff
            "caption", "col", "colgroup", "table", "tbody", "td", "tfoot",
            "th", "thead", "tr"
        ];

        function sanitizeHTML(message: string): string {
            return message.replace(
                /<\/?.*?>/g,
                match => {
                    const tag = match.replace(/<\/?|>/g, "").split(" ")[0];

                    return allowedTags.includes(tag)
                        ? match
                        : match
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;");
                }
            );
        }

        return (entry: ConsoleData, raw = false): JQuery<HTMLDivElement> => {
            const date = (() => {
                const timestamp = new Date(entry.timestamp);

                return {
                    hr: `${timestamp.getHours()}`.padStart(2, "0"),
                    min: `${timestamp.getMinutes()}`.padStart(2, "0"),
                    sec: `${timestamp.getSeconds()}`.padStart(2, "0"),
                    mil: `${timestamp.getMilliseconds()}`.padStart(3, "0")
                };
            })();

            const message = {
                container: undefined as unknown as JQuery<HTMLDivElement>,
                timestamp: undefined as unknown as JQuery<HTMLDivElement>,
                content: undefined as unknown as JQuery<HTMLDivElement>
            };

            message.container = $(`<div class="console-entry console-entry-${entry.type}"></div>`);
            message.timestamp = $("<div class=\"console-entry-timestamp\"></div>");
            message.timestamp.text(`${date.hr}:${date.min}:${date.sec}:${date.mil}`);
            message.container.append(message.timestamp);

            message.content = $("<div class=\"console-entry-content\">");

            const propertyToModify = raw ? "html" : "text";

            if (typeof entry.content === "string") {
                message.content[propertyToModify](sanitizeHTML(entry.content));
            } else {
                message.content.append(
                    $("<details>").append(
                        $("<summary>")[propertyToModify](sanitizeHTML(entry.content.main)),
                        Array.isArray(entry.content.detail)
                            ? $("<ul>").append(
                                entry.content.detail.map(e => ($("<li>")[propertyToModify](sanitizeHTML(e)) as JQuery<JQuery.Node>))
                            )
                            : $("<span>")[propertyToModify](entry.content.detail)
                    )
                );
            }

            message.container.append(message.content);

            return message.container;
        };
    })();

    private _createConsoleEntry(content: ConsoleData["content"], type: MessageType): ConsoleData {
        return {
            content,
            timestamp: Date.now(),
            type
        } satisfies ConsoleData;
    }

    private readonly _createLogger = (() => {
        type BaseLoggingFunction = (message: ConsoleData["content"] | string, altMode?: boolean) => void;
        type AugmentedLoggingFunction = BaseLoggingFunction & {
            raw: BaseLoggingFunction
        };

        return (modes: { readonly default: MessageType, readonly alt: MessageType }): AugmentedLoggingFunction => {
            const loggingFn = (
                (message: ConsoleData["content"] | string, altMode?: boolean) => {
                    this._pushAndLog(this._createConsoleEntry(message, altMode ? modes.alt : modes.default), false);
                }
            ) as AugmentedLoggingFunction;

            loggingFn.raw = (message: ConsoleData["content"] | string, altMode?: boolean) => {
                this._pushAndLog(this._createConsoleEntry(message, altMode ? modes.alt : modes.default), true);
            };

            return loggingFn;
        };
    })();

    readonly log = this._createLogger({ default: MessageType.Log, alt: MessageType.Important });
    readonly warn = this._createLogger({ default: MessageType.Warn, alt: MessageType.SevereWarn });
    readonly error = this._createLogger({ default: MessageType.Error, alt: MessageType.FatalError });

    clear(): void {
        this._entries.length = 0;
        this._ui.output.html("");
    }
})();

export type Stringable = string | number | boolean | bigint | undefined | null;
export type PossibleError<E = never> = undefined | { readonly err: E };
export const commands = new Map<string, Command<boolean, Stringable>>();
export const aliases = new Map<string, string>();

export const keybinds = (() => {
    type InputKey = string;
    type InputAction = string;

    return new (class InputMapper {
        // These two maps must be kept in sync!!
        private readonly _inputToAction = new Map<InputKey, Set<InputAction>>();
        private readonly _actionToInput = new Map<InputAction, Set<InputKey>>();

        /* eslint-disable @typescript-eslint/indent, indent, no-sequences */
        private static readonly _generateGetAndSetIfAbsent =
            <K, V>(map: Map<K, V>, defaultValue: V) =>
                (key: K) =>
                    map.get(key) ?? (() => (map.set(key, defaultValue), defaultValue))();

        private static readonly _generateAdder =
            <K, V, T>(forwardsMap: Map<K, Set<V>>, backwardsMap: Map<V, Set<K>>, thisValue: T) =>
                (key: K, ...values: V[]): T => {
                    const forwardSet = InputMapper._generateGetAndSetIfAbsent(forwardsMap, new Set())(key);

                    for (const value of values) {
                        forwardSet.add(value);
                        InputMapper._generateGetAndSetIfAbsent(backwardsMap, new Set())(value).add(key);
                    }

                    return thisValue;
                };

        /**
         * Binds actions to a certain input. Note that an action (either a `Command` object or
         * a console query `string`) may only appear once per input
         * @param key The input to attach the actions to
         * @param values A list of actions to be bound
         * @returns This input mapper object
         */
        readonly addActionsToInput = InputMapper._generateAdder(this._inputToAction, this._actionToInput, this);
        /**
         * Binds inputs to a certain action. Note that an action (either a `Command` object or
         * a console query `string`) may only appear once per action
         * @param key The action to attach the inputs to
         * @param values A list of inputs to be bound
         * @returns This input mapper object
         */
        readonly addInputsToAction = InputMapper._generateAdder(this._actionToInput, this._inputToAction, this);

        /**
         * Removes an action that was bound to an input
         * @param input The input that the action to be removed is currently bound to
         * @param action The action to remove
         * @returns `true` if the action existed and was removed, `false` if it was never
         * there to begin with (and therefore was not removed)
         */
        remove(input: InputKey, action: InputAction): boolean {
            const actions = this._inputToAction.get(input);
            if (actions === undefined) return false;

            actions.delete(action);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this._actionToInput.get(action)!.delete(input);
            return true;
        }

        private static readonly _generateRemover =
            <K, V, T>(forwardsMap: Map<K, Set<V>>, backwardsMap: Map<V, Set<K>>, thisValue: T) =>
                (key: K) => {
                    forwardsMap.delete(key);

                    for (const set of backwardsMap.values()) {
                        set.delete(key);
                    }

                    return thisValue;
                };

        /**
         * Removes all actions bound to a particular input
         * @param key The input from which to remove all actions
         * @returns This input mapper object
         */
        readonly unbindInput = InputMapper._generateRemover(this._inputToAction, this._actionToInput, this);
        /**
         * Removes all inputs bound to a particular action
         * @param key The action from which to remove all inputs
         * @returns This input mapper object
         */
        readonly unbindAction = InputMapper._generateRemover(this._actionToInput, this._inputToAction, this);

        /**
         * Removes all bindings
         * @returns This input mapper object
         */
        unbindAll(): this {
            this._inputToAction.clear();
            this._actionToInput.clear();
            return this;
        }

        private static readonly _generateGetter =
            <K, V>(map: Map<K, Set<V>>) =>
                (key: K) => [...(map.get(key) ?? { values: () => [] }).values()];

        /**
         * Gets all the inputs bound to a particular action
         * @param key The action from which to retrieve the inputs
         * @returns An array of inputs bound to the action
         */
        readonly getInputsBoundToAction = InputMapper._generateGetter(this._actionToInput);
        /**
         * Gets all the actions bound to a particular input
         * @param key The input from which to retrieve the actions
         * @returns An array of actions bound to the input
         */
        readonly getActionsBoundToInput = InputMapper._generateGetter(this._inputToAction);

        private static readonly _generateLister =
            <K, V>(map: Map<K, V>) =>
                () => [...map.keys()];

        /**
         * Lists all the inputs that are currently bound to at least one action
         *
         * **This list does *not* update in real time, and changes to said list
         * are *not* reflected in the input manager**
         */
        readonly listBoundInputs = InputMapper._generateLister(this._inputToAction);
        /**
         * Lists all the actions to which at least one input is bound
         *
         * **This list does *not* update in real time, and changes to said list
         * are *not* reflected in the input manager**
         */
        readonly listBoundActions = InputMapper._generateLister(this._actionToInput);

        getAll(): GameSettings["binds"] {
            const binds: GameSettings["binds"] = {};

            for (const [action, bindsSet] of this._actionToInput.entries()) {
                binds[action] = [...bindsSet];
            }

            return binds;
        }
    })();
})();

export function setUpBuiltIns(game: Game): void {
    setUpCommands(game);
    readySystem.markReady();

    gameConsole.resizeAndMove({
        dimensions: {
            width: consoleVariables.get.builtIn("cv_console_width").value,
            height: consoleVariables.get.builtIn("cv_console_height").value
        },
        position: {
            left: consoleVariables.get.builtIn("cv_console_left").value,
            top: consoleVariables.get.builtIn("cv_console_top").value
        }
    });
}

// Overrides for native console methods
{
    const {
        log: nativeLog,
        info: nativeInfo,
        warn: nativeWarn,
        error: nativeError
    } = console;

    // eslint-disable-next-line no-inner-declarations
    function makeOverride<C extends typeof window.console, K extends "log" | "info" | "warn" | "error">(nativeKey: K, nativeMethod: C[K], gameConsoleMethod: "log" | "warn" | "error", altMode?: boolean): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.console as C)[nativeKey] = function(this: typeof window["console"], ...contents: any[]) {
            nativeMethod.call(console, ...contents);
            contents.forEach(c => { gameConsole[gameConsoleMethod](`${c}`, altMode); });
        };
    }

    (
        [
            ["log", nativeLog, "log"],
            ["info", nativeInfo, "log", true],
            ["warn", nativeWarn, "warn"],
            ["error", nativeError, "error"]
        ] as Array<Parameters<typeof makeOverride>>
    ).forEach(args => { makeOverride(...args); });
}

window.addEventListener("error", err => {
    if (err.filename) {
        gameConsole.error(
            {
                main: `Javascript ${err.error ? `'${Object.getPrototypeOf(err.error)?.constructor?.name}'` : "error"} occurred at ${err.filename.replace(location.origin + location.pathname, "./")}:${err.lineno}:${err.colno}`,
                detail: err.error
            },
            true
        );
    }
});
