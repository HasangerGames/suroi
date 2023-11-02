import nipplejs, { type JoystickOutputData } from "nipplejs";
import { absMod, angleBetweenPoints, clamp, distance, distanceSquared } from "../../../../common/src/utils/math";
import { v, vDiv } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { defaultBinds } from "./console/defaultClientCVars";
import { type GameSettings } from "./console/gameConsole";
import { FIRST_EMOTE_ANGLE, FOURTH_EMOTE_ANGLE, PIXI_SCALE, SECOND_EMOTE_ANGLE, THIRD_EMOTE_ANGLE } from "./constants";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { isMobile } from "pixi.js";
import { InputActions } from "../../../../common/src/constants";
import { Scopes } from "../../../../common/src/definitions/scopes";
import { Loots, type LootDefinition } from "../../../../common/src/definitions/loots";

export type InputAction = {
    readonly type: InputActions.UseItem
    readonly item: LootDefinition
} | {
    readonly type: InputActions.EquipItem | InputActions.DropItem
    readonly slot: number
} | {
    readonly type: InputActions
};

export class InputManager {
    readonly game: Game;
    readonly binds: InputMapper;

    get isMobile(): boolean {
        return isMobile.any && this.game.console.getBuiltInCVar("mb_controls_enabled");
    }

    readonly movement = {
        up: false,
        left: false,
        down: false,
        right: false,
        moving: false
    };

    // had to put it here because it's not a boolean
    // and inputManager assumes all keys of `movement` are booleans
    movementAngle = 0;

    mouseX = 0;
    mouseY = 0;

    emoteWheelActive = false;
    emoteWheelPosition = v(0, 0);

    rotation = 0;

    selectedEmote?: InputActions;

    readonly actions: InputAction[] = [];

    addAction(action: InputAction | InputActions): void {
        if (this.actions.length > 7) return;

        if (typeof action === "number") {
            action = { type: action };
        }

        this.actions.push(action);
    }

    distanceToMouse = 0;

    attacking = false;

    resetAttacking = false;

    shootOnReleaseAngle = 0;

    turning = false;

    activeItemIndex = 2;

    cycleScope(offset: number): void {
        const scope = this.game.playerManager.scope;
        const scopeId = Scopes.indexOf(scope);
        let scopeString = scope.idString;
        let searchIndex = scopeId;

        let iterationCount = 0;
        // Prevent possible infinite loops
        while (iterationCount++ < 100) {
            searchIndex = this.game.console.getBuiltInCVar("cv_loop_scope_selection")
                ? absMod(searchIndex + offset, Scopes.length)
                : clamp(searchIndex + offset, 0, Scopes.length - 1);

            const scopeCandidate = Scopes[searchIndex].idString;

            if (this.game.playerManager.items[scopeCandidate]) {
                scopeString = scopeCandidate;
                break;
            }
        }

        if (scopeString !== scope.idString) {
            this.addAction({
                type: InputActions.UseItem,
                item: Loots.fromString(scopeString)
            });
        }
    }

    constructor(game: Game) {
        this.game = game;
        this.binds = new InputMapper();
    }

