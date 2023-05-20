import $ from "jquery";
import Phaser from "phaser";

import core from "./core";
import { Game } from "./game";

import { MenuScene } from "./scenes/menuScene";
import { GameScene } from "./scenes/gameScene";

declare const API_URL: string;

$(() => {
    // Join server when play button is clicked
    $("#btn-play-solo").on("click", () => {
        void $.get(`${API_URL}/getGame`, data => {
            /* eslint-disable-next-line no-new,@typescript-eslint/restrict-template-expressions */
            core.game?.connect(`${data.addr}?name=${$("#username-input").val()}`);
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
