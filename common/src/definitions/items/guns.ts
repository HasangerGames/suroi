import { FireMode } from "../../constants";
import { BaseBulletDefinition } from "../../utils/baseBullet";
import { mergeDeep } from "../../utils/misc";
import { DefinitionType, type InventoryItemDefinition, type ReferenceTo } from "../../utils/objectDefinitions";
import { Vec, type Vector } from "../../utils/vector";
import { type AmmoDefinition } from "./ammos";
import { InventoryItemDefinitions } from "./items";
import { PerkIds } from "./perks";
import { ScopeDefinition } from "./scopes";

export enum Tier { S, A, B, C, D }

type BaseGunDefinition = InventoryItemDefinition & {
    readonly defType: DefinitionType.Gun

    readonly ammoType: ReferenceTo<AmmoDefinition>
    readonly ammoSpawnAmount: number
    readonly tier: Tier
    readonly spawnScope?: ReferenceTo<ScopeDefinition>
    readonly capacity: number
    readonly extendedCapacity?: number
    readonly reloadTime: number
    readonly shotsPerReload?: number
    readonly infiniteAmmo?: boolean

    readonly fireDelay: number
    readonly switchDelay: number

    readonly recoilMultiplier: number
    readonly recoilDuration: number
    readonly shotSpread: number
    readonly moveSpread: number
    readonly bulletOffset?: number
    readonly fsaReset?: number // first-shot-accuracy reset (ms)
    readonly jitterRadius?: number // Jitters the bullet position, mainly for shotguns
    readonly consistentPatterning?: boolean

    readonly noQuickswitch?: boolean
    readonly bulletCount?: number
    readonly length: number
    readonly shootOnRelease?: boolean
    readonly summonAirdrop?: boolean

    readonly fists: {
        /**
         * no relation to the ZIndexes enum
         * @default 1
         */
        readonly leftZIndex?: number
        /**
         * no relation to the ZIndexes enum
         * @default 1
         */
        readonly rightZIndex?: number
        readonly animationDuration: number
    }

    readonly casingParticles?: Array<{
        readonly frame?: string
        readonly count?: number
        readonly ejectionDelay?: number
        readonly velocity?: {
            readonly x?: {
                readonly min: number
                readonly max: number
                readonly randomSign?: boolean
            }
            readonly y?: {
                readonly min: number
                readonly max: number
                readonly randomSign?: boolean
            }
        }

        readonly on?: "fire" | "reload"
    }>

    readonly gasParticles?: {
        readonly amount: number
        readonly minSize: number
        readonly maxSize: number
        readonly minLife: number
        readonly maxLife: number
        readonly spread: number
        readonly minSpeed: number
        readonly maxSpeed: number
    }

    readonly image: {
        readonly angle?: number
        // no relation to the ZIndexes enum
        readonly zIndex?: number
    }
    readonly inventoryScale?: number

    readonly noMuzzleFlash?: boolean
    readonly ballistics: BaseBulletDefinition
} & ReloadOnEmptyMixin & BurstFireMixin & DualDefMixin;

type ReloadOnEmptyMixin = ({
    readonly reloadFullOnEmpty?: false
} | {
    readonly reloadFullOnEmpty: true
    readonly fullReloadTime: number
});

type BurstFireMixin = ({
    readonly fireMode: FireMode.Auto | FireMode.Single
} | {
    readonly fireMode: FireMode.Burst
    readonly burstProperties: {
        readonly shotsPerBurst: number
        readonly burstCooldown: number
    }
});

type DualDefMixin = ({
    readonly isDual?: false
    readonly fists?: InventoryItemDefinition["fists"]
    readonly image: {
        readonly position: Vector
    }

    readonly casingParticles?: Array<{ readonly position: Vector }>
} | {
    readonly isDual: true
    readonly singleVariant: ReferenceTo<GunDefinition>
    /**
     * This offset is used for pretty much everything that's unique to dual weapons: it's an offset for projectile
     * spawns, casing spawns and world images
     */
    readonly leftRightOffset: number
});

export type SingleGunNarrowing = GunDefinition & { readonly isDual: false };
export type DualGunNarrowing = GunDefinition & { readonly isDual: true };

type RawForDef<B extends BaseGunDefinition> = B & {
    readonly isDual?: never
    readonly dual?: {
        readonly leftRightOffset: number
    } & {
        [
        K in Extract<
            keyof B,
            | "tier"
            | "wearerAttributes"
            | "ammoSpawnAmount"
            | "capacity"
            | "extendedCapacity"
            | "reloadTime"
            | "fireDelay"
            | "switchDelay"
            | "speedMultiplier"
            | "recoilMultiplier"
            | "recoilDuration"
            | "shotSpread"
            | "moveSpread"
            | "fsaReset"
            | "burstProperties"
            | "fists"
            | "leftRightOffset"
        >
        ]?: B[K]
    }
};

type RawGunDefinition =
    | RawForDef<
        BaseGunDefinition & BurstFireMixin & { readonly fireMode: FireMode.Burst }
    >
    | RawForDef<
        BaseGunDefinition & BurstFireMixin & { readonly fireMode: FireMode.Single | FireMode.Auto }
    >;

export type GunDefinition = BaseGunDefinition & { readonly dualVariant?: ReferenceTo<GunDefinition> };

const gasParticlePresets = {
    automatic: {
        amount: 2,
        spread: 30,
        minSize: 0.2,
        maxSize: 0.3,
        minLife: 1000,
        maxLife: 2000,
        minSpeed: 5,
        maxSpeed: 15
    },
    shotgun: {
        amount: 12,
        spread: 60,
        minSize: 0.3,
        maxSize: 0.5,
        minLife: 2000,
        maxLife: 5000,
        minSpeed: 5,
        maxSpeed: 10
    },
    pistol: {
        amount: 2,
        spread: 60,
        minSize: 0.2,
        maxSize: 0.3,
        minLife: 1000,
        maxLife: 2000,
        minSpeed: 5,
        maxSpeed: 15
    },
    rifle: {
        amount: 3,
        spread: 30,
        minSize: 0.3,
        maxSize: 0.5,
        minLife: 1000,
        maxLife: 3000,
        minSpeed: 7,
        maxSpeed: 14
    }
} satisfies Record<string, BaseGunDefinition["gasParticles"]>;

