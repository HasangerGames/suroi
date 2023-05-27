import { type ItemDefinition } from "../utils/objectDefinitions";
import { v, type Vector } from "../utils/vector";

export interface MeleeDefinition extends ItemDefinition {
    readonly type: "melee"

    readonly damage: number
    readonly obstacleMultiplier: number
    readonly radius: number
    readonly offset: Vector
    readonly cooldown: number
    readonly fists: {
        readonly animationDuration: number
        readonly randomFist: boolean
        readonly left: Vector
        readonly right: Vector
        readonly useLeft: Vector
        readonly useRight: Vector
    }
    readonly image?: {
        readonly position: Vector
        readonly angle?: number
    }
    readonly fireMode?: "single" | "auto"
}

export const Melees: MeleeDefinition[] =
[
    {
        idString: "fists",
        type: "melee",
        damage: 20,
        obstacleMultiplier: 2,
        radius: 1.5,
        offset: v(2.5, 0),
        cooldown: 250,
        fists: {
            animationDuration: 125,
            randomFist: true,
            left: v(38, 35),
            right: v(38, -35),
            useLeft: v(75, 10),
            useRight: v(75, -10)
        }
    }
];
