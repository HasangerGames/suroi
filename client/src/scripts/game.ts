/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { type SendingPacket } from "./types/sendingPacket";
import { type Player } from "./objects/player";
import { UpdatePacket } from "./packets/receiving/updatePacket";
import core from "./core";
import { PacketType } from "../../../common/src/constants";
import { type GameObject } from "./types/gameObject";
import { JoinedPacket } from "./packets/receiving/joinedPacket";

export class Game {
    socket: WebSocket;

    objects: Map<number, GameObject> = new Map<number, GameObject>();
    players: Set<Player> = new Set<Player>();
    activePlayer: Player;

    connect(address: string): void {
        if (address === undefined) return;

        this.socket = new WebSocket(address);
        this.socket.binaryType = "arraybuffer";

        // Start the Phaser scene when the socket connects
        this.socket.onopen = (): void => {
            core.phaser?.scene.start("game");
        };

        // Handle incoming messages
        this.socket.onmessage = (message: MessageEvent): void => {
            const stream = new SuroiBitStream(message.data);
            switch (stream.readPacketType()) {
                case PacketType.Joined: {
                    new JoinedPacket(this.activePlayer).deserialize(stream);
                    break;
                }
                case PacketType.Update: {
                    new UpdatePacket(this.activePlayer).deserialize(stream);
                    break;
                }
            }
        };

        // Shut down the Phaser scene when the socket closes
        this.socket.onclose = (): void => {
            $("canvas").removeClass("active");
            core.phaser?.scene.stop("game");
        };
    }

    sendPacket(packet: SendingPacket): void {
        const stream = SuroiBitStream.alloc(packet.allocBytes);
        try {
            packet.serialize(stream);
        } catch (e) {
            console.error("Error serializing packet. Details:", e);
        }
        this.sendData(stream);
    }

    sendData(stream: SuroiBitStream): void {
        try {
            this.socket.send(stream.buffer.slice(0, Math.ceil(stream.index / 8)));
        } catch (e) {
            console.warn("Error sending packet. Details:", e);
        }
    }
}
