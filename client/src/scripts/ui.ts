import { sound } from "@pixi/sound";
import $ from "jquery";
import { Color, isMobile, isWebGPUSupported } from "pixi.js";
import { GameConstants, InputActions, ObjectCategory, SpectateActions, TeamSize } from "../../../common/src/constants";
import { Ammos } from "../../../common/src/definitions/ammos";
import { Badges, type BadgeDefinition } from "../../../common/src/definitions/badges";
import { EmoteCategory, Emotes, type EmoteDefinition } from "../../../common/src/definitions/emotes";
import { HealType, HealingItems } from "../../../common/src/definitions/healingItems";
import { Scopes } from "../../../common/src/definitions/scopes";
import { Skins, type SkinDefinition } from "../../../common/src/definitions/skins";
import { SpectatePacket } from "../../../common/src/packets/spectatePacket";
import { CustomTeamMessages, type CustomTeamMessage, type CustomTeamPlayerInfo, type GetGameResponse } from "../../../common/src/typings";
import { ExtendedMap } from "../../../common/src/utils/misc";
import { ItemType, type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { pickRandomInArray } from "../../../common/src/utils/random";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { Config } from "./config";
import { type Game } from "./game";
import { news } from "./news/newsPosts";
import { body, createDropdown } from "./uiHelpers";
import { defaultClientCVars, type CVarTypeMapping } from "./utils/console/defaultClientCVars";
import { PIXI_SCALE, UI_DEBUG_MODE, emoteSlots } from "./utils/constants";
import { Crosshairs, getCrosshair } from "./utils/crosshairs";
import { requestFullscreen } from "./utils/misc";

interface RegionInfo {
    readonly name: string
    readonly mainAddress: string
    readonly gameAddress: string
    readonly playerCount?: number
    readonly maxTeamSize?: number
    readonly nextSwitchTime?: number
    readonly ping?: number
}

let selectedRegion: RegionInfo | undefined;

const regionInfo: Record<string, RegionInfo> = Config.regions;

export let teamSocket: WebSocket | undefined;
let teamID: string | undefined | null;
let joinedTeam = false;
let autoFill = false;

let buttonsLocked = true;
export function lockPlayButtons(): void { buttonsLocked = true; }
export function unlockPlayButtons(): void { buttonsLocked = false; }

let btnMap: ReadonlyArray<readonly [TeamSize, JQuery<HTMLButtonElement>]>;
export function resetPlayButtons(): void {
    if (buttonsLocked) return;

    $("#splash-options").removeClass("loading");
    $("#loading-text").text("Connecting");

    const { maxTeamSize } = selectedRegion ?? regionInfo[Config.defaultRegion];
    const isSolo = maxTeamSize === TeamSize.Solo;

    for (
        const [size, btn] of (
            btnMap ??= [
                [TeamSize.Solo, $("#btn-play-solo")],
                [TeamSize.Duo, $("#btn-play-duo")],
                [TeamSize.Squad, $("#btn-play-squad")]
            ]
        )
    ) btn.toggleClass("locked", maxTeamSize !== size);

    $("#team-option-btns").toggleClass("locked", isSolo);
    $("#locked-msg").css("top", isSolo ? "225px" : "153px").show();
}

export async function setUpUI(game: Game): Promise<void> {
    const { inputManager, uiManager: { ui } } = game;

    if (UI_DEBUG_MODE) {
        // Kill message
        ui.killMsgHeader.text("Kills: 7");
        ui.killMsgContainer.text("Player  with Mosin-Nagant (streak: 255)");
        ui.killMsgModal.show();

        // Spectating message
        ui.spectatingMsgPlayer.html("Player");
        ui.spectatingContainer.show();

        // Gas message
        ui.gasMsgInfo
            .text("Toxic gas is advancing! Move to the safe zone")
            .css("color", "cyan");
        ui.gasMsg.show();

        ui.ammoCounterContainer.show();

        // Kill feed messages
        const killFeed = ui.killFeed;
        for (let i = 0; i < 5; i++) {
            const killFeedItem = $<HTMLDivElement>("<div>");
            killFeedItem.addClass("kill-feed-item");
            // noinspection HtmlUnknownTarget
            killFeedItem.html(
                '<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> Player killed Player with Mosin-Nagant'
            );
            killFeed.prepend(killFeedItem);
        }
    }

    const params = new URLSearchParams(window.location.search);

    // Switch regions with the ?region="name" Search Parameter
    if (params.has("region")) {
        (() => {
            const region = params.get("region");
            params.delete("region");
            if (region === null) return;
            if (!Object.hasOwn(Config.regions, region)) return;
            game.console.setBuiltInCVar("cv_region", region);
        })();
    }

    // Load news
    let newsText = "";
    for (const newsPost of news.slice(0, 5)) {
        const date = new Date(newsPost.date).toLocaleDateString("default", {
            month: "long",
            day: "numeric",
            year: "numeric"
        });

        newsText += '<article class="splash-news-entry">';
        newsText += `<div class="news-date">${date}</div>`;
        newsText += `<div class="news-title">${newsPost.title}</div>`;
        newsText += `<p>${newsPost.content}<br><i>- ${newsPost.author}</i></p></article>`;
    }

    ui.newsPosts.html(newsText);

    // createDropdown("#splash-more");

    ui.lockedInfo.on("click", () => ui.lockedTooltip.fadeToggle(250));

    const pad = (n: number): string | number => n < 10 ? `0${n}` : n;
    const updateSwitchTime = (): void => {
        if (!selectedRegion?.nextSwitchTime) {
            ui.lockedTime.text("--:--:--");
            return;
        }
        const millis = selectedRegion.nextSwitchTime - Date.now();
        if (millis < 0) {
            location.reload();
            return;
        }
        const hours = Math.floor(millis / 3600000) % 24;
        const minutes = Math.floor(millis / 60000) % 60;
        const seconds = Math.floor(millis / 1000) % 60;
        ui.lockedTime.text(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };
    setInterval(updateSwitchTime, 1000);

    const regionMap = Object.entries(regionInfo);
    const serverList = $<HTMLUListElement>("#server-list");

    // Load server list
    const regionUICache: Record<string, JQuery<HTMLLIElement>> = {};

    for (const [regionID, region] of regionMap) {
        /* <span style="margin-left: 5px">
          <img src="./img/misc/ping_icon.svg" width="16" height="16" alt="Ping">
          <span class="server-ping">-</span>
        </span> */
        serverList.append(
            regionUICache[regionID] = $<HTMLLIElement>(`
                <li class="server-list-item" data-region="${regionID}">
                    <span class="server-name">${region.name}</span>
                    <span style="margin-left: auto">
                      <img src="./img/misc/player_icon.svg" width="16" height="16" alt="Player count">
                      <span class="server-player-count">-</span>
                    </span>
                </li>
            `)
        );
    }

    // Get player counts + find server w/ best ping
    let bestPing = Number.MAX_VALUE;
    let bestRegion: string | undefined;
    for (const [regionID, region] of regionMap) {
        const listItem = regionUICache[regionID];

        try {
            ui.loadingText.text("Fetching server data...");

            const pingStartTime = Date.now();

            interface ServerInfo {
                readonly protocolVersion: number
                readonly playerCount: number
                readonly maxTeamSize: TeamSize
                readonly nextSwitchTime: number
            };

            const serverInfo = await (
                await fetch(`${region.mainAddress}/api/serverInfo`, { signal: AbortSignal.timeout(5000) })
            )?.json() as ServerInfo;

            const ping = Date.now() - pingStartTime;

            regionInfo[regionID] = {
                ...region,
                ...serverInfo,
                ping
            };

            if (serverInfo.protocolVersion !== GameConstants.protocolVersion) {
                console.error(`Protocol version mismatch for region ${regionID}. Expected ${GameConstants.protocolVersion}, got ${serverInfo.protocolVersion}`);
                continue;
            }

            listItem.find(".server-player-count").text(serverInfo.playerCount ?? "-");
            // listItem.find(".server-ping").text(typeof playerCount === "string" ? ping : "-");

            if (ping < bestPing) {
                bestPing = ping;
                bestRegion = regionID;
            }
        } catch (e) {
            console.error(`Failed to load server info for region ${regionID}. Details:`, e);
        }
    }

    const serverName = $<HTMLSpanElement>("#server-name");
    const playerCount = $<HTMLSpanElement>("#server-player-count");
    const updateServerSelectors = (): void => {
        if (!selectedRegion) { // Handle invalid region
            selectedRegion = regionInfo[Config.defaultRegion];
            game.console.setBuiltInCVar("cv_region", "");
        }
        serverName.text(selectedRegion.name);
        playerCount.text(selectedRegion.playerCount ?? "-");
        // $("#server-ping").text(selectedRegion.ping && selectedRegion.ping > 0 ? selectedRegion.ping : "-");
        updateSwitchTime();
        resetPlayButtons();
    };

    selectedRegion = regionInfo[(game.console.getBuiltInCVar("cv_region") || bestRegion) ?? Config.defaultRegion];
    updateServerSelectors();

    serverList.children("li.server-list-item").on("click", function(this: HTMLLIElement) {
        const region = this.getAttribute("data-region");

        if (region === null) return;

        const info = regionInfo[region];
        if (info === undefined) return;

        resetPlayButtons();

        selectedRegion = info;

        game.console.setBuiltInCVar("cv_region", region);

        updateServerSelectors();
    });

    const joinGame = (): void => {
        ui.splashOptions.addClass("loading");
        ui.loadingText.text("Finding Game");
        // shouldn't happen
        if (selectedRegion === undefined) return;

        const target = selectedRegion;

        void $.get(
            `${target.mainAddress}/api/getGame${teamID ? `?teamID=${teamID}` : ""}`,
            (data: GetGameResponse) => {
                if (data.success) {
                    const params = new URLSearchParams();

                    if (teamID) params.set("teamID", teamID);
                    if (autoFill) params.set("autoFill", String(autoFill));

                    const devPass = game.console.getBuiltInCVar("dv_password");
                    if (devPass) params.set("password", devPass);

                    const role = game.console.getBuiltInCVar("dv_role");
                    if (role) params.set("role", role);

                    const lobbyClearing = game.console.getBuiltInCVar("dv_lobby_clearing");
                    if (lobbyClearing) params.set("lobbyClearing", "true");

                    const weaponPreset = game.console.getBuiltInCVar("dv_weapon_preset");
                    if (weaponPreset) params.set("weaponPreset", weaponPreset);

                    const nameColor = game.console.getBuiltInCVar("dv_name_color");
                    if (nameColor) {
                        try {
                            params.set("nameColor", new Color(nameColor).toNumber().toString());
                        } catch (e) {
                            game.console.setBuiltInCVar("dv_name_color", "");
                            console.error(e);
                        }
                    }

                    game.connect(`${target.gameAddress.replace("<ID>", (data.gameID + 1).toString())}/play?${params.toString()}`);
                    ui.splashMsg.hide();
                } else {
                    let showWarningModal = false;
                    let title: string | undefined;
                    let message: string;
                    switch (data.message) {
                        case "warn":
                            showWarningModal = true;
                            title = "You have been warned!";
                            message = `You have received a warning by the suroi game moderatrs. Case: ${data.reportID || "No report ID provided."}. Your official warn reason: ${data.reason || "No reason provided"}`;
                            break;
                        case "temp":
                            showWarningModal = true;
                            title = "You have been temporarily banned from playing suroi.";
                            message = `Game moderatrs have banned you for: ${data.reason || "No reason provided"}. With case ID: ${data.reportID || "No report ID provided"}<br><br>When your ban is up (usually 24h), reload the page to clear this message.`;
                            break;
                        case "perma":
                            showWarningModal = true;
                            title = "You have been permanently banned from playing suroi.io";
                            message = `The use of scripts, plugins, extensions, etc. to modify the game in order to gain an advantage over opponents is strictly forbidden.<br><br>Ban reason: ${data.reason || "No reason provided"}. Case ID: ${data.reportID || "No report ID provided"}`;
                            break;
                        default:
                            message = "Error joining game.<br>Please try again.";
                            break;
                    }

                    if (showWarningModal) {
                        ui.warningTitle.text(title ?? "");
                        ui.warningText.html(message ?? "");
                        ui.warningAgreeOpts.toggle(data.message === "warn");
                        ui.warningAgreeCheckbox.prop("checked", false);
                        ui.warningModal.show();
                        ui.splashOptions.addClass("loading");
                    } else {
                        ui.splashMsgText.html(message);
                        ui.splashMsg.show();
                    }
                    resetPlayButtons();
                }
            }
        ).fail(() => {
            ui.splashMsgText.html("Error finding game.<br>Please try again.");
            ui.splashMsg.show();
            resetPlayButtons();
        });
    };

    let lastPlayButtonClickTime = 0;

    // Join server when play buttons are clicked
    $("#btn-play-solo, #btn-play-duo, #btn-play-squad").on("click", () => {
        const now = Date.now();
        if (now - lastPlayButtonClickTime < 1500) return; // Play button rate limit
        lastPlayButtonClickTime = now;
        joinGame();
    });

    const createTeamMenu = $("#create-team-menu");
    $<HTMLButtonElement>("#btn-create-team, #btn-join-team").on("click", function() {
        const now = Date.now();
        if (now - lastPlayButtonClickTime < 1500 || teamSocket || selectedRegion === undefined) return;
        lastPlayButtonClickTime = now;

        ui.splashOptions.addClass("loading");
        ui.loadingText.text("Connecting");

        const params = new URLSearchParams();

        const joiningTeam = this.id === "btn-join-team";
        if (joiningTeam) {
            ui.btnStartGame.addClass("btn-disabled").text("Waiting...");
            ui.createTeamToggles.addClass("disabled");

            // also rejects the empty string, but like who cares
            while (!teamID) {
                teamID = prompt("Enter a team code:");
                if (!teamID) {
                    resetPlayButtons();
                    return;
                }

                /*
                    Allows people to paste links into the text field and still have the game parse
                    them correctly (as opposed to simply doing `teamID = teamID.slice(1)`)
                */
                if (teamID.includes("#")) {
                    teamID = teamID.split("#")[1];
                }

                if (/^[a-zA-Z0-9]{4}$/.test(teamID)) {
                    break;
                }

                alert("Invalid team code.");
            }

            params.set("teamID", teamID);
        } else {
            ui.btnStartGame.removeClass("btn-disabled").text("Start Game");
            ui.createTeamToggles.removeClass("disabled");
        }

        params.set("name", game.console.getBuiltInCVar("cv_player_name"));
        params.set("skin", game.console.getBuiltInCVar("cv_loadout_skin"));

        const badge = game.console.getBuiltInCVar("cv_loadout_badge");
        if (badge) params.set("badge", badge);

        const devPass = game.console.getBuiltInCVar("dv_password");
        if (devPass) params.set("password", devPass);

        const role = game.console.getBuiltInCVar("dv_role");
        if (role) params.set("role", role);

        const nameColor = game.console.getBuiltInCVar("dv_name_color");
        if (nameColor) {
            try {
                params.set("nameColor", new Color(nameColor).toNumber().toString());
            } catch (e) {
                game.console.setBuiltInCVar("dv_name_color", "");
                console.error(e);
            }
        }

        teamSocket = new WebSocket(`${selectedRegion.mainAddress.replace("http", "ws")}/team?${params.toString()}`);

        const getPlayerHTML = (p: CustomTeamPlayerInfo): string =>
            `
            <div class="create-team-player-container" data-id="${p.id}">
              <i class="fa-solid fa-crown"${p.isLeader ? "" : ' style="display: none"'}></i>
              <div class="skin">
                <div class="skin-base" style="background-image: url('./img/game/skins/${p.skin}_base.svg')"></div>
                <div class="skin-left-fist" style="background-image: url('./img/game/skins/${p.skin}_fist.svg')"></div>
                <div class="skin-right-fist" style="background-image: url('./img/game/skins/${p.skin}_fist.svg')"></div>
              </div>
              <div class="create-team-player-name-container">
                <span class="create-team-player-name"${p.nameColor ? ` style="color: ${new Color(p.nameColor).toHex()}"` : ""};>${p.name}</span>
                ${p.badge ? `<img class="create-team-player-badge" src="./img/game/badges/${p.badge}.svg" />` : ""}
              </div>
            </div>
            `;

        let playerID: number;

        teamSocket.onmessage = (message: MessageEvent<string>): void => {
            const data = JSON.parse(message.data) as CustomTeamMessage;
            switch (data.type) {
                case CustomTeamMessages.Join: {
                    joinedTeam = true;
                    playerID = data.id;
                    teamID = data.teamID;
                    window.location.hash = `#${teamID}`;

                    ui.createTeamUrl.val(`${window.location.origin}/?region=${game.console.getBuiltInCVar("cv_region")}#${teamID}`);
                    ui.createTeamAutoFill.prop("checked", data.autoFill);
                    ui.createTeamLock.prop("checked", data.locked);
                    ui.createTeamPlayers.html(data.players.map(getPlayerHTML).join(""));
                    break;
                }
                case CustomTeamMessages.PlayerJoin: {
                    ui.createTeamPlayers.append(getPlayerHTML(data));
                    break;
                }
                case CustomTeamMessages.PlayerLeave: {
                    ui.createTeamPlayers.find(`[data-id="${data.id}"]`).remove();
                    if (data.newLeaderID === undefined) {
                        break;
                    }

                    ui.createTeamPlayers.find(`[data-id="${data.newLeaderID}"] .fa-crown`).show();

                    if (data.newLeaderID === playerID) {
                        ui.btnStartGame.removeClass("btn-disabled").text("Start Game");
                        ui.createTeamToggles.removeClass("disabled");
                    }
                    break;
                }
                case CustomTeamMessages.Settings: {
                    ui.createTeamAutoFill.prop("checked", data.autoFill);
                    ui.createTeamLock.prop("checked", data.locked);
                    break;
                }
                case CustomTeamMessages.Started: {
                    createTeamMenu.hide();
                    joinGame();
                    break;
                }
            }
        };

        teamSocket.onerror = (): void => {
            ui.splashMsgText.html("Error joining team.<br>It may not exist or it is full.");
            ui.splashMsg.show();
            resetPlayButtons();
            createTeamMenu.fadeOut(250);

            // Dimmed backdrop on team menu. (Probably not needed here)
            ui.splashUi.css({ filter: "", pointerEvents: "" });
        };

        teamSocket.onclose = (): void => {
            // The socket is set to undefined in the close button listener
            // If it's not undefined, the socket was closed by other means, so show an error message
            if (teamSocket) {
                ui.splashMsgText.html(
                    joinedTeam
                        ? "Lost connection to team."
                        : "Error joining team.<br>It may not exist or it is full."
                );
                ui.splashMsg.show();
            }
            resetPlayButtons();
            teamSocket = undefined;
            teamID = undefined;
            joinedTeam = false;
            window.location.hash = "";
            createTeamMenu.fadeOut(250);

            // Dimmed backdrop on team menu.
            ui.splashUi.css({ filter: "", pointerEvents: "" });
        };

        createTeamMenu.fadeIn(250);

        // Dimmed backdrop on team menu.
        ui.splashUi.css({
            filter: "brightness(0.6)",
            pointerEvents: "none"
        });
    });

    ui.closeCreateTeam.on("click", () => {
        const socket = teamSocket;
        teamSocket = undefined;
        socket?.close();
    });

    const copyUrl = $<HTMLButtonElement>("#btn-copy-team-url");
    const hideUrl = $<HTMLButtonElement>("#btn-hide-team-url");

    copyUrl.on("click", () => {
        const url = ui.createTeamUrl.val();
        if (!url) {
            alert("Unable to copy link to clipboard.");
            return;
        }
        void navigator.clipboard
            .writeText(url)
            .then(() => {
                copyUrl
                    .addClass("btn-success")
                    .css("pointer-events", "none")
                    .html(`
                        <i class="fa-solid fa-check" id="copy-team-btn-icon"></i>
                        Copied`
                    );

                // After some seconds, reset the copy button's css
                setTimeout(() => {
                    copyUrl
                        .removeClass("btn-success")
                        .css("pointer-events", "")
                        .html(`
                            <i class="fa-solid fa-clipboard" id="copy-team-btn-icon"></i>
                            Copy`
                        );
                }, 2000); // 2 sec
            })
            .catch(() => {
                alert("Unable to copy link to clipboard.");
            });
    });

    const icon = hideUrl.children("i");

    hideUrl.on("click", () => {
        const urlField = ui.createTeamUrl;

        if (urlField.hasClass("hidden")) {
            icon.removeClass("fa-eye")
                .addClass("fa-eye-slash");

            urlField.removeClass("hidden")
                .css("color", "");

            return;
        }

        icon.removeClass("fa-eye-slash")
            .addClass("fa-eye");

        urlField.addClass("hidden")
            .css("color", "#FFFFFF00");
    });

    $<HTMLInputElement>("#create-team-toggle-auto-fill").on("click", function() {
        autoFill = this.checked;
        teamSocket?.send(JSON.stringify({
            type: CustomTeamMessages.Settings,
            autoFill
        }));
    });

    $<HTMLInputElement>("#create-team-toggle-lock").on("click", function() {
        teamSocket?.send(JSON.stringify({
            type: CustomTeamMessages.Settings,
            locked: this.checked
        }));
    });

    ui.btnStartGame.on("click", () => {
        teamSocket?.send(JSON.stringify({ type: CustomTeamMessages.Start }));
    });

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

    const roleParam = params.get("role");
    if (roleParam) {
        game.console.setBuiltInCVar("dv_role", roleParam);
        location.search = "";
    }

    const usernameField = $<HTMLInputElement>("#username-input");

    const youtubers = [
        {
            name: "123OP",
            link: "https://www.youtube.com/@123op."
        },
        {
            name: "TEAMFIGHTER 27",
            link: "https://www.youtube.com/@TEAMFIGHTER27"
        },
        {
            name: "NAMERIO",
            link: "https://www.youtube.com/@NAMERIO1"
        },
        {
            name: "AWMZ",
            link: "https://www.youtube.com/@AWMZfn"
        },
        {
            name: "Ukraines dude",
            link: "https://www.youtube.com/@Ukrainesdude"
        },
        {
            name: "monet",
            link: "https://www.youtube.com/@stardust_737"
        },
        {
            name: "Tuncres",
            link: "https://www.youtube.com/@Tuncres2022"
        },
        {
            name: "silverdotware",
            link: "https://www.youtube.com/@silverdotware"
        },
        {
            name: "Pablo_Fan_",
            link: "https://www.youtube.com/@Pablo_Fan_"
        },
        {
            name: "g0dak",
            link: "https://www.youtube.com/@g0dak"
        },
        {
            name: "GAMERIO",
            link: "https://www.youtube.com/@GAMERIO1"
        }
    ];
    const youtuber = pickRandomInArray(youtubers);
    $("#youtube-featured-name").text(youtuber.name);
    $("#youtube-featured-content").attr("href", youtuber.link);

    const streamers = [
        {
            name: "ikou",
            link: "https://www.twitch.tv/ikou_yt"
        },
        {
            name: "seth_mayo",
            link: "https://www.twitch.tv/seth_mayo"
        },
        {
            name: "PatchesSC",
            link: "https://www.twitch.tv/patchessc"
        }
    ];
    const streamer = pickRandomInArray(streamers);
    $("#twitch-featured-name").text(streamer.name);
    $("#twitch-featured-content").attr("href", streamer.link);

    const toggleRotateMessage = (): JQuery =>
        $("#splash-rotate-message").toggle(
            window.innerWidth < window.innerHeight
        );
    toggleRotateMessage();
    $(window).on("resize", toggleRotateMessage);

    game.console.variables.addChangeListener(
        "cv_console_open",
        (_, val) => game.console.isOpen = val
    );

    const gameMenu = ui.gameMenu;
    const settingsMenu = $("#settings-menu");

    usernameField.val(game.console.getBuiltInCVar("cv_player_name"));

    usernameField.on("input", function() {
        // Replace fancy quotes & dashes, so they don't get stripped out

        game.console.setBuiltInCVar(
            "cv_player_name",
            this.value = this.value
                .replace(/[\u201c\u201d\u201f]/g, '"')
                //         |  “  |  ”  |  ‟  |

                .replace(/[\u2018\u2019\u201b]/g, "'")
                //         |  ‘  |  ’  |  ‛  |

                .replace(/[\u2013\u2014]/g, "-")
                //         |  –  |  —  |

                // Strip out non-ASCII chars and
                // the C0/C1 control characters
                .replace(/[^\x20-\x7E]/g, "")
        );
    });

    createDropdown("#server-select");

    const serverSelect = $<HTMLSelectElement>("#server-select");

    // Select region
    serverSelect.on("change", () => {
        // const value = serverSelect.val() as string | undefined;

        /* if (value !== undefined) {
            game.console.setBuiltInCVar("cv_region", value);
        } */
    });

    const rulesBtn = $<HTMLButtonElement>("#btn-rules");

    // Highlight rules & tutorial button for new players
    if (!game.console.getBuiltInCVar("cv_rules_acknowledged")) {
        rulesBtn.removeClass("btn-secondary").addClass("highlighted");
    }

    // Event listener for rules button
    rulesBtn.on("click", () => {
        game.console.setBuiltInCVar("cv_rules_acknowledged", true);
        location.href = "./rules/";
    });

    $("#btn-quit-game, #btn-spectate-menu, #btn-menu").on("click", () => {
        void game.endGame();
    });
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    $("#btn-play-again, #btn-spectate-replay").on("click", async() => {
        await game.endGame();
        if (teamSocket) teamSocket.send(JSON.stringify({ type: CustomTeamMessages.Start })); // TODO Check if player is team leader
        else joinGame();
    });

    const sendSpectatePacket = (action: SpectateActions): void => {
        const packet = new SpectatePacket();
        packet.spectateAction = action;
        game.sendPacket(packet);
    };

    ui.btnSpectate.on("click", () => {
        sendSpectatePacket(SpectateActions.BeginSpectating);
        game.spectating = true;
        game.map.indicator.setFrame("player_indicator");
    });

    ui.spectatePrevious.on("click", () => {
        sendSpectatePacket(SpectateActions.SpectatePrevious);
    });

    ui.spectateKillLeader.on("click", () => {
        sendSpectatePacket(SpectateActions.SpectateKillLeader);
    });

    ui.btnReport.on("click", () => {
        if (confirm(`Are you sure you want to report this player?
Players should only be reported for teaming or hacking.
Video evidence is required.`)) {
            sendSpectatePacket(SpectateActions.Report);
        }
    });
    ui.spectateNext.on("click", () => {
        sendSpectatePacket(SpectateActions.SpectateNext);
    });

    $<HTMLButtonElement>("#btn-resume-game").on("click", () => gameMenu.hide());
    $<HTMLButtonElement>("#btn-fullscreen").on("click", () => {
        requestFullscreen();
        ui.gameMenu.hide();
    });

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape") {
            if (ui.canvas.hasClass("active") && !game.console.isOpen) {
                gameMenu.fadeToggle(250);
                settingsMenu.hide();
            }
            game.console.isOpen = false;
        }
    });

    $<HTMLButtonElement>("#btn-settings").on("click", () => {
        $(".dialog").hide();
        settingsMenu.fadeToggle(250);
        settingsMenu.removeClass("in-game");
    });

    $<HTMLButtonElement>("#btn-settings-game").on("click", () => {
        gameMenu.hide();
        settingsMenu.fadeToggle(250);
        settingsMenu.addClass("in-game");
    });

    $<HTMLButtonElement>("#close-settings").on("click", () => {
        settingsMenu.fadeOut(250);
    });

    const customizeMenu = $<HTMLButtonElement>("#customize-menu");
    $<HTMLButtonElement>("#btn-customize").on("click", () => {
        $(".dialog").hide();
        customizeMenu.fadeToggle(250);
    });
    $<HTMLButtonElement>("#close-customize").on("click", () => customizeMenu.fadeOut(250));

    $<HTMLButtonElement>("#close-report").on("click", () => ui.reportingModal.fadeOut(250));

    const role = game.console.getBuiltInCVar("dv_role");

    // Load skins
    if (!Skins.definitions.some(s => s.idString === game.console.getBuiltInCVar("cv_loadout_skin"))) {
        game.console.setBuiltInCVar("cv_loadout_skin", defaultClientCVars.cv_loadout_skin as string);
    }

    const base = $<HTMLDivElement>("#skin-base");
    const fists = $<HTMLDivElement>("#skin-left-fist, #skin-right-fist");

    const updateSplashCustomize = (skinID: string): void => {
        base.css(
            "background-image",
            `url("./img/game/skins/${skinID}_base.svg")`
        );

        fists.css(
            "background-image",
            `url("./img/game/skins/${skinID}_fist.svg")`
        );
    };

    const currentSkin = game.console.getBuiltInCVar("cv_loadout_skin");
    updateSplashCustomize(currentSkin);
    const skinList = $<HTMLDivElement>("#skins-list");

    const skinUiCache: Record<ReferenceTo<SkinDefinition>, JQuery<HTMLDivElement>> = {};

    function selectSkin(idString: ReferenceTo<SkinDefinition>): void {
        skinUiCache[idString].addClass("selected")
            .siblings()
            .removeClass("selected");

        updateSplashCustomize(idString);
    }

    for (const { idString, name, hideFromLoadout, roleRequired } of Skins) {
        if (hideFromLoadout || (roleRequired ?? role) !== role) continue;

        // noinspection CssUnknownTarget
        const skinItem = skinUiCache[idString] = $<HTMLDivElement>(
            `<div id="skin-${idString}" class="skins-list-item-container${idString === currentSkin ? " selected" : ""}">
                <div class="skin">
                    <div class="skin-base" style="background-image: url('./img/game/skins/${idString}_base.svg')"></div>
                    <div class="skin-left-fist" style="background-image: url('./img/game/skins/${idString}_fist.svg')"></div>
                    <div class="skin-right-fist" style="background-image: url('./img/game/skins/${idString}_fist.svg')"></div>
                </div>
                <span class="skin-name">${name}</span>
            </div>`
        );

        skinItem.on("click", () => {
            game.console.setBuiltInCVar("cv_loadout_skin", idString);
            selectSkin(idString);
        });

        skinList.append(skinItem);
    }

    game.console.variables.addChangeListener(
        "cv_loadout_skin",
        (_, newSkin) => {
            selectSkin(newSkin);
        }
    );

    // Load emotes
    function handleEmote(slot: "win" | "death"): void { // eipi can you improve this so that it uses `emoteSlots` items with index >3
        const emote = $(`#emote-wheel-bottom .emote-${slot} .fa-xmark`);
        const cvar = `cv_loadout_${slot}_emote` as const;
        const emoteSlot = $(`#emote-wheel-container .emote-${slot}`);

        emote.on("click", () => {
            game.console.setBuiltInCVar(cvar, "");
            emoteSlot.css("background-image", "none");
            emote.hide();
        });

        if (game.console.getBuiltInCVar(`cv_loadout_${slot}_emote`) === "") emote.hide();
    }

    handleEmote("win");
    handleEmote("death");

    let selectedEmoteSlot: typeof emoteSlots[number] | undefined;
    const emoteList = $<HTMLDivElement>("#emotes-list");

    const bottomEmoteUiCache: Partial<Record<typeof emoteSlots[number], JQuery<HTMLSpanElement>>> = {};
    const emoteWheelUiCache: Partial<Record<typeof emoteSlots[number], JQuery<HTMLDivElement>>> = {};

    function updateEmotesList(): void {
        emoteList.empty();

        const emotes = [...Emotes.definitions].sort((a, b) => {
            return a.category - b.category;
        });

        let lastCategory = -1;

        for (const emote of emotes) {
            if (emote.isTeamEmote) continue;

            if (emote.category as number !== lastCategory) {
                const categoryHeader = $<HTMLDivElement>(`<div class="emote-list-header">${EmoteCategory[emote.category]}</div>`);
                emoteList.append(categoryHeader);
                lastCategory = emote.category;
            }

            // noinspection CssUnknownTarget
            const emoteItem = $<HTMLDivElement>(
                `<div id="emote-${emote.idString}" class="emotes-list-item-container">
                    <div class="emotes-list-item" style="background-image: url('./img/game/emotes/${emote.idString}.svg')"></div>
                    <span class="emote-name">${emote.name}</span>
                </div>`
            );

            emoteItem.on("click", () => {
                if (selectedEmoteSlot === undefined) return;

                const cvarName = selectedEmoteSlot;
                (
                    bottomEmoteUiCache[cvarName] ??= $((`#emote-wheel-bottom .emote-${cvarName} .fa-xmark` as const))
                ).show();

                game.console.setBuiltInCVar(`cv_loadout_${cvarName}_emote`, emote.idString);

                emoteItem.addClass("selected")
                    .siblings()
                    .removeClass("selected");

                (
                    emoteWheelUiCache[cvarName] ??= $(`#emote-wheel-container .emote-${cvarName}`)
                ).css(
                    "background-image",
                    `url("./img/game/emotes/${emote.idString}.svg")`
                );
            });

            emoteList.append(emoteItem);
        }
    }

    updateEmotesList();

    const customizeEmote = $<HTMLDivElement>("#emote-customize-wheel");
    const emoteListItemContainer = $<HTMLDivElement>(".emotes-list-item-container");

    function changeEmoteSlotImage(slot: typeof emoteSlots[number], emote: ReferenceTo<EmoteDefinition>): JQuery<HTMLDivElement> {
        return (
            emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
        ).css("background-image", emote ? `url("./img/game/emotes/${emote}.svg")` : "none");
    }

    for (const slot of emoteSlots) {
        const cvar = `cv_loadout_${slot}_emote` as const;
        const emote = game.console.getBuiltInCVar(cvar);

        game.console.variables.addChangeListener(
            cvar,
            (_, newEmote) => {
                changeEmoteSlotImage(slot, newEmote);
            }
        );

        changeEmoteSlotImage(slot, emote)
            .on("click", () => {
                if (selectedEmoteSlot === slot) return;

                if (selectedEmoteSlot !== undefined) {
                    (
                        emoteWheelUiCache[selectedEmoteSlot] ??= $(`#emote-wheel-container .emote-${selectedEmoteSlot}`)
                    ).removeClass("selected");
                }

                selectedEmoteSlot = slot;

                updateEmotesList();

                if (emoteSlots.indexOf(slot) > 3) {
                    // win / death emote
                    customizeEmote.css(
                        "background-image",
                        "url('/img/misc/emote_wheel.svg')"
                    );

                    (
                        emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
                    ).addClass("selected");
                } else {
                    customizeEmote.css(
                        "background-image",
                        `url("./img/misc/emote_wheel_highlight_${slot}.svg"), url("/img/misc/emote_wheel.svg")`
                    );
                }

                emoteListItemContainer
                    .removeClass("selected")
                    .css("cursor", "pointer");

                $(`#emote-${game.console.getBuiltInCVar(cvar) || "none"}`).addClass("selected");
            });

        (
            emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
        ).children(".remove-emote-btn")
            .on("click", () => {
                game.console.setBuiltInCVar(cvar, "");
                (
                    emoteWheelUiCache[slot] ??= $(`#emote-wheel-container .emote-${slot}`)
                ).css("background-image", "none");
            });
    }

    const crosshairImage = $<HTMLDivElement>("#crosshair-image");
    const crosshairControls = $<HTMLDivElement>("#crosshair-controls");
    const crosshairTargets = $<HTMLDivElement>("#crosshair-preview, #game");

    // Load crosshairs
    function loadCrosshair(): void {
        const size = 20 * game.console.getBuiltInCVar("cv_crosshair_size");
        const crosshair = getCrosshair(
            game.console.getBuiltInCVar("cv_loadout_crosshair"),
            game.console.getBuiltInCVar("cv_crosshair_color"),
            size,
            game.console.getBuiltInCVar("cv_crosshair_stroke_color"),
            game.console.getBuiltInCVar("cv_crosshair_stroke_size")
        );
        const cursor = crosshair === "crosshair" ? crosshair : `url("${crosshair}") ${size / 2} ${size / 2}, crosshair`;

        crosshairImage.css({
            backgroundImage: `url("${crosshair}")`,
            width: size,
            height: size
        });

        crosshairControls.toggleClass("disabled", !Crosshairs[game.console.getBuiltInCVar("cv_loadout_crosshair")]);
        crosshairTargets.css({ cursor });
    }

    loadCrosshair();

    const crosshairCache: Array<JQuery<HTMLDivElement>> = [];

    game.console.variables.addChangeListener(
        "cv_loadout_crosshair",
        (_, value) => {
            (crosshairCache[value] ??= $(`#crosshair-${value}`))
                .addClass("selected")
                .siblings()
                .removeClass("selected");

            loadCrosshair();
        }
    );

    const crosshairSize = game.console.getBuiltInCVar("cv_crosshair_size");
    const currentCrosshair = game.console.getBuiltInCVar("cv_loadout_crosshair");

    $<HTMLDivElement>("#crosshairs-list").append(
        Crosshairs.map((_, crosshairIndex) => {
            const listItem = $<HTMLDivElement>("<div class=\"crosshairs-list-item\"></div>");
            const crosshairItem = $<HTMLDivElement>(
                `<div id="crosshair-${crosshairIndex}" class="crosshairs-list-item-container${currentCrosshair === crosshairIndex ? " selected" : ""}"></div>`
            );

            crosshairItem.append(listItem);

            listItem.css({
                "backgroundImage": `url("${getCrosshair(
                    crosshairIndex,
                    "#fff",
                    crosshairSize,
                    "#0",
                    0
                )}")`,
                "background-size": "contain",
                "background-repeat": "no-repeat"
            });

            crosshairItem.on("click", () => {
                game.console.setBuiltInCVar("cv_loadout_crosshair", crosshairIndex);
                loadCrosshair();
                crosshairItem.addClass("selected")
                    .siblings()
                    .removeClass("selected");
            });

            return crosshairItem;
        })
    );

    // Load special tab
    if (game.console.getBuiltInCVar("dv_role") !== "") {
        $("#tab-special").show();

        $<HTMLInputElement>("#role-name")
            .val(game.console.getBuiltInCVar("dv_role"))
            .on("input", e => {
                game.console.setBuiltInCVar("dv_role", e.target.value);
            });

        $<HTMLInputElement>("#role-password").on("input", e => {
            game.console.setBuiltInCVar("dv_password", e.target.value);
        });

        addCheckboxListener("#toggle-lobbyclearing", "dv_lobby_clearing");

        if (game.console.getBuiltInCVar("dv_name_color") === "") game.console.setBuiltInCVar("dv_name_color", "#FFFFFF");

        $<HTMLInputElement>("#namecolor-color-picker")
            .val(game.console.getBuiltInCVar("dv_name_color"))
            .on("input", e => {
                game.console.setBuiltInCVar("dv_name_color", e.target.value);
            });

        $<HTMLInputElement>("#weapon-preset")
            .val(game.console.getBuiltInCVar("dv_weapon_preset"))
            .on("input", e => {
                game.console.setBuiltInCVar("dv_weapon_preset", e.target.value);
            });
    }

    // Load badges
    const allowedBadges = Badges.definitions.filter(({ roles }) => !roles?.length || roles.includes(role));

    if (allowedBadges.length > 0) {
        $("#tab-badges").show();

        const noBadgeItem = $<HTMLDivElement>(
            "<div id=\"badge-\" class=\"badges-list-item-container\">\
                <div class=\"badges-list-item\"> </div>\
                <span class=\"badge-name\">None</span>\
            </div>"
        );

        noBadgeItem.on("click", () => {
            game.console.setBuiltInCVar("cv_loadout_badge", "");
            noBadgeItem.addClass("selected").siblings().removeClass("selected");
        });

        const activeBadge = game.console.getBuiltInCVar("cv_loadout_badge");

        const badgeUiCache: Record<ReferenceTo<BadgeDefinition>, JQuery<HTMLDivElement>> = { [""]: noBadgeItem };

        function selectBadge(idString: ReferenceTo<BadgeDefinition>): void {
            badgeUiCache[idString].addClass("selected")
                .siblings()
                .removeClass("selected");
        }

        $("#badges-list").append(
            noBadgeItem,
            ...allowedBadges.map(({ idString, name }) => {
                // noinspection CssUnknownTarget
                const badgeItem = badgeUiCache[idString] = $<HTMLDivElement>(
                    `<div id="badge-${idString}" class="badges-list-item-container${idString === activeBadge ? " selected" : ""}">\
                        <div class="badges-list-item">\
                            <div style="background-image: url('./img/game/badges/${idString}.svg')"></div>\
                        </div>\
                        <span class="badge-name">${name}</span>\
                    </div>`
                );

                badgeItem.on("click", () => {
                    game.console.setBuiltInCVar("cv_loadout_badge", idString);
                    selectBadge(idString);
                });

                return badgeItem;
            })
        );

        game.console.variables.addChangeListener(
            "cv_loadout_badge",
            (_, newBadge) => { selectBadge(newBadge); }
        );
    }

    function addSliderListener(
        elementId: string,
        settingName: keyof CVarTypeMapping,
        callback?: (value: number) => void
    ): void {
        const element = $<HTMLInputElement>(elementId)[0] as HTMLInputElement | undefined;
        if (!element) {
            console.error("Invalid element id");
            return;
        }

        let ignore = false;

        element.addEventListener("input", () => {
            if (ignore) return;

            const value = +element.value;
            ignore = true;
            game.console.setBuiltInCVar(settingName, value);
            ignore = false;
            callback?.(value);
        });

        game.console.variables.addChangeListener(settingName, (game, newValue) => {
            if (ignore) return;

            const casted = +newValue;

            callback?.(casted);

            ignore = true;
            element.value = `${casted}`;
            element.dispatchEvent(new InputEvent("input"));
            ignore = false;
        });

        const value = game.console.getBuiltInCVar(settingName) as number;
        callback?.(value);
        element.value = value.toString();
    }

    function addCheckboxListener(
        elementId: string,
        settingName: keyof CVarTypeMapping,
        callback?: (value: boolean) => void
    ): void {
        const element = $<HTMLInputElement>(elementId)[0] as HTMLInputElement | undefined;
        if (!element) {
            console.error("Invalid element id");
            return;
        }

        element.addEventListener("input", () => {
            const value = element.checked;
            game.console.setBuiltInCVar(settingName, value);
            callback?.(value);
        });

        game.console.variables.addChangeListener(settingName, (game, newValue) => {
            const casted = !!newValue;

            callback?.(casted);
            element.checked = casted;
        });

        element.checked = game.console.getBuiltInCVar(settingName) as boolean;
    }

    addSliderListener(
        "#slider-crosshair-size",
        "cv_crosshair_size",
        loadCrosshair
    );
    addSliderListener(
        "#slider-crosshair-stroke-size",
        "cv_crosshair_stroke_size",
        loadCrosshair
    );

    const crosshairColor = $<HTMLInputElement>("#crosshair-color-picker");

    crosshairColor.on("input", function() {
        game.console.setBuiltInCVar("cv_crosshair_color", this.value);
        loadCrosshair();
    });

    game.console.variables.addChangeListener(
        "cv_crosshair_color",
        (game, value) => {
            crosshairColor.val(value);
        }
    );

    const crosshairStrokeColor = $<HTMLInputElement>("#crosshair-stroke-picker");

    crosshairStrokeColor.on("input", function() {
        game.console.setBuiltInCVar("cv_crosshair_stroke_color", this.value);
        loadCrosshair();
    });

    game.console.variables.addChangeListener(
        "cv_crosshair_stroke_color",
        (game, value) => {
            crosshairStrokeColor.val(value);
        }
    );

    // Disable context menu
    ui.game.on("contextmenu", e => { e.preventDefault(); });

    // Scope looping toggle
    addCheckboxListener(
        "#toggle-scope-looping",
        "cv_loop_scope_selection"
    );

    // Toggle auto pickup
    addCheckboxListener(
        "#toggle-autopickup",
        "cv_autopickup"
    );
    $("#toggle-autopickup").parent().parent().toggle(inputManager.isMobile);

    // Autopickup a dual gun
    addCheckboxListener(
        "#toggle-autopickup-dual-guns",
        "cv_autopickup_dual_guns"
    );
    $("#toggle-autopickup-dual-guns").parent().parent().toggle(inputManager.isMobile);

    // Anonymous player names toggle
    addCheckboxListener(
        "#toggle-anonymous-player",
        "cv_anonymize_player_names"
    );

    addCheckboxListener("#toggle-hide-emote", "cv_hide_emotes");

    // Music volume
    addSliderListener(
        "#slider-music-volume",
        "cv_music_volume",
        value => {
            game.music.volume = value;
        }
    );

    // SFX volume
    addSliderListener(
        "#slider-sfx-volume",
        "cv_sfx_volume",
        value => {
            game.soundManager.volume = value;
        }
    );

    // Master volume
    addSliderListener(
        "#slider-master-volume",
        "cv_master_volume",
        value => {
            sound.volumeAll = value;
        }
    );

    // Old menu music
    addCheckboxListener("#toggle-old-music", "cv_use_old_menu_music");

    // Camera shake
    addCheckboxListener("#toggle-camera-shake", "cv_camera_shake_fx");

    // FPS, ping, and coordinates toggles
    for (const prop of ["fps", "ping", "pos"] as const) {
        const debugReadout = game.uiManager.debugReadouts[prop];

        debugReadout.toggle(game.console.getBuiltInCVar(`pf_show_${prop}`));

        addCheckboxListener(
            `#toggle-${prop}`,
            `pf_show_${prop}`,
            value => debugReadout.toggle(value)
        );
    }

    // lmao one day, we'll have dropdown menus

    // Text killfeed toggle
    {
        const element = $<HTMLInputElement>("#toggle-text-kill-feed")[0];

        element.addEventListener("input", () => {
            game.console.setBuiltInCVar("cv_killfeed_style", element.checked ? "text" : "icon");
        });

        game.console.variables.addChangeListener("cv_killfeed_style", (game, value) => {
            element.checked = value === "text";
            game.uiManager.updateWeaponSlots();
        });

        element.checked = game.console.getBuiltInCVar("cv_killfeed_style") === "text";
    }

    // Weapon slot style toggle
    {
        const element = $<HTMLInputElement>("#toggle-colored-slots")[0];

        element.addEventListener("input", () => {
            game.console.setBuiltInCVar("cv_weapon_slot_style", element.checked ? "colored" : "simple");
            game.uiManager.updateWeaponSlots();
        });

        game.console.variables.addChangeListener("cv_weapon_slot_style", (game, value) => {
            console.trace();
            element.checked = value === "colored";
            game.uiManager.updateWeaponSlots();
        });

        element.checked = game.console.getBuiltInCVar("cv_weapon_slot_style") === "colored";
    }

    // render mode select menu
    const renderSelect = $<HTMLSelectElement>("#render-mode-select")[0];
    renderSelect.addEventListener("input", () => {
        game.console.setBuiltInCVar("cv_renderer", renderSelect.value as unknown as "webgl1" | "webgl2" | "webgpu");
    });
    renderSelect.value = game.console.getBuiltInCVar("cv_renderer");

    void (async() => {
        $("#webgpu-option").toggle(await isWebGPUSupported());
    })();

    // render resolution select menu
    const renderResSelect = $<HTMLSelectElement>("#render-res-select")[0];
    renderResSelect.addEventListener("input", () => {
        game.console.setBuiltInCVar("cv_renderer_res", renderResSelect.value as unknown as "auto" | "0.5" | "1" | "2" | "3");
    });
    renderResSelect.value = game.console.getBuiltInCVar("cv_renderer_res");

    // High resolution toggle
    $("#toggle-high-res").parent().parent().toggle(!inputManager.isMobile);
    addCheckboxListener("#toggle-high-res", "cv_high_res_textures");
    addCheckboxListener("#toggle-cooler-graphics", "cv_cooler_graphics");

    game.console.variables.addChangeListener(
        "cv_cooler_graphics",
        (_, newVal, oldVal) => {
            if (newVal !== oldVal && !newVal) {
                for (const player of game.objects.getCategory(ObjectCategory.Player)) {
                    const { images: { blood: { children } }, bloodDecals } = player;

                    for (const child of children) {
                        child.destroy();
                    }

                    children.length = 0;

                    for (const decal of bloodDecals) {
                        decal.kill();
                    }
                }
            }
        }
    );

    const { gameUi } = game.uiManager.ui;

    game.console.variables.addChangeListener(
        "cv_draw_hud",
        (_, newVal) => {
            gameUi.toggle(newVal);
            game.map.visible = !game.console.getBuiltInCVar("cv_minimap_minimized") && newVal;
        }
    );
    addCheckboxListener("#toggle-draw-hud", "cv_draw_hud");

    // Anti-aliasing toggle
    addCheckboxListener("#toggle-antialias", "cv_antialias");

    // Movement smoothing toggle
    addCheckboxListener("#toggle-movement-smoothing", "cv_movement_smoothing");

    // Responsive rotation toggle
    addCheckboxListener("#toggle-responsive-rotation", "cv_responsive_rotation");

    // Mobile controls stuff
    addCheckboxListener("#toggle-mobile-controls", "mb_controls_enabled");
    addSliderListener("#slider-joystick-size", "mb_joystick_size");
    addSliderListener("#slider-joystick-transparency", "mb_joystick_transparency");
    addCheckboxListener("#toggle-high-res-mobile", "mb_high_res_textures");

    function updateUiScale(): void {
        const scale = game.console.getBuiltInCVar("cv_ui_scale");

        gameUi.width(window.innerWidth / scale);
        gameUi.height(window.innerHeight / scale);
        gameUi.css("transform", `scale(${scale})`);
    }
    updateUiScale();
    window.addEventListener("resize", () => updateUiScale());

    addSliderListener(
        "#slider-ui-scale",
        "cv_ui_scale",
        () => {
            updateUiScale();
            game.map.resize();
        }
    );

    // TODO: fix joysticks on mobile when UI scale is not 1
    if (inputManager.isMobile) {
        $("#ui-scale-container").hide();
        game.console.setBuiltInCVar("cv_ui_scale", 1);
    }

    // Minimap stuff
    addSliderListener(
        "#slider-minimap-transparency",
        "cv_minimap_transparency",
        () => {
            game.map.updateTransparency();
        }
    );
    addSliderListener(
        "#slider-big-map-transparency",
        "cv_map_transparency",
        () => {
            game.map.updateTransparency();
        }
    );
    addCheckboxListener(
        "#toggle-hide-minimap",
        "cv_minimap_minimized",
        value => {
            game.map.visible = !value;
        }
    );

    game.console.variables.addChangeListener(
        "cv_map_expanded",
        (_, newValue) => {
            game.map.expanded = newValue;
        }
    );

    // Leave warning
    addCheckboxListener("#toggle-leave-warning", "cv_leave_warning");

    const splashUi = $<HTMLInputElement>("#splash-ui");
    // Blur splash screen
    addCheckboxListener(
        "#toggle-blur-splash",
        "cv_blur_splash",
        value => {
            splashUi.toggleClass("blur", value);
        }
    );
    splashUi.toggleClass("blur", game.console.getBuiltInCVar("cv_blur_splash"));

    const button = $<HTMLButtonElement>("#btn-rules, #rules-close-btn");
    // Hide rules button
    addCheckboxListener(
        "#toggle-hide-rules",
        "cv_hide_rules_button",
        value => {
            button.toggle(!value);
        }
    );
    button.toggle(!game.console.getBuiltInCVar("cv_hide_rules_button"));

    // Hide option to hide rules if rules haven't been acknowledged
    $(".checkbox-setting").has("#toggle-hide-rules").toggle(game.console.getBuiltInCVar("cv_rules_acknowledged"));

    const rules = $<HTMLButtonElement>("#btn-rules, #rules-close-btn");
    const toggleHideRules = $<HTMLInputElement>("#toggle-hide-rules");

    $("#rules-close-btn").on("click", () => {
        rules.hide();
        game.console.setBuiltInCVar("cv_hide_rules_button", true);
        toggleHideRules.prop("checked", true);
    }).toggle(game.console.getBuiltInCVar("cv_rules_acknowledged") && !game.console.getBuiltInCVar("cv_hide_rules_button"));

    // Import settings
    $("#import-settings-btn").on("click", () => {
        if (!confirm("This option will overwrite all settings and reload the page. Continue?")) return;
        const error = (): void => { alert("Invalid config."); };

        try {
            const input = prompt("Enter a config:");
            if (!input) {
                error();
                return;
            }

            const config: unknown = JSON.parse(input);
            if (typeof config !== "object" || config === null || !("variables" in config)) {
                error();
                return;
            }

            localStorage.setItem("suroi_config", input);
            alert("Settings loaded successfully.");
            window.location.reload();
        } catch (e) {
            error();
        }
    });

    // Copy settings to clipboard
    $("#export-settings-btn").on("click", () => {
        const exportedSettings = localStorage.getItem("suroi_config");
        const error = (): void => {
            alert(
                "Unable to copy settings. To export settings manually, open the dev tools with Ctrl+Shift+I (Cmd+Opt+I on Mac) "
                + "and, after typing in the following, copy the result manually: localStorage.getItem(\"suroi_config\")"
            );
        };
        if (exportedSettings === null) {
            error();
            return;
        }
        navigator.clipboard
            .writeText(exportedSettings)
            .then(() => {
                alert("Settings copied to clipboard.");
            })
            .catch(error);
    });

    // Reset settings
    $("#reset-settings-btn").on("click", () => {
        if (!confirm("This option will reset all settings and reload the page. Continue?")) return;
        if (!confirm("Are you sure? This action cannot be undone.")) return;
        localStorage.removeItem("suroi_config");
        window.location.reload();
    });

    // Switch weapon slots by clicking
    const step = 1; // Define the step for cycling
    const inventorySlotTypings = GameConstants.player.inventorySlotTypings;

    const slotListener = (element: JQuery<HTMLDivElement>, listener: (button: number) => void): void => {
        element[0].addEventListener("pointerdown", (e: PointerEvent): void => {
            listener(e.button);
            e.stopPropagation();
        });
    };

    // Generate the UI for scopes, healing items, weapons, and ammos
    $<HTMLDivElement>("#weapons-container").append(
        ...Array.from(
            { length: GameConstants.player.maxWeapons },
            (_, slot) => {
                const ele = $<HTMLDivElement>(
                    `<div class="inventory-slot" id="weapon-slot-${slot + 1}">\
                        <div class="main-container">\
                            <span class="slot-number">${slot + 1}</span>\
                            <span class="item-ammo"></span>\
                            <img class="item-image" draggable="false" />\
                            <span class="item-name"></span>\
                        </div>\
                        <img class="lock-icon" src="./img/misc/lock.svg"></span>\
                    </div>`
                );

                const isGrenadeSlot = inventorySlotTypings[slot] === ItemType.Throwable;

                ele[0].addEventListener("pointerdown", (e: PointerEvent): void => {
                    if (!ele.hasClass("has-item")) return;

                    e.stopImmediatePropagation();
                    if (
                        isGrenadeSlot
                        && game.activePlayer?.activeItem.itemType === ItemType.Throwable
                    ) {
                        inputManager.cycleThrowable(step);
                    }

                    inputManager.addAction({
                        type: e.button === 2 ? InputActions.DropWeapon : InputActions.EquipItem,
                        slot
                    });
                });
                return ele;
            }
        )
    );

    $<HTMLDivElement>("#scopes-container").append(
        Scopes.definitions.map(scope => {
            const ele = $<HTMLDivElement>(
                `<div class="inventory-slot item-slot" id="${scope.idString}-slot" style="display: none;">
                    <img class="item-image" src="./img/game/loot/${scope.idString}.svg" draggable="false">
                    <div class="item-tooltip">${scope.name.split(" ")[0]}</div>
                </div>`
            );

            slotListener(ele, button => {
                if (button === 0) {
                    inputManager.addAction({
                        type: InputActions.UseItem,
                        item: scope
                    });
                }

                if (button === 2 && game.teamMode) {
                    inputManager.addAction({
                        type: InputActions.DropItem,
                        item: scope
                    });
                }
            });

            if (UI_DEBUG_MODE) ele.show();

            return ele;
        })
    );

    $<HTMLDivElement>("#healing-items-container").append(
        HealingItems.definitions.map(item => {
            const ele = $<HTMLDivElement>(
                `<div class="inventory-slot item-slot active" id="${item.idString}-slot">
                    <img class="item-image" src="./img/game/loot/${item.idString}.svg" draggable="false">
                    <span class="item-count" id="${item.idString}-count">0</span>
                    <div class="item-tooltip">
                        ${item.name}
                        <br>
                        Restores ${item.restoreAmount}${item.healType === HealType.Adrenaline ? "% adrenaline" : " health"}
                    </div>
                </div>`
            );

            slotListener(ele, button => {
                if (button === 0) {
                    if (inputManager.pingWheelActive) {
                        inputManager.addAction({
                            type: InputActions.Emote,
                            emote: Emotes.fromString(item.idString)
                        });
                    } else {
                        inputManager.addAction({
                            type: InputActions.UseItem,
                            item
                        });
                    }
                }

                if (button === 2 && game.teamMode) {
                    inputManager.addAction({
                        type: InputActions.DropItem,
                        item
                    });
                }
            });

            return ele;
        })
    );

    const ammoContainers = {
        true: $<HTMLDivElement>("#special-ammo-container"),
        false: $<HTMLDivElement>("#ammo-container")
    } as const;

    for (const ammo of Ammos) {
        if (ammo.ephemeral) continue;

        const ele = $<HTMLDivElement>(
            `<div class="inventory-slot item-slot ammo-slot active" id="${ammo.idString}-slot">
                <img class="item-image" src="./img/game/loot/${ammo.idString}.svg" draggable="false">
                <span class="item-count" id="${ammo.idString}-count">0</span>
            </div>`
        );

        ammoContainers[`${ammo.hideUnlessPresent}`].append(ele);

        slotListener(ele, button => {
            if (button === 0 && inputManager.pingWheelActive) {
                inputManager.addAction({
                    type: InputActions.Emote,
                    emote: Emotes.fromString(ammo.idString)
                });
            }

            if (button === 2 && game.teamMode) {
                inputManager.addAction({
                    type: InputActions.DropItem,
                    item: ammo
                });
            }
        });
    }

    for (
        const [ele, type] of [
            [$<HTMLDivElement>("#helmet-slot"), "helmet"],
            [$<HTMLDivElement>("#vest-slot"), "vest"]
        ] as const
    ) {
        slotListener(ele, button => {
            if (button === 2 && game.activePlayer && game.teamMode) {
                inputManager.addAction({
                    type: InputActions.DropItem,
                    // clicking on the slot necessitates the presence of an item
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    item: game.activePlayer.getEquipment(type)!
                });
            }
        });
    }

    const optionsIcon = $("#btn-spectate-options-icon");
    $<HTMLButtonElement>("#btn-spectate-options").on("click", () => {
        ui.spectatingContainer.toggle();

        const visible = ui.spectatingContainer.is(":visible");
        optionsIcon
            .toggleClass("fa-eye", !visible)
            .toggleClass("fa-eye-slash", visible);
    });

    // Hide mobile settings on desktop
    $("#tab-mobile").toggle(isMobile.any);

    // Mobile event listeners
    if (inputManager.isMobile) {
        // Interact message
        ui.interactMsg.on("click", () => {
            if (game.uiManager.action.active) {
                inputManager.addAction(InputActions.Cancel);
            } else {
                inputManager.addAction(InputActions.Interact);
                inputManager.addAction(InputActions.Loot);
            }
        });
        // noinspection HtmlUnknownTarget
        ui.interactKey.html('<img src="./img/misc/tap-icon.svg" alt="Tap">');

        // Active weapon ammo button reloads
        $("#weapon-clip-reload-icon").show();
        ui.activeAmmo.on("click", () => game.console.handleQuery("reload"));

        // Emote button & wheel
        ui.emoteWheel
            .css("top", "50%")
            .css("left", "50%");

        const createEmoteWheelListener = (slot: typeof emoteSlots[number], emoteSlot: number): void => {
            $(`#emote-wheel .emote-${slot}`).on("click", () => {
                ui.emoteWheel.hide();
                let clicked = true;

                if (inputManager.pingWheelActive) {
                    const ping = game.uiManager.mapPings[emoteSlot];

                    setTimeout(() => {
                        let gameMousePosition: Vector;

                        if (game.map.expanded) {
                            ui.game.one("click", () => {
                                gameMousePosition = inputManager.pingWheelPosition;

                                if (ping && inputManager.pingWheelActive && clicked) {
                                    inputManager.addAction({
                                        type: InputActions.MapPing,
                                        ping,
                                        position: gameMousePosition
                                    });

                                    clicked = false;
                                }
                            });
                        } else {
                            ui.game.one("click", e => {
                                const globalPos = Vec.create(e.clientX, e.clientY);
                                const pixiPos = game.camera.container.toLocal(globalPos);
                                gameMousePosition = Vec.scale(pixiPos, 1 / PIXI_SCALE);

                                if (ping && inputManager.pingWheelActive && clicked) {
                                    inputManager.addAction({
                                        type: InputActions.MapPing,
                                        ping,
                                        position: gameMousePosition
                                    });

                                    clicked = false;
                                }
                            });
                        }
                    }, 100); // 0.1 second (to wait for the emote wheel)
                } else {
                    const emote = game.uiManager.emotes[emoteSlot];
                    if (emote) {
                        inputManager.addAction({
                            type: InputActions.Emote,
                            emote
                        });
                    }
                }
            });
        };

        createEmoteWheelListener("top", 0);
        createEmoteWheelListener("right", 1);
        createEmoteWheelListener("bottom", 2);
        createEmoteWheelListener("left", 3);

        $("#mobile-options").show();

        ui.menuButton.on("click", () => ui.gameMenu.toggle());
        ui.emoteButton.on("click", () => ui.emoteWheel.show());

        ui.pingToggle.on("click", () => {
            inputManager.pingWheelActive = !inputManager.pingWheelActive;
            const { pingWheelActive } = inputManager;
            ui.pingToggle
                .toggleClass("btn-danger", pingWheelActive)
                .toggleClass("btn-primary", !pingWheelActive);

            game.uiManager.updateEmoteWheel();
        });
    }

    // Prompt when trying to close the tab while playing
    window.addEventListener("beforeunload", (e: Event) => {
        if (ui.canvas.hasClass("active") && game.console.getBuiltInCVar("cv_leave_warning") && !game.gameOver) {
            e.preventDefault();
        }
    });

    const wrapperCache = new ExtendedMap<HTMLElement, JQuery>();

    // Hack to style range inputs background and add a label with the value :)
    function updateRangeInput(element: HTMLInputElement): void {
        const value = +element.value;
        const min = +element.min;
        const max = +element.max;
        const x = ((value - min) / (max - min)) * 100;

        wrapperCache.getAndGetDefaultIfAbsent(element, () => $(element))
            .css(
                "--background",
                `linear-gradient(to right, #ff7500 0%, #ff7500 ${x}%, #f8f9fa ${x}%, #f8f9fa 100%)`
            )
            .siblings(".range-input-value")
            .text(
                element.id !== "slider-joystick-size"
                    ? `${Math.round(value * 100)}%`
                    : value
            );
    }

    $<HTMLInputElement>("input[type=range]")
        .on("input", ({ target }) => {
            updateRangeInput(target);
        })
        .each((_, element) => {
            updateRangeInput(element);
        });

    $(".tab").on("click", ({ target }) => {
        const tab = wrapperCache.getAndGetDefaultIfAbsent(target, () => $(target));

        tab.addClass("active");
        tab.siblings().removeClass("active");

        const tabContent = $(`#${target.id}-content`);

        tabContent.siblings().removeClass("active");
        tabContent.siblings().hide();

        tabContent.addClass("active");
        tabContent.show();
    });

    const soloButtons = $<HTMLButtonElement>("#warning-btn-play-solo, #btn-play-solo");
    $<HTMLInputElement>("#warning-modal-agree-checkbox").on("click", function() {
        soloButtons.toggleClass("btn-disabled", !this.checked);
    });

    const soloButton = $<HTMLButtonElement>("#btn-play-solo");
    $("#warning-btn-play-solo").on("click", () => {
        ui.warningModal.hide();
        soloButton.trigger("click");
    });

    const joinTeam = $("#btn-join-team");
    if (window.location.hash) {
        teamID = window.location.hash.slice(1);
        joinTeam.trigger("click");
    }
}

