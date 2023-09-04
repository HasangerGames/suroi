import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";
import { v, type Vector } from "../utils/vector";
import { FireMode } from "../constants";

export type GunDefinition = ItemDefinition & {
    readonly itemType: ItemType.Gun

    readonly ammoType: string
    readonly ammoSpawnAmount: number
    readonly capacity: number
    readonly reloadTime: number
    readonly singleReload?: boolean
    readonly infiniteAmmo?: boolean

    readonly fireDelay: number
    readonly switchDelay: number

    readonly speedMultiplier: number
    readonly recoilMultiplier: number
    readonly recoilDuration: number
    readonly shotSpread: number
    readonly moveSpread: number // Added to shotSpread if the player is moving
    readonly consistentPatterning?: boolean

    readonly canQuickswitch?: boolean
    readonly bulletCount?: number
    readonly length: number
    readonly killstreak?: boolean

    readonly fists: {
        readonly left: Vector
        readonly right: Vector
        readonly animationDuration: number
    }

    readonly image: {
        readonly position: Vector
        readonly angle?: number
    }

    readonly particles?: {
        readonly position: Vector
    }

    readonly ballistics: {
        readonly damage: number
        readonly obstacleMultiplier: number
        readonly speed: number
        readonly maxDistance: number
        // fixme doesn't work right now
        readonly penetration?: {
            readonly players?: boolean
            readonly obstacles?: boolean
        }
        readonly tracerOpacity?: number
        readonly tracerWidth?: number
        readonly tracerLength?: number
    }
} & ({
    readonly fireMode: FireMode.Auto | FireMode.Single
} | {
    readonly fireMode: FireMode.Burst
    readonly burstProperties: {
        readonly shotsPerBurst: number
        readonly burstCooldown: number
        // note: the time between bursts is burstCooldown, and the time between shots within a burst is cooldown
    }
});

