import { GameConstants, InputActions } from "@common/constants";
import { Scopes } from "@common/definitions/items/scopes";
import { Throwables, type ThrowableDefinition } from "@common/definitions/items/throwables";
import { type WeaponDefinition } from "@common/definitions/loots";
import { areDifferent, InputPacket, type InputAction, type InputData, type SimpleInputActions } from "@common/packets/inputPacket";
import { PacketType } from "@common/packets/packet";
import { Geometry, Numeric } from "@common/utils/math";
import { DefinitionType, type ItemDefinition } from "@common/utils/objectDefinitions";
import { Vec } from "@common/utils/vector";
import $ from "jquery";
import nipplejs, { type JoystickOutputData } from "nipplejs";
import { isMobile } from "pixi.js";
import { GameConsole, type GameSettings, type PossibleError } from "../console/gameConsole";
import { defaultBinds } from "../console/variables";
import { Game } from "../game";
import { FORCE_MOBILE, PIXI_SCALE } from "../utils/constants";
import { html } from "../utils/misc";
import { getTranslatedString } from "../utils/translations/translations";
import { type TranslationKeys } from "../utils/translations/typings";
import { CameraManager } from "./cameraManager";
import { SoundManager } from "./soundManager";
import { UIManager } from "./uiManager";

class InputMapper {
    // These two maps must be kept in sync!!
    private readonly _inputToAction = new Map<
        string,
        Set<string | CompiledAction | CompiledTuple>
    >();

    private readonly _actionToInput = new Map<string, Set<string>>();

    private static readonly _generateGetAndSetIfAbsent
        = <K, V>(map: Map<K, V>, defaultValue: () => V) =>
            (key: K) =>
                // trivially safe
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                map.get(key) ?? map.set(key, defaultValue()).get(key)!;

    private static readonly _generateAdder
        = <K, V, T>(forwardsMap: Map<K, Set<V>>, backwardsMap: Map<V, Set<K>>, thisValue: T) =>
            (key: K, ...values: V[]): T => {
                const forwardSet = InputMapper._generateGetAndSetIfAbsent(forwardsMap, () => new Set())(key);

                for (const value of values) {
                    forwardSet.add(value);
                    InputMapper._generateGetAndSetIfAbsent(backwardsMap, () => new Set())(value).add(key);
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

        // safe because the backward map has already been checked
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._actionToInput.get(action)!.delete(input);
        return true;
    }

    private static readonly _generateRemover
        = <K, V, T>(forwardsMap: Map<K, Set<V>>, backwardsMap: Map<V, Set<K>>, thisValue: T) =>
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

    private static readonly _generateGetter
        = <K, V>(map: Map<K, Set<V>>) =>
            (key: K) => Array.from(map.get(key)?.values?.() ?? []);

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

    overrideWithCompiled(input: string, query: string, compiled: CompiledAction | CompiledTuple): PossibleError<string> {
        const actions = this._inputToAction.get(input);
        if (!actions) {
            return { err: `Input '${input}' is not bound` };
        }

        if (!actions.delete(query)) {
            return { err: `Input '${input}' is not bound to query 'query'` };
        }

        actions.add(compiled);
    }

    private static readonly _generateLister
        = <K, V>(map: Map<K, V>) =>
            () => Array.from(map.keys());

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
        return Array.from(this._actionToInput.entries()).reduce<GameSettings["binds"]>(
            (acc, [action, bindSet]) => {
                acc[action] = Array.from(bindSet);
                return acc;
            },
            {}
        );
    }
}

class InputManagerClass {
    readonly binds = new InputMapper();

    readonly isMobile!: boolean;

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

    mousePosition = Vec(0, 0);

    rotation = 0;

    readonly actions: InputAction[] = [];

