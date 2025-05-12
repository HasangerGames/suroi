import { GameConstants } from "@common/constants";
import { Armors, ArmorType, type ArmorDefinition } from "@common/definitions/items/armors";
import { Loots, type LootDefinition } from "@common/definitions/loots";
import { DebugPacket } from "@common/packets/debugPacket";
import { PacketType } from "@common/packets/packet";
import { Numeric } from "@common/utils/math";
import type { ObjectDefinition } from "@common/utils/objectDefinitions";
import $ from "jquery";
import { GameConsole } from "../console/gameConsole";
import type { BooleanCVars, CVarTypeMapping, NumberCVars } from "../console/variables";
import { Game } from "../game";
import { UIManager } from "../managers/uiManager";
import { FloatingWindow } from "./floatingWindow";

export class DebugMenu extends FloatingWindow<{ readonly content: JQuery<HTMLDivElement> }> {
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

    data = {
        layerOffset: 0,
        spawnLootType: undefined as undefined | LootDefinition,
        spawnDummy: false,
        dummyVest: undefined as ArmorDefinition | undefined,
        dummyHelmet: undefined as ArmorDefinition | undefined
    };

    init(): void {
        super.init();

        this._setupUi();

        const cvarsToSend: Array<keyof CVarTypeMapping> = [
            "db_override_zoom",
            "db_zoom_override",
            "db_speed_override",
            "db_no_clip",
            "db_invulnerable"
        ];

        for (const cvar of cvarsToSend) {
            GameConsole.variables.addChangeListener(cvar, () => {
                this.sendPacket();
            });
        }
    }

    sendPacket(): void {
        Game.sendPacket(DebugPacket.create({
            type: PacketType.Debug,
            speed: GameConsole.getBuiltInCVar("db_speed_override"),
            overrideZoom: GameConsole.getBuiltInCVar("db_override_zoom"),
            zoom: Numeric.clamp(GameConsole.getBuiltInCVar("db_zoom_override"), 0, 255),
            noClip: GameConsole.getBuiltInCVar("db_no_clip"),
            invulnerable: GameConsole.getBuiltInCVar("db_invulnerable"),
            spawnLootType: this.data.spawnLootType,
            layerOffset: this.data.layerOffset,
            spawnDummy: this.data.spawnDummy,
            dummyVest: this.data.dummyVest,
            dummyHelmet: this.data.dummyHelmet
        } satisfies DebugPacket));

        // reset so it doesn't send it again next packet
        this.data.spawnLootType = undefined;
        this.data.layerOffset = 0;
        this.data.spawnDummy = false;
    }

