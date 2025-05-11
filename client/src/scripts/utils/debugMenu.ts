import { GameConstants } from "@common/constants";
import { Loots } from "@common/definitions/loots";
import { DebugPacket } from "@common/packets/debugPacket";
import { PacketType } from "@common/packets/packet";
import { Numeric } from "@common/utils/math";
import type { Mutable } from "@common/utils/misc";
import $ from "jquery";
import { GameConsole } from "../console/gameConsole";
import type { BooleanCVars, NumberCVars } from "../console/variables";
import { Game } from "../game";
import { UIManager } from "../managers/uiManager";
import { FloatingWindow } from "./floatingWindow";

export class DebugMenuClass extends FloatingWindow<{ readonly content: JQuery<HTMLDivElement> }> {
    constructor() {
        super(
            {
                open: "cv_debug_menu_open",
                left: "cv_debug_menu_left",
                top: "cv_debug_menu_top",
                width: "cv_debug_menu_width",
                height: "cv_debug_menu_height"
            },
            {
                globalContainer: $("#debug-menu"),
                container: $("#debug-menu-container"),
                header: $("#debug-menu-header"),
                closeButton: $("#debug-menu-close"),
                content: $("#debug-menu-content")
            }
        );
    }

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
        super.init();

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
        sliderCVar: NumberCVars
        defaultVal: number
        min: number
        max: number
        step: number
        toggleCvar?: BooleanCVars
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

        (params.parent ?? this.ui.content).append(container);

        params.onChange(params.defaultVal, enabled);
    }

    private _createCheckbox(params: {
        label: string
        cvar: BooleanCVars
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

        (params.parent ?? this.ui.content).append(container);

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

        this.ui.content.append(container);
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

        this.ui.content.append(container);
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
                cvar: cvar as BooleanCVars,
                label,
                defaultVal: GameConsole.getBuiltInCVar(cvar as BooleanCVars),
                parent: container
            });
        }

        GameConsole.variables.addChangeListener("db_show_hitboxes", val => {
            container.toggle(val);
        });
        container.toggle(GameConsole.getBuiltInCVar("db_show_hitboxes"));

        this.ui.content.append(container);
    }
}

export const DebugMenu = new DebugMenuClass();
