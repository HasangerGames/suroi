import { InputActions, InventoryMessages, Layer, ObjectCategory, TeamSize, ZIndexes } from "@common/constants";
import { Badges, type BadgeDefinition } from "@common/definitions/badges";
import { Emotes } from "@common/definitions/emotes";
import { ArmorType } from "@common/definitions/items/armors";
import { type DualGunNarrowing } from "@common/definitions/items/guns";
import { Scopes } from "@common/definitions/items/scopes";
import { Skins } from "@common/definitions/items/skins";
import type { ColorKeys, Mode, ModeDefinition } from "@common/definitions/modes";
import { Modes } from "@common/definitions/modes";
import type { JoinedData } from "@common/packets/joinedPacket";
import { JoinPacket } from "@common/packets/joinPacket";
import { PacketType, type DataSplit, type PacketDataIn, type PacketDataOut } from "@common/packets/packet";
import { PacketStream } from "@common/packets/packetStream";
import { type UpdateDataOut } from "@common/packets/updatePacket";
import { CircleHitbox } from "@common/utils/hitbox";
import { adjacentOrEqualLayer, equalLayer } from "@common/utils/layer";
import { EaseFunctions, Geometry, Numeric } from "@common/utils/math";
import { Timeout } from "@common/utils/misc";
import { ItemType } from "@common/utils/objectDefinitions";
import { ObjectPool } from "@common/utils/objectPool";
import { type ObjectsNetData } from "@common/utils/objectsSerializations";
import { random, randomFloat, randomRotation, randomVector } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { sound, type Sound } from "@pixi/sound";
import FontFaceObserver from "fontfaceobserver";
import $ from "jquery";
import { Application, Color, Container } from "pixi.js";
import "pixi.js/prepare";
import { setUpCommands } from "./console/commands";
import { GameConsole } from "./console/gameConsole";
import { defaultClientCVars } from "./console/variables";
import { CameraManager } from "./managers/cameraManager";
import { GasManager, GasRender } from "./managers/gasManager";
import { InputManager } from "./managers/inputManager";
import { MapManager } from "./managers/mapManager";
import { ParticleManager } from "./managers/particleManager";
import { ScreenRecordManager } from "./managers/screenRecordManager";
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
import { Plane } from "./objects/plane";
import { Player } from "./objects/player";
import { Projectile } from "./objects/projectile";
import { SyncedParticle } from "./objects/syncedParticle";
import { autoPickup, fetchServerData, finalizeUI, resetPlayButtons, setUpUI, teamSocket, unlockPlayButtons, updateDisconnectTime } from "./ui";
import { EMOTE_SLOTS, LAYER_TRANSITION_DELAY, PIXI_SCALE, UI_DEBUG_MODE } from "./utils/constants";
import { DebugRenderer } from "./utils/debugRenderer";
import { setUpNetGraph } from "./utils/graph/netGraph";
import { loadTextures, SuroiSprite } from "./utils/pixi";
import { getTranslatedString, initTranslation } from "./utils/translations/translations";
import { type TranslationKeys } from "./utils/translations/typings";
import { Tween, type TweenOptions } from "./utils/tween";

/* eslint-disable @stylistic/indent */

type ObjectClassMapping = {
    readonly [ObjectCategory.Player]: typeof Player
    readonly [ObjectCategory.Obstacle]: typeof Obstacle
    readonly [ObjectCategory.DeathMarker]: typeof DeathMarker
    readonly [ObjectCategory.Loot]: typeof Loot
    readonly [ObjectCategory.Building]: typeof Building
    readonly [ObjectCategory.Decal]: typeof Decal
    readonly [ObjectCategory.Parachute]: typeof Parachute
    readonly [ObjectCategory.Projectile]: typeof Projectile
    readonly [ObjectCategory.SyncedParticle]: typeof SyncedParticle
};

const ObjectClassMapping: ObjectClassMapping = Object.freeze<{
    readonly [K in ObjectCategory]: new (id: number, data: ObjectsNetData[K]) => InstanceType<ObjectClassMapping[K]>
}>({
    [ObjectCategory.Player]: Player,
    [ObjectCategory.Obstacle]: Obstacle,
    [ObjectCategory.DeathMarker]: DeathMarker,
    [ObjectCategory.Loot]: Loot,
    [ObjectCategory.Building]: Building,
    [ObjectCategory.Decal]: Decal,
    [ObjectCategory.Parachute]: Parachute,
    [ObjectCategory.Projectile]: Projectile,
    [ObjectCategory.SyncedParticle]: SyncedParticle
});

