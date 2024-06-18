import $ from "jquery";
import { Numeric } from "../../../../../common/src/utils/math";
import { Stack } from "../../../../../common/src/utils/misc";
import { type Game } from "../../game";
import { sanitizeHTML } from "../misc";
import { type Command } from "./commands";
import { defaultBinds, defaultClientCVars, type CVarTypeMapping } from "./defaultClientCVars";
import { Casters, ConVar, ConsoleVariables, flagBitfieldToInterface } from "./variables";

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
export type PossibleError<E> = undefined | { readonly err: E };

export interface GameSettings {
    readonly variables: Record<string, Stringable | { value: Stringable, flags?: number }>
    readonly aliases: Record<string, string>
    readonly binds: Record<string, string[]>
}

/**
 * Error type indicating that a console query has invalid syntax
 */
export class CommandSyntaxError extends SyntaxError {
    constructor(message: string, public readonly charIndex: number, public readonly length = 1) { super(message); }
}

// When opening the console with a key, the key will be typed to the console,
// because the keypress event is triggered for the input field, but only on the main menu screen
let invalidateNextCharacter = false;

// goofy infinite loop prevention for resizes
let noWidthAdjust = false;
let noHeightAdjust = false;

export class GameConsole {
    private _isOpen = false;
    get isOpen(): boolean { return this._isOpen; }
    set isOpen(value: boolean) {
        if (this._isOpen === value) return;

        this._isOpen = value;

        this.variables.get.builtIn("cv_console_open").setValue(value);

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
            binds: this.game.inputManager.binds.getAll()
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
                    const message = `Malformed CVar '${name}' found (this was either forced into local storage manually or is an old CVar that no longer exists). It will not be registered and will be deleted.`;

                    console.warn(message);
                    this.warn(message);
                    continue;
                }

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

