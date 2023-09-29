import { INVENTORY_MAX_WEAPONS, InputActions, ObjectCategory } from "../../../../../common/src/constants";
import { absMod, clamp } from "../../../../../common/src/utils/math";
import { ObjectDefinitionsList } from "../../../../../common/src/utils/objectDefinitionsList";
import { v } from "../../../../../common/src/utils/vector";
import { type Game } from "../../game";
import { EmoteSlot } from "../constants";
import { type PlayerManager } from "../playerManager";
import { defaultClientCVars, type JSONCVar } from "./defaultClientCVars";

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
            this._ui._container.show();
            this._ui._input.trigger("focus");
            this._ui._input.val("");
            invalidateNextCharacter = true;
        } else {
            this._ui._container.hide();
        }
    }

    private readonly _ui = {
        _container: undefined as unknown as JQuery<HTMLDivElement>,
        _header: undefined as unknown as JQuery<HTMLDivElement>,
        _closeButton: undefined as unknown as JQuery<HTMLButtonElement>,
        _output: undefined as unknown as JQuery<HTMLDivElement>,
        _input: undefined as unknown as JQuery<HTMLTextAreaElement>
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

                    if (!T._ui._container[0].style.width) {
                        T._ui._container.css("width", width);
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

                    if (!T._ui._container[0].style.height) {
                        T._ui._container.css("height", height);
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

                    if (!T._ui._container[0].style.left) {
                        T._ui._container.css("left", left);
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

                    if (!T._ui._container[0].style.top) {
                        T._ui._container.css("top", top);
                    }
                }
            }
        };

        return proxy;
    })();

    private readonly _entries: ConsoleData[] = [];

    private readonly localStorageKey = "suroi_config";

    constructor() {
        const assignUiProp = <K extends keyof (typeof gameConsole)["_ui"]>(key: K, selector: string, context?: JQuery): void => {
            const element = $(selector, context) as (typeof gameConsole)["_ui"][K];

            this._ui[key] = element;

            if (!element.length) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                console.warn(`Component '${key}' of the console was not found. (provided selector: '${selector}')`);
            }
        };

        assignUiProp("_container", "div#console-container");
        assignUiProp("_header", "div#console-header", this._ui._container);
        assignUiProp("_output", "div#console-out", this._ui._container);
        assignUiProp("_input", "textarea#console-in", this._ui._container);
        assignUiProp("_closeButton", "div#console-header button#console-close", this._ui._container);

        this._ui._container.css("left", this._position.left);
        this._ui._container.css("top", this._position.top);
        this._ui._container.css("width", this._dimensions.width);
        this._ui._container.css("height", this._dimensions.height);

        this._attachListeners();

        this.isOpen = this._isOpen;
        // sanity check

        const config = localStorage.getItem(this.localStorageKey);
        if (config) this.addReadyCallback(() => { this.handleQuery(config); });
    }

    private readonly _attachListeners = (() => {
        let initialized = false;
        return () => {
            if (initialized) {
                console.warn("Console listeners already initialized.");
                return;
            }

            initialized = true;

            /*
                eslint-disable no-lone-blocks
            */

            // Close button
            {
                this._ui._closeButton.on("click", e => {
                    if (e.button === 0) {
                        this.close();
                    }
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
                    this._ui._container.css(
                        "left",
                        (this._position.left = event.clientX + offset.x, this._position.left)
                    );

                    this._ui._container.css(
                        "top",
                        (this._position.top = event.clientY + offset.y, this._position.top)
                    );
                };

                this._ui._header.on("mousedown", e => {
                    dragging = true;

                    // This does _not_ equal e.offsetX
                    offset.x = parseInt(this._ui._container.css("left")) - e.clientX;
                    offset.y = parseInt(this._ui._container.css("top")) - e.clientY;

                    window.addEventListener("mouseup", mouseUpHandler);
                    window.addEventListener("mousemove", mouseMoveHandler);
                });
            }

            // Resize
            {
                if (this._ui._container[0] !== undefined) {
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
                    }).observe(this._ui._container[0]);
                }
            }

            // Input
            {
                this._ui._input.on("keypress", e => {
                    if (invalidateNextCharacter) {
                        invalidateNextCharacter = false;
                        e.preventDefault();
                        return;
                    }

                    if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        const input = this._ui._input.val() as string;

                        this._ui._input.val("");

                        this.log(`> ${input}`);
                        this.handleQuery(input);
                    }
                });
            }
        };
    })();

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

    writeToLocalStorage(): void {
        localStorage.setItem(this.localStorageKey, `${consoleVariables.generateExportString()};${keybinds.generateExportString()}`);
    }

    private _pushAndLog(entry: ConsoleData, raw = false): void {
        this._entries.push(entry);
        this._ui._output.append(this._generateHTML(entry, raw));
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
        this._ui._output.html("");
    }
})();