    addAction(action: InputAction | SimpleInputActions): void {
        if (this.actions.length > 7) return;

        if (typeof action === "number") {
            action = { type: action } as InputAction;
        }

        if (action.type === InputActions.DropItem || action.type === InputActions.DropWeapon) {
            const inventory = UIManager.inventory;

            let item!: ItemDefinition;
            if (action.type === InputActions.DropItem) {
                item = action.item;
            } else if (action.type === InputActions.DropWeapon) {
                item = inventory.weapons[action.slot] as unknown as WeaponDefinition;
            }

            let playSound = !item.noDrop;

            if (playSound) {
                switch (item.defType) {
                    case DefinitionType.Ammo:
                    case DefinitionType.HealingItem:
                    case DefinitionType.Scope:
                        playSound = inventory.items[item.idString] > 0;
                        break;
                    case DefinitionType.Throwable:
                    case DefinitionType.Armor:
                    case DefinitionType.Gun:
                    case DefinitionType.Melee:
                    case DefinitionType.Skin:
                        playSound = true; // probably fine…?
                        break;
                    case DefinitionType.Backpack:
                        playSound = false; // womp womp
                        break;
                }
            }

            if (playSound) SoundManager.play("pickup");
        }

        this.actions.push(action);
    }

    gameMousePosition = Vec(0, 0);
    distanceToMouse = 0;

    attacking = false;

    resetAttacking = false;

    shootOnReleaseAngle = 0;

    turning = false;

    // Initialize an array to store focus state for keypresses
    private readonly _focusController = new Set<string>();

    private _lastInputPacket: InputData | undefined;
    private _inputPacketTimer = 0;

    update(): void {
        const packet = {
            type: PacketType.Input,
            movement: { ...this.movement },
            attacking: this.attacking,
            turning: this.turning,
            ...(
                this.turning
                    ? {
                        rotation: this.resetAttacking ? this.shootOnReleaseAngle : this.rotation,
                        distanceToMouse: this.distanceToMouse
                    }
                    : {}
            ),
            isMobile: this.isMobile,
            ...(
                this.isMobile
                    ? {
                        mobile: {
                            angle: this.movementAngle,
                            moving: this.movement.moving
                        }
                    }
                    : {}
            ),
            actions: this.actions,
            pingSeq: Game.takePingSeq() + (Game.gameOver ? 128 : 0) // MSB = "seq only?"
        } as InputData;

        this.turning = false;

        if (this.resetAttacking) {
            this.attacking = false;
            this.resetAttacking = false;
        }

        this._inputPacketTimer += Game.serverDt;

        if (
            this._lastInputPacket === undefined
            || areDifferent(this._lastInputPacket, packet)
            || this._inputPacketTimer >= 100
        ) {
            Game.sendPacket(InputPacket.create(packet));
            this._lastInputPacket = packet;
            this._inputPacketTimer = 0;
        }

        this.actions.length = 0;
    }

    private mWheelStopTimer: number | undefined;

