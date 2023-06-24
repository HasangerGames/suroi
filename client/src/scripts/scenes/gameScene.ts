import Phaser from "phaser";

import core from "../core";
import type { Game } from "../game";
import type { MenuScene } from "./menuScene";
import { Player } from "../objects/player";

import { InputPacket } from "../packets/sending/inputPacket";
import { JoinPacket } from "../packets/sending/joinPacket";

import { localStorageInstance } from "../utils/localStorageHandler";
import type { PlayerManager } from "../utils/playerManager";
import { GAS_ALPHA, GAS_COLOR } from "../utils/constants";

import { ObjectCategory } from "../../../../common/src/constants";
import { Materials } from "../../../../common/src/definitions/obstacles";
import { Guns } from "../../../../common/src/definitions/guns";

import { ObjectType } from "../../../../common/src/utils/objectType";

export class GameScene extends Phaser.Scene {
    activeGame!: Game;
    sounds: Map<string, Phaser.Sound.BaseSound> = new Map<string, Phaser.Sound.BaseSound>();
    soundsToLoad: Set<string> = new Set<string>();
    volume = localStorageInstance.config.sfxVolume * localStorageInstance.config.masterVolume;
    playerManager!: PlayerManager;

    gasRect!: Phaser.GameObjects.Rectangle;
    gasCircle!: Phaser.GameObjects.Arc;
    gasMask!: Phaser.Display.Masks.GeometryMask;

    tickInterval!: number;

    constructor() {
        super("game");
    }

    // noinspection JSUnusedGlobalSymbols
    preload(): void {
        if (core.game === undefined) return;
        this.activeGame = core.game;
        this.playerManager = core.game.playerManager;

        for (const material of Materials) {
            this.loadSound(`${material}_hit_1`, `sfx/hits/${material}_hit_1`);
            this.loadSound(`${material}_hit_2`, `sfx/hits/${material}_hit_2`);
            this.loadSound(`${material}_destroyed`, `sfx/hits/${material}_destroyed`);
        }

        for (const gun of Guns) {
            this.loadSound(`${gun.idString}_fire`, `sfx/weapons/${gun.idString}_fire`);
            this.loadSound(`${gun.idString}_switch`, `sfx/weapons/${gun.idString}_switch`);
            this.loadSound(`${gun.idString}_reload`, `sfx/weapons/${gun.idString}_reload`);
        }

        this.loadSound("player_hit_1", "sfx/hits/player_hit_1");
        this.loadSound("player_hit_2", "sfx/hits/player_hit_2");

        this.loadSound("pickup", "sfx/pickup");

        this.loadSound("swing", "sfx/swing");
        this.loadSound("grass_step_01", "sfx/footsteps/grass_01");
        this.loadSound("grass_step_02", "sfx/footsteps/grass_02");

        this.scale.on("resize", this.resize.bind(this));
    }

    private resize(): void {
        this.cameras.main.setZoom(window.innerWidth / 2560); // 2560 = 1x, 5120 = 2x
        this.gasRect.setSize(this.game.canvas.width * 2, this.game.canvas.height * 2).setScale(1 / this.cameras.main.zoom, 1 / this.cameras.main.zoom);
    }

    private loadSound(name: string, path: string): void {
        try {
            this.load.audio(name, require(`../../assets/audio/${path}.mp3`));
            this.soundsToLoad.add(name);
        } catch (e) {
            console.warn(`Failed to load sound: ${name}`);
            console.error(e);
        }
    }

    get player(): Player {
        return this.activeGame.activePlayer;
    }

    create(): void {
        (this.scene.get("menu") as MenuScene).stopMusic();

        for (const sound of this.soundsToLoad) {
            this.sounds.set(sound, this.sound.add(sound));
        }

        $("#game-ui").show();

        // Draw the grid
        const GRID_WIDTH = 7200;
        const GRID_HEIGHT = 7200;
        const CELL_SIZE = 160;

        for (let x = 0; x <= GRID_WIDTH; x += CELL_SIZE) {
            this.add.line(x, 0, x, 0, x, GRID_HEIGHT * 2, 0x000000, 0.25).setOrigin(0, 0);
        }
        for (let y = 0; y <= GRID_HEIGHT; y += CELL_SIZE) {
            this.add.line(0, y, 0, y, GRID_WIDTH * 2, y, 0x000000, 0.25).setOrigin(0, 0);
        }

        // Create gas rectangle and mask
        this.gasCircle = this.add.circle(7200, 7200, 10240, 0x000000, 0);
        this.gasMask = this.make.graphics().createGeometryMask(this.gasCircle).setInvertAlpha(true);
        this.gasRect = this.add.rectangle(0, 0, this.game.canvas.width * 2, this.game.canvas.height * 2, GAS_COLOR, GAS_ALPHA)
            .setDepth(10).setMask(this.gasMask).setScrollFactor(0, 0).setOrigin(0.25, 0.25);

        // Create the player
        this.activeGame.activePlayer = new Player(this.activeGame, this, ObjectType.categoryOnly(ObjectCategory.Player), -1, true);
        this.playerManager.name = $("#username-input").text();

        // Follow the player w/ the camera
        this.cameras.main.startFollow(this.player.images.container);

        // Send a packet indicating that the game is now active
        this.activeGame.sendPacket(new JoinPacket(this.playerManager));

        // Initializes sounds
        [
            "swing",
            "grass_step_01",
            "grass_step_02"
        ].forEach(item => this.sounds.set(item, this.sound.add(item, { volume: this.volume })));

        this.resize();

        // Start the tick loop
        this.tickInterval = window.setInterval(this.tick.bind(this), 30);

        this.events.on("shutdown", () => {
            window.clearInterval(this.tickInterval);
        });
    }

    playSound(name: string): void {
        const sound: Phaser.Sound.BaseSound | undefined = this.sounds.get(name);
        if (sound === undefined) {
            console.warn(`Unknown sound: "${name}"`);
            return;
        }
        sound.play({ volume: this.volume });
    }

    tick(): void {
        if (!this.activeGame.gameStarted) return;

        if (this.playerManager.dirty.inputs) {
            this.playerManager.dirty.inputs = false;
            this.activeGame.sendPacket(new InputPacket(this.playerManager));
        }
    }

    update(): void {
        if (localStorageInstance.config.showFPS) {
            $("#fps-counter").text(`${Math.round(this.game.loop.actualFps)} fps`);
        }
    }
}
