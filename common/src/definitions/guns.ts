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

    readonly canQuickswitch?: boolean
    readonly bulletCount?: number
    readonly length: number

    readonly fists: {
        readonly left: Vector
        readonly right: Vector
        readonly animationDuration: number
    }

    readonly image: {
        readonly position: Vector
        readonly angle?: number
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
        readonly tracerOpacity?: {
            readonly start?: number
            readonly end?: number
        }
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
        moveSpread: 2,
        length: 10,
        fists: {
            left: v(65, 0),
            right: v(140, -5),
            animationDuration: 100
        },
        image: { position: v(120, 2) },
        ballistics: {
            damage: 13.5,
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
        speedMultiplier: 0.93,
        recoilMultiplier: 0.5,
        recoilDuration: 500,
        fireMode: FireMode.Single,
        shotSpread: 5,
        moveSpread: 2,
        canQuickswitch: true,
        bulletCount: 9,
        length: 10,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(100, 3) },
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
        shotSpread: 12,
        moveSpread: 3,
        canQuickswitch: true,
        bulletCount: 10,
        length: 10,
        fists: {
            left: v(70, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(90, 0) },
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
        bulletCount: 20,
        shotSpread: 15,
        moveSpread: 7,
        canQuickswitch: true,
        length: 11,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(115, 3) },
        ballistics: {
            damage: 5,
            obstacleMultiplier: 1,
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
            left: v(75, 0),
            right: v(145, -1),
            animationDuration: 100
        },
        image: { position: v(105, 4) },
        ballistics: {
            damage: 68,
            obstacleMultiplier: 1.5,
            speed: 0.33,
            maxDistance: 180,
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
        reloadTime: 3,
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
            left: v(75, 0),
            right: v(145, -1),
            animationDuration: 100
        },
        image: { position: v(125, 4) },
        ballistics: {
            damage: 80,
            obstacleMultiplier: 1.5,
            speed: 0.35,
            maxDistance: 250,
            tracerWidth: 1.6,
            tracerLength: 3.5
        }
    },
    {
        idString: "g19",
        name: "G19",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 68,
        fireDelay: 60,
        switchDelay: 250,
        speedMultiplier: 0.95,
        recoilMultiplier: 0.8,
        recoilDuration: 90,
        fireMode: FireMode.Auto,
        shotSpread: 10,
        moveSpread: 5,
        length: 6,
        fists: {
            left: v(65, 0),
            right: v(70, 4),
            animationDuration: 100
        },
        image: { position: v(78, 0) },
        capacity: 17,
        reloadTime: 2,
        ballistics: {
            damage: 6.5,
            obstacleMultiplier: 1.1,
            speed: 0.14,
            maxDistance: 80
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
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(80, 0) },
        ballistics: {
            damage: 16,
            obstacleMultiplier: 1.2,
            speed: 0.25,
            maxDistance: 150
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
        shotSpread: 0.5,
        moveSpread: 1,
        length: 9.5,
        fists: {
            left: v(65, 0),
            right: v(120, -7),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        ballistics: {
            damage: 22,
            obstacleMultiplier: 1.4,
            speed: 0.3,
            maxDistance: 180
        },
        burstProperties: {
            shotsPerBurst: 3,
            burstCooldown: 400
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
        speedMultiplier: 0.98,
        recoilMultiplier: 0.75,
        recoilDuration: 60,
        fireMode: FireMode.Auto,
        shotSpread: 8,
        moveSpread: 4,
        length: 6,
        fists: {
            left: v(65, 0),
            right: v(70, 4),
            animationDuration: 100
        },
        image: { position: v(88, 0) },
        ballistics: {
            damage: 9,
            obstacleMultiplier: 1.3,
            speed: 0.16,
            maxDistance: 86
        }
    },
    {
        idString: "mp40",
        name: "MP40",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        reloadTime: 2.1,
        fireDelay: 90,
        switchDelay: 300,
        speedMultiplier: 0.93,
        recoilMultiplier: 0.9,
        recoilDuration: 150,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 2,
        length: 8,
        fists: {
            left: v(65, 0),
            right: v(140, -5),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        ballistics: {
            damage: 12,
            obstacleMultiplier: 1.25,
            speed: 0.25,
            maxDistance: 120
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
        speedMultiplier: 0.9,
        recoilMultiplier: 0.65,
        recoilDuration: 240,
        fireMode: FireMode.Auto,
        shotSpread: 1.5,
        moveSpread: 2,
        length: 9,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(110, 0) },
        ballistics: {
            damage: 15,
            obstacleMultiplier: 1.6,
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
        reloadTime: 4,
        fireDelay: 120,
        switchDelay: 400,
        speedMultiplier: 0.8,
        recoilMultiplier: 0.65,
        recoilDuration: 240,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        moveSpread: 2,
        length: 14,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(128, 0) },
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
        fireDelay: 175,
        switchDelay: 400,
        speedMultiplier: 0.95,
        recoilMultiplier: 0.7,
        recoilDuration: 500,
        fireMode: FireMode.Single,
        shotSpread: 1,
        moveSpread: 1,
        length: 10,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        ballistics: {
            damage: 23,
            obstacleMultiplier: 1.3,
            speed: 0.3,
            maxDistance: 180,
            tracerLength: 1.3,
            tracerOpacity: {
                start: 0.5,
                end: 0.2
            }
        }
    },
    {
        idString: "deathray",
        name: "Death Ray",
        itemType: ItemType.Gun,
        ammoType: "power_cell",
        noDrop: true,
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
        bulletCount: 1,
        length: 11,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        ballistics: {
            damage: 300,
            obstacleMultiplier: 2,
            speed: 0.5,
            maxDistance: 400,
            penetration: {
                players: true,
                obstacles: true
            },
            tracerOpacity: {
                start: 1,
                end: 0.5
            },
            tracerLength: 2
        }
    }
];
