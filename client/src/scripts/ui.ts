import { GameConstants, InputActions, ObjectCategory, SpectateActions, TeamSize } from "@common/constants";
import { Badges, type BadgeDefinition } from "@common/definitions/badges";
import { EmoteCategory, Emotes, type EmoteDefinition } from "@common/definitions/emotes";
import { Ammos, type AmmoDefinition } from "@common/definitions/items/ammos";
import { type ArmorDefinition } from "@common/definitions/items/armors";
import { HealType, HealingItems, type HealingItemDefinition } from "@common/definitions/items/healingItems";
import { PerkIds, Perks } from "@common/definitions/items/perks";
import { Scopes, type ScopeDefinition } from "@common/definitions/items/scopes";
import { Skins, type SkinDefinition } from "@common/definitions/items/skins";
import { Modes, type ModeName } from "@common/definitions/modes";
import { SpectatePacket } from "@common/packets/spectatePacket";
import { CustomTeamMessages, type CustomTeamMessage, type CustomTeamPlayerInfo, type PunishmentMessage } from "@common/typings";
import { ExtendedMap } from "@common/utils/misc";
import { ItemType, type ReferenceTo } from "@common/utils/objectDefinitions";
import { pickRandomInArray } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { sound } from "@pixi/sound";
import $ from "jquery";
import { Color, isWebGPUSupported } from "pixi.js";
import { posts } from "virtual:news-posts";
import type { NewsPost } from "../../vite/plugins/news-posts-plugin";
import { TRANSLATIONS, getTranslatedString } from "./utils/translations/translations";
import type { TranslationKeys } from "./utils/translations/typings";
import { Config, type ServerInfo } from "./config";
import { Game } from "./game";
import { body, createDropdown } from "./uiHelpers";
import { EMOTE_SLOTS, PIXI_SCALE, UI_DEBUG_MODE } from "./utils/constants";
import { Crosshairs, getCrosshair } from "./utils/crosshairs";
import { html, humanDate, requestFullscreen } from "./utils/misc";
import { UIManager } from "./managers/uiManager";
import { GameConsole } from "./console/gameConsole";
import { CameraManager } from "./managers/cameraManager";
import { InputManager } from "./managers/inputManager";
import { MapManager } from "./managers/mapManager";
import { SoundManager } from "./managers/soundManager";
import { defaultClientCVars, type CVarTypeMapping } from "./console/variables";
import { spritesheetLoad } from "./utils/pixi";

/*
    eslint-disable

    @stylistic/indent
*/

/*
    `@stylistic/indent`: can eslint stop [expletive redacted] at indenting stuff
*/

interface RegionInfo {
    readonly name: string
    readonly mainAddress: string
    readonly gameAddress: string
    readonly offset: number
    readonly playerCount?: number

    readonly teamSize?: TeamSize
    readonly nextTeamSize?: TeamSize
    readonly teamSizeSwitchTime?: number

    readonly mode?: ModeName
    readonly nextMode?: ModeName
    readonly modeSwitchTime?: number

    readonly ping?: number
    readonly retrievedTime?: number
}

let selectedRegion: RegionInfo | undefined;

const regionInfo: Record<string, RegionInfo> = Config.regions;

export let teamSocket: WebSocket | undefined;
let teamID: string | undefined | null;
let joinedTeam = false;
let autoFill = false;
let globalIsLeader = false;
let globalReady = false;

export let autoPickup = true;

let buttonsLocked = true;
export function lockPlayButtons(): void { buttonsLocked = true; }
export function unlockPlayButtons(): void { buttonsLocked = false; }

let lastDisconnectTime: number | undefined;
export function updateDisconnectTime(): void { lastDisconnectTime = Date.now(); }

let btnMap: ReadonlyArray<readonly [TeamSize, JQuery<HTMLDivElement>]>;
export function resetPlayButtons(): void { // TODO Refactor this method to use uiManager for jQuery calls
    if (buttonsLocked) return;

    const ui = UIManager.ui;
    const { teamSize, nextTeamSize, nextMode } = selectedRegion ?? regionInfo[Config.defaultRegion];

    ui.splashOptions.removeClass("loading");
    ui.loaderText.text("");

    const isSolo = teamSize === TeamSize.Solo;

    for (
        const [size, btn] of (
            btnMap ??= [
                [TeamSize.Solo, ui.playSoloBtn],
                [TeamSize.Duo, ui.playDuoBtn],
                [TeamSize.Squad, ui.playSquadBtn]
            ]
        )
    ) btn.toggleClass("locked", teamSize !== undefined && teamSize !== size);

    ui.teamOptionBtns.toggleClass("locked", isSolo);

    ui.switchMessages.css("top", isSolo ? "225px" : "150px").toggle(nextTeamSize !== undefined || nextMode !== undefined);

    ui.nextTeamSizeMsg.toggle(nextTeamSize !== undefined);
    const teamSizeIcons = [
        "url(./img/misc/player_icon.svg)",
        "url(./img/misc/duos.svg)",
        undefined,
        "url(./img/misc/squads.svg)"
    ];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ui.nextTeamSizeIcon.css("background-image", nextTeamSize ? teamSizeIcons[nextTeamSize - 1]! : "none");

    ui.nextModeMsg.toggle(nextMode !== undefined);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ui.nextModeIcon.css("background-image", `url(${Modes[nextMode!]?.modeLogoImage ?? "./img/game/shared/emotes/suroi_logo.svg"})`);
}

let forceReload = false;
export function reloadPage(): void {
    forceReload = true;
    location.reload();
}

