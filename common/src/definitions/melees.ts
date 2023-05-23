import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { v, Vector } from "../utils/vector";

export interface MeleeDefinition extends ObjectDefinition {
    damage: number
    obstacleMultiplier: number
    radius: number
    offset: Vector
    cooldown: number
    fists: {
        animationDuration: number
        randomFist: boolean
        normalLeft: Vector
        normalRight: Vector
        useLeft: Vector
        useRight: Vector
    }
}

export class Melees extends ObjectDefinitions {
    static readonly bitCount = 1;
    static readonly definitions: MeleeDefinition[] = [
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
                useRight: v(75, -10),
            }
        },
    ];
}
