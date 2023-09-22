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
import { Config } from "./config";

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

    const serverSelector = $("#server-select");

    let bestPing = Number.MAX_VALUE;
    let bestRegion;

    for (const [regionID, region] of Object.entries(Config.regions)) {
        serverSelector.append(`<option value="${regionID}">${region.name} - <span id="${regionID}-player-count">?</span> Players</option>`);
        void (async() => {
            try {
                const pingStartTime = Date.now();
                const count = await (await fetch(`http${region.https ? "s" : ""}://${region.address}/api/playerCount`)).text();
                const regionPing = Date.now() - pingStartTime;

                console.log(`${regionID}: ${regionPing}ms`);

                $(`#${regionID}-player-count`).text(count);

                if (regionPing < bestPing) {
                    bestPing = regionPing;
                    bestRegion = regionID;
                }
            } catch (e) {
                console.error(`Failed to fetch player count for region ${regionID}. Details:`, e);
            }
        })();
    }

    const regionID = localStorageInstance.config.region ?? bestRegion ?? Config.defaultRegion;
    serverSelector.val(regionID);

    // Join server when play button is clicked
    playSoloBtn.on("click", () => {
        disablePlayButton("Connecting...");
        const region = Config.regions[serverSelector.val() as string];
        const urlPart = `${region.https ? "s" : ""}://${region.address}`;
        void $.get(`http${urlPart}/api/getGame`, (data: { success: boolean, message?: "tempBanned" | "permaBanned", gameID: number }) => {
            if (data.success) {
                let address = `ws${urlPart}/play?gameID=${data.gameID}&name=${encodeURIComponent($("#username-input").val() as string)}`;

                const devPass = localStorageInstance.config.devPassword;
                const role = localStorageInstance.config.role;
                const nameColor = localStorageInstance.config.nameColor;
                const lobbyClearing = localStorageInstance.config.lobbyClearing;

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
        background: COLORS.grass,
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
