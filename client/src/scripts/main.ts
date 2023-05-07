/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import $ from "jquery";
import { Game } from "./game";
import Phaser from "phaser";

import { MenuScene } from "./scenes/menuScene";
import { GameScene } from "./scenes/gameScene";

import { setupDropdown } from "./ui/splash";

declare const API_URL: string;

$(() => {
    // Enable splash dropdown.
    setupDropdown();

    // Play button logic
    $("#btn-play-solo").on("click", () => {
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
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    });
});
