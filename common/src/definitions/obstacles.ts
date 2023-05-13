import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import {
    CircleHitbox, type Hitbox, RectangleHitbox
} from "../utils/hitbox";
import { v } from "../utils/vector";

export interface ObstacleDefinition extends ObjectDefinition {
    material: string
    health: number
    invulnerable?: boolean
    scale: {
        min: number
        max: number
    }
    hitbox: Hitbox
    spawnHitbox: Hitbox
    rotation: "full" | "limited" | "none"
    variations?: number
    depth?: number // the obstacle z index
}

export class Obstacles extends ObjectDefinitions {
    static readonly bitCount = 4;
    static readonly definitions: ObstacleDefinition[] = [
        {
            idString: "tree_oak",
            material: "tree",
            health: 100,
            scale: { min: 0.9, max: 1.1 },
            hitbox: new CircleHitbox(4.5),
            spawnHitbox: new CircleHitbox(15),
            rotation: "full",
            variations: 3,
            depth: 2
        },
        {
            idString: "tree_pine",
            material: "tree",
            health: 100,
            scale: { min: 0.9, max: 1.1 },
            hitbox: new CircleHitbox(7),
            spawnHitbox: new CircleHitbox(15),
            rotation: "full",
            depth: 2
        },
        {
            idString: "rock",
            material: "stone",
            health: 100,
            scale: { min: 0.9, max: 1.1 },
            hitbox: new CircleHitbox(5.15),
            spawnHitbox: new CircleHitbox(5.5),
            rotation: "full",
            variations: 5
        },
        {
            idString: "bush",
            material: "bush",
            health: 100,
            scale: { min: 0.75, max: 1.25 },
            hitbox: new CircleHitbox(1.5),
            spawnHitbox: new CircleHitbox(3),
            rotation: "full"
        },
        {
            idString: "crate_regular",
            material: "wood",
            health: 100,
            scale: { min: 1.0, max: 1.0 },
            hitbox: new RectangleHitbox(v(-6, -6), v(6, 6)),
            spawnHitbox: new RectangleHitbox(v(-6, -6), v(6, 6)),
            rotation: "none"
        },
        {
            idString: "barrel",
            material: "metal",
            health: 100,
            scale: { min: 1.0, max: 1.0 },
            hitbox: new CircleHitbox(5.2),
            spawnHitbox: new CircleHitbox(5.2),
            rotation: "full"
        }
    ];
}
