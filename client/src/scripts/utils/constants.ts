import { MAP_HEIGHT, MAP_WIDTH } from "../../../../common/src/constants";

export const HIDE_DEV_REGION = false;
export const UI_DEBUG_MODE = false;
export const GRASS_COLOR = 0x49993e;
export const GRASS_RGB = {
    r: 73,
    g: 153,
    b: 62
};
export const GAS_COLOR = 0xff4800;
export const GAS_ALPHA = 0.55;

export const MINIMAP_SCALE = 2;
export const MINIMAP_GRID_WIDTH = MAP_WIDTH * MINIMAP_SCALE;
export const MINIMAP_GRID_HEIGHT = MAP_HEIGHT * MINIMAP_SCALE;

export enum EmoteSlot {
    Top,
    Right,
    Bottom,
    Left,
    None
}

export const FIRST_EMOTE_ANGLE = Math.atan2(-1, -1);
export const SECOND_EMOTE_ANGLE = Math.atan2(1, 1);
export const THIRD_EMOTE_ANGLE = Math.atan2(-1, 1);
export const FOURTH_EMOTE_ANGLE = Math.atan2(1, -1);
