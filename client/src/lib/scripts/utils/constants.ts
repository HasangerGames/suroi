import { Color } from "pixi.js";
import pkg from "../../../../../package.json";

export const APP_VERSION = pkg.version;

export const PIXI_SCALE = 20;

export const WALL_STROKE_WIDTH = 8;

export const DIFF_LAYER_HITBOX_OPACITY = 0.25;

export const LAYER_TRANSITION_DELAY = 200;

export const PERK_MESSAGE_FADE_TIME = 250;

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

export const EMOTE_SLOTS = ["top", "right", "bottom", "left", "extra1", "extra2", "win", "death"] as const;

export const BULLET_WHIZ_SCALE = 5;

export const BULLET_SOUND_SPEED_MULTIPLIERS = Object.freeze({
    saturate: 0.75,
    thin: 1.75,
    split: 1.25
});

export const SHOCKWAVE_EXPLOSION_MULTIPLIERS = Object.freeze({
    time: 5,
    amplitude: 1,
    wavelength: 1,
    speed: 100
});
