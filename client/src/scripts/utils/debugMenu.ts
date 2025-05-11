import { Numeric } from "@common/utils/math";
import $ from "jquery";
import { GameConsole } from "../console/gameConsole";
import { GameConstants } from "@common/constants";
import { Game } from "../game";
import { DebugPacket } from "@common/packets/debugPacket";
import { PacketType } from "@common/packets/packet";
import type { Mutable } from "@common/utils/misc";
import { UIManager } from "../managers/uiManager";
import { Loots } from "@common/definitions/loots";
import type { ConVar, CVarTypeMapping } from "../console/variables";

// goofy infinite loop prevention for resizes
let noWidthAdjust = false;
let noHeightAdjust = false;

type NumberCvars = {
    [K in keyof CVarTypeMapping]: ConVar<number> extends CVarTypeMapping[K]
        ? K
        : never;
}[keyof CVarTypeMapping];

type BooleanCvars = {
    [K in keyof CVarTypeMapping]: ConVar<boolean> extends CVarTypeMapping[K]
        ? K
        : never;
}[keyof CVarTypeMapping];

export class DebugMenuClass {
    private readonly _ui = {
        container: $("#debug-menu"),
        header: $("#debug-menu-header"),
        closeButton: $("#debug-menu-close"),
        content: $("#debug-menu-content")
    };

    private _isOpen = false;

    get isOpen(): boolean {
        return this._isOpen;
    }

    set isOpen(value: boolean) {
        if (this._isOpen === value) return;

        this._isOpen = value;

        GameConsole.variables.get.builtIn("cv_debug_menu_open").setValue(value);

        if (this._isOpen) {
            this._ui.container.show();
        } else {
            this._ui.container.hide();
        }
    }

    toggle(): void {
        this.isOpen = !this.isOpen;
    }

    // shameless stolen from console code :3
    private readonly _dimensions = (() => {
        let width = NaN;
        let height = NaN;
        const T = this;

        return {
            get width() { return width; },
            set width(w: number) {
                w = Numeric.clamp(
                    w,
                    0,
                    window.innerWidth - (Number.isNaN(T._position?.left ?? NaN) ? -Infinity : T._position.left)
                );

                GameConsole.variables.set.builtIn("cv_debug_menu_width", width = w);
                T._ui.container.width(width);
            },

            get height() { return height; },
            set height(h: number) {
                h = Numeric.clamp(
                    h,
                    0,
                    window.innerHeight - (Number.isNaN(T._position?.top ?? NaN) ? -Infinity : T._position.top)
                );

                GameConsole.variables.set.builtIn("cv_debug_menu_height", height = h);
                T._ui.container.height(height);
            }
        };
    })();

    private readonly _position = (() => {
        let left = NaN;
        let top = NaN;

        const magicalPadding /* that prevents scroll bars from showing up */ = 1;
        const T = this;
        const { container } = this._ui;

        return {
            get left() { return left; },
            set left(l: number) {
                l = Numeric.clamp(
                    l,
                    0,
                    window.innerWidth - T._dimensions.width - magicalPadding
                );

                if (left !== l) {
                    left = l;
                    GameConsole.variables.set.builtIn("cv_debug_menu_left", left);
                    container.css("left", left);
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
                    top = t;
                    GameConsole.variables.set.builtIn("cv_debug_menu_top", top);
                    container.css("top", top);
                }
            }
        };
    })();

    data: Mutable<DebugPacket> = {
        type: PacketType.Debug,
        speed: GameConstants.player.baseSpeed,
        get overrideZoom() {
            return GameConsole.getBuiltInCVar("db_override_zoom");
        },
        set overrideZoom(val: boolean) {
            GameConsole.setBuiltInCVar("db_override_zoom", val);
        },
        get zoom() {
            return GameConsole.getBuiltInCVar("db_zoom_override");
        },
        set zoom(val: number) {
            GameConsole.setBuiltInCVar("db_zoom_override", val);
        },
        spawnLootType: undefined,
        layerOffset: 0
    };

    init(): void {
        this.isOpen = GameConsole.getBuiltInCVar("cv_debug_menu_open");
        this._dimensions.width = GameConsole.getBuiltInCVar("cv_debug_menu_width");
        this._dimensions.height = GameConsole.getBuiltInCVar("cv_debug_menu_height");
        this._position.left = GameConsole.getBuiltInCVar("cv_debug_menu_left");
        this._position.top = GameConsole.getBuiltInCVar("cv_debug_menu_top");
        this._attachListeners();
        this._setupUi();

        this.data.zoom = GameConsole.getBuiltInCVar("db_zoom_override");

        GameConsole.variables.addChangeListener("db_override_zoom", () => {
            this.sendPacket();
        });
        GameConsole.variables.addChangeListener("db_zoom_override", () => {
            this.sendPacket();
        });
    }

