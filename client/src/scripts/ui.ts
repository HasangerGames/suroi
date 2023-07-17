
import $ from "jquery";

import core from "./core";

import { type MenuScene } from "./scenes/menuScene";
import { type GameScene } from "./scenes/gameScene";
import { type Config, localStorageInstance } from "./utils/localStorageHandler";
import { HIDE_DEV_REGION } from "./utils/constants";
import { type MinimapScene } from "./scenes/minimapScene";
import { requestFullscreen } from "./utils/misc";
import { INVENTORY_MAX_WEAPONS } from "../../../common/src/constants";
import { Scopes } from "../../../common/src/definitions/scopes";
import { HealType, HealingItems } from "../../../common/src/definitions/healingItems";
import { Ammos } from "../../../common/src/definitions/ammos";

$((): void => {
    const dropdown = {
        main: $("#splash-more .dropdown-content"),
        caret: $("#btn-dropdown-more i"),
        active: false,
        show() {
            this.active = true;
            this.main.addClass("active");
            this.caret.removeClass("fa-caret-down").addClass("fa-caret-up");
        },
        hide() {
            this.active = false;
            this.main.removeClass("active");
            this.caret.addClass("fa-caret-down").removeClass("fa-caret-up");
        },
        toggle() {
            this.active
                ? this.hide()
                : this.show();
        }
    };

    const body = $(document.body);
    const usernameField = $("#username-input");

    const Youtubers = [
        {
            name: "Summit",
            link: "https://www.youtube.com/@SummitNewsNetwork"
        },
        {
            name: "123OP",
            link: "https://www.youtube.com/@123op."
        },
        {
            name: "Gonester",
            link: "https://www.youtube.com/@gonester"
        },
        {
            name: "TEAMFIGHTER 27",
            link: "https://www.youtube.com/@teamfighter279"
        }
    ];

    const youtuber = Youtubers[Math.floor(Math.random() * Youtubers.length)];
    $("#youtube-feature-name").text(youtuber.name);
    $("#youtube-featured-content").attr("href", youtuber.link);

    const TwitchStreamers = [
        {
            name: "iMoRTaL_Mafia",
            link: "https://www.twitch.tv/videos/1854751139"
        }
    ];
    const streamer = TwitchStreamers[Math.floor(Math.random() * TwitchStreamers.length)];

    $("#twitch-featured-name").text(streamer.name);
    $("#twitch-featured-content").attr("href", streamer.link);

    $("#splash-rotate-message").toggle(window.innerWidth < window.innerHeight);
    $(window).on("resize", () => {
        $("#splash-rotate-message").toggle(window.innerWidth < window.innerHeight);
    });

    const gameMenu = $("#game-menu");
    const settingsMenu = $("#settings-menu");

    usernameField.val(localStorageInstance.config.playerName);
    usernameField.on("input", () => {
        localStorageInstance.update({ playerName: usernameField.val() as string });
    });

    const serverSelect = $<HTMLSelectElement>("#server-select");

    // Select region
    serverSelect.val(localStorageInstance.config.region);
    serverSelect.on("change", () => {
        const value = serverSelect.val() as string | undefined;

        if (value !== undefined) {
            localStorageInstance.update({ region: value });
        }
    });

    // Show dev region if enabled
    if (!HIDE_DEV_REGION) {
        $('option[value="dev"]').show();
        serverSelect.val("dev");
    }

    // todo find a better way to do these two handlers
    $("#btn-dropdown-more").on("click", ev => {
        dropdown.toggle();
        ev.stopPropagation();
    });

    body.on("click", () => { dropdown.hide(); });

    $("#btn-quit-game").on("click", () => { core.game?.endGame(); });
    $("#btn-play-again").on("click", () => { core.game?.endGame(); });

    $("#btn-resume-game").on("click", () => gameMenu.hide());
    $("#btn-fullscreen").on("click", () => {
        requestFullscreen();
        $("#game-menu").hide();
    });

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape" && $("canvas").hasClass("active")) {
            gameMenu.fadeToggle(250);
            settingsMenu.hide();
        }
    });

    $("#btn-settings").on("click", () => {
        settingsMenu.fadeToggle(250);
        settingsMenu.removeClass("in-game");
    });

    $("#btn-settings-game").on("click", () => {
        gameMenu.hide();
        settingsMenu.fadeToggle(250);
        settingsMenu.addClass("in-game");
    });

    $("#close-settings").on("click", () => {
        settingsMenu.fadeOut(250);
    });

    // Disable context menu
    $("#game-ui").on("contextmenu", e => { e.preventDefault(); });

    // load settings values and event listeners

    function addSliderListener(elementId: string, settingName: keyof Config, callback?: (value: number) => void): void {
        const element = $(elementId)[0] as HTMLInputElement;
        if (!element) console.error("Invalid element id");

        element.addEventListener("input", () => {
            const value = Number(element.value);
            const obj: Partial<Config> = {};
            (obj[settingName] as number) = value;
            localStorageInstance.update(obj);

            callback?.(value);
        });

        element.value = (localStorageInstance.config[settingName] as number).toString();
    }

    function addCheckboxListener(elementId: string, settingName: keyof Config, callback?: (value: boolean) => void): void {
        const element = $(elementId)[0] as HTMLInputElement;

        element.addEventListener("input", () => {
            const value = element.checked;
            const obj: Partial<Config> = {};
            (obj[settingName] as boolean) = value;
            localStorageInstance.update(obj);

            callback?.(value);
        });

        element.checked = localStorageInstance.config[settingName] as boolean;
    }

    // music volume
    addSliderListener("#slider-music-volume", "musicVolume", (value: number) => {
        const volume = value * localStorageInstance.config.masterVolume;
        core.phaser?.scene.getScene<MenuScene>("menu").setMusicVolume(volume);
    });

    // sfx volume
    addSliderListener("#slider-sfx-volume", "sfxVolume", (value: number) => {
        (core.phaser?.scene.getScene("game") as GameScene).volume = value * localStorageInstance.config.masterVolume;
    });

    // master volume
    addSliderListener("#slider-master-volume", "masterVolume", (value: number) => {
        const volume = value * localStorageInstance.config.masterVolume;
        (core.phaser?.scene.getScene("game") as GameScene).volume = localStorageInstance.config.sfxVolume * volume;
        core.phaser?.scene.getScene<MenuScene>("menu").setMusicVolume(localStorageInstance.config.musicVolume * volume);
    });

    // camera shake
    addCheckboxListener("#toggle-camera-shake", "cameraShake");

    // fps toggle
    addCheckboxListener("#toggle-fps", "showFPS", (value: boolean) => {
        $("#fps-counter").toggle(value);
    });
    $("#fps-counter").toggle(localStorageInstance.config.showFPS);

    // ping toggle
    addCheckboxListener("#toggle-ping", "showPing", (value: boolean) => {
        $("#ping-counter").toggle(value);
    });
    $("#ping-counter").toggle(localStorageInstance.config.showPing);

    // client-side prediction toggle
    addCheckboxListener("#toggle-client-side-prediction", "clientSidePrediction");

    // text kill feed toggle
    addCheckboxListener("#toggle-text-kill-feed", "textKillFeed");

    // rotation smoothing toggle
    addCheckboxListener("#toggle-rotation-smoothing", "rotationSmoothing");

    // movement smoothing toggle
    addCheckboxListener("#toggle-movement-smoothing", "movementSmoothing");

    // mobile controls stuff
    addCheckboxListener("#toggle-mobile-controls", "mobileControls");
    addSliderListener("#slider-joystick-size", "joystickSize");
    addSliderListener("#slider-joystick-transparency", "joystickTransparency");

    // Minimap stuff
    addSliderListener("#slider-minimap-transparency", "minimapTransparency", () => {
        (core.phaser?.scene.getScene("minimap") as MinimapScene)?.updateTransparency();
    });

    addSliderListener("#slider-big-map-transparency", "bigMapTransparency", () => {
        (core.phaser?.scene.getScene("minimap") as MinimapScene)?.updateTransparency();
    });

    addCheckboxListener("#toggle-hide-minimap", "minimapMinimized", () => {
        (core.phaser?.scene.getScene("minimap") as MinimapScene)?.toggleMiniMap(true);
    });

    // Leave warning
    addCheckboxListener("#toggle-leave-warning", "leaveWarning");

    // Switch weapon slots by clicking
    for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
        const slotElement = $(`#weapon-slot-${i + 1}`);
        slotElement[0].addEventListener("pointerdown", (e: PointerEvent): void => {
            if (core.game !== undefined && slotElement.hasClass("has-item")) {
                e.stopImmediatePropagation();
                if (e.button === 0) core.game.playerManager.equipItem(i);
                else if (e.button === 2) core.game.playerManager.dropItem(i);
            }
        });
    }

    // Generate the UI for scopes, healing items and ammos
    for (const scope of Scopes) {
        $("#scopes-container").append(`
        <div class="inventory-slot item-slot" id="${scope.idString}-slot" style="display: none;">
            <img class="item-image" src="/img/game/loot/${scope.idString}.svg" draggable="false">
            <div class="item-tooltip">${scope.name.split(" ")[0]}</div>
        </div>`);

        $(`#${scope.idString}-slot`)[0].addEventListener("pointerdown", (e: PointerEvent) => {
            if (core.game) {
                core.game.playerManager.useItem(scope.idString);
                e.stopPropagation();
            }
        });
    }

    for (const item of HealingItems) {
        $("#healing-items-container").append(`
        <div class="inventory-slot item-slot" id="${item.idString}-slot">
            <img class="item-image" src="/img/game/loot/${item.idString}.svg" draggable="false">
            <span class="item-count" id="${item.idString}-count">0</span>
            <div class="item-tooltip">
                ${item.name}
                <br>
                Restores ${item.restoreAmount}${item.healType === HealType.Adrenaline ? "% adrenaline" : " health"}
            </div>
        </div>`);

        $(`#${item.idString}-slot`)[0].addEventListener("pointerdown", (e: PointerEvent) => {
            if (core.game) {
                core.game.playerManager.useItem(item.idString);
                e.stopPropagation();
            }
        });
    }

    for (const ammo of Ammos) {
        if (ammo.ephemeral === true) continue;

        $("#ammo-container").append(`
        <div class="inventory-slot item-slot ammo-slot" id="${ammo.idString}-slot">
            <img class="item-image" src="/img/game/loot/${ammo.idString}.svg" draggable="false">
            <span class="item-count" id="${ammo.idString}-count">0</span>
        </div>`);
    }

    // Hide mobile settings on desktop
    $("#tab-mobile").toggle(core.game?.playerManager.isActuallyMobile);

    // Event listener for Interact button
    if (core.game?.playerManager.isMobile) {
        $("#interact-message").on("click", () => {
            if (core.game !== undefined) {
                core.game.playerManager.interact();
            }
        });
        $("#btn-reload").show().on("click", () => {
            if (core.game !== undefined) {
                core.game.playerManager.reload();
            }
        });
        $("#btn-game-menu").show().on("click", () => {
            $("#game-menu").toggle();
        });
    }

    // Prompt when trying to close the tab while playing
    window.addEventListener("beforeunload", (e: Event) => {
        if ($("canvas").hasClass("active") && localStorageInstance.config.leaveWarning && !core.game?.gameOver) {
            e.preventDefault();
        }
    });

    // Hack to style range inputs background and add a label with the value :)
    function updateRangeInput(element: HTMLInputElement): void {
        const value = Number(element.value);
        const max = Number(element.max);
        const min = Number(element.min);
        const x = (value - min) / (max - min) * 100;
        $(element).css("--background", `linear-gradient(to right, #ff7500 0%, #ff7500 ${x}%, #f8f9fa ${x}%, #f8f9fa 100%)`);
        $(element).siblings(".range-input-value").text(element.id !== "slider-joystick-size" ? `${value * 100}%` : value);
    }

    $("input[type=range]").on("input", (e) => {
        updateRangeInput(e.target as HTMLInputElement);
    }).each((_i, element) => { updateRangeInput(element as HTMLInputElement); });

    $(".tab").on("click", ev => {
        const tab = $(ev.target);

        tab.siblings().removeClass("active");

        tab.addClass("active");

        const tabContent = $(`#${ev.target.id}-content`);

        tabContent.siblings().removeClass("active");
        tabContent.siblings().hide();

        tabContent.addClass("active");
        tabContent.show();
    });
});
