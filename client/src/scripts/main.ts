import $ from "jquery";
import { Game } from "./game";
import "../css/main.css";
import "../font/inter.css";
import Phaser from "phaser";
import { MenuScene } from "./scenes/menuScene";
import { GameScene } from "./scenes/gameScene";

import "./ui/splash";

declare const API_URL: string;

$(() => {
    // Play button logic
    $("#playBtn").on("click", () => {
        void $.get(`${API_URL}/getGame`, data => {
            /* eslint-disable-next-line no-new */
            new Game(data.addr);
        });
    });

    // Dropdown toggle logic
    $(".btn-dropdown-more").on("click", () => {
        $("#dropdownMore").toggleClass("dropdown-more-show");
        $(".fa-solid.fa-caret-down").toggleClass("fa-caret-up");
    });

    // Close the dropdown menu when user clicks outside it
    $(document.body).on("click", (event: JQuery.ClickEvent<HTMLElement>) => {
        if (!(event.target as HTMLElement).matches(".btn-dropdown-more")) {
            $(".dropdown-more-content").removeClass("dropdown-more-show");
        }
    });

    // Create the Phaser Game
    global.phaser = new Phaser.Game({
        type: Phaser.AUTO,
        width: 1600,
        height: 900,
        scene: [MenuScene, GameScene],
        backgroundColor: "#49993e",
        scale: {
            parent: "body",
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    });
});
