import $ from "jquery";
import { Numeric } from "../../../../../common/src/utils/math";
import { type Game } from "../../game";
import { type Command } from "./commands";
import { defaultBinds, defaultClientCVars, type CVarTypeMapping } from "./defaultClientCVars";
import { Casters, ConVar, ConsoleVariables, flagBitfieldToInterface } from "./variables";

/*
    eslint-disable

    no-lone-blocks,
    @typescript-eslint/no-this-alias,
    no-return-assign,
    no-inner-declarations
*/

/*
  `no-lone-blocks`                    Used for organization
  `@typescript-eslint/no-this-alias`  Use some object literals, then talk to me about "not managing scope well"
  `no-return-assign`                  skill issue filter
  `no-inner-declarations`             Is this rule's raison d'être fr "just in case es5 chokes and dies on it sometimes"
*/

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
export type Stringable = string | number | boolean | bigint | undefined | null;
export type PossibleError<E = never> = undefined | { readonly err: E };

export interface GameSettings {
    readonly variables: Record<string, Stringable | { value: Stringable, flags?: number }>
    readonly aliases: Record<string, string>
    readonly binds: Record<string, string[]>
}

// When opening the console with a key, the key will be typed to the console,
// because the keypress event is triggered for the input field, but only on the main menu screen
let invalidateNextCharacter = false;
export class GameConsole {
    private _isOpen = false;
    get isOpen(): boolean { return this._isOpen; }
    set isOpen(value: boolean) {
        this._isOpen = value;

        if (this._isOpen) {
            this._ui.globalContainer.show();
            this._ui.input.trigger("focus");

            invalidateNextCharacter = !this.game.gameStarted;
        } else {
            this._ui.globalContainer.hide();
        }
    }

    private readonly _ui = {
        globalContainer: $("#console"),
        container: $("#console-container"),
        header: $("#console-header"),
        closeButton: $("#console-close"),
        output: $("#console-out"),
        input: $("#console-in"),
        autocomplete: $("#console-autocmp")
    };

    private readonly _dimensions = (() => {
        let width = NaN;
        let height = NaN;
        const T = this;

        return {
            get width() { return width; },
            set width(w: number) {
                w = Numeric.clamp(
                    w,
                    0,
                    window.innerWidth - (Number.isNaN(T._position?.left ?? NaN) ? -Infinity : T._position.left)
                );

                if (width !== w) {
                    T.variables.set.builtIn("cv_console_width", width = w);

                    if (!T._ui.container[0].style.width) {
                        T._ui.container.css("width", width);
                    }
                    T._ui.autocomplete.css("width", width);
                }
            },

            get height() { return height; },
            set height(h: number) {
                h = Numeric.clamp(
                    h,
                    0,
                    window.innerHeight - (Number.isNaN(T._position?.top ?? NaN) ? -Infinity : T._position.top)
                );

                if (height !== h) {
                    T.variables.set.builtIn("cv_console_height", height = h);

                    if (!T._ui.container[0].style.height) {
                        T._ui.container.css("height", height);
                    }
                    T._ui.autocomplete.css("top", T._position.top + height);
                }
            }
        };
    })();

    private readonly _position = (() => {
        let left = NaN;
        let top = NaN;

        const magicalPadding /* that prevents scroll bars from showing up */ = 1;
        const T = this;

        return {
            get left() { return left; },
            set left(l: number) {
                l = Numeric.clamp(
                    l,
                    0,
                    window.innerWidth - T._dimensions.width - magicalPadding
                );

                if (left !== l) {
                    T.variables.set.builtIn("cv_console_left", left = l);
                    T._ui.container.css("left", left);
                    T._ui.autocomplete.css("left", left);
                }
            },

            get top() { return top; },
            set top(t: number) {
                t = Numeric.clamp(
                    t,
                    0,
                    window.innerHeight - T._dimensions.height - magicalPadding
                );

                if (top !== t) {
                    T.variables.set.builtIn("cv_console_top", top = t);
                    T._ui.container.css("top", top);
                    T._ui.autocomplete.css("top", top + T._dimensions.height);
                }
            }
        };
    })();

