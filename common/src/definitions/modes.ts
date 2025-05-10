import { type ReferenceTo } from "../utils/objectDefinitions";
import { type ScopeDefinition } from "./items/scopes";

export type ColorKeys = "grass" | "water" | "border" | "beach" | "riverBank" | "trail" | "gas" | "void";

export type ModeName = "normal" | "fall" | "halloween" | "infection" | "birthday" | "winter";

export type SpritesheetNames = ModeName | "shared";

export interface ModeDefinition {
    readonly colors: Record<ColorKeys, string>
    readonly spriteSheets: readonly SpritesheetNames[]
    readonly sounds: {
        readonly ambience?: string
        readonly replaceMenuMusic?: boolean
        // sound folders that will be preloaded at game start
        readonly foldersToLoad: readonly string[]
    }
    readonly defaultScope?: ReferenceTo<ScopeDefinition>
    readonly obstacleVariants?: boolean
    readonly darkShaders?: boolean
    // will be multiplied by the bullet trail color
    readonly bulletTrailAdjust?: string
    readonly particleEffects?: {
        readonly frames: string | readonly string[]
        readonly delay: number
        readonly tint?: number
        readonly gravity?: boolean
    }
    readonly specialLogo?: boolean
    readonly playButtonImage?: string
    readonly weaponSwap?: boolean
    readonly plumpkinGrenades?: boolean
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
        sounds: {
            ambience: "wind_ambience",
            foldersToLoad: ["shared", "normal"]
        },
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
        sounds: {
            foldersToLoad: ["shared", "fall"],
            ambience: "wind_ambience"
        },
        defaultScope: "2x_scope",
        particleEffects: {
            frames: ["leaf_particle_1", "leaf_particle_2", "leaf_particle_3"],
            delay: 1000
        },
        spriteSheets: ["shared", "fall"],
        playButtonImage: "./img/game/fall/obstacles/pumpkin.svg"
    },
    halloween: {
        colors: {
            grass: "hsl(65, 100%, 12%)",
            water: "hsl(4, 100%, 14%)",
            border: "hsl(4, 90%, 12%)",
            beach: "hsl(33, 77%, 21%)",
            riverBank: "hsl(33, 50%, 25%)",
            trail: "hsl(35, 50%, 20%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        defaultScope: "2x_scope",
        sounds: {
            foldersToLoad: ["shared", "fall"]
        },
        darkShaders: true,
        spriteSheets: ["shared", "fall", "halloween"],
        specialLogo: true,
        playButtonImage: "./img/game/halloween/obstacles/jack_o_lantern.svg"
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
        sounds: {
            foldersToLoad: ["shared", "normal", "infection"]
        },
        spriteSheets: ["shared", "normal", "infection"],
        playButtonImage: "./img/game/shared/perks/infected.svg",
        weaponSwap: true
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
        sounds: {
            foldersToLoad: ["shared", "normal"]
        },
        spriteSheets: ["shared", "normal", "birthday"]
    },
    winter: {
        colors: {
            grass: "hsl(210, 18%, 82%)",
            water: "hsl(211, 63%, 42%)",
            border: "hsl(208, 94%, 45%)",
            beach: "hsl(210, 18%, 75%)",
            riverBank: "hsl(210, 18%, 70%)",
            trail: "hsl(35, 50%, 40%)",
            gas: "hsla(17, 100%, 50%, 0.55)",
            void: "hsl(25, 80%, 6%)"
        },
        spriteSheets: ["shared", "normal", "winter"],
        sounds: {
            foldersToLoad: ["shared", "normal", "winter"],
            ambience: "snowstorm_ambience",
            replaceMenuMusic: true
        },
        bulletTrailAdjust: "hsl(0, 50%, 80%)",
        particleEffects: {
            frames: "snow_particle",
            delay: 800,
            gravity: true
        },
        obstacleVariants: true,
        specialLogo: true,
        playButtonImage: "./img/game/winter/obstacles/red_gift.svg"
    }
};
