import $ from "jquery";

import { Game } from "./game";

import { setupInputs } from "./utils/inputManager";
import { localStorageInstance } from "./utils/localStorageHandler";
import { Application } from "pixi.js";
import { loadAtlases } from "./utils/pixi";
import { COLORS } from "./utils/constants";

import { loadSounds } from "./utils/soundManager";

import "../../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/solid.css";
import { setupUI } from "./ui";

declare const API_URL: string;

const playSoloBtn: JQuery = $("#btn-play-solo");

export function enablePlayButton(): void {
    playSoloBtn.removeClass("btn-disabled");
    playSoloBtn.prop("disabled", false);
    playSoloBtn.text("Play Solo");
}

function disablePlayButton(text: string): void {
    playSoloBtn.addClass("btn-disabled");
    playSoloBtn.prop("disabled", true);
    playSoloBtn.html(`<span style="position: relative; bottom: 1px;"><div class="spin"></div>${text}</span>`);
}

async function main(): Promise<void> {
    disablePlayButton("Loading...");
    // Join server when play button is clicked
    playSoloBtn.on("click", () => {
        disablePlayButton("Connecting...");

        void $.get(`${API_URL}/getGame?region=${$("#server-select").val() as string}`, (data: { success: boolean, message?: "tempBanned" | "permaBanned", address: string, gameID: number }) => {
            if (data.success) {
                const devPass = localStorageInstance.config.devPassword;
                const role = localStorageInstance.config.role;
                const nameColor = localStorageInstance.config.nameColor;
                const lobbyClearing = localStorageInstance.config.lobbyClearing;
                let address = `${data.address}/play?gameID=${data.gameID}&name=${encodeURIComponent($("#username-input").val() as string)}`;

                if (devPass) address += `&password=${devPass}`;
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                if (role) address += `&role=${role}`;
                if (nameColor) address += `&nameColor=${nameColor}`;
                if (lobbyClearing) address += "&lobbyClearing=true";
                game.connect(address);
                $("#splash-server-message").hide();
            } else {
                let message: string | undefined;
                if (data.message !== undefined) {
                    message = data.message === "tempBanned" ? "You have been banned for 1 day. Reason: Teaming" : "<strong>You have been permanently banned!</strong><br>Reason: Hacking";
                }
                $("#splash-server-message-text").html(message ?? "Error joining game.<br>Please try again in 30 seconds.");
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
    if (lobbyClearing) {
        localStorageInstance.update({ lobbyClearing: lobbyClearing === "true" });
    }

    const devPassword = params.get("password");
    if (devPassword) {
        localStorageInstance.update({ devPassword });
        location.search = "";
    }

    const role = params.get("role");
    if (role) {
        localStorageInstance.update({ role });
        location.search = "";
    }

    // Initialize the game object

    const app = new Application({
        resizeTo: window,
        background: COLORS.water,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1
    });

    await loadAtlases();

    $("#game-ui").append(app.view as HTMLCanvasElement);

    const game = new Game(app);

    loadSounds(game.soundManager);
    setupInputs(game);
    setupUI(game);
    enablePlayButton();
}
$(() => {
    void main();
});