export type Stringable = string | number | boolean | bigint | undefined | null;
export const commands = new Map<string, Command<boolean, Stringable>>();
export const aliases = new Map<string, string>();
export const keybinds = (() => {
    type InputKey = string;
    type InputAction = string | Command<boolean, Stringable>;

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

        generateExportString(): string {
            return `${[...this._inputToAction.entries()]
                .filter(([, actions]) => actions.size)
                .map(
                    ([input, actions]) => [...actions.values()].map(action => `bind ${input} "${action.toString()}"`).join(";")
                )
                .join(";")}`;
        }
    })();
})();

export interface CVarFlags {
    readonly archive: boolean
    readonly readonly: boolean
    readonly cheat: boolean
    readonly replicated: boolean
}

export type ExtractConVarValue<CVar extends ConVar<Stringable>> = CVar extends ConVar<infer V> ? V : never;
export class ConVar<Value = string> {
    readonly name: string;
    readonly flags: CVarFlags;
    private _value: Value;
    get value(): Value { return this._value; }

    static from<Value extends Stringable>(json: JSONCVar<Value>): ConVar<Value> {
        return new ConVar<Value>(json.name, json.value, json.flags);
    }

    constructor(name: string, value: Value, flags?: Partial<CVarFlags>) {
        this.name = name;
        this._value = value;
        this.flags = {
            archive: flags?.archive ?? false,
            readonly: flags?.readonly ?? true,
            cheat: flags?.cheat ?? true,
            replicated: flags?.replicated ?? false
        };
    }

    setValue(value: Value): PossibleError<string> {
        switch (true) {
            case this.flags.readonly: {
                return { err: `Cannot set value of readonly CVar '${this.name}'` };
            }
            case this.flags.replicated: {
                //todo allow server operators to modify replicated cvars
                return { err: `Value of replicated CVar '${this.name}' can only be modified by server operators.` };
            }
            case this.flags.cheat: {
                //todo allow modification of value when cheats are enabled
                return { err: `Cannot set value of cheat CVar '${this.name}' because cheats are disabled.` };
            }
        }

        this._value = value;
        if (this.flags.archive) {
            gameConsole.writeToLocalStorage();
        }
    }
}

