export const HIDE_DEV_REGION = false;
export const GRASS_COLOR = "#49993e";
const regexOutput = GRASS_COLOR.match(/[a-f0-9]{2}/g);
if (regexOutput === null) throw new Error("Invalid grass color");
const [r, g, b] = regexOutput.map((value) => parseInt(value, 16));
export const GRASS_RGB = {
    r, g, b
};
export const GAS_COLOR = 0xff4800;
export const GAS_ALPHA = 0.55;

export const MINIMAP_SCALE = 2;
export const MINIMAP_GRID_WIDTH = 720 * MINIMAP_SCALE;
export const MINIMAP_GRID_HEIGHT = 720 * MINIMAP_SCALE;
