import Phaser from "phaser";
import {
    GAS_ALPHA, GAS_COLOR, GRASS_COLOR, MINIMAP_SCALE
} from "../utils/constants";
import { localStorageInstance } from "../utils/localStorageHandler";
import core from "../core";

export class MinimapScene extends Phaser.Scene {
    playerIndicator!: Phaser.GameObjects.Image;
    playerIndicatorDead = false;
    isExpanded!: boolean;
    visible = true;

    gasRect!: Phaser.GameObjects.Rectangle;
    gasCircle!: Phaser.GameObjects.Arc;
    gasMask!: Phaser.Display.Masks.GeometryMask;
    // gasToCenterLine!: Phaser.GameObjects.Line;

    renderTexture!: Phaser.GameObjects.RenderTexture;

    constructor() {
        super("minimap");
    }

    // noinspection JSUnusedGlobalSymbols
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    preload(): void {}

    create(): void {
        this.scene.bringToTop();

        this.playerIndicatorDead = false;

        // Draw the grid
        const GRID_WIDTH = 720 * MINIMAP_SCALE;
        const GRID_HEIGHT = 720 * MINIMAP_SCALE;
        const CELL_SIZE = 16 * MINIMAP_SCALE;

        this.renderTexture = this.add.renderTexture(0, 0, GRID_WIDTH, GRID_HEIGHT).setOrigin(0, 0);

        //const size = (720 * MINIMAP_SCALE) + MINIMAP_SCALE;
        //this.renderTexture = this.add.renderTexture(0, 0, size, size).setOrigin(0, 0);

        for (let x = 0; x <= GRID_WIDTH; x += CELL_SIZE) {
            this.add.rectangle(x, 0, MINIMAP_SCALE, GRID_HEIGHT, 0x000000, 0.35).setOrigin(0, 0);
        }
        for (let y = 0; y <= GRID_HEIGHT; y += CELL_SIZE) {
            this.add.rectangle(0, y, GRID_WIDTH, MINIMAP_SCALE, 0x000000, 0.35).setOrigin(0, 0);
        }

        // Create gas rectangle and mask
        this.gasCircle = this.add.circle(360 * MINIMAP_SCALE, 360 * MINIMAP_SCALE, 512 * MINIMAP_SCALE, 0x000000, 0);
        this.gasMask = this.make.graphics().createGeometryMask(this.gasCircle).setInvertAlpha(true);
        this.gasRect = this.add.rectangle(360 * MINIMAP_SCALE, 360 * MINIMAP_SCALE, 1000 * MINIMAP_SCALE, 1000 * MINIMAP_SCALE, GAS_COLOR, GAS_ALPHA).setDepth(10).setMask(this.gasMask);

        this.scale.on("resize", (): void => {
            if (this.isExpanded) this.resizeBigMap();
            else this.resizeSmallMap();
        });

        // HACK: Use the gas rect to handle click events
        this.gasRect.setInteractive().on("pointerdown", () => {
            if (core.game?.playerManager.isMobile) this.toggle();
        });

        this.playerIndicator = this.add.image(360, 360, "main", "player_indicator.svg").setDepth(10).setScale(0.1 * MINIMAP_SCALE);
        this.switchToSmallMap();

        if (localStorageInstance.config.minimapMinimized && this.visible) this.toggleMiniMap();
    }

    toggle(): void {
        if (this.isExpanded) this.switchToSmallMap();
        else this.switchToBigMap();
    }

    toggleMiniMap(): void {
        if (this.cameras.main === undefined) return;
        this.visible = !this.visible;
        this.cameras.main.setVisible(this.visible);
        $("#minimap-border").toggle(this.visible);
        localStorageInstance.update({ minimapMinimized: !this.visible });
    }

    resizeBigMap(): void {
        if (this.cameras.main === undefined) return;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        this.cameras.main.setZoom(0.0012 / MINIMAP_SCALE * screenHeight);
        // noinspection JSSuspiciousNameCombination
        this.cameras.main.setSize(screenHeight, screenHeight);
        this.cameras.main.setPosition(screenWidth / 2 - screenHeight / 2, 0);
        this.cameras.main.centerOn(360 * MINIMAP_SCALE, 380 * MINIMAP_SCALE);
    }

    resizeSmallMap(): void {
        if (this.cameras.main === undefined) return;
        if (window.innerWidth > 1200) {
            this.cameras.main.setSize(200, 200);
            this.cameras.main.setPosition(20, 20);
            this.cameras.main.setZoom(1 / MINIMAP_SCALE / 1.25);
        } else {
            this.cameras.main.setSize(125, 125);
            this.cameras.main.setPosition(10, 10);
            this.cameras.main.setZoom(1 / MINIMAP_SCALE / 2);
        }
        this.cameras.main.setBackgroundColor(GRASS_COLOR);
        this.cameras.main.startFollow(this.playerIndicator);
    }

    switchToBigMap(): void {
        if (this.cameras.main === undefined) return;
        this.cameras.main.setVisible(true);
        this.isExpanded = true;
        this.cameras.main.stopFollow();
        this.resizeBigMap();
        $("#minimap-border").hide();
        this.updateTransparency();
    }

    switchToSmallMap(): void {
        if (this.cameras.main === undefined) return;
        this.resizeSmallMap();
        this.isExpanded = false;
        this.cameras.main.setVisible(this.visible);
        $("#minimap-border").toggle(this.visible);
        this.updateTransparency();
    }

    updateTransparency(): void {
        if (this.cameras.main === undefined) return;
        this.cameras.main.setAlpha(this.isExpanded ? localStorageInstance.config.bigMapTransparency : localStorageInstance.config.minimapTransparency);
    }
}
