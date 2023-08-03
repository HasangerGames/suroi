import { type Application } from "pixi.js";
import type { Game } from "./game";

interface Core {
    game?: Game
    pixi?: Application
}

/**
 * The master client controller.
 */
const core: Core = {};

export default core;