    private mWheelStopTimer: number | undefined;
    setupInputs(): void {
        const game = this.game;

        const gameUi = $("#game-ui")[0];

        // different event targets… why?
        window.addEventListener("keydown", this.handleInputEvent.bind(this, true));
        window.addEventListener("keyup", this.handleInputEvent.bind(this, false));
        gameUi.addEventListener("pointerdown", this.handleInputEvent.bind(this, true));
        gameUi.addEventListener("pointerup", this.handleInputEvent.bind(this, false));
        gameUi.addEventListener("wheel", this.handleInputEvent.bind(this, true));

        gameUi.addEventListener("pointermove", (e: MouseEvent) => {
            if (this.isMobile) return;

            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            if (this.emoteWheelActive) {
                const mousePosition = v(e.clientX, e.clientY);
                if (distanceSquared(this.emoteWheelPosition, mousePosition) > 500) {
                    const angle = angleBetweenPoints(this.emoteWheelPosition, mousePosition);
                    let slotName: string | undefined;

                    if (SECOND_EMOTE_ANGLE <= angle && angle <= FOURTH_EMOTE_ANGLE) {
                        this.selectedEmote = InputActions.TopEmoteSlot;
                        slotName = "top";
                    } else if (!(angle >= FIRST_EMOTE_ANGLE && angle <= FOURTH_EMOTE_ANGLE)) {
                        this.selectedEmote = InputActions.RightEmoteSlot;
                        slotName = "right";
                    } else if (FIRST_EMOTE_ANGLE <= angle && angle <= THIRD_EMOTE_ANGLE) {
                        this.selectedEmote = InputActions.BottomEmoteSlot;
                        slotName = "bottom";
                    } else if (THIRD_EMOTE_ANGLE <= angle && angle <= SECOND_EMOTE_ANGLE) {
                        this.selectedEmote = InputActions.LeftEmoteSlot;
                        slotName = "left";
                    }
                    $("#emote-wheel").css("background-image", `url("./img/misc/emote_wheel_highlight_${slotName ?? "top"}.svg"), url("./img/misc/emote_wheel.svg")`);
                } else {
                    this.selectedEmote = undefined;
                    $("#emote-wheel").css("background-image", 'url("./img/misc/emote_wheel.svg")');
                }
            }

            this.rotation = Math.atan2(e.clientY - window.innerHeight / 2, e.clientX - window.innerWidth / 2);

            if (!game.gameOver && game.activePlayer) {
                const globalPos = v(e.clientX, e.clientY);
                const pixiPos = game.camera.container.toLocal(globalPos);
                const gamePos = vDiv(pixiPos, PIXI_SCALE);
                this.distanceToMouse = distance(game.activePlayer.position, gamePos);

                if (game.console.getBuiltInCVar("cv_movement_smoothing")) {
                    game.activePlayer.container.rotation = this.rotation;
                    game.map.indicator.rotation = this.rotation;
                }
            }

            this.turning = true;
        });

        // Mobile joysticks
        if (this.isMobile) {
            const size = game.console.getBuiltInCVar("mb_joystick_size");
            const transparency = game.console.getBuiltInCVar("mb_joystick_transparency");

            const leftJoyStick = nipplejs.create({
                zone: $("#left-joystick-container")[0],
                size,
                color: `rgba(255, 255, 255, ${transparency})`
            });

            const rightJoyStick = nipplejs.create({
                zone: $("#right-joystick-container")[0],
                size,
                color: `rgba(255, 255, 255, ${transparency})`
            });

            let rightJoyStickUsed = false;
            let shootOnRelease = false;

            leftJoyStick.on("move", (_, data: JoystickOutputData) => {
                const movementAngle = -Math.atan2(data.vector.y, data.vector.x);

                this.movementAngle = movementAngle;
                this.movement.moving = true;

                if (!rightJoyStickUsed && !shootOnRelease) {
                    this.rotation = movementAngle;
                    this.turning = true;
                    if (game.console.getBuiltInCVar("cv_movement_smoothing") && !game.gameOver && game.activePlayer) {
                        game.activePlayer.container.rotation = this.rotation;
                    }
                }
            });

            leftJoyStick.on("end", () => {
                this.movement.moving = false;
            });

            rightJoyStick.on("move", (_, data: JoystickOutputData) => {
                rightJoyStickUsed = true;
                this.rotation = -Math.atan2(data.vector.y, data.vector.x);
                this.turning = true;
                const activePlayer = game.activePlayer;
                if (game.console.getBuiltInCVar("cv_movement_smoothing") && !game.gameOver && activePlayer) {
                    game.activePlayer.container.rotation = this.rotation;
                }

                if (!activePlayer) return;

                const def = activePlayer.activeItem;

                if (def.itemType === ItemType.Gun) {
                    activePlayer.images.aimTrail.alpha = 1;
                }

                const attacking = data.distance > game.console.getBuiltInCVar("mb_joystick_size") / 3;
                if (def.itemType === ItemType.Gun && def.shootOnRelease) {
                    shootOnRelease = true;
                    this.shootOnReleaseAngle = this.rotation;
                } else {
                    this.attacking = attacking;
                }
            });

            rightJoyStick.on("end", () => {
                rightJoyStickUsed = false;
                if (game.activePlayer) game.activePlayer.images.aimTrail.alpha = 0;
                this.attacking = shootOnRelease;
                this.resetAttacking = true;
                shootOnRelease = false;
            });
        }
    }

