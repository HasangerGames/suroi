import { ItemType, type InventoryItemDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";
import { type ExplosionDefinition } from "./explosions";

export interface ThrowableDefinition extends InventoryItemDefinition {
    readonly itemType: ItemType.Throwable
    /**
     * Specified in *milliseconds*
     */
    readonly fuseTime: number
    /**
     * Whether cooking the grenade will run down the fuse
     */
    readonly cookable: boolean
    readonly maxThrowDistance: number
    readonly image: {
        readonly position: Vector
        readonly angle?: number
    }
    readonly fireDelay?: number
    readonly detonation: {
        readonly explosion?: ReferenceTo<ExplosionDefinition>
    }
    readonly animation: {
        readonly cook: {
            readonly leftImage: string
            readonly liveImage: string
            readonly leftFist: Vector
            readonly rightFist: Vector
        }
    }
}

export const Throwables: ThrowableDefinition[] = [
    {
        idString: "frag_grenade",
        name: "Frag Grenade",
        itemType: ItemType.Throwable,
        speedMultiplier: 0.92,
        fuseTime: 4000,
        cookable: true,
        maxThrowDistance: 96,
        image: {
            position: Vec.create(60, 43),
            angle: 60
        },
        detonation: {
            explosion: "barrel_explosion"
        },
        animation: {
            cook: {
                leftImage: "proj_frag_pin",
                liveImage: "proj_frag",
                leftFist: Vec.create(38, -35),
                rightFist: Vec.create(-10, 43)
            }
        }
    },
    {
        idString: "smoke_grenade",
        name: "Smoke Grenade",
        itemType: ItemType.Throwable,
        speedMultiplier: 0.92,
        cookable: false,
        fuseTime: 2000,
        maxThrowDistance: 96,
        image: {
            position: Vec.create(60, 43),
            angle: 60
        },
        detonation: {
            explosion: "barrel_explosion"
        },
        animation: {
            cook: {
                leftImage: "proj_smoke_pin",
                liveImage: "proj_smoke",
                leftFist: Vec.create(38, -35),
                rightFist: Vec.create(-10, 43)
            }
        }
    }
];
