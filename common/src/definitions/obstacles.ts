import { ZIndexes } from "../constants";
import { type Variation } from "../typings";
import { CircleHitbox, ComplexHitbox, type Hitbox, RectangleHitbox } from "../utils/hitbox";
import { type ObjectDefinition, ObjectDefinitions, ObstacleSpecialRoles } from "../utils/objectDefinitions";
import { v, type Vector } from "../utils/vector";
import { ContainerTints } from "./buildings";

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
    readonly variations?: Exclude<Variation, 0>
    readonly particleVariations?: number
    readonly zIndex?: number
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

    readonly tint?: number
} & (
    (
        {
            readonly role: ObstacleSpecialRoles.Door
            readonly locked?: boolean
            readonly openOnce?: boolean
            readonly animationDuration?: number
        } & (
            {
                readonly operationStyle?: "swivel"
                readonly hingeOffset: Vector
            } | {
                readonly operationStyle: "slide"
                /**
                 * Determines how much the door slides. 1 means it'll be displaced by its entire width,
                 * 0.5 means it'll be displaced by half its width, etc
                 */
                readonly slideFactor?: number
            }
        )
    ) | {
        readonly role: ObstacleSpecialRoles.Activatable
        readonly activator?: string
    } | {
        readonly role?: ObstacleSpecialRoles.Wall | ObstacleSpecialRoles.Window
    }
);

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
    /**
     * Allows rotation in any direction (within the limits of the bit stream's encoding capabilities)
     */
    Full,
    /**
     * Allows rotation in the four cardinal directions: up, right, down and left
     */
    Limited,
    /**
     * Allows rotation in two directions: a "normal" direction and a "flipped" direction; for example,
     * up and down, or left and right
     */
    Binary,
    /**
     * Disabled rotation
     */
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: RectangleHitbox.fromRect(9.2, 9.2),
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
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.6
        },
        hitbox: RectangleHitbox.fromRect(6.1, 6.1),
        rotationMode: RotationMode.None,
        hasLoot: true
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
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox,
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "wall_particle"
        },
        role: ObstacleSpecialRoles.Wall
    };
}

function makeConcreteWall(idString: string, name: string, hitbox: Hitbox, indestructible?: boolean, variations?: Exclude<Variation, 0>): ObstacleDefinition {
    return {
        idString,
        name,
        material: "stone",
        health: 500,
        indestructible,
        noResidue: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox,
        rotationMode: RotationMode.Limited,
        role: ObstacleSpecialRoles.Wall,
        particleVariations: 2,
        variations,
        frames: {
            particle: "rock_particle"
        }
    };
}

