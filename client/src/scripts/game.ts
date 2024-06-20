import { sound, type Sound } from "@pixi/sound";
import { Application, Color } from "pixi.js";
import "pixi.js/prepare";
import { InputActions, ObjectCategory, TeamSize } from "../../../common/src/constants";
import { ArmorType } from "../../../common/src/definitions/armors";
import { Badges, type BadgeDefinition } from "../../../common/src/definitions/badges";
import { Emotes } from "../../../common/src/definitions/emotes";
import { type DualGunNarrowing } from "../../../common/src/definitions/guns";
import { Loots } from "../../../common/src/definitions/loots";
import { Scopes } from "../../../common/src/definitions/scopes";
import { DisconnectPacket } from "../../../common/src/packets/disconnectPacket";
import { GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { JoinedPacket } from "../../../common/src/packets/joinedPacket";
import { JoinPacket } from "../../../common/src/packets/joinPacket";
import { KillFeedPacket } from "../../../common/src/packets/killFeedPacket";
import { MapPacket } from "../../../common/src/packets/mapPacket";
import { type Packet } from "../../../common/src/packets/packet";
import { PacketStream } from "../../../common/src/packets/packetStream";
import { PickupPacket } from "../../../common/src/packets/pickupPacket";
import { PingPacket } from "../../../common/src/packets/pingPacket";
import { ReportPacket } from "../../../common/src/packets/reportPacket";
import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { CircleHitbox } from "../../../common/src/utils/hitbox";
import { Geometry } from "../../../common/src/utils/math";
import { Timeout } from "../../../common/src/utils/misc";
import { ItemType, ObstacleSpecialRoles } from "../../../common/src/utils/objectDefinitions";
import { ObjectPool } from "../../../common/src/utils/objectPool";
import { type ObjectsNetData } from "../../../common/src/utils/objectsSerializations";
import { InputManager } from "./managers/inputManager";
import { SoundManager } from "./managers/soundManager";
import { UIManager } from "./managers/uiManager";
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
import { Minimap } from "./rendering/minimap";
import { resetPlayButtons, setUpUI, teamSocket, unlockPlayButtons } from "./ui";
import { setUpCommands } from "./utils/console/commands";
import { defaultClientCVars } from "./utils/console/defaultClientCVars";
import { GameConsole } from "./utils/console/gameConsole";
import { COLORS, MODE, PIXI_SCALE, UI_DEBUG_MODE, emoteSlots } from "./utils/constants";
import { loadTextures } from "./utils/pixi";
import { Tween } from "./utils/tween";

/* eslint-disable @stylistic/indent */

type ObjectClassMapping = {
    readonly [ObjectCategory.Player]: typeof Player
    readonly [ObjectCategory.Obstacle]: typeof Obstacle
    readonly [ObjectCategory.DeathMarker]: typeof DeathMarker
    readonly [ObjectCategory.Loot]: typeof Loot
    readonly [ObjectCategory.Building]: typeof Building
    readonly [ObjectCategory.Decal]: typeof Decal
    readonly [ObjectCategory.Parachute]: typeof Parachute
    readonly [ObjectCategory.ThrowableProjectile]: typeof ThrowableProjectile
    readonly [ObjectCategory.SyncedParticle]: typeof SyncedParticle
};

const ObjectClassMapping: ObjectClassMapping = Object.freeze<{
    readonly [K in ObjectCategory]: new (game: Game, id: number, data: ObjectsNetData[K]) => InstanceType<ObjectClassMapping[K]>
}>({
    [ObjectCategory.Player]: Player,
    [ObjectCategory.Obstacle]: Obstacle,
    [ObjectCategory.DeathMarker]: DeathMarker,
    [ObjectCategory.Loot]: Loot,
    [ObjectCategory.Building]: Building,
    [ObjectCategory.Decal]: Decal,
    [ObjectCategory.Parachute]: Parachute,
    [ObjectCategory.ThrowableProjectile]: ThrowableProjectile,
    [ObjectCategory.SyncedParticle]: SyncedParticle
});

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
    teamID = -1;

    teamMode = false;

    get activePlayer(): Player | undefined {
        return this.objects.get(this.activePlayerID) as Player;
    }

    gameStarted = false;
    gameOver = false;
    spectating = false;
    error = false;

    lastPingDate = 0;

    disconnectReason = "";

    readonly uiManager = new UIManager(this);
    readonly pixi = new Application();
    readonly particleManager = new ParticleManager(this);
    readonly map = new Minimap(this);
    readonly camera = new Camera(this);
    readonly console = new GameConsole(this);
    readonly inputManager = new InputManager(this);
    readonly soundManager = new SoundManager(this);

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

    private static _instantiated = false;
    constructor() {
        if (Game._instantiated) {
            throw new Error("Class 'Game' has already been instantiated.");
        }
        Game._instantiated = true;

        this.console.readFromLocalStorage();
        this.inputManager.setupInputs();

        const initPixi = async(): Promise<void> => {
            const renderMode = this.console.getBuiltInCVar("cv_renderer");
            const renderRes = this.console.getBuiltInCVar("cv_renderer_res");

            await this.pixi.init({
                resizeTo: window,
                background: COLORS.grass,
                antialias: this.console.getBuiltInCVar("cv_antialias"),
                autoDensity: true,
                preferWebGLVersion: renderMode === "webgl1" ? 1 : 2,
                preference: renderMode === "webgpu" ? "webgpu" : "webgl",
                resolution: renderRes === "auto" ? (window.devicePixelRatio || 1) : parseFloat(renderRes),
                hello: true,
                canvas: document.getElementById("game-canvas") as HTMLCanvasElement,
                // we only use pixi click events (to spectate players on click)
                // so other events can be disabled for performance
                eventFeatures: {
                    move: false,
                    globalMove: false,
                    wheel: false,
                    click: true
                }
            });

            const pixi = this.pixi;
            await loadTextures(
                pixi.renderer,
                this.inputManager.isMobile
                    ? this.console.getBuiltInCVar("mb_high_res_textures")
                    : this.console.getBuiltInCVar("cv_high_res_textures")
            );

            // HACK: the game ui covers the canvas
            // so send pointer events manually to make clicking to spectate players work
            this.uiManager.ui.gameUi[0].addEventListener("pointerdown", e => {
                pixi.canvas.dispatchEvent(new PointerEvent("pointerdown", {
                    pointerId: e.pointerId,
                    button: e.button,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenY: e.screenY,
                    screenX: e.screenX
                }));
            });

            pixi.ticker.add(this.render.bind(this));
            pixi.stage.addChild(
                this.camera.container,
                this.map.container,
                this.map.mask
            );

            this.map.visible = !this.console.getBuiltInCVar("cv_minimap_minimized");
            this.map.expanded = this.console.getBuiltInCVar("cv_map_expanded");
            this.uiManager.ui.gameUi.toggle(this.console.getBuiltInCVar("cv_draw_hud"));

            pixi.renderer.on("resize", () => this.resize());
            this.resize();

            setInterval(() => {
                if (this.console.getBuiltInCVar("pf_show_fps")) {
                    this.uiManager.debugReadouts.fps.text(`${Math.round(this.pixi.ticker.FPS)} fps`);
                }
            }, 500);
        };

        void Promise.all([
            initPixi(),
            setUpUI(this)
        ]).then(() => {
            unlockPlayButtons();
            resetPlayButtons();
        });

        setUpCommands(this);
        this.inputManager.generateBindsConfigScreen();

        this.music = sound.add("menu_music", {
            url: `./audio/music/menu_music${this.console.getBuiltInCVar("cv_use_old_menu_music") ? "_old" : MODE.specialMenuMusic ? `_${MODE.idString}` : ""}.mp3`,
            singleInstance: true,
            preload: true,
            autoPlay: true,
            volume: this.console.getBuiltInCVar("cv_music_volume")
        });
    }

    resize(): void {
        this.map.resize();
        this.camera.resize(true);
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
            this.disconnectReason = "";

            if (!UI_DEBUG_MODE) {
                clearTimeout(this.uiManager.gameOverScreenTimeout);
                const ui = this.uiManager.ui;

                ui.gameOverOverlay.hide();
                ui.killMsgModal.hide();
                ui.killMsgCounter.text("0");
                ui.killFeed.html("");
                ui.spectatingContainer.hide();
                ui.joystickContainer.show();
            }

            this.sendPacket(new PingPacket());
            this.lastPingDate = Date.now();

            const joinPacket = new JoinPacket();
            joinPacket.isMobile = this.inputManager.isMobile;
            joinPacket.name = this.console.getBuiltInCVar("cv_player_name");

            let skin: typeof defaultClientCVars["cv_loadout_skin"];
            joinPacket.skin = Loots.fromStringSafe(
                this.console.getBuiltInCVar("cv_loadout_skin")
            ) ?? Loots.fromString(
                typeof (skin = defaultClientCVars.cv_loadout_skin) === "object"
                    ? skin.value
                    : skin
            );

            joinPacket.badge = Badges.fromStringSafe(this.console.getBuiltInCVar("cv_loadout_badge"));

            joinPacket.emotes = emoteSlots.map(
                slot => Emotes.fromStringSafe(this.console.getBuiltInCVar(`cv_loadout_${slot}_emote`))
            );

            this.sendPacket(joinPacket);

            this.camera.addObject(this.gasRender.graphics);

            this.map.indicator.setFrame("player_indicator");
        };

        // Handle incoming messages
        this._socket.onmessage = (message: MessageEvent<ArrayBuffer>): void => {
            const stream = new PacketStream(message.data);
            let iterationCount = 0;
            while (true) {
                if (++iterationCount === 1e3) {
                    console.warn("1000 iterations of packet reading; possible infinite loop");
                }
                const packet = stream.deserializeServerPacket();
                if (packet === undefined) break;
                this.onPacket(packet);
            }
        };

        const ui = this.uiManager.ui;

        this._socket.onerror = (): void => {
            this.error = true;
            ui.splashMsgText.html("Error joining game.");
            ui.splashMsg.show();
            resetPlayButtons();
        };

        this._socket.onclose = (): void => {
            resetPlayButtons();

            const reason = this.disconnectReason || "Connection lost";

            if (!this.gameOver) {
                if (this.gameStarted) {
                    ui.splashUi.fadeIn(400);
                    ui.splashMsgText.html(this.disconnectReason || "Connection lost.");
                    ui.splashMsg.show();
                }
                this.uiManager.ui.btnSpectate.addClass("btn-disabled");
                if (!this.error) void this.endGame();
            }

            if (reason.startsWith("Invalid game version")) {
                alert(reason);
                // reload the page with a time stamp to try clearing cache
                location.search = `t=${Date.now()}`;
            }
        };
    }

    onPacket(packet: Packet): void {
        switch (true) {
            case packet instanceof JoinedPacket:
                this.startGame(packet);
                break;
            case packet instanceof MapPacket:
                this.map.updateFromPacket(packet);
                break;
            case packet instanceof UpdatePacket:
                this.processUpdate(packet);
                break;
            case packet instanceof GameOverPacket:
                this.uiManager.showGameOverScreen(packet);
                break;
            case packet instanceof KillFeedPacket:
                this.uiManager.processKillFeedPacket(packet);
                break;
            case packet instanceof PingPacket: {
                const ping = Date.now() - this.lastPingDate;
                this.uiManager.debugReadouts.ping.text(`${ping} ms`);
                setTimeout((): void => {
                    this.sendPacket(new PingPacket());
                    this.lastPingDate = Date.now();
                }, 5000);
                break;
            }
            case packet instanceof ReportPacket: {
                const ui = this.uiManager.ui;
                ui.reportingName.text(packet.playerName);
                ui.reportingId.text(packet.reportID);
                ui.reportingModal.fadeIn(250);
                break;
            }
            case packet instanceof PickupPacket: {
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
            case packet instanceof DisconnectPacket:
                this.disconnectReason = packet.reason;
                break;
        }
    }

    startGame(packet: JoinedPacket): void {
        // Sound which notifies the player that the
        // game started if page is out of focus.
        if (!document.hasFocus()) this.soundManager.play("join_notification");

        this.uiManager.emotes = packet.emotes;
        this.uiManager.updateEmoteWheel();

        const ui = this.uiManager.ui;

        this.teamID = packet.teamID;
        this.teamMode = packet.maxTeamSize > TeamSize.Solo;

        ui.canvas.addClass("active");
        ui.splashUi.fadeOut(400, resetPlayButtons);

        ui.killLeaderLeader.html("Waiting for leader");
        ui.killLeaderCount.text("0");
        ui.spectateKillLeader.addClass("btn-disabled");

        ui.teamContainer.toggle(this.teamMode);
    }

    async endGame(): Promise<void> {
        const ui = this.uiManager.ui;

        return await new Promise(resolve => {
            ui.splashOptions.addClass("loading");

            this.soundManager.stopAll();

            void this.music.play();

            ui.splashUi.fadeIn(400, () => {
                ui.teamContainer.html("");
                ui.actionContainer.hide();
                ui.gameMenu.hide();
                ui.gameOverOverlay.hide();
                ui.canvas.removeClass("active");
                ui.killLeaderLeader.text("Waiting for leader");
                ui.killLeaderCount.text("0");

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
                this.uiManager.clearTeammateCache();

                const map = this.map;
                map.safeZone.clear();
                map.pingGraphics.clear();
                map.pings.clear();
                map.pingsContainer.removeChildren();
                map.teammateIndicators.clear();
                map.teammateIndicatorContainer.removeChildren();

                this.playerNames.clear();
                this._timeouts.clear();

                this.camera.zoom = Scopes.definitions[0].zoomLevel;
                resetPlayButtons();
                if (teamSocket) ui.createTeamMenu.fadeIn(250, resolve);
                else resolve();
            });
        });
    }

    private readonly _packetStream = new PacketStream(new ArrayBuffer(1024));
    sendPacket(packet: Packet): void {
        this._packetStream.stream.index = 0;
        this._packetStream.serializeClientPacket(packet);
        this.sendData(this._packetStream.getBuffer());
    }

    sendData(buffer: ArrayBuffer): void {
        if (this._socket && this._socket.readyState === this._socket.OPEN) {
            try {
                this._socket.send(buffer);
            } catch (e) {
                console.warn("Error sending packet. Details:", e);
            }
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

    private _lastUpdateTime = 0;
    get lastUpdateTime(): number { return this._lastUpdateTime; }

    /**
     * Otherwise known as "time since last update", in milliseconds
     */
    private _serverDt = 0;
    /**
     * Otherwise known as "time since last update", in milliseconds
     */
    get serverDt(): number { return this._serverDt; }

    processUpdate(updateData: UpdatePacket): void {
        const now = Date.now();
        this._serverDt = now - this._lastUpdateTime;
        this._lastUpdateTime = now;

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
                        ObjectClassMapping[type] as new (game: Game, id: number, data: ObjectsNetData[K]) => InstanceType<ObjectClassMapping[K]>
                    )(this, id, data)
                );
            } else {
                object.updateFromData(data, false);
            }
        }

        for (const { id, data } of updateData.partialDirtyObjects) {
            const object = this.objects.get(id);
            if (object === undefined) {
                console.warn(`Trying to partially update non-existant object with ID ${id}`);
                continue;
            }

            (object as GameObject).updateFromData(data, false);
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
            if (this.console.getBuiltInCVar("cv_hide_emotes")) break;
            const player = this.objects.get(emote.playerID);
            if (player instanceof Player) {
                player.sendEmote(emote.definition);
            } else {
                console.warn(`Tried to emote on behalf of ${player === undefined ? "a non-existant player" : `a/an ${ObjectCategory[player.type]}`}`);
                continue;
            }
        }

        this.gas.updateFrom(updateData);

        if (updateData.aliveCount !== undefined) {
            const ui = this.uiManager.ui;
            ui.playerAlive.text(updateData.aliveCount);
            ui.btnSpectate.toggle(updateData.aliveCount > 1);
        }

        for (const plane of updateData.planes) {
            this.planes.add(new Plane(this, plane.position, plane.direction));
        }

        for (const ping of updateData.mapPings) {
            this.map.addMapPing(ping.position, ping.definition, ping.playerId);
        }

        this.tick();
    }

    addTween<T>(config: ConstructorParameters<typeof Tween<T>>[1]): Tween<T> {
        const tween = new Tween(this, config);

        this.tweens.add(tween);
        return tween;
    }

    removeTween(tween: Tween<unknown>): void {
        this.tweens.delete(tween);
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
            object?: Loot | Obstacle | Player
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
            const showCancel = isAction && !this.uiManager.action.fake;
            let canInteract = true;

            if (isAction) {
                this.uiManager.updateAction();
            }

            interface CloseObject {
                object?: Loot | Obstacle | Player
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
                    (object instanceof Loot || ((object instanceof Obstacle || object instanceof Player) && object.canInteract(player)))
                    && object.hitbox.collidesWith(detectionHitbox)
                ) {
                    const dist = Geometry.distanceSquared(object.position, player.position);
                    if ((object.canInteract(player) || object instanceof Obstacle || object instanceof Player) && dist < interactable.minDist) {
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

            const bind: string | undefined = this.inputManager.binds.getInputsBoundToAction(object === undefined ? "cancel_action" : "interact")[0];

            const differences = {
                object: cache.object?.id !== object?.id,
                offset: cache.offset !== offset,
                isAction: cache.isAction !== isAction,
                bind: cache.bind !== bind,
                canInteract: cache.canInteract !== canInteract
            };

            if (differences.bind) bindChangeAcknowledged = false;

            if (
                differences.object
                || differences.offset
                || differences.isAction
                || differences.bind
                || differences.canInteract
            ) {
                // Cache miss, rerender
                cache.object = object;
                cache.offset = offset;
                cache.isAction = isAction;
                cache.bind = bind;
                cache.canInteract = canInteract;

                const {
                    interactKey,
                    interactMsg,
                    interactText
                } = this.uiManager.ui;
                const type = object instanceof Loot ? object.definition.itemType : undefined;

                // Update interact message
                if (object !== undefined || (isAction && showCancel)) {
                    // If the loot object hasn't changed, we don't need to redo the text
                    if (differences.object || differences.offset || differences.isAction) {
                        let text;
                        switch (true) {
                            case object instanceof Obstacle: {
                                switch (object.definition.role) {
                                    case ObstacleSpecialRoles.Door:
                                        text = object.door?.offset === 0 ? "Open Door" : "Close Door";
                                        break;
                                    case ObstacleSpecialRoles.Activatable:
                                        text = `${object.definition.interactText} ${object.definition.name}`;
                                        break;
                                }
                                break;
                            }
                            case object instanceof Loot: {
                                text = `${object.definition.name}${object.count > 1 ? ` (${object.count})` : ""}`;
                                break;
                            }
                            case object instanceof Player: {
                                text = `Revive ${this.uiManager.getRawPlayerName(object.id)}`;
                                break;
                            }
                            case isAction: {
                                text = "Cancel";
                                break;
                            }
                        }

                        if (text) interactText.text(text);
                    }

                    if (!this.inputManager.isMobile && (!bindChangeAcknowledged || (object === undefined && isAction))) {
                        bindChangeAcknowledged = true;

                        const icon = bind === undefined ? undefined : InputManager.getIconFromInputName(bind);

                        if (icon === undefined) {
                            interactKey.text(bind ?? "");
                        } else {
                            interactKey.html(`<img src="${icon}" alt="${bind}"/>`);
                        }
                    }

                    if (canInteract || (object === undefined && isAction)) {
                        interactKey
                            .addClass("active")
                            .show();
                    } else {
                        interactKey
                            .removeClass("active")
                            .hide();
                    }

                    interactMsg.show();
                } else {
                    interactMsg.hide();
                }

                // Mobile stuff
                if (this.inputManager.isMobile && canInteract) {
                    const weapons = this.uiManager.inventory.weapons;

                    // Auto pickup (top 10 conditionals)
                    if (
                        this.console.getBuiltInCVar("cv_autopickup")
                        && object instanceof Loot
                        && (
                            (
                                (
                                    // Auto-pickup dual gun
                                    // Only pick up melees if no melee is equipped
                                    (
                                        type !== ItemType.Melee || weapons?.[2]?.definition.idString === "fists" // FIXME are y'all fr
                                    )

                                    // Only pick up guns if there's a free slot
                                    && (
                                        type !== ItemType.Gun || (!weapons?.[0] || !weapons?.[1])
                                    )

                                    // Don't pick up skins
                                    && type !== ItemType.Skin
                                )
                            ) || (
                                type === ItemType.Gun
                                    && weapons?.some(
                                        weapon => {
                                            const definition = weapon?.definition;

                                            return definition?.itemType === ItemType.Gun
                                                && (
                                                    (
                                                        object?.definition === definition
                                                        && !definition.isDual
                                                        && definition.dualVariant
                                                    ) // Picking up a single pistol when inventory has single pistol
                                                    || (
                                                        (
                                                            object.definition as DualGunNarrowing | undefined
                                                        )?.singleVariant === definition.idString
                                                    )
                                                    // Picking up dual pistols when inventory has a pistol
                                                    // TODO implement splitting of dual guns to not lost reload later
                                                );
                                        }
                                    )
                            )
                        )
                    ) {
                        this.inputManager.addAction(InputActions.Loot);
                    } else if ( // Auto open doors
                        object instanceof Obstacle
                        && object.canInteract(player)
                        && object.definition.role === ObstacleSpecialRoles.Door
                        && object.door?.offset === 0
                    ) {
                        this.inputManager.addAction(InputActions.Interact);
                    }
                }
            }
        };
    })();
}
