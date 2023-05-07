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

import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../common/src/constants/packetType";
import { type SendingPacket } from "./types/sendingPacket";
import { type Player } from "./objects/player";
import { UpdatePacket } from "./packets/receiving/updatePacket";

export class Game {
    socket: WebSocket;

    players: Set<Player> = new Set<Player>();
    activePlayer: Player;

    constructor(address: string) {
        if (address === undefined) return;

        this.socket = new WebSocket(address);
        this.socket.binaryType = "arraybuffer";
        this.socket.onmessage = (message: MessageEvent) => {
            const stream = new SuroiBitStream(message.data);
            switch (stream.readUint8()) {
                case PacketType.Update: {
                    new UpdatePacket(this.activePlayer).deserialize(stream);
                }
            }
        };

        $("canvas").addClass("active");
        global.activeGame = this;
        global.phaser.scene.start("game");
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
