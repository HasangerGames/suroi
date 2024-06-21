import $ from "jquery";
import { type Color } from "pixi.js";
import { DEFAULT_INVENTORY, GameConstants, KillfeedEventSeverity, KillfeedEventType, KillfeedMessageType } from "../../../../common/src/constants";
import { Ammos } from "../../../../common/src/definitions/ammos";
import { type BadgeDefinition } from "../../../../common/src/definitions/badges";
import { type EmoteDefinition } from "../../../../common/src/definitions/emotes";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { Loots } from "../../../../common/src/definitions/loots";
import { MapPings, type PlayerPing } from "../../../../common/src/definitions/mapPings";
import { DEFAULT_SCOPE, type ScopeDefinition } from "../../../../common/src/definitions/scopes";
import { type GameOverPacket } from "../../../../common/src/packets/gameOverPacket";
import { type KillFeedPacket } from "../../../../common/src/packets/killFeedPacket";
import { type PlayerData, type UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { Numeric } from "../../../../common/src/utils/math";
import { ExtendedMap, freezeDeep } from "../../../../common/src/utils/misc";
import { ItemType, type ReferenceTo } from "../../../../common/src/utils/objectDefinitions";
import { Vec, type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameObject } from "../objects/gameObject";
import { Player } from "../objects/player";
import { GHILLIE_TINT, TEAMMATE_COLORS, UI_DEBUG_MODE } from "../utils/constants";
import { formatDate, html } from "../utils/misc";
import { SuroiSprite } from "../utils/pixi";

function safeRound(value: number): number {
    if (0 < value && value <= 1) return 1;
    return Math.round(value);
}

/**
 * This class manages the game UI
 */
export class UIManager {
    private maxHealth = GameConstants.player.defaultHealth;
    private health = GameConstants.player.defaultHealth;

    private maxAdrenaline = GameConstants.player.maxAdrenaline;
    private minAdrenaline = 0;
    private adrenaline = 0;

    readonly inventory: {
        activeWeaponIndex: number
        weapons: PlayerData["inventory"]["weapons"] & object
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

    emotes: Array<EmoteDefinition | undefined> = [];

    teammates: (UpdatePacket["playerData"] & object)["teammates"] = [];

    readonly debugReadouts = Object.freeze({
        fps: $<HTMLSpanElement>("#fps-counter"),
        ping: $<HTMLSpanElement>("#ping-counter"),
        pos: $<HTMLSpanElement>("#coordinates-hud")
    });

    private static _instantiated = false;
    constructor(readonly game: Game) {
        if (UIManager._instantiated) {
            throw new Error("Class 'UIManager' has already been instantiated");
        }
        UIManager._instantiated = true;
    }

    getRawPlayerNameNullish(id: number): string | undefined {
        const player = this.game.playerNames.get(id) ?? this._teammateDataCache.get(id);
        let name: string | undefined;

        if (!player) {
            console.warn(`Unknown player name with id ${id}`);
        } else if (this.game.console.getBuiltInCVar("cv_anonymize_player_names")) {
            name = `${GameConstants.player.defaultName}_${id}`;
        } else {
            name = player.name;
        }

        return name;
    }

    getRawPlayerName(id: number): string {
        return this.getRawPlayerNameNullish(id) ?? "[Unknown Player]";
    }

    getPlayerName(id: number): string {
        const element = $<HTMLSpanElement>("<span>");
        const player = this.game.playerNames.get(id) ?? this._teammateDataCache.get(id);

        const name = this.getRawPlayerName(id);

        if (player && player.hasColor && !this.game.console.getBuiltInCVar("cv_anonymize_player_names")) {
            element.css("color", player.nameColor?.toHex() ?? "");
        }

        element.text(name);

        // what in the jquery is this
        return element.prop("outerHTML") as string;
    }

    getPlayerBadge(id: number): BadgeDefinition | undefined {
        if (this.game.console.getBuiltInCVar("cv_anonymize_player_names")) {
            return;
        }

        const player = this.game.playerNames.get(id) ?? this._teammateDataCache.get(id);

        switch (true) {
            case this.game.console.getBuiltInCVar("cv_anonymize_player_names"): {
                return;
            }
            case player === undefined: {
                console.warn(`Unknown player name with id ${id}`); return;
            }
            default: {
                return player.badge;
            }
        }
    }

    static getHealthColor(normalizedHealth: number, downed?: boolean): string {
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

    readonly ui = Object.freeze({
        loadingText: $<HTMLDivElement>("#loading-text"),

        ammoCounterContainer: $<HTMLDivElement>("#weapon-ammo-container"),
        activeAmmo: $<HTMLSpanElement>("#weapon-clip-ammo-count"),
        reserveAmmo: $<HTMLDivElement>("#weapon-inventory-ammo"),
        killStreakIndicator: $<HTMLDivElement>("#killstreak-indicator-container"),
        killStreakCounter: $<HTMLSpanElement>("#killstreak-indicator-counter"),

        weaponsContainer: $<HTMLDivElement>("#weapons-container"),

        minMaxAdren: $<HTMLSpanElement>("#adrenaline-bar-min-max"),
        maxHealth: $<HTMLSpanElement>("#health-bar-max"),

        healthBar: $<HTMLDivElement>("#health-bar"),
        healthBarAmount: $<HTMLSpanElement>("#health-bar-amount"),
        healthAnim: $<HTMLDivElement>("#health-bar-animation"),

        adrenalineBar: $<HTMLDivElement>("#adrenaline-bar"),
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

        gasMsg: $<HTMLDivElement>("#gas-msg"),
        gasMsgInfo: $<HTMLDivElement>("#gas-msg-info"),

        joystickContainer: $<HTMLDivElement>("#joysticks-containers"),

        gameOverOverlay: $<HTMLDivElement>("#game-over-overlay"),
        gameOverText: $<HTMLHeadingElement>("#game-over-text"),
        gameOverPlayerName: $<HTMLHeadingElement>("#game-over-player-name"),
        gameOverKills: $<HTMLSpanElement>("#game-over-kills"),
        gameOverDamageDone: $<HTMLSpanElement>("#game-over-damage-done"),
        gameOverDamageTaken: $<HTMLSpanElement>("#game-over-damage-taken"),
        gameOverTime: $<HTMLSpanElement>("#game-over-time"),
        gameOverRank: $<HTMLSpanElement>("#game-over-rank"),
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
        lockedTime: $<HTMLSpanElement>("#locked-time"),

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
        createTeamPlayers: $<HTMLDivElement>("#create-team-players"),
        closeCreateTeam: $<HTMLButtonElement>("#close-create-team")
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
                const inner = container.children(".main-container") as JQuery<HTMLDivElement>;

                return {
                    container,
                    inner,
                    name: inner.children(".item-name") as JQuery<HTMLSpanElement>,
                    image: inner.children(".item-image") as JQuery<HTMLImageElement>,
                    ammo: inner.children(".item-ammo") as JQuery<HTMLSpanElement>
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
        this.ui.actionContainer
            .hide()
            .stop();
        this.action.active = false;
    }

    gameOverScreenTimeout: number | undefined;

    showGameOverScreen(packet: GameOverPacket): void {
        const game = this.game;

        this.ui.interactMsg.hide();
        this.ui.spectatingContainer.hide();

        game.activePlayer?.actionSound?.stop();

        this.ui.gasMsg.fadeOut(500);

        // Disable joysticks div so you can click on players to spectate
        this.ui.joystickContainer.hide();

        const {
            gameOverOverlay,
            chickenDinner,
            gameOverText,
            gameOverRank,
            gameOverPlayerName,
            gameOverKills,
            gameOverDamageDone,
            gameOverDamageTaken,
            gameOverTime
        } = this.ui;

        game.gameOver = true;

        if (!packet.won) {
            this.ui.btnSpectate.removeClass("btn-disabled").show();
            game.map.indicator.setFrame("player_indicator_dead");
        } else {
            this.ui.btnSpectate.hide();
        }

        chickenDinner.toggle(packet.won);

        const playerName = this.getPlayerName(packet.playerID);
        const playerBadge = this.getPlayerBadge(packet.playerID);
        const playerBadgeText = playerBadge
            ? html`<img class="badge-icon" src="./img/game/badges/${playerBadge.idString}.svg" alt="${playerBadge.name} badge">`
            : "";

        gameOverText.html(
            packet.won
                ? "Winner winner chicken dinner!"
                : `${this.game.spectating ? this.getPlayerName(packet.playerID) : "You"} died.`
        );

        gameOverPlayerName.html(playerName + playerBadgeText);

        gameOverKills.text(packet.kills);
        gameOverDamageDone.text(packet.damageDone);
        gameOverDamageTaken.text(packet.damageTaken);
        gameOverTime.text(formatDate(packet.timeAlive));

        if (packet.won) void game.music.play();

        this.gameOverScreenTimeout = window.setTimeout(() => gameOverOverlay.fadeIn(500), 500);

        // Player rank
        gameOverRank.text(`#${packet.rank}`).toggleClass("won", packet.won);
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
        const { pingWheelActive } = this.game.inputManager;
        for (let i = 0; i < 4; i++) {
            const definition = (pingWheelActive ? this.mapPings : this.emotes)[i];

            this.ui.emoteSelectors[i].css(
                "background-image",
                definition ? `url("./img/game/${pingWheelActive ? "mapPings" : "emotes"}/${definition.idString}.svg")` : ""
            );
        }
    }

    private readonly _teammateDataCache = new Map<number, PlayerHealthUI>();
    clearTeammateCache(): void {
        for (const [, entry] of this._teammateDataCache) {
            entry.destroy();
        }

        this._teammateDataCache.clear();
    }

    private _lastHealthBarAnimTime = 0;
    private _oldHealth = 0;

    updateUI(data: PlayerData): void {
        if (data.id !== undefined) this.game.activePlayerID = data.id;

        if (data.dirty.id) {
            const spectating = data.spectating;
            this.game.spectating = spectating;

            if (spectating) {
                const badge = this.getPlayerBadge(data.id);
                const badgeText = badge ? html`<img class="badge-icon" src="./img/game/badges/${badge.idString}.svg" alt="${badge.name} badge">` : "";

                this.ui.gameOverOverlay.fadeOut();
                this.ui.spectatingMsgPlayer.html(this.getPlayerName(data.id) + badgeText);
            }
            this.ui.spectatingContainer.toggle(spectating);
            this.ui.spectatingMsg.toggle(spectating);
            this.clearTeammateCache();

            if (this.game.inputManager.isMobile) {
                this.ui.emoteButton.toggle(!spectating);
                this.ui.pingToggle.toggle(!spectating);
                this.ui.menuButton.toggle(!spectating);
            }
        }

        if (data.dirty.teammates && this.game.teamMode) {
            this.teammates = data.teammates;

            const _teammateDataCache = this._teammateDataCache;
            const notVisited = new Set(_teammateDataCache.keys());

            [
                {
                    id: this.game.activePlayerID,
                    normalizedHealth: this.health / this.maxHealth,
                    downed: this.game.activePlayer?.downed,
                    disconnected: false,
                    position: undefined
                },
                ...data.teammates
            ].forEach((player, index) => {
                const { id } = player;
                notVisited.delete(id);

                const cacheEntry = _teammateDataCache.get(id);
                const nameData = this.game.playerNames.get(id);
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

                const ele = new PlayerHealthUI(
                    this.game,
                    {
                        id,
                        colorIndex: index,
                        downed: player.downed,
                        normalizedHealth: player.normalizedHealth,
                        position: player.position,
                        ...nameObj
                    }
                );
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

        if (data.zoom) this.game.camera.zoom = data.zoom;

        if (data.dirty.maxMinStats) {
            this.maxHealth = data.maxHealth;
            this.minAdrenaline = data.minAdrenaline;
            this.maxAdrenaline = data.maxAdrenaline;

            if (this.maxHealth === GameConstants.player.defaultHealth) {
                this.ui.maxHealth.text("").hide();
            } else {
                this.ui.maxHealth.text(safeRound(this.maxHealth)).show();
            }

            if (
                this.maxAdrenaline === GameConstants.player.maxAdrenaline
                && this.minAdrenaline === 0
            ) {
                this.ui.minMaxAdren.text("").hide();
            } else {
                this.ui.minMaxAdren.text(`${this.minAdrenaline === 0 ? "" : `${safeRound(this.minAdrenaline)}/`}${safeRound(this.maxAdrenaline)}`).show();
            }
        }

        if (data.dirty.health) {
            this.health = Numeric.remap(data.normalizedHealth, 0, 1, 0, this.maxHealth);

            const normalizedHealth = this.health / this.maxHealth;
            const realPercentage = 100 * normalizedHealth;
            const percentage = safeRound(realPercentage);

            this.ui.healthBar
                .width(`${realPercentage}%`)
                .css("background-color", UIManager.getHealthColor(normalizedHealth, this.game.activePlayer?.downed))
                .toggleClass("flashing", percentage <= 25);

            if (realPercentage === 0) {
                this.ui.healthAnim
                    .stop()
                    .width(0);
            } else if (Date.now() - this._lastHealthBarAnimTime > 500) {
                this.ui.healthAnim
                    .stop()
                    .width(`${this._oldHealth}%`)
                    .animate({ width: `${realPercentage}%` }, 500);
                this._oldHealth = realPercentage;
                this._lastHealthBarAnimTime = Date.now();
            }

            this.ui.healthBarAmount
                .text(safeRound(this.health))
                .css("color", percentage <= 40 || this.game.activePlayer?.downed ? "#ffffff" : "#000000");
        }

        if (data.dirty.adrenaline) {
            this.adrenaline = Numeric.remap(data.normalizedAdrenaline, 0, 1, this.minAdrenaline, this.maxAdrenaline);
            const percentage = 100 * this.adrenaline / this.maxAdrenaline;

            this.ui.adrenalineBar.width(`${percentage}%`);

            this.ui.adrenalineBarAmount
                .text(safeRound(this.adrenaline))
                .css("color", this.adrenaline < 7 ? "#ffffff" : "#000000");
        }

        const inventory = data.inventory;

        if (inventory.weapons) {
            this.inventory.weapons = inventory.weapons;
            this.inventory.activeWeaponIndex = inventory.activeWeaponIndex;
        }

        if (inventory.lockedSlots !== undefined) {
            this.inventory.lockedSlots = inventory.lockedSlots;
            this.updateSlotLocks();
        }

        if (inventory.items) {
            this.inventory.items = inventory.items;
            this.inventory.scope = inventory.scope;
            this.updateItems();
        }

        if (inventory.weapons || inventory.items) {
            this.updateWeapons();
        }
    }

    skinID?: string;

    updateWeapons(): void {
        const inventory = this.inventory;
        const activeIndex = inventory.activeWeaponIndex;
        const activeWeapon = inventory.weapons[activeIndex];
        const count = activeWeapon?.count;

        if (activeWeapon === undefined || count === undefined || UI_DEBUG_MODE) {
            this.ui.ammoCounterContainer.hide();
        } else {
            this.ui.ammoCounterContainer.show();

            this.ui.activeAmmo
                .text(count)
                .css("color", count > 0 ? "inherit" : "red");

            let showReserve = false;
            if (activeWeapon.definition.itemType === ItemType.Gun) {
                const ammoType = activeWeapon.definition.ammoType;
                let totalAmmo: number | string = this.inventory.items[ammoType];

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

    /*
      TODO proper caching would require keeping a copy of the inventory currently being shown,
           so that we can compare it to what it should now be showing (in other words, a kind
           of "oldInventory—newInventory" thing).
  */
    updateWeaponSlots(): void {
        const inventory = this.inventory;

        const enum ClassNames {
            HasItem = "has-item",
            IsActive = "active"
        }

        const max = GameConstants.player.maxWeapons;
        for (let i = 0; i < max; i++) {
            const {
                container,
                image: itemImage,
                ammo: ammoCounter,
                name: itemName
            } = this._getSlotUI(i + 1);

            const weapon = inventory.weapons[i];
            const isActive = this.inventory.activeWeaponIndex === i;

            const ammoText = ammoCounter.text();
            const ammoDirty = !ammoText.length
                ? weapon?.count !== undefined
                : +ammoText !== weapon?.count;

            const hadItem = container.hasClass(ClassNames.HasItem);
            const activityChanged = container.hasClass(ClassNames.IsActive) !== isActive;

            if (weapon) {
                const definition = weapon.definition;
                const isGun = "ammoType" in definition;
                const color = isGun
                    ? Ammos.fromString((definition as GunDefinition).ammoType).characteristicColor
                    : { hue: 0, saturation: 0, lightness: 0 };

                if (!hadItem) container.addClass(ClassNames.HasItem);
                if (activityChanged) container.toggleClass(ClassNames.IsActive, isActive);

                container.css(isGun && this.game.console.getBuiltInCVar("cv_weapon_slot_style") === "colored"
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

                itemName.text(weapon.definition.name);

                const isFists = weapon.definition.idString === "fists";
                const oldSrc = itemImage.attr("src");
                const newSrc = `./img/game/weapons/${weapon.definition.idString}.svg`;
                if (oldSrc !== newSrc) {
                    this._playSlotAnimation(container);
                    // FIXME broken lol (sets background color of rectangle containing image instead of the svg's background color)
                    // itemImage.css("background-color", isFists && this.skinID !== undefined && Skins.fromStringSafe(this.skinID)?.grassTint ? GHILLIE_TINT.toHex() : "");
                    itemImage.attr("src", newSrc);
                }

                itemImage
                    .css("background-image", isFists ? `url(./img/game/skins/${this.skinID ?? this.game.console.getBuiltInCVar("cv_loadout_skin")}_fist.svg)` : "none")
                    .toggleClass("is-fists", isFists)
                    .show();

                if (weapon.definition.idString === "ghillie_suit") {
                    itemImage.css("background-color", GHILLIE_TINT.toHex());
                }

                const count = weapon.count;
                if (ammoDirty && count !== undefined) {
                    ammoCounter
                        .text(count)
                        .css("color", count > 0 ? "unset" : "red");
                }
            } else {
                container.removeClass(ClassNames.HasItem)
                    .removeClass(ClassNames.IsActive)
                    .css({
                        "outline-color": "",
                        "background-color": "",
                        "color": ""
                    });

                itemName.css("color", "").text("");
                itemImage.removeAttr("src").hide();
                ammoCounter.text("");
            }
        }
    }

    private _playSlotAnimation(element: JQuery): void {
        element.toggleClass("active");
        element[0].offsetWidth; // causes browser reflow
        element.toggleClass("active");
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

            if (this.game.activePlayer) {
                const backpack = this.game.activePlayer.equipment.backpack;
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

    private _addKillMessage(
        message: (
      {
          readonly severity: KillfeedEventSeverity.Down
      } | {
          readonly severity: KillfeedEventSeverity.Kill
          readonly kills: number
          readonly streak?: number
      }
    ) & {
        readonly type: KillfeedEventType
        readonly victimName: string
        readonly weaponUsed?: string
    }
    ): void {
        const { severity, victimName, weaponUsed, type } = message;

        const {
            killMsgHeader: headerUi,
            killMsgCounter: killCounterUi
        } = this.ui;

        let streakText = "";
        switch (severity) {
            case KillfeedEventSeverity.Kill: {
                const { streak, kills } = message;
                headerUi.text(`Kills: ${kills}`);
                killCounterUi.text(kills);
                streakText = streak ? ` (streak: ${streak})` : "";
                break;
            }
            case KillfeedEventSeverity.Down: {
                // Do not show kills counter in the down message.
                headerUi.text("");
            }
        }

        this.ui.killMsgContainer.html(
            `${UIManager._killModalEventDescription[type][severity]($<HTMLSpanElement>(victimName).addClass("kill-msg-player-name")[0].outerHTML)
            } ${weaponUsed !== undefined ? ` with ${weaponUsed}` : ""
            }${streakText}`
        );

        this.ui.killMsgModal.fadeIn(350, () => {
            // clear the previous fade out timeout so it won't fade away too
            // fast if the player makes more than one kill in a short time span
            clearTimeout(this._killMessageTimeoutID);

            this._killMessageTimeoutID = window.setTimeout(() => {
                this.ui.killMsgModal.fadeOut(350);
            }, 3000);
        });
    }

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

    private static readonly _killfeedEventDescription = freezeDeep<Record<KillfeedEventType, Record<KillfeedEventSeverity, string>>>({
        [KillfeedEventType.Suicide]: {
            [KillfeedEventSeverity.Kill]: "committed suicide",
            [KillfeedEventSeverity.Down]: "knocked themselves out"
        },
        [KillfeedEventType.NormalTwoParty]: {
            [KillfeedEventSeverity.Kill]: "killed",
            [KillfeedEventSeverity.Down]: "knocked out"
        },
        [KillfeedEventType.BleedOut]: {
            [KillfeedEventSeverity.Kill]: "bled out",
            [KillfeedEventSeverity.Down]: "bled out non-lethally" // should be impossible
        },
        [KillfeedEventType.FinishedOff]: {
            [KillfeedEventSeverity.Kill]: "finished off",
            [KillfeedEventSeverity.Down]: "gently finished off" // should be impossible
        },
        [KillfeedEventType.FinallyKilled]: {
            [KillfeedEventSeverity.Kill]: "finally killed",
            [KillfeedEventSeverity.Down]: "finally knocked out" // should be impossible
        },
        [KillfeedEventType.Gas]: {
            [KillfeedEventSeverity.Kill]: "died to",
            [KillfeedEventSeverity.Down]: "was knocked out by"
        },
        [KillfeedEventType.Airdrop]: {
            [KillfeedEventSeverity.Kill]: "was fatally crushed",
            [KillfeedEventSeverity.Down]: "was knocked out"
        }
    });

    private static readonly _killModalEventDescription = freezeDeep<Record<KillfeedEventType, Record<KillfeedEventSeverity, (victim: string) => string>>>({
        [KillfeedEventType.Suicide]: {
            [KillfeedEventSeverity.Kill]: _ => "You committed suicide",
            [KillfeedEventSeverity.Down]: _ => "You knocked yourself out"
        },
        [KillfeedEventType.NormalTwoParty]: {
            [KillfeedEventSeverity.Kill]: name => `You killed ${name}`,
            [KillfeedEventSeverity.Down]: name => `You knocked out ${name}`
        },
        [KillfeedEventType.BleedOut]: {
            [KillfeedEventSeverity.Kill]: name => `${name} bled out`,
            [KillfeedEventSeverity.Down]: name => `${name} bled out non-lethally` // should be impossible
        },
        [KillfeedEventType.FinishedOff]: {
            [KillfeedEventSeverity.Kill]: name => `${name} was finished off`,
            [KillfeedEventSeverity.Down]: name => `${name} was gently finished off` // should be impossible
        },
        [KillfeedEventType.FinallyKilled]: {
            [KillfeedEventSeverity.Kill]: name => `${name} was finally killed`,
            [KillfeedEventSeverity.Down]: name => `${name} was finally knocked out` // should be impossible
        },
        [KillfeedEventType.Gas]: {
            [KillfeedEventSeverity.Kill]: name => `${name} died to the gas`,
            [KillfeedEventSeverity.Down]: name => `${name} was knocked out by the gas`
        },
        [KillfeedEventType.Airdrop]: {
            [KillfeedEventSeverity.Kill]: name => `${name} was fatally crushed by an airdrop`,
            [KillfeedEventSeverity.Down]: name => `${name} was knocked out by an airdrop`
        }
    });

    processKillFeedPacket(message: KillFeedPacket): void {
        const {
            messageType,
            victimId,

            eventType,
            severity,

            attackerId,
            attackerKills = 0, // HACK this is mostly to get tooling to be quiet, the entire packet api's typings suck and need to be redone
            weaponUsed,
            killstreak,

            hideFromKillfeed
        } = {
            eventType: KillfeedEventType.Suicide,
            severity: KillfeedEventSeverity.Kill,
            ...message
        };

        const weaponPresent = weaponUsed !== undefined;
        const isGrenadeImpactKill = weaponPresent && "itemType" in weaponUsed && weaponUsed.itemType === ItemType.Throwable;

        const getNameAndBadge = (id?: number): { readonly name: string, readonly badgeText: string } => {
            const hasId = id !== undefined;
            const badge = hasId ? this.getPlayerBadge(id) : undefined;

            return {
                name: hasId ? this.getPlayerName(id) : "",
                badgeText: badge
                    ? html`<img class="badge-icon" src="./img/game/badges/${badge.idString}.svg" alt="${badge.name} badge">`
                    : ""
            };
        };

        const {
            name: victimName,
            badgeText: victimBadgeText
        } = getNameAndBadge(victimId);

        const {
            name: attackerName,
            badgeText: attackerBadgeText
        } = getNameAndBadge(attackerId);

        const victimText = victimName + victimBadgeText;
        const attackerText = attackerName + attackerBadgeText;

        let messageText: string | undefined;
        const classes: string[] = [];

        switch (messageType) {
            case KillfeedMessageType.DeathOrDown: {
                // `undefined > 1` returns `false` anyways
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const hasKillstreak = killstreak! > 1;

                switch (this.game.console.getBuiltInCVar("cv_killfeed_style")) {
                    case "text": {
                        let killMessage = "";

                        const description = UIManager._killfeedEventDescription[eventType][severity];

                        outer:
                        switch (eventType) {
                            case KillfeedEventType.FinallyKilled:
                                switch (attackerId) {
                                    case undefined:
                                        /*
                        this can happen if the player is knocked out by a non-player
                        entity (like gas or airdrop) if their team is then wiped,
                        then no one "finally" killed them, they just… finally died
                    */
                                        killMessage = `${victimText} finally died`;

                                        break outer;
                                    case victimId:
                                        /*
                        usually, a case where attacker and victim are the same would be
                        counted under the "suicide" event type, but there was no easy
                        way to route the event through the "suicide" type whilst having
                        it retain the "finally killed" part; this is the best option
                        until someone comes up with another
                    */
                                        killMessage = `${victimText} finally ended themselves`;

                                        break outer;
                                }
                                // fallthrough
                            case KillfeedEventType.NormalTwoParty:
                            case KillfeedEventType.FinishedOff:
                                killMessage = `${attackerText} ${description} ${victimText}`;
                                break;
                            case KillfeedEventType.Suicide:
                            case KillfeedEventType.BleedOut:
                                killMessage = `${victimText} ${description}`;
                                break;
                            case KillfeedEventType.Gas:
                                killMessage = `${victimText} ${description} the gas`;
                                break;
                            case KillfeedEventType.Airdrop:
                                killMessage = `${victimText} ${description} by an airdrop`;
                                break;
                        }

                        const fullyQualifiedName = weaponPresent ? weaponUsed.name : "";
                        /**
             * English being complicated means that this will sometimes return bad results
             * (ex: "hour", "NSA", "one" and "university") but to be honest, short of downloading
             * a library off of somewhere, this'll have to do
             */
                        const article = `a${"aeiou".includes(fullyQualifiedName[0]) ? "n" : ""}`;

                        const weaponNameText = weaponPresent
                            ? ` with ${isGrenadeImpactKill ? `the impact of ${article} ` : ""}${fullyQualifiedName}`
                            : "";

                        const icon = (() => {
                            switch (severity) {
                                case KillfeedEventSeverity.Down:
                                    return html`<img class="kill-icon" src="./img/misc/downed.svg" alt="Downed">`;
                                case KillfeedEventSeverity.Kill:
                                    return html`<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull">`;
                            }
                        })();

                        messageText = `
                        ${hasKillstreak && severity === KillfeedEventSeverity.Kill ? killstreak : ""}
                        ${icon}
                        ${killMessage}${weaponNameText}`;
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
                        switch (eventType) {
                            case KillfeedEventType.Gas:
                                iconName = "gas";
                                break;
                            case KillfeedEventType.Airdrop:
                                iconName = "airdrop";
                                break;
                            default:
                                iconName = weaponUsed?.idString ?? "";
                                break;
                        }
                        const altText = weaponUsed ? weaponUsed.name : iconName;
                        const weaponText = html`<img class="kill-icon" src="./img/killfeed/${iconName}_killfeed.svg" alt="${altText}">`;

                        const severityIcon = (() => {
                            switch (severity) {
                                case KillfeedEventSeverity.Down:
                                    return downedIcon;
                                case KillfeedEventSeverity.Kill:
                                    return "";
                            }
                        })();

                        let body = "";
                        switch (eventType) {
                            case KillfeedEventType.FinallyKilled:
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
                            case KillfeedEventType.NormalTwoParty:
                                body = `${attackerText} ${killstreakText} ${weaponText} ${victimText}`;
                                break;
                            case KillfeedEventType.FinishedOff:
                                body = `${skullIcon} ${attackerText} ${killstreakText} ${weaponText} ${victimText}`;
                                break;
                            case KillfeedEventType.Suicide:
                            case KillfeedEventType.Gas:
                            case KillfeedEventType.Airdrop:
                                body = `${weaponText} ${victimText}`;
                                break;
                            case KillfeedEventType.BleedOut:
                                body = `${bleedOutIcon} ${victimText}`;
                                break;
                        }

                        messageText = severityIcon + body;
                        break;
                    }
                }

                /**
         * Whether the player pointed to by the given id is on the active player's team
         */
                const playerIsOnThisTeam = (id?: number): boolean | undefined => {
                    let target: GameObject | undefined;

                    return id === this.game.activePlayerID || (
                        id !== undefined
                        && (
                            (
                                (target = this.game.objects.get(id))
                                && target instanceof Player
                                && target.teamID === this.game.teamID
                            ) || (
                                this._teammateDataCache.has(id)
                            )
                        )
                    );
                };

                switch (true) {
                    case playerIsOnThisTeam(victimId): {
                        classes.push("kill-feed-item-victim");
                        break;
                    }
                    case playerIsOnThisTeam(attackerId): {
                        classes.push("kill-feed-item-killer");

                        if (attackerId === this.game.activePlayerID) {
                            const base = {
                                victimName: victimText,
                                weaponUsed: weaponUsed?.name,
                                type: eventType
                            };

                            this._addKillMessage(
                                severity === KillfeedEventSeverity.Kill
                                    ? {
                                        severity,
                                        ...base,
                                        weaponUsed: eventType !== KillfeedEventType.FinallyKilled
                                            ? base.weaponUsed
                                            : undefined,
                                        kills: attackerKills,
                                        streak: killstreak
                                    }
                                    : {
                                        severity,
                                        ...base
                                    }
                            );
                        }
                        break;
                    }
                }
                break;
            }

            case KillfeedMessageType.KillLeaderAssigned: {
                const {
                    killLeaderLeader: leader,
                    killLeaderCount: count,
                    spectateKillLeader: spectateLeader
                } = this.ui;

                classes.push(
                    victimId === this.game.activePlayerID
                        ? "kill-feed-item-killer"
                        : "kill-feed-kill-leader"
                );

                leader.html(`${victimName}${victimBadgeText}`);
                count.text(attackerKills);

                if (!hideFromKillfeed) {
                    messageText = html`<i class="fa-solid fa-crown"></i> ${victimName}${victimBadgeText} promoted to Kill Leader!`;
                    this.game.soundManager.play("kill_leader_assigned");
                }

                spectateLeader.removeClass("btn-disabled");
                break;
            }

            case KillfeedMessageType.KillLeaderUpdated: {
                this.ui.killLeaderCount.text(attackerKills);
                break;
            }

            case KillfeedMessageType.KillLeaderDead: {
                const {
                    killLeaderLeader: leader,
                    killLeaderCount: count,
                    spectateKillLeader: spectateLeader
                } = this.ui;

                leader.text("Waiting for leader");
                count.text("0");

                // noinspection HtmlUnknownTarget
                messageText = html`<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> ${attackerId
                    ? attackerId !== victimId
                        ? `${attackerName}${attackerBadgeText} killed Kill Leader!`
                        : "The Kill Leader is dead!"
                    : "The Kill Leader killed themselves!"
                }`;
                switch (this.game.activePlayerID) {
                    case attackerId: {
                        classes.push("kill-feed-item-killer");
                        break;
                    }
                    case victimId: {
                        classes.push("kill-feed-item-victim");
                        break;
                    }
                    default: {
                        classes.push("kill-feed-kill-leader");
                        break;
                    }
                }

                this.game.soundManager.play("kill_leader_dead");
                spectateLeader.addClass("btn-disabled");
                break;
            }
        }

        if (messageText) this._addKillFeedMessage(messageText, classes);
    }
}

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

class PlayerHealthUI {
    readonly game: Game;

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

    constructor(game: Game, data?: UpdateDataType) {
        this.game = game;
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

            const teammateIndicator = this.game.map.teammateIndicators.get(id);

            teammateIndicator?.setAlpha(this._disconnected.value ? 0.5 : 1);
            recalcIndicatorFrame = true;
        }

        let indicator: SuroiSprite | undefined;

        if (id === this.game.activePlayerID) {
            indicator = this.game.map.indicator;
        } else {
            const { teammateIndicators } = this.game.map;

            if (this._position.dirty && this._position.value) {
                if ((indicator = teammateIndicators.get(id)) === undefined) {
                    teammateIndicators.set(
                        id,
                        indicator = new SuroiSprite("player_indicator")
                            .setTint(TEAMMATE_COLORS[this._colorIndex.value])
                    );
                    this.game.map.teammateIndicatorContainer.addChild(indicator);
                }

                indicator
                    .setVPos(this._position.value)
                    .setScale(this.game.map.expanded ? 1 : 0.75);
            }

            indicator ??= teammateIndicators.get(id);
        }

        if (recalcIndicatorFrame) {
            const frame = `player_indicator${this._normalizedHealth.value === 0 ? "_dead" : this._downed.value ? "_downed" : ""}`;
            const newSrc = `./img/game/player/${frame}.svg`;
            if (this.teammateIndicator.attr("src") !== newSrc) {
                this.teammateIndicator.attr("src", newSrc);
            }
            indicator?.setFrame(frame);
        }

        if (this._colorIndex.dirty) {
            const color = TEAMMATE_COLORS[this._colorIndex.value];

            this.indicatorContainer.css(
                "background-color",
                color.toHex()
            );
            indicator?.setTint(color);
        }

        if (this._name.dirty) {
            this.nameLabel.text((this.game.uiManager.getRawPlayerNameNullish(id) ?? this._name.value) || "Loading…");
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
            const teammate = this.game.playerNames.get(id);

            if (teammate?.badge) {
                const src = `./img/game/badges/${teammate.badge.idString}.svg`;

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
        const teammateIndicators = this.game.map.teammateIndicators;
        teammateIndicators.get(id)?.destroy();
        teammateIndicators.delete(id);
    }
}
