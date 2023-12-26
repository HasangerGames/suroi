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
    readonly cookSpeedMultiplier: number
    readonly maxThrowDistance: number
    readonly image: {
        readonly position: Vector
        readonly angle?: number
    }
    readonly impactDamage?: number
    readonly fireDelay?: number
    readonly detonation: {
        readonly explosion?: ReferenceTo<ExplosionDefinition>
    }
}

export const Throwables: ThrowableDefinition[] = [
    {
        idString: "frag_grenade",
        name: "Frag Grenade",
        itemType: ItemType.Throwable,
        speedMultiplier: 0.92,
        cookSpeedMultiplier: 0.7,
        impactDamage: 1,
        fuseTime: 4000,
        cookable: true,
        maxThrowDistance: 96,
        image: {
            position: Vec.create(60, 43),
            angle: 60
        },
        detonation: {
            explosion: "frag_explosion"
        }
    },
    {
        idString: "smoke_grenade",
        name: "Smoke Grenade",
        itemType: ItemType.Throwable,
        speedMultiplier: 0.92,
        cookSpeedMultiplier: 0.7,
        impactDamage: 1,
        cookable: false,
        fuseTime: 2000,
        maxThrowDistance: 96,
        image: {
            position: Vec.create(60, 43),
            angle: 60
        },
        detonation: {
            explosion: "smoke_explosion"
        }
    }
];
