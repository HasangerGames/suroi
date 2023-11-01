import { type Orientation, type Variation } from "../typings";
import { CircleHitbox, ComplexHitbox, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { type FloorTypes } from "../utils/mapUtils";
import { ObjectDefinitions, type ObjectDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { v, type Vector } from "../utils/vector";
import { type ObstacleDefinition, type RotationMode } from "./obstacles";
import { ZIndexes } from "../constants";

interface BuildingObstacle {
    readonly idString: ReferenceTo<ObstacleDefinition> | Record<ReferenceTo<ObstacleDefinition>, number>
    readonly position: Vector
    readonly rotation?: number
    readonly variation?: Variation
    readonly scale?: number
    readonly lootSpawnOffset?: Vector
}

interface LootSpawner {
    readonly position: Vector
    readonly table: string
}

interface SubBuilding {
    readonly idString: ReferenceTo<BuildingDefinition> | Record<ReferenceTo<BuildingDefinition>, number>
    readonly position: Vector
    readonly orientation?: Orientation
}

interface BuildingDecal {
    readonly id: string
    readonly position: Vector
    readonly rotation?: Orientation
    readonly scale?: number
}

export interface BuildingDefinition extends ObjectDefinition {
    readonly spawnHitbox: Hitbox
    readonly ceilingHitbox?: Hitbox
    readonly scopeHitbox?: Hitbox
    readonly hideOnMap?: boolean

    readonly obstacles?: BuildingObstacle[]
    readonly lootSpawners?: LootSpawner[]
    readonly subBuildings?: SubBuilding[]
    readonly decals?: BuildingDecal[]

    readonly floorImages?: Array<{
        readonly key: string
        readonly position: Vector
        readonly tint?: number
    }>

    readonly ceilingImages?: Array<{
        readonly key: string
        readonly position: Vector
        readonly residue?: string
        readonly tint?: number
    }>
    readonly ceilingZIndex?: number

    // How many walls need to be broken to destroy the ceiling
    readonly wallsToDestroy?: number

    readonly floors?: Array<{
        readonly type: keyof typeof FloorTypes
        readonly hitbox: Hitbox
    }>

    readonly groundGraphics?: Array<{
        readonly color: number
        readonly hitbox: Hitbox
    }>

    readonly rotationMode?: RotationMode.Limited | RotationMode.Binary | RotationMode.None
}

function makeContainer(id: number, tint: number, wallsID: number, open: "open2" | "open1" | "closed", damaged?: boolean): BuildingDefinition {
    let spawnHitbox: Hitbox;
    let ceilingHitbox: Hitbox | undefined;
    switch (open) {
        case "open2":
            spawnHitbox = RectangleHitbox.fromRect(16, 39.9);
            ceilingHitbox = RectangleHitbox.fromRect(14, 37.9);
            break;
        case "open1":
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, v(0, 7));
            ceilingHitbox = RectangleHitbox.fromRect(14, 32.9, v(0, 5));
            break;
        case "closed":
        default:
            spawnHitbox = RectangleHitbox.fromRect(16, 30);
            break;
    }

    return {
        idString: `container_${id}`,
        name: `Container ${id}`,
        spawnHitbox,
        ceilingHitbox,
        scopeHitbox: RectangleHitbox.fromRect(13.9, 27.9),
        ceilingImages: [{
            key: `container_ceiling_${open}${damaged ? "_damaged" : ""}`,
            position: v(0, 0),
            tint
        }],
        floors: [
            {
                type: "metal",
                hitbox: RectangleHitbox.fromRect(14, 28)
            }
        ],
        obstacles: [
            {
                idString: `container_walls_${wallsID}`,
                position: v(0, 0),
                rotation: 0
            }
        ],
        lootSpawners: open === "closed"
            ? undefined
            : [{
                position: v(0, 0),
                table: "ground_loot"
            }]
    };
}
export const ContainerTints = {
    White: 0xc0c0c0,
    Red: 0xa32900,
    Green: 0x00a30e,
    Blue: 0x005fa3,
    Yellow: 0xcccc00
};

const randomContainer1 = {
    container_1: 1,
    container_2: 2,
    container_3: 3,
    container_4: 4,
    container_5: 3,
    container_6: 4,
    container_7: 3,
    container_8: 4,
    container_10: 3
};

const randomContainer2 = {
    ...randomContainer1,
    container_11: 7
};

export const Buildings = new ObjectDefinitions<BuildingDefinition>([
    {
        idString: "porta_potty",
        name: "Porta Potty",
        spawnHitbox: RectangleHitbox.fromRect(20, 32),
        ceilingHitbox: RectangleHitbox.fromRect(14, 18),
        scopeHitbox: RectangleHitbox.fromRect(14, 18),
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
                hitbox: RectangleHitbox.fromRect(14, 18)
            }
        ],
        obstacles: [
            {
                idString: {
                    porta_potty_toilet_open: 0.7,
                    porta_potty_toilet_closed: 0.3
                },
                position: v(0, -5),
                rotation: 0
            },
            {
                idString: "porta_potty_back_wall",
                position: v(0, -8.7),
                rotation: 0
            },
            {
                idString: "porta_potty_sink_wall",
                position: v(-5.65, 0),
                rotation: 3
            },
            {
                idString: "porta_potty_toilet_paper_wall",
                position: v(5.7, 0),
                rotation: 3
            },
            {
                idString: "porta_potty_door",
                position: v(2.2, 8.8),
                rotation: 0
            },
            {
                idString: "porta_potty_front_wall",
                position: v(-4.6, 8.7),
                rotation: 2
            }
        ]
    },
    {
        idString: "house",
        name: "House",
        spawnHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(41, 51, v(31.50, -14.50)), // Garage
            RectangleHitbox.fromRect(68, 68, v(-18, -6)), // Main House
            RectangleHitbox.fromRect(28, 17, v(-31, 31.50)) // Doorstep
        ),
        ceilingHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(34.50, 42, v(29.25, -15.50)), // Garage
            RectangleHitbox.fromRect(60.50, 56, v(-17.25, -8.50)), // Main House
            RectangleHitbox.fromRect(21, 16, v(-31.50, 27)), // Doorstep
            new CircleHitbox(5, v(-1.5, -37)), // Living room window
            new CircleHitbox(5, v(-28.5, -37)), // Bedroom window
            new CircleHitbox(5, v(-47.5, -8.5)) // Dining Room Window
        ),
        scopeHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(34.50, 42, v(29.25, -15.50)), // Garage
            RectangleHitbox.fromRect(60.50, 56, v(-17.25, -8.50)), // Main House
            RectangleHitbox.fromRect(15, 11, v(-31.50, 24.50)) // Doorstep
        ),
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
                hitbox: RectangleHitbox.fromRect(33, 41.50, v(29.50, -15.25)) // Garage
            },
            {
                type: "wood",
                hitbox: new ComplexHitbox(
                    RectangleHitbox.fromRect(60, 56, v(-18, -9)), // Main House
                    RectangleHitbox.fromRect(18.80, 14, v(-31.40, 27)) // Doorstep
                )
            }
        ],
        obstacles: [
            // Bathroom Left
            {
                idString: "house_wall_4",
                position: v(-3.6, 8.5),
                rotation: 1
            },
            // Bathroom Top
            {
                idString: "house_wall_1",
                position: v(-2.6, -2.8),
                rotation: 0
            },
            // Entrance Right
            {
                idString: "house_wall_4",
                position: v(-25.2, 8.5),
                rotation: 1
            },
            // Kitchen Top
            {
                idString: "house_wall_1",
                position: v(-21.65, -2.8),
                rotation: 0
            },
            // Living Room Bottom Right
            {
                idString: "house_wall_3",
                position: v(6.35, -14.5),
                rotation: 0
            },
            // Living Room Left
            {
                idString: "house_wall_2",
                position: v(-18.25, -25.6),
                rotation: 1
            },
            // Bedroom Bottom Left
            {
                idString: "house_wall_3",
                position: v(-41, -14.5),
                rotation: 0
            },
            // Bedroom Bottom Right/Living Room Bottom Left
            {
                idString: "house_wall_5",
                position: v(-17.28, -14.5),
                rotation: 0
            },
            {
                idString: {
                    toilet: 0.7,
                    used_toilet: 0.3
                },
                position: v(7, 14.4),
                rotation: 2
            },
            {
                idString: "stove",
                position: v(-9.3, 15.3),
                rotation: 2
            },
            {
                idString: "fridge",
                position: v(-19.5, 15.3),
                rotation: 2
            },
            // Living Room Couch
            {
                idString: "couch",
                position: v(-13.3, -26),
                rotation: 0
            },
            // Living Room Large Drawers
            {
                idString: "large_drawer",
                position: v(8.2, -26),
                rotation: 3
            },
            // Living Room TV
            {
                idString: "tv",
                position: v(11.5, -26),
                rotation: 0
            },
            // House Exterior
            {
                idString: "house_exterior",
                position: v(0, -2.6),
                rotation: 0
            },
            // Chair Bottom
            {
                idString: "chair",
                position: v(-41, 13),
                rotation: 0
            },
            // Chair Top
            {
                idString: "chair",
                position: v(-41, 3),
                rotation: 2
            },
            {
                idString: "table",
                position: v(-41, 8),
                rotation: 0
            },
            {
                idString: "bed",
                position: v(-40.6, -27.5),
                rotation: 0
            },
            // Bedroom Bookshelf
            {
                idString: "bookshelf",
                position: v(-21.6, -29.25),
                rotation: 1
            },
            // Bedroom Drawer
            {
                idString: "small_drawer",
                position: v(-23, -19.3),
                rotation: 3
            },
            // Toilet Bookshelf
            {
                idString: "bookshelf",
                position: v(-0.2, 12.5),
                rotation: 1
            },
            // Garage Washing Machine
            {
                idString: "washing_machine",
                position: v(18.7, -31.9),
                rotation: 0
            },
            // Garage Crate
            {
                idString: "regular_crate",
                position: v(41.5, -30.9),
                rotation: 0
            },
            // Garage Barrel
            {
                idString: "barrel",
                position: v(41.5, -20),
                rotation: 0
            },
            // Garage Bookshelf
            {
                idString: "bookshelf",
                position: v(44.05, -1.55),
                rotation: 1
            },
            // Garage Door
            {
                idString: "garage_door",
                position: v(30.18, 6.5),
                rotation: 0
            },
            // Front Door
            {
                idString: "door",
                position: v(-30.85, 20),
                rotation: 0
            },
            // Bedroom Door
            {
                idString: "door",
                position: v(-29.85, -14.5),
                rotation: 0
            },
            // Living Room Door
            {
                idString: "door",
                position: v(-3.85, -14.5),
                rotation: 0
            },
            // Kitchen Door
            {
                idString: "door",
                position: v(-12.6, -2.8),
                rotation: 2
            },
            // Door to Garage
            {
                idString: "door",
                position: v(13, -8.1),
                rotation: 3
            },
            // Bathroom Door
            {
                idString: "door",
                position: v(6.5, -2.8),
                rotation: 2
            },
            // Living Room Window
            {
                idString: "window",
                position: v(-1.4, -36.75),
                rotation: 1
            },
            // Bedroom Window
            {
                idString: "window",
                position: v(-28.65, -36.75),
                rotation: 1
            },
            // Dining Room Window
            {
                idString: "window",
                position: v(-47.35, -8.35),
                rotation: 0
            }
        ]
    },
    {
        idString: "warehouse",
        name: "Warehouse",
        spawnHitbox: RectangleHitbox.fromRect(60, 88),
        ceilingHitbox: RectangleHitbox.fromRect(40, 80),
        scopeHitbox: RectangleHitbox.fromRect(40, 70),
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
                hitbox: RectangleHitbox.fromRect(40, 88)
            }
        ],
        obstacles: [
            {
                idString: "warehouse_wall_1",
                position: v(-20, 0),
                rotation: 1
            },
            {
                idString: "warehouse_wall_1",
                position: v(20, 0),
                rotation: 1
            },
            {
                idString: "warehouse_wall_2",
                position: v(14, -34.4),
                rotation: 0
            },
            {
                idString: "warehouse_wall_2",
                position: v(-14, -34.4),
                rotation: 0
            },
            {
                idString: "warehouse_wall_2",
                position: v(14, 34.4),
                rotation: 0
            },
            {
                idString: "warehouse_wall_2",
                position: v(-14, 34.4),
                rotation: 0
            },
            {
                idString: "regular_crate",
                position: v(14, -28.5)
            },
            {
                idString: "regular_crate",
                position: v(-14, -28.5)
            },
            {
                idString: {
                    regular_crate: 0.7,
                    flint_crate: 0.3
                },
                position: v(-14, 28.5)
            },
            {
                idString: "barrel",
                position: v(14.6, 29.2)
            },
            {
                idString: "metal_shelf",
                position: v(-16, 0),
                rotation: 1
            },
            {
                idString: "box",
                position: v(-15.7, 0),
                lootSpawnOffset: v(5, 0)
            },
            {
                idString: "box",
                position: v(-15.8, 6.4),
                lootSpawnOffset: v(5, 0)
            },
            {
                idString: "box",
                position: v(-15.7, -8),
                lootSpawnOffset: v(5, 0)
            },
            {
                idString: "metal_shelf",
                position: v(16, 0),
                rotation: 1
            },
            {
                idString: "box",
                position: v(15.8, 0),
                lootSpawnOffset: v(-5, 0)
            },
            {
                idString: "box",
                position: v(15.7, 6),
                lootSpawnOffset: v(-5, 0)
            },
            {
                idString: "box",
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
        idString: "port_warehouse",
        name: "Port Warehouse",
        spawnHitbox: RectangleHitbox.fromRect(70.00, 130.00),
        ceilingHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(60.00, 120.00),
            RectangleHitbox.fromRect(12, 30, v(29.3, -30.3)),
            RectangleHitbox.fromRect(12, 30, v(29.3, 30.4))
        ),
        scopeHitbox: RectangleHitbox.fromRect(55.00, 115.00),
        floorImages: [{
            key: "port_warehouse_floor",
            position: v(0, 0)
        }],
        ceilingImages: [{
            key: "port_warehouse_ceiling",
            position: v(0, 0)
        }],
        obstacles: [
            {
                idString: "port_warehouse_wall_short",
                position: v(29.3, -51),
                rotation: 0,
                scale: 1.076
            },
            {
                idString: "port_warehouse_wall_short",
                position: v(-29.3, -51),
                rotation: 0,
                scale: 1.076
            },
            {
                idString: "port_warehouse_windows",
                position: v(-29.3, -30.3),
                rotation: 0,
                scale: 1.076
            },
            // {
            //     id: "port_warehouse_windows",
            //     position: v(29.3, -30.3),
            //     rotation: 0,
            //     scale: 1.076
            // },
            {
                idString: "port_warehouse_wall_long",
                position: v(29.3, 0),
                rotation: 0,
                scale: 1.076
            },
            {
                idString: "port_warehouse_wall_long",
                position: v(-29.3, 0),
                rotation: 0,
                scale: 1.076
            },
            {
                idString: "port_warehouse_wall_short",
                position: v(20.4, 16.3),
                rotation: 1,
                scale: 1.076
            },
            {
                idString: "port_warehouse_wall_short",
                position: v(-20.4, 16.3),
                rotation: 1,
                scale: 1.076
            },
            {
                idString: "port_warehouse_windows",
                position: v(-29.3, 30.4),
                rotation: 0,
                scale: 1.076
            },
            // {
            //     id: "port_warehouse_windows",
            //     position: v(29.3, 30.4),
            //     rotation: 0,
            //     scale: 1.076
            // },
            {
                idString: "port_warehouse_wall_short",
                position: v(29.3, 51),
                rotation: 0,
                scale: 1.076
            },
            {
                idString: "port_warehouse_wall_short",
                position: v(-29.3, 51),
                rotation: 0,
                scale: 1.076
            },
            {
                idString: "port_warehouse_wall_superlong",
                position: v(0, -59.5),
                rotation: 1,
                scale: 1.076
            },
            {
                idString: "port_warehouse_wall_superlong",
                position: v(0, 59.5),
                rotation: 1,
                scale: 1.076
            },
            {
                idString: "super_barrel",
                position: v(-10, -52)
            },
            {
                idString: "regular_crate",
                position: v(-22, -52)
            },
            {
                idString: "forklift",
                position: v(15, -52),
                rotation: 3
            },
            {
                idString: "regular_crate",
                position: v(-22, -10)
            },
            {
                idString: "regular_crate",
                position: v(-20, 0)
            },
            {
                idString: "regular_crate",
                position: v(-22, 10)
            },
            {
                idString: "forklift",
                position: v(-8, -2),
                rotation: 2
            },
            {
                idString: {
                    regular_crate: 0.3,
                    flint_crate: 1
                },
                position: v(-11, 50)
            },
            {
                idString: "regular_crate",
                position: v(-22, 52)
            },
            {
                idString: "barrel",
                position: v(1, 52)
            },
            {
                idString: "super_barrel",
                position: v(10, 48)
            },
            {
                idString: "barrel",
                position: v(25, 52)
            },
            {
                idString: "barrel",
                position: v(17, 5)
            },
            {
                idString: "barrel",
                position: v(24, 0)
            },
            {
                idString: "box",
                position: v(24, 9)
            },
            {
                idString: "box",
                position: v(19, 12)
            }
        ]
    },
    {
        idString: "refinery",
        name: "Refinery",
        spawnHitbox: RectangleHitbox.fromRect(184, 131, v(35, 21.50)),
        scopeHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(33.50, 72, v(-32.75, 0)),
            RectangleHitbox.fromRect(65.50, 29.50, v(16.75, -21.25))
        ),
        ceilingHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(33.50, 72, v(-32.75, 0)),
            RectangleHitbox.fromRect(65.50, 29.50, v(16.75, -21.25)),
            RectangleHitbox.fromRect(13, 7, v(28.50, -3.50)), // door
            new CircleHitbox(5, v(-16, 18.5)) // window
        ),
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
            { color: 0x595959, hitbox: RectangleHitbox.fromRect(176, 123, v(35, 21.50)) }, // base
            { color: 0xb2b200, hitbox: new CircleHitbox(21, v(45.5, 59.1)) }, // circles
            { color: 0x505050, hitbox: new CircleHitbox(19, v(45.5, 59.1)) },
            { color: 0xb2b200, hitbox: new CircleHitbox(21, v(97, 59.1)) },
            { color: 0x505050, hitbox: new CircleHitbox(19, v(97, 59.1)) },
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(2, 81, v(-9, 42.50)) }, // roads
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(2, 59, v(16, 53.50)) },
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(133, 2, v(56.50, 3)) },
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(108, 2, v(69, 25)) }
        ],
        floors: [
            {
                type: "wood",
                hitbox: RectangleHitbox.fromRect(33.50, 27, v(-32.75, 22.50))
            },
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(176, 123, v(35, 21.50))
            }
        ],
        obstacles: [
            {
                idString: "refinery_walls",
                position: v(0, 0),
                rotation: 0
            },
            //
            // Inner room obstacles
            //
            {
                idString: "window",
                position: v(-16, 18.5),
                rotation: 0
            },
            {
                idString: "door",
                position: v(-31.15, 9.2),
                rotation: 0
            },
            {
                idString: "table",
                position: v(-22, 28),
                rotation: 0
            },
            {
                idString: "chair",
                position: v(-26, 28),
                rotation: 3
            },
            {
                idString: "gun_mount",
                position: v(-46.8, 28),
                rotation: 1
            },
            //
            // Building obstacles
            //
            {
                idString: "small_refinery_barrel",
                position: v(41.3, -14.8)
            },
            {
                idString: "distillation_column",
                position: v(42.7, -28),
                rotation: 0
            },
            {
                idString: "distillation_column",
                position: v(-42.65, 1),
                rotation: 0
            },
            {
                idString: "distillation_equipment",
                position: v(0, -18),
                rotation: 2
            },
            {
                idString: "smokestack",
                position: v(-39, -25.59)
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: v(-26, -30)
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: v(-21.5, 4)
            },
            {
                idString: "regular_crate",
                position: v(28.75, -30)
            },
            {
                idString: "regular_crate",
                position: v(-43, -11)
            },
            //
            // Outside obstacles
            //
            // Bottom left
            {
                idString: "oil_tank",
                position: v(-38, 73),
                rotation: 0
            },
            {
                idString: "barrel",
                position: v(-20.5, 77.5),
                rotation: 0
            },
            {
                idString: "barrel",
                position: v(-21.5, 67),
                rotation: 0
            },
            {
                idString: "regular_crate",
                position: v(-46.5, 45.5)
            },
            {
                idString: "regular_crate",
                position: v(-36, 48)
            },
            // Bottom right
            {
                idString: "large_refinery_barrel",
                position: v(45.5, 59.1)
            },
            {
                idString: "large_refinery_barrel",
                position: v(97, 59.2)
            },
            {
                idString: "regular_crate",
                position: v(69, 62)
            },
            {
                idString: "aegis_crate",
                position: v(64, 75)
            },
            {
                idString: "aegis_crate",
                position: v(77, 73)
            },
            {
                idString: "barrel",
                position: v(117.5, 77.5)
            },
            {
                idString: "regular_crate",
                position: v(117, 40)
            },
            {
                idString: "super_barrel",
                position: v(27.5, 39)
            },
            {
                idString: "barrel",
                position: v(-10, 0)
            },
            // Top right
            {
                idString: "oil_tank",
                position: v(113, -25),
                rotation: 1
            },
            {
                idString: "barrel",
                position: v(117.5, -7)
            },
            {
                idString: "regular_crate",
                position: v(95, -33)
            },
            {
                idString: "aegis_crate",
                position: v(76.25, -33.5)
            },
            {
                idString: "super_barrel",
                position: v(85.25, -33.5)
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: v(83, -25)
            },
            {
                idString: "super_barrel",
                position: v(75, -23)
            },
            {
                idString: "regular_crate",
                position: v(76.25, -12)
            },
            //
            // Inner walls
            //
            // Top right
            { idString: "inner_concrete_wall_1", position: v(116.75, -1.5), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: v(106.05, -1.5), rotation: 0 },
            { idString: "inner_concrete_wall_2", position: v(70.05, -20.75), rotation: 1 },
            { idString: "inner_concrete_wall_1", position: v(74.5, -1.5), rotation: 0 },
            // Bottom right
            { idString: "inner_concrete_wall_1", position: v(116.75, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: v(106.05, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: v(95.35, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: v(47.84, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: v(37.14, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: v(26.44, 34), rotation: 0 },
            { idString: "inner_concrete_wall_4", position: v(22, 58.5), rotation: 1 },
            // Bottom left
            { idString: "inner_concrete_wall_3", position: v(-32.45, 39), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: v(-15, 76.65), rotation: 1 },
            { idString: "inner_concrete_wall_1", position: v(-15, 65.95), rotation: 1 },
            //
            // Outer walls
            //
            // Bottom left walls
            { idString: "concrete_wall_end", position: v(-15, 83), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: v(-32, 83), rotation: 0 },
            { idString: "concrete_wall_segment", position: v(-44.3, 83), rotation: 0 },
            { idString: "concrete_wall_corner", position: v(-53, 83), rotation: 0 },
            { idString: "concrete_wall_segment", position: v(-53, 74.4), rotation: 1 },
            { idString: "concrete_wall_end_broken", position: v(-53, 65.5), rotation: 1 },
            // Wall from bottom left to top left
            { idString: "concrete_wall_end_broken", position: v(-53, 44), rotation: 3 },
            { idString: "concrete_wall_segment_long", position: v(-53, 28), rotation: 3 },
            { idString: "concrete_wall_segment_long", position: v(-53, 0), rotation: 3 },
            { idString: "concrete_wall_segment_long", position: v(-53, -23.3), rotation: 3 },
            // Top left corner
            { idString: "concrete_wall_corner", position: v(-53, -40), rotation: 3 },
            { idString: "concrete_wall_segment_long", position: v(-36.3, -40), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: v(-10, -40), rotation: 0 },
            { idString: "concrete_wall_end_broken", position: v(7, -40), rotation: 0 },
            { idString: "concrete_wall_end_broken", position: v(20, -40), rotation: 2 },
            { idString: "concrete_wall_segment_long", position: v(36, -40), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: v(65, -40), rotation: 0 },
            { idString: "concrete_wall_end_broken", position: v(82, -40), rotation: 0 },
            { idString: "concrete_wall_end_broken", position: v(106, -40), rotation: 2 },
            { idString: "concrete_wall_segment", position: v(114.2, -40), rotation: 2 },
            // Top right corner
            { idString: "concrete_wall_corner", position: v(123, -40), rotation: 2 },
            { idString: "concrete_wall_segment_long", position: v(123, -23.2), rotation: 1 },
            { idString: "concrete_wall_segment", position: v(123, -10), rotation: 1 },
            { idString: "concrete_wall_end", position: v(123, -1.5), rotation: 3 },
            { idString: "concrete_wall_end", position: v(123, 29.5), rotation: 1 },
            { idString: "concrete_wall_segment_long", position: v(123, 46), rotation: 1 },
            { idString: "concrete_wall_segment_long", position: v(123, 66.3), rotation: 1 },
            // Bottom right corner
            { idString: "concrete_wall_corner", position: v(123, 83), rotation: 1 },
            { idString: "concrete_wall_segment_long", position: v(106.3, 83), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: v(76, 83), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: v(47, 83), rotation: 0 },
            { idString: "concrete_wall_segment", position: v(30, 83), rotation: 0 },
            { idString: "concrete_wall_end", position: v(22, 83), rotation: 2 }
        ],
        subBuildings: [
            {
                idString: "porta_potty",
                position: v(59.75, -27.6)
            }
        ]
    },
    {
        idString: "small_house",
        name: "Small House",
        spawnHitbox: RectangleHitbox.fromRect(80, 80),
        ceilingHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(62, 58, v(0, -0.3)),
            new CircleHitbox(5, v(-7.2, -29.5)),
            new CircleHitbox(5, v(-31, 7.5)),
            new CircleHitbox(5, v(31, 15.4)),
            new CircleHitbox(5, v(31, -15.9))
        ),
        scopeHitbox: RectangleHitbox.fromRect(62, 58, v(0, -0.3)),
        floorImages: [{
            key: "house_floor_small",
            position: v(0, 0)
        }],
        ceilingImages: [{
            key: "house_ceiling_small",
            position: v(0, 0)
        }],
        floors: [
            {
                type: "wood",
                hitbox: RectangleHitbox.fromRect(62, 58.50, v(0, -0.25))
            },
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(-10.10, 4.70, v(16.55, -31.75))

            },
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(10.10, -4.70, v(-14.45, 31.75))
            }
        ],
        obstacles: [
            // Bedroom Right
            {
                idString: "house_wall_2",
                position: v(-19.5, -6.75),
                rotation: 2
            },
            // Bedroom Bottom Right
            {
                idString: "house_wall_1",
                position: v(5.4, -6.75),
                rotation: 2
            }, // Bedroom Bottom Left
            {
                idString: "house_wall_2",
                position: v(8.85, -18),
                rotation: 1
            }, // Bedroom Door
            {
                idString: "door",
                position: v(-4.5, -6.75),
                rotation: 2
            }, //  Bathroom Left
            {
                idString: "house_wall_4",
                position: v(-2.50, 17.2),
                rotation: 1
            }, //  Bathroom Right
            {
                idString: "house_wall_4",
                position: v(9.55, 17.2),
                rotation: 1
            }, // Bathroom Door
            {
                idString: "door",
                position: v(3.1, 7.2),
                rotation: 2
            }, // Bathroom Toilet
            {
                idString: "toilet",
                position: v(3.6, 23.5),
                rotation: 2
            }, // Front Door
            {
                idString: "door",
                position: v(-14.8, 29),
                rotation: 2
            },
            {
                idString: "door",
                position: v(16.2, -29.5),
                rotation: 2
            }, // Living Room Cough
            {
                idString: "couch",
                position: v(-21.6, -1.8),
                rotation: 3
            },
            // Living Room Drawer
            {
                idString: "large_drawer",
                position: v(-26.2, 21.5),
                rotation: 1
            },
            // Living Room Bookshelf
            {
                idString: "bookshelf",
                position: v(-6, 17.5),
                rotation: 3
            }, // Kitchen Stove
            {
                idString: "stove",
                position: v(15.5, 24),
                rotation: 2
            }, // Kitchen Fridge
            {
                idString: "fridge",
                position: v(25, 24),
                rotation: 2
            },
            // Near Kitchen Chair
            {
                idString: "chair",
                position: v(25, 5),
                rotation: 0
            }, // Near Backdoor Chair
            {
                idString: "chair",
                position: v(25, -5),
                rotation: 2
            },
            // Dining Room Table
            {
                idString: "table",
                position: v(25, 0),
                rotation: 2
            },
            // Backdoor Drawer
            {
                idString: "small_drawer",
                position: v(26, -25),
                rotation: 3
            },
            // Bedroom Bed
            {
                idString: "bed",
                position: v(-21.5, -22.5),
                rotation: 1
            }, // Bedroom Drawer
            {
                idString: "small_drawer",
                position: v(-26, -11.5),
                rotation: 1
            }, // Bedroom Bookshelf
            {
                idString: "bookshelf",
                position: v(5.5, -22),
                rotation: 1
            }, // Bedroom Window
            {
                idString: "window",
                position: v(-7.2, -29.5),
                rotation: 1
            }, // Living Room Window
            {
                idString: "window",
                position: v(-31, 7.5),
                rotation: 2
            }, // Kitchen Window
            {
                idString: "window",
                position: v(31, 15.4),
                rotation: 2
            }, // Backdoor Window
            {
                idString: "window",
                position: v(31, -15.9),
                rotation: 2
            },
            {
                idString: "small_house_exterior",
                position: v(0, 0),
                rotation: 2
            }
        ]
    },
    {
        idString: "crane",
        name: "Crane",
        spawnHitbox: RectangleHitbox.fromRect(210, 220, v(55, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(210, 220, v(55, 0)),
        ceilingImages: [
            {
                key: "crane_ceiling",
                position: v(55.5, -60)
            },
            {
                key: "crane_ceiling",
                position: v(55.5, 60)
            }
        ],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1, // makes the crane ceiling render above container ceilings
        obstacles: [
            { idString: "crane_base_end", position: v(-31.6, -106.15), rotation: 0, scale: 1.07 },
            { idString: "crane_base_part", position: v(-31.55, -87.3), rotation: 0, scale: 1.07 },
            { idString: "crane_base_part", position: v(-31.55, -35.6), rotation: 0, scale: 1.07 },
            { idString: "crane_base_part", position: v(-31.55, 32), rotation: 0, scale: 1.07 },
            { idString: "crane_base_part", position: v(-31.55, 83.7), rotation: 0, scale: 1.07 },
            { idString: "crane_base_end", position: v(-31.6, 106.15), rotation: 0, scale: 1.07 },

            { idString: "crane_base_end", position: v(31.5, -106.15), rotation: 0, scale: 1.07 },
            { idString: "crane_base_part", position: v(31.55, -87.3), rotation: 0, scale: 1.07 },
            { idString: "crane_base_part", position: v(31.55, -35.6), rotation: 0, scale: 1.07 },
            { idString: "crane_base_part", position: v(31.55, 32), rotation: 0, scale: 1.07 },
            { idString: "crane_base_part", position: v(31.55, 83.7), rotation: 0, scale: 1.07 },
            { idString: "crane_base_end", position: v(31.5, 106.15), rotation: 0, scale: 1.07 }
        ]
    },
    {
        idString: "port_shed",
        name: "Port Shed",
        spawnHitbox: RectangleHitbox.fromRect(27, 37, v(-0.8, 0)),
        ceilingHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(20, 28.1, v(-0.8, -1)),
            new CircleHitbox(5, v(9.45, -2.6))
        ),
        scopeHitbox: RectangleHitbox.fromRect(20, 28.1, v(-0.8, -1)),
        floorImages: [{
            key: "port_shed_floor",
            position: v(0, 0)
        }],
        ceilingImages: [{
            key: "port_shed_ceiling",
            position: v(-0.8, -1.7)
        }],
        obstacles: [
            {
                idString: "port_shed_exterior",
                position: v(-0.8, 0),
                rotation: 0
            },
            {
                idString: "door",
                position: v(3.95, 12.15),
                rotation: 0
            },
            {
                idString: "window",
                position: v(9.45, -2.6),
                rotation: 0
            },
            {
                idString: "bookshelf",
                position: v(-7.75, 4.9),
                rotation: 1
            },
            {
                idString: "table",
                position: v(2.2, -10.35),
                rotation: 1
            },
            {
                idString: "chair",
                position: v(2.2, -5.5),
                rotation: 0
            }
        ]
    },
    // TODO Refactor this mess
    makeContainer(1, ContainerTints.White, 1, "closed"),
    makeContainer(2, ContainerTints.Red, 1, "closed"),
    makeContainer(3, ContainerTints.Green, 2, "open1"),
    makeContainer(4, ContainerTints.Green, 2, "open1", true),
    makeContainer(5, ContainerTints.Blue, 3, "open1"),
    makeContainer(6, ContainerTints.Blue, 3, "open1", true),
    makeContainer(7, ContainerTints.Blue, 4, "open2"),
    makeContainer(8, ContainerTints.Blue, 4, "open2", true),
    makeContainer(9, ContainerTints.Yellow, 5, "open1"),
    makeContainer(10, ContainerTints.Yellow, 6, "open2"),
    {
        idString: "container_11",
        name: "Invisible Container",
        spawnHitbox: RectangleHitbox.fromRect(16, 30)
    },
    {
        idString: "ship",
        name: "Ship",
        spawnHitbox: RectangleHitbox.fromRect(110, 300, v(0, 0)),
        ceilingHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(45.5, 39, v(9.5, -70.5)),
            RectangleHitbox.fromRect(10, 13, v(35, -73)),
            RectangleHitbox.fromRect(10, 19, v(-17, -63)),

            RectangleHitbox.fromRect(60, 25, v(8, 93.2)),

            new CircleHitbox(5, v(-17.3, -50.3)),
            new CircleHitbox(5, v(-7.4, -50.3)),
            new CircleHitbox(5, v(5.4, -50.3)),
            new CircleHitbox(5, v(15.3, -50.3))
        ),
        scopeHitbox: new ComplexHitbox(
            RectangleHitbox.fromRect(45.5, 39, v(9.5, -70.5)),
            RectangleHitbox.fromRect(60, 25, v(8, 93.2))
        ),
        floorImages: [
            {
                key: "ship_floor_1",
                position: v(0, -65)
            },
            {
                key: "ship_floor_2",
                position: v(0, 64.8)
            }
        ],
        ceilingImages: [
            {
                key: "ship_cabin_roof",
                position: v(4, -68)
            },
            {
                key: "ship_tango_room_roof",
                position: v(8.5, 101.75)
            }
        ],
        floors: [
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(82, 260, v(8.5, 0))
            },
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(20, 10.8, v(-40.6, -33.7))
            },
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(20, 10.8, v(-40.6, 43))
            }
        ],
        obstacles: [
            // Tango room
            { idString: "vault_door", position: v(7.55, 81.5), rotation: 0, scale: 1.07 },
            { idString: { tango_crate: 1, aegis_crate: 1 }, position: v(9, 93.5), rotation: 0, scale: 0.90 },
            { idString: "super_barrel", position: v(-12, 89) },
            { idString: "box", position: v(28.5, 87) },
            { idString: "box", position: v(31.5, 92) },
            { idString: "box", position: v(-12, 101) },

            // Main hitbox
            { idString: "ship", position: v(0, 0), rotation: 0 },

            { idString: "ship_thing_1", position: v(-14, -111), rotation: 0, scale: 1.07 },
            { idString: "generator", position: v(23, 75), rotation: 0, scale: 1.07 },
            { idString: "barrel", position: v(24, 66) },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: v(21, 58)
            },
            { idString: "regular_crate", position: v(-6, 73) },
            { idString: "regular_crate", position: v(-4, 61) },

            // Captain's cabin
            { idString: "panel_with_a_button", position: v(24.8, -55.9), rotation: 2 },
            { idString: "panel_without_button_small", position: v(15, -55.9), rotation: 2 },
            { idString: "panel_without_button", position: v(5.5, -55.9), rotation: 2 },
            { idString: "regular_crate", position: v(-7, -83) },
            { idString: "barrel", position: v(2, -84) },
            { idString: "bookshelf", position: v(22, -85), rotation: 2 },

            { idString: "ship_cabin_windows", position: v(3.9, -51), rotation: 1, scale: 1.07 },
            { idString: "ship_cabin_window", position: v(-17.3, -50.3), rotation: 1, scale: 1.07 },
            { idString: "ship_cabin_window", position: v(-7.4, -50.3), rotation: 1, scale: 1.07 },
            { idString: "ship_cabin_window", position: v(5.4, -50.3), rotation: 1, scale: 1.07 },
            { idString: "ship_cabin_window", position: v(15.3, -50.3), rotation: 1, scale: 1.07 },
            { idString: "ship_small_wall", position: v(-23.6, -58.6), rotation: 0, scale: 1.07 },
            { idString: "ship_medium_wall", position: v(31.5, -60.5), rotation: 0, scale: 1.07 },
            { idString: "ship_exterior_long_wall", position: v(41, -65.6), rotation: 0, scale: 1.07 },
            { idString: "ship_exterior_small_wall", position: v(37.15, -82), rotation: 1, scale: 1.07 },
            { idString: "ship_tiny_wall", position: v(31.5, -84.8), rotation: 0, scale: 1.07 },
            { idString: "ship_long_wall", position: v(9.2, -89.5), rotation: 1, scale: 1.07 },
            { idString: "ship_medium_wall2", position: v(-13.1, -77.8), rotation: 0, scale: 1.07 },
            { idString: "ship_exterior_medium_wall", position: v(-23.6, -77.8), rotation: 0, scale: 1.07 }

        ],
        subBuildings: [
            {
                idString: randomContainer1,
                position: v(19, -64),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: v(-15, 20),
                orientation: 0
            },
            {
                idString: randomContainer1,
                position: v(-16, -20),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: v(-31, -20),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: v(16, -22),
                orientation: 0
            },
            {
                idString: randomContainer1,
                position: v(15, 22),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: v(-1, 22),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: v(16, -110),
                orientation: 0
            },
            {
                idString: randomContainer1,
                position: v(31, -110),
                orientation: 0
            }
        ],
        lootSpawners: [{
            position: v(10, -73),
            table: "gas_can"
        }]
    },
    {
        idString: "port",
        name: "Port",
        spawnHitbox: RectangleHitbox.fromRect(430, 425, v(50, 0)),
        groundGraphics: [
            { color: 0x626262, hitbox: RectangleHitbox.fromRect(315, 425, v(0, 0)) },
            { color: 0x525252, hitbox: RectangleHitbox.fromRect(310, 420, v(0, 0)) },

            // Crane tracks
            { color: 0x2b2b2b, hitbox: RectangleHitbox.fromRect(0.8, 211, v(67.2, -95)) },
            { color: 0x2b2b2b, hitbox: RectangleHitbox.fromRect(0.8, 211, v(69.6, -95)) },
            { color: 0x2b2b2b, hitbox: RectangleHitbox.fromRect(0.8, 211, v(130.3, -95)) },
            { color: 0x2b2b2b, hitbox: RectangleHitbox.fromRect(0.8, 211, v(132.7, -95)) },

            // Road Lines
            { color: 0xffff00, hitbox: RectangleHitbox.fromRect(1.2476, 340.443, v(155.28, -37.84)) },

            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 105.9294, v(-26.25, -28.92)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(117.5118, 1.53195, v(31.75, 23.32)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 164.3926, v(89.73, 105.48)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(39.00715, 1.53195, v(71, 186.96)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 125.15, v(52.01, 125.13)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(79.62335, 1.53195, v(12.97, 63.32)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 28.7803, v(-26.08, 77)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(8.85475, 1.53195, v(-22.42, 92.04)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(8.4059, 1.52505, v(-22.16, 112.58)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 41.4343, v(-26.08, 132.54)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(8.8755, 1.53195, v(-22.39, 152.49)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(8.4059, 1.53195, v(-22.13, 173.03)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 15.5026, v(-26.02, 180.02)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(39.05895, 1.53195, v(-45.09, 187)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 14.80615, v(-63.85, 180.36)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(9.6335, 1.53195, v(-67.9, 173.31)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(9.6278, 1.55265, v(-67.9, 152.66)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 40.41345, v(-63.85, 133.1)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(9.622, 1.53195, v(-67.9, 113.66)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(9.62375, 1.53195, v(-67.9, 92.26)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 125.33895, v(-63.85, 30.35)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(90.9875, 1.53195, v(-108.58, -31.94)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(45.67215, 1.53195, v(-131.27, -77.39)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 85.47215, v(-129.44, -165.98)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 85.47215, v(-103.91, -166.1)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 85.47215, v(-77.74, -165.82)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 85.47215, v(-50.76, -166.28)) }
        ],
        floors: [{
            type: "stone",
            hitbox: RectangleHitbox.fromRect(315, 425, v(0, 0))
        }],
        decals: [
            // Group 1
            {
                id: "container_mark",
                position: v(37.52, -184.72),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(51.98, -184.73),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(37.83, -157.25),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(52.23, -157.25),
                rotation: 0
            },
            // Group 2
            {
                id: "container_mark",
                position: v(98.38, -184.09),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(112.84, -184.09),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(98.69, -156.62),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(113.09, -156.62),
                rotation: 0
            },
            // Group 3
            {
                id: "container_mark",
                position: v(45.04, -110.4),
                rotation: 1
            },
            {
                id: "container_mark",
                position: v(45.04, -96.9),
                rotation: 1
            },
            {
                id: "container_mark",
                position: v(45.04, -83.32),
                rotation: 1
            },
            // Group 4
            {
                id: "container_mark",
                position: v(110, -110.4),
                rotation: 1
            },
            {
                id: "container_mark",
                position: v(110, -96.9),
                rotation: 1
            },
            {
                id: "container_mark",
                position: v(110, -83.32),
                rotation: 1
            },
            // Group 5
            {
                id: "container_mark",
                position: v(6.21, -45.74),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(20.57, -45.74),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(35.03, -45.74),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(6.21, -18.22),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(20.88, -18.22),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(35.28, -18.22),
                rotation: 0
            },
            // Group 6
            {
                id: "container_mark",
                position: v(104.35, -18.42),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(119.01, -18.42),
                rotation: 0
            },
            // Group 7
            {
                id: "container_mark",
                position: v(116.82, 83),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(131.21, 83),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(116.82, 110.65),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(131.21, 110.65),
                rotation: 0
            },
            // Group 8
            {
                id: "container_mark",
                position: v(116.79, 150.27),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(131.18, 150.27),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(116.59, 178.02),
                rotation: 0
            },
            {
                id: "container_mark",
                position: v(130.97, 178.02),
                rotation: 0
            },
            // Group 9
            {
                id: "container_mark",
                position: v(-128.55, 25.76),
                rotation: 1
            },
            {
                id: "container_mark",
                position: v(-128.55, 40.31),
                rotation: 1
            },
            {
                id: "container_mark",
                position: v(-128.55, 55.18),
                rotation: 1
            },
            {
                id: "container_mark",
                position: v(-101.15, 55.18),
                rotation: 1
            },
            {
                id: "container_mark",
                position: v(-101.15, 40.44),
                rotation: 1
            },
            {
                id: "container_mark",
                position: v(-101.15, 25.67),
                rotation: 1
            },
            {
                id: "floor_oil_01",
                position: v(-50.76, -140.28)
            },
            {
                id: "floor_oil_02",
                position: v(50, -130.4)
            },
            {
                id: "floor_oil_03",
                position: v(-40, -85)
            },
            {
                id: "floor_oil_02",
                position: v(100, -55)
            },
            {
                id: "floor_oil_06",
                position: v(35, 5)
            },
            {
                id: "floor_oil_07",
                position: v(-35, 40)
            },
            {
                id: "floor_oil_04",
                position: v(-95, -10)
            },
            {
                id: "floor_oil_03",
                position: v(-35, 190)
            },
            {
                id: "floor_oil_02",
                position: v(65, 115)
            },
            {
                id: "floor_oil_05",
                position: v(120, 55)
            }

        ],
        obstacles: [
            { idString: "barrier", position: v(-111.03, -53.92), rotation: 0 },

            { idString: "forklift", position: v(-47.33, 82.5), rotation: 0 },
            { idString: "pallet", position: v(-47.3, 94.99), rotation: 0 },
            { idString: "box", position: v(-50.13, 94.43), rotation: 0 },

            { idString: "forklift", position: v(115.62, -65.16), rotation: 3 },
            { idString: "pallet", position: v(103, -65.16), rotation: 3 },
            { idString: "box", position: v(105, -67), rotation: 3 },
            { idString: "box", position: v(105, -62), rotation: 3 },
            { idString: "box", position: v(100, -67), rotation: 3 },

            { idString: "forklift", position: v(-10.34, -100.2), rotation: 0 },
            { idString: "super_barrel", position: v(1, -107) },
            { idString: "regular_crate", position: v(10, -100) },

            { idString: "forklift", position: v(51.85, 123.47), rotation: 2 },

            { idString: "barrel", position: v(-107.03, -21.1) },
            { idString: "barrel", position: v(-97.03, -13.1) },
            { idString: "super_barrel", position: v(-85.03, -16.1) },
            { idString: "barrel", position: v(-85.03, -7.1) },
            { idString: "barrel", position: v(-75.03, -1.1) },
            { idString: "regular_crate", position: v(-97.03, -2.1) },
            { idString: "barrel", position: v(-107, 4) },
            { idString: "regular_crate", position: v(-85.03, 4) },

            { idString: "trailer", position: v(-40, 140), rotation: 0 },

            // Parked trucks (from left to right)
            { idString: "truck", position: v(-141.63, -178.02), rotation: 2 },
            { idString: "trailer", position: v(-141.63, -147), rotation: 2 },

            { idString: "truck", position: v(-115.02, -179.26), rotation: 2 },

            { idString: "truck", position: v(-89, -147.99), rotation: 0 },
            { idString: "trailer", position: v(-89, -178), rotation: 0 },

            { idString: "trailer", position: v(-36.19, -175.77), rotation: 0 },

            // Porta potty top loot
            { idString: "regular_crate", position: v(-7, -200.2) },
            { idString: "super_barrel", position: v(-10, -190.2) },

            { idString: "regular_crate", position: v(25, -178.2) },

            // Other stuff idk
            { idString: "regular_crate", position: v(-19, -35) },
            { idString: "barrel", position: v(-10, -20) },

            { idString: "barrel", position: v(5, 14) },
            {
                idString: { aegis_crate: 1, flint_crate: 1 },
                position: v(15, 14)
            },
            { idString: "super_barrel", position: v(25, 11) },

            {
                idString: { aegis_crate: 1, flint_crate: 1 },
                position: v(90, -32)
            },
            {
                idString: { aegis_crate: 1, flint_crate: 1 },
                position: v(85, -42)
            },

            { idString: "barrel", position: v(125, 20) },
            { idString: "regular_crate", position: v(120, 30) },
            { idString: "regular_crate", position: v(130, 35) },
            { idString: "barrel", position: v(112, 45) },
            { idString: "super_barrel", position: v(125, 48) },
            { idString: "barrel", position: v(135, 55) },
            { idString: "barrel", position: v(120, 58) },
            { idString: "barrel", position: v(108, 60) },

            { idString: "barrel", position: v(105, 105) },

            { idString: "regular_crate", position: v(103, 187) },
            { idString: "barrel", position: v(99, 198) },
            { idString: "regular_crate", position: v(110, 200) },

            { idString: "regular_crate", position: v(-60, 200) },
            { idString: "regular_crate", position: v(-50, 195) },

            { idString: "barrel", position: v(-150, 192) },
            { idString: "regular_crate", position: v(-140, 190) },
            { idString: "barrel", position: v(-140, 200) },

            { idString: "regular_crate", position: v(-140, 80) },

            { idString: "regular_crate", position: v(100, -125) },
            { idString: "barrel", position: v(110, -130) },

            { idString: "regular_crate", position: v(90, -90) },
            { idString: "barrel", position: v(80, -90) },
            { idString: "super_barrel", position: v(85, -100) },

            ...Array.from(
                { length: 11 },
                (_, i) => ({
                    idString: "inner_concrete_wall_1",
                    position: v(-26.23, -204 + 11.6 * i),
                    rotation: 1,
                    scale: 1.07
                })
            ),
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "inner_concrete_wall_1",
                    position: v(-148 + 11.6 * i, -82.4),
                    rotation: 0,
                    scale: 1.07
                })
            ),

            ...(() => Array.from(
                { length: 8 },
                (_, i) => ({
                    idString: "bollard",
                    position: v(152.79, 115.23 - (45.54 * i)),
                    rotation: 0
                })
            ))()

        ],
        subBuildings: [
            { idString: "ship", position: v(205, -50) },
            { idString: "crane", position: v(100, -95) },

            { idString: "porta_potty", position: v(171.2, -12.34), orientation: 1 },
            { idString: "porta_potty", position: v(151.2, -12.34), orientation: 1 },
            { idString: "porta_potty", position: v(131.2, -12.34), orientation: 1 },
            { idString: "port_shed", position: v(15.68, -136.56), orientation: 1 },
            { idString: "port_warehouse", position: v(-10, -132), orientation: 2 },
            { idString: "port_warehouse", position: v(-100, 132) },

            // Containers on trucks
            { idString: "container_2", position: v(-40, 140) },
            { idString: "container_2", position: v(-36.19, -175.77) },
            { idString: "container_1", position: v(-141.63, -147) },

            // Group 1
            {
                idString: randomContainer2,
                position: v(-37.52, 184.72),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(-51.98, 184.73),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(37.83, -157.25),
                orientation: 0
            },
            {
                idString: randomContainer2,
                position: v(51.98, -157.25),
                orientation: 0
            },
            // Group 2
            {
                idString: randomContainer2,
                position: v(-98.38, 184.09),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(-112.84, 184.09),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(113.09, -156.62),
                orientation: 0
            },
            {
                idString: randomContainer2,
                position: v(98.38, -156.62),
                orientation: 0
            },
            // Group 3
            {
                idString: randomContainer2,
                position: v(-110.4, -45.04),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: v(-96.9, -45.04),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: v(83.32, 45.04),
                orientation: 1
            },
            // Group 4
            {
                idString: randomContainer2,
                position: v(110.4, 110),
                orientation: 1
            },
            {
                idString: randomContainer2,
                position: v(-96.9, -110),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: v(83.32, 110),
                orientation: 1
            },
            // Group 5
            {
                idString: randomContainer2,
                position: v(-6.21, 45.74),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(-20.57, 45.74),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(-35.28, 45.74),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(6.21, -18.22),
                orientation: 0
            },
            {
                idString: randomContainer2,
                position: v(20.88, -18.22),
                orientation: 0
            },
            {
                idString: randomContainer2,
                position: v(35.28, -18.22),
                orientation: 0
            },
            // Group 6
            {
                idString: randomContainer2,
                position: v(104.35, -18.42),
                orientation: 0
            },
            {
                idString: randomContainer2,
                position: v(119.01, -18.42),
                orientation: 0
            },
            // Group 7
            {
                idString: randomContainer2,
                position: v(-116.82, -83),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(-131.21, -83),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(116.82, 110.65),
                orientation: 0
            },
            {
                idString: randomContainer2,
                position: v(131.21, 110.65),
                orientation: 0
            },

            // Group 8
            {
                idString: randomContainer2,
                position: v(-116.79, -150.27),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(-131.18, -150.27),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: v(130.97, 178.02),
                orientation: 0
            },
            {
                idString: randomContainer2,
                position: v(116.59, 178.02),
                orientation: 0
            },
            // Group 9
            {
                idString: randomContainer2,
                position: v(25.76, 128.55),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: v(40.31, 128.55),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: v(55.18, 128.55),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: v(-55.18, -101.15),
                orientation: 1
            },
            {
                idString: randomContainer2,
                position: v(-40.31, -101.15),
                orientation: 1
            },
            {
                idString: randomContainer2,
                position: v(-25.67, -101.15),
                orientation: 1
            }
        ]
    }

]);