    sendPacket(): void {
        Game.sendPacket(DebugPacket.create(this.data));

        // reset so it doesn't send it again next packet
        this.data.spawnLootType = undefined;
        this.data.layerOffset = 0;
    }

    private _setupUi(): void {
        this._createSlider({
            label: "Speed:",
            sliderCVar: "db_speed_override",
            defaultVal: GameConstants.player.baseSpeed,
            min: 0.001,
            max: 0.2,
            step: 0.001,
            onChange: value => {
                this.data.speed = value;
                this.sendPacket();
            }
        });

        this._createSlider({
            label: "Zoom:",
            sliderCVar: "db_zoom_override",
            get defaultVal() {
                return UIManager.inventory.scope.zoomLevel;
            },
            min: 1,
            max: 255,
            step: 2,
            toggleCvar: "db_override_zoom",
            onChange: (value, enabled) => {
                this.data.zoom = Numeric.clamp(value, 0, 255);
                this.data.overrideZoom = enabled;
                this.sendPacket();
            }
        });

        this._createLootInput();
        this._createLayerButtons();

        this._createDebugHitboxesUi();
    }

    private _createSlider(params: {
        label: string
        sliderCVar: NumberCvars
        defaultVal: number
        min: number
        max: number
        step: number
        toggleCvar?: BooleanCvars
        onChange: (value: number, enabled: boolean) => void
        parent?: JQuery
    }): void {
        let enabled = false;
        let value = params.defaultVal;
        const onChange = (): void => {
            params.onChange(value, enabled);
            GameConsole.setBuiltInCVar(params.sliderCVar, value);
            if (params.toggleCvar) {
                GameConsole.setBuiltInCVar(params.toggleCvar, enabled);
            }
        };

        const container = $("<div/>", {
            class: "debug-menu-item"
        });

        const label = $("<label/>", {
            text: params.label,
            class: "debug-menu-item-label"
        });
        container.append(label);

        if (params.toggleCvar) {
            const toggle = $("<input/>", {
                type: "checkbox",
                class: "debug-menu-input regular-checkbox"
            });
            toggle.on("input", () => {
                enabled = toggle.prop("checked") as boolean;
                onChange();
            });
            container.append(toggle);

            GameConsole.variables.addChangeListener(params.toggleCvar, value => {
                toggle.prop("checked", value);
                enabled = value;
                onChange();
            });
        }

        const slider = $("<input/>", {
            type: "range",
            min: params.min,
            max: params.max,
            step: params.step,
            value: params.defaultVal,
            class: "debug-menu-input regular-slider"
        });
        container.append(slider);

        const numberInput = $("<input/>", {
            type: "number",
            min: params.min,
            max: params.max,
            step: params.step,
            value: params.defaultVal,
            class: "debug-menu-input"
        });
        container.append(numberInput);

        slider.on("input", () => {
            value = slider.val() as number;
            numberInput.val(value);
            onChange();
        });
        numberInput.on("input", () => {
            value = numberInput.val() as number;
            slider.val(value);
            onChange();
        });

        GameConsole.variables.addChangeListener(params.sliderCVar, val => {
            slider.val(val);
            numberInput.val(val);
            value = val;
            onChange();
        });

        const reset = $("<button/>", {
            text: "Reset",
            class: "debug-menu-input"
        });
        reset.on("click", () => {
            slider.val(params.defaultVal);
            numberInput.val(params.defaultVal);
            value = params.defaultVal;
            onChange();
        });
        container.append(reset);

        (params.parent ?? this._ui.content).append(container);

        params.onChange(params.defaultVal, enabled);
    }

    private _createCheckbox(params: {
        label: string
        cvar: BooleanCvars
        defaultVal: boolean
        onChange?: (value: boolean) => void
        parent?: JQuery
    }): void {
        let value = params.defaultVal;
        const onChange = (): void => {
            GameConsole.setBuiltInCVar(params.cvar, value);
            params.onChange?.(value);
        };

        const container = $("<div/>", {
            class: "debug-menu-item"
        });

        const toggle = $("<input/>", {
            type: "checkbox",
            id: `debug-menu-${params.cvar}`,
            class: "debug-menu-input regular-checkbox",
            checked: params.defaultVal
        });

        toggle.on("input", () => {
            value = toggle.prop("checked") as boolean;
            onChange();
        });
        GameConsole.variables.addChangeListener(params.cvar, val => {
            value = val;
            onChange();
        });

        container.append(toggle);

        const label = $("<label/>", {
            text: params.label,
            for: `debug-menu-${params.cvar}`,
            class: "debug-menu-item-label"
        });
        container.append(label);

        (params.parent ?? this._ui.content).append(container);

        params.onChange?.(value);
    }

