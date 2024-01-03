import { ObjectDefinitions, type BaseBulletDefinition, type ObjectDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { type DecalDefinition } from "./decals";

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
        readonly tint: number
        readonly scale: number
    }
    readonly sound?: string // TODO: move the barrel and super barrel destroy sounds to explosion sounds

    readonly decal?: ReferenceTo<DecalDefinition>
    readonly shrapnelCount: number
    readonly ballistics: BaseBulletDefinition
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
                tint: 0x91140b,
                scale: 1.5
            },
            shrapnelCount: 10,
            ballistics: {
                damage: 2,
                obstacleMultiplier: 1,
                speed: 0.08,
                range: 20,
                rangeVariance: 1,
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
                tint: 0xff5500,
                scale: 1.5
            },
            shrapnelCount: 10,
            ballistics: {
                damage: 10,
                obstacleMultiplier: 1,
                speed: 0.08,
                range: 20,
                rangeVariance: 1,
                shrapnel: true
            }
        },
        {
            idString: "control_panel_explosion",
            name: "Control Panel",
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
                tint: 0xff5500,
                scale: 1.5
            },
            shrapnelCount: 10,
            ballistics: {
                damage: 10,
                obstacleMultiplier: 1,
                speed: 0.08,
                range: 20,
                rangeVariance: 1,
                shrapnel: true
            }
        },
        {
            idString: "super_barrel_explosion",
            name: "Super Barrel",
            damage: 160,
            obstacleMultiplier: 3,
            radius: {
                min: 8,
                max: 25
            },
            cameraShake: {
                duration: 500,
                intensity: 100
            },
            animation: {
                duration: 1500,
                tint: 0xff0000,
                scale: 2.5
            },
            shrapnelCount: 20,
            ballistics: {
                damage: 4,
                obstacleMultiplier: 2,
                speed: 0.08,
                range: 30,
                rangeVariance: 1,
                shrapnel: true
            }
        },
        {
            idString: "small_refinery_barrel_explosion",
            name: "Small Refinery Barrel",
            damage: 200,
            obstacleMultiplier: 3,
            radius: {
                min: 16,
                max: 40
            },
            cameraShake: {
                duration: 750,
                intensity: 100
            },
            animation: {
                duration: 1500,
                tint: 0x91140b,
                scale: 2.5
            },
            shrapnelCount: 25,
            ballistics: {
                damage: 12,
                obstacleMultiplier: 2,
                speed: 0.08,
                range: 30,
                rangeVariance: 1,
                shrapnel: true
            }
        },
        {
            idString: "large_refinery_barrel_explosion",
            name: "Large Refinery Barrel",
            damage: 10000,
            obstacleMultiplier: 3,
            radius: {
                min: 48,
                max: 58
            },
            cameraShake: {
                duration: 2000,
                intensity: 100
            },
            animation: {
                duration: 1500,
                tint: 0xff0000,
                scale: 5
            },
            shrapnelCount: 50,
            ballistics: {
                damage: 15,
                obstacleMultiplier: 3,
                speed: 0.08,
                range: 60,
                rangeVariance: 1,
                shrapnel: true
            }
        },
        {
            idString: "usas_explosion",
            name: "USAS-12",
            damage: 35,
            obstacleMultiplier: 2,
            radius: {
                min: 6,
                max: 16
            },
            cameraShake: {
                duration: 100,
                intensity: 10
            },
            animation: {
                duration: 1500,
                tint: 0x6c1313,
                scale: 0.8
            },
            shrapnelCount: 13,
            ballistics: {
                damage: 3,
                obstacleMultiplier: 2,
                speed: 0.06,
                range: 10,
                rangeVariance: 1,
                shrapnel: true
            },
            sound: "usas_explosion",
            decal: "explosion_decal"
        },
        {
            idString: "frag_explosion",
            name: "Frag Grenade",
            damage: 150,
            obstacleMultiplier: 2,
            radius: {
                min: 10,
                max: 25
            },
            cameraShake: {
                duration: 200,
                intensity: 30
            },
            animation: {
                duration: 1000,
                tint: 0x91140b,
                scale: 1.5
            },
            shrapnelCount: 15,
            ballistics: {
                damage: 4,
                obstacleMultiplier: 1,
                speed: 0.08,
                range: 20,
                rangeVariance: 1,
                shrapnel: true
            },
            sound: "frag_grenade",
            decal: "frag_explosion_decal"
        },
        {
            idString: "smoke_explosion",
            name: "Smoke grenade",
            damage: 0,
            obstacleMultiplier: 0,
            radius: {
                min: 0,
                max: 0
            },
            cameraShake: {
                duration: 0,
                intensity: 0
            },
            animation: {
                duration: 500,
                tint: 0x8A7C7B,
                scale: 0.5
            },
            shrapnelCount: 0,
            ballistics: {
                damage: 0,
                obstacleMultiplier: 0,
                speed: 0,
                range: 0,
                shrapnel: false
            },
            sound: "smoke_grenade",
            decal: "smoke_explosion_decal"
        }
    ]
);
