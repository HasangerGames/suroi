import $ from "jquery";
import { UI_DEBUG_MODE } from "./utils/constants";
import { requestFullscreen } from "./utils/misc";
import { InputActions, INVENTORY_MAX_WEAPONS, SpectateActions } from "../../../common/src/constants";
import { Scopes } from "../../../common/src/definitions/scopes";
import { HealingItems, HealType } from "../../../common/src/definitions/healingItems";
import { isMobile } from "pixi.js";
import { Ammos } from "../../../common/src/definitions/ammos";
import { Emotes } from "../../../common/src/definitions/emotes";
import { SpectatePacket } from "./packets/sending/spectatePacket";
import { type Game } from "./game";
import { Skins } from "../../../common/src/definitions/skins";
import { body, createDropdown } from "./uiHelpers";
import { Crosshairs, getCrosshair } from "./utils/crosshairs";
import { type CVarTypeMapping } from "./utils/console/variables";

export function setupUI(game: Game): void {
    if (UI_DEBUG_MODE) {
        // Kill message
        $("#kill-msg-kills").text("Kills: 7");
        $("#kill-msg-word").text("obliterated");
        $("#kill-msg-player-name").html("Player");
        $("#kill-msg-weapon-used").text(" with Mosin-Nagant (streak: 255)");
        $("#kill-msg").show();

        // Spectating message
        $("#spectating-msg-info").html(
            '<span style="font-weight: 600">Spectating</span> <span style="margin-left: 3px">Player</span>'
        );
        $("#spectating-msg").show();

        // Gas message
        $("#gas-msg-info")
            .text("Toxic gas is advancing! Move to the safe zone")
            .css("color", "cyan");
        $("#gas-msg").show();

        $("#weapon-ammo-container").show();

        // Kill feed messages
        for (let i = 0; i < 5; i++) {
            const killFeedItem = $("<div>");
            killFeedItem.addClass("kill-feed-item");
            // noinspection HtmlUnknownTarget
            killFeedItem.html(
                '<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> Player killed Player with Mosin-Nagant'
            );
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

    const toggleRotateMessage = (): JQuery =>
        $("#splash-rotate-message").toggle(
            window.innerWidth < window.innerHeight
        );
    toggleRotateMessage();
    $(window).on("resize", toggleRotateMessage);

    const gameMenu = $("#game-menu");
    const settingsMenu = $("#settings-menu");

    usernameField.val(game.console.getConfig("cv_player_name"));

    usernameField.on("input", () => {
        usernameField.val(
            (usernameField.val() as string)
                // Replace fancy quotes & dashes, so they don't get stripped out
                .replaceAll(/[\u201c\u201d\u201f]/g, '"')
                .replaceAll(/[\u2018\u2019\u201b]/g, "'")
                .replaceAll(/[\u2013\u2014]/g, "-")
                // Strip out non-ASCII chars
                // eslint-disable-next-line no-control-regex
                .replace(/[^\x00-\xFF]/g, "")
        );

        game.console.setConfig("cv_player_name", usernameField.val() as string);
    });

    createDropdown("#server-select");

    const serverSelect = $<HTMLSelectElement>("#server-select");

    // Select region
    serverSelect.on("change", () => {
        const value = serverSelect.val() as string | undefined;

        if (value !== undefined) {
            game.console.setConfig("cv_region", value);
        }
    });

    const rulesBtn = $("#btn-rules");

    // Highlight rules & tutorial button for new players
    if (!game.console.getConfig("cv_rules_acknowledged")) {
        rulesBtn.removeClass("btn-secondary").addClass("highlighted");
    }

    // Event listener for rules button
    rulesBtn.on("click", () => {
        game.console.setConfig("cv_rules_acknowledged", true);
        location.href = "/rules";
    });

    $("#btn-quit-game").on("click", () => { game.endGame(true); });
    $("#btn-menu").on("click", () => { game.endGame(true); });
    $("#btn-play-again").on("click", () => { game.endGame(false); });

    const sendSpectatePacket = (action: SpectateActions): void => {
        game.sendPacket(new SpectatePacket(game.playerManager, action));
    };

    $("#btn-spectate").on("click", () => {
        sendSpectatePacket(SpectateActions.BeginSpectating);
        game.spectating = true;
        game.map.indicator.setFrame("player_indicator");
    });

    $("#btn-spectate-previous").on("click", () => {
        sendSpectatePacket(SpectateActions.SpectatePrevious);
    });
    $("#btn-report").on("click", () => {
        if (
            confirm(
                "Are you sure you want to report this player?\nPlayers should only be reported for teaming or hacking."
            )
        ) {
            sendSpectatePacket(SpectateActions.Report);
        }
    });
    $("#btn-spectate-next").on("click", () => {
        sendSpectatePacket(SpectateActions.SpectateNext);
    });

    $("#btn-resume-game").on("click", () => gameMenu.hide());
    $("#btn-fullscreen").on("click", () => {
        requestFullscreen();
        $("#game-menu").hide();
    });

    body.on("keydown", (e: JQuery.KeyDownEvent) => {
        if (e.key === "Escape") {
            if ($("canvas").hasClass("active") && !game.console.isOpen) {
                gameMenu.fadeToggle(250);
                settingsMenu.hide();
            }
            game.console.isOpen = false;
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
        navigator.clipboard
            .writeText($("#report-id-input").val() as string)
            .then(() => {
                $("#btn-copy-report-id").html(
                    '<i class="fa-solid fa-check"></i> Copied'
                );
            })
            .catch(() => {
                alert("Unable to copy report ID. Please copy it manually.");
            });
    });

    // Load skins
    const updateSplashCustomize = (skinID: string): void => {
        $("#skin-base").css(
            "background-image",
            `url("./img/game/skins/${skinID}_base.svg")`
        );
        $("#skin-left-fist, #skin-right-fist").css(
            "background-image",
            `url("./img/game/skins/${skinID}_fist.svg")`
        );
    };
    updateSplashCustomize(game.console.getConfig("cv_loadout_skin"));
    for (const skin of Skins) {
        if (skin.notInLoadout ?? (skin.roleRequired !== undefined &&
            skin.roleRequired !== game.console.getConfig("dv_role"))) continue;

        /* eslint-disable @typescript-eslint/restrict-template-expressions */
        // noinspection CssUnknownTarget
        const skinItem =
            $(`<div id="skin-${skin.idString}" class="skins-list-item-container">
  <div class="skins-list-item">
    <div class="skin-base" style="background-image: url('./img/game/skins/${skin.idString}_base.svg')"></div>
    <div class="skin-left-fist" style="background-image: url('./img/game/skins/${skin.idString}_fist.svg')"></div>
    <div class="skin-right-fist" style="background-image: url('./img/game/skins/${skin.idString}_fist.svg')"></div>
  </div>
  <span class="skin-name">${skin.name}</span>
</div>`);
        skinItem.on("click", function() {
            game.console.setConfig("cv_loadout_skin", skin.idString);
            $(this).addClass("selected").siblings().removeClass("selected");
            updateSplashCustomize(skin.idString);
        });
        $("#skins-list").append(skinItem);
    }
    $(`#skin-${game.console.getConfig("cv_loadout_skin")}`).addClass("selected");

    // Load emotes
    let selectedEmoteSlot: "top" | "right" | "bottom" | "left" | undefined;
    for (const emote of Emotes.definitions) {
        // noinspection CssUnknownTarget
        const emoteItem =
            $(`<div id="emote-${emote.idString}" class="emotes-list-item-container">
  <div class="emotes-list-item" style="background-image: url('/img/game/emotes/${emote.idString}.svg')"></div>
  <span class="emote-name">${emote.name}</span>
</div>`);
        emoteItem.on("click", function() {
            if (selectedEmoteSlot === undefined) return;
            game.console.setConfig(`cv_loadout_${selectedEmoteSlot}_emote`, emote.idString);
            $(this).addClass("selected").siblings().removeClass("selected");
            $(`#emote-customize-wheel > .emote-${selectedEmoteSlot}`).css(
                "background-image",
                `url("./img/game/emotes/${emote.idString}.svg")`
            );
        });
        $("#emotes-list").append(emoteItem);
    }

    for (const slot of ["top", "right", "bottom", "left"] as const) {
        const emote = game.console.getConfig(`cv_loadout_${slot}_emote`);

        $(`#emote-customize-wheel > .emote-${slot}`)
            .css("background-image", `url("./img/game/emotes/${emote}.svg")`)
            .on("click", () => {
                if (selectedEmoteSlot !== slot) {
                    selectedEmoteSlot = slot;
                    $("#emote-customize-wheel").css("background-image", `url("./img/misc/emote_wheel_highlight_${slot}.svg"), url("/img/misc/emote_wheel.svg")`);
                    $(".emotes-list-item-container").removeClass("selected").css("cursor", "pointer");
                    $(`#emote-${emote}`).addClass("selected");
                } else {
                    selectedEmoteSlot = undefined;
                    $("#emote-customize-wheel").css(
                        "background-image",
                        'url("./img/misc/emote_wheel.svg")'
                    );
                    $(".emotes-list-item-container")
                        .removeClass("selected")
                        .css("cursor", "default");
                }
            });
    }

    // Load crosshairs
    function loadCrosshair(): void {
        const size = game.console.getConfig("cv_crosshair_size");
        const crosshair = getCrosshair(
            game.console.getConfig("cv_loadout_crosshair"),
            game.console.getConfig("cv_crosshair_color"),
            size,
            game.console.getConfig("cv_crosshair_stroke_color"),
            game.console.getConfig("cv_crosshair_stroke_size")
        );
        const cursor = `url("${crosshair}") ${size / 2} ${size / 2}, crosshair`;

        $("#crosshair-image").css({
            backgroundImage: `url("${crosshair}")`,
            width: size,
            height: size
        });

        $("#crosshair-controls").toggleClass("disabled", Crosshairs.getByIDString(game.console.getConfig("cv_loadout_crosshair"))?.svg === undefined);

        $("#crosshair-preview, #game-ui").css({ cursor });
    }
    loadCrosshair();

    for (const crosshair of Crosshairs.definitions) {
        const crosshairItem = $(`
    <div id="crosshair-${crosshair.idString}" class="crosshairs-list-item-container">
        <div class="crosshairs-list-item"></div>
    </div>`
        );

        // This method sucks but it's the only way to do it without breaking the crosshair image
        crosshairItem.find(".crosshairs-list-item").css({
            backgroundImage: `url("${getCrosshair(
                crosshair.idString,
                "#fff",
                game.console.getConfig("cv_crosshair_size"),
                "#0",
                0
            )}")`,
            "background-size": "contain",
            "background-repeat": "no-repeat"
        });

        crosshairItem.on("click", function() {
            game.console.setConfig("cv_loadout_crosshair", crosshair.idString);
            loadCrosshair();
            $(this).addClass("selected").siblings().removeClass("selected");
        });

        $("#crosshairs-list").append(crosshairItem);
    }

    $(`#crosshair-${game.console.getConfig("cv_loadout_crosshair")}`).addClass("selected");

    addSliderListener("#slider-crosshair-size", "cv_crosshair_size", (value: number) => {
        game.console.setConfig("cv_crosshair_size", 20 * value);
        loadCrosshair();
    });
    $("#slider-crosshair-size").val(game.console.getConfig("cv_crosshair_size") / 20);

    addSliderListener("#slider-crosshair-stroke-size", "cv_crosshair_stroke_size", () => {
        loadCrosshair();
    });
    $("#slider-crosshair-stroke-size").val(game.console.getConfig("cv_crosshair_stroke_size"));

    $<HTMLInputElement>("#crosshair-color-picker").on("input", e => {
        game.console.setConfig("cv_crosshair_color", e.target.value);
        loadCrosshair();
    }).val(game.console.getConfig("cv_crosshair_color"));

    $<HTMLInputElement>("#crosshair-stroke-picker").on("input", (e) => {
        game.console.setConfig("cv_crosshair_stroke_color", e.target.value);
        loadCrosshair();
    }).val(game.console.getConfig("cv_crosshair_stroke_color"));

    // Disable context menu
    $("#game-ui").on("contextmenu", e => { e.preventDefault(); });

    // Load settings values and event listeners
    function addSliderListener(elementId: string, settingName: keyof CVarTypeMapping, callback?: (value: number) => void): void {
        const element = $(elementId)[0] as HTMLInputElement;
        if (!element) console.error("Invalid element id");

        element.addEventListener("input", () => {
            const value = +element.value;
            game.console.setConfig(settingName, value);

            callback?.(value);
        });

        element.value = (game.console.getConfig(settingName) as number).toString();
    }

    function addCheckboxListener(elementId: string, settingName: keyof CVarTypeMapping, callback?: (value: boolean) => void): void {
        const element = $(elementId)[0] as HTMLInputElement;

        element.addEventListener("input", () => {
            const value = element.checked;
            game.console.setConfig(settingName, value);

            callback?.(value);
        });

        element.checked = game.console.getConfig(settingName) as boolean;
    }

    // Scope looping toggle
    addCheckboxListener("#toggle-scope-looping", "cv_loop_scope_selection");

    addCheckboxListener("#toggle-anonymous-player", "cv_anonymize_player_names");

    // Music volume
    addSliderListener("#slider-music-volume", "cv_music_volume", (value: number) => {
        game.music.volume(value);
    });

    // SFX volume
    addSliderListener("#slider-sfx-volume", "cv_sfx_volume", (value: number) => {
        game.soundManager.volume = value;
    });

    // Master volume
    addSliderListener("#slider-master-volume", "cv_master_volume", (value: number) => {
        Howler.volume(value);
    });
    Howler.volume(game.console.getConfig("cv_master_volume"));

    // Old menu music
    addCheckboxListener("#toggle-old-music", "cv_use_old_menu_music");

    // Camera shake
    addCheckboxListener("#toggle-camera-shake", "cv_camera_shake_fx");

    // FPS toggle
    addCheckboxListener("#toggle-fps", "pf_show_fps", (value: boolean) => {
        $("#fps-counter").toggle(value);
    });
    $("#fps-counter").toggle(game.console.getConfig("pf_show_fps"));

    // Ping toggle
    addCheckboxListener("#toggle-ping", "pf_show_ping", (value: boolean) => {
        $("#ping-counter").toggle(value);
    });
    $("#ping-counter").toggle(game.console.getConfig("pf_show_ping"));

    // Coordinates toggle
    addCheckboxListener("#toggle-coordinates", "pf_show_pos", (value: boolean) => {
        $("#coordinates-hud").toggle(value);
    });
    $("#coordinates-hud").toggle(game.console.getConfig("pf_show_pos"));

    // Client-side prediction choice
    {
        const element = $("#rotation-animation-style")[0] as HTMLInputElement;

        element.addEventListener("input", () => {
            game.console.setConfig("cv_animate_rotation", element.checked ? "client" : "wait_for_server");
        });

        element.checked = game.console.getConfig("cv_animate_rotation") === "client";
    }

    // Text kill feed toggle
    {
        const element = $("#toggle-text-kill-feed")[0] as HTMLInputElement;

        element.addEventListener("input", () => {
            game.console.setConfig("cv_killfeed_style", element.checked ? "text" : "icon");
        });

        element.checked = game.console.getConfig("cv_killfeed_style") === "text";
    }

    // Rotation smoothing toggle
    addCheckboxListener("#toggle-rotation-smoothing", "cv_rotation_smoothing");

    // Movement smoothing toggle
    addCheckboxListener("#toggle-movement-smoothing", "cv_movement_smoothing");

    // Mobile controls stuff
    addCheckboxListener("#toggle-mobile-controls", "mb_controls_enabled");
    addSliderListener("#slider-joystick-size", "mb_joystick_size");
    addSliderListener("#slider-joystick-transparency", "mb_joystick_transparency");

    // Minimap stuff
    addSliderListener("#slider-minimap-transparency", "cv_minimap_transparency", () => {
        game.map.updateTransparency();
    });

    addSliderListener("#slider-big-map-transparency", "cv_map_transparency", () => {
        game.map.updateTransparency();
    });

    addCheckboxListener("#toggle-hide-minimap", "cv_minimap_minimized", () => {
        game.map.toggleMiniMap(true);
    });

    // Leave warning
    addCheckboxListener("#toggle-leave-warning", "cv_leave_warning");

    // Hide rules button
    addCheckboxListener("#toggle-hide-rules", "cv_hide_rules_button", (value: boolean) => {
        $("#btn-rules, #rules-close-btn").toggle(!value);
    });
    rulesBtn.toggle(!game.console.getConfig("cv_hide_rules_button"));

    // Hide option to hide rules if rules haven't been acknowledged
    $(".checkbox-setting").has("#toggle-hide-rules").toggle(game.console.getConfig("cv_rules_acknowledged"));

    $("#rules-close-btn").on("click", () => {
        $("#btn-rules, #rules-close-btn").hide();
        game.console.setConfig("cv_hide_rules_button", true);
        $("#toggle-hide-rules").prop("checked", true);
    }).toggle(game.console.getConfig("cv_rules_acknowledged") && !game.console.getConfig("cv_hide_rules_button"));

    // Switch weapon slots by clicking
    for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
        const slotElement = $(`#weapon-slot-${i + 1}`);
        slotElement[0].addEventListener(
            "pointerdown",
            (e: PointerEvent): void => {
                if (slotElement.hasClass("has-item")) {
                    e.stopImmediatePropagation();
                    if (e.button === 0) game.console.handleQuery(`slot ${i}`);
                    else if (e.button === 2) game.console.handleQuery(`drop ${i}`);
                }
            }
        );
    }

    // Generate the UI for scopes, healing items and ammos
    for (const scope of Scopes) {
        $("#scopes-container").append(`
        <div class="inventory-slot item-slot" id="${scope.idString}-slot" style="display: none;">
            <img class="item-image" src="./img/game/loot/${scope.idString}.svg" draggable="false">
            <div class="item-tooltip">${scope.name.split(" ")[0]}</div>
        </div>`);

        $(`#${scope.idString}-slot`)[0].addEventListener("pointerdown", (e: PointerEvent) => {
            game.inputManager.addAction({
                type: InputActions.UseItem,
                item: scope
            });
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
            game.inputManager.addAction({
                type: InputActions.UseItem,
                item
            });
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
    if (game.inputManager.isMobile) {
        // Interact message
        $("#interact-message").on("click", () => {
            game.console.handleQuery("interact");
        });

        // Reload button
        $("#btn-reload")
            .show()
            .on("click", () => {
                game.console.handleQuery("reload");
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
                game.inputManager.addAction(action);
            });
        };
        createEmoteWheelListener("top", InputActions.TopEmoteSlot);
        createEmoteWheelListener("right", InputActions.RightEmoteSlot);
        createEmoteWheelListener("bottom", InputActions.BottomEmoteSlot);
        createEmoteWheelListener("left", InputActions.LeftEmoteSlot);

        // Game menu
        $("#btn-game-menu")
            .show()
            .on("click", () => {
                $("#game-menu").toggle();
            });
    }

    // Prompt when trying to close the tab while playing
    window.addEventListener("beforeunload", (e: Event) => {
        if ($("canvas").hasClass("active") && game.console.getConfig("cv_leave_warning") && !game.gameOver) {
            e.preventDefault();
        }
    });

    // Hack to style range inputs background and add a label with the value :)
    function updateRangeInput(element: HTMLInputElement): void {
        const value = +element.value;
        const max = +element.max;
        const min = +element.min;
        const x = ((value - min) / (max - min)) * 100;
        $(element).css(
            "--background",
            `linear-gradient(to right, #ff7500 0%, #ff7500 ${x}%, #f8f9fa ${x}%, #f8f9fa 100%)`
        );
        $(element)
            .siblings(".range-input-value")
            .text(
                element.id !== "slider-joystick-size"
                    ? `${Math.round(value * 100)}%`
                    : value
            );
    }

    $("input[type=range]")
        .on("input", (e) => {
            updateRangeInput(e.target as HTMLInputElement);
        })
        .each((_i, element) => {
            updateRangeInput(element as HTMLInputElement);
        });

    $(".tab").on("click", (ev) => {
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
