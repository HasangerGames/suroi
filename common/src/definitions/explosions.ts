import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface ExplosionDefinition extends ObjectDefinition {
    damage: number
    obstacleMultiplier: number
    radius: {
        min: number
        max: number
    }
    cameraShake: {
        duration: number
        intensity: number
    }
}

export class Explosions extends ObjectDefinitions {
    static readonly bitCount = 1;
    static readonly definitions: ExplosionDefinition[] = [
        {
            idString: "barrel_explosion",
            damage: 130,
            obstacleMultiplier: 2,
            radius: {
                min: 8,
                max: 25
            },
            cameraShake: {
                duration: 250,
                intensity: 0.02
            }
        },
        {
            idString: "super_barrel_explosion",
            damage: 160,
            obstacleMultiplier: 3,
            radius: {
                min: 12,
                max: 36
            },
            cameraShake: {
                duration: 500,
                intensity: 0.03
            }
        }
    ];
}
