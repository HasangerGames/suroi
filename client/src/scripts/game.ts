import $ from "jquery";

import { type Application, Container } from "pixi.js";
import { ObjectCategory, PacketType, PlayerActions, TICKS_PER_SECOND, ZIndexes } from "../../../common/src/constants";
import { Scopes } from "../../../common/src/definitions/scopes";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { circleCollision, type CollisionRecord, distanceSquared } from "../../../common/src/utils/math";
import { ItemType, ObstacleSpecialRoles } from "../../../common/src/utils/objectDefinitions";
import { ObjectPool } from "../../../common/src/utils/objectPool";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { enablePlayButton } from "./main";
import { Building } from "./objects/building";
import { type Bullet } from "./objects/bullet";
import { DeathMarker } from "./objects/deathMarker";
import { Decal } from "./objects/decal";
import { Loot } from "./objects/loot";
import { Obstacle } from "./objects/obstacle";
import { ParticleManager } from "./objects/particles";
import { Player } from "./objects/player";
import { GameOverPacket, gameOverScreenTimeout } from "./packets/receiving/gameOverPacket";
import { JoinedPacket } from "./packets/receiving/joinedPacket";
import { KillPacket } from "./packets/receiving/killPacket";
import { KillFeedPacket } from "./packets/receiving/killFeedPacket";
import { PingedPacket } from "./packets/receiving/pingedPacket";
import { PingPacket } from "./packets/sending/pingPacket";
import { type SendingPacket } from "./types/sendingPacket";
import { type GameObject } from "./types/gameObject";

