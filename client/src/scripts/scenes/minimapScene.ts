import Phaser from "phaser";

export class MinimapScene extends Phaser.Scene {
    constructor() {
        super("minimap");
    }

    // noinspection JSUnusedGlobalSymbols
    preload(): void {
        this.cameras.main.setSize(250, 250);
        this.cameras.main.setPosition(10, 10);
        this.cameras.main.setBackgroundColor(0xff0000);//49993e);
    }

    create(): void {
        this.scene.bringToTop();
    }
}
