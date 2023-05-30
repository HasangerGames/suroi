import $ from "jquery";

import core from "./core";

import { type MenuScene } from "./scenes/menuScene";
import { type GameScene } from "./scenes/gameScene";
import { localStorageInstance } from "./utils/localStorageHandler";

$(() => {
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
    body.on("click", () => { dropdown.hide(); });

    $("#btn-quit-game").on("click", () => { window.location.reload(); });
    $("#btn-play-again").on("click", () => { window.location.reload(); });

    $("#btn-resume-game").on("click", () => gameMenu.hide());

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape" && $("canvas").hasClass("active")) {
            gameMenu.fadeToggle(250);
            settingsMenu.hide();
        }
    });

    $("#btn-settings").click(() => {
        settingsMenu.fadeToggle(250);
        settingsMenu.removeClass("in-game");
    });

    $("#btn-settings-game").click(() => {
        gameMenu.hide();
        settingsMenu.fadeToggle(250);
        settingsMenu.addClass("in-game");
    });

    $("#close-settings").click(() => {
        settingsMenu.fadeOut(250);
    });

    // load settings values and event listeners

    $("#slider-master-volume").val(localStorageInstance.config.masterVolume);
    $("#slider-sfx-volume").val(localStorageInstance.config.sfxVolume);
    $("#slider-music-volume").val(localStorageInstance.config.musicVolume);
    $("#toggle-camera-shake").val(localStorageInstance.config.cameraShake.toString());

    $("#slider-music-volume").on("input", function(this: HTMLInputElement) {
        const volume = Number(this.value) * localStorageInstance.config.masterVolume;
        core.phaser?.scene.getScene<MenuScene>("menu").setMusicVolume(volume);
        localStorageInstance.update({ musicVolume: volume });
    });

    $("#slider-sfx-volume").on("input", function(this: HTMLInputElement) {
        const volume = Number(this.value) * localStorageInstance.config.masterVolume;
        (core.phaser?.scene.getScene("game") as GameScene).volume = volume;
        localStorageInstance.update({ sfxVolume: volume });
    });

    $("#slider-master-volume").on("input", function(this: HTMLInputElement) {
        const volume = Number(this.value);
        (core.phaser?.scene.getScene("game") as GameScene).volume = localStorageInstance.config.sfxVolume * volume;
        core.phaser?.scene.getScene<MenuScene>("menu").setMusicVolume(volume);
        localStorageInstance.update({ masterVolume: volume });
    });

    $("#toggle-camera-shake").on("input", function(this: HTMLInputElement) {
        localStorageInstance.update({ cameraShake: this.checked });
    });

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
