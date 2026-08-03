import { sound } from "@pixi/sound";
import $ from "jquery";
import { Color, isWebGLSupported, isWebGPUSupported } from "pixi.js";
import { GameConstants, InputActions, ObjectCategory, SpectateActions } from "$common/constants";
import { type BadgeDefinition, Badges } from "$common/definitions/badges";
import { EmoteCategory, type EmoteDefinition, Emotes, getBadgeIdString, isEmoteBadge } from "$common/definitions/emotes";
import { type AmmoDefinition, Ammos } from "$common/definitions/items/ammos";
import { type ArmorDefinition } from "$common/definitions/items/armors";
import type { BackpackDefinition } from "$common/definitions/items/backpacks";
import { type HealingItemDefinition, HealingItems, HealType } from "$common/definitions/items/healingItems";
import { PerkIds, Perks } from "$common/definitions/items/perks";
import { type ScopeDefinition, Scopes } from "$common/definitions/items/scopes";
import { type SkinDefinition, Skins } from "$common/definitions/items/skins";
import { SpectatePacket } from "$common/packets/spectatePacket";
import { ExtendedMap } from "$common/utils/misc";
import { DefinitionType, type ReferenceTo, type ReifiableDef } from "$common/utils/objectDefinitions";
import { gameUi } from "$lib/legacy/GameUi.svelte.ts";
import { MenuUi } from "../../routes/+page.svelte";
import { GameConsole } from "./console/gameConsole";
import { type CVarTypeMapping, defaultClientCVars } from "./console/variables";
import { Game } from "./game";
import { CustomTeamManager } from "./managers/customTeamManager.svelte";
import { EmoteWheelManager, MapPingWheelManager } from "./managers/emoteWheelManager";
import { InputManager } from "./managers/inputManager";
import { MapManager } from "./managers/mapManager";
import { SoundManager } from "./managers/soundManager";
import { UIManager } from "./managers/uiManager";
import { body } from "./uiHelpers";
import { Config } from "./utils/config";
import { EMOTE_SLOTS } from "./utils/constants";
import { Crosshairs, getCrosshair } from "./utils/crosshairs";
import { html } from "./utils/misc";
import { type TranslationKeys, translate } from "./utils/translations";

export let autoPickup = true;

