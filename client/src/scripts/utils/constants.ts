import { Color } from "pixi.js";
import { MODE } from "../../../../common/src/definitions/modes";

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

// Converts the strings in the mode definition to Color objects
/* eslint-disable @typescript-eslint/indent */
export const COLORS = Object.keys(MODE.colors)
    .reduce<Record<string, Color>>((result, key) => {
        result[key] = new Color(MODE.colors[key]);
        return result;
    }, {});

export const PIXI_SCALE = 20;

export const FIRST_EMOTE_ANGLE = Math.atan2(-1, -1);
export const SECOND_EMOTE_ANGLE = Math.atan2(1, 1);
export const THIRD_EMOTE_ANGLE = Math.atan2(-1, 1);
export const FOURTH_EMOTE_ANGLE = Math.atan2(1, -1);