//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣠⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣄⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣤⣶⣾⣿⣿⡿⠟⠛⠛⠛⠛⠛⠻⠿⣿⣿⣿⣿⣿⣷⣶⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣶⣿⣿⣿⣿⠟⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⢿⣿⣿⣿⣿⣿⣿⣶⣤⣄⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣠⣶⣿⣿⣿⣿⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⣿⣿⣷⡄⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⣼⡿⣿⣿⣿⣿⣿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⢻⣿⡟⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠘⢿⣼⡟⢻⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠳⠆⠀⠀⠀⠹⣿⣿⣿⣿⣿⣿⡟⠁⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⢈⣻⣷⣾⣿⡇⠀⠀⠀⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⢻⣿⣿⣿⡿⢋⡀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣿⠉⠙⢿⣿⡇⠀⠀⠀⠈⢻⣿⣷⣶⣄⣠⠀⠀⠀⣀⣠⣾⣿⣿⡯⠉⠁⠀⠀⠀⢻⣿⣿⡿⠛⢿⡆⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣟⠀⠘⢾⡿⠀⠀⠀⢀⣠⣤⣶⣿⣿⣿⠟⠀⠀⣿⣿⣿⣿⣿⣷⣦⣄⡀⠀⠀⠀⢸⣿⣯⠀⣶⡆⣿⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣿⠈⠀⣼⠃⠀⠀⠘⠋⠁⣈⣹⣿⣿⠏⠀⠀⠀⣿⣿⣏⠀⣈⣁⣈⡝⠻⠿⡆⠀⠰⣿⣏⠈⣿⢷⡟⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠰⡇⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⢸⣽⣿⣆⠀⠀⠀⠀⠀⠀⠁⠀⢸⣿⣿⡆⣏⣿⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⢱⡀⠀⠀⠀⠀⠀⠀⠀⠀⣀⠀⠀⠀⠀⠀⠀⢿⣿⡄⠀⠀⠀⠀⠀⠀⠀⢸⣿⡟⣿⣿⡇⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠙⣄⠀⠀⣸⡄⠀⠀⠀⠀⠀⢀⡞⠁⣤⣤⣀⣠⣤⣀⣄⣸⣿⣦⡀⠀⠀⠀⠀⠀⢸⣿⣄⠟⣼⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠹⠷⠶⠻⡇⠀⠀⠀⠀⠀⠟⠀⠀⠀⠀⠉⠙⠿⠿⣿⠉⢀⡿⣷⡀⢸⣇⢰⠀⠸⣿⣡⡾⠃⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⡇⠀⠀⠀⠀⠀⣀⠀⠀⠀⠀⠐⠛⠀⠀⠁⠀⠀⢰⡟⢷⢸⣿⢀⠀⠀⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⡇⠀⠀⠀⠀⣼⡿⠓⠶⠒⠛⠛⠉⠙⠛⠻⠻⠿⣿⡇⠀⢸⡟⠀⠀⣠⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢘⡇⠒⠀⠀⠀⠈⠀⠀⠀⠀⠀⣶⠶⠶⠶⠶⠀⢀⣿⠁⢠⡾⠁⠀⣰⣿⠉⢇⠀⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⡷⠶⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠁⠀⠿⠃⢀⣴⡟⢹⡄⠘⣧⠀⠀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⠞⢁⡆⠀⠐⢢⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⠒⠀⠀⣠⣴⣿⡟⣰⡿⣡⡄⠈⢣⡀⠀⠀⠀⠀⠀⠀
//  ⠀⠀⠀⠀⠀⣀⣠⡤⠖⠒⠋⠁⠀⠘⣷⠀⠀⠀⠙⠦⣄⣀⣀⣀⣀⣀⣤⣶⣿⣦⣤⣴⣶⣿⡿⢋⣼⠟⢁⣿⠁⣠⣤⡉⠀⠀⠀⠀⠀⠀
//  ⣠⠤⠔⠒⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⢹⡆⠀⠀⠀⠀⠉⠻⣿⣿⣿⣯⣥⣤⣤⣶⣿⣿⡿⠋⣠⡿⠁⠀⠀⠁⠲⢈⣿⣿⣷⣤⣄⠀⠀⠀
//  ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢦⡀⠤⡄⠀⠀⠀⠀⠉⡻⢿⣧⣿⣿⡟⢋⣤⡾⠋⠀⠀⠀⠀⠘⠛⢺⣿⣿⣿⣿⣿⣷⣤⣤
//  ⡀⠀⣀⣀⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢦⣈⣳⣦⣤⣤⣿⣿⣿⠟⢋⣡⣶⣿⠋⢀⠀⠀⠀⡀⠀⠀⢀⡌⠘⣿⣿⣿⣿⣿⣿⣿
//
