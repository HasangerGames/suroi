import $ from "jquery";

import { ReceivingPacket } from "../../types/receivingPacket";

import { KILL_FEED_MESSAGE_TYPE_BITS, KillFeedMessageType, type ObjectCategory } from "../../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type ItemDefinition } from "../../../../../common/src/utils/objectDefinitions";
import { randomKillWord } from "../../utils/misc";
import { localStorageInstance } from "../../utils/localStorageHandler";
import { UI_DEBUG_MODE } from "../../utils/constants";
// import { lerp } from "../../../../../common/src/utils/math";

/*
    To avoid having an overly-cluttered killfeed, we say that the fade time is
    dependant on the amount of messages, up to a certain minimum/maximum

    Intuitively, if there's a lot of messages, they'll clear out faster than if
    there aren't that many
*/
// function killfeedLengthToFadeTime(length: number): number {
//     // These are pretty much arbitrary
//     const cutoffs = {
//         min: {
//             length: 5,
//             fadeTime: 7000
//         },
//         max: {
//             length: 12,
//             fadeTime: 500
//         }
//     };

//     if (length <= cutoffs.min.length) return cutoffs.min.fadeTime;
//     if (length >= cutoffs.max.length) return cutoffs.max.fadeTime;

//     return lerp(
//         cutoffs.min.fadeTime,
//         cutoffs.max.fadeTime,
//         (length - cutoffs.min.length) / (cutoffs.max.length - cutoffs.min.length)
//     );
// }

export class KillFeedPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const killFeed = $("#kill-feed");
        const killFeedItem = $("<div>");
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

                /* eslint-disable @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-non-null-assertion */
                const gasKill = stream.readBoolean();

                if (localStorageInstance.config.textKillFeed) {
                    const message = twoPartyInteraction
                        ? `${killedBy!.name} ${randomKillWord()} ${killed.name}`
                        : gasKill
                            ? `${killed.name} died to the gas`
                            : `${killed.name} committed suicide`;

                    killFeedItem.html(`${killstreak !== undefined && killstreak > 1 ? killstreak : ""}<img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull"> ${message}${weaponUsed === undefined ? "" : ` with ${weaponUsed.name}`}`);
                } else {
                    const killerName = twoPartyInteraction ? killedBy!.name : "";
                    const iconSrc = gasKill ? "gas" : weaponUsed?.idString;
                    const altText = weaponUsed === undefined ? gasKill ? "gas" : "" : ` (${weaponUsed?.name})`;
                    const killstreakText = killstreak !== undefined && killstreak > 1 ? ` <span style="font-size: 80%">(${killstreak} <img class="kill-icon" src="./img/misc/skull_icon.svg" alt="Skull" height=12>)</span>` : "";

                    killFeedItem.html(`${killerName} <img class="kill-icon" src="./img/killfeed/${iconSrc}_killfeed.svg" alt="${altText}">${killstreakText} ${killed.name}`);
                }

                break;
            }
            case KillFeedMessageType.Join: {
                const name = stream.readPlayerNameWithColor();
                const joined = stream.readBoolean();
                killFeedItem.html(`<i class="fa-solid ${joined ? "fa-arrow-right-to-bracket" : "fa-arrow-right-from-bracket"}"></i> ${name} ${joined ? "joined" : "left"} the game`);
                break;
            }
        }

        killFeed.prepend(killFeedItem);
        if (killFeed.children().length > 5 && !UI_DEBUG_MODE) {
            killFeed.children().last().remove();
        }
        setTimeout(
            () => killFeedItem.fadeOut(1000, killFeedItem.remove.bind(killFeedItem)),
            7000
        );
    }
}
