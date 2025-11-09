import { Stack } from "@common/utils/misc";
import { GameConsole } from "./gameConsole";

/**
 * General error type for console-related affairs
 */
export abstract class ConsoleError extends SyntaxError {
    abstract readonly title: string;

    constructor(
        message: string,
        public readonly charIndex: number,
        public readonly length = 1
    ) { super(message); }
}

/**
 * Error type indicating that a console query has invalid syntax
 */
export class CommandSyntaxError extends ConsoleError {
    override readonly title = "Parsing error";

    constructor(
        message: string,
        charIndex: number,
        length = 1
    ) { super(message, charIndex, length); }
}

/**
 * Error type indicating that a variable reference doesn't exist
 */
export class CVarReferenceError extends ConsoleError {
    override readonly title = "Reference error";

    constructor(
        message: string,
        charIndex: number,
        length = 1
    ) { super(message, charIndex, length); }
}

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
export const enum ChainingTypes {
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
export const chainingChars = {
    ";": ChainingTypes.Always,
    "&": ChainingTypes.IfPass,
    "|": ChainingTypes.IfFail
};

/**
 * Represents a node emitted by the parser. Nodes are assembled as a singly-linked list,
 * and wrap around one or more commands, which are also stored as a singly-linked list
 */
export interface ParserNode {
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
 * mental strain, that case is ignored, since a cvar access is like a no-arg command
 * invocation from a parsing standpoint anyways. CVar assignments also behave like
 * single-arg command invocation from a parsing standpoint.
 */
export interface ParsedCommand {
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
         * The parts making up this argument. For non-string args, this
         * will always be a single raw part
         */
        parts: Array<{
            /**
             * Whether this part is a raw string or the name of a variable
             * to be dereferenced
             */
            type: "raw" | "reference"
            /**
             * The textual content
             */
            content: string
            /**
             * The index of this part's first character in the original query
             */
            startIndex: number
        }>
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

// for this cache to be useful, parser tree outputs as returned from
// extractCommandsAndArgs must not be modified at all!
const _parserCache_ = new Map<string, ParserNode>();

/**
 * Parses an input string, extracting all commands
 *
 * @param {string} input The string to extract commands from
 * @throws {CommandSyntaxError} If the input is malformed
 * @returns {ParserNode} A `ParserNode` object corresponding to the start of the query.
 * Traversing the query can be done by traversing the linked list
 */
export function extractCommandsAndArgs(input: string): ParserNode {
    // Memoization
    const cached = _parserCache_.get(input);
    if (cached !== undefined) return cached;

    /*
        Parsing output examples:

        Empty query ()
        {
            "cmd": {
                "name": "",
                "startIndex": 0,
                "args": []
            },
            "startIndex": 0,
            "chaining": 0
        }

        Single command, no-arg (test)
        {
            "cmd": {
                "name": "test",
                "startIndex": 0,
                "args": []
            },
            "startIndex": 0,
            "chaining": 0
        }

        Single command w/ arg (test foo)
        {
            "cmd": {
                "name": "test",
                "startIndex": 0,
                "args": [
                    {
                        "arg": [
                            {
                                "type": "raw",
                                "content": "foo",
                                "startIndex": 5
                            }
                        ],
                        "startIndex": 5
                    }
                ]
            },
            "startIndex": 0,
            "chaining": 0
        }

        Single command w/ arg, interp (test "foo {bar} baz")
        {
            "cmd": {
                "name": "test",
                "startIndex": 0,
                "args": [
                    {
                        "arg": [
                            {
                                "type": "raw",
                                "content": "foo ",
                                "startIndex": 6
                            },
                            {
                                "type": "reference",
                                "content": "bar",
                                "startIndex": 10
                            },
                            {
                                "type": "raw",
                                "content": " baz",
                                "startIndex": 14
                            }
                        ],
                        "startIndex": 6
                    }
                ]
            },
            "startIndex": 0,
            "chaining": 0
        }

        Unconditional chaining (test; test2)
        {
            "cmd": {
                "name": "test",
                "startIndex": 0,
                "args": [],
                "next": {
                    "cmd": {
                        "name": "test2",
                        "startIndex": 4,
                        "args": []
                    },
                    "startIndex": 4,
                    "chaining": 0
                }
            },
            "startIndex": 0,
            "chaining": 0
        }

        Conditional chain w/ group and follow-up (test & (test2; test3); test4)
        {
            "cmd": {
                "name": "test",
                "startIndex": 0,
                "args": [],
                "next": {
                    "cmd": {
                        "name": "test2",
                        "startIndex": 5,
                        "args": [],
                        "next": {
                            "cmd": {
                                "name": "test3",
                                "startIndex": 13,
                                "args": []
                            },
                            "startIndex": 13,
                            "chaining": 0
                        }
                    },
                    "startIndex": 5,
                    "chaining": 1,
                    "next": {
                        "cmd": {
                            "name": "test4",
                            "startIndex": 21,
                            "args": []
                        },
                        "startIndex": 21,
                        "chaining": 0
                    }
                }
            },
            "startIndex": 0,
            "chaining": 0
        }

        Leading group w/ chaining ((test; test2) | test3)
        {
            "cmd": {
                "name": "test",
                "startIndex": 0,
                "args": [],
                "next": {
                    "cmd": {
                        "name": "test2",
                        "startIndex": 5,
                        "args": []
                    },
                    "startIndex": 5,
                    "chaining": 0
                }
            },
            "startIndex": 0,
            "chaining": 0,
            "next": {
                "cmd": {
                    "name": "test3",
                    "startIndex": 14,
                    "args": []
                },
                "startIndex": 14,
                "chaining": 2
            }
        }
    */

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
     * An unchanging reference to the head of the linked list
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
     * Whether the current argument part should be treated as a literal or as the name of a variable to
     * later dereference
     */
    let argType = "raw" as "raw" | "reference";

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
     * After parsing a space character, we record the intent to create a new argument, and do so if
     * we meet a character that should do so (such as a quote or a plain letter)
     */
    let creatingNewArg = false;

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
    const throwCSE = (msg: string, mod = 0, length = 1): never => { throw new CommandSyntaxError(msg, charIndex + mod, length); };

    /**
     * Simply adds the given character to the last argument of the current command
     * @param char The character to add
     */
    const addCharToLast = (char: string): void => {
        creatingNewArg = false;
        if (args.length === 0) {
            current.args = args = [{ parts: [{ type: argType, content: char, startIndex: charIndex }], startIndex: charIndex }];
        } else {
            const last = args[args.length - 1].parts;
            if (last.length === 0) {
                last[0] = { type: argType, content: char, startIndex: charIndex };
            } else {
                last[last.length - 1].content += char;
            }
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
                    if (current.name && expectingEndOfGroup === 0) {
                        parserPhase = "args";
                        creatingNewArg = true;
                    }

                    break;
                }

                if (inString) {
                    addCharToLast(char);
                    escaping = false;
                    break;
                }

                creatingNewArg = true;
                break;
            }
            case "#": {
                if (commenting) break;

                if (inString) {
                    addCharToLast(char);
                    escaping = false;
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

                    const jumpingFromGroup = expectingEndOfGroup > 0;
                    advance(
                        /*
                            If we're jumping out of a group, then we pop a parser node off of the
                            group anchor stack and use that as a target; otherwise, we just use the
                            current parser node
                        */
                        jumpingFromGroup
                            ? groupAnchors.pop()
                            : current,
                        char
                    );

                    if (jumpingFromGroup) {
                        expectingEndOfGroup--;
                    }
                    break;
                }

                if (inString) {
                    addCharToLast(char);
                    escaping = false;
                    break;
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
                    escaping = false;
                    break;
                }

                throwCSE("Unexpected grouping character '('");
                break; // technically not necessary because the above line throws an exception, but it makes biome shut up
            }
            case ")": {
                if (commenting) break;

                if (parserPhase === "args") {
                    if (inString) {
                        addCharToLast(char);
                        escaping = false;
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

                if (expectingEndOfGroup !== 0) {
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
            case "{": {
                if (commenting) break;

                if (inString && !escaping) {
                    if (argType === "reference") {
                        throwCSE("Unexpected start-of-reference ({) character encountered");
                    }

                    argType = "reference";
                    // if there are currently no args, then the new node will automatically be created
                    // on the next call to addCharToLast, so we don't need to do anything
                    if (args.length) {
                        // biome-ignore lint/style/noNonNullAssertion: the array isn't empty => there is an element at index -1
                        const lastArg = args.at(-1)!.parts;
                        let lastPart: ParsedCommand["args"][number]["parts"][number] | undefined;
                        if ((lastPart = lastArg.at(-1))?.content.length === 0) {
                            // if the current part is empty, reuse it by switching its type

                            // biome-ignore lint/style/noNonNullAssertion: undefined is not equal to 0 => coming here implies lastPart is non-null
                            lastPart!.type = argType;
                        } else {
                            // otherwise create a new one
                            lastArg.push({ type: argType, content: "", startIndex: charIndex });
                        }
                    }
                } else if (parserPhase === "args") {
                    addCharToLast(char);
                    escaping = false;
                } else current.name += char;
                break;
            }
            case "}": {
                if (commenting) break;

                if (inString && argType === "reference") {
                    argType = "raw";

                    let lastArg: ParsedCommand["args"][number]["parts"] | undefined;
                    if (
                        args.length === 0
                        // biome-ignore lint/style/noNonNullAssertion: above condition checks that args isn't empty
                        || (lastArg = args.at(-1)!.parts).at(-1)?.content.length === 0
                    ) {
                        throwCSE("Unexpected empty reference", -1, 2);
                    }

                    // biome-ignore lint/style/noNonNullAssertion: empty args array results in thrown CSE; args is therefore not empty by the time we're here
                    (lastArg ??= args.at(-1)!.parts).push({ type: argType, content: "", startIndex: charIndex });
                } else if (parserPhase === "args") {
                    addCharToLast(char);
                    escaping = false;
                } else current.name += char;
                break;
            }
            case "\"": {
                if (commenting) break;

                if (parserPhase === "cmd") {
                    // writing smth like `ab"d"` is objectively both ugly and stupid, but we can parse it so…
                    parserPhase = "args";
                    inString = true;
                    break;
                }

                if (inString) {
                    if (escaping) {
                        addCharToLast(char);
                        escaping = false;
                        break;
                    }

                    if (argType === "reference") {
                        throwCSE("Unterminated variable reference");
                    }
                } else {
                    const lastArg = args[args.length - 1];
                    const currentArgLength = lastArg?.parts[lastArg.parts.length - 1]?.content.length;
                    if (currentArgLength === undefined || creatingNewArg) {
                        /*
                            Runs when opening an argument with a quote. For example,

                            echo "a"
                                 ^
                                runs here

                            echo b "a"
                                   ^
                                  runs here

                            Responsible for creating a new args entry
                        */
                        args.push({ parts: [{ type: argType, content: "", startIndex: charIndex }], startIndex: charIndex });
                        creatingNewArg = false;
                    } else if (currentArgLength !== 0) {
                        // If we encounter a " in the middle of an argument
                        // such as `say hel"lo`
                        throwCSE("Unexpected double-quote (\") character found.");
                    }
                }

                inString = !inString;
                break;
            }
            case "\\": {
                if (commenting) break;
                if (parserPhase === "cmd" || !inString || !(escaping = !escaping)) {
                    addCharToLast(char);
                    break;
                }
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
                if (creatingNewArg) {
                    args.push({ parts: [{ type: argType, content: "", startIndex: charIndex }], startIndex: charIndex });
                }
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

    if (groupAnchors.has() && expectingEndOfGroup === 0) {
        throwCSE("Unterminated command group");
    }

    if (!current.next?.cmd.name.length) delete current.next;

    if (!current.name.length) {
        // If someone writes something like "foo;", it would leave an
        // empty command at the end, so remove it
        // Even though something like "bar &" is kinda nonsense, it's not
        // really a big deal to allow it

        // throwCSE("Unexpected end-of-input following chaining character");
        delete prevNode.cmd.next;
    }

    _parserCache_.set(input, commands);
    return commands;
}

/**
 * Resolves an arguments list, also indicating if the list as a whole is constant.
 * A "constant argument list" is one that references no variables (and thus would
 * always be resolved identically)
 */
function makeArgsResolver() {
    /**
     * Resolves an array of argument parts. Raw parts are appended as-is, and variables
     * are dereferenced. Dereferencing a CVar that does not exist leads to a {@link CVarReferenceError}
     * being thrown. This function returns its values as a tuple whose first element is
     * a boolean indicating if this argument is constant (an argument is considered constant
     * if it references no variable) and whose second argument is the resolved string
     */
    const resolveArgParts = (parts: ParsedCommand["args"][number]["parts"]): [isConst: boolean, value: string] => {
        let isConst = true;
        //    vvvvv -> do not inline, has side-effects
        const value = parts.reduce<string>(
            (acc, cur) => {
                if (cur.type === "raw") return acc + cur.content;

                isConst = false;
                const cvar = GameConsole.variables.get(cur.content);
                if (cvar === undefined) {
                    throw new CVarReferenceError(`Variable '${cur.content}' not found`, cur.startIndex, cur.content.length);
                }

                return `${acc}${cvar.value}`;
            },
            ""
        );

        return [
            isConst,
            value
        ];
    };

    /**
     * Resolves an arguments list, also indicating if the list as a whole is constant.
     * A "constant argument list" is one that references no variables (and thus would
     * always be resolved identically)
     */
    // biome-ignore lint/complexity/useArrowFunction: not sure why this isn't an arrow function but I'm not touching it
    return function(args: Readonly<ParsedCommand["args"]>): [isConst: boolean, values: string[]] {
        let isConst = true;
        const value = args.map(e => {
            const [argIsConst, argVal] = resolveArgParts(e.parts);
            isConst &&= argIsConst;
            return argVal;
        });

        return [isConst, value];
    };
};

/**
 * Evaluates a console query in the form of a string
 * @param query The query to evaluate
 * @returns A boolean indicating whether the query was evaluated without error (which is
 *          to say, none of the invocations raised errors)
 */
export function evalQuery(query: ParserNode): boolean {
    /**
     * Reference to the current parser node being processed. A value of `undefined`
     * signifies that we're done with the query and that no more processing is to be done
     */
    let currentNode: ParserNode | undefined = query;
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
     * If the current node has a `next` reference, it is pushed onto
     * the `groupAnchors` stack
     *
     * If it does exist, then that's because this node's `cmd`
     * is actually a command group, and we need the `next` node
     * to know where to jump to once we're done executing the group
     */
    const pushGroupAnchorIfPresent = (): void => {
        if (currentNode?.next !== undefined) {
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
        /*
            Is there no "next" command? (in other words, is there no command after this one?)
        */
        if (currentNode?.cmd?.next === undefined) {
            /*
               Reaching the last command of the current group means that
               we should either jump out of the group or that we're at the
               end of the query
            */
            if (jumpToPoppedAnchorIfPresent()) {
                // If we tried to jump out of a group, then there's nothing left to do
                // (regardless of success or not)
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

    const resolveArgs = makeArgsResolver();

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

        const cmd = GameConsole.commands.get(name);
        if (cmd) {
            const result = cmd.run(resolveArgs(args)[1]);

            if (typeof result === "object") {
                error = true;
                GameConsole.error.raw(`${result.err}`);
            }
            stepForward();
            continue;
        }

        const alias = GameConsole.aliases.get(name);
        if (alias !== undefined) {
            error = !evalQuery(extractCommandsAndArgs(alias));
            stepForward();
            continue;
        }

        const cvar = GameConsole.variables.get(name);
        if (cvar) {
            if (args.length) {
                error = !evalQuery(
                    extractCommandsAndArgs(
                        `assign ${name} "${resolveArgs(args)[1].join(" ")}"`
                    )
                );
            } else {
                GameConsole.log(`${cvar.name} = ${cvar.value}`);
            }

            stepForward();
            continue;
        }

        error = true;
        GameConsole.error(`Unknown console entity '${name}'`);
        stepForward();
    }

    return !error;
}

// !-------------------------------------------------!
// ! experimental compiler code for future reference !
// !-------------------------------------------------!

// // split for clarity (different parameter names)

// function makeCompiledAction(cb: () => boolean, original: string): CompiledAction;
// function makeCompiledAction(cb: () => boolean, name: string, args: Readonly<ParsedCommand["args"]>): CompiledAction;
// function makeCompiledAction(
//     cb: () => boolean,
//     name: string,
//     args?: Readonly<ParsedCommand["args"]>
// ): CompiledAction {
//     if (args === undefined) {
//         // @ts-expect-error init code
//         (cb as CompiledAction).original = name;
//     } else {
//         // @ts-expect-error init code
//         (cb as CompiledAction).original = `${name}${args.length
//             ? ` ${
//                 args.map(v => v.arg.map(p => p.content).join(""))
//                     .map(v => v.includes(" ") ? `"${v.replace(/"/g, "\\\"\\")}"` : v)
//                     .join(" ")
//             }`
//             : ""
//         }`;
//     }

//     return cb as CompiledAction;
// };

// /**
//  * Similar in spirit to {@linkcode ParserNode}. Used to maintain structure of a compiled unit
//  * as it's being created
//  *
//  * The intent is to take the ParserNode representing the query (aka parameter `query`), and
//  * then walk it to compile each node, creating a CompilerNode at each step; at the end, we
//  * can then walk this new tree (whose structure mirrors the original query) and compile *that*
//  * by taking note of each node's chaining
//  */
// interface CompilerNode {
//     /**
//      * This node's chaining type with respect to its ancestor. A corollary of this
//      * is that the head's chaining type is ignored
//      */
//     readonly chaining: ChainingTypes
//     /**
//      * The actual compiled function
//      */
//     fn: CompiledAction | CompiledTuple
//     /**
//      * The next node in the chain
//      */
//     next?: CompilerNode
//     /**
//      * The node representing the next logical group in the chain. `CompilerNode.next` is equivalent
//      * to `ParserNode.cmd.next`, `CompilerNode.nextGroup` is equivalent to `ParserNode.next`
//      */
//     nextGroup?: CompilerNode
// }

// const _compilerCache_ = new Map<ParserNode, CompiledAction | CompiledTuple>();

// /**
//  * Compiles a console query in the form of a string
//  * @param input The query to compile
//  * @param options.compileHint A hint on how the parser should compile the given query. Compiling a query
//  *                            creates a faster-to-execute version, at a small execution time and memory
//  *                            penalty. For queries entered by-hand into the console, this tradeoff is
//  *                            usually not worth it, since the queries are unlikely to be repeated; inversely,
//  *                            for queries bound to inputs, the tradeoff is almost always worth it.
//  *                            - `never`:  Never generate a compiled version of this query. If you do not
//  *                                        intend to consult the `compiled` field of this function's return
//  *                                        value (or generally do not care about this function's return value),
//  *                                        you should use this.
//  *                            - `normal`: Only compile this query if it is sufficiently simple. "Simple" is up
//  *                                        to the parser to define, but usually, a query which is composed of a
//  *                                        single invocation (whether a command, alias, or variable access/assignment)
//  *                                        is considered "simple". This is the default option.
//  *                            - `always`: Always generate a compiled version of this query. Self-explanatory.
//  * @param options.onlyCompileForward Whether to only compile the given query. By default, the compiler will also
//  *                                   compile the query's inverse, if it exists. Setting this to `true` disables
//  *                                   this behavior
//  * @param options.lookupPolicy How console entities referenced in the query should be dereferenced when compiling
//  *                             said query.
//  *                             - `static`:       Perform all lookups right now (aka when this function is called). This means that
//  *                                               the compiled query is faster, but that it cannot adapt to the creation or removal
//  *                                               of entities. It also introduces a divergence in behavior, since an interpreted query
//  *                                               would perform its lookup at execution time.
//  *                             - `semi-dynamic`: Perform all lookups right now, but include existence checks in the compiled function.
//  *                                               This means that the addition or removal of an entity will change the behavior of the
//  *                                               compiled function, but that changing an entity for a identically-named one will not.
//  *                             - `dynamic`:      Perform all lookups when the compiled function is called. Induces a speed penalty,
//  *                                               but allows the query to remain flexible. This is the default, and is how an
//  *                                               interpreted query would function. This lookup policy allows memoizing the function,
//  *                                               while the other two do not.
//  * @returns A compiled version of the given query. If a tuple is returned, then its second element is the
//  *          compiled version of the inverse query
//  */
// export function compileQuery<const B extends boolean | undefined>(
//     gameConsole: GameConsole,
//     input: string,
//     options: {
//         compileHint?: "never" | "normal" | "always"
//         onlyCompileForward?: B
//         lookupPolicy?: "static" | "semi-dynamic" | "dynamic"
//     } = {
//         compileHint: "normal",
//         lookupPolicy: "dynamic"
//     }
// ): B extends true ? CompiledAction : CompiledAction | CompiledTuple {
//     const { onlyCompileForward, lookupPolicy = "dynamic" } = options;

//     // It's okay to "abusively" call this, since it's a memoized function anyways
//     const query = extractCommandsAndArgs(input);

//     /**
//      * For dynamic lookup queries, we can memoize their results, so
//      * let's try to fetch one from the cache
//      */
//     const cached = _compilerCache_.get(query);
//     if (lookupPolicy === "dynamic" && cached !== undefined) {
//         if (onlyCompileForward) {
//             // We only want the forward one? No problem
//             return isArray(cached)
//                 ? cached[0]
//                 : cached;
//         } else if (isArray(cached)) {
//             // Otherwise, we can only return the cached result if it's a tuple
//             return cached as B extends true ? CompiledAction : CompiledAction | CompiledTuple; // this assertion should be useless but weh
//         }
//         // Otherwise, what we have is a compiled action, but what we want is the compiled action and the compiled inverse
//         // Fallthrough to normal execution…
//         // TODO in such a case, reuse the cached action only, and only compile the inverse
//     }

//     /**
//      * Modified `CompilerNode` type used for construction
//      */
//     type GCompilerNode = Omit<CompilerNode, "fn" | "next" | "nextGroup"> & {
//         fn?: CompilerNode["fn"]
//         next?: GCompilerNode
//         nextGroup?: GCompilerNode
//     };

//     /**
//      * The head of the compiler tree. Should have the same structure as the query tree
//      */
//     const compiled: GCompilerNode = {
//         chaining: ChainingTypes.Always // ignored anyway
//     };
//     /**
//      * Reference to the current compiler node we're dealing with
//      */
//     let currentCompilerNode: GCompilerNode = compiled;

//     /**
//      * Reference to the current parser node being processed. A value of `undefined`
//      * signifies that we're done with the query and that no more processing is to be done
//      */
//     let currentNode: ParserNode | undefined = query;
//     /**
//      * Plays a similar role to the `groupAnchors` stack used in the parser, that being
//      * to keep track of where we should jump to after finishing the compilation of a command
//      * group. Unlike the parser's version, this stores the node where compilation should resume,
//      * not the node preceding it
//      */
//     const groupAnchors = new Stack<[ParserNode, GCompilerNode]>();

//     /*
//         Being a translator and not an executor, the logic here is a bit different from in evalQuery.
//         In evalQuery, we're worried about the execution semantics in-real-time, which is why we
//         do things like conditionally jumping around.
//         In other words, we walk the tree and choose branches based on the result of the current node's
//         processing (concretely, whether evaluating the query returned an error).

//         Here though, we don't care (and actually, can't conclude) about conditions, so we just
//         translate the whole parser tree, and integrate the conditional mechanisms into the final compiled
//         product.
//     */

//     /**
//      * If the current node has a `next` reference, it and a newly-created GCompilerNode
//      * are pushed onto the `groupAnchors` stack
//      *
//      * If it does exist, then that's because this node's `cmd`
//      * is actually a command group, and we need the `next` node
//      * to know where to jump to once we're done executing the group
//      */
//     const pushGroupAnchorIfPresent = (): void => {
//         if (currentNode?.next !== undefined) {
//             groupAnchors.push([
//                 currentNode.next,
//                 currentCompilerNode.nextGroup = { chaining: currentNode.next.chaining }
//             ]);
//         }
//     };

//     /**
//      * Jumps to the node located at the top of the `groupAnchors` stack. This method
//      * mutates `currentNode` and `currentCompilerNode`
//      * @returns Whether a jump has been attempted; in other words, if there was a
//      *          node to pop off of the stack
//      */
//     const jumpToPoppedAnchorIfPresent = (): boolean => {
//         const doJump = groupAnchors.has();

//         if (doJump) {
//             [currentNode, currentCompilerNode] = groupAnchors.pop();
//         }

//         return doJump;
//     };

//     /**
//      * Steps to the next node that should be processed. This method is
//      * sensitive to groupings and the state of the nodes it operates on, so
//      * this is not simply a `currentNode = currentNode.next` operation
//      */
//     const stepForward = (): void => {
//         /*
//             Is there no "next" command? (in other words, is there no command after this one?)
//         */
//         if (currentNode?.cmd?.next === undefined) {
//             /*
//                Reaching the last command of the current group means that
//                we should either jump out of the group or that we're at the
//                end of the query
//             */
//             if (jumpToPoppedAnchorIfPresent()) {
//                 // If we tried to jump out of a group, then there's nothing left to do
//                 // (regardless of success or not)
//                 return;
//             }

//             // But if we didn't, then we conclude that we're at the end of the query
//             currentNode = undefined;
//             return;
//         }

//         // Create the next compiler node
//         currentCompilerNode = currentCompilerNode.next = {
//             chaining: currentNode.cmd.next.chaining
//         };
//         // Jump to the next node
//         // Unlike evalQuery, we do so unconditionally because the conditional chaining is handled elsewhere.
//         // Right now, we kinda just wanna visit every node
//         currentNode = currentNode.cmd.next;

//         if (currentNode === undefined) {
//             /*
//                If the jump was unsuccessful, then we try to exit out
//                of any group we might happen to be in. This is for cases
//                like `a & (b & c); d`—if the jump from `b` to `c` fails,
//                then we should jump out to `d`, whose node would be present
//                on the stack at that moment
//             */
//             jumpToPoppedAnchorIfPresent();
//         } else {
//             /*
//                If we did jump to another node, then try to push a new group
//                anchor onto the stack, if there's one.
//                See `pushGroupAnchorIfPresent`'s comment
//             */
//             pushGroupAnchorIfPresent();
//         }
//     };

//     const compiler = makePiecewiseCompilers(gameConsole, options)[lookupPolicy];

//     /*
//         Handles cases like `(a & b); c`, where we need to add a group anchor immediately
//     */
//     pushGroupAnchorIfPresent();

//     let iterationCount = 0;
//     while (currentNode !== undefined) {
//         if (++iterationCount === 1e3) {
//             console.warn("1000 iterations of query compiling; possible infinite loop");
//         }

//         currentCompilerNode.fn = compiler(currentNode.cmd);
//         stepForward();
//     }

//     /*
//         The code above was responsible for translating the parser/query tree to a compiler tree—the code
//         below is responsible for generating the function that walks it. In this sense, the compiler
//         tree is IR (intermediate representation)

//         If anyone can find a way to execute the IR in a way that doesn't involve walking
//         the entire IR tree (or at least, doing so in a faster way), they are free to implement
//         it and submit a pull request
//     */

//     /**
//      * Compiles an IR tree to a JS function
//      * @param root The root of the IR tree. The tree is never modified, neither during assembly nor during execution
//      */
//     const compileIR = (root: CompilerNode) => (): boolean => {
//         /**
//          * The current node we're processing
//          */
//         let currentNode: CompilerNode | undefined = root;
//         /**
//          * Whether the previous invocation triggered an error
//          */
//         let error = false;

//         /**
//          * Similar to the parser and interpreter pipelines, we keep a stack of
//          * nodes to jump to after finishing some group's parsing
//          */
//         const groupAnchors = new Stack<CompilerNode>();

//         do {
//             const fn = isArray(currentNode.fn)
//                 ? currentNode.fn[0]
//                 : currentNode.fn;

//             const jumpSuccess: boolean = ({
//                 [ChainingTypes.Always]: true,
//                 [ChainingTypes.IfPass]: !error,
//                 [ChainingTypes.IfFail]: error
//             })[currentNode.chaining];

//             // If the jump succeeded, take the error value as returned by the function
//             // If not, reset the error flag
//             error = jumpSuccess && fn();

//             // nextGroup being present indicates that this is some sort of group
//             // Therefore, we wanna save a point to jump to after this group's completion
//             if (currentNode.nextGroup !== undefined) {
//                 groupAnchors.push(currentNode.nextGroup);
//             }

//             if (jumpSuccess) {
//                 // If our jump earlier succeeded, then we try to take the next command
//                 if ((currentNode = currentNode.next) === undefined && groupAnchors.has()) {
//                     // If no such command exists, then we see if we have a node on the stack
//                     // to jump to; if not, then the loop will finish
//                     currentNode = groupAnchors.pop();
//                 }
//                 continue;
//             }

//             // If the jump didn't succeed, then we should try to jump out to the next node on the stack
//             currentNode = groupAnchors.has()
//                 ? groupAnchors.pop()
//                 : undefined;
//         } while (currentNode !== undefined);

//         return error;
//     };

//     const execute = makeCompiledAction(
//         compileIR(compiled as CompilerNode), // safety: all the optional members (aka fn) have
//         input                                // definitely been assigned at this point
//     );

//     type Return = B extends true ? CompiledAction : CompiledAction | CompiledTuple;
//     let out: Return;
//     // Conditions to not compile an inverse:
//     if (
//         onlyCompileForward                                     // the flag has explicitly been set
//         || compiled.nextGroup !== undefined                    // the query starts with a group (like "(a; b) & c")
//         || typeof (compiled as CompilerNode).fn === "function" // the first node isn't a tuple (and therefore doesn't correspond to an invertible action)
//     ) {
//         out = execute as Return;
//     } else {
//         // Otherwise, we can clone the first node, change its fn to be the original's inverse, and compile that
//         const moddedHead = {
//             ...compiled, // critically, the next pointer is identical; but that's okay, since nothing is modifying the tree
//             fn: (compiled.fn as CompiledTuple)[1]
//         } as CompilerNode;

//         out = [
//             execute,
//             makeCompiledAction(
//                 compileIR(moddedHead),
//                 input.replace("+", "-")
//             )
//         ] as unknown as Return;
//         // safety: B is false | undefined here
//     }

//     if (lookupPolicy === "dynamic") {
//         _compilerCache_.set(query, out);
//     }

//     return out;
// }

// type PieceCompiler = (
//     cmd: ParsedCommand
// ) => CompiledAction | CompiledTuple;

// type PiecewiseCompilers = Record<"static" | "semi-dynamic" | "dynamic", PieceCompiler>;

// function makePiecewiseCompilers(
//     gameConsole: GameConsole,
//     options: {
//         compileHint?: "never" | "normal" | "always"
//         onlyCompileForward?: boolean
//         lookupPolicy?: "static" | "semi-dynamic" | "dynamic"
//     } = {
//         compileHint: "normal",
//         lookupPolicy: "dynamic"
//     }
// ): PiecewiseCompilers {
//     const { /* compileHint = "normal", */ onlyCompileForward } = options;

//     const resolveArgs = makeArgsResolver(gameConsole);

//     let argsCache: readonly string[] | undefined;
//     const makeDynDis = ({ name, args }: { name: string, args: Readonly<ParsedCommand["args"]> }) => (): boolean => {
//         const cmd = gameConsole.commands.get(name);
//         if (cmd !== undefined) {
//             let trueArgs: readonly string[];
//             if (argsCache === undefined) {
//                 const [isConst, resolved] = resolveArgs(args);
//                 trueArgs = resolved;
//                 if (isConst) argsCache = trueArgs;
//             } else {
//                 trueArgs = argsCache;
//             }

//             const res = cmd.run(trueArgs);
//             const isError = typeof res === "object";
//             if (isError) {
//                 gameConsole.error.raw(`${res.err}`);
//             }
//             return isError;
//         }

//         const alias = gameConsole.aliases.get(name);
//         if (alias !== undefined) {
//             return compileQuery(
//                 gameConsole,
//                 alias,
//                 { compileHint: "always", onlyCompileForward: true, lookupPolicy: "static" }
//             )();
//         }

//         const cvar = gameConsole.variables.get(name);
//         if (cvar) {
//             if (args.length) {
//                 return compileQuery(
//                     gameConsole,
//                     `assign ${name} ${resolveArgs(args)[1].join(" ")}`,
//                     { compileHint: "always", onlyCompileForward: true, lookupPolicy: "static" }
//                 )();
//             } else {
//                 gameConsole.log(`${cvar.name} = ${cvar.value}`);
//                 return false;
//             }
//         }

//         gameConsole.error(`Unknown console entity '${name}'`);
//         return true;
//     };

//     return {
//         static({ name, args }) {
//             const cmd = gameConsole.commands.get(name);
//             if (cmd !== undefined) {
//                 const [isConst, trueArgs] = resolveArgs(args);

//                 const compileCmd = (
//                     cmd: Command<boolean, Stringable>
//                 ): CompiledAction => {
//                     const executor = (
//                         args.length === 0
//                             ? cmd.executor.bind(gameConsole.game)
//                             : isConst
//                                 ? cmd.run.bind(cmd, trueArgs)         // args are constant, we "lock them in" cuz we won't need to reevaluate them
//                                 : () => cmd.run(resolveArgs(args)[1]) // args aren't constant, we need to redo our resolution in case a CVar has changed
//                     );

//                     return makeCompiledAction(
//                         () => {
//                             const result = executor();

//                             const errorRaised = typeof result === "object";
//                             if (errorRaised) {
//                                 gameConsole.error.raw(`${result.err}`);
//                             }

//                             return errorRaised;
//                         },
//                         name, args
//                     );
//                 };

//                 const compiled = compileCmd(cmd);

//                 return cmd.inverse && !onlyCompileForward
//                     ? [compiled, compileCmd(cmd.inverse)]
//                     : compiled;
//             }

//             const alias = gameConsole.aliases.get(name);
//             if (alias !== undefined) {
//                 const inverseAlias = !onlyCompileForward && name.startsWith("+")
//                     ? gameConsole.aliases.get(name.replace("+", "-"))
//                     : undefined;
//                 /*
//                     If we have an inverse alias, then we consult that inverse's query in order to
//                     compile this alias' inverse; we don't just take this alias' query and invert it,
//                     because that isn't sound. For example, consider these two aliases:

//                     alias +foo "echo abc"
//                     alias -foo "disconnect"

//                     There is no way to derive -foo's query just by looking at +foo's query; it would
//                     be a mistake to invert +foo's query and assume that it is -foo's query.
//                 */

//                 const compiled = compileQuery(
//                     gameConsole,
//                     alias,
//                     { ...options, onlyCompileForward: true }
//                 );

//                 return inverseAlias !== undefined // the 'onlyCompileForward' is included in this check, no need to repeat it
//                     ? [
//                         compiled,
//                         compileQuery(
//                             gameConsole,
//                             inverseAlias,
//                             { ...options, onlyCompileForward: true }
//                         )
//                     ]
//                     : compiled;
//             }

//             const cvar = gameConsole.variables.get(name);
//             if (cvar) {
//                 if (args.length) {
//                     return compileQuery(
//                         gameConsole,
//                         `assign ${name} ${resolveArgs(args)[1].join(" ")}`,
//                         { ...options, onlyCompileForward: true }
//                     );
//                 } else {
//                     return makeCompiledAction(
//                         () => {
//                             gameConsole.log(`${cvar.name} = ${cvar.value}`);
//                             return false;
//                         },
//                         name, args
//                     );
//                 }
//             }

//             return makeCompiledAction(
//                 () => {
//                     gameConsole.error(`Unknown console entity '${name}'`);
//                     return true;
//                 },
//                 name, args
//             );
//         },

//         "semi-dynamic"(parsedCmd) {
//             const { name, args } = parsedCmd;
//             const dynDis = makeDynDis(parsedCmd);

//             const cmd = gameConsole.commands.get(name);
//             if (cmd !== undefined) {
//                 const [isConst, trueArgs] = resolveArgs(args);

//                 const compileCmd = (
//                     cmd: Command<boolean, Stringable>
//                 ): CompiledAction => {
//                     const executor = (
//                         args.length === 0
//                             ? cmd.executor.bind(gameConsole.game)
//                             : isConst
//                                 ? cmd.run.bind(cmd, trueArgs)         // args are constant, we "lock them in" cuz we won't need to reevaluate them
//                                 : () => cmd.run(resolveArgs(args)[1]) // args aren't constant, we need to redo our resolution in case a CVar has changed
//                     );

//                     return makeCompiledAction(
//                         () => {
//                             if (!gameConsole.commands.has(name)) {
//                                 // Command no longer exists -> invoke dynamic dispatch
//                                 return dynDis();
//                             }

//                             const result = executor();

//                             const errorRaised = typeof result === "object";
//                             if (errorRaised) {
//                                 gameConsole.error.raw(`${result.err}`);
//                             }

//                             return errorRaised;
//                         },
//                         name, args
//                     );
//                 };

//                 const compiled = compileCmd(cmd);

//                 return cmd.inverse && !onlyCompileForward
//                     ? [compiled, compileCmd(cmd.inverse)]
//                     : compiled;
//             }

//             const alias = gameConsole.aliases.get(name);
//             if (alias !== undefined) {
//                 const inverseAlias = !onlyCompileForward && name.startsWith("+")
//                     ? gameConsole.aliases.get(name.replace("+", "-"))
//                     : undefined;

//                 const compilerOut = compileQuery(
//                     gameConsole,
//                     alias,
//                     { ...options, onlyCompileForward: true }
//                 );

//                 const compiled = makeCompiledAction(
//                     (): boolean => gameConsole.aliases.has(name)
//                         ? compilerOut()
//                         : dynDis(), // Alias no longer exists -> invoke dynamic dispatch
//                     name, args
//                 );

//                 return inverseAlias !== undefined // the 'onlyCompileForward' is included in this check, no need to repeat it
//                     ? [
//                         compiled,
//                         (() => {
//                             const compiledInverse = compileQuery(
//                                 gameConsole,
//                                 inverseAlias,
//                                 { ...options, onlyCompileForward: true }
//                             );

//                             let inverseDis: (() => boolean) | undefined;

//                             return makeCompiledAction(
//                                 () => gameConsole.aliases.has(inverseAlias)
//                                     ? compiledInverse()
//                                     : (
//                                         inverseDis ??= makeDynDis({ name: inverseAlias, args: [] /* aliases have no arguments */ })
//                                     )(),
//                                 inverseAlias, args
//                             );
//                         })()
//                     ]
//                     : compiled;
//             }

//             const cvar = gameConsole.variables.get(name);
//             if (cvar) {
//                 if (args.length) {
//                     const compiled = compileQuery(
//                         gameConsole,
//                         `assign ${name} ${resolveArgs(args)[1].join(" ")}`,
//                         { ...options, onlyCompileForward: true }
//                     );

//                     return makeCompiledAction(
//                         () => gameConsole.variables.has(name)
//                             ? compiled()
//                             : dynDis(),
//                         name, args
//                     );
//                 } else {
//                     return makeCompiledAction(
//                         () => {
//                             if (gameConsole.variables.has(name)) {
//                                 gameConsole.log(`${cvar.name} = ${cvar.value}`);
//                                 return false;
//                             }

//                             return dynDis();
//                         },
//                         name, args
//                     );
//                 }
//             }

//             return makeCompiledAction(
//                 () => {
//                     if (
//                         !gameConsole.commands.has(name)
//                         && !gameConsole.aliases.has(name)
//                         && !gameConsole.variables.has(name)
//                     ) {
//                         gameConsole.error(`Unknown console entity '${name}'`);
//                         return true;
//                     }

//                     return dynDis();
//                 },
//                 name, args
//             );
//         },

//         dynamic(cmd) {
//             return makeCompiledAction(
//                 makeDynDis(cmd),
//                 cmd.name, cmd.args
//             );
//         }
//     };
// }
