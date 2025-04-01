import { BaseBulletDefinition } from "../utils/baseBullet";
import { ObjectDefinitions, type ObjectDefinition, type ReferenceTo } from "../utils/objectDefinitions";
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
    readonly killfeedFrame?: string

    readonly decal?: ReferenceTo<DecalDefinition>
    readonly shrapnelCount: number
    readonly ballistics: Omit<BaseBulletDefinition, "goToMouse" | "lastShotFX">
}

export const Explosions = new ObjectDefinitions<ExplosionDefinition>([
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
        killfeedFrame: "explosion",
        shrapnelCount: 10,
        ballistics: {
            shrapnel: true,
            damage: 2,
            obstacleMultiplier: 1,
            speed: 0.08,
            range: 20,
            rangeVariance: 1
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
        killfeedFrame: "explosion",
        shrapnelCount: 10,
        ballistics: {
            shrapnel: true,
            damage: 10,
            obstacleMultiplier: 1,
            speed: 0.08,
            range: 20,
            rangeVariance: 1
        }
    },
    {
        idString: "fireplace_explosion",
        name: "Fireplace",
        damage: 180,
        obstacleMultiplier: 2,
        radius: {
            min: 10,
            max: 30
        },
        cameraShake: {
            duration: 300,
            intensity: 75
        },
        animation: {
            duration: 1000,
            tint: 0xff5500,
            scale: 2
        },
        killfeedFrame: "explosion_big",
        shrapnelCount: 20,
        ballistics: {
            shrapnel: true,
            damage: 5,
            obstacleMultiplier: 5,
            speed: 0.1,
            range: 20,
            rangeVariance: 1
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
        killfeedFrame: "explosion",
        shrapnelCount: 10,
        ballistics: {
            shrapnel: true,
            damage: 10,
            obstacleMultiplier: 1,
            speed: 0.08,
            range: 20,
            rangeVariance: 1
        }
    },
    {
        idString: "super_barrel_explosion",
        name: "Super Barrel",
        damage: 160,
        obstacleMultiplier: 2,
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
        killfeedFrame: "explosion_big",
        shrapnelCount: 20,
        ballistics: {
            shrapnel: true,
            damage: 4,
            obstacleMultiplier: 2,
            speed: 0.08,
            range: 30,
            rangeVariance: 1
        }
    },
    {
        idString: "small_refinery_barrel_explosion",
        name: "Small Refinery Barrel",
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
        killfeedFrame: "explosion",
        shrapnelCount: 25,
        ballistics: {
            shrapnel: true,
            damage: 12,
            obstacleMultiplier: 2,
            speed: 0.08,
            range: 30,
            rangeVariance: 1
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
        killfeedFrame: "explosion_big",
        shrapnelCount: 50,
        ballistics: {
            shrapnel: true,
            damage: 15,
            obstacleMultiplier: 3,
            speed: 0.08,
            range: 60,
            rangeVariance: 1
        }
    },
    {
        idString: "propane_tank_explosion",
        name: "Propane Tank",
        damage: 80,
        obstacleMultiplier: 2,
        radius: {
            min: 5,
            max: 15
        },
        cameraShake: {
            duration: 250,
            intensity: 20
        },
        animation: {
            duration: 1000,
            tint: 0xb08b3f,
            scale: 1.5
        },
        killfeedFrame: "explosion",
        shrapnelCount: 8,
        ballistics: {
            shrapnel: true,
            damage: 2,
            obstacleMultiplier: 1,
            speed: 0.08,
            range: 20,
            rangeVariance: 1
        }
    },
    {
        idString: "usas_explosion",
        name: "USAS-12",
        damage: 30,
        obstacleMultiplier: 1.5,
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
        killfeedFrame: "usas12",
        shrapnelCount: 13,
        ballistics: {
            shrapnel: true,
            damage: 2,
            obstacleMultiplier: 1.5,
            speed: 0.06,
            range: 7,
            rangeVariance: 1
        },
        sound: "12g_frag_explosion",
        decal: "explosion_decal"
    },
    {
        idString: "m590m_explosion",
        name: "M590M",
        damage: 40,
        obstacleMultiplier: 1.5,
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
        killfeedFrame: "m590m",
        shrapnelCount: 13,
        ballistics: {
            shrapnel: true,
            damage: 3,
            obstacleMultiplier: 1.5,
            speed: 0.06,
            range: 7,
            rangeVariance: 1
        },
        sound: "12g_frag_explosion",
        decal: "explosion_decal"
    },
    {
        idString: "firework_launcher_explosion",
        name: "Firework Launcher",
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
        killfeedFrame: "firework_launcher",
        shrapnelCount: 17,
        ballistics: {
            shrapnel: true,
            damage: 3,
            obstacleMultiplier: 1.5,
            speed: 0.06,
            range: 10,
            rangeVariance: 1,
            tracer: {
                color: -1
            }
        },
        sound: "firework_rocket_explode",
        decal: "explosion_decal"
    },
    {
        idString: "confetti_grenade_explosion",
        name: "Confetti Grenade",
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
            shrapnel: true,
            damage: 3,
            obstacleMultiplier: 1,
            speed: 0.08,
            range: 20,
            rangeVariance: 1,
            tracer: {
                color: -1
            }
        },
        sound: "firework_rocket_explode",
        decal: "explosion_decal"
    },
    {
        idString: "seed_explosion",
        name: "Seedshot",
        killfeedFrame: "seedshot",
        damage: 10,
        obstacleMultiplier: 3,
        radius: {
            min: 8,
            max: 16
        },
        cameraShake: {
            duration: 160,
            intensity: 5
        },
        animation: {
            duration: 1500,
            tint: 0xe3a860,
            scale: 0.8
        },
        shrapnelCount: 10,
        ballistics: {
            shrapnel: true,
            damage: 1,
            obstacleMultiplier: 3,
            speed: 0.04,
            range: 8,
            rangeVariance: 1,
            tracer: {
                color: 0xe3a860
            }
        },
        sound: "seed_explode",
        decal: "seed_explosion_decal"
    },
    {
        idString: "coal_explosion",
        name: "Coal",
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
            shrapnel: true,
            damage: 3,
            obstacleMultiplier: 1,
            speed: 0.08,
            range: 10,
            rangeVariance: 1,
            tracer: {
                color: 0x000000
            }
        },
        killfeedFrame: "explosion",
        sound: "firework_rocket_explode",
        decal: "explosion_decal"
    },
    {
        idString: "frag_grenade_explosion",
        name: "Frag Grenade",
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
            shrapnel: true,
            damage: 15,
            obstacleMultiplier: 1,
            speed: 0.08,
            range: 20,
            rangeVariance: 1
        },
        sound: "frag_grenade",
        decal: "frag_explosion_decal"
    },
    {
        idString: "smoke_grenade_explosion",
        name: "Smoke Grenade",
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
            shrapnel: false,
            damage: 0,
            obstacleMultiplier: 0,
            speed: 0,
            range: 0
        },
        sound: "smoke_grenade",
        decal: "smoke_explosion_decal"
    },
    {
        idString: "c4_explosion",
        name: "C4",
        damage: 130,
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
            shrapnel: true,
            damage: 15,
            obstacleMultiplier: 1,
            speed: 0.08,
            range: 20,
            rangeVariance: 1
        },
        sound: "frag_grenade",
        decal: "frag_explosion_decal"
    },
    {
        idString: "pumpkin_explosion",
        name: "Pumpkin",
        damage: 100,
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
        sound: "pumpkin_bomb",
        shrapnelCount: 10,
        ballistics: {
            shrapnel: true,
            damage: 2,
            obstacleMultiplier: 1,
            speed: 0.08,
            range: 20,
            rangeVariance: 1
        }
    }
]);
