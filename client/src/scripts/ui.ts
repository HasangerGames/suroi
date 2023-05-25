import $ from "jquery";

import core from "./core";

import { type MenuScene } from "./scenes/menuScene";
import { type GameScene } from "./scenes/gameScene";
import { localStorageInstance } from "./utils/localStorageHandler";

$(() => {
    // Enable splash "more" dropdown.
    const dropdownCaret = $("#btn-dropdown-more i");
    const dropdown = $("#splash-more .dropdown-content");
    const body = $(document.body);
    const usernameField = $("#username-input");

    usernameField.val(localStorageInstance.config.playerName);

    usernameField.on("input", (): void => {
        if (usernameField.val() !== undefined && (usernameField.val() as string).trim().length > 0) {
            localStorageInstance.update({ playerName: usernameField.val() as string });
        }
    });

    $("#slider-master-volume").val(localStorageInstance.config.masterVolume);
    $("#slider-sound-volume").val(localStorageInstance.config.musicVolume);

    body.on("click", (e: JQuery.ClickEvent): void => {
        const target = e.target as HTMLElement | null;

        if (target?.id === "btn-dropdown-more") {
            if (dropdown.hasClass("active")) {
                dropdown.removeClass("active");
                dropdownCaret.removeClass("fa-caret-up").addClass("fa-caret-down");
            } else {
                dropdown.addClass("active");
                dropdownCaret.removeClass("fa-caret-down").addClass("fa-caret-up");
            }
        } else {
            dropdown.removeClass("active");
            dropdownCaret.removeClass("fa-caret-up").addClass("fa-caret-down");
        }

        if (target?.id === "btn-quit-game" || target?.id === "btn-play-again") {
            // something like this Game.endGame();
            // $("#game-menu").hide();
            window.location.reload(); // TODO Find a more elegant solution
        } else if (target?.id === "btn-resume-game") {
            $("#game-menu").hide();
        }
    });

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape" && $("canvas").hasClass("active")) {
            $("#game-menu").toggle();
        }
    });

    body.on("change", (e: JQuery.ChangeEvent) => {
        const target = e.target as HTMLInputElement;

        if (target?.id === "slider-sound-volume") {
            const volume = Number(target.value);
            core.phaser?.scene.getScene<MenuScene>("menu").setMusicVolume(volume);
            localStorageInstance.update({ musicVolume: volume });
        } else if (target?.id === "slider-master-volume") {
            const volume = Number(target.value);
            (core.phaser?.scene.getScene("game") as GameScene).volume = volume;
            localStorageInstance.update({ masterVolume: volume });
        }
    });
});
