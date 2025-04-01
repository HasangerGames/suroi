import { GameConstants, ObjectCategory } from "@common/constants";
import { DEFAULT_INVENTORY } from "@common/defaultInventory";
import { type BadgeDefinition } from "@common/definitions/badges";
import { type EmoteDefinition } from "@common/definitions/emotes";
import { Ammos } from "@common/definitions/items/ammos";
import { PerkCategories, PerkIds, type PerkDefinition } from "@common/definitions/items/perks";
import { DEFAULT_SCOPE, type ScopeDefinition } from "@common/definitions/items/scopes";
import { Skins } from "@common/definitions/items/skins";
import { Loots } from "@common/definitions/loots";
import { MapPings, type PlayerPing } from "@common/definitions/mapPings";
import { type GameOverData } from "@common/packets/gameOverPacket";
import type { ReportData } from "@common/packets/reportPacket";
import type { KillData } from "@common/packets/killPacket";
import { type PlayerData, type UpdateDataCommon } from "@common/packets/updatePacket";
import { Numeric } from "@common/utils/math";
import { ExtendedMap } from "@common/utils/misc";
import { ItemType, type ReferenceTo } from "@common/utils/objectDefinitions";
import { Vec, type Vector } from "@common/utils/vector";
import $ from "jquery";
import { Color } from "pixi.js";
import { getTranslatedString, TRANSLATIONS } from "../utils/translations/translations";
import { type TranslationKeys } from "../utils/translations/typings";
import { Game } from "../game";
import { type GameObject } from "../objects/gameObject";
import { Player } from "../objects/player";
import { TEAMMATE_COLORS, UI_DEBUG_MODE } from "../utils/constants";
import { formatDate, html } from "../utils/misc";
import { SuroiSprite } from "../utils/pixi";
import { ClientPerkManager } from "./perkManager";
import { DamageSources } from "@common/packets/killPacket";
import { GameConsole } from "../console/gameConsole";
import { ScreenRecordManager } from "./screenRecordManager";
import { InputManager } from "./inputManager";
import { SoundManager } from "./soundManager";
import { MapManager } from "./mapManager";
import { CameraManager } from "./cameraManager";

function safeRound(value: number): number {
    if (0 < value && value <= 1) return 1;
    return Math.round(value);
}

/**
 * This class manages the game UI
 */