export const consoleVariables = new (class {
    private readonly _userCVars = new Map<string, ConVar<Stringable>>();
    private readonly _builtInCVars: CVarTypeMapping = {} as unknown as CVarTypeMapping;

    private _initialized = false;

    initialize(): void {
        if (this._initialized) console.warn("Tried to initialize CVars more than once.");

        this._initialized = true;

        const varExists = this.has.bind(this);

        for (const [name, value] of Object.entries(defaultClientCVars)) {
            if (varExists(name)) continue;

            //@ts-expect-error This is init code, so shove it
            this._builtInCVars[name as keyof CVarTypeMapping] = ConVar.from<Stringable>(value);
        }
    }

    readonly get = (() => {
        type GoofyReturnType<K extends string> = K extends keyof CVarTypeMapping ? CVarTypeMapping[K] : ConVar<Stringable> | undefined;
        type Getter = (<K extends string>(key: K) => GoofyReturnType<K>) & {
            builtIn: <K extends keyof CVarTypeMapping>(key: K) => CVarTypeMapping[K]
            custom: (key: string) => ConVar<Stringable> | undefined
        };

        const getBuiltIn = <K extends keyof CVarTypeMapping>(key: K): CVarTypeMapping[K] => this._builtInCVars[key];
        const getCustom = (key: string): ConVar<Stringable> | undefined => this._userCVars.get(key);
        const fn: Getter = <K extends string>(key: K): GoofyReturnType<K> => {
            if (key in this._builtInCVars) {
                return getBuiltIn(key as keyof CVarTypeMapping) as unknown as GoofyReturnType<K>;
            }

            return getCustom(key) as GoofyReturnType<K>;
        };

        fn.builtIn = getBuiltIn;
        fn.custom = getCustom;

        return fn;
    })();

    readonly set = (() => {
        type GoofyParameterType<K extends string> = K extends keyof CVarTypeMapping ? ExtractConVarValue<CVarTypeMapping[K]> : Stringable;
        type Setter = (<K extends string>(key: K, value: GoofyParameterType<K>) => void) & {
            builtIn: <K extends keyof CVarTypeMapping>(key: K, value: GoofyParameterType<K>) => void
            custom: (key: string, value: Stringable) => PossibleError<string>
        };

        const setBuiltIn = <K extends keyof CVarTypeMapping>(key: K, value: GoofyParameterType<K>): void => { (this._builtInCVars[key] as ConVar<GoofyParameterType<K>>).setValue(value); };
        const setCustom = (key: string, value: Stringable): PossibleError<string> => {
            const cvar = this._userCVars.get(key);

            if (cvar === undefined) {
                return { err: `Could not find console variable '${key}'` };
            }

            cvar.setValue(value);
        };
        const fn: Setter = <K extends string>(key: K, value: GoofyParameterType<K>): void => {
            if (key in this._builtInCVars) {
                setBuiltIn(key as keyof CVarTypeMapping, value as ExtractConVarValue<CVarTypeMapping[keyof CVarTypeMapping]>);
                return;
            }

            setCustom(key, value);
        };

        fn.builtIn = setBuiltIn;
        fn.custom = setCustom;

        return fn;
    })();

    readonly has = (() => {
        type HasChecker = (<K extends string>(key: K) => boolean) & {
            builtIn: (key: keyof CVarTypeMapping) => boolean
            custom: (key: string) => boolean
        };

        const hasBuiltIn = (key: keyof CVarTypeMapping): boolean => key in this._builtInCVars;
        const hasCustom = (key: string): boolean => this._userCVars.has(key);
        const fn: HasChecker = <K extends string>(key: K): boolean => {
            if (key in this._builtInCVars) {
                return hasBuiltIn(key as keyof CVarTypeMapping);
            }

            return hasCustom(key);
        };

        fn.builtIn = hasBuiltIn;
        fn.custom = hasCustom;

        return fn;
    })();

    /**
     * Do **not** call this yourself! This is an internal method,
     * but it can't be marked private cuz a console command accesses
     * it.
     */
    declareCVar(cvar: ConVar<Stringable>): PossibleError<string> {
        if (this._userCVars.has(cvar.name)) {
            return { err: `CVar ${cvar.name} has already been declared.` };
        }

        this._userCVars.set(cvar.name, cvar);
    }

    generateExportString(): string {
        return (
            ([...Object.values(this._builtInCVars)] as Array<ConVar<Stringable>>)
                .filter(cvar => cvar.flags.archive)
                .map(cvar => `${cvar.name}=${cvar.value}`)
        ).concat(
            [...this._userCVars.values()]
                .filter(cvar => cvar.flags.archive)
                .map(cvar => `let "${cvar.name}" ${cvar.value}`)
        ).join(";");
    }

    dump(): string {
        return [...Object.entries(this._builtInCVars), ...this._userCVars.entries()]
            .map(([key, cvar]) =>
                `<li>'${key}' ${[
                    `${cvar.flags.archive ? "<span class=\"cvar-detail-archived\">A</span>" : ""}`,
                    `${cvar.flags.cheat ? "<span class=\"cvar-detail-cheat\">C</span>" : ""}`,
                    `${cvar.flags.readonly ? "<span class=\"cvar-detail-readonly\">R</span>" : ""}`,
                    `${cvar.flags.replicated ? "<span class=\"cvar-detail-replicated\">S</span>" : ""}`
                ].join(" ")} => ${cvar.value}</li>`
            ).join("");
    }
})();

