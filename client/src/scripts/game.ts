import { GameConstants, InputActions, InventoryMessages, Layer, ObjectCategory, TeamSize } from "@common/constants";
import { ArmorType } from "@common/definitions/armors";
import { Badges, type BadgeDefinition } from "@common/definitions/badges";
import { Emotes } from "@common/definitions/emotes";
import { type DualGunNarrowing } from "@common/definitions/guns";
import { Loots } from "@common/definitions/loots";
import { Scopes } from "@common/definitions/scopes";
import { DisconnectPacket } from "@common/packets/disconnectPacket";
import { GameOverPacket } from "@common/packets/gameOverPacket";
import { JoinedPacket, type JoinedPacketData } from "@common/packets/joinedPacket";
import { JoinPacket, type JoinPacketCreation } from "@common/packets/joinPacket";
import { KillFeedPacket } from "@common/packets/killFeedPacket";
import { MapPacket } from "@common/packets/mapPacket";
import { type InputPacket, type OutputPacket } from "@common/packets/packet";
import { PacketStream } from "@common/packets/packetStream";
import { PickupPacket } from "@common/packets/pickupPacket";
import { PingPacket } from "@common/packets/pingPacket";
import { ReportPacket } from "@common/packets/reportPacket";
import { UpdatePacket, type UpdatePacketDataOut } from "@common/packets/updatePacket";
import { CircleHitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer } from "@common/utils/layer";
import { EaseFunctions, Geometry } from "@common/utils/math";
import { Timeout } from "@common/utils/misc";
import { ItemType, ObstacleSpecialRoles } from "@common/utils/objectDefinitions";
import { ObjectPool } from "@common/utils/objectPool";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { randomFloat, randomVector } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { sound, type Sound } from "@pixi/sound";
import $ from "jquery";
import { Application, Color } from "pixi.js";
import "pixi.js/prepare";
import { getTranslatedString, initTranslation } from "../translations";
import { type TranslationKeys } from "../typings/translations";
import { InputManager } from "./managers/inputManager";
import { GameSound, SoundManager } from "./managers/soundManager";
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
import { autoPickup, resetPlayButtons, setUpUI, teamSocket, unlockPlayButtons, updateDisconnectTime } from "./ui";
import { setUpCommands } from "./utils/console/commands";
import { defaultClientCVars } from "./utils/console/defaultClientCVars";
import { GameConsole } from "./utils/console/gameConsole";
import { COLORS, EMOTE_SLOTS, LAYER_TRANSITION_DELAY, MODE, PIXI_SCALE, UI_DEBUG_MODE } from "./utils/constants";
import { loadTextures, SuroiSprite } from "./utils/pixi";
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

    ambience?: GameSound;

    readonly spinningImages = new Map<SuroiSprite, number>();

    readonly playerNames = new Map<number, {
        readonly name: string
        readonly hasColor: boolean
        readonly nameColor: Color
        readonly badge?: BadgeDefinition
    }>();

    activePlayerID = -1;
    teamID = -1;

    teamMode = false;

    /**
     * proxy for `activePlayer`'s layer
     */
    get layer(): Layer | undefined {
        return this.activePlayer?.layer;
    }

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

    music!: Sound;

    readonly tweens = new Set<Tween<unknown>>();

    private readonly _timeouts = new Set<Timeout>();

    addTimeout(callback: () => void, delay?: number): Timeout {
        const timeout = new Timeout(callback, Date.now() + (delay ?? 0));
        this._timeouts.add(timeout);
        return timeout;
    }

    private static _instantiated = false;

    static async init(): Promise<Game> {
        if (Game._instantiated) {
            throw new Error("Class 'Game' has already been instantiated.");
        }
        Game._instantiated = true;

        const game = new Game();

        game.console.readFromLocalStorage();
        await initTranslation(game);
        game.inputManager.setupInputs();

        const initPixi = async(): Promise<void> => {
            const renderMode = game.console.getBuiltInCVar("cv_renderer");
            const renderRes = game.console.getBuiltInCVar("cv_renderer_res");

            await game.pixi.init({
                resizeTo: window,
                background: COLORS.grass,
                antialias: game.console.getBuiltInCVar("cv_antialias"),
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

            const pixi = game.pixi;
            await loadTextures(
                pixi.renderer,
                game.inputManager.isMobile
                    ? game.console.getBuiltInCVar("mb_high_res_textures")
                    : game.console.getBuiltInCVar("cv_high_res_textures")
            );

            // HACK: the game ui covers the canvas
            // so send pointer events manually to make clicking to spectate players work
            game.uiManager.ui.gameUi[0].addEventListener("pointerdown", e => {
                pixi.canvas.dispatchEvent(new PointerEvent("pointerdown", {
                    pointerId: e.pointerId,
                    button: e.button,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenY: e.screenY,
                    screenX: e.screenX
                }));
            });

            pixi.ticker.add(game.render.bind(game));
            pixi.stage.addChild(
                game.camera.container,
                game.map.container,
                game.map.mask
            );

            game.map.visible = !game.console.getBuiltInCVar("cv_minimap_minimized");
            game.map.expanded = game.console.getBuiltInCVar("cv_map_expanded");
            game.uiManager.ui.gameUi.toggle(game.console.getBuiltInCVar("cv_draw_hud"));

            pixi.renderer.on("resize", () => game.resize());
            game.resize();

            setInterval(() => {
                if (game.console.getBuiltInCVar("pf_show_fps")) {
                    game.uiManager.debugReadouts.fps.text(`${Math.round(game.pixi.ticker.FPS)} fps`);
                }
            }, 500);
        };

        void Promise.all([
            initPixi(),
            setUpUI(game)
        ]).then(() => {
            unlockPlayButtons();
            resetPlayButtons();
        });

        setUpCommands(game);
        game.inputManager.generateBindsConfigScreen();

        game.music = sound.add("menu_music", {
            url: `./audio/music/menu_music${game.console.getBuiltInCVar("cv_use_old_menu_music") ? "_old" : MODE.specialMenuMusic ? `_${GameConstants.modeName}` : ""}.mp3`,
            singleInstance: true,
            preload: true,
            autoPlay: true,
            volume: game.console.getBuiltInCVar("cv_music_volume")
        });
        return game;
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
            if (this.music) {
                this.music.stop();
            }
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

            this.sendPacket(PingPacket.create());
            this.lastPingDate = Date.now();

            let skin: typeof defaultClientCVars["cv_loadout_skin"];
            const joinPacket: JoinPacketCreation = {
                isMobile: this.inputManager.isMobile,
                name: this.console.getBuiltInCVar("cv_player_name"),
                skin: Loots.fromStringSafe(
                    this.console.getBuiltInCVar("cv_loadout_skin")
                ) ?? Loots.fromString(
                    typeof (skin = defaultClientCVars.cv_loadout_skin) === "object"
                        ? skin.value
                        : skin
                ),
                badge: Badges.fromStringSafe(this.console.getBuiltInCVar("cv_loadout_badge")),
                emotes: EMOTE_SLOTS.map(
                    slot => Emotes.fromStringSafe(this.console.getBuiltInCVar(`cv_loadout_${slot}_emote`))
                )
            };

            this.sendPacket(JoinPacket.create(joinPacket));

            this.camera.addObject(this.gasRender.graphics);
            this.map.indicator.setFrame("player_indicator");

            const particleEffects = MODE.particleEffects;

            if (particleEffects !== undefined) {
                const This = this;
                const gravityOn = particleEffects.gravity;
                this.particleManager.addEmitter(
                    {
                        delay: particleEffects.delay,
                        active: this.console.getBuiltInCVar("cv_ambient_particles"),
                        spawnOptions: () => ({
                            frames: particleEffects.frames,
                            get position(): Vector {
                                const width = This.camera.width / PIXI_SCALE;
                                const height = This.camera.height / PIXI_SCALE;
                                const player = This.activePlayer;
                                if (!player) return Vec.create(0, 0);
                                const { x, y } = player.position;
                                return randomVector(x - width, x + width, y - height, y + height);
                            },
                            speed: randomVector(-10, 10, gravityOn ? 10 : -10, 10),
                            lifetime: randomFloat(12000, 50000),
                            zIndex: Number.MAX_SAFE_INTEGER - 5,
                            alpha: {
                                start: this.layer === Layer.Ground ? 0.7 : 0,
                                end: 0
                            },
                            rotation: {
                                start: randomFloat(0, 36),
                                end: randomFloat(40, 80)
                            },
                            scale: {
                                start: randomFloat(0.8, 1.1),
                                end: randomFloat(0.7, 0.8)
                            }
                        })
                    }
                );
            }
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
            ui.splashMsgText.html(getTranslatedString("msg_err_joining"));
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

    inventoryMsgTimeout: number | undefined;

    onPacket(packet: OutputPacket): void {
        switch (true) {
            case packet instanceof JoinedPacket:
                this.startGame(packet.output);
                break;
            case packet instanceof MapPacket:
                this.map.updateFromPacket(packet.output);
                break;
            case packet instanceof UpdatePacket:
                this.processUpdate(packet.output);
                break;
            case packet instanceof GameOverPacket:
                this.uiManager.showGameOverScreen(packet.output);
                break;
            case packet instanceof KillFeedPacket:
                this.uiManager.processKillFeedPacket(packet.output);
                break;
            case packet instanceof PingPacket: {
                this.uiManager.debugReadouts.ping.text(`${Date.now() - this.lastPingDate} ms`);
                setTimeout((): void => {
                    this.sendPacket(PingPacket.create());
                    this.lastPingDate = Date.now();
                }, 5000);
                break;
            }
            case packet instanceof ReportPacket: {
                const ui = this.uiManager.ui;
                const { output } = packet;
                ui.reportingName.text(output.playerName);
                ui.reportingId.text(output.reportID);
                ui.reportingModal.fadeIn(250);
                break;
            }
            case packet instanceof PickupPacket: {
                const { output: { message, item } } = packet;

                if (message !== undefined) {
                    const inventoryMsg = this.uiManager.ui.inventoryMsg;

                    inventoryMsg.text(getTranslatedString(this._inventoryMessageMap[message])).fadeIn(250);
                    if (message === InventoryMessages.RadioOverused) {
                        this.soundManager.play("metal_light_destroyed");
                    }

                    clearTimeout(this.inventoryMsgTimeout);
                    this.inventoryMsgTimeout = window.setTimeout(() => inventoryMsg.fadeOut(250), 2500);
                } else if (item !== undefined) {
                    let soundID: string;
                    switch (item.itemType) {
                        case ItemType.Ammo:
                            soundID = "ammo_pickup";
                            break;
                        case ItemType.Healing:
                            soundID = `${item.idString}_pickup`;
                            break;
                        case ItemType.Scope:
                            soundID = "scope_pickup";
                            break;
                        case ItemType.Armor:
                            if (item.armorType === ArmorType.Helmet) soundID = "helmet_pickup";
                            else soundID = "vest_pickup";
                            break;
                        case ItemType.Backpack:
                            soundID = "backpack_pickup";
                            break;
                        case ItemType.Throwable:
                            soundID = "throwable_pickup";
                            break;
                        case ItemType.Perk:
                            soundID = "pickup";
                            break;
                        default:
                            soundID = "pickup";
                            break;
                    }

                    this.soundManager.play(soundID);
                } else {
                    console.warn("Unexpected PickupPacket with neither message nor item");
                }
                break;
            }
            case packet instanceof DisconnectPacket:
                this.disconnectReason = packet.output.reason;
                break;
        }
    }

    private readonly _inventoryMessageMap: Record<InventoryMessages, TranslationKeys> = {
        [InventoryMessages.NotEnoughSpace]: "msg_not_enough_space",
        [InventoryMessages.ItemAlreadyEquipped]: "msg_item_already_equipped",
        [InventoryMessages.BetterItemEquipped]: "msg_better_item_equipped",
        [InventoryMessages.CannotUseRadio]: "msg_cannot_use_radio",
        [InventoryMessages.RadioOverused]: "msg_radio_overused"
    };

    startGame(packet: JoinedPacketData): void {
        // Sound which notifies the player that the
        // game started if page is out of focus.
        if (!document.hasFocus()) this.soundManager.play("join_notification");

        if (MODE.ambience) {
            this.ambience = this.soundManager.play(MODE.ambience, { loop: true, ambient: true });
        }

        this.uiManager.emotes = packet.emotes;
        this.uiManager.updateEmoteWheel();

        const ui = this.uiManager.ui;

        if (this.teamMode = packet.maxTeamSize !== TeamSize.Solo) {
            this.teamID = packet.teamID;
        }

        ui.canvas.addClass("active");
        ui.splashUi.fadeOut(400, resetPlayButtons);

        ui.killLeaderLeader.html(getTranslatedString("msg_waiting_for_leader"));
        ui.killLeaderCount.text("0");
        ui.spectateKillLeader.addClass("btn-disabled");

        ui.teamContainer.toggle(this.teamMode);
    }

    async endGame(): Promise<void> {
        const ui = this.uiManager.ui;

        return await new Promise(resolve => {
            ui.splashOptions.addClass("loading");

            this.soundManager.stopAll();

            ui.splashUi.fadeIn(400, () => {
                if (this.music) {
                    void this.music.play();
                }
                ui.teamContainer.html("");
                ui.actionContainer.hide();
                ui.gameMenu.hide();
                ui.gameOverOverlay.hide();
                ui.canvas.removeClass("active");
                ui.killLeaderLeader.text(getTranslatedString("msg_waiting_for_leader"));
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
                updateDisconnectTime();
                resetPlayButtons();
                if (teamSocket) ui.createTeamMenu.fadeIn(250, resolve);
                else resolve();
            });
        });
    }

    private readonly _packetStream = new PacketStream(new ArrayBuffer(1024));
    sendPacket(packet: InputPacket): void {
        this._packetStream.stream.index = 0;
        this._packetStream.serializeClientPacket(packet);
        this.sendData(this._packetStream.getBuffer());
    }

    sendData(buffer: ArrayBuffer): void {
        if (this._socket?.readyState === WebSocket.OPEN) {
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

        let players: Set<Player> | undefined;
        if (this.console.getBuiltInCVar("cv_movement_smoothing")) {
            for (const player of players = this.objects.getCategory(ObjectCategory.Player)) {
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

        for (const player of players ?? this.objects.getCategory(ObjectCategory.Player)) {
            player.updateGrenadePreview();
        }

        for (const [image, spinSpeed] of this.spinningImages.entries()) {
            image.rotation += spinSpeed * delta;
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

    processUpdate(updateData: UpdatePacketDataOut): void {
        const now = Date.now();
        this._serverDt = now - this._lastUpdateTime;
        this._lastUpdateTime = now;

        for (const { id, name, hasColor, nameColor, badge } of updateData.newPlayers ?? []) {
            this.playerNames.set(id, {
                name: name,
                hasColor: hasColor,
                nameColor: new Color(nameColor),
                badge: badge
            });
        }

        const playerData = updateData.playerData;
        if (playerData) {
            this.uiManager.updateUI(playerData);
            this.uiManager.updateWeaponSlots(); // to load reskins

            if (this.spectating && playerData.teamID !== undefined && playerData.id !== undefined) {
                this.teamID = playerData.teamID;
            }
        }

        for (const deletedPlayerId of updateData.deletedPlayers ?? []) {
            this.playerNames.delete(deletedPlayerId);
        }

        for (const { id, type, data } of updateData.fullDirtyObjects ?? []) {
            const object: GameObject | undefined = this.objects.get(id);

            if (object === undefined || object.destroyed) {
                type K = typeof type;

                const _object = new (
                    ObjectClassMapping[type] as new (game: Game, id: number, data: ObjectsNetData[K]) => InstanceType<ObjectClassMapping[K]>
                )(this, id, data);
                this.objects.add(_object);

                // Layer Transition: We pray that this works lmao
                if (_object.layer !== (this.layer ?? Layer.Ground)) {
                    _object.container.alpha = 0;

                    // Yes, we need to do this specifically for building ceilings as well.
                    if (_object.isBuilding) {
                        _object.ceilingVisible = false;
                        _object.ceilingContainer.alpha = 0;
                        _object.toggleCeiling(LAYER_TRANSITION_DELAY);
                    }

                    this.addTween({
                        target: _object.container,
                        to: { alpha: 1 },
                        duration: LAYER_TRANSITION_DELAY,
                        ease: EaseFunctions.sineIn
                    });
                }
            } else {
                object.updateFromData(data, false);
            }
        }

        for (const { id, data } of updateData.partialDirtyObjects ?? []) {
            const object = this.objects.get(id);
            if (object === undefined) {
                console.warn(`Trying to partially update non-existant object with ID ${id}`);
                continue;
            }

            (object as GameObject).updateFromData(data, false);
        }

        for (const id of updateData.deletedObjects ?? []) {
            const object = this.objects.get(id);
            if (object === undefined) {
                console.warn(`Trying to delete unknown object with ID ${id}`);
                continue;
            }

            // Layer Transition: We pray that this works lmao
            if (object.layer !== (this.layer ?? Layer.Ground)) {
                object.container.alpha = 1;

                // Yes, we need to do this specifically for building ceilings as well.
                if (object.isBuilding && object.ceilingVisible) {
                    object.ceilingContainer.alpha = 1;
                    this.addTween({
                        target: object.ceilingContainer,
                        to: { alpha: 0 },
                        duration: LAYER_TRANSITION_DELAY,
                        ease: EaseFunctions.sineOut
                    });
                }

                this.addTween({
                    target: object.container,
                    to: { alpha: 0 },
                    duration: LAYER_TRANSITION_DELAY,
                    ease: EaseFunctions.sineOut,
                    onComplete: () => {
                        object.destroy();
                        this.objects.delete(object);
                    }
                });
            } else {
                object.destroy();
                this.objects.delete(object);
            }
        }

        for (const bullet of updateData.deserializedBullets ?? []) {
            this.bullets.add(new Bullet(this, bullet));
        }

        for (const explosionData of updateData.explosions ?? []) {
            explosion(this, explosionData.definition, explosionData.position, explosionData.layer);
        }

        for (const emote of updateData.emotes ?? []) {
            if (this.console.getBuiltInCVar("cv_hide_emotes")) break;
            const player = this.objects.get(emote.playerID);
            if (player?.isPlayer) {
                player.showEmote(emote.definition);
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

        for (const plane of updateData.planes ?? []) {
            this.planes.add(new Plane(this, plane.position, plane.direction));
        }

        for (const ping of updateData.mapPings ?? []) {
            this.map.addMapPing(ping);
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

    backgroundTween?: Tween<unknown>;

    changeLayer(layer: Layer): void {
        for (const object of this.objects) {
            object.updateZIndex();
        }

        const basement = layer === Layer.Basement1;
        this.map.terrainGraphics.visible = !basement;
        const { red, green, blue } = this.pixi.renderer.background.color;
        const color = { r: red * 255, g: green * 255, b: blue * 255 };
        const targetColor = basement ? COLORS.void : COLORS.grass;

        this.backgroundTween?.kill();
        this.backgroundTween = this.addTween({
            target: color,
            to: { r: targetColor.red * 255, g: targetColor.green * 255, b: targetColor.blue * 255 },
            onUpdate: () => {
                this.pixi.renderer.background.color = new Color(color);
            },
            duration: LAYER_TRANSITION_DELAY
        });

        this.ambience?.setPaused(layer < Layer.Ground);
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

        // same idea as above
        const funnyDetonateButtonCache: {
            bind?: string
        } = {};

        // keep image thingy around to consult (and therefore lazily change) src
        let detonateBindIcon: JQuery<HTMLImageElement> | undefined;

        return () => {
            if (!this.gameStarted || (this.gameOver && !this.spectating)) return;
            this.inputManager.update();
            this.soundManager.update();

            const player = this.activePlayer;
            if (!player) return;

            const isAction = this.uiManager.action.active;
            const showCancel = isAction && !this.uiManager.action.fake;
            let canInteract = true;

            if (isAction) {
                this.uiManager.updateAction();
            }

            interface CloseObject {
                object?: Loot | Obstacle | Player
                dist: number
            }

            const interactable: CloseObject = {
                object: undefined,
                dist: Number.MAX_VALUE
            };
            const uninteractable: CloseObject = {
                object: undefined,
                dist: Number.MAX_VALUE
            };
            const detectionHitbox = new CircleHitbox(3 * player.sizeMod, player.position);

            for (const object of this.objects) {
                const { isLoot, isObstacle, isPlayer, isBuilding } = object;
                const isInteractable = (isLoot || isObstacle || isPlayer) && object.canInteract(player);

                if (
                    (isLoot || isInteractable)
                    && object.hitbox.collidesWith(detectionHitbox)
                    && adjacentOrEqualLayer(object.layer, player.layer)
                ) {
                    const dist = Geometry.distanceSquared(object.position, player.position);
                    if (isInteractable) {
                        if (dist < interactable.dist) {
                            interactable.dist = dist;
                            interactable.object = object;
                        }
                    } else if (isLoot && dist < uninteractable.dist) {
                        uninteractable.dist = dist;
                        uninteractable.object = object;
                    }
                } else if (isBuilding) {
                    object.toggleCeiling();
                }
            }

            const object = interactable.object ?? uninteractable.object;
            const offset = object?.isObstacle ? object.door?.offset : undefined;
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
                const type = object?.isLoot ? object.definition.itemType : undefined;

                // Update interact message
                if (object !== undefined || (isAction && showCancel)) {
                    // If the loot object hasn't changed, we don't need to redo the text
                    if (differences.object || differences.offset || differences.isAction) {
                        let text;
                        switch (true) {
                            case object?.isObstacle: {
                                switch (object.definition.role) {
                                    case ObstacleSpecialRoles.Door:
                                        text = object.door?.offset === 0
                                            ? getTranslatedString("action_open_door")
                                            : getTranslatedString("action_close_door");
                                        break;
                                    case ObstacleSpecialRoles.Activatable:
                                        text = getTranslatedString(`interact_${object.definition.idString}` as TranslationKeys);
                                        break;
                                }
                                break;
                            }
                            case object?.isLoot: {
                                const definition = object.definition;
                                const itemName = definition.itemType === ItemType.Gun && definition.isDual
                                    ? getTranslatedString(
                                        "dual_template",
                                        { gun: getTranslatedString(definition.singleVariant as TranslationKeys) }
                                    )
                                    : getTranslatedString(definition.idString as TranslationKeys);

                                text = `${itemName}${object.count > 1 ? ` (${object.count})` : ""}`;
                                break;
                            }
                            case object?.isPlayer: {
                                text = getTranslatedString("action_revive", { player: this.uiManager.getRawPlayerName(object.id) });
                                break;
                            }
                            case isAction: {
                                text = getTranslatedString("action_cancel");
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

                    if (
                        (!object?.isObstacle
                            || !object.definition.isActivatable
                            || !object.definition.noInteractMessage)
                    ) {
                        interactMsg.show();
                        if (player.downed && (object?.isLoot || (object?.isObstacle && object.definition.noInteractMessage))) interactMsg.hide();
                    }
                } else {
                    interactMsg.hide();
                }

                // Mobile stuff
                if (this.inputManager.isMobile && canInteract) {
                    const weapons = this.uiManager.inventory.weapons;

                    // Auto pickup (top 10 conditionals)
                    if (
                        this.console.getBuiltInCVar("cv_autopickup")
                        && object?.isLoot
                        && autoPickup
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

                                    // Don't pick up perks
                                    && type !== ItemType.Perk
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
                        object?.isObstacle
                        && object.canInteract(player)
                        && object.definition.isDoor
                        && object.door?.offset === 0
                    ) {
                        this.inputManager.addAction(InputActions.Interact);
                    }
                }
            }

            // funny detonate button stuff
            const detonateKey = this.uiManager.ui.detonateKey;
            if (!this.inputManager.isMobile) {
                const boomBind: string | undefined = this.inputManager.binds.getInputsBoundToAction("explode_c4")[0];

                if (funnyDetonateButtonCache.bind !== boomBind) {
                    funnyDetonateButtonCache.bind = bind;

                    if (boomBind !== undefined) {
                        const bindImg = InputManager.getIconFromInputName(boomBind);

                        detonateKey.show();

                        if (bindImg === undefined) {
                            detonateKey.text(boomBind ?? "");
                            if (detonateBindIcon !== undefined) {
                                detonateKey.empty();
                                detonateBindIcon = undefined;
                            }
                        } else {
                            if (detonateBindIcon === undefined) {
                                detonateKey.children().add(detonateBindIcon = $(`<img src="${bindImg}" alt=${boomBind} />`));
                            }

                            if (detonateBindIcon.attr("src") !== bindImg) {
                                detonateBindIcon.attr("src", bindImg);
                            }
                        }
                    } else {
                        detonateKey.hide();
                    }
                }
            } else {
                detonateKey.hide();
            }
        };
    })();
}
