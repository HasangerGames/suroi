import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { CircleHitbox, type Hitbox, RectangleHitbox } from "../utils/hitbox";
import { v } from "../utils/vector";

export interface ObstacleDefinition extends ObjectDefinition {
    readonly material: "tree" | "stone" | "bush" | "crate" | "metal"
    readonly health: number
    readonly indestructible?: boolean
    readonly impenetrable?: boolean
    readonly hideOnMap?: boolean
    readonly scale: {
        readonly spawnMin: number
        readonly spawnMax: number
        readonly destroy: number
    }
    readonly hitbox: Hitbox
    readonly spawnHitbox?: Hitbox
    readonly noCollisions?: boolean
    readonly rotationMode: "full" | "limited" | "binary" | "none"
    readonly variations?: number
    readonly particleVariations?: number
    readonly depth?: number // the obstacle z index
    readonly hasLoot?: boolean
    readonly explosion?: string
}

export const Materials: string[] = ["tree", "stone", "bush", "crate", "metal"];

function makeCrate(idString: string, name: string, rotationMode: ObstacleDefinition["rotationMode"], hideOnMap?: boolean): ObstacleDefinition {
    return {
        idString,
        name,
        material: "crate",
        health: 100,
        hideOnMap,
        scale: {
            spawnMin: 1.0,
            spawnMax: 1.0,
            destroy: 0.5
        },
        hitbox: new RectangleHitbox(v(-4.6, -4.6), v(4.6, 4.6)),
        rotationMode,
        hasLoot: true
    };
}

function makeSpecialCrate(idString: string, name: string): ObstacleDefinition {
    return {
        idString,
        name,
        material: "crate",
        health: 120,
        scale: {
            spawnMin: 1.0,
            spawnMax: 1.0,
            destroy: 0.6
        },
        hitbox: new RectangleHitbox(v(-3.1, -3.1), v(3.1, 3.1)),
        rotationMode: "none",
        hasLoot: true
    };
}

export const Obstacles = new ObjectDefinitions<ObstacleDefinition>(
    [
        {
            idString: "oak_tree",
            name: "Oak Tree",
            material: "tree",
            health: 180,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(3),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: "full",
            variations: 3,
            depth: 4
        },
        {
            idString: "pine_tree",
            name: "Pine Tree",
            material: "tree",
            health: 180,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(3),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: "full",
            depth: 4
        },
        {
            idString: "birch_tree",
            name: "Birch Tree",
            material: "tree",
            health: 240,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(3),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: "full",
            depth: 4
        },
        {
            idString: "rock",
            name: "Rock",
            material: "stone",
            health: 200,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(4),
            spawnHitbox: new CircleHitbox(4.5),
            rotationMode: "full",
            variations: 7,
            particleVariations: 2
        },
        {
            idString: "bush",
            name: "Bush",
            material: "bush",
            health: 80,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(4.2),
            noCollisions: true,
            rotationMode: "full",
            variations: 2,
            particleVariations: 2,
            depth: 3
        },
        makeCrate("regular_crate", "Regular Crate", "binary"),
        makeCrate("flint_crate", "Flint Crate", "none", true),
        makeCrate("aegis_crate", "AEGIS Crate", "none", true),
        makeSpecialCrate("gauze_crate", "Gauze Crate"),
        makeSpecialCrate("cola_crate", "Cola Crate"),
        makeSpecialCrate("melee_crate", "Melee Crate"),
        {
            idString: "barrel",
            name: "Barrel",
            material: "metal",
            health: 160,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(3.65),
            rotationMode: "full",
            explosion: "barrel_explosion"
        },
        {
            idString: "super_barrel",
            name: "Super Barrel",
            material: "metal",
            health: 240,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(3.65),
            rotationMode: "full",
            explosion: "super_barrel_explosion"
        },
        {
            idString: "oil_tank",
            name: "Oil Tank",
            material: "metal",
            health: 10000,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            indestructible: true,
            hitbox: new RectangleHitbox(v(-13, -6.85), v(13, 6.85)),
            spawnHitbox: new RectangleHitbox(v(-14, -9), v(14, 9)),
            rotationMode: "none"
        },
        {
            idString: "gold_rock",
            name: "Gold Rock",
            material: "stone",
            hideOnMap: true,
            health: 250,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1.1,
                destroy: 0.3
            },
            hitbox: new CircleHitbox(4),
            spawnHitbox: new CircleHitbox(4.5),
            rotationMode: "full",
            hasLoot: true
        }
    ]
);
