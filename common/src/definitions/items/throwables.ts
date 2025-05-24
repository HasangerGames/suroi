import { DefinitionType, ItemType, type InventoryItemDefinition, type ReferenceTo } from "../../utils/objectDefinitions";
import { Vec, type Vector } from "../../utils/vector";
import { DecalDefinition } from "../decals";
import { type ExplosionDefinition } from "../explosions";
import { SyncedParticleDefinition } from "../syncedParticles";
import { Tier } from "./guns";
import { InventoryItemDefinitions } from "./items";

export type ThrowableDefinition = InventoryItemDefinition & {
    readonly defType: DefinitionType.Throwable
    readonly itemType: ItemType.Throwable
    readonly tier: Tier
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

    readonly fireDelay: number

    readonly health?: number
    readonly noSkin?: boolean
    readonly cookSpeedMultiplier: number

    readonly physics: {
        readonly maxThrowDistance: number
        readonly initialZVelocity: number
        readonly initialAngularVelocity: number
        readonly initialHeight: number
        readonly noSpin?: boolean
        readonly drag?: {
            readonly air: number
            readonly ground: number
            readonly water: number
        }
    }

    readonly image: {
        readonly position: Vector
        readonly angle?: number
        // no relation to the ZIndexes enum
        readonly zIndex: number
        readonly anchor?: Vector
    }
    readonly hitboxRadius: number
    readonly impactDamage?: number
    /**
     * Applies to impact damage and not explosion damage
     */
    readonly obstacleMultiplier?: number

    readonly detonation: {
        readonly explosion?: ReferenceTo<ExplosionDefinition>
        readonly particles?: ReferenceTo<SyncedParticleDefinition>
        readonly spookyParticles?: ReferenceTo<SyncedParticleDefinition>
        readonly decal?: ReferenceTo<DecalDefinition>
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
    readonly summonAirdrop?: boolean

    readonly flicker?: {
        readonly image: string
        readonly offset: Vector
    }

    readonly activeSound?: string
};

export const Throwables = new InventoryItemDefinitions<ThrowableDefinition>([
    {
        idString: "frag_grenade",
        name: "Frag Grenade",
        defType: DefinitionType.Throwable,
        itemType: ItemType.Throwable,
        tier: Tier.C,
        cookable: true,
        fuseTime: 4000,
        cookTime: 150,
        throwTime: 150,
        speedMultiplier: 1,
        cookSpeedMultiplier: 0.7,
        impactDamage: 1,
        obstacleMultiplier: 20,
        hitboxRadius: 1,
        fireDelay: 250,
        physics: {
            maxThrowDistance: 128,
            initialZVelocity: 4,
            initialAngularVelocity: 10,
            initialHeight: 0.5
        },
        image: {
            position: Vec.create(60, 43),
            angle: 60,
            zIndex: 5,
            anchor: Vec.create(0.5, 0.68)
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
        defType: DefinitionType.Throwable,
        itemType: ItemType.Throwable,
        tier: Tier.D,
        cookable: false,
        fuseTime: 2000,
        cookTime: 150,
        throwTime: 150,
        speedMultiplier: 1,
        cookSpeedMultiplier: 0.7,
        impactDamage: 1,
        obstacleMultiplier: 20,
        hitboxRadius: 1,
        fireDelay: 250,
        physics: {
            maxThrowDistance: 128,
            initialZVelocity: 4,
            initialAngularVelocity: 10,
            initialHeight: 0.5
        },
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
        defType: DefinitionType.Throwable,
        itemType: ItemType.Throwable,
        tier: Tier.S,
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
        fireDelay: 250,
        physics: {
            maxThrowDistance: 128,
            initialZVelocity: 4,
            initialAngularVelocity: 10,
            initialHeight: 0.5
        },
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
        defType: DefinitionType.Throwable,
        itemType: ItemType.Throwable,
        tier: Tier.S,
        c4: true,
        cookable: false,
        fuseTime: 750,
        cookTime: 250,
        throwTime: 150,
        cookSpeedMultiplier: 0.7,
        health: 40,
        speedMultiplier: 1,
        hitboxRadius: 1,
        fireDelay: 250,
        physics: {
            maxThrowDistance: 128,
            initialZVelocity: 4,
            initialAngularVelocity: 10,
            initialHeight: 0.5,
            drag: {
                air: 0.7,
                ground: 6,
                water: 8
            }
        },
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
        idString: "flare",
        name: "Flare",
        defType: DefinitionType.Throwable,
        itemType: ItemType.Throwable,
        tier: Tier.S,
        cookable: false,
        summonAirdrop: true,
        fuseTime: 30000,
        cookTime: 250,
        throwTime: 150,
        cookSpeedMultiplier: 0.7,
        health: 40,
        speedMultiplier: 1,
        hitboxRadius: 1,
        fireDelay: 1000,
        physics: {
            maxThrowDistance: 128,
            initialZVelocity: 4,
            initialAngularVelocity: 10,
            initialHeight: 0.5,
            drag: {
                air: 0.7,
                ground: 6,
                water: 8
            }
        },
        detonation: {
            decal: "used_flare_decal"
        },
        image: {
            position: Vec.create(60, 43),
            angle: 60,
            zIndex: 5
        },
        animation: {
            liveImage: "proj_flare",
            pinImage: "proj_flare_pin",
            cook: {
                leftFist: Vec.create(2.5, 0),
                rightFist: Vec.create(-0.5, 2.15)
            },
            throw: {
                leftFist: Vec.create(1.9, -1.75),
                rightFist: Vec.create(4, 2.15)
            }
        },
        flicker: {
            image: "proj_flare_flicker",
            offset: Vec.create(0, -1.5)
        },
        activeSound: "flare"
    },
    {
        idString: "proj_seed",
        name: "Seed",
        defType: DefinitionType.Throwable,
        itemType: ItemType.Throwable,
        tier: Tier.S,
        cookable: true,
        fuseTime: 1500,
        cookTime: 0,
        throwTime: 0,
        devItem: true,
        noSwap: true,
        speedMultiplier: 1,
        cookSpeedMultiplier: 0.7,
        impactDamage: 1,
        killfeedFrame: "seedshot",
        obstacleMultiplier: 20,
        hitboxRadius: 1,
        fireDelay: 250,
        physics: {
            maxThrowDistance: 128,
            initialZVelocity: 4,
            initialAngularVelocity: 0,
            initialHeight: 0.5,
            noSpin: true,
            drag: {
                air: Infinity,
                ground: Infinity,
                water: Infinity
            }
        },
        image: {
            position: Vec.create(60, 43),
            angle: 60,
            zIndex: 5,
            anchor: Vec.create(0.5, 0.68)
        },
        detonation: {
            explosion: "seed_explosion"
        },
        animation: {
            liveImage: "proj_seed",
            cook: {
                leftFist: Vec.create(2.5, 0),
                rightFist: Vec.create(-0.5, 2.15)
            },
            throw: {
                leftFist: Vec.create(1.9, -1.75),
                rightFist: Vec.create(4, 2.15)
            }
        }
    }
]);