import { PlayerManager } from "./utils/playerManager";
import { MapPacket } from "./packets/receiving/mapPacket";
import { PickupPacket } from "./packets/receiving/pickupPacket";
import { PIXI_SCALE, UI_DEBUG_MODE } from "./utils/constants";
import { ReportPacket } from "./packets/receiving/reportPacket";
import { JoinPacket } from "./packets/sending/joinPacket";
import { InputPacket } from "./packets/sending/inputPacket";
import { getIconFromInputName } from "./utils/inputManager";
import { Camera } from "./rendering/camera";
import { SoundManager } from "./utils/soundManager";
import { Gas } from "./rendering/gas";
import { Minimap } from "./rendering/map";
import { type Tween } from "./utils/tween";
import { consoleVariables } from "./utils/console/variables";
import { UpdatePacket } from "./packets/receiving/updatePacket";
import { keybinds } from "./utils/console/gameConsole";
import { type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { type LootDefinition } from "../../../common/src/definitions/loots";
import { type BuildingDefinition } from "../../../common/src/definitions/buildings";

export class Game {
    socket!: WebSocket;

    readonly objects = new ObjectPool<GameObject>();
    readonly players = new ObjectPool<Player>();
    readonly loots = new Set<Loot>();
    readonly bullets = new Set<Bullet>();

    activePlayerID = -1;
    get activePlayer(): Player | undefined {
        return this.objects.get(this.activePlayerID) as Player;
    }

    gameStarted = false;
    gameOver = false;
    spectating = false;
    error = false;

    private _playerManager = new PlayerManager(this);
    get playerManager(): PlayerManager { return this._playerManager; }

    lastPingDate = Date.now();

    private _tickTimeoutID: number | undefined;

    gas!: Gas;

    readonly pixi: Application;
    readonly soundManager = new SoundManager();
    readonly particleManager = new ParticleManager(this);
    readonly map: Minimap;
    readonly camera: Camera;

    // Since all players and bullets have the same zIndex
    // Add all to a container so pixi has to do less sorting of zIndexes
    readonly playersContainer = new Container();
    readonly bulletsContainer = new Container();

    readonly music = new Howl({ src: consoleVariables.get.builtIn("cv_use_old_menu_music").value ? "./audio/music/old_menu_music.mp3" : "./audio/music/menu_music.mp3", loop: true });
    musicPlaying = false;

    readonly tweens = new Set<Tween<unknown>>();

    constructor(pixi: Application) {
        this.pixi = pixi;

        this.pixi.ticker.add(this.render.bind(this));

        this.camera = new Camera(this);
        this.map = new Minimap(this);

        this.playersContainer.zIndex = ZIndexes.Players;
        this.bulletsContainer.zIndex = ZIndexes.Bullets;

        setInterval(() => {
            if (consoleVariables.get.builtIn("pf_show_fps").value) {
                $("#fps-counter").text(`${Math.round(this.pixi.ticker.FPS)} fps`);
            }
        }, 500);

        if (!this.musicPlaying) {
            const musicVolume = consoleVariables.get.builtIn("cv_music_volume").value;

            this.music.play();
            this.music.volume(musicVolume);
            this.musicPlaying = true;
        }
    }

    connect(address: string): void {
        this.error = false;

        if (this.gameStarted) return;

        this.socket = new WebSocket(address);
        this.socket.binaryType = "arraybuffer";

        this.socket.onopen = (): void => {
            this.music.stop();
            this.musicPlaying = false;
            this.gameStarted = true;
            this.gameOver = false;
            this.spectating = false;

            if (!UI_DEBUG_MODE) {
                clearTimeout(gameOverScreenTimeout);
                $("#game-over-overlay").hide();
                $("#kill-msg").hide();
                $("#ui-kills").text("0");
                $("#kill-feed").html("");
                $("#spectating-msg").hide();
                $("#spectating-buttons-container").hide();
                $("#joysticks-containers").show();
            }
            this.sendPacket(new PingPacket(this._playerManager));
            this.sendPacket(new JoinPacket(this._playerManager));

            this.gas = new Gas(PIXI_SCALE, this.camera.container);
            this.camera.addObject(this.playersContainer, this.bulletsContainer);

            this.map.indicator.setFrame("player_indicator");

            this._tickTimeoutID = window.setInterval(this.tick.bind(this), TICKS_PER_SECOND);
        };

        // Handle incoming messages
        this.socket.onmessage = (message: MessageEvent): void => {
            const stream = new SuroiBitStream(message.data);
            switch (stream.readPacketType()) {
                case PacketType.Joined: {
                    new JoinedPacket(this._playerManager).deserialize(stream);
                    break;
                }
                case PacketType.Map: {
                    const mapPacket = new MapPacket(this.playerManager);
                    mapPacket.deserialize(stream);
                    this.map.updateFromPacket(mapPacket);
                    break;
                }
                case PacketType.Update: {
                    const packet = new UpdatePacket(this._playerManager);
                    packet.deserialize(stream);
                    this.processUpdate(packet);
                    break;
                }
                case PacketType.GameOver: {
                    new GameOverPacket(this._playerManager).deserialize(stream);
                    break;
                }
                case PacketType.Kill: {
                    new KillPacket(this._playerManager).deserialize(stream);
                    break;
                }
                case PacketType.KillFeed: {
                    new KillFeedPacket(this._playerManager).deserialize(stream);
                    break;
                }
                case PacketType.Pickup: {
                    new PickupPacket(this._playerManager).deserialize(stream);
                    break;
                }
                case PacketType.Report: {
                    new ReportPacket(this._playerManager).deserialize(stream);
                    break;
                }
                // TODO: maybe disconnect players that haven't sent a ping in a while?
                case PacketType.Ping: {
                    new PingedPacket(this._playerManager).deserialize(stream);
                    break;
                }
            }
        };

        this.socket.onerror = (): void => {
            this.error = true;
            $("#splash-server-message-text").html("Error joining game.");
            $("#splash-server-message").show();
            enablePlayButton();
        };

        this.socket.onclose = (): void => {
            enablePlayButton();
            if (!this.spectating && !this.gameOver) {
                if (this.gameStarted) {
                    $("#splash-ui").fadeIn();
                    $("#splash-server-message-text").html("Connection lost.");
                    $("#splash-server-message").show();
                }
                $("#btn-spectate").addClass("btn-disabled");
                if (!this.error) this.endGame(true);
            }
        };
    }

    endGame(transition: boolean): void {
        clearTimeout(this._tickTimeoutID);

        if (this.activePlayer?.actionSound) {
            this.soundManager.stop(this.activePlayer.actionSound);
        }

        $("#action-container").hide();
        $("#game-menu").hide();
        $("#game-over-overlay").hide();
        $("canvas").removeClass("active");
        $("#kill-leader-leader").text("Waiting for leader");
        $("#kill-leader-kills-counter").text("0");
        if (transition) $("#splash-ui").fadeIn();

        this.gameStarted = false;
        this.socket.close();

        // reset stuff
        for (const object of this.objects) object.destroy();
        this.objects.clear();
        this.players.clear();
        this.bullets.clear();
        this.camera.container.removeChildren();
        this.playersContainer.removeChildren();
        this.bulletsContainer.removeChildren();
        this.particleManager.clear();
        this.map.gasGraphics.clear();
        this.loots.clear();

        this.camera.zoom = Scopes[0].zoomLevel;

        this._playerManager = new PlayerManager(this);

        if (!this.musicPlaying) {
            this.music.stop().play();
            this.music.volume(consoleVariables.get.builtIn("cv_music_volume").value);
            this.musicPlaying = true;
        }
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

    render(): void {
        if (!this.gameStarted) return;
        const delta = this.pixi.ticker.deltaMS;

        if (consoleVariables.get.builtIn("cv_movement_smoothing").value) {
            for (const player of this.players) {
                player.updateContainerPosition();
                if (
                    consoleVariables.get.builtIn("cv_rotation_smoothing").value &&
                    !(player.isActivePlayer && consoleVariables.get.builtIn("cv_animate_rotation").value === "client")
                ) player.updateContainerRotation();
            }

            for (const loot of this.loots) loot.updateContainerPosition();

            if (this.activePlayer) {
                this.camera.position = this.activePlayer.container.position;
            }
        }

        for (const tween of this.tweens) {
            tween.update();
        }

        for (const bullet of this.bullets) {
            bullet.update(delta);
        }

        this.particleManager.update(delta);

        this.map.update();
        this.gas.update();

        this.camera.update();
    }

    processUpdate(updateData: UpdatePacket): void {
        for (const { id, type, data } of updateData.fullDirtyObjects) {
            let object: GameObject | undefined = this.objects.get(id);

            if (object === undefined || object.destroyed) {
                switch (type.category) {
                    case ObjectCategory.Player: {
                        object = new Player(this, id);
                        this.players.add(object as Player);
                        break;
                    }
                    case ObjectCategory.Obstacle: {
                        object = new Obstacle(this, type.definition as ObstacleDefinition, id);
                        break;
                    }
                    case ObjectCategory.DeathMarker: {
                        object = new DeathMarker(this, id);
                        break;
                    }
                    case ObjectCategory.Loot: {
                        object = new Loot(this, type.definition as LootDefinition, id);
                        this.loots.add(object as Loot);
                        break;
                    }
                    case ObjectCategory.Building: {
                        object = new Building(this, type.definition as BuildingDefinition, id);
                        break;
                    }
                    case ObjectCategory.Decal: {
                        object = new Decal(this, type.definition, id);
                        break;
                    }
                }
            }

            if (object) {
                this.objects.add(object);
                object.updateFromData(data);
            }
        }

        for (const { id, data } of updateData.partialDirtyObjects) {
            const object = this.objects.get(id);
            if (object) {
                object.updateFromData(data);
            }
        }
        for (const id of updateData.deletedObjects) {
            const object = this.objects.get(id);
            if (object === undefined) {
                console.warn(`Trying to delete unknown object with ID ${id}`);
                continue;
            }

            object.destroy();
            this.objects.delete(object);

            if (object instanceof Player) {
                this.players.delete(object);
            } else if (object instanceof Loot) {
                this.loots.delete(object);
            }
        }
    }

    tick = (() => {
        const getPickupBind = (): string => keybinds.getInputsBoundToAction("interact")[0];

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

            if (this._playerManager.dirty.inputs) {
                this._playerManager.dirty.inputs = false;
                this.sendPacket(new InputPacket(this._playerManager));
            }

            // Only run interact message and loot checks every other tick
            skipLootCheck = !skipLootCheck;
            if (skipLootCheck) return;
            const player = this.activePlayer;
            if (!player) return;

            // Loop through all loot objects to check if the player is colliding with one to show the interact message
            let minDist = Number.MAX_VALUE;
            let closestObject: Loot | Obstacle | undefined;
            let canInteract: boolean | undefined;
            const doorDetectionHitbox = new CircleHitbox(3, player.position);

            for (const object of this.objects) {
                if (object instanceof Obstacle && object.canInteract(player)) {
                    const record: CollisionRecord | undefined = object.hitbox?.distanceTo(doorDetectionHitbox);
                    const dist = distanceSquared(object.position, player.position); // fixme use of both distanceTo and distanceSquared?
                    if (dist < minDist && record?.collided) {
                        minDist = dist;
                        closestObject = object;
                        canInteract = !object.dead;
                    }
                } else if (object instanceof Loot) {
                    const dist = distanceSquared(object.position, player.position);
                    if (dist < minDist && circleCollision(player.position, 3, object.position, object.hitbox.radius)) {
                        minDist = dist;
                        closestObject = object;
                        canInteract = closestObject.canInteract(this._playerManager);
                    }
                } else if (object instanceof Building) {
                    if (!object.dead) object.toggleCeiling(!object.ceilingHitbox?.collidesWith(player.hitbox));
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
                        if (closestObject instanceof Obstacle) {
                            switch (closestObject.definition.role) {
                                case ObstacleSpecialRoles.Door:
                                    interactText += closestObject.door?.offset === 0 ? "Open " : "Close ";
                                    break;
                                case ObstacleSpecialRoles.Activatable:
                                    interactText += "Activate ";
                                    break;
                            }
                        }
                        interactText += closestObject.definition.name;
                        if (closestObject instanceof Loot && closestObject.count > 1) interactText += ` (${closestObject.count})`;
                        $("#interact-text").text(interactText);
                    };

                    if (this._playerManager.isMobile) {
                        const lootDef = closestObject.definition;

                        // Auto open doors
                        if (closestObject instanceof Obstacle && closestObject.canInteract(player) && closestObject.door?.offset === 0) {
                            this.playerManager.interact();
                        }

                        // Autoloot
                        if (
                            closestObject instanceof Loot && "itemType" in lootDef &&
                            (
                                (lootDef.itemType !== ItemType.Gun && lootDef.itemType !== ItemType.Melee) ||
                                (lootDef.itemType === ItemType.Gun && (!this._playerManager.weapons[0] || !this._playerManager.weapons[1]))
                            )
                        ) {
                            // TODO Needs testing
                            if (lootDef.itemType !== ItemType.Gun || player.action.type !== PlayerActions.Reload) this.playerManager.interact();
                        } else if (
                            (
                                closestObject instanceof Loot &&
                                "itemType" in lootDef &&
                                (lootDef.itemType === ItemType.Gun || lootDef.itemType === ItemType.Melee)
                            ) ||
                            closestObject instanceof Obstacle
                        ) {
                            prepareInteractText();

                            if (canInteract) {
                                // noinspection HtmlUnknownTarget
                                $("#interact-key").html('<img src="./img/misc/tap-icon.svg" alt="Tap">').addClass("active").show();
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
