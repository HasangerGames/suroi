import $ from "jquery";

import { ReceivingPacket } from "../../types/receivingPacket";

import { KILL_FEED_MESSAGE_TYPE_BITS, KillFeedMessageType } from "../../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { type ItemDefinition } from "../../../../../common/src/utils/objectDefinitions";
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
                const suicide = stream.readBoolean();
                const killed = {
                    name: stream.readPlayerNameWithColor(),
                    id: stream.readObjectID()
                };
                //@ts-expect-error The IntelliSense works, so we take it and run with it
                const killedBy: typeof suicide extends true ? undefined : { name: string, id: number } = suicide
                    ? undefined
                    : {
                        name: stream.readPlayerNameWithColor(),
                        id: stream.readObjectID()
                    };

                switch (true) {
                    case suicide:
                    case killed.id === this.playerManager.game.activePlayer.id: { // was killed
                        killFeedItem.addClass("kill-feed-item-victim");
                        break;
                    }
                    case killedBy.id === this.playerManager.game.activePlayer.id: { // killed other
                        killFeedItem.addClass("kill-feed-item-killer");
                        break;
                    }
                }

                let weaponUsed: ItemDefinition | undefined;
                if (stream.readBoolean()) {
                    weaponUsed = stream.readObjectType().definition as ItemDefinition;
                }

                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                killFeedItem.html(`${suicide ? "" : killedBy.name} <img class="kill-icon" src="${`./img/game/killfeed/${weaponUsed?.idString}_killfeed.svg`}" alt="${weaponUsed === undefined ? "" : ` (${weaponUsed?.name})`}"> ${killed.name}`);
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
