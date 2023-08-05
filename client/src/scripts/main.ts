import $ from "jquery";

import core from "./core";
import { Game } from "./game";

import { setupInputs } from "./utils/inputManager";
import { localStorageInstance } from "./utils/localStorageHandler";
import { Application } from "pixi.js";
import { loadAtlases } from "./utils/pixi";
import { GRASS_COLOR } from "./utils/constants";

import loadSounds, { SoundManagerClass } from "./utils/howler";
import { Materials } from "../../../common/src/definitions/obstacles";
import { FloorType } from "../../../common/src/definitions/buildings";

export const SoundManager = new SoundManagerClass();
loadSounds(SoundManager);

declare const API_URL: string;

const playSoloBtn: JQuery = $("#btn-play-solo");

export function enablePlayButton(): void {
    playSoloBtn.removeClass("btn-disabled");
    playSoloBtn.prop("disabled", false);
    playSoloBtn.text("Play Solo");
}

$(async() => {
    // Join server when play button is clicked
    playSoloBtn.on("click", () => {
        playSoloBtn.addClass("btn-disabled");
        playSoloBtn.prop("disabled", true);
        playSoloBtn.html('<span style="position: relative; bottom: 1px;"><div class="spin"></div> Connecting...</span>');
        void $.get(`${API_URL}/getGame?region=${$("#server-select").val() as string}`, (data: { success: boolean, address: string, gameID: number }) => {
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
        background: GRASS_COLOR,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1
    });

    core.pixi = app;

    await loadAtlases();

    $("#game-ui").append(app.view as HTMLCanvasElement);

    core.game = new Game(app);

    setupInputs(core.game);
});
