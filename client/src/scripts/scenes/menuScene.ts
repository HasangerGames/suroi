import Phaser from "phaser";
import { version } from "../../../package.json";
import { localStorageInstance } from "../utils/localStorageHandler";

export class MenuScene extends Phaser.Scene {
    menuMusic?: Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;

    constructor() {
        super("menu");
    }

    preload(): void {
        this.load.atlas("main", `/img/atlases/main-${version}.png`, `/img/atlases/main-${version}.json`);

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
