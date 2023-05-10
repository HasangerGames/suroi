/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
    menuMusic: Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound;

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
        if (this.menuMusic === undefined) {
            this.menuMusic = this.sound.add("menu");
            this.menuMusic.setLoop(true);
        }

        this.menuMusic.play();
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
