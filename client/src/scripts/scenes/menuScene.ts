import Phaser from "phaser";
import { localStorageInstance } from "../utils/localStorageHandler";

export class MenuScene extends Phaser.Scene {
    menuMusic?: Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;

    constructor() {
        super("menu");
    }

    preload(): void {
        this.load.audio("menu", require("../../assets/audio/music/menu_music.mp3"));
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
            this.menuMusic.setLoop(true);
        }

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
            onComplete: () => {
                this.menuMusic?.stop();
                this.menuMusic?.setSeek(0);
            }
        });
    }
}
