import { type ReferenceTo } from "../utils/objectDefinitions";
import { type ScopeDefinition } from "./scopes";

export type ColorKeys = "grass" | "water" | "border" | "beach" | "riverBank" | "trail" | "gas" | "void";

export interface ModeDefinition {
    readonly idString: string
    readonly colors: Record<ColorKeys, string>
    readonly inheritTexturesFrom?: Mode
    readonly specialMenuMusic?: boolean
    readonly ambience?: string
    readonly specialSounds?: string[]
    readonly defaultScope?: ReferenceTo<ScopeDefinition>
    readonly reskin?: string
    readonly darkShaders?: boolean
    // will be multiplied by the bullet trail color
    readonly bulletTrailAdjust?: string
    readonly particleEffects?: {
        readonly frames: string | string[]
        readonly delay: number
        readonly tint?: number
        readonly gravity?: boolean
    }
    readonly specialLogo?: boolean
    readonly specialPlayButtons?: boolean
    readonly modeLogoImage?: string
}

export type Mode = "normal" | "fall" | "halloween" | "winter";

export const Modes: Record<Mode, ModeDefinition> = {
    normal: {
        idString: "normal",
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
        reskin: "normal"
    },
    fall: {
        idString: "fall",
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
        reskin: "fall",
        particleEffects: {
            frames: ["leaf_particle_1", "leaf_particle_2", "leaf_particle_3"],
            delay: 1000
        },
        specialPlayButtons: true,
        modeLogoImage: "./img/game/fall/obstacles/baby_plumpkin.svg"
    },
    halloween: {
        idString: "halloween",
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
        inheritTexturesFrom: "fall",
        defaultScope: "2x_scope",
        specialMenuMusic: true,
        darkShaders: true,
        reskin: "fall",
        specialLogo: true,
        specialPlayButtons: true,
        modeLogoImage: "./img/game/halloween/obstacles/jack_o_lantern.svg"
    },
    winter: {
        idString: "winter",
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
        specialMenuMusic: true,
        specialSounds: [
            "airdrop_plane"
        ],
        reskin: "winter",
        ambience: "snowstorm",
        inheritTexturesFrom: "normal",
        bulletTrailAdjust: "hsl(0, 50%, 80%)",
        particleEffects: {
            frames: ["snow_particle"],
            delay: 800,
            gravity: true
        },
        specialLogo: true,
        specialPlayButtons: true,
        modeLogoImage: "./img/game/winter/obstacles/red_gift.svg"
    }
};
export const ObstacleModeVariations: Partial<Record<Mode, string>> = {
    winter: "_winter"
};
