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
    readonly sound?: string // TODO: move the barrel and super barrel destroy sounds to explosion sounds
}

export const Explosions = new ObjectDefinitions<ExplosionDefinition>(
    [
        {
            idString: "barrel_explosion",
            name: "Barrel",
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
            }
        },
        {
            idString: "stove_explosion",
            name: "Stove",
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
            }
        },
        {
            idString: "super_barrel_explosion",
            name: "Super Barrel",
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
            }
        }
    ]
);
