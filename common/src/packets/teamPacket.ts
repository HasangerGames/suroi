import { GameConstants, PacketType } from "../constants";
import { type SuroiBitStream } from "../utils/suroiBitStream";
import { type Vector } from "../utils/vector";
import { Packet } from "./packet";

export class TeamPacket extends Packet {
    override readonly allocBytes = 10;
    override readonly type = PacketType.Team;

    players: number[] = [];
    positions: Vector[] = [];
    healths: number[] = [];

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

        // Must be the same length as the amount of players (logically)
        for (const health of this.healths) {
            // We do not need the exact health of our teammates
            // a uint8 is enough to represent the health of a friendly
            stream.writeUint8(health);
        }
    }

    override deserialize(stream: SuroiBitStream): void {
        // Read the number of players
        const numPlayers = stream.readUint8();
        for (let i = 0; i < numPlayers; i++) {
            this.players.push(this.stream.readObjectID());
        }

        // Read the number of positions
        const numPositions = stream.readUint8();
        for (let i = 0; i < numPositions; i++) {
            this.positions.push(this.stream.readVector(
                -GameConstants.maxPosition,
                -GameConstants.maxPosition,
                GameConstants.maxPosition,
                GameConstants.maxPosition,
                24
            ));
        }

        // Read the number of healths
        for (let i = 0; i < numPlayers; i++) {
            this.healths.push(stream.readUint8());
        }
    }
}
