import Phaser from "phaser";

import { localStorageInstance } from "../utils/localStorageHandler";

declare const ATLAS_HASH: string;

export class MenuScene extends Phaser.Scene {
    menuMusic?: Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;

    constructor() {
        super("menu");
    }

    preload(): void {
        for (const atlas of ["main"]) {
            const path = `img/atlases/${atlas}.${ATLAS_HASH}`;
            console.log(`Loading atlas: ${location.toString()}${path}.png`);
            this.load.atlas(atlas, `/${path}.png`, `/${path}.json`);
        }

        this.load.audio("menu", "/audio/music/menu_music.mp3");
        this.sound.pauseOnBlur = false;
        this.input.mouse?.disableContextMenu();
    }

    create(): void {
        this.startMusic();
    }

    startMusic(): void {
        const volume = localStorageInstance.config.musicVolume ?? 1;
        if (this.menuMusic === undefined) {
            this.menuMusic = this.sound.add("menu", { volume });
        }
        this.menuMusic?.setSeek(0);
        this.menuMusic.play();
    }

    setMusicVolume(volume: number): void {
        if (this.menuMusic === undefined) return;
        this.menuMusic.volume = volume;
    }

    stopMusic(): void {
        this.tweens.add({
            targets: this.menuMusic,
            volume: 0,
            duration: 2000,
            onComplete: (): void => {
                this.menuMusic?.stop();
            }
        });
    }
}