function makeContainerWalls(id: number, open: "open2" | "open1" | "closed", tint?: number): ObstacleDefinition {
    let hitbox: Hitbox;
    switch (open) {
        case "open2":
            hitbox = new ComplexHitbox(
                RectangleHitbox.fromRect(1.85, 28, v(6.1, 0)),
                RectangleHitbox.fromRect(1.85, 28, v(-6.1, 0))
            );
            break;
        case "open1":
            hitbox = new ComplexHitbox(
                RectangleHitbox.fromRect(1.85, 28, v(6.1, 0)),
                RectangleHitbox.fromRect(1.85, 28, v(-6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, v(0, -13.04))
            );
            break;
        case "closed":
        default:
            hitbox = RectangleHitbox.fromRect(14, 28);
            break;
    }
    const invisible = open === "closed";
    return {
        idString: `container_walls_${id}`,
        name: `Container Walls ${id}`,
        material: "metal",
        health: 500,
        indestructible: true,
        noResidue: true,
        hideOnMap: invisible || undefined,
        invisible: invisible || undefined,
        scale: {
            spawnMin: 1.0,
            spawnMax: 1.0,
            destroy: 1.0
        },
        hitbox,
        rotationMode: RotationMode.Limited,
        role: ObstacleSpecialRoles.Wall,
        reflectBullets: true,
        frames: {
            base: open !== "closed" ? `container_walls_${open}` : undefined,
            particle: "metal_particle"
        },
        tint
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
            zIndex: ZIndexes.ObstaclesLayer4
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
            zIndex: ZIndexes.ObstaclesLayer4
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
            zIndex: ZIndexes.ObstaclesLayer4
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: RectangleHitbox.fromRect(6.1, 6.1),
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
            zIndex: ZIndexes.ObstaclesLayer3
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
            zIndex: ZIndexes.ObstaclesLayer3,
            spawnWithLoot: true,
            frames: {
                particle: "bush_particle",
                residue: "bush_residue"
            }
        },
        makeCrate("regular_crate", "Regular Crate", {
            rotationMode: RotationMode.Binary,
            frames: {
                particle: "crate_particle",
                residue: "regular_crate_residue"
            }
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
                spawnMin: 1,
                spawnMax: 1,
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
                spawnMin: 1,
                spawnMax: 1,
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            indestructible: true,
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(16.8, 13.6),
                RectangleHitbox.fromRect(26, 2),
                new CircleHitbox(5, v(-8, 1.8)),
                new CircleHitbox(5, v(-8, -1.8)),
                new CircleHitbox(5, v(8, 1.8)),
                new CircleHitbox(5, v(8, -1.8))
            ),
            spawnHitbox: RectangleHitbox.fromRect(28, 18),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: RectangleHitbox.fromRect(70.5, 1.6),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: RectangleHitbox.fromRect(10.6, 1.6),
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
            hitbox: RectangleHitbox.fromRect(4.4, 4.4),
            rotationMode: RotationMode.Limited,
            variations: 3,
            zIndex: ZIndexes.ObstaclesLayer2,
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
            hitbox: RectangleHitbox.fromRect(24, 6.6),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            },
            zIndex: ZIndexes.ObstaclesLayer1 - 3,
            reflectBullets: true
        },
        makeHouseWall("1", RectangleHitbox.fromRect(9, 2)),
        makeHouseWall("2", RectangleHitbox.fromRect(20.86, 2)),
        makeHouseWall("3", RectangleHitbox.fromRect(11.4, 2)),
        makeHouseWall("4", RectangleHitbox.fromRect(21.4, 2)),
        makeHouseWall("5", RectangleHitbox.fromRect(16, 2)),
        {
            idString: "fridge",
            name: "Fridge",
            material: "appliance",
            health: 140,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hasLoot: true,
            hitbox: RectangleHitbox.fromRect(9.1, 6.45, v(0, -0.45)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(9.1, 6.45, v(0, -0.45)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hasLoot: true,
            hitbox: RectangleHitbox.fromRect(9.1, 6.45, v(0, -0.45)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox(
                // Comments assume the building is not rotated (rotation = 0)
                RectangleHitbox.fromRect(14.33, 2, v(-41.16, -34.15)), // First Topmost wall
                RectangleHitbox.fromRect(17, 2, v(-15, -34.15)), // Topmost wall after the first window
                RectangleHitbox.fromRect(44.33, 2, v(26.16, -34.15)), // Topmost wall after the second window
                RectangleHitbox.fromRect(2, 22.3, v(12.88, -22.05)), // Wall coming off of topmost wall
                RectangleHitbox.fromRect(2, 42.68, v(47.36, -11.86)), // Rightmost wall
                RectangleHitbox.fromRect(5.38, 2, v(43.74, 8.53)), // Short wall coming off of rightmost wall
                RectangleHitbox.fromRect(5.51, 2, v(16.62, 8.54)), // Short wall to the left of the previous one
                RectangleHitbox.fromRect(2, 22.7, v(12.88, 10.15)), // Wall coming off of the longer bottommost wall
                RectangleHitbox.fromRect(40.06, 2, v(-6.17, 22.54)), // Longer bottommost wall
                RectangleHitbox.fromRect(12.08, 2, v(-42.29, 22.54)), // Shorter bottommost wall
                RectangleHitbox.fromRect(2, 22.2, v(-47.36, -22.1)), // Leftmost wall until left window
                RectangleHitbox.fromRect(2, 24, v(-47.36, 11.5)), // Leftmost wall after the window

                RectangleHitbox.fromRect(3.25, 3.25, v(-40.27, 33.56)), // Left post
                RectangleHitbox.fromRect(3.25, 3.25, v(-22.48, 33.56)) // Right post
            ),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 1
            },
            hitbox: RectangleHitbox.fromRect(10.15, 1.6, v(-0.44, 0)),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            role: ObstacleSpecialRoles.Door,
            hingeOffset: v(-5.5, 0),
            zIndex: ZIndexes.ObstaclesLayer3,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "vault_door",
            name: "Vault Door",
            material: "metal",
            health: 1000,
            indestructible: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 1
            },
            reflectBullets: true,
            hitbox: RectangleHitbox.fromRect(12.8, 1.9, v(0.9, -0.7)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Door,
            locked: true,
            openOnce: true,
            animationDuration: 2000,
            hingeOffset: v(-5.5, -1),
            zIndex: ZIndexes.ObstaclesLayer3,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "toilet",
            name: "Toilet",
            material: "porcelain",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(2.5),
            // TODO Figure out why this doesn't work
            /*hitbox: new ComplexHitbox([
                RectangleHitbox.fromRect(v(-3.18, 1.25), v(3.2, 4.05)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: new CircleHitbox(2.5),
            // TODO Figure out why this doesn't work
            /*hitbox: new ComplexHitbox([
                RectangleHitbox.fromRect(v(-3.18, 1.25), v(3.2, 4.05)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hitbox: RectangleHitbox.fromRect(6.2, 6, v(0, -0.5)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(12.5, 6, v(0, -0.5)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(7, 15.8, v(-0.2, 0)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(1.1, 15.1, v(-0.25, 0)),
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.ObstaclesLayer2,
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(8.3, 12.2),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            },
            zIndex: ZIndexes.ObstaclesLayer3,
            noCollisions: true
        },
        {
            idString: "chair",
            name: "Chair",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(6.8, 6.7, v(0, 0)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.8
            },
            hideOnMap: true,
            variations: 2,
            hitbox: RectangleHitbox.fromRect(12.49, 4.24),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(1.8, 9.4),
            zIndex: ZIndexes.ObstaclesLayer2,
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Window
        },
        {
            idString: "ship_cabin_window",
            name: "Ship Cabin Window",
            material: "glass",
            health: 20,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: RectangleHitbox.fromRect(1.8, 9.4),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Window
        },
        {
            idString: "bed",
            name: "Bed",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(11.2, 16),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(21.7, 1.5, v(0, -0.4)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(12.13, 4.3, v(0.02, -1.05)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(12, 4.3, v(0, -1.05)),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(12.8, 1.6, v(0, 0)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 1
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(9.2, 1.4, v(-0.8, 0)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Door,
            hingeOffset: v(-5.5, 0)
        },
        {
            idString: "porta_potty_front_wall",
            name: "Porta Potty Front Wall",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(3, 1.6),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(19.2, 1.9, v(0, 1.25)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
            zIndex: ZIndexes.ObstaclesLayer2,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        {
            idString: "porta_potty_toilet_paper_wall",
            name: "Porta Potty Toilet Paper Wall",
            material: "wood",
            health: 100,
            noResidue: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hideOnMap: true,
            hitbox: RectangleHitbox.fromRect(19.2, 1.7, v(0, -1.15)),
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
            zIndex: ZIndexes.ObstaclesLayer2,
            frames: {
                particle: "porta_potty_wall_particle"
            }
        },
        makeConcreteWall(
            "concrete_wall_end",
            "Concrete Wall End",
            RectangleHitbox.fromRect(2.4, 2),
            true
        ),
        makeConcreteWall(
            "concrete_wall_end_broken",
            "Concrete Wall End Broken",
            RectangleHitbox.fromRect(2.4, 2),
            true,
            2
        ),
        makeConcreteWall(
            "concrete_wall_segment",
            "Concrete Wall Segment",
            RectangleHitbox.fromRect(16, 2),
            true
        ),
        makeConcreteWall(
            "concrete_wall_segment_long",
            "Concrete Wall Segment Long",
            RectangleHitbox.fromRect(32, 2),
            true
        ),
        makeConcreteWall(
            "concrete_wall_corner",
            "Concrete Wall Corner",
            RectangleHitbox.fromRect(2, 2),
            true
        ),
        makeConcreteWall(
            "inner_concrete_wall_1",
            "Inner Concrete Wall 1",
            RectangleHitbox.fromRect(10.8, 1.9)
        ),
        makeConcreteWall(
            "inner_concrete_wall_2",
            "Inner Concrete Wall 2",
            RectangleHitbox.fromRect(36.7, 1.9)
        ),
        makeConcreteWall(
            "inner_concrete_wall_3",
            "Inner Concrete Wall 3",
            RectangleHitbox.fromRect(39.14, 1.9)
        ),
        makeConcreteWall(
            "inner_concrete_wall_4",
            "Inner Concrete Wall 4",
            RectangleHitbox.fromRect(47.14, 1.9)
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(57, 1.8, v(-22, -36.1)), // First topmost wall
                RectangleHitbox.fromRect(30.75, 1.8, v(35.38, -36.1)), // Wall after the hole
                RectangleHitbox.fromRect(2, 33.5, v(49.75, -22.25)), // Wall from top right to bottom right
                RectangleHitbox.fromRect(16.25, 2.05, v(42.63, -6.53)), // Wall to the right of the entrance
                RectangleHitbox.fromRect(38.5, 2.05, v(2.25, -6.53)), // Wall to the left of the entrance
                RectangleHitbox.fromRect(2, 21.55, v(-16, 3.23)), // Wall on top of the window
                RectangleHitbox.fromRect(2, 13.5, v(-16, 30.25)), // Wall bellow the window
                RectangleHitbox.fromRect(35.5, 2, v(-32.75, 36.25)), // Bottommost wall
                RectangleHitbox.fromRect(2, 74, v(-49.5, 0)), // Wall from topmost to bottommost
                RectangleHitbox.fromRect(13.3, 2, v(-43.35, 9)), // inner door walls
                RectangleHitbox.fromRect(10.5, 2, v(-21.25, 9))
            ),
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
                spawnMin: 1,
                spawnMax: 1,
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: new CircleHitbox(17.15),
            rotationMode: RotationMode.Full,
            explosion: "large_refinery_barrel_explosion",
            reflectBullets: true,
            zIndex: ZIndexes.ObstaclesLayer5,
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: new CircleHitbox(8.9),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            zIndex: ZIndexes.ObstaclesLayer5,
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: new ComplexHitbox(
                new CircleHitbox(5.22, v(0, -0.65)),
                new CircleHitbox(4.9, v(0, 0.9))
            ),
            rotationMode: RotationMode.Limited,
            reflectBullets: true,
            zIndex: ZIndexes.ObstaclesLayer5,
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.5
            },
            hitbox: new ComplexHitbox(
                new CircleHitbox(3, v(-11.3, -3.85)), // Main tank rounded corners
                new CircleHitbox(3, v(-11.3, -6.55)),
                RectangleHitbox.fromRect(17.5, 3.5, v(-5.55, -5.25)),
                RectangleHitbox.fromRect(14.2, 8.5, v(-3.9, -5.15)), // Main tank
                new CircleHitbox(3.15, v(0.72, 5.62)), // Bottom left circle
                new CircleHitbox(4.4, v(8.95, 5.62)), // Bottom right circle
                new CircleHitbox(5.35, v(8.95, -4.7)), // Top circle
                RectangleHitbox.fromRect(1.8, 3.7, v(0.65, 0.85)), // Pipe connected to bottom left circle
                RectangleHitbox.fromRect(2.6, 1.2, v(8.95, 1)), // Pipe between 2 rightmost circles
                RectangleHitbox.fromRect(1.6, 1.75, v(4.2, 5.53)), // Pipe between 2 bottommost circles
                RectangleHitbox.fromRect(1.9, -2.6, v(4.05, -6.65)) // Pipe connected to topmost circle
            ),
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
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hasLoot: true,
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(8.2, 0.95, v(0, -1.32)), // Base
                RectangleHitbox.fromRect(0.75, 2.75, v(0, 0.48)), // Center post
                RectangleHitbox.fromRect(0.75, 2.75, v(-3.11, 0.48)), // Left post
                RectangleHitbox.fromRect(0.75, 2.75, v(3.17, 0.48)) // Right post
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle"
            }
        },
        {
            idString: "small_house_exterior",
            name: "Small House Exterior",
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
            hitbox: new ComplexHitbox(
                // Right walls
                RectangleHitbox.fromRect(2, 9, v(-31, 26)),
                RectangleHitbox.fromRect(2, 22, v(-31, 0.2)),
                RectangleHitbox.fromRect(2, 9.8, v(-31, -25)),

                // Top walls
                RectangleHitbox.fromRect(19.8, 2, v(22, 29.5)),
                RectangleHitbox.fromRect(8.2, 2, v(-26.00, 29.5)),
                RectangleHitbox.fromRect(14, 2, v(-4.6, 29.5)),

                // Left Wall
                RectangleHitbox.fromRect(2, 32, v(30.9, 13.5)),
                RectangleHitbox.fromRect(2, 16, v(30.9, -20.5)),

                RectangleHitbox.fromRect(12.3, 2, v(25.8, -28.9)), // Bottom Left Wall
                RectangleHitbox.fromRect(39.4, 2, v(-10.45, -28.9)) // Bottom Right Wall
            ),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "wall_particle"
            }
        },
        {
            idString: "truck",
            name: "Truck",
            material: "metal",
            health: 1000,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 1.0
            },
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(20.25, 2.15, v(0, 25.1)), // Front bumper
                RectangleHitbox.fromRect(18.96, 9.2, v(0, 19.4)), // Hood
                RectangleHitbox.fromRect(16.7, 23.5, v(0, 3)), // Cab
                RectangleHitbox.fromRect(4.75, 15.9, v(0, -16.65)), // Fifth wheel
                RectangleHitbox.fromRect(17, 6.9, v(0, -13.2)), // Front-most back wheels
                RectangleHitbox.fromRect(17, 6.9, v(0, -20.7)), // Rearmost back wheels
                RectangleHitbox.fromRect(16.55, 1.6, v(0, -25.35)) // Rear bumper
            ),
            reflectBullets: true,
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.ObstaclesLayer3,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "trailer",
            name: "Trailer",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(14.9, 44.7, v(-0.05, 0)), // Body
                RectangleHitbox.fromRect(15.9, 6.4, v(0, -11.2)), // Front-most back wheels
                RectangleHitbox.fromRect(15.9, 6.4, v(0, -18.2)), // Rearmost back wheels
                RectangleHitbox.fromRect(15.5, 1.5, v(0, -22.5)), // Rear bumper
                RectangleHitbox.fromRect(9.75, 1, v(-0.05, 22.75)) // Front part (idk)
            ),
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.ObstaclesLayer4,
            noResidue: true,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "tango_crate",
            name: "Tango crate",
            material: "wood",
            health: 120,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(15, 6.5),
            rotationMode: RotationMode.Limited,
            hasLoot: true
        },
        {
            idString: "panel_with_a_button",
            name: "Panel with a button",
            material: "metal",
            health: 200,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(10.5, 7.5),
            rotationMode: RotationMode.Limited,
            explosion: "control_panel_explosion",
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "panel_with_the_button_pressed",
            name: "Panel with the button pressed",
            material: "metal",
            health: 200,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(10.5, 7.5),
            rotationMode: RotationMode.Limited,
            explosion: "control_panel_explosion",
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "panel_without_button",
            name: "Panel without button",
            material: "metal",
            health: 200,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(10.5, 7.5),
            rotationMode: RotationMode.Limited,
            explosion: "control_panel_explosion",
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "panel_without_button_small",
            name: "Panel without button small",
            material: "metal",
            health: 200,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(7, 7.5),
            rotationMode: RotationMode.Limited,
            explosion: "control_panel_explosion",
            frames: {
                particle: "barrel_particle",
                residue: "barrel_residue"
            }
        },
        {
            idString: "crane_base_end",
            name: "Crane Base End",
            material: "metal",
            health: 10000,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            zIndex: ZIndexes.Ground,
            hitbox: RectangleHitbox.fromRect(4.5, 1.8),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "crane_base_part",
            name: "Crane Base Part",
            material: "metal",
            health: 10000,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(6.1, 15.5, v(0, 0)), // Middle big rectangle
                RectangleHitbox.fromRect(5.3, 6, v(0, 10.97)), // Top small rectangle
                RectangleHitbox.fromRect(4.2, 1.8, v(0, 14.8)), // Top wheels
                RectangleHitbox.fromRect(5.3, 6, v(0, -10.97)), // Bottom small rectangle
                RectangleHitbox.fromRect(4.2, 1.8, v(0, -14.8)) // Bottom wheels
            ),
            zIndex: ZIndexes.ObstaclesLayer4,
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "crane_base",
            name: "crane base",
            material: "metal",
            health: 10000,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox(
                // Bottom Bottom left
                RectangleHitbox.fromRect(6, 15.5, v(-29.6, 77.7 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, v(-29.6, 66.7 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(-30.8, 62.9 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, v(-28.5, 62.8 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, v(-29.6, 88.6 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(-30.8, 92.6 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, v(-28.5, 92.6 + 0.6)), // Bottom Wheels

                // Top Bottom left
                RectangleHitbox.fromRect(6, 15.5, v(-29.6, 29.5 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, v(-29.6, 18.5 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(-30.8, 14.7 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, v(-28.5, 14.7 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, v(-29.6, 40.4 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(-30.8, 44.4 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, v(-28.5, 44.4 + 0.6)), // Bottom Wheels

                // Bottom Bottom Right
                RectangleHitbox.fromRect(6, 15.5, v(29.6, 77.7 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, v(29.6, 66.7 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(30.8, 62.9 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, v(28.5, 62.8 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, v(29.6, 88.6 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(30.8, 92.6 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, v(28.5, 92.6 + 0.6)), // Bottom Wheels

                // Top Bottom Right
                RectangleHitbox.fromRect(6, 15.5, v(29.6, 29.5 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, v(29.6, 18.5 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(30.8, 14.7 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, v(28.5, 14.7 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, v(29.6, 40.4 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(30.8, 44.4 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, v(28.5, 44.4 + 0.6)), // Bottom Wheels

                // Bottom Top left
                RectangleHitbox.fromRect(6, 15.5, v(-29.6, -82.2 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, v(-29.6, -71.2 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(-30.8, -67.4 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, v(-28.5, -67.3 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, v(-29.6, -93.1 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(-30.8, -97.1 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, v(-28.5, -97.1 + 0.6)), // Bottom Wheels

                // Top Top left
                RectangleHitbox.fromRect(6, 15.5, v(-29.6, -34 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, v(-29.6, -23 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(-30.8, -19.2 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, v(-28.5, -19.2 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, v(-29.6, -44.9 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(-30.8, -48.9 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, v(-28.5, -48.9 + 0.6)), // Bottom Wheels

                // Bottom Top Right
                RectangleHitbox.fromRect(6, 15.5, v(29.6, -82.2 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, v(29.6, -71.2 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(30.8, -67.4 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, v(28.5, -67.3 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, v(29.6, -93.1 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(30.8, -97.1 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, v(28.5, -97.1 + 0.6)), // Bottom Wheels

                // Top Top Right
                RectangleHitbox.fromRect(6, 15.5, v(29.6, -34 + 0.6)), // Middle Big rectangle
                RectangleHitbox.fromRect(5.45, 6, v(29.6, -23 + 0.6)), // Top Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(30.8, -19.2 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(2, 1.8, v(28.5, -19.2 + 0.6)), // Top Wheels
                RectangleHitbox.fromRect(5.45, 6, v(29.6, -44.9 + 0.6)), // Bottom Small rectangle
                RectangleHitbox.fromRect(2, 1.8, v(30.8, -48.9 + 0.6)), // Bottom Wheels
                RectangleHitbox.fromRect(2, 1.8, v(28.5, -48.9 + 0.6)), // Bottom Wheels

                RectangleHitbox.fromRect(4.3, 1.8, v(29.6, -99.5)),
                RectangleHitbox.fromRect(4.3, 1.8, v(-29.6, -99.5)),

                RectangleHitbox.fromRect(4.3, 1.8, v(29.6, 99.5)),
                RectangleHitbox.fromRect(4.3, 1.8, v(-29.6, 99.5))// Top Wheels

            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "generator",
            name: "Generator",
            material: "metal",
            health: 200,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            role: ObstacleSpecialRoles.Activatable,
            activator: "gas_can",
            hitbox: RectangleHitbox.fromRect(9, 7)
        },
        {
            idString: "ship_thing_1",
            name: "Ship thing 1 lol",
            material: "metal",
            health: 200,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(12, 25)
        },
        {
            idString: "ship",
            name: "Ship",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(1, 220, v(48, -20)), // Right wall

                RectangleHitbox.fromRect(1, 66, v(-31, 4.8)), // Left wall (middle)
                RectangleHitbox.fromRect(1, 40, v(-31, 69)), // Left wall (bottom)
                RectangleHitbox.fromRect(1, 90, v(-31, -85)), // Left wall (top)

                RectangleHitbox.fromRect(32.2, 1.2, v(31.7, 81.2)), //bottom
                RectangleHitbox.fromRect(33, 1.2, v(-14.8, 81.2)), //bottom
                RectangleHitbox.fromRect(80, 1, v(8, -128)), //top

                // Tango room bottom walls
                RectangleHitbox.fromRect(80, 26, v(8, 117)),
                RectangleHitbox.fromRect(14.7, 30, v(-24.8, 96)),
                RectangleHitbox.fromRect(13.8, 30, v(41.5, 96))
            )
        },
        {
            idString: "ship_cabin_windows",
            name: "Ship cabin windows",
            material: "metal",
            health: 150,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            zIndex: ZIndexes.ObstaclesLayer1 - 3,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(1.7, 49.8)
        },
        {
            idString: "ship_exterior_long_wall",
            name: "Ship exterior long wall",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(1.7, 29)
        },
        {
            idString: "ship_exterior_medium_wall",
            name: "Ship exterior medium wall",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(1.7, 20)
        },
        {
            idString: "ship_exterior_small_wall",
            name: "Ship exterior small wall",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(1.7, 9)
        },
        {
            idString: "ship_tiny_wall",
            name: "Ship exterior small wall",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(1.7, 7)
        },
        {
            idString: "ship_small_wall",
            name: "Ship exterior small wall",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(1.7, 16)
        },
        {
            idString: "ship_medium_wall",
            name: "Ship exterior small wall",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(1.7, 19.5)
        },
        {
            idString: "ship_medium_wall2",
            name: "Ship exterior small wall",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(1.7, 20.2)
        },
        {
            idString: "ship_long_wall",
            name: "Ship exterior small wall",
            material: "metal",
            health: 150,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            },
            hitbox: RectangleHitbox.fromRect(1.7, 43.5)
        },
        {
            idString: "forklift",
            name: "Forklift",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(8.15, 17.3, v(0, -3.8)),
                RectangleHitbox.fromRect(9.45, 10.6, v(0, -4.9))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "pallet",
            name: "Pallet",
            material: "wood",
            health: 120,
            indestructible: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(0, 0),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "crate_particle"
            },
            noCollisions: true
        },
        {
            idString: "bollard",
            name: "Bollard",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(8.2, 9.2, v(-0.36, 0)),
                new CircleHitbox(3.45, v(1, 0))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "barrier",
            name: "Barrier",
            material: "metal",
            health: 1000,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.9
            },
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(1.2, 31.75, v(-2.2, -2.8)),
                RectangleHitbox.fromRect(2, 5, v(-2.3, 15.4)),
                RectangleHitbox.fromRect(4.71, 6.59, v(0.95, 15.4))
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "metal_particle"
            }
        },
        {
            idString: "port_shed_exterior",
            name: "Port Shed Exterior",
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
            hitbox: new ComplexHitbox(
                RectangleHitbox.fromRect(1.75, 29.5, v(-10.23, -1.7)), // Left wall
                RectangleHitbox.fromRect(1.75, 29.5, v(10.23, -1.7)), // Right wall
                RectangleHitbox.fromRect(20, 1.75, v(0, -15.56)), // Top wall
                RectangleHitbox.fromRect(9, 1.75, v(-5.25, 12.19)) // Bottom wall
            ),
            rotationMode: RotationMode.Limited,
            noResidue: true,
            frames: {
                particle: "rock_particle"
            }
        },
        {
            idString: "port_warehouse_windows",
            name: "Port warehouse windows",
            material: "metal",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(1.5, 24),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "port_warehouse_wall_short",
            name: "Port warehouse short wall",
            material: "metal",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(1.5, 14.5),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "port_warehouse_wall_long",
            name: "Port warehouse long wall",
            material: "metal",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(1.5, 32.2),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "barrel_particle"
            }
        },
        {
            idString: "port_warehouse_wall_superlong",
            name: "Port warehouse long super wall",
            material: "metal",
            health: 1000,
            hideOnMap: true,
            indestructible: true,
            reflectBullets: true,
            scale: {
                spawnMin: 1.0,
                spawnMax: 1.0,
                destroy: 0.7
            },
            hitbox: RectangleHitbox.fromRect(1.5, 56),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "barrel_particle"
            }
        },
        makeContainerWalls(1, "closed"),
        makeContainerWalls(2, "open1", ContainerTints.Green),
        makeContainerWalls(3, "open1", ContainerTints.Blue),
        makeContainerWalls(4, "open2", ContainerTints.Blue),
        makeContainerWalls(5, "open1", ContainerTints.Yellow),
        makeContainerWalls(6, "open2", ContainerTints.Yellow)
    ]
);
