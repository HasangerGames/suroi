import {
    DEFAULT_HEALTH,
    DEFAULT_INVENTORY,
    DEFAULT_USERNAME,
    INVENTORY_MAX_WEAPONS,
    KillFeedMessageType,
    MAX_ADRENALINE
} from "../../../../common/src/constants";
import { Ammos } from "../../../../common/src/definitions/ammos";
import { Loots } from "../../../../common/src/definitions/loots";
import { Scopes, type ScopeDefinition } from "../../../../common/src/definitions/scopes";
import { type GameOverPacket } from "../../../../common/src/packets/gameOverPacket";
import { type KillFeedMessage, type PlayerData } from "../../../../common/src/packets/updatePacket";
import { ItemType } from "../../../../common/src/utils/objectDefinitions";
import { type Game } from "../game";
import { UI_DEBUG_MODE } from "./constants";
import { formatDate } from "./misc";
import $ from "jquery";

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

    maxHealth = DEFAULT_HEALTH;
    health = DEFAULT_HEALTH;

    maxAdrenaline = MAX_ADRENALINE;
    minAdrenaline = 0;
    adrenaline = 0;

    inventory = {
        activeWeaponIndex: 0,
        weapons: new Array(INVENTORY_MAX_WEAPONS).fill(undefined) as PlayerData["inventory"]["weapons"],
        items: JSON.parse(JSON.stringify(DEFAULT_INVENTORY)),
        scope: Loots.fromString<ScopeDefinition>("1x_scope")
    };

    constructor(game: Game) {
        this.game = game;
    }

    getPlayerName(id: number): string {
        const element = $("<span>");
        const player = this.game.playerNames.get(id);

        let name: string;

        if (!player) {
            console.warn(`Unknown player name with id ${id}`);
            name = "[Unknown Player]";
        } else if (this.game.console.getBuiltInCVar("cv_anonymize_player_names")) {
            name = DEFAULT_USERNAME;
        } else {
            name = player.name;
        }
        element.text(name);

        if (player?.hasColor) {
            element.css("color", player.nameColor);
        }

        return element.prop("outerHTML");
    }

    readonly ui = {
        activeWeapon: $("#weapon-ammo-container"),
        activeAmmo: $("#weapon-clip-ammo"),
        weaponInventoryAmmo: $("#weapon-inventory-ammo"),
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
        interactKey: $("#interact-key")
    };

    gameOverScreenTimeout: number | undefined;

    showGameOverScreen(packet: GameOverPacket): void {
        const game = this.game;

        $("#interact-message").hide();
        $("#spectating-container").hide();

        const activePlayer = game.activePlayer;
        if (activePlayer?.actionSound) game.soundManager.stop(activePlayer.actionSound);

        $("#gas-msg").fadeOut(500);

        // Disable joysticks div so you can click on players to spectate
        $("#joysticks-containers").hide();

        const gameOverScreen = $("#game-over-overlay");

        game.gameOver = true;

        if (!packet.won) {
            $("#btn-spectate").removeClass("btn-disabled").show();
            game.map.indicator.setFrame("player_indicator_dead").setRotation(0);
        } else {
            $("#btn-spectate").hide();
        }

        $("#chicken-dinner").toggle(packet.won);

        const name = this.game.spectating ? this.getPlayerName(packet.playerID) : "You";
        $("#game-over-text").html(packet.won ? "Winner winner chicken dinner!" : `${name} died.`);

        $("#game-over-player-name").html(this.getPlayerName(packet.playerID));

        $("#game-over-kills").text(packet.kills);
        $("#game-over-damage-done").text(packet.damageDone);
        $("#game-over-damage-taken").text(packet.damageTaken);
        $("#game-over-time").text(formatDate(packet.timeAlive));

        if (packet.won) {
            const volume = game.console.getBuiltInCVar("cv_music_volume");
            if (volume) {
                game.music.play();
            }
            game.music.loop();
            game.music.volume(volume);
            game.musicPlaying = true;
        }

        this.gameOverScreenTimeout = window.setTimeout(() => gameOverScreen.fadeIn(500), 500);

        // Player rank
        $("#game-over-rank").text(`#${packet.rank}`).toggleClass("won", packet.won);
    }

    updateUI(data: PlayerData): void {
        if (data.id) this.game.activePlayerID = data.id;

        if (data.dirty.id) {
            this.game.spectating = data.spectating;
            if (data.spectating) {
                $("#game-over-overlay").fadeOut();
                $("#spectating-msg-player").html(this.getPlayerName(data.id));
            }
            $("#spectating-container").toggle(data.spectating);
        }

        if (data.zoom) this.game.camera.zoom = data.zoom;

        if (data.dirty.maxMinStats) {
            this.maxHealth = data.maxHealth;
            this.minAdrenaline = data.minAdrenaline;
            this.maxAdrenaline = data.maxAdrenaline;

            if (this.maxHealth === DEFAULT_HEALTH) {
                this.ui.maxHealth.text("").hide();
            } else {
                this.ui.maxHealth.text(safeRound(this.maxHealth)).show();
            }

            if (
                this.maxAdrenaline === MAX_ADRENALINE &&
                this.minAdrenaline === 0
            ) {
                this.ui.minMaxAdren.text("").hide();
            } else {
                this.ui.minMaxAdren.text(`${this.minAdrenaline === 0 ? "" : `${safeRound(this.minAdrenaline)}/`}${safeRound(this.maxAdrenaline)}`).show();
            }
        }

        if (data.dirty.health) {
            const oldHealth = this.health;
            this.health = data.health;

            const realPercentage = 100 * this.health / this.maxHealth;
            const percentage = safeRound(realPercentage);

            this.ui.healthBar.width(`${realPercentage}%`);

            if (oldHealth > this.health) this.ui.healthAnim.width(`${realPercentage}%`);

            this.ui.healthBarAmount.text(safeRound(this.health));

            if (percentage === 100) {
                this.ui.healthBar.css("background-color", "#bdc7d0");
            } else if (percentage < 60 && percentage > 25) {
                this.ui.healthBar.css("background-color", `rgb(255, ${(percentage - 10) * 4}, ${(percentage - 10) * 4})`);
            } else if (percentage <= 25) {
                this.ui.healthBar.css("background-color", "#ff0000");
            } else {
                this.ui.healthBar.css("background-color", "#f8f9fa");
            }
            this.ui.healthBar.toggleClass("flashing", percentage <= 25);

            this.ui.healthBarAmount.css("color", percentage <= 40 ? "#ffffff" : "#000000");
        }

        if (data.dirty.adrenaline) {
            this.adrenaline = data.adrenaline;

            const percentage = 100 * this.adrenaline / this.maxAdrenaline;

            this.ui.adrenalineBar.width(`${percentage}%`);

            this.ui.adrenalineBarPercentage.text(safeRound(this.adrenaline))
                .css("color", this.adrenaline < 7 ? "#ffffff" : "#000000");
        }

        const inventory = data.inventory;

        if (inventory.weapons) {
            this.inventory.weapons = inventory.weapons;
            this.inventory.activeWeaponIndex = inventory.activeWeaponIndex;
            if (!inventory.items) { // No need to update weapons here if items are also updated
                this.updateWeapons();
            }
        }

        if (inventory.items) {
            this.inventory.items = inventory.items;
            this.inventory.scope = inventory.scope;
            this.updateItems();
            this.updateWeapons();
        }
    }

    updateWeapons(): void {
        const inventory = this.inventory;

        const activeIndex = inventory.activeWeaponIndex;

        const activeWeapon = inventory.weapons[activeIndex];

        if (activeWeapon?.ammo === undefined || UI_DEBUG_MODE) {
            this.ui.activeWeapon.hide();
        } else {
            this.ui.activeWeapon.show();
            const ammo = activeWeapon?.ammo;
            this.ui.activeAmmo.text(ammo).css("color", ammo > 0 ? "inherit" : "red");

            if (activeWeapon.definition.itemType === ItemType.Gun) {
                const ammoType = activeWeapon.definition.ammoType;
                let totalAmmo: number | string = this.inventory.items[ammoType];

                for (const ammo of Ammos) {
                    if (ammo.idString === ammoType && ammo.ephemeral) {
                        totalAmmo = "∞";
                        break;
                    }
                }

                this.ui.weaponInventoryAmmo.text(totalAmmo).css("visibility", totalAmmo === 0 ? "hidden" : "visible");
            }
        }

        if (activeWeapon?.kills === undefined) { // killstreaks
            this.ui.killStreakIndicator.hide();
        } else {
            this.ui.killStreakIndicator.show();
            this.ui.killStreakCounter.text(`Streak: ${activeWeapon?.kills}`);
        }

        for (let i = 0; i < INVENTORY_MAX_WEAPONS; i++) {
            const container = $(`#weapon-slot-${i + 1}`);

            const weapon = inventory.weapons[i];

            if (weapon) {
                container.addClass("has-item");

                container.children(".item-name").text(weapon.definition.name);
                container.children(".item-image").attr(
                    "src",
                    `./img/game/weapons/${weapon.definition.idString}.svg`).show();

                if (weapon.ammo !== undefined) {
                    container.children(".item-ammo").text(weapon.ammo)
                        .css("color", weapon.ammo > 0 ? "inherit" : "red");
                }
            } else {
                container.removeClass("has-item");
                container.children(".item-name").text("");
                container.children(".item-image").removeAttr("src").hide();
                container.children(".item-ammo").text("");
            }
        }

        this.ui.weaponsContainer.children(".inventory-slot").removeClass("active");
        $(`#weapon-slot-${this.inventory.activeWeaponIndex + 1}`).addClass("active");
    }

    updateItems(): void {
        const scopeNames = Scopes.definitions.map(sc => sc.idString);

        for (const item in this.inventory.items) {
            const count = this.inventory.items[item];

            $(`#${item}-count`).text(count);

            const itemSlot = $(`#${item}-slot`);
            if (this.game.activePlayer) {
                const backpack = this.game.activePlayer.equipment.backpack;
                itemSlot.toggleClass("full", count >= backpack.maxCapacity[item]);
            }
            itemSlot.toggleClass("has-item", count > 0);

            if (scopeNames.includes(item) && !UI_DEBUG_MODE) {
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

            twoPartyInteraction,
            killerID,
            kills,
            weaponUsed,
            killstreak,

            gasKill,
            hideInKillFeed
        } = message;

        const playerName = playerID !== undefined ? this.getPlayerName(playerID) : "";

        let messageText: string | undefined;
        const classes: string[] = [];

        switch (messageType) {
            case KillFeedMessageType.Kill: {
                const hasKillstreak = killstreak as number > 1;
                /* eslint-disable @typescript-eslint/no-non-null-assertion */
                switch (this.game.console.getBuiltInCVar("cv_killfeed_style")) {
                    case "text": {
                        const message = twoPartyInteraction
                            ? `${this.getPlayerName(killerID as number)} killed ${playerName}`
                            : gasKill
                                ? `${playerName} died to the gas`
                                : `${playerName} committed suicide`;

                        messageText = `
                        ${hasKillstreak ? killstreak : ""}
                        <img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull">
                        ${message}${weaponUsed === undefined ? "" : ` with ${weaponUsed.name}`}`;
                        break;
                    }
                    case "icon": {
                        const killerName = twoPartyInteraction ? this.getPlayerName(killerID as number) : "";
                        const iconSrc = gasKill ? "gas" : weaponUsed?.idString;
                        const altText = weaponUsed === undefined ? gasKill ? "gas" : "" : `(${weaponUsed?.name})`;
                        const killstreakText = hasKillstreak
                            ? `
                            <span style="font-size: 80%">(${killstreak}
                                <img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull" height=12>)
                            </span>`
                            : "";

                        messageText = `
                        ${killerName}
                        <img class="kill-icon" src="./img/killfeed/${iconSrc}_killfeed.svg" alt="${altText}">
                        ${killstreakText}
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
                        this._addKillMessage(kills as number, playerName, weaponUsed?.name ?? "", killstreak);
                        break;
                    }
                }
                break;
            }

            case KillFeedMessageType.KillLeaderAssigned: {
                if (playerID === this.game.activePlayerID) classes.push("kill-feed-item-killer");

                $("#kill-leader-leader").html(playerName);
                $("#kill-leader-kills-counter").text(kills as number);

                if (!hideInKillFeed) {
                    messageText = `<i class="fa-solid fa-crown"></i> ${playerName} promoted to Kill Leader!`;
                    this.game.soundManager.play("kill_leader_assigned");
                }
                $("#btn-spectate-kill-leader").show();
                break;
            }

            case KillFeedMessageType.KillLeaderUpdated: {
                $("#kill-leader-kills-counter").text(kills as number);
                break;
            }

            case KillFeedMessageType.KillLeaderDead: {
                $("#kill-leader-leader").text("Waiting for leader");
                $("#kill-leader-kills-counter").text("0");
                // noinspection HtmlUnknownTarget
                messageText = `<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> ${killerID ? `${this.getPlayerName(killerID)} killed Kill Leader!` : "The Kill Leader is dead!"}`;
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
