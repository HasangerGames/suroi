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
    const controlsMenu = $("#controls-menu");

    usernameField.val(localStorageInstance.config.playerName);

    usernameField.on("input", (): void => {
        const value = usernameField.val() as string | undefined;

        if (value !== undefined && value.trim().length > 0) {
            localStorageInstance.update({ playerName: value });
        }
    });

    $("#slider-master-volume").val(localStorageInstance.config.masterVolume);
    $("#slider-sound-volume").val(localStorageInstance.config.musicVolume);

    // todo find a better way to do these two handlers
    $("#btn-dropdown-more").on("click", ev => {
        dropdown.toggle();
        ev.stopPropagation();
    });
    body.on("click", () => { dropdown.hide(); });

    $("#btn-quit-game").on("click", () => { window.location.reload(); });
    $("#btn-play-again").on("click", () => { window.location.reload(); });

    $("#btn-resume-game").on("click", () => gameMenu.hide());
    $("#btn-controls-game").on("click", (): void => {
        gameMenu.hide();
        controlsMenu.show();
    });
    $("#btn-controls-quit-menu").on("click", (): void => {
        gameMenu.show();
        controlsMenu.hide();
    });
    $("#btn-controls-resume-game").on("click", () => controlsMenu.hide());
    $("#btn-save-inputs").on("click", () => {
        //fixme
        // controlsMenu.hide();
        // const upInput = $<HTMLInputElement>("#key-input-up").val() as string;
        // const downInput = $<HTMLInputElement>("#key-input-down").val() as string;
        // const leftInput = $<HTMLInputElement>("#key-input-left").val() as string;
        // const rightInput = $<HTMLInputElement>("#key-input-right").val() as string;

        // const scene = core.phaser?.scene.getScene("game") as GameScene;

        // scene.changeKey(upInput, "up");
        // scene.changeKey(downInput, "down");
        // scene.changeKey(leftInput, "left");
        // scene.changeKey(rightInput, "right");
    });

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape" && $("canvas").hasClass("active")) {
            $("#game-menu").toggle();
            $("#controls-menu").hide();
        }
    });

    $("#slider-sound-volume").on("change", function(this: HTMLInputElement) {
        const volume = Number(this.value);
        core.phaser?.scene.getScene<MenuScene>("menu").setMusicVolume(volume);
        localStorageInstance.update({ musicVolume: volume });
    });

    $("#slider-master-volume").on("change", function(this: HTMLInputElement) {
        const volume = Number(this.value);
        (core.phaser?.scene.getScene("game") as GameScene).volume = volume;
        localStorageInstance.update({ masterVolume: volume });
    });
});