            this._autocmpData.cache.invalidateAll();
        }

        const bindManager = this.game.inputManager.binds;
        for (const command in binds) {
            const bindList = binds[command];
            if (!bindList.length) {
                bindManager.addInputsToAction(command);
                continue;
            }

            for (const bind of bindList) {
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
        const varCollection = new ConsoleVariables(this);

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

    private static _instantiated = false;
    constructor(readonly game: Game) {
        if (GameConsole._instantiated) {
            throw new Error("Class 'GameConsole' has already been instantiated");
        }
        GameConsole._instantiated = true;

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
            (_, value) => {
                this._position.left = value;
            }
        );

        addChangeListener(
            "cv_console_top",
            (_, value) => {
                this._position.top = value;
            }
        );

        const { container, autocomplete } = this._ui;
        addChangeListener(
            "cv_console_width",
            (_, value) => {
                if (!noWidthAdjust) {
                    container.css("width", value);
                }

                autocomplete.css("width", value);
            }
        );

        addChangeListener(
            "cv_console_height",
            (_, value) => {
                if (!noHeightAdjust) {
                    container.css("height", value);
                }

                autocomplete.css("top", this._position.top + value);
            }
        );

        this.isOpen = this._isOpen;
        // sanity check
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

                        this._history.add(input);
                        this.log.raw(`> ${sanitizeHTML(input, { strict: true, escapeNewLines: true, escapeSpaces: true })}`);
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
                    get commands() { return commands ??= [...T.commands.keys()]; },
                    invalidateCommands() { commands = undefined; },

                    get aliases() { return aliases ??= [...T.aliases.keys()]; },
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
    handleQuery(query: string): boolean {
        if (query.trim().length === 0) return true;

        /*
            Now yes yes, self-documenting code and all that
            And by all means, anyone who wants to rewrite this
            in a self-documenting way is free to do so

            But for now, comments will be strewn
        */

        /**
         * The three ways to chain commands together. If thought of as operators, then
         * the three operators are right-associative, and are usually non-commutative, and non-distributive.
         *
         * In some cases, the operators can exhibit commutative or even distributive behavior, but since
         * the evaluation of an operator's operands may have side-effects, this is not guaranteed
         *
         * "Unconditional chaining" refers to the `Always` variant, which uses `;`
         * "Conditional chaining" refers to all other chaining types
         *
         * Although encapsulated in the definition of right-associativity, it's
         * worth pointing out that, for example, `a & b; c` won't evaluate `c` if `a` fails.
         * That's because the query is equivalent to `a & (b; (c))`
         */
        enum ChainingTypes {
            /**
             * Also known as "unconditional chaining" and utilizing `;`, this chaining type simply
             * executes its right-hand side regardless of the left-hand side's return value
             */
            Always,
            /**
             * Also known as "contingent chaining" and utilizing `&`, this chaining type only executes
             * its right-hand side if its left-hand side did not return an error
             */
            IfPass,
            /**
             * Also known as "fallback chaining" and utilizing `|`, this chaining type only executes
             * its right-hand side if its left-hand side returned an error
             */
            IfFail
        }

        /**
         * Convenience enum for mapping between the tokens and their associated chaining type
         */
        const chainingChars = {
            ";": ChainingTypes.Always,
            "&": ChainingTypes.IfPass,
            "|": ChainingTypes.IfFail
        };

        /**
         * Represents a node emitted by the parser. Nodes are assembled as a singly-linked list,
         * and wrap around one or more commands, which are also stored as a singly-linked list
         */
        interface ParserNode {
            /**
             * A reference to the command held by this node
             */
            cmd: ParsedCommand
            /**
             * The index of this node's first character in the original query
             */
            startIndex: number
            /**
             * The chaining type relating this node to **the one that precedes it**.
             * Set to "Always", and ignored for the first node of the list
             */
            chaining: ChainingTypes
            /**
             * A reference to the next parser node, if it exists
             */
            next?: ParserNode
        }

        /**
         * Represents a command invocation, with all of its arguments. Technically speaking,
         * this could also be a cvar access, but for the sake of simplifying vocabulary and reducing
         * mental strain, that case is ignored, since a cvar access is like a no-arg command invocation
         * from a parsing standpoint anyways
         */
        interface ParsedCommand {
            /**
             * The command's name
             */
            name: string
            /**
             * The index of this command's first character in the original query
             */
            startIndex: number
            /**
             * Arguments to invoke the command with
             */
            args: Array<{
                /**
                 * The text content of the argument
                 */
                arg: string
                /**
                 * The index of this argument's first character in the original query
                 */
                startIndex: number
            }>
            /**
             * A reference to the parser node following this command
             */
            next?: ParserNode
        }

        /**
         * Parses an input string, extracting all commands
         *
         * @param {string} input The string to extract commands from
         * @throws {CommandSyntaxError} If the input is malformed
         * @returns {ParserNode} A `ParserNode` object corresponding to the start of the query.
         * Traversing the query can be done by traversing the linked list
         */
        function extractCommandsAndArgs(input: string): ParserNode {
            /**
             * A reference to the command currently being constructed
             */
            let current: ParsedCommand = {
                name: "",
                startIndex: 0,
                args: []
            };
            /**
             * A reference to the current parser node being constructed.
             * `currentNode.cmd === current`
             */
            let currentNode: ParserNode = {
                cmd: current,
                startIndex: 0,
                chaining: 0 // No node precedes the first node, so this value is ignored anyways
            };
            /**
             * A reference to the previous parser node, kept around
             * in case we need to jump backwards and discard the last node
             */
            let prevNode: ParserNode = currentNode; // <- this is basically a useless assignment, because it'll always be replaced
            /**
             * An unchanging reference to the head of the linked list that will eventually be returned
             */
            const commands: ParserNode = currentNode;

            /**
             * Simply indicates whether the parser is currently parsing a command's name or its arguments
             *
             * The parser's behavior radically changes between these two states, and they will henceforth be
             * referred to as "`cmd` mode" and "`args` mode"
             */
            let parserPhase = "cmd" as "cmd" | "args";

            /**
             * Only relevant in `args` mode, indicates if the parser is currently traversing a string (and should thus
             * treat characters like spaces differently than usual)
             */
            let inString = false;

            /**
             * Only applicable when in a string, determines whether special characters like `"` and `\` should
             * be treated as literal characters or if they should fulfill their special functions
             */
            let escaping = false;

            /**
             * A stack of parser nodes, each one corresponding to where a group "begins".
             *
             * Consider the following query:
             * `a & (b; c); d`
             *
             * After creating a parser node for `a`, we want the entirety of the group `(b; c)` to follow it,
             * but after we're done, we want everything that comes after the group (in this case `d`) to be appended
             * to `(b; c)`'s parser node, not `c`'s parser node (which would be the value of `currentNode` after parsing
             * the group's contents). We therefore need to keep a reference to the `(b; c)` parser node, which is
             * where the `groupAnchors` stack comes in.
             *
             * Opening a group adds a new node to the stack, and closing a group pops one off, readjusting the current
             * node to ensure that the linked list is constructed correctly
             */
            const groupAnchors = new Stack<ParserNode>();

            /**
             * After a group is closed with `)`, we expect either another `)` (if closing multiple groups) or a chaining
             * character. This variable encodes this expectation
             */
            let expectingEndOfGroup = 0;

            /**
             * Whether the console is currently processing a comment. Comments are completely ignored, not even
             * being added any parser nodes, and are usually used as clarification/explanation in configuration
             * files, which are then pasted into the console
             *
             * A comment starts with an #, and all characters up to and including the next new line (\n) are
             * ignored
             */
            let commenting = false;

            /**
             * An alias for `current.args`, maintained to reduce property access spam
             */
            let args = current.args;

            /**
             * Used to provide a snippet of the original query when reporting syntax errors
             */
            let charIndex = 0;
            const throwCSE = (msg: string, mod = 0, length = 1): void => { throw new CommandSyntaxError(msg, charIndex + mod, length); };

            /**
             * Simply adds the given character to the last argument of the current command
             * @param char The character to add
             */
            const addCharToLast = (char: string): void => {
                if (!args.length) {
                    current.args = args = [{ arg: char, startIndex: charIndex }];
                } else {
                    args[args.length - 1].arg += char;
                }
            };

            /**
             * Advances the `currentNode`, setting it as the successor (or `next`) of a given target and establishing
             * the given chaining relation between the two nodes
             * @param target The target to which the new node should be appended
             * @param chaining The chaining type to use when associating the newly-created node and the `target` node
             */
            const advance = (target: { next?: ParserNode }, chaining: keyof typeof chainingChars): void => {
                prevNode = currentNode;
                target.next = currentNode = {
                    cmd: current = {
                        name: "",
                        startIndex: charIndex,
                        args: args = []
                    },
                    startIndex: charIndex,
                    chaining: chainingChars[chaining]
                };
            };

            /**
             * Benchmarks show that chunking (parsing an input such as "abcdefg" as one large block instead of
             * 7 individual characters) actually hurts performance except in specific contrived examples, the
             * detection of which also leads to an overall loss in performance
             */
            for (const char of input) {
                switch (char) {
                    case " ":
                    case "\n": {
                        const isNewLine = char === "\n";

                        if (isNewLine && commenting) {
                            commenting = false;
                            break;
                        }

                        /*
                            Ignore whitespace if there's currently no command
                            and if we're not expecting any groups to be closed

                            The last condition (`!expectingEndOfGroup`) might
                            not be totally needed, but it makes the control-flow
                            a bit neater

                            For what it's worth, it's meant to allow things like
                            `(a; b) & c` to parse correctly without ever switching
                            to args mode

                            (Also, even though newlines can't be typed in manually, they can
                            be pasted in, so that's why that case is handled)
                        */
                        if (parserPhase === "cmd") {
                            if (current.name && !expectingEndOfGroup) {
                                parserPhase = "args";
                            }

                            break;
                        }

                        if (inString) {
                            addCharToLast(char);
                            break;
                        }

                        /*
                            This ensures that a query like `cmd a  b` will only parse as
                            two arguments and not three (more generally, this ensures that
                            multiple consecutive spaces, line breaks, or combinations thereof
                            are treated as if only one had been given)
                        */
                        if (args.at(-1)?.arg.length === 0) break;

                        args.push({ arg: "", startIndex: charIndex });
                        break;
                    }
                    case "#": {
                        if (commenting) break;

                        if (inString) {
                            addCharToLast(char);
                            break;
                        }

                        commenting = true;

                        break;
                    }
                    case ";":
                    case "&":
                    case "|": {
                        if (commenting) break;

                        // Error messages explain what this is for
                        if (parserPhase === "cmd") {
                            if (!current.name) {
                                if (commands === currentNode) {
                                    throwCSE("Unexpected chaining character encountered at start of query");
                                }

                                throwCSE("Expected a query following a chaining character, but found another chaining character");
                            }

                            advance(
                                /*
                                    If we're jumping out of a group, then we pop a parser node off of the
                                    group anchor stack and use that as a target; otherwise, we just use the
                                    current parser node
                                */
                                expectingEndOfGroup
                                    ? groupAnchors.pop()
                                    : current,
                                char
                            );

                            if (expectingEndOfGroup) {
                                expectingEndOfGroup--;
                            }
                            break;
                        }

                        if (inString) {
                            addCharToLast(char);
                            break;
                        }

                        if (args.at(-1)?.arg.length === 0) {
                            args.length -= 1;
                        }

                        advance(current, char);
                        parserPhase = "cmd";
                        break;
                    }
                    case "(": {
                        if (commenting) break;

                        if (parserPhase === "cmd") {
                            if (current.name) {
                                // `ab(d` is complete nonsense
                                throwCSE("Unexpected opening parentheses character '(' found");
                            }

                            // Starting a group => save this node as an anchor to
                            // which we'll jump to after we're done parsing the group
                            groupAnchors.push(currentNode);
                            break;
                        }

                        if (inString) {
                            addCharToLast(char);
                            break;
                        }

                        throwCSE("Unexpected grouping character '('");
                    }
                    // you're stupid
                    // eslint-disable-next-line no-fallthrough
                    case ")": {
                        if (commenting) break;

                        if (parserPhase === "args") {
                            if (inString) {
                                addCharToLast(char);
                                break;
                            }

                            // Every `(` pushes onto the stack—therefore, no stack entries -> no group to close
                            if (!groupAnchors.has()) {
                                throwCSE("Unexpected grouping character ')'");
                            }

                            parserPhase = "cmd";
                            // fallthrough
                        }

                        if (!groupAnchors.has()) {
                            throwCSE("Unexpected closing parentheses character ')' found");
                        }

                        if (expectingEndOfGroup) {
                            /*
                                If we're here, then we're at the end of smth like `a | (b & (c; d))`; in that example, we'd
                                end up here when parsing the last `)`. At this point, the group anchor stack is holding—from
                                bottom to top—`a`'s parser node and `b`'s parser node. Since we're at the second `)`, that means
                                that `b`'s parser node is completely useless, since we're not going to attach anything to it—if we
                                were, then we'd've seen a chaining character instead.

                                Thus, we pop it off the stack and discard it, which puts `a`'s parser node on top.
                            */
                            groupAnchors.pop();
                            break;
                        }

                        if (!current.name) {
                            // No name -> we got smth like `a & ()`
                            throwCSE("Unexpected empty group", -1, 2);
                        }

                        expectingEndOfGroup++;
                        break;
                    }
                    case "\"": {
                        if (commenting || parserPhase === "cmd") break;

                        if (inString) {
                            if (escaping) {
                                addCharToLast(char);
                                escaping = false;
                                break;
                            }

                            args.push({ arg: "", startIndex: charIndex });
                        } else if (args.at(-1)?.arg.length) {
                            // If we encounter a " in the middle of an argument
                            // such as `say hel"lo`
                            throwCSE("Unexpected double-quote (\") character found.");
                        }

                        inString = !inString;
                        break;
                    }
                    case "\\": {
                        if (commenting || parserPhase === "cmd" || !inString || (escaping = !escaping)) break;

                        addCharToLast(char);
                        break;
                    }
                    default: {
                        if (commenting) break;

                        if (parserPhase === "cmd") {
                            if (expectingEndOfGroup) {
                                // Prevent `a & (b; c) d`
                                throwCSE(`Expected a chaining character following the end of a group (found '${char}')`);
                            }

                            current.name += char;
                            break;
                        }

                        escaping = false;
                        addCharToLast(char);
                        break;
                    }
                }
                ++charIndex;
            }

            // Self-explanatory error conditions after we reach end-of-input

            if (inString) {
                throwCSE("Unterminated string argument");
            }

            if (escaping) {
                throwCSE("Unresolved escape character");
            }

            if (groupAnchors.has() && !expectingEndOfGroup) {
                throwCSE("Unterminated command group");
            }

            if (!current.next?.cmd.name.length) delete current.next;

            if (!current.name.length) {
                /*
                    Some people just like writing `a; b;`, and it's not super duper apocalyptic to allow it,
                    even if writing something like `a; b &` is completely inane

                    So instead of throwing an error, we'll just modify the parser output
                */
                // throwCSE("Unexpected end-of-input following chaining character");
                delete prevNode.cmd.next;
            } else {
                const args = current.args;
                if (args.at(-1)?.arg.length === 0) {
                    args.length -= 1;
                }
            }

            return commands;
        }

        try {
            /**
             * Reference to the current parser node being processed. A value of `undefined`
             * signifies that we're done with the query and that no more processing is to be done
             */
            let currentNode: ParserNode | undefined = extractCommandsAndArgs(query);
            /**
             * Plays a similar role to the `groupAnchors` stack used in the parser, that being
             * to keep track of where we should jump to after finishing the execution of a command
             * group. Unlike the parser's version, this stores the node where execution should resume,
             * not the node preceding it
             */
            const groupAnchors = new Stack<ParserNode>();
            /**
             * Whether the command that has just run returned an error or not
             */
            let error = false;

            /**
             * Given a target, this function determines if it should be jumped to or not
             * @param target The parser node to attempt jumping to
             * @returns The target in question if the jump should be made, `undefined` otherwise
             */
            const determineJumpTarget = <T extends ParserNode>(target: T): T | undefined => (
                ({
                    [ChainingTypes.Always]: true,
                    [ChainingTypes.IfPass]: !error,
                    [ChainingTypes.IfFail]: error
                }[target.chaining])
                    ? target
                    : undefined
            );

            /**
             * Pushes the current node's `next` reference
             * onto the group anchor stack if it exists.
             *
             * If it does exist, then that's because this node's `cmd`
             * is actually a command group, and we need the `next` node
             * to know where to jump to once we're done executing the group
             */
            const pushGroupAnchorIfPresent = (): void => {
                if (currentNode?.next) {
                    groupAnchors.push(currentNode.next);
                }
            };

            /**
             * Jumps to the node located at the top of the `groupAnchors` stack. This method
             * mutates `currentNode`, possibly leaving it as `undefined` if the jump is disallowed
             * because of conditional chaining
             * @returns Whether a jump has been attempted; in other words, if there was a node to pop
             * off of the stack. A value of `true` does not guarantee that `currentNode` isn't `undefined`,
             * since it's possible for the jump to popped node to fail because of conditional chaining
             */
            const jumpToPoppedAnchorIfPresent = (): boolean => {
                const doJump = groupAnchors.has();

                if (doJump) {
                    currentNode = determineJumpTarget(groupAnchors.pop());
                }

                return doJump;
            };

            /**
             * Steps to the next node that should be processed. This method is
             * sensitive to groupings and the state of the nodes it operates on, so
             * this is not simply a `currentNode = currentNode.next` operation
             */
            const stepForward = (): void => {
                if (currentNode?.cmd?.next === undefined) {
                    /*
                        Reaching the last command of the current group means that
                        we should either jump out of the group or that we're at the
                        end of the query
                    */
                    if (jumpToPoppedAnchorIfPresent()) {
                        // If we tried to jump out of a group, then there's nothing left to do
                        return;
                    }

                    // But if we didn't, then we conclude that we're at the end of the query
                    currentNode = undefined;
                    return;
                }

                // Jump to the next node
                currentNode = determineJumpTarget(currentNode.cmd.next);

                if (currentNode === undefined) {
                    /*
                        If the jump was unsuccessful, then we try to exit out
                        of any group we might happen to be in. This is for cases
                        like `a & (b & c); d`—if the jump from `b` to `c` fails,
                        then we should jump out to `d`, whose node would be present
                        on the stack at that moment
                    */
                    jumpToPoppedAnchorIfPresent();
                } else {
                    /*
                        If we did jump to another node, then try to push a new group
                        anchor onto the stack, if there's one.
                        See `pushGroupAnchorIfPresent`'s comment
                    */
                    pushGroupAnchorIfPresent();
                }
            };

            /*
                Handles cases like `(a & b); c`, where we need to add a group anchor immediately
            */
            pushGroupAnchorIfPresent();

            let iterationCount = 0;

            while (currentNode !== undefined) {
                if (++iterationCount === 1e3) {
                    console.warn("1000 iterations of query parsing; possible infinite loop");
                }
                error = false;
                const { name, args } = currentNode.cmd;

                const cmd = this.commands.get(name);
                if (cmd) {
                    const result = cmd.run(args.map(e => e.arg));

                    if (typeof result === "object") {
                        error = true;
                        this.error.raw(`${result.err}`);
                    }
                    stepForward();
                    continue;
                }

                const alias = this.aliases.get(name);
                if (alias !== undefined) {
                    error = !this.handleQuery(alias);
                    stepForward();
                    continue;
                }

                const cvar = this.variables.get(name);
                if (cvar) {
                    if (args.length) {
                        error = !this.handleQuery(`assign ${name} ${args.map(v => `"${v.arg}"`).join(" ")}`);
                    } else {
                        this.log(`${cvar.name} = ${cvar.value}`);
                    }

                    stepForward();
                    continue;
                }

                error = true;
                this.error(`Unknown console entity '${name}'`);
                stepForward();
            }
        } catch (e) {
            if (e instanceof CommandSyntaxError) {
                const index = e.charIndex;
                const padding = 15;
                const nbsp = "\u00a0";

                this.error.raw({
                    main: "Parsing error",
                    detail: `${e.message}<br><pre><code>`
                    + `${
                        sanitizeHTML(
                            query.slice(Math.max(0, index - padding), index + padding),
                            { strict: true, escapeSpaces: true }
                        )
                    }<br>${`${nbsp.repeat(Math.min(index, padding))}${"^".repeat(e.length)}`.padEnd(Math.min(query.length, padding), nbsp)}</code></pre>`
                });
            } else {
                // Forward the error
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
}