    private readonly _entries: ConsoleData[] = [];

    private readonly localStorageKey = "suroi_config";

    private readonly _history = new (class <T> {
        private readonly _backingSet = new Set<T>();
        private readonly _backingArray: T[] = [];

        add(element: T): void {
            const oldSize = this._backingSet.size;
            this._backingSet.add(element);

            (this._backingSet.size !== oldSize) && this._backingArray.push(element);
        }

        clear(): void {
            this._backingSet.clear();
            this._backingArray.length = 0;
        }

        filter(predicate: (value: T, index: number) => boolean): T[];
        filter<U extends T>(predicate: (value: T, index: number) => value is U): U[] {
            return this._backingArray.filter(predicate);
        }
    })<string>();

    clearHistory(): void {
        this._history.clear();
    }

    writeToLocalStorage(): void {
        const settings: GameSettings = {
            variables: this.variables.getAll(),
            aliases: Object.fromEntries(this.aliases),
            binds: this.game.inputManager.binds.getAll()
        };

        localStorage.setItem(this.localStorageKey, JSON.stringify(settings));
    }

    readFromLocalStorage(): void {
        const storedConfig = localStorage.getItem(this.localStorageKey);

        const binds = JSON.parse(JSON.stringify(defaultBinds)) as GameSettings["binds"];
        let rewriteToLS = false;

        if (storedConfig) {
            const config = JSON.parse(storedConfig) as GameSettings;

            for (const name in config.variables) {
                const variable = config.variables[name];
                const value = typeof variable === "object" ? variable?.value : variable;

                if (name in defaultClientCVars) {
                    this.variables.set.builtIn(name as keyof CVarTypeMapping, value as string, false);
                } else {
                    this.variables.declareCVar(
                        new ConVar(
                            name,
                            value,
                            this,
                            Casters.toString,
                            {
                                archive: true,
                                cheat: false,
                                readonly: false,
                                ...(typeof variable === "object" ? flagBitfieldToInterface(variable?.flags ?? 0) : {})
                            }
                        )
                    );
                    rewriteToLS = true;
                }
            }

            if (config.binds) {
                for (const key in config.binds) {
                    if (!(key in config.binds)) continue;

                    binds[key] = config.binds[key];
                }
                rewriteToLS = true;
            }

            for (const alias in config.aliases) {
                this.aliases.set(alias, config.aliases[alias]);
            }
        }

        const bindManager = this.game.inputManager.binds;
        for (const command in binds) {
            const bindList = binds[command];
            if (!bindList.length) {
                bindManager.addInputsToAction(command);
                continue;
            }

            for (const bind of bindList) {
                if (bind === "") continue;
                bindManager.addActionsToInput(bind, command);
            }
        }

        if (rewriteToLS) {
            this.writeToLocalStorage();
        }

        this.resizeAndMove({
            dimensions: {
                width: this.getBuiltInCVar("cv_console_width"),
                height: this.getBuiltInCVar("cv_console_height")
            },
            position: {
                left: this.getBuiltInCVar("cv_console_left"),
                top: this.getBuiltInCVar("cv_console_top")
            }
        });
    }

    readonly game: Game;

    readonly commands = (() => {
        const map = new Map<string, Command<boolean, Stringable>>();

        const nativeSet = map.set.bind(map);
        const nativeClear = map.clear.bind(map);
        const nativeDelete = map.delete.bind(map);

        map.set = (key, value) => {
            const retVal = nativeSet.call(map, key, value);
            this._autocmpData.cache.invalidateCommands();
            return retVal;
        };

        map.clear = () => {
            const retVal = nativeClear.call(map);
            this._autocmpData.cache.invalidateCommands();
            return retVal;
        };

        map.delete = (key) => {
            const retVal = nativeDelete.call(map, key);

            if (retVal) {
                this._autocmpData.cache.invalidateCommands();
            }

            return retVal;
        };

        return map;
    })();

