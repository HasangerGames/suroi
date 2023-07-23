import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { CircleHitbox, type Hitbox, RectangleHitbox, ComplexHitbox } from "../utils/hitbox";
import { v } from "../utils/vector";

export interface ObstacleDefinition extends ObjectDefinition {
    readonly material: "tree" | "stone" | "bush" | "crate" | "metal" | "wood"
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
    readonly spawnWithLoot?: boolean
    readonly explosion?: string

    readonly frames?: {
        readonly base?: string
        readonly particle?: string
        readonly residue?: string
    }
}

export const Materials: string[] = ["tree", "stone", "bush", "crate", "metal"];

function makeCrate(idString: string, name: string, options: Partial<ObstacleDefinition>): ObstacleDefinition {
    const definition = {
        ...{
            idString,
            name,
            material: "crate",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.5
            },
            hitbox: new RectangleHitbox(v(-4.6, -4.6), v(4.6, 4.6)),
            hasLoot: true
        },
        ...options
    };
    return definition as ObstacleDefinition;
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
        hasLoot: true,
        frames: {
            particle: "regular_crate_particle",
            residue: "regular_crate_residue"
        }
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
            depth: 5
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
            hitbox: new CircleHitbox(7),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: "full",
            depth: 5
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
            depth: 5
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
            depth: 4
        },
        {
            idString: "blueberry_bush",
            name: "Blueberry Bush",
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
            particleVariations: 2,
            depth: 4,
            spawnWithLoot: true,
            frames: {
                particle: "bush_particle",
                residue: "bush_residue"
            }
        },
        makeCrate("regular_crate", "Regular Crate", {
            rotationMode: "binary"
        }),
        makeCrate("flint_crate", "Flint Crate", {
            rotationMode: "none",
            hideOnMap: true
        }),
        makeCrate("aegis_crate", "AEGIS Crate", {
            rotationMode: "none",
            hideOnMap: true
        }),
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
            health: 2500,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            indestructible: true,
            hitbox: new RectangleHitbox(v(-13, -6.85), v(13, 6.85)),
            spawnHitbox: new RectangleHitbox(v(-14, -9), v(14, 9)),
            rotationMode: "limited"
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
        },
        {
            idString: "warehouse_wall_1",
            name: "Warehouse Wall",
            material: "metal",
            health: 1000,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-35.2, -0.8), v(35.2, 0.8)),
            rotationMode: "limited"
        },
        {
            idString: "warehouse_wall_2",
            name: "Warehouse Wall",
            material: "metal",
            health: 1000,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-5, -0.8), v(5, 0.8)),
            rotationMode: "limited"
        },
        {
            idString: "house_wall_1",
            name: "House Wall Small",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-3.5, -1), v(3.5, 1)),
            rotationMode: "limited"
        },
        {
            idString: "house_wall_2",
            name: "House Wall Medium",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-5.8, -1), v(5.8, 1)),
            rotationMode: "limited"
        },
        {
            idString: "house_wall_3",
            name: "House Wall Large",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-10.8, -1), v(10.8, 1)),
            rotationMode: "limited"
        },
        {
            idString: "house_wall_4",
            name: "House Wall Extra Large",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-15.8, -1), v(15.8, 1)),
            rotationMode: "limited"
        },
        {
            idString: "fridge",
            name: "Fridge",
            material: "metal",
            health: 100,
            variations: 3,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-4.3, -2.6), v(4.3, 3)),
            rotationMode: "limited"
        },
        {
            idString: "stove",
            name: "Stove",
            material: "metal",
            health: 100,
            variations: 3,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-4.2, -2.7), v(4.2, 3)),
            rotationMode: "limited"
        },
        {
            idString: "house_exterior",
            name: "House Exterior",
            material: "wood",
            health: 1000,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox([
                new RectangleHitbox(v(-48.33, 33.2), v(48.33, 35.1)), // Topmost wall
                new RectangleHitbox(v(11.9, -9.48), v(13.86, 33.2)), // Wall coming off of topmost wall
                new RectangleHitbox(v(46.4, -9.48), v(48.33, 33.2)), // Rightmost wall
                new RectangleHitbox(v(41.05, -9.48), v(46.43, -7.58)), // Short wall coming off of rightmost wall
                new RectangleHitbox(v(14.05, -9.48), v(19.37, -7.61)) // Short wall to the left of the previous one
            ]),
            rotationMode: "limited"
        },
        {
            idString: "toilet",
            name: "Toilet",
            material: "metal",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-3, -4), v(3, 4)),
            rotationMode: "limited"
        },
        {
            idString: "debug_marker",
            name: "Debug Marker",
            material: "metal",
            health: 1000,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 1.0
            },
            hitbox: new CircleHitbox(0),
            rotationMode: "limited",
            depth: 10
        },
        {
            idString: "drawer_large",
            name: "Large Drawer",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-6.3, -2.5), v(6.3, 3)),
            rotationMode: "limited"
        },
        {
            idString: "couch",
            name: "Couch",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-3.5, -7.5), v(3.4, 7.5)),
            rotationMode: "limited"
        },
        {
            idString: "tv",
            name: "TV",
            material: "metal",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-0.8, -7.5), v(0.3, 7.6)),
            rotationMode: "limited"
        },
        {
            idString: "table",
            name: "Table",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-3.8, -5.6), v(3.8, 5.6)),
            rotationMode: "limited"
        },
        {
            idString: "drawer_small",
            name: "Small Drawer",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-3.2, -3), v(2.5, 3)),
            rotationMode: "limited"
        },
        {
            idString: "chair",
            name: "Chair",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new RectangleHitbox(v(-3.2, -3), v(2.5, 3)),
            rotationMode: "limited"
        }
    ]
);
