import { MAP_HEIGHT, MAP_WIDTH } from "../../../../common/src/constants";

export const HIDE_DEV_REGION = false;
export const GRASS_COLOR = 0x49993e;
export const GRASS_RGB = {
    r: 73,
    g: 153,
    b: 62
};
export const GAS_COLOR = 0xff4800;
export const GAS_ALPHA = 0.55;

export const MINIMAP_COLOR = {
    r: 61, 
    g: 128, 
    b: 61,
}
export const MINIMAP_SCALE = 2;
export const MINIMAP_GRID_WIDTH = MAP_WIDTH * MINIMAP_SCALE;
export const MINIMAP_GRID_HEIGHT = MAP_HEIGHT * MINIMAP_SCALE;
