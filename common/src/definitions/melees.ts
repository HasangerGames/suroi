import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
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
        readonly normalLeft: Vector
        readonly normalRight: Vector
        readonly useLeft: Vector
        readonly useRight: Vector
    }
}

export const Melees = new ObjectDefinitions<MeleeDefinition>(
    1,
    [
        {
            idString: "fists",
            damage: 20,
            obstacleMultiplier: 2,
            radius: 1.5,
            offset: v(2.5, 0),
            cooldown: 250,
            fists: {
                animationDuration: 110,
                randomFist: true,
                normalLeft: v(38, 35),
                normalRight: v(38, -35),
                useLeft: v(75, 10),
                useRight: v(75, -10)
            }
        }
    ]
);
