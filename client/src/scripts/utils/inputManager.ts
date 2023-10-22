import nipplejs, { type JoystickOutputData } from "nipplejs";
import { angleBetweenPoints, distanceSquared } from "../../../../common/src/utils/math";
import { v } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { defaultBinds } from "./console/defaultClientCVars";
import { gameConsole, keybinds } from "./console/gameConsole";
import { EmoteSlot, FIRST_EMOTE_ANGLE, FOURTH_EMOTE_ANGLE, SECOND_EMOTE_ANGLE, THIRD_EMOTE_ANGLE } from "./constants";
import { consoleVariables } from "./console/variables";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";

function fireAllEventsAtKey(input: string, down: boolean): number {
    const actions = keybinds.getActionsBoundToInput(input) ?? [];
    for (const action of actions) {
        let query = action;
        if (!down) {
            if (query.startsWith("+")) { // Invertible action
                query = query.replace("+", "-");
            } else query = ""; // If the action isn't invertible, then we do nothing
        }

        gameConsole.handleQuery(query);
    }

    return actions.length;
}

export function setupInputs(game: Game): void {
    let mWheelStopTimer: number | undefined;
    function handleInputEvent(down: boolean, event: KeyboardEvent | MouseEvent | WheelEvent): void {
        // Disable pointer events on mobile if mobile controls are enabled
        if (event instanceof PointerEvent && game.playerManager.isMobile) return;

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

        if (actionsFired > 0 && game.gameStarted) {
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
                const angle = angleBetweenPoints(player.emoteWheelPosition, mousePosition);
                let slotName: string | undefined;

                if (SECOND_EMOTE_ANGLE <= angle && angle <= FOURTH_EMOTE_ANGLE) {
                    player.selectedEmoteSlot = EmoteSlot.Top;
                    slotName = "top";
                } else if (!(angle >= FIRST_EMOTE_ANGLE && angle <= FOURTH_EMOTE_ANGLE)) {
                    player.selectedEmoteSlot = EmoteSlot.Right;
                    slotName = "right";
                } else if (FIRST_EMOTE_ANGLE <= angle && angle <= THIRD_EMOTE_ANGLE) {
                    player.selectedEmoteSlot = EmoteSlot.Bottom;
                    slotName = "bottom";
                } else if (THIRD_EMOTE_ANGLE <= angle && angle <= SECOND_EMOTE_ANGLE) {
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
        if (consoleVariables.get.builtIn("cv_animate_rotation").value === "client" && !game.gameOver && game.activePlayer) {
            game.activePlayer.container.rotation = player.rotation;
            game.map.indicator.rotation = player.rotation;
        }

        player.turning = true;
        player.dirty.inputs = true;
    });

    // Mobile joysticks
    if (game.playerManager.isMobile) {
        const size = consoleVariables.get.builtIn("mb_joystick_size").value;
        const transparency = consoleVariables.get.builtIn("mb_joystick_transparency").value;

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

        const playerManager = game.playerManager;

        leftJoyStick.on("move", (_, data: JoystickOutputData) => {
            if (!rightJoyStickUsed && !shootOnRelease) {
                playerManager.rotation = -Math.atan2(data.vector.y, data.vector.x);
                if (consoleVariables.get.builtIn("cv_animate_rotation").value === "client" && !game.gameOver && game.activePlayer) {
                    game.activePlayer.container.rotation = playerManager.rotation;
                }
            }

            playerManager.movementAngle = -Math.atan2(data.vector.y, data.vector.x);
            playerManager.movement.moving = true;
        });

        leftJoyStick.on("end", () => {
            playerManager.movement.moving = false;
        });

        rightJoyStick.on("move", (_, data: JoystickOutputData) => {
            rightJoyStickUsed = true;
            playerManager.rotation = -Math.atan2(data.vector.y, data.vector.x);
            const activePlayer = game.activePlayer;
            if (consoleVariables.get.builtIn("cv_animate_rotation").value === "client" && !game.gameOver && activePlayer) {
                game.activePlayer.container.rotation = playerManager.rotation;
            }
            playerManager.turning = true;

            if (!activePlayer) return;

            const def = activePlayer.activeItem;

            if (def.itemType === ItemType.Gun) {
                activePlayer.images.aimTrail.alpha = 1;
            }

            const attacking = data.distance > consoleVariables.get.builtIn("mb_joystick_size").value / 3;
            if (def.itemType === ItemType.Gun && def.shootOnRelease) {
                shootOnRelease = true;
            } else {
                playerManager.attacking = attacking;
            }
        });

        rightJoyStick.on("end", () => {
            rightJoyStickUsed = false;
            if (game.activePlayer) game.activePlayer.images.aimTrail.alpha = 0;
            playerManager.attacking = shootOnRelease;
            playerManager.resetAttacking = true;
            shootOnRelease = false;
        });
    }

    generateBindsConfigScreen();
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

    const copy = input.toLowerCase();
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
        ].some(query => copy.startsWith(query))
    ) {
        if (copy === "meta") { // "meta" means different things depending on the OS
            name = navigator.userAgent.match(/mac|darwin/ig) ? "command" : "windows";
        } else {
            name = copy.replace(/ /g, "");
        }
    }

    return name === undefined ? name : `./img/misc/${name}_icon.svg`;
}

const actionsNames: Record<keyof (typeof defaultBinds), string> = {
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

// Generate the input settings
export function generateBindsConfigScreen(): void {
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
            text: actionsNames[action]
        }).appendTo(bindContainer);

        const actions = keybinds.getInputsBoundToAction(action);

        while (actions.length < 2) {
            actions.push("None");
        }

        const buttons = actions.map(bind => {
            return $<HTMLButtonElement>("<button/>", {
                class: "btn btn-darken btn-lg btn-secondary btn-bind",
                text: bind !== "" ? bind : "None"
            }).appendTo(bindContainer)[0];
        });

        actions.forEach((bind, i) => {
            const bindButton = buttons[i];

            // eslint-disable-next-line no-inner-declarations
            function setKeyBind(event: KeyboardEvent | MouseEvent | WheelEvent): void {
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
                    let key = getKeyFromInputEvent(event);

                    if (bind) {
                        keybinds.remove(bind, action);
                    }

                    if (key === "Escape" || key === "Backspace") {
                        key = "";
                    }

                    keybinds.unbindInput(key);
                    keybinds.addActionsToInput(key, action);

                    gameConsole.writeToLocalStorage();
                    generateBindsConfigScreen();
                }
            }

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
        keybinds.unbindAll();

        for (const [action, keys] of Object.entries(defaultBinds)) {
            keybinds.addInputsToAction(action, ...keys);
        }

        generateBindsConfigScreen();
    })).appendTo(keybindsContainer);

    // Change the weapons slots keybind text
    for (let i = 0; i < 3; i++) {
        const slotKeybinds = keybinds.getInputsBoundToAction(`slot ${i}`).filter(a => a !== "").slice(0, 2);
        $(`#weapon-slot-${i + 1}`).children(".slot-number").text(slotKeybinds.join(" / "));
    }
}
