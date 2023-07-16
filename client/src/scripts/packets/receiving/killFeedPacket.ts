import $ from "jquery";

import { ReceivingPacket } from "../../types/receivingPacket";

import { KILL_FEED_MESSAGE_TYPE_BITS, KillFeedMessageType } from "../../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type ItemDefinition } from "../../../../../common/src/utils/objectDefinitions";
import { randomKillWord } from "../../utils/misc";
import { localStorageInstance } from "../../utils/localStorageHandler";
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
                    case killed.id === this.playerManager.game.activePlayer.id: { // was killed
                        killFeedItem.addClass("kill-feed-item-victim");
                        break;
                    }
                    case killedBy?.id === this.playerManager.game.activePlayer.id: { // killed other
                        killFeedItem.addClass("kill-feed-item-killer");
                        break;
                    }
                }

                let weaponUsed: ItemDefinition | undefined;
                if (stream.readBoolean()) {
                    weaponUsed = stream.readObjectType().definition as ItemDefinition;
                }

                const gasKill = stream.readBoolean();

                /* eslint-disable @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-non-null-assertion */
                if (localStorageInstance.config.textKillFeed) {
                    const message = twoPartyInteraction
                        ? `${killedBy!.name} ${randomKillWord()} ${killed.name}`
                        : gasKill
                            ? `${killed.name} died to the gas`
                            : `${killed.name} committed suicide`;

                    killFeedItem.html(`<img class="kill-icon" src="${require("../../../assets/img/misc/skull.svg")}" alt="Skull"> ${message}${weaponUsed === undefined ? "" : ` with ${weaponUsed.name}`}`);
                } else {
                    const killerName = twoPartyInteraction ? killedBy!.name : "";
                    const iconSrc = gasKill ? "gas" : weaponUsed?.idString;
                    const altText = weaponUsed === undefined ? gasKill ? "gas" : "" : ` (${weaponUsed?.name})`;

                    killFeedItem.html(`${killerName} <img class="kill-icon" src="./img/game/killfeed/${iconSrc}_killfeed.svg" alt="${altText}"> ${killed.name}`);
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
        if (killFeed.children().length > 5) {
            killFeed.children().last().remove();
        }
        setTimeout(
            () => killFeedItem.fadeOut(1000, killFeedItem.remove.bind(killFeedItem)),
            7000
        );
    }
}
