import { type ReferenceTo } from "../utils/objectDefinitions";
import { FloorNames } from "../utils/terrain";
import { type ScopeDefinition } from "./items/scopes";

export type ModeName =
    | "normal"
    | "fall"
    | "halloween"
    | "infection"
    | "hunted"
    | "birthday"
    | "winter"
    | "nye";

export type SpritesheetNames = ModeName | "shared";

export type ColorKeys =
    | "grass"
    | "water"
    | "border"
    | "beach"
    | "riverBank"
    | "trail"
    | "gas"
    | "void";

export interface ModeDefinition {
    /** Used for mode inheritance. */
    readonly similarTo?: ModeName
    /** Terrain colors. Color values must be in `HSL` or `HSLA` format. */
    readonly colors: Record<ColorKeys, string>
    /** The spritesheets that will be used for the mode. They are loaded from first to last (in the array). The last spritesheet/mode name in the array will be the one that will replace the others in some cases. */
    readonly spriteSheets: readonly SpritesheetNames[]
    readonly ambience?: string
    readonly ambienceVolume?: number
    /** Disables river and ocean ambiences for the mode. Currently only used for winter mode. */
    readonly noRiverAmbience?: boolean
    /** Replaces the menu's music by searching for a file with name `menu_music_[MODENAME].mp3` in the `/public/audio/music/` directory. */
    readonly replaceMenuMusic?: boolean
    /** The default player spawning scope of the mode. */
    readonly defaultScope?: ReferenceTo<ScopeDefinition>
    /** Enables obstacle variants. Basically adds the mode name to any set obstacles' idString (for example, `barrel_winter`). Currently only used in winter mode. */
    readonly obstacleVariants?: boolean
    /** Currently used only for `infection` & `halloween` modes. Adjusts the brightness and the saturation of the game's canvas. */
    readonly canvasFilters?: {
        readonly brightness: number
        readonly saturation: number
    }
    /** will be multiplied by the bullet trail color */
    readonly bulletTrailAdjust?: string
    /** The mode's particle effects, like falling leaves, snowflakes etc. */
    readonly particleEffects?: {
        readonly frames: string | readonly string[]
        readonly delay: number
        readonly tint?: number
        /** If set to true, it forces particles to only move in a single downwards direction. */
        readonly gravity?: boolean
    }
    readonly specialLogo?: boolean
    /** The image that will be used for the play button. */
    readonly playButtonImage?: string
    /** Enables weapon swap. If left unset/undefined, weapon swap will be disabled. */
    readonly weaponSwap?: boolean
    /** Used for H.U.N.T.E.D. mode bunkers. */
    readonly unlockStage?: number
    /** Drops a golden/special airdrop at a specific stage, works the same as `unlockStage`. */
    readonly forcedGoldAirdropStage?: number
    readonly overrideUpstairsFunctionality?: boolean // hunting stand hunting stand hunting stand hunting stand hunting stand
    /** Replaces all water floors of the terrain with the set floor name. */
    readonly replaceWaterBy?: FloorNames
    /** The default floor type for the ground. Default is `FloorNames.Grass`. */
    readonly defaultGroundFloor?: FloorNames // todo: figure out a logic to share this with `getFloor` in terrain.ts
    /** The max equipment level for the mode. Default is level 3. Max equipment level will be displayed with yellow-ish color in the HUD. */
    readonly maxEquipmentLevel?: number
    /** Enables extra glowing bullet filters. */
    readonly bulletFilters?: boolean
    /** How often an airdrop should be summoned, regardless of the gas stages. (ms) */
    readonly summonAirdropsInterval?: number
    /** Currently only used for winter-type modes, because the airdrop is a themed 'gift', needing extra particles. */
    readonly enhancedAirdropParticles?: boolean
}

