import {
    type Body,
    Circle,
    Vec2
} from "planck";
import type { WebSocket } from "uWebSockets.js";

import { DeathMarker } from "./deathMarker";
import { type Game } from "../game";
import { type PlayerContainer } from "../server";
import { GameObject } from "../types/gameObject";
import { type SendingPacket } from "../types/sendingPacket";

import { GameOverPacket } from "../packets/sending/gameOverPacket";
import { KillPacket } from "../packets/sending/killPacket";

import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../common/src/utils/objectType";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import {
    ANIMATION_TYPE_BITS,
    AnimationType,
    ObjectCategory
} from "../../../common/src/constants";

export class Player extends GameObject {
    readonly isPlayer = true;
    readonly isObstacle = false;
    readonly collidesWith = {
        player: false,
        obstacle: true
    };

    name: string;

    joined = false;
    disconnected = false;

    private _health = 100;
    healthDirty = true;

    private _adrenaline = 100;
    adrenalineDirty = true;

    kills = 0;
    damageDone = 0;
    damageTaken = 0;
    joinTime: number;

    moving = false;
    movesSinceLastUpdate = 0;

    movingUp = false;
    movingDown = false;
    movingLeft = false;
    movingRight = false;
    punching = false;

    deadPosition: Vec2;

    activePlayerIDDirty = true;

    weaponCooldown = 0;

    // This is flipped when the player takes damage.
    // When the value changes it plays the hit sound and particle on the client.
    // same logic applies for animation.seq
    hitEffect = false;

    animation = {
        type: AnimationType.None,
        seq: false
    };

    visibleObjects = new Set<GameObject>(); // Objects the player can see
    nearObjects = new Set<GameObject>(); // Objects the player can see with a 1x scope
    partialDirtyObjects = new Set<GameObject>(); // Objects that need to be partially updated
    fullDirtyObjects = new Set<GameObject>(); // Objects that need to be fully updated
    deletedObjects = new Set<GameObject>(); // Objects that need to be deleted

    private _zoom: number;
    zoomDirty: boolean;
    xCullDist: number;
    yCullDist: number;

    socket: WebSocket<PlayerContainer>;

    fullUpdate = true;

    body: Body;

    constructor(game: Game, name: string, socket: WebSocket<PlayerContainer>, position: Vec2) {
        super(game, ObjectType.categoryOnly(ObjectCategory.Player), position);

        this.socket = socket;
        this.name = name;
        this.rotation = 0;
        this.zoom = 48;

        this.joinTime = Date.now();

        // Init body
        this.body = game.world.createBody({
            type: "dynamic",
            position,
            fixedRotation: true
        });

        this.body.createFixture({
            shape: Circle(2.5),
            friction: 0.0,
            density: 1000.0,
            restitution: 0.0,
            userData: this
        });

        this.hitbox = new CircleHitbox(2.5, this.position);
    }

    setVelocity(xVelocity: number, yVelocity: number): void {
        this.body.setLinearVelocity(Vec2(xVelocity, yVelocity));
        if (xVelocity !== 0 || yVelocity !== 0) {
            this.movesSinceLastUpdate++;
        }
    }

    get position(): Vec2 {
        return this.deadPosition ?? this.body.getPosition();
    }

    get health(): number {
        return this._health;
    }

    set health(health: number) {
        this._health = health;
        this.healthDirty = true;
    }

    get adrenaline(): number {
        return this._adrenaline;
    }

    set adrenaline(adrenaline: number) {
        this._adrenaline = adrenaline;
        this.adrenalineDirty = true;
    }

    get zoom(): number {
        return this._zoom;
    }

    set zoom(zoom: number) {
        this._zoom = zoom;
        this.xCullDist = this._zoom * 1.5;
        this.yCullDist = this._zoom * 1.25;
        this.zoomDirty = true;
    }

    updateVisibleObjects(): void {
        this.movesSinceLastUpdate = 0;

        const approximateX = Math.round(this.position.x / 10) * 10; const approximateY = Math.round(this.position.y / 10) * 10;
        this.nearObjects = this.game.visibleObjects[48][approximateX][approximateY];

        const visibleAtZoom = this.game.visibleObjects[this.zoom];
        const newVisibleObjects = new Set<GameObject>(visibleAtZoom !== undefined ? visibleAtZoom[approximateX][approximateY] : this.nearObjects);

        const minX = this.position.x - this.xCullDist;
        const minY = this.position.y - this.yCullDist;
        const maxX = this.position.x + this.xCullDist;
        const maxY = this.position.y + this.yCullDist;

        for (const object of this.game.dynamicObjects) {
            if (this === object) continue;
            if (object.position.x > minX &&
                object.position.x < maxX &&
                object.position.y > minY &&
                object.position.y < maxY) {
                newVisibleObjects.add(object);

                if (!this.visibleObjects.has(object)) {
                    this.fullDirtyObjects.add(object);
                }

                if (object instanceof Player && !object.visibleObjects.has(this)) {
                    object.visibleObjects.add(this);
                    object.fullDirtyObjects.add(this);
                }
            } else if (this.visibleObjects.has(object)) {
                this.deletedObjects.add(object);
            }
        }

        for (const object of newVisibleObjects) {
            if (!this.visibleObjects.has(object)) {
                this.fullDirtyObjects.add(object);
            }
        }

        for (const object of this.visibleObjects) {
            if (!newVisibleObjects.has(object)) {
                this.deletedObjects.add(object);
            }
        }

        this.visibleObjects = newVisibleObjects;
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

    damage(amount: number, source?): void {
        if (this.health - amount > 100) {
            amount = 100 - this.health;
        }

        if (this.health - amount <= 0) {
            amount = this.health;
        }

        this.health -= amount;
        this.damageTaken += amount;

        if (source instanceof Player && source !== this) {
            source.damageDone += amount;
        }

        this.hitEffect = !this.hitEffect;

        if (amount <= 0) this.hitEffect = !this.hitEffect;

        this.partialDirtyObjects.add(this);
        this.game.partialDirtyObjects.add(this);

        if (this.health <= 0 && !this.dead) {
            this.health = 0;
            this.dead = true;

            if (!this.disconnected) {
                this.game.aliveCount--;
                this.sendPacket(new GameOverPacket(this));
            }

            this.movingUp = false;
            this.movingDown = false;
            this.movingLeft = false;
            this.movingRight = false;
            this.punching = false;
            this.deadPosition = this.position.clone();

            if (source instanceof Player && source !== this) {
                source.kills++;
                source.sendPacket(new KillPacket(source, this));
            }

            this.game.livingPlayers.delete(this);
            this.game.fullDirtyObjects.add(this);
            this.fullDirtyObjects.add(this);

            const deathMarker: DeathMarker = new DeathMarker(this);

            this.game.dynamicObjects.add(deathMarker);
            this.game.fullDirtyObjects.add(deathMarker);
        }
    }

    /* eslint-disable @typescript-eslint/no-empty-function */

    serializePartial(stream: SuroiBitStream): void {
        stream.writePosition(this.position);
        stream.writeRotation(this.rotation);
        stream.writeBits(this.animation.type, ANIMATION_TYPE_BITS);
        stream.writeBoolean(this.animation.seq);
        stream.writeBoolean(this.hitEffect);
    }

    serializeFull(stream: SuroiBitStream): void {
        stream.writeBoolean(this.dead);
    }
}
