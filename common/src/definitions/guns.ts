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

    readonly cooldown: number
    readonly switchCooldown: number

    readonly recoilMultiplier: number
    readonly recoilDuration: number
    readonly shotSpread: number

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
        readonly speedVariance: number
        readonly maxDistance: number
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
        cooldown: 100,
        switchCooldown: 500,
        recoilMultiplier: 0.75,
        recoilDuration: 150,
        fireMode: FireMode.Auto,
        shotSpread: 5,
        length: 10,
        fists: {
            left: v(65, 0),
            right: v(140, -5),
            animationDuration: 100
        },
        image: { position: v(120, 2) },
        ballistics: {
            damage: 10,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 125
        }
    },
    {
        idString: "m3k",
        name: "M3K",
        itemType: ItemType.Gun,
        ammoType: "12g",
        ammoSpawnAmount: 18,
        capacity: 9,
        reloadTime: 0.8,
        cooldown: 750,
        switchCooldown: 500,
        recoilMultiplier: 0.5,
        recoilDuration: 500,
        fireMode: FireMode.Single,
        shotSpread: 7,
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
            damage: 6.5,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 80
        }
    },
    {
        idString: "m37",
        name: "Model 37",
        itemType: ItemType.Gun,
        ammoType: "12g",
        ammoSpawnAmount: 10,
        capacity: 5,
        reloadTime: 1,
        cooldown: 1000,
        switchCooldown: 500,
        recoilMultiplier: 0.5,
        recoilDuration: 550,
        fireMode: FireMode.Single,
        shotSpread: 14,
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
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 64
        }
    },
    {
        idString: "940_pro",
        name: "940 Pro",
        itemType: ItemType.Gun,
        ammoType: "12g",
        ammoSpawnAmount: 20,
        capacity: 5,
        reloadTime: 0.85,
        singleReload: true,
        cooldown: 300,
        switchCooldown: 400,
        recoilMultiplier: 0.6,
        recoilDuration: 600,
        fireMode: FireMode.Single,
        bulletCount: 20,
        shotSpread: 30,
        length: 12,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(115, 3) },
        ballistics: {
            damage: 3,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 48
        }
    },
    {
        idString: "mosin",
        name: "Mosin-Nagant",
        itemType: ItemType.Gun,
        ammoType: "762mm",
        ammoSpawnAmount: 20,
        capacity: 5,
        reloadTime: 1,
        singleReload: true,
        cooldown: 1750,
        switchCooldown: 750,
        recoilMultiplier: 0.45,
        recoilDuration: 750,
        canQuickswitch: true,
        fireMode: FireMode.Single,
        shotSpread: 1,
        length: 11,
        fists: {
            left: v(75, 0),
            right: v(145, -1),
            animationDuration: 100
        },
        image: { position: v(105, 4) },
        ballistics: {
            damage: 60,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 128
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
        cooldown: 1800,
        switchCooldown: 750,
        recoilMultiplier: 0.4,
        recoilDuration: 1000,
        canQuickswitch: true,
        fireMode: FireMode.Single,
        shotSpread: 0.5,
        length: 13,
        fists: {
            left: v(75, 0),
            right: v(145, -1),
            animationDuration: 100
        },
        image: { position: v(125, 4) },
        ballistics: {
            damage: 80,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 150
        }
    },
    {
        idString: "g19",
        name: "G19",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 68,
        cooldown: 60,
        switchCooldown: 250,
        recoilMultiplier: 0.8,
        recoilDuration: 90,
        fireMode: FireMode.Auto,
        shotSpread: 20,
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
            damage: 5.5,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 60
        }
    },
    {
        idString: "saf_200",
        name: "SAF-200",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        reloadTime: 2,
        cooldown: 65,
        switchCooldown: 300,
        recoilMultiplier: 0.75,
        recoilDuration: 750,
        fireMode: FireMode.Burst,
        shotSpread: 8,
        length: 9,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        ballistics: {
            damage: 12,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 80
        },
        burstProperties: {
            shotsPerBurst: 3,
            burstCooldown: 500
        }
    },
    {
        idString: "m16a4",
        name: "M16A4",
        itemType: ItemType.Gun,
        ammoType: "556mm",
        ammoSpawnAmount: 90,
        capacity: 30,
        reloadTime: 2.5,
        cooldown: 90,
        switchCooldown: 300,
        recoilMultiplier: 0.7,
        recoilDuration: 900,
        fireMode: FireMode.Burst,
        shotSpread: 2,
        length: 9.5,
        fists: {
            left: v(65, 0),
            right: v(120, -7),
            animationDuration: 100
        },
        image: { position: v(110, 0) },
        ballistics: {
            damage: 18,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 96
        },
        burstProperties: {
            shotsPerBurst: 3,
            burstCooldown: 600
        }
    },
    {
        idString: "micro_uzi",
        name: "Micro Uzi",
        itemType: ItemType.Gun,
        ammoType: "9mm",
        ammoSpawnAmount: 96,
        capacity: 32,
        reloadTime: 2,
        cooldown: 50,
        switchCooldown: 300,
        recoilMultiplier: 0.75,
        recoilDuration: 60,
        fireMode: FireMode.Auto,
        shotSpread: 9,
        length: 6,
        fists: {
            left: v(65, 0),
            right: v(70, 4),
            animationDuration: 100
        },
        image: { position: v(88, 0) },
        ballistics: {
            damage: 4,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 64
        }
    },
    {
        idString: "mcx_spear",
        name: "MCX Spear",
        itemType: ItemType.Gun,
        ammoType: "762mm",
        ammoSpawnAmount: 60,
        capacity: 20,
        reloadTime: 2.5,
        cooldown: 120,
        switchCooldown: 400,
        recoilMultiplier: 0.65,
        recoilDuration: 240,
        fireMode: FireMode.Auto,
        shotSpread: 2,
        length: 10,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(110, 0) },
        ballistics: {
            damage: 10,
            obstacleMultiplier: 2,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 128
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
        cooldown: 120,
        switchCooldown: 400,
        recoilMultiplier: 0.65,
        recoilDuration: 240,
        fireMode: FireMode.Auto,
        shotSpread: 3,
        length: 14,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(128, 0) },
        ballistics: {
            damage: 10,
            obstacleMultiplier: 3,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 128
        }
    },
    {
        idString: "deathray",
        name: "Death Ray",
        itemType: ItemType.Gun,
        ammoType: "762mm",
        ammoSpawnAmount: 0,
        capacity: Infinity,
        infiniteAmmo: true,
        reloadTime: 0.1,
        cooldown: 60,
        switchCooldown: 0,
        recoilMultiplier: 1,
        recoilDuration: 0,
        fireMode: FireMode.Auto,
        shotSpread: 20,
        bulletCount: 10,
        length: 11,
        fists: {
            left: v(65, 0),
            right: v(130, -6),
            animationDuration: 100
        },
        image: { position: v(100, 0) },
        ballistics: {
            damage: 10,
            obstacleMultiplier: 1,
            speed: 0.35,
            speedVariance: 0,
            maxDistance: 128
        }
    }
];
