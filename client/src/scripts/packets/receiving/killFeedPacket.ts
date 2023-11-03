import $ from "jquery";
import { DEFAULT_USERNAME, KillFeedMessageType } from "../../../../../common/src/constants";
import { Explosions, type ExplosionDefinition } from "../../../../../common/src/definitions/explosions";
import { KILL_FEED_MESSAGE_TYPE_BITS, type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";
import { UI_DEBUG_MODE } from "../../utils/constants";
import { type LootDefinition, Loots } from "../../../../../common/src/definitions/loots";

let timeoutID: number;
const killModal = $("#kill-msg");

function addKillMsg(kills: number, name: string, weaponUsed: string, streak?: number): void {
    const killText = `Kills: ${kills}`;
    $("#ui-kills").text(kills);

    $("#kill-msg-kills").text(killText);
    $("#kill-msg-player-name").html(name);
    $("#kill-msg-weapon-used").text(` with ${weaponUsed}${streak ? ` (streak: ${streak})` : ""}`);

    killModal.fadeIn(350, () => {
        // clear the previous fade out timeout so it won't fade away too
        // fast if the player makes more than one kill in a short time span
        if (timeoutID !== undefined) clearTimeout(timeoutID);

        timeoutID = window.setTimeout(() => {
            killModal.fadeOut(350);
        }, 3000);
    });
}

const killFeed = $("#kill-feed");

function addKillFeedMessage(text: string, classes: string[]): void {
    const killFeedItem = $('<div class="kill-feed-item">');

    killFeedItem.html(text);
    killFeedItem.addClass(classes);

    setTimeout(
        () => killFeedItem.fadeOut(1000, killFeedItem.remove.bind(killFeedItem)),
        7000
    );

    killFeed.prepend(killFeedItem);
    if (!UI_DEBUG_MODE) {
        while (killFeed.children().length > 5) {
            killFeed.children().last().remove();
        }
    }

    setTimeout(
        () => killFeedItem.fadeOut(1000, killFeedItem.remove.bind(killFeedItem)),
        7000
    );
}

export class KillFeedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const anonymizePlayers = this.game.console.getBuiltInCVar("cv_anonymize_player_names");

        const messageType: KillFeedMessageType = stream.readBits(KILL_FEED_MESSAGE_TYPE_BITS);

        let messageText: string | undefined;
        const classes: string[] = [];

        switch (messageType) {
            case KillFeedMessageType.Kill: {
                const killed = {
                    name: stream.readPlayerNameWithColor(),
                    id: stream.readObjectID()
                };

                const twoPartyInteraction = stream.readBoolean();
                const killedBy = twoPartyInteraction
                    ? {
                        name: stream.readPlayerNameWithColor(),
                        id: stream.readObjectID(),
                        kills: stream.readUint8()
                    }
                    : undefined;

                if (anonymizePlayers) {
                    killed.name = DEFAULT_USERNAME;
                    if (killedBy) killedBy.name = DEFAULT_USERNAME;
                }

                let weaponUsed: LootDefinition | ExplosionDefinition | undefined;
                let killstreak = 0;

                if (stream.readBoolean()) { // used a weapon
                    if (stream.readBoolean()) {
                        weaponUsed = Loots.readFromStream(stream);
                    } else {
                        weaponUsed = Explosions.readFromStream(stream);
                    }

                    if (stream.readBoolean()) { // weapon tracks killstreaks
                        killstreak = stream.readBits(7);
                    }
                }
                const gasKill = stream.readBoolean();

                /* eslint-disable @typescript-eslint/no-non-null-assertion */
                switch (this.game.console.getBuiltInCVar("cv_killfeed_style")) {
                    case "text": {
                        const message = twoPartyInteraction
                            ? `${killedBy!.name} killed ${killed.name}`
                            : gasKill
                                ? `${killed.name} died to the gas`
                                : `${killed.name} committed suicide`;

                        messageText = `${killstreak > 1 ? killstreak : ""}
                        <img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull">
                        ${message}${weaponUsed === undefined ? "" : ` with ${weaponUsed.name}`}`;
                        break;
                    }
                    case "icon": {
                        const killerName = twoPartyInteraction ? killedBy!.name : "";
                        const iconSrc = gasKill ? "gas" : weaponUsed?.idString;
                        const altText = weaponUsed === undefined ? gasKill ? "gas" : "" : ` (${weaponUsed?.name})`;
                        const killstreakText = killstreak > 1
                            ? `
                            <span style="font-size: 80%">(${killstreak}
                                <img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull" height=12>)
                            </span>`
                            : "";

                        messageText = `
                        ${killerName}
                        <img class="kill-icon" src="./img/killfeed/${iconSrc}_killfeed.svg" alt="${altText}">
                        ${killstreakText}
                        ${killed.name}`;
                        break;
                    }
                }

                switch (true) {
                    case killed.id === this.game.activePlayerID: { // was killed
                        classes.push("kill-feed-item-victim");
                        break;
                    }
                    case killedBy?.id === this.game.activePlayerID: { // killed other
                        classes.push("kill-feed-item-killer");

                        if (killed && weaponUsed) {
                            addKillMsg(killedBy.kills, killed.name, weaponUsed?.name, killstreak);
                        }
                        break;
                    }
                }

                break;
            }

            case KillFeedMessageType.KillLeaderAssigned: {
                if (stream.readObjectID() === this.game.activePlayerID) classes.push("kill-feed-item-killer");

                const name = stream.readPlayerNameWithColor();
                const kills = stream.readBits(7);

                $("#kill-leader-leader").html(name);
                $("#kill-leader-kills-counter").text(kills);

                messageText = `<i class="fa-solid fa-crown"></i> ${name} promoted to Kill Leader!`;
                this.game.soundManager.play("kill_leader_assigned");
                break;
            }

            case KillFeedMessageType.KillLeaderUpdated: {
                const kills = stream.readBits(7);
                $("#kill-leader-kills-counter").text(kills);
                break;
            }

            case KillFeedMessageType.KillLeaderDead: {
                $("#kill-leader-leader").text("Waiting for leader");
                $("#kill-leader-kills-counter").text("0");
                // noinspection HtmlUnknownTarget
                messageText = '<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> The Kill Leader is dead!';
                // TODO Add who killed the kill leader
                this.game.soundManager.play("kill_leader_dead");
                break;
            }
        }

        if (messageText) addKillFeedMessage(messageText, classes);
    }
}
