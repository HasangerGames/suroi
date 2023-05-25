import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface BulletDefinition extends ObjectDefinition {
    readonly damage: number
    readonly obstacleMultiplier: number
    readonly speed: number
    readonly speedVariance: number
    readonly maxDistance: number
}

export const Bullets = new ObjectDefinitions<BulletDefinition>(
    1,
    [
        {
            idString: "ak47_bullet",
            damage: 5,
            obstacleMultiplier: 2,
            speed: 10000,
            speedVariance: 0,
            maxDistance: 1000
        }
    ]
);