export const UIManager = new (class UIManager {
    private maxHealth = GameConstants.player.defaultHealth;
    private health = GameConstants.player.defaultHealth;

    private maxAdrenaline = GameConstants.player.maxAdrenaline;
    private minAdrenaline = 0;
    private adrenaline = 0;

    readonly inventory: {
        activeWeaponIndex: number
        weapons: (PlayerData["inventory"] & object)["weapons"] & object
        lockedSlots: number
        items: typeof DEFAULT_INVENTORY
        scope: ScopeDefinition
    } = {
            activeWeaponIndex: 0,
            weapons: new Array(GameConstants.player.maxWeapons).fill(undefined),
            lockedSlots: 0,
            items: JSON.parse(JSON.stringify(DEFAULT_INVENTORY)) as typeof DEFAULT_INVENTORY,
            scope: DEFAULT_SCOPE
        };

    emotes: ReadonlyArray<EmoteDefinition | undefined> = [];

    teammates: PlayerData["teammates"] & object = [];

    public hasC4s = false;

    blockEmoting = false;

    getRawPlayerNameNullish(id: number): string | undefined {
        const player = Game.playerNames.get(id) ?? this._teammateDataCache.get(id);
        let name: string | undefined;

        if (!player) {
            console.warn(`Unknown player name with id ${id}`);
        } else if (GameConsole.getBuiltInCVar("cv_anonymize_player_names")) {
            name = `${GameConstants.player.defaultName}_${id}`;
        } else {
            name = player.name;
        }

        return name;
    }

    getRawPlayerName(id: number): string {
        return this.getRawPlayerNameNullish(id) ?? "[Unknown Player]";
    }

    getPlayerData(id: number): { name: string, badge: BadgeDefinition | undefined } {
        // Name
        const element = $<HTMLSpanElement>("<span>");
        const player = Game.playerNames.get(id) ?? this._teammateDataCache.get(id);

        const name = this.getRawPlayerName(id);

        if (player && player.hasColor && !GameConsole.getBuiltInCVar("cv_anonymize_player_names")) {
            element.css("color", player.nameColor?.toHex() ?? "");
        }

        element.text(name);

        // what in the jquery is this
        const playerName = element.prop("outerHTML") as string;

        // Badge
        let playerBadge: BadgeDefinition | undefined = undefined;

        if (!GameConsole.getBuiltInCVar("cv_anonymize_player_names")) {
            if (player !== undefined) {
                playerBadge = player.badge;
            } else {
                console.warn(`Unknown player name with id ${id}`);
            }
        }

        return {
            name: playerName,
            badge: playerBadge
        };
    }

    getHealthColor(normalizedHealth: number, downed?: boolean): string {
        switch (true) {
            case normalizedHealth <= 0.25:
            case downed:
                return "#ff0000";
            case normalizedHealth > 0.25 && normalizedHealth < 0.6:
                return `rgb(255, ${((normalizedHealth * 100) - 10) * 4}, ${((normalizedHealth * 100) - 10) * 4})`;
            case normalizedHealth === 1:
                return "#bdc7d0";
            default:
                return "#f8f9fa";
        }
    }

    getTeammateColorIndex(id: number): number | undefined {
        const teammate = this.teammates.find(teammate => {
            return teammate.id === id;
        });

        const colorIndex = teammate ? teammate.colorIndex : (Game.teamMode ? undefined : 0);
        return colorIndex;
    }

    readonly ui = Object.freeze({
        loaderText: $<HTMLDivElement>("#loader-text"),

        serverList: $<HTMLUListElement>("#server-list"),

        ammoCounterContainer: $<HTMLDivElement>("#weapon-ammo-container"),
        activeAmmo: $<HTMLSpanElement>("#weapon-clip-ammo"),
        activeAmmoCount: $<HTMLSpanElement>("#weapon-clip-ammo-count"),
        reserveAmmo: $<HTMLDivElement>("#weapon-inventory-ammo"),
        reloadIcon: $("#weapon-clip-reload-icon"),
        killStreakIndicator: $<HTMLDivElement>("#killstreak-indicator-container"),
        killStreakCounter: $<HTMLSpanElement>("#killstreak-indicator-counter"),

        weaponsContainer: $<HTMLDivElement>("#weapons-container"),

        minMaxAdren: $<HTMLSpanElement>("#adrenaline-bar-min-max"),
        maxHealth: $<HTMLSpanElement>("#health-bar-max"),

        healthBar: $<HTMLDivElement>("#health-bar"),
        healthBarAmount: $<HTMLSpanElement>("#health-bar-amount"),
        healthAnim: $<HTMLDivElement>("#health-bar-animation"),

        adrenalineBar: $<HTMLDivElement>("#adrenaline-bar"),
        minAdrenBarWrapper: $<HTMLDivElement>("#adrenaline-bar-min-wrapper"),
        minAdrenBar: $<HTMLDivElement>("#adrenaline-bar-min"),
        adrenalineBarAmount: $<HTMLSpanElement>("#adrenaline-bar-amount"),

        killFeed: $<HTMLDivElement>("#kill-feed"),

        gameUi: $<HTMLDivElement>("#game-ui"),

        interactMsg: $<HTMLDivElement>("#interact-message"),
        interactKey: $("#interact-key"),
        interactText: $<HTMLSpanElement>("#interact-text"),

        teamContainer: $<HTMLDivElement>("#team-container"),
        createTeamMenu: $<HTMLDivElement>("#create-team-menu"),

        emoteButton: $<HTMLButtonElement>("#btn-emotes"),
        pingToggle: $<HTMLButtonElement>("#btn-toggle-ping"),
        menuButton: $<HTMLButtonElement>("#btn-game-menu"),

        emoteWheel: $<HTMLDivElement>("#emote-wheel"),
        emoteSelectors: [".emote-top", ".emote-right", ".emote-bottom", ".emote-left"]
            .map(selector => $<HTMLDivElement>(`#emote-wheel > ${selector}`)),

        actionContainer: $<HTMLDivElement>("#action-container"),
        actionName: $<HTMLDivElement>("#action-name"),
        actionTime: $<HTMLHeadingElement>("#action-time"),
        actionTimer: $<SVGElement>("#action-timer-anim"),

        spectatingContainer: $<HTMLDivElement>("#spectating-container"),
        spectatingMsg: $<HTMLDivElement>("#spectating-msg"),
        spectatingMsgPlayer: $<HTMLSpanElement>("#spectating-msg-player"),
        btnSpectate: $<HTMLButtonElement>("#btn-spectate"),
        spectatePrevious: $<HTMLButtonElement>("#btn-spectate-previous"),
        spectateNext: $<HTMLButtonElement>("#btn-spectate-next"),
        spectatingOptions: $<HTMLButtonElement>("#btn-spectate-options-icon"),
        btnPlayAgainSpectating: $<HTMLButtonElement>("#btn-spectate-replay"),
        btnSpectateMenu: $<HTMLButtonElement>("#btn-spectate-menu"),
        gasAndDebug: $<HTMLDivElement>("#gas-and-debug"),

        gasMsg: $<HTMLDivElement>("#gas-msg"),
        gasMsgInfo: $<HTMLDivElement>("#gas-msg-info"),

        joystickContainer: $<HTMLDivElement>("#joysticks-containers"),

        gameOverOverlay: $<HTMLDivElement>("#game-over-overlay"),
        gameOverPlayerCards: $<HTMLDivElement>("#player-game-over-cards"),
        gameOverText: $<HTMLHeadingElement>("#game-over-text"),
        /* gameOverPlayerName: $<HTMLHeadingElement>("#game-over-player-name"),
        gameOverKills: $<HTMLSpanElement>("#game-over-kills"),
        gameOverDamageDone: $<HTMLSpanElement>("#game-over-damage-done"),
        gameOverDamageTaken: $<HTMLSpanElement>("#game-over-damage-taken"),
        gameOverTime: $<HTMLSpanElement>("#game-over-time"), */
        gameOverRank: $<HTMLSpanElement>("#game-over-rank"),
        gameOverTeamKillsContainer: $<HTMLDivElement>("#game-over-team-kills-container"),
        gameOverTeamKills: $<HTMLSpanElement>("#game-over-team-kills"),
        chickenDinner: $<HTMLImageElement>("#chicken-dinner"),

        killMsgModal: $<HTMLDivElement>("#kill-msg"),
        killMsgHeader: $<HTMLDivElement>("#kill-msg-kills"),
        killMsgCounter: $<HTMLDivElement>("#ui-kills"),
        killMsgContainer: $<HTMLDivElement>("#kill-msg-cont"),

        killLeaderLeader: $<HTMLSpanElement>("#kill-leader-leader"),
        killLeaderCount: $<HTMLSpanElement>("#kill-leader-kills-counter"),
        spectateKillLeader: $<HTMLButtonElement>("#btn-spectate-kill-leader"),

        splashMsgText: $<HTMLSpanElement>("#splash-server-message-text"),
        splashMsg: $<HTMLDivElement>("#splash-server-message"),
        splashUi: $<HTMLDivElement>("#splash-ui"),
        splashOptions: $<HTMLDivElement>("#splash-options"),

        btnReport: $<HTMLButtonElement>("#btn-report"),
        reportingName: $<HTMLSpanElement>("#reporting-name"),
        reportingId: $<HTMLSpanElement>("#report-id"),
        reportingModal: $<HTMLDivElement>("#report-modal"),

        game: $<HTMLDivElement>("#game"),
        gameMenu: $<HTMLDivElement>("#game-menu"),

        canvas: $<HTMLCanvasElement>("canvas"),

        playerAlive: $<HTMLDivElement>("#ui-players-alive"),

        newsPosts: $<HTMLDivElement>("#news-posts"),

        lockedInfo: $<HTMLButtonElement>("#locked-info"),
        lockedTooltip: $<HTMLDivElement>("#locked-tooltip"),
        teamSizeSwitchTime: $<HTMLSpanElement>("#next-team-size-msg .next-switch-time"),
        modeSwitchTime: $<HTMLSpanElement>("#next-mode-msg .next-switch-time"),

        playSoloBtn: $<HTMLDivElement>("#btn-play-solo"),
        playDuoBtn: $<HTMLDivElement>("#btn-play-duo"),
        playSquadBtn: $<HTMLDivElement>("#btn-play-squad"),

        teamOptionBtns: $<HTMLDivElement>("#team-option-btns"),

        switchMessages: $<HTMLDivElement>("#next-switch-messages"),
        nextTeamSizeMsg: $<HTMLDivElement>("#next-team-size-msg"),
        nextTeamSizeIcon: $<HTMLDivElement>("#next-team-size-msg .next-switch-icon"),
        nextModeMsg: $<HTMLDivElement>("#next-mode-msg"),
        nextModeIcon: $<HTMLDivElement>("#next-mode-msg .next-switch-icon"),

        warningTitle: $<HTMLHeadingElement>("#warning-modal-title"),
        warningText: $<HTMLParagraphElement>("#warning-modal-text"),
        warningAgreeOpts: $<HTMLDivElement>("#warning-modal-agree-options"),
        warningAgreeCheckbox: $<HTMLInputElement>("#warning-modal-agree-checkbox"),
        warningModal: $<HTMLDivElement>("#warning-modal"),

        btnStartGame: $<HTMLButtonElement>("#btn-start-game"),
        createTeamToggles: $<HTMLDivElement>("#create-team-toggles"),

        createTeamUrl: $<HTMLInputElement>("#create-team-url-field"),
        createTeamAutoFill: $<HTMLInputElement>("#create-team-toggle-auto-fill"),
        createTeamLock: $<HTMLInputElement>("#create-team-toggle-lock"),
        createTeamForceStart: $<HTMLInputElement>("#create-team-toggle-force-start"),
        createTeamPlayers: $<HTMLDivElement>("#create-team-players"),
        closeCreateTeam: $<HTMLButtonElement>("#close-create-team"),

        c4Button: $<HTMLButtonElement>("#c4-detonate-btn"),
        detonateKey: $<HTMLDivElement>("#detonate-key"),

        inventoryMsg: $<HTMLSpanElement>("#inventory-message"),

        debugPos: $<HTMLSpanElement>("#coordinates-hud")
    });

    private readonly _weaponSlotCache = new ExtendedMap<
        number,
        {
            readonly container: JQuery<HTMLDivElement>
            readonly inner: JQuery<HTMLDivElement>
            readonly name: JQuery<HTMLSpanElement>
            readonly image: JQuery<HTMLImageElement>
            readonly ammo: JQuery<HTMLSpanElement>
        }
    >();

    private _getSlotUI(slot: number): {
        readonly container: JQuery<HTMLDivElement>
        readonly inner: JQuery<HTMLDivElement>
        readonly name: JQuery<HTMLSpanElement>
        readonly image: JQuery<HTMLImageElement>
        readonly ammo: JQuery<HTMLSpanElement>
    } {
        return this._weaponSlotCache.getAndGetDefaultIfAbsent(
            slot,
            () => {
                const container = $<HTMLDivElement>(`#weapon-slot-${slot}`);
                const inner = container.children<HTMLDivElement>(".main-container");

                return {
                    container,
                    inner,
                    name: inner.children(".item-name"),
                    image: inner.children(".item-image"),
                    ammo: inner.children(".item-ammo")
                };
            }
        );
    }

    private readonly _itemCountCache: Record<string, JQuery<HTMLSpanElement>> = {};
    private readonly _itemSlotCache: Record<string, JQuery<HTMLDivElement>> = {};
    private readonly _scopeSlotCache: Record<ReferenceTo<ScopeDefinition>, JQuery<HTMLDivElement>> = {};

    readonly action = {
        active: false,
        /*
            whether this timer corresponds to an actual action being carried
            out by this player (like reloading), or if it corresponds to some
            other timed event that just so happens to piggyback off this timer
            system (getting revived). pretty much only exists for the
            aforementioned case of being revived, and prevents the "cancel" popup
            from appearing
        */
        fake: false,
        start: -1,
        time: 0
    };

    animateAction(name: string, time: number, fake = false): void {
        this.action.fake = fake;
        if (time > 0) {
            this.action.start = Date.now();
            this.ui.actionTimer
                .stop()
                .css({ "stroke-dashoffset": "226" })
                .animate(
                    { "stroke-dashoffset": "0" },
                    time * 1000,
                    "linear",
                    () => {
                        this.ui.actionContainer.hide();
                        this.action.active = false;
                    }
                );
        }

        if (name) {
            this.ui.actionName.text(name);
            this.ui.actionContainer.show();
        }

        this.action.active = true;
        this.action.time = time;
    }

    updateAction(): void {
        const amount = this.action.time - (Date.now() - this.action.start) / 1000;
        if (amount > 0) this.ui.actionTime.text(amount.toFixed(1));
    }

    cancelAction(): void {
        if (!UI_DEBUG_MODE) {
            this.ui.actionContainer
                .hide()
                .stop();
        }
        this.action.active = false;
    }

    gameOverScreenTimeout: number | undefined;

    showGameOverScreen(packet: GameOverData): void {
        Game.gameOver = true;

        this.ui.interactMsg.hide();
        this.ui.spectatingContainer.hide();
        this.ui.gameOverPlayerCards.empty();

        Game.activePlayer?.actionSound?.stop();

        this.ui.gasMsg.fadeOut(500);

        // Disable joysticks div so you can click on players to spectate
        this.ui.joystickContainer.hide();

        const {
            gameOverOverlay,
            gameOverPlayerCards,
            chickenDinner,
            gameOverText,
            gameOverRank,
            gameOverTeamKills,
            gameOverTeamKillsContainer
        } = this.ui;

        const { rank, teammates } = packet;
        const won = rank === 1;
        if (!won) {
            this.ui.btnSpectate.removeClass("btn-disabled").show();
            MapManager.indicator.setFrame("player_indicator_dead");
        } else {
            this.ui.btnSpectate.hide();
        }

        chickenDinner.toggle(won);

        let totalKills = 0;

        let highestKills = 0;
        let highestKillsIDs: number[] | undefined = [];

        let mostDamageDone = 0;
        let mostDamageDoneIDs: number[] | undefined = [];

        let mostDamageTaken = 0;
        let mostDamageTakenIDs: number[] | undefined = [];

        if (Game.teamMode) {
            for (const { playerID, kills, damageDone, damageTaken } of teammates) {
                if (kills > highestKills) {
                    highestKills = kills;
                    highestKillsIDs = [playerID];
                } else if (kills === highestKills) {
                    highestKillsIDs.push(playerID);
                }

                if (damageDone > mostDamageDone) {
                    mostDamageDone = damageDone;
                    mostDamageDoneIDs = [playerID];
                } else if (damageDone === mostDamageDone) {
                    mostDamageDoneIDs.push(playerID);
                }

                if (damageTaken > mostDamageTaken) {
                    mostDamageTaken = damageTaken;
                    mostDamageTakenIDs = [playerID];
                } else if (damageTaken === mostDamageTaken) {
                    mostDamageTakenIDs.push(playerID);
                }
            }

            // Only award medals under certain conditions (defined below)
            if (highestKills < 10) highestKillsIDs = undefined;
            if (mostDamageDone < 1000) mostDamageDoneIDs = undefined;
            if (mostDamageTaken < 1000) mostDamageTakenIDs = undefined;
        }

        const hasTeammates = teammates.length > 1;
        const teamEliminated = hasTeammates && teammates.every(teammate => !teammate.alive);

        for (const { playerID, kills, damageDone, damageTaken, timeAlive, alive } of teammates) {
            // Medals:
            // Dead: Simply indicates the player is no longer alive
            // Kills: More than 10 kills + most kills on team
            // Damage Done: More than 1000 damage done + most on team
            // Damage Taken: More than 1000 damage taken + most on team
            // your did it: Won with 0 kills + 0 damage done
            let medal: string | undefined;
            if (!alive) {
                medal = "dead";
            }
            if (Game.teamMode) {
                if (highestKillsIDs?.includes(playerID)) {
                    medal = "kills";
                } else if (mostDamageDoneIDs?.includes(playerID)) {
                    medal = "skull";
                } else if (mostDamageTakenIDs?.includes(playerID)) {
                    medal = "shield";
                }
            }
            if (won && kills === 0 && damageDone === 0) {
                medal = "youdidit";
            }

            totalKills += kills;

            const { name, badge } = this.getPlayerData(playerID);

            let message: string;
            if (won) {
                message = getTranslatedString("msg_win");
            } else {
                if (Game.spectating) {
                    message = teamEliminated
                        ? getTranslatedString("msg_the_team_eliminated")
                        : getTranslatedString("msg_player_died", { player: name });
                } else {
                    message = teamEliminated
                        ? getTranslatedString("msg_your_team_eliminated")
                        : getTranslatedString("msg_you_died");
                }
            }
            gameOverText.html(message);

            const medalHTML = medal
                ? html`<img class="medal${medal === "dead" ? " dead" : ""}" src="./img/misc/medal_${medal}.svg"/>`
                : "";

            const badgeHTML = badge
                ? html`<img class="badge-icon" src="./img/game/shared/badges/${badge.idString}.svg" alt="${badge.name} badge">`
                : "";

            const card = html`
            <div class="game-over-screen">
              <h1 class="game-over-player-name" class="modal-item">${medalHTML}${name}${badgeHTML}</h1>
                <div class="modal-item game-over-stats">
                <div class="stat">
                  <span class="stat-name" translation="go_kills">${getTranslatedString("go_kills")}</span>
                  <span class="stat-value">${kills}</span>
                </div>
                <div class="stat">
                  <span class="stat-name" translation="go_damage_done">${getTranslatedString("go_damage_done")}</span>
                  <span class="stat-value">${damageDone}</span>
                </div>
                <div class="stat">
                    <span class="stat-name" translation="go_damage_taken">${getTranslatedString("go_damage_taken")}</span>
                    <span class="stat-value">${damageTaken}</span>
                </div>
                <div class="stat">
                  <span class="stat-name" translation="go_time_alive">${getTranslatedString("go_time_alive")}</span>
                  <span class="stat-value">${formatDate(timeAlive)}</span>
                </div>
              </div>
            </div>
            `;

            gameOverPlayerCards.append(card);
        }

        // Player rank
        gameOverRank.text(`#${rank}`).toggleClass("won", won);

        if (won) {
            void Game.music.play();
            if (hasTeammates) {
                gameOverTeamKills.text(getTranslatedString("msg_kills", { kills: totalKills.toString() }));
                gameOverTeamKillsContainer.show();
            } else {
                gameOverTeamKillsContainer.hide();
            }
        } else {
            gameOverTeamKillsContainer.hide();
        }

        this.gameOverScreenTimeout = window.setTimeout(() => gameOverOverlay.fadeIn(500), 500);
        setTimeout(() => ScreenRecordManager.endRecording(), 2500);
    }

    // I'd rewrite this as MapPings.filter(…), but it's not really clear how
    // > 4 player pings is _meant_ to be handled, so I'll begrudgingly leave this alone
    readonly mapPings: readonly PlayerPing[] = [
        "warning_ping",
        "arrow_ping",
        "gift_ping",
        "heal_ping"
    ].map(ping => MapPings.fromString<PlayerPing>(ping));

    updateEmoteWheel(): void {
        const { pingWheelActive } = InputManager;
        if (Game.teamMode) {
            $("#ammos-container, #healing-items-container").toggleClass("active", pingWheelActive);
            for (const ammo of Ammos) {
                const itemSlot = this._itemSlotCache[ammo.idString] ??= $(`#${ammo.idString}-slot`);
                if (pingWheelActive && ammo.hideUnlessPresent) itemSlot.css("visibility", "visible");
                else if (ammo.hideUnlessPresent && this.inventory.items[ammo.idString] === 0) itemSlot.css("visibility", "hidden");
            }
        }
        for (let i = 0; i < 4; i++) {
            const definition = (pingWheelActive ? this.mapPings : this.emotes)[i];

            this.ui.emoteSelectors[i].css(
                "background-image",
                definition ? `url("./img/game/shared/${pingWheelActive ? "mapPings" : "emotes"}/${definition.idString}.svg")` : ""
            );
        }
    }

    private readonly _teammateDataCache = new Map<number, TeammateIndicatorUI>();
    clearTeammateCache(): void {
        for (const [, entry] of this._teammateDataCache) {
            entry.destroy();
        }

        this._teammateDataCache.clear();
    }

    private _oldHealthPercent = 100;

    updateUI(data: PlayerData): void {
        const {
            pingSeq,
            minMax,
            health,
            adrenaline,
            zoom,
            id,
            teammates,
            inventory,
            lockedSlots,
            items,
            activeC4s,
            perks,
            blockEmoting
        } = data;

        const sentTime = Game.seqsSent[pingSeq];
        if (sentTime !== undefined) {
            const ping = Date.now() - sentTime;
            Game.netGraph.ping.addEntry(ping);
            Game.seqsSent[pingSeq] = undefined;
        }

        if (id !== undefined) {
            const oldID = Game.activePlayerID;
            Game.activePlayerID = id.id;
            if (oldID !== id.id) {
                for (const player of Game.objects.getCategory(ObjectCategory.Player)) {
                    player.updateTeammateName();
                }
                this.cancelAction();
            }
            this.ui.btnReport.toggleClass("btn-disabled", !!this.reportedPlayerIDs.get(id.id));

            const spectating = id.spectating;
            Game.spectating = spectating;

            if (spectating) {
                const playerName = this.getPlayerData(id.id).name;
                const badge = this.getPlayerData(id.id).badge;
                const badgeText = badge ? html`<img class="badge-icon" src="./img/game/shared/badges/${badge.idString}.svg" alt="${badge.name} badge">` : "";

                this.ui.gameOverOverlay.fadeOut();
                this.ui.spectatingMsgPlayer.html(playerName + badgeText);
            }
            this.ui.spectatingContainer.toggle(spectating && this.ui.spectatingOptions.hasClass("fa-eye-slash"));
            this.ui.spectatingMsg.toggle(spectating);
            this.clearTeammateCache();

            if (InputManager.isMobile) {
                this.ui.emoteButton.toggle(!spectating);
                this.ui.pingToggle.toggle(!spectating);
                this.ui.menuButton.toggle(!spectating);
            }
        }

        const hasMinMax = minMax !== undefined;
        if (hasMinMax) {
            this.maxHealth = minMax.maxHealth;
            this.minAdrenaline = minMax.minAdrenaline;
            this.maxAdrenaline = minMax.maxAdrenaline;

            if (this.maxHealth === GameConstants.player.defaultHealth) {
                this.ui.maxHealth.text("").hide();
            } else {
                this.ui.maxHealth.text(safeRound(this.maxHealth)).show();
            }

            const noMinAdren = this.minAdrenaline === 0;
            if (
                this.maxAdrenaline === GameConstants.player.maxAdrenaline
                && noMinAdren
            ) {
                this.ui.minMaxAdren.text("").hide();
                this.ui.minAdrenBarWrapper.width(0).hide();
                this.ui.minAdrenBar.hide();
            } else {
                if (noMinAdren) {
                    this.ui.minMaxAdren.text(safeRound(this.maxAdrenaline)).show();
                    this.ui.minAdrenBarWrapper.width(0).hide();
                    this.ui.minAdrenBar.hide();
                } else {
                    this.ui.minMaxAdren.text(`${safeRound(this.minAdrenaline)}/${safeRound(this.maxAdrenaline)}`).show();
                    this.ui.minAdrenBarWrapper.outerWidth(`${100 * this.minAdrenaline / this.maxAdrenaline}%`).show();
                    this.ui.minAdrenBar.show();
                }
            }
        }

        const hasHealth = health !== undefined;
        if (hasHealth) {
            this.health = Numeric.remap(health, 0, 1, 0, this.maxHealth);
        }

        if (hasMinMax || hasHealth) {
            const normalizedHealth = this.health / this.maxHealth;
            const healthPercent = 100 * normalizedHealth;

            this.ui.healthBar
                .width(`${healthPercent}%`)
                .css("background-color", this.getHealthColor(normalizedHealth, Game.activePlayer?.downed))
                .toggleClass("flashing", healthPercent <= 25);

            this.ui.healthAnim.stop();
            if (this._oldHealthPercent - healthPercent >= 1) { // only animate larger changes in health
                this.ui.healthAnim
                    .width(`${this._oldHealthPercent}%`)
                    .animate({ width: `${healthPercent}%` }, 500);
            } else {
                this.ui.healthAnim.width(`${healthPercent}%`);
            }
            this._oldHealthPercent = healthPercent;

            this.ui.healthBarAmount
                .text(safeRound(this.health))
                .css("color", healthPercent <= 40 || Game.activePlayer?.downed ? "#ffffff" : "#000000");
        }

        if (teammates && Game.teamMode) {
            this.teammates = teammates;

            const _teammateDataCache = this._teammateDataCache;
            const notVisited = new Set(_teammateDataCache.keys());

            [
                {
                    id: Game.activePlayerID,
                    normalizedHealth: this.health / this.maxHealth,
                    downed: Game.activePlayer?.downed,
                    disconnected: false,
                    position: undefined
                },
                ...teammates
            ].forEach((player, index) => {
                const { id } = player;
                notVisited.delete(id);

                const cacheEntry = _teammateDataCache.get(id);
                const nameData = Game.playerNames.get(id);
                const nameObj = {
                    hasColor: nameData?.hasColor,
                    nameColor: nameData?.hasColor ? nameData.nameColor : null,
                    name: nameData?.name,
                    badge: nameData?.badge ?? null
                };

                if (cacheEntry !== undefined) {
                    cacheEntry.update({
                        ...player,
                        ...nameObj,
                        colorIndex: index
                    });
                    return;
                }

                const ele = new TeammateIndicatorUI({
                    id,
                    colorIndex: index,
                    downed: player.downed,
                    normalizedHealth: player.normalizedHealth,
                    position: player.position,
                    ...nameObj
                });
                _teammateDataCache.set(id, ele);

                this.ui.teamContainer.append(ele.container);
            });

            for (const outdated of notVisited) {
                // the `notVisited` set is exclusively populated with keys from this map
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                _teammateDataCache.get(outdated)!.destroy();
                _teammateDataCache.delete(outdated);
            }
        }

        if (zoom) CameraManager.zoom = zoom;

        const hasAdrenaline = adrenaline !== undefined;
        if (hasAdrenaline) {
            this.adrenaline = Numeric.remap(adrenaline, 0, 1, this.minAdrenaline, this.maxAdrenaline);
        }

        if (hasMinMax || hasAdrenaline) {
            const percent = 100 * this.adrenaline / this.maxAdrenaline;

            this.ui.adrenalineBar.width(`${percent}%`);
            this.ui.adrenalineBarAmount
                .text(safeRound(this.adrenaline))
                .css("color", this.adrenaline < 7 ? "#ffffff" : "#000000");
        }

        if (inventory?.weapons) {
            this.inventory.weapons = inventory.weapons;
            this.inventory.activeWeaponIndex = inventory.activeWeaponIndex;
        }

        if (lockedSlots !== undefined) {
            this.inventory.lockedSlots = lockedSlots;
            this.updateSlotLocks();
        }

        if (items) {
            this.inventory.items = items.items;
            this.inventory.scope = items.scope;
            this.updateItems();
        }

        if (inventory?.weapons || items) {
            this.updateWeapons();
        }

        if (activeC4s !== undefined && !UI_DEBUG_MODE) {
            this.ui.c4Button.toggle(activeC4s);
            this.hasC4s = activeC4s;
        }

        if (perks) {
            const oldPerks = ClientPerkManager.asList();
            ClientPerkManager.overwrite(perks);
            const newPerks = ClientPerkManager.asList();
            for (let i = 0; i < 3; i++) { // TODO make a constant for max perks
                const newPerk = newPerks[i];
                if (newPerk === undefined) {
                    this.resetPerkSlot(i);
                    continue;
                }
                if (oldPerks[i] !== newPerk) {
                    this.updatePerkSlot(newPerk, i);
                }
            }
        }

        if (blockEmoting !== this.blockEmoting) {
            this.blockEmoting = blockEmoting;
            this.ui.emoteWheel.css("opacity", this.blockEmoting ? "0.5" : "");
        }
    }

    reportedPlayerIDs = new Map<number, boolean>();
    processReportPacket(data: ReportData): void {
        const { ui } = this;
        const name = this.getRawPlayerName(data.playerID);
        ui.reportingName.text(name);
        ui.reportingId.text(data.reportID);
        ui.reportingModal.fadeIn(250);
        ui.btnReport.addClass("btn-disabled");
        this.reportedPlayerIDs.set(data.playerID, true);
    }

    skinID?: string;

    updateWeapons(): void {
        const inventory = this.inventory;
        const activeIndex = inventory.activeWeaponIndex;
        const activeWeapon = inventory.weapons[activeIndex];
        const count = activeWeapon?.count;

        if (activeWeapon === undefined || count === undefined) {
            this.ui.ammoCounterContainer.hide();
        } else {
            this.ui.ammoCounterContainer.show();

            this.ui.activeAmmoCount
                .text(count)
                .css("color", count > 0 ? "inherit" : "red");

            let showReserve = false;
            if (activeWeapon.definition.itemType === ItemType.Gun) {
                const ammoType = activeWeapon.definition.ammoType;
                let totalAmmo: number | string = ClientPerkManager.hasItem(PerkIds.InfiniteAmmo)
                    ? "∞"
                    : this.inventory.items[ammoType];

                for (const ammo of Ammos) {
                    if (ammo.idString === ammoType && ammo.ephemeral) {
                        totalAmmo = "∞";
                        break;
                    }
                }

                showReserve = totalAmmo !== 0;

                this.ui.reserveAmmo
                    .show()
                    .text(totalAmmo);
            }

            this.ui.ammoCounterContainer.toggleClass("has-reserve", showReserve);
            if (!showReserve) {
                this.ui.reserveAmmo.hide();
            }

            if (InputManager.isMobile) {
                this.ui.reloadIcon.toggle(activeWeapon.definition.itemType !== ItemType.Throwable);
            }
        }

        if (activeWeapon?.stats?.kills === undefined) { // killstreaks
            this.ui.killStreakIndicator.hide();
        } else {
            this.ui.killStreakIndicator.show();
            this.ui.killStreakCounter.text(`Streak: ${activeWeapon.stats.kills}`);
        }

        this.updateWeaponSlots();
    }

    updateSlotLocks(): void {
        const max = GameConstants.player.maxWeapons;
        for (
            let i = 0;
            i < max;
            this._getSlotUI(i + 1).container.toggleClass(
                "locked",
                !!(this.inventory.lockedSlots & (1 << i))
            ), i++
        );
    }

    private readonly _weaponCache: Array<{
        hasItem?: boolean
        isActive?: boolean
        idString?: string
        ammo?: number
        hasAmmo?: boolean
    }> = new Array<typeof this._weaponCache[number]>(GameConstants.player.maxWeapons);

    clearWeaponCache(): void {
        this._weaponCache.length = 0;
    }

    updateWeaponSlots(): void {
        const inventory = this.inventory;

        for (let i = 0, max = GameConstants.player.maxWeapons; i < max; i++) {
            const weapon = inventory.weapons[i];
            const isNew = this._weaponCache[i] === undefined;
            const cache = this._weaponCache[i] ??= {};

            const {
                container,
                image: itemImage,
                ammo: ammoCounter,
                name: itemName
            } = this._getSlotUI(i + 1);

            const hasItem = weapon !== undefined;
            if (hasItem !== cache.hasItem || isNew) {
                cache.hasItem = hasItem;
                container.toggleClass("has-item", hasItem);
            }

            const isActive = this.inventory.activeWeaponIndex === i;
            if (isActive !== cache.isActive || isNew) {
                cache.isActive = isActive;
                container.toggleClass("active", isActive);
            }

            const definition = weapon?.definition;
            const idString = definition?.idString;
            if (idString !== cache.idString || isNew) {
                cache.idString = idString;

                if (definition) {
                    const isGun = definition.itemType === ItemType.Gun;
                    const color = isGun
                        ? Ammos.fromString(definition.ammoType).characteristicColor
                        : { hue: 0, saturation: 0, lightness: 0 };

                    container.css(isGun && GameConsole.getBuiltInCVar("cv_weapon_slot_style") === "colored"
                        ? {
                            "outline-color": `hsl(${color.hue}, ${color.saturation}%, ${(color.lightness + 50) / 3}%)`,
                            "background-color": `hsla(${color.hue}, ${color.saturation}%, ${color.lightness / 2}%, 50%)`,
                            "color": `hsla(${color.hue}, ${color.saturation}%, 90%)`
                        }
                        : {
                            "outline-color": "",
                            "background-color": "",
                            "color": ""
                        });

                    itemName.text(
                        definition.itemType === ItemType.Gun && definition.isDual
                            ? getTranslatedString(
                                "dual_template",
                                { gun: getTranslatedString(definition.singleVariant as TranslationKeys) }
                            )
                            : getTranslatedString(definition.idString as TranslationKeys)
                    );

                    const isFists = definition.idString === "fists";

                    let weaponImage: string;
                    if (isFists) {
                        if (this.skinID !== undefined && Skins.fromStringSafe(this.skinID)?.grassTint) { // ghillie suit
                            weaponImage = `url("data:image/svg+xml,${encodeURIComponent(`<svg width="34" height="34" viewBox="0 0 8.996 8.996" xmlns="http://www.w3.org/2000/svg"><circle fill="${Game.colors.ghillie.toHex()}" stroke="${new Color(Game.colors.ghillie).multiply("#111").toHex()}" stroke-width="1.05833" cx="4.498" cy="4.498" r="3.969"/></svg>`)}")`;
                        } else {
                            weaponImage = `url(./img/game/shared/skins/${this.skinID ?? GameConsole.getBuiltInCVar("cv_loadout_skin")}_fist.svg)`;
                        }
                    } else {
                        let frame = definition.idString;
                        if (ClientPerkManager.hasItem(PerkIds.PlumpkinBomb) && definition.itemType === ItemType.Throwable && !definition.noSkin) {
                            frame += "_halloween";
                        }
                        weaponImage = `url(./img/game/${definition.itemType === ItemType.Melee && definition.reskins?.includes(Game.modeName) ? Game.modeName : "shared"}/weapons/${frame}.svg)`;
                    }

                    this._playSlotAnimation(container);
                    itemImage
                        .css("background-image", weaponImage)
                        .toggleClass("is-fists", isFists)
                        .show();
                } else {
                    container.css({
                        "outline-color": "",
                        "background-color": "",
                        "color": ""
                    });
                    itemName.css("color", "").text("");
                    itemImage.hide();
                }
            }

            const ammo = weapon?.count;
            if (ammo !== cache.ammo || isNew) {
                cache.ammo = ammo;
                ammoCounter.text(ammo ?? "");
            }

            const hasAmmo = ammo !== undefined && ammo > 0;
            if (hasAmmo !== cache.hasAmmo || isNew) {
                cache.hasAmmo = hasAmmo;
                ammoCounter.css("color", hasAmmo ? "unset" : "red");
            }
        }
    }

    private _playSlotAnimation(element: JQuery): void {
        element.toggleClass("active");
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        element[0].offsetWidth; // causes browser reflow
        element.toggleClass("active");
    }

    resetPerkSlot(index: number): void {
        const container = $(`#perk-slot-${index}`);

        container.children(".item-tooltip").html("");
        container.children(".item-image").attr("src", "");
        container.css("visibility", "hidden");
        container.off("pointerdown");
    }

    private readonly _perkSlots: Array<JQuery<HTMLDivElement> | undefined> = [];
    private readonly _animationTimeouts: Array<number | undefined> = [];
    updatePerkSlot(perkDef: PerkDefinition, index: number): void {
        if (index > 3) index = 0; // overwrite stuff ig?
        // no, write a hud that can handle it

        const container = this._perkSlots[index] ??= $<HTMLDivElement>(`#perk-slot-${index}`);
        container.attr("data-idString", perkDef.idString);
        container.children(".item-tooltip").html(`<strong>${perkDef.name}</strong><br>${perkDef.description}`);
        container.children(".item-image").attr("src", `./img/game/${perkDef.category === PerkCategories.Halloween ? "halloween" : "shared"}/perks/${perkDef.idString}.svg`);
        container.css("visibility", ClientPerkManager.hasItem(perkDef.idString) ? "visible" : "hidden");

        container.css("outline", !perkDef.noDrop ? "" : "none");

        const flashAnimationDuration = 3000; // ms

        clearTimeout(this._animationTimeouts[index]);

        container.css("animation", `perk-${perkDef.type ?? "normal"}-colors 1.5s linear infinite`);

        // if (perkDef.type !== undefined) Game.soundManager.play(`perk_pickup_${perkDef.type}`);

        this._animationTimeouts[index] = window.setTimeout(() => {
            container.css("animation", "none");
        }, flashAnimationDuration);
    }

    updateItems(): void {
        for (const item in this.inventory.items) {
            const count = this.inventory.items[item];
            const countElem = this._itemCountCache[item] ??= $(`#${item}-count`);
            const itemSlot = this._itemSlotCache[item] ??= $(`#${item}-slot`);

            const itemDef = Loots.fromString(item);

            if (+countElem.text() < count && itemSlot.length) {
                this._playSlotAnimation(itemSlot);
            }

            countElem.text(count);

            if (Game.activePlayer) {
                const backpack = Game.activePlayer.equipment.backpack;
                itemSlot.toggleClass("full", count >= backpack.maxCapacity[item]);
            }
            const isPresent = count > 0;

            itemSlot.toggleClass("has-item", isPresent);

            if (itemDef.itemType === ItemType.Ammo && itemDef.hideUnlessPresent) {
                itemSlot.css("visibility", isPresent ? "visible" : "hidden");
            }

            if (itemDef.itemType === ItemType.Scope && !UI_DEBUG_MODE) {
                itemSlot.toggle(isPresent).removeClass("active");
            }
        }

        (
            this._scopeSlotCache[this.inventory.scope.idString] ??= $(`#${this.inventory.scope.idString}-slot`)
        ).addClass("active");
    }

    private _killMessageTimeoutID?: number;

    private _addKillFeedMessage(text: string, classes: string[]): void {
        const killFeedItem = $<HTMLDivElement>('<div class="kill-feed-item">');

        killFeedItem.html(text);
        killFeedItem.addClass(classes);

        const others = this._getKillFeedElements();

        this.ui.killFeed.prepend(killFeedItem);

        killFeedItem.css("opacity", 0);

        others.forEach(otherKillFeedItem => {
            const newPosition = otherKillFeedItem.element.getBoundingClientRect();
            if (newPosition.y === otherKillFeedItem.position.y) return;

            otherKillFeedItem.element.animate([
                { transform: `translateY(${otherKillFeedItem.position.y - newPosition.y}px)` },
                { transform: "translateY(0px)" }
            ], {
                duration: 300,
                iterations: 1,
                easing: "ease-in"
            });
        });
        killFeedItem.css("opacity", "");
        killFeedItem.get(0)?.animate([
            { opacity: 0 },
            { opacity: 1 }
        ], {
            duration: 300,
            iterations: 1,
            easing: "ease-in"
        });

        if (!UI_DEBUG_MODE) {
            let iterationCount = 0;
            while (this.ui.killFeed.children().length > 5) {
                if (++iterationCount === 1e3) {
                    console.warn("1000 iterations of removing killfeed entries; possible infinite loop");
                }

                this.ui.killFeed.children()
                    .last()
                    .remove();
            }
        }

        setTimeout(() => {
            const removeAnimation = killFeedItem.get(0)?.animate([
                {
                    opacity: 1,
                    transform: "translateX(0%)"
                },
                {
                    opacity: 0,
                    transform: "translateY(100%)"
                }
            ], {
                duration: 300,
                fill: "backwards",
                easing: "ease-out"
            });

            if (!removeAnimation) return;

            removeAnimation.onfinish = () => {
                killFeedItem.remove();
            };
        }, 7000);
    }

    private _getKillFeedElements(): Array<{
        element: HTMLDivElement
        position: Vector
    }> {
        return this.ui.killFeed.children().toArray().map(child => {
            const boundingRects = child.getBoundingClientRect();
            return {
                element: child as HTMLDivElement,
                position: Vec.create(boundingRects.x, boundingRects.y)
            };
        });
    }

    private _getNameAndBadge(id?: number): string {
        if (id === undefined) return "";

        const { name, badge } = this.getPlayerData(id);
        return `${name}${badge ? html`<img class="badge-icon" src="./img/game/shared/badges/${badge.idString}.svg" alt="${badge.name} badge">` : ""}`;
    }

    processKillPacket(data: KillData): void {
        let messageText: string | undefined;
        const classes: string[] = [];

        const {
            victimId,
            attackerId,
            creditedId,
            kills,
            damageSource,
            weaponUsed,
            killstreak,
            downed,
            killed
        } = data;

        const activeId = Game.activePlayerID;
        const weaponPresent = weaponUsed !== undefined;
        const hasKillstreak = !!killstreak;
        const gotKillCredit = creditedId !== undefined ? activeId === creditedId : activeId === attackerId;
        const grenadeImpactKill = (
            weaponPresent
            && "itemType" in weaponUsed
            && weaponUsed.itemType === ItemType.Throwable
        )
            ? getTranslatedString("kf_impact_of")
            : "";
        let weaponName: string | undefined;
        const weapon = weaponPresent ? `${grenadeImpactKill}${(weaponName = getTranslatedString(weaponUsed.idString as TranslationKeys)) === weaponUsed.idString ? weaponUsed.name : weaponName}` : "";

        let victimText = this._getNameAndBadge(victimId);
        const attackerText = this._getNameAndBadge(attackerId);

        const language = GameConsole.getBuiltInCVar("cv_language");

        //
        // Killfeed message
        //

        switch (GameConsole.getBuiltInCVar("cv_killfeed_style")) {
            case "text": {
                let feedMessage = "";

                // Remove spaces if chinese/japanese language.
                if (TRANSLATIONS.translations[language].no_space && messageText) {
                    messageText = messageText.replaceAll("<span>", "<span style=\"display:contents;\">");
                }

                // special case for turkish
                if (language === "tr") {
                    victimText = victimText.replace("<span>", "<span style=\"display:contents;\">");
                }

                switch (damageSource) {
                    case DamageSources.Gun:
                    case DamageSources.Melee:
                    case DamageSources.Throwable:
                    case DamageSources.Explosion: {
                        let event: TranslationKeys | undefined;
                        const suicide = attackerId === undefined;
                        if (!suicide) {
                            if (downed) {
                                if (killed) event = "kf_finished_off";
                                else event = "kf_knocked";
                            } else {
                                event = "kf_killed";
                            }

                            feedMessage = getTranslatedString("kf_message", {
                                player: attackerText,
                                event: event ? getTranslatedString(event) : "",
                                victim: victimText,
                                with: weapon && getTranslatedString("with"),
                                weapon
                            });
                        } else {
                            if (downed) {
                                if (killed) event = "kf_suicide_finished_off";
                                else event = "kf_suicide_down";
                            } else {
                                event = "kf_suicide_kill";
                            }

                            // Turkish and Estonian special condition ('i shouldn't appear in these messages)
                            feedMessage = getTranslatedString(`kf_message${(language === "tr" || language === "et") ? "_grammar" : ""}` as TranslationKeys, {
                                player: victimText,
                                event: event ? getTranslatedString(event) : "",
                                victim: "",
                                with: weapon && getTranslatedString("with"),
                                weapon
                            });
                        }
                        break;
                    }
                    case DamageSources.Gas:
                        feedMessage = getTranslatedString(`kf_gas_${killed ? "kill" : "down"}`, { player: victimText });
                        break;
                    case DamageSources.Airdrop:
                        feedMessage = getTranslatedString(`kf_airdrop_${killed ? "kill" : "down"}`, { player: victimText });
                        break;
                    case DamageSources.BleedOut:
                        feedMessage = getTranslatedString(`kf_bleed_out_${killed ? "kill" : "down"}`, { player: victimText });
                        break;
                    case DamageSources.FinallyKilled: {
                        let event: TranslationKeys | undefined;
                        if (creditedId === victimId) {
                            event = "kf_finally_ended_themselves";
                        } else if (creditedId !== undefined) {
                            event = "kf_finally_killed";
                        } else {
                            event = "kf_finally_died";
                        }
                        feedMessage = getTranslatedString(event, { player: victimText });
                        break;
                    }
                }

                if (!feedMessage) {
                    console.warn("Undefined killfeed message for data:", data);
                }

                const icon = killed
                    ? html`<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull">`
                    : html`<img class="kill-icon" src="./img/misc/downed.svg" alt="Downed">`;

                messageText = `${hasKillstreak ? killstreak : ""}${icon}${feedMessage}`;
                break;
            }
            case "icon": {
                const downedIcon = html`<img class="kill-icon" src="./img/misc/downed.svg" alt="Downed">`;
                const skullIcon = html`<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Finished off">`;
                const bleedOutIcon = html`<img class="kill-icon" src="./img/misc/bleed_out.svg" alt="Bleed out">`;
                const finallyKilledIcon = html`<img class="kill-icon" src="./img/misc/finally_killed.svg" alt="Finally killed">`;

                const killstreakText = hasKillstreak
                    ? html`
                    <span style="font-size: 80%">(${killstreak}
                        <img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull" height=12>)
                    </span>`
                    : "";

                let iconName = "";
                switch (damageSource) {
                    case DamageSources.Gas:
                        iconName = "gas";
                        break;
                    case DamageSources.Airdrop:
                        iconName = "airdrop";
                        break;
                    default:
                        iconName = weaponUsed?.killfeedFrame ?? weaponUsed?.idString ?? "";
                        break;
                }
                const altText = weaponUsed ? weaponUsed.name : iconName;
                const weaponText = html`<img class="kill-icon" src="./img/killfeed/${iconName}_killfeed.svg" alt="${altText}">`;

                let body = "";
                switch (damageSource) {
                    case DamageSources.Gun:
                    case DamageSources.Melee:
                    case DamageSources.Throwable:
                    case DamageSources.Explosion: {
                        if (downed && killed) {
                            body = `${skullIcon} ${attackerText} ${killstreakText} ${weaponText} ${victimText}`;
                        } else {
                            body = `${attackerText} ${killstreakText} ${weaponText} ${victimText}`;
                        }
                        break;
                    }
                    case DamageSources.Gas:
                    case DamageSources.Airdrop:
                        body = `${weaponText} ${victimText}`;
                        break;
                    case DamageSources.BleedOut:
                        body = `${bleedOutIcon} ${victimText}`;
                        break;
                    case DamageSources.FinallyKilled:
                        switch (attackerId) {
                            case undefined:
                                body = `${skullIcon} ${victimText}`;
                                break;
                            case victimId:
                                body = `${finallyKilledIcon} ${victimText}`;
                                break;
                            default:
                                body = `${attackerText} ${killstreakText} ${finallyKilledIcon} ${victimText}`;
                                break;
                        }
                        break;
                }

                if (!body) {
                    console.warn("Undefined killfeed message for data:", data);
                }

                messageText = `${(downed && !killed) ? downedIcon : ""}${body}`;
                break;
            }
        }

        /**
         * Whether the player pointed to by the given id is on the active player's team
         */
        const playerIsOnThisTeam = (id?: number): boolean | undefined => {
            let target: GameObject | undefined;

            return id === activeId || (
                id !== undefined
                && (
                    this._teammateDataCache.has(id)
                    || (
                        (target = Game.objects.get(id))
                        && target.isPlayer
                        && (target as Player).teamID === Game.teamID
                    )
                )
            );
        };

        const victimOnThisTeam = playerIsOnThisTeam(victimId);

        if (victimOnThisTeam) {
            classes.push("kill-feed-item-victim");
        } else if (playerIsOnThisTeam(attackerId) || playerIsOnThisTeam(creditedId)) {
            classes.push("kill-feed-item-killer");
        }

        // Disable spaces in chinese languages.
        if (TRANSLATIONS.translations[GameConsole.getBuiltInCVar("cv_language")].no_space) {
            classes.push("no-spaces");
        }

        if (messageText) this._addKillFeedMessage(messageText, classes);

        //
        // Kill leader stuff
        //

        if (killed && (victimId === this.killLeaderCache?.id || victimId === this.oldKillLeaderId)) {
            let messageInner: string;
            switch (damageSource) {
                case DamageSources.Gun:
                case DamageSources.Melee:
                case DamageSources.Throwable:
                case DamageSources.Explosion:
                    messageInner = attackerId !== undefined
                        ? getTranslatedString("kf_kl_killed", { player: attackerText })
                        : getTranslatedString("kf_kl_suicide");
                    break;
                case DamageSources.Gas:
                case DamageSources.Airdrop:
                case DamageSources.BleedOut:
                case DamageSources.FinallyKilled:
                    messageInner = getTranslatedString("kf_kl_dead");
                    break;
            }
            messageText = html`<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> ${messageInner}`;

            let clazz: string;
            if (gotKillCredit) {
                clazz = "kill-feed-item-killer";
            } else if (activeId === victimId) {
                clazz = "kill-feed-item-victim";
            } else {
                clazz = "kill-feed-kill-leader";
            }

            this._addKillFeedMessage(messageText, [clazz]);

            SoundManager.play("kill_leader_dead");
            this.ui.spectateKillLeader.addClass("btn-disabled");
        }

        //
        // Kill modal
        //

        let modalMessage = "";

        victimText = `<span class="kill-msg-player-name">${victimText}</span>`;

        switch (damageSource) {
            case DamageSources.Gun:
            case DamageSources.Melee:
            case DamageSources.Throwable:
            case DamageSources.Explosion: {
                const suicide = attackerId === undefined;
                let event: TranslationKeys | undefined;
                if (activeId === victimId) {
                    if (!suicide) {
                        if (downed) {
                            if (killed) event = "km_finished_off_you";
                            else event = "km_knocked_you";
                        } else {
                            event = "km_killed_you";
                        }
                        modalMessage = getTranslatedString("kf_message", {
                            player: attackerText,
                            event: getTranslatedString(event),
                            victim: "",
                            with: weapon && getTranslatedString("with"),
                            weapon
                        });
                    } else {
                        modalMessage = getTranslatedString("kf_message", {
                            player: getTranslatedString("you"),
                            event: downed
                                ? getTranslatedString(killed ? "km_suicide_finished_off" : "km_suicide_down")
                                : getTranslatedString("kf_suicide_kill", { player: "" }),
                            victim: "",
                            with: weapon && getTranslatedString("with"),
                            weapon
                        });
                    }
                } else if (activeId === attackerId || activeId === creditedId || victimOnThisTeam) {
                    if (!suicide) {
                        if (downed) {
                            if (killed) event = "kf_finished_off";
                            else event = "kf_knocked";
                        } else {
                            event = "kf_killed";
                        }
                        modalMessage = getTranslatedString("kf_message", {
                            player: activeId === attackerId ? getTranslatedString("you") : attackerText,
                            event: getTranslatedString(event),
                            victim: victimText,
                            with: weapon && getTranslatedString("with"),
                            weapon
                        });
                    } else {
                        if (downed) {
                            if (killed) event = "kf_suicide_finished_off";
                            else event = "kf_suicide_down";
                        } else {
                            event = "kf_suicide_kill";
                        }

                        // Turkish and Estonian special condition ('i shouldn't appear in these messages)
                        modalMessage = getTranslatedString(`kf_message${(language === "tr" || language === "et") ? "_grammar" : ""}` as TranslationKeys, {
                            player: victimText,
                            event: event ? getTranslatedString(event) : "",
                            victim: "",
                            with: weapon && getTranslatedString("with"),
                            weapon
                        });
                    }
                }
                break;
            }
            case DamageSources.Gas:
                if (activeId === victimId) {
                    modalMessage = getTranslatedString(`km_gas_${killed ? "kill" : "down"}_you`);
                } else if (activeId === creditedId || victimOnThisTeam) {
                    modalMessage = getTranslatedString(`kf_gas_${killed ? "kill" : "down"}`, { player: victimText });
                }
                break;
            case DamageSources.Airdrop:
                if (activeId === victimId) {
                    modalMessage = getTranslatedString(`km_airdrop_${killed ? "kill" : "down"}_you`);
                } else if (activeId === creditedId || victimOnThisTeam) {
                    modalMessage = getTranslatedString(`kf_airdrop_${killed ? "kill" : "down"}`, { player: victimText });
                }
                break;
            case DamageSources.BleedOut: {
                let player: string | undefined;
                if (activeId === victimId) player = getTranslatedString("you");
                else if (activeId === creditedId || victimOnThisTeam) player = victimText;

                if (player) modalMessage = getTranslatedString(`kf_bleed_out_${killed ? "kill" : "down"}`, { player });
                break;
            }
            case DamageSources.FinallyKilled: {
                let player: string | undefined;
                if (activeId === victimId) player = getTranslatedString("you");
                else if (activeId === creditedId || victimOnThisTeam) player = victimText;

                if (player) {
                    let event: TranslationKeys | undefined;
                    if (creditedId === victimId) {
                        event = "kf_finally_ended_themselves";
                    } else if (creditedId !== undefined) {
                        event = "kf_finally_killed";
                    } else {
                        event = "kf_finally_died";
                    }
                    modalMessage = getTranslatedString(event, { player });
                }
                break;
            }
        }

        // don't show modal if no message
        if (!modalMessage) return;

        // special case for languages like hungarian and greek
        if (getTranslatedString("you") === "") {
            // Remove useless spaces at start (from blank "you")
            modalMessage = modalMessage.trimStart();

            modalMessage = modalMessage.charAt(0).toUpperCase() + modalMessage.slice(1);
        }

        if (
            killed
            && kills !== undefined
            && gotKillCredit
        ) {
            this.ui.killMsgHeader.text(getTranslatedString("msg_kills", { kills: kills.toString() }));
            this.ui.killMsgCounter.text(kills);
            if (killstreak) modalMessage += ` (streak: ${killstreak})`;
        } else {
            // Do not show kills counter in the down message.
            this.ui.killMsgHeader.text("");
        }

        this.ui.killMsgContainer.html(modalMessage);

        this.ui.killMsgModal.fadeIn(350, () => {
            // clear the previous fade out timeout so it won't fade away too
            // fast if the player makes more than one kill in a short time span
            clearTimeout(this._killMessageTimeoutID);

            this._killMessageTimeoutID = window.setTimeout(() => {
                this.ui.killMsgModal.fadeOut(350);
            }, 3000);
        });
    }

    killLeaderCache: UpdateDataCommon["killLeader"] | undefined;
    oldKillLeaderId: number | undefined;

    updateKillLeader(data: UpdateDataCommon["killLeader"]): void {
        if (!data) return;
        const { id, kills } = data;

        const hasLeader = id !== 65535; // means no leader: server sent -1, value wrapped around to 65535
        const leaderText = hasLeader
            ? this._getNameAndBadge(id)
            : getTranslatedString("msg_waiting_for_leader");

        this.ui.killLeaderLeader.html(leaderText);
        this.ui.killLeaderCount.text(kills);

        this.ui.spectateKillLeader.removeClass("btn-disabled");

        if (hasLeader && this.killLeaderCache && this.killLeaderCache.id !== id) {
            const messageText = html`<i class="fa-solid fa-crown"></i> ${getTranslatedString("kf_kl_promotion", { player: leaderText })}`;
            this._addKillFeedMessage(messageText, [id === Game.activePlayerID ? "kill-feed-item-killer" : "kill-feed-kill-leader"]);
            SoundManager.play("kill_leader_assigned");
        }

        this.oldKillLeaderId = this.killLeaderCache?.id ?? id;
        this.killLeaderCache = data;
    }
})();

