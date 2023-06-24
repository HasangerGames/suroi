import $ from "jquery";

import core from "./core";

import { type MenuScene } from "./scenes/menuScene";
import { type GameScene } from "./scenes/gameScene";
import { localStorageInstance } from "./utils/localStorageHandler";
import { HIDE_DEV_REGION } from "./utils/constants";

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

    const gameMenu = $("#game-menu");
    const settingsMenu = $("#settings-menu");

    usernameField.val(localStorageInstance.config.playerName);
    usernameField.on("input", () => {
        const value = usernameField.val() as string | undefined;

        if (value !== undefined && value.trim().length > 0) {
            localStorageInstance.update({ playerName: value });
        }
    });

    const serverSelect: JQuery<HTMLSelectElement> = $("#server-select");

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

    // music volume
    $("#slider-music-volume").on("input", function(this: HTMLInputElement) {
        const volume = Number(this.value) * localStorageInstance.config.masterVolume;
        core.phaser?.scene.getScene<MenuScene>("menu").setMusicVolume(volume);
        localStorageInstance.update({ musicVolume: volume });
    }).val(localStorageInstance.config.musicVolume);

    // sfx volume
    $("#slider-sfx-volume").on("input", function(this: HTMLInputElement) {
        const volume = Number(this.value) * localStorageInstance.config.masterVolume;
        (core.phaser?.scene.getScene("game") as GameScene).volume = volume;
        localStorageInstance.update({ sfxVolume: volume });
    }).val(localStorageInstance.config.sfxVolume);

    // master volume
    $("#slider-master-volume").on("input", function(this: HTMLInputElement) {
        const volume = Number(this.value);
        (core.phaser?.scene.getScene("game") as GameScene).volume = localStorageInstance.config.sfxVolume * volume;
        core.phaser?.scene.getScene<MenuScene>("menu").setMusicVolume(volume);
        localStorageInstance.update({ masterVolume: volume });
    }).val(localStorageInstance.config.masterVolume);

    // camera shake
    $("#toggle-camera-shake").on("input", function(this: HTMLInputElement) {
        localStorageInstance.update({ cameraShake: this.checked });
    }).prop("checked", localStorageInstance.config.cameraShake);

    // fps toggle
    $("#toggle-fps").on("input", function(this: HTMLInputElement) {
        localStorageInstance.update({ showFPS: this.checked });
        $("#fps-counter").toggle(this.checked);
    }).prop("checked", localStorageInstance.config.showFPS);
    $("#fps-counter").toggle(localStorageInstance.config.showFPS);

    // ping toggle
    $("#toggle-ping").on("input", function(this: HTMLInputElement) {
        localStorageInstance.update({ showPing: this.checked });
        $("#ping-counter").toggle(this.checked);
    }).prop("checked", localStorageInstance.config.showPing);
    $("#ping-counter").toggle(localStorageInstance.config.showPing);

    // rotation smoothing toggle
    $("#toggle-rotation-smoothing").on("input", function(this: HTMLInputElement) {
        localStorageInstance.update({ rotationSmoothing: this.checked });
    }).prop("checked", localStorageInstance.config.rotationSmoothing);

    // movement smothing toggle
    $("#toggle-movement-smoothing").on("input", function(this: HTMLInputElement) {
        localStorageInstance.update({ movementSmoothing: this.checked });
    }).prop("checked", localStorageInstance.config.movementSmoothing);

    // mobile controls toggle
    $("#toggle-mobile-controls").on("input", function(this: HTMLInputElement) {
        localStorageInstance.update({ mobileControls: this.checked });
        location.reload();
    }).prop("checked", localStorageInstance.config.mobileControls);

    // Switch weapon slots by clicking
    for (let i = 0; i < 3; i++) {
        const slotElement = $(`#weapon-slot-${i + 1}`);
        slotElement[0].addEventListener("pointerdown", (e: PointerEvent): void => {
            if (core.game !== undefined && slotElement.hasClass("has-item")) {
                e.stopImmediatePropagation();
                if (e.button === 0) core.game.playerManager.equipItem(i);
                else if (e.button === 2) core.game.playerManager.dropItem(i);
            }
        });
    }

    // Hide mobile settings on desktop
    $("#tab-mobile").toggle(core.game?.playerManager.isMobile);

    // Event listener for Interact button
    if (core.game?.playerManager.isMobile) {
        $("#btn-interact").show().on("click", () => {
            if (core.game !== undefined) {
                core.game.playerManager.interact();
            }
        });
        $("#btn-reload").show().on("click", () => {
            if (core.game !== undefined) {
                core.game.playerManager.reload();
            }
        });
    }

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