consoleVariables.initialize();

export interface CVarTypeMapping {
    readonly cv_player_name: ConVar<string>
    readonly cv_loadout_skin: ConVar<string>
    readonly cv_loadout_crosshair: ConVar<string>
    readonly cv_loadout_top_emote: ConVar<string>
    readonly cv_loadout_right_emote: ConVar<string>
    readonly cv_loadout_bottom_emote: ConVar<string>
    readonly cv_loadout_left_emote: ConVar<string>
    readonly cv_loop_scope_selection: ConVar<boolean>
    readonly cv_anonymize_player_names: ConVar<boolean>
    readonly cv_master_volume: ConVar<number>
    readonly cv_music_volume: ConVar<number>
    readonly cv_sfx_volume: ConVar<number>
    readonly cv_mute_audio: ConVar<boolean>
    readonly cv_use_old_menu_music: ConVar<boolean>
    readonly cv_language: ConVar<string>
    readonly cv_region: ConVar<string | undefined>
    readonly cv_camera_shake_fx: ConVar<boolean>
    readonly cv_animate_rotation: ConVar<"wait_for_server" | "client">
    readonly cv_killfeed_style: ConVar<"text" | "icon">
    readonly cv_rotation_smoothing: ConVar<boolean>
    readonly cv_movement_smoothing: ConVar<boolean>
    readonly cv_minimap_minimized: ConVar<boolean>
    readonly cv_leave_warning: ConVar<boolean>
    readonly cv_minimap_transparency: ConVar<number>
    readonly cv_map_transparency: ConVar<number>
    readonly cv_draw_hud: ConVar<boolean>
    readonly cv_rules_acknowledged: ConVar<boolean>
    readonly cv_console_width: ConVar<number>
    readonly cv_console_height: ConVar<number>
    readonly cv_console_left: ConVar<number>
    readonly cv_console_top: ConVar<number>
    readonly cv_crosshair_color: ConVar<string>
    readonly cv_crosshair_size: ConVar<number>
    readonly cv_crosshair_stroke_color: ConVar<string>
    readonly cv_crosshair_stroke_size: ConVar<number>

    readonly pf_show_fps: ConVar<boolean>
    readonly pf_show_ping: ConVar<boolean>
    readonly pf_show_pos: ConVar<boolean>

    readonly mb_controls_enabled: ConVar<boolean>
    readonly mb_joystick_size: ConVar<number>
    readonly mb_joystick_transparency: ConVar<number>

    readonly dv_password: ConVar<string>
    readonly dv_role: ConVar<string>
    readonly dv_name_color: ConVar<string>
    readonly dv_lobby_clearing: ConVar<boolean>
}

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

function setUpCommands(game: Game): void {
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

    Command.createCommand<string>(
        "use_consumable",
        function(idString) {
            // This is technically unneeded, since "undefined in {}" returns false, but
            // for the sake of typescript (and the better error message), I'll leave it in
            if (idString === undefined) {
                return { err: "Expected a string argument, received nothing." };
            }

            if (!(idString in (ObjectDefinitionsList[ObjectCategory.Loot]?.idStringToNumber ?? {}))) {
                return { err: `No consumable with idString '${idString}' exists.` };
            }

            game.playerManager.useItem(idString);
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

            keybinds.addActionsToInput(key, query);
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

            keybinds.unbindInput(key);
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

type PossibleError<E = never> = undefined | { readonly err: E };

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
