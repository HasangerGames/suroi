import { Color } from "pixi.js";
import { Modes, type ColorKeys } from "../../../../common/src/definitions/modes";
import { loadTextures,loaded_mode } from "./pixi";
import type { Game } from "../game";

export const UI_DEBUG_MODE = false;
export const HITBOX_DEBUG_MODE = false;

export const HITBOX_COLORS = {
    obstacle: new Color("red"),
    obstacleNoCollision: new Color("yellow"),
    spawnHitbox: new Color("orange"),
    buildingZoomCeiling: new Color("purple"),
    buildingScopeCeiling: new Color("cyan"),
    loot: new Color("magenta"),
    player: new Color("blue"),
    playerWeapon: new Color("lime")
};

export var MODE = Modes[0];

// Converts the strings in the mode definition to Color objects
export var COLORS = (Object.keys(MODE.colors) as ColorKeys[])
    .reduce(
        (result, key) => {
            result[key] = new Color(MODE.colors[key]);
            return result;
        },
        // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter, @typescript-eslint/consistent-type-assertions
        {} as Record<ColorKeys, Color>
    );


export async function setMode(mode:string,game:Game){
    MODE   = Modes.find(m => m.idString === mode)!;
    COLORS = (Object.keys(MODE.colors) as ColorKeys[])
    .reduce(
        (result, key) => {
            result[key] = new Color(MODE.colors[key]);
            return result;
        },
        // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter, @typescript-eslint/consistent-type-assertions
        {} as Record<ColorKeys, Color>
    )
    GHILLIE_TINT = COLORS.grass.multiply(new Color("hsl(0, 0%, 99%)"));
    await loadTextures(
        game.pixi.renderer,
        game.console.getBuiltInCVar("cv_high_res_textures") &&
            (!game.inputManager.isMobile || game.console.getBuiltInCVar("mb_high_res_textures"))
    );
}

export let GHILLIE_TINT=COLORS.grass.multiply(new Color("hsl(0, 0%, 99%)"));
export const TEAMMATE_COLORS = [
    new Color("#00ffff"),
    new Color("#ff00ff"),
    new Color("#ffff00"),
    new Color("#ff8000")
];

export const PIXI_SCALE = 20;

export const FIRST_EMOTE_ANGLE = Math.atan2(-1, -1);
export const SECOND_EMOTE_ANGLE = Math.atan2(1, 1);
export const THIRD_EMOTE_ANGLE = Math.atan2(-1, 1);
export const FOURTH_EMOTE_ANGLE = Math.atan2(1, -1);

export const emoteSlots = ["top", "right", "bottom", "left", "win", "death"] as const;
