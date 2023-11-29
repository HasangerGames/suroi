/* eslint-disable @typescript-eslint/indent */
import { type ReferenceTo } from "../utils/objectDefinitions";
import { type ObstacleDefinition } from "./obstacles";

const mode = "winter";

export type ColorKeys = "grass" | "water" | "border" | "beach" | "riverBank" | "gas";

export interface ModeDefinition {
    readonly idString: string
    readonly colors: Record<ColorKeys, string>
    readonly reskin?: {
        readonly suffix: string
        readonly obstacles: Record<
            ReferenceTo<ObstacleDefinition>,
            {
                readonly defaultParticles?: boolean
                readonly defaultResidue?: boolean
            }
        >
    }
}

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
        reskin: {
            suffix: "fall",
            obstacles: {
                oak_tree: {},
                birch_tree: {},
                blueberry_bush: {
                    defaultParticles: true,
                    defaultResidue: true
                }
            }
        }
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
        reskin: {
            suffix: "fall",
            obstacles: {
                oak_tree: {},
                birch_tree: {}
            }
        }
    },
    {
        idString: "winter",
        colors: {
            grass: "hsl(210, 18%, 82%)",
            water: "hsl(208, 94%, 72%)",
            border: "hsl(208, 94%, 45%)",
            beach: "hsl(210, 18%, 75%)",
            riverBank: "hsl(210, 18%, 70%)",
            gas: "hsla(17, 100%, 50%, 0.55)"
        },
        reskin: {
            suffix: "winter",
            obstacles: {
                blueberry_bush: {},
                airdrop_crate: {},
                airdrop_crate_locked: {},
            }
        }
    },
];

export const MODE = Modes.find(m => m.idString === mode) as ModeDefinition;
