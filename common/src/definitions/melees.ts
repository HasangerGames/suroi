import { type ObjectDefinition } from "../utils/objectDefinitions";
import { v, type Vector } from "../utils/vector";

export interface MeleeDefinition extends ObjectDefinition {
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
    image?: {
        frame: string
        position: Vector
    }
}

export const Melees: MeleeDefinition[] =
[
    {
        idString: "fists",
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
