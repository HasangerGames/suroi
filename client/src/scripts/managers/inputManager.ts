import { GameConstants, InputActions } from "@common/constants";
import { type WeaponDefinition } from "@common/definitions/loots";
import { Scopes } from "@common/definitions/scopes";
import { Throwables, type ThrowableDefinition } from "@common/definitions/throwables";
import { areDifferent, PlayerInputPacket, type InputAction, type PlayerInputData, type SimpleInputActions } from "@common/packets/inputPacket";
import { Angle, Geometry, Numeric } from "@common/utils/math";
import { ItemType, type ItemDefinition } from "@common/utils/objectDefinitions";
import { Vec } from "@common/utils/vector";
import $ from "jquery";
import nipplejs, { type JoystickOutputData } from "nipplejs";
import { isMobile } from "pixi.js";
import { getTranslatedString } from "../../translations";
import { type TranslationKeys } from "../../typings/translations";
import { type Game } from "../game";
import { defaultBinds } from "../utils/console/defaultClientCVars";
import { type GameSettings, type PossibleError } from "../utils/console/gameConsole";
import { FORCE_MOBILE, PIXI_SCALE } from "../utils/constants";
import { html } from "../utils/misc";

export class InputManager {
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

    mouseX = 0;
    mouseY = 0;

    emoteWheelActive = false;
    emoteWheelPosition = Vec.create(0, 0);
    pingWheelActive = false;
    /**
     * If the ping wheel was activated in the minimap
     */
    pingWheelMinimap = false;
    pingWheelPosition = Vec.create(0, 0);
    selectedEmote?: number;

    rotation = 0;

    readonly actions: InputAction[] = [];

    addAction(action: InputAction | SimpleInputActions): void {
        if (this.actions.length > 7) return;

        if (typeof action === "number") {
            action = { type: action } as InputAction;
        }

        if (action.type === InputActions.DropItem || action.type === InputActions.DropWeapon) {
            const { inventory } = this.game.uiManager;

            let item!: ItemDefinition;
            if (action.type === InputActions.DropItem) {
                item = action.item;
            } else if (action.type === InputActions.DropWeapon) {
                item = inventory.weapons[action.slot] as unknown as WeaponDefinition;
            }

            let playSound = !item.noDrop;

            if (playSound) {
                switch (item.itemType) {
                    case ItemType.Ammo:
                    case ItemType.Healing:
                    case ItemType.Scope:
                        playSound = inventory.items[item.idString] > 0;
                        break;
                    case ItemType.Throwable:
                    case ItemType.Armor:
                    case ItemType.Gun:
                    case ItemType.Melee:
                    case ItemType.Skin:
                        playSound = true; // probably fine…?
                        break;
                    case ItemType.Backpack:
                        playSound = false; // womp womp
                        break;
                }
            }

            if (playSound) this.game.soundManager.play("pickup");
        }

        if (action.type === InputActions.ExplodeC4 && this.game.uiManager.hasC4s) {
            this.game.soundManager.play("c4_beep");
        }

        this.actions.push(action);
    }

    gameMousePosition = Vec.create(0, 0);
    distanceToMouse = 0;

    attacking = false;

    resetAttacking = false;

    shootOnReleaseAngle = 0;

    turning = false;

    // Initialize an array to store focus state for keypresses
    private readonly _focusController = new Set<string>();

    private _lastInputPacket: PlayerInputData | undefined;
    private _inputPacketTimer = 0;

    update(): void {
        if (this.game.gameOver) return;
        const packet = {
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
            actions: this.actions
        } as PlayerInputData;

        this.turning = false;

        if (this.resetAttacking) {
            this.attacking = false;
            this.resetAttacking = false;
        }

        this._inputPacketTimer += this.game.serverDt;

        if (
            !this._lastInputPacket
            || areDifferent(this._lastInputPacket, packet)
            || this._inputPacketTimer >= 100
        ) {
            this.game.sendPacket(PlayerInputPacket.create(packet));
            this._lastInputPacket = packet;
            this._inputPacketTimer = 0;
        }

        this.actions.length = 0;
    }