    private handleInputEvent(down: boolean, event: KeyboardEvent | MouseEvent | WheelEvent): void {
        // Disable pointer events on mobile if mobile controls are enabled
        if (event instanceof PointerEvent && this.isMobile) return;

        // If the using is interacting with a text field or something of the sort, inputs should
        // not be honored
        if (document.activeElement !== document.body) {
            return;
        }

        /*
            We don't want to allow keybinds to work with modifiers, because firstly,
            pressing ctrl + R to reload is dumb and secondly, doing that refreshes the page

            We already fire preventDefault to allow Tab and right-click binds to not be totally
            unusable, and so we need to disallow modifiers. However, in the case that someone binds
            an action to shift or control, they should still be able to do that.

            In essence, we need to only process inputs which are a single modifier key or which are
            a normal key without modifiers.

            This only applies to keyboard events

            Also we allow shift and alt to be used normally, because keyboard shortcuts usually involve
            the meta or control key
        */

        if (event instanceof KeyboardEvent) {
            let modifierCount = 0;
            (
                [
                    "metaKey",
                    "ctrlKey"
                ] as Array<keyof KeyboardEvent>
            ).forEach(modifier => (event[modifier] && modifierCount++));

            // As stated before, more than one modifier or a modifier alongside another key should invalidate an input
            if (
                (
                    modifierCount > 1 ||
                    (modifierCount === 1 && !["Control", "Meta"].includes(event.key))
                ) && down
                // …but it only invalidates pressing a key, not releasing it
            ) return;
        }

        const key = this.getKeyFromInputEvent(event);
        let actionsFired = 0;

        if (event instanceof WheelEvent) {
            /*
                The browser doesn't emit mouse wheel "stop" events, so instead, we schedule the invocation
                of the stop callback to some time in the near future, cancelling the previous callback

                This has the effect of continuously cancelling the stop callback whenever a wheel event is
                detected, which is what we want
            */
            clearTimeout(this.mWheelStopTimer);
            this.mWheelStopTimer = window.setTimeout(() => {
                actionsFired = this.fireAllEventsAtKey(key, false);
            }, 50);

            actionsFired = this.fireAllEventsAtKey(key, true);
            return;
        }

        actionsFired = this.fireAllEventsAtKey(key, event.type === "keydown" || event.type === "pointerdown");

        if (actionsFired > 0 && this.game.gameStarted) {
            event.preventDefault();
        }
    }

    private fireAllEventsAtKey(input: string, down: boolean): number {
        const actions = this.binds.getActionsBoundToInput(input) ?? [];
        for (const action of actions) {
            let query = action;
            if (!down) {
                if (query.startsWith("+")) { // Invertible action
                    query = query.replace("+", "-");
                } else query = ""; // If the action isn't invertible, then we do nothing
            }

            this.game.console.handleQuery(query);
        }

        return actions.length;
    }

    private getKeyFromInputEvent(event: KeyboardEvent | MouseEvent | WheelEvent): string {
        let key = "";
        if (event instanceof KeyboardEvent) {
            key = event.key.length > 1 ? event.key : event.key.toUpperCase();
            if (key === " ") {
                key = "Space";
            }
        }

        if (event instanceof WheelEvent) {
            switch (true) {
                case event.deltaX > 0: { key = "MWheelRight"; break; }
                case event.deltaX < 0: { key = "MWheelLeft"; break; }
                case event.deltaY > 0: { key = "MWheelDown"; break; }
                case event.deltaY < 0: { key = "MWheelUp"; break; }
                case event.deltaZ > 0: { key = "MWheelForwards"; break; }
                case event.deltaZ < 0: { key = "MWheelBackwards"; break; }
            }

            if (key === "") {
                console.error("An unrecognized scroll wheel event was received: ", event);
            }

            return key;
        }

        if (event instanceof MouseEvent) {
            key = `Mouse${event.button}`;
        }

        return key;
    }

    private readonly actionsNames: Record<keyof typeof defaultBinds, string> = {
        "+up": "Move Up",
        "+down": "Move Down",
        "+left": "Move Left",
        "+right": "Move Right",
        interact: "Interact",
        "slot 0": "Equip Primary",
        "slot 1": "Equip Secondary",
        "slot 2": "Equip Melee",
        last_item: "Equip Last Weapon",
        other_weapon: "Equip Other Gun",
        swap_gun_slots: "Swap Gun Slots",
        "cycle_items -1": "Equip Previous Weapon",
        "cycle_items 1": "Equip Next Weapon",
        "+attack": "Use Weapon",
        drop: "Drop Active Weapon",
        reload: "Reload",
        "cycle_scopes -1": "Previous Scope",
        "cycle_scopes +1": "Next Scope",
        "use_consumable gauze": "Use Gauze",
        "use_consumable medikit": "Use Medikit",
        "use_consumable cola": "Use Cola",
        "use_consumable tablets": "Use Tablets",
        cancel_action: "Cancel Action",
        toggle_map: "Toggle Fullscreen Map",
        toggle_minimap: "Toggle Minimap",
        "+emote_wheel": "Emote Wheel",
        toggle_console: "Toggle Console"
    };

