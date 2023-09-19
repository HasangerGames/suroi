import { type Orientation, type Variation } from "../typings";
import { type Hitbox, RectangleHitbox, ComplexHitbox, CircleHitbox } from "../utils/hitbox";
import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { randomBoolean, weightedRandom } from "../utils/random";
import { type Vector, v } from "../utils/vector";

// TODO: Add more properties like actual color, speed multiplier (for like water floors) etc
export interface FloorDefinition {
    debugColor: number
}

export const FloorTypes: Record<string, FloorDefinition> = {
    grass: {
        debugColor: 0x005500
    },
    stone: {
        debugColor: 0x121212
    },
    wood: {
        debugColor: 0x7f5500
    }
};

interface BuildingObstacle {
    id: string
    position: Vector
    rotation?: number
    variation?: Variation
    scale?: number
    lootSpawnOffset?: Vector
}

interface LootSpawner {
    position: Vector
    table: string
}

interface SubBuilding {
    id: string
    position: Vector
    orientation?: Orientation
}

export interface BuildingDefinition extends ObjectDefinition {
    spawnHitbox: Hitbox
    ceilingHitbox: Hitbox
    scopeHitbox: Hitbox
    hideOnMap?: boolean

    obstacles: BuildingObstacle[]
    lootSpawners?: LootSpawner[]
    subBuildings?: SubBuilding[]

    floorImages: Array<{
        key: string
        position: Vector
    }>
    ceilingImages: Array<{
        key: string
        position: Vector
        residue?: string
    }>

    // How many walls need to be broken to destroy the ceiling
    wallsToDestroy?: number

    floors: Array<{
        type: string
        hitbox: Hitbox
    }>

    groundGraphics?: Array<{
        color: number
        bounds: Hitbox
    }>
}

