import Phaser from "phaser";
import {
    GAS_ALPHA, GAS_COLOR, GRASS_COLOR
} from "../utils/constants";

export class MinimapScene extends Phaser.Scene {
    playerIndicator!: Phaser.GameObjects.Image;
    playerIndicatorDead = false;
    isExpanded!: boolean;

    gasRect!: Phaser.GameObjects.Rectangle;
    gasCircle!: Phaser.GameObjects.Arc;
    gasMask!: Phaser.Display.Masks.GeometryMask;
    //gasToCenterLine!: Phaser.GameObjects.Line;

    renderTexture!: Phaser.GameObjects.RenderTexture;

    constructor() {
        super("minimap");
    }

    // noinspection JSUnusedGlobalSymbols
    preload(): void {
        this.load.atlas("main", "/img/atlases/main.png", "/img/atlases/main.json");
        this.cameras.main.setBackgroundColor(GRASS_COLOR);
    }

    create(): void {
        this.scene.bringToTop();

        // Draw the grid
        const GRID_WIDTH = 7200;
        const GRID_HEIGHT = 7200;
        const CELL_SIZE = 80;

        for (let x = 0; x <= GRID_WIDTH; x += CELL_SIZE) {
            this.add.rectangle(x, 0, 5, GRID_HEIGHT, 0x000000, 0.35).setOrigin(0, 0);
        }
        for (let y = 0; y <= GRID_HEIGHT; y += CELL_SIZE) {
            this.add.rectangle(0, y, GRID_WIDTH, 5, 0x000000, 0.35).setOrigin(0, 0);
        }

        this.renderTexture = this.add.renderTexture(0, 0, 7200, 7200).setOrigin(0, 0);

        // Create gas rectangle and mask
        this.gasCircle = this.add.circle(3600, 3600, 5120, 0x000000, 0);
        this.gasMask = this.make.graphics().createGeometryMask(this.gasCircle).setInvertAlpha(true);
        this.gasRect = this.add.rectangle(3600, 3600, 10000, 10000, GAS_COLOR, GAS_ALPHA).setDepth(10).setMask(this.gasMask);
        //this.gasToCenterLine = this.add.line(3600, 3600).setStrokeStyle(4, 0xffff00);

        $(window).on("resize", () => {
            if (this.isExpanded) this.resizeBigMap();
        });

        this.playerIndicator = this.add.image(3600, 3600, "main", "player_indicator.svg").setDepth(10);
        this.switchToSmallMap();
    }

    toggle(): void {
        if (this.isExpanded) this.switchToSmallMap();
        else this.switchToBigMap();
    }

    resizeBigMap(): void {
        if (this.sys === undefined) return;
        const screenWidth: number = this.sys.game.canvas.width;
        const screenHeight: number = this.sys.game.canvas.height;
        this.cameras.main.setZoom(0.00012 * screenHeight);
        // noinspection JSSuspiciousNameCombination
        this.cameras.main.setSize(screenHeight, screenHeight);
        this.cameras.main.setPosition(screenWidth / 2 - screenHeight / 2, 0);
    }

    switchToBigMap(): void {
        this.isExpanded = true;
        this.resizeBigMap();
        this.cameras.main.stopFollow();
        this.cameras.main.centerOn(3600, 3800);
        $("#minimap-border").hide();
    }

    switchToSmallMap(): void {
        this.isExpanded = false;
        this.cameras.main.setSize(250, 250);
        this.cameras.main.setPosition(20, 20);
        this.cameras.main.setZoom(0.1);
        this.cameras.main.startFollow(this.playerIndicator);
        $("#minimap-border").show();
    }
}
