import $ from "jquery";
import { DEFAULT_INVENTORY, GameConstants, KillFeedMessageType, KillType } from "../../../../common/src/constants";
import { Ammos } from "../../../../common/src/definitions/ammos";
import { type BadgeDefinition } from "../../../../common/src/definitions/badges";
import { type GunDefinition } from "../../../../common/src/definitions/guns";
import { Loots } from "../../../../common/src/definitions/loots";
import { type ScopeDefinition } from "../../../../common/src/definitions/scopes";
import { type GameOverPacket } from "../../../../common/src/packets/gameOverPacket";
import { type UpdatePacket, type KillFeedMessage, type PlayerData } from "../../../../common/src/packets/updatePacket";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { type Game } from "../game";
import { UI_DEBUG_MODE, GHILLIE_TINT, TEAMMATE_COLORS } from "../utils/constants";
import { formatDate } from "../utils/misc";
import { TeammateIndicator } from "../rendering/minimap";
import type { EmoteDefinition } from "../../../../common/src/definitions/emotes";
import { MapPings } from "../../../../common/src/definitions/mapPings";
import { Numeric } from "../../../../common/src/utils/math";

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

    readonly inventory = {
        activeWeaponIndex: 0,
        weapons: new Array(GameConstants.player.maxWeapons).fill(undefined) as PlayerData["inventory"]["weapons"] & object,
        items: JSON.parse(JSON.stringify(DEFAULT_INVENTORY)),
        scope: Loots.fromString<ScopeDefinition>("1x_scope")
    };

    emotes: Array<EmoteDefinition | undefined> = [];

    teammates: UpdatePacket["playerData"]["teammates"] = [];

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

    getIndicatorImage(
        player: {
            id: number
            normalizedHealth: number
            downed?: boolean
            disconnected: boolean
        }
    ): string {
        switch (true) {
            case player.normalizedHealth === 0:
                return "player_indicator_dead";
            case player.downed:
                return "player_indicator_downed";
            default:
                return "player_indicator";
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

    action = {
        active: false,
        start: -1,
        time: 0
    };

    animateAction(name: string, time: number): void {
        if (time > 0) {
            this.action.start = Date.now();
            $("#action-timer-anim").stop()
                .css({ "stroke-dashoffset": "226" })
                .animate(
                    { "stroke-dashoffset": "0" },
                    time * 1000,
                    "linear",
                    () => {
                        $("#action-container").hide();
                        this.action.active = false;
                    });
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
        $("#action-container").hide().stop();
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
        const pingWheel = this.game.inputManager.pingWheelActive;
        for (let i = 0; i < 4; i++) {
            const definition = pingWheel ? this.mapPings[i] : this.emotes[i];

            this.ui.emoteSelectors[i].css(
                "background-image",
                definition ? `url("./img/game/${pingWheel ? "mapPings" : "emotes"}/${definition.idString}.svg")` : ""
            );
        }
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
                let playerHealthUI = this.ui.teamContainer.find(`[data-id="${player.id}"]`);
                if (!playerHealthUI.length) {
                    const name = this.game.playerNames.get(player.id);
                    playerHealthUI = $(`
                      <div class="teammate-container" data-id="${player.id}">
                        <svg
                          class="teammate-health-indicator"
                          width="48"
                          height="48"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            r="21"
                            cy="24"
                            cx="24"
                            stroke-width="6"
                            stroke-dasharray="132"
                            fill="none"
                            style="transition: stroke-dashoffset ease-in-out 50ms;"
                          />
                        </svg>
                        <div class="teammate-indicator-container" style="background-color: ${TEAMMATE_COLORS[index].toHex()};">
                          <img class="teammate-indicator" />
                        </div>
                        <span class="teammate-name"${name?.hasColor ? ` style="color: ${name.nameColor.toHex()};"` : ""}>${name?.name}</span>
                        ${name?.badge ? `<img class="teammate-badge" src="./img/game/badges/${name?.badge.idString}.svg" />` : ""}
                      </div>
                    `);
                    this.ui.teamContainer.append(playerHealthUI);
                }

                playerHealthUI
                    .toggleClass("downed", player.downed && player.normalizedHealth > 0)
                    .toggleClass("disconnected", player.disconnected);

                playerHealthUI
                    .find("circle")
                    .css("stroke", this.getHealthColor(player.normalizedHealth, player.downed))
                    .css("stroke-dashoffset", 132 - (player.normalizedHealth * 132));

                const teammateIndicator = playerHealthUI.find(".teammate-indicator");
                const src = `./img/game/player/${this.getIndicatorImage(player)}.svg`;
                if (src !== teammateIndicator.attr("src")) teammateIndicator.attr("src", src);

                if (player.id === this.game.activePlayerID) return;

                if (index >= this.game.map.teammateIndicators.size) {
                    this.game.map.teammateIndicators.add(
                        new TeammateIndicator(
                            player.position!,
                            player.id,
                            TEAMMATE_COLORS[index],
                            this.game.map.expanded ? 1 : 0.75
                        )
                    );
                }

                for (const indicator of this.game.map.teammateIndicators) {
                    if (indicator.id !== player.id) continue;
                    indicator.setVPos(player.position!);
                    indicator.setFrame(this.getIndicatorImage(player));
                }
            });
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
                .css("background-color", this.getHealthColor(normalizedHealth, this.game.activePlayer?.downed))
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

    private _addKillMessage(kills: number, name: string, weaponUsed: string, streak?: number): void {
        const killText = `Kills: ${kills}`;
        $("#ui-kills").text(kills);

        $("#kill-msg-kills").text(killText);
        $("#kill-msg-player-name").html(name);
        $("#kill-msg-weapon-used").text(` with ${weaponUsed}${streak ? ` (streak: ${streak})` : ""}`);

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
            while (this.ui.killFeed.children().length > 5) {
                this.ui.killFeed.children().last().remove();
            }
        }

        setTimeout(
            () => killFeedItem.fadeOut(1000, killFeedItem.remove.bind(killFeedItem)),
            7000
        );
    }

    processKillFeedMessage(message: KillFeedMessage): void {
        const {
            messageType,
            playerID,

            killType,
            killerID,
            kills,
            weaponUsed,
            killstreak,

            hideInKillfeed
        } = message;

        const weaponPresent = weaponUsed !== undefined;
        const isGrenadeImpactKill = weaponPresent && "itemType" in weaponUsed && weaponUsed.itemType === ItemType.Throwable;

        // TODO Clean up this code

        const playerName = playerID !== undefined ? this.getPlayerName(playerID) : "";

        const playerBadge = playerID !== undefined ? this.getPlayerBadge(playerID) : undefined;
        const playerBadgeText = playerBadge
            ? `<img class="badge-icon" src="./img/game/badges/${playerBadge.idString}.svg" alt="${playerBadge.name} badge">`
            : "";

        const killerName = killerID !== undefined ? this.getPlayerName(killerID) : "";

        const killerBadge = killerID !== undefined ? this.getPlayerBadge(killerID) : undefined;
        const killerBadgeText = killerBadge
            ? `<img class="badge-icon" src="./img/game/badges/${killerBadge.idString}.svg" alt="${killerBadge.name} badge">`
            : "";

        let messageText: string | undefined;
        const classes: string[] = [];

        switch (messageType) {
            case KillFeedMessageType.Kill: {
                const hasKillstreak = killstreak! > 1;
                switch (this.game.console.getBuiltInCVar("cv_killfeed_style")) {
                    case "text": {
                        let killMessage = "";
                        switch (killType) {
                            case KillType.Suicide:
                                killMessage = `${playerName}${playerBadgeText} committed suicide`;
                                break;
                            case KillType.TwoPartyInteraction:
                                killMessage = `${killerName}${killerBadgeText} killed ${playerName}${playerBadgeText}`;
                                break;
                            case KillType.Gas:
                                killMessage = `${playerName}${playerBadgeText} died to the gas`;
                                break;
                            case KillType.Airdrop:
                                killMessage = `${playerName}${playerBadgeText} was crushed by an airdrop`;
                                break;
                        }

                        const fullyQualifiedName = weaponPresent ? weaponUsed.name : "";
                        /**
                         * English being complicated means that this will sometimes return bad results (ex: "hour", "NSA", "one" and "university")
                         * but to be honest, short of downloading a library off of somewhere, this'll have to do
                         */
                        const article = `a${"aeiou".includes(fullyQualifiedName[0]) ? "n" : ""}`;
                        const weaponNameText = weaponPresent ? ` with ${isGrenadeImpactKill ? `the impact of ${article} ` : ""}${fullyQualifiedName}` : "";

                        messageText = `
                        ${hasKillstreak ? killstreak : ""}
                        <img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull">
                        ${killMessage}${weaponNameText}`;
                        break;
                    }
                    case "icon": {
                        const killerName2 = killType === KillType.TwoPartyInteraction ? killerName : "";
                        let iconName = "";
                        switch (killType) {
                            case KillType.Gas:
                                iconName = "gas";
                                break;
                            case KillType.Airdrop:
                                iconName = "airdrop";
                                break;
                            default:
                                iconName = weaponUsed?.idString ?? "";
                                break;
                        }
                        const altText = weaponUsed ? weaponUsed.name : iconName;
                        const killstreakText = hasKillstreak
                            ? `
                            <span style="font-size: 80%">(${killstreak}
                                <img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull" height=12>)
                            </span>`
                            : "";

                        messageText = `\
                        ${killerName2}\
                        ${killerBadgeText}\
                        <img class="kill-icon" src="./img/killfeed/${iconName}_killfeed.svg" alt="${altText}">\
                        ${killstreakText}\
                        ${playerBadgeText}\
                        ${playerName}`;
                        break;
                    }
                }

                switch (true) {
                    case playerID === this.game.activePlayerID: { // was killed
                        classes.push("kill-feed-item-victim");
                        break;
                    }
                    case killerID === this.game.activePlayerID: { // killed other
                        classes.push("kill-feed-item-killer");
                        this._addKillMessage(kills!, `${playerName}${playerBadgeText}`, weaponUsed?.name ?? "", killstreak);
                        break;
                    }
                }
                break;
            }

            case KillFeedMessageType.KillLeaderAssigned: {
                if (playerID === this.game.activePlayerID) classes.push("kill-feed-item-killer");

                $("#kill-leader-leader").html(`${playerName}${playerBadgeText}`);
                $("#kill-leader-kills-counter").text(kills!);

                if (!hideInKillfeed) {
                    messageText = `<i class="fa-solid fa-crown"></i> ${playerName}${playerBadgeText} promoted to Kill Leader!`;
                    this.game.soundManager.play("kill_leader_assigned");
                }
                $("#btn-spectate-kill-leader").show();
                break;
            }

            case KillFeedMessageType.KillLeaderUpdated: {
                $("#kill-leader-kills-counter").text(kills!);
                break;
            }

            case KillFeedMessageType.KillLeaderDead: {
                $("#kill-leader-leader").text("Waiting for leader");
                $("#kill-leader-kills-counter").text("0");
                // noinspection HtmlUnknownTarget
                messageText = `<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> ${killerID
                    ? `${killerID !== playerID
                        ? `${killerName}${killerBadgeText} killed Kill Leader!`
                        : "The Kill Leader is dead!"}`
                    : "The Kill Leader killed themselves!"
                }`;
                if (killerID === this.game.activePlayerID) classes.push("kill-feed-item-killer");
                else if (playerID === this.game.activePlayerID) classes.push("kill-feed-item-victim");
                this.game.soundManager.play("kill_leader_dead");
                $("#btn-spectate-kill-leader").hide();
                break;
            }
        }

        if (messageText) this._addKillFeedMessage(messageText, classes);
    }
}
