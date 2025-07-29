/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Badges } from "@common/definitions/badges";
import { Numeric } from "@common/utils/math";
import $ from "jquery";
import { Game } from "../game";
import { InputManager, type CompiledAction, type CompiledTuple } from "../managers/inputManager";
import { sanitizeHTML } from "../utils/misc";
import { type Command } from "./commands";
import { evalQuery, extractCommandsAndArgs } from "./internals";
import { Casters, ConsoleVariables, ConVar, defaultBinds, defaultClientCVars, flagBitfieldToInterface, type CVarTypeMapping } from "./variables";

const enum MessageType {
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
export type PossibleError<E> = undefined | { readonly err: E };

export interface GameSettings {
    readonly variables: Record<string, Stringable | { value: Stringable, flags?: number }>
    readonly aliases: Record<string, string>
    readonly binds: Record<string, string[]>
}

// When opening the console with a key, the key will be typed to the console,
// because the keypress event is triggered for the input field, but only on the main menu screen
let invalidateNextCharacter = false;

// goofy infinite loop prevention for resizes
let noWidthAdjust = false;
let noHeightAdjust = false;

export const GameConsole = new (class GameConsole {
    private _isOpen = false;
    get isOpen(): boolean { return this._isOpen; }
    set isOpen(value: boolean) {
        if (this._isOpen === value) return;

        this._isOpen = value;

        this.variables.get.builtIn("cv_console_open").setValue(value);

        if (this._isOpen) {
            this._ui.globalContainer.show();
            this._ui.input.trigger("focus");

            invalidateNextCharacter = !Game.gameStarted;
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
        let set: ConsoleVariables["set"]["builtIn"] | undefined;

        return {
            get width() { return width; },
            set width(w: number) {
                w = Numeric.clamp(
                    w,
                    0,
                    window.innerWidth - (Number.isNaN(T._position?.left ?? NaN) ? -Infinity : T._position.left)
                );

                (set ??= T.variables.set.builtIn)("cv_console_width", width = w);
            },

            get height() { return height; },
            set height(h: number) {
                h = Numeric.clamp(
                    h,
                    0,
                    window.innerHeight - (Number.isNaN(T._position?.top ?? NaN) ? -Infinity : T._position.top)
                );

                (set ??= T.variables.set.builtIn)("cv_console_height", height = h);
            }
        };
    })();

    private readonly _position = (() => {
        let left = NaN;
        let top = NaN;

        const magicalPadding /* that prevents scroll bars from showing up */ = 1;
        const T = this;
        let set: ConsoleVariables["set"]["builtIn"] | undefined;
        const { container, autocomplete } = this._ui;

        return {
            get left() { return left; },
            set left(l: number) {
                l = Numeric.clamp(
                    l,
                    0,
                    window.innerWidth - T._dimensions.width - magicalPadding
                );

                if (left !== l) {
                    (set ??= T.variables.set.builtIn)("cv_console_left", left = l);
                    container.css("left", left);
                    autocomplete.css("left", left);
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
                    (set ??= T.variables.set.builtIn)("cv_console_top", top = t);
                    container.css("top", top);
                    autocomplete.css("top", top + T._dimensions.height);
                }
            }
        };
    })();

    private readonly _entries: ConsoleData[] = [];

    private readonly _localStorageKey = "suroi_config";

    private readonly _history = new (class HistoryManager<T> {
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

        all(): T[] {
            return this._backingArray;
        }
    })<string>();

    clearHistory(): void {
        this._history.clear();
    }

    writeToLocalStorage(
        {
            includeDefaults = false,
            includeNoArchive = false
        }: {
            readonly includeDefaults?: boolean
            readonly includeNoArchive?: boolean
        } = {}
    ): void {
        const settings: GameSettings = {
            variables: this.variables.getAll({ defaults: !includeDefaults, noArchive: !includeNoArchive }),
            aliases: Object.fromEntries(this.aliases),
            binds: InputManager.binds.getAll()
        };

        localStorage.setItem(this._localStorageKey, JSON.stringify(settings));
    }

    readFromLocalStorage(): void {
        const storedConfig = localStorage.getItem(this._localStorageKey);

        const binds = JSON.parse(JSON.stringify(defaultBinds)) as GameSettings["binds"];
        let rewriteToLS = false;

        if (storedConfig) {
            const config = JSON.parse(storedConfig) as GameSettings;

            for (const name in config.variables) {
                const variable = config.variables[name];
                const value = typeof variable === "object" ? variable?.value : variable;

                if (name in defaultClientCVars) {
                    this.variables.set.builtIn(name as keyof CVarTypeMapping, value as string, false);
                    continue;
                }

                rewriteToLS = true;

                if (!name.match(/^uv_[a-zA-Z0-9_]+$/)) {
                    const message = `Malformed CVar '${name}' found (this was either forced into local storage manually or `
                        + "is an old CVar that no longer exists). It will not be registered and will be deleted.";

                    console.warn(message);
                    this.warn(message);
                    continue;
                }

                this.variables.declareCVar(
                    new ConVar(
                        name,
                        value,
                        Casters.toString,
                        {
                            archive: true,
                            cheat: false,
                            readonly: false,
                            ...(typeof variable === "object" ? flagBitfieldToInterface(variable?.flags ?? 0) : {})
                        }
                    )
                );
            }

            // FIXME remove after one or two updates (transition code grace period)
            // written on november 9th 2024
            const badge = this.variables.get.builtIn("cv_loadout_badge").value;
            if (!Badges.hasString(badge) && !badge.startsWith("bdg_") && badge !== "") {
                this.variables.set.builtIn("cv_loadout_badge", `bdg_${badge}`);
                rewriteToLS = true;
            }

            if (config.binds) {
                for (const key in config.binds) {
                    binds[key] = config.binds[key];
                }
                rewriteToLS = true;
            }

            for (const alias in config.aliases) {
                this.aliases.set(alias, config.aliases[alias]);
            }

            this._autocmpData.cache.invalidateAll();
        }

        const nameRemap = {
            "-": "Minus",

            "equals": "Equal",
            "=": "Equal",

            "leftbracket": "BracketLeft",
            "[": "BracketLeft",

            "rightbracket": "BracketRight",
            "]": "BracketRight",

            ";": "Semicolon",

            "apostrophe": "Quote",
            "'": "Quote",

            "\\": "Backslash",
            ",": "Comma",
            ".": "Period",
            "/": "Slash",
            "`": "Backquote"
        };

        const bindManager = InputManager.binds;
        for (const command in binds) {
            const bindList = binds[command];
            if (bindList.length === 0) {
                bindManager.addInputsToAction(command);
                continue;
            }

            for (let bind of bindList) {
                const mapKeyName = bind.replace(/_/g, "").toLowerCase();
                if (mapKeyName in nameRemap) {
                    const newName = nameRemap[mapKeyName as keyof typeof nameRemap];
                    this.warn.raw(
                        `Input <code>${bind}</code> (bound to <code>${command}</code>) is not a supported name; `
                        + `it has automatically been changed to its proper name—<code>${newName}</code>—for you.`
                    );
                    bind = newName;
                    rewriteToLS = true;
                }
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

        this.isOpen = this.getBuiltInCVar("cv_console_open");
    }

    readonly commands = (() => {
        const map = new Map<string, Command<boolean, Stringable>>();

        const nativeSet = map.set.bind(map);
        const nativeClear = map.clear.bind(map);
        const nativeDelete = map.delete.bind(map);

        map.set = (key, value) => {
            const retVal = nativeSet(key, value);
            this._autocmpData.cache.invalidateCommands();
            return retVal;
        };

        map.clear = () => {
            nativeClear();
            this._autocmpData.cache.invalidateCommands();
        };

        map.delete = key => {
            const retVal = nativeDelete(key);

            if (retVal) {
                this._autocmpData.cache.invalidateCommands();
            }

            return retVal;
        };

        return map;
    })();

    readonly aliases = (() => {
        const map: Map<string, string> & {
            delete(key: string, removeInverse?: boolean): boolean
        } = new Map();

        const nativeSet = map.set.bind(map);
        const nativeClear = map.clear.bind(map);
        const nativeDelete = map.delete.bind(map);

        map.set = (key, value) => {
            const retVal = nativeSet(key, value);
            this._autocmpData.cache.invalidateAliases();
            return retVal;
        };

        map.clear = () => {
            nativeClear();
            this._autocmpData.cache.invalidateAliases();
        };

        map.delete = (key: string, removeInverse = false) => {
            let baseName = key;

            removeInverse &&= (
                ["+", "-"].includes(key[0])
                    ? (baseName = key.slice(1), true)
                    : false
            ) || map.has(`+${key}`);

            const [fwName, bwName] = removeInverse
                ? [`+${baseName}`, `-${baseName}`]
                : [key, key];

            const retVal = nativeDelete(fwName);

            if (retVal) {
                this._autocmpData.cache.invalidateAliases();

                if (removeInverse) {
                    nativeDelete(bwName);
                }
            }

            return retVal;
        };

        return map;
    })();

    readonly variables = (() => {
        const varCollection = new ConsoleVariables();

        const nativeDeclare = varCollection.declareCVar.bind(varCollection);
        const nativeRemove = varCollection.removeCVar.bind(varCollection);

        varCollection.declareCVar = (cvar: ConVar<Stringable>) => {
            const retVal = nativeDeclare(cvar);

            if (retVal === undefined) {
                this._autocmpData.cache.invalidateVariables();
            }

            return retVal;
        };

        varCollection.removeCVar = (name: string) => {
            const retVal = nativeRemove(name);

            if (retVal === undefined) {
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

    private _instantiated = false;
    init(): void {
        if (this._instantiated) {
            throw new Error("GameConsole has already been instantiated");
        }
        this._instantiated = true;

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
                        // lol ok
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        main: `Javascript ${err.error ? `'${Object.getPrototypeOf(err.error)?.constructor?.name}'` : err.type} occurred at ${err.filename.replace(location.origin + location.pathname, "./")}:${err.lineno}:${err.colno}`,
                        // this is just peak ????? lol
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        detail: err.error ?? err.message
                    },
                    true
                );

                console.error(err);
            }
        });
        const addChangeListener = this.variables.addChangeListener.bind(this.variables);
        addChangeListener(
            "cv_console_left",
            val => this._position.left = val
        );

        addChangeListener(
            "cv_console_top",
            val => this._position.top = val
        );

        const { container, autocomplete } = this._ui;
        addChangeListener(
            "cv_console_width",
            val => {
                if (!noWidthAdjust) {
                    container.css("width", val);
                }

                autocomplete.css("width", val);
            }
        );

        addChangeListener(
            "cv_console_height",
            val => {
                if (!noHeightAdjust) {
                    container.css("height", val);
                }

                autocomplete.css("top", this._position.top + val);
            }
        );

        addChangeListener("cv_console_open", val => this.isOpen = val);

        this.isOpen = this._isOpen;
        // sanity check

        this.readFromLocalStorage();
    }

    private _attachListeners(): void {
        // Close button
        {
            this._ui.closeButton.on("click", e => {
                if (e.button !== 0) return;

                this.close();
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

                noWidthAdjust = true;
                this._dimensions.width = size.inlineSize;
                noWidthAdjust = false;

                noHeightAdjust = true;
                this._dimensions.height = size.blockSize;
                noHeightAdjust = false;
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

                        this.log.raw(`> ${sanitizeHTML(input, { strict: true, escapeNewLines: true, escapeSpaces: true })}`);
                        if (input !== "") {
                            this._history.add(input);
                            this.handleQuery(input, "never");
                        }
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

            invalidateAll: () => void
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
                get commands() { return commands ??= Array.from(T.commands.keys()); },
                invalidateCommands() { commands = undefined; },

                get aliases() { return aliases ??= Array.from(T.aliases.keys()); },
                invalidateAliases() { aliases = undefined; },

                get variables() { return variables ??= Object.keys(T.variables.getAll()); },
                invalidateVariables() { variables = undefined; },

                invalidateAll() {
                    this.invalidateCommands();
                    this.invalidateAliases();
                    this.invalidateVariables();
                }
            };
        })()
    };

    private _sanitizeRegExp(str: string): string {
        return str.replace(/[[\](){}\\.+\-*!<>$|^?:]/g, r => `\\${r}`);
    }

    private _updateAutocmp(): void {
        // TODO autocomplete for command invocations

        const inputValue = this._ui.input.val() as string;
        const { autocomplete, input, container } = this._ui;
        const primaryEntity = inputValue.split(" ")[0];

        const isEmpty = inputValue.length === 0;

        const findMatches = (name: string): string[] => {
            if (name.includes(inputValue)) return isEmpty ? [] : [inputValue];

            const tokens = primaryEntity.split("_");
            if (tokens.filter(s => s.length).length === 1) return [];

            for (const token of tokens) {
                const replaced = name.replace(
                    new RegExp(
                        `${this._sanitizeRegExp(`${token}_`)}|${this._sanitizeRegExp(`_${token}`)}`
                    ),
                    ""
                );

                if (replaced === name) {
                    return [];
                }

                name = replaced;
            }

            return tokens;
        };

        const matches = (name: string): boolean => findMatches(name).length !== 0;
        const cache = this._autocmpData.cache;

        let commands: string[];
        let aliases: string[];
        let variables: string[];
        const [
            historyCandidates,
            commandCandidates,
            aliasCandidates,
            variableCandidates
        ] = isEmpty
            ? [
                this._history.all(),
                [],
                [],
                []
            ]
            : [
                this._history.filter(
                    (() => {
                        const allEntities = ([] as string[]).concat(
                            commands ??= cache.commands,
                            aliases ??= cache.aliases,
                            variables ??= cache.variables
                        );

                        return (s: string) => matches(s) && !allEntities.includes(s);
                    })()
                ),
                (commands ??= cache.commands).filter(s => matches(s)),
                (aliases ??= cache.aliases).filter(s => matches(s)),
                (variables ??= cache.variables).filter(s => matches(s))
            ];

        const generateAutocompleteNode = (text: string): JQuery<HTMLDivElement> => {
            const matches = findMatches(text);

            let sanitized = sanitizeHTML(text, { strict: true, escapeSpaces: true });

            if (matches.length) {
                sanitized = sanitized.replace(
                    new RegExp(
                        matches.map(m => this._sanitizeRegExp(m)).join("|"),
                        "g"
                    ),
                    r => `<b>${sanitizeHTML(r, { strict: true, escapeSpaces: true })}</b>`
                );
            }

            const node = $<HTMLDivElement>("<div tabindex=\"0\" class=\"console-input-autocomplete-entry\"></div>")
                .append(sanitized);

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
            historyCandidates.length
            || commandCandidates.length
            || aliasCandidates.length
            || variableCandidates.length
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
                            .map(text => generateAutocompleteNode(text));
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
    /**
     * Evaluates a console query in the form of a string
     * @param query The query to evaluate
     * @param [compileHint="normal"] A hint on how the parser should compile the given query. Compiling a
     * query creates a faster-to-execute version, at a small execution time and memory penalty. For queries
     * entered by-hand into the console, this tradeoff is usually not worth it, since the queries are unlikely
     * to be repeated; inversely, for queries bound to inputs, the tradeoff is almost always worth it.
     * - `never`:  Never generate a compiled version of this query. If you do not intend to consult the `compiled`
     *             field of this function's return value (or generally do not care about this function's
     *             return value), you should use this.
     * - `normal`: Only compile this query if it is sufficiently simple. "Simple" is up to the parser to define,
     *             but usually, a query which is composed of a single invocation (whether a command, alias, or
     *             variable access/assignment) is considered "simple". This is the default option.
     * - `always`: Always generate a compiled version of this query. Self-explanatory.
     * @returns An object containing a `success` boolean and, possibly, a compiled version of the query. The `success`
     *          boolean indicates whether the query executed without
     */
    handleQuery(
        query: string,
        _compileHint: "never" | "normal" | "always" = "normal"
    ): { readonly success: boolean, readonly compiled?: CompiledAction | CompiledTuple } {
        return { success: evalQuery(extractCommandsAndArgs(query)) };
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
            typeof sanitizeHTML
        ] = raw
            ? [
                "html",
                sanitizeHTML
            ]
            : [
                "text",
                (s: string) => s
            ];

        if (typeof entry.content === "string") {
            message.content[propertyToModify](
                sanitizer(
                    entry.content,
                    {
                        strict: false,
                        escapeSpaces: true,
                        escapeNewLines: true
                    }
                )
            );
        } else {
            message.content.append(
                $("<details>").append(
                    $("<summary>")[propertyToModify](
                        sanitizer(
                            entry.content.main,
                            {
                                strict: false,
                                escapeSpaces: true,
                                escapeNewLines: true
                            }
                        )
                    ),
                    Array.isArray(entry.content.detail)
                        ? $("<ul>").append(
                            entry.content.detail.map(
                                e => (
                                    $<HTMLLIElement>("<li>")[propertyToModify](
                                        sanitizer(
                                            e,
                                            {
                                                strict: false,
                                                escapeSpaces: true,
                                                escapeNewLines: true
                                            }
                                        )
                                    ) as JQuery<JQuery.Node>
                                )
                            )
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
})();

declare global {
    interface Window {
        GameConsole: typeof GameConsole
    }
}

window.GameConsole = GameConsole;
