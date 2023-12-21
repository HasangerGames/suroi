import { ItemType, type InventoryItemDefinition } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";

export interface ThrowableDefinition extends InventoryItemDefinition {
    readonly itemType: ItemType.Throwable
    readonly image: {
        readonly position: Vector
        readonly angle?: number
    }
    readonly fireDelay?: number
}

export const Throwables: ThrowableDefinition[] = [
    {
        idString: "frag_grenade",
        name: "Frag Grenade",
        itemType: ItemType.Throwable,
        speedMultiplier: 0.92,
        image: {
            position: Vec.create(60, 43),
            angle: 60
        }
    },
    {
        idString: "smoke_grenade",
        name: "Smoke Grenade",
        itemType: ItemType.Throwable,
        speedMultiplier: 0.92,
        image: {
            position: Vec.create(60, 43),
            angle: 60
        }
    }
];