class Wrapper<T> {
    private _dirty = true;
    get dirty(): boolean { return this._dirty; }

    private _value: T;
    get value(): T { return this._value; }
    set value(value: T) {
        if (this._value === value) return;

        this._dirty = true;
        this._value = value;
    }

    constructor(value: T) {
        this._value = value;
    }

    markClean(): void {
        if (!this._dirty) return;
        this._dirty = false;
    }
}

interface UpdateDataType {
    readonly id?: number | null
    readonly normalizedHealth?: number | null
    readonly downed?: boolean | null
    readonly disconnected?: boolean | null
    readonly position?: Vector | null
    readonly colorIndex?: number | null
    readonly name?: string | null
    readonly hasColor?: boolean | null
    readonly nameColor?: Color | null
    readonly badge?: BadgeDefinition | null
}

class TeammateIndicatorUI {
    readonly container: JQuery<HTMLDivElement>;

    readonly svgContainer: JQuery<SVGElement>;
    readonly healthDisplay: JQuery<SVGCircleElement>;

    readonly indicatorContainer: JQuery<HTMLDivElement>;
    readonly teammateIndicator: JQuery<HTMLImageElement>;

    readonly nameLabel: JQuery<HTMLSpanElement>;
    readonly badgeImage: JQuery<HTMLImageElement>;

