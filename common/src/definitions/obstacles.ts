import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { CircleHitbox, type Hitbox, RectangleHitbox, ComplexHitbox } from "../utils/hitbox";
import { v, type Vector } from "../utils/vector";
import { type Variation } from "../typings";

export type ObstacleDefinition = ObjectDefinition & {
    readonly material: typeof Materials[number]
    readonly health: number
    readonly indestructible?: boolean
    readonly impenetrable?: boolean
    readonly noResidue?: boolean
    readonly invisible?: boolean
    readonly hideOnMap?: boolean
    readonly scale: {
        readonly spawnMin: number
        readonly spawnMax: number
        readonly destroy: number
    }
    readonly hitbox: Hitbox
    readonly spawnHitbox?: Hitbox
    readonly noCollisions?: boolean
    readonly rotationMode: RotationMode
    readonly variations?: Variation
    readonly particleVariations?: number
    readonly depth?: number // the obstacle z index
    readonly hasLoot?: boolean
    readonly spawnWithLoot?: boolean
    readonly explosion?: string
    readonly noMeleeCollision?: boolean
    readonly reflectBullets?: boolean

    readonly frames?: {
        readonly base?: string
        readonly particle?: string
        readonly residue?: string
    }

    readonly isWall?: boolean
    readonly isWindow?: boolean
} & ({
    readonly isDoor: true
    readonly hingeOffset: Vector
} | {
    readonly isDoor?: false
});

export const Materials: string[] = [
    "tree",
    "stone",
    "bush",
    "crate",
    "metal",
    "wood",
    "glass",
    "porcelain",
    "cardboard",
    "appliance",
    "large_refinery_barrel"
];

export enum RotationMode {
    Full,
    Limited,
    Binary,
    None
}

function makeCrate(idString: string, name: string, options: Partial<ObstacleDefinition>): ObstacleDefinition {
    const definition = {
        ...{
            idString,
            name,
            material: "crate",
            health: 80,
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
        health: 100,
        scale: {
            spawnMin: 1.0,
            spawnMax: 1.0,
            destroy: 0.6
        },
        hitbox: new RectangleHitbox(v(-3.1, -3.1), v(3.1, 3.1)),
        rotationMode: RotationMode.None,
        hasLoot: true,
        frames: {
            particle: "regular_crate_particle",
            residue: "regular_crate_residue"
        }
    };
}

function makeHouseWall(lengthNumber: string, hitbox: Hitbox): ObstacleDefinition {
    return {
        idString: `house_wall_${lengthNumber}`,
        name: `House Wall ${lengthNumber}`,
        material: "wood",
        noResidue: true,
        health: 120,
        scale: {
            spawnMin: 1.0,
            spawnMax: 1.0,
            destroy: 0.95
        },
        hitbox,
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "wall_particle"
        },
        isWall: true
    };
}

