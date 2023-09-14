import nipplejs, { type JoystickOutputData } from "nipplejs";

import { absMod, angleBetween, distanceSquared } from "../../../../common/src/utils/math";
import { InputActions, INVENTORY_MAX_WEAPONS, SpectateActions } from "../../../../common/src/constants";
import { type PlayerManager } from "./playerManager";
import { defaultConfig, type KeybindActions, localStorageInstance } from "./localStorageHandler";
import { type Game } from "../game";
import { v } from "../../../../common/src/utils/vector";
import { EmoteSlot, FIRST_EMOTE_ANGLE, FOURTH_EMOTE_ANGLE, SECOND_EMOTE_ANGLE, THIRD_EMOTE_ANGLE } from "./constants";
import { SpectatePacket } from "../packets/sending/spectatePacket";

class Action {
    readonly name: string;
    readonly on: () => void;
    readonly off: () => void;
    private down = false;

    constructor(name: string, on?: () => void, off?: () => void) {
        this.name = name;

        this.on = () => {
            if (this.down) return;
            this.down = true;
            on?.();
        };

        this.off = () => {
            if (!this.down) return;
            this.down = false;
            off?.();
        };
    }
}

type ConvertToAction<T extends Record<string, object | string>> = { [K in keyof T]: T[K] extends Record<string, object | string> ? ConvertToAction<T[K]> : Action };