    readonly aliases = (() => {
        const map = new Map<string, string>();

        const nativeSet = map.set.bind(map);
        const nativeClear = map.clear.bind(map);
        const nativeDelete = map.delete.bind(map);

        map.set = (key, value) => {
            const retVal = nativeSet.call(map, key, value);
            this._autocmpData.cache.invalidateAliases();
            return retVal;
        };

        map.clear = () => {
            const retVal = nativeClear.call(map);
            this._autocmpData.cache.invalidateAliases();
            return retVal;
        };

        map.delete = (key) => {
            const retVal = nativeDelete.call(map, key);

            if (retVal) {
                this._autocmpData.cache.invalidateAliases();
            }

            return retVal;
        };

        return map;
    })();

    readonly variables = (() => {
        const varCollection = new ConsoleVariables(this);

        const nativeDeclare = varCollection.declareCVar.bind(varCollection);

        varCollection.declareCVar = (cvar: ConVar<Stringable>) => {
            const retVal = nativeDeclare(cvar);

            if (retVal !== undefined) {
                this._autocmpData.cache.invalidateVariables();
            }

            return retVal;
        };

        return varCollection;
    })();

    /**
     * Returns the value of a built-in console variable. Sugar method
     * @param name The name of the console variable whose value is to be retrieved
     * @returns The value of the console variable with the provided name
     */
    getBuiltInCVar<K extends keyof CVarTypeMapping>(name: K): CVarTypeMapping[K]["value"] {
        return this.variables.get.builtIn(name).value;
    }

    /**
     * Sets the value of a built-in console variable. Sugar method
     * @param name The name of the console variable to be modified
     * @param value The value to give said console variable
     */
    setBuiltInCVar<K extends keyof CVarTypeMapping>(name: K, value: CVarTypeMapping[K]["value"]): void {
        this.variables.set.builtIn(name, value);
    }

    constructor(game: Game) {
        this.game = game;

        this._attachListeners();

        /* const T = this;
        // Overrides for native console methods
        {
            const {
                log: nativeLog,
                info: nativeInfo,
                warn: nativeWarn,
                error: nativeError
            } = console;

            function makeOverride<
                C extends typeof window.console,
                K extends "log" | "info" | "warn" | "error"
            >(
                nativeKey: K,
                nativeMethod: C[K],
                gameConsoleMethod: "log" | "warn" | "error",
                altMode?: boolean
            ): void {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window.console as C)[nativeKey] = function(this: typeof window["console"], ...contents: any[]) {
                    nativeMethod.call(console, ...contents);
                    contents.forEach(c => { T[gameConsoleMethod](`${c}`, altMode); });
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
        } */

        window.addEventListener("error", err => {
            if (err.filename) {
                this.error(
                    {
                        main: `Javascript ${err.error ? `'${Object.getPrototypeOf(err.error)?.constructor?.name}'` : "error"} occurred at ${err.filename.replace(location.origin + location.pathname, "./")}:${err.lineno}:${err.colno}`,
                        detail: err.error
                    },
                    true
                );
            }
        });

        this.isOpen = this._isOpen;
        // sanity check
    }

