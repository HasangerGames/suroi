/* eslint-disable @typescript-eslint/indent */
import { Color } from "pixi.js";
import { Modes, type ColorKeys } from "../../../../common/src/definitions/modes";
import { Config } from "../config";

export const UI_DEBUG_MODE = false;
export const HITBOX_DEBUG_MODE = true;

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

export const MODE = Modes.find(m => m.idString === Config.mode)!;

// Converts the strings in the mode definition to Color objects
export const COLORS = (Object.keys(MODE.colors) as ColorKeys[])
    .reduce(
        (result, key) => {
            result[key] = new Color(MODE.colors[key]);
            return result;
        },
        // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter, @typescript-eslint/consistent-type-assertions
        {} as Record<ColorKeys, Color>
    );

export const GHILLIE_TINT = COLORS.grass.multiply(new Color("hsl(0, 0%, 99%)"));

export const PIXI_SCALE = 20;

export const FIRST_EMOTE_ANGLE = Math.atan2(-1, -1);
export const SECOND_EMOTE_ANGLE = Math.atan2(1, 1);
export const THIRD_EMOTE_ANGLE = Math.atan2(-1, 1);
export const FOURTH_EMOTE_ANGLE = Math.atan2(1, -1);
