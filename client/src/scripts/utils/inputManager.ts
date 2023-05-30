import { mod } from "../../../../common/src/utils/math";
import { type PlayerManager } from "../utils/playerManager";
import { type GameScene } from "../scenes/gameScene";
import {
    localStorageInstance, type KeybindActions, defaultConfig
} from "./localStorageHandler";

class Action {
    readonly name: string;
    readonly on?: () => void;
    readonly off?: () => void;

    constructor(name: string, on?: () => void, off?: () => void) {
        this.name = name;
        this.on = on;
        this.off = off;
    }
}

type ConvertToAction<T extends Record<string, object | string>> = { [K in keyof T]: T[K] extends Record<string, object | string> ? ConvertToAction<T[K]> : Action };

function generateKeybindActions(playerManager: PlayerManager): ConvertToAction<KeybindActions> {
    function generateMovementAction(direction: keyof PlayerManager["movement"]): Action {
        return new Action(
            `move::${direction.toString()}`,
            () => {
                playerManager.movement[direction] = true;
                playerManager.dirty.inputs = true;
            },
            () => {
                playerManager.movement[direction] = false;
                playerManager.dirty.inputs = true;
            }
        );
    }

    function generateSlotAction(slot: number): Action {
        return new Action(
            `inventory::slot${slot}`,
            () => { playerManager.activeItemIndex = slot; }
        );
    }

    return {
        moveUp: generateMovementAction("up"),
        moveDown: generateMovementAction("down"),
        moveRight: generateMovementAction("right"),
        moveLeft: generateMovementAction("left"),

        slot1: generateSlotAction(0),
        slot2: generateSlotAction(1),
        slot3: generateSlotAction(2),

        lastEquippedItem: new Action(
            "inventory::lastEquippedItem",
            () => {
                playerManager.activeItemIndex = playerManager.lastItemIndex;
            }
        ),
        previousItem: new Action(
            "inventory::previousItem",
            () => {
                playerManager.activeItemIndex = mod(playerManager.activeItemIndex - 1, 3);
                //fixme                                                  ^ mystery constant (max inventory size)
            }
        ),
        nextItem: new Action(
            "inventory::nextItem",
            () => {
                playerManager.activeItemIndex = mod(playerManager.activeItemIndex + 1, 3);
                //fixme                                                  ^ mystery constant (max inventory size)
            }
        ),
        useItem: new Action(
            "useItem",
            () => { playerManager.attacking = true; },
            () => { playerManager.attacking = false; }
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

export function setupInputs(scene: GameScene): void {
    const playerManager = scene.playerManager;
    actions = generateKeybindActions(playerManager);
    const keybinds = localStorageInstance.config.keybinds;

    for (const action in keybinds) {
        bind(keybinds[action as keyof KeybindActions], actions[action as keyof KeybindActions]);
    }

    // Register listeners on the scene
    const keyboard = scene.input.keyboard;

    if (keyboard === null) {
        throw new Error("Cannot add keyboard inputs because no keyboard was found.");
    }

    if (scene.input.mouse?.disableContextMenu() === null) {
        throw new Error("Cannot add mouse inputs because no mouse was found.");
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
        fireAllEventsAtKey(key, event.type === "keydown" || event.type === "mousedown");
    }

    window.addEventListener("keydown", handleInputEvent);
    window.addEventListener("keyup", handleInputEvent);
    window.addEventListener("mousedown", handleInputEvent);
    window.addEventListener("mouseup", handleInputEvent);
    window.addEventListener("wheel", handleInputEvent);

    scene.input.on("pointermove", (pointer: Phaser.Input.Pointer): void => {
        if (scene.player === undefined) return;

        scene.playerManager.rotation = Math.atan2(pointer.worldY - scene.player.images.container.y, pointer.worldX - scene.player.images.container.x);
        scene.activeGame.playerManager.turning = true;
        scene.activeGame.playerManager.dirty.inputs = true;
    });
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
    slot1: "Slot 1",
    slot2: "Slot 2",
    slot3: "Slot 3",
    lastEquippedItem: "Equip Last item",
    previousItem: "Equip Previous Item",
    nextItem: "Equip Next Item",
    useItem: "Use Item"
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

                if (event instanceof MouseEvent &&
                    event.type === "mousedown" &&
                    event.button === 0 &&
                    !bindButton.classList.contains("active")) {
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
                            if (bindAction[bindIndex2] === key) {
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

            bindButton.addEventListener("scroll", (evt) => {
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
        text: "Reset to defaults"
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
