import { isMobile, type Application } from "pixi.js";
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
    isMobile: isMobile.any,
    music: new Howl({ src: "./audio/music/menu_music.mp3" })
};

export default core;
