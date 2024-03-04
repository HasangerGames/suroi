import { sound, type Sound } from "@pixi/sound";
import $ from "jquery";
import { Application, Color } from "pixi.js";
import { GameConstants, InputActions, ObjectCategory, PacketType } from "../../../common/src/constants";
import { ArmorType } from "../../../common/src/definitions/armors";
import { Badges, type BadgeDefinition } from "../../../common/src/definitions/badges";
import { Emotes } from "../../../common/src/definitions/emotes";
import { Loots, type LootDefinition } from "../../../common/src/definitions/loots";
import { Scopes } from "../../../common/src/definitions/scopes";
import { GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { JoinPacket } from "../../../common/src/packets/joinPacket";
import { JoinedPacket } from "../../../common/src/packets/joinedPacket";
import { MapPacket } from "../../../common/src/packets/mapPacket";
import { type Packet } from "../../../common/src/packets/packet";
import { PickupPacket } from "../../../common/src/packets/pickupPacket";
import { PingPacket } from "../../../common/src/packets/pingPacket";
import { ReportPacket } from "../../../common/src/packets/reportPacket";
import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { Geometry } from "../../../common/src/utils/math";
import { Timeout } from "../../../common/src/utils/misc";
import { ItemType, ObstacleSpecialRoles } from "../../../common/src/utils/objectDefinitions";
import { ObjectPool } from "../../../common/src/utils/objectPool";
import { type FullData } from "../../../common/src/utils/objectsSerializations";
import { SuroiBitStream } from "../../../common/src/utils/suroiBitStream";
import { enablePlayButton } from "./main";
import { Building } from "./objects/building";
import { Bullet } from "./objects/bullet";
import { DeathMarker } from "./objects/deathMarker";
import { Decal } from "./objects/decal";
import { explosion } from "./objects/explosion";
import { type GameObject } from "./objects/gameObject";
import { Loot } from "./objects/loot";
import { Obstacle } from "./objects/obstacle";
import { Parachute } from "./objects/parachute";
import { ParticleManager } from "./objects/particles";
import { Plane } from "./objects/plane";
import { Player } from "./objects/player";
import { SyncedParticle } from "./objects/syncedParticle";
import { ThrowableProjectile } from "./objects/throwableProj";
import { Camera } from "./rendering/camera";
import { Gas, GasRender } from "./rendering/gas";
import { Minimap, Ping } from "./rendering/minimap";
import { setupUI } from "./ui";
import { setUpCommands } from "./utils/console/commands";
import { GameConsole } from "./utils/console/gameConsole";
import { COLORS, MODE, PIXI_SCALE, UI_DEBUG_MODE } from "./utils/constants";
import { InputManager } from "./utils/inputManager";
import { SoundManager } from "./utils/soundManager";
import { type Tween } from "./utils/tween";
import { UIManager } from "./utils/uiManager";

interface ObjectClassMapping {
    readonly [ObjectCategory.Player]: typeof Player
    readonly [ObjectCategory.Obstacle]: typeof Obstacle
    readonly [ObjectCategory.DeathMarker]: typeof DeathMarker
    readonly [ObjectCategory.Loot]: typeof Loot
    readonly [ObjectCategory.Building]: typeof Building
    readonly [ObjectCategory.Decal]: typeof Decal
    readonly [ObjectCategory.Parachute]: typeof Parachute
    readonly [ObjectCategory.ThrowableProjectile]: typeof ThrowableProjectile
    readonly [ObjectCategory.SyncedParticle]: typeof SyncedParticle
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
const ObjectClassMapping: ObjectClassMapping = {
    [ObjectCategory.Player]: Player,
    [ObjectCategory.Obstacle]: Obstacle,
    [ObjectCategory.DeathMarker]: DeathMarker,
    [ObjectCategory.Loot]: Loot,
    [ObjectCategory.Building]: Building,
    [ObjectCategory.Decal]: Decal,
    [ObjectCategory.Parachute]: Parachute,
    [ObjectCategory.ThrowableProjectile]: ThrowableProjectile,
    [ObjectCategory.SyncedParticle]: SyncedParticle
};

type ObjectMapping = {
    readonly [Cat in keyof ObjectClassMapping]: InstanceType<ObjectClassMapping[Cat]>
};

export class Game {
    private _socket?: WebSocket;

    readonly objects = new ObjectPool<ObjectMapping>();
    readonly bullets = new Set<Bullet>();
    readonly planes = new Set<Plane>();

    readonly playerNames = new Map<number, {
        readonly name: string
        readonly hasColor: boolean
        readonly nameColor: Color
        readonly badge?: BadgeDefinition
    }>();

    activePlayerID = -1;
    get activePlayer(): Player | undefined {
        return this.objects.get(this.activePlayerID) as Player;
    }

    gameStarted = false;
    gameOver = false;
    spectating = false;
    error = false;

    uiManager = new UIManager(this);

    lastPingDate = 0;

    private _tickTimeoutID: number | undefined;

    readonly pixi: Application<HTMLCanvasElement>;
    readonly soundManager: SoundManager;
    readonly particleManager = new ParticleManager(this);
    readonly map: Minimap;
    readonly camera: Camera;
    readonly console = new GameConsole(this);
    readonly inputManager = new InputManager(this);

    readonly gasRender = new GasRender(PIXI_SCALE);
    readonly gas = new Gas(this);

    readonly music: Sound;

    readonly tweens = new Set<Tween<unknown>>();

    private readonly _timeouts = new Set<Timeout>();

    addTimeout(callback: () => void, delay?: number): Timeout {
        const timeout = new Timeout(callback, Date.now() + (delay ?? 0));
        this._timeouts.add(timeout);
        return timeout;
    }

    constructor() {
        this.console.readFromLocalStorage();
        this.inputManager.setupInputs();

        // Initialize the Application object
        this.pixi = new Application({
            resizeTo: window,
            background: COLORS.grass,
            antialias: this.console.getBuiltInCVar("cv_antialias"),
            autoDensity: true,
            resolution: window.devicePixelRatio || 1
        });

        $("#game").append(this.pixi.view);

        this.pixi.ticker.add(this.render.bind(this));

        setUpCommands(this);
        this.soundManager = new SoundManager(this);
        this.inputManager.generateBindsConfigScreen();

        setupUI(this);

        this.camera = new Camera(this);
        this.map = new Minimap(this);

        this.music = sound.add("menu_music", {
            url: `./audio/music/menu_music${this.console.getBuiltInCVar("cv_use_old_menu_music") ? "_old" : MODE.specialMenuMusic ? `_${MODE.idString}` : ""}.mp3`,
            singleInstance: true,
            preload: true,
            autoPlay: true,
            volume: this.console.getBuiltInCVar("cv_music_volume")
        });

        setInterval(() => {
            if (this.console.getBuiltInCVar("pf_show_fps")) {
                $("#fps-counter").text(`${Math.round(this.pixi.ticker.FPS)} fps`);
            }
        }, 500);
    }

    connect(address: string): void {
        this.error = false;

        if (this.gameStarted) return;

        this._socket = new WebSocket(address);
        this._socket.binaryType = "arraybuffer";

        this._socket.onopen = (): void => {
            this.music.stop();
            this.gameStarted = true;
            this.gameOver = false;
            this.spectating = false;

            if (!UI_DEBUG_MODE) {
                clearTimeout(this.uiManager.gameOverScreenTimeout);
                $("#game-over-overlay").hide();
                $("#kill-msg").hide();
                $("#ui-kills").text("0");
                $("#kill-feed").html("");
                $("#spectating-container").hide();
                $("#joysticks-containers").show();
            }

            this.sendPacket(new PingPacket());
            this.lastPingDate = Date.now();

            const joinPacket = new JoinPacket();
            joinPacket.isMobile = this.inputManager.isMobile;
            joinPacket.name = this.console.getBuiltInCVar("cv_player_name");
            joinPacket.skin = Loots.fromString(this.console.getBuiltInCVar("cv_loadout_skin"));

            const badge = this.console.getBuiltInCVar("cv_loadout_badge");
            if (badge) {
                joinPacket.badge = Badges.fromString(badge);
            }

            for (const emote of ["top", "right", "bottom", "left", "death", "win"] as const) {
                joinPacket.emotes.push(Emotes.fromString(this.console.getBuiltInCVar(`cv_loadout_${emote}_emote`)));
            }

            this.sendPacket(joinPacket);

            this.camera.addObject(this.gasRender.graphics);

            this.map.indicator.setFrame("player_indicator");

            this._tickTimeoutID = window.setInterval(this.tick.bind(this), GameConstants.msPerTick);
        };

        // Handle incoming messages
        this._socket.onmessage = (message: MessageEvent<ArrayBuffer>): void => {
            const stream = new SuroiBitStream(message.data);
            switch (stream.readPacketType()) {
                case PacketType.Joined: {
                    const packet = new JoinedPacket();
                    packet.deserialize(stream);
                    this.startGame(packet);
                    break;
                }
                case PacketType.Map: {
                    const packet = new MapPacket();
                    packet.deserialize(stream);
                    this.map.updateFromPacket(packet);
                    break;
                }
                case PacketType.Update: {
                    const packet = new UpdatePacket();
                    packet.previousData = this.uiManager;
                    packet.deserialize(stream);
                    this.processUpdate(packet);
                    break;
                }
                case PacketType.GameOver: {
                    const packet = new GameOverPacket();
                    packet.deserialize(stream);
                    this.uiManager.showGameOverScreen(packet);
                    break;
                }
                case PacketType.Ping: {
                    const ping = Date.now() - this.lastPingDate;
                    $("#ping-counter").text(`${ping} ms`);
                    setTimeout((): void => {
                        this.sendPacket(new PingPacket());
                        this.lastPingDate = Date.now();
                    }, 5000);
                    break;
                }
                case PacketType.Report: {
                    const packet = new ReportPacket();
                    packet.deserialize(stream);
                    $("#reporting-name").text(packet.playerName);
                    $("#report-id").text(packet.reportID);
                    $("#report-modal").fadeIn(250);
                    break;
                }
                case PacketType.Pickup: {
                    const packet = new PickupPacket();
                    packet.deserialize(stream);

                    let soundID: string;
                    switch (packet.item.itemType) {
                        case ItemType.Ammo:
                            soundID = "ammo_pickup";
                            break;
                        case ItemType.Healing:
                            soundID = `${packet.item.idString}_pickup`;
                            break;
                        case ItemType.Scope:
                            soundID = "scope_pickup";
                            break;
                        case ItemType.Armor:
                            if (packet.item.armorType === ArmorType.Helmet) soundID = "helmet_pickup";
                            else soundID = "vest_pickup";
                            break;
                        case ItemType.Backpack:
                            soundID = "backpack_pickup";
                            break;
                        case ItemType.Throwable:
                            soundID = "throwable_pickup";
                            break;
                        default:
                            soundID = "pickup";
                            break;
                    }

                    this.soundManager.play(soundID);
                    break;
                }
            }
        };

        this._socket.onerror = (): void => {
            this.error = true;
            $("#splash-server-message-text").html("Error joining game.");
            $("#splash-server-message").show();
            enablePlayButton();
        };

        this._socket.onclose = (): void => {
            enablePlayButton();
            if (!this.gameOver) {
                if (this.gameStarted) {
                    $("#splash-ui").fadeIn();
                    $("#splash-server-message-text").html("Connection lost.");
                    $("#splash-server-message").show();
                }
                $("#btn-spectate").addClass("btn-disabled");
                if (!this.error) this.endGame();
            }
        };
    }

    startGame(packet: JoinedPacket): void {
        if (packet.protocolVersion !== GameConstants.protocolVersion) {
            alert("Invalid game version.");
            // reload the page with a time stamp to try clearing cache
            location.search = `t=${Date.now()}`;
        }

        const selectors = [".emote-top", ".emote-right", ".emote-bottom", ".emote-left"];
        for (let i = 0; i < 4; i++) {
            $(`#emote-wheel > ${selectors[i]}`)
                .css(
                    "background-image",
                    `url("./img/game/emotes/${packet.emotes[i].idString}.svg")`
                );
        }

        $("canvas").addClass("active");
        $("#splash-ui").fadeOut(enablePlayButton);

        $("#kill-leader-leader").html("Waiting for leader");
        $("#kill-leader-kills-counter").text("0");
        $("#btn-spectate-kill-leader").hide();
    }

    endGame(): void {
        clearTimeout(this._tickTimeoutID);

        this.soundManager.stopAll();

        $("#action-container").hide();
        $("#game-menu").hide();
        $("#game-over-overlay").hide();
        $("canvas").removeClass("active");
        $("#kill-leader-leader").text("Waiting for leader");
        $("#kill-leader-kills-counter").text("0");
        $("#splash-ui").fadeIn();

        this.gameStarted = false;
        this._socket?.close();

        // reset stuff
        for (const object of this.objects) object.destroy();
        for (const plane of this.planes) plane.destroy();
        this.objects.clear();
        this.bullets.clear();
        this.planes.clear();
        this.camera.container.removeChildren();
        this.particleManager.clear();
        this.map.gasGraphics.clear();
        this.map.pingGraphics.clear();
        this.map.pings.clear();
        this.map.pingsContainer.removeChildren();
        this.playerNames.clear();
        this._timeouts.clear();

        this.camera.zoom = Scopes.definitions[0].zoomLevel;

        void this.music.play();
    }

    sendPacket(packet: Packet): void {
        packet.serialize();
        this.sendData(packet.getBuffer());
    }

    sendData(buffer: ArrayBuffer): void {
        try {
            this._socket?.send(buffer);
        } catch (e) {
            console.warn("Error sending packet. Details:", e);
        }
    }

    render(): void {
        if (!this.gameStarted) return;
        const delta = this.pixi.ticker.deltaMS;

        // execute timeouts
        const now = Date.now();
        for (const timeout of this._timeouts) {
            if (timeout.killed) {
                this._timeouts.delete(timeout);
                continue;
            }
            if (now > timeout.end) {
                timeout.callback();
                this._timeouts.delete(timeout);
            }
        }

        if (this.console.getBuiltInCVar("cv_movement_smoothing")) {
            for (const player of this.objects.getCategory(ObjectCategory.Player)) {
                player.updateContainerPosition();
                if (!player.isActivePlayer || !this.console.getBuiltInCVar("cv_responsive_rotation") || this.spectating) {
                    player.updateContainerRotation();
                }
            }

            if (this.activePlayer) {
                this.camera.position = this.activePlayer.container.position;
            }

            for (const loot of this.objects.getCategory(ObjectCategory.Loot)) {
                loot.updateContainerPosition();
            }

            for (const projectile of this.objects.getCategory(ObjectCategory.ThrowableProjectile)) {
                projectile.updateContainerPosition();
                projectile.updateContainerRotation();
            }

            for (const syncedParticle of this.objects.getCategory(ObjectCategory.SyncedParticle)) {
                syncedParticle.updateContainerPosition();
                syncedParticle.updateContainerRotation();
                syncedParticle.updateContainerScale();
            }
        }

        for (const tween of this.tweens) tween.update();

        for (const bullet of this.bullets) bullet.update(delta);

        this.particleManager.update(delta);

        this.map.update();
        this.gasRender.update(this.gas);

        for (const plane of this.planes) plane.update();

        this.camera.update();
    }

    processUpdate(updateData: UpdatePacket): void {
        for (const newPlayer of updateData.newPlayers) {
            this.playerNames.set(newPlayer.id, {
                name: newPlayer.name,
                hasColor: newPlayer.hasColor,
                nameColor: new Color(newPlayer.nameColor),
                badge: newPlayer.loadout.badge
            });
        }

        const playerData = updateData.playerData;
        if (playerData) this.uiManager.updateUI(playerData);

        for (const deletedPlayerId of updateData.deletedPlayers) {
            this.playerNames.delete(deletedPlayerId);
        }

        for (const { id, type, data } of updateData.fullDirtyObjects) {
            const object: GameObject | undefined = this.objects.get(id);

            if (object === undefined || object.destroyed) {
                type K = typeof type;
                this.objects.add(
                    new (
                        ObjectClassMapping[type] as (new (game: Game, id: number, data: FullData<K>) => ObjectMapping[K])
                    )(this, id, data)
                );
            }

            if (object) {
                object.updateFromData(data, false);
            }
        }

        for (const { id, data } of updateData.partialDirtyObjects) {
            const object = this.objects.get(id);
            if (object) {
                (object as GameObject).updateFromData(data, false);
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
        }

        for (const bullet of updateData.deserializedBullets) {
            this.bullets.add(new Bullet(this, bullet));
        }

        for (const explosionData of updateData.explosions) {
            explosion(this, explosionData.definition, explosionData.position);
        }

        for (const emote of updateData.emotes) {
            const player = this.objects.get(emote.playerID);
            if (player instanceof Player) {
                player.emote(emote.definition);
            } else {
                console.warn(`Tried to emote on behalf of ${player === undefined ? "a non-existant player" : `a/an ${ObjectCategory[player.type]}`}`);
            }
        }

        this.gas.updateFrom(updateData);

        if (updateData.aliveCount !== undefined) {
            $("#ui-players-alive").text(updateData.aliveCount);
            $("#btn-spectate").toggle(updateData.aliveCount > 1);
        }

        for (const message of updateData.killFeedMessages) {
            this.uiManager.processKillFeedMessage(message);
        }

        for (const plane of updateData.planes) {
            this.planes.add(new Plane(this, plane.position, plane.direction));
        }

        for (const ping of updateData.mapPings) {
            this.soundManager.play("airdrop_ping");
            this.map.pings.add(new Ping(ping));
        }
    }

    // yes this might seem evil. but the two local variables really only need to
    // exist so this method can use them: therefore, making them attributes on the
    // enclosing instance is pointless and might induce people into thinking they
    // can use them to do something when they probably can't and shouldn't
    readonly tick = (() => {
        /**
         * Context: rerendering ui elements needlessly is bad, so we
         * determine the information that should trigger a re-render if
         * changed, and cache them in order to detect such changes
         *
         * In the case of the pickup message thingy, those informations are:
         * - the item the pickup message concerns
         * - its quantity
         * - the bind to interact has changed
         * - whether the user can interact with it
        */
        const cache: {
            object?: Loot | Obstacle
            offset?: number
            isAction?: boolean
            bind?: string
            canInteract?: boolean
        } = {};

        /**
         * When a bind is changed, the corresponding html won't
         * get changed because rendering only occurs when an item
         * is interactable. We thus store whether the intent to
         * change was acknowledged here.
         */
        let bindChangeAcknowledged = false;

        return () => {
            if (!this.gameStarted || (this.gameOver && !this.spectating)) return;
            this.inputManager.update();
            this.soundManager.update();

            const player = this.activePlayer;
            if (!player) return;

            for (const building of this.objects.getCategory(ObjectCategory.Building)) {
                building.toggleCeiling();
            }

            const isAction = this.uiManager.action.active;
            let canInteract = true;

            if (isAction) {
                this.uiManager.updateAction();
            }

            interface CloseObject {
                object?: Loot | Obstacle
                minDist: number
            }

            const interactable: CloseObject = {
                object: undefined,
                minDist: Number.MAX_VALUE
            };
            const uninteractable: CloseObject = {
                object: undefined,
                minDist: Number.MAX_VALUE
            };
            const detectionHitbox = new CircleHitbox(3, player.position);

            for (const object of this.objects) {
                if (
                    (object instanceof Loot || (object instanceof Obstacle && object.canInteract(player))) &&
                    object.hitbox.collidesWith(detectionHitbox)
                ) {
                    const dist = Geometry.distanceSquared(object.position, player.position);
                    if ((object instanceof Obstacle || object.canInteract(player)) && dist < interactable.minDist) {
                        interactable.minDist = dist;
                        interactable.object = object;
                    } else if (object instanceof Loot && dist < uninteractable.minDist) {
                        uninteractable.minDist = dist;
                        uninteractable.object = object;
                    }
                }
            }

            const object = interactable.object ?? uninteractable.object;
            const offset = object instanceof Obstacle ? object.door?.offset : undefined;
            canInteract = interactable.object !== undefined;

            const bind = this.inputManager.binds.getInputsBoundToAction(object === undefined ? "cancel_action" : "interact")[0];

            const differences = {
                object: cache.object?.id !== object?.id,
                offset: cache.offset !== offset,
                isAction: cache.isAction !== isAction,
                bind: cache.bind !== bind,
                canInteract: cache.canInteract !== canInteract
            };

            if (differences.bind) bindChangeAcknowledged = false;

            if (
                differences.object ||
                differences.offset ||
                differences.isAction ||
                differences.bind ||
                differences.canInteract
            ) {
                // Cache miss, rerender
                cache.object = object;
                cache.offset = offset;
                cache.isAction = isAction;
                cache.bind = bind;
                cache.canInteract = canInteract;

                const { interactKey, interactMsg } = this.uiManager.ui;
                const type = (object?.definition as LootDefinition)?.itemType;

                // Update interact message
                if (
                    (
                        this.inputManager.isMobile
                            // Only show interact message on mobile if object needs to be tapped to pick up
                            ? (object instanceof Loot || object instanceof Obstacle)
                            : object !== undefined
                    ) ||
                    isAction
                ) {
                    // If the loot object hasn't changed, we don't need to redo the text
                    if (differences.object || differences.offset || differences.isAction) {
                        let interactText;
                        switch (true) {
                            case object instanceof Obstacle: {
                                switch (object.definition.role) {
                                    case ObstacleSpecialRoles.Door:
                                        interactText = object.door?.offset === 0 ? "Open Door" : "Close Door";
                                        break;
                                    case ObstacleSpecialRoles.Activatable:
                                        interactText = `${object.definition.interactText} ${object.definition.name}`;
                                        break;
                                }
                                break;
                            }
                            case object instanceof Loot: {
                                interactText = `${object.definition.name}${object.count > 1 ? ` (${object.count})` : ""}`;
                                break;
                            }
                            case isAction: {
                                interactText = "Cancel";
                                break;
                            }
                        }

                        if (interactText) $("#interact-text").text(interactText);
                    }

                    if (!this.inputManager.isMobile && (!bindChangeAcknowledged || (object === undefined && isAction))) {
                        bindChangeAcknowledged = true;

                        const icon = InputManager.getIconFromInputName(bind);

                        if (icon === undefined) {
                            interactKey.text(bind);
                        } else {
                            interactKey.html(`<img src="${icon}" alt="${bind}"/>`);
                        }
                    }

                    if (canInteract || (object === undefined && isAction)) {
                        interactKey.addClass("active").show();
                    } else {
                        interactKey.removeClass("active").hide();
                    }

                    interactMsg.show();
                } else {
                    interactMsg.hide();
                }

                // Mobile stuff
                if (
                    this.inputManager.isMobile &&
                    canInteract &&
                    (
                        ( // Auto pickup
                            object instanceof Loot &&
                            // Only pick up melees if no melee is equipped
                            (type !== ItemType.Melee || this.uiManager.inventory.weapons?.[2]?.definition.idString === "fists") &&
                            // Only pick up guns if there's a free slot
                            (type !== ItemType.Gun || (!this.uiManager.inventory.weapons?.[0] || !this.uiManager.inventory.weapons?.[1])) &&
                            type !== ItemType.Skin
                        ) ||
                        ( // Auto open doors
                            object instanceof Obstacle &&
                            object.canInteract(player) &&
                            object.door?.offset === 0
                        )
                    )
                ) {
                    this.inputManager.addAction(InputActions.Interact);
                }
            }
        };
    })();
}
