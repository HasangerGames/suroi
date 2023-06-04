import $ from "jquery";

import core from "./core";

import { UpdatePacket } from "./packets/receiving/updatePacket";
import { JoinedPacket } from "./packets/receiving/joinedPacket";
import { GameOverPacket } from "./packets/receiving/gameOverPacket";
import { KillPacket } from "./packets/receiving/killPacket";
import { KillFeedPacket } from "./packets/receiving/killFeedPacket";
import { PingedPacket } from "./packets/receiving/pingedPacket";
import { PingPacket } from "./packets/sending/pingPacket";

import { type Player } from "./objects/player";
import { type SendingPacket } from "./types/sendingPacket";
import { type GameObject } from "./types/gameObject";

import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { GasMode, PacketType } from "../../../common/src/constants";

import { PlayerManager } from "./utils/playerManager";
import { v } from "../../../common/src/utils/vector";
import { MapPacket } from "./packets/receiving/mapPacket";

export class Game {
    socket!: WebSocket;

    objects: Map<number, GameObject> = new Map<number, GameObject>();
    players: Set<Player> = new Set<Player>();
    bullets: Map<number, Phaser.GameObjects.Image> = new Map<number, Phaser.GameObjects.Image>();
    activePlayer!: Player;

    gameStarted = false;
    error = false;

    playerManager = new PlayerManager(this);

    lastPingDate = Date.now();

    readonly gas = {
        mode: GasMode.Inactive,
        initialDuration: 0,
        oldPosition: v(360, 360),
        newPosition: v(360, 360),
        oldRadius: 534.6,
        newRadius: 534.6
    };

    connect(address: string): void {
        this.error = false;

        if (address === undefined) return;
        if (this.gameStarted) return;

        this.gameStarted = true;
        this.socket = new WebSocket(address);
        this.socket.binaryType = "arraybuffer";

        // Start the Phaser scene when the socket connects
        this.socket.onopen = (): void => {
            core.phaser?.scene.start("minimap");
            core.phaser?.scene.start("game");
            this.sendPacket(new PingPacket(this.playerManager));
        };

        // Handle incoming messages
        this.socket.onmessage = (message: MessageEvent): void => {
            const stream = new SuroiBitStream(message.data);
            switch (stream.readPacketType()) {
                case PacketType.Joined: {
                    new JoinedPacket(this.playerManager).deserialize(stream);
                    break;
                }
                case PacketType.Map: {
                    new MapPacket(this.playerManager).deserialize(stream);
                    break;
                }
                case PacketType.Update: {
                    new UpdatePacket(this.playerManager).deserialize(stream);
                    break;
                }
                case PacketType.GameOver: {
                    new GameOverPacket(this.playerManager).deserialize(stream);
                    break;
                }
                case PacketType.Kill: {
                    new KillPacket(this.playerManager).deserialize(stream);
                    break;
                }
                case PacketType.KillFeed: {
                    new KillFeedPacket(this.playerManager).deserialize(stream);
                    break;
                }
                // TODO: maybe disconnect players that didn't send a ping in a while?
                case PacketType.Ping: {
                    new PingedPacket(this.playerManager).deserialize(stream);
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
            if (this.gameStarted) {
                $("#splash-server-message-text").html("Connection lost.<br>The server may have restarted.");
                $("#splash-server-message").show();
            }
            if (!this.error) this.endGame();
        };
    }

    endGame(): void {
        $("#game-ui").hide();
        $("#game-menu").hide();
        $("#game-over-screen").hide();
        $("canvas").removeClass("active");
        $("#splash-ui").fadeIn();

        core.phaser?.scene.stop("game");
        core.phaser?.scene.start("menu");
        this.gameStarted = false;
        this.socket.close();

        // reset stuff
        this.objects.clear();
        this.players.clear();
        this.bullets.clear();

        this.playerManager = new PlayerManager(this);
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
