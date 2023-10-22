import $ from "jquery";
import { DEFAULT_USERNAME, KILL_FEED_MESSAGE_TYPE_BITS, KillFeedMessageType, type ObjectCategory } from "../../../../../common/src/constants";
import { type ExplosionDefinition } from "../../../../../common/src/definitions/explosions";
import { type ItemDefinition } from "../../../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";
import { consoleVariables } from "../../utils/console/variables";
import { UI_DEBUG_MODE } from "../../utils/constants";
import { randomKillWord } from "../../utils/misc";

export class KillFeedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const killFeed = $("#kill-feed");
        const killFeedItem = $('<div class="kill-feed-item">');
        const anonymizePlayers = consoleVariables.get.builtIn("cv_anonymize_player_names").value;

        const messageType: KillFeedMessageType = stream.readBits(KILL_FEED_MESSAGE_TYPE_BITS);
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
                        id: stream.readObjectID()
                    }
                    : undefined;

                if (anonymizePlayers) {
                    killed.name = DEFAULT_USERNAME;
                    if (killedBy) killedBy.name = DEFAULT_USERNAME;
                }

                switch (true) {
                    case killed.id === this.game.activePlayerID: { // was killed
                        killFeedItem.addClass("kill-feed-item-victim");
                        break;
                    }
                    case killedBy?.id === this.game.activePlayerID: { // killed other
                        killFeedItem.addClass("kill-feed-item-killer");
                        break;
                    }
                }

                let weaponUsed: ItemDefinition | ExplosionDefinition | undefined;
                let killstreak: number | undefined;
                if (stream.readBoolean()) { // used a weapon
                    weaponUsed = stream.readObjectType<ObjectCategory.Loot, ItemDefinition | ExplosionDefinition>().definition;
                    if (stream.readBoolean()) { // weapon tracks killstreaks
                        killstreak = stream.readBits(7);
                    }
                }
                const gasKill = stream.readBoolean();

                /* eslint-disable @typescript-eslint/no-non-null-assertion */
                switch (consoleVariables.get.builtIn("cv_killfeed_style").value) {
                    case "text": {
                        const message = twoPartyInteraction
                            ? `${killedBy!.name} ${randomKillWord()} ${killed.name}`
                            : gasKill
                                ? `${killed.name} died to the gas`
                                : `${killed.name} committed suicide`;

                        killFeedItem.html(`${killstreak !== undefined && killstreak > 1 ? killstreak : ""}<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> ${message}${weaponUsed === undefined ? "" : ` with ${weaponUsed.name}`}`);
                        break;
                    }
                    case "icon": {
                        const killerName = twoPartyInteraction ? killedBy!.name : "";
                        const iconSrc = gasKill ? "gas" : weaponUsed?.idString;
                        const altText = weaponUsed === undefined ? gasKill ? "gas" : "" : ` (${weaponUsed?.name})`;
                        const killstreakText = killstreak !== undefined && killstreak > 1 ? ` <span style="font-size: 80%">(${killstreak} <img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull" height=12>)</span>` : "";

                        killFeedItem.html(`${killerName} <img class="kill-icon" src="./img/killfeed/${iconSrc}_killfeed.svg" alt="${altText}">${killstreakText} ${killed.name}`);
                        break;
                    }
                }

                break;
            }

            case KillFeedMessageType.KillLeaderAssigned: {
                const name = stream.readPlayerNameWithColor();
                const kills = stream.readBits(7);

                $("#kill-leader-leader").html(name);
                $("#kill-leader-kills-counter").text(kills);

                killFeedItem.html(`<i class="fa-solid fa-crown"></i> ${name} promoted to Kill Leader!`);
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
                killFeedItem.html('<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> The Kill Leader is dead!'); // TODO Add who killed the kill leader
                break;
            }
        }

        if (messageType === KillFeedMessageType.KillLeaderUpdated) return; // Kill leader update messages don't have entries in the killfeed

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
}