export const Modes: Record<ModeName, ModeDefinition> = {
    normal: {
        colors: {
            grass: "hsl(95, 41%, 38%)",
            water: "hsl(211, 63%, 42%)",
            border: "hsl(211, 63%, 30%)",
            beach: "hsl(40, 39%, 55%)",
            riverBank: "hsl(34, 41%, 32%)",
            trail: "hsl(35, 50%, 40%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        ambience: "wind_ambience",
        spriteSheets: ["shared", "normal"]
    },
    fall: {
        colors: {
            grass: "hsl(62, 42%, 32%)",
            water: "hsl(211, 63%, 42%)",
            border: "hsl(211, 63%, 30%)",
            beach: "hsl(40, 39%, 55%)",
            riverBank: "hsl(33, 50%, 30%)",
            trail: "hsl(35, 50%, 40%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        ambience: "wind_ambience",
        defaultScope: "2x_scope",
        particleEffects: {
            frames: ["leaf_particle_1", "leaf_particle_2", "leaf_particle_3"],
            delay: 1000
        },
        spriteSheets: ["shared", "fall"],
        replaceMenuMusic: true,
        playButtonImage: "./img/game/fall/obstacles/pumpkin.svg"
    },
    halloween: {
        colors: {
            grass: "hsl(65, 100%, 12%)",
            water: "hsl(4, 100%, 14%)",
            border: "hsl(4, 90%, 12%)",
            beach: "hsl(33, 77%, 21%)",
            riverBank: "hsl(33, 77%, 21%)",
            trail: "hsl(42, 42%, 9%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        ambience: "graveyard_ambience",
        defaultScope: "2x_scope",
        spriteSheets: ["shared", "fall", "halloween"],
        specialLogo: true,
        forcedGoldAirdropStage: 5,
        replaceMenuMusic: true,
        particleEffects: {
            frames: [
                "leaf_particle_1",
                "leaf_particle_2",
                "leaf_particle_3",
                "dead_pine_tree_particle"
            ],
            delay: 1000
        },
        playButtonImage: "./img/game/halloween/obstacles/jack_o_lantern.svg",
        canvasFilters: {
            brightness: 0.6,
            saturation: 0.85
        },
        ambienceVolume: 2
    },
    infection: {
        colors: {
            grass: "hsl(300, 15%, 35%)",
            water: "hsl(223, 35%, 44%)",
            border: "hsl(229, 30%, 36%)",
            beach: "hsl(25, 28%, 53%)",
            riverBank: "hsl(16, 28%, 38%)",
            trail: "hsl(35, 50%, 40%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        ambience: "wind_ambience",
        spriteSheets: ["shared", "normal", "infection"],
        playButtonImage: "./img/game/shared/perks/infected.svg",
        weaponSwap: true,
        canvasFilters: {
            brightness: 0.8,
            saturation: 0.8
        }
    },
    birthday: { // copy of normal
        colors: {
            grass: "hsl(95, 41%, 38%)",
            water: "hsl(211, 63%, 42%)",
            border: "hsl(211, 63%, 30%)",
            beach: "hsl(40, 39%, 55%)",
            riverBank: "hsl(34, 41%, 32%)",
            trail: "hsl(35, 50%, 40%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        ambience: "wind_ambience",
        spriteSheets: ["shared", "normal", "birthday"]
    },
    winter: {
        colors: {
            grass: "hsl(210, 18%, 82%)",
            water: "hsl(211, 40%, 64%)",
            border: "hsl(208, 40%, 48%)",
            beach: "hsl(210, 18%, 75%)",
            riverBank: "hsl(210, 18%, 70%)",
            trail: "hsl(35, 50%, 40%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        spriteSheets: ["shared", "normal", "winter"],
        ambience: "snowstorm_ambience",
        noRiverAmbience: true,
        replaceMenuMusic: true,
        bulletTrailAdjust: "hsl(0, 50%, 80%)",
        particleEffects: {
            frames: "snow_particle",
            delay: 800,
            gravity: true
        },
        obstacleVariants: true,
        specialLogo: true,
        playButtonImage: "./img/game/winter/obstacles/red_gift.svg",
        replaceWaterBy: FloorNames.Ice,
        enhancedAirdropParticles: true
    },
    hunted: {
        colors: {
            grass: "hsl(140, 22%, 30%)",
            water: "hsl(190, 63%, 25%)",
            border: "hsl(190, 63%, 17%)",
            beach: "hsl(40, 39%, 44%)",
            riverBank: "hsl(39, 47%, 25%)",
            trail: "hsl(35, 50%, 40%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        ambience: "wind_ambience",
        spriteSheets: ["shared", "hunted"],
        unlockStage: 3, // do not touch
        forcedGoldAirdropStage: 5,
        overrideUpstairsFunctionality: true,
        replaceMenuMusic: true,
        playButtonImage: "./img/logos/lansirama_logo.svg",
        particleEffects: {
            frames: ["bush_particle_1", "bush_particle_2", "dead_pine_tree_particle", "pine_tree_particle"],
            delay: 1000
        },
        maxEquipmentLevel: 4
    },
    nye: {
        colors: {
            grass: "hsl(210, 18%, 82%)",
            water: "hsl(211, 40%, 64%)",
            border: "hsl(208, 40%, 48%)",
            beach: "hsl(210, 18%, 75%)",
            riverBank: "hsl(210, 18%, 70%)",
            trail: "hsl(35, 50%, 40%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        spriteSheets: ["shared", "normal", "winter"],
        ambience: "snowstorm_ambience",
        noRiverAmbience: true,
        replaceMenuMusic: true,
        bulletTrailAdjust: "hsl(0, 50%, 80%)",
        particleEffects: {
            frames: "snow_particle",
            delay: 800,
            gravity: true
        },
        similarTo: "winter",
        obstacleVariants: true,
        specialLogo: true,
        bulletFilters: true,
        playButtonImage: "./img/game/winter/obstacles/christmas_tree.svg",
        canvasFilters: {
            brightness: 0.6,
            saturation: 0.85
        },
        summonAirdropsInterval: 30e3,
        replaceWaterBy: FloorNames.Ice,
        defaultGroundFloor: FloorNames.Sand,
        enhancedAirdropParticles: true
    },
};