function generateKeybindActions(game: Game): ConvertToAction<KeybindActions> {
    function generateMovementAction(direction: keyof PlayerManager["movement"]): Action {
        return new Action(
            `move::${direction.toString()}`,
            () => {
                game.playerManager.movement[direction] = true;
                game.playerManager.dirty.inputs = true;
                if (game.spectating) {
                    let action: SpectateActions | undefined;
                    if (direction === "left") action = SpectateActions.SpectatePrevious;
                    else if (direction === "right") action = SpectateActions.SpectateNext;
                    if (action !== undefined) game.sendPacket(new SpectatePacket(game.playerManager, action));
                }
            },
            () => {
                game.playerManager.movement[direction] = false;
                game.playerManager.dirty.inputs = true;
            }
        );
    }

    function generateSlotAction(slot: number): Action {
        return new Action(
            `inventory::slot${slot}`,
            () => { game.playerManager.equipItem(slot); }
        );
    }

    function generateItemCycler(step: number) {
        return () => {
            let index = absMod((game.playerManager.activeItemIndex + step), INVENTORY_MAX_WEAPONS);

            while (!game.playerManager.weapons[index]) {
                index = absMod((index + step), INVENTORY_MAX_WEAPONS);
            }

            game.playerManager.equipItem(index);
        };
    }

    return {
        moveUp: generateMovementAction("up"),
        moveDown: generateMovementAction("down"),
        moveRight: generateMovementAction("right"),
        moveLeft: generateMovementAction("left"),
        interact: new Action(
            "interact",
            () => { game.playerManager.interact(); }
        ),

        slot1: generateSlotAction(0),
        slot2: generateSlotAction(1),
        slot3: generateSlotAction(2),

        lastEquippedItem: new Action(
            "inventory::lastEquippedItem",
            () => {
                game.playerManager.equipItem(game.playerManager.lastItemIndex);
            }
        ),
        equipOtherGun: new Action(
            "inventory::equipOtherGun",
            () => {
                let index = game.playerManager.activeItemIndex > 1
                    ? 0
                    : 1 - game.playerManager.activeItemIndex;

                // fallback to melee if there's no weapon on the slot
                if (game.playerManager.weapons[index] === undefined) index = 2;
                game.playerManager.equipItem(index);
            }
        ),
        swapGunSlots: new Action(
            "inventory::swapGunSlots",
            () => { game.playerManager.swapGunSlots(); }
        ),
        previousItem: new Action(
            "inventory::previousItem",
            generateItemCycler(-1)
        ),
        nextItem: new Action(
            "inventory::nextItem",
            generateItemCycler(1)
        ),
        useItem: new Action(
            "useItem",
            () => { game.playerManager.attacking = true; },
            () => { game.playerManager.attacking = false; }
        ),
        dropActiveItem: new Action(
            "inventory::dropActiveItem",
            () => {
                game.playerManager.dropItem(game.playerManager.activeItemIndex);
            }
        ),
        reload: new Action(
            "inventory::reload",
            () => {
                game.playerManager.reload();
            }
        ),
        previousScope: new Action(
            "inventory::previousScope",
            () => {
                game.playerManager.switchScope(-1);
            }
        ),
        nextScope: new Action(
            "inventory::nextScope",
            () => {
                game.playerManager.switchScope(1);
            }
        ),
        useGauze: new Action(
            "inventory::useGauze",
            () => {
                game.playerManager.useItem("gauze");
            }
        ),
        useMedikit: new Action(
            "inventory::useMediKit",
            () => {
                game.playerManager.useItem("medikit");
            }
        ),
        useCola: new Action(
            "inventory::useCola",
            () => {
                game.playerManager.useItem("cola");
            }
        ),
        useTablets: new Action(
            "inventory::useTablets",
            () => {
                game.playerManager.useItem("tablets");
            }
        ),
        cancelAction: new Action(
            "inventory::cancelAction",
            () => {
                game.playerManager.cancelAction();
            }
        ),
        toggleMap: new Action(
            "toggleMap",
            () => {
                game.map.toggle();
            }
        ),
        toggleMiniMap: new Action(
            "toggleMiniMap",
            () => {
                game.map.toggleMiniMap();
            }
        ),
        emoteWheel: new Action(
            "emoteWheel",
            () => {
                if (game.gameOver) return;
                $("#emote-wheel")
                    .css("left", `${game.playerManager.mouseX - 143}px`)
                    .css("top", `${game.playerManager.mouseY - 143}px`)
                    .css("background-image", 'url("./img/misc/emote_wheel.svg")')
                    .show();
                game.playerManager.emoteWheelActive = true;
                game.playerManager.emoteWheelPosition = v(game.playerManager.mouseX, game.playerManager.mouseY);
            },
            () => {
                $("#emote-wheel").hide();
                switch (game.playerManager.selectedEmoteSlot) {
                    case EmoteSlot.Top:
                        game.playerManager.action = InputActions.TopEmoteSlot;
                        break;
                    case EmoteSlot.Right:
                        game.playerManager.action = InputActions.RightEmoteSlot;
                        break;
                    case EmoteSlot.Bottom:
                        game.playerManager.action = InputActions.BottomEmoteSlot;
                        break;
                    case EmoteSlot.Left:
                        game.playerManager.action = InputActions.LeftEmoteSlot;
                        break;
                }
                game.playerManager.dirty.inputs = true;
                game.playerManager.emoteWheelActive = false;
                game.playerManager.selectedEmoteSlot = EmoteSlot.None;
            }
        )
    };
}

const bindings: Map<string, Action[]> = new Map<string, Action[]>();

function bind(keys: string[], action: Action): void {
    for (const key of keys) {
        (
            bindings.get(key) ??
            (() => {
                const array: Action[] = [];
                bindings.set(key, array);
                return array;
            })()
        ).push(action);
    }
}

let actions: ConvertToAction<KeybindActions>;

