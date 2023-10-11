import $ from "jquery";
import { Application } from "pixi.js";
import "../../node_modules/@fortawesome/fontawesome-free/css/fontawesome.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/brands.css";
import "../../node_modules/@fortawesome/fontawesome-free/css/solid.css";
import { Config } from "./config";
import { Game } from "./game";
import { setupUI } from "./ui";
import { gameConsole, setUpBuiltIns } from "./utils/console/gameConsole";
import { COLORS } from "./utils/constants";
import { setupInputs } from "./utils/inputManager";
import { loadAtlases } from "./utils/pixi";
import { loadSounds } from "./utils/soundManager";
import { consoleVariables } from "./utils/console/variables";
import { portOldConfig } from "./utils/localStorageHandler";

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

// eslint-disable-next-line @typescript-eslint/no-misused-promises
$(async(): Promise<void> => {
    gameConsole.readFromLocalStorage();
    portOldConfig();

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
        $("#server-ping").text(selectedRegion.ping >= 0 ? selectedRegion.ping : "-");
    };
    let bestPing = Number.MAX_VALUE;
    let bestRegion: string | undefined;
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
            const playerCount = await (await fetch(`http${region.https ? "s" : ""}://${region.address}/api/playerCount`, { signal: AbortSignal.timeout(2000) })
                .catch(() => {
                    console.error(`Could not load player count for ${region.address}.`);
                    listItem.addClass("server-list-item-disabled");
                })
            )?.text();

            const ping = Date.now() - pingStartTime;
            regionInfo[regionID] = {
                ...region,
                playerCount: playerCount ?? "-",
                ping: playerCount ? ping : -1
            };

            listItem.find(".server-player-count").text(playerCount ?? "-");
            listItem.find(".server-ping").text(typeof playerCount === "string" ? ping : "-");

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
    const cVarRegion = regionInfo[consoleVariables.get.builtIn("cv_region")?.value];
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

        consoleVariables.set.builtIn("cv_region", region);

        updateServerSelector();
    });

    // Join server when play button is clicked
    playSoloBtn.on("click", () => {
        disablePlayButton("Connecting...");
        const urlPart = `${selectedRegion.https ? "s" : ""}://${selectedRegion.address}`;
        void $.get(`http${urlPart}/api/getGame`, (data: { success: boolean, message?: "tempBanned" | "permaBanned" | "rateLimited", gameID: number }) => {
            if (data.success) {
                let address = `ws${urlPart}/play?gameID=${data.gameID}`;

                const devPass = consoleVariables.get.builtIn("dv_password").value;
                const role = consoleVariables.get.builtIn("dv_role").value;
                const nameColor = consoleVariables.get.builtIn("dv_name_color").value;
                const lobbyClearing = consoleVariables.get.builtIn("dv_lobby_clearing").value;

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
        consoleVariables.set.builtIn("dv_name_color", nameColor);
    }

    const lobbyClearing = params.get("lobbyClearing");
    if (lobbyClearing) {
        consoleVariables.set.builtIn("dv_lobby_clearing", lobbyClearing === "true");
    }

    const devPassword = params.get("password");
    if (devPassword) {
        consoleVariables.set.builtIn("dv_password", devPassword);
        location.search = "";
    }

    const role = params.get("role");
    if (role) {
        consoleVariables.set.builtIn("dv_role", role);
        location.search = "";
    }

    // Initialize the Application object

    const app = new Application<HTMLCanvasElement>({
        resizeTo: window,
        background: COLORS.water,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1
    });
    $("#game-ui").append(app.view);

    await loadAtlases();

    const game = new Game(app);

    loadSounds(game.soundManager);
    setUpBuiltIns(game);
    setupUI(game);
    setupInputs(game);
    enablePlayButton();
});
