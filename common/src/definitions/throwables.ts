import { ItemType, type InventoryItemDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";
import { type ExplosionDefinition } from "./explosions";
import { type SyncedParticleDefinition } from "./syncedParticles";

export type ThrowableDefinition = InventoryItemDefinition & {
    readonly itemType: ItemType.Throwable
    /**
     * Specified in *milliseconds*
     */
    readonly fuseTime: number
    readonly cookTime: number
    readonly throwTime: number
    /**
     * Whether cooking the grenade will run down the fuse
     */
    readonly cookable: boolean
    readonly cookSpeedMultiplier: number
    readonly maxThrowDistance: number
    readonly image: {
        readonly position: Vector
        readonly angle?: number
    }
    readonly radius: number
    readonly fireDelay?: number
    readonly detonation: {
        readonly explosion?: ReferenceTo<ExplosionDefinition>
        readonly particles?: {
            readonly type: ReferenceTo<SyncedParticleDefinition>
            readonly count: number
            readonly spawnInterval?: number
            readonly spawnRadius: number
        }
    }
    readonly animation: {
        readonly pinImage: string
        readonly liveImage: string
        readonly leverImage: string
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
} & ({
    readonly impactDamage: number
    /**
     * Applies to impact damage and not explosion damage
     */
    readonly obstacleMultiplier?: number
} | {
    readonly impactDamage?: undefined
});

export const Throwables: ThrowableDefinition[] = [
    {
        idString: "frag_grenade",
        name: "Frag Grenade",
        itemType: ItemType.Throwable,
        speedMultiplier: 0.92,
        cookSpeedMultiplier: 0.7,
        radius: 1,
        impactDamage: 1,
        obstacleMultiplier: 20,
        fuseTime: 4000,
        cookTime: 250,
        throwTime: 150,
        cookable: true,
        maxThrowDistance: 96,
        fireDelay: 500,
        image: {
            position: Vec.create(60, 43),
            angle: 60
        },
        detonation: {
            explosion: "frag_explosion"
        },
        animation: {
            pinImage: "proj_frag_pin",
            liveImage: "proj_frag",
            leverImage: "proj_frag_lever",
            cook: {
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
        speedMultiplier: 0.92,
        cookSpeedMultiplier: 0.7,
        radius: 1,
        impactDamage: 1,
        obstacleMultiplier: 20,
        cookable: false,
        fuseTime: 2000,
        cookTime: 250,
        throwTime: 150,
        maxThrowDistance: 96,
        image: {
            position: Vec.create(60, 43),
            angle: 60
        },
        detonation: {
            explosion: "smoke_explosion",
            particles: {
                type: "smoke_grenade_particle",
                count: 10,
                spawnInterval: 2000,
                spawnRadius: 15
            }
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
    }
];
