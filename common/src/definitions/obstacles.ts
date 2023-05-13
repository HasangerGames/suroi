import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import {
    CircleHitbox, type Hitbox, RectangleHitbox
} from "../utils/hitbox";
import { v } from "../utils/vector";

export interface ObstacleDefinition extends ObjectDefinition {
    scale: {
        min: number
        max: number
    }
    hitbox: Hitbox
    spawnHitbox: Hitbox
    rotation: "full" | "limited" | "none"
    variations?: number
    images: string[]
    depth?: number // the obstacle z index
}

export class Obstacles extends ObjectDefinitions {
    static readonly bitCount = 4;
    static readonly definitions: ObstacleDefinition[] = [
        {
            idString: "tree_oak",
            scale: { min: 0.9, max: 1.1 },
            hitbox: new CircleHitbox(4.5),
            spawnHitbox: new CircleHitbox(15),
            rotation: "full",
            variations: 3,
            images: ["tree_oak_1.svg", "tree_oak_2.svg", "tree_oak_3.svg"],
            depth: 2
        },
        {
            idString: "tree_pine",
            scale: { min: 0.9, max: 1.1 },
            hitbox: new CircleHitbox(7),
            spawnHitbox: new CircleHitbox(15),
            rotation: "full",
            images: ["tree_pine.svg"],
            depth: 2
        },
        {
            idString: "rock",
            scale: { min: 0.9, max: 1.1 },
            hitbox: new CircleHitbox(5.15),
            spawnHitbox: new CircleHitbox(5.5),
            rotation: "full",
            variations: 5,
            images: ["rock_1.svg", "rock_2.svg", "rock_3.svg", "rock_4.svg", "rock_5.svg"]
        },
        {
            idString: "bush",
            scale: { min: 0.75, max: 1.25 },
            hitbox: new CircleHitbox(1.5),
            spawnHitbox: new CircleHitbox(3),
            rotation: "full",
            images: ["bush.svg"]
        },
        {
            idString: "crate_regular",
            scale: { min: 1.0, max: 1.0 },
            hitbox: new RectangleHitbox(v(-6, -6), v(6, 6)),
            spawnHitbox: new RectangleHitbox(v(-6, -6), v(6, 6)),
            rotation: "none",
            images: ["crate_regular.svg"]
        },
        {
            idString: "barrel",
            scale: { min: 1.0, max: 1.0 },
            hitbox: new CircleHitbox(5.2),
            spawnHitbox: new CircleHitbox(5.2),
            rotation: "full",
            images: ["barrel.svg"]
        }
    ];
}