    generateBindsConfigScreen(): void {
        const keybindsContainer = $("#tab-keybinds-content");
        keybindsContainer.html("").append(
            $("<div>",
                {
                    class: "modal-item",
                    id: "keybind-clear-tooltip"
                }
            ).append(
                "To remove a keybind, press the keybind and then press either ",
                $("<kbd>").text("Escape"),
                " or ",
                $("<kbd>").text("Backspace"),
                "."
            )
        );

        let activeButton: HTMLButtonElement | undefined;
        for (const a in defaultBinds) {
            const action = a as keyof (typeof defaultBinds);

            const bindContainer = $("<div/>", { class: "modal-item" }).appendTo(keybindsContainer);

            $("<div/>", {
                class: "setting-title",
                text: this.actionsNames[action]
            }).appendTo(bindContainer);

            const actions = this.binds.getInputsBoundToAction(action);

            while (actions.length < 2) {
                actions.push("None");
            }

            const buttons = actions.map(bind => {
                return $<HTMLButtonElement>("<button/>", {
                    class: "btn btn-darken btn-lg btn-secondary btn-bind",
                    text: bind || "None"
                }).appendTo(bindContainer)[0];
            });

            actions.forEach((bind, i) => {
                const bindButton = buttons[i];

                // eslint-disable-next-line no-inner-declarations
                const setKeyBind = (event: KeyboardEvent | MouseEvent | WheelEvent): void => {
                    event.stopImmediatePropagation();

                    if (
                        event instanceof MouseEvent &&
                        event.type === "mousedown" &&
                        !bindButton.classList.contains("active")
                    ) {
                        activeButton?.classList.remove("active");
                        bindButton.classList.add("active");
                        activeButton = bindButton;
                        return;
                    }

                    if (bindButton.classList.contains("active")) {
                        event.preventDefault();
                        const key = this.getKeyFromInputEvent(event);

                        if (bind) {
                            this.binds.remove(bind, action);
                        }

                        this.binds.unbindInput(key);
                        if (!(key === "Escape" || key === "Backspace")) {
                            this.binds.addActionsToInput(key, action);
                        }

                        this.game.console.writeToLocalStorage();
                        this.generateBindsConfigScreen();
                    }
                };

                bindButton.addEventListener("keydown", setKeyBind);
                bindButton.addEventListener("mousedown", setKeyBind);
                bindButton.addEventListener("wheel", setKeyBind);
                bindButton.addEventListener("contextmenu", e => { e.preventDefault(); });

                bindButton.addEventListener("scroll", evt => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    evt.stopImmediatePropagation();
                });
            });
        }

        // Add the reset button
        $("<div/>", { class: "modal-item" }).append($("<button/>", {
            class: "btn btn-darken btn-lg btn-danger",
            html: '<span style="position: relative; top: -2px"><i class="fa-solid fa-trash" style="font-size: 17px; margin-right: 3px; position: relative; top: -1px"></i> Reset to defaults</span>'
        }).on("click", () => {
            this.binds.unbindAll();

            for (const [action, keys] of Object.entries(defaultBinds)) {
                this.binds.addInputsToAction(action, ...keys);
            }

            this.generateBindsConfigScreen();
            this.game.console.writeToLocalStorage();
        })).appendTo(keybindsContainer);

        // Change the weapons slots keybind text
        for (let i = 0; i < 3; i++) {
            const slotKeybinds = this.binds.getInputsBoundToAction(`slot ${i}`).filter(a => a !== "").slice(0, 2);
            $(`#weapon-slot-${i + 1}`).children(".slot-number").text(slotKeybinds.join(" / "));
        }
    }

    static getIconFromInputName(input: string): string | undefined {
        let name: string | undefined;

        const copy = input.toLowerCase();
        if ([
            "mouse",
            "mwheel",
            "tab",
            "enter",
            "capslock",
            "shift",
            "alt",
            "meta",
            "control",
            "arrow",
            "backspace",
            "escape",
            "space"
        ].some(query => copy.startsWith(query))) {
            if (copy === "meta") { // "meta" means different things depending on the OS
                name = navigator.userAgent.match(/mac|darwin/ig) ? "command" : "windows";
            } else {
                name = copy.replace(/ /g, "");
            }
        }

        return name === undefined ? name : `./img/misc/${name}_icon.svg`;
    }
}

class InputMapper {
    // These two maps must be kept in sync!!
    private readonly _inputToAction = new Map<string, Set<string>>();
    private readonly _actionToInput = new Map<string, Set<string>>();

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
    remove(input: string, action: string): boolean {
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
            (key: K) => [...(map.get(key)?.values?.() ?? [])];

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
        return [...this._actionToInput.entries()].reduce<GameSettings["binds"]>(
            (acc, [action, bindSet]) => {
                acc[action] = [...bindSet];
                return acc;
            },
            {}
        );
    }
}
