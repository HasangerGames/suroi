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

    interface RegionInfo {
        name: string
        address: string
        https: boolean
        playerCount: string
        ping: number
    }
    const regionInfo: Record<string, RegionInfo> = {};
    let selectedRegion: RegionInfo;

    const updateServerSelector = (): void => {
        $("#server-name").text(selectedRegion.name);
        $("#server-player-count").text(selectedRegion.playerCount);
        $("#server-ping").text(selectedRegion.ping);
    };

    let bestPing = Number.MAX_VALUE;
    let bestRegion;
    for (const [regionID, region] of Object.entries(Config.regions)) {
        const listItem = $(`
<li class="server-list-item" data-region="${regionID}">
  <span class="server-name">${region.name}</span>
  <span style="margin-left: auto">
    <img src="./img/misc/player_icon_black.svg" width="16" height="16" alt="Player count">
    <span class="server-player-count">-</span>
  </span>
  <span style="margin-left: 5px">
    <img src="./img/misc/ping_icon_black.svg" width="16" height="16" alt="Ping">
    <span class="server-ping">-</span>
  </span>
</li>`);
        $("#server-list").append(listItem);

        try {
            const pingStartTime = Date.now();

            const playerCount = await (await fetch(`http${region.https ? "s" : ""}://${region.address}/api/playerCount`)).text();
            const ping = Date.now() - pingStartTime;
            regionInfo[regionID] = { ...region, playerCount, ping };

            listItem.find(".server-player-count").text(playerCount);
            listItem.find(".server-ping").text(ping);

            if (ping < bestPing) {
                bestPing = ping;
                bestRegion = regionID;
            }
        } catch (e) {
            listItem.addClass("server-list-item-disabled");
            console.error(`Failed to fetch player count for region ${regionID}. Details:`, e);
        }
    }

    selectedRegion = regionInfo[localStorageInstance.config.region ?? bestRegion ?? Config.defaultRegion];
    updateServerSelector();

    // noinspection JSJQueryEfficiency
    $("#server-list").on("click", ".server-list-item", function() {
        const region = $(this).attr("data-region");
        if (region === undefined) return;
        const info = regionInfo[region];
        if (info === undefined) return;
        selectedRegion = info;
        updateServerSelector();
    });

    // Join server when play button is clicked
    playSoloBtn.on("click", () => {
        disablePlayButton("Connecting...");
        const urlPart = `${selectedRegion.https ? "s" : ""}://${selectedRegion.address}`;
        void $.get(`http${urlPart}/api/getGame`, (data: { success: boolean, message?: "tempBanned" | "permaBanned" | "rateLimited", gameID: number }) => {
            if (data.success) {
                let address = `ws${urlPart}/play?gameID=${data.gameID}&name=${encodeURIComponent($("#username-input").val() as string)}`;

                const devPass = localStorageInstance.config.devPassword;
                const role = localStorageInstance.config.role;
                const nameColor = localStorageInstance.config.nameColor;
                const lobbyClearing = localStorageInstance.config.lobbyClearing;

                if (devPass) address += `&password=${devPass}`;
                if (role) address += `&role=${role}`;
                if (nameColor) address += `&nameColor=${nameColor}`;
                if (lobbyClearing) address += "&lobbyClearing=true";

                game.connect(address);
                $("#splash-server-message").hide();
            } else {
                let message: string;
                switch (data.message) {
                    case "tempBanned":
                        message = "You have been banned for 1 day. Reason: Teaming";
                        break;
                    case "permaBanned":
                        message = "<strong>You have been permanently banned!</strong><br>Reason: Hacking";
                        break;
                    case "rateLimited":
                        message = "Error joining game.<br>Please try again in a few minutes.";
                        break;
                    default:
                        message = "Error joining game.";
                        break;
                }
                $("#splash-server-message-text").html(message);
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

    // Initialize the Application object

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