    private _createLayerButtons(): void {
        const container = $("<div/>", {
            class: "debug-menu-item",
            css: {
                "justify-content": "center"
            }
        });

        const upBtn = $("<button/>", {
            text: "▲Layer Up",
            class: "debug-menu-input"
        });
        upBtn.on("click", () => {
            this.data.layerOffset = 1;
            this.sendPacket();
        });
        container.append(upBtn);

        const downBtn = $("<button/>", {
            text: "Layer Down▼",
            class: "debug-menu-input"
        });
        downBtn.on("click", () => {
            this.data.layerOffset = -1;
            this.sendPacket();
        });

        container.append(downBtn);

        this._ui.content.append(container);
    }

    private _createLootInput(): void {
        const container = $("<div/>", {
            class: "debug-menu-item"
        });

        const label = $("<label/>", {
            text: "Loot:",
            class: "debug-menu-item-label"
        });
        container.append(label);

        const form = $("<form/>");
        container.append(form);

        const input = $("<input/>", {
            type: "text",
            list: "debug-menu-loot-list"
        });

        form.append(input);

        const dataList = $("<datalist/>", {
            id: "debug-menu-loot-list"
        });

        for (const loot of Loots) {
            const option = $("<option/>", {
                value: loot.idString,
                innerHTML: loot.name
            });
            dataList.append(option);
        }

        form.append(dataList);

        const spawnButton = $("<input/>", {
            type: "submit",
            value: "Spawn",
            class: "debug-menu-input"
        });
        form.append(spawnButton);

        input.on("input", () => {
            const isValid = Loots.hasString(input.val() as string);
            spawnButton.toggleClass("valid", isValid);
        });

        form.on("submit", e => {
            e.preventDefault();
            const idString = input.val() as string;
            if (Loots.hasString(idString)) {
                this.data.spawnLootType = Loots.fromString(idString);
                this.sendPacket();
            }
        });

        this._ui.content.append(container);
    }

    private _createDebugHitboxesUi(): void {
        this._createCheckbox({
            label: "Show Hitboxes",
            cvar: "db_show_hitboxes",
            defaultVal: GameConsole.getBuiltInCVar("db_show_hitboxes")
        });

        const container = $("<div/>", {
            class: "debug-menu-item",
            css: {
                "display": "grid",
                "grid-template-columns": "256px 256px"
            }
        });

        for (const cvar in GameConsole.variables.getAll()) {
            if (!cvar.startsWith("db_show_hitboxes_")) continue;

            const label = cvar.replace("db_show_hitboxes_", "")
                .split("_")
                .map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
                .join(" ");

            this._createCheckbox({
                cvar: cvar as BooleanCvars,
                label,
                defaultVal: GameConsole.getBuiltInCVar(cvar as BooleanCvars),
                parent: container
            });
        }

        GameConsole.variables.addChangeListener("db_show_hitboxes", val => {
            container.toggle(val);
        });
        container.toggle(GameConsole.getBuiltInCVar("db_show_hitboxes"));

        this._ui.content.append(container);
    }

    private _attachListeners(): void {
        this._ui.closeButton.on("click", e => {
            if (e.button !== 0) return;

            this.isOpen = false;
        });

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
                this._position.left = event.pageX + offset.x;
                this._position.top = event.pageY + offset.y;
            };

            this._ui.header.on("mousedown", e => {
                dragging = true;

                // This does _not_ equal e.offsetX
                offset.x = parseInt(this._ui.container.css("left")) - e.pageX;
                offset.y = parseInt(this._ui.container.css("top")) - e.pageY;

                window.addEventListener("mouseup", mouseUpHandler);
                window.addEventListener("mousemove", mouseMoveHandler);
            });
        }

        // Resize
        {
            new ResizeObserver(e => {
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

        GameConsole.variables.addChangeListener(
            "cv_debug_menu_left",
            val => this._position.left = val
        );

        GameConsole.variables.addChangeListener(
            "cv_debug_menu_top",
            val => this._position.top = val
        );

        const { container } = this._ui;
        GameConsole.variables.addChangeListener(
            "cv_debug_menu_width",
            val => {
                if (!noWidthAdjust) {
                    container.css("width", val);
                }
            }
        );

        GameConsole.variables.addChangeListener(
            "cv_debug_menu_height",
            val => {
                if (!noHeightAdjust) {
                    container.css("height", val);
                }
            }
        );

        GameConsole.variables.addChangeListener("cv_debug_menu_open", val => this.isOpen = val);

        this.isOpen = this._isOpen;
    }
}

export const DebugMenu = new DebugMenuClass();
