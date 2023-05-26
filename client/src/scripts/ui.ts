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
        } else if (target?.id === "btn-controls-game") {
            $("#game-menu").hide();
            $("#controls-menu").show();
        } else if (target?.id === "btn-controls-quit-menu"){
            $("#controls-menu").hide();
            $("#game-menu").show();
        } else if (target?.id === "btn-controls-resume-game"){
            $("#controls-menu").hide();
        } else if (target?.id === "btn-save-inputs"){
            $("#controls-menu").hide();
            const up_input = $("#key-input-up").val();
            const down_input = $("#key-input-down").val();
            const left_input = $("#key-input-left").val();
            const right_input = $("#key-input-right").val();
            (core.phaser?.scene.getScene("game") as GameScene).changeKey(up_input,"up");
            (core.phaser?.scene.getScene("game") as GameScene).changeKey(down_input,"down");
            (core.phaser?.scene.getScene("game") as GameScene).changeKey(left_input,"left");
            (core.phaser?.scene.getScene("game") as GameScene).changeKey(right_input,"right");
        }
    });

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape" && $("canvas").hasClass("active")) {
            $("#game-menu").toggle();
            $("#controls-menu").hide();
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
