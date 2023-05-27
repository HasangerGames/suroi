import $ from "jquery";

import core from "./core";

import { UpdatePacket } from "./packets/receiving/updatePacket";
import { JoinedPacket } from "./packets/receiving/joinedPacket";
import { GameOverPacket } from "./packets/receiving/gameOverPacket";
import { KillPacket } from "./packets/receiving/killPacket";

import { type Player } from "./objects/player";
import { type SendingPacket } from "./types/sendingPacket";
import { type GameObject } from "./types/gameObject";

import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { PacketType } from "../../../common/src/constants";

export class Game {
    socket!: WebSocket;

    objects: Map<number, GameObject> = new Map<number, GameObject>();
    players: Set<Player> = new Set<Player>();
    bullets: Map<number, Phaser.GameObjects.Image> = new Map<number, Phaser.GameObjects.Image>();
    activePlayer!: Player;

    gameStarted = false;
    error = false;

    connect(address: string): void {
        this.error = false;

        if (address === undefined) return;
        if (this.gameStarted) return;

        this.gameStarted = true;
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
                case PacketType.GameOver: {
                    new GameOverPacket(this.activePlayer).deserialize(stream);
                    break;
                }
                case PacketType.Kill: {
                    new KillPacket(this.activePlayer).deserialize(stream);
                    break;
                }
            }
        };

        this.socket.onerror = (): void => {
            this.error = true;

            $("#splash-server-message-text").text("Error joining game.");
            $("#splash-server-message").show();
        };

        // Shut down the Phaser scene when the socket closes
        this.socket.onclose = (): void => {
            if (!this.error) this.endGame();
        };
    }

    endGame(): void {
        window.history.pushState(null, "", "?connectionLost");
        window.location.reload();
        /* $("#game-ui").hide();
        $("canvas").removeClass("active");
        $("#splash-ui").fadeIn();
        core.phaser?.scene.stop("game");
        this.gameStarted = false; */
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
