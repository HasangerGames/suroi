import type { Game } from "./game";

interface Core {
    game?: Game
}

/**
 * The master client controller.
 */
const core: Core = {};

export default core;
