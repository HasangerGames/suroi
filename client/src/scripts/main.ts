import $ from "jquery";
import Phaser from "phaser";

import core from "./core";
import { Game } from "./game";

import { GameScene } from "./scenes/gameScene";
import { MenuScene } from "./scenes/menuScene";
import { MinimapScene } from "./scenes/minimapScene";
import { GRASS_COLOR } from "./utils/constants";

import { setupInputs } from "./utils/inputManager";
import { localStorageInstance } from "./utils/localStorageHandler";

declare const API_URL: string;

const playSoloBtn: JQuery = $("#btn-play-solo");

export function enablePlayButton(): void {
    playSoloBtn.removeClass("btn-disabled");
    playSoloBtn.prop("disabled", false);
    playSoloBtn.text("Play Solo");
}

$(() => {
    // Join server when play button is clicked
    playSoloBtn.on("click", () => {
        playSoloBtn.addClass("btn-disabled");
        playSoloBtn.prop("disabled", true);
        playSoloBtn.html('<span style="position: relative; bottom: 1px;"><div class="spin"></div> Connecting...</span>');
        void $.get(`${API_URL}/getGame?region=${$("#server-select").val() as string}`, (data: { success: boolean, address: string, gameID: number }) => {
            if (data.success) {
                const devPass = localStorageInstance.config.devPassword;
                const nameColor = localStorageInstance.config.nameColor;
                const lobbyClearing = localStorageInstance.config.lobbyClearing;
                let address = `${data.address}/play?gameID=${data.gameID}&name=${encodeURIComponent($("#username-input").val() as string)}`;

                if (devPass) address += `&devPassword=${devPass}`;
                if (nameColor) address += `&nameColor=${nameColor}`;
                if (lobbyClearing) address += "&lobbyClearing";
                core.game?.connect(address);
                $("#splash-server-message").hide();
            } else {
                $("#splash-server-message-text").html("Error joining game.<br>Please try again in 30 seconds.");
                $("#splash-server-message").show();
                enablePlayButton();
            }
        }).fail(() => {
            $("#splash-server-message-text").html("Error finding game.<br>Please try again.");
            $("#splash-server-message").show();
            enablePlayButton();
        });
    });

    const params = new URLSearchParams(window.location.search);

    const nameColor = params.get("nameColor");
    if (nameColor) {
        localStorageInstance.update({ nameColor });
    }

    const lobbyClearing = params.get("lobbyClearing");
    if (lobbyClearing !== undefined) {
        localStorageInstance.update({ lobbyClearing: lobbyClearing !== null });
    }

    const devPassword = params.get("devPassword");
    if (devPassword) {
        localStorageInstance.update({ devPassword });
        location.search = "";
    }

    // Initialize the game object
    core.game = new Game();

    // Create the Phaser Game
    // const forceRenderer: string | null = new URLSearchParams(window.location.search).get("forceRenderer");
    core.phaser = new Phaser.Game({
        // type: forceRenderer === "canvas" ? Phaser.CANVAS : forceRenderer === "webgl" ? Phaser.WEBGL : Phaser.AUTO,
        type: Phaser.WEBGL,
        scene: [MenuScene, GameScene, MinimapScene],
        backgroundColor: GRASS_COLOR,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            parent: $("#game-ui")[0]
        }
    });
    setupInputs(core.game);
});