export const Guns = new InventoryItemDefinitions<GunDefinition>(([
    //
    // Pistols
    //
    {
        idString: "g19",
        name: "G19",
        defType: DefinitionType.Gun,
        tier: Tier.D,
        ammoType: "9mm",
        ammoSpawnAmount: 60,
        fireDelay: 110,
        switchDelay: 250,
        speedMultiplier: 1.136,
        recoilMultiplier: 0.8,
        recoilDuration: 90,
        fireMode: FireMode.Single,
        shotSpread: 4,
        moveSpread: 8,
        length: 4.8,
        fists: {
            left: Vec(40, 0),
            right: Vec(40, 0),
            leftZIndex: 4,
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(65, 0) },
        inventoryScale: 0.8,
        casingParticles: [{
            position: Vec(3.5, 0.5),
            velocity: {
                y: {
                    min: -6,
                    max: 15
                }
            }
        }],
        gasParticles: gasParticlePresets.pistol,
        capacity: 15,
        extendedCapacity: 24,
        reloadTime: 1.5,
        ballistics: {
            damage: 13,
            obstacleMultiplier: 1,
            speed: 0.22,
            range: 120
        },
        dual: {
            tier: Tier.C,
            leftRightOffset: 1.3,
            fireDelay: 75,
            shotSpread: 5,
            moveSpread: 10,
            capacity: 30,
            extendedCapacity: 48,
            reloadTime: 2.9
        }
    },
    {
        idString: "cz75a",
        name: "CZ-75A",
        defType: DefinitionType.Gun,
        tier: Tier.D,
        ammoType: "9mm",
        ammoSpawnAmount: 64,
        fireDelay: 60,
        switchDelay: 250,
        speedMultiplier: 1.136,
        recoilMultiplier: 0.8,
        recoilDuration: 90,
        fireMode: FireMode.Auto,
        shotSpread: 8,
        moveSpread: 14,
        length: 5.3,
        fists: {
            left: Vec(40, 0),
            right: Vec(40, 0),
            leftZIndex: 4,
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(70, -1) },
        inventoryScale: 0.8,
        casingParticles: [{
            position: Vec(3.5, 0.45),
            velocity: {
                y: {
                    min: 2,
                    max: 18
                }
            }
        }],
        gasParticles: gasParticlePresets.pistol,
        capacity: 16,
        extendedCapacity: 26,
        reloadTime: 1.9,
        ballistics: {
            damage: 9,
            obstacleMultiplier: 1,
            speed: 0.18,
            range: 70
        },
        dual: {
            tier: Tier.C,
            leftRightOffset: 1.3,
            fireDelay: 30,
            shotSpread: 8,
            moveSpread: 14,
            capacity: 32,
            extendedCapacity: 52,
            reloadTime: 3.7
        }
    },
    {
        idString: "m1895",
        name: "M1895",
        defType: DefinitionType.Gun,
        tier: Tier.D,
        ammoType: "762mm",
        ammoSpawnAmount: 28,
        fireDelay: 375,
        switchDelay: 250,
        speedMultiplier: 1.136,
        recoilMultiplier: 0.75,
        recoilDuration: 135,
        fireMode: FireMode.Single,
        shotSpread: 2,
        moveSpread: 5,
        length: 5.35,
        fists: {
            left: Vec(40, 0),
            right: Vec(40, 0),
            leftZIndex: 4,
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(70, 0) },
        inventoryScale: 0.85,
        casingParticles: [{
            frame: "casing_762x38mmR",
            position: Vec(3.5, 0.5),
            count: 7,
            velocity: {
                x: {
                    min: -8,
                    max: -2
                },
                y: {
                    min: 2,
                    max: 9,
                    randomSign: true
                }
            },
            on: "reload"
        }],
        gasParticles: gasParticlePresets.pistol,
        capacity: 7,
        reloadTime: 2.1,
        ballistics: {
            damage: 24.5,
            obstacleMultiplier: 1.5,
            speed: 0.26,
            range: 160
        },
        dual: {
            tier: Tier.C,
            ammoSpawnAmount: 42,
            leftRightOffset: 1.3,
            fireDelay: 187.5,
            shotSpread: 2,
            moveSpread: 5,
            capacity: 14,
            reloadTime: 4
        }
    },
    {
        idString: "deagle",
        name: "DEagle",
        defType: DefinitionType.Gun,
        tier: Tier.B,
        ammoType: "50cal",
        ammoSpawnAmount: 42,
        fireDelay: 200,
        switchDelay: 250,
        speedMultiplier: 1.136,
        recoilMultiplier: 0.65,
        recoilDuration: 150,
        fireMode: FireMode.Single,
        shotSpread: 3,
        moveSpread: 7,
        length: 5.4,
        fists: {
            left: Vec(40, 0),
            right: Vec(40, 0),
            leftZIndex: 4,
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(75, 0) },
        inventoryScale: 0.85,
        casingParticles: [{
            frame: "casing_50ae",
            position: Vec(3.5, 0.3),
            velocity: {
                y: {
                    min: -6,
                    max: 15
                }
            }
        }],
        gasParticles: gasParticlePresets.pistol,
        capacity: 7,
        extendedCapacity: 9,
        reloadTime: 2.3,
        ballistics: {
            damage: 37,
            obstacleMultiplier: 1.25,
            speed: 0.22,
            range: 130,
            tracer: {
                color: 0xE2C910,
                saturatedColor: 0xFFBF00
            }
        },
        dual: {
            tier: Tier.A,
            ammoSpawnAmount: 84,
            leftRightOffset: 1.4,
            fireDelay: 115,
            shotSpread: 3,
            moveSpread: 7,
            capacity: 14,
            extendedCapacity: 18,
            reloadTime: 3.8
        }
    },
    {
        idString: "rsh12",
        name: "RSh-12",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "50cal",
        ammoSpawnAmount: 30,
        fireDelay: 400,
        switchDelay: 250,
        speedMultiplier: 1.136,
        recoilMultiplier: 0.8,
        recoilDuration: 600,
        fsaReset: 600,
        fireMode: FireMode.Single,
        shotSpread: 4,
        moveSpread: 8,
        length: 6.6,
        noMuzzleFlash: true,
        fists: {
            left: Vec(40, 0),
            right: Vec(40, 0),
            leftZIndex: 4,
            rightZIndex: 4,
            animationDuration: 100
        },
        casingParticles: [{
            position: Vec(3.5, 0.3),
            frame: "casing_127x55mm",
            on: "reload",
            count: 5,
            velocity: {
                x: {
                    min: -8,
                    max: -2
                },
                y: {
                    min: 2,
                    max: 9,
                    randomSign: true
                }
            }
        }],
        image: { position: Vec(87, 0) },
        inventoryScale: 0.85,
        gasParticles: gasParticlePresets.pistol,
        capacity: 5,
        reloadTime: 2.4,
        ballistics: {
            damage: 60,
            obstacleMultiplier: 1,
            speed: 0.3,
            range: 120,
            tracer: {
                opacity: 0.3,
                width: 1.5
            }
        },
        dual: {
            tier: Tier.S,
            leftRightOffset: 1.3,
            ammoSpawnAmount: 60,
            fireDelay: 200,
            shotSpread: 4,
            moveSpread: 8,
            capacity: 10,
            reloadTime: 4.2
        }
    },
    {
        idString: "mp5k",
        name: "MP5k",
        defType: DefinitionType.Gun,
        tier: Tier.D,
        ammoType: "9mm",
        ammoSpawnAmount: 80,
        speedMultiplier: 1.136,
        capacity: 20,
        extendedCapacity: 30,
        reloadTime: 1.8,
        fireDelay: 60,
        burstProperties: {
            shotsPerBurst: 3,
            burstCooldown: 250
        },
        switchDelay: 250,
        recoilMultiplier: 0.8,
        recoilDuration: 300,
        fireMode: FireMode.Burst,
        shotSpread: 3,
        moveSpread: 7.5,
        length: 5.6,
        fists: {
            left: Vec(85, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(71, 0) },
        inventoryScale: 0.85,
        casingParticles: [{
            position: Vec(4, 0.35)
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 14,
            obstacleMultiplier: 1,
            speed: 0.25,
            range: 100
        },
        dual: {
            tier: Tier.C,
            leftRightOffset: 1.3,
            ammoSpawnAmount: 80,
            fists: {
                left: Vec(40, -1.3),
                right: Vec(40, 1.3),
                rightZIndex: 4,
                leftZIndex: 4,
                animationDuration: 100
            },
            burstProperties: {
                shotsPerBurst: 3,
                burstCooldown: 125
            },
            fireDelay: 60,
            shotSpread: 3,
            moveSpread: 6,
            capacity: 40,
            reloadTime: 3.2
        }
    },

    //
    // Submachine guns (SMGs)
    //
    {
        idString: "saf200",
        name: "SAF-200",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "9mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        extendedCapacity: 42,
        reloadTime: 1.8,
        fireDelay: 75,
        burstProperties: {
            shotsPerBurst: 3,
            burstCooldown: 300
        },
        switchDelay: 300,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 300,
        fireMode: FireMode.Burst,
        shotSpread: 3,
        moveSpread: 4,
        length: 6.25,
        fists: {
            left: Vec(95, -3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(71, 0) },
        casingParticles: [{
            position: Vec(4, 0.35)
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 16,
            obstacleMultiplier: 1,
            speed: 0.28,
            range: 140
        }
    },
    {
        idString: "micro_uzi",
        name: "Micro Uzi",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "9mm",
        ammoSpawnAmount: 96,
        capacity: 32,
        extendedCapacity: 50,
        reloadTime: 1.75,
        fireDelay: 40,
        switchDelay: 300,
        speedMultiplier: 1.136,
        recoilMultiplier: 0.75,
        recoilDuration: 60,
        fireMode: FireMode.Auto,
        shotSpread: 9,
        moveSpread: 19,
        length: 5.07,
        fists: {
            left: Vec(70, -3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        casingParticles: [{
            position: Vec(3.2, 0.4)
        }],
        gasParticles: gasParticlePresets.automatic,
        image: { position: Vec(68, 0) },
        inventoryScale: 0.85,
        ballistics: {
            damage: 7.75,
            obstacleMultiplier: 1,
            speed: 0.16,
            range: 85
        }
    },
    {
        idString: "mpx",
        name: "MPX",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "9mm",
        ammoSpawnAmount: 96,
        capacity: 32,
        extendedCapacity: 40,
        reloadTime: 2.1,
        fireDelay: 90,
        switchDelay: 300,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 150,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 4,
        length: 6.65,
        fists: {
            left: Vec(103, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(75, 1) },
        casingParticles: [{
            position: Vec(3.5, 0.4),
            velocity: {
                y: {
                    min: 5,
                    max: 10
                }
            }
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 11,
            obstacleMultiplier: 1,
            speed: 0.25,
            range: 130
        }
    },
    {
        idString: "vector",
        name: "Vector",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "9mm",
        ammoSpawnAmount: 99,
        capacity: 33,
        extendedCapacity: 50,
        reloadTime: 1.7,
        fireDelay: 40,
        switchDelay: 300,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 60,
        fireMode: FireMode.Auto,
        shotSpread: 3,
        moveSpread: 7,
        length: 6.1,
        fists: {
            left: Vec(100, -4),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        casingParticles: [{
            position: Vec(4.7, 0.3)
        }],
        gasParticles: gasParticlePresets.automatic,
        image: { position: Vec(70, -1) },
        ballistics: {
            damage: 9,
            obstacleMultiplier: 1,
            speed: 0.27,
            range: 80
        }
    },
    {
        idString: "pp19",
        name: "PP-19 Vityaz",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "9mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        extendedCapacity: 45,
        reloadTime: 2.3,
        fireDelay: 50,
        switchDelay: 300,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 150,
        fireMode: FireMode.Auto,
        shotSpread: 3,
        moveSpread: 6.75,
        length: 7.3,
        noMuzzleFlash: true,
        fists: {
            left: Vec(88, -5),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        casingParticles: [{
            position: Vec(3.5, 0.4)
        }],
        image: { position: Vec(80, 1.3) },
        ballistics: {
            damage: 10.5,
            obstacleMultiplier: 1,
            speed: 0.25,
            range: 160,
            tracer: {
                opacity: 0.15
            }
        }
    },

    //
    // Assault rifles
    //
    {
        idString: "ak47",
        name: "AK-47",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "762mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        extendedCapacity: 40,
        reloadTime: 2.5,
        fireDelay: 100,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 150,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 6,
        length: 7.75,
        fists: {
            left: Vec(115, -2),
            right: Vec(45, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(85, 1) },
        casingParticles: [{
            frame: "casing_762x39mm",
            position: Vec(4.2, 0.4)
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 14,
            obstacleMultiplier: 1.5,
            speed: 0.26,
            range: 160
        }
    },
    {
        idString: "mcx_spear",
        name: "MCX Spear",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "762mm",
        ammoSpawnAmount: 80,
        capacity: 20,
        extendedCapacity: 30,
        reloadTime: 2.75,
        fireDelay: 87.5,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 130,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 4,
        length: 7.9,
        fists: {
            left: Vec(115, -6),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(87, 1.5) },
        casingParticles: [{
            position: Vec(4, 0.4)
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 16,
            obstacleMultiplier: 1.5,
            speed: 0.3,
            range: 180,
            tracer: {
                length: 1.4
            }
        }
    },
    {
        idString: "svu",
        name: "SVU-A",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "762mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        extendedCapacity: 40,
        reloadTime: 3.2,
        fireDelay: 120,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.725,
        recoilDuration: 150,
        fireMode: FireMode.Auto,
        shotSpread: 3,
        moveSpread: 8,
        length: 8.4,
        fists: {
            left: Vec(100, -8),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(90, 1.5) },
        casingParticles: [{
            frame: "casing_762x54mmR",
            position: Vec(4, 0.4)
        }],
        noMuzzleFlash: true,
        ballistics: {
            damage: 21,
            obstacleMultiplier: 1.5,
            speed: 0.3,
            range: 180,
            tracer: {
                length: 1.4,
                opacity: 0.15
            }
        }
    },
    {
        idString: "m16a2",
        name: "M16A2",
        defType: DefinitionType.Gun,
        tier: Tier.B,
        ammoType: "556mm",
        ammoSpawnAmount: 80,
        capacity: 20,
        extendedCapacity: 30,
        reloadTime: 2.2,
        fireDelay: 75,
        burstProperties: {
            shotsPerBurst: 3,
            burstCooldown: 325
        },
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 350,
        fireMode: FireMode.Burst,
        shotSpread: 2,
        moveSpread: 4,
        length: 8.68,
        fists: {
            left: Vec(110, -3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(92, 1.5) },
        casingParticles: [{
            position: Vec(4, 0.4)
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 19,
            obstacleMultiplier: 1.5,
            speed: 0.3,
            range: 180
        }
    },
    {
        idString: "aug",
        name: "AUG",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "556mm",
        ammoSpawnAmount: 90,
        fireDelay: 70,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 120,
        fireMode: FireMode.Auto,
        shotSpread: 4,
        moveSpread: 11,
        length: 6.8,
        fists: {
            left: Vec(100, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(75, -1) },
        casingParticles: [{
            position: Vec(2.5, 0.4)
        }],
        gasParticles: gasParticlePresets.automatic,
        capacity: 30,
        extendedCapacity: 42,
        reloadTime: 2.25,
        ballistics: {
            damage: 10.5,
            obstacleMultiplier: 1.5,
            speed: 0.28,
            range: 160
        }
    },
    {
        idString: "arx160",
        name: "ARX-160",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "762mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        extendedCapacity: 40,
        reloadTime: 2.5,
        fireDelay: 75,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 145,
        fireMode: FireMode.Auto,
        shotSpread: 5,
        moveSpread: 10,
        length: 7.3,
        fists: {
            left: Vec(103, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(80, 0) },
        casingParticles: [{
            frame: "casing_762x39mm",
            position: Vec(3.7, 0.4)
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 12.25,
            obstacleMultiplier: 1.5,
            speed: 0.26,
            range: 160
        }
    },
    {
        idString: "acr",
        name: "ACR",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "556mm",
        ammoSpawnAmount: 90,
        fireDelay: 72.5,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 130,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 7,
        noMuzzleFlash: true,
        length: 7.5,
        fists: {
            left: Vec(100, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(78, 0) },
        casingParticles: [{
            position: Vec(3.5, 0.4)
        }],
        capacity: 30,
        extendedCapacity: 45,
        reloadTime: 3,
        ballistics: {
            damage: 14.5,
            obstacleMultiplier: 1.5,
            speed: 0.3,
            range: 160,
            tracer: {
                opacity: 0.15
            }
        }
    },
    {
        idString: "shak12",
        name: "ShAK-12",
        defType: DefinitionType.Gun,
        ammoType: "50cal",
        ammoSpawnAmount: 50,
        speedMultiplier: 1,
        tier: Tier.A,
        capacity: 10,
        extendedCapacity: 15,
        reloadTime: 3,
        fireDelay: 125,
        switchDelay: 400,
        recoilMultiplier: 0.75,
        recoilDuration: 400,
        fireMode: FireMode.Auto,
        shotSpread: 6,
        moveSpread: 6,
        bulletCount: 2,
        length: 7.2,
        fists: {
            left: Vec(85, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(70, 0) },
        casingParticles: [{
            position: Vec(3.53, 0.4)
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 17.5,
            obstacleMultiplier: 1.5,
            speed: 0.26,
            range: 60,
            tracer: {
                width: 1.3
            }
        }
    },
    //
    // Light machine guns (LMGs)
    //
    {
        idString: "fn_fal",
        name: "FN FAL",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "762mm",
        ammoSpawnAmount: 100,
        capacity: 50,
        extendedCapacity: 100,
        reloadTime: 3.4,
        fireDelay: 115,
        switchDelay: 400,
        speedMultiplier: 0.897,
        recoilMultiplier: 0.7, // also test out 0.75
        recoilDuration: 200,
        fireMode: FireMode.Auto,
        shotSpread: 3.5,
        moveSpread: 7.5, // also test out 6.5, 7, 8
        length: 9.47,
        fists: {
            left: Vec(120, -8),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(100, 3) },
        casingParticles: [{
            frame: "casing_762x51mm",
            position: Vec(3.5, 0.6)
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 16.5,
            obstacleMultiplier: 2,
            speed: 0.3,
            range: 180,
            tracer: {
                width: 1.1,
                length: 1.4
            }
        }
    },
    {
        idString: "stoner_63",
        name: "Stoner 63",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "556mm",
        ammoSpawnAmount: 150,
        capacity: 75,
        extendedCapacity: 125,
        reloadTime: 3.8,
        fireDelay: 90,
        switchDelay: 400,
        speedMultiplier: 0.978,
        recoilMultiplier: 0.7,
        recoilDuration: 175,
        fireMode: FireMode.Auto,
        shotSpread: 3,
        moveSpread: 4.5,
        length: 8,
        fists: {
            left: Vec(100, -3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(82, 0) },
        casingParticles: [
            {
                position: Vec(3.7, -0.6),
                velocity: {
                    y: {
                        min: -15,
                        max: -10
                    }
                }
            },
            {
                position: Vec(3.9, -0.6),
                frame: "m13_link",
                velocity: {
                    x: {
                        min: -6,
                        max: 8
                    },
                    y: {
                        min: -25,
                        max: -10
                    }
                }
            }
        ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 14.25,
            obstacleMultiplier: 2,
            speed: 0.28,
            range: 180,
            tracer: {
                width: 1.1,
                length: 1.4
            }
        }
    },
    {
        idString: "mg5",
        name: "MG5",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "762mm",
        ammoSpawnAmount: 240,
        capacity: 120,
        extendedCapacity: 160,
        reloadTime: 5.2,
        fireDelay: 95,
        switchDelay: 400,
        speedMultiplier: 0.87,
        recoilMultiplier: 0.65,
        recoilDuration: 200,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 4.5,
        length: 8.6,
        fists: {
            left: Vec(110, -3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(90, 1) },
        casingParticles: [
            {
                position: Vec(4, 0.6)
            },
            {
                position: Vec(4.2, 0.6),
                frame: "m13_link",
                velocity: {
                    x: {
                        min: -6,
                        max: 8
                    },
                    y: {
                        min: 10,
                        max: 25
                    }
                }
            }
        ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 16.5,
            obstacleMultiplier: 1.5,
            speed: 0.26,
            range: 180,
            tracer: {
                width: 1.1,
                length: 1.4
            }
        }
    },
    {
        idString: "negev",
        name: "Negev SF",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "556mm",
        ammoSpawnAmount: 200,
        capacity: 200,
        extendedCapacity: 250,
        reloadTime: 5.9,
        fireDelay: 70,
        switchDelay: 400,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.675,
        recoilDuration: 200,
        fireMode: FireMode.Auto,
        shotSpread: 5,
        moveSpread: 8,
        length: 7.15,
        fists: {
            left: Vec(109, -18),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(80, -3.6) },
        casingParticles: [
            {
                position: Vec(4, 0.6)
            },
            {
                position: Vec(4.2, 0.6),
                frame: "m13_link",
                velocity: {
                    x: {
                        min: -6,
                        max: 8
                    },
                    y: {
                        min: 10,
                        max: 25
                    }
                }
            }
        ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 13.25,
            obstacleMultiplier: 1.5,
            speed: 0.28,
            range: 160,
            tracer: {
                width: 1.1,
                length: 1.4
            }
        }
    },
    {
        idString: "mg36",
        name: "MG36",
        defType: DefinitionType.Gun,
        tier: Tier.B,
        ammoType: "556mm",
        ammoSpawnAmount: 100,
        capacity: 50,
        extendedCapacity: 100,
        reloadTime: 2.75,
        fireDelay: 75,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 140,
        fireMode: FireMode.Auto,
        shotSpread: 3.5,
        moveSpread: 8,
        length: 7.8,
        fists: {
            left: Vec(100, -4),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(83, 0) },
        casingParticles: [{
            position: Vec(3.75, 0.45)
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 11,
            obstacleMultiplier: 2,
            speed: 0.28,
            range: 160
        }
    },
    {
        idString: "pk61",
        name: "PK-61",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "762mm",
        ammoSpawnAmount: 200,
        capacity: 100,
        extendedCapacity: 150,
        reloadTime: 4.8,
        fireDelay: 110,
        switchDelay: 400,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.7,
        recoilDuration: 200,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 4,
        length: 9.45,
        fists: {
            left: Vec(120, -4),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(100, 0) },
        casingParticles: [{
            frame: "casing_762x54mmR",
            position: Vec(4.6, -0.8),
            velocity: {
                y: {
                    min: -15,
                    max: -10
                }
            }
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 17,
            obstacleMultiplier: 2,
            speed: 0.32,
            range: 250,
            tracer: {
                width: 1.1,
                length: 1.4
            }
        }
    },

    //
    // Shotguns
    //
    {
        idString: "m3k",
        name: "M3K",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "12g",
        ammoSpawnAmount: 18,
        capacity: 9,
        extendedCapacity: 12,
        reloadTime: 0.55,
        fireDelay: 700,
        switchDelay: 700,
        speedMultiplier: 1,
        recoilMultiplier: 0.5,
        recoilDuration: 500,
        fireMode: FireMode.Single,
        shotSpread: 5,
        moveSpread: 7,
        jitterRadius: 0.5,
        bulletCount: 9,
        length: 8.5,
        fists: {
            left: Vec(95, -3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(85, 2) },
        casingParticles: [{
            frame: "casing_12ga_flechette",
            position: Vec(4, 0.6)
        }],
        gasParticles: gasParticlePresets.shotgun,
        shotsPerReload: 1,
        ballistics: {
            damage: 9,
            obstacleMultiplier: 1,
            speed: 0.2,
            range: 80
        }
    },
    {
        idString: "model_37",
        name: "Model 37",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "12g",
        ammoSpawnAmount: 15,
        capacity: 5,
        extendedCapacity: 8,
        reloadTime: 0.75,
        fireDelay: 900,
        switchDelay: 900,
        speedMultiplier: 1,
        recoilMultiplier: 0.5,
        recoilDuration: 550,
        fireMode: FireMode.Single,
        shotSpread: 11,
        moveSpread: 14,
        jitterRadius: 1.25,
        bulletCount: 10,
        length: 8.15,
        fists: {
            left: Vec(116, -3),
            right: Vec(45, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(89, 0.5) },
        casingParticles: [{
            position: Vec(4, 0.6),
            ejectionDelay: 450,
            velocity: {
                y: {
                    min: 2,
                    max: 5,
                    randomSign: true
                }
            }
        }],
        gasParticles: gasParticlePresets.shotgun,
        shotsPerReload: 1,
        ballistics: {
            damage: 10,
            obstacleMultiplier: 1,
            speed: 0.16,
            range: 48,
            tracer: {
                length: 0.7
            }
        }
    },
    {
        idString: "hp18",
        name: "HP-18",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "12g",
        ammoSpawnAmount: 15,
        capacity: 5,
        extendedCapacity: 8,
        reloadTime: 0.725,
        shotsPerReload: 1,
        fireDelay: 300,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.6,
        recoilDuration: 600,
        fireMode: FireMode.Single,
        bulletCount: 18,
        shotSpread: 18,
        moveSpread: 22,
        jitterRadius: 1.75,
        length: 7.4,
        fists: {
            left: Vec(95, -1),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(75, 2) },
        casingParticles: [{
            frame: "casing_12ga_bird",
            position: Vec(4, 0.6)
        }],
        gasParticles: gasParticlePresets.shotgun,
        ballistics: {
            damage: 4,
            obstacleMultiplier: 1,
            speed: 0.12,
            range: 40,
            tracer: {
                length: 0.5
            }
        }
    },
    {
        idString: "badlander",
        name: "Badlander",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "12g",
        ammoSpawnAmount: 10,
        capacity: 2,
        reloadTime: 2.6,
        fireDelay: 250,
        switchDelay: 250,
        speedMultiplier: 1,
        recoilMultiplier: 0.5,
        recoilDuration: 550,
        fireMode: FireMode.Single,
        bulletCount: 10,
        shotSpread: 11,
        moveSpread: 14,
        jitterRadius: 1.5,
        length: 6,
        fists: {
            left: Vec(95, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(75, 0) },
        casingParticles: [{
            position: Vec(4, 0.6),
            count: 2,
            velocity: {
                y: {
                    min: 8,
                    max: 15,
                    randomSign: true
                }
            },
            on: "reload"
        }],
        gasParticles: gasParticlePresets.shotgun,
        ballistics: {
            damage: 10,
            obstacleMultiplier: 1,
            speed: 0.16,
            range: 48,
            tracer: {
                length: 0.5
            }
        }
    },
    {
        idString: "usas12",
        name: "USAS-12",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "12g",
        ammoSpawnAmount: 30,
        capacity: 10,
        extendedCapacity: 20,
        reloadTime: 3,
        fireDelay: 525,
        switchDelay: 900,
        speedMultiplier: 1,
        recoilMultiplier: 0.5,
        recoilDuration: 525,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 5,
        length: 7.35,
        fists: {
            left: Vec(105, -1),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(80, -1.5) },
        casingParticles: [{
            frame: "casing_12ga_he",
            position: Vec(4.5, 0.6)
        }],
        ballistics: {
            damage: 5,
            obstacleMultiplier: 1,
            speed: 0.22,
            range: 50,
            onHitExplosion: "usas_explosion",
            explodeOnImpact: true,
            allowRangeOverride: true,
            tracer: {
                length: 0.5,
                color: 0xFF0000,
                saturatedColor: 0xF55C3D
            }
        }
    },
    {
        idString: "vepr12",
        name: "Vepr-12",
        defType: DefinitionType.Gun,
        tier: Tier.B,
        ammoType: "12g",
        ammoSpawnAmount: 20,
        capacity: 5,
        extendedCapacity: 10,
        reloadTime: 2.4,
        fireDelay: 400,
        switchDelay: 650,
        speedMultiplier: 1,
        recoilMultiplier: 0.7,
        recoilDuration: 550,
        fireMode: FireMode.Auto,
        shotSpread: 11,
        moveSpread: 14,
        jitterRadius: 1.25,
        length: 7.3,
        bulletCount: 10,
        fists: {
            left: Vec(99, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(79, 2) },
        casingParticles: [{
            position: Vec(3.9, 0.6)
        }],
        gasParticles: gasParticlePresets.shotgun,
        ballistics: {
            damage: 10,
            obstacleMultiplier: 1,
            speed: 0.16,
            range: 48,
            tracer: {
                length: 0.5
            }
        }
    },
    {
        idString: "stevens_555",
        name: "Stevens 555",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "12g",
        ammoSpawnAmount: 10,
        capacity: 2,
        reloadTime: 2.3,
        fireDelay: 300,
        switchDelay: 500,
        speedMultiplier: 1,
        recoilMultiplier: 0.6,
        recoilDuration: 400,
        fireMode: FireMode.Single,
        shotSpread: 5,
        moveSpread: 7,
        length: 7.95,
        jitterRadius: 0.5,
        bulletCount: 9,
        fists: {
            left: Vec(84, -3),
            right: Vec(45, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(83, 0) },
        casingParticles: [{
            frame: "casing_12ga_flechette",
            position: Vec(4, 0.6),
            count: 2,
            velocity: {
                y: {
                    min: 8,
                    max: 12,
                    randomSign: true
                }
            },
            on: "reload"
        }],
        gasParticles: gasParticlePresets.shotgun,
        ballistics: {
            damage: 9,
            obstacleMultiplier: 1,
            speed: 0.2,
            range: 80
        }
    },
    {
        idString: "m590m",
        name: "M590M",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "12g",
        ammoSpawnAmount: 15,
        capacity: 5,
        extendedCapacity: 10,
        reloadTime: 2.8,
        fireDelay: 900,
        switchDelay: 900,
        speedMultiplier: 1,
        recoilMultiplier: 0.5,
        recoilDuration: 500,
        fireMode: FireMode.Single,
        shotSpread: 2,
        moveSpread: 5,
        length: 8,
        fists: {
            left: Vec(100, -3),
            right: Vec(45, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(82, 0) },
        casingParticles: [{
            position: Vec(4.2, 0.6),
            ejectionDelay: 400,
            frame: "casing_12ga_he"
        }],
        gasParticles: gasParticlePresets.shotgun,
        ballistics: {
            damage: 5,
            obstacleMultiplier: 1,
            speed: 0.22,
            range: 50,
            onHitExplosion: "m590m_explosion",
            explodeOnImpact: true,
            allowRangeOverride: true,
            tracer: {
                length: 0.5,
                color: 0xFF0000,
                saturatedColor: 0xF55C3D
            }
        }
    },
    {
        idString: "mp153",
        name: "MP-153",
        tier: Tier.A,
        ammoType: "12g",
        speedMultiplier: 1,
        defType: DefinitionType.Gun,
        ammoSpawnAmount: 16,
        capacity: 8,
        extendedCapacity: 12,
        reloadTime: 0.45,
        shotsPerReload: 1,
        fireDelay: 400,
        switchDelay: 600,
        recoilMultiplier: 0.6,
        recoilDuration: 400,
        fireMode: FireMode.Single,
        shotSpread: 2,
        moveSpread: 5,
        fsaReset: 600,
        length: 8.45,
        fists: {
            left: Vec(108, -3),
            right: Vec(45, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(98, 0) },
        casingParticles: [{
            position: Vec(4.5, 0.6),
            frame: "casing_12ga_slug"
        }],
        gasParticles: gasParticlePresets.shotgun,
        ballistics: {
            damage: 78,
            obstacleMultiplier: 1,
            speed: 0.25,
            range: 120,
            tracer: {
                width: 2,
                length: 1.3
            }
        }
    },
    //
    // Sniper rifles
    //
    {
        idString: "mosin_nagant",
        name: "Mosin-Nagant",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "762mm",
        ammoSpawnAmount: 20,
        spawnScope: "4x_scope",
        capacity: 5,
        reloadTime: 0.85,
        shotsPerReload: 1,
        reloadFullOnEmpty: true,
        fullReloadTime: 2.9,
        fireDelay: 900,
        switchDelay: 900,
        speedMultiplier: 1,
        recoilMultiplier: 0.45,
        recoilDuration: 750,
        fireMode: FireMode.Single,
        shotSpread: 1,
        moveSpread: 2,
        length: 8.5,
        shootOnRelease: true,
        fists: {
            left: Vec(100, 0),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(86.5, 2.7) },
        casingParticles: [{
            frame: "casing_762x54mmR",
            position: Vec(4, 0.6),
            ejectionDelay: 700
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 70,
            obstacleMultiplier: 1,
            speed: 0.33,
            range: 250,
            tracer: {
                width: 1.4,
                length: 2.5
            }
        }
    },
    {
        idString: "tango_51",
        name: "Tango 51",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "762mm",
        ammoSpawnAmount: 20,
        spawnScope: "8x_scope",
        capacity: 5,
        extendedCapacity: 10,
        reloadTime: 2.6,
        fireDelay: 900,
        switchDelay: 900,
        speedMultiplier: 1,
        recoilMultiplier: 0.4,
        recoilDuration: 1000,
        fireMode: FireMode.Single,
        shotSpread: 0.3,
        moveSpread: 0.6,
        length: 8.85,
        shootOnRelease: true,
        fists: {
            left: Vec(106, -1),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(87, 3) },
        casingParticles: [{
            position: Vec(4, 0.6),
            ejectionDelay: 450
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 79,
            obstacleMultiplier: 1,
            speed: 0.4,
            range: 280,
            tracer: {
                width: 1.6,
                length: 3.5
            }
        }
    },
    {
        idString: "cz600",
        name: "CZ-600",
        defType: DefinitionType.Gun,
        tier: Tier.B,
        ammoType: "556mm",
        ammoSpawnAmount: 20,
        capacity: 5,
        extendedCapacity: 10,
        reloadTime: 2.2,
        fireDelay: 600,
        switchDelay: 600,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 750,
        fireMode: FireMode.Single,
        shotSpread: 0.75,
        moveSpread: 1.25,
        length: 8.25,
        shootOnRelease: true,
        fists: {
            left: Vec(105, -3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(85, 3.5) },
        casingParticles: [{
            position: Vec(3.7, 0.4),
            ejectionDelay: 250
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 55,
            obstacleMultiplier: 1,
            speed: 0.3,
            range: 250,
            tracer: {
                width: 1.3,
                length: 2.4
            }
        }
    },
    {
        idString: "l115a1",
        name: "L115A1",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "338lap",
        ammoSpawnAmount: 12,
        spawnScope: "16x_scope",
        fireDelay: 1500,
        switchDelay: 900,
        speedMultiplier: 1,
        recoilMultiplier: 0.4,
        recoilDuration: 1600,
        fireMode: FireMode.Single,
        shotSpread: 0.2,
        moveSpread: 0.4,
        shootOnRelease: true,
        length: 10.6,
        casingParticles: [{
            position: Vec(4, 0.2),
            ejectionDelay: 500
        }],
        fists: {
            left: Vec(110, 0),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(110, 3) },
        gasParticles: gasParticlePresets.rifle,
        capacity: 3,
        extendedCapacity: 5,
        reloadTime: 3.8,
        ballistics: {
            damage: 150,
            obstacleMultiplier: 1,
            speed: 0.5,
            tracer: {
                width: 2.5,
                length: 4
            },
            range: 300
        }
    },
    {
        idString: "rgs",
        name: "RG Scout",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "556mm",
        ammoSpawnAmount: 30,
        spawnScope: "4x_scope",
        capacity: 10,
        extendedCapacity: 15,
        reloadTime: 2.6,
        fireDelay: 600,
        switchDelay: 600,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 600,
        fireMode: FireMode.Single,
        shotSpread: 0.5,
        moveSpread: 2,
        length: 8.75,
        shootOnRelease: true,
        fists: {
            left: Vec(105, -1),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(85, 3) },
        casingParticles: [{
            position: Vec(4, 0.4),
            ejectionDelay: 250
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 65,
            obstacleMultiplier: 1,
            speed: 0.33,
            range: 270,
            tracer: {
                width: 1.3,
                length: 2.4
            },
            lastShotFX: true
        }
    },
    {
        idString: "vks",
        name: "VKS Vykhlop",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "50cal",
        ammoSpawnAmount: 25,
        spawnScope: "8x_scope",
        fireDelay: 800,
        switchDelay: 900,
        speedMultiplier: 1,
        recoilMultiplier: 0.6,
        recoilDuration: 1000,
        fireMode: FireMode.Single,
        shotSpread: 1,
        moveSpread: 3,
        length: 8.95,
        fists: {
            left: Vec(90, 3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(90, 2) },
        casingParticles: [{
            position: Vec(3.5, 0.6),
            ejectionDelay: 400
        }],
        gasParticles: gasParticlePresets.rifle,
        noMuzzleFlash: true,
        capacity: 5,
        extendedCapacity: 10,
        reloadTime: 3.2,
        ballistics: {
            damage: 95,
            obstacleMultiplier: 1,
            speed: 0.27,
            range: 180,
            tracer: {
                width: 2,
                length: 2,
                opacity: 0.3
            }
        }
    },

    //
    // Designated marksman rifles (DMRs)
    //
    {
        idString: "vss",
        name: "VSS Vintorez",
        defType: DefinitionType.Gun,
        tier: Tier.B,
        ammoType: "9mm",
        ammoSpawnAmount: 60,
        capacity: 20,
        extendedCapacity: 30,
        reloadTime: 2.15,
        fireDelay: 140,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.7,
        recoilDuration: 140,
        fireMode: FireMode.Single,
        shotSpread: 2,
        moveSpread: 3.5,
        length: 7.2,
        fists: {
            left: Vec(92, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(82, 0) },
        casingParticles: [{
            frame: "casing_9x39mm",
            position: Vec(3.7, 0.5)
        }],
        noMuzzleFlash: true,
        ballistics: {
            damage: 22,
            obstacleMultiplier: 1.5,
            speed: 0.22,
            range: 160,
            tracer: {
                opacity: 0.15,
                length: 1.5
            }
        }
    },
    {
        idString: "sr25",
        name: "SR-25",
        defType: DefinitionType.Gun,
        tier: Tier.B,
        ammoType: "762mm",
        ammoSpawnAmount: 80,
        capacity: 20,
        extendedCapacity: 30,
        reloadTime: 2.5,
        fireDelay: 200,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.7,
        recoilDuration: 200,
        fireMode: FireMode.Single,
        shotSpread: 1,
        moveSpread: 3.5,
        length: 7.85,
        fists: {
            left: Vec(110, 0),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(78, 3) },
        casingParticles: [{
            position: Vec(3.6, 0.4)
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 33,
            obstacleMultiplier: 1.5,
            speed: 0.3,
            range: 230,
            tracer: {
                length: 1.5
            }
        }
    },
    {
        idString: "mini14",
        name: "Mini-14",
        defType: DefinitionType.Gun,
        tier: Tier.B,
        ammoType: "556mm",
        ammoSpawnAmount: 80,
        capacity: 20,
        extendedCapacity: 30,
        reloadTime: 2.4,
        fireDelay: 155,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.8,
        recoilDuration: 155,
        fireMode: FireMode.Single,
        shotSpread: 2,
        moveSpread: 5,
        length: 7.6,
        fists: {
            left: Vec(88, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(80, 2) },
        casingParticles: [{
            position: Vec(5, 0.5),
            velocity: {
                y: {
                    min: 4,
                    max: 15
                }
            }
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 25.5,
            obstacleMultiplier: 1.5,
            speed: 0.3,
            range: 230,
            tracer: {
                length: 1.5
            }
        }
    },
    {
        idString: "m1_garand",
        name: "M1 Garand",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "762mm",
        ammoSpawnAmount: 40,
        capacity: 8,
        reloadTime: 2.1,
        fireDelay: 250,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.75,
        recoilDuration: 200,
        fireMode: FireMode.Single,
        shotSpread: 1,
        moveSpread: 3.5,
        length: 8.65,
        fists: {
            left: Vec(105, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(90, 2.5) },
        casingParticles: [
            {
                frame: "casing_30-06",
                position: Vec(4, 0.5),
                velocity: {
                    y: {
                        min: 4,
                        max: 10
                    }
                }
            },
            {
                frame: "enbloc",
                position: Vec(4, 0.5),
                velocity: {
                    x: {
                        min: 1,
                        max: 3,
                        randomSign: true
                    },
                    y: {
                        min: 2,
                        max: 5,
                        randomSign: true
                    }
                },
                on: "reload"
            }
        ] as NonNullable<SingleGunNarrowing["casingParticles"]>,
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 48,
            obstacleMultiplier: 1,
            speed: 0.35,
            range: 230,
            tracer: {
                length: 2,
                width: 1.5
            },
            lastShotFX: true
        }
    },
    {
        idString: "model_89",
        name: "Model 89",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "50cal",
        ammoSpawnAmount: 28,
        capacity: 7,
        extendedCapacity: 10,
        reloadTime: 0.4,
        shotsPerReload: 1,
        fireDelay: 350,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.7,
        recoilDuration: 300,
        fireMode: FireMode.Single,
        shotSpread: 1,
        moveSpread: 4,
        length: 7.3,
        fists: {
            left: Vec(93, -2),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(77, 0) },
        casingParticles: [{
            frame: "casing_500sw",
            position: Vec(3, 0.5),
            ejectionDelay: 175
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 55,
            obstacleMultiplier: 1.5,
            speed: 0.31,
            range: 250,
            tracer: {
                width: 1.8,
                length: 1.5
            }
        }
    },
    {
        idString: "sks",
        name: "SKS",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "762mm",
        ammoSpawnAmount: 60,
        capacity: 10,
        extendedCapacity: 20,
        reloadTime: 0.4,
        shotsPerReload: 2,
        reloadFullOnEmpty: true,
        fullReloadTime: 2.4,
        fireDelay: 180,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.8,
        recoilDuration: 150,
        fireMode: FireMode.Single,
        shotSpread: 3,
        moveSpread: 5,
        length: 7.9,
        fists: {
            left: Vec(95, -3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(83, 0) },
        casingParticles: [{
            position: Vec(4.2, 0.4),
            frame: "casing_762x39mm",
            velocity: {
                y: {
                    min: 4,
                    max: 10
                }
            }
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 23,
            obstacleMultiplier: 1.5,
            speed: 0.27,
            range: 180,
            tracer: {
                length: 1.2
            }
        }
    },
    {
        idString: "blr",
        name: "BLR 556",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        ammoType: "556mm",
        ammoSpawnAmount: 20,
        capacity: 5,
        extendedCapacity: 10,
        reloadTime: 2.1,
        fireDelay: 350,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.8,
        recoilDuration: 300,
        fireMode: FireMode.Single,
        shotSpread: 2,
        moveSpread: 5,
        length: 7.55,
        fists: {
            left: Vec(95, -3),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(75, 0) },
        casingParticles: [{
            position: Vec(4.2, 0.4)
        }],
        gasParticles: gasParticlePresets.rifle,
        ballistics: {
            damage: 45,
            obstacleMultiplier: 1,
            speed: 0.32,
            range: 200,
            tracer: {
                width: 1.5,
                length: 1.3
            }
        }
    },
    {
        idString: "mk18",
        name: "Mk-18 Mjölnir",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "338lap",
        ammoSpawnAmount: 20,
        spawnScope: "4x_scope",
        fireDelay: 450,
        switchDelay: 700,
        speedMultiplier: 1,
        recoilMultiplier: 0.65,
        recoilDuration: 500,
        fsaReset: 700,
        fireMode: FireMode.Single,
        shotSpread: 1,
        moveSpread: 4,
        length: 9.65,
        casingParticles: [{
            position: Vec(4, 0.3)
        }],
        fists: {
            left: Vec(120, 0),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(100, 2) },
        gasParticles: gasParticlePresets.rifle,
        capacity: 5,
        extendedCapacity: 10,
        reloadTime: 3.8,
        ballistics: {
            damage: 90,
            obstacleMultiplier: 1.5,
            speed: 0.4,
            tracer: {
                width: 1.8,
                length: 3
            },
            range: 250
        }
    },

    //
    // Fictional weapons
    //
    {
        idString: "seedshot",
        name: "Seedshot",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "seed",
        ammoSpawnAmount: 0,
        capacity: 20,
        extendedCapacity: 30,
        reloadTime: 2.6,
        fireDelay: 80,
        switchDelay: 400,
        speedMultiplier: 1,
        recoilMultiplier: 0.8,
        recoilDuration: 200,
        fireMode: FireMode.Auto,
        shotSpread: 3,
        moveSpread: 6.75,
        length: 7.9,
        fists: {
            left: Vec(115, -6),
            right: Vec(40, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(90, 1) },
        casingParticles: [{
            position: Vec(4, 0.4)
        }],
        gasParticles: gasParticlePresets.automatic,
        ballistics: {
            damage: 2,
            obstacleMultiplier: 1.5,
            speed: 0.22,
            range: 180,
            tracer: {
                image: "seed_trail",
                length: 1.4
            },
            noReflect: true,
            onHitProjectile: "proj_seed"
        },
        noSwap: true
    },
    {
        idString: "vaccinator",
        name: "Vaccinator",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        ammoType: "needle",
        ammoSpawnAmount: 0,
        fireDelay: 70,
        switchDelay: 300,
        speedMultiplier: 1.136,
        recoilMultiplier: 0.88,
        recoilDuration: 90,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 5,
        length: 5.9,
        fists: {
            left: Vec(40, 0),
            right: Vec(40, 0),
            leftZIndex: 4,
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(80, 0) },
        inventoryScale: 0.8,
        noMuzzleFlash: true,
        capacity: 30,
        extendedCapacity: 40,
        reloadTime: 2,
        ballistics: {
            damage: 11,
            teammateHeal: 2,
            obstacleMultiplier: 1,
            speed: 0.18,
            range: 70,
            tracer: {
                image: "needle_trail",
                length: 1.4
            },
            enemySpeedMultiplier: {
                duration: 2000,
                multiplier: 0.7
            },
            removePerk: PerkIds.Infected
        },
        noSwap: true
    },
    {
        idString: "firework_launcher",
        name: "Firework Launcher",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "firework_rocket",
        ammoSpawnAmount: 9,
        capacity: 3,
        extendedCapacity: 5,
        reloadTime: 1.25,
        shotsPerReload: 1,
        shootOnRelease: true,
        fireDelay: 1250,
        switchDelay: 900,
        noMuzzleFlash: true,
        speedMultiplier: 0.707,
        recoilMultiplier: 0.5,
        recoilDuration: 925,
        fireMode: FireMode.Single,
        bulletOffset: 2.7,
        shotSpread: 5,
        moveSpread: 14,
        length: 5.65,
        fists: {
            left: Vec(70, 40),
            right: Vec(20, 55),
            animationDuration: 100
        },
        image: {
            position: Vec(29.7, 53.5),
            zIndex: 4
        },
        casingParticles: [{
            position: Vec(0.5, 3),
            ejectionDelay: 800
        }],
        gasParticles: {
            spread: 360,
            amount: 50,
            minLife: 5000,
            maxLife: 10000,
            minSpeed: 2,
            maxSpeed: 5,
            minSize: 0.3,
            maxSize: 0.5
        },
        ballistics: {
            damage: 20,
            obstacleMultiplier: 1,
            speed: 0.15,
            range: 120,
            onHitExplosion: "firework_launcher_explosion",
            explodeOnImpact: true,
            tracer: {
                image: "firework_rocket_trail"
            },
            trail: {
                frame: "small_gas",
                interval: 17,
                amount: 5,
                tint: -1,
                alpha: { min: 0.4, max: 0.8 },
                scale: { min: 0.1, max: 0.2 },
                spreadSpeed: { min: 1, max: 3 },
                lifetime: { min: 2500, max: 5000 }
            }
        },
        noSwap: true
    },

    //
    // Dev weapons
    //
    {
        idString: "g17_scoped",
        name: "G17 (scoped)",
        defType: DefinitionType.Gun,
        tier: Tier.C,
        noSwap: true,
        devItem: true,
        ammoType: "bb",
        ammoSpawnAmount: 0,
        fireDelay: 35,
        switchDelay: 250,
        speedMultiplier: 1.63,
        recoilMultiplier: 0.99,
        recoilDuration: 10,
        fireMode: FireMode.Auto,
        shotSpread: 0.5,
        moveSpread: 5,
        length: 6.7,
        fists: {
            left: Vec(40, 0),
            right: Vec(40, 0),
            leftZIndex: 4,
            rightZIndex: 4,
            animationDuration: 80
        },
        noMuzzleFlash: true,
        image: { position: Vec(80, 1) },
        capacity: 100,
        extendedCapacity: 250,
        reloadTime: 1.5,
        ballistics: {
            damage: 2,
            obstacleMultiplier: 0.5,
            speed: 0.1,
            range: 70,
            tracer: {
                width: 0.7,
                opacity: 0.85,
                color: 0xFF8000,
                saturatedColor: 0xF5B83D
            }
        }/* ,
        dual: {
            leftRightOffset: 1.3,
            capacity: 200,
            extendedCapacity: 500,
            fireDelay: 20,
            shotSpread: 1,
            moveSpread: 8,
            reloadTime: 2.8
        } */
        // justice for dual s_g17 when™
    },
    {
        idString: "death_ray",
        name: "Death Ray",
        defType: DefinitionType.Gun,
        tier: Tier.S,
        ammoType: "power_cell",
        ammoSpawnAmount: 0,
        noSwap: true,
        devItem: true,
        capacity: 1,
        reloadTime: 1.4,
        fireDelay: 40,
        switchDelay: 500,
        speedMultiplier: 1,
        recoilMultiplier: 0.8,
        recoilDuration: 100,
        fireMode: FireMode.Auto,
        shotSpread: 0.15,
        moveSpread: 0.1,
        killstreak: true,
        length: 8.4,
        fists: {
            left: Vec(130, -3),
            right: Vec(60, 0),
            animationDuration: 100
        },
        image: { position: Vec(87, 1) },
        noMuzzleFlash: true,
        casingParticles: [{
            position: Vec(4.5, 0.6),
            on: "reload"
        }],
        ballistics: {
            damage: 800,
            obstacleMultiplier: 2,
            speed: 4,
            range: 800,
            tracer: {
                image: "power_cell_trail",
                length: 10
            }
        }
    },
    {
        idString: "revitalizer",
        name: "Revitalizer",
        defType: DefinitionType.Gun,
        tier: Tier.A,
        noSwap: true,
        devItem: true,
        killstreak: true,
        consistentPatterning: true,
        ammoType: "12g",
        ammoSpawnAmount: 15,
        capacity: 5,
        extendedCapacity: 8,
        reloadTime: 0.75,
        fireDelay: 900,
        switchDelay: 900,
        speedMultiplier: 1,
        recoilMultiplier: 0.5,
        recoilDuration: 550,
        fireMode: FireMode.Single,
        shotSpread: 11,
        moveSpread: 14,
        bulletCount: 10,
        length: 6.88,
        fists: {
            left: Vec(112, -3),
            right: Vec(45, 0),
            rightZIndex: 4,
            animationDuration: 100
        },
        image: { position: Vec(78, 0) },
        casingParticles: [{
            position: Vec(4, 0.6),
            ejectionDelay: 450,
            velocity: {
                y: {
                    min: 2,
                    max: 5,
                    randomSign: true
                }
            }
        }],
        gasParticles: gasParticlePresets.shotgun,
        shotsPerReload: 1,
        ballistics: {
            damage: 10,
            obstacleMultiplier: 1,
            speed: 0.16,
            range: 48,
            tracer: {
                length: 0.7
            }
        },
        wearerAttributes: {
            passive: {
                maxHealth: 0.51,
                maxAdrenaline: 0.8
            },
            on: {
                kill: [
                    {
                        limit: 5,
                        maxHealth: 1.488,
                        maxAdrenaline: 1.201,
                        minAdrenaline: 20,
                        speedBoost: 1.02
                    },
                    {
                        healthRestored: 230,
                        adrenalineRestored: 30
                    }
                ],
                damageDealt: [
                    {
                        healthRestored: 2,
                        adrenalineRestored: 1.5
                    }
                ]
            }
        }
    }
] satisfies readonly RawGunDefinition[]).flatMap((def: RawGunDefinition) => {
    if (def.dual === undefined) {
        return def;
    }

    const dualDef = mergeDeep(
        {},
        def,
        def.dual,
        {
            idString: `dual_${def.idString}`,
            name: `Dual ${def.name}`,
            isDual: true,
            singleVariant: def.idString
        }
    ) as DualGunNarrowing;

    // @ts-expect-error init code
    delete dualDef.dual;
    // @ts-expect-error init code
    delete dualDef.image;
    // @ts-expect-error init code
    delete dualDef.casingParticles;
    // @ts-expect-error init code
    delete def.dual;
    // @ts-expect-error init code
    def.dualVariant = dualDef.idString;

    return [def, dualDef];
}));
