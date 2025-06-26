import { Layer } from "@common/constants";
import { Color } from "pixi.js";

export const FORCE_MOBILE = false;
export const UI_DEBUG_MODE = false;
export const DIFF_LAYER_HITBOX_OPACITY = 0.25;
export const FOOTSTEP_HITBOX_LAYER = Layer.Ground;

export const LAYER_TRANSITION_DELAY = 200;
export const SOUND_FILTER_FOR_LAYERS = true; // TODO: test this, unsure if it glitches the sound manager. From testing in test server most of the times the sound would cut off and glitch.

export const HITBOX_COLORS = {
    obstacle: new Color("red"),
    obstacleNoCollision: new Color("yellow"),
    stair: new Color("white"),
    spawnHitbox: new Color("orange"),
    bunkerSpawnHitbox: new Color("greenyellow"),
    buildingZoomCeiling: new Color("purple"),
    buildingScopeCeiling: new Color("cyan"),
    buildingVisOverride: new Color("teal"),
    buildingCeilingRaycast: new Color("darkslateblue"),
    bulletMask: new Color("fuchsia"), // me when this is the same as magenta
    landHitbox: new Color("orangered"),
    loot: new Color("magenta"),
    player: new Color("blue"),
    playerWeapon: new Color("lime"),
    projectiles: new Color("#ba31ff"),
    pivot: new Color("#271b3d")
};

export const TEAMMATE_COLORS = [
    new Color("#00ffff"),
    new Color("#ff00ff"),
    new Color("#ffff00"),
    new Color("#ff8000")
];

export const PIXI_SCALE = 20;

export const WALL_STROKE_WIDTH = 8;

export const EMOTE_SLOTS = ["top", "right", "bottom", "left", "extra1", "extra2", "win", "death"] as const;

export const SHOCKWAVE_EXPLOSION_MULTIPLIERS = Object.freeze({
    time: 5,
    amplitude: 1,
    wavelength: 1,
    speed: 100
});

export const BULLET_WHIZ_SCALE = 5;