    private _initialized = false;
    init(): void {
        if (this._initialized) {
            throw new Error("InputManager has already been initialized");
        }
        this._initialized = true;

        // @ts-expect-error init code
        this.isMobile = (isMobile.any && GameConsole.getBuiltInCVar("mb_controls_enabled")) || FORCE_MOBILE;

        const gameContainer = $("#game")[0];

        if (!this.isMobile) {
            // Prevents continued firing when cursor leaves the page
            gameContainer.addEventListener("pointerleave", () => {
                this.attacking = false;
            });

            // Prevents continued firing when RMB is pressed
            gameContainer.addEventListener("pointerup", () => {
                this.attacking = false;
            });
        }

        window.addEventListener("blur", () => {
            for (const k of this._focusController) {
                this.handleLostFocus(k);
            }

            this._focusController.clear();
        });

        // different event targets… why?
        window.addEventListener("keydown", this.handleInputEvent.bind(this, true));
        window.addEventListener("keyup", this.handleInputEvent.bind(this, false));
        gameContainer.addEventListener("pointerdown", this.handleInputEvent.bind(this, true));
        gameContainer.addEventListener("pointerup", this.handleInputEvent.bind(this, false));
        gameContainer.addEventListener("wheel", this.handleInputEvent.bind(this, true), { passive: true });

        gameContainer.addEventListener("pointermove", (e: MouseEvent) => {
            if (this.isMobile) return;

            this.mousePosition = Vec(e.clientX, e.clientY);
            this.turning = true;
            this.rotation = Math.atan2(e.clientY - window.innerHeight / 2, e.clientX - window.innerWidth / 2);

            if (Game.gameOver || !Game.activePlayer) return;

            const pixiPos = CameraManager.container.toLocal(this.mousePosition);
            this.gameMousePosition = Vec.scale(pixiPos, 1 / PIXI_SCALE);
            this.distanceToMouse = Geometry.distance(Game.activePlayer.position, this.gameMousePosition);

            if (GameConsole.getBuiltInCVar("cv_responsive_rotation")) {
                Game.activePlayer.container.rotation = this.rotation;
            }
        });

        // Mobile joysticks
        if (this.isMobile) {
            const size = GameConsole.getBuiltInCVar("mb_joystick_size");
            const transparency = GameConsole.getBuiltInCVar("mb_joystick_transparency");
            function joystickColor(transparency: number, input: string): string {
                const hexAlpha = Math.round(transparency * 255).toString(16).padStart(2, "0");
                return input + hexAlpha;
            }

            const leftJoystick = nipplejs.create({
                zone: $("#left-joystick-container")[0],
                size,
                color: joystickColor(transparency, GameConsole.getBuiltInCVar("mb_left_joystick_color")),
                ...(GameConsole.getBuiltInCVar("mb_joystick_lock")
                    ? {
                        position: { top: "50%", left: "25%" },
                        mode: "static"
                    }
                    : {})
            });
            const rightJoystick = nipplejs.create({
                zone: $("#right-joystick-container")[0],
                size,
                color: joystickColor(transparency, GameConsole.getBuiltInCVar("mb_right_joystick_color")),
                ...(GameConsole.getBuiltInCVar("mb_joystick_lock")
                    ? {
                        position: { top: "50%", right: "-25%" },
                        mode: "static"
                    }
                    : {})
            });

            const [movementJoystick, aimJoystick] = GameConsole.getBuiltInCVar("mb_switch_joysticks")
                ? [rightJoystick, leftJoystick]
                : [leftJoystick, rightJoystick];

            let aimJoystickUsed = false;
            let shootOnRelease = false;

            movementJoystick.on("move", (_, data: JoystickOutputData) => {
                const angle = -data.angle.radian;
                this.movementAngle = angle;
                this.movement.moving = true;

                if (!aimJoystickUsed && !shootOnRelease) {
                    this.rotation = angle;
                    this.turning = true;
                    if (GameConsole.getBuiltInCVar("cv_responsive_rotation") && !Game.gameOver && Game.activePlayer) {
                        Game.activePlayer.container.rotation = this.rotation;
                    }
                }
            });

            movementJoystick.on("end", () => {
                this.movement.moving = false;
            });

            aimJoystick.on("move", (_, data) => {
                aimJoystickUsed = true;
                this.rotation = -data.angle.radian;
                this.turning = true;

                const joystickSize = GameConsole.getBuiltInCVar("mb_joystick_size");

                this.distanceToMouse = Numeric.remap(data.distance, 0, joystickSize / 2, 0, GameConstants.player.maxMouseDist);

                const activePlayer = Game.activePlayer;
                if (!activePlayer) return;

                if (GameConsole.getBuiltInCVar("cv_responsive_rotation") && !Game.gameOver) {
                    activePlayer.container.rotation = this.rotation;
                }

                const def = activePlayer.activeItem;

                const { aimTrail, altAimTrail } = activePlayer.images;
                if (aimTrail) aimTrail.visible = true;
                if (altAimTrail) altAimTrail.visible = def.defType === DefinitionType.Gun && (def.isDual ?? false);

                const attacking = data.distance > joystickSize / 3;
                if (
                    (def.defType === DefinitionType.Throwable && this.attacking)
                    || (def.defType === DefinitionType.Gun && def.shootOnRelease)
                ) {
                    shootOnRelease = true;
                    this.shootOnReleaseAngle = this.rotation;
                } else {
                    this.attacking = attacking;
                }
            });

            aimJoystick.on("end", () => {
                aimJoystickUsed = false;
                this.attacking = shootOnRelease;
                this.resetAttacking = true;
                shootOnRelease = false;

                const activePlayer = Game.activePlayer;
                if (!activePlayer) return;

                const { aimTrail, altAimTrail } = activePlayer.images;
                if (aimTrail) aimTrail.visible = false;
                if (altAimTrail) altAimTrail.visible = false;
            });
        }

        // Gyro stuff
        const gyroAngle = GameConsole.getBuiltInCVar("mb_gyro_angle");
        if (gyroAngle > 0) {
            let a = false;
            let b = false;
            window.addEventListener("deviceorientation", gyro => {
                const angle = gyro.beta;
                if (angle === null) return;
                a = (angle <= -gyroAngle)
                    ? (a ? a : GameConsole.handleQuery("cycle_items -1", "always"), true)
                    : false;
                b = (angle >= gyroAngle)
                    ? (b ? b : GameConsole.handleQuery("cycle_items 1", "always"), true)
                    : false;
            });
        }

        this.generateBindsConfigScreen();
    }