    /*
      hierarchy:

      container
      |
      |-> svgContainer
      |   |-> healthAmount
      |
      |-> indicatorContainer
      |   |-> teammateIndicator
      |
      |-> nameLabel
      |-> badgeImage
  */

    private readonly _id = new Wrapper<number>(-1);
    get id(): number { return this._id.value; }

    private readonly _normalizedHealth = new Wrapper<number>(1);
    get normalizedHealth(): number { return this._normalizedHealth.value; }

    private readonly _downed = new Wrapper<boolean | undefined>(undefined);
    get downed(): boolean | undefined { return this._downed.value; }

    private readonly _disconnected = new Wrapper<boolean>(false);
    get disconnected(): boolean { return this._disconnected.value; }

    private readonly _position = new Wrapper<Vector | undefined>(undefined);
    get position(): Vector | undefined { return this._position.value; }

    private readonly _colorIndex = new Wrapper<number>(0);
    get colorIndex(): number { return this._colorIndex.value; }

    private readonly _name = new Wrapper<string>(GameConstants.player.defaultName);
    get name(): string { return this._name.value; }

    private readonly _hasColor = new Wrapper<boolean>(false);
    get hasColor(): boolean { return this._hasColor.value; }

    private readonly _nameColor = new Wrapper<Color | undefined>(undefined);
    get nameColor(): Color | undefined { return this._nameColor.value; }

