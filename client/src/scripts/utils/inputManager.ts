import { mod } from "../../../../common/src/utils/math";
import { type Player } from "../objects/player";
import { type GameScene } from "../scenes/gameScene";
import { localStorageInstance, type KeybindActions } from "./localStorageHandler";

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

function generateKeybindActions(player: Player): ConvertToAction<KeybindActions> {
    function generateMovementAction(direction: keyof Player["movement"]): Action {
        return new Action(
            `move::${direction}`,
            () => {
                player.movement[direction] = true;
                player.dirty.inputs = true;
            },
            () => {
                player.movement[direction] = false;
                player.dirty.inputs = true;
            }
        );
    }

    function generateSlotAction(slot: number): Action {
        return new Action(
            `inventory::slot${slot}`,
            () => { player.activeItemIndex = slot; }
        );
    }

    return {
        move: {
            forwards: generateMovementAction("forwards"),
            backwards: generateMovementAction("backwards"),
            right: generateMovementAction("right"),
            left: generateMovementAction("left")
        },
        inventory: {
            slot1: generateSlotAction(0),
            slot2: generateSlotAction(1),
            slot3: generateSlotAction(2),

            lastEquippedItem: new Action(
                "inventory::lastEquippedItem",
                () => {
                    player.activeItemIndex = player.lastItemIndex;
                }
            ),
            previousItem: new Action(
                "inventory::previousItem",
                () => {
                    player.activeItemIndex = mod(player.activeItemIndex - 1, 3);
                    //fixme                                                  ^ mystery constant (max inventory size)
                }
            ),
            nextItem: new Action(
                "inventory::nextItem",
                () => {
                    player.activeItemIndex = mod(player.activeItemIndex + 1, 3);
                    //fixme                                                  ^ mystery constant (max inventory size)
                }
            )
        },
        useItem: new Action(
            "useItem",
            () => { player.attacking = true; },
            () => { player.attacking = false; }
        )
    };
}

const bindings: Map<string, Action[]> = new Map<string, Action[]>();

function bind(key: string, action: Action): void {
    (
        bindings.get(key) ??
        (() => {
            const array: Action[] = [];
            bindings.set(key, array);
            return array;
        })()
    ).push(action);
}

export function setupInputs(scene: GameScene): void {
    const player = scene.player;
    const actions = generateKeybindActions(player);
    const keybinds = localStorageInstance.config.keybinds;

    // If anyone wants to find a more automated/concise way of doing this, go for it
    bind(keybinds.move.forwards, actions.move.forwards);
    bind(keybinds.move.backwards, actions.move.backwards);
    bind(keybinds.move.left, actions.move.left);
    bind(keybinds.move.right, actions.move.right);

    bind(keybinds.useItem, actions.useItem);

    bind(keybinds.inventory.slot1, actions.inventory.slot1);
    bind(keybinds.inventory.slot2, actions.inventory.slot2);
    bind(keybinds.inventory.slot3, actions.inventory.slot3);
    bind(keybinds.inventory.previousItem, actions.inventory.previousItem);
    bind(keybinds.inventory.nextItem, actions.inventory.nextItem);
    bind(keybinds.inventory.lastEquippedItem, actions.inventory.lastEquippedItem);

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
        if (event instanceof KeyboardEvent) {
            fireAllEventsAtKey(event.key, event.type === "keydown");
            return;
        }

        if (event instanceof WheelEvent) {
            let target = "";

            switch (true) {
                case event.deltaX > 0: { target = "MWheelRight"; break; }
                case event.deltaX < 0: { target = "MWheelLeft"; break; }
                case event.deltaY > 0: { target = "MWheelDown"; break; }
                case event.deltaY < 0: { target = "MWheelUp"; break; }
                case event.deltaZ > 0: { target = "MWheelForwards"; break; }
                case event.deltaZ < 0: { target = "MWheelBackwards"; break; }
            }

            if (target === "") {
                console.error("An unrecognized scroll wheel event was received: ", event);
            } else {
                clearTimeout(mWheelStopTimer);
                fireAllEventsAtKey(target, true);

                /*
                    The browser doesn't emit mouse wheel "stop" events, so instead, we schedule the invocation
                    of the stop callback to some time in the near future, cancelling the previous callback

                    This has the effect of continuously cancelling the stop callback whenever a wheel event is
                    detected, which is what we want
                */
                mWheelStopTimer = window.setTimeout(() => {
                    fireAllEventsAtKey(target, false);
                }, 50);
            }

            return;
        }

        /* if (event instanceof MouseEvent) { */
        fireAllEventsAtKey(`Mouse${event.button}`, event.type === "mousedown");
        /* } */
    }

    window.addEventListener("keydown", handleInputEvent);
    window.addEventListener("keyup", handleInputEvent);
    window.addEventListener("mousedown", handleInputEvent);
    window.addEventListener("mouseup", handleInputEvent);
    window.addEventListener("wheel", handleInputEvent);

    for (const [key, actions] of bindings) {
        if (key.startsWith("mouse")) continue;

        keyboard.addKey(key).on("down", () => {
            actions.forEach(action => action.on?.());
        });

        keyboard.addKey(key).on("up", () => {
            actions.forEach(action => action.off?.());
        });
    }

    scene.input.on("pointermove", (pointer: Phaser.Input.Pointer): void => {
        if (scene.player === undefined) return;

        scene.player.rotation = Math.atan2(pointer.worldY - scene.player.images.container.y, pointer.worldX - scene.player.images.container.x);
        scene.player.dirty.inputs = true;
    });

    function generateMouseListener(parity: "up" | "down") {
        return (pointer: Phaser.Input.Pointer): void => {
            function assertButtonState(button: "left" | "right" | "middle" | "back" | "forward"): boolean {
                return pointer[`${button}Button${parity === "up" ? "Released" : "Down"}`]();
            }

            let target = "";

            switch (true) {
                case assertButtonState("left"): {
                    target = "mouse1";
                    break;
                }
                case assertButtonState("right"): {
                    target = "mouse2";
                    break;
                }
                case assertButtonState("middle"): {
                    target = "mouse3";
                    break;
                }
                case assertButtonState("back"): {
                    target = "mouse4";
                    break;
                }
                case assertButtonState("forward"): {
                    target = "mouse5";
                    break;
                }
            }

            if (target === "") {
                console.error("Didn't know how to handle mouse event: ", pointer);
            }

            bindings.get(target)?.forEach(action => action.on?.());
        };
    }

    scene.input.on("pointerdown", generateMouseListener("down"));
    scene.input.on("pointerup", generateMouseListener("up"));
}