    private handleInputEvent(down: boolean, event: KeyboardEvent | MouseEvent | WheelEvent): void {
        if (!event.isTrusted) return;

        // Disable pointer events on mobile if mobile controls are enabled
        if (event instanceof PointerEvent && this.isMobile) return;

        // If the user is interacting with a text field or something of the sort, inputs should
        // not be honored
        if (document.activeElement !== document.body) return;

        const { type } = event;

        /*
            We don't want to allow keybinds to work with modifiers, because firstly,
            pressing ctrl + R to reload is dumb and secondly, doing that refreshes the page

            We already fire preventDefault to allow Tab and right-click binds to not be totally
            unusable, and so we need to disallow modifiers. However, in the case that someone binds
            an action to shift or control, they should still be able to do that.

            In essence, we need to only process inputs which are a single modifier key or which are
            a normal key without modifiers.

            This only applies to keyboard events

            Also, we allow shift and alt to be used normally, because keyboard shortcuts usually involve
            the meta or control key
        */

        if (event instanceof KeyboardEvent) {
            const { key } = event;
            // This statement cross-references and updates focus checks for key presses.
            if (down) {
                this._focusController.add(key);
            } else {
                this._focusController.delete(key);
            }

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
                    modifierCount > 1
                    || (modifierCount === 1 && !["Control", "Meta"].includes(key))
                ) && down
                // …but it only invalidates pressing a key, not releasing it
            ) return;
        }

        const input = this.getKeyFromInputEvent(event);
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
                actionsFired = this.fireAllEventsAtKey(input as string, false);
            }, 50);

            actionsFired = this.fireAllEventsAtKey(input as string, true);
            return;
        }

        const isDown = type === "keydown" || type === "pointerdown";
        if (Array.isArray(input)) {
            for (const inp of input) {
                actionsFired += this.fireAllEventsAtKey(inp, isDown);
            }
        } else {
            actionsFired = this.fireAllEventsAtKey(input, isDown);
        }

        if (actionsFired > 0 && Game.gameStarted) {
            event.preventDefault();
        }
    }

    // Update keypresses when the page looses focus
    private handleLostFocus(key: string): void {
        this.fireAllEventsAtKey(key.toUpperCase(), false);
    }

    private fireAllEventsAtKey(input: string, down: boolean): number {
        const actions = this.binds.getActionsBoundToInput(input) ?? [];

        for (const action of actions) {
            let query = action;
            if (down) {
                if (typeof query !== "string" && typeof query !== "function") {
                    query = query[0]; // fn pair & "down" -> pick first
                }
            } else {
                if (typeof query === "string") {
                    /*
                        corollary: queries starting with a group don't get modified
                        thus, if you do `bind W "(+up)"`, pressing W will call "(+up)",
                        but so too wll releasing W
                        this is not true if you do `bind W +up`. here, the query does start
                        with +, thus the command -up is invoked when W is released
                    */
                    if (query.startsWith("+")) { // Invertible action
                        query = query.replace("+", "-");
                    } else continue; // If the action isn't invertible, then we do nothing
                } else {
                    if (typeof query === "function") continue; // single function & not invertible -> do nothing
                    query = query[1]; // pick invertible version
                }
            }

            if (typeof query === "string") {
                const { compiled } = GameConsole.handleQuery(query, "always");

                if (compiled !== undefined) {
                    this.binds.overrideWithCompiled(input, query, compiled);
                }
            } else query();
        }

        return actions.length;
    }

    private getKeyFromInputEvent<
        const Ev extends KeyboardEvent | MouseEvent | WheelEvent
    >(event: Ev): Ev extends KeyboardEvent ? string | string[] : string {
        type Ret = typeof event extends KeyboardEvent ? string[] : string;

        let input = "";
        if (event instanceof KeyboardEvent) {
            const { key, code, location } = event;

            input = key.length > 1
                ? key
                : code.match(/^(Key|Digit)/)
                    ? code.slice(-1)
                    : code;

            switch (location) {
                case 1: return [input, `Left${input}`] as Ret;
                case 2: return [input, `Right${input}`] as Ret;
                case 0:
                default: return input as Ret;
            }
        }

        if (event instanceof WheelEvent) {
            switch (true) {
                case event.deltaX > 0: { input = "MWheelRight"; break; }
                case event.deltaX < 0: { input = "MWheelLeft"; break; }
                case event.deltaY > 0: { input = "MWheelDown"; break; }
                case event.deltaY < 0: { input = "MWheelUp"; break; }
                case event.deltaZ > 0: { input = "MWheelForwards"; break; }
                case event.deltaZ < 0: { input = "MWheelBackwards"; break; }
            }

            if (input === "") {
                console.error("An unrecognized scroll wheel event was received: ", event);
            }

            return input as Ret;
        }

        if (event instanceof MouseEvent) {
            input = `Mouse${event.button}`;
        }

        return input as Ret;
    }

    cycleScope(offset: number): void {
        const scope = UIManager.inventory.scope;
        const scopeIndex = Scopes.definitions.indexOf(scope);
        let scopeTarget = scope;

        let searchIndex = scopeIndex;
        let iterationCount = 0;
        // Prevent possible infinite loops
        while (iterationCount++ < 100) {
            searchIndex = GameConsole.getBuiltInCVar("cv_loop_scope_selection")
                ? Numeric.absMod(searchIndex + offset, Scopes.definitions.length)
                : Numeric.clamp(searchIndex + offset, 0, Scopes.definitions.length - 1);

            const scopeCandidate = Scopes.definitions[searchIndex];

            if (UIManager.inventory.items[scopeCandidate.idString]) {
                scopeTarget = scopeCandidate;
                break;
            }
        }

        if (scopeTarget !== scope) {
            this.addAction({
                type: InputActions.UseItem,
                item: scopeTarget
            });
        }
    }

    cycleThrowable(offset: number): void {
        const throwable = UIManager.inventory.weapons
            .find(weapon => weapon?.definition.defType === DefinitionType.Throwable)
            ?.definition as ThrowableDefinition | undefined;

        if (!throwable) return;

        const definitions = Throwables.definitions;
        const throwableIndex = definitions.indexOf(throwable);
        let throwableTarget = throwable;

        const items = UIManager.inventory.items;

        let searchIndex = throwableIndex;
        let iterationCount = 0;
        // Prevent possible infinite loops
        while (iterationCount++ < 100) {
            searchIndex = Numeric.absMod(searchIndex + offset, definitions.length);

            const throwableCandidate = definitions[searchIndex];

            if (items[throwableCandidate.idString]) {
                throwableTarget = throwableCandidate;
                break;
            }
        }

        if (throwableTarget !== throwable) {
            this.addAction({
                type: InputActions.UseItem,
                item: throwableTarget
            });
        }
    }

    private readonly _keybindsContainer = $<HTMLDivElement>("#tab-keybinds-content");
    generateBindsConfigScreen(): void {
        this._keybindsContainer.html("").append(html`
            <div class="modal-item" id="keybind-clear-tooltip">
                ${getTranslatedString("keybind_clear_tooltip")}
            </div>
        `);

        let activeButton: HTMLButtonElement | undefined;
        for (const action in defaultBinds) {
            const bindContainer = $("<div/>", { class: "modal-item" }).appendTo(this._keybindsContainer);

            $("<div/>", {
                class: "setting-title",
                text: getTranslatedString(`bindings_${action}` as TranslationKeys)
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

                const setKeyBind = (event: KeyboardEvent | MouseEvent | WheelEvent): void => {
                    event.stopImmediatePropagation();

                    if (
                        event instanceof MouseEvent
                        && event.type === "mousedown"
                        && !bindButton.classList.contains("active")
                    ) {
                        activeButton?.classList.remove("active");
                        bindButton.classList.add("active");
                        activeButton = bindButton;
                        return;
                    }

                    if (bindButton.classList.contains("active")) {
                        event.preventDefault();
                        const keyRaw = this.getKeyFromInputEvent(event);
                        // use console if you want to bind specifically to a left/right variant
                        const key = Array.isArray(keyRaw) ? keyRaw[0] : keyRaw;

                        if (bind) {
                            this.binds.remove(bind, action);
                        }

                        this.binds.unbindInput(key);
                        if (!(key === "Escape" || key === "Backspace")) {
                            this.binds.addActionsToInput(key, action);
                        }

                        GameConsole.writeToLocalStorage();
                        this.generateBindsConfigScreen();
                    }
                };

                bindButton.addEventListener("keydown", setKeyBind);
                bindButton.addEventListener("mousedown", setKeyBind);
                bindButton.addEventListener("wheel", setKeyBind, { passive: true });
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
            html: html`
                <span style="position: relative; top: -2px">
                    <i class="fa-solid fa-trash" style="font-size: 17px; margin-right: 3px; position: relative; top: -1px"></i>
                    ${getTranslatedString("keybind_reset")}
                </span>`
        }).on("click", () => {
            this.binds.unbindAll();

            for (const [action, keys] of Object.entries(defaultBinds)) {
                this.binds.addInputsToAction(action, ...keys);
            }

            this.generateBindsConfigScreen();
            GameConsole.writeToLocalStorage();
        })).appendTo(this._keybindsContainer);

        // Change the weapons slots keybind text
        for (let i = 0, maxWeapons = GameConstants.player.maxWeapons; i < maxWeapons; i++) {
            const slotKeybinds = this.binds.getInputsBoundToAction(i === 3 ? "equip_or_cycle_throwables 1" : `slot ${i}`).filter(a => a !== "").slice(0, 2);
            $(`#weapon-slot-${i + 1}`).children(".slot-number").text(slotKeybinds.join(" / "));
        }
    }

    getIconFromInputName(input: string): string | undefined {
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

export const InputManager = new InputManagerClass();

export type CompiledAction = (() => boolean) & { readonly original: string };
export type CompiledTuple = readonly [CompiledAction, CompiledAction];
