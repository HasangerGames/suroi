import { type Application } from "pixi.js";
import type { Game } from "./game";

interface Core {
    game?: Game
    pixi?: Application
    isMobile: boolean
}

/**
 * The master client controller.
 */
const core: Core = { isMobile: "maxTouchPoints" in navigator && navigator.maxTouchPoints > 0 };

export default core;