    private _attachListeners(): void {
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
                this._position.left = event.clientX + offset.x;
                this._position.top = event.clientY + offset.y;
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

        let navigatingAutocmp = false;

        // Input
        {
            this._ui.globalContainer.on("keydown", e => {
                switch (e.key) {
                    case "Enter": {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        const input = this._ui.input.val() as string;

                        this._ui.input.val("");
                        navigatingAutocmp = false;

                        this._history.add(input);
                        this.log(`> ${input}`);
                        this.handleQuery(input);
                        this._updateAutocmp();
                        break;
                    }
                    case "ArrowDown":
                    case "ArrowUp": {
                        if (!this._isOpen) return;

                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();

                        navigatingAutocmp = true;

                        const { nodes, activeIndex } = this._autocmpData;
                        const focusExists = activeIndex !== undefined;
                        const nodeLength = nodes.length;

                        focusExists && nodes[activeIndex].trigger("blur");
                        if (nodeLength) {
                            const direction = e.key === "ArrowDown" ? 1 : -1;
                            nodes[
                                this._autocmpData.activeIndex = Numeric.absMod(
                                    focusExists
                                        ? activeIndex + direction
                                        : (direction - 1) >> 2, // -1 becomes -1, 1 becomes 0
                                    nodeLength
                                )
                            ].trigger("focus");
                        }
                        break;
                    }
                }
            });

            this._ui.input.on("beforeinput", e => {
                if (invalidateNextCharacter) {
                    invalidateNextCharacter = false;
                    e.preventDefault();
                }
            });

            this._ui.input.on("input", () => {
                this._updateAutocmp();
            });
        }

        // Focus / blur
        {
            this._ui.input.on("focus", () => {
                this._updateAutocmp();
            });

            this._ui.input.on("blur", () => {
                navigatingAutocmp || this._hideAutocomplete();
            });
        }
    }

    private readonly _autocmpData: {
        nodes: Array<JQuery<HTMLDivElement>>
        activeIndex: number | undefined
        readonly cache: {
            get commands(): string[]
            invalidateCommands: () => void

            get aliases(): string[]
            invalidateAliases: () => void

            get variables(): string[]
            invalidateVariables: () => void
        }
    } = {
            nodes: [],
            activeIndex: undefined,
            cache: (() => {
                const T = this;
                let commands: string[] | undefined;
                let aliases: string[] | undefined;
                let variables: string[] | undefined;

                return {
                    get commands() { return commands ??= [...T.commands.keys()]; },
                    invalidateCommands() { commands = undefined; },

                    get aliases() { return aliases ??= [...T.aliases.keys()]; },
                    invalidateAliases() { aliases = undefined; },

                    get variables() { return variables ??= Object.keys(T.variables.getAll()); },
                    invalidateVariables() { variables = undefined; }
                };
            })()
        };

