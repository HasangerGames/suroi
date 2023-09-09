import { type ObjectDefinition, ObjectDefinitions, type BulletDefinition } from "../utils/objectDefinitions";

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

    readonly shrapnelCount: number
    readonly ballistics: BulletDefinition
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
                intensity: 50
            },
            animation: {
                duration: 1000,
                frame: "barrel_explosion.svg",
                scale: 1.5
            },
            shrapnelCount: 10,
            ballistics: {
                damage: 10,
                obstacleMultiplier: 1,
                speed: 0.08,
                maxDistance: 20,
                variance: 1,
                shrapnel: true
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
                intensity: 50
            },
            animation: {
                duration: 1000,
                frame: "barrel_explosion.svg",
                scale: 1.5
            },
            shrapnelCount: 10,
            ballistics: {
                damage: 10,
                obstacleMultiplier: 1,
                speed: 0.08,
                maxDistance: 20,
                variance: 1,
                shrapnel: true
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
                intensity: 100
            },
            animation: {
                duration: 1500,
                frame: "barrel_explosion.svg",
                scale: 2.5
            },
            shrapnelCount: 20,
            ballistics: {
                damage: 10,
                obstacleMultiplier: 2,
                speed: 0.08,
                maxDistance: 30,
                variance: 1,
                shrapnel: true
            }
        }
    ]
);
