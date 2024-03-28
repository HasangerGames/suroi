import { ItemType, ObjectDefinitions, type InventoryItemDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";
import { type ExplosionDefinition } from "./explosions";
import { type SyncedParticleSpawnerDefinition } from "./syncedParticles";

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
    readonly cookSpeedMultiplier: number
    readonly maxThrowDistance: number
    readonly image: {
        readonly position: Vector
        readonly angle?: number
    }
    readonly speedCap: number
    readonly hitboxRadius: number
    readonly fireDelay: number
    readonly detonation: {
        readonly explosion?: ReferenceTo<ExplosionDefinition>
        readonly particles?: SyncedParticleSpawnerDefinition
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

export const Throwables = ObjectDefinitions.create<ThrowableDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            itemType: ItemType.Throwable,
            speedMultiplier: 0.92,
            cookable: false,
            noDrop: false,
            cookSpeedMultiplier: 0.7,
            hitboxRadius: 1,
            impactDamage: 0,
            maxThrowDistance: 96,
            fireDelay: 250,
            speedCap: Infinity
        })
    })
)(
    () => [
        {
            idString: "frag_grenade",
            name: "Frag Grenade",
            fuseTime: 4000,
            cookTime: 150,
            throwTime: 150,
            impactDamage: 1,
            obstacleMultiplier: 20,
            cookable: true,
            image: {
                position: Vec.create(60, 43),
                angle: 60
            },
            speedCap: 0.15,
            detonation: {
                explosion: "frag_grenade_explosion"
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
            fuseTime: 2000,
            cookTime: 150,
            throwTime: 150,
            impactDamage: 1,
            obstacleMultiplier: 20,
            image: {
                position: Vec.create(60, 43),
                angle: 60
            },
            speedCap: 0.15,
            detonation: {
                explosion: "smoke_grenade_explosion",
                particles: {
                    type: "smoke_grenade_particle",
                    count: 10,
                    deployAnimation: {
                        duration: 4000,
                        staggering: {
                            delay: 300,
                            initialAmount: 2
                        }
                    },
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
    ]
);