    private readonly _badge = new Wrapper<BadgeDefinition | undefined>(undefined);
    get badge(): BadgeDefinition | undefined { return this._badge.value; }

    constructor(data?: UpdateDataType) {
        this.container = $<HTMLDivElement>('<div class="teammate-container"></div>');
        this.svgContainer = $<SVGElement>('<svg class="teammate-health-indicator" width="48" height="48" xmlns="http://www.w3.org/2000/svg"></svg>');

        // HACK wrapping in <svg> is necessary to ensure that it's interpreted as an actual svg circle and not… whatever it'd try to interpret it as otherwise
        this.healthDisplay = $<SVGCircleElement>('<svg><circle r="21" cy="24" cx="24" stroke-width="6" stroke-dasharray="132" fill="none" style="transition: stroke-dashoffset ease-in-out 50ms;" /></svg>').find("circle");
        this.indicatorContainer = $<HTMLDivElement>('<div class="teammate-indicator-container"></div>');
        this.teammateIndicator = $<HTMLImageElement>('<img class="teammate-indicator" />');
        this.nameLabel = $<HTMLSpanElement>('<span class="teammate-name"></span>');
        this.badgeImage = $<HTMLImageElement>('<img class="teammate-badge" />');

        this.container.append(
            this.svgContainer.append(this.healthDisplay),
            this.indicatorContainer.append(this.teammateIndicator),
            this.nameLabel,
            this.badgeImage
        );

        if (typeof data?.id === "number") {
            this._id.value = data.id;
            this._id.markClean();
        }

        this.update(data);
    }

