import type { GameConsole } from "../console/gameConsole";
import type { Game } from "../game";

// this fuckass class only exists because a bunch of stuff imports jQuery and pixi which don't play nice with SSR
export const LegacyBridge = new (class LegacyBridge {
    getBuiltInCVar!: typeof GameConsole.getBuiltInCVar;
    setBuiltInCVar!: typeof GameConsole.setBuiltInCVar;
    play!: typeof Game.play;
    endGame!: typeof Game.endGame;
})();
