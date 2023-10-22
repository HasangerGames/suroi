import { existsSync, mkdirSync, writeFileSync } from "fs";
import { randomUUID } from "node:crypto";
import { SPECTATE_ACTIONS_BITS, SpectateActions } from "../../../../common/src/constants";
import { random } from "../../../../common/src/utils/random";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";
import { ReceivingPacket } from "../../types/receivingPacket";
import { ReportPacket } from "../sending/reportPacket";

export class SpectatePacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const player = this.player;
        if (!player.dead) return;
        const game = player.game;
        const action = stream.readBits(SPECTATE_ACTIONS_BITS);
        if (game.now - player.lastSpectateActionTime < 200) return;
        player.lastSpectateActionTime = game.now;
        switch (action) {
            case SpectateActions.BeginSpectating: {
                let toSpectate: Player | undefined;
                if (player.killedBy !== undefined && !player.killedBy.dead) toSpectate = player.killedBy;
                else if (game.spectatablePlayers.length > 1) toSpectate = game.spectatablePlayers[random(0, game.spectatablePlayers.length)];
                if (toSpectate !== undefined) player.spectate(toSpectate);
                break;
            }
            case SpectateActions.SpectatePrevious:
                if (game.spectatablePlayers.length < 2) {
                    game.removePlayer(player);
                    break;
                }
                if (player.spectating !== undefined) {
                    let index: number = game.spectatablePlayers.indexOf(player.spectating) - 1;
                    if (index < 0) index = game.spectatablePlayers.length - 1;
                    player.spectate(game.spectatablePlayers[index]);
                }
                break;
            case SpectateActions.SpectateNext:
                if (game.spectatablePlayers.length < 2) {
                    game.removePlayer(player);
                    break;
                }
                if (player.spectating !== undefined) {
                    let index: number = game.spectatablePlayers.indexOf(player.spectating) + 1;
                    if (index >= game.spectatablePlayers.length) index = 0;
                    player.spectate(game.spectatablePlayers[index]);
                }
                break;
            case SpectateActions.SpectateSpecific: {
                const playerID = stream.readObjectID();
                const playerToSpectate = game.spectatablePlayers.find(player => player.id === playerID);
                if (playerToSpectate) player.spectate(playerToSpectate);
                break;
            }
            case SpectateActions.Report: {
                if (!existsSync("reports")) mkdirSync("reports");
                const reportID = randomUUID();
                writeFileSync(`reports/${reportID}.json`, JSON.stringify({
                    ip: player.spectating?.ip,
                    name: player.spectating?.name,
                    time: player.game.now
                }, null, 4));
                player.sendPacket(new ReportPacket(player, player.spectating?.name ?? "", reportID));
                break;
            }
        }
    }
}
