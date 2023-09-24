import $ from "jquery";

import { type Config, localStorageInstance } from "./utils/localStorageHandler";
import { UI_DEBUG_MODE } from "./utils/constants";
import { requestFullscreen } from "./utils/misc";
import {
    ALLOW_NON_ASCII_USERNAME_CHARS,
    InputActions,
    INVENTORY_MAX_WEAPONS,
    SpectateActions
} from "../../../common/src/constants";
import { Scopes } from "../../../common/src/definitions/scopes";
import { HealingItems, HealType } from "../../../common/src/definitions/healingItems";
import { Ammos } from "../../../common/src/definitions/ammos";
import { Skins } from "../../../common/src/definitions/skins";
import { Emotes } from "../../../common/src/definitions/emotes";
import { SpectatePacket } from "./packets/sending/spectatePacket";
import { type Game } from "./game";
import { isMobile } from "pixi.js";
import { stripNonASCIIChars } from "../../../common/src/utils/misc";

const body = $(document.body);
export function createDropdown(selector: string): void {
    const dropdown = {
        main: $(`${selector} .dropdown-content`),
        caret: $(`${selector} button i`),
        active: false,
        show() {
            this.active = true;
            this.main.addClass("active");
            this.caret.removeClass("fa-caret-down").addClass("fa-caret-up");
        },
        hide() {
            this.active = false;
            this.main.removeClass("active");
            this.caret.addClass("fa-caret-down").removeClass("fa-caret-up");
        },
        toggle() {
            this.active
                ? this.hide()
                : this.show();
        }
    };
    $(`${selector} button`).on("click", ev => {
        dropdown.toggle();
        ev.stopPropagation();
    });
    body.on("click", () => { dropdown.hide(); });
}

