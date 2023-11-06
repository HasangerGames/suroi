import $ from "jquery";
import "../../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/solid.css";
import { Config } from "./config";
import { Game } from "./game";
import { loadAtlases } from "./utils/pixi";
import { stringIsPositiveNumber } from "./utils/misc";

const playButton: JQuery = $("#btn-play-solo");

export function enablePlayButton(): void {
    playButton.removeClass("btn-disabled").prop("disabled", false).text("Play Solo");
}

function disablePlayButton(text: string): void {
    playButton.addClass("btn-disabled").prop("disabled", true)
        .html(`<span style="position: relative; bottom: 1px;"><div class="spin"></div>${text}</span>`);
}

// eslint-disable-next-line @typescript-eslint/no-misused-promises
$(async(): Promise<void> => {
    disablePlayButton("Loading...");

    // Initialize the Application object

    const game = new Game();

    await loadAtlases();

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
        //$("#server-ping").text(selectedRegion.ping >= 0 ? selectedRegion.ping : "-");
    };
    let bestPing = Number.MAX_VALUE;
    let bestRegion: string | undefined;
    for (const [regionID, region] of Object.entries(Config.regions)) {
        const listItem = $(`
<li class="server-list-item" data-region="${regionID}">
  <span class="server-name">${region.name}</span>
  <span style="margin-left: auto">
    <img src="./img/misc/player_icon.svg" width="16" height="16" alt="Player count">
    <span class="server-player-count">-</span>
  </span>
</li>`);
        /* <span style="margin-left: 5px">
    <img src="./img/misc/ping_icon.svg" width="16" height="16" alt="Ping">
    <span class="server-ping">-</span>
  </span> */
        $("#server-list").append(listItem);

        try {
            const pingStartTime = Date.now();
            let playerCount = await (await fetch(`http${region.https ? "s" : ""}://${region.address}/api/playerCount`, { signal: AbortSignal.timeout(2000) })
                .catch(() => {
                    console.error(`Could not load player count for ${region.address}.`);
                    listItem.addClass("server-list-item-disabled");
                })
            )?.text();
            playerCount = playerCount && stringIsPositiveNumber(playerCount) ? playerCount : "-";

            const ping = Date.now() - pingStartTime;
            regionInfo[regionID] = {
                ...region,
                playerCount,
                ping: playerCount !== "-" ? ping : -1
            };

            listItem.find(".server-player-count").text(playerCount);
            //listItem.find(".server-ping").text(typeof playerCount === "string" ? ping : "-");

            if (ping < bestPing) {
                bestPing = ping;
                bestRegion = regionID;
            }
        } catch (e) {
            listItem.addClass("server-list-item-disabled");
            console.error(`Failed to fetch player count for region ${regionID}. Details:`, e);
        }
    }

    //@ts-expect-error Even though indexing an object with undefined is technically gibberish, doing so returns undefined, which
    // is kinda what we want anyways, so it's fine
    const cVarRegion = regionInfo[game.console.getBuiltInCVar("cv_region")];
    //@ts-expect-error ditto
    const empiricalBestRegion = regionInfo[bestRegion];
    const clientConfigRegion = regionInfo[Config.defaultRegion];
    selectedRegion = cVarRegion ?? empiricalBestRegion ?? clientConfigRegion;
    updateServerSelector();

    $("#server-list").children("li.server-list-item").on("click", function(this: HTMLLIElement) {
        const region = this.getAttribute("data-region");
        if (region === null) return;

        const info = regionInfo[region];
        if (info === undefined) return;

        selectedRegion = info;

        game.console.setBuiltInCVar("cv_region", region);

        updateServerSelector();
    });

    let lastPlayButtonClickTime = 0;

    // Join server when play button is clicked
    playButton.on("click", () => {
        const now = Date.now();
        if (now - lastPlayButtonClickTime < 1500) return; // Play button rate limit
        lastPlayButtonClickTime = now;
        disablePlayButton("Connecting...");
        const urlPart = `${selectedRegion.https ? "s" : ""}://${selectedRegion.address}`;
        void $.get(`http${urlPart}/api/getGame`, (data: { success: boolean, message?: "tempBanned" | "permaBanned" | "rateLimited", gameID: number }) => {
            if (data.success) {
                let address = `ws${urlPart}/play?gameID=${data.gameID}`;

                const devPass = game.console.getBuiltInCVar("dv_password");
                const role = game.console.getBuiltInCVar("dv_role");
                const nameColor = game.console.getBuiltInCVar("dv_name_color");
                const lobbyClearing = game.console.getBuiltInCVar("dv_lobby_clearing");

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
        game.console.setBuiltInCVar("dv_name_color", nameColor);
    }

    const lobbyClearing = params.get("lobbyClearing");
    if (lobbyClearing) {
        game.console.setBuiltInCVar("dv_lobby_clearing", lobbyClearing === "true");
    }

    const devPassword = params.get("password");
    if (devPassword) {
        game.console.setBuiltInCVar("dv_password", devPassword);
        location.search = "";
    }

    const role = params.get("role");
    if (role) {
        game.console.setBuiltInCVar("dv_role", role);
        location.search = "";
    }

    enablePlayButton();
});
