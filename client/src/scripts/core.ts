import type { Game as PhaserGame } from "phaser";

import type { Game } from "./game";

interface Core {
    phaser?: PhaserGame
    game?: Game
}

/**
 * The master client controller.
 */
const core: Core = {};

export default core;