export async function fetchServerData(): Promise<void> {
    const ui = UIManager.ui;
    const regionMap = Object.entries(regionInfo);
    const serverList = $<HTMLUListElement>("#server-list");

    // Load server list
    const regionUICache: Record<string, JQuery<HTMLLIElement>> = {};

    for (const [regionID] of regionMap) {
        serverList.append(
            regionUICache[regionID] = $<HTMLLIElement>(`
                <li class="server-list-item" data-region="${regionID}">
                    <span class="server-name">${getTranslatedString(`region_${regionID}` as TranslationKeys)}</span>
                    <span style="margin-left: auto">
                      <img src="./img/misc/player_icon.svg" width="16" height="16" alt="Player count">
                      <span class="server-player-count">-</span>
                    </span>
                </li>
            `)
        );
    }

    ui.loaderText.text(getTranslatedString("loading_fetching_data"));
    const selectedRegionID = GameConsole.getBuiltInCVar("cv_region");
    const regionPromises = Object.entries(regionMap).map(async([_, [regionID, region]]) => {
        const listItem = regionUICache[regionID];

        const pingStartTime = Date.now();

        type ServerInfoResponse = ServerInfo & { readonly punishment?: PunishmentMessage };
        let info: ServerInfoResponse | undefined;

        for (let attempts = 0; attempts < 3; attempts++) {
            console.log(`Loading server info for region ${regionID}: ${region.mainAddress} (attempt ${attempts + 1} of 3)`);
            try {
                const response = await fetch(`${region.mainAddress}/api/serverInfo${regionID === selectedRegionID ? "?checkPunishments=true" : ""}`, { signal: AbortSignal.timeout(10000) });
                info = await response.json() as ServerInfoResponse;
                if (info) break;
            } catch (e) {
                console.error(`Error loading server info for region ${regionID}. Details:`, e);
            }
        }

        if (!info) {
            console.error(`Unable to load server info for region ${regionID} after 3 attempts`);
            return;
        }

        if (info.protocolVersion !== GameConstants.protocolVersion) {
            console.error(`Protocol version mismatch for region ${regionID}. Expected ${GameConstants.protocolVersion} (ours), got ${info.protocolVersion} (theirs)`);
            return;
        }

        if (info.punishment) {
            const punishment = info.punishment;
            const reportID = punishment.reportID ?? "No report ID provided.";
            const message = getTranslatedString(`msg_punishment_${punishment.message}_reason`, { reason: punishment.reason ?? getTranslatedString("msg_no_reason") });

            ui.warningTitle.text(getTranslatedString(`msg_punishment_${punishment.message}`));
            ui.warningText.html(`${punishment.message !== "vpn" ? `<span class="case-id">Case ID: ${reportID}</span><br><br><br>` : ""}${message}`);
            ui.warningAgreeOpts.toggle(punishment.message === "warn");
            ui.warningAgreeCheckbox.prop("checked", false);
            ui.warningModal.show();
            ui.splashOptions.addClass("loading");
        }

        const now = Date.now();
        regionInfo[regionID] = {
            ...region,
            ...info,
            ping: now - pingStartTime,
            retrievedTime: now
        };

        listItem.find(".server-player-count").text(info.playerCount ?? "-");

        console.log(`Loaded server info for region ${regionID}`);
    });
    await Promise.all(regionPromises);

    const pad = (n: number): string | number => n < 10 ? `0${n}` : n;
    const setTimeString = (elem: JQuery, millis: number): void => {
        if (millis === Infinity) return;

        const days = Math.floor(millis / (1000 * 60 * 60 * 24));
        const hours = Math.floor(millis / (1000 * 60 * 60)) % 24;
        const minutes = Math.floor(millis / (1000 * 60)) % 60;
        const seconds = Math.floor(millis / 1000) % 60;
        elem.text(`${days > 0 ? `${pad(days)}:` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };
    const updateSwitchTime = (): void => {
        if (!selectedRegion) return;
        const { teamSizeSwitchTime, modeSwitchTime, retrievedTime } = selectedRegion;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const offset = Date.now() - retrievedTime!;
        const timeBeforeTeamSizeSwitch = (teamSizeSwitchTime ?? Infinity) - offset;
        const timeBeforeModeSwitch = (modeSwitchTime ?? Infinity) - offset;

        if (
            (timeBeforeTeamSizeSwitch < 0 && !Game.gameStarted)
            || timeBeforeModeSwitch < 0
        ) {
            reloadPage();
            return;
        }

        setTimeString(ui.teamSizeSwitchTime, timeBeforeTeamSizeSwitch);
        setTimeString(ui.modeSwitchTime, timeBeforeModeSwitch);
    };
    setInterval(updateSwitchTime, 1000);

    const serverName = $<HTMLSpanElement>("#server-name");
    const playerCount = $<HTMLSpanElement>("#server-player-count");
    const updateServerSelectors = (): void => {
        if (!selectedRegion) { // Handle invalid region
            selectedRegion = regionInfo[Config.defaultRegion];
            GameConsole.setBuiltInCVar("cv_region", "");
        }

        Game.modeName = selectedRegion.mode ?? GameConstants.defaultMode;

        const region = getTranslatedString(`region_${GameConsole.getBuiltInCVar("cv_region")}` as TranslationKeys);
        if (region === "region_") {
            serverName.text(selectedRegion.name); // this for now until we find a way to selectedRegion.id
        } else {
            serverName.text(region);
        }
        playerCount.text(selectedRegion.playerCount ?? "-");
        // $("#server-ping").text(selectedRegion.ping && selectedRegion.ping > 0 ? selectedRegion.ping : "-");
        updateSwitchTime();
        resetPlayButtons();
    };

    selectedRegion = regionInfo[GameConsole.getBuiltInCVar("cv_region") ?? Config.defaultRegion];
    updateServerSelectors();

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    serverList.children("li.server-list-item").on("click", function(this: HTMLLIElement) {
        const region = this.getAttribute("data-region");

        if (region === null) return;

        const info = regionInfo[region];
        if (info === undefined) return;

        resetPlayButtons();

        selectedRegion = info;

        GameConsole.setBuiltInCVar("cv_region", region);

        updateServerSelectors();
    });

    if (window.location.hash) {
        teamID = window.location.hash.slice(1);
        $("#btn-join-team").trigger("click");
    }
}

// Take the stuff that needs fetchServerData out of setUpUI and put it here
export async function finalizeUI(): Promise<void> {
    const { mode: { specialLogo, playButtonImage, darkShaders }, modeName } = Game;

    // Change the menu based on the mode.
    $("#splash-ui").css("background-image", `url(./img/backgrounds/menu/${modeName}.png)`);

    if (specialLogo) {
        $("#splash-logo").children("img").attr("src", `./img/logos/suroi_beta_${modeName}.svg`);
    }

    if (playButtonImage) {
        const playButtons = [$("#btn-play-solo"), $("#btn-play-duo"), $("#btn-play-squad")];
        for (let buttonIndex = 0, len = playButtons.length; buttonIndex < len; buttonIndex++) {
            playButtons[buttonIndex]
                .addClass(`event-${modeName}`)
                .html(`<img class="btn-icon" src=${playButtonImage}><span>${getTranslatedString(`play_${["solo", "duo", "squad"][buttonIndex]}` as TranslationKeys)}</span>`);
        }
    }

    // Darken canvas (halloween mode)
    // TODO Use pixi for this
    if (darkShaders) {
        $("#game-canvas").css({
            "filter": "brightness(0.65) saturate(0.85)",
            "position": "relative",
            "z-index": "-1"
        });
    }
}

export async function setUpUI(): Promise<void> {
    const ui = UIManager.ui;

    if (UI_DEBUG_MODE) {
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
        ui.teamContainer.html("<div class=\"teammate-container\"><svg class=\"teammate-health-indicator\" width=\"48\" height=\"48\" xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"21\" cy=\"24\" cx=\"24\" stroke-width=\"6\" stroke-dasharray=\"132\" fill=\"none\" style=\"transition: stroke-dashoffset 50ms ease-in-out; stroke: rgb(189, 199, 208); stroke-dashoffset: 0px;\"></circle></svg><div class=\"teammate-indicator-container\" style=\"background-color: rgb(0, 255, 255);\"><img class=\"teammate-indicator\" src=\"./img/game/shared/player/player_indicator.svg\"></div><span class=\"teammate-name\" style=\"color: rgb(0, 125, 128);\">pap_local_test23</span><img class=\"teammate-badge\" src=\"./img/game/shared/badges/bdg_developr.svg\"></div><div class=\"teammate-container\"><svg class=\"teammate-health-indicator\" width=\"48\" height=\"48\" xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"21\" cy=\"24\" cx=\"24\" stroke-width=\"6\" stroke-dasharray=\"132\" fill=\"none\" style=\"transition: stroke-dashoffset 50ms ease-in-out; stroke: rgb(189, 199, 208); stroke-dashoffset: 0px;\"></circle></svg><div class=\"teammate-indicator-container\" style=\"background-color: rgb(255, 0, 255);\"><img class=\"teammate-indicator\" src=\"./img/game/shared/player/player_indicator.svg\"></div><span class=\"teammate-name\" style=\"color: rgb(0, 125, 128);\">pap_local_test23</span><img class=\"teammate-badge\" src=\"./img/game/shared/badges/bdg_developr.svg\"></div><div class=\"teammate-container\"><svg class=\"teammate-health-indicator\" width=\"48\" height=\"48\" xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"21\" cy=\"24\" cx=\"24\" stroke-width=\"6\" stroke-dasharray=\"132\" fill=\"none\" style=\"transition: stroke-dashoffset 50ms ease-in-out; stroke: rgb(189, 199, 208); stroke-dashoffset: 0px;\"></circle></svg><div class=\"teammate-indicator-container\" style=\"background-color: rgb(255, 255, 0);\"><img class=\"teammate-indicator\" src=\"./img/game/shared/player/player_indicator.svg\"></div><span class=\"teammate-name\" style=\"color: rgb(0, 125, 128);\">pap_local_test23</span><img class=\"teammate-badge\" src=\"./img/game/shared/badges/bdg_developr.svg\"></div><div class=\"teammate-container\"><svg class=\"teammate-health-indicator\" width=\"48\" height=\"48\" xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"21\" cy=\"24\" cx=\"24\" stroke-width=\"6\" stroke-dasharray=\"132\" fill=\"none\" style=\"transition: stroke-dashoffset 50ms ease-in-out; stroke: rgb(189, 199, 208); stroke-dashoffset: 0px;\"></circle></svg><div class=\"teammate-indicator-container\" style=\"background-color: rgb(255, 128, 0);\"><img class=\"teammate-indicator\" src=\"./img/game/shared/player/player_indicator.svg\"></div><span class=\"teammate-name\" style=\"color: rgb(0, 125, 128);\">pap_local_test23</span><img class=\"teammate-badge\" src=\"./img/game/shared/badges/bdg_developr.svg\" style=\"\"></div>");

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

        // Kill feed messages
        const killFeed = ui.killFeed;
        for (let i = 0; i < 5; i++) {
            const killFeedItem = $<HTMLDivElement>("<div>");
            killFeedItem.addClass("kill-feed-item");
            // noinspection HtmlUnknownTarget
            killFeedItem.html(
                '<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> Player killed Player with Mosin-Nagant'
            );
            killFeed.prepend(killFeedItem);
        }
    }

    const languageFieldset = $("#languages-selector");
    for (const [language, languageInfo] of Object.entries(TRANSLATIONS.translations)) {
        const isSelected = GameConsole.getBuiltInCVar("cv_language") === language;
        languageFieldset.append(html`
           <a id="language-${language}" ${isSelected ? 'class="selected"' : ""}>
              ${languageInfo.flag} <strong>${languageInfo.name}</strong> [${!isSelected ? TRANSLATIONS.translations[language].percentage : languageInfo.percentage}]
           </a>
        `);

        $(`#language-${language}`).on("click", () => {
            GameConsole.setBuiltInCVar("cv_language", language);
        });
    }

    GameConsole.variables.addChangeListener("cv_language", () => location.reload());

    const params = new URLSearchParams(window.location.search);

    // Switch regions with the ?region="name" Search Parameter
    if (params.has("region")) {
        (() => {
            const region = params.get("region");
            params.delete("region");
            if (region === null) return;
            if (!Object.hasOwn(Config.regions, region)) return;
            GameConsole.setBuiltInCVar("cv_region", region);
        })();
    }

    // Load news
    ui.newsPosts.html((posts as NewsPost[]).slice(0, 5).map(post => `
        <article class="splash-news-entry">
            <div class="news-date">${humanDate(post.date)}</div>
            <div class="news-title">${post.title}</div>
            ${post.description}
            <i>- ${post.author}</i>
        </article>
    `).join(""));

    // createDropdown("#splash-more");
    createDropdown("#language-dropdown");

    ui.lockedInfo.on("click", () => ui.lockedTooltip.fadeToggle(250));

    const joinGame = async(): Promise<void> => {
        if (
            Game.gameStarted
            || Game.connecting
            || selectedRegion === undefined // shouldn't happen
        ) return;

        Game.connecting = true;
        ui.splashOptions.addClass("loading");
        ui.loaderText.text(getTranslatedString("loading_finding_game"));
        // ui.cancelFindingGame.css("display", "");

        await spritesheetLoad();

        type GetGameResponse = { success: true, gameID: number } | { success: false };
        let response: GetGameResponse | undefined;
        try {
            const res = await fetch(`${selectedRegion.mainAddress}/api/getGame${teamID ? `?teamID=${teamID}` : ""}`);
            if (res.ok) response = await res.json() as GetGameResponse;
        } catch (e) {
            console.error("Error finding game. Details:", e);
        }

        if (!response?.success) {
            Game.connecting = false;
            ui.splashMsgText.html(getTranslatedString("msg_err_finding"));
            ui.splashMsg.show();
            resetPlayButtons();
            return;
        }

        const params = new URLSearchParams();

        if (teamID) params.set("teamID", teamID);
        if (autoFill) params.set("autoFill", String(autoFill));

        const devPass = GameConsole.getBuiltInCVar("dv_password");
        if (devPass) params.set("password", devPass);

        const role = GameConsole.getBuiltInCVar("dv_role");
        if (role) params.set("role", role);

        const lobbyClearing = GameConsole.getBuiltInCVar("dv_lobby_clearing");
        if (lobbyClearing) params.set("lobbyClearing", "true");

        const weaponPreset = GameConsole.getBuiltInCVar("dv_weapon_preset");
        if (weaponPreset) params.set("weaponPreset", weaponPreset);

        const nameColor = GameConsole.getBuiltInCVar("dv_name_color");
        if (nameColor) {
            try {
                params.set("nameColor", new Color(nameColor).toNumber().toString());
            } catch (e) {
                GameConsole.setBuiltInCVar("dv_name_color", "");
                console.error(e);
            }
        }

        Game.connect(`${selectedRegion.gameAddress.replace("<gameID>", (response.gameID + selectedRegion.offset).toString())}/play?${params.toString()}`);
        ui.splashMsg.hide();

        // Check again because there is a small chance that the create-team-menu element won't hide.
        if (createTeamMenu.css("display") !== "none") createTeamMenu.hide(); // what the if condition doin
    };

    let lastPlayButtonClickTime = 0;

    // Join server when play buttons are clicked
    $("#btn-play-solo, #btn-play-duo, #btn-play-squad").on("click", () => {
        const now = Date.now();
        if (now - lastPlayButtonClickTime < 1500) return; // Play button rate limit
        lastPlayButtonClickTime = now;
        void joinGame();
    });

    const createTeamMenu = $("#create-team-menu");
    $<HTMLButtonElement>("#btn-create-team, #btn-join-team").on("click", function() {
        const now = Date.now();
        if (now - lastPlayButtonClickTime < 1500 || teamSocket || selectedRegion === undefined) return;
        lastPlayButtonClickTime = now;

        ui.splashOptions.addClass("loading");
        ui.loaderText.text(getTranslatedString("loading_connecting"));

        const params = new URLSearchParams();

        if (this.id === "btn-join-team") {
            // also rejects the empty string, but like who cares
            while (!teamID) {
                teamID = prompt(getTranslatedString("msg_enter_team_code"));
                if (!teamID) {
                    resetPlayButtons();
                    return;
                }

                /*
                    Allows people to paste links into the text field and still have the game parse
                    them correctly (as opposed to simply doing `teamID = teamID.slice(1)`)
                */
                if (teamID.includes("#")) {
                    teamID = teamID.split("#")[1];
                }

                if (/^[a-zA-Z0-9]{4}$/.test(teamID)) {
                    break;
                }

                alert("Invalid team code.");
            }

            params.set("teamID", teamID);
        }

        params.set("name", GameConsole.getBuiltInCVar("cv_player_name"));
        params.set("skin", GameConsole.getBuiltInCVar("cv_loadout_skin"));

        const badge = GameConsole.getBuiltInCVar("cv_loadout_badge");
        if (badge) params.set("badge", badge);

        const devPass = GameConsole.getBuiltInCVar("dv_password");
        if (devPass) params.set("password", devPass);

        const role = GameConsole.getBuiltInCVar("dv_role");
        if (role) params.set("role", role);

        const nameColor = GameConsole.getBuiltInCVar("dv_name_color");
        if (nameColor) {
            try {
                params.set("nameColor", new Color(nameColor).toNumber().toString());
            } catch (e) {
                GameConsole.setBuiltInCVar("dv_name_color", "");
                console.error(e);
            }
        }

        teamSocket = new WebSocket(`${selectedRegion.mainAddress.replace("http", "ws")}/team?${params.toString()}`);

        const updateTeamStartButton = (isLeader: boolean, ready: boolean, forceStart: boolean): void => {
            let str: TranslationKeys;
            if (isLeader && forceStart) {
                str = "create_team_play";
            } else if (ready) {
                str = "create_team_not_ready";
            } else {
                str = "create_team_ready";
            }
            ui.btnStartGame.text(getTranslatedString(str));
        };

        teamSocket.onmessage = (message: MessageEvent<string>): void => {
            const data = JSON.parse(message.data) as CustomTeamMessage;
            switch (data.type) {
                case CustomTeamMessages.Join: {
                    joinedTeam = true;
                    teamID = data.teamID;
                    globalReady = false;
                    window.location.hash = `#${teamID}`;

                    ui.createTeamUrl.val(`${window.location.origin}/?region=${GameConsole.getBuiltInCVar("cv_region")}#${teamID}`);

                    ui.createTeamAutoFill.prop("checked", data.autoFill);
                    ui.createTeamLock.prop("checked", data.locked);
                    ui.createTeamForceStart.prop("checked", data.forceStart);
                    break;
                }
                case CustomTeamMessages.Update: {
                    const { players, isLeader: playerIsLeader, ready, forceStart } = data;
                    ui.createTeamPlayers.html(
                        players.map(
                            ({
                                id,
                                isLeader,
                                ready,
                                name,
                                skin,
                                badge,
                                nameColor
                            }: CustomTeamPlayerInfo): string => `
                                <div class="create-team-player-container" data-id="${id}">
                                    ${ready ? '<i class="fa-regular fa-circle-check"></i>' : ""}
                                    ${playerIsLeader || isLeader ? `<i class="fa-solid ${isLeader ? "fa-crown" : "fa-xmark"}"></i>` : ""}
                                    <div class="skin">
                                        <div class="skin-base" style="background-image: url('./img/game/shared/skins/${skin}_base.svg')"></div>
                                        <div class="skin-left-fist" style="background-image: url('./img/game/shared/skins/${skin}_fist.svg')"></div>
                                        <div class="skin-right-fist" style="background-image: url('./img/game/shared/skins/${skin}_fist.svg')"></div>
                                    </div>
                                    <div class="create-team-player-name-container">
                                        <span class="create-team-player-name"${nameColor ? ` style="color: ${new Color(nameColor).toHex()}"` : ""}>${name}</span>
                                        ${badge ? `<img class="create-team-player-badge" draggable="false" src="./img/game/shared/badges/${badge}.svg" />` : ""}
                                    </div>
                                </div>
                                `
                        ).join("")
                    );
                    $("#create-team-players .fa-xmark").off().on("click", function() {
                        teamSocket?.send(JSON.stringify({
                            type: CustomTeamMessages.KickPlayer,
                            playerId: parseInt($(this).parent().attr("data-id") ?? "-1")
                        }));
                    });
                    ui.createTeamToggles.toggleClass("disabled", !playerIsLeader);
                    updateTeamStartButton(playerIsLeader, ready, forceStart);
                    globalIsLeader = playerIsLeader;
                    globalReady = ready;
                    break;
                }
                case CustomTeamMessages.Settings: {
                    const { autoFill, locked, forceStart } = data;
                    ui.createTeamAutoFill.prop("checked", autoFill);
                    ui.createTeamLock.prop("checked", locked);
                    ui.createTeamForceStart.prop("checked", forceStart);
                    updateTeamStartButton(globalIsLeader, globalReady, !!forceStart);
                    break;
                }
                case CustomTeamMessages.Started: {
                    createTeamMenu.hide();
                    void joinGame();
                    break;
                }
            }
        };

        teamSocket.onerror = (): void => {
            ui.splashMsgText.html(getTranslatedString("msg_error_joining_team"));
            ui.splashMsg.show();
            resetPlayButtons();
            createTeamMenu.fadeOut(250);

            // Dimmed backdrop on team menu. (Probably not needed here)
            ui.splashUi.css({ filter: "", pointerEvents: "" });
        };

        teamSocket.onclose = (e): void => {
            // The socket is set to undefined in the close button listener
            // If it's not undefined, the socket was closed by other means, so show an error message
            if (teamSocket) {
                ui.splashMsgText.html(getTranslatedString(
                    joinedTeam
                        ? e.reason === "kicked"
                            ? "msg_error_kicked_team"
                            : "msg_lost_team_connection"
                        : "msg_error_joining_team"
                ));
                ui.splashMsg.show();
            }
            resetPlayButtons();
            teamSocket = undefined;
            teamID = undefined;
            joinedTeam = false;
            window.location.hash = "";
            createTeamMenu.fadeOut(250);

            // Dimmed backdrop on team menu.
            ui.splashUi.css({ filter: "", pointerEvents: "" });
        };

        createTeamMenu.fadeIn(250);

        // Dimmed backdrop on team menu.
        ui.splashUi.css({
            filter: "brightness(0.6)",
            pointerEvents: "none"
        });
    });

    ui.closeCreateTeam.on("click", () => {
        const socket = teamSocket;
        teamSocket = undefined;
        socket?.close();
    });

    // TODO
    /* ui.cancelFindingGame.on("click", () => {
         game.disconnect();
     }); */

    const copyUrl = $<HTMLButtonElement>("#btn-copy-team-url");
    const hideUrl = $<HTMLButtonElement>("#btn-hide-team-url");

    copyUrl.on("click", () => {
        const url = ui.createTeamUrl.val();
        if (!url) {
            alert("Unable to copy link to clipboard.");
            return;
        }
        void navigator.clipboard
            .writeText(url)
            .then(() => {
                copyUrl
                    .addClass("btn-success")
                    .css("pointer-events", "none")
                    .html(`
                        <i class="fa-solid fa-check" id="copy-team-btn-icon"></i>
                        ${getTranslatedString("copied")}`
                    );

                // After some seconds, reset the copy button's css
                window.setTimeout(() => {
                    copyUrl
                        .removeClass("btn-success")
                        .css("pointer-events", "")
                        .html(`
                            <i class="fa-solid fa-clipboard" id="copy-team-btn-icon"></i>
                            ${getTranslatedString("copy")}`
                        );
                }, 2000); // 2 sec
            })
            .catch(() => {
                alert("Unable to copy link to clipboard.");
            });
    });

    const icon = hideUrl.children("i");

    hideUrl.on("click", () => {
        const urlField = ui.createTeamUrl;

        if (urlField.hasClass("hidden")) {
            icon.removeClass("fa-eye")
                .addClass("fa-eye-slash");

            urlField.removeClass("hidden")
                .css({
                    color: "",
                    textShadow: ""
                });

            return;
        }

        icon.removeClass("fa-eye-slash")
            .addClass("fa-eye");

        urlField.addClass("hidden")
            .css({
                color: "transparent",
                textShadow: "0 0 8px rgba(0, 0, 0, 0.5)"
            });
    });

    $<HTMLInputElement>("#create-team-toggle-auto-fill").on("click", function() {
        autoFill = this.checked;
        teamSocket?.send(JSON.stringify({
            type: CustomTeamMessages.Settings,
            autoFill
        }));
    });

    $<HTMLInputElement>("#create-team-toggle-lock").on("click", function() {
        teamSocket?.send(JSON.stringify({
            type: CustomTeamMessages.Settings,
            locked: this.checked
        }));
    });

    $<HTMLInputElement>("#create-team-toggle-force-start").on("click", function() {
        teamSocket?.send(JSON.stringify({
            type: CustomTeamMessages.Settings,
            forceStart: this.checked
        }));
    });

    ui.btnStartGame.on("click", () => {
        teamSocket?.send(JSON.stringify({ type: CustomTeamMessages.Start }));
    });

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

    const usernameField = $<HTMLInputElement>("#username-input");

    const youtubers = [
        {
            name: "Sapphire",
            link: "https://www.youtube.com/channel/UCvsD5KTuL6aXFmiPFHLNq0g"
        },
        {
            name: "End",
            link: "https://www.youtube.com/channel/UCUEZCfGgTurhTqerJjIaFTQ"
        },
        {
            name: "TEAMFIGHTER 27",
            link: "https://www.youtube.com/channel/UCJF75th14wo3O4YvH8GfFXw"
        },
        {
            name: "Red King Gaming",
            link: "https://www.youtube.com/channel/UCr7jJLYLU9mCBVfL5rmpvXg"
        },
        {
            name: "Viiper",
            link: "https://www.youtube.com/channel/UCey8-fJfkF7UFYdWBcegzWA"
        },
        {
            name: "123OP",
            link: "https://www.youtube.com/@123op."
        },
        {
            name: "PacifistX",
            link: "https://www.youtube.com/@PacifstX"
        },
        {
            name: "Pablo_Fan_",
            link: "https://www.youtube.com/@Pablo_Fan_"
        },
        {
            name: "this.is.gls_",
            link: "https://www.youtube.com/@this.is.gls_"
        },
        {
            name: "dReammakers.",
            link: "https://www.youtube.com/channel/UCLid-yvmRUmpA5NBP34SOug"
        }
    ];
    const youtuber = pickRandomInArray(youtubers);
    $("#youtube-featured-name").text(youtuber.name);
    $("#youtube-featured-content").attr("href", youtuber.link).removeAttr("target");

    const streamers = [
        {
            name: "MikeMotions",
            link: "https://www.twitch.tv/mikemotions"
        },
        {
            name: "conduketive",
            link: "https://www.twitch.tv/conduketive"
        },
        {
            name: "youraopp",
            link: "https://www.twitch.tv/youraopp"
        },
        {
            name: "bcdf92",
            link: "https://www.twitch.tv/bcdf92"
        },
        {
            name: "cybytroll",
            link: "https://www.twitch.tv/cybytroll"
        },
        {
            name: "bedbests",
            link: "https://www.twitch.tv/bedbests"
        }
    ];
    const streamer = pickRandomInArray(streamers);
    $("#twitch-featured-name").text(streamer.name);
    $("#twitch-featured-content").attr("href", streamer.link).removeAttr("target");

    const toggleRotateMessage = (): JQuery =>
        $("#splash-rotate-message").toggle(
            window.innerWidth < window.innerHeight
        );
    toggleRotateMessage();
    $(window).on("resize", toggleRotateMessage);

    const gameMenu = ui.gameMenu;
    const settingsMenu = $("#settings-menu");

    usernameField.val(GameConsole.getBuiltInCVar("cv_player_name"));

    usernameField.on("input", function() {
        // Replace fancy quotes & dashes, so they don't get stripped out

        GameConsole.setBuiltInCVar(
            "cv_player_name",
            this.value = this.value
                .replace(/[\u201c\u201d\u201f]/g, '"')
                //         |  “  |  ”  |  ‟  |

                .replace(/[\u2018\u2019\u201b]/g, "'")
                //         |  ‘  |  ’  |  ‛  |

                .replace(/[\u2013\u2014]/g, "-")
                //         |  –  |  —  |

                // Strip out non-ASCII chars and
                // the C0/C1 control characters
                .replace(/[^\x20-\x7E]/g, "")
        );
    });

    createDropdown("#server-select");

    const serverSelect = $<HTMLSelectElement>("#server-select");

    // Select region
    serverSelect.on("change", () => {
        // const value = serverSelect.val() as string | undefined;

        /* if (value !== undefined) {
            GameConsole.setBuiltInCVar("cv_region", value);
        } */
    });

    const rulesBtn = $<HTMLButtonElement>("#btn-rules");

    // Highlight rules & tutorial button for new players
    if (!GameConsole.getBuiltInCVar("cv_rules_acknowledged")) {
        rulesBtn.removeClass("btn-secondary").addClass("highlighted");
    }

    // Event listener for rules button
    rulesBtn.on("click", () => {
        GameConsole.setBuiltInCVar("cv_rules_acknowledged", true);
        location.href = "./rules/";
    });

    $("#btn-quit-game, #btn-spectate-menu, #btn-menu").on("click", () => {
        void Game.endGame();
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    $("#btn-play-again, #btn-spectate-replay").on("click", async() => {
        await Game.endGame();
        if (teamSocket) teamSocket.send(JSON.stringify({ type: CustomTeamMessages.Start })); // TODO Check if player is team leader
        else await joinGame();
    });

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

    $<HTMLButtonElement>("#btn-resume-game").on("click", () => gameMenu.fadeOut(250));
    $<HTMLButtonElement>("#btn-fullscreen").on("click", () => {
        requestFullscreen();
        ui.gameMenu.hide();
    });

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape") {
            if (ui.canvas.hasClass("active") && !GameConsole.isOpen) {
                gameMenu.fadeToggle(250);
                settingsMenu.fadeOut(250);
            }
            GameConsole.isOpen = false;
        }
    });

    $<HTMLButtonElement>("#btn-settings").on("click", () => {
        $(".dialog").fadeOut(250);
        settingsMenu.fadeToggle(250);
        settingsMenu.removeClass("in-game");
    });

    $<HTMLButtonElement>("#btn-settings-game").on("click", () => {
        gameMenu.fadeOut(250);
        settingsMenu.fadeToggle(250);
        settingsMenu.addClass("in-game");
    });

    $<HTMLButtonElement>("#close-settings").on("click", () => settingsMenu.fadeOut(250));

    const customizeMenu = $<HTMLButtonElement>("#customize-menu");
    $<HTMLButtonElement>("#btn-customize").on("click", () => {
        $(".dialog").hide();
        customizeMenu.fadeToggle(250);
    });
    $<HTMLButtonElement>("#close-customize").on("click", () => customizeMenu.fadeOut(250));

    $<HTMLButtonElement>("#close-report").on("click", () => ui.reportingModal.fadeOut(250));

    const partnersModal = $("#partners-modal");

    $("#partners-link").on("click", () => {
        if (partnersModal.is(":visible")) return;
        $(".dialog").fadeOut(250);
        partnersModal.fadeToggle(250);
    });

    $("#close-partners").on("click", () => partnersModal.fadeOut(250));

    const role = GameConsole.getBuiltInCVar("dv_role");

    // Load skins
    if (!Skins.definitions.some(s => s.idString === GameConsole.getBuiltInCVar("cv_loadout_skin"))) {
        GameConsole.setBuiltInCVar("cv_loadout_skin", defaultClientCVars.cv_loadout_skin as string);
    }

    const base = $<HTMLDivElement>("#skin-base");
    const fists = $<HTMLDivElement>("#skin-left-fist, #skin-right-fist");

    const updateSplashCustomize = (skinID: string): void => {
        base.css(
            "background-image",
            `url("./img/game/shared/skins/${skinID}_base.svg")`
        );

        fists.css(
            "background-image",
            `url("./img/game/shared/skins/${skinID}_fist.svg")`
        );
    };

    const currentSkin = GameConsole.getBuiltInCVar("cv_loadout_skin");
    updateSplashCustomize(currentSkin);
    const skinList = $<HTMLDivElement>("#skins-list");

    const skinUiCache: Record<ReferenceTo<SkinDefinition>, JQuery<HTMLDivElement>> = {};

    function selectSkin(idString: ReferenceTo<SkinDefinition>): void {
        skinUiCache[idString].addClass("selected")
            .siblings()
            .removeClass("selected");

        updateSplashCustomize(idString);
    }

    for (const { idString, hideFromLoadout, rolesRequired } of Skins) {
        if (hideFromLoadout || !(rolesRequired ?? [role]).includes(role)) continue;

        // noinspection CssUnknownTarget
        const skinItem = skinUiCache[idString] = $<HTMLDivElement>(
            `<div id="skin-${idString}" class="skins-list-item-container${idString === currentSkin ? " selected" : ""}">
                <div class="skin">
                    <div class="skin-base" style="background-image: url('./img/game/shared/skins/${idString}_base.svg')"></div>
                    <div class="skin-left-fist" style="background-image: url('./img/game/shared/skins/${idString}_fist.svg')"></div>
                    <div class="skin-right-fist" style="background-image: url('./img/game/shared/skins/${idString}_fist.svg')"></div>
                </div>
                <span class="skin-name">${getTranslatedString(idString as TranslationKeys)}</span>
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

    const bottomEmoteUiCache: Partial<Record<typeof EMOTE_SLOTS[number], JQuery<HTMLSpanElement>>> = {};
    const emoteWheelUiCache: Partial<Record<typeof EMOTE_SLOTS[number], JQuery<HTMLDivElement>>> = {};

    function updateEmotesList(): void {
        emoteList.empty();

        const emotes = Array.from(Emotes)
            .filter(({ hideInLoadout }) => !hideInLoadout)
            .sort((a, b) => a.category - b.category);

        let lastCategory: EmoteCategory | undefined;

        for (const emote of emotes) {
            if (emote.category !== lastCategory) {
                emoteList.append(
                    $<HTMLDivElement>(
                        `<div class="emote-list-header">${getTranslatedString(`emotes_category_${EmoteCategory[emote.category]}` as TranslationKeys)
                        }</div>`
                    )
                );
                lastCategory = emote.category;
            }

            const idString = emote.idString;
            // noinspection CssUnknownTarget
            const emoteItem = $<HTMLDivElement>(
                `<div id="emote-${idString}" class="emotes-list-item-container">
                    <div class="emotes-list-item" style="background-image: url(./img/game/shared/emotes/${idString}.svg)"></div>
                    <span class="emote-name">${getTranslatedString(`emote_${idString}` as TranslationKeys)}</span>
                </div>`
            );

            emoteItem.on("click", () => {
                if (selectedEmoteSlot === undefined) return;

                const cvarName = selectedEmoteSlot;
                (
                    bottomEmoteUiCache[cvarName] ??= $((`#emote-wheel-bottom .emote-${cvarName} .fa-xmark` as const))
                ).show();

                GameConsole.setBuiltInCVar(`cv_loadout_${cvarName}_emote`, emote.idString);

                emoteItem.addClass("selected")
                    .siblings()
                    .removeClass("selected");

                (
                    emoteWheelUiCache[cvarName] ??= $(`#emote-wheel-container .emote-${cvarName}`)
                ).css(
                    "background-image",
                    `url("./img/game/shared/emotes/${emote.idString}.svg")`
                );
            });

            emoteList.append(emoteItem);
        }
    }

    updateEmotesList();

    const customizeEmote = $<HTMLDivElement>("#emote-customize-wheel");
    const emoteListItemContainer = $<HTMLDivElement>(".emotes-list-item-container");

    function changeEmoteSlotImage(slot: typeof EMOTE_SLOTS[number], emote: ReferenceTo<EmoteDefinition>): JQuery<HTMLDivElement> {
        return (
            emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
        ).css("background-image", emote ? `url("./img/game/shared/emotes/${emote}.svg")` : "none");
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

                if (EMOTE_SLOTS.indexOf(slot) > 3) {
                    // win / death emote
                    customizeEmote.css(
                        "background-image",
                        "url('/img/misc/emote_wheel.svg')"
                    );

                    (
                        emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
                    ).addClass("selected");
                } else {
                    customizeEmote.css(
                        "background-image",
                        `url("./img/misc/emote_wheel_highlight_${slot}.svg"), url("/img/misc/emote_wheel.svg")`
                    );
                }

                emoteListItemContainer
                    .removeClass("selected")
                    .css("cursor", "pointer");

                $(`#emote-${GameConsole.getBuiltInCVar(cvar) || "none"}`).addClass("selected");
            });

        (
            emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
        ).children(".remove-emote-btn")
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

    const crosshairCache: Array<JQuery<HTMLDivElement>> = [];

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
    const allowedBadges = Badges.definitions.filter(({ roles }) => !roles?.length || roles.includes(role));

    if (allowedBadges.length > 0) {
        $("#tab-badges").show();

        const noBadgeItem = $<HTMLDivElement>(
            html`<div id="badge-" class="badges-list-item-container">\
                <div class="badges-list-item"> </div>\
                <span class="badge-name">${getTranslatedString("none")}</span>\
            </div>`
        );

        noBadgeItem.on("click", () => {
            GameConsole.setBuiltInCVar("cv_loadout_badge", "");
            noBadgeItem.addClass("selected").siblings().removeClass("selected");
        });

        const activeBadge = GameConsole.getBuiltInCVar("cv_loadout_badge");

        const badgeUiCache: Record<ReferenceTo<BadgeDefinition>, JQuery<HTMLDivElement>> = { [""]: noBadgeItem };

        function selectBadge(idString: ReferenceTo<BadgeDefinition>): void {
            badgeUiCache[idString].addClass("selected")
                .siblings()
                .removeClass("selected");
        }

        $("#badges-list").append(
            noBadgeItem,
            ...allowedBadges.map(({ idString }) => {
                // noinspection CssUnknownTarget
                const badgeItem = badgeUiCache[idString] = $<HTMLDivElement>(
                    `<div id="badge-${idString}" class="badges-list-item-container${idString === activeBadge ? " selected" : ""}">\
                        <div class="badges-list-item">\
                            <div style="background-image: url('./img/game/shared/badges/${idString}.svg')"></div>\
                        </div>\
                        <span class="badge-name">${getTranslatedString(idString as TranslationKeys)}</span>\
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
    }

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
            if (!Game.music) return;
            Game.music.volume = value;
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

    // Show a warning if hardware acceleration is not available/supported
    const tmpCanvas = document.createElement("canvas");
    let glContext = tmpCanvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!glContext) {
        $("#splash-hw-acceleration-warning").show();
    } else {
        const loseContext = glContext.getExtension("WEBGL_lose_context");
        if (loseContext) {
            loseContext.loseContext();
        }
        glContext = null;
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
    $("#alt-texture-loading-item").toggle("chrome" in window); // this workaround only helps in chromium based browsers
    addCheckboxListener("#toggle-alt-texture-loading", "cv_alt_texture_loading");
    addCheckboxListener("#toggle-cooler-graphics", "cv_cooler_graphics");

    GameConsole.variables.addChangeListener(
        "cv_cooler_graphics",
        (newVal, oldVal) => {
            if (newVal !== oldVal && !newVal) {
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
            }
        }
    );
    addCheckboxListener("#toggle-ambient-particles", "cv_ambient_particles");

    const { gameUi } = UIManager.ui;

    GameConsole.variables.addChangeListener(
        "cv_draw_hud",
        newVal => {
            gameUi.toggle(newVal);
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
    const updateJoystickInfo = (switchJoysticks: boolean): JQuery => joystickInfo.text(getTranslatedString(switchJoysticks ? "settings_switched_joystick_info" : "settings_normal_joystick_info"));
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
    addCheckboxListener("#toggle-high-res-mobile", "mb_high_res_textures");
    addCheckboxListener("#toggle-antialias-mobile", "mb_antialias");

    function updateUiScale(): void {
        const scale = GameConsole.getBuiltInCVar("cv_ui_scale");

        gameUi.width(window.innerWidth / scale);
        gameUi.height(window.innerHeight / scale);
        gameUi.css("transform", `scale(${scale})`);
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

    const splashUi = $<HTMLInputElement>("#splash-ui");
    // Blur splash screen
    addCheckboxListener(
        "#toggle-blur-splash",
        "cv_blur_splash",
        value => {
            splashUi.toggleClass("blur", value);
        }
    );
    splashUi.toggleClass("blur", GameConsole.getBuiltInCVar("cv_blur_splash"));

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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    function mobileDropItem(button: number, condition: boolean, item?: AmmoDefinition | ArmorDefinition | ScopeDefinition | HealingItemDefinition, slot?: number): void {
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

                const isGrenadeSlot = inventorySlotTypings[slot] === ItemType.Throwable;

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
                        && Game.activePlayer?.activeItem.itemType === ItemType.Throwable
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
                    <img class="item-image" src="./img/game/shared/loot/${scope.idString}.svg" draggable="false">
                    <div class="item-tooltip">${scope.name.split(" ")[0]}</div>
                </div>`
            );

            ele[0].addEventListener("pointerup", () => clearTimeout(dropTimer));

            slotListener(ele, button => {
                const isPrimary = button === 0;
                const isSecondary = button === 2;
                const isTeamMode = Game.teamMode;

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

            if (UI_DEBUG_MODE) ele.show();

            return ele;
        })
    );

    $<HTMLDivElement>("#healing-items-container").append(
        HealingItems.definitions.map(item => {
            const ele = $<HTMLDivElement>(
                html`<div class="inventory-slot item-slot active" id="${item.idString}-slot">
                    <img class="item-image" src="./img/game/shared/loot/${item.idString}.svg" draggable="false">
                    <span class="item-count" id="${item.idString}-count">0</span>
                    <div class="item-tooltip">
                        ${getTranslatedString("tt_restores", {
                    item: `<b>${getTranslatedString(item.idString as TranslationKeys)}</b><br>`,
                    amount: item.restoreAmount.toString(),
                    type: item.healType === HealType.Adrenaline
                        ? getTranslatedString("adrenaline")
                        : getTranslatedString("health")
                })}
                    </div>
                </div>`
            );

            ele[0].addEventListener("pointerup", () => clearTimeout(dropTimer));

            slotListener(ele, button => {
                const isPrimary = button === 0;
                const isSecondary = button === 2;
                const isTeamMode = Game.teamMode;

                if (isPrimary) {
                    if (InputManager.pingWheelActive && Game.teamMode) {
                        InputManager.addAction({
                            type: InputActions.Emote,
                            emote: Emotes.fromString(item.idString)
                        });
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
                <img class="item-image" src="./img/game/shared/loot/${ammo.idString}.svg" draggable="false">
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
            const isTeamMode = Game.teamMode;

            if (isPrimary) {
                if (InputManager.pingWheelActive && Game.teamMode) {
                    InputManager.addAction({
                        type: InputActions.Emote,
                        emote: Emotes.fromString(ammo.idString)
                    });
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
            [$<HTMLDivElement>("#vest-slot"), "vest"]
        ] as const
    ) {
        ele[0].addEventListener("pointerup", () => clearTimeout(dropTimer));

        slotListener(ele, button => {
            const isSecondary = button === 2;
            const shouldDrop = Game.activePlayer && Game.teamMode;

            if (isSecondary && shouldDrop) {
                const item = Game.activePlayer?.getEquipment(type);
                if (item) {
                    InputManager.addAction({
                        type: InputActions.DropItem,
                        item
                    });
                }
            }

            if (shouldDrop !== undefined) {
                mobileDropItem(button, shouldDrop, Game.activePlayer?.getEquipment(type));
            }
        });
    }

    for (const perkSlot of ["#perk-slot-0", "#perk-slot-1", "#perk-slot-2"]) {
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
        $("#tab-mobile").show();

        // Interact message
        ui.interactMsg.on("click", () => {
            InputManager.addAction(UIManager.action.active ? InputActions.Cancel : InputActions.Interact);
        });
        // noinspection HtmlUnknownTarget
        ui.interactKey.html('<img src="./img/misc/tap-icon.svg" alt="Tap">');

        // Active weapon ammo button reloads
        ui.activeAmmo.on("click", () => GameConsole.handleQuery("reload", "never"));

        // Emote button & wheel
        ui.emoteWheel
            .css("top", "50%")
            .css("left", "50%");

        const createEmoteWheelListener = (slot: typeof EMOTE_SLOTS[number], emoteSlot: number): void => {
            $(`#emote-wheel .emote-${slot}`).on("click", () => {
                ui.emoteWheel.hide();
                ui.emoteButton
                    .removeClass("btn-alert")
                    .addClass("btn-primary");
                let clicked = true;

                if (InputManager.pingWheelActive) {
                    const ping = UIManager.mapPings[emoteSlot];

                    setTimeout(() => {
                        let gameMousePosition: Vector;

                        if (MapManager.expanded) {
                            ui.game.one("click", () => {
                                gameMousePosition = InputManager.pingWheelPosition;

                                if (ping && InputManager.pingWheelActive && clicked) {
                                    InputManager.addAction({
                                        type: InputActions.MapPing,
                                        ping,
                                        position: gameMousePosition
                                    });

                                    clicked = false;
                                }
                            });
                        } else {
                            ui.game.one("click", e => {
                                const globalPos = Vec.create(e.clientX, e.clientY);
                                const pixiPos = CameraManager.container.toLocal(globalPos);
                                gameMousePosition = Vec.scale(pixiPos, 1 / PIXI_SCALE);

                                if (ping && InputManager.pingWheelActive && clicked) {
                                    InputManager.addAction({
                                        type: InputActions.MapPing,
                                        ping,
                                        position: gameMousePosition
                                    });

                                    clicked = false;
                                }
                            });
                        }
                    }, 100); // 0.1 second (to wait for the emote wheel)
                } else {
                    const emote = UIManager.emotes[emoteSlot];
                    if (emote) {
                        InputManager.addAction({
                            type: InputActions.Emote,
                            emote
                        });
                    }
                }
            });
        };

        createEmoteWheelListener("top", 0);
        createEmoteWheelListener("right", 1);
        createEmoteWheelListener("bottom", 2);
        createEmoteWheelListener("left", 3);

        $("#mobile-options").show();

        ui.menuButton.on("click", () => ui.gameMenu.fadeToggle(250));

        ui.emoteButton.on("click", () => {
            const { emoteWheelActive } = InputManager;

            InputManager.emoteWheelActive = !emoteWheelActive;

            ui.emoteButton
                .toggleClass("btn-alert", !emoteWheelActive)
                .toggleClass("btn-primary", emoteWheelActive);

            UIManager.ui.emoteWheel.toggle(!emoteWheelActive);
        });

        ui.pingToggle.on("click", () => {
            InputManager.pingWheelActive = !InputManager.pingWheelActive;
            const { pingWheelActive } = InputManager;
            ui.pingToggle
                .toggleClass("btn-danger", pingWheelActive)
                .toggleClass("btn-primary", !pingWheelActive);

            UIManager.updateEmoteWheel();
        });
    }

    // Prompt when trying to close the tab while playing
    window.addEventListener("beforeunload", (e: Event) => {
        if (
            ui.canvas.hasClass("active")
            && GameConsole.getBuiltInCVar("cv_leave_warning")
            && !forceReload
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
                `linear-gradient(to right, #ff7500 0%, #ff7500 ${x}%, #f8f9fa ${x}%, #f8f9fa 100%)`
            )
            .siblings(".range-input-value")
            .text(
                element.id !== "slider-joystick-size" && element.id !== "slider-gyro-angle"
                    ? `${Math.round(value * 100)}%`
                    : value
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

    continueBtn.on("click", () => {
        ui.warningModal.hide();
    });

    // Makes social buttons unclickable for 1.5 seconds after disconnecting, to prevent accidental clicks
    $(".btn-social").on("click", e => {
        if (lastDisconnectTime && Date.now() - lastDisconnectTime < 1500) {
            e.preventDefault();
        }
    });
}

//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣠⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣄⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣤⣶⣾⣿⣿⡿⠟⠛⠛⠛⠛⠛⠻⠿⣿⣿⣿⣿⣿⣷⣶⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣶⣿⣿⣿⣿⠟⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⢿⣿⣿⣿⣿⣿⣿⣶⣤⣄⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣠⣶⣿⣿⣿⣿⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⣿⣿⣷⡄⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⣼⡿⣿⣿⣿⣿⣿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⢻⣿⡟⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠘⢿⣼⡟⢻⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠳⠆⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⡟⠁⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⢈⣻⣷⣾⣿⡇⠀⠀⠀⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⢻⣿⣿⣿⡿⢋⡀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣿⠉⠙⢿⣿⡇⠀⠀⠀⠈⢻⣿⣷⣶⣄⣠⠀⠀⠀⣀⣠⣾⣿⣿⡯⠉⠁⠀⠀⠀⢻⣿⣿⡿⠛⢿⡆⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣟⠀⠘⢾⡿⠀⠀⠀⢀⣠⣤⣶⣿⣿⣿⠟⠀⠀⣿⣿⣿⣿⣿⣷⣦⣄⡀⠀⠀⠀⢸⣿⣯⠀⣶⡆⣿⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣿⠈⠀⣼⠃⠀⠀⠘⠋⠁⣈⣹⣿⣿⠏⠀⠀⠀⣿⣿⣏⠀⣈⣁⣈⡝⠻⠿⡆⠀⠰⣿⣏⠈⣿⢷⡟⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠰⡇⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⢸⣽⣿⣆⠀⠀⠀⠀⠀⠀⠁⠀⢸⣿⣿⡆⣏⣿⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⢱⡀⠀⠀⠀⠀⠀⠀⠀⠀⣀⠀⠀⠀⠀⠀⠀⢿⣿⡄⠀⠀⠀⠀⠀⠀⠀⢸⣿⡟⣿⣿⡇⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠙⣄⠀⠀⣸⡄⠀⠀⠀⠀⠀⢀⡞⠁⣤⣤⣀⣠⣤⣀⣄⣸⣿⣦⡀⠀⠀⠀⠀⠀⢸⣿⣄⠟⣼⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠹⠷⠶⠻⡇⠀⠀⠀⠀⠀⠟⠀⠀⠀⠀⠉⠙⠿⠿⣿⠉⢀⡿⣷⡀⢸⣇⢰⠀⠸⣿⣡⡾⠃⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⡇⠀⠀⠀⠀⠀⣀⠀⠀⠀⠀⠐⠛⠀⠀⠁⠀⠀⢰⡟⢷⢸⣿⢀⠀⠀⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⡇⠀⠀⠀⠀⣼⡿⠓⠶⠒⠛⠛⠉⠙⠛⠻⠻⠿⣿⡇⠀⢸⡟⠀⠀⣠⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢘⡇⠒⠀⠀⠀⠈⠀⠀⠀⠀⠀⣶⠶⠶⠶⠶⠀⢀⣿⠁⢠⡾⠁⠀⣰⣿⠉⢇⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⡷⠶⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠁⠀⠿⠃⢀⣴⡟⢹⡄⠘⣧⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⠞⢁⡆⠀⠐⢢⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⠒⠀⠀⣠⣴⣿⡟⣰⡿⣡⡄⠈⢣⡀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⣀⣠⡤⠖⠒⠋⠁⠀⠘⣷⠀⠀⠀⠙⠦⣄⣀⣀⣀⣀⣀⣤⣶⣿⣦⣤⣴⣶⣿⡿⢋⣼⠟⢁⣿⠁⣠⣤⡉⠀⠀⠀⠀⠀⠀
//  ⣠⠤⠔⠒⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⢹⡆⠀⠀⠀⠀⠉⠻⣿⣿⣿⣯⣥⣤⣤⣶⣿⣿⡿⠋⣠⡿⠁⠀⠀⠁⠲⢈⣿⣿⣷⣤⣄⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢦⡀⠤⡄⠀⠀⠀⠀⠉⡻⢿⣧⣿⣿⡟⢋⣤⡾⠋⠀⠀⠀⠀⠘⠛⢺⣿⣿⣿⣿⣿⣷⣤⣤
//  ⡀⠀⣀⣀⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢦⣈⣳⣦⣤⣤⣿⣿⣿⠟⢋⣡⣶⣿⠋⢀⠀⠀⠀⡀⠀⠀⢀⡌⠘⣿⣿⣿⣿⣿⣿⣿
//