export function setupInputs(game: Game): void {
    actions = generateKeybindActions(game);
    const keybinds = localStorageInstance.config.keybinds;

    for (const action in keybinds) {
        bind(keybinds[action as keyof KeybindActions], actions[action as keyof KeybindActions]);
    }

    /**
     * Fires all events attached to a certain input channel
     * @param key The input channel to fire
     * @param down Whether the key is being pressed down or released
     * @returns The number of actions triggered
     */
    function fireAllEventsAtKey(key: string, down: boolean): number {
        const actions = bindings.get(key);

        actions?.forEach(action => {
            down
                ? action.on?.()
                : action.off?.();
        });

        return actions?.length ?? 0;
    }

    let mWheelStopTimer: number | undefined;
    function handleInputEvent(down: boolean, event: KeyboardEvent | MouseEvent | WheelEvent): void {
        if (!$("canvas").hasClass("active")) return;

        // Disable pointer events on mobile if mobile controls are enabled
        if (event instanceof PointerEvent && game.playerManager.isMobile) return;

        /*
            We don't want to allow keybinds to work with modifiers, because firstly,
            pressing ctrl + R to reload is dumb and secondly, doing that refreshes the page

            We already fire preventDefault to allow Tab and right-click binds to not be totally
            unusable, and so we need to disallow modifiers. However, in the case that someone binds
            an action to shift or control, they should still be able to do that.

            In essence, we need to only process inputs which are a single modifier key or which are
            a normal key without modifiers.

            This only applies to keyboard events
        */

        if (event instanceof KeyboardEvent) {
            let modifierCount = 0;
            (
                [
                    "altKey",
                    "metaKey",
                    "ctrlKey",
                    "shiftKey"
                ] as Array<keyof KeyboardEvent>
            ).forEach(modifier => (event[modifier] && modifierCount++));

            // As stated before, more than one modifier or a modifier alongside another key should invalidate an input
            if (
                (
                    modifierCount > 1 ||
                    (modifierCount === 1 && !["Shift", "Control", "Alt", "Meta"].includes(event.key))
                ) && down
                // …but it only invalidates pressing a key, not releasing it
            ) return;
        }

        const key = getKeyFromInputEvent(event);
        let actionsFired = 0;

        if (event instanceof WheelEvent) {
            /*
                The browser doesn't emit mouse wheel "stop" events, so instead, we schedule the invocation
                of the stop callback to some time in the near future, cancelling the previous callback

                This has the effect of continuously cancelling the stop callback whenever a wheel event is
                detected, which is what we want
            */
            clearTimeout(mWheelStopTimer);
            mWheelStopTimer = window.setTimeout(() => {
                actionsFired = fireAllEventsAtKey(key, false);
            }, 50);

            actionsFired = fireAllEventsAtKey(key, true);
            return;
        }

        actionsFired = fireAllEventsAtKey(key, event.type === "keydown" || event.type === "pointerdown");

        if (actionsFired > 0) {
            event.preventDefault();
        }
    }

    const gameUi = $("#game-ui")[0];

    // different event targets… why?
    window.addEventListener("keydown", handleInputEvent.bind(null, true));
    window.addEventListener("keyup", handleInputEvent.bind(null, false));
    gameUi.addEventListener("pointerdown", handleInputEvent.bind(null, true));
    gameUi.addEventListener("pointerup", handleInputEvent.bind(null, false));
    gameUi.addEventListener("wheel", handleInputEvent.bind(null, true));

    gameUi.addEventListener("pointermove", (e: MouseEvent) => {
        if (game.playerManager === undefined || game.playerManager.isMobile) return;
        const player = game.playerManager;
        player.mouseX = e.clientX;
        player.mouseY = e.clientY;

        if (player.emoteWheelActive) {
            const mousePosition = v(e.clientX, e.clientY);
            if (distanceSquared(player.emoteWheelPosition, mousePosition) > 500) {
                const angle = angleBetween(player.emoteWheelPosition, mousePosition);
                let slotName: string | undefined;
                if (angle >= SECOND_EMOTE_ANGLE && angle <= FOURTH_EMOTE_ANGLE) {
                    player.selectedEmoteSlot = EmoteSlot.Top;
                    slotName = "top";
                } else if (!(angle >= FIRST_EMOTE_ANGLE && angle <= FOURTH_EMOTE_ANGLE)) {
                    player.selectedEmoteSlot = EmoteSlot.Right;
                    slotName = "right";
                } else if (angle >= FIRST_EMOTE_ANGLE && angle <= THIRD_EMOTE_ANGLE) {
                    player.selectedEmoteSlot = EmoteSlot.Bottom;
                    slotName = "bottom";
                } else if (angle >= THIRD_EMOTE_ANGLE && angle <= SECOND_EMOTE_ANGLE) {
                    player.selectedEmoteSlot = EmoteSlot.Left;
                    slotName = "left";
                }
                $("#emote-wheel").css("background-image", `url("./img/misc/emote_wheel_highlight_${slotName ?? "top"}.svg"), url("./img/misc/emote_wheel.svg")`);
            } else {
                player.selectedEmoteSlot = EmoteSlot.None;
                $("#emote-wheel").css("background-image", 'url("./img/misc/emote_wheel.svg")');
            }
        }

        player.rotation = Math.atan2(e.clientY - window.innerHeight / 2, e.clientX - window.innerWidth / 2);
        if (localStorageInstance.config.clientSidePrediction && !game.gameOver && game.activePlayer) {
            game.activePlayer.container.rotation = player.rotation;
            game.map.indicator.rotation = player.rotation;
        }
        player.turning = true;
        player.dirty.inputs = true;
    });

    // Mobile joysticks
    if (game.playerManager.isMobile) {
        const config = localStorageInstance.config;
        const leftJoyStick = nipplejs.create({
            zone: $("#left-joystick-container")[0],
            size: config.joystickSize,
            color: `rgba(255, 255, 255, ${config.joystickTransparency})`
        });

        leftJoyStick.on("move", (_, data: JoystickOutputData) => {
            game.playerManager.movementAngle = -Math.atan2(data.vector.y, data.vector.x);
            game.playerManager.movement.moving = true;
            game.playerManager.dirty.inputs = true;
        });
        leftJoyStick.on("end", () => {
            game.playerManager.movement.moving = false;
            game.playerManager.dirty.inputs = true;
        });

        const rightJoyStick = nipplejs.create({
            zone: $("#right-joystick-container")[0],
            size: config.joystickSize,
            color: `rgba(255, 255, 255, ${config.joystickTransparency})`
        });

        rightJoyStick.on("move", (_, data: JoystickOutputData) => {
            game.playerManager.rotation = -Math.atan2(data.vector.y, data.vector.x);
            if (localStorageInstance.config.clientSidePrediction && !game.gameOver && game.activePlayer) {
                game.activePlayer.container.rotation = game.playerManager.rotation;
            }
            game.playerManager.turning = true;
            game.playerManager.attacking = data.distance > config.joystickSize / 3;
        });
        rightJoyStick.on("end", () => {
            game.playerManager.attacking = false;
        });
    }
}