    update(data?: UpdateDataType): void {
        const id = this._id.value;
        const hadNoHealth = this._normalizedHealth.value <= 0;

        if (data !== undefined) {
            ([
                "id",
                "colorIndex",
                "downed",
                "disconnected",
                "normalizedHealth",
                "position",
                "name",
                "hasColor",
                "nameColor",
                "badge"
            ] as const).forEach(<K extends keyof UpdateDataType>(prop: K) => {
                const value = data[prop];
                if (prop in data && value !== null) {
                    type GoofyValueType = Exclude<Required<typeof data>[typeof prop], null>;

                    (this[`_${prop}`] as Wrapper<GoofyValueType>).value = value as GoofyValueType;
                }
            });
        }

        if (this._id.dirty) {
            // uh… no-op?
            console.warn(`PlayerHealthUI id unexpectedly marked dirty (was ${id}, currently ${this._id.value}); ignoring change request.`);
        }

        let recalcIndicatorFrame = false;

        if (this._normalizedHealth.dirty) {
            const normHp = this._normalizedHealth.value;

            this.healthDisplay
                .css("stroke", UIManager.getHealthColor(normHp, this._downed.value))
                .css("stroke-dashoffset", 132 * (1 - normHp));

            recalcIndicatorFrame = hadNoHealth !== (normHp <= 0);
        }

        if (this._downed.dirty) {
            this.container.toggleClass("downed", this._downed.value === true);

            recalcIndicatorFrame = true;
        }

        if (this._disconnected.dirty) {
            this.container.toggleClass("disconnected", this._disconnected.value);

            const teammateIndicator = MapManager.teammateIndicators.get(id);

            teammateIndicator?.setAlpha(this._disconnected.value ? 0.5 : 1);
            recalcIndicatorFrame = true;
        }

        let indicator: SuroiSprite | undefined;

        if (id === Game.activePlayerID) {
            indicator = MapManager.indicator;
        } else {
            const teammateIndicators = MapManager.teammateIndicators;

            if (this._position.dirty && this._position.value) {
                if ((indicator = teammateIndicators.get(id)) === undefined) {
                    const color = TEAMMATE_COLORS[UIManager.getTeammateColorIndex(id) ?? this._colorIndex.value];

                    teammateIndicators.set(
                        id,
                        indicator = new SuroiSprite("player_indicator")
                            .setTint(color)
                    );
                    MapManager.teammateIndicatorContainer.addChild(indicator);
                }

                indicator
                    .setVPos(this._position.value)
                    .setScale(MapManager.expanded ? 1 : 0.75);
            }

            indicator ??= teammateIndicators.get(id);
        }

        if (recalcIndicatorFrame) {
            const frame = `player_indicator${this._normalizedHealth.value === 0 ? "_dead" : this._downed.value ? "_downed" : ""}`;
            const newSrc = `./img/game/shared/player/${frame}.svg`;
            if (this.teammateIndicator.attr("src") !== newSrc) {
                this.teammateIndicator.attr("src", newSrc);
            }
            indicator?.setFrame(frame);
        }

        if (this._colorIndex.dirty) {
            const color = TEAMMATE_COLORS[UIManager.getTeammateColorIndex(id) ?? this._colorIndex.value];

            this.indicatorContainer.css(
                "background-color",
                color.toHex()
            );
            indicator?.setTint(color);
        }

        if (this._name.dirty) {
            this.nameLabel.text((UIManager.getRawPlayerNameNullish(id) ?? this._name.value) || "Loading…");
        }

        if (

            (this._hasColor.dirty && this._nameColor.value)
            || (this._nameColor.dirty && this._hasColor.value)
        ) {
            this.nameLabel.css(
                "color",
                this._hasColor.value && this._nameColor.value ? this._nameColor.value.toHex() : ""
            );
        }

        if (this._badge.dirty) {
            const teammate = Game.playerNames.get(id);

            if (teammate?.badge) {
                const src = `./img/game/shared/badges/${teammate.badge.idString}.svg`;

                if (this.badgeImage.attr("src") !== src) {
                    this.badgeImage
                        .attr("src", src)
                        .css({ display: "", visibility: "" });
                }
            } else {
                this.badgeImage
                    .attr("src", "")
                    .css({ display: "none", visibility: "none" });
            }
        }

        ([
            "id",
            "colorIndex",
            "downed",
            "disconnected",
            "normalizedHealth",
            "position",
            "name",
            "hasColor",
            "nameColor",
            "badge"
        ] as const).forEach(<K extends keyof UpdateDataType>(prop: K) => {
            (this[`_${prop}`] as Wrapper<unknown>).markClean();
        });
    }

    destroy(): void {
        this.container.remove();
        const id = this._id.value;
        const teammateIndicators = MapManager.teammateIndicators;
        teammateIndicators.get(id)?.destroy();
        teammateIndicators.delete(id);
    }
}
