import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface ExplosionDefinition extends ObjectDefinition {
    damage: number
    obstacleMultiplier: number
    duration: number
    radius: {
        min: number
        max: number
    }
    cameraShake: {
        duration: number
        intensity: number
    }
    animation: {
        frame: string
        scale: number
    } 
    particle: {
        duration: number
        idParticle: string
    }
}

export class Explosions extends ObjectDefinitions {
    static readonly bitCount = 2;
    static readonly definitions: ExplosionDefinition[] = [
        {
            idString: "barrel_explosion",
            damage: 130,
            obstacleMultiplier: 2,
            duration: 1,
            radius: {
                min: 8,
                max: 25
            },
            cameraShake: {
                duration: 250,
                intensity: 0.02
            },
            animation: {
                frame: "barrel_explosion.svg",
                scale: 1.5
            },
            particle: {
                duration: 3,
                idParticle: "barrel_fire"
            }
        },
        {
            idString: "super_barrel_explosion",
            damage: 160,
            obstacleMultiplier: 3,
            duration: 1.5,
            radius: {
                min: 12,
                max: 36
            },
            cameraShake: {
                duration: 500,
                intensity: 0.03
            },
            animation: {
                frame: "barrel_explosion.svg",
                scale: 2.5
            },
            particle: {
                duration: 5,
                idParticle: "barrel_fire"
            }
        },
        {
            idString: "crate_health_explosion",
            damage: -50,
            obstacleMultiplier: 0.5,
            duration: 2,
            radius: {
                min: 12,
                max: 36
            },
            cameraShake: {
                duration: 500,
                intensity: 0.00
            },
            animation: {
                frame: "crate_health_explosion.svg",
                scale: 2.5
            },
            particle: {
                duration: 2,
                idParticle: "heal_mass"
            }
        }
    ];
}