    private _setupUi(): void {
        this._createSlider({
            label: "Speed:",
            sliderCVar: "db_speed_override",
            defaultVal: GameConstants.player.baseSpeed,
            min: 0.001,
            max: 0.2,
            step: 0.001
        });

        this._createSlider({
            label: "Zoom:",
            sliderCVar: "db_zoom_override",
            get defaultVal() {
                return UIManager.inventory.scope.zoomLevel;
            },
            min: 1,
            max: 255,
            step: 1,
            toggleCvar: "db_override_zoom"
        });

        this._createLootInput();
        this._createSpawnDummyButtons();
        this._createHelpersRow();

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
        parent?: JQuery
    }): void {
        let enabled = params.toggleCvar ? GameConsole.getBuiltInCVar(params.toggleCvar) : false;
        let value = GameConsole.getBuiltInCVar(params.sliderCVar);
        const onChange = (): void => {
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
            toggle.prop("checked", enabled);
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
            value: value,
            class: "debug-menu-input regular-slider"
        });
        container.append(slider);

        const numberInput = $("<input/>", {
            type: "number",
            min: params.min,
            max: params.max,
            step: params.step,
            value: value,
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
    }

    private _createCheckbox(params: {
        label: string
        cvar: BooleanCVars
        parent?: JQuery
        dontAddContainer?: boolean
    }): void {
        let value = GameConsole.getBuiltInCVar(params.cvar);
        const onChange = (): void => {
            GameConsole.setBuiltInCVar(params.cvar, value);
        };

        const toggle = $("<input/>", {
            type: "checkbox",
            id: `debug-menu-${params.cvar}`,
            class: "debug-menu-input regular-checkbox",
            checked: value
        });

        toggle.on("input", () => {
            value = toggle.prop("checked") as boolean;
            onChange();
        });
        GameConsole.variables.addChangeListener(params.cvar, val => {
            value = val;
            toggle.prop("checked", val);
            onChange();
        });

        const label = $("<label/>", {
            text: params.label,
            for: `debug-menu-${params.cvar}`,
            class: "debug-menu-item-label"
        });

        if (params.dontAddContainer) {
            (params.parent ?? this.ui.content).append(toggle);
            (params.parent ?? this.ui.content).append(label);
        } else {
            const container = $("<div/>", {
                class: "debug-menu-item"
            });
            container.append(toggle);
            container.append(label);

            (params.parent ?? this.ui.content).append(container);
        }
    }

    private _createHelpersRow(): void {
        const container = $("<div/>", {
            class: "debug-menu-item"
        });

        this._createCheckbox({
            label: "No Clip",
            cvar: "db_no_clip",
            parent: container,
            dontAddContainer: true
        });

        this._createCheckbox({
            label: "God Mode",
            cvar: "db_invulnerable",
            parent: container,
            dontAddContainer: true
        });

        const upBtn = $("<button/>", {
            text: "▲ Layer Up",
            class: "debug-menu-input"
        });
        upBtn.on("click", () => {
            this.data.layerOffset = 1;
            this.sendPacket();
        });
        container.append(upBtn);

        const downBtn = $("<button/>", {
            text: "Layer Down ▼",
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
            list: "debug-menu-loot-list",
            placeholder: "Type a loot ID here..."
        });

        form.append(input);

        const dataList = $("<datalist/>", {
            id: "debug-menu-loot-list"
        });

        for (const loot of Loots) {
            const option = $("<option/>", {
                value: loot.idString
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
            cvar: "db_show_hitboxes"
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
                parent: container
            });
        }

        GameConsole.variables.addChangeListener("db_show_hitboxes", val => {
            container.toggle(val);
        });
        container.toggle(GameConsole.getBuiltInCVar("db_show_hitboxes"));

        this.ui.content.append(container);
    }

    private _createSpawnDummyButtons(): void {
        const container = $("<div/>", {
            class: "debug-menu-item"
        });
        const label = $("<label/>", {
            text: "Dummy:",
            class: "debug-menu-item-label"
        });
        container.append(label);

        const createGearSelect = (
            name: string,
            definitionList: ObjectDefinition[]
        ): JQuery => {
            const select = $("<select/>", {
                class: "debug-menu-input",
                css: {
                    width: "100%"
                }
            });

            select.append($("<option/>", { value: "", text: `No ${name}` }));

            for (const item of definitionList) {
                const option = $("<option/>", {
                    value: item.idString,
                    text: item.name
                });
                select.append(option);
            }
            container.append(select);
            return select;
        };

        const vestSelect = createGearSelect(
            "Vest",
            Armors.definitions.filter(a => a.armorType === ArmorType.Vest)
        );

        vestSelect.on("change", () => {
            this.data.dummyVest = Armors.fromStringSafe(vestSelect.val() as string);
        });

        const helmetSelect = createGearSelect(
            "Helmet",
            Armors.definitions.filter(a => a.armorType === ArmorType.Helmet)
        );
        helmetSelect.on("change", () => {
            this.data.dummyHelmet = Armors.fromStringSafe(helmetSelect.val() as string);
        });

        const spawnDummyBtn = $("<button/>", {
            text: "Spawn",
            class: "debug-menu-input"
        });
        spawnDummyBtn.on("click", () => {
            this.data.spawnDummy = true;
            this.sendPacket();
        });
        container.append(spawnDummyBtn);

        this.ui.content.append(container);
    }
}
