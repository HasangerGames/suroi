import { type Application } from "pixi.js";
import type { Game } from "./game";
import { Howl } from "howler";

interface Core {
    game?: Game
    pixi?: Application
    isMobile: boolean
    music: Howl
}

/**
 * The master client controller.
 */
const core: Core = {
    isMobile: "maxTouchPoints" in navigator && navigator.maxTouchPoints > 0,
    music: new Howl({ src: "./audio/music/menu_music.mp3" })
};

export default core;
