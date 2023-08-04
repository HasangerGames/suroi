import $ from "jquery";

import { UpdatePacket } from "./packets/receiving/updatePacket";
import { JoinedPacket } from "./packets/receiving/joinedPacket";
import { GameOverPacket } from "./packets/receiving/gameOverPacket";
import { KillPacket } from "./packets/receiving/killPacket";
import { KillFeedPacket } from "./packets/receiving/killFeedPacket";
import { PingedPacket } from "./packets/receiving/pingedPacket";
import { PingPacket } from "./packets/sending/pingPacket";

import { Player } from "./objects/player";
import { type SendingPacket } from "./types/sendingPacket";
import { type GameObject } from "./types/gameObject";
import { type Bullet } from "./objects/bullet";

import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { GasState, MAP_HEIGHT, MAP_WIDTH, PacketType } from "../../../common/src/constants";

import { PlayerManager } from "./utils/playerManager";
import { v } from "../../../common/src/utils/vector";
import { MapPacket } from "./packets/receiving/mapPacket";
import { enablePlayButton } from "./main";
import { PickupPacket } from "./packets/receiving/pickupPacket";
import { UI_DEBUG_MODE } from "./utils/constants";
import { ReportPacket } from "./packets/receiving/reportPacket";
import { JoinPacket } from "./packets/sending/joinPacket";
import { localStorageInstance } from "./utils/localStorageHandler";
import { Obstacle } from "./objects/obstacle";
import { Loot } from "./objects/loot";
import { InputPacket } from "./packets/sending/inputPacket";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { FloorType } from "../../../common/src/definitions/buildings";
import { type CollisionRecord, circleCollision, distanceSquared } from "../../../common/src/utils/math";
import { Building } from "./objects/building";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { getIconFromInputName } from "./utils/inputManager";
import { Container, type Application } from "pixi.js";
import { Camera } from "./utils/camera";

export class Game {
    socket!: WebSocket;

    objects: Map<number, GameObject> = new Map<number, GameObject>();
    players: Set<Player> = new Set<Player>();
    bullets: Map<number, Bullet> = new Map<number, Bullet>();
    activePlayer!: Player;

    gameStarted = false;
    gameOver = false;
    spectating = false;
    error = false;

    playerManager = new PlayerManager(this);

    lastPingDate = Date.now();

    tickTimeoutID: number | undefined;

    readonly gas = {
        state: GasState.Inactive,
        initialDuration: 0,
        oldPosition: v(MAP_WIDTH / 2, MAP_HEIGHT / 2),
        newPosition: v(MAP_WIDTH / 2, MAP_HEIGHT / 2),
        oldRadius: 2048,
        newRadius: 2048
    };

    pixi: Application;

    camera: Camera;

    constructor(pixi: Application) {
        this.pixi = pixi;

        this.pixi.ticker.add((delta: number) => {
            for (const bulletId of this.bullets) {
                const bullet = bulletId[1];

                bullet.update(delta);
            }
        });

        this.camera = new Camera(this.pixi);

        window.addEventListener("resize", this.resize.bind(this));
    }

    connect(address: string): void {
        this.error = false;

        if (this.gameStarted) return;

        this.gameStarted = true;
        this.gameOver = false;
        this.spectating = false;
        this.socket = new WebSocket(address);
        this.socket.binaryType = "arraybuffer";

        // Start the Phaser scene when the socket connects
        this.socket.onopen = (): void => {
            $("#game-over-screen").hide();
            if (!UI_DEBUG_MODE) {
                $("#spectating-msg").hide();
                $("#spectating-buttons-container").hide();
            }
            this.sendPacket(new PingPacket(this.playerManager));
            this.sendPacket(new JoinPacket(this.playerManager));

            this.activePlayer = new Player(this, -1, true);

            this.tickTimeoutID = window.setInterval(this.tick.bind(this), 30);
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
                case PacketType.Pickup: {
                    new PickupPacket(this.playerManager).deserialize(stream);
                    break;
                }
                case PacketType.Report: {
                    new ReportPacket(this.playerManager).deserialize(stream);
                    break;
                }
                // TODO: maybe disconnect players that haven't sent a ping in a while?
                case PacketType.Ping: {
                    new PingedPacket(this.playerManager).deserialize(stream);
                    break;
                }
            }
        };

        this.socket.onerror = (): void => {
            this.error = true;

            $("#splash-server-message-text").html("Error joining game.");
            $("#splash-server-message").show();
        };

