import { GameConstants, PacketType } from "../constants";
import { type Vector } from "../utils/vector";
import { Packet } from "./packet";

export class TeamPacket extends Packet {
    override readonly allocBytes = 1;
    override readonly type = PacketType.Team;

    players: number[] = [];
    positions: Vector[] = [];

    override serialize(): void {
        super.serialize();
        const stream = this.stream;

        stream.writeUint8(this.players.length);
        for (const playerId of this.players) {
            stream.writeObjectID(playerId);
        }

        stream.writeUint8(this.positions.length);
        for (const position of this.positions) {
            stream.writeVector(
                position,
                -GameConstants.maxPosition,
                -GameConstants.maxPosition,
                GameConstants.maxPosition,
                GameConstants.maxPosition,
                24);
        }
    }

    override deserialize(): void {
        // Read the number of players
        const numPlayers = this.stream.readUint8();
        for (let i = 0; i < numPlayers; i++) {
            this.players.push(this.stream.readObjectID());
        }

        // Read the number of positions
        const numPositions = this.stream.readUint8();
        for (let i = 0; i < numPositions; i++) {
            this.positions.push(this.stream.readVector(
                -GameConstants.maxPosition,
                -GameConstants.maxPosition,
                GameConstants.maxPosition,
                GameConstants.maxPosition,
                24
            ));
        }
    }
}