export function setupUI(game: Game): void {
    if (UI_DEBUG_MODE) {
        // Kill message
        $("#kill-msg-kills").text("Kills: 7");
        $("#kill-msg-word").text("obliterated");
        $("#kill-msg-player-name").html("Player");
        $("#kill-msg-weapon-used").text(" with Mosin-Nagant (streak: 255)");
        $("#kill-msg").show();

        // Spectating message
        $("#spectating-msg-info").html('<span style="font-weight: 600">Spectating</span> <span style="margin-left: 3px">Player</span>');
        $("#spectating-msg").show();

        // Gas message
        $("#gas-msg-info").text("Toxic gas is advancing! Move to the safe zone").css("color", "cyan");
        $("#gas-msg").show();

        $("#weapon-ammo-container").show();

        // Kill feed messages
        for (let i = 0; i < 5; i++) {
            const killFeedItem = $("<div>");
            killFeedItem.addClass("kill-feed-item");
            // noinspection HtmlUnknownTarget
            killFeedItem.html('<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> Player killed Player with Mosin-Nagant');
            $("#kill-feed").prepend(killFeedItem);
        }
    }

    //createDropdown("#splash-more");

    const usernameField = $("#username-input");

    const youtubers = [
        {
            name: "Summit",
            link: "https://www.youtube.com/@SummitNewsNetwork"
        },
        {
            name: "123OP",
            link: "https://www.youtube.com/@123op."
        },
        {
            name: "Gonester",
            link: "https://www.youtube.com/@gonester"
        },
        {
            name: "TEAMFIGHTER 27",
            link: "https://www.youtube.com/channel/UCJF75th14wo3O4YvH8GfFXw"
        },
        {
            name: "Ukraines dude",
            link: "https://www.youtube.com/channel/UCAdNONfEL-UOXDQnMkhhlHA"
        },
        {
            name: "monet",
            link: "https://www.youtube.com/@stardust_737"
        }
    ];

    const youtuber = youtubers[Math.floor(Math.random() * youtubers.length)];
    $("#youtube-featured-name").text(youtuber.name);
    $("#youtube-featured-content").attr("href", youtuber.link);

    const streamers = [
        {
            name: "iMoRTaL_Mafia",
            link: "https://www.twitch.tv/imortal_mafia"
        }
    ];

    const streamer = streamers[Math.floor(Math.random() * streamers.length)];
    $("#twitch-featured-name").text(streamer.name);
    $("#twitch-featured-content").attr("href", streamer.link);

    const toggleRotateMessage = (): JQuery => $("#splash-rotate-message").toggle(window.innerWidth < window.innerHeight);
    toggleRotateMessage();
    $(window).on("resize", toggleRotateMessage);

    const gameMenu = $("#game-menu");
    const settingsMenu = $("#settings-menu");

    usernameField.val(localStorageInstance.config.playerName);
    usernameField.on("input", () => {
        // Remove non-ASCII chars
        if (!ALLOW_NON_ASCII_USERNAME_CHARS) {
            usernameField.val(stripNonASCIIChars(
                // Replace fancy quotes & dashes first, so they don't get stripped out
                (usernameField.val() as string)
                    .replaceAll(/[\u201c\u201d\u201f]/g, '"')
                    .replaceAll(/[\u2018\u2019\u201b]/g, "'")
                    .replaceAll(/[\u2013\u2014]/g, "-")
            ));
        }
        localStorageInstance.update({ playerName: usernameField.val() as string });
    });

    createDropdown("#server-select");

    const serverSelect = $<HTMLSelectElement>("#server-select");

    // Select region
    serverSelect.on("change", (e: Event) => {
        const value = serverSelect.val() as string | undefined;

        if (value !== undefined) {
            localStorageInstance.update({ region: value });
        }
    });

    const rulesBtn = $("#btn-rules");

    // Highlight rules & tutorial button for new players
    if (!localStorageInstance.config.rulesAcknowledged) {
        rulesBtn.removeClass("btn-secondary").addClass("highlighted");
    }

    // Event listener for rules button
    rulesBtn.on("click", () => {
        localStorageInstance.update({ rulesAcknowledged: true });
        location.href = "/rules";
    });

    $("#btn-quit-game").on("click", () => { game.endGame(); });
    $("#btn-play-again").on("click", () => { game.endGame(); });

    const sendSpectatePacket = (action: SpectateActions): void => { game.sendPacket(new SpectatePacket(game.playerManager, action)); };

    $("#btn-spectate").on("click", () => {
        sendSpectatePacket(SpectateActions.BeginSpectating);
        game.spectating = true;
        game.map.indicator.setFrame("player_indicator");
    });

    $("#btn-spectate-previous").on("click", () => { sendSpectatePacket(SpectateActions.SpectatePrevious); });
    $("#btn-report").on("click", () => {
        if (confirm("Are you sure you want to report this player?\nPlayers should only be reported for teaming or hacking.")) {
            sendSpectatePacket(SpectateActions.Report);
        }
    });
    $("#btn-spectate-next").on("click", () => { sendSpectatePacket(SpectateActions.SpectateNext); });

    $("#btn-resume-game").on("click", () => gameMenu.hide());
    $("#btn-fullscreen").on("click", () => {
        requestFullscreen();
        $("#game-menu").hide();
    });

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape" && $("canvas").hasClass("active")) {
            gameMenu.fadeToggle(250);
            settingsMenu.hide();
        }
    });

    $("#btn-settings").on("click", () => {
        settingsMenu.fadeToggle(250);
        settingsMenu.removeClass("in-game");
    });

    $("#btn-settings-game").on("click", () => {
        gameMenu.hide();
        settingsMenu.fadeToggle(250);
        settingsMenu.addClass("in-game");
    });

    $("#close-settings").on("click", () => {
        settingsMenu.fadeOut(250);
    });

    const customizeMenu = $("#customize-menu");
    $("#btn-customize").on("click", () => customizeMenu.fadeToggle(250));
    $("#close-customize").on("click", () => customizeMenu.fadeOut(250));

    $("#close-report").on("click", () => $("#report-modal").fadeOut(250));

    $("#btn-copy-report-id").on("click", () => {
        navigator.clipboard.writeText($("#report-id-input").val() as string)
            .then(() => {
                $("#btn-copy-report-id").html('<i class="fa-solid fa-check"></i> Copied');
            })
            .catch(() => {
                alert("Unable to copy report ID. Please copy it manually.");
            });
    });

    // Load skins
    const updateSplashCustomize = (skinID: string): void => {
        $("#skin-base").css("background-image", `url("./img/game/skins/${skinID}_base.svg")`);
        $("#skin-left-fist, #skin-right-fist").css("background-image", `url("./img/game/skins/${skinID}_fist.svg")`);
    };
    updateSplashCustomize(localStorageInstance.config.loadout.skin);
    for (const skin of Skins) {
        if (skin.notInLoadout ?? (skin.roleRequired !== undefined && skin.roleRequired !== localStorageInstance.config.role)) continue;

        /* eslint-disable @typescript-eslint/restrict-template-expressions */
        // noinspection CssUnknownTarget
        const skinItem = $(`<div id="skin-${skin.idString}" class="skins-list-item-container">
  <div class="skins-list-item">
    <div class="skin-base" style="background-image: url('./img/game/skins/${skin.idString}_base.svg')"></div>
    <div class="skin-left-fist" style="background-image: url('./img/game/skins/${skin.idString}_fist.svg')"></div>
    <div class="skin-right-fist" style="background-image: url('./img/game/skins/${skin.idString}_fist.svg')"></div>
  </div>
  <span class="skin-name">${skin.name}</span>
</div>`);
        skinItem.on("click", function() {
            localStorageInstance.update({
                loadout: {
                    ...localStorageInstance.config.loadout,
                    skin: skin.idString
                }
            });
            $(this).addClass("selected").siblings().removeClass("selected");
            updateSplashCustomize(skin.idString);
        });
        $("#skins-list").append(skinItem);
    }
    $(`#skin-${localStorageInstance.config.loadout.skin}`).addClass("selected");

    // Load emotes
    let selectedEmoteSlot: string | undefined;
    for (const emote of Emotes.definitions) {
        // noinspection CssUnknownTarget
        const emoteItem = $(`<div id="emote-${emote.idString}" class="emotes-list-item-container">
  <div class="emotes-list-item" style="background-image: url('/img/game/emotes/${emote.idString}.svg')"></div>
  <span class="emote-name">${emote.name}</span>
</div>`);
        emoteItem.on("click", function() {
            if (selectedEmoteSlot === undefined) return;
            localStorageInstance.update({
                loadout: {
                    ...localStorageInstance.config.loadout,
                    [`${selectedEmoteSlot}Emote`]: emote.idString
                }
            });
            $(this).addClass("selected").siblings().removeClass("selected");
            $(`#emote-customize-wheel > .emote-${selectedEmoteSlot}`)
                .css("background-image", `url("./img/game/emotes/${emote.idString}.svg")`);
        });
        $("#emotes-list").append(emoteItem);
    }
    for (const slot of ["top", "right", "bottom", "left"] as Array<"top" | "right" | "bottom" | "left">) {
        $(`#emote-customize-wheel > .emote-${slot}`)
            .css("background-image", `url("./img/game/emotes/${localStorageInstance.config.loadout[`${slot}Emote`]}.svg")`)
            .on("click", () => {
                if (selectedEmoteSlot !== slot) {
                    selectedEmoteSlot = slot;
                    $("#emote-customize-wheel").css("background-image", `url("./img/misc/emote_wheel_highlight_${slot}.svg"), url("/img/misc/emote_wheel.svg")`);
                    $(".emotes-list-item-container").removeClass("selected").css("cursor", "pointer");
                    $(`#emote-${localStorageInstance.config.loadout[`${slot}Emote`]}`).addClass("selected");
                } else {
                    selectedEmoteSlot = undefined;
                    $("#emote-customize-wheel").css("background-image", 'url("./img/misc/emote_wheel.svg")');
                    $(".emotes-list-item-container").removeClass("selected").css("cursor", "default");
                }
            });
    }

    // Disable context menu
    $("#game-ui").on("contextmenu", e => { e.preventDefault(); });

    // Load settings values and event listeners

    function addSliderListener(elementId: string, settingName: keyof Config, callback?: (value: number) => void): void {
        const element = $(elementId)[0] as HTMLInputElement;
        if (!element) console.error("Invalid element id");

        element.addEventListener("input", () => {
            const value = Number(element.value);
            const obj: Partial<Config> = {};
            (obj[settingName] as number) = value;
            localStorageInstance.update(obj);

            callback?.(value);
        });

        element.value = (localStorageInstance.config[settingName] as number).toString();
    }

    function addCheckboxListener(elementId: string, settingName: keyof Config, callback?: (value: boolean) => void): void {
        const element = $(elementId)[0] as HTMLInputElement;

        element.addEventListener("input", () => {
            const value = element.checked;
            const obj: Partial<Config> = {};
            (obj[settingName] as boolean) = value;
            localStorageInstance.update(obj);

            callback?.(value);
        });

        element.checked = localStorageInstance.config[settingName] as boolean;
    }

    // Scope looping toggle
    addCheckboxListener("#toggle-scope-looping", "scopeLooping");

    addCheckboxListener("#toggle-anonymous-player", "anonymousPlayers");

    // Music volume
    addSliderListener("#slider-music-volume", "musicVolume", (value: number) => {
        game.music.volume(value);
    });

    // SFX volume
    addSliderListener("#slider-sfx-volume", "sfxVolume", (value: number) => {
        game.soundManager.volume = value;
    });

    // Master volume
    addSliderListener("#slider-master-volume", "masterVolume", (value: number) => {
        Howler.volume(value);
    });
    Howler.volume(localStorageInstance.config.masterVolume);

    // Old menu music
    addCheckboxListener("#toggle-old-music", "oldMenuMusic");

    // Camera shake
    addCheckboxListener("#toggle-camera-shake", "cameraShake");

    // FPS toggle
    addCheckboxListener("#toggle-fps", "showFPS", (value: boolean) => {
        $("#fps-counter").toggle(value);
    });
    $("#fps-counter").toggle(localStorageInstance.config.showFPS);

    // Ping toggle
    addCheckboxListener("#toggle-ping", "showPing", (value: boolean) => {
        $("#ping-counter").toggle(value);
    });
    $("#ping-counter").toggle(localStorageInstance.config.showPing);

    // Coordinates toggle
    addCheckboxListener("#toggle-coordinates", "showCoordinates", (value: boolean) => {
        $("#coordinates-hud").toggle(value);
    });
    $("#coordinates-hud").toggle(localStorageInstance.config.showCoordinates);

    // Client-side prediction toggle
    addCheckboxListener("#toggle-client-side-prediction", "clientSidePrediction");

    // Text kill feed toggle
    addCheckboxListener("#toggle-text-kill-feed", "textKillFeed");

    // Rotation smoothing toggle
    addCheckboxListener("#toggle-rotation-smoothing", "rotationSmoothing");

    // Movement smoothing toggle
    addCheckboxListener("#toggle-movement-smoothing", "movementSmoothing");

    // Mobile controls stuff
    addCheckboxListener("#toggle-mobile-controls", "mobileControls");
    addSliderListener("#slider-joystick-size", "joystickSize");
    addSliderListener("#slider-joystick-transparency", "joystickTransparency");

    // Minimap stuff
    addSliderListener("#slider-minimap-transparency", "minimapTransparency", () => {
        game.map.updateTransparency();
    });

    addSliderListener("#slider-big-map-transparency", "bigMapTransparency", () => {
        game.map.updateTransparency();
    });

    addCheckboxListener("#toggle-hide-minimap", "minimapMinimized", () => {
        game.map.toggleMiniMap(true);
    });

    // Leave warning
    addCheckboxListener("#toggle-leave-warning", "leaveWarning");

    // Switch weapon slots by clicking
    for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
        const slotElement = $(`#weapon-slot-${i + 1}`);
        slotElement[0].addEventListener("pointerdown", (e: PointerEvent): void => {
            if (slotElement.hasClass("has-item")) {
                e.stopImmediatePropagation();
                if (e.button === 0) game.playerManager.equipItem(i);
                else if (e.button === 2) game.playerManager.dropItem(i);
            }
        });
    }

    // Generate the UI for scopes, healing items and ammos
    for (const scope of Scopes) {
        $("#scopes-container").append(`
        <div class="inventory-slot item-slot" id="${scope.idString}-slot" style="display: none;">
            <img class="item-image" src="./img/game/loot/${scope.idString}.svg" draggable="false">
            <div class="item-tooltip">${scope.name.split(" ")[0]}</div>
        </div>`);

        $(`#${scope.idString}-slot`)[0].addEventListener("pointerdown", (e: PointerEvent) => {
            game.playerManager.useItem(scope.idString);
            e.stopPropagation();
        });
        if (UI_DEBUG_MODE) {
            $(`#${scope.idString}-slot`).show();
        }
    }

    for (const item of HealingItems) {
        $("#healing-items-container").append(`
        <div class="inventory-slot item-slot" id="${item.idString}-slot">
            <img class="item-image" src="./img/game/loot/${item.idString}.svg" draggable="false">
            <span class="item-count" id="${item.idString}-count">0</span>
            <div class="item-tooltip">
                ${item.name}
                <br>
                Restores ${item.restoreAmount}${item.healType === HealType.Adrenaline ? "% adrenaline" : " health"}
            </div>
        </div>`);

        $(`#${item.idString}-slot`)[0].addEventListener("pointerdown", (e: PointerEvent) => {
            game.playerManager.useItem(item.idString);
            e.stopPropagation();
        });
    }

    for (const ammo of Ammos) {
        if (ammo.ephemeral === true) continue;

        $("#ammo-container").append(`
        <div class="inventory-slot item-slot ammo-slot" id="${ammo.idString}-slot">
            <img class="item-image" src="./img/game/loot/${ammo.idString}.svg" draggable="false">
            <span class="item-count" id="${ammo.idString}-count">0</span>
        </div>`);
    }

    // Hide mobile settings on desktop
    $("#tab-mobile").toggle(isMobile.any);

    // Mobile event listeners
    if (game.playerManager.isMobile) {
        // Interact message
        $("#interact-message").on("click", () => {
            game.playerManager.interact();
        });

        // Reload button
        $("#btn-reload").show().on("click", () => {
            game.playerManager.reload();
        });

        // Emote button & wheel
        $("#emote-wheel")
            .css("top", "50%")
            .css("left", "50%")
            .css("transform", "translate(-50%, -50%)");
        $("#btn-emotes").show().on("click", () => {
            $("#emote-wheel").show();
        });
        const createEmoteWheelListener = (slot: string, action: InputActions): void => {
            $(`#emote-wheel .emote-${slot}`).on("click", () => {
                $("#emote-wheel").hide();
                game.playerManager.action = action;
                game.playerManager.dirty.inputs = true;
            });
        };
        createEmoteWheelListener("top", InputActions.TopEmoteSlot);
        createEmoteWheelListener("right", InputActions.RightEmoteSlot);
        createEmoteWheelListener("bottom", InputActions.BottomEmoteSlot);
        createEmoteWheelListener("left", InputActions.LeftEmoteSlot);

        // Game menu
        $("#btn-game-menu").show().on("click", () => {
            $("#game-menu").toggle();
        });
    }

    // Prompt when trying to close the tab while playing
    window.addEventListener("beforeunload", (e: Event) => {
        if ($("canvas").hasClass("active") && localStorageInstance.config.leaveWarning && !game.gameOver) {
            e.preventDefault();
        }
    });

    // Hack to style range inputs background and add a label with the value :)
    function updateRangeInput(element: HTMLInputElement): void {
        const value = +element.value;
        const max = +element.max;
        const min = +element.min;
        const x = (value - min) / (max - min) * 100;
        $(element).css("--background", `linear-gradient(to right, #ff7500 0%, #ff7500 ${x}%, #f8f9fa ${x}%, #f8f9fa 100%)`);
        $(element).siblings(".range-input-value").text(element.id !== "slider-joystick-size" ? `${value * 100}%` : value);
    }

    $("input[type=range]").on("input", (e) => {
        updateRangeInput(e.target as HTMLInputElement);
    }).each((_i, element) => { updateRangeInput(element as HTMLInputElement); });

    $(".tab").on("click", ev => {
        const tab = $(ev.target);

        tab.siblings().removeClass("active");

        tab.addClass("active");

        const tabContent = $(`#${ev.target.id}-content`);

        tabContent.siblings().removeClass("active");
        tabContent.siblings().hide();

        tabContent.addClass("active");
        tabContent.show();
    });
}