type ObjectMapping = {
    readonly [Cat in keyof ObjectClassMapping]: InstanceType<ObjectClassMapping[Cat]>
};

type Colors = Record<ColorKeys | "ghillie", Color>;

export const Game = new (class Game {
    private _socket?: WebSocket;

    readonly objects = new ObjectPool<ObjectMapping>();
    readonly bullets = new Set<Bullet>();
    readonly planes = new Set<Plane>();

    ambience?: GameSound;

    layerTween?: Tween<Container>;

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

    _modeName: Mode | undefined;
    get modeName(): Mode {
        if (this._modeName === undefined) throw new Error("modeName accessed before initialization");
        return this._modeName;
    }

    set modeName(modeName: Mode) {
        this._modeName = modeName;
        this._mode = Modes[this.modeName];

        // Converts the strings in the mode definition to Color objects
        this._colors = (Object.entries(this.mode.colors) as Array<[ColorKeys, string]>).reduce(
            (result, [key, color]) => {
                result[key] = new Color(color);
                return result;
            },
            {} as Colors
        );

        this._colors.ghillie = new Color(this._colors.grass).multiply("hsl(0, 0%, 99%)");
    }

    _mode: ModeDefinition | undefined;
    get mode(): ModeDefinition {
        if (!this._mode) throw new Error("mode accessed before initialization");
        return this._mode;
    }

    private _colors: Colors | undefined;
    get colors(): Colors {
        if (!this._colors) throw new Error("colors accessed before initialization");
        return this._colors;
    }

    /**
     * proxy for `activePlayer`'s layer
     */
    get layer(): Layer | undefined {
        return this.activePlayer?.layer;
    }

    get activePlayer(): Player | undefined {
        return this.objects.get(this.activePlayerID) as Player;
    }

    connecting = false;
    gameStarted = false;
    gameOver = false;
    spectating = false;
    error = false;

    readonly pixi = new Application();

    gasRender!: GasRender;

    readonly netGraph = setUpNetGraph();

    readonly fontObserver = new FontFaceObserver("Inter", { weight: 600 }).load();

    music!: Sound;

    readonly tweens = new Set<Tween<object>>();

    private readonly _timeouts = new Set<Timeout>();

    addTimeout(callback: () => void, delay?: number): Timeout {
        const timeout = new Timeout(callback, Date.now() + (delay ?? 0));
        this._timeouts.add(timeout);
        return timeout;
    }

    private _initialized = false;
    async init(): Promise<void> {
        if (this._initialized) {
            throw new Error("'Game' has already been initialized.");
        }
        this._initialized = true;

        GameConsole.init();
        setUpCommands();
        await initTranslation();
        InputManager.init();
        await setUpUI();
        await fetchServerData();
        this.gasRender = new GasRender(PIXI_SCALE);
        SoundManager.init();
        MapManager.init();
        CameraManager.init();
        GasManager.init();

        const initPixi = async(): Promise<void> => {
            const renderMode = GameConsole.getBuiltInCVar("cv_renderer");
            const renderRes = GameConsole.getBuiltInCVar("cv_renderer_res");

            await this.pixi.init({
                resizeTo: window,
                background: this.colors.grass,
                antialias: InputManager.isMobile
                    ? GameConsole.getBuiltInCVar("mb_antialias")
                    : GameConsole.getBuiltInCVar("cv_antialias"),
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
            pixi.stop();
            void loadTextures(
                this.modeName,
                pixi.renderer,
                InputManager.isMobile
                    ? GameConsole.getBuiltInCVar("mb_high_res_textures")
                    : GameConsole.getBuiltInCVar("cv_high_res_textures")
            );

            // HACK: the game ui covers the canvas
            // so send pointer events manually to make clicking to spectate players work
            UIManager.ui.gameUi[0].addEventListener("pointerdown", e => {
                pixi.canvas.dispatchEvent(new PointerEvent("pointerdown", {
                    pointerId: e.pointerId,
                    button: e.button,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenY: e.screenY,
                    screenX: e.screenX
                }));
            });

            pixi.ticker.add(() => {
                this.render();

                if (GameConsole.getBuiltInCVar("pf_show_fps")) {
                    const fps = Math.round(this.pixi.ticker.FPS);
                    this.netGraph.fps.addEntry(fps);
                }
            });

            pixi.stage.addChild(
                CameraManager.container,
                DebugRenderer.graphics,
                MapManager.container,
                MapManager.mask,
                ...Object.values(this.netGraph).map(g => g.container)
            );

            MapManager.visible = !GameConsole.getBuiltInCVar("cv_minimap_minimized");
            MapManager.expanded = GameConsole.getBuiltInCVar("cv_map_expanded");
            UIManager.ui.gameUi.toggle(GameConsole.getBuiltInCVar("cv_draw_hud"));

            pixi.renderer.on("resize", () => this.resize());
            this.resize();
        };

        let menuMusicSuffix: string;
        if (GameConsole.getBuiltInCVar("cv_use_old_menu_music")) {
            menuMusicSuffix = "_old";
        } else if (this.mode.sounds?.replaceMenuMusic) {
            menuMusicSuffix = `_${this.modeName}`;
        } else {
            menuMusicSuffix = "";
        }
        this.music = sound.add("menu_music", {
            url: `./audio/music/menu_music${menuMusicSuffix}.mp3`,
            singleInstance: true,
            preload: true,
            autoPlay: true,
            loop: true,
            volume: GameConsole.getBuiltInCVar("cv_music_volume")
        });

        void Promise.all([
            initPixi(),
            SoundManager.loadSounds(),
            finalizeUI()
        ]).then(() => {
            unlockPlayButtons();
            resetPlayButtons();
        });
    }

    resize(): void {
        MapManager.resize();
        CameraManager.resize(true);
    }

    connect(address: string): void {
        this.error = false;

        if (this.gameStarted) return;

        this._socket = new WebSocket(address);
        this._socket.binaryType = "arraybuffer";

        this._socket.onopen = (): void => {
            this.pixi.start();
            this.music?.stop();
            this.connecting = false;
            this.gameStarted = true;
            this.gameOver = false;
            this.spectating = false;

            for (const graph of Object.values(this.netGraph)) graph.clear();

            if (!UI_DEBUG_MODE) {
                clearTimeout(UIManager.gameOverScreenTimeout);
                const ui = UIManager.ui;

                ui.gameOverOverlay.hide();
                ui.killMsgModal.hide();
                ui.killMsgCounter.text("0");
                ui.killFeed.html("");
                ui.spectatingContainer.hide();
                ui.joystickContainer.show();

                InputManager.emoteWheelActive = false;
                InputManager.pingWheelMinimap = false;
                UIManager.ui.emoteWheel.hide();
            }

            let skin: typeof defaultClientCVars["cv_loadout_skin"];
            this.sendPacket(JoinPacket.create({
                isMobile: InputManager.isMobile,
                name: GameConsole.getBuiltInCVar("cv_player_name"),
                skin: Skins.fromStringSafe(
                    GameConsole.getBuiltInCVar("cv_loadout_skin")
                ) ?? Skins.fromString(
                    typeof (skin = defaultClientCVars.cv_loadout_skin) === "object"
                        ? skin.value
                        : skin
                ),
                badge: Badges.fromStringSafe(GameConsole.getBuiltInCVar("cv_loadout_badge")),
                emotes: EMOTE_SLOTS.map(
                    slot => Emotes.fromStringSafe(GameConsole.getBuiltInCVar(`cv_loadout_${slot}_emote`))
                )
            }));

            CameraManager.addObject(this.gasRender.graphics);
            MapManager.indicator.setFrame("player_indicator");

            const particleEffects = this.mode.particleEffects;

            if (particleEffects !== undefined) {
                const This = this;
                const gravityOn = particleEffects.gravity;
                ParticleManager.addEmitter({
                    delay: particleEffects.delay,
                    active: GameConsole.getBuiltInCVar("cv_ambient_particles"),
                    spawnOptions: () => ({
                        frames: particleEffects.frames,
                        get position(): Vector {
                            const width = CameraManager.width / PIXI_SCALE;
                            const height = CameraManager.height / PIXI_SCALE;
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
                });
            }
        };

        // Handle incoming messages
        this._socket.onmessage = (message: MessageEvent<ArrayBuffer>): void => {
            const stream = new PacketStream(message.data);
            let iterationCount = 0;
            const splits = [0, 0, 0, 0, 0, 0, 0] satisfies DataSplit;
            while (true) {
                if (++iterationCount === 1e3) {
                    console.warn("1000 iterations of packet reading; possible infinite loop");
                }
                const packet = stream.deserialize(splits);
                if (packet === undefined) break;
                this.onPacket(packet);
            }

            const msgLength = message.data.byteLength;
            this.netGraph.receiving.addEntry(msgLength, splits);
        };

        const ui = UIManager.ui;

        this._socket.onerror = (): void => {
            this.pixi.stop();
            this.error = true;
            this.connecting = false;
            ui.splashMsgText.html(getTranslatedString("msg_err_joining"));
            ui.splashMsg.show();
            resetPlayButtons();
        };

        this._socket.onclose = (e: CloseEvent): void => {
            this.pixi.stop();
            this.connecting = false;
            resetPlayButtons();

            const reason = e.reason || "Connection lost";

            if (reason.startsWith("Invalid game version")) {
                alert(reason);
                // reload the page with a time stamp to try clearing cache
                location.search = `t=${Date.now()}`;
            }

            if (!this.gameOver) {
                if (this.gameStarted) {
                    ui.splashUi.fadeIn(400);
                    ui.splashMsgText.html(reason);
                    ui.splashMsg.show();
                }
                ui.btnSpectate.addClass("btn-disabled");
                if (!this.error) void this.endGame();
            }
        };
    }

    inventoryMsgTimeout: number | undefined;

    onPacket(packet: PacketDataOut): void {
        switch (packet.type) {
            case PacketType.Joined:
                this.startGame(packet);
                break;
            case PacketType.Map:
                MapManager.updateFromPacket(packet);
                break;
            case PacketType.Update:
                this.processUpdate(packet);
                break;
            case PacketType.GameOver:
                UIManager.showGameOverScreen(packet);
                break;
            case PacketType.Kill:
                UIManager.processKillPacket(packet);
                break;
            case PacketType.Report: {
                UIManager.processReportPacket(packet);
                break;
            }
            case PacketType.Pickup: {
                const { message, item } = packet;

                if (message !== undefined) {
                    const inventoryMsg = UIManager.ui.inventoryMsg;

                    inventoryMsg.text(getTranslatedString(this._inventoryMessageMap[message])).fadeIn(250);
                    if (message === InventoryMessages.RadioOverused) {
                        SoundManager.play("metal_light_destroyed");
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

                    SoundManager.play(soundID);
                } else {
                    console.warn("Unexpected PickupPacket with neither message nor item");
                }
                break;
            }
        }
    }

    private readonly _inventoryMessageMap: Record<InventoryMessages, TranslationKeys> = {
        [InventoryMessages.NotEnoughSpace]: "msg_not_enough_space",
        [InventoryMessages.ItemAlreadyEquipped]: "msg_item_already_equipped",
        [InventoryMessages.BetterItemEquipped]: "msg_better_item_equipped",
        [InventoryMessages.CannotUseRadio]: "msg_cannot_use_radio",
        [InventoryMessages.RadioOverused]: "msg_radio_overused"
    };

    startGame(packet: JoinedData): void {
        // Sound which notifies the player that the
        // game started if page is out of focus.
        if (!document.hasFocus()) SoundManager.play("join_notification");

        const ambience = this.mode.sounds?.ambience;
        if (ambience) {
            this.ambience = SoundManager.play(ambience, { loop: true, ambient: true });
        }

        UIManager.emotes = packet.emotes;
        UIManager.updateEmoteWheel();

        const ui = UIManager.ui;

        if (this.teamMode = packet.teamSize !== TeamSize.Solo) {
            this.teamID = packet.teamID;
        }

        ui.canvas.addClass("active");
        ui.splashUi.fadeOut(400, () => resetPlayButtons());

        ui.killLeaderLeader.html(getTranslatedString("msg_waiting_for_leader"));
        ui.killLeaderCount.text("0");
        ui.spectateKillLeader.addClass("btn-disabled");

        if (!UI_DEBUG_MODE) ui.teamContainer.toggle(this.teamMode);
    }

    async endGame(): Promise<void> {
        const ui = UIManager.ui;

        return await new Promise(resolve => {
            ui.gameMenu.fadeOut(250);
            ui.splashOptions.addClass("loading");
            ui.loaderText.text("");

            SoundManager.stopAll();

            ui.splashUi.fadeIn(400, () => {
                this.pixi.stop();
                ScreenRecordManager.endRecording();
                void this.music?.play();
                ui.teamContainer.html("");
                ui.actionContainer.hide();
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
                CameraManager.container.removeChildren();
                ParticleManager.clear();
                UIManager.clearTeammateCache();
                UIManager.clearWeaponCache();
                UIManager.reportedPlayerIDs.clear();
                UIManager.killLeaderCache = undefined;
                UIManager.oldKillLeaderId = undefined;
                UIManager.skinID = undefined;

                MapManager.safeZone.clear();
                MapManager.pingGraphics.clear();
                MapManager.pings.clear();
                MapManager.pingsContainer.removeChildren();
                MapManager.teammateIndicators.clear();
                MapManager.teammateIndicatorContainer.removeChildren();

                GasManager.time = undefined;

                this.playerNames.clear();
                this._timeouts.clear();

                CameraManager.zoom = Scopes.definitions[0].zoomLevel;
                updateDisconnectTime();
                resetPlayButtons();
                if (teamSocket) ui.createTeamMenu.fadeIn(250, resolve);
                else resolve();
            });
        });
    }

    private readonly _packetStream = new PacketStream(new ArrayBuffer(1024));
    sendPacket(packet: PacketDataIn): void {
        this._packetStream.stream.index = 0;
        this._packetStream.serialize(packet);
        this.sendData(this._packetStream.getBuffer());
    }

    sendData(buffer: ArrayBuffer): void {
        if (this._socket?.readyState === WebSocket.OPEN) {
            this.netGraph.sending.addEntry(buffer.byteLength);
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

        const hasMovementSmoothing = GameConsole.getBuiltInCVar("cv_movement_smoothing");

        const showHitboxes = GameConsole.getBuiltInCVar("db_show_hitboxes");

        for (const object of this.objects) {
            object.update();
            if (hasMovementSmoothing) object.updateInterpolation();

            if (DEBUG_CLIENT) {
                if (showHitboxes) object.updateDebugGraphics();
            }
        }

        if (hasMovementSmoothing && this.activePlayer) {
            CameraManager.position = this.activePlayer.container.position;
        }

        for (const [image, spinSpeed] of this.spinningImages.entries()) {
            image.rotation += spinSpeed * delta;
        }

        for (const tween of this.tweens) tween.update();

        for (const bullet of this.bullets) bullet.update(delta);

        ParticleManager.update(delta);

        MapManager.update();
        this.gasRender.update();

        for (const plane of this.planes) plane.update();

        CameraManager.update();
        DebugRenderer.graphics.position = CameraManager.container.position;
        DebugRenderer.graphics.scale = CameraManager.container.scale;
        DebugRenderer.render();
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

    private _pingSeq = -1;

    private readonly _seqsSent: Array<number | undefined> = [];
    get seqsSent(): Array<number | undefined> { return this._seqsSent; }

    takePingSeq(): number {
        const n = this._pingSeq = (this._pingSeq + 1) % 128;
        this._seqsSent[n] = Date.now();
        return n;
    }

    processUpdate(updateData: UpdateDataOut): void {
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
            UIManager.updateUI(playerData);
            UIManager.updateWeaponSlots(); // to load reskins

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
                    ObjectClassMapping[type] as new (id: number, data: ObjectsNetData[K]) => InstanceType<ObjectClassMapping[K]>
                )(id, data);
                this.objects.add(_object);

                // Layer Transition
                if (_object.layer !== (this.layer ?? Layer.Ground)) {
                    _object.container.alpha = 0;

                    this.layerTween = this.addTween({
                        target: _object.container,
                        to: { alpha: 1 },
                        duration: LAYER_TRANSITION_DELAY,
                        ease: EaseFunctions.sineIn,
                        onComplete: () => {
                            this.layerTween = undefined;
                        }
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

            // Layer Transition
            if (object.layer !== (this.layer ?? Layer.Ground)) {
                object.container.alpha = 1;

                this.layerTween = this.addTween({
                    target: object.container,
                    to: { alpha: 0 },
                    duration: LAYER_TRANSITION_DELAY,
                    ease: EaseFunctions.sineOut,
                    onComplete: () => {
                        this.layerTween = undefined;
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
            this.bullets.add(new Bullet(bullet));
        }

        for (const explosionData of updateData.explosions ?? []) {
            explosion(explosionData.definition, explosionData.position, explosionData.layer);
        }

        for (const emote of updateData.emotes ?? []) {
            if (
                GameConsole.getBuiltInCVar("cv_hide_emotes")
                && !("itemType" in emote.definition) // Never hide team emotes (ammo & healing items)
            ) break;

            const player = this.objects.get(emote.playerID);
            if (player?.isPlayer) {
                player.showEmote(emote.definition);
            } else {
                console.warn(`Tried to emote on behalf of ${player === undefined ? "a non-existant player" : `a/an ${ObjectCategory[player.type]}`}`);
                continue;
            }
        }

        GasManager.updateFrom(updateData);

        if (updateData.aliveCount !== undefined) {
            const { playerAlive, btnSpectate } = UIManager.ui;
            playerAlive.text(updateData.aliveCount);
            btnSpectate.toggle(updateData.aliveCount > 1);
        }

        for (const plane of updateData.planes ?? []) {
            this.planes.add(new Plane(plane.position, plane.direction));
        }

        for (const ping of updateData.mapPings ?? []) {
            MapManager.addMapPing(ping);
        }

        if (updateData.killLeader) {
            UIManager.updateKillLeader(updateData.killLeader);
        }

        this.tick();
    }

    addTween<T extends object>(config: TweenOptions<T>): Tween<T> {
        const tween = new Tween(config);
        this.tweens.add(tween);
        return tween;
    }

    removeTween(tween: Tween<object>): void {
        this.tweens.delete(tween);
    }

    backgroundTween?: Tween<{ readonly r: number, readonly g: number, readonly b: number }>;
    volumeTween?: Tween<GameSound>;

    changeLayer(layer: Layer): void {
        for (const object of this.objects) {
            object.updateZIndex();
        }

        const basement = layer === Layer.Basement1;
        MapManager.terrainGraphics.visible = !basement;
        const { red, green, blue } = this.pixi.renderer.background.color;
        const color = { r: red * 255, g: green * 255, b: blue * 255 };
        const targetColor = basement ? this.colors.void : this.colors.grass;

        this.backgroundTween?.kill();
        this.backgroundTween = this.addTween({
            target: color,
            to: { r: targetColor.red * 255, g: targetColor.green * 255, b: targetColor.blue * 255 },
            onUpdate: () => {
                this.pixi.renderer.background.color = new Color(color);
            },
            duration: LAYER_TRANSITION_DELAY,
            onComplete: () => { this.backgroundTween = undefined; }
        });

        if (this.ambience !== undefined) {
            this.volumeTween?.kill();

            let target = 1; // if, somehow, the switch fails to assign a value

            switch (true) {
                // above ground—play as normal
                case layer >= Layer.Ground: target = 1; break;

                // stairway leading down to bunker—half volume
                case layer === Layer.ToBasement1: target = 0.5; break;

                // below ground—very muted
                case layer <= Layer.Basement1: target = 0.15; break;
            }

            this.volumeTween = this.addTween({
                target: this.ambience,
                to: { volume: target },
                duration: 2000,
                onComplete: () => { this.volumeTween = undefined; }
            });
        };
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
            if (!this.gameStarted || (this.gameOver && !this.spectating)) {
                SoundManager.update();
                return;
            }
            InputManager.update();
            SoundManager.update();
            ScreenRecordManager?.update();

            const player = this.activePlayer;
            if (!player) return;

            const isAction = UIManager.action.active;
            const showCancel = isAction && !UIManager.action.fake;

            if (isAction) {
                UIManager.updateAction();
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

                // metal detectors
                } else if (isObstacle && object.definition.detector && object.notOnCoolDown) {
                    for (const player of this.objects.getCategory(ObjectCategory.Player)) {
                        if (
                            !object.hitbox.collidesWith(player.hitbox)
                            || !equalLayer(object.layer, player.layer)
                            || player.dead
                        ) continue;

                        SoundManager.play("detection", {
                            falloff: 0.25,
                            position: Vec.create(object.position.x + 20, object.position.y - 20),
                            maxRange: 200
                        });

                        object.notOnCoolDown = false;
                        setTimeout(() => object.notOnCoolDown = true, 1000);
                    }

                // bush particles
                } else if (isObstacle && object.definition.material === "bush" && object.definition.noCollisions) {
                    for (const player of this.objects.getCategory(ObjectCategory.Player)) {
                        const inBush = equalLayer(object.layer, player.layer) && object.hitbox.isPointInside(player.position);

                        if (
                            (player.bushID === undefined && !inBush) // not in this bush
                            || (player.bushID !== undefined && player.bushID !== object.id) // in a different bush
                            || player.dead
                        ) continue;

                        if (object.dead) {
                            player.bushID = undefined;
                            continue;
                        }

                        let bushSound: string | undefined;
                        if (player.bushID === undefined) {
                            // bush
                            player.bushID = object.id;
                            bushSound = "bush_rustle_1";
                        } else if (!inBush) {
                            // in this case we exit bushh lol
                            player.bushID = undefined;
                            bushSound = "bush_rustle_2";
                        }
                        if (!bushSound) continue;

                        let particle = object.definition.frames?.particle ?? `${object.definition.idString}_particle`;
                        if (object.definition.particleVariations) {
                            particle += `_${random(1, object.definition.particleVariations)}`;
                        }

                        ParticleManager.spawnParticles(2, () => ({
                            frames: particle,
                            position: object.hitbox.randomPoint(),
                            zIndex: Numeric.max((object.definition.zIndex ?? ZIndexes.Players) + 1, 4),
                            lifetime: 500,
                            scale: {
                                start: randomFloat(0.85, 0.95),
                                end: 0,
                                ease: EaseFunctions.quarticIn
                            },
                            alpha: {
                                start: 1,
                                end: 0,
                                ease: EaseFunctions.sexticIn
                            },
                            rotation: { start: randomRotation(), end: randomRotation() },
                            speed: Vec.fromPolar(randomRotation(), randomFloat(6, 9))
                        }));

                        object.playSound(bushSound, {
                            falloff: 0.25,
                            maxRange: 200
                        });
                    }
                }
            }

            const object = interactable.object ?? uninteractable.object;
            const offset = object?.isObstacle ? object.door?.offset : undefined;
            const canInteract = interactable.object !== undefined;

            const bind: string | undefined = InputManager.binds.getInputsBoundToAction(object === undefined ? "cancel_action" : "interact")[0];

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
                } = UIManager.ui;
                const type = object?.isLoot ? object.definition.itemType : undefined;

                // Update interact message
                if (object !== undefined || (isAction && showCancel)) {
                    // If the loot object hasn't changed, we don't need to redo the text
                    if (differences.object || differences.offset || differences.isAction) {
                        let text;
                        switch (true) {
                            case object?.isObstacle: {
                                if (object.definition.isActivatable || object.definition.customInteractMessage) {
                                    text = getTranslatedString(`interact_${object.definition.idString}` as TranslationKeys);
                                } else if (object.definition.isDoor) {
                                    text = object.door?.offset === 0
                                        ? getTranslatedString("action_open_door")
                                        : getTranslatedString("action_close_door");
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
                                text = getTranslatedString("action_revive", { player: UIManager.getRawPlayerName(object.id) });
                                break;
                            }
                            case isAction: {
                                text = getTranslatedString("action_cancel");
                                break;
                            }
                        }

                        if (text) interactText.text(text);
                    }

                    if (!InputManager.isMobile && (!bindChangeAcknowledged || (object === undefined && isAction))) {
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
                   if (!UI_DEBUG_MODE) interactMsg.hide();
                }

                // Mobile stuff
                if (InputManager.isMobile && canInteract) {
                    const weapons = UIManager.inventory.weapons;

                    // Auto pickup (top 10 conditionals)
                    if (
                        GameConsole.getBuiltInCVar("cv_autopickup")
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
                        InputManager.addAction(InputActions.Loot);
                    } else if ( // Auto open doors
                        object?.isObstacle
                        && object.canInteract(player)
                        && object.definition.isDoor
                        && object.door?.offset === 0
                    ) {
                        InputManager.addAction(InputActions.Interact);
                    }
                }
            }

            // funny detonate button stuff
            const detonateKey = UIManager.ui.detonateKey;
            if (!InputManager.isMobile) {
                const boomBind: string | undefined = InputManager.binds.getInputsBoundToAction("explode_c4")[0];

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
})();
