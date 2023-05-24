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
        spawnMin: number
        spawnMax: number
        destroy: number
    }
    hitbox: Hitbox
    spawnHitbox?: Hitbox
    noCollisions?: boolean
    rotation: "full" | "limited" | "none"
    variations?: number
    particleVariations?: number
    depth?: number // the obstacle z index
    explosion?: string
}

export const Materials: string[] = ["tree", "stone", "bush", "crate", "metal"];

export class Obstacles extends ObjectDefinitions {
    static readonly bitCount = 3;
    static readonly definitions: ObstacleDefinition[] = [
        {
            idString: "tree_oak",
            material: "tree",
            health: 180,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(3),
            spawnHitbox: new CircleHitbox(15),
            rotation: "full",
            variations: 3,
            depth: 3
        },
        {
            idString: "tree_pine",
            material: "tree",
            health: 180,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(7),
            spawnHitbox: new CircleHitbox(15),
            rotation: "full",
            depth: 3
        },
        {
            idString: "rock",
            material: "stone",
            health: 180,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.25
            },
            hitbox: new CircleHitbox(3.85),
            spawnHitbox: new CircleHitbox(4.5),
            rotation: "full",
            variations: 5,
            particleVariations: 2
        },
        {
            idString: "bush",
            material: "bush",
            health: 80,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(4),
            noCollisions: true,
            rotation: "full",
            depth: 2
        },
        {
            idString: "crate_regular",
            material: "crate",
            health: 100,
            scale: {
                spawnMin: 1.0, spawnMax: 1.0, destroy: 0.5
            },
            hitbox: new RectangleHitbox(v(-4.3, -4.3), v(4.3, 4.3)),
            rotation: "limited"
        },
        {
            idString: "barrel",
            material: "metal",
            health: 160,
            scale: {
                spawnMin: 1.0, spawnMax: 1.0, destroy: 0.5
            },
            hitbox: new CircleHitbox(3.45),
            rotation: "full",
            explosion: "barrel_explosion"
        },
        {
            idString: "super_barrel",
            material: "metal",
            health: 240,
            scale: {
                spawnMin: 1.0, spawnMax: 1.0, destroy: 0.5
            },
            hitbox: new CircleHitbox(3.45),
            rotation: "full",
            explosion: "super_barrel_explosion"
        },
        {
            idString: "crate_health",
            material: "crate",
            health: 120,
            scale: {
                spawnMin: 1.0, spawnMax: 1.0, destroy: 0.6
            },
            hitbox: new RectangleHitbox(v(-4.3, -4.3), v(4.3, 4.3)),
            rotation: "limited",
            explosion: "crate_health_explosion"
        }
    ];
}