// biome-ignore lint/suspicious/useAwait: there's a lot going on in this function
export async function setUpUI(): Promise<void> {
    const ui = UIManager.ui;

    if (Config.uiDebugMode) {
        ui.c4Button.show();

        ui.inventoryMsg.show();
        ui.inventoryMsg.text("Inventory message");

        // Interaction and action stuff
        ui.interactMsg.show();
        ui.interactText.text("Interact");
        ui.actionContainer.show();
        ui.actionName.text("Action");
        ui.actionTime.text("5.0");

        // Team container
        ui.teamContainer.show();
        ui.teamContainer.html("<div class=\"teammate-container\"><svg class=\"teammate-health-indicator\" width=\"48\" height=\"48\" xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"21\" cy=\"24\" cx=\"24\" stroke-width=\"6\" stroke-dasharray=\"132\" fill=\"none\" style=\"transition: stroke-dashoffset 50ms ease-in-out; stroke: rgb(189, 199, 208); stroke-dashoffset: 0px;\"></circle></svg><div class=\"teammate-indicator-container\" style=\"background-color: rgb(0, 255, 255);\"><img class=\"teammate-indicator\" src=\"./img/game/indicators/player_indicator.svg\"></div><span class=\"teammate-name\" style=\"color: rgb(0, 125, 128);\">pap_local_test23</span><img class=\"teammate-badge\" src=\"./img/game/badges/bdg_developr.svg\"></div><div class=\"teammate-container\"><svg class=\"teammate-health-indicator\" width=\"48\" height=\"48\" xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"21\" cy=\"24\" cx=\"24\" stroke-width=\"6\" stroke-dasharray=\"132\" fill=\"none\" style=\"transition: stroke-dashoffset 50ms ease-in-out; stroke: rgb(189, 199, 208); stroke-dashoffset: 0px;\"></circle></svg><div class=\"teammate-indicator-container\" style=\"background-color: rgb(255, 0, 255);\"><img class=\"teammate-indicator\" src=\"./img/game/indicators/player_indicator.svg\"></div><span class=\"teammate-name\" style=\"color: rgb(0, 125, 128);\">pap_local_test23</span><img class=\"teammate-badge\" src=\"./img/game/badges/bdg_developr.svg\"></div><div class=\"teammate-container\"><svg class=\"teammate-health-indicator\" width=\"48\" height=\"48\" xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"21\" cy=\"24\" cx=\"24\" stroke-width=\"6\" stroke-dasharray=\"132\" fill=\"none\" style=\"transition: stroke-dashoffset 50ms ease-in-out; stroke: rgb(189, 199, 208); stroke-dashoffset: 0px;\"></circle></svg><div class=\"teammate-indicator-container\" style=\"background-color: rgb(255, 255, 0);\"><img class=\"teammate-indicator\" src=\"./img/game/indicators/player_indicator.svg\"></div><span class=\"teammate-name\" style=\"color: rgb(0, 125, 128);\">pap_local_test23</span><img class=\"teammate-badge\" src=\"./img/game/badges/bdg_developr.svg\"></div><div class=\"teammate-container\"><svg class=\"teammate-health-indicator\" width=\"48\" height=\"48\" xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"21\" cy=\"24\" cx=\"24\" stroke-width=\"6\" stroke-dasharray=\"132\" fill=\"none\" style=\"transition: stroke-dashoffset 50ms ease-in-out; stroke: rgb(189, 199, 208); stroke-dashoffset: 0px;\"></circle></svg><div class=\"teammate-indicator-container\" style=\"background-color: rgb(255, 128, 0);\"><img class=\"teammate-indicator\" src=\"./img/game/indicators/player_indicator.svg\"></div><span class=\"teammate-name\" style=\"color: rgb(0, 125, 128);\">pap_local_test23</span><img class=\"teammate-badge\" src=\"./img/game/badges/bdg_developr.svg\" style=\"\"></div>");

        // Kill message
        ui.killMsgHeader.text("Kills: 7");
        ui.killMsgContainer.text("Player  with Mosin-Nagant (streak: 255)");
        ui.killMsgModal.show();

        // Spectating message
        ui.spectatingMsgPlayer.html("Player");
        ui.spectatingContainer.show();

        // Gas message
        ui.gasMsgInfo
            .text("Toxic gas is advancing! Move to the safe zone")
            .css("color", "cyan");
        ui.gasMsg.show();

        ui.ammoCounterContainer.show();

        // Perk message
        // ui.perkMsg.html(`
        //     <div id="perk" style="background-image: url(./img/game/loot/loot_background_perk.svg);">
        //         <img class="perk-img" src="./img/game/perks/loot_baron.svg" draggable="false" width="50" height="50"/>
        //     </div>
        //     <strong class="perk-name">Loot Baron</strong>
        // `);

        // Kill feed messages
        const killFeed = ui.killFeed;
        for (let i = 0; i < 5; i++) {
            killFeed.prepend(
                $<HTMLDivElement>("<div>")
                    .addClass("kill-feed-item")
                    .html(
                        '<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> Player killed Player with Mosin-Nagant'
                    )
            );
        }

        CustomTeamManager.teamId = "abcd";
        CustomTeamManager.players = [{
            id: 0,
            name: "hasanger",
            nameColor: "red",
            badge: "bdg_ownr",
            skin: "hasanger",
            ready: true,
            isLeader: true
        }];
    }

    const params = new URLSearchParams(window.location.search);

    const qq = $<HTMLButtonElement>(".btn-qq")
    // Hide the QQ social media button
    addCheckboxListener(
        "#toggle-hide-qq",
        "cv_hide_qq_social",
        value => {
            qq.toggle(!value);
        }
    );
    const isChinese = GameConsole.getBuiltInCVar("cv_language") === "zh" || navigator.languages.includes("zh-CN");
    qq.toggle(isChinese && !GameConsole.getBuiltInCVar("cv_hide_qq_social"));

    // Hide option to hide qq if the language is not Chinese
    $(".checkbox-setting").has("#toggle-hide-qq").toggle(isChinese);

    // $<HTMLInputElement>("#create-team-toggle-auto-fill").on("click", function() {
    //     autoFill = this.checked;
    //     teamSocket?.send(JSON.stringify({
    //         type: CustomTeamMessages.Settings,
    //         autoFill
    //     }));
    // });

    // $<HTMLInputElement>("#create-team-toggle-lock").on("click", function() {
    //     teamSocket?.send(JSON.stringify({
    //         type: CustomTeamMessages.Settings,
    //         locked: this.checked
    //     }));
    // });

    // $<HTMLInputElement>("#create-team-toggle-force-start").on("click", function() {
    //     teamSocket?.send(JSON.stringify({
    //         type: CustomTeamMessages.Settings,
    //         forceStart: this.checked
    //     }));
    // });

    // ui.btnStartGame.on("click", () => {
    //     teamSocket?.send(JSON.stringify({ type: CustomTeamMessages.Start }));
    // });

    const nameColor = params.get("nameColor");
    if (nameColor) {
        GameConsole.setBuiltInCVar("dv_name_color", nameColor);
    }

    const lobbyClearing = params.get("lobbyClearing");
    if (lobbyClearing) {
        GameConsole.setBuiltInCVar("dv_lobby_clearing", lobbyClearing === "true");
    }

    const devPassword = params.get("password");
    if (devPassword) {
        GameConsole.setBuiltInCVar("dv_password", devPassword);
        location.search = "";
    }

    const roleParam = params.get("role");
    if (roleParam) {
        GameConsole.setBuiltInCVar("dv_role", roleParam);
        location.search = "";
    }

    MenuUi.nickname = GameConsole.getBuiltInCVar("cv_player_name");

    const sendSpectatePacket = (action: Exclude<SpectateActions, SpectateActions.SpectateSpecific>): void => {
        Game.sendPacket(
            SpectatePacket.create({
                spectateAction: action
            })
        );
    };

    ui.btnSpectate.on("click", () => {
        sendSpectatePacket(SpectateActions.BeginSpectating);
        Game.spectating = true;
        MapManager.indicator.setFrame("player_indicator");
    });

    ui.spectatePrevious.on("click", () => {
        sendSpectatePacket(SpectateActions.SpectatePrevious);
    });

    ui.spectateKillLeader.on("click", () => {
        sendSpectatePacket(SpectateActions.SpectateKillLeader);
    });

    ui.btnReport.on("click", () => {
        sendSpectatePacket(SpectateActions.Report);
    });
    ui.spectateNext.on("click", () => {
        sendSpectatePacket(SpectateActions.SpectateNext);
    });

    function toggleGameMenu() {
        if (gameUi.activeModal === "gameMenu") {
            gameUi.activeModal = undefined;
        } else {
            gameUi.activeModal = "gameMenu";
        }
    }

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape") {
            if (ui.canvas.hasClass("active") && !GameConsole.isOpen) {
                toggleGameMenu();
            }
            GameConsole.isOpen = false;
        }
    });

    const role = GameConsole.getBuiltInCVar("dv_role");

    // Load skins
    if (!Skins.definitions.some(s => s.idString === GameConsole.getBuiltInCVar("cv_loadout_skin"))) {
        GameConsole.setBuiltInCVar("cv_loadout_skin", defaultClientCVars.cv_loadout_skin as string);
    }

    const currentSkin = GameConsole.getBuiltInCVar("cv_loadout_skin");
    MenuUi.skinIdString = currentSkin;

    const skinList = $<HTMLDivElement>("#skins-list");

    const skinUiCache: Record<ReferenceTo<SkinDefinition>, JQuery<HTMLDivElement>> = {};

    function selectSkin(idString: ReferenceTo<SkinDefinition>): void {
        skinUiCache[idString].addClass("selected")
            .siblings()
            .removeClass("selected");

        MenuUi.skinIdString = idString;
    }

    function renderSkin(skin: ReifiableDef<SkinDefinition>): string {
        const skinDef = Skins.reify(skin);
        const baseImage = `url('./img/game/skins/${skinDef.baseImage ?? `${skinDef.idString}_base`}.svg')`;
        const fistImage = `url('./img/game/skins/${skinDef.fistImage ?? `${skinDef.idString}_fist`}.svg')`;

        const getTint = (mask: string, tint?: number): string =>
            tint !== undefined
                ? `;mask-image:${mask};background-color:${new Color(tint).toHex()};background-blend-mode:multiply`
                : "";

        const baseColor = getTint(baseImage, skinDef.baseTint);
        const fistColor = getTint(fistImage, skinDef.fistTint);

        return `
        <div class="skin">
            <div class="skin-base" style="background-image:${baseImage};${baseColor}"></div>
            <div class="skin-left-fist" style="background-image:${fistImage};${fistColor}"></div>
            <div class="skin-right-fist" style="background-image:${fistImage};${fistColor}"></div>
        </div>
        `;
    }

    for (const skin of Skins) {
        const { idString, hideFromLoadout, rolesRequired } = skin;
        if (hideFromLoadout || !(rolesRequired ?? [role]).includes(role)) continue;

        const skinItem = skinUiCache[idString] = $<HTMLDivElement>(
            `<div id="skin-${idString}" class="skins-list-item-container${idString === currentSkin ? " selected" : ""}">
                ${renderSkin(skin)}
                <span class="skin-name">${translate(idString as TranslationKeys)}</span>
            </div>`
        );

        skinItem.on("click", () => {
            GameConsole.setBuiltInCVar("cv_loadout_skin", idString);
            selectSkin(idString);
        });

        skinList.append(skinItem);
    }

    GameConsole.variables.addChangeListener("cv_loadout_skin", val => selectSkin(val));

    // Load emotes
    function handleEmote(slot: "win" | "death"): void { // eipi can you improve this so that it uses `emoteSlots` items with index >3
        const emote = $(`#emote-wheel-bottom .emote-${slot} .fa-xmark`);
        const cvar = `cv_loadout_${slot}_emote` as const;
        const emoteSlot = $(`#emote-wheel-container .emote-${slot}`);

        emote.on("click", () => {
            GameConsole.setBuiltInCVar(cvar, "");
            emoteSlot.css("background-image", "none");
            emote.hide();
        });

        if (GameConsole.getBuiltInCVar(`cv_loadout_${slot}_emote`) === "") emote.hide();
    }

    handleEmote("win");
    handleEmote("death");

    let selectedEmoteSlot: typeof EMOTE_SLOTS[number] | undefined;
    const emoteList = $<HTMLDivElement>("#emotes-list");

    const emoteWheelUiCache: Partial<Record<typeof EMOTE_SLOTS[number], JQuery<HTMLDivElement>>> = {};

    function updateEmotesList(): void {
        emoteList.empty();

        const emotes = Array.from(Emotes)
            .filter(({ hideInLoadout }) => !hideInLoadout)
            .sort((a, b) => a.category - b.category);

        let lastCategory: EmoteCategory | undefined;

        for (const emote of emotes) {
            if (emote.category !== lastCategory) {
                emoteList.append($<HTMLDivElement>(
                    `<div class="emote-list-header">${translate(`emotes_category_${EmoteCategory[emote.category]}` as TranslationKeys)}</div>`
                ));
                lastCategory = emote.category;
            }

            const idString = emote.idString;
            const emoteItem = $<HTMLDivElement>(
                `<div id="emote-${idString}" class="emotes-list-item-container">
                    <div class="emotes-list-item" style="background-image: url(./img/game/emotes/${idString}.svg)"></div>
                    <span class="emote-name">${translate(`emote_${idString}` as TranslationKeys)}</span>
                </div>`
            );

            emoteItem.on("click", () => {
                if (selectedEmoteSlot === undefined) return;

                const cvarName = selectedEmoteSlot;
                (
                    emoteWheelUiCache[cvarName] ??= $((`#emote-wheel-bottom .emote-${cvarName} .fa-xmark` as const))
                ).show();

                GameConsole.setBuiltInCVar(`cv_loadout_${cvarName}_emote`, emote.idString);

                emoteItem.addClass("selected")
                    .siblings()
                    .removeClass("selected");

                (
                    emoteWheelUiCache[cvarName] ??= $(`#emote-wheel-container .emote-${cvarName}`)
                ).css(
                    "background-image",
                    `url("./img/game/emotes/${emote.idString}.svg")`
                );
            });

            emoteList.append(emoteItem);
        }
    }

    updateEmotesList();

    const emoteListItemContainer = $<HTMLDivElement>(".emotes-list-item-container");

    function changeEmoteSlotImage(slot: typeof EMOTE_SLOTS[number], emote: ReferenceTo<EmoteDefinition>): JQuery<HTMLDivElement> {
        return (
            emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
        ).css("background-image", emote ? `url("./img/game/emotes/${emote}.svg")` : "none");
    }

    for (const slot of EMOTE_SLOTS) {
        const cvar = `cv_loadout_${slot}_emote` as const;
        const emote = GameConsole.getBuiltInCVar(cvar);

        GameConsole.variables.addChangeListener(
            cvar,
            val => changeEmoteSlotImage(slot, val)
        );

        changeEmoteSlotImage(slot, emote)
            .on("click", () => {
                if (selectedEmoteSlot === slot) return;

                if (selectedEmoteSlot !== undefined) {
                    (
                        emoteWheelUiCache[selectedEmoteSlot] ??= $(`#emote-wheel-container .emote-${selectedEmoteSlot}`)
                    ).removeClass("selected");
                }

                selectedEmoteSlot = slot;

                updateEmotesList();

                (
                    emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
                ).addClass("selected");

                emoteListItemContainer
                    .removeClass("selected")
                    .css("cursor", "pointer");

                $(`#emote-${GameConsole.getBuiltInCVar(cvar) || "none"}`).addClass("selected");
            });

        (
            emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
        ).children("svg")
            .on("click", () => {
                GameConsole.setBuiltInCVar(cvar, "");
                (
                    emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
                ).css("background-image", "none");
            });
    }

    const crosshairImage = $<HTMLDivElement>("#crosshair-image");
    const crosshairControls = $<HTMLDivElement>("#crosshair-controls");
    const crosshairTargets = $<HTMLDivElement>("#crosshair-preview, #game");

    // Load crosshairs
    function loadCrosshair(): void {
        const size = 20 * GameConsole.getBuiltInCVar("cv_crosshair_size");
        const crosshair = getCrosshair(
            GameConsole.getBuiltInCVar("cv_loadout_crosshair"),
            GameConsole.getBuiltInCVar("cv_crosshair_color"),
            size,
            GameConsole.getBuiltInCVar("cv_crosshair_stroke_color"),
            GameConsole.getBuiltInCVar("cv_crosshair_stroke_size")
        );
        const cursor = crosshair === "crosshair" ? crosshair : `url("${crosshair}") ${size / 2} ${size / 2}, crosshair`;

        crosshairImage.css({
            backgroundImage: `url("${crosshair}")`,
            width: size,
            height: size
        });

        crosshairControls.toggleClass("disabled", !Crosshairs[GameConsole.getBuiltInCVar("cv_loadout_crosshair")]);
        crosshairTargets.css({ cursor });
    }

    loadCrosshair();

    const crosshairCache: JQuery<HTMLDivElement>[] = [];

    GameConsole.variables.addChangeListener(
        "cv_loadout_crosshair",
        value => {
            (crosshairCache[value] ??= $(`#crosshair-${value}`))
                .addClass("selected")
                .siblings()
                .removeClass("selected");

            loadCrosshair();
        }
    );

    const crosshairSize = GameConsole.getBuiltInCVar("cv_crosshair_size");
    const currentCrosshair = GameConsole.getBuiltInCVar("cv_loadout_crosshair");

    $<HTMLDivElement>("#crosshairs-list").append(
        Crosshairs.map((_, crosshairIndex) => {
            const listItem = $<HTMLDivElement>("<div class=\"crosshairs-list-item\"></div>");
            const crosshairItem = $<HTMLDivElement>(
                `<div id="crosshair-${crosshairIndex}" class="crosshairs-list-item-container${currentCrosshair === crosshairIndex ? " selected" : ""}"></div>`
            );

            crosshairItem.append(listItem);

            listItem.css({
                "backgroundImage": `url("${getCrosshair(
                    crosshairIndex,
                    "#fff",
                    crosshairSize,
                    "#0",
                    0
                )}")`,
                "background-size": "contain",
                "background-repeat": "no-repeat"
            });

            crosshairItem.on("click", () => {
                GameConsole.setBuiltInCVar("cv_loadout_crosshair", crosshairIndex);
                loadCrosshair();
                crosshairItem.addClass("selected")
                    .siblings()
                    .removeClass("selected");
            });

            return crosshairItem;
        })
    );

    // Load special tab
    if (GameConsole.getBuiltInCVar("dv_role") !== "") {
        $("#tab-special").show();

        $<HTMLInputElement>("#role-name")
            .val(GameConsole.getBuiltInCVar("dv_role"))
            .on("input", e => {
                GameConsole.setBuiltInCVar("dv_role", e.target.value);
            });

        $<HTMLInputElement>("#role-password").on("input", e => {
            GameConsole.setBuiltInCVar("dv_password", e.target.value);
        });

        addCheckboxListener("#toggle-lobbyclearing", "dv_lobby_clearing");

        if (GameConsole.getBuiltInCVar("dv_name_color") === "") GameConsole.setBuiltInCVar("dv_name_color", "#FFFFFF");

        $<HTMLInputElement>("#namecolor-color-picker")
            .val(GameConsole.getBuiltInCVar("dv_name_color"))
            .on("input", e => {
                GameConsole.setBuiltInCVar("dv_name_color", e.target.value);
            });

        $<HTMLInputElement>("#weapon-preset")
            .val(GameConsole.getBuiltInCVar("dv_weapon_preset"))
            .on("input", e => {
                GameConsole.setBuiltInCVar("dv_weapon_preset", e.target.value);
            });
    }

    // Load badges
    const noBadgeItem = $<HTMLDivElement>(
        html`<div id="badge-" class="badges-list-item-container">\
            <div class="badges-list-item"> </div>\
            <span class="badge-name">${translate("none")}</span>\
        </div>`
    );

    noBadgeItem.on("click", () => {
        GameConsole.setBuiltInCVar("cv_loadout_badge", "");
        noBadgeItem.addClass("selected").siblings().removeClass("selected");
    });

    const activeBadge = GameConsole.getBuiltInCVar("cv_loadout_badge");

    const badgeUiCache: Record<ReferenceTo<BadgeDefinition>, JQuery<HTMLDivElement>> = { "": noBadgeItem };

    function selectBadge(idString: ReferenceTo<BadgeDefinition>): void {
        badgeUiCache[idString].addClass("selected")
            .siblings()
            .removeClass("selected");
    }

    const allowedBadges = Badges.definitions.filter(({ roles }) => !roles?.length || roles.includes(role));
    $("#badges-list").append(
        noBadgeItem,
        ...allowedBadges.map(({ idString }) => {
            const badgeItem = badgeUiCache[idString] = $<HTMLDivElement>(
                `<div id="badge-${idString}" class="badges-list-item-container${idString === activeBadge ? " selected" : ""}">\
                    <div class="badges-list-item">\
                        <div style="background-image: url('./img/game/${isEmoteBadge(idString) ? "emotes" : "badges"}/${getBadgeIdString(idString)}.svg')"></div>\
                    </div>\
                    <span class="badge-name">${translate(idString as TranslationKeys)}</span>\
                </div>`
            );

            badgeItem.on("click", () => {
                GameConsole.setBuiltInCVar("cv_loadout_badge", idString);
                selectBadge(idString);
            });

            return badgeItem;
        })
    );

    GameConsole.variables.addChangeListener(
        "cv_loadout_badge",
        selectBadge
    );

    function addSliderListener(
        elementId: string,
        settingName: keyof CVarTypeMapping,
        callback?: (value: number) => void
    ): void {
        const element = $<HTMLInputElement>(elementId)[0] as HTMLInputElement | undefined;
        if (!element) {
            console.error("Invalid element id");
            return;
        }

        let ignore = false;

        element.addEventListener("input", () => {
            if (ignore) return;

            const value = +element.value;
            ignore = true;
            GameConsole.setBuiltInCVar(settingName, value);
            ignore = false;
            callback?.(value);
        });

        GameConsole.variables.addChangeListener(settingName, newValue => {
            if (ignore) return;

            const casted = +newValue;

            callback?.(casted);

            ignore = true;
            element.value = `${casted}`;
            element.dispatchEvent(new InputEvent("input"));
            ignore = false;
        });

        const value = GameConsole.getBuiltInCVar(settingName) as number;
        callback?.(value);
        element.value = value.toString();
    }

    function addCheckboxListener(
        elementId: string,
        settingName: keyof CVarTypeMapping,
        callback?: (value: boolean) => void
    ): void {
        const element = $<HTMLInputElement>(elementId)[0] as HTMLInputElement | undefined;
        if (!element) {
            console.error("Invalid element id");
            return;
        }

        element.addEventListener("input", () => {
            const value = element.checked;
            GameConsole.setBuiltInCVar(settingName, value);
            callback?.(value);
        });

        GameConsole.variables.addChangeListener(settingName, newValue => {
            const casted = !!newValue;

            callback?.(casted);
            element.checked = casted;
        });

        element.checked = GameConsole.getBuiltInCVar(settingName) as boolean;
    }

    addSliderListener(
        "#slider-crosshair-size",
        "cv_crosshair_size",
        loadCrosshair
    );
    addSliderListener(
        "#slider-crosshair-stroke-size",
        "cv_crosshair_stroke_size",
        loadCrosshair
    );

    const toggleClass = (elem: JQuery, className: string, bool: boolean): void => {
        if (bool) {
            elem.addClass(className);
        } else elem.removeClass(className);
    };

    const crosshairColor = $<HTMLInputElement>("#crosshair-color-picker");

    crosshairColor.on("input", function() {
        GameConsole.setBuiltInCVar("cv_crosshair_color", this.value);
        loadCrosshair();
    });

    GameConsole.variables.addChangeListener(
        "cv_crosshair_color",
        value => {
            crosshairColor.val(value);
        }
    );

    const crosshairStrokeColor = $<HTMLInputElement>("#crosshair-stroke-picker");

    crosshairStrokeColor.on("input", function() {
        GameConsole.setBuiltInCVar("cv_crosshair_stroke_color", this.value);
        loadCrosshair();
    });

    GameConsole.variables.addChangeListener(
        "cv_crosshair_stroke_color",
        value => {
            crosshairStrokeColor.val(value);
        }
    );

    // Disable context menu
    ui.game.on("contextmenu", e => { e.preventDefault(); });

    // Scope looping toggle
    addCheckboxListener(
        "#toggle-scope-looping",
        "cv_loop_scope_selection"
    );

    // Toggle auto pickup
    addCheckboxListener(
        "#toggle-autopickup",
        "cv_autopickup"
    );
    $("#toggle-autopickup").parent().parent().toggle(InputManager.isMobile);

    // Autopickup a dual gun
    addCheckboxListener(
        "#toggle-autopickup-dual-guns",
        "cv_autopickup_dual_guns"
    );
    $("#toggle-autopickup-dual-guns").parent().parent().toggle(InputManager.isMobile);

    // Anonymous player names toggle
    addCheckboxListener(
        "#toggle-anonymous-player",
        "cv_anonymize_player_names"
    );

    addCheckboxListener("#toggle-hide-emote", "cv_hide_emotes");

    // Music volume
    addSliderListener(
        "#slider-music-volume",
        "cv_music_volume",
        value => {
            if (!SoundManager.music) return;
            SoundManager.music.volume = value;
        }
    );

    // SFX volume
    addSliderListener(
        "#slider-sfx-volume",
        "cv_sfx_volume",
        value => {
            SoundManager.sfxVolume = value;
        }
    );

    // Ambience volume
    addSliderListener(
        "#slider-ambience-volume",
        "cv_ambience_volume",
        value => {
            SoundManager.ambienceVolume = value;
        }
    );

    // Master volume
    addSliderListener(
        "#slider-master-volume",
        "cv_master_volume",
        value => {
            sound.volumeAll = value;
        }
    );

    // Old menu music
    addCheckboxListener("#toggle-old-music", "cv_use_old_menu_music");

    // Camera shake
    addCheckboxListener("#toggle-camera-shake", "cv_camera_shake_fx");

    // Coordinate toggles
    const debugReadout = ui.debugPos;

    // toggleClass is sadly deprecated.
    toggleClass(debugReadout, "hidden-prop", !GameConsole.getBuiltInCVar("pf_show_pos"));

    addCheckboxListener(
        "#toggle-pos",
        "pf_show_pos",
        value => toggleClass(debugReadout, "hidden-prop", !value)
    );

    addCheckboxListener(
        "#toggle-ping",
        "pf_show_ping"
    );

    addCheckboxListener(
        "#toggle-fps",
        "pf_show_fps"
    );

    addCheckboxListener(
        "#toggle-inout",
        "pf_show_inout"
    );

    // lmao one day, we'll have dropdown menus

    // Text killfeed toggle
    {
        const element = $<HTMLInputElement>("#toggle-text-kill-feed")[0];

        element.addEventListener("input", () => {
            GameConsole.setBuiltInCVar("cv_killfeed_style", element.checked ? "text" : "icon");
        });

        GameConsole.variables.addChangeListener("cv_killfeed_style", value => {
            element.checked = value === "text";
            UIManager.updateWeaponSlots();
        });

        element.checked = GameConsole.getBuiltInCVar("cv_killfeed_style") === "text";
    }

    // Weapon slot style toggle
    {
        const element = $<HTMLInputElement>("#toggle-colored-slots")[0];

        element.addEventListener("input", () => {
            GameConsole.setBuiltInCVar("cv_weapon_slot_style", element.checked ? "colored" : "simple");
            UIManager.updateWeaponSlots();
        });

        GameConsole.variables.addChangeListener("cv_weapon_slot_style", value => {
            element.checked = value === "colored";
            UIManager.updateWeaponSlots();
        });

        element.checked = GameConsole.getBuiltInCVar("cv_weapon_slot_style") === "colored";
    }

    addCheckboxListener(
        "#toggle-weapon-comparison",
        "cv_weapon_compare"
    );
    addCheckboxListener(
        "#toggle-weapon-comparison-condensed",
        "cv_weapon_compare_condensed"
    );

    // Show a warning if hardware acceleration is not available/supported
    if (!isWebGLSupported(true)) {
        $("#splash-hw-acceleration-warning").show();
    }

    // render mode select menu
    const renderSelect = $<HTMLSelectElement>("#render-mode-select")[0];
    renderSelect.addEventListener("input", () => {
        GameConsole.setBuiltInCVar("cv_renderer", renderSelect.value as "webgl1" | "webgl2" | "webgpu");
    });
    renderSelect.value = GameConsole.getBuiltInCVar("cv_renderer");

    void (async() => {
        $("#webgpu-option").toggle(await isWebGPUSupported());
    })();

    // render resolution select menu
    const renderResSelect = $<HTMLSelectElement>("#render-res-select")[0];
    renderResSelect.addEventListener("input", () => {
        GameConsole.setBuiltInCVar("cv_renderer_res", renderResSelect.value as "auto" | "0.5" | "1" | "2" | "3");
    });
    renderResSelect.value = GameConsole.getBuiltInCVar("cv_renderer_res");

    const recordSelect = $<HTMLSelectElement>("#record-res-select")[0];
    recordSelect.addEventListener("input", () => {
        GameConsole.setBuiltInCVar("cv_record_res", recordSelect.value as "480p" | "720p" | "1080p" | "maximum");
    });
    recordSelect.value = GameConsole.getBuiltInCVar("cv_record_res");

    // High resolution toggle
    $("#toggle-high-res").parent().parent().toggle(!InputManager.isMobile);
    addCheckboxListener("#toggle-high-res", "cv_high_res_textures");
    addCheckboxListener("#toggle-alt-texture-loading", "cv_alt_texture_loading");
    const coolerGraphicsSubToggles = [
        { selector: "#toggle-cooler-explosions", cvar: "cv_explosion_shockwaves" },
        { selector: "#toggle-cooler-bullet-trails", cvar: "cv_bullet_trail_bloom" },
        { selector: "#toggle-cooler-blood", cvar: "cv_blood_splatter" },
        { selector: "#toggle-cooler-weapon-gas", cvar: "cv_cooler_weapon_gas" }
    ] as const;

    const coolerGraphicsCache = new Map<(typeof coolerGraphicsSubToggles)[number]["cvar"], boolean>();

    const syncCoolerGraphicsCheckboxes = (): void => {
        const masterEnabled = GameConsole.getBuiltInCVar("cv_cooler_graphics") as boolean;

        for (const { selector, cvar } of coolerGraphicsSubToggles) {
            const checkbox = $<HTMLInputElement>(selector)[0];
            if (!checkbox) continue;

            checkbox.disabled = !masterEnabled;
            checkbox.closest(".modal-item")?.classList.toggle("disabled", !masterEnabled);
            checkbox.checked = masterEnabled ? GameConsole.getBuiltInCVar(cvar) as boolean : false;
        }
    };

    const cacheCoolerSubSettings = (): void => {
        coolerGraphicsCache.clear();

        for (const { cvar } of coolerGraphicsSubToggles) {
            const current = GameConsole.getBuiltInCVar(cvar) as boolean;

            coolerGraphicsCache.set(cvar, current);
            if (current) {
                GameConsole.setBuiltInCVar(cvar, false);
            }
        }
    };

    const restoreCoolerSubSettings = (): void => {
        for (const { cvar } of coolerGraphicsSubToggles) {
            const cached = coolerGraphicsCache.get(cvar);
            if (cached !== undefined) {
                GameConsole.setBuiltInCVar(cvar, cached);
            }
        }

        coolerGraphicsCache.clear();
    };

    const clearBloodEffects = (): void => {
        for (const player of Game.objects.getCategory(ObjectCategory.Player)) {
            const { images: { blood: { children } }, bloodDecals } = player;

            for (const child of children) {
                child.destroy();
            }

            children.length = 0;

            for (const decal of bloodDecals) {
                decal.kill();
            }
        }
    };

    addCheckboxListener("#toggle-cooler-graphics", "cv_cooler_graphics", syncCoolerGraphicsCheckboxes);

    for (const toggle of coolerGraphicsSubToggles) {
        addCheckboxListener(toggle.selector, toggle.cvar, syncCoolerGraphicsCheckboxes);
    }

    if (!GameConsole.getBuiltInCVar("cv_cooler_graphics")) {
        cacheCoolerSubSettings();
    }

    syncCoolerGraphicsCheckboxes();

    GameConsole.variables.addChangeListener(
        "cv_cooler_graphics",
        (newVal, oldVal) => {
            if (newVal === oldVal) return;

            if (!newVal) {
                cacheCoolerSubSettings();
                clearBloodEffects();
            } else {
                restoreCoolerSubSettings();
            }

            syncCoolerGraphicsCheckboxes();
        }
    );

    GameConsole.variables.addChangeListener(
        "cv_blood_splatter",
        (newVal, oldVal) => {
            if (newVal !== oldVal && !newVal) {
                clearBloodEffects();
            }
        }
    );
    addCheckboxListener("#toggle-ambient-particles", "cv_ambient_particles");

    GameConsole.variables.addChangeListener(
        "cv_draw_hud",
        newVal => {
            ui.gameUi.toggle(newVal);
            MapManager.visible = !GameConsole.getBuiltInCVar("cv_minimap_minimized") && newVal;
        }
    );
    addCheckboxListener("#toggle-draw-hud", "cv_draw_hud");

    // Anti-aliasing toggle
    addCheckboxListener("#toggle-antialias", "cv_antialias");

    // Movement smoothing toggle
    addCheckboxListener("#toggle-movement-smoothing", "cv_movement_smoothing");

    // Responsive rotation toggle
    addCheckboxListener("#toggle-responsive-rotation", "cv_responsive_rotation");

    // Mobile controls stuff
    addCheckboxListener("#toggle-mobile-controls", "mb_controls_enabled");
    addSliderListener("#slider-joystick-size", "mb_joystick_size");
    addSliderListener("#slider-joystick-transparency", "mb_joystick_transparency");
    const joystickInfo = $("#mb-joystick-info");
    const updateJoystickInfo = (switchJoysticks: boolean): JQuery => joystickInfo.text(translate(switchJoysticks ? "settings_switched_joystick_info" : "settings_normal_joystick_info"));
    addCheckboxListener("#toggle-mobile-joysticks", "mb_switch_joysticks", updateJoystickInfo);
    updateJoystickInfo(GameConsole.getBuiltInCVar("mb_switch_joysticks"));
    (document.getElementById("left-joystick-color-picker") as HTMLInputElement).value = GameConsole.getBuiltInCVar("mb_left_joystick_color");
    (document.getElementById("right-joystick-color-picker") as HTMLInputElement).value = GameConsole.getBuiltInCVar("mb_right_joystick_color");
    $<HTMLInputElement>("#left-joystick-color-picker").on("input", function() {
        GameConsole.setBuiltInCVar("mb_left_joystick_color", this.value);
    });
    $<HTMLInputElement>("#right-joystick-color-picker").on("input", function() {
        GameConsole.setBuiltInCVar("mb_right_joystick_color", this.value);
    });
    addCheckboxListener("#toggle-mobile-joystick-lock", "mb_joystick_lock");

    addSliderListener("#slider-gyro-angle", "mb_gyro_angle");
    addCheckboxListener("#toggle-haptics", "mb_haptics");

    addCheckboxListener("#toggle-shake-to-reload", "mb_shake_to_reload");
    addSliderListener("#slider-shake-count", "mb_shake_count");
    addSliderListener("#slider-shake-force", "mb_shake_force");
    addSliderListener("#slider-shake-delay", "mb_shake_delay");

    addCheckboxListener("#toggle-high-res-mobile", "mb_high_res_textures");
    addCheckboxListener("#toggle-antialias-mobile", "mb_antialias");

    function updateUiScale(): void {
        const scale = GameConsole.getBuiltInCVar("cv_ui_scale");

        ui.gameUi.width(window.innerWidth / scale);
        ui.gameUi.height(window.innerHeight / scale);
        ui.gameUi.css("transform", `scale(${scale})`);
    }
    updateUiScale();
    window.addEventListener("resize", () => updateUiScale());

    addSliderListener(
        "#slider-ui-scale",
        "cv_ui_scale",
        () => {
            updateUiScale();
            MapManager.resize();
        }
    );

    // TODO: fix joysticks on mobile when UI scale is not 1
    if (InputManager.isMobile) {
        $("#ui-scale-container").hide();
        GameConsole.setBuiltInCVar("cv_ui_scale", 1);
    }

    // Minimap stuff
    addSliderListener(
        "#slider-minimap-transparency",
        "cv_minimap_transparency",
        () => MapManager.updateTransparency()
    );
    addSliderListener(
        "#slider-big-map-transparency",
        "cv_map_transparency",
        () => MapManager.updateTransparency()
    );
    addCheckboxListener(
        "#toggle-hide-minimap",
        "cv_minimap_minimized",
        val => MapManager.visible = !val
    );

    GameConsole.variables.addChangeListener(
        "cv_map_expanded",
        val => MapManager.expanded = val
    );

    // Leave warning
    addCheckboxListener("#toggle-leave-warning", "cv_leave_warning");

    MenuUi.noBlur = !GameConsole.getBuiltInCVar("cv_blur_splash");
    GameConsole.variables.addChangeListener("cv_blur_splash", val => MenuUi.noBlur = !val);

    const button = $<HTMLButtonElement>("#btn-rules, #rules-close-btn");
    // Hide rules button
    addCheckboxListener(
        "#toggle-hide-rules",
        "cv_hide_rules_button",
        value => {
            button.toggle(!value);
        }
    );
    button.toggle(!GameConsole.getBuiltInCVar("cv_hide_rules_button"));

    // Hide option to hide rules if rules haven't been acknowledged
    $(".checkbox-setting").has("#toggle-hide-rules").toggle(GameConsole.getBuiltInCVar("cv_rules_acknowledged"));

    const rules = $<HTMLButtonElement>("#btn-rules, #rules-close-btn");
    const toggleHideRules = $<HTMLInputElement>("#toggle-hide-rules");

    $("#rules-close-btn").on("click", () => {
        rules.hide();
        GameConsole.setBuiltInCVar("cv_hide_rules_button", true);
        toggleHideRules.prop("checked", true);
    }).toggle(GameConsole.getBuiltInCVar("cv_rules_acknowledged") && !GameConsole.getBuiltInCVar("cv_hide_rules_button"));

    // Import settings
    $("#import-settings-btn").on("click", () => {
        if (!confirm("This option will overwrite all settings and reload the page. Continue?")) return;
        const error = (): void => { alert("Invalid config."); };

        try {
            const input = prompt("Enter a config:");
            if (!input) {
                error();
                return;
            }

            const config: unknown = JSON.parse(input);
            if (typeof config !== "object" || config === null || !("variables" in config)) {
                error();
                return;
            }

            localStorage.setItem("suroi_config", input);
            alert("Settings loaded successfully.");
            window.location.reload();
        } catch (_) {
            error();
        }
    });

    // Copy settings to clipboard
    $("#export-settings-btn").on("click", () => {
        const exportedSettings = localStorage.getItem("suroi_config");
        const error = (): void => {
            alert(
                "Unable to copy settings. To export settings manually, open the dev tools with Ctrl+Shift+I (Cmd+Opt+I on Mac) "
                + "and, after typing in the following, copy the result manually: localStorage.getItem(\"suroi_config\")"
            );
        };
        if (exportedSettings === null) {
            error();
            return;
        }
        navigator.clipboard
            .writeText(exportedSettings)
            .then(() => {
                alert("Settings copied to clipboard.");
            })
            .catch(error);
    });

    // Reset settings
    $("#reset-settings-btn").on("click", () => {
        if (!confirm("This option will reset all settings and reload the page. Continue?")) return;
        if (!confirm("Are you sure? This action cannot be undone.")) return;
        localStorage.removeItem("suroi_config");
        window.location.reload();
    });

    // Switch weapon slots by clicking
    const step = 1; // Define the step for cycling
    const inventorySlotTypings = GameConstants.player.inventorySlotTypings;

    const slotListener = (element: JQuery<HTMLDivElement>, listener: (button: number) => void): void => {
        element[0].addEventListener("pointerdown", (e: PointerEvent): void => {
            listener(e.button);
            e.stopPropagation();
        });
    };

    let dropTimer: number | undefined;

    function mobileDropItem(button: number, condition: boolean, item?: AmmoDefinition | ArmorDefinition | ScopeDefinition | HealingItemDefinition | BackpackDefinition, slot?: number): void {
        if (!InputManager.isMobile) return;
        dropTimer = window.setTimeout(() => {
            if (button === 0 && condition) {
                if (slot !== undefined) {
                    InputManager.addAction({
                        type: InputActions.DropWeapon,
                        slot
                    });
                } else if (item !== undefined) {
                    InputManager.addAction({
                        type: InputActions.DropItem,
                        item
                    });
                }
                autoPickup = false;
                window.setTimeout(() => {
                    autoPickup = true;
                }, 600);
            }
        }, 600);
    }

    // Generate the UI for scopes, healing items, weapons, and ammos
    $<HTMLDivElement>("#weapons-container").append(
        ...Array.from(
            { length: GameConstants.player.maxWeapons },
            (_, slot) => {
                const ele = $<HTMLDivElement>(
                    `<div class="inventory-slot" id="weapon-slot-${slot + 1}">\
                        <div class="main-container">\
                            <span class="slot-number">${slot + 1}</span>\
                            <span class="item-ammo"></span>\
                            <div class="item-image"></div>\
                            <span class="item-name"></span>\
                        </div>\
                        <img class="lock-icon" src="./img/misc/lock.svg"></span>\
                    </div>`
                );

                const isGrenadeSlot = inventorySlotTypings[slot] === DefinitionType.Throwable;

                const element = ele[0];

                element.addEventListener("pointerup", () => clearTimeout(dropTimer));

                element.addEventListener("pointerdown", e => {
                    if (!ele.hasClass("has-item")) return;

                    e.stopImmediatePropagation();

                    InputManager.addAction({
                        type: e.button === 2 ? InputActions.DropWeapon : InputActions.EquipItem,
                        slot
                    });

                    // We cycle the throwables after the drop item call, otherwise the wrong grenade will be dropped.
                    if (
                        isGrenadeSlot
                        && Game.activePlayer?.activeItem.defType === DefinitionType.Throwable
                        && e.button !== 2 // it can be anything but the right click, because right click drops stuff
                    ) {
                        InputManager.cycleThrowable(step);
                    }

                    mobileDropItem(e.button, true, undefined, slot);
                });
                return ele;
            }
        )
    );

    $<HTMLDivElement>("#scopes-container").append(
        Scopes.definitions.map(scope => {
            const ele = $<HTMLDivElement>(
                `<div class="inventory-slot item-slot" id="${scope.idString}-slot" style="display: none;">
                    <img class="item-image" src="./img/game/loot/${scope.idString}.svg" draggable="false">
                    <div class="item-tooltip">${scope.name.split(" ")[0]}</div>
                </div>`
            );

            ele[0].addEventListener("pointerup", () => clearTimeout(dropTimer));

            slotListener(ele, button => {
                const isPrimary = button === 0;
                const isSecondary = button === 2;
                const isTeamMode = Game.isTeamMode;

                if (isPrimary) {
                    InputManager.addAction({
                        type: InputActions.UseItem,
                        item: scope
                    });

                    mobileDropItem(button, isTeamMode, scope);
                }

                if (isSecondary && isTeamMode) {
                    InputManager.addAction({
                        type: InputActions.DropItem,
                        item: scope
                    });
                }
            });

            if (Config.uiDebugMode) ele.show();

            return ele;
        })
    );
    $<HTMLDivElement>("#healing-items-container").append(
        HealingItems.definitions.map(item => {
            const ele = $<HTMLDivElement>(
                html`<div class="inventory-slot item-slot active" id="${item.idString}-slot">
                    <img class="item-image" src="./img/game/loot/${item.idString}.svg" draggable="false">
                    <span class="item-count" id="${item.idString}-count">0</span>
                    <div class="item-tooltip">
                        ${translate(
                            item.healType === HealType.Special
                            ? "tt_desc"
                            : "tt_restores", {
                    item: `<b>${translate(item.idString as TranslationKeys)}</b><br>`,
                    amount: item.restoreAmount.toString(),
                    type: item.healType === HealType.Adrenaline
                        ? translate("adrenaline")
                        : translate("health"),
                    desc: translate(`${item.idString}_desc` as TranslationKeys)
                })}
                    </div>
                </div>`
            );

            ele[0].addEventListener("pointerup", () => clearTimeout(dropTimer));

            slotListener(ele, button => {
                const isPrimary = button === 0;
                const isSecondary = button === 2;
                const isTeamMode = Game.isTeamMode;

                if (isPrimary) {
                    if (MapPingWheelManager.enabled && Game.isTeamMode) {
                        InputManager.addAction({
                            type: InputActions.Emote,
                            emote: Emotes.fromString(item.idString)
                        });
                        MapPingWheelManager.enabled = false;
                        UIManager.updateRequestableItems();
                    } else {
                        InputManager.addAction({
                            type: InputActions.UseItem,
                            item
                        });
                    }

                    mobileDropItem(button, isTeamMode, item);
                }

                if (isSecondary && isTeamMode) {
                    InputManager.addAction({
                        type: InputActions.DropItem,
                        item
                    });
                }
            });

            return ele;
        })
    );

    const ammoContainers = {
        true: $<HTMLDivElement>("#special-ammo-container"),
        false: $<HTMLDivElement>("#ammo-container")
    } as const;

    for (const ammo of Ammos) {
        if (ammo.ephemeral) continue;

        const ele = $<HTMLDivElement>(
            `<div class="inventory-slot item-slot ammo-slot active" id="${ammo.idString}-slot">
                <img class="item-image" src="./img/game/loot/${ammo.idString}.svg" draggable="false">
                <span class="item-count" id="${ammo.idString}-count">0</span>
            </div>`
        );

        ammoContainers[`${ammo.hideUnlessPresent ?? false}`].append(ele);

        ele[0].addEventListener("pointerup", (): void => {
            clearTimeout(dropTimer);
        });

        slotListener(ele, button => {
            const isPrimary = button === 0;
            const isSecondary = button === 2;
            const isTeamMode = Game.isTeamMode;

            if (isPrimary) {
                if (MapPingWheelManager.enabled && Game.isTeamMode) {
                    InputManager.addAction({
                        type: InputActions.Emote,
                        emote: Emotes.fromString(ammo.idString)
                    });
                    MapPingWheelManager.enabled = false;
                    UIManager.updateRequestableItems();
                }

                mobileDropItem(button, isTeamMode, ammo);
            }

            if (isSecondary && isTeamMode) {
                InputManager.addAction({
                    type: InputActions.DropItem,
                    item: ammo
                });
            }
        });
    }

    slotListener($<HTMLDivElement>("#c4-detonate-btn"), button => {
        const isPrimary = button === 0;

        if (isPrimary) {
            InputManager.addAction({
                type: InputActions.ExplodeC4
            });
        }
    });

    for (
        const [ele, type] of [
            [$<HTMLDivElement>("#helmet-slot"), "helmet"],
            [$<HTMLDivElement>("#vest-slot"), "vest"],
            [$<HTMLDivElement>("#backpack-slot"), "backpack"]
        ] as const
    ) {
        ele[0].addEventListener("pointerup", () => clearTimeout(dropTimer));

        slotListener(ele, button => {
            const isSecondary = button === 2;
            const shouldDrop = Game.activePlayer && Game.isTeamMode;

            if (isSecondary && shouldDrop) {
                const item = Game.activePlayer?.equipment[type];
                if (item) {
                    InputManager.addAction({
                        type: InputActions.DropItem,
                        item
                    });
                }
            }

            if (shouldDrop !== undefined) {
                mobileDropItem(button, shouldDrop, Game.activePlayer?.equipment[type]);
            }
        });
    }

    for (const perkSlot of ["#perk-slot-0", "#perk-slot-1", "#perk-slot-2", "#perk-slot-3"]) {
        $(perkSlot)[0].addEventListener("pointerdown", function(e: PointerEvent): void {
            e.stopImmediatePropagation();
            if (e.button !== 2) return;

            const perkIDString = $(this).attr("data-idString");
            if (!perkIDString) return;

            InputManager.addAction({
                type: InputActions.DropItem,
                item: Perks.fromString(perkIDString as PerkIds)
            });
        });
    }

    // Alright so in mobile we have a completely different spectating container.
    if (InputManager.isMobile) {
        ui.spectatingContainer.addClass("mobile-mode");
        ui.spectatingContainer.css({
            width: "150px",
            position: "fixed",
            top: "15%",
            left: "5rem"
        });

        ui.btnReport.html("<i class=\"fa-solid fa-flag\"></i>");
        ui.btnPlayAgainSpectating.html("<i class=\"fa-solid fa-rotate-right\"></i>");

        // Spectate Kill Leader button
        ui.spectateKillLeader.html("<i class=\"fa-solid fa-crown\"></i>");
        ui.spectateKillLeader.addClass("btn-spectate-kill-leader");

        ui.btnSpectateMenu.html("<i class=\"fa-solid fa-bars\"></i>");
        ui.btnSpectateMenu.addClass("btn-success");

        // To fix overlapping gas timer with mobile options
        ui.gasAndDebug.addClass("gas-and-debug-mobile-patch");
        // silly
        ui.ammosContainer.addClass("mobile-patch-ammos");
    }

    const optionsIcon = $("#btn-spectate-options-icon");
    $<HTMLButtonElement>("#btn-spectate-options").on("click", () => {
        ui.spectatingContainer.toggle();

        if (InputManager.isMobile) ui.spectatingContainer.toggleClass("mobile-visible");

        const visible = ui.spectatingContainer.is(":visible");
        optionsIcon
            .toggleClass("fa-eye", !visible)
            .toggleClass("fa-eye-slash", visible);
    });

    // Mobile event listeners
    if (InputManager.isMobile) {
        $("#mobile-options").show();

        // Interact message
        ui.interactMsg.on("click", () => {
            InputManager.addAction(UIManager.action.active ? InputActions.Cancel : InputActions.Interact);
        });
        ui.interactKey.html('<img src="./img/misc/tap-icon.svg" alt="Tap">');

        // Active weapon ammo button reloads
        ui.activeAmmo.on("click", () => GameConsole.handleQuery("reload", "never"));

        ui.emoteButton.on("pointerup", () => {
            const emoteWheelActive = !EmoteWheelManager.enabled;
            EmoteWheelManager.enabled = emoteWheelActive;

            ui.emoteButton
                .toggleClass("bg-orange-500", emoteWheelActive)
                .toggleClass("bg-blue-500", !emoteWheelActive);
        });

        ui.pingToggle.on("pointerup", () => {
            const pingWheelActive = !MapPingWheelManager.enabled;
            MapPingWheelManager.enabled = pingWheelActive;

            ui.pingToggle
                .toggleClass("bg-red-500", pingWheelActive)
                .toggleClass("bg-blue-500", !pingWheelActive);

            UIManager.updateRequestableItems();
        });
    }

    // Prompt when trying to close the tab while playing
    window.addEventListener("beforeunload", (e: Event) => {
        if (
            ui.canvas.hasClass("active")
            && GameConsole.getBuiltInCVar("cv_leave_warning")
            && !Game.gameOver
        ) {
            e.preventDefault();
        }
    });

    const wrapperCache = new ExtendedMap<HTMLElement, JQuery>();

    // Hack to style range inputs background and add a label with the value :)
    function updateRangeInput(element: HTMLInputElement): void {
        const value = +element.value;
        const min = +element.min;
        const max = +element.max;
        const x = ((value - min) / (max - min)) * 100;

        wrapperCache.getAndGetDefaultIfAbsent(element, () => $(element))
            .css(
                "--background",
                `linear-gradient(to right, var(--thumb-bg) 0%, var(--thumb-bg) ${x}%, var(--track-bg) ${x}%, var(--track-bg) 100%)`
            )
            .siblings(".range-input-value")
            .text(
                (() => {
                    switch (element.id) {
                        case "slider-joystick-size":
                        case "slider-shake-count":
                            return value;
                        case "slider-gyro-angle":
                            return `${value}°`;
                        case "slider-shake-force":
                            return `${value} m/s²`;
                        case "slider-shake-delay":
                            return `${value} ms`;
                        default:
                            return `${Math.round(value * 100)}%`;
                    }
                })()
            );
    }

    $<HTMLInputElement>("input[type=range]")
        .on("input", ({ target }) => {
            updateRangeInput(target);
        })
        .each((_, element) => {
            updateRangeInput(element);
        });

    $(".tab").on("click", ({ target }) => {
        const tab = wrapperCache.getAndGetDefaultIfAbsent(target, () => $(target));

        tab.addClass("active");
        tab.siblings().removeClass("active");

        const tabContent = $(`#${target.id}-content`);

        tabContent.siblings().removeClass("active");
        tabContent.siblings().hide();

        tabContent.addClass("active");
        tabContent.show();
    });

    const continueBtn = $<HTMLButtonElement>("#warning-continue-btn");
    $<HTMLInputElement>("#warning-modal-agree-checkbox").on("click", function() {
        continueBtn.toggleClass("btn-disabled", !this.checked);
    });

    continueBtn.on("click", async() => {
        await fetch(`https://api.suroi.io/acknowledgeWarning`, { method: "DELETE" });
        ui.warningModal.hide();
    });
}