export const Guns: GunDefinition[] = [
    {
        idString: "ak47",
        name: "AK-47",
        itemType: ItemType.Gun,
        ammoType: "762mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        reloadTime: 2.5,
        fireDelay: 100,
        switchDelay: 500,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.75,
        recoilDuration: 150,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 4,
        length: 10,
        fists: {
            left: v(140, -5),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(120, 2) },
        particles: {
            position: v(4, 0.6)
        },
        ballistics: {
            damage: 14,
            obstacleMultiplier: 1.5,
            speed: 0.26,
            maxDistance: 160
        }
    },
    {
        idString: "m3k",
        name: "M3K",
        itemType: ItemType.Gun,
        ammoType: "12g",
        ammoSpawnAmount: 18,
        capacity: 9,
        reloadTime: 0.55,
        fireDelay: 700,
        switchDelay: 700,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.5,
        recoilDuration: 500,
        fireMode: FireMode.Single,
        shotSpread: 5,
        moveSpread: 2,
        canQuickswitch: true,
        bulletCount: 9,
        length: 10,
        fists: {
            left: v(130, -6),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(110, 1) },
        particles: {
            position: v(4, 0.6)
        },
        singleReload: true,
        ballistics: {
            damage: 9,
            obstacleMultiplier: 1,
            speed: 0.2,
            maxDistance: 80
        }
    },
    {
        idString: "m37",
        name: "Model 37",
        itemType: ItemType.Gun,
        ammoType: "12g",
        ammoSpawnAmount: 15,
        capacity: 5,
        reloadTime: 0.75,
        fireDelay: 925,
        switchDelay: 925,
        speedMultiplier: 0.93,
        recoilMultiplier: 0.5,
        recoilDuration: 550,
        fireMode: FireMode.Single,
        shotSpread: 11,
        moveSpread: 3,
        canQuickswitch: true,
        bulletCount: 10,
        length: 10,
        fists: {
            left: v(145, -6),
            right: v(60, 0),
            animationDuration: 100
        },
        image: { position: v(105, 0) },
        particles: {
            position: v(4, 0.6)
        },
        singleReload: true,
        ballistics: {
            damage: 10,
            obstacleMultiplier: 1,
            speed: 0.16,
            maxDistance: 48
        }
    },
    {
        idString: "hp18",
        name: "HP18",
        itemType: ItemType.Gun,
        ammoType: "12g",
        ammoSpawnAmount: 15,
        capacity: 5,
        reloadTime: 0.725,
        singleReload: true,
        fireDelay: 300,
        switchDelay: 400,
        speedMultiplier: 0.95,
        recoilMultiplier: 0.6,
        recoilDuration: 600,
        fireMode: FireMode.Single,
        bulletCount: 18,
        shotSpread: 30,
        moveSpread: 7,
        canQuickswitch: true,
        length: 11,
        fists: {
            left: v(150, -3),
            right: v(75, 0),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        particles: {
            position: v(4, 0.5)
        },
        ballistics: {
            damage: 5,
            obstacleMultiplier: 0.5,
            speed: 0.12,
            maxDistance: 40,
            tracerLength: 0.7
        }
    },
    {
        idString: "mosin",
        name: "Mosin-Nagant",
        itemType: ItemType.Gun,
        ammoType: "762mm",
        ammoSpawnAmount: 20,
        capacity: 5,
        reloadTime: 0.85,
        singleReload: true,
        fireDelay: 1750,
        switchDelay: 750,
        speedMultiplier: 0.9,
        recoilMultiplier: 0.45,
        recoilDuration: 750,
        fireMode: FireMode.Single,
        shotSpread: 0.8,
        moveSpread: 0.5,
        canQuickswitch: true,
        length: 11,
        fists: {
            left: v(145, -1),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(105, 4) },
        particles: {
            position: v(4, 0.6)
        },
        ballistics: {
            damage: 64,
            obstacleMultiplier: 1,
            speed: 0.33,
            maxDistance: 250,
            tracerWidth: 1.4,
            tracerLength: 2.5
        }
    },
    {
        idString: "tango_51",
        name: "Tango 51",
        itemType: ItemType.Gun,
        ammoType: "762mm",
        ammoSpawnAmount: 20,
        capacity: 5,
        reloadTime: 2.6,
        fireDelay: 1800,
        switchDelay: 750,
        speedMultiplier: 0.9,
        recoilMultiplier: 0.4,
        recoilDuration: 1000,
        fireMode: FireMode.Single,
        shotSpread: 0.3,
        moveSpread: 0.3,
        canQuickswitch: true,
        length: 13,
        fists: {
            left: v(145, -1),
            right: v(75, 0),
            animationDuration: 100
        },
        image: { position: v(125, 4) },
        particles: {
            position: v(4, 0.6)
        },
        ballistics: {
            damage: 75,
            obstacleMultiplier: 1,
            speed: 0.4,
            maxDistance: 280,
            tracerWidth: 1.6,
            tracerLength: 3.5
        }
    },
    {
        idString: "g19",
        name: "G19",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 60,
        fireDelay: 110,
        switchDelay: 250,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.8,
        recoilDuration: 90,
        fireMode: FireMode.Single,
        shotSpread: 7,
        moveSpread: 7,
        length: 6,
        fists: {
            left: v(70, 4),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(78, 0) },
        particles: {
            position: v(3, 0.5)
        },
        capacity: 15,
        reloadTime: 1.5,
        ballistics: {
            damage: 11.75,
            obstacleMultiplier: 1,
            speed: 0.14,
            maxDistance: 120
        }
    },
    {
        idString: "cz75a",
        name: "CZ-75A",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 64,
        fireDelay: 60,
        switchDelay: 250,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.8,
        recoilDuration: 90,
        fireMode: FireMode.Auto,
        shotSpread: 12,
        moveSpread: 7,
        length: 6,
        fists: {
            left: v(70, 4),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(58, 0) },
        particles: {
            position: v(3.5, 0.5)
        },
        capacity: 16,
        reloadTime: 1.9,
        ballistics: {
            damage: 9,
            obstacleMultiplier: 1,
            speed: 0.22,
            maxDistance: 85
        }
    },
    {
        idString: "saf_200",
        name: "SAF-200",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        reloadTime: 1.8,
        fireDelay: 50,
        switchDelay: 300,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.75,
        recoilDuration: 750,
        fireMode: FireMode.Burst,
        shotSpread: 3,
        moveSpread: 1,
        length: 9,
        fists: {
            left: v(130, -6),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(80, 0) },
        particles: {
            position: v(5, 0.5)
        },
        ballistics: {
            damage: 15.5,
            obstacleMultiplier: 1,
            speed: 0.25,
            maxDistance: 130
        },
        burstProperties: {
            shotsPerBurst: 3,
            burstCooldown: 300
        }
    },
    {
        idString: "m16a4",
        name: "M16A4",
        itemType: ItemType.Gun,
        ammoType: "556mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        reloadTime: 2.2,
        fireDelay: 60,
        switchDelay: 300,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.7,
        recoilDuration: 900,
        fireMode: FireMode.Burst,
        shotSpread: 1,
        moveSpread: 1.5,
        length: 9.5,
        fists: {
            left: v(120, -7),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        particles: {
            position: v(3.5, 0.5)
        },
        ballistics: {
            damage: 21,
            obstacleMultiplier: 1.5,
            speed: 0.3,
            maxDistance: 180
        },
        burstProperties: {
            shotsPerBurst: 3,
            burstCooldown: 400
        }
    },
    {
        idString: "aug",
        name: "AUG",
        itemType: ItemType.Gun,
        ammoType: "556mm",
        ammoSpawnAmount: 90,
        fireDelay: 70,
        switchDelay: 400,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.75,
        recoilDuration: 120,
        fireMode: FireMode.Auto,
        shotSpread: 4,
        moveSpread: 7,
        length: 9.5,
        fists: {
            left: v(157, -4),
            right: v(100, 0),
            animationDuration: 100
        },
        image: { position: v(103, -4) },
        particles: {
            position: v(4, 0.5)
        },
        capacity: 30,
        reloadTime: 2.25,
        ballistics: {
            damage: 11.25,
            obstacleMultiplier: 1.5,
            speed: 0.28,
            maxDistance: 160
        }
    },
    {
        idString: "micro_uzi",
        name: "Micro Uzi",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 96,
        capacity: 32,
        reloadTime: 1.75,
        fireDelay: 40,
        switchDelay: 300,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.75,
        recoilDuration: 60,
        fireMode: FireMode.Auto,
        shotSpread: 9,
        moveSpread: 10,
        length: 6,
        fists: {
            left: v(70, 4),
            right: v(65, 0),
            animationDuration: 100
        },
        particles: {
            position: v(3.5, 0.6)
        },
        image: { position: v(88, 0) },
        ballistics: {
            damage: 9,
            obstacleMultiplier: 1,
            speed: 0.16,
            maxDistance: 85
        }
    },
    {
        idString: "mp40",
        name: "MP40",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 96,
        capacity: 32,
        reloadTime: 2.1,
        fireDelay: 90,
        switchDelay: 300,
        speedMultiplier: 0.93,
        recoilMultiplier: 0.75,
        recoilDuration: 150,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 2,
        length: 8,
        fists: {
            left: v(140, -5),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        particles: {
            position: v(3.5, 0.5)
        },
        ballistics: {
            damage: 11,
            obstacleMultiplier: 1,
            speed: 0.25,
            maxDistance: 130
        }
    },
    {
        idString: "mcx_spear",
        name: "MCX Spear",
        itemType: ItemType.Gun,
        ammoType: "762mm",
        ammoSpawnAmount: 80,
        capacity: 20,
        reloadTime: 2.75,
        fireDelay: 87.5,
        switchDelay: 400,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.65,
        recoilDuration: 240,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 2,
        length: 9,
        fists: {
            left: v(130, -6),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(110, 0) },
        particles: {
            position: v(4, 0.5)
        },
        ballistics: {
            damage: 16,
            obstacleMultiplier: 1.5,
            speed: 0.3,
            maxDistance: 180,
            tracerLength: 1.4
        }
    },
    {
        idString: "lewis_gun",
        name: "Lewis Gun",
        itemType: ItemType.Gun,
        ammoType: "762mm",
        ammoSpawnAmount: 94,
        capacity: 47,
        reloadTime: 3.4,
        fireDelay: 120,
        switchDelay: 400,
        speedMultiplier: 0.8,
        recoilMultiplier: 0.65,
        recoilDuration: 240,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 4,
        length: 14,
        fists: {
            left: v(130, -6),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(128, 0) },
        particles: {
            position: v(4.5, 1)
        },
        ballistics: {
            damage: 16,
            obstacleMultiplier: 2.5,
            speed: 0.3,
            maxDistance: 180,
            tracerWidth: 1.1,
            tracerLength: 1.4
        }
    },
    {
        idString: "vss",
        name: "VSS",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 60,
        capacity: 20,
        reloadTime: 2.15,
        fireDelay: 140,
        switchDelay: 400,
        speedMultiplier: 0.92,
        recoilMultiplier: 0.7,
        recoilDuration: 500,
        fireMode: FireMode.Single,
        shotSpread: 2,
        moveSpread: 1.5,
        length: 10,
        fists: {
            left: v(130, -6),
            right: v(65, 0),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        particles: {
            position: v(5, 0.5)
        },
        ballistics: {
            damage: 24,
            obstacleMultiplier: 1.5,
            speed: 0.22,
            maxDistance: 160,
            tracerLength: 1.3,
            tracerOpacity: 0.5
        }
    },
    {
        idString: "deathray",
        name: "Death Ray",
        itemType: ItemType.Gun,
        ammoType: "power_cell",
        ammoSpawnAmount: 0,
        capacity: 1,
        reloadTime: 1.4,
        fireDelay: 40,
        switchDelay: 500,
        speedMultiplier: 0.96,
        recoilMultiplier: 0.8,
        recoilDuration: 100,
        fireMode: FireMode.Auto,
        shotSpread: 0.15,
        moveSpread: 0.1,
        canQuickswitch: true,
        killstreak: true,
        bulletCount: 1,
        length: 10,
        fists: {
            left: v(135, -6),
            right: v(75, 0),
            animationDuration: 100
        },
        image: { position: v(90, 0) },
        ballistics: {
            damage: 800,
            obstacleMultiplier: 2,
            speed: 0.5,
            maxDistance: 400,
            penetration: {
                players: true,
                obstacles: true
            }
        }
    },
    {
        idString: "revitalizer",
        name: "Revitalizer",
        itemType: ItemType.Gun,
        ammoType: "12g",
        ammoSpawnAmount: 15,
        capacity: 5,
        reloadTime: 0.75,
        fireDelay: 925,
        switchDelay: 925,
        speedMultiplier: 0.93,
        recoilMultiplier: 0.5,
        recoilDuration: 550,
        fireMode: FireMode.Single,
        shotSpread: 11,
        moveSpread: 3,
        canQuickswitch: true,
        killstreak: true,
        consistentPatterning: true,
        bulletCount: 10,
        length: 10,
        fists: {
            left: v(155, -6),
            right: v(75, 0),
            animationDuration: 100
        },
        image: { position: v(90, 0) },
        particles: {
            position: v(4, 0.6)
        },
        singleReload: true,
        ballistics: {
            damage: 10,
            obstacleMultiplier: 1,
            speed: 0.16,
            maxDistance: 48
        },
        wearerAttributes: {
            passive: {
                maxHealth: 0.51,
                maxAdrenaline: 0.8
            },
            on: {
                kill: {
                    limit: 5,
                    maxHealth: 1.488,
                    maxAdrenaline: 1.201,
                    minAdrenaline: 8,
                    healthRestored: 230,
                    adrenalineRestored: 30,
                    speedBoost: 1.02
                },
                damageDealt: {
                    healthRestored: 1,
                    adrenalineRestored: 1
                }
            }
        }
    }
];
