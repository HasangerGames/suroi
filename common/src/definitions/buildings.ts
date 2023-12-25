import { ZIndexes } from "../constants";
import { type Orientation, type Variation } from "../typings";
import { CircleHitbox, HitboxGroup, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { MapObjectSpawnMode, ObjectDefinitions, type ObjectDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { type FloorTypes } from "../utils/terrain";
import { Vec, type Vector } from "../utils/vector";
import { type ObstacleDefinition, type RotationMode } from "./obstacles";

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
    readonly orientation?: Orientation
    readonly scale?: number
}

export interface BuildingDefinition extends ObjectDefinition {
    readonly spawnHitbox: Hitbox
    readonly scopeHitbox?: Hitbox
    readonly ceilingHitbox?: Hitbox
    readonly hideOnMap?: boolean
    readonly spawnMode?: MapObjectSpawnMode

    readonly obstacles?: BuildingObstacle[]
    readonly lootSpawners?: LootSpawner[]
    readonly subBuildings?: SubBuilding[]
    readonly decals?: BuildingDecal[]

    readonly sounds?: {
        readonly normal?: string
        readonly solved?: string
        readonly position?: Vector
        readonly maxRange: number
        readonly fallOff: number
    }

    readonly floorImages?: Array<{
        readonly key: string
        readonly position: Vector
        readonly rotation?: number
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
    switch (open) {
        case "open2":
            spawnHitbox = RectangleHitbox.fromRect(16, 39.9);
            break;
        case "open1":
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, Vec.create(0, 2));
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
        scopeHitbox: RectangleHitbox.fromRect(12, 27),
        ceilingImages: [{
            key: `container_ceiling_${open}${damaged ? "_damaged" : ""}`,
            position: Vec.create(0, 0),
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
                position: Vec.create(0, 0),
                rotation: 0
            }
        ],
        lootSpawners: open === "closed"
            ? undefined
            : [{
                position: Vec.create(0, 0),
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
        scopeHitbox: RectangleHitbox.fromRect(14, 18),
        floorImages: [{
            key: "porta_potty_floor",
            position: Vec.create(0, 1.5)
        }],
        ceilingImages: [{
            key: "porta_potty_ceiling",
            position: Vec.create(0, 0),
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
                position: Vec.create(0, -5),
                rotation: 0
            },
            {
                idString: "porta_potty_back_wall",
                position: Vec.create(0, -8.7),
                rotation: 0
            },
            {
                idString: "porta_potty_sink_wall",
                position: Vec.create(-5.65, 0),
                rotation: 3
            },
            {
                idString: "porta_potty_toilet_paper_wall",
                position: Vec.create(5.7, 0),
                rotation: 3
            },
            {
                idString: "porta_potty_door",
                position: Vec.create(2.2, 8.8),
                rotation: 0
            },
            {
                idString: "porta_potty_front_wall",
                position: Vec.create(-4.6, 8.7),
                rotation: 2
            }
        ]
    },
    {
        idString: "house",
        name: "House",
        spawnHitbox: new HitboxGroup(
            RectangleHitbox.fromRect(41, 51, Vec.create(31.50, -14.50)), // Garage
            RectangleHitbox.fromRect(68, 68, Vec.create(-18, -6)), // Main House
            RectangleHitbox.fromRect(28, 17, Vec.create(-31, 31.50)) // Doorstep
        ),
        scopeHitbox: new HitboxGroup(
            RectangleHitbox.fromRect(34.50, 42, Vec.create(29.25, -15.50)), // Garage
            RectangleHitbox.fromRect(60.50, 56, Vec.create(-17.25, -8.50)), // Main House
            RectangleHitbox.fromRect(15, 11, Vec.create(-31.50, 24.50)) // Doorstep
        ),
        floorImages: [{
            key: "house_floor",
            position: Vec.create(0, 0)
        }],
        ceilingImages: [{
            key: "house_ceiling",
            position: Vec.create(0, -1.5)
        }],
        floors: [
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(33, 41.50, Vec.create(29.50, -15.25)) // Garage
            },
            {
                type: "wood",
                hitbox: new HitboxGroup(
                    RectangleHitbox.fromRect(60, 56, Vec.create(-18, -9)), // Main House
                    RectangleHitbox.fromRect(18.80, 14, Vec.create(-31.40, 27)) // Doorstep
                )
            }
        ],
        obstacles: [
            // Bathroom Left
            {
                idString: "house_wall_4",
                position: Vec.create(-3.6, 8.5),
                rotation: 1
            },
            // Bathroom Top
            {
                idString: "house_wall_1",
                position: Vec.create(-2.6, -2.8),
                rotation: 0
            },
            // Entrance Right
            {
                idString: "house_wall_4",
                position: Vec.create(-25.2, 8.5),
                rotation: 1
            },
            // Kitchen Top
            {
                idString: "house_wall_1",
                position: Vec.create(-21.65, -2.8),
                rotation: 0
            },
            // Living Room Bottom Right
            {
                idString: "house_wall_3",
                position: Vec.create(6.35, -14.5),
                rotation: 0
            },
            // Living Room Left
            {
                idString: "house_wall_2",
                position: Vec.create(-18.25, -25.6),
                rotation: 1
            },
            // Bedroom Bottom Left
            {
                idString: "house_wall_3",
                position: Vec.create(-41, -14.5),
                rotation: 0
            },
            // Bedroom Bottom Right/Living Room Bottom Left
            {
                idString: "house_wall_5",
                position: Vec.create(-17.28, -14.5),
                rotation: 0
            },
            {
                idString: {
                    toilet: 0.7,
                    used_toilet: 0.3
                },
                position: Vec.create(7, 14.4),
                rotation: 2
            },
            {
                idString: "stove",
                position: Vec.create(-9.3, 15.3),
                rotation: 2
            },
            {
                idString: "fridge",
                position: Vec.create(-19.5, 15.3),
                rotation: 2
            },
            // Living Room Couch
            {
                idString: "couch",
                position: Vec.create(-13.3, -26),
                rotation: 0
            },
            // Living Room Large Drawers
            {
                idString: "large_drawer",
                position: Vec.create(8.2, -26),
                rotation: 3
            },
            // Living Room TV
            {
                idString: "tv",
                position: Vec.create(11.5, -26),
                rotation: 0
            },
            // House Exterior
            {
                idString: "house_exterior",
                position: Vec.create(0, -2.6),
                rotation: 0
            },
            // Chair Bottom
            {
                idString: "chair",
                position: Vec.create(-41, 13),
                rotation: 0
            },
            // Chair Top
            {
                idString: "chair",
                position: Vec.create(-41, 3),
                rotation: 2
            },
            {
                idString: "table",
                position: Vec.create(-41, 8),
                rotation: 0
            },
            {
                idString: "bed",
                position: Vec.create(-40.6, -27.5),
                rotation: 0
            },
            // Bedroom Bookshelf
            {
                idString: "bookshelf",
                position: Vec.create(-21.6, -29.25),
                rotation: 1
            },
            // Bedroom Drawer
            {
                idString: "small_drawer",
                position: Vec.create(-23, -19.3),
                rotation: 3
            },
            // Toilet Bookshelf
            {
                idString: "bookshelf",
                position: Vec.create(-0.2, 12.5),
                rotation: 1
            },
            // Garage Washing Machine
            {
                idString: "washing_machine",
                position: Vec.create(18.7, -31.9),
                rotation: 0
            },
            // Garage Crate
            {
                idString: "regular_crate",
                position: Vec.create(41.5, -30.9),
                rotation: 0
            },
            // Garage Barrel
            {
                idString: "barrel",
                position: Vec.create(41.5, -20),
                rotation: 0
            },
            // Garage Bookshelf
            {
                idString: "bookshelf",
                position: Vec.create(44.05, -1.55),
                rotation: 1
            },
            // Garage Door
            {
                idString: "garage_door",
                position: Vec.create(30.18, 6.5),
                rotation: 0
            },
            // Front Door
            {
                idString: "door",
                position: Vec.create(-30.85, 20),
                rotation: 0
            },
            // Bedroom Door
            {
                idString: "door",
                position: Vec.create(-29.85, -14.5),
                rotation: 0
            },
            // Living Room Door
            {
                idString: "door",
                position: Vec.create(-3.85, -14.5),
                rotation: 0
            },
            // Kitchen Door
            {
                idString: "door",
                position: Vec.create(-12.6, -2.8),
                rotation: 2
            },
            // Door to Garage
            {
                idString: "door",
                position: Vec.create(13, -8.1),
                rotation: 3
            },
            // Bathroom Door
            {
                idString: "door",
                position: Vec.create(6.5, -2.8),
                rotation: 2
            },
            // Living Room Window
            {
                idString: "window",
                position: Vec.create(-1.4, -36.75),
                rotation: 1
            },
            // Bedroom Window
            {
                idString: "window",
                position: Vec.create(-28.65, -36.75),
                rotation: 1
            },
            // Dining Room Window
            {
                idString: "window",
                position: Vec.create(-47.35, -8.35),
                rotation: 0
            }
        ]
    },
    {
        idString: "warehouse",
        name: "Warehouse",
        spawnHitbox: RectangleHitbox.fromRect(60, 88),
        scopeHitbox: RectangleHitbox.fromRect(40, 70),
        floorImages: [{
            key: "warehouse_floor",
            position: Vec.create(0, 0)
        }],
        ceilingImages: [{
            key: "warehouse_ceiling",
            position: Vec.create(0, 0)
        }],
        floors: [
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(40, 88)
            }
        ],
        obstacles: [
            {
                idString: "warehouse_walls",
                position: Vec.create(-19.8, 0),
                rotation: 0
            },
            {
                idString: "warehouse_walls",
                position: Vec.create(19.8, 0),
                rotation: 2
            },
            {
                idString: "regular_crate",
                position: Vec.create(14, -28.5)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-14, -28.5)
            },
            {
                idString: {
                    regular_crate: 0.7,
                    flint_crate: 0.3
                },
                position: Vec.create(-14, 28.5)
            },
            {
                idString: "barrel",
                position: Vec.create(14.6, 29.2)
            },
            {
                idString: "metal_shelf",
                position: Vec.create(-15.8, 0),
                rotation: 1
            },
            {
                idString: "box",
                position: Vec.create(-15.7, 0),
                lootSpawnOffset: Vec.create(5, 0)
            },
            {
                idString: "box",
                position: Vec.create(-15.8, 6.4),
                lootSpawnOffset: Vec.create(5, 0)
            },
            {
                idString: "box",
                position: Vec.create(-15.7, -8),
                lootSpawnOffset: Vec.create(5, 0)
            },
            {
                idString: "metal_shelf",
                position: Vec.create(15.8, 0),
                rotation: 1
            },
            {
                idString: "box",
                position: Vec.create(15.8, 0),
                lootSpawnOffset: Vec.create(-5, 0)
            },
            {
                idString: "box",
                position: Vec.create(15.7, 6),
                lootSpawnOffset: Vec.create(-5, 0)
            },
            {
                idString: "box",
                position: Vec.create(15.6, -7),
                lootSpawnOffset: Vec.create(-5, 0)
            }
        ],

        lootSpawners: [
            {
                position: Vec.create(0, 0),
                table: "warehouse"
            }
        ]
    },
    {
        idString: "port_warehouse_red",
        name: "Red Port Warehouse",
        spawnHitbox: RectangleHitbox.fromRect(70, 130),
        scopeHitbox: RectangleHitbox.fromRect(58, 115),
        floorImages: [
            {
                key: "port_warehouse_floor",
                position: Vec.create(0, -30.2)
            },
            {
                key: "port_warehouse_floor",
                position: Vec.create(0, 30.2),
                rotation: Math.PI
            }
        ],
        ceilingImages: [{
            key: "port_warehouse_ceiling_red",
            position: Vec.create(0, 0), 
        }],
        obstacles: [
            {
                idString: "port_warehouse_walls",
                position: Vec.create(0, -30),
                rotation: 0
            },
            {
                idString: "port_warehouse_walls",
                position: Vec.create(0, 30),
                rotation: 2
            },
            {
                idString: "port_warehouse_windows",
                position: Vec.create(-29.3, -30),
                rotation: 0
            },
            {
                idString: "port_warehouse_windows",
                position: Vec.create(-29.3, 30),
                rotation: 0
            },
            {
                idString: "port_warehouse_wall_short",
                position: Vec.create(21, 16.3),
                rotation: 1
            },
            {
                idString: "port_warehouse_wall_short",
                position: Vec.create(-21, 16.3),
                rotation: 1
            },
            {
                idString: "super_barrel",
                position: Vec.create(-10, -52)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-22, -52)
            },
            {
                idString: "forklift",
                position: Vec.create(15, -52),
                rotation: 3
            },
            {
                idString: "regular_crate",
                position: Vec.create(-22, -10)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-20, 0)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-22, 10)
            },
            {
                idString: "forklift",
                position: Vec.create(-8, -2),
                rotation: 2
            },
            {
                idString: {
                    regular_crate: 0.3,
                    flint_crate: 1
                },
                position: Vec.create(-11, 50)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-22, 52)
            },
            {
                idString: "barrel",
                position: Vec.create(1, 52)
            },
            {
                idString: "super_barrel",
                position: Vec.create(10, 48)
            },
            {
                idString: "barrel",
                position: Vec.create(23, 52)
            },
            {
                idString: "barrel",
                position: Vec.create(17, 5)
            },
            {
                idString: "barrel",
                position: Vec.create(24, 0)
            },
            {
                idString: "box",
                position: Vec.create(24, 9)
            },
            {
                idString: "box",
                position: Vec.create(19, 12)
            }
        ]
    },
    {
        idString: "port_warehouse_blue",
        name: "Blue Port Warehouse",
        spawnHitbox: RectangleHitbox.fromRect(70, 130),
        scopeHitbox: RectangleHitbox.fromRect(58, 115),
        floorImages: [
            {
                key: "port_warehouse_floor",
                position: Vec.create(0, -30.2)
            },
            {
                key: "port_warehouse_floor",
                position: Vec.create(0, 30.2),
                rotation: Math.PI
            }
        ],
        ceilingImages: [{
            key: "port_warehouse_ceiling_blue",
            position: Vec.create(0, 0), 
        }],
        obstacles: [
            {
                idString: "port_warehouse_walls",
                position: Vec.create(0, -30),
                rotation: 0
            },
            {
                idString: "port_warehouse_walls",
                position: Vec.create(0, 30),
                rotation: 2
            },
            {
                idString: "port_warehouse_windows",
                position: Vec.create(-29.3, -30),
                rotation: 0
            },
            {
                idString: "port_warehouse_windows",
                position: Vec.create(-29.3, 30),
                rotation: 0
            },
            {
                idString: "port_warehouse_wall_short",
                position: Vec.create(21, 16.3),
                rotation: 1
            },
            {
                idString: "port_warehouse_wall_short",
                position: Vec.create(-21, 16.3),
                rotation: 1
            },
            {
                idString: "super_barrel",
                position: Vec.create(-10, -52)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-22, -52)
            },
            {
                idString: "forklift",
                position: Vec.create(15, -52),
                rotation: 3
            },
            {
                idString: "regular_crate",
                position: Vec.create(-22, -10)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-20, 0)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-22, 10)
            },
            {
                idString: "forklift",
                position: Vec.create(-8, -2),
                rotation: 2
            },
            {
                idString: {
                    regular_crate: 0.3,
                    flint_crate: 1
                },
                position: Vec.create(-11, 50)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-22, 52)
            },
            {
                idString: "barrel",
                position: Vec.create(1, 52)
            },
            {
                idString: "super_barrel",
                position: Vec.create(10, 48)
            },
            {
                idString: "barrel",
                position: Vec.create(23, 52)
            },
            {
                idString: "barrel",
                position: Vec.create(17, 5)
            },
            {
                idString: "barrel",
                position: Vec.create(24, 0)
            },
            {
                idString: "box",
                position: Vec.create(24, 9)
            },
            {
                idString: "box",
                position: Vec.create(19, 12)
            }
        ]
    },
    {
        idString: "refinery",
        name: "Refinery",
        spawnHitbox: RectangleHitbox.fromRect(184, 131, Vec.create(35, 21.50)),
        scopeHitbox: new HitboxGroup(
            RectangleHitbox.fromRect(33.50, 72, Vec.create(-32.75, 0)),
            RectangleHitbox.fromRect(65.50, 29.50, Vec.create(16.75, -21.25))
        ),
        floorImages: [
            {
                key: "refinery_floor",
                position: Vec.create(0, 0)
            }
        ],
        ceilingImages: [
            {
                key: "refinery_ceiling",
                position: Vec.create(0, 0)
            }
        ],
        groundGraphics: [
            { color: 0x595959, hitbox: RectangleHitbox.fromRect(176, 123, Vec.create(35, 21.50)) }, // base
            { color: 0xb2b200, hitbox: new CircleHitbox(21, Vec.create(45.5, 59.1)) }, // circles
            { color: 0x505050, hitbox: new CircleHitbox(19, Vec.create(45.5, 59.1)) },
            { color: 0xb2b200, hitbox: new CircleHitbox(21, Vec.create(97, 59.1)) },
            { color: 0x505050, hitbox: new CircleHitbox(19, Vec.create(97, 59.1)) },
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(2, 81, Vec.create(-9, 42.50)) }, // roads
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(2, 59, Vec.create(16, 53.50)) },
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(133, 2, Vec.create(56.50, 3)) },
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(108, 2, Vec.create(69, 25)) }
        ],
        floors: [
            {
                type: "wood",
                hitbox: RectangleHitbox.fromRect(33.50, 27, Vec.create(-32.75, 22.50))
            },
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(176, 123, Vec.create(35, 21.50))
            }
        ],
        obstacles: [
            {
                idString: "refinery_walls",
                position: Vec.create(0, 0),
                rotation: 0
            },
            //
            // Inner room obstacles
            //
            {
                idString: "window",
                position: Vec.create(-16, 18.5),
                rotation: 0
            },
            {
                idString: "door",
                position: Vec.create(-31.15, 9.2),
                rotation: 0
            },
            {
                idString: "table",
                position: Vec.create(-22, 28),
                rotation: 0
            },
            {
                idString: "chair",
                position: Vec.create(-26, 28),
                rotation: 3
            },
            {
                idString: { gun_mount_mcx_spear: 0.99, gun_mount_stoner_63: 0.01 },
                position: Vec.create(-46.8, 28),
                rotation: 1
            },
            //
            // Building obstacles
            //
            {
                idString: "small_refinery_barrel",
                position: Vec.create(41.3, -14.8)
            },
            {
                idString: "distillation_column",
                position: Vec.create(42.7, -28),
                rotation: 0
            },
            {
                idString: "distillation_column",
                position: Vec.create(-42.65, 1),
                rotation: 0
            },
            {
                idString: "distillation_equipment",
                position: Vec.create(0, -18),
                rotation: 2
            },
            {
                idString: "smokestack",
                position: Vec.create(-39, -25.59)
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: Vec.create(-26, -30)
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: Vec.create(-21.5, 4)
            },
            {
                idString: "regular_crate",
                position: Vec.create(28.75, -30)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-43, -11)
            },
            //
            // Outside obstacles
            //
            // Bottom left
            {
                idString: "oil_tank",
                position: Vec.create(-38, 73),
                rotation: 0
            },
            {
                idString: "barrel",
                position: Vec.create(-20.5, 77.5),
                rotation: 0
            },
            {
                idString: "barrel",
                position: Vec.create(-21.5, 67),
                rotation: 0
            },
            {
                idString: "regular_crate",
                position: Vec.create(-46.5, 45.5)
            },
            {
                idString: "regular_crate",
                position: Vec.create(-36, 48)
            },
            // Bottom right
            {
                idString: "large_refinery_barrel",
                position: Vec.create(45.5, 59.1)
            },
            {
                idString: "large_refinery_barrel",
                position: Vec.create(97, 59.2)
            },
            {
                idString: "regular_crate",
                position: Vec.create(69, 62)
            },
            {
                idString: "aegis_crate",
                position: Vec.create(64, 75)
            },
            {
                idString: "aegis_crate",
                position: Vec.create(77, 73)
            },
            {
                idString: "barrel",
                position: Vec.create(117.5, 77.5)
            },
            {
                idString: "regular_crate",
                position: Vec.create(117, 40)
            },
            {
                idString: "super_barrel",
                position: Vec.create(27.5, 39)
            },
            {
                idString: "barrel",
                position: Vec.create(-10, 0)
            },
            // Top right
            {
                idString: "oil_tank",
                position: Vec.create(113, -25),
                rotation: 1
            },
            {
                idString: "barrel",
                position: Vec.create(117.5, -7)
            },
            {
                idString: "regular_crate",
                position: Vec.create(95, -33)
            },
            {
                idString: "aegis_crate",
                position: Vec.create(76.25, -33.5)
            },
            {
                idString: "super_barrel",
                position: Vec.create(85.25, -33.5)
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: Vec.create(83, -25)
            },
            {
                idString: "super_barrel",
                position: Vec.create(75, -23)
            },
            {
                idString: "regular_crate",
                position: Vec.create(76.25, -12)
            },
            //
            // Inner walls
            //
            // Top right
            { idString: "inner_concrete_wall_1", position: Vec.create(116.75, -1.5), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec.create(106.05, -1.5), rotation: 0 },
            { idString: "inner_concrete_wall_2", position: Vec.create(70.05, -20.75), rotation: 1 },
            { idString: "inner_concrete_wall_1", position: Vec.create(74.5, -1.5), rotation: 0 },
            // Bottom right
            { idString: "inner_concrete_wall_1", position: Vec.create(116.75, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec.create(106.05, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec.create(95.35, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec.create(47.84, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec.create(37.14, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec.create(26.44, 34), rotation: 0 },
            { idString: "inner_concrete_wall_4", position: Vec.create(22, 58.5), rotation: 1 },
            // Bottom left
            { idString: "inner_concrete_wall_3", position: Vec.create(-32.45, 39), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec.create(-15, 76.65), rotation: 1 },
            { idString: "inner_concrete_wall_1", position: Vec.create(-15, 65.95), rotation: 1 },
            //
            // Outer walls
            //
            // Bottom left walls
            { idString: "concrete_wall_end", position: Vec.create(-15, 83), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: Vec.create(-32, 83), rotation: 0 },
            { idString: "concrete_wall_segment", position: Vec.create(-44.3, 83), rotation: 0 },
            { idString: "concrete_wall_corner", position: Vec.create(-53, 83), rotation: 0 },
            { idString: "concrete_wall_segment", position: Vec.create(-53, 74.4), rotation: 1 },
            { idString: "concrete_wall_end_broken", position: Vec.create(-53, 65.5), rotation: 1 },
            // Wall from bottom left to top left
            { idString: "concrete_wall_end_broken", position: Vec.create(-53, 44), rotation: 3 },
            { idString: "concrete_wall_segment_long", position: Vec.create(-53, 28), rotation: 3 },
            { idString: "concrete_wall_segment_long", position: Vec.create(-53, 0), rotation: 3 },
            { idString: "concrete_wall_segment_long", position: Vec.create(-53, -23.3), rotation: 3 },
            // Top left corner
            { idString: "concrete_wall_corner", position: Vec.create(-53, -40), rotation: 3 },
            { idString: "concrete_wall_segment_long", position: Vec.create(-36.3, -40), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: Vec.create(-10, -40), rotation: 0 },
            { idString: "concrete_wall_end_broken", position: Vec.create(7, -40), rotation: 0 },
            { idString: "concrete_wall_end_broken", position: Vec.create(20, -40), rotation: 2 },
            { idString: "concrete_wall_segment_long", position: Vec.create(36, -40), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: Vec.create(65, -40), rotation: 0 },
            { idString: "concrete_wall_end_broken", position: Vec.create(82, -40), rotation: 0 },
            { idString: "concrete_wall_end_broken", position: Vec.create(106, -40), rotation: 2 },
            { idString: "concrete_wall_segment", position: Vec.create(114.2, -40), rotation: 2 },
            // Top right corner
            { idString: "concrete_wall_corner", position: Vec.create(123, -40), rotation: 2 },
            { idString: "concrete_wall_segment_long", position: Vec.create(123, -23.2), rotation: 1 },
            { idString: "concrete_wall_segment", position: Vec.create(123, -10), rotation: 1 },
            { idString: "concrete_wall_end", position: Vec.create(123, -1.5), rotation: 3 },
            { idString: "concrete_wall_end", position: Vec.create(123, 29.5), rotation: 1 },
            { idString: "concrete_wall_segment_long", position: Vec.create(123, 46), rotation: 1 },
            { idString: "concrete_wall_segment_long", position: Vec.create(123, 66.3), rotation: 1 },
            // Bottom right corner
            { idString: "concrete_wall_corner", position: Vec.create(123, 83), rotation: 1 },
            { idString: "concrete_wall_segment_long", position: Vec.create(106.3, 83), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: Vec.create(76, 83), rotation: 0 },
            { idString: "concrete_wall_segment_long", position: Vec.create(47, 83), rotation: 0 },
            { idString: "concrete_wall_segment", position: Vec.create(30, 83), rotation: 0 },
            { idString: "concrete_wall_end", position: Vec.create(22, 83), rotation: 2 }
        ],
        subBuildings: [
            {
                idString: "porta_potty",
                position: Vec.create(59.75, -27.6)
            }
        ]
    },
    {
        idString: "small_house",
        name: "Small House",
        spawnHitbox: RectangleHitbox.fromRect(80, 80),
        scopeHitbox: RectangleHitbox.fromRect(60, 56),
        floorImages: [{
            key: "house_floor_small",
            position: Vec.create(0, 0)
        }],
        ceilingImages: [{
            key: "house_ceiling_small",
            position: Vec.create(0, 0)
        }],
        floors: [
            {
                type: "wood",
                hitbox: RectangleHitbox.fromRect(62, 58.50, Vec.create(0, -0.25))
            },
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(-10.10, 4.70, Vec.create(16.55, -31.75))

            },
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(10.10, -4.70, Vec.create(-14.45, 31.75))
            }
        ],
        obstacles: [
            // Bedroom Right
            {
                idString: "house_wall_2",
                position: Vec.create(-19.5, -6.75),
                rotation: 2
            },
            // Bedroom Bottom Right
            {
                idString: "house_wall_1",
                position: Vec.create(5.4, -6.75),
                rotation: 2
            }, // Bedroom Bottom Left
            {
                idString: "house_wall_2",
                position: Vec.create(8.85, -18),
                rotation: 1
            }, // Bedroom Door
            {
                idString: "door",
                position: Vec.create(-4.5, -6.75),
                rotation: 2
            }, //  Bathroom Left
            {
                idString: "house_wall_4",
                position: Vec.create(-2.50, 17.2),
                rotation: 1
            }, //  Bathroom Right
            {
                idString: "house_wall_4",
                position: Vec.create(9.55, 17.2),
                rotation: 1
            }, // Bathroom Door
            {
                idString: "door",
                position: Vec.create(3.1, 7.2),
                rotation: 2
            }, // Bathroom Toilet
            {
                idString: { toilet: 2, used_toilet: 1 },
                position: Vec.create(3.6, 23.5),
                rotation: 2
            }, // Front Door
            {
                idString: "door",
                position: Vec.create(-14.8, 29),
                rotation: 2
            },
            {
                idString: "door",
                position: Vec.create(16.2, -29.5),
                rotation: 2
            }, // Living Room Cough
            {
                idString: "couch",
                position: Vec.create(-21.6, -1.8),
                rotation: 3
            },
            // Living Room Drawer
            {
                idString: "large_drawer",
                position: Vec.create(-26.2, 21.5),
                rotation: 1
            },
            // Living Room Bookshelf
            {
                idString: "bookshelf",
                position: Vec.create(-6, 17.5),
                rotation: 3
            }, // Kitchen Stove
            {
                idString: "stove",
                position: Vec.create(15.5, 24),
                rotation: 2
            }, // Kitchen Fridge
            {
                idString: "fridge",
                position: Vec.create(25, 24),
                rotation: 2
            },
            // Near Kitchen Chair
            {
                idString: "chair",
                position: Vec.create(25, 5),
                rotation: 0
            }, // Near Backdoor Chair
            {
                idString: "chair",
                position: Vec.create(25, -5),
                rotation: 2
            },
            // Dining Room Table
            {
                idString: "table",
                position: Vec.create(25, 0),
                rotation: 2
            },
            // Backdoor Drawer
            {
                idString: "small_drawer",
                position: Vec.create(26, -25),
                rotation: 3
            },
            // Bedroom Bed
            {
                idString: "bed",
                position: Vec.create(-21.5, -22.5),
                rotation: 1
            }, // Bedroom Drawer
            {
                idString: "small_drawer",
                position: Vec.create(-26, -11.5),
                rotation: 1
            }, // Bedroom Bookshelf
            {
                idString: "bookshelf",
                position: Vec.create(5.5, -22),
                rotation: 1
            }, // Bedroom Window
            {
                idString: "window",
                position: Vec.create(-7.2, -29.5),
                rotation: 1
            }, // Living Room Window
            {
                idString: "window",
                position: Vec.create(-31, 7.5),
                rotation: 2
            }, // Kitchen Window
            {
                idString: "window",
                position: Vec.create(31, 15.4),
                rotation: 2
            }, // Backdoor Window
            {
                idString: "window",
                position: Vec.create(31, -15.9),
                rotation: 2
            },
            {
                idString: "small_house_exterior",
                position: Vec.create(0, 0),
                rotation: 2
            }
        ]
    },
    {
        idString: "crane",
        name: "Crane",
        spawnHitbox: RectangleHitbox.fromRect(210, 100, Vec.create(55, -60)),
        ceilingHitbox: RectangleHitbox.fromRect(210, 100, Vec.create(55, -60)),
        ceilingImages: [
            {
                key: "crane_ceiling",
                position: Vec.create(55.5, -60)
            },
        ],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1, // makes the crane ceiling render above container ceilings
        obstacles: [
            { idString: "crane_base_part", position: Vec.create(-31.55, -87.3), rotation: 0 },
            { idString: "crane_base_part", position: Vec.create(-31.55, -35.6), rotation: 0 },

            { idString: "crane_base_part", position: Vec.create(32, -87.3), rotation: 0 },
            { idString: "crane_base_part", position: Vec.create(32, -35.6), rotation: 0 },
        ]
    },
    {
        idString: "port_shed",
        name: "Port Shed",
        spawnHitbox: RectangleHitbox.fromRect(27, 37, Vec.create(-0.8, 0)),
        scopeHitbox: RectangleHitbox.fromRect(20, 27.5, Vec.create(-0.8, -1.5)),
        floorImages: [{
            key: "port_shed_floor",
            position: Vec.create(0, 0)
        }],
        ceilingImages: [{
            key: "port_shed_ceiling",
            position: Vec.create(-0.8, -1.7)
        }],
        obstacles: [
            {
                idString: "port_shed_exterior",
                position: Vec.create(-0.8, 0),
                rotation: 0
            },
            {
                idString: "door",
                position: Vec.create(3.95, 12.15),
                rotation: 0
            },
            {
                idString: "window",
                position: Vec.create(9.45, -2.6),
                rotation: 0
            },
            {
                idString: "bookshelf",
                position: Vec.create(-7.75, 4.9),
                rotation: 1
            },
            {
                idString: "table",
                position: Vec.create(2.2, -10.35),
                rotation: 1
            },
            {
                idString: "chair",
                position: Vec.create(2.2, -5.5),
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
        spawnHitbox: RectangleHitbox.fromRect(110, 300, Vec.create(0, 0)),
        scopeHitbox: new HitboxGroup(
            RectangleHitbox.fromRect(44, 38, Vec.create(9.5, -70.5)),
            RectangleHitbox.fromRect(10, 15, Vec.create(-17, -60)),
            RectangleHitbox.fromRect(50, 24, Vec.create(8, 93.2))
        ),
        sounds: {
            solved: "generator_running",
            position: Vec.create(23, 75),
            maxRange: 416,
            fallOff: 2
        },
        floorImages: [
            {
                key: "ship_floor_1",
                position: Vec.create(0, -65)
            },
            {
                key: "ship_floor_2",
                position: Vec.create(0, 64.8)
            }
        ],
        ceilingImages: [
            {
                key: "ship_cabin_roof",
                position: Vec.create(4, -68)
            },
            {
                key: "ship_tango_room_roof",
                position: Vec.create(8.5, 101.75)
            }
        ],
        floors: [
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(82, 220, Vec.create(8.5, -20))
            },
            {
                type: "stone",
                hitbox: RectangleHitbox.fromRect(54, 20, Vec.create(8.5, 95))
            },
            {
                type: "metal",
                hitbox: RectangleHitbox.fromRect(20, 14, Vec.create(-40.6, -33.7))
            },
            {
                type: "metal",
                hitbox: RectangleHitbox.fromRect(20, 14, Vec.create(-40.6, 43))
            }
        ],
        obstacles: [
            // Tango room
            { idString: "vault_door", position: Vec.create(7.45, 81.5), rotation: 0 },
            { idString: { tango_crate: 1, aegis_crate: 1 }, position: Vec.create(9, 93.5), rotation: 0 },
            { idString: "super_barrel", position: Vec.create(-12, 89) },
            { idString: "box", position: Vec.create(28.5, 87) },
            { idString: "box", position: Vec.create(30, 93) },
            { idString: "box", position: Vec.create(-12, 99) },

            // Main hitbox
            { idString: "ship", position: Vec.create(0, 0), rotation: 0 },

            { idString: "ship_thing_1", position: Vec.create(-14, -111), rotation: 0 },
            { idString: "generator", position: Vec.create(23, 75), rotation: 0 },
            { idString: "barrel", position: Vec.create(24, 66) },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: Vec.create(21, 58)
            },
            { idString: "regular_crate", position: Vec.create(-6, 73) },
            { idString: "regular_crate", position: Vec.create(-4, 61) },

            // Captain's cabin
            { idString: "panel_without_button_small", position: Vec.create(14.5, -57), rotation: 2 },
            { idString: "panel_without_button", position: Vec.create(5, -57), rotation: 2 },
            { idString: "regular_crate", position: Vec.create(-7, -84) },
            { idString: "barrel", position: Vec.create(2, -85) },
            { idString: "bookshelf", position: Vec.create(23.5, -86.5), rotation: 2 },

            { idString: "ship_cabin_window", position: Vec.create(-16, -50.5), rotation: 1 },
            { idString: "ship_cabin_window", position: Vec.create(-6, -50.5), rotation: 1 },
            { idString: "ship_cabin_window", position: Vec.create(7, -50.5), rotation: 1 },
            { idString: "ship_cabin_window", position: Vec.create(18, -50.5), rotation: 1 }

        ],
        subBuildings: [
            {
                idString: randomContainer1,
                position: Vec.create(19, -64),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: Vec.create(-15, 20)
            },
            {
                idString: randomContainer1,
                position: Vec.create(-16, -20),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: Vec.create(-31, -20),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: Vec.create(16, -22)
            },
            {
                idString: randomContainer1,
                position: Vec.create(15, 22),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: Vec.create(-1, 22),
                orientation: 2
            },
            {
                idString: randomContainer1,
                position: Vec.create(16, -110)
            },
            {
                idString: randomContainer1,
                position: Vec.create(31, -110)
            }
        ],
        lootSpawners: [{
            position: Vec.create(10, -73),
            table: "gas_can"
        }]
    },
    {
        idString: "oil_tanker_ship_tanks",
        name: "Oil Tanker",
        spawnHitbox: RectangleHitbox.fromRect(110, 300, Vec.create(0, 0)),
        scopeHitbox: RectangleHitbox.fromRect(100, 100, Vec.create(0, 0)),
        ceilingImages: [
            {
                key: "oil_tanker_ship_tank_ceiling",
                position: Vec.create(10.5, 20)
            }
        ],
        floors: [
           
        ],
        obstacles: [
            { idString: "large_oil_tanker_tank", position: Vec.create(10, -46.5) },
            { idString: "large_oil_tanker_tank", position: Vec.create(10, 20) },
            { idString: "large_oil_tanker_tank", position: Vec.create(10, 88) },
        ],
    },
    {
        idString: "oil_tanker_ship",
        name: "Oil Tanker",
        spawnHitbox: RectangleHitbox.fromRect(110, 300, Vec.create(0, 0)),
        scopeHitbox: 
        new HitboxGroup(
            RectangleHitbox.fromRect(65, 29, Vec.create(4.5, -102.5)),
            RectangleHitbox.fromRect(7.5, 28, Vec.create(41.7, -101.5))
        ),
        floorImages: [
            {
            key: "oil_tanker_ship_floor",
            position: Vec.create(0, 0)
            }
        ],
        ceilingImages: [
            {
                key: "oil_tanker_ship_ceiling",
                position: Vec.create(7, -99.5)
            }
        ],
        floors: [
           
        ],
        obstacles: [
            // Main Ship Hitbox
            { idString: "oil_tanker_ship", position: Vec.create(0, 0), rotation: 0 },

            // Cabin Windows
            { idString: "ship_cabin_window", position: Vec.create(-0.25, -87.5), rotation: 1 },
            { idString: "ship_cabin_window", position: Vec.create(9.75, -87.5), rotation: 1 },

            { idString: "ship_cabin_window", position: Vec.create(22, -87.5), rotation: 1 },
            { idString: "ship_cabin_window", position: Vec.create(31, -87.5), rotation: 1 },

            // Cabin Furniture
            { idString: "panel_without_button_small", position: Vec.create(-1, -93.8), rotation: 2 },
            { idString: "large_drawer", position: Vec.create(9.5, -93.5), rotation: 2 },

            { idString: "panel_with_a_button", position: Vec.create(22, -93.8), rotation: 2 },
            { idString: "panel_without_button_small", position: Vec.create(31.7, -93.8), rotation: 2 },

            // Vector Vault
            { idString: "vault_door", position: Vec.create(-6.5, -110), rotation: 3 },
        ],
        subBuildings: [
            { idString: "oil_tanker_ship_tanks", position: Vec.create(-1, 0)  },
        ],
    },
    {
        idString: "port",
        name: "Port",
        spawnHitbox: RectangleHitbox.fromRect(315, 425, Vec.create(0, 0)),
        groundGraphics: [
            { color: 0x626262, hitbox: RectangleHitbox.fromRect(315, 425, Vec.create(0, 0)) },
            { color: 0x525252, hitbox: RectangleHitbox.fromRect(310, 420, Vec.create(0, 0)) },

            // Crane tracks
            { color: 0x2b2b2b, hitbox: RectangleHitbox.fromRect(0.8, 211, Vec.create(67.2, -95)) },
            { color: 0x2b2b2b, hitbox: RectangleHitbox.fromRect(0.8, 211, Vec.create(69.6, -95)) },
            { color: 0x2b2b2b, hitbox: RectangleHitbox.fromRect(0.8, 211, Vec.create(130.3, -95)) },
            { color: 0x2b2b2b, hitbox: RectangleHitbox.fromRect(0.8, 211, Vec.create(132.7, -95)) },

            // Road Lines
            { color: 0xffff00, hitbox: RectangleHitbox.fromRect(1.2476, 340.443, Vec.create(155.28, -37.84)) },

            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 105.9294, Vec.create(-26.25, -28.92)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(117.5118, 1.53195, Vec.create(31.75, 23.32)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 164.3926, Vec.create(89.73, 105.48)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(39.00715, 1.53195, Vec.create(71, 186.96)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 125.15, Vec.create(52.01, 125.13)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(79.62335, 1.53195, Vec.create(12.97, 63.32)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 28.7803, Vec.create(-26.08, 77)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(8.85475, 1.53195, Vec.create(-22.42, 92.04)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(8.4059, 1.52505, Vec.create(-22.16, 112.58)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 41.4343, Vec.create(-26.08, 132.54)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(8.8755, 1.53195, Vec.create(-22.39, 152.49)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(8.4059, 1.53195, Vec.create(-22.13, 173.03)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 15.5026, Vec.create(-26.02, 180.02)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(39.05895, 1.53195, Vec.create(-45.09, 187)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 14.80615, Vec.create(-63.85, 180.36)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(9.6335, 1.53195, Vec.create(-67.9, 173.31)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(9.6278, 1.55265, Vec.create(-67.9, 152.66)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 40.41345, Vec.create(-63.85, 133.1)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(9.622, 1.53195, Vec.create(-67.9, 113.66)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(9.62375, 1.53195, Vec.create(-67.9, 92.26)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 125.33895, Vec.create(-63.85, 30.35)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(90.9875, 1.53195, Vec.create(-108.58, -31.94)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(45.67215, 1.53195, Vec.create(-131.27, -77.39)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 85.47215, Vec.create(-129.44, -165.98)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 85.47215, Vec.create(-103.91, -166.1)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 85.47215, Vec.create(-77.74, -165.82)) },
            { color: 0xe6e6e6, hitbox: RectangleHitbox.fromRect(1.53195, 85.47215, Vec.create(-50.76, -166.28)) }
        ],
        floors: [{
            type: "stone",
            hitbox: RectangleHitbox.fromRect(315, 425, Vec.create(0, 0))
        }],
        decals: [
            // Group 1
            {
                id: "container_mark",
                position: Vec.create(37.52, -184.72)
            },
            {
                id: "container_mark",
                position: Vec.create(51.98, -184.73)
            },
            {
                id: "container_mark",
                position: Vec.create(37.83, -157.25)
            },
            {
                id: "container_mark",
                position: Vec.create(52.23, -157.25)
            },
            // Group 2
            {
                id: "container_mark",
                position: Vec.create(98.38, -184.09)
            },
            {
                id: "container_mark",
                position: Vec.create(112.84, -184.09)
            },
            {
                id: "container_mark",
                position: Vec.create(98.69, -156.62)
            },
            {
                id: "container_mark",
                position: Vec.create(113.09, -156.62)
            },
            // Group 3
            {
                id: "container_mark",
                position: Vec.create(45.04, -110.4),
                orientation: 1
            },
            {
                id: "container_mark",
                position: Vec.create(45.04, -96.9),
                orientation: 1
            },
            {
                id: "container_mark",
                position: Vec.create(45.04, -83.32),
                orientation: 1
            },
            // Group 4
            {
                id: "container_mark",
                position: Vec.create(110, -110.4),
                orientation: 1
            },
            {
                id: "container_mark",
                position: Vec.create(110, -96.9),
                orientation: 1
            },
            {
                id: "container_mark",
                position: Vec.create(110, -83.32),
                orientation: 1
            },
            // Group 5
            {
                id: "container_mark",
                position: Vec.create(6.21, -45.74)
            },
            {
                id: "container_mark",
                position: Vec.create(20.57, -45.74)
            },
            {
                id: "container_mark",
                position: Vec.create(35.03, -45.74)
            },
            {
                id: "container_mark",
                position: Vec.create(6.21, -18.22)
            },
            {
                id: "container_mark",
                position: Vec.create(20.88, -18.22)
            },
            {
                id: "container_mark",
                position: Vec.create(35.28, -18.22)
            },
            // Group 6
            {
                id: "container_mark",
                position: Vec.create(104.35, -18.42)
            },
            {
                id: "container_mark",
                position: Vec.create(119.01, -18.42)
            },
            // Group 7
            {
                id: "container_mark",
                position: Vec.create(116.82, 83)
            },
            {
                id: "container_mark",
                position: Vec.create(131.21, 83)
            },
            {
                id: "container_mark",
                position: Vec.create(116.82, 110.65)
            },
            {
                id: "container_mark",
                position: Vec.create(131.21, 110.65)
            },
            // Group 8
            {
                id: "container_mark",
                position: Vec.create(116.79, 150.27)
            },
            {
                id: "container_mark",
                position: Vec.create(131.18, 150.27)
            },
            {
                id: "container_mark",
                position: Vec.create(116.59, 178.02)
            },
            {
                id: "container_mark",
                position: Vec.create(130.97, 178.02)
            },
            // Group 9
            {
                id: "container_mark",
                position: Vec.create(-128.55, 25.76),
                orientation: 1
            },
            {
                id: "container_mark",
                position: Vec.create(-128.55, 40.31),
                orientation: 1
            },
            {
                id: "container_mark",
                position: Vec.create(-128.55, 55.18),
                orientation: 1
            },
            {
                id: "container_mark",
                position: Vec.create(-101.15, 55.18),
                orientation: 1
            },
            {
                id: "container_mark",
                position: Vec.create(-101.15, 40.44),
                orientation: 1
            },
            {
                id: "container_mark",
                position: Vec.create(-101.15, 25.67),
                orientation: 1
            },
            {
                id: "floor_oil_01",
                position: Vec.create(-50.76, -140.28)
            },
            {
                id: "floor_oil_02",
                position: Vec.create(50, -130.4)
            },
            {
                id: "floor_oil_03",
                position: Vec.create(-40, -85)
            },
            {
                id: "floor_oil_02",
                position: Vec.create(100, -55)
            },
            {
                id: "floor_oil_06",
                position: Vec.create(35, 5)
            },
            {
                id: "floor_oil_07",
                position: Vec.create(-35, 40)
            },
            {
                id: "floor_oil_04",
                position: Vec.create(-95, -10)
            },
            {
                id: "floor_oil_03",
                position: Vec.create(-35, 190)
            },
            {
                id: "floor_oil_02",
                position: Vec.create(65, 115)
            },
            {
                id: "floor_oil_05",
                position: Vec.create(120, 55)
            }

        ],
        obstacles: [
            { idString: "barrier", position: Vec.create(-111.03, -53.92), rotation: 0 },

            { idString: "forklift", position: Vec.create(-47.33, 82.5), rotation: 0 },
            { idString: "pallet", position: Vec.create(-47.3, 94.99), rotation: 0 },
            { idString: "box", position: Vec.create(-50.13, 94.43), rotation: 0 },

            { idString: "forklift", position: Vec.create(115.62, -65.16), rotation: 3 },
            { idString: "pallet", position: Vec.create(103, -65.16), rotation: 3 },
            { idString: "box", position: Vec.create(105, -67), rotation: 3 },
            { idString: "box", position: Vec.create(105, -62), rotation: 3 },
            { idString: "box", position: Vec.create(100, -67), rotation: 3 },

            { idString: "forklift", position: Vec.create(-10.34, -100.2), rotation: 0 },
            { idString: "super_barrel", position: Vec.create(1, -107) },
            { idString: "regular_crate", position: Vec.create(10, -100) },

            { idString: "forklift", position: Vec.create(51.85, 123.47), rotation: 2 },

            { idString: "barrel", position: Vec.create(-107.03, -21.1) },
            { idString: "barrel", position: Vec.create(-97.03, -13.1) },
            { idString: "super_barrel", position: Vec.create(-85.03, -16.1) },
            { idString: "barrel", position: Vec.create(-85.03, -7.1) },
            { idString: "barrel", position: Vec.create(-75.03, -1.1) },
            { idString: "regular_crate", position: Vec.create(-97.03, -2.1) },
            { idString: "barrel", position: Vec.create(-107, 4) },
            { idString: "regular_crate", position: Vec.create(-85.03, 4) },

            { idString: "trailer", position: Vec.create(-40, 140), rotation: 0 },

            // Parked trucks (from left to right)
            { idString: "truck", position: Vec.create(-141.63, -178.02), rotation: 2 },
            { idString: "trailer", position: Vec.create(-141.63, -147), rotation: 2 },

            { idString: "truck", position: Vec.create(-115.02, -179.26), rotation: 2 },

            { idString: "truck", position: Vec.create(-89, -147.99), rotation: 0 },
            { idString: "trailer", position: Vec.create(-89, -178), rotation: 0 },

            { idString: "trailer", position: Vec.create(-36.19, -175.77), rotation: 0 },

            // Porta potty top loot
            { idString: "regular_crate", position: Vec.create(-7, -200.2) },
            { idString: "super_barrel", position: Vec.create(-10, -190.2) },

            { idString: "regular_crate", position: Vec.create(25, -178.2) },

            // Other stuff idk
            { idString: "regular_crate", position: Vec.create(-19, -35) },
            { idString: "barrel", position: Vec.create(-10, -20) },

            { idString: "barrel", position: Vec.create(5, 14) },
            {
                idString: { aegis_crate: 1, flint_crate: 1 },
                position: Vec.create(15, 14)
            },
            { idString: "super_barrel", position: Vec.create(25, 11) },

            {
                idString: { aegis_crate: 1, flint_crate: 1 },
                position: Vec.create(90, -32)
            },
            {
                idString: { aegis_crate: 1, flint_crate: 1 },
                position: Vec.create(85, -42)
            },

            { idString: "barrel", position: Vec.create(125, 20) },
            { idString: "regular_crate", position: Vec.create(120, 30) },
            { idString: "regular_crate", position: Vec.create(130, 35) },
            { idString: "barrel", position: Vec.create(112, 45) },
            { idString: "super_barrel", position: Vec.create(125, 48) },
            { idString: "barrel", position: Vec.create(135, 55) },
            { idString: "barrel", position: Vec.create(120, 58) },
            { idString: "barrel", position: Vec.create(108, 60) },

            { idString: "barrel", position: Vec.create(105, 105) },

            { idString: "regular_crate", position: Vec.create(103, 187) },
            { idString: "barrel", position: Vec.create(99, 198) },
            { idString: "regular_crate", position: Vec.create(110, 200) },

            { idString: "regular_crate", position: Vec.create(-60, 200) },
            { idString: "regular_crate", position: Vec.create(-50, 195) },

            { idString: "barrel", position: Vec.create(-150, 192) },
            { idString: "regular_crate", position: Vec.create(-140, 190) },
            { idString: "barrel", position: Vec.create(-140, 200) },

            { idString: "regular_crate", position: Vec.create(-140, 80) },

            { idString: "regular_crate", position: Vec.create(100, -125) },
            { idString: "barrel", position: Vec.create(110, -130) },

            { idString: "regular_crate", position: Vec.create(90, -90) },
            { idString: "barrel", position: Vec.create(80, -90) },
            { idString: "super_barrel", position: Vec.create(85, -100) },

            ...Array.from(
                { length: 11 },
                (_, i) => ({
                    idString: "inner_concrete_wall_1",
                    position: Vec.create(-26.23, -204 + 10.7 * i),
                    rotation: 1
                })
            ),
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "inner_concrete_wall_1",
                    position: Vec.create(-148 + 10.7 * i, -82.4),
                    rotation: 0
                })
            ),

            ...(() => Array.from(
                { length: 8 },
                (_, i) => ({
                    idString: "bollard",
                    position: Vec.create(152.79, 115.23 - (45.54 * i)),
                    rotation: 0
                })
            ))()

        ],
        subBuildings: [
            { idString: "porta_potty", position: Vec.create(171.2, -12.34), orientation: 1 },
            { idString: "porta_potty", position: Vec.create(151.2, -12.34), orientation: 1 },
            { idString: "porta_potty", position: Vec.create(131.2, -12.34), orientation: 1 },
            { idString: "port_shed", position: Vec.create(15.68, -136.56), orientation: 1 },
            //{ idString: "port_warehouse", position: Vec.create(-10, -132), orientation: 2 },
            //{ idString: "port_warehouse", position: Vec.create(-100, 132) },

            // Containers on trucks
            { idString: "container_2", position: Vec.create(-40, 140) },
            { idString: "container_2", position: Vec.create(-36.19, -175.77) },
            { idString: "container_1", position: Vec.create(-141.63, -147) },

            // Group 1
            {
                idString: randomContainer2,
                position: Vec.create(-37.52, 184.72),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(-51.98, 184.73),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(37.83, -157.25)
            },
            {
                idString: randomContainer2,
                position: Vec.create(51.98, -157.25)
            },
            // Group 2
            {
                idString: randomContainer2,
                position: Vec.create(-98.38, 184.09),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(-112.84, 184.09),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(113.09, -156.62)
            },
            {
                idString: randomContainer2,
                position: Vec.create(98.38, -156.62)
            },
            // Group 3
            {
                idString: randomContainer2,
                position: Vec.create(-110.4, -45.04),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: Vec.create(-96.9, -45.04),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: Vec.create(83.32, 45.04),
                orientation: 1
            },
            // Group 4
            {
                idString: randomContainer2,
                position: Vec.create(110.4, 110),
                orientation: 1
            },
            {
                idString: randomContainer2,
                position: Vec.create(-96.9, -110),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: Vec.create(83.32, 110),
                orientation: 1
            },
            // Group 5
            {
                idString: randomContainer2,
                position: Vec.create(-6.21, 45.74),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(-20.57, 45.74),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(-35.28, 45.74),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(6.21, -18.22)
            },
            {
                idString: randomContainer2,
                position: Vec.create(20.88, -18.22)
            },
            {
                idString: randomContainer2,
                position: Vec.create(35.28, -18.22)
            },
            // Group 6
            {
                idString: randomContainer2,
                position: Vec.create(104.35, -18.42)
            },
            {
                idString: randomContainer2,
                position: Vec.create(119.01, -18.42)
            },
            // Group 7
            {
                idString: randomContainer2,
                position: Vec.create(-116.82, -83),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(-131.21, -83),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(116.82, 110.65)
            },
            {
                idString: randomContainer2,
                position: Vec.create(131.21, 110.65)
            },

            // Group 8
            {
                idString: randomContainer2,
                position: Vec.create(-116.79, -150.27),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(-131.18, -150.27),
                orientation: 2
            },
            {
                idString: randomContainer2,
                position: Vec.create(130.97, 178.02)
            },
            {
                idString: randomContainer2,
                position: Vec.create(116.59, 178.02)
            },
            // Group 9
            {
                idString: randomContainer2,
                position: Vec.create(25.76, 128.55),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: Vec.create(40.31, 128.55),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: Vec.create(55.18, 128.55),
                orientation: 3
            },
            {
                idString: randomContainer2,
                position: Vec.create(-55.18, -101.15),
                orientation: 1
            },
            {
                idString: randomContainer2,
                position: Vec.create(-40.31, -101.15),
                orientation: 1
            },
            {
                idString: randomContainer2,
                position: Vec.create(-25.67, -101.15),
                orientation: 1
            }
        ]
    },
    {
        idString: "new_port",
        name: "Port",
        spawnHitbox: RectangleHitbox.fromRect(315, 425, Vec.create(0, 0)),
        floorImages: [
            {
                key: "port_floor",
                position: Vec.create(-4.5, 0)
            },
        ],
        floors: [{
            type: "stone",
            hitbox: RectangleHitbox.fromRect(315, 425, Vec.create(0, 0))
        }],
        decals: [
    // Group 1
    {
        id: "container_mark",
        position: Vec.create(-50, 0)
    },
    {
        id: "container_mark",
        position: Vec.create(-35, 0)
    },
    {
        id: "container_mark",
        position: Vec.create(-20, 0)
    },
        ],
        obstacles: [
            { idString: "truck", position: Vec.create(72.5, 34), rotation: 3 },
            { idString: "trailer", position: Vec.create(100, 34), rotation: 1 },

            { idString: "forklift", position: Vec.create(95, 64), rotation: 1 },
            { idString: "barrel", position: Vec.create(107.5, 64), rotation: 1 },
            { idString: "pallet", position: Vec.create(107.5, 64), rotation: 1 },

            { idString: "trailer", position: Vec.create(100, 84), rotation: 1 },

            { idString: "regular_crate", position: Vec.create(100, 110), rotation: 1 },
            { idString: "regular_crate", position: Vec.create(110, 115), rotation: 1 },
            { idString: "regular_crate", position: Vec.create(113, 103), rotation: 1 },

            { idString: "box", position: Vec.create(37, 113), rotation: 1 },
            { idString: "box", position: Vec.create(42, 110), rotation: 1 },
            { idString: "box", position: Vec.create(35, 107), rotation: 1 },
            { idString: "box", position: Vec.create(42, 104), rotation: 1 },

            { idString: "forklift", position: Vec.create(20, 102.5), rotation: 2 },
            { idString: "pallet", position: Vec.create(20, 90), rotation: 2 },

            { idString: "barrier", position: Vec.create(-124, -10), rotation: 0 },

            { idString: "sand_bag", position: Vec.create(-135, -5), rotation: 1 },
            { idString: "sand_bag", position: Vec.create(-135, -20), rotation: 2 },

            ...(() => Array.from(
                { length: 5 },
                (_, i) => ({
                    idString: "bollard",
                    position: Vec.create(140, 50 - (41.5 * i)),
                    rotation: 0
                })
            ))()
        ],
        subBuildings: [
            { idString: "container_1", position: Vec.create(-84, 100), orientation: 1},
            { idString: "crane", position: Vec.create(97, 25) },
            { idString: "port_warehouse_red", position: Vec.create(-95, -60), orientation: 1 },
            { idString: "port_warehouse_blue", position: Vec.create(-97, 15), orientation: 3 },
            { idString: "port_shed", position: Vec.create(-25, -134), orientation: 1 },
        ]
    },
    {
        idString: "port_complex",
        name: "Port Complex",
        spawnHitbox: RectangleHitbox.fromRect(430, 425, Vec.create(-63, 0)),
        spawnMode: MapObjectSpawnMode.Beach,
        subBuildings: [
            { idString: "port", position: Vec.create(-120, 0) },
            { idString: "ship", position: Vec.create(82, -50) },
            { idString: "crane", position: Vec.create(-20, -95) }
        ]
    }

]);
