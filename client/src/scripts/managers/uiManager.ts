import $ from "jquery";
import { type Color } from "pixi.js";
import { DEFAULT_INVENTORY, GameConstants, KillfeedEventSeverity, KillfeedEventType, KillfeedMessageType } from "../../../../common/src/constants";
import { Ammos } from "../../../../common/src/definitions/ammos";
import { type BadgeDefinition } from "../../../../common/src/definitions/badges";
import { type EmoteDefinition } from "../../../../common/src/definitions/emotes";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { Loots } from "../../../../common/src/definitions/loots";
import { MapPings } from "../../../../common/src/definitions/mapPings";
import { DEFAULT_SCOPE, type ScopeDefinition } from "../../../../common/src/definitions/scopes";
import { type GameOverPacket } from "../../../../common/src/packets/gameOverPacket";
import { type KillFeedMessage, type PlayerData, type UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { Numeric } from "../../../../common/src/utils/math";
import { freezeDeep } from "../../../../common/src/utils/misc";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { type Vector } from "../../../../common/src/utils/vector";
import { type Game } from "../game";
import { type GameObject } from "../objects/gameObject";
import { Player } from "../objects/player";
import { GHILLIE_TINT, TEAMMATE_COLORS, UI_DEBUG_MODE } from "../utils/constants";
import { formatDate } from "../utils/misc";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";

function safeRound(value: number): number {
    // this looks more math-y and easier to read, so eslint can shove it
    // eslint-disable-next-line yoda
    if (0 < value && value <= 1) return 1;
    return Math.round(value);
}

/**
 * This class manages the game UI
 */
export class UIManager {
    readonly game: Game;

    maxHealth = GameConstants.player.defaultHealth;
    health = GameConstants.player.defaultHealth;

    maxAdrenaline = GameConstants.player.maxAdrenaline;
    minAdrenaline = 0;
    adrenaline = 0;

    readonly inventory: {
        activeWeaponIndex: number
        weapons: PlayerData["inventory"]["weapons"] & object
        items: typeof DEFAULT_INVENTORY
        scope: ScopeDefinition
    } = {
            activeWeaponIndex: 0,
            weapons: new Array(GameConstants.player.maxWeapons).fill(undefined),
            items: JSON.parse(JSON.stringify(DEFAULT_INVENTORY)),
            scope: DEFAULT_SCOPE
        };

    emotes: Array<EmoteDefinition | undefined> = [];

    teammates: UpdatePacket["playerData"]["teammates"] = [];

    readonly debugReadouts = Object.freeze({
        fps: $("#fps-counter"),
        ping: $("#ping-counter"),
        pos: $("#coordinates-hud")
    });

    constructor(game: Game) {
        this.game = game;
    }

    getRawPlayerName(id: number): string {
        const player = this.game.playerNames.get(id);
        let name: string;

        if (!player) {
            console.warn(`Unknown player name with id ${id}`);
            name = "[Unknown Player]";
        } else if (this.game.console.getBuiltInCVar("cv_anonymize_player_names")) {
            name = `${GameConstants.player.defaultName}_${id}`;
        } else {
            name = player.name;
        }

        return name;
    }

    getPlayerName(id: number): string {
        const element = $("<span>");
        const player = this.game.playerNames.get(id);

        const name = this.getRawPlayerName(id);

        if (player && player.hasColor && !this.game.console.getBuiltInCVar("cv_anonymize_player_names")) {
            element.css("color", player.nameColor.toHex());
        }

        element.text(name);

        return element.prop("outerHTML");
    }

    getPlayerBadge(id: number): BadgeDefinition | undefined {
        if (this.game.console.getBuiltInCVar("cv_anonymize_player_names")) {
            return;
        }

        const player = this.game.playerNames.get(id);

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

    readonly ui = {
        ammoCounterContainer: $("#weapon-ammo-container"),
        activeAmmo: $("#weapon-clip-ammo"),
        reserveAmmo: $("#weapon-inventory-ammo"),
        killStreakIndicator: $("#killstreak-indicator-container"),
        killStreakCounter: $("#killstreak-indicator-counter"),

        weaponsContainer: $("#weapons-container"),

        minMaxAdren: $("#adrenaline-bar-min-max"),
        maxHealth: $("#health-bar-max"),

        healthBar: $("#health-bar"),
        healthBarAmount: $("#health-bar-percentage"),
        healthAnim: $("#health-bar-animation"),

        adrenalineBar: $("#adrenaline-bar"),
        adrenalineBarPercentage: $("#adrenaline-bar-percentage"),

        killModal: $("#kill-msg"),
        killFeed: $("#kill-feed"),

        interactMsg: $("#interact-message"),
        interactKey: $("#interact-key"),

        teamContainer: $("#team-container"),

        emoteSelectors: [".emote-top", ".emote-right", ".emote-bottom", ".emote-left"]
            .map(selector => $(`#emote-wheel > ${selector}`))
    };

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
            $("#action-timer-anim")
                .stop()
                .css({ "stroke-dashoffset": "226" })
                .animate(
                    { "stroke-dashoffset": "0" },
                    time * 1000,
                    "linear",
                    () => {
                        $("#action-container").hide();
                        this.action.active = false;
                    }
                );
        }

        if (name) {
            $("#action-name").text(name);
            $("#action-container").show();
        }

        this.action.active = true;
        this.action.time = time;
    }

    updateAction(): void {
        const amount = this.action.time - (Date.now() - this.action.start) / 1000;
        if (amount > 0) $("#action-time").text(amount.toFixed(1));
    }

    cancelAction(): void {
        $("#action-container")
            .hide()
            .stop();
        this.action.active = false;
    }

    gameOverScreenTimeout: number | undefined;

    showGameOverScreen(packet: GameOverPacket): void {
        const game = this.game;

        $("#interact-message").hide();
        $("#spectating-container").hide();

        game.activePlayer?.actionSound?.stop();

        $("#gas-msg").fadeOut(500);

        // Disable joysticks div so you can click on players to spectate
        $("#joysticks-containers").hide();

        const gameOverScreen = $("#game-over-overlay");

        game.gameOver = true;

        if (!packet.won) {
            $("#btn-spectate").removeClass("btn-disabled").show();
            game.map.indicator.setFrame("player_indicator_dead");
        } else {
            $("#btn-spectate").hide();
        }

        $("#chicken-dinner").toggle(packet.won);

        const playerName = this.getPlayerName(packet.playerID);
        const playerBadge = this.getPlayerBadge(packet.playerID);
        const playerBadgeText = playerBadge
            ? `<img class="badge-icon" src="./img/game/badges/${playerBadge.idString}.svg" alt="${playerBadge.name} badge">`
            : "";

        $("#game-over-text").html(
            packet.won
                ? "Winner winner chicken dinner!"
                : `${this.game.spectating ? this.getPlayerName(packet.playerID) : "You"} died.`
        );

        $("#game-over-player-name").html(playerName + playerBadgeText);

        $("#game-over-kills").text(packet.kills);
        $("#game-over-damage-done").text(packet.damageDone);
        $("#game-over-damage-taken").text(packet.damageTaken);
        $("#game-over-time").text(formatDate(packet.timeAlive));

        if (packet.won) void game.music.play();

        this.gameOverScreenTimeout = window.setTimeout(() => gameOverScreen.fadeIn(500), 500);

        // Player rank
        $("#game-over-rank").text(`#${packet.rank}`).toggleClass("won", packet.won);
    }

    readonly mapPings = ["warning_ping", "arrow_ping", "gift_ping", "heal_ping"].map(ping => MapPings.fromString(ping));

    updateEmoteWheel(): void {
        const { pingWheelActive } = this.game.inputManager;
        for (let i = 0; i < 4; i++) {
            const definition = pingWheelActive ? this.mapPings[i] : this.emotes[i];

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

    updateUI(data: PlayerData): void {
        if (data.id !== undefined) this.game.activePlayerID = data.id;

        if (data.dirty.id) {
            this.game.spectating = data.spectating;
            if (data.spectating) {
                $("#game-over-overlay").fadeOut();
                $("#spectating-msg-player").html(this.getPlayerName(data.id));
            }
            $("#spectating-container").toggle(data.spectating);
        }

        if (data.dirty.teammates) {
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

                if (_teammateDataCache.has(id)) {
                    _teammateDataCache.get(id)!.update({
                        ...player,
                        colorIndex: index
                    });
                    return;
                }

                const nameData = this.game.playerNames.get(id);
                const ele = new PlayerHealthUI(
                    this.game,
                    {
                        id,
                        colorIndex: index,
                        downed: player.downed,
                        normalizedHealth: player.normalizedHealth,
                        position: player.position,
                        hasColor: nameData?.hasColor,
                        nameColor: nameData?.hasColor ? nameData.nameColor : null,
                        name: nameData?.name,
                        badge: nameData?.badge ?? null
                    }
                );
                _teammateDataCache.set(id, ele);

                this.ui.teamContainer.append(ele.container);
            });

            for (const outdated of notVisited) {
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
                this.maxAdrenaline === GameConstants.player.maxAdrenaline &&
                this.minAdrenaline === 0
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

            this.ui.healthAnim.width(`${realPercentage}%`);

            this.ui.healthBarAmount
                .text(safeRound(this.health))
                .css("color", percentage <= 40 || this.game.activePlayer?.downed ? "#ffffff" : "#000000");
        }

        if (data.dirty.adrenaline) {
            this.adrenaline = Numeric.remap(data.normalizedAdrenaline, 0, 1, this.minAdrenaline, this.maxAdrenaline);
            const percentage = 100 * this.adrenaline / this.maxAdrenaline;

            this.ui.adrenalineBar.width(`${percentage}%`);

            this.ui.adrenalineBarPercentage
                .text(safeRound(this.adrenaline))
                .css("color", this.adrenaline < 7 ? "#ffffff" : "#000000");
        }

        const inventory = data.inventory;

        if (inventory.weapons) {
            this.inventory.weapons = inventory.weapons;
            this.inventory.activeWeaponIndex = inventory.activeWeaponIndex;
        }

        if (inventory.items) {
            this.inventory.items = inventory.items;
            this.inventory.scope = inventory.scope;
            this.updateItems();
        }
        // idiot
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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

    updateWeaponSlots(): void {
        const inventory = this.inventory;

        this.ui.weaponsContainer.children(".inventory-slot").removeClass("active").css("outline-color", "");
        const max = GameConstants.player.maxWeapons;
        for (let i = 0; i < max; i++) {
            const container = $(`#weapon-slot-${i + 1}`);
            const weapon = inventory.weapons[i];
            const isActive = this.inventory.activeWeaponIndex === i;

            if (weapon) {
                const isGun = "ammoType" in weapon.definition;
                const color = isGun
                    ? Ammos.fromString((weapon.definition as GunDefinition).ammoType).characteristicColor
                    : { hue: 0, saturation: 0, lightness: 0 };

                container
                    .addClass("has-item")
                    .toggleClass("active", isActive)
                    .css(isGun && this.game.console.getBuiltInCVar("cv_weapon_slot_style") === "colored"
                        ? {
                            "outline-color": `hsl(${color.hue}, ${color.saturation}%, ${(color.lightness + 50) / 3}%)`,
                            "background-color": `hsla(${color.hue}, ${color.saturation}%, ${color.lightness / 2}%, 50%)`,
                            color: `hsla(${color.hue}, ${color.saturation}%, 90%)`
                        }
                        : {
                            "outline-color": "",
                            "background-color": "",
                            color: ""
                        })
                    .children(".item-name")
                    .text(weapon.definition.name);

                const isFists = weapon.definition.idString === "fists";
                container
                    .children(".item-image")
                    .css("background-image", isFists ? `url(./img/game/skins/${this.skinID ?? this.game.console.getBuiltInCVar("cv_loadout_skin")}_fist.svg)` : "none")
                    .toggleClass("is-fists", isFists)
                    .attr("src", `./img/game/weapons/${weapon.definition.idString}.svg`)
                    .show();

                if (weapon.definition.idString === "ghillie_suit") {
                    container
                        .children(".item-image")
                        .css("background-color", GHILLIE_TINT.toHex());
                }

                if (weapon.count !== undefined) {
                    container
                        .children(".item-ammo")
                        .text(weapon.count)
                        .css("color", weapon.count > 0 ? "inherit" : "red");
                }
            } else {
                container.removeClass("has-item").css("background-color", "");
                container.children(".item-name").css("color", "").text("");
                container.children(".item-image").removeAttr("src").hide();
                container.children(".item-ammo").text("");
            }
        }
    }

    updateItems(): void {
        for (const item in this.inventory.items) {
            const count = this.inventory.items[item];

            const itemDef = Loots.fromString(item);

            $(`#${item}-count`).text(count);

            const itemSlot = $(`#${item}-slot`);
            if (this.game.activePlayer) {
                const backpack = this.game.activePlayer.equipment.backpack;
                itemSlot.toggleClass("full", count >= backpack.maxCapacity[item]);
            }
            itemSlot.toggleClass("has-item", count > 0);

            if (itemDef.itemType === ItemType.Ammo && itemDef.hideUnlessPresent) {
                itemSlot.css("visibility", count > 0 ? "visible" : "hidden");
            }

            if (itemDef.itemType === ItemType.Scope && !UI_DEBUG_MODE) {
                itemSlot.toggle(count > 0).removeClass("active");
            }
        }

        $(`#${this.inventory.scope.idString}-slot`).addClass("active");
    }

    private _killMessageTimeoutID?: number;

    private readonly _killMessageUICache: {
        header?: JQuery<HTMLDivElement>
        killCounter?: JQuery<HTMLDivElement>
        severity?: JQuery<HTMLSpanElement>
        streak?: JQuery<HTMLSpanElement>
        victimName?: JQuery<HTMLSpanElement>
        weaponUsed?: JQuery<HTMLSpanElement>
    } = {};

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

        let streakText = "";
        if (severity === KillfeedEventSeverity.Kill) {
            const { streak, kills } = message;
            (this._killMessageUICache.header ??= $("#kill-msg-kills")).text(`Kills: ${kills}`);
            (this._killMessageUICache.killCounter ??= $("#ui-kills")).text(kills);
            streakText = streak ? ` (streak: ${streak})` : "";
        }

        const eventText = `You ${UIManager._eventDescriptionMap[type][severity]} `;
        // some of these yield nonsensical sentences, but those that do are occur if
        // `type` takes on bogus values like "Gas" or "Airdrop"

        (this._killMessageUICache.severity ??= $("#kill-msg-severity")).text(eventText);

        (this._killMessageUICache.victimName ??= $("#kill-msg-player-name")).html(victimName);
        (this._killMessageUICache.weaponUsed ??= $("#kill-msg-weapon-used")).text(
            ` ${weaponUsed !== undefined ? `with ${weaponUsed}` : ""}${streakText}`
        );

        this.ui.killModal.fadeIn(350, () => {
            // clear the previous fade out timeout so it won't fade away too
            // fast if the player makes more than one kill in a short time span
            clearTimeout(this._killMessageTimeoutID);

            this._killMessageTimeoutID = window.setTimeout(() => {
                this.ui.killModal.fadeOut(350);
            }, 3000);
        });
    }

    private _addKillFeedMessage(text: string, classes: string[]): void {
        const killFeedItem = $('<div class="kill-feed-item">');

        killFeedItem.html(text);
        killFeedItem.addClass(classes);

        this.ui.killFeed.prepend(killFeedItem);
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

        setTimeout(
            () => killFeedItem.fadeOut(1000, killFeedItem.remove.bind(killFeedItem)),
            7000
        );
    }

    private static readonly _eventDescriptionMap: Record<KillfeedEventType, Record<KillfeedEventSeverity, string>> = freezeDeep({
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

    processKillFeedMessage(message: KillFeedMessage): void {
        const {
            messageType,
            victimId,

            eventType,
            severity,

            attackerId,
            attackerKills,
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
                    ? `<img class="badge-icon" src="./img/game/badges/${badge.idString}.svg" alt="${badge.name} badge">`
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
                const hasKillstreak = killstreak! > 1;

                switch (this.game.console.getBuiltInCVar("cv_killfeed_style")) {
                    case "text": {
                        let killMessage = "";

                        const description = UIManager._eventDescriptionMap[eventType][severity];
                        // sod off
                        // eslint-disable-next-line no-labels
                        outer:
                        switch (eventType) {
                            case KillfeedEventType.FinallyKilled:
                                switch (attackerId) {
                                    case undefined:
                                        // this can happen if the player is knocked out by a non-player entity (like gas or airdrop)
                                        // if their team is then wiped, then no one "finally" killed them, they just… finally died
                                        killMessage = `${victimText} finally died`;

                                        // eslint-disable-next-line no-labels
                                        break outer;
                                    case victimId:
                                        /*
                                            usually, a case where attacker and victim are the same would be counted under the "suicide"
                                            event type, but there was no easy way to route the event through the "suicide" type whilst
                                            having it retain the "finally killed" part; this is the best option until someone comes up
                                            with another
                                        */
                                        killMessage = `${victimText} finally ended themselves`;

                                        // eslint-disable-next-line no-labels
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
                         * English being complicated means that this will sometimes return bad results (ex: "hour", "NSA", "one" and "university")
                         * but to be honest, short of downloading a library off of somewhere, this'll have to do
                         */
                        const article = `a${"aeiou".includes(fullyQualifiedName[0]) ? "n" : ""}`;
                        const weaponNameText = weaponPresent ? ` with ${isGrenadeImpactKill ? `the impact of ${article} ` : ""}${fullyQualifiedName}` : "";
                        const icon = (() => {
                            switch (severity) {
                                case KillfeedEventSeverity.Down:
                                    return "<img class=\"kill-icon\" src=\"./img/misc/downed.svg\" alt=\"Downed\">";
                                case KillfeedEventSeverity.Kill:
                                    return "<img class=\"kill-icon\" src=\"./img/misc/skull_icon.svg\" alt=\"Skull\">";
                            }
                        })();

                        messageText = `
                        ${hasKillstreak && severity === KillfeedEventSeverity.Kill ? killstreak : ""}
                        ${icon}
                        ${killMessage}${weaponNameText}`;
                        break;
                    }
                    case "icon": {
                        const downedIcon = "<img class=\"kill-icon\" src=\"./img/misc/downed.svg\" alt=\"Downed\">";
                        const skullIcon = "<img class=\"kill-icon\" src=\"./img/misc/skull_icon.svg\" alt=\"Finished off\">";
                        const bleedOutIcon = "<img class=\"kill-icon\" src=\"./img/misc/bleed_out.svg\" alt=\"Bleed out\">";
                        const finallyKilledIcon = "<img class=\"kill-icon\" src=\"./img/misc/finally_killed.svg\" alt=\"Finally killed\">";

                        const killstreakText = hasKillstreak
                            ? `
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
                        const weaponText = `<img class="kill-icon" src="./img/killfeed/${iconName}_killfeed.svg" alt="${altText}">`;

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
                        id !== undefined &&
                        (target = this.game.objects.get(id)) &&
                        target instanceof Player &&
                        target.teamID === this.game.teamID
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
                                weaponUsed: weaponUsed?.name ?? "",
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
                                        kills: attackerKills!,
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
                if (victimId === this.game.activePlayerID) classes.push("kill-feed-item-killer");

                $("#kill-leader-leader").html(`${victimName}${victimBadgeText}`);
                $("#kill-leader-kills-counter").text(attackerKills!);

                if (!hideFromKillfeed) {
                    messageText = `<i class="fa-solid fa-crown"></i> ${victimName}${victimBadgeText} promoted to Kill Leader!`;
                    this.game.soundManager.play("kill_leader_assigned");
                }
                $("#btn-spectate-kill-leader").show();
                break;
            }

            case KillfeedMessageType.KillLeaderUpdated: {
                $("#kill-leader-kills-counter").text(attackerKills!);
                break;
            }

            case KillfeedMessageType.KillLeaderDead: {
                $("#kill-leader-leader").text("Waiting for leader");
                $("#kill-leader-kills-counter").text("0");
                // noinspection HtmlUnknownTarget
                messageText = `<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> ${attackerId
                    ? `${attackerId !== victimId
                        ? `${attackerName}${attackerBadgeText} killed Kill Leader!`
                        : "The Kill Leader is dead!"}`
                    : "The Kill Leader killed themselves!"
                }`;
                if (attackerId === this.game.activePlayerID) classes.push("kill-feed-item-killer");
                else if (victimId === this.game.activePlayerID) classes.push("kill-feed-item-victim");
                this.game.soundManager.play("kill_leader_dead");
                $("#btn-spectate-kill-leader").hide();
                break;
            }
        }

        if (messageText) this._addKillFeedMessage(messageText, classes);
    }
}

class Wrapper<T> {
    private _dirty = true;
    get dirty(): boolean {
        return this._dirty;
    }

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

    readonly container: JQuery<HTMLElement>;

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
    private readonly _normalizedHealth = new Wrapper<number>(1);
    private readonly _downed = new Wrapper<boolean | undefined>(undefined);
    private readonly _disconnected = new Wrapper<boolean>(false);
    private readonly _position = new Wrapper<Vector | undefined>(undefined);
    private readonly _colorIndex = new Wrapper<number>(0);
    private readonly _name = new Wrapper<string>(GameConstants.player.defaultName);
    private readonly _hasColor = new Wrapper<boolean>(false);
    private readonly _nameColor = new Wrapper<Color | undefined>(undefined);
    private readonly _badge = new Wrapper<BadgeDefinition | undefined>(undefined);

    constructor(game: Game, data?: UpdateDataType) {
        this.game = game;
        this.container = $<HTMLDivElement>('<div class="teammate-container"></div>');
        this.svgContainer = $<SVGElement>('<svg class="teammate-health-indicator" width="48" height="48" xmlns="http://www.w3.org/2000/svg"></svg>');

        //HACK wrapping in <svg> is necessary to ensure that it's interpreted as an actual svg circle and not… whatever it'd try to interpret it as otherwise
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

        this.update(data);
    }

    update(data?: UpdateDataType): void {
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
        }

        let recalcIndicatorFrame = false;

        if (this._normalizedHealth.dirty) {
            this.healthDisplay
                .css("stroke", UIManager.getHealthColor(this._normalizedHealth.value, this._downed.value))
                .css("stroke-dashoffset", 132 * (1 - this._normalizedHealth.value));

            recalcIndicatorFrame = true;
        }

        if (this._downed.dirty) {
            this.container.toggleClass("downed", this._downed.value);

            recalcIndicatorFrame = true;
        }

        if (this._disconnected.dirty) {
            this.container.toggleClass("disconnected", this._disconnected.value);

            recalcIndicatorFrame = true;
        }

        let indicator: SuroiSprite | undefined;

        if (this._id.value === this.game.activePlayerID) {
            indicator = this.game.map.indicator;
        } else {
            const { teammateIndicators } = this.game.map;
            const id = this._id.value;

            if (this._position.dirty && this._position.value) {
                if (!teammateIndicators.has(id)) {
                    teammateIndicators.set(
                        id,
                        indicator = new SuroiSprite("player_indicator")
                            .setVPos(toPixiCoords(this._position.value))
                            .setTint(TEAMMATE_COLORS[this._colorIndex.value])
                            .setScale(this.game.map.expanded ? 1 : 0.75)
                    );
                    this.game.map.teammateIndicatorContainer.addChild(indicator);
                } else {
                    (indicator = teammateIndicators.get(id)!).setVPos(this._position.value);
                }
            }

            indicator ??= teammateIndicators.get(id)!;
        }

        if (recalcIndicatorFrame) {
            const frame = `player_indicator${this._normalizedHealth.value === 0 ? "_dead" : this._downed.value ? "_downed" : ""}`;
            this.teammateIndicator.attr("src", `./img/game/player/${frame}.svg`);
            indicator?.setFrame(frame);
        }

        if (this._colorIndex.dirty) {
            this.indicatorContainer.css(
                "background-color",
                TEAMMATE_COLORS[this._colorIndex.value]?.toHex() ?? ""
            );
        }

        if (this._name.dirty) {
            this.nameLabel.text(this._name.value);
        }

        if (
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing --- ????????
            (this._hasColor.dirty && this._nameColor.value) ||
            (this._nameColor.dirty && this._hasColor.value)
        ) {
            this.nameLabel.css(
                "color",
                this._hasColor && this._nameColor.value ? this._nameColor.value.toHex() : ""
            );
        }

        if (this._badge.dirty) {
            if (this._badge.value) {
                this.badgeImage
                    .attr(
                        "src",
                        `./img/game/badges/${this._badge.value.idString}.svg`
                    )
                    .css({ display: "", visibility: "" });
            } else {
                this.badgeImage
                    .attr("src", "")
                    .css({ display: "none", visibility: "none" });
            }
        }
    }

    destroy(): void {
        this.container.remove();
        const id = this._id.value;
        const teammateIndicators = this.game.map.teammateIndicators;
        teammateIndicators.get(id)?.destroy();
        teammateIndicators.delete(id);
    }
}
