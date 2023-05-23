import $ from "jquery";
import Phaser from "phaser";

import core from "./core";
import { Game } from "./game";

import { GameScene } from "./scenes/gameScene";
import { MenuScene } from "./scenes/menuScene";

declare const API_URL: string;

$(() => {
    // Show "Connection lost." message if the socket disconnects
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("connectionLost")) {
        $("#splash-server-message-text").html("Connection lost.<br>The server may have restarted.");
        $("#splash-server-message").show();
        window.history.replaceState({}, "", "/");
    }

    // Join server when play button is clicked
    const playSoloBtn: JQuery = $("#btn-play-solo");

    const enablePlayButton = (): void => {
        playSoloBtn.removeClass("btn-disabled");
        playSoloBtn.prop("disabled", false);
        playSoloBtn.text("Play Solo");
    };

    playSoloBtn.on("click", (): void => {
        playSoloBtn.addClass("btn-disabled");
        playSoloBtn.prop("disabled", true);
        playSoloBtn.text("Connecting...");
        void $.get(`${API_URL}/getGame`, (data: { addr: string }) => {
            core.game?.connect(`${data.addr}?name=${$("#username-input").val() as string}`);
            enablePlayButton();
        }).fail((): void => {
            $("#splash-server-message-text").text("Error finding game.");
            $("#splash-server-message").show();
            enablePlayButton();
        });
    });

    // Initialize the game object
    core.game = new Game();

    // Create the Phaser Game
    const forceRenderer: string | null = new URLSearchParams(window.location.search).get("forceRenderer");
    core.phaser = new Phaser.Game({
        type: forceRenderer === "canvas" ? Phaser.CANVAS : forceRenderer === "webgl" ? Phaser.WEBGL : Phaser.AUTO,
        scene: [MenuScene, GameScene],
        backgroundColor: "#49993e",
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    });
});
