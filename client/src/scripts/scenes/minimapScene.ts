import Phaser from "phaser";
import {
    GAS_ALPHA, GAS_COLOR, GRASS_COLOR, GRASS_RGB, MINIMAP_GRID_HEIGHT, MINIMAP_GRID_WIDTH, MINIMAP_SCALE
} from "../utils/constants";
import { localStorageInstance } from "../utils/localStorageHandler";
import core from "../core";
import { MAP_HEIGHT, MAP_WIDTH } from "../../../../common/src/constants";

export class MinimapScene extends Phaser.Scene {
    playerIndicator!: Phaser.GameObjects.Image;
    isExpanded!: boolean;
    visible = true;

    gasRect!: Phaser.GameObjects.Rectangle;
    gasCircle!: Phaser.GameObjects.Arc;
    gasMask!: Phaser.Display.Masks.GeometryMask;
    gasNewPosCircle!: Phaser.GameObjects.Arc;
    gasToCenterLine!: Phaser.GameObjects.Line;

    renderTexture!: Phaser.GameObjects.RenderTexture;

    fullScreenCamera!: Phaser.Cameras.Scene2D.Camera;

    constructor() {
        super("minimap");
    }

    // noinspection JSUnusedGlobalSymbols
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    preload(): void {}

    create(): void {
        this.scene.bringToTop();

        this.renderTexture = this.add.renderTexture(0, 0, MINIMAP_GRID_WIDTH, MINIMAP_GRID_HEIGHT).setOrigin(0, 0);

        // Create gas rectangle and mask
        this.gasCircle = this.add.circle(MAP_WIDTH / 2 * MINIMAP_SCALE, MAP_HEIGHT / 2 * MINIMAP_SCALE, 750 * MINIMAP_SCALE, 0x000000, 0);
        this.gasMask = this.make.graphics().createGeometryMask(this.gasCircle).setInvertAlpha(true);
        this.gasNewPosCircle = this.add.circle(0, 0, 0).setStrokeStyle(3, 0xffffff).setDepth(15);
        this.gasToCenterLine = this.add.line(0, 0, 0, 0, 0, 0).setStrokeStyle(12, 0x00ffff).setDepth(14);

        this.fullScreenCamera = this.cameras.add();

        this.gasRect = this.add.rectangle(MAP_WIDTH / 2 * MINIMAP_SCALE,
            MAP_HEIGHT / 2 * MINIMAP_SCALE,
            (MAP_WIDTH * 1.5) * MINIMAP_SCALE,
            (MAP_HEIGHT * 1.5) * MINIMAP_SCALE,
            GAS_COLOR, GAS_ALPHA).setDepth(10).setMask(this.gasMask);

        this.scale.on("resize", (): void => {
            this.resizeBigMap();
            this.resizeSmallMap();
        });

        if (core.game?.playerManager.isMobile) {
            const minimapElement = document.getElementById("minimap-border");
            if (minimapElement) {
                minimapElement.addEventListener("click", () => { this.toggle(); });
            }
            // Using mousedown instead of pointerdown because we don't want to close the minimap if the user decides to move around while having it open
            onmousedown = () => {
                if (this.isExpanded) this.toggle();
            };
        }

        this.playerIndicator = this.add.image(0, 0, "main", "player_indicator.svg").setDepth(16).setScale(0.1 * MINIMAP_SCALE);
        this.switchToSmallMap();

        if (localStorageInstance.config.minimapMinimized && this.visible) this.toggleMiniMap();
    }

    toggle(): void {
        if (this.isExpanded) this.switchToSmallMap();
        else this.switchToBigMap();
    }

    toggleMiniMap(noSwitchToggle = false): void {
        if (this.cameras.main === undefined) return;
        this.visible = !this.visible;
        this.cameras.main.setVisible(this.visible);
        $("#minimap-border").toggle(this.visible);
        localStorageInstance.update({ minimapMinimized: !this.visible });
        if (!noSwitchToggle) {
            $("#toggle-hide-minimap").prop("checked", !this.visible);
        }
    }

    resizeBigMap(): void {
        if (this.fullScreenCamera === undefined) return;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        this.fullScreenCamera.setZoom((0.85 * screenHeight) / (MAP_HEIGHT * MINIMAP_SCALE));
        // noinspection JSSuspiciousNameCombination
        this.fullScreenCamera.setSize(screenHeight, screenHeight);
        this.fullScreenCamera.setPosition(screenWidth / 2 - screenHeight / 2, 0);
        this.fullScreenCamera.centerOn(MAP_WIDTH / 2 * MINIMAP_SCALE, (MAP_HEIGHT * 1.1) / 2 * MINIMAP_SCALE);
        $("#scopes-container").hide();
        this.updateTransparency();
    }

    resizeSmallMap(): void {
        if (this.cameras.main === undefined || this.playerIndicator === undefined) return;
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
        $("#scopes-container").show();
        this.updateTransparency();
    }

    switchToBigMap(): void {
        if (this.cameras.main === undefined || this.fullScreenCamera === undefined) return;
        this.fullScreenCamera.setVisible(true);
        this.isExpanded = true;
        this.resizeBigMap();
        this.cameras.main.setVisible(false);
        $("#minimap-border").hide();
    }

    switchToSmallMap(): void {
        if (this.cameras.main === undefined || this.fullScreenCamera === undefined) return;
        this.isExpanded = false;
        this.fullScreenCamera.setVisible(false);
        this.cameras.main.setVisible(this.visible);
        this.resizeSmallMap();
        $("#minimap-border").toggle(this.visible);
    }

    updateTransparency(): void {
        if (this.cameras.main === undefined || this.fullScreenCamera === undefined) return;
        this.cameras.main.setBackgroundColor({ ...GRASS_RGB, a: localStorageInstance.config.minimapTransparency * 255 });
        this.cameras.main.setAlpha(localStorageInstance.config.minimapTransparency);
        this.fullScreenCamera.setBackgroundColor({ ...GRASS_RGB, a: localStorageInstance.config.bigMapTransparency * 255 });
        this.fullScreenCamera.setAlpha(localStorageInstance.config.bigMapTransparency);
    }
}