export const Buildings = new ObjectDefinitions<BuildingDefinition>([
    {
        idString: "porta_potty",
        name: "Porta Potty",
        spawnHitbox: new RectangleHitbox(v(-10, -12), v(10, 20)),
        ceilingHitbox: new RectangleHitbox(v(-7, -9), v(7, 9)),
        scopeHitbox: new RectangleHitbox(v(-7, -9), v(7, 9)),
        floorImages: [{
            key: "porta_potty_floor",
            position: v(0, 1.5)
        }],
        ceilingImages: [{
            key: "porta_potty_ceiling",
            position: v(0, 0),
            residue: "porta_potty_residue"
        }],
        wallsToDestroy: 2,
        floors: [
            {
                type: "wood",
                hitbox: new RectangleHitbox(v(-7, -9), v(7, 9))
            }
        ],
        obstacles: [
            {
                get id() {
                    return weightedRandom(["porta_potty_toilet_open", "porta_potty_toilet_closed"], [0.7, 0.3]);
                },
                position: v(0, -5),
                rotation: 0
            },
            {
                id: "porta_potty_back_wall",
                position: v(0, -8.7),
                rotation: 0
            },
            {
                id: "porta_potty_sink_wall",
                position: v(-5.65, 0),
                rotation: 3
            },
            {
                id: "porta_potty_toilet_paper_wall",
                position: v(5.7, 0),
                rotation: 3
            },
            {
                id: "porta_potty_door",
                position: v(2.2, 8.8),
                rotation: 0
            },
            {
                id: "porta_potty_front_wall",
                position: v(-4.6, 8.7),
                rotation: 2
            }
        ]
    },
    {
        idString: "house",
        name: "House",
        spawnHitbox: new ComplexHitbox([
            new RectangleHitbox(v(11, -40), v(52, 11)), // Garage
            new RectangleHitbox(v(-52, -40), v(16, 28)), // Main House
            new RectangleHitbox(v(-45, 23), v(-17, 40)) // Doorstep
        ]),
        ceilingHitbox: new ComplexHitbox([
            new RectangleHitbox(v(12, -36.5), v(46.5, 5.5)), // Garage
            new RectangleHitbox(v(-47.5, -36.5), v(13, 19.5)), // Main House
            new RectangleHitbox(v(-42, 19), v(-21, 35)), // Doorstep
            new CircleHitbox(5, v(-1.5, -37)), // Living room window
            new CircleHitbox(5, v(-28.5, -37)), // Bedroom window
            new CircleHitbox(5, v(-47.5, -8.5)) // Dining Room Window
        ]),
        scopeHitbox: new ComplexHitbox([
            new RectangleHitbox(v(12, -36.5), v(46.5, 5.5)), // Garage
            new RectangleHitbox(v(-47.5, -36.5), v(13, 19.5)), // Main House
            new RectangleHitbox(v(-39, 19), v(-24, 30)) // Doorstep
        ]),
        floorImages: [{
            key: "house_floor",
            position: v(0, 0)
        }],
        ceilingImages: [{
            key: "house_ceiling",
            position: v(0, -1.5)
        }],
        floors: [
            {
                type: "stone",
                hitbox: new ComplexHitbox([new RectangleHitbox(v(13, -36), v(46, 5.5))]) // Garage
            },
            {
                type: "wood",
                hitbox: new ComplexHitbox([
                    new RectangleHitbox(v(-48, -37), v(12, 19)), // Main House
                    new RectangleHitbox(v(-40.8, 20), v(-22, 34)) // Doorstep
                ])
            }
        ],
        obstacles: [
            // Bathroom Left
            {
                id: "house_wall_4",
                position: v(-3.6, 8.5),
                rotation: 1
            },
            // Bathroom Top
            {
                id: "house_wall_1",
                position: v(-2.6, -2.8),
                rotation: 0
            },
            // Entrance Right
            {
                id: "house_wall_4",
                position: v(-25.2, 8.5),
                rotation: 1
            },
            // Kitchen Top
            {
                id: "house_wall_1",
                position: v(-21.65, -2.8),
                rotation: 0
            },
            // Living Room Bottom Right
            {
                id: "house_wall_3",
                position: v(6.35, -14.5),
                rotation: 0
            },
            // Living Room Left
            {
                id: "house_wall_2",
                position: v(-18.25, -25.6),
                rotation: 1
            },
            // Bedroom Bottom Left
            {
                id: "house_wall_3",
                position: v(-41, -14.5),
                rotation: 0
            },
            // Bedroom Bottom Right/Living Room Bottom Left
            {
                id: "house_wall_5",
                position: v(-17.28, -14.5),
                rotation: 0
            },
            {
                get id() {
                    return weightedRandom(["toilet", "used_toilet"], [0.7, 0.3]);
                },
                position: v(7, 14.4),
                rotation: 2
            },
            {
                id: "stove",
                position: v(-9.3, 15.3),
                rotation: 2
            },
            {
                id: "fridge",
                position: v(-19.5, 15.3),
                rotation: 2
            },
            // Living Room Couch
            {
                id: "couch",
                position: v(-13.3, -26),
                rotation: 0
            },
            // Living Room Large Drawers
            {
                id: "large_drawer",
                position: v(8.2, -26),
                rotation: 3
            },
            // Living Room TV
            {
                id: "tv",
                position: v(11.5, -26),
                rotation: 0
            },
            // House Exterior
            {
                id: "house_exterior",
                position: v(0, -2.6),
                rotation: 0
            },
            // Chair Bottom
            {
                id: "chair",
                position: v(-41, 13),
                rotation: 0
            },
            // Chair Top
            {
                id: "chair",
                position: v(-41, 3),
                rotation: 2
            },
            {
                id: "table",
                position: v(-41, 8),
                rotation: 0
            },
            {
                id: "bed",
                position: v(-40.6, -27.5),
                rotation: 0
            },
            // Bedroom Bookshelf
            {
                id: "bookshelf",
                position: v(-21.6, -29.25),
                rotation: 1
            },
            // Bedroom Drawer
            {
                id: "small_drawer",
                position: v(-23, -19.3),
                rotation: 3
            },
            // Toilet Bookshelf
            {
                id: "bookshelf",
                position: v(-0.2, 12.5),
                rotation: 1
            },
            // Garage Washing Machine
            {
                id: "washing_machine",
                position: v(18.7, -31.9),
                rotation: 0
            },
            // Garage Crate
            {
                id: "regular_crate",
                position: v(41.5, -30.9),
                rotation: 0
            },
            // Garage Barrel
            {
                id: "barrel",
                position: v(41.5, -20),
                rotation: 0
            },
            // Garage Bookshelf
            {
                id: "bookshelf",
                position: v(44.05, -1.55),
                rotation: 1
            },
            // Garage Door
            {
                id: "garage_door",
                position: v(30.18, 6.5),
                rotation: 0
            },
            // Front Door
            {
                id: "door",
                position: v(-30.85, 20),
                rotation: 0
            },
            // Bedroom Door
            {
                id: "door",
                position: v(-29.85, -14.5),
                rotation: 0
            },
            // Living Room Door
            {
                id: "door",
                position: v(-3.85, -14.5),
                rotation: 0
            },
            // Kitchen Door
            {
                id: "door",
                position: v(-12.6, -2.8),
                rotation: 2
            },
            // Door to Garage
            {
                id: "door",
                position: v(13, -8.1),
                rotation: 3
            },
            // Bathroom Door
            {
                id: "door",
                position: v(6.5, -2.8),
                rotation: 2
            },
            // Living Room Window
            {
                id: "window",
                position: v(-1.4, -36.75),
                rotation: 1
            },
            // Bedroom Window
            {
                id: "window",
                position: v(-28.65, -36.75),
                rotation: 1
            },
            // Dining Room Window
            {
                id: "window",
                position: v(-47.35, -8.35),
                rotation: 0
            }
        ]
    },
    {
        idString: "warehouse",
        name: "Warehouse",
        spawnHitbox: new RectangleHitbox(v(-30, -44), v(30, 44)),
        ceilingHitbox: new RectangleHitbox(v(-20, -40), v(20, 40)),
        scopeHitbox: new RectangleHitbox(v(-20, -35), v(20, 35)),
        floorImages: [{
            key: "warehouse_floor",
            position: v(0, 0)
        }],
        ceilingImages: [{
            key: "warehouse_ceiling",
            position: v(0, -1.5)
        }],
        floors: [
            {
                type: "stone",
                hitbox: new RectangleHitbox(v(-20, -38), v(20, 38))
            }
        ],
        obstacles: [
            {
                id: "warehouse_wall_1",
                position: v(-20, 0),
                rotation: 1
            },
            {
                id: "warehouse_wall_1",
                position: v(20, 0),
                rotation: 1
            },
            {
                id: "warehouse_wall_2",
                position: v(14, -34.4),
                rotation: 0
            },
            {
                id: "warehouse_wall_2",
                position: v(-14, -34.4),
                rotation: 0
            },
            {
                id: "warehouse_wall_2",
                position: v(14, 34.4),
                rotation: 0
            },
            {
                id: "warehouse_wall_2",
                position: v(-14, 34.4),
                rotation: 0
            },
            {
                id: "regular_crate",
                position: v(14, -28.5)
            },
            {
                id: "regular_crate",
                position: v(-14, -28.5)
            },
            {
                // TODO: better way of adding random obstacles
                get id() {
                    return weightedRandom(["regular_crate", "flint_crate"], [0.7, 0.3]);
                },
                position: v(-14, 28.5)
            },
            {
                id: "barrel",
                position: v(14.6, 29.2)
            },
            {
                id: "metal_shelf",
                position: v(-16, 0),
                rotation: 1
            },
            {
                id: "box",
                position: v(-15.7, 0),
                lootSpawnOffset: v(5, 0)
            },
            {
                id: "box",
                position: v(-15.8, 6.4),
                lootSpawnOffset: v(5, 0)
            },
            {
                id: "box",
                position: v(-15.7, -8),
                lootSpawnOffset: v(5, 0)
            },
            {
                id: "metal_shelf",
                position: v(16, 0),
                rotation: 1
            },
            {
                id: "box",
                position: v(15.8, 0),
                lootSpawnOffset: v(-5, 0)
            },
            {
                id: "box",
                position: v(15.7, 6),
                lootSpawnOffset: v(-5, 0)
            },
            {
                id: "box",
                position: v(15.6, -7),
                lootSpawnOffset: v(-5, 0)
            }
        ],

        lootSpawners: [
            {
                position: v(0, 0),
                table: "warehouse"
            }
        ]
    },
    {
        idString: "refinery",
        name: "Refinery",
        spawnHitbox: new RectangleHitbox(v(-57, -44), v(127, 87)),
        scopeHitbox: new ComplexHitbox([
            new RectangleHitbox(v(-49.5, -36), v(-16, 36)),
            new RectangleHitbox(v(-16, -36), v(49.5, -6.5))
        ]),
        ceilingHitbox: new ComplexHitbox([
            new RectangleHitbox(v(-49.5, -36), v(-16, 36)),
            new RectangleHitbox(v(-16, -36), v(49.5, -6.5)),
            new RectangleHitbox(v(22, -7), v(35, 0)), // door
            new CircleHitbox(5, v(-16, 18.5)) // window
        ]),
        floorImages: [
            {
                key: "refinery_floor",
                position: v(0, 0)
            }
        ],
        ceilingImages: [
            {
                key: "refinery_ceiling",
                position: v(0, 0)
            }
        ],
        groundGraphics: [
            { color: 0x595959, bounds: new RectangleHitbox(v(-53, -40), v(123, 83)) }, // base
            { color: 0xb2b200, bounds: new CircleHitbox(21, v(45.5, 59.1)) }, // circles
            { color: 0x505050, bounds: new CircleHitbox(19, v(45.5, 59.1)) },
            { color: 0xb2b200, bounds: new CircleHitbox(21, v(97, 59.1)) },
            { color: 0x505050, bounds: new CircleHitbox(19, v(97, 59.1)) },
            { color: 0xb2b200, bounds: new RectangleHitbox(v(-10, 2), v(-8, 83)) }, // roads
            { color: 0xb2b200, bounds: new RectangleHitbox(v(-10 + 25, 2 + 22), v(-8 + 25, 83)) },
            { color: 0xb2b200, bounds: new RectangleHitbox(v(-10, 2), v(123, 4)) },
            { color: 0xb2b200, bounds: new RectangleHitbox(v(-10 + 25, 2 + 22), v(123, 4 + 22)) }
        ],
        floors: [
            {
                type: "wood",
                hitbox: new RectangleHitbox(v(-49.5, 9), v(-16, 36))
            },
            {
                type: "stone",
                hitbox: new RectangleHitbox(v(-53, -40), v(123, 83))
            }
        ],
        obstacles: [
            {
                id: "refinery_walls",
                position: v(0, 0),
                rotation: 0
            },
            //
            // Inner room obstacles
            //
            {
                id: "window",
                position: v(-16, 18.5),
                rotation: 0
            },
            {
                id: "door",
                position: v(-31.15, 9.2),
                rotation: 0
            },
            {
                id: "table",
                position: v(-22, 28),
                rotation: 0
            },
            {
                id: "chair",
                position: v(-26, 28),
                rotation: 3
            },
            {
                id: "gun_mount",
                position: v(-46.8, 28),
                rotation: 1
            },
            //
            // Building obstacles
            //
            {
                id: "small_refinery_barrel",
                position: v(41.3, -14.8)
            },
            {
                id: "distillation_column",
                position: v(42.7, -28),
                rotation: 0
            },
            {
                id: "distillation_column",
                position: v(-42.65, 1),
                rotation: 0
            },
            {
                id: "distillation_equipment",
                position: v(0, -18),
                rotation: 2
            },
            {
                id: "smokestack",
                position: v(-39, -25.59)
            },
            {
                get id(): string {
                    return randomBoolean() ? "barrel" : "super_barrel";
                },
                position: v(-26, -30)
            },
            {
                get id(): string {
                    return randomBoolean() ? "barrel" : "super_barrel";
                },
                position: v(-21.5, 4)
            },
            {
                id: "regular_crate",
                position: v(28.75, -30)
            },
            {
                id: "regular_crate",
                position: v(-43, -11)
            },
            //
            // Outside obstacles
            //
            // Bottom left
            {
                id: "oil_tank",
                position: v(-38, 73),
                rotation: 0
            },
            {
                id: "barrel",
                position: v(-20.5, 77.5),
                rotation: 0
            },
            {
                id: "barrel",
                position: v(-21.5, 67),
                rotation: 0
            },
            {
                id: "regular_crate",
                position: v(-46.5, 45.5)
            },
            {
                id: "regular_crate",
                position: v(-36, 48)
            },
            // Bottom right
            {
                id: "large_refinery_barrel",
                position: v(45.5, 59.1)
            },
            {
                id: "large_refinery_barrel",
                position: v(97, 59.2)
            },
            {
                id: "regular_crate",
                position: v(69, 62)
            },
            {
                id: "aegis_crate",
                position: v(64, 75)
            },
            {
                id: "aegis_crate",
                position: v(77, 73)
            },
            {
                id: "barrel",
                position: v(117.5, 77.5)
            },
            {
                id: "regular_crate",
                position: v(117, 40)
            },
            {
                id: "super_barrel",
                position: v(27.5, 39)
            },
            {
                id: "barrel",
                position: v(-10, 0)
            },
            // Top right
            {
                id: "oil_tank",
                position: v(113, -25),
                rotation: 1
            },
            {
                id: "barrel",
                position: v(117.5, -7)
            },
            {
                id: "regular_crate",
                position: v(95, -33)
            },
            {
                id: "aegis_crate",
                position: v(76.25, -33.5)
            },
            {
                id: "super_barrel",
                position: v(85.25, -33.5)
            },
            {
                get id(): string {
                    return randomBoolean() ? "barrel" : "super_barrel";
                },
                position: v(83, -25)
            },
            {
                id: "super_barrel",
                position: v(75, -23)
            },
            {
                id: "regular_crate",
                position: v(76.25, -12)
            },
            //
            // Inner walls
            //
            // Top right
            { id: "inner_concrete_wall_1", position: v(116.75, -1.5), rotation: 0 },
            { id: "inner_concrete_wall_1", position: v(106.05, -1.5), rotation: 0 },
            { id: "inner_concrete_wall_2", position: v(70.05, -20.75), rotation: 1 },
            { id: "inner_concrete_wall_1", position: v(74.5, -1.5), rotation: 0 },
            // Bottom right
            { id: "inner_concrete_wall_1", position: v(116.75, 34), rotation: 0 },
            { id: "inner_concrete_wall_1", position: v(106.05, 34), rotation: 0 },
            { id: "inner_concrete_wall_1", position: v(95.35, 34), rotation: 0 },
            { id: "inner_concrete_wall_1", position: v(47.84, 34), rotation: 0 },
            { id: "inner_concrete_wall_1", position: v(37.14, 34), rotation: 0 },
            { id: "inner_concrete_wall_1", position: v(26.44, 34), rotation: 0 },
            { id: "inner_concrete_wall_4", position: v(22, 58.5), rotation: 1 },
            // Bottom left
            { id: "inner_concrete_wall_3", position: v(-32.45, 39), rotation: 0 },
            { id: "inner_concrete_wall_1", position: v(-15, 76.65), rotation: 1 },
            { id: "inner_concrete_wall_1", position: v(-15, 65.95), rotation: 1 },
            //
            // Outer walls
            //
            // Bottom left walls
            { id: "concrete_wall_end", position: v(-15, 83), rotation: 0 },
            { id: "concrete_wall_segment_long", position: v(-32, 83), rotation: 0 },
            { id: "concrete_wall_segment", position: v(-44.3, 83), rotation: 0 },
            { id: "concrete_wall_corner", position: v(-53, 83), rotation: 0 },
            { id: "concrete_wall_segment", position: v(-53, 74.4), rotation: 1 },
            { id: "concrete_wall_end_broken", position: v(-53, 65.5), rotation: 1 },
            // Wall from bottom left to top left
            { id: "concrete_wall_end_broken", position: v(-53, 44), rotation: 3 },
            { id: "concrete_wall_segment_long", position: v(-53, 28), rotation: 3 },
            { id: "concrete_wall_segment_long", position: v(-53, 0), rotation: 3 },
            { id: "concrete_wall_segment_long", position: v(-53, -23.3), rotation: 3 },
            // Top left corner
            { id: "concrete_wall_corner", position: v(-53, -40), rotation: 3 },
            { id: "concrete_wall_segment_long", position: v(-36.3, -40), rotation: 0 },
            { id: "concrete_wall_segment_long", position: v(-10, -40), rotation: 0 },
            { id: "concrete_wall_end_broken", position: v(7, -40), rotation: 0 },
            { id: "concrete_wall_end_broken", position: v(20, -40), rotation: 2 },
            { id: "concrete_wall_segment_long", position: v(36, -40), rotation: 0 },
            { id: "concrete_wall_segment_long", position: v(65, -40), rotation: 0 },
            { id: "concrete_wall_end_broken", position: v(82, -40), rotation: 0 },
            { id: "concrete_wall_end_broken", position: v(106, -40), rotation: 2 },
            { id: "concrete_wall_segment", position: v(114.2, -40), rotation: 2 },
            // Top right corner
            { id: "concrete_wall_corner", position: v(123, -40), rotation: 2 },
            { id: "concrete_wall_segment_long", position: v(123, -23.2), rotation: 1 },
            { id: "concrete_wall_segment", position: v(123, -10), rotation: 1 },
            { id: "concrete_wall_end", position: v(123, -1.5), rotation: 3 },
            { id: "concrete_wall_end", position: v(123, 29.5), rotation: 1 },
            { id: "concrete_wall_segment_long", position: v(123, 46), rotation: 1 },
            { id: "concrete_wall_segment_long", position: v(123, 66.3), rotation: 1 },
            // Bottom right corner
            { id: "concrete_wall_corner", position: v(123, 83), rotation: 1 },
            { id: "concrete_wall_segment_long", position: v(106.3, 83), rotation: 0 },
            { id: "concrete_wall_segment_long", position: v(76, 83), rotation: 0 },
            { id: "concrete_wall_segment_long", position: v(47, 83), rotation: 0 },
            { id: "concrete_wall_segment", position: v(30, 83), rotation: 0 },
            { id: "concrete_wall_end", position: v(22, 83), rotation: 2 }
        ],
        subBuildings: [
            {
                id: "porta_potty",
                position: v(59.75, -27.6)
            }
        ]
    }
]);
