import $ from "jquery";

import core from "./core";

import { type MenuScene } from "./scenes/menuScene";
import { type GameScene } from "./scenes/gameScene";
import { localStorageInstance } from "./utils/localStorageHandler";

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

    usernameField.on("input", (): void => {
        const value = usernameField.val() as string | undefined;

        if (value !== undefined && value.trim().length > 0) {
            localStorageInstance.update({ playerName: value });
        }
    });

    // todo find a better way to do these two handlers
    $("#btn-dropdown-more").on("click", ev => {
        dropdown.toggle();
        ev.stopPropagation();
    });
    body.on("click", (): void => { dropdown.hide(); });

    $("#btn-quit-game").on("click", (): void => { core.game?.endGame(); });
    $("#btn-play-again").on("click", (): void => { core.game?.endGame(); });

    $("#btn-resume-game").on("click", () => gameMenu.hide());

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape" && $("canvas").hasClass("active")) {
            gameMenu.fadeToggle(250);
            settingsMenu.hide();
        }
    });

    $("#btn-settings").click((): void => {
        settingsMenu.fadeToggle(250);
        settingsMenu.removeClass("in-game");
    });

    $("#btn-settings-game").click((): void => {
        gameMenu.hide();
        settingsMenu.fadeToggle(250);
        settingsMenu.addClass("in-game");
    });

    $("#close-settings").click((): void => {
        settingsMenu.fadeOut(250);
    });

    // load settings values and event listeners

    // music volule
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

    // rotation smothing toggle
    $("#toggle-rotation-smoothing").on("input", function(this: HTMLInputElement) {
        localStorageInstance.update({ rotationSmoothing: this.checked });
    }).prop("checked", localStorageInstance.config.rotationSmoothing);

    // movement smothing toggle
    $("#toggle-movement-smoothing").on("input", function(this: HTMLInputElement) {
        localStorageInstance.update({ movementSmoothing: this.checked });
    }).prop("checked", localStorageInstance.config.movementSmoothing);

    // Switch weapon slots by clicking
    for (let i = 0; i < 3; i++) {
        $(`#weapon-slot-${i + 1}`).on("pointerdown", (): void => {
            if (core.game !== undefined) {
                core.game.playerManager.activeItemIndex = i;
                core.game.playerManager.dirty.inputs = true;
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