function getKeyFromInputEvent(event: KeyboardEvent | MouseEvent | WheelEvent): string {
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

// Nowhere else to put this…
export function getIconFromInputName(input: string): string | undefined {
    let name: string | undefined;

    input = input.toLowerCase();
    if (
        [
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
        ].some(query => input.startsWith(query))
    ) {
        if (input === "meta") { // "meta" means different things depending on the OS
            name = navigator.userAgent.match(/mac|darwin/ig) ? "command" : "windows";
        } else {
            name = input.toLowerCase().replace(/ /g, "");
        }
    }

    return name === undefined ? name : `./img/misc/${name}_icon.svg`;
}

const actionsNames = {
    moveUp: "Move Up",
    moveDown: "Move Down",
    moveLeft: "Move Left",
    moveRight: "Move Right",
    interact: "Interact",
    slot1: "Equip Primary",
    slot2: "Equip Secondary",
    slot3: "Equip Melee",
    lastEquippedItem: "Equip Last Weapon",
    equipOtherGun: "Equip Other Gun",
    swapGunSlots: "Swap Gun Slots",
    previousItem: "Equip Previous Weapon",
    nextItem: "Equip Next Weapon",
    useItem: "Use Weapon",
    dropActiveItem: "Drop Active Weapon",
    reload: "Reload",
    previousScope: "Previous Scope",
    nextScope: "Next Scope",
    useGauze: "Use Gauze",
    useMedikit: "Use Medikit",
    useCola: "Use Cola",
    useTablets: "Use Tablets",
    cancelAction: "Cancel Action",
    toggleMap: "Toggle Fullscreen Map",
    toggleMiniMap: "Toggle Minimap",
    emoteWheel: "Emote Wheel"
};

// Generate the input settings
function generateBindsConfigScreen(): void {
    const keybindsContainer = $("#tab-keybinds-content");
    keybindsContainer.html("");

    for (const a in defaultConfig.keybinds) {
        const action = a as keyof KeybindActions;

        const bindContainer = $("<div/>", { class: "modal-item" }).appendTo(keybindsContainer);

        $("<div/>", {
            class: "setting-title",
            text: actionsNames[action]
        }).appendTo(bindContainer);

        const keybinds = localStorageInstance.config.keybinds;
        const actionBinds = keybinds[action];

        actionBinds.forEach((bind, bindIndex) => {
            const bindButton = $("<button/>", {
                class: "btn btn-darken btn-lg btn-secondary btn-bind",
                text: bind === "" ? "None" : bind
            }).appendTo(bindContainer)[0];

            function setKeyBind(event: KeyboardEvent | MouseEvent | WheelEvent): void {
                event.stopImmediatePropagation();

                if (
                    event instanceof MouseEvent &&
                    event.type === "mousedown" &&
                    event.button === 0 &&
                    !bindButton.classList.contains("active")
                ) {
                    bindButton.classList.add("active");
                    return;
                }

                if (bindButton.classList.contains("active")) {
                    let key = getKeyFromInputEvent(event);
                    event.preventDefault();

                    // Remove conflicting binds
                    for (const a2 in defaultConfig.keybinds) {
                        const action2 = a2 as keyof KeybindActions;
                        const bindAction = keybinds[action2];

                        bindAction.forEach((bind2, bindIndex2) => {
                            if (bind2 === key) {
                                bindAction[bindIndex2] = "";
                            }
                        });
                    }

                    // Remove binding with Escape
                    if (key === "Escape") {
                        key = "";
                    }

                    actionBinds[bindIndex] = key;
                    localStorageInstance.update({ keybinds });

                    // Update the bindings screen
                    generateBindsConfigScreen();
                }
            }

            bindButton.addEventListener("keydown", setKeyBind);
            bindButton.addEventListener("mousedown", setKeyBind);
            bindButton.addEventListener("wheel", setKeyBind);

            bindButton.addEventListener("scroll", evt => {
                evt.preventDefault();
                evt.stopPropagation();
                evt.stopImmediatePropagation();
            });

            bindButton.addEventListener("blur", () => {
                bindButton.classList.remove("active");
            });
        });

        if (actions !== undefined) {
            bindings.clear();
            for (const action in defaultConfig.keybinds) {
                bind(keybinds[action as keyof KeybindActions], actions[action as keyof KeybindActions]);
            }
        }
    }

    // Add the reset button
    $("<div/>", { class: "modal-item" }).append($("<button/>", {
        class: "btn btn-darken btn-lg btn-danger",
        html: '<span style="position: relative; top: -2px"><i class="fa-solid fa-trash" style="font-size: 17px; margin-right: 3px; position: relative; top: -1px"></i> Reset to defaults</span>'
    }).on("click", () => {
        localStorageInstance.update({ keybinds: defaultConfig.keybinds });
        generateBindsConfigScreen();
    })).appendTo(keybindsContainer);

    // Change the weapons slots keybind text
    for (let i = 1; i <= 3; i++) {
        const slotKeybinds = localStorageInstance.config.keybinds[`slot${i}` as keyof KeybindActions];
        $(`#weapon-slot-${i}`).children(".slot-number").text(slotKeybinds.filter(bind => bind !== "").join(" / "));
    }
}

generateBindsConfigScreen();
