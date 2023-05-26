import { type ObjectDefinition } from "../utils/objectDefinitions";
import { v, type Vector } from "../utils/vector";

export interface GunDefinition extends ObjectDefinition {
    readonly cooldown: number
    readonly fireMode: "single" | "auto"
    readonly shotSpread: number
    readonly bulletCount?: number
    readonly fists: {
        readonly left: Vector
        readonly right: Vector
        readonly animationDuration: number
    }
    image?: {
        frame: string
        position: Vector
    }
}

export const Guns: GunDefinition[] =
[
    {
        idString: "ak47",
        cooldown: 100,
        fireMode: "auto",
        shotSpread: 0.25,
        fists: {
            left: v(65, 0),
            right: v(140, -10),
            animationDuration: 100
        },
        image: {
            frame: "ak47-top.svg",
            position: v(120, 0)
        }
    }
];