function makeConcreteWall(idString: string, name: string, hitbox: Hitbox, indestructible = false, variations?: Variation): ObstacleDefinition {
    return {
        idString,
        name,
        material: "stone",
        health: 500,
        indestructible,
        noResidue: true,
        scale: {
            spawnMin: 1.0,
            spawnMax: 1.0,
            destroy: 0.95
        },
        hitbox,
        rotationMode: RotationMode.Limited,
        isWall: true,
        particleVariations: 2,
        variations,
        frames: {
            particle: "rock_particle"
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
                spawnMax: 1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(5.5),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: RotationMode.Full,
            variations: 3,
            depth: 7
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
            rotationMode: RotationMode.Full,
            depth: 7
        },
        {
            idString: "birch_tree",
            name: "Birch Tree",
            material: "tree",
            health: 240,
            scale: {
                spawnMin: 0.9,
                spawnMax: 1,
                destroy: 0.75
            },
            hitbox: new CircleHitbox(5.5),
            spawnHitbox: new CircleHitbox(15),
            rotationMode: RotationMode.Full,
            depth: 7
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
            rotationMode: RotationMode.Full,
            variations: 7,
            particleVariations: 2
        },
        {
            idString: "flint_stone",
            name: "Flint Stone",
            material: "stone",
            health: 200,
            indestructible: true,
            noResidue: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.5
            },
            hitbox: new RectangleHitbox(v(-3.1, -3.1), v(3.1, 3.1)),
            rotationMode: RotationMode.None,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            }
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
            rotationMode: RotationMode.Full,
            variations: 2,
            particleVariations: 2,
            depth: 6
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
            rotationMode: RotationMode.Full,
            particleVariations: 2,
            depth: 6,
            spawnWithLoot: true,
            frames: {
                particle: "bush_particle",
                residue: "bush_residue"
            }
        },
        makeCrate("regular_crate", "Regular Crate", {
            rotationMode: RotationMode.Binary
        }),
        makeCrate("flint_crate", "Flint Crate", {
            rotationMode: RotationMode.None,
            hideOnMap: true
        }),
        makeCrate("aegis_crate", "AEGIS Crate", {
            rotationMode: RotationMode.None,
            hideOnMap: true
        }),
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
            rotationMode: RotationMode.Full,
            explosion: "barrel_explosion",
            reflectBullets: true
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
            rotationMode: RotationMode.Full,
            explosion: "super_barrel_explosion",
            reflectBullets: true
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
            hitbox: new ComplexHitbox([
                new RectangleHitbox(v(-8.4, -6.8), v(8.4, 6.8)),
                new RectangleHitbox(v(-13, -1), v(13, 1)),
                new CircleHitbox(5, v(-8, 1.8)),
                new CircleHitbox(5, v(-8, -1.8)),
                new CircleHitbox(5, v(8, 1.8)),
                new CircleHitbox(5, v(8, -1.8))
            ]),
            spawnHitbox: new RectangleHitbox(v(-14, -9), v(14, 9)),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
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
            rotationMode: RotationMode.Full,
            hasLoot: true
        },
        {
            idString: "warehouse_wall_1",
            name: "Warehouse Wall",
            material: "metal",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.95
            },
            hitbox: new RectangleHitbox(v(-35.2, -0.8), v(35.2, 0.8)),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "warehouse_wall_2",
            name: "Warehouse Wall",
            material: "metal",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.95
            },
            hitbox: new RectangleHitbox(v(-5.3, -0.8), v(5.3, 0.8)),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "box",
            name: "Box",
            material: "cardboard",
            health: 60,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: new RectangleHitbox(v(-2.2, -2.2), v(2.2, 2.2)),
            rotationMode: RotationMode.Limited,
            variations: 3,
            depth: 2,
            hasLoot: true
        },
        {
            idString: "metal_shelf",
            name: "Metal Shelf",
            material: "metal",
            health: 1000,
            indestructible: true,
            noMeleeCollision: true,
            hideOnMap: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: new RectangleHitbox(v(-12, -3.2), v(12, 3.2)),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
        },
        makeHouseWall("1", new RectangleHitbox(v(-4.55, -1), v(4.55, 1))),
        makeHouseWall("2", new RectangleHitbox(v(-10.43, -1), v(10.43, 1))),
        makeHouseWall("3", new RectangleHitbox(v(-5.7, -1), v(5.7, 1))),
        makeHouseWall("4", new RectangleHitbox(v(-10.7, -1), v(10.7, 1))),
        makeHouseWall("5", new RectangleHitbox(v(-8.02, -1), v(8.02, 1))),
        {
            idString: "fridge",
            name: "Fridge",
            material: "appliance",
            health: 140,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.8
            },
            hasLoot: true,
            hitbox: new RectangleHitbox(v(-4.55, -3.45), v(4.55, 3)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
        },
        {
            idString: "stove",
            name: "Stove",
            material: "metal",
            health: 140,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.8
            },
            hitbox: new RectangleHitbox(v(-4.55, -3.45), v(4.55, 3)),
            rotationMode: RotationMode.Limited,
            explosion: "stove_explosion",
            frames: {
                particle: "metal_particle"
            },
            reflectBullets: true
        },
        {
            idString: "washing_machine",
            name: "Washing Machine",
            material: "appliance",
            health: 140,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.8
            },
            hasLoot: true,
            hitbox: new RectangleHitbox(v(-4.55, -3.45), v(4.55, 3)),
            rotationMode: RotationMode.Limited,
            reflectBullets: true
        },
        {
            idString: "house_exterior",
            name: "House Exterior",
            material: "stone",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            invisible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox([
                // Comments assume the building is not rotated (rotation = 0)
                new RectangleHitbox(v(-48.33, -35.1), v(-34, -33.2)), // First Topmost wall
                new RectangleHitbox(v(-23.5, -35.1), v(-6.5, -33.2)), // Topmost wall after the first window
                new RectangleHitbox(v(4, -35.1), v(48.33, -33.2)), // Topmost wall after the second window
                new RectangleHitbox(v(11.9, -33.2), v(13.86, -10.9)), // Wall coming off of topmost wall
                new RectangleHitbox(v(46.4, -33.2), v(48.33, 9.48)), // Rightmost wall
                new RectangleHitbox(v(41.05, 7.58), v(46.43, 9.48)), // Short wall coming off of rightmost wall
                new RectangleHitbox(v(13.86, 7.61), v(19.37, 9.48)), // Short wall to the left of the previous one
                new RectangleHitbox(v(11.9, -1.2), v(13.86, 21.5)), // Wall coming off of the longer bottommost wall
                new RectangleHitbox(v(-26.2, 21.57), v(13.86, 23.5)), // Longer bottommost wall
                new RectangleHitbox(v(-48.33, 21.57), v(-36.25, 23.5)), // Shorter bottommost wall
                new RectangleHitbox(v(-48.33, -33.2), v(-46.4, -11)), // Leftmost wall until left window
                new RectangleHitbox(v(-48.33, -0.5), v(-46.4, 23.5)), // Leftmost wall after the window

                new RectangleHitbox(v(-41.9, 32), v(-38.65, 35.13)), // Left post
                new RectangleHitbox(v(-24.1, 32), v(-20.85, 35.13)) // Right post
            ]),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "wall_particle"
            }
        },
        {
            idString: "door",
            name: "Door",
            material: "wood",
            health: 120,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 1.0
            },
            hitbox: new RectangleHitbox(v(-5.52, -0.8), v(4.63, 0.8)),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            isDoor: true,
            hingeOffset: v(-5.5, 0),
            depth: 4,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "toilet",
            name: "Toilet",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(2.5),
            // TODO Figure out why this doesn't work
            /*hitbox: new ComplexHitbox([
                new RectangleHitbox(v(-3.18, 1.25), v(3.2, 4.05)),
                new CircleHitbox(2.5)
            ]),*/
            rotationMode: RotationMode.Limited,
            hasLoot: true
        },
        {
            idString: "used_toilet",
            name: "Used Toilet",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(2.5),
            // TODO Figure out why this doesn't work
            /*hitbox: new ComplexHitbox([
                new RectangleHitbox(v(-3.18, 1.25), v(3.2, 4.05)),
                new CircleHitbox(2.5)
            ]),*/
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "toilet_particle",
                residue: "toilet_residue"
            }
        },
        {
            idString: "small_drawer",
            name: "Small Drawer",
            material: "wood",
            health: 80,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.8
            },
            hitbox: new RectangleHitbox(v(-3.1, -3.5), v(3.1, 2.5)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "large_drawer",
            name: "Large Drawer",
            material: "wood",
            health: 80,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.8
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-6.25, -3.5), v(6.25, 2.5)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "furniture_particle"
            }
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
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-3.7, -7.9), v(3.3, 7.9)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "tv",
            name: "TV",
            material: "glass",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-0.8, -7.6), v(0.3, 7.5)),
            rotationMode: RotationMode.Limited,
            depth: 2,
            frames: {
                particle: "metal_particle"
            }
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
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-4.15, -6.1), v(4.15, 6.1)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            },
            depth: 2
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
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-3.4, -3.35), v(3.4, 3.35)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "bookshelf",
            name: "Bookshelf",
            material: "wood",
            health: 80,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.8
            },
            hideOnMap: true,
            variations: 2,
            hitbox: new RectangleHitbox(v(-6.24, -2.12), v(6.25, 2.12)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "window",
            name: "Window",
            material: "glass",
            health: 20,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.95
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-0.9, -4.7), v(0.9, 4.7)),
            depth: 2,
            rotationMode: RotationMode.Limited,
            isWindow: true
        },
        {
            idString: "bed",
            name: "Bed",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-5.6, -8), v(5.6, 8)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "garage_door",
            name: "Garage Door",
            material: "wood",
            health: 200,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.95
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-10.85, -1.15), v(10.85, 0.35)),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "porta_potty_toilet_open",
            name: "Porta Potty Toilet Open",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-6.05, -3.2), v(6.08, 1.1)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "porta_potty_toilet_particle",
                residue: "porta_potty_toilet_residue"
            }
        },
        {
            idString: "porta_potty_toilet_closed",
            name: "Porta Potty Toilet Closed",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-6, -3.2), v(6, 1.1)),
            rotationMode: RotationMode.Limited,
            hasLoot: true,
            frames: {
                particle: "porta_potty_toilet_particle",
                residue: "porta_potty_toilet_residue"
            }
        },
        {
            idString: "porta_potty_back_wall",
            name: "Porta Potty Back Wall",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-6.4, -0.8), v(6.4, 0.8)),
            rotationMode: RotationMode.Limited,
            isWall: true,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        {
            idString: "porta_potty_door",
            name: "Porta Potty Door",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 1.0
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-5.4, -0.7), v(3.8, 0.7)),
            rotationMode: RotationMode.Limited,
            isDoor: true,
            hingeOffset: v(-5.5, 0)
        },
        {
            idString: "porta_potty_front_wall",
            name: "Porta Potty Front Wall",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-1.5, -0.8), v(1.5, 0.8)),
            rotationMode: RotationMode.Limited,
            isWall: true,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        {
            idString: "porta_potty_sink_wall",
            name: "Porta Potty Sink Wall",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-9.6, 0.3), v(9.6, 2.2)),
            rotationMode: RotationMode.Limited,
            isWall: true,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        {
            idString: "porta_potty_toilet_paper_wall",
            name: "Porta Potty Toilet Paper Wall",
            material: "wood",
            health: 100,
            depth: 2,
            noResidue: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: new RectangleHitbox(v(-9.6, -2), v(9.6, -0.3)),
            rotationMode: RotationMode.Limited,
            isWall: true,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        makeConcreteWall(
            "concrete_wall_end",
            "Concrete Wall End",
            new RectangleHitbox(v(-1.2, -1), v(1.2, 1)),
            true
        ),
        makeConcreteWall(
            "concrete_wall_end_broken",
            "Concrete Wall End Broken",
            new RectangleHitbox(v(-1.2, -1), v(1.2, 1)),
            true,
            2
        ),
        makeConcreteWall(
            "concrete_wall_segment",
            "Concrete Wall Segment",
            new RectangleHitbox(v(-8, -1), v(8, 1)),
            true
        ),
        makeConcreteWall(
            "concrete_wall_segment_long",
            "Concrete Wall Segment Long",
            new RectangleHitbox(v(-16, -1), v(16, 1)),
            true
        ),
        makeConcreteWall(
            "concrete_wall_corner",
            "Concrete Wall Corner",
            new RectangleHitbox(v(-1, -1), v(1, 1)),
            true
        ),
        makeConcreteWall(
            "inner_concrete_wall_1",
            "Inner Concrete Wall 1",
            new RectangleHitbox(v(-5.4, -0.95), v(5.4, 0.95))
        ),
        makeConcreteWall(
            "inner_concrete_wall_2",
            "Inner Concrete Wall 2",
            new RectangleHitbox(v(-18.3, -0.95), v(18.3, 0.95))
        ),
        makeConcreteWall(
            "inner_concrete_wall_3",
            "Inner Concrete Wall 3",
            new RectangleHitbox(v(-19.57, -0.95), v(19.57, 0.95))
        ),
        makeConcreteWall(
            "inner_concrete_wall_4",
            "Inner Concrete Wall 4",
            new RectangleHitbox(v(-23.57, -0.95), v(23.57, 0.95))
        ),
        {
            idString: "refinery_walls",
            name: "Refinery Walls",
            material: "stone",
            health: 1000,
            indestructible: true,
            hideOnMap: true,
            invisible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox([
                new RectangleHitbox(v(-50.5, -37), v(6.5, -35.2)), // First topmost wall
                new RectangleHitbox(v(20, -37), v(50.75, -35.2)), // Wall after the hole
                new RectangleHitbox(v(48.75, -39), v(50.75, -5.5)), // Wall from top right to bottom right
                new RectangleHitbox(v(34.5, -7.55), v(50.75, -5.5)), // Wall to the right of the entrance
                new RectangleHitbox(v(-17, -7.55), v(21.5, -5.5)), // Wall to the left of the entrance
                new RectangleHitbox(v(-17, -7.55), v(-15, 14)), // Wall on top of the window
                new RectangleHitbox(v(-17, 23.5), v(-15, 37)), // Wall bellow the window
                new RectangleHitbox(v(-50.5, 35.25), v(-15, 37.25)), // Bottommost wall
                new RectangleHitbox(v(-50.5, -37), v(-48.5, 37)), // Wall from topmost to bottommost
                new RectangleHitbox(v(-50, 8), v(-36.7, 10)), // inner door walls
                new RectangleHitbox(v(-26.5, 8), v(-16, 10))
            ]),
            rotationMode: RotationMode.Limited,
            particleVariations: 2,
            noResidue: true,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "small_refinery_barrel",
            name: "Small Refinery Barrel",
            material: "metal",
            health: 250,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(6.8),
            rotationMode: RotationMode.Full,
            explosion: "small_refinery_barrel_explosion",
            reflectBullets: true,
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "large_refinery_barrel",
            name: "Large Refinery Barrel",
            material: "large_refinery_barrel",
            health: 3500,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.95
            },
            hitbox: new CircleHitbox(17.15),
            rotationMode: RotationMode.Full,
            explosion: "large_refinery_barrel_explosion",
            reflectBullets: true,
            depth: 10,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "smokestack",
            name: "Smokestack",
            material: "metal",
            health: 500,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(8.9),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            depth: 10,
            noResidue: true,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "distillation_column",
            name: "Distillation Column",
            material: "metal",
            health: 500,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.5
            },
            hitbox: new ComplexHitbox([
                new CircleHitbox(5.22, v(0, -0.65)),
                new CircleHitbox(4.9, v(0, 0.9))
            ]),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            depth: 10,
            noResidue: true,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "distillation_equipment",
            name: "Distillation Equipment",
            material: "metal",
            health: 500,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.5
            },
            hitbox: new ComplexHitbox([
                new CircleHitbox(3, v(-11.3, -3.85)), // Main tank rounded corners
                new CircleHitbox(3, v(-11.3, -6.55)),
                new RectangleHitbox(v(-14.3, -7), v(3.2, -3.5)),
                new RectangleHitbox(v(-11, -9.4), v(3.2, -0.9)), // Main tank
                new CircleHitbox(3.15, v(0.72, 5.62)), // Bottom left circle
                new CircleHitbox(4.4, v(8.95, 5.62)), // Bottom right circle
                new CircleHitbox(5.35, v(8.95, -4.7)), // Top circle
                new RectangleHitbox(v(-0.25, -1), v(1.55, 2.7)), // Pipe connected to bottom left circle
                new RectangleHitbox(v(7.65, 0.4), v(10.25, 1.6)), // Pipe between 2 rightmost circles
                new RectangleHitbox(v(3.4, 4.65), v(5, 6.4)), // Pipe between 2 bottommost circles
                new RectangleHitbox(v(3.1, -5.35), v(5, -7.95)) // Pipe connected to topmost circle
            ]),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            noResidue: true,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "gun_mount",
            name: "Gun Mount",
            material: "wood",
            health: 60,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.95
            },
            hasLoot: true,
            hitbox: new ComplexHitbox([
                new RectangleHitbox(v(-4.1, -1.8), v(4.1, -0.85)), // Base
                new RectangleHitbox(v(-0.39, -0.9), v(0.39, 1.85)), // Center post
                new RectangleHitbox(v(-3.5, -0.9), v(-2.72, 1.85)), // Left post
                new RectangleHitbox(v(2.8, -0.9), v(3.55, 1.85)) // Right post
            ]),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        }
    ]
);
