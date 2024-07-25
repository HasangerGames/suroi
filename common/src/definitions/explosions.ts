import { defaultBulletTemplate } from "../constants";
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
        readonly tint: number | `#${string}`
        readonly scale: number
    }
    readonly sound?: string // TODO: move the barrel and super barrel destroy sounds to explosion sounds

    readonly decal?: ReferenceTo<DecalDefinition>
    readonly shrapnelCount: number
    readonly ballistics: Omit<BaseBulletDefinition, "goToMouse" | "lastShotFX">
}

export const Explosions = ObjectDefinitions.create<ExplosionDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            ballistics: defaultBulletTemplate
        }),
        explosion_factory: (name: string) => ({
            idString: `${name.toLowerCase().replace(/ /g, "_")}_explosion`,
            name
        })
    })
)(
    apply => [
        apply(
            "explosion_factory",
            {
                damage: 130,
                obstacleMultiplier: 1,
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
            "Barrel"
        ),
        apply(
            "explosion_factory",
            {
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
            "Stove"
        ),
        apply(
            "explosion_factory",
            {
                damage: 130,
                obstacleMultiplier: 1.5,
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
            "Control Panel"
        ),
        apply(
            "explosion_factory",
            {
                damage: 160,
                obstacleMultiplier: 1,
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
            "Super Barrel"
        ),
        apply(
            "explosion_factory",
            {
                damage: 200,
                obstacleMultiplier: 2,
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
            "Small Refinery Barrel"
        ),
        apply(
            "explosion_factory",
            {
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
            "Large Refinery Barrel"
        ),
        {
            idString: "usas_explosion",
            name: "USAS-12",
            damage: 35,
            obstacleMultiplier: 1,
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
                obstacleMultiplier: 1.5,
                speed: 0.06,
                range: 10,
                rangeVariance: 1,
                shrapnel: true
            },
            sound: "usas_explosion",
            decal: "explosion_decal"
        },
        apply(
            "explosion_factory",
            {
                damage: 97,
                obstacleMultiplier: 1,
                radius: {
                    min: 9,
                    max: 19
                },
                cameraShake: {
                    duration: 160,
                    intensity: 10
                },
                animation: {
                    duration: 1500,
                    tint: 0xA04412,
                    scale: 0.8
                },
                shrapnelCount: 17,
                ballistics: {
                    damage: 3,
                    obstacleMultiplier: 1.5,
                    speed: 0.06,
                    range: 10,
                    rangeVariance: 1,
                    shrapnel: true,
                    tracer: {
                        color: -1
                    }
                },
                sound: "firework_rocket_explode",
                decal: "explosion_decal"
            },
            "Firework Launcher"
        ),
        apply(
            "explosion_factory",
            {
                damage: 97,
                obstacleMultiplier: 1,
                radius: {
                    min: 9,
                    max: 19
                },
                cameraShake: {
                    duration: 160,
                    intensity: 10
                },
                animation: {
                    duration: 1500,
                    tint: 0xA04412,
                    scale: 0.8
                },
                shrapnelCount: 40,
                ballistics: {
                    damage: 3,
                    obstacleMultiplier: 1,
                    speed: 0.08,
                    range: 20,
                    rangeVariance: 1,
                    shrapnel: true,
                    tracer: {
                        color: -1
                    }
                },
                sound: "firework_rocket_explode",
                decal: "explosion_decal"
            },
            "Confetti Grenade"
        ),
        apply(
            "explosion_factory",
            {
                damage: 120,
                obstacleMultiplier: 1.15,
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
                shrapnelCount: 10,
                ballistics: {
                    damage: 15,
                    obstacleMultiplier: 1,
                    speed: 0.08,
                    range: 20,
                    rangeVariance: 1,
                    shrapnel: true
                },
                sound: "frag_grenade",
                decal: "frag_explosion_decal"
            },
            "Frag Grenade"
        ),
        apply(
            "explosion_factory",
            {
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
            },
            "Smoke Grenade"
        ),
        apply(
            "explosion_factory",
            {
                damage: 150,
                obstacleMultiplier: 1.15,
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
                shrapnelCount: 0,
                ballistics: {
                    damage: 15,
                    obstacleMultiplier: 1,
                    speed: 0.08,
                    range: 20,
                    rangeVariance: 1,
                    shrapnel: true
                },
                sound: "frag_grenade",
                decal: "frag_explosion_decal"
            },
            "C4"
        )
    ]
);
