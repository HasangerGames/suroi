import { ReceivingPacket } from "../../types/receivingPacket";

import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { SPECTATE_ACTIONS_BITS, SpectateActions } from "../../../../common/src/constants";
import { random } from "../../../../common/src/utils/random";
import { type Player } from "../../objects/player";

export class SpectatePacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;
        const game = player.game;
        const action = stream.readBits(SPECTATE_ACTIONS_BITS);
        if (game.now - player.lastSpectateActionTime < 200) return;
        player.lastSpectateActionTime = game.now;
        switch (action) {
            case SpectateActions.BeginSpectating: {
                let toSpectate: Player;
                if (player.killedBy !== undefined && !player.killedBy.dead) toSpectate = player.killedBy;
                else toSpectate = game.spectatablePlayers[random(0, game.spectatablePlayers.length)];
                player.spectate(toSpectate);
                break;
            }
            case SpectateActions.SpectatePrevious:
                if (player.spectating !== undefined) {
                    let index: number = game.spectatablePlayers.indexOf(player.spectating) - 1;
                    if (index < 0) index = game.spectatablePlayers.length - 1;
                    player.spectate(game.spectatablePlayers[index]);
                }
                break;
            case SpectateActions.SpectateNext:
                if (player.spectating !== undefined) {
                    let index: number = game.spectatablePlayers.indexOf(player.spectating) + 1;
                    if (index >= game.spectatablePlayers.length) index = 0;
                    player.spectate(game.spectatablePlayers[index]);
                }
                break;
        }
    }
}
