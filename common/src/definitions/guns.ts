import { type ObjectDefinition } from "../utils/objectDefinitions";
import { v, type Vector } from "../utils/vector";

export interface GunDefinition extends ObjectDefinition {
    readonly cooldown: number
    readonly fists: {
        readonly left: Vector
        readonly right: Vector
    }
    image?: {
        frame: string
        position: Vector
    }
}

export const Guns: GunDefinition[] =
[
    {
        idString: "ak47",
        cooldown: 250,
        fists: {
            left: v(65, 0),
            right: v(130, 10)
        },
        image: {
            frame: "ak-47-top.svg",
            position: v(120, 0)
        }
    }
];
