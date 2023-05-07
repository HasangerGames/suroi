import type { WebSocket } from "uWebSockets.js";

import { GameObject } from "../types/gameObject";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import {
    type Body, Circle, Vec2
} from "planck";
import { type Game } from "../game";
import { ObjectCategory } from "../../../common/src/utils/objectCategory";
import { ObjectType } from "../../../common/src/utils/objectType";
import { type PlayerContainer } from "../server";
import { type SendingPacket } from "../types/sendingPacket";

export class Player extends GameObject {
    name: string;

    private _health = 100;
    healthDirty = true;

    private _adrenaline = 100;
    adrenalineDirty = true;

    moving = false;
    movesSinceLastUpdate = 0;

    movingUp = false;
    movingDown = false;
    movingLeft = false;
    movingRight = false;

    socket: WebSocket<PlayerContainer>;

    body: Body;

    constructor(game: Game, name: string, socket: WebSocket<PlayerContainer>, position: Vec2) {
        super(game, ObjectType.categoryOnly(ObjectCategory.Player), position);
        this.socket = socket;
        this.rotation = Vec2(0, -1);

        // Init body
        this.body = game.world.createBody({
            type: "dynamic",
            position,
            fixedRotation: true
        });
        this.body.createFixture({
            shape: Circle(1),
            friction: 0.0,
            density: 1000.0,
            restitution: 0.0,
            userData: this
        });
    }

    setVelocity(xVelocity: number, yVelocity: number): void {
        this.body.setLinearVelocity(Vec2(xVelocity, yVelocity));
        if (xVelocity !== 0 || yVelocity !== 0) {
            this.moving = true;
            this.movesSinceLastUpdate++;
        }
    }

    get position(): Vec2 {
        return this.body.getPosition();
    }

    get health(): number {
        return this._health;
    }

    set health(health: number) {
        this._health = health;
    }

    get adrenaline(): number {
        return this._adrenaline;
    }

    set adrenaline(adrenaline: number) {
        this._adrenaline = adrenaline;
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
            this.socket.send(stream.buffer.slice(0, Math.ceil(stream.index / 8)), true, true);
        } catch (e) {
            console.warn("Error sending packet. Details:", e);
        }
    }

    /* eslint-disable @typescript-eslint/no-empty-function */

    serializePartial(stream: SuroiBitStream): void {}

    serializeFull(stream: SuroiBitStream): void {}
}