    private _updateAutocmp(): void {
        // todo autocomplete for command invocations

        const inputValue = this._ui.input.val() as string;
        const { autocomplete, input, container } = this._ui;

        const isEmpty = inputValue.length === 0;

        const [
            historyCandidates,
            commandCandidates,
            aliasCandidates,
            variableCandidates
        ] = isEmpty
            ? [
                this._history.filter(() => true),
                [],
                [],
                []
            ]
            : [
                this._history.filter(s => s.includes(inputValue) && !this._autocmpData.cache.commands.some(c => c === s)),
                this._autocmpData.cache.commands.filter(s => s.includes(inputValue)),
                this._autocmpData.cache.aliases.filter(s => s.includes(inputValue)),
                this._autocmpData.cache.variables.filter(s => s.includes(inputValue))
            ];

        const generateAutocompleteNode = (match: string, text: string): JQuery<HTMLDivElement> => {
            const [before, after] = match
                ? (() => {
                    const indexOf = text.indexOf(match);

                    return [text.substring(0, indexOf), text.substring(indexOf + match.length)];
                })()
                : [text, ""];

            const node = $<HTMLDivElement>("<div tabindex=\"0\" class=\"console-input-autocomplete-entry\"></div>")
                .append(
                    this._sanitizeHTML(before, { strict: true, escapeSpaces: true }),
                    $(`<b>${this._sanitizeHTML(match, { strict: true, escapeSpaces: true })}</b>`),
                    this._sanitizeHTML(after, { strict: true, escapeSpaces: true })
                );

            node.on("mousedown", ev => {
                if (ev.button) return;

                input
                    .val(text)
                    .trigger("focus");
                this._updateAutocmp();
            });

            node.on("keydown", function(ev) {
                if (ev.code !== "Enter") return;

                ev.preventDefault();
                ev.stopPropagation();
                ev.stopImmediatePropagation();

                this.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
            });

            return node;
        };

        if (
            historyCandidates.length ||
            commandCandidates.length ||
            aliasCandidates.length ||
            variableCandidates.length
        ) {
            autocomplete.show();
            container
                .css("border-bottom-left-radius", 0)
                .css("border-bottom-right-radius", 0);

            const makeDivider = (): JQuery<HTMLDivElement> => $<HTMLDivElement>("<div class=\"console-autocomplete-divider\"></div>");

            const autocmpNodes: Array<JQuery<HTMLDivElement>> = [];
            const nodes = [
                historyCandidates,
                commandCandidates,
                aliasCandidates,
                variableCandidates
            ]
                .filter(candidates => candidates.length)
                .map(
                    candidates => {
                        const candidateNodes = candidates
                            .sort((a, b) => a.indexOf(inputValue) - b.indexOf(inputValue))
                            .map(generateAutocompleteNode.bind(undefined, inputValue));
                        autocmpNodes.push(...candidateNodes);

                        return [
                            ...candidateNodes,
                            makeDivider()
                        ];
                    }
                )
                .flat();

            if (this._autocmpData.activeIndex ?? -Infinity > (this._autocmpData.nodes = autocmpNodes).length - 1) {
                this._autocmpData.activeIndex = undefined;
            }

            nodes.pop();

            autocomplete
                .empty()
                .append(...nodes);
        } else this._hideAutocomplete();
    }

    private _hideAutocomplete(): void {
        this._ui.container
            .css("border-bottom-left-radius", "")
            .css("border-bottom-right-radius", "");

        this._ui.autocomplete
            .hide()
            .empty();

        this._autocmpData.activeIndex = undefined;
        this._autocmpData.nodes.length = 0;
    }