    private static _instantiated = false;
    constructor(readonly game: Game) {
        if (InputManager._instantiated) {
            throw new Error("Class 'InputManager' has already been instantiated");
        }
        InputManager._instantiated = true;
    }

    private mWheelStopTimer: number | undefined;
    setupInputs(): void {
        // @ts-expect-error init code
        this.isMobile = (isMobile.any && this.game.console.getBuiltInCVar("mb_controls_enabled")) || FORCE_MOBILE;

        const game = this.game;
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
        gameContainer.addEventListener("wheel", this.handleInputEvent.bind(this, true));

        $("#emote-wheel > .button-center").on("click", () => {
            this.emoteWheelActive = false;
            this.game.uiManager.ui.emoteButton
                .removeClass("btn-alert")
                .addClass("btn-primary");
            this.selectedEmote = undefined;
            this.pingWheelMinimap = false;
            $("#emote-wheel").hide();
        });

        const FIRST_EMOTE_ANGLE = Math.atan2(-1, -1);
        const SECOND_EMOTE_ANGLE = Math.atan2(1, 1);
        const THIRD_EMOTE_ANGLE = Math.atan2(-1, 1);
        const FOURTH_EMOTE_ANGLE = Math.atan2(1, -1);

        gameContainer.addEventListener("pointermove", (e: MouseEvent) => {
            if (this.isMobile) return;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            if (this.emoteWheelActive) {
                const mousePosition = Vec.create(e.clientX, e.clientY);
                if (Geometry.distanceSquared(this.emoteWheelPosition, mousePosition) > 500 && this.game.activePlayer && !this.game.activePlayer.blockEmoting) {
                    const angle = Angle.betweenPoints(this.emoteWheelPosition, mousePosition);
                    let slotName: string | undefined;
                    if (SECOND_EMOTE_ANGLE <= angle && angle <= FOURTH_EMOTE_ANGLE) {
                        this.selectedEmote = 0;
                        slotName = "top";
                    } else if (!(angle >= FIRST_EMOTE_ANGLE && angle <= FOURTH_EMOTE_ANGLE)) {
                        this.selectedEmote = 1;
                        slotName = "right";
                    } else if (FIRST_EMOTE_ANGLE <= angle && angle <= THIRD_EMOTE_ANGLE) {
                        this.selectedEmote = 2;
                        slotName = "bottom";
                    } else if (THIRD_EMOTE_ANGLE <= angle && angle <= SECOND_EMOTE_ANGLE) {
                        this.selectedEmote = 3;
                        slotName = "left";
                    }
                    $("#emote-wheel").css("background-image", `url("./img/misc/emote_wheel_highlight_${slotName ?? "top"}.svg"), url("./img/misc/emote_wheel.svg")`);
                } else {
                    this.selectedEmote = undefined;
                    $("#emote-wheel").css("background-image", "url(\"./img/misc/emote_wheel_highlight_center.svg\"), url(\"./img/misc/emote_wheel.svg\")");
                }
            }

            this.rotation = Math.atan2(e.clientY - window.innerHeight / 2, e.clientX - window.innerWidth / 2);

            if (!game.gameOver && game.activePlayer) {
                const globalPos = Vec.create(e.clientX, e.clientY);
                const pixiPos = game.camera.container.toLocal(globalPos);
                this.gameMousePosition = Vec.scale(pixiPos, 1 / PIXI_SCALE);
                this.distanceToMouse = Geometry.distance(game.activePlayer.position, this.gameMousePosition);

                if (game.console.getBuiltInCVar("cv_responsive_rotation")) {
                    game.activePlayer.container.rotation = this.rotation;
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
                    if (game.console.getBuiltInCVar("cv_responsive_rotation") && !game.gameOver && game.activePlayer) {
                        game.activePlayer.container.rotation = this.rotation;
                    }
                }
            });

            leftJoyStick.on("end", () => {
                this.movement.moving = false;
            });

            rightJoyStick.on("move", (_, data) => {
                rightJoyStickUsed = true;
                this.rotation = -Math.atan2(data.vector.y, data.vector.x);
                this.turning = true;
                const activePlayer = game.activePlayer;
                if (game.console.getBuiltInCVar("cv_responsive_rotation") && !game.gameOver && activePlayer) {
                    game.activePlayer.container.rotation = this.rotation;
                }

                if (!activePlayer) return;

                const def = activePlayer.activeItem;

                activePlayer.images.aimTrail.alpha = 1;

                const attacking = data.distance > game.console.getBuiltInCVar("mb_joystick_size") / 3;
                if (
                    (def.itemType === ItemType.Throwable && this.attacking)
                    || (def.itemType === ItemType.Gun && def.shootOnRelease)
                ) {
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
        // Gyro stuff
        const gyroAngle = game.console.getBuiltInCVar("mb_gyro_angle");
        if (gyroAngle > 0) {
            const inv = this.game.uiManager.inventory;
            const swap = (x: number): void => {
                let y = Numeric.absMod(inv.activeWeaponIndex + x, 4);
                let iteration = 0;
                while (!inv.weapons[y]) {
                    y = Numeric.absMod(y + x, 4);
                    if (iteration++ > 5) {
                        y = inv.activeWeaponIndex;
                        break;
                    }
                }
                this.addAction({
                    type: InputActions.EquipItem,
                    slot: y
                });
            };
            let a = false;
            let b = false;
            window.addEventListener("deviceorientation", gyro => {
                // It would be impossible to send the DeviceOrientation event but lack the beta property
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const angle = gyro.beta!;
                a = (angle <= -gyroAngle)
                    ? (a ? a : swap(-1), true)
                    : false;
                b = (angle >= gyroAngle)
                    ? (b ? b : swap(1), true)
                    : false;
            });
        }
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

            Also we allow shift and alt to be used normally, because keyboard shortcuts usually involve
            the meta or control key
        */

        if (event instanceof KeyboardEvent) {
            const { key } = event;
            // This statement cross references and updates focus checks for key presses.
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

        if (actionsFired > 0 && this.game.gameStarted) {
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
                const { compiled } = this.game.console.handleQuery(query, "always");

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
        const scope = this.game.uiManager.inventory.scope;
        const scopeIndex = Scopes.definitions.indexOf(scope);
        let scopeTarget = scope;

        let searchIndex = scopeIndex;
        let iterationCount = 0;
        // Prevent possible infinite loops
        while (iterationCount++ < 100) {
            searchIndex = this.game.console.getBuiltInCVar("cv_loop_scope_selection")
                ? Numeric.absMod(searchIndex + offset, Scopes.definitions.length)
                : Numeric.clamp(searchIndex + offset, 0, Scopes.definitions.length - 1);

            const scopeCandidate = Scopes.definitions[searchIndex];

            if (this.game.uiManager.inventory.items[scopeCandidate.idString]) {
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
        const throwable = this.game.uiManager.inventory.weapons
            .find(weapon => weapon?.definition.itemType === ItemType.Throwable)
            ?.definition as ThrowableDefinition | undefined;

        if (!throwable) return;

        const definitions = Throwables.definitions;
        const throwableIndex = definitions.indexOf(throwable);
        let throwableTarget = throwable;

        const items = this.game.uiManager.inventory.items;

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
            this.game.console.writeToLocalStorage();
        })).appendTo(this._keybindsContainer);

        // Change the weapons slots keybind text
        for (let i = 0, maxWeapons = GameConstants.player.maxWeapons; i < maxWeapons; i++) {
            const slotKeybinds = this.binds.getInputsBoundToAction(i === 3 ? "equip_or_cycle_throwables 1" : `slot ${i}`).filter(a => a !== "").slice(0, 2);
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

export type CompiledAction = (() => boolean) & { readonly original: string };
export type CompiledTuple = readonly [CompiledAction, CompiledAction];

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