        // Shut down the Phaser scene when the socket closes
        this.socket.onclose = (): void => {
            if (this.spectating || !this.gameOver) {
                if (this.gameStarted) {
                    $("#splash-ui").fadeIn();
                    $("#splash-server-message-text").html("Connection lost.");
                    $("#splash-server-message").show();
                    enablePlayButton();
                }
                $("#btn-spectate").addClass("btn-disabled");
                if (!this.error) this.endGame();
            }
        };
    }

    endGame(): void {
        clearTimeout(this.tickTimeoutID);

        $("#game-menu").hide();
        $("#game-over-screen").hide();
        $("canvas").removeClass("active");
        $("#splash-ui").fadeIn();

        this.gameStarted = false;
        this.socket.close();

        // reset stuff
        this.objects.clear();
        this.players.clear();
        this.bullets.clear();
        this.camera.container.removeChildren();

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

    resize(): void {
        this.camera.resize();
    }

    tick = (() => {
        const getPickupBind = (): string => localStorageInstance.config.keybinds.interact[0];

        let skipLootCheck = true;
        /*
            Context: rerendering ui elements needlessly is bad, so we
            determine the information that should trigger a re-render if
            changed, and cache them in order to detect such changes

            In the case of the pickup message thingy, those informations are:
            - the item the pickup message concerns
            - its quantity
            - the bind to interact has changed
            - whether the user can interact with it
        */
        const cache: {
            object?: Loot | Obstacle
            offset?: number
            pickupBind?: string
            canInteract?: boolean
            readonly clear: () => void
            readonly pickupBindIsValid: () => boolean
        } = {
            clear() {
                this.object = this.pickupBind = undefined;
            },
            pickupBindIsValid() {
                return getPickupBind() === this.pickupBind;
            }
        };
        /**
         * When a bind is changed, the corresponding html won't
         * get changed because rendering only occurs when an item
         * is interactable. We thus store whether the intent to
         * change was acknowledged here.
         */
        let bindChangeAcknowledged = false;

        return (): void => {
            if (!this.gameStarted || (this.gameOver && !this.spectating)) return;

            if (this.playerManager.dirty.inputs) {
                this.playerManager.dirty.inputs = false;
                this.sendPacket(new InputPacket(this.playerManager));
            }

            skipLootCheck = !skipLootCheck;
            if (skipLootCheck) return;

            // Loop through all loot objects to check if the player is colliding with one to show the interact message
            let minDist = Number.MAX_VALUE;
            let closestObject: Loot | Obstacle | undefined;
            let canInteract: boolean | undefined;
            const player = this.activePlayer;
            const doorDetectionHitbox = new CircleHitbox(3, player.position);

            player.floorType = FloorType.Grass;

            for (const o of this.objects) {
                const object = o[1];
                if (object instanceof Obstacle && object.isDoor && !object.destroyed) {
                    const record: CollisionRecord | undefined = object.door?.hitbox?.distanceTo(doorDetectionHitbox);
                    const dist = distanceSquared(object.position, player.position);
                    if (dist < minDist && record?.collided) {
                        minDist = dist;
                        closestObject = object;
                        canInteract = !object.dead;
                    }
                } else if (object instanceof Loot) {
                    const dist = distanceSquared(object.position, player.position);
                    if (dist < minDist && circleCollision(player.position, 3, object.position, object.radius)) {
                        minDist = dist;
                        closestObject = object;
                        canInteract = closestObject.canInteract(this.playerManager);
                    }
                } else if (object instanceof Building) {
                    if (!object.dead) object.toggleCeiling(!object.ceilingHitbox?.collidesWith(player.hitBox));

                    for (const floor of object.floors) {
                        if (floor.hitbox.collidesWith(player.hitBox)) {
                            player.floorType = floor.type;
                            break;
                        }
                    }
                }
            }

            const getOffset = (): number | undefined => closestObject instanceof Obstacle ? closestObject.door?.offset : undefined;

            const differences = {
                object: cache.object?.id !== closestObject?.id,
                offset: cache.offset !== getOffset(),
                bind: !cache.pickupBindIsValid(),
                canInteract: cache.canInteract !== canInteract
            };

            if (differences.bind) bindChangeAcknowledged = false;

            if (
                differences.object ||
                differences.offset ||
                differences.bind ||
                differences.canInteract
            ) {
                // Cache miss, rerender
                cache.clear();
                cache.object = closestObject;
                cache.offset = getOffset();
                cache.pickupBind = getPickupBind();
                cache.canInteract = canInteract;

                if (closestObject !== undefined) {
                    const prepareInteractText = (): void => {
                        if (
                            closestObject === undefined ||

                            // If the loot object hasn't changed, we don't need to redo the text
                            !(differences.object || differences.offset)
                        ) return;

                        let interactText = "";
                        if (closestObject instanceof Obstacle) interactText += closestObject.door?.offset === 0 ? "Open " : "Close ";
                        interactText += closestObject.type.definition.name;
                        if (closestObject instanceof Loot && closestObject.count > 1) interactText += ` (${closestObject.count})`;
                        $("#interact-text").text(interactText);
                    };

                    if (this.playerManager.isMobile) {
                        const lootDef = closestObject.type.definition;

                        // Autoloot
                        if (
                            closestObject instanceof Loot && "itemType" in lootDef &&
                            ((lootDef.itemType !== ItemType.Gun && lootDef.itemType !== ItemType.Melee) ||
                            (lootDef.itemType === ItemType.Gun && (!this.playerManager.weapons[0] || !this.playerManager.weapons[1])))
                        ) {
                            this.playerManager.interact();
                        } else if (
                            (closestObject instanceof Loot && "itemType" in lootDef && (lootDef.itemType === ItemType.Gun || lootDef.itemType === ItemType.Melee)) ||
                            closestObject instanceof Obstacle
                        ) {
                            prepareInteractText();

                            if (canInteract) {
                                $("#interact-key").html('<img src="/img/misc/tap-icon.svg" alt="Tap">').addClass("active").show();
                            } else {
                                $("#interact-key").removeClass("active").hide();
                            }
                            $("#interact-message").show();
                            return;
                        }

                        $("#interact-message").hide();
                    } else {
                        prepareInteractText();

                        if (!bindChangeAcknowledged) {
                            bindChangeAcknowledged = true;

                            const input = getPickupBind();
                            const icon = getIconFromInputName(input);

                            if (icon === undefined) {
                                $("#interact-key").text(input);
                            } else {
                                $("#interact-key").html(`<img src="${icon}" alt="${input}"/>`);
                            }
                        }

                        if (canInteract) {
                            $("#interact-key").addClass("active").show();
                        } else {
                            $("#interact-key").removeClass("active").hide();
                        }

                        $("#interact-message").show();
                    }
                } else {
                    $("#interact-message").hide();
                }
            }
        };
    })();
}