    // The part everyone cares about
    handleQuery(query: string): boolean {
        if (query.trim().length === 0) return true;

        class CommandSyntaxError extends SyntaxError { }

        // todo command grouping, something like `condition_cmd & (cmd_that_depends_on_condition; other_cmd_that_depends_on_condition)`
        enum ChainingTypes {
            Always,
            IfPass,
            IfFail
        }

        const chainingChars = {
            [ChainingTypes.Always]: ";",
            [ChainingTypes.IfPass]: "&",
            [ChainingTypes.IfFail]: "|",

            ";": ChainingTypes.Always,
            "&": ChainingTypes.IfPass,
            "|": ChainingTypes.IfFail
        };

        interface ParsedCommand {
            name: string
            args: string[]
            next?: {
                cmd: ParsedCommand
                chaining: ChainingTypes
            }
        }

        function extractCommandsAndArgs(input: string): ParsedCommand {
            let current: ParsedCommand = {
                name: "",
                args: []
            };
            const commands: ParsedCommand = current;

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
                        case ";":
                        case "&":
                        case "|": {
                            current.next = {
                                cmd: current = {
                                    name: "",
                                    args: []
                                },
                                chaining: chainingChars[char]
                            };
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
                        case ";":
                        case "&":
                        case "|": {
                            if (inString) {
                                current.args[current.args.length - 1] += char;
                            } else {
                                current.next = {
                                    cmd: current = {
                                        name: "",
                                        args: []
                                    },
                                    chaining: chainingChars[char]
                                };
                                parserPhase = "cmd";
                            }
                            break;
                        }
                        case "\"": {
                            if (inString) {
                                current.args.push("");
                            } else if (current.args.at(-1)!.length) {
                                // If we encounter a " in the middle of an argument
                                // such as `say hel"lo`
                                throw new CommandSyntaxError("Unexpected double-quote (\") character found.");
                            }
                            inString = !inString;
                            break;
                        }
                        default: {
                            if (current.args.length === 0) {
                                current.args = [char];
                                break;
                            }

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

            if (!current.next?.cmd.name.length) delete current.next;

            return commands;
        }

        try {
            const commands: ParsedCommand = extractCommandsAndArgs(query);

            let current: ParsedCommand | undefined = commands;
            let error = false;

            const stepForward = (): void => {
                if (
                    current?.next === undefined || {
                        [ChainingTypes.Always]: false,
                        [ChainingTypes.IfPass]: error,
                        [ChainingTypes.IfFail]: !error
                    }[current.next.chaining]
                ) {
                    current = undefined;
                    return;
                }

                current = current.next.cmd;
            };

            // eslint-disable-next-line no-unmodified-loop-condition -- cfa fix when™
            while (current !== undefined) {
                error = false;

                const target = this.commands.get(current.name);
                if (target) {
                    const result = target.run(current.args);

                    if (typeof result === "object") {
                        error = true;
                        this.error.raw(`${result.err}`);
                    }
                    stepForward();
                    continue;
                }

                const alias = this.aliases.get(current.name);
                if (alias) {
                    error = !this.handleQuery(alias);
                    stepForward();
                    continue;
                }

                const cvar = this.variables.get(current.name);
                if (cvar) {
                    if (current.args.length) {
                        error = true;
                        throw new CommandSyntaxError(`Unexpected token '${current.args[0]}'`);
                    }

                    this.log(`${cvar.name} = ${cvar.value}`);
                    stepForward();
                    continue;
                }

                error = true;
                this.error(`Unknown console entity '${current.name}'`);
                stepForward();
            }
        } catch (e) {
            if (e instanceof CommandSyntaxError) {
                this.error({ main: "Parsing error", detail: e.message });
            } else {
                // forward the error
                throw e;
            }
        }

        return true;
    }

    open(): void { this.isOpen = true; }
    close(): void { this.isOpen = false; }
    toggle(): void { this.isOpen = !this._isOpen; }

    resizeAndMove(info: {
        readonly dimensions?: {
            readonly width?: number
            readonly height?: number
        }
        readonly position?: {
            readonly left?: number
            readonly top?: number
        }
    }): void {
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

    private readonly _allowedTags = [
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

    private _sanitizeHTML(message: string, opts?: { readonly strict: boolean, readonly escapeSpaces?: boolean }): string {
        return message.replace(
            /<\/?.*?>/g,
            match => {
                const tag = match.replace(/<\/?|>/g, "").split(" ")[0];

                let str = !opts?.strict && this._allowedTags.includes(tag)
                    ? match
                    : match
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");

                opts?.escapeSpaces && (str = str.replace(/ /g, "&nbsp;"));

                return str;
            }
        );
    }

    private _generateHTML(entry: ConsoleData, raw = false): JQuery<HTMLDivElement> {
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

        const [
            propertyToModify,
            sanitizer
        ]: [
            "html" | "text",
            typeof GameConsole["prototype"]["_sanitizeHTML"]
        ] = raw
            ? [
                "html",
                this._sanitizeHTML.bind(this)
            ]
            : [
                "text",
                (s: string) => s
            ];

        if (typeof entry.content === "string") {
            message.content[propertyToModify](sanitizer(entry.content, { strict: false }));
        } else {
            message.content.append(
                $("<details>").append(
                    $("<summary>")[propertyToModify](sanitizer(entry.content.main, { strict: false })),
                    Array.isArray(entry.content.detail)
                        ? $("<ul>").append(
                            entry.content.detail.map(e => ($("<li>")[propertyToModify](sanitizer(e, { strict: false })) as JQuery<JQuery.Node>))
                        )
                        : $("<span>")[propertyToModify](entry.content.detail)
                )
            );
        }

        message.container.append(message.content);

        return message.container;
    }

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
}
