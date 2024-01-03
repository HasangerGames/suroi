/* eslint-disable @typescript-eslint/indent */

export type ColorKeys = "grass" | "water" | "border" | "beach" | "riverBank" | "gas";

export interface ModeDefinition {
    readonly idString: string
    readonly colors: Record<ColorKeys, string>
    readonly specialMenuMusic?: boolean
    readonly reskin?: string
    // will be multiplied by the bullet trail color
    readonly bulletTrailAdjust?: string
}

export interface ReskinDefinition { textures: string[], sounds?: string[] }

export const Modes: ModeDefinition[] = [
    {
        idString: "normal",
        colors: {
            grass: "hsl(113, 42%, 42%)",
            water: "hsl(211, 63%, 42%)",
            border: "hsl(211, 63%, 30%)",
            beach: "hsl(40, 39%, 55%)",
            riverBank: "hsl(33, 50%, 30%)",
            gas: "hsla(17, 100%, 50%, 0.55)"
        }
    },
    {
        idString: "halloween",
        colors: {
            grass: "hsl(65, 100%, 12%)",
            water: "hsl(4, 100%, 14%)",
            border: "hsl(4, 90%, 12%)",
            beach: "hsl(33, 77%, 21%)",
            riverBank: "hsl(33, 50%, 30%)",
            gas: "hsla(17, 100%, 50%, 0.55)"
        },
        specialMenuMusic: true,
        reskin: "fall"
    },
    {
        idString: "fall",
        colors: {
            grass: "hsl(113, 42%, 42%)",
            water: "hsl(211, 63%, 42%)",
            border: "hsl(211, 63%, 30%)",
            beach: "hsl(40, 39%, 55%)",
            riverBank: "hsl(33, 50%, 30%)",
            gas: "hsla(17, 100%, 50%, 0.55)"
        },
        reskin: "fall"
    },
    {
        idString: "winter",
        colors: {
            grass: "hsl(210, 18%, 82%)",
            water: "hsl(211, 63%, 42%)",
            border: "hsl(208, 94%, 45%)",
            beach: "hsl(210, 18%, 75%)",
            riverBank: "hsl(210, 18%, 70%)",
            gas: "hsla(17, 100%, 50%, 0.55)"
        },
        specialMenuMusic: true,
        reskin: "winter",
        bulletTrailAdjust: "hsl(0, 50%, 80%)"
    }
];

export const Reskins: Record<string, ReskinDefinition> = {
    fall: { // TODO
        textures: []
    },
    winter: {
        textures: [
            "oak_tree_1", "oak_tree_2", "oak_tree_3", "oak_tree_particle", "oak_tree_residue",
            "birch_tree", "birch_tree_particle", "birch_tree_residue",
            "pine_tree",
            "bush", "bush_particle_1", "bush_particle_2", "bush_residue",
            "blueberry_bush",
            "rock_6",
            "regular_crate",
            "aegis_crate",
            "flint_crate",
            "grenade_crate",
            "airdrop_plane",
            "airdrop_parachute",
            "airdrop_crate_locked", "airdrop_crate_unlocking", "airdrop_particle_1", "airdrop_particle_2",
            "airdrop_crate", "airdrop_crate_particle", "airdrop_crate_residue",
            "gold_airdrop_crate", "gold_airdrop_crate_particle", "gold_airdrop_crate_residue",
            "barrier",
            "bollard",
            "box",
            "distillation_column",
            "generator",
            "crane_base_end",
            "pallet",
            "oil_tank",
            "forklift",
            "trailer",
            "truck"
        ],
        sounds: [
            "airdrop_plane"
        ]
    }
};
