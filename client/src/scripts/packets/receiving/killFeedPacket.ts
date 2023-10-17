import $ from "jquery";
import {
    DEFAULT_USERNAME,
    KILL_FEED_MESSAGE_TYPE_BITS,
    KillFeedMessageType,
    type ObjectCategory
} from "../../../../../common/src/constants";
import { type ItemDefinition } from "../../../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";
import { consoleVariables } from "../../utils/console/variables";
import { UI_DEBUG_MODE } from "../../utils/constants";
import { randomKillWord } from "../../utils/misc";

export class KillFeedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const killFeed = $("#kill-feed");
        const killFeedItem = $("<div>");
        const anonymizePlayers = consoleVariables.get.builtIn("cv_anonymize_player_names").value;
        killFeedItem.addClass("kill-feed-item");

        const messageType: KillFeedMessageType = stream.readBits(KILL_FEED_MESSAGE_TYPE_BITS);
        switch (messageType) {
            case KillFeedMessageType.Kill: {
                const twoPartyInteraction = stream.readBoolean();
                const killed = {
                    name: stream.readPlayerNameWithColor(),
                    id: stream.readObjectID()
                };

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

                let weaponUsed: ItemDefinition | undefined;
                let killstreak: number | undefined;
                if (stream.readBoolean()) { // used a weapon
                    weaponUsed = stream.readObjectType<ObjectCategory.Loot, ItemDefinition>().definition;
                    if (stream.readBoolean()) { // weapon tracks killstreaks
                        killstreak = stream.readUint8();
                    }
                }

                /* eslint-disable @typescript-eslint/no-non-null-assertion */
                const gasKill = stream.readBoolean();

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
            case KillFeedMessageType.Join: {
                const name = stream.readPlayerNameWithColor();
                const joined = stream.readBoolean();
                killFeedItem.html(`<i class="fa-solid ${joined ? "fa-arrow-right-to-bracket" : "fa-arrow-right-from-bracket"}"></i> ${anonymizePlayers ? DEFAULT_USERNAME : name} ${joined ? "joined" : "left"} the game`);
                break;
            }
        }

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
