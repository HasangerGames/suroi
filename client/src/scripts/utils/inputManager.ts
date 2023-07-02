import nipplejs, { type JoystickOutputData } from "nipplejs";

import { mod } from "../../../../common/src/utils/math";
import { INVENTORY_MAX_WEAPONS, InputActions } from "../../../../common/src/constants";
import { type PlayerManager } from "./playerManager";
import {
    localStorageInstance, type KeybindActions, defaultConfig
} from "./localStorageHandler";
import { type Game } from "../game";
import { type MinimapScene } from "../scenes/minimapScene";
import core from "../core";

class Action {
    readonly name: string;
    readonly on?: () => void;
    readonly off?: () => void;
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
                let index = game.playerManager.activeItemIndex + 1;
                if (index > 1) index = 0;
                // fallback to melee if theres no weapon on the slot
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
            () => {
                let index = mod(game.playerManager.activeItemIndex - 1, INVENTORY_MAX_WEAPONS);
                if (!game.playerManager.weapons[index]) index = mod(index - 1, INVENTORY_MAX_WEAPONS);
                game.playerManager.equipItem(index);
            }
        ),
        nextItem: new Action(
            "inventory::nextItem",
            () => {
                let index = mod(game.playerManager.activeItemIndex + 1, INVENTORY_MAX_WEAPONS);
                if (!game.playerManager.weapons[index]) index = mod(index + 1, INVENTORY_MAX_WEAPONS);
                game.playerManager.equipItem(index);
            }
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
        useGauze: new Action(
            "inventory::useGauze",
            () => {
                game.playerManager.action = InputActions.UseGauze;
                game.playerManager.dirty.inputs = true;
            }
        ),
        useMedikit: new Action(
            "inventory::useGauze",
            () => {
                game.playerManager.action = InputActions.UseMedikit;
                game.playerManager.dirty.inputs = true;
            }
        ),
        useCola: new Action(
            "inventory::useGauze",
            () => {
                game.playerManager.action = InputActions.UseCola;
                game.playerManager.dirty.inputs = true;
            }
        ),
        useTablets: new Action(
            "inventory::useGauze",
            () => {
                game.playerManager.action = InputActions.UseTablets;
                game.playerManager.dirty.inputs = true;
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
                (core.phaser?.scene.getScene("minimap") as MinimapScene)?.toggle();
            }
        ),
        toggleMiniMap: new Action(
            "toggleMiniMap",
            () => {
                (core.phaser?.scene.getScene("minimap") as MinimapScene)?.toggleMiniMap();
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

    function fireAllEventsAtKey(key: string, down: boolean): void {
        bindings.get(key)?.forEach(action => {
            down
                ? action.on?.()
                : action.off?.();
        });
    }

    let mWheelStopTimer: number | undefined;
    function handleInputEvent(event: KeyboardEvent | MouseEvent | WheelEvent): void {
        if (event instanceof KeyboardEvent && event.repeat) return;

        // disable pointer events on mobile if mobile controls are enabled
        if (event instanceof PointerEvent && game.playerManager.isMobile) return;

        const key = getKeyFromInputEvent(event);

        if (event instanceof WheelEvent) {
            /*
                The browser doesn't emit mouse wheel "stop" events, so instead, we schedule the invocation
                of the stop callback to some time in the near future, cancelling the previous callback

                This has the effect of continuously cancelling the stop callback whenever a wheel event is
                detected, which is what we want
            */
            clearTimeout(mWheelStopTimer);
            mWheelStopTimer = window.setTimeout(() => {
                fireAllEventsAtKey(key, false);
            }, 50);

            fireAllEventsAtKey(key, true);
            return;
        }
        fireAllEventsAtKey(key, event.type === "keydown" || event.type === "pointerdown");
    }

    const gameUi = $("#game-ui")[0];

    // different event targets… why?
    window.addEventListener("keydown", handleInputEvent);
    window.addEventListener("keyup", handleInputEvent);
    gameUi.addEventListener("pointerdown", handleInputEvent);
    gameUi.addEventListener("pointerup", handleInputEvent);
    gameUi.addEventListener("wheel", handleInputEvent);

    gameUi.addEventListener("pointermove", (e: MouseEvent) => {
        if (game.playerManager === undefined || game.playerManager.isMobile) return;

        game.playerManager.rotation = Math.atan2(e.clientY - window.innerHeight / 2, e.clientX - window.innerWidth / 2);
        game.playerManager.turning = true;
        game.playerManager.dirty.inputs = true;
        // scene.activeGame.sendPacket(new InputPacket(scene.playerManager));
    });

    // Mobile joysticks
    if (game.playerManager.isMobile) {
        const leftJoyStick = nipplejs.create({
            zone: $("#left-joystick-container")[0],
            size: localStorageInstance.config.joystickSize,
            color: `rgba(255, 255, 255, ${localStorageInstance.config.joystickTransparency})`
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
            size: localStorageInstance.config.joystickSize,
            color: `rgba(255, 255, 255, ${localStorageInstance.config.joystickTransparency})`
        });

        rightJoyStick.on("move", (_, data: JoystickOutputData) => {
            game.playerManager.rotation = -Math.atan2(data.vector.y, data.vector.x);
            game.playerManager.turning = true;
            game.playerManager.attacking = data.distance > 50;
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

const actionsNames = {
    moveUp: "Move Up",
    moveDown: "Move Down",
    moveLeft: "Move Left",
    moveRight: "Move Right",
    interact: "Interact",
    slot1: "Slot 1",
    slot2: "Slot 2",
    slot3: "Slot 3",
    lastEquippedItem: "Equip Last Item",
    equipOtherGun: "Equip Other Gun",
    swapGunSlots: "Swap Gun Slots",
    previousItem: "Equip Previous Item",
    nextItem: "Equip Next Item",
    useItem: "Use Item",
    dropActiveItem: "Drop Active Item",
    reload: "Reload",
    useGauze: "Use Gauze",
    useMedikit: "Use Medikit",
    useCola: "Use Cola",
    useTablets: "Use Tablets",
    cancelAction: "Cancel Action",
    toggleMap: "Toggle Fullscreen Map",
    toggleMiniMap: "Toggle Mini Map"
};

// generate the input settings
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

                    // remove conflicting binds
                    for (const a2 in defaultConfig.keybinds) {
                        const action2 = a2 as keyof KeybindActions;
                        const bindAction = keybinds[action2];

                        bindAction.forEach((bind2, bindIndex2) => {
                            if (bind2 === key) {
                                bindAction[bindIndex2] = "";
                            }
                        });
                    }

                    // remove binding with Escape
                    if (key === "Escape") {
                        key = "";
                    }

                    actionBinds[bindIndex] = key;
                    localStorageInstance.update({ keybinds });

                    // update the bindings screen
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

    // add the reset button
    $("<div/>", { class: "modal-item" }).append($("<button/>", {
        class: "btn btn-darken btn-lg btn-danger",
        html: '<span style="position: relative; top: -2px"><i class="fa-solid fa-trash" style="font-size: 17px; margin-right: 3px; position: relative; top: -1px"></i> Reset to defaults</span>'
    }).on("click", () => {
        localStorageInstance.update({ keybinds: defaultConfig.keybinds });
        generateBindsConfigScreen();
    })).appendTo(keybindsContainer);

    // change the weapons slots keybind text
    for (let i = 1; i <= 3; i++) {
        const slotKeybinds = localStorageInstance.config.keybinds[`slot${i}` as keyof KeybindActions];
        $(`#weapon-slot-${i}`).children(".slot-number").text(slotKeybinds.filter(bind => bind !== "").join(" / "));
    }
}
generateBindsConfigScreen();
