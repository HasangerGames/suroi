import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";

export interface ExplosionDefinition extends ObjectDefinition {
    readonly damage: number
    readonly obstacleMultiplier: number
    readonly radius: {
        readonly min: number
        readonly max: number
    }
    readonly cameraShake: {
        readonly duration: number
        readonly intensity: number
    }
    readonly animation: {
        readonly duration: number
        readonly frame: string
        readonly scale: number
    }
    readonly particles: {
        readonly duration: number
        readonly frame: string
        readonly count: number
    }
    readonly sound?: string // TODO: move the barrel and super barrel destroy sounds to explosion sounds
}

export const Explosions = new ObjectDefinitions<ExplosionDefinition>(
    2,
    [
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
            },
            animation: {
                duration: 1000,
                frame: "barrel_explosion.svg",
                scale: 1.5
            },
            particles: {
                duration: 1500,
                frame: "barrel_fire_particle.svg",
                count: 10
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
            },
            animation: {
                duration: 1500,
                frame: "barrel_explosion.svg",
                scale: 2.5
            },
            particles: {
                duration: 2500,
                frame: "super_barrel_fire_particle.svg",
                count: 20
            }
        },
        {
            idString: "health_crate_explosion",
            damage: -50,
            obstacleMultiplier: 0.25,
            radius: {
                min: 12,
                max: 36
            },
            cameraShake: {
                duration: 0,
                intensity: 0.00
            },
            animation: {
                duration: 2000,
                frame: "health_crate_explosion.svg",
                scale: 2.5
            },
            particles: {
                duration: 2000,
                frame: "heal_mass_particle.svg",
                count: 15
            },
            sound: "health_explosion"
        }
    ]
);
