import { ItemType, type InventoryItemDefinition, type ReferenceTo } from "../../utils/objectDefinitions";
import { Vec, type Vector } from "../../utils/vector";
import { type ExplosionDefinition } from "../explosions";
import { SyncedParticleDefinition } from "../syncedParticles";
import { InventoryItemDefinitions } from "./items";

export type ThrowableDefinition = InventoryItemDefinition & {
    readonly itemType: ItemType.Throwable
    /**
     * Specified in *milliseconds*
     */
    readonly fuseTime: number
    /**
     * Note: setting this higher than `fuseTime` guarantees that the grenade detonates in the user's hands,
     * except if they drop it at their feet and run away
     */
    readonly cookTime: number
    /**
     * Only used client-side, dictates the duration of the throwing animation
     */
    readonly throwTime: number
    /**
     * Whether cooking the grenade will run down the fuse
     */
    readonly cookable: boolean
    readonly health?: number
    readonly noSkin?: boolean
    readonly cookSpeedMultiplier: number
    /**
     * @default 128
     */
    readonly maxThrowDistance?: number
    readonly image: {
        readonly position: Vector
        readonly angle?: number
        // no relation to the ZIndexes enum
        readonly zIndex: number
    }
    readonly speedCap?: number
    readonly hitboxRadius: number
    readonly impactDamage?: number
    /**
     * Applies to impact damage and not explosion damage
     */
    readonly obstacleMultiplier?: number
    /**
     * @default 250
     */
    readonly fireDelay?: number
    readonly detonation: {
        readonly explosion?: ReferenceTo<ExplosionDefinition>
        readonly particles?: ReferenceTo<SyncedParticleDefinition>
        readonly spookyParticles?: ReferenceTo<SyncedParticleDefinition>
    }
    readonly animation: {
        readonly pinImage?: string
        readonly liveImage: string
        readonly leverImage?: string
        readonly activatedImage?: string
        readonly cook: {
            readonly cookingImage?: string
            readonly leftFist: Vector
            readonly rightFist: Vector
        }
        readonly throw: {
            readonly leftFist: Vector
            readonly rightFist: Vector
        }
    }
    readonly c4?: boolean
};

export const Throwables = new InventoryItemDefinitions<ThrowableDefinition>([
    {
        idString: "frag_grenade",
        name: "Frag Grenade",
        itemType: ItemType.Throwable,
        cookable: true,
        fuseTime: 4000,
        cookTime: 150,
        throwTime: 150,
        speedMultiplier: 1,
        cookSpeedMultiplier: 0.7,
        impactDamage: 1,
        obstacleMultiplier: 20,
        hitboxRadius: 1,
        image: {
            position: Vec.create(60, 43),
            angle: 60,
            zIndex: 5
        },
        detonation: {
            explosion: "frag_grenade_explosion"
        },
        animation: {
            pinImage: "proj_frag_pin",
            liveImage: "proj_frag",
            leverImage: "proj_frag_lever",
            cook: {
                cookingImage: "proj_frag_nopin",
                leftFist: Vec.create(2.5, 0),
                rightFist: Vec.create(-0.5, 2.15)
            },
            throw: {
                leftFist: Vec.create(1.9, -1.75),
                rightFist: Vec.create(4, 2.15)
            }
        }
    },
    {
        idString: "smoke_grenade",
        name: "Smoke Grenade",
        itemType: ItemType.Throwable,
        cookable: false,
        fuseTime: 2000,
        cookTime: 150,
        throwTime: 150,
        speedMultiplier: 1,
        cookSpeedMultiplier: 0.7,
        impactDamage: 1,
        obstacleMultiplier: 20,
        hitboxRadius: 1,
        image: {
            position: Vec.create(60, 43),
            angle: 60,
            zIndex: 5
        },
        detonation: {
            explosion: "smoke_grenade_explosion",
            spookyParticles: "plumpkin_smoke_grenade_particle",
            particles: "smoke_grenade_particle"
        },
        animation: {
            pinImage: "proj_smoke_pin",
            liveImage: "proj_smoke",
            leverImage: "proj_smoke_lever",
            cook: {
                cookingImage: "proj_smoke_nopin",
                leftFist: Vec.create(2.5, 0),
                rightFist: Vec.create(-0.5, 2.15)
            },
            throw: {
                leftFist: Vec.create(1.9, -1.75),
                rightFist: Vec.create(4, 2.15)
            }
        }
    },
    {
        idString: "confetti_grenade",
        name: "Confetti Grenade",
        itemType: ItemType.Throwable,
        fuseTime: 4000,
        cookTime: 150,
        noSkin: true,
        throwTime: 150,
        speedMultiplier: 1,
        cookSpeedMultiplier: 0.7,
        impactDamage: 1,
        obstacleMultiplier: 20,
        hitboxRadius: 1,
        cookable: true,
        image: {
            position: Vec.create(60, 43),
            angle: 60,
            zIndex: 5
        },
        detonation: {
            explosion: "confetti_grenade_explosion"
        },
        animation: {
            pinImage: "proj_frag_pin",
            liveImage: "proj_confetti",
            leverImage: "proj_frag_lever",
            cook: {
                cookingImage: "proj_confetti_nopin",
                leftFist: Vec.create(2.5, 0),
                rightFist: Vec.create(-0.5, 2.15)
            },
            throw: {
                leftFist: Vec.create(1.9, -1.75),
                rightFist: Vec.create(4, 2.15)
            }
        }
    },
    {
        idString: "c4",
        name: "C4",
        itemType: ItemType.Throwable,
        c4: true,
        cookable: false,
        fuseTime: 0,
        cookTime: 0,
        throwTime: 0,
        cookSpeedMultiplier: 0,
        health: 40,
        speedMultiplier: 1,
        hitboxRadius: 1,
        image: {
            position: Vec.create(60, 43),
            angle: 60,
            zIndex: 5
        },
        detonation: {
            explosion: "c4_explosion"
        },
        animation: {
            liveImage: "proj_c4",
            activatedImage: "proj_c4_activated",
            cook: {
                leftFist: Vec.create(2, -1),
                rightFist: Vec.create(3, 0)
            },
            throw: {
                leftFist: Vec.create(1.9, -1.75),
                rightFist: Vec.create(4, 2.15)
            }
        }
    },
     {
        idString: "satchel",
        name: "Satchel Charge",
        itemType: ItemType.Throwable,
        cookable: false,
        fuseTime: 8500,
        cookTime: 150,
        throwTime: 150,
        speedMultiplier: 1,
        cookSpeedMultiplier: 0.7,
        impactDamage: 1,
        obstacleMultiplier: 20,
        hitboxRadius: 1,
        image: {
            position: Vec.create(60, 43),
            angle: 60,
            zIndex: 5
        },
        detonation: {
            explosion: "super_barrel_explosion"
        },
        animation: {
            liveImage: "proj_satchel",
            cook: {
                cookingImage: "proj_frag_nopin",
                leftFist: Vec.create(2.5, 0),
                rightFist: Vec.create(-0.5, 2.15)
            },
            throw: {
                leftFist: Vec.create(1.9, -1.75),
                rightFist: Vec.create(4, 2.15)
            }
        }
    },
]);
