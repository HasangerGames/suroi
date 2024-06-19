import { ZIndexes } from "../constants";
import { type Orientation, type Variation } from "../typings";
import { CircleHitbox, HitboxGroup, PolygonHitbox, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { ContainerTints, MapObjectSpawnMode, ObjectDefinitions, type ObjectDefinition, type ReferenceTo } from "../utils/objectDefinitions";
import { randomSign, randomVector } from "../utils/random";
import { type FloorTypes } from "../utils/terrain";
import { Vec, type Vector } from "../utils/vector";
import { type DecalDefinition } from "./decals";
import { RotationMode, type ObstacleDefinition } from "./obstacles";

interface BuildingObstacle {
    readonly idString: ReferenceTo<ObstacleDefinition> | Record<ReferenceTo<ObstacleDefinition>, number>
    readonly position: Vector
    readonly rotation?: number
    readonly variation?: Variation
    readonly scale?: number
    readonly lootSpawnOffset?: Vector
    readonly puzzlePiece?: string | boolean
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
    readonly idString: ReferenceTo<DecalDefinition>
    readonly position: Vector
    readonly orientation?: Orientation
    readonly scale?: number
}

export interface BuildingDefinition extends ObjectDefinition {
    readonly spawnHitbox: Hitbox
    readonly scopeHitbox?: Hitbox
    readonly ceilingHitbox?: Hitbox
    readonly hideOnMap: boolean
    readonly spawnMode: MapObjectSpawnMode

    readonly bridgeSpawnOptions?: {
        readonly minRiverWidth: number
        readonly maxRiverWidth: number
        readonly landCheckDist: number
    }

    readonly obstacles: readonly BuildingObstacle[]
    readonly lootSpawners: readonly LootSpawner[]
    readonly subBuildings: readonly SubBuilding[]
    readonly decals: readonly BuildingDecal[]

    readonly puzzle?: {
        readonly triggerInteractOn: ReferenceTo<ObstacleDefinition>
        readonly interactDelay: number
        readonly order?: readonly string[]
        readonly solvedSound?: boolean
        /**
         * Don't wait for the interact delay before setting solved to true
         */
        readonly setSolvedImmediately?: boolean
    }

    readonly sounds?: {
        readonly normal?: string
        readonly solved?: string
        readonly position?: Vector
        readonly maxRange: number
        readonly falloff: number
    }

    readonly floorImages: ReadonlyArray<{
        readonly key: string
        readonly position: Vector
        readonly rotation?: number
        readonly scale?: Vector
        readonly tint?: number | `#${string}`
    }>

    readonly ceilingImages: ReadonlyArray<{
        readonly key: string
        readonly position: Vector
        readonly residue?: string
        readonly tint?: number | `#${string}`
    }>
    readonly ceilingZIndex: ZIndexes

    /**
     * How many walls need to be broken to destroy the ceiling
     */
    readonly wallsToDestroy: number

    readonly floors: ReadonlyArray<{
        readonly type: keyof typeof FloorTypes
        readonly hitbox: Hitbox
    }>

    readonly groundGraphics: ReadonlyArray<{
        readonly color: number | `#${string}`
        readonly hitbox: Hitbox
    }>

    readonly rotationMode: RotationMode.Limited | RotationMode.Binary | RotationMode.None
}

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

const warehouseObstacle = {
    regular_crate: 2,
    barrel: 2,
    flint_crate: 1
};

const fireworkWarehouseObstacle = {
    regular_crate: 3,
    barrel: 1,
    super_barrel: 1,
    ammo_crate: 2,
    rocket_box: 1,
    confetti_grenade_box: 1
};

const randomBarrel = {
    super_barrel: 1,
    barrel: 2
};

export const Buildings = ObjectDefinitions.create<BuildingDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            hideOnMap: false,
            spawnMode: MapObjectSpawnMode.Grass,
            obstacles: [],
            lootSpawners: [],
            subBuildings: [],
            decals: [],
            wallsToDestroy: Infinity,
            floorImages: [],
            ceilingImages: [],
            ceilingZIndex: ZIndexes.BuildingsCeiling,
            floors: [],
            groundGraphics: [],
            rotationMode: RotationMode.Limited
        }),
        container: (
            id: number,
            tint: number,
            wallsId: number,
            open: "open2" | "open1" | "closed",
            damaged?: boolean
        ) => {
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
                        idString: `container_walls_${wallsId}`,
                        position: Vec.create(0, 0),
                        rotation: 0
                    }
                ],
                lootSpawners: open === "closed"
                    ? []
                    : [{
                        position: Vec.create(0, 0),
                        table: "ground_loot"
                    }]
            };
        }
    })
)(
    ({ simple }) => [
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
                },
                {
                    type: "wood",
                    hitbox: RectangleHitbox.fromRect(9.8, 3.5, Vec.create(1.5, 10.6))
                }
            ],
            obstacles: [
                {
                    idString: {
                        porta_potty_toilet_open: 0.7,
                        porta_potty_toilet_closed: 0.3
                    },
                    position: Vec.create(0, -5),
                    lootSpawnOffset: Vec.create(0, 5),
                    rotation: 0
                },
                {
                    idString: "porta_potty_back_wall",
                    position: Vec.create(0, -8.75),
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
                    position: Vec.create(-4.6, 8.66),
                    rotation: 2
                }
            ]
        },
        {
            idString: "green_house",
            name: "Green House",
            spawnHitbox: RectangleHitbox.fromRect(110, 70),
            scopeHitbox: new HitboxGroup(
                RectangleHitbox.fromRect(83, 58, Vec.create(-8.5, -1.5)),
                RectangleHitbox.fromRect(14, 19.4, Vec.create(38, 7.1))
            ),
            floorImages: [{
                key: "green_house_floor",
                position: Vec.create(0, 0)
            }],
            ceilingImages: [{
                key: "green_house_ceiling",
                position: Vec.create(-2, -1.1)
            }],
            floors: [
                {
                    type: "wood",
                    hitbox: new HitboxGroup(
                        RectangleHitbox.fromRect(83, 58, Vec.create(-8.5, -1.5)),
                        RectangleHitbox.fromRect(14, 19.4, Vec.create(38, 7.1)),
                        RectangleHitbox.fromRect(6, 13.5, Vec.create(47.7, 7.1))
                    )
                },
                {
                    type: "stone",
                    hitbox: RectangleHitbox.fromRect(10.3, 5, Vec.create(-35.7, 30.2))
                }
            ],
            obstacles: [
                { idString: "green_house_exterior", position: Vec.create(0, 0), rotation: 0 },
                { idString: "window", position: Vec.create(32.99, -12.81), rotation: 0 },
                { idString: "window", position: Vec.create(17.59, 27.52), rotation: 1 },
                { idString: "window", position: Vec.create(-23.44, -30.22), rotation: 1 },
                { idString: "door", position: Vec.create(33.03, 6.74), rotation: 1 },
                { idString: "door", position: Vec.create(11.92, -13.22), rotation: 1 },
                { idString: "door", position: Vec.create(-36.15, 27.47), rotation: 2 },
                { idString: "door", position: Vec.create(-22.56, -6.26), rotation: 0 },
                { idString: "house_wall_1", position: Vec.create(-13.3, -6.24), rotation: 0 },
                { idString: "house_wall_3", position: Vec.create(11.99, -23.64), rotation: 1 },
                { idString: "house_wall_4", position: Vec.create(-7.26, -18.54), rotation: 1 },
                { idString: "house_wall_5", position: Vec.create(2.24, -6.35), rotation: 0 },
                { idString: "house_wall_6", position: Vec.create(-7.33, 18.92), rotation: 1 },
                { idString: "house_wall_7", position: Vec.create(-38.53, -6.29), rotation: 0 },
                { idString: "house_column", position: Vec.create(-7.33, 9.98), rotation: 0 },
                { idString: "house_column", position: Vec.create(11.76, -6.26), rotation: 0 },
                { idString: "house_column", position: Vec.create(-7.27, -6.32), rotation: 0 },

                { idString: "toilet", position: Vec.create(-2.32, -24.62), rotation: 0 },
                { idString: "mobile_home_sink", position: Vec.create(5.91, -25.11), rotation: 0 },
                { idString: "bed", position: Vec.create(-43.06, -20.98), rotation: 0 },
                { idString: "small_drawer", position: Vec.create(-33.63, -25.48), rotation: 0 },
                { idString: "potted_plant", position: Vec.create(17.46, -25.03) },
                { idString: "potted_plant", position: Vec.create(-12.73, -12.13) },
                { idString: "washing_machine", position: Vec.create(27.07, -25.54), rotation: 0 },
                { idString: "tv", position: Vec.create(2.43, -4.51), rotation: 1 },
                { idString: "large_drawer", position: Vec.create(28.24, 20), rotation: 3 },
                { idString: "couch", position: Vec.create(2.36, 22.18), rotation: 1 },
                { idString: "green_house_small_table", position: Vec.create(2.02, 11.51), rotation: 1 },
                { idString: "green_house_large_table", position: Vec.create(-15.91, 16.87), rotation: 0 },
                { idString: "chair", position: Vec.create(-21.87, 20.61), rotation: 3 },
                { idString: "chair", position: Vec.create(-21.87, 13.45), rotation: 3 },
                { idString: "chair", position: Vec.create(-16.02, 8.25), rotation: 2 },
                { idString: "fridge", position: Vec.create(-45.15, 21.66), rotation: 1 },
                { idString: "stove", position: Vec.create(-45.15, 12.3), rotation: 1 },
                { idString: "large_drawer", position: Vec.create(-45.12, 1.28), rotation: 1 },
                { idString: "gun_mount_hp18", position: Vec.create(30.33, -2.98), rotation: 3, lootSpawnOffset: Vec.create(-4, 0) },
                { idString: "bookshelf", position: Vec.create(-10.88, -22.62), rotation: 1 }
            ],
            lootSpawners: [
                { table: "ground_loot", position: Vec.create(18.48, 6.37) },
                { table: "ground_loot", position: Vec.create(-23.91, -18.07) }
            ]
        },
        {
            idString: "firework_warehouse",
            name: "Firework Warehouse",
            spawnHitbox: RectangleHitbox.fromRect(110, 70),
            scopeHitbox: RectangleHitbox.fromRect(65, 48),
            floorImages: [{
                key: "firework_warehouse",
                position: Vec.create(0, 0)
            }],
            ceilingImages: [{
                key: "firework_warehouse_ceiling",
                position: Vec.create(0, 0)
            }],
            floors: [
                {
                    type: "stone",
                    hitbox: RectangleHitbox.fromRect(65, 48, Vec.create(0, 0))
                }
            ],
            obstacles: [
                { idString: "firework_warehouse_exterior", position: Vec.create(0, 0), rotation: 0 },
                { idString: randomBarrel, position: Vec.create(-27, 18) },
                { idString: randomBarrel, position: Vec.create(27, -18) },
                { idString: "window", position: Vec.create(32.4, 0), rotation: 2 },
                { idString: "window", position: Vec.create(-32.4, 0), rotation: 2 },
                { idString: "door", position: Vec.create(-0.47, 23), rotation: 2 },
                { idString: "door", position: Vec.create(0.47, -23), rotation: 0 },
                { idString: "confetti_grenade_box", position: Vec.create(29, -12) },
                { idString: "rocket_box", position: Vec.create(-29, 12) },
                { idString: "confetti_grenade_box", position: Vec.create(-27, 7) },
                { idString: "rocket_box", position: Vec.create(-22, 9) },
                { idString: fireworkWarehouseObstacle, position: Vec.create(-17, 17) },
                { idString: fireworkWarehouseObstacle, position: Vec.create(17, -17) },
                { idString: "ammo_crate", position: Vec.create(26.8, 17) },
                { idString: fireworkWarehouseObstacle, position: Vec.create(-26.8, -17) },
                { idString: { box: 9, grenade_box: 1 }, position: Vec.create(18.8, 14) },
                { idString: "confetti_grenade_box", position: Vec.create(20, 19) },
                { idString: "hazel_crate", position: Vec.create(0, 0) }
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
                { idString: "warehouse_walls", position: Vec.create(-19.8, 0), rotation: 0 },
                { idString: "warehouse_walls", position: Vec.create(19.8, 0), rotation: 2 },

                { idString: warehouseObstacle, position: Vec.create(14, -28.5) },
                { idString: "regular_crate", position: Vec.create(-14, -28.5) },
                { idString: "regular_crate", position: Vec.create(14, 28.5) },
                { idString: warehouseObstacle, position: Vec.create(-14, 28.5) },

                { idString: "ammo_crate", position: Vec.create(-14, 0) },
                { idString: "ammo_crate", position: Vec.create(14, 0) },

                { idString: { box: 9, grenade_box: 1 }, get position() { return randomVector(-16.6, -11.25, -14.93, -8.03); } },
                { idString: { box: 9, grenade_box: 1 }, get position() { return randomVector(-16.6, -11.25, 14.93, 8.03); } },
                { idString: { box: 9, grenade_box: 1 }, get position() { return randomVector(16.6, 11.25, -14.93, -8.03); } },
                { idString: { box: 9, grenade_box: 1 }, get position() { return randomVector(16.6, 11.25, 14.93, 8.03); } },
                { idString: { box: 9, grenade_box: 1 }, get position() { return Vec.create(16.15 * randomSign(), 20.97 * randomSign()); } }
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
            spawnHitbox: RectangleHitbox.fromRect(72, 130),
            scopeHitbox: RectangleHitbox.fromRect(58, 118),
            floorImages: [
                {
                    key: "port_warehouse_floor",
                    position: Vec.create(2, -30.2)
                },
                {
                    key: "port_warehouse_floor",
                    position: Vec.create(-2, 30.2),
                    rotation: Math.PI
                }
            ],
            ceilingImages: [{
                key: "port_warehouse_ceiling",
                position: Vec.create(0, 0),
                tint: 0x813131
            }],
            obstacles: [
                {
                    idString: "port_warehouse_walls",
                    position: Vec.create(2, -30.2),
                    rotation: 0
                },
                {
                    idString: "port_warehouse_walls",
                    position: Vec.create(-2, 30.2),
                    rotation: 2
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
            spawnHitbox: RectangleHitbox.fromRect(72, 130),
            scopeHitbox: RectangleHitbox.fromRect(58, 118),
            floorImages: [
                {
                    key: "port_warehouse_floor",
                    position: Vec.create(2, -30.2)
                },
                {
                    key: "port_warehouse_floor",
                    position: Vec.create(-2, 30.2),
                    rotation: Math.PI
                }
            ],
            ceilingImages: [{
                key: "port_warehouse_ceiling",
                position: Vec.create(0, 0),
                tint: 0x2e2e6a
            }],
            obstacles: [
                {
                    idString: "port_warehouse_walls",
                    position: Vec.create(2, -30.2),
                    rotation: 0
                },
                {
                    idString: "port_warehouse_walls",
                    position: Vec.create(-2, 30.2),
                    rotation: 2
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
                    rotation: 1,
                    lootSpawnOffset: Vec.create(4, 0)
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
            ] as BuildingObstacle[],
            subBuildings: [
                {
                    idString: "porta_potty",
                    position: Vec.create(59.75, -27.6)
                }
            ]
        },
        {
            idString: "red_house",
            name: "Red House",
            spawnHitbox: RectangleHitbox.fromRect(80, 80),
            scopeHitbox: RectangleHitbox.fromRect(60, 56),
            floorImages: [{
                key: "red_house_floor",
                position: Vec.create(0, 0)
            }],
            ceilingImages: [{
                key: "red_house_ceiling",
                position: Vec.create(0, -0.25)
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
                { idString: "house_wall_4", position: Vec.create(8.75, -18), rotation: 1 },
                { idString: "house_wall_1", position: Vec.create(2.73, -6.07), rotation: 0 },
                { idString: "house_wall_9", position: Vec.create(-20.94, -6.07), rotation: 0 },
                { idString: "house_column", position: Vec.create(8.75, -6.12), rotation: 0 },
                { idString: "door", position: Vec.create(-7.36, -6.06), rotation: 2 },
                { idString: "bookshelf", position: Vec.create(5.11, -21.95), rotation: 1 },
                { idString: "couch", position: Vec.create(-21.48, -1.01), rotation: 3 },
                { idString: "large_drawer", position: Vec.create(-25.98, 21.3), rotation: 1 },
                // Bathroom Left
                {
                    idString: "house_wall_4",
                    position: Vec.create(-2.50, 17.2),
                    rotation: 1
                },
                // Bathroom Right
                {
                    idString: "house_wall_4",
                    position: Vec.create(9.55, 17.2),
                    rotation: 1
                },
                // Bathroom Door
                {
                    idString: "door",
                    position: Vec.create(3.1, 7.2),
                    rotation: 2
                },
                // Bathroom Toilet
                {
                    idString: { toilet: 2, used_toilet: 1 },
                    position: Vec.create(3.6, 23.5),
                    rotation: 2
                },
                // Front Door
                {
                    idString: "door",
                    position: Vec.create(-14.85, 29),
                    rotation: 2
                },
                {
                    idString: "door",
                    position: Vec.create(16.2, -29.5),
                    rotation: 2
                },
                // Living Room Bookshelf
                {
                    idString: "bookshelf",
                    position: Vec.create(-6, 17.5),
                    rotation: 3
                },
                // Kitchen Stove
                {
                    idString: "stove",
                    position: Vec.create(15.5, 24),
                    rotation: 2
                },
                // Kitchen Fridge
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
                },
                // Near Backdoor Chair
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
                },
                // Bedroom Drawer
                {
                    idString: "small_drawer",
                    position: Vec.create(-26, -11.5),
                    rotation: 1
                },
                // Bedroom Window
                {
                    idString: "window",
                    position: Vec.create(-7.2, -29.5),
                    rotation: 1
                },
                // Living Room Window
                {
                    idString: "window",
                    position: Vec.create(-31, 7.5),
                    rotation: 2
                },
                // Kitchen Window
                {
                    idString: "window",
                    position: Vec.create(31, 15.4),
                    rotation: 2
                },
                // Backdoor Window
                {
                    idString: "window",
                    position: Vec.create(31, -15.9),
                    rotation: 2
                },
                {
                    idString: "red_house_exterior",
                    position: Vec.create(0, 0),
                    rotation: 2
                }
            ],
            lootSpawners: [
                { table: "ground_loot", position: Vec.create(16.44, -15.64) },
                { table: "ground_loot", position: Vec.create(-15.42, 17.44) }
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
                }
            ],
            ceilingZIndex: ZIndexes.BuildingsCeiling + 1, // makes the crane ceiling render above container ceilings
            obstacles: [
                { idString: "crane_base_part", position: Vec.create(-31.55, -87.3), rotation: 0 },
                { idString: "crane_base_part", position: Vec.create(-31.55, -35.6), rotation: 0 },

                { idString: "crane_base_part", position: Vec.create(32, -87.3), rotation: 0 },
                { idString: "crane_base_part", position: Vec.create(32, -35.6), rotation: 0 }
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
        simple("container", 1, ContainerTints.White, 1, "closed"),
        simple("container", 2, ContainerTints.Red, 1, "closed"),
        simple("container", 3, ContainerTints.Green, 2, "open1"),
        simple("container", 4, ContainerTints.Green, 2, "open1", true),
        simple("container", 5, ContainerTints.Blue, 3, "open1"),
        simple("container", 6, ContainerTints.Blue, 3, "open1", true),
        simple("container", 7, ContainerTints.Blue, 4, "open2"),
        simple("container", 8, ContainerTints.Blue, 4, "open2", true),
        simple("container", 9, ContainerTints.Yellow, 5, "open1"),
        simple("container", 10, ContainerTints.Yellow, 6, "open2"),
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
            puzzle: {
                triggerInteractOn: "vault_door",
                interactDelay: 2000
            },
            sounds: {
                solved: "generator_running",
                position: Vec.create(23, 75),
                maxRange: 416,
                falloff: 2
            },
            floorImages: [
                {
                    key: "ship_floor_1",
                    position: Vec.create(0, -65)
                },
                {
                    key: "ship_floor_2",
                    position: Vec.create(0.02, 64.8)
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
                { idString: "tango_crate", position: Vec.create(9, 93.5), rotation: 0 },
                { idString: "super_barrel", position: Vec.create(-12, 89) },
                { idString: "box", position: Vec.create(28.5, 87) },
                { idString: "box", position: Vec.create(30, 93) },
                { idString: "box", position: Vec.create(-12, 99) },

                // Main hitbox
                { idString: "ship", position: Vec.create(0, 0), rotation: 0 },

                { idString: "ship_oil_tank", position: Vec.create(-14, -111), rotation: 0 },
                { idString: "generator", position: Vec.create(23, 75), rotation: 0, puzzlePiece: true },
                { idString: "barrel", position: Vec.create(24, 66) },
                {
                    idString: { barrel: 1, super_barrel: 1 },
                    position: Vec.create(21, 58)
                },
                { idString: "regular_crate", position: Vec.create(-6, 73) },
                { idString: "regular_crate", position: Vec.create(-4, 61) },

                // Captain's cabin
                { idString: "control_panel_small", position: Vec.create(14.5, -57), rotation: 2 },
                { idString: "control_panel2", position: Vec.create(5, -57), rotation: 2 },
                { idString: "regular_crate", position: Vec.create(-7, -84) },
                { idString: "barrel", position: Vec.create(2, -85) },
                { idString: "bookshelf", position: Vec.create(23.5, -86.5), rotation: 2 },

                { idString: "window2", position: Vec.create(-16, -50.5), rotation: 1 },
                { idString: "window2", position: Vec.create(-6, -50.5), rotation: 1 },
                { idString: "window2", position: Vec.create(7, -50.5), rotation: 1 },
                { idString: "window2", position: Vec.create(18, -50.5), rotation: 1 }

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
            ] as SubBuilding[],
            lootSpawners: [{
                position: Vec.create(10, -73),
                table: "gas_can"
            }]
        },
        {
            idString: "oil_tanker_ship",
            name: "Oil Tanker",
            spawnHitbox: RectangleHitbox.fromRect(110, 300),
            scopeHitbox: new HitboxGroup(
                RectangleHitbox.fromRect(65, 29, Vec.create(4.5, -102.5)),
                RectangleHitbox.fromRect(7.5, 28, Vec.create(41.7, -101.5))
            ),
            puzzle: {
                triggerInteractOn: "vault_door",
                interactDelay: 1500
            },
            floorImages: [
                {
                    key: "oil_tanker_ship_floor_1",
                    position: Vec.create(0, -59.439)
                },
                {
                    key: "oil_tanker_ship_floor_2",
                    position: Vec.create(0, 59.439)
                }
            ],
            ceilingImages: [
                {
                    key: "oil_tanker_ship_ceiling",
                    position: Vec.create(7, -99.5)
                },
                {
                    key: "oil_tanker_ship_tank_ceiling",
                    position: Vec.create(9.5, 20)
                }
            ],
            floors: [
                {
                    type: "stone",
                    hitbox: RectangleHitbox.fromRect(82, 210, Vec.create(8.5, -13))
                },
                {
                    type: "metal",
                    hitbox: RectangleHitbox.fromRect(20, 10, Vec.create(-42, 18.5))
                },
                {
                    type: "metal",
                    hitbox: RectangleHitbox.fromRect(20, 10, Vec.create(-42, 58.5))
                }
            ],
            obstacles: [
                // Main Ship Hitbox
                { idString: "oil_tanker_ship", position: Vec.create(0, 0), rotation: 0 },

                // Oil Tanks
                { idString: "large_oil_tank", position: Vec.create(9, -46.5), rotation: -Math.PI * 2 },
                { idString: "large_oil_tank", position: Vec.create(9, 20), rotation: Math.PI / 2 },
                { idString: "large_oil_tank", position: Vec.create(9, 88), rotation: -Math.PI / 2 },

                // Cabin Windows
                { idString: "window2", position: Vec.create(-0.25, -87.5), rotation: 1 },
                { idString: "window2", position: Vec.create(9.75, -87.5), rotation: 1 },

                { idString: "window2", position: Vec.create(22, -87.5), rotation: 1 },
                { idString: "window2", position: Vec.create(31, -87.5), rotation: 1 },

                // Cabin Furniture
                { idString: "control_panel_small", position: Vec.create(-1, -93.8), rotation: 2 },
                { idString: "large_drawer", position: Vec.create(9.5, -93.5), rotation: 2 },

                { idString: "control_panel", position: Vec.create(22, -93.8), rotation: 2, puzzlePiece: true },
                { idString: "control_panel_small", position: Vec.create(31.7, -93.8), rotation: 2 },

                // Vector Vault
                { idString: "vault_door", position: Vec.create(-6.5, -110), rotation: 3 },
                { idString: "briefcase", position: Vec.create(-22.5, -94), rotation: 0 },
                { idString: "regular_crate", position: Vec.create(-12.19, -94.34) },
                { idString: "regular_crate", position: Vec.create(-23.1, -102.93) },

                // Front of ship
                { idString: "barrel", position: Vec.create(-27, 68) },
                { idString: "regular_crate", position: Vec.create(-18, 66) },
                { idString: "regular_crate", position: Vec.create(42, 66) },
                {
                    idString: {
                        regular_crate: 2,
                        aegis_crate: 1,
                        flint_crate: 1
                    },
                    position: Vec.create(32, 60),
                    rotation: 2
                },

                // Mid Ship
                { idString: "sandbags", position: Vec.create(-22, 1), rotation: 2 },
                { idString: "super_barrel", position: Vec.create(-27, -20) },
                { idString: "barrel", position: Vec.create(-15, -15) },
                { idString: "regular_crate", position: Vec.create(-25, -10) },
                { idString: "sandbags", position: Vec.create(43, -20), rotation: 1 },
                { idString: "super_barrel", position: Vec.create(43, -7.5) },
                { idString: "sandbags", position: Vec.create(30, -16), rotation: 2 },
                { idString: "flint_crate", position: Vec.create(41, -35) }
            ] as BuildingObstacle[],
            subBuildings: [
                { idString: "oil_tanker_ship_vault", position: Vec.create(-17.6, -102.6) }
            ]
        },
        {
            idString: "oil_tanker_ship_vault",
            name: "Oil Tanker Ship Vault",
            spawnHitbox: RectangleHitbox.fromRect(22.73, 28.32),
            scopeHitbox: RectangleHitbox.fromRect(22.73, 28.32),
            ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
            ceilingImages: [{
                key: "oil_tanker_ship_vault_ceiling",
                position: Vec.create(0, 0)
            }]
        },
        {
            idString: "port",
            name: "Port",
            spawnHitbox: RectangleHitbox.fromRect(315, 290, Vec.create(-5, 0)),
            groundGraphics: [
                {
                    color: "#6664",
                    hitbox: RectangleHitbox.fromRect(297.2, 271.7, Vec.create(-4.5, 0))
                },
                {
                    color: 0x595959,
                    hitbox: RectangleHitbox.fromRect(293.5, 267.96, Vec.create(-4.5, 0))
                },
                {
                    color: 0xe6e6e6,
                    hitbox: new HitboxGroup(
                        RectangleHitbox.fromRect(1.47, 102.18, Vec.create(129.93, 73.42)),
                        RectangleHitbox.fromRect(126.01, 1.5, Vec.create(67.66, 123.77)),
                        RectangleHitbox.fromRect(84.61, 1.48, Vec.create(88.35, 74.7)),
                        RectangleHitbox.fromRect(74.74, 1.52, Vec.create(-113.86, -33.25)),
                        RectangleHitbox.fromRect(84.61, 1.49, Vec.create(88.35, 49.55)),
                        RectangleHitbox.fromRect(1.51, 56, Vec.create(-77.24, -5)),
                        RectangleHitbox.fromRect(207.5, 1.5, Vec.create(25.75, 23.08)),
                        RectangleHitbox.fromRect(84.61, 1.49, Vec.create(88.35, 98.77)),
                        RectangleHitbox.fromRect(1.47, 63.43, Vec.create(5.4, 92.81)),
                        RectangleHitbox.fromRect(82.47, 1.48, Vec.create(-35.1, 61.83)),
                        RectangleHitbox.fromRect(1.44, 8.6, Vec.create(-75.61, 65.39)),
                        RectangleHitbox.fromRect(1.46, 8.6, Vec.create(-102.2, 65.39)),
                        RectangleHitbox.fromRect(14, 1.48, Vec.create(-109.9, 61.83)),
                        RectangleHitbox.fromRect(1.46, 55.47, Vec.create(-116.51, 34.84)),
                        RectangleHitbox.fromRect(35.45, 1.47, Vec.create(-133.5, 7.85))
                    )
                },
                {
                    color: 0xb2b200,
                    hitbox: RectangleHitbox.fromRect(1.87, 186.8, Vec.create(143.17, -33.97))
                },
                {
                    color: 0x2b2b2b,
                    hitbox: new HitboxGroup(
                        RectangleHitbox.fromRect(0.75, 128, Vec.create(64.33, -46)),
                        RectangleHitbox.fromRect(0.75, 128, Vec.create(66.55, -46)),
                        RectangleHitbox.fromRect(0.75, 128, Vec.create(127.9, -46)),
                        RectangleHitbox.fromRect(0.75, 128, Vec.create(130.1, -46))
                    )
                }
            ],
            floors: [{
                type: "stone",
                hitbox: RectangleHitbox.fromRect(300, 270, Vec.create(-5, 0))
            }],
            decals: [
                { idString: "floor_oil_01", position: Vec.create(69.49, 116.11) },
                { idString: "floor_oil_02", position: Vec.create(-87.54, -117.88) },
                { idString: "floor_oil_03", position: Vec.create(-147.56, -92.28) },
                { idString: "floor_oil_04", position: Vec.create(86.72, -64.06) },
                { idString: "floor_oil_05", position: Vec.create(-135.24, 82.47) },
                { idString: "floor_oil_06", position: Vec.create(-79.85, -46.97) },
                { idString: "floor_oil_07", position: Vec.create(-13.48, 10.95) },

                // Group 1 Near Entrance
                {
                    idString: "container_mark",
                    position: Vec.create(-60, 5)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-45, 5)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-30, 5)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-60, -25)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-45, -25)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-30, -25)
                },
                // Group 2 Near Crane
                {
                    idString: "container_mark",
                    position: Vec.create(5, 5)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(20, 5)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(35, 5)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(5, -25)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(20, -25)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(35, -25)
                },

                // Group 3 Top Left corner
                {
                    idString: "container_mark",
                    position: Vec.create(-100, -60)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-115, -60)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-130, -60)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-100, -90)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-115, -90)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(-130, -90)
                },

                // Group 4 Under crane
                {
                    idString: "container_mark",
                    position: Vec.create(82.5, 0)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(97.5, 0)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(112.5, 0)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(82.5, -30)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(97.5, -30)
                },
                {
                    idString: "container_mark",
                    position: Vec.create(112.5, -30)
                }
            ],
            obstacles: [
                // Parking lot
                { idString: "regular_crate", position: Vec.create(67.36, 58.18) },

                { idString: "forklift", position: Vec.create(95, 64), rotation: 1 },
                { idString: "pallet", position: Vec.create(107.5, 64), rotation: 1 },
                { idString: "barrel", position: Vec.create(107.5, 64) },

                { idString: "trailer", position: Vec.create(100, 84), rotation: 3 },
                { idString: "truck", position: Vec.create(72, 84), rotation: 3 },

                { idString: "regular_crate", position: Vec.create(120, 110) },
                { idString: { regular_crate: 3, grenade_crate: 1 }, position: Vec.create(110, 115) },

                { idString: "box", position: Vec.create(87, 123) },
                { idString: "box", position: Vec.create(92, 120) },
                { idString: "box", position: Vec.create(85, 117) },
                { idString: "box", position: Vec.create(92, 114) },

                { idString: "forklift", position: Vec.create(90, 102.5), rotation: 1 },
                { idString: "pallet", position: Vec.create(100, 102.5), rotation: 1 },
                { idString: "regular_crate", position: Vec.create(100, 102.5) },

                // Above red warehouse
                { idString: "truck", position: Vec.create(12.5, 40), rotation: 3 },
                { idString: "trailer", position: Vec.create(40, 40), rotation: 3 },

                // The main entrance
                { idString: "barrier", position: Vec.create(-124, -10), rotation: 0 },

                // Secret loot area sort of
                { idString: "sandbags", position: Vec.create(-144, 65), rotation: 1 },
                { idString: "sandbags", position: Vec.create(-132, 60), rotation: 2 },

                { idString: "super_barrel", position: Vec.create(-137, 75) },
                { idString: "barrel", position: Vec.create(-147, 80) },

                { idString: "super_barrel", position: Vec.create(-134, 90) },
                { idString: "barrel", position: Vec.create(-126, 85) },

                {
                    idString: {
                        aegis_crate: 1,
                        flint_crate: 1
                    },
                    position: Vec.create(-126, 100)
                },
                {
                    idString: {
                        aegis_crate: 1,
                        flint_crate: 1
                    },
                    position: Vec.create(-136, 105)
                },

                { idString: "sandbags", position: Vec.create(-132, 117), rotation: 2 },
                { idString: "barrel", position: Vec.create(-145, 117) },

                // Top left corner above group 3 of the port.
                { idString: "grenade_crate", position: Vec.create(-124, -120) },
                { idString: { regular_crate: 3, grenade_crate: 1 }, position: Vec.create(-135, -125) },
                {
                    idString: {
                        regular_crate: 2,
                        flint_crate: 1,
                        aegis_crate: 1
                    },
                    position: Vec.create(-140, -115),
                    rotation: 1
                },

                { idString: "barrel", position: Vec.create(-142, -95) },
                { idString: "super_barrel", position: Vec.create(-147, -87) },

                { idString: "regular_crate", position: Vec.create(54.57, -72.34) },

                // Below Blue Warehouse
                { idString: "forklift", position: Vec.create(-60, -55), rotation: 1 },
                { idString: "pallet", position: Vec.create(-50, -55), rotation: 1 },

                { idString: { flint_crate: 1, regular_crate: 1 }, position: Vec.create(-75, -45) },
                { idString: "flint_crate", position: Vec.create(-50, -55) },

                // Top right corner above crane of the port
                { idString: { regular_crate: 3, grenade_crate: 1 }, position: Vec.create(108, -110) },
                { idString: "regular_crate", position: Vec.create(97, -100) },
                { idString: "grenade_crate", position: Vec.create(99, -90) },
                { idString: "forklift", position: Vec.create(110, -95), rotation: 2 },
                { idString: "pallet", position: Vec.create(110, -107.5), rotation: 2 },
                { idString: "box", position: Vec.create(115.28, -104.85) },
                { idString: { barrel: 2, super_barrel: 1 }, position: Vec.create(93.77, -72.33) },
                { idString: { barrel: 2, super_barrel: 1 }, position: Vec.create(75.38, -68.72) },

                { idString: "aegis_crate", position: Vec.create(54.48, -118.9) },
                { idString: { aegis_crate: 1, regular_crate: 1 }, position: Vec.create(64.96, -123.57) },

                ...(() => Array.from(
                    { length: 5 },
                    (_, i) => ({
                        idString: "bollard",
                        position: Vec.create(140.4, 50 - (41.5 * i)),
                        rotation: 0
                    })
                ))(),

                // Fence to the bottom of the red warehouse
                ...(() => Array.from(
                    { length: 20 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(-0.75 - (7.8 * i), 135),
                        rotation: 0
                    })
                ))(),

                // Fence to the bottom of the parking lot
                ...(() => Array.from(
                    { length: 14 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(130 - (7.8 * i), 135),
                        rotation: 0
                    })
                ))(),

                // Fence to the left of the red warehouse
                ...(() => Array.from(
                    { length: 16 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(-152.3, 131.8 - (7.8 * i)),
                        rotation: 1
                    })
                ))(),

                // Fence going north of the main entrance to the left.
                ...(() => Array.from(
                    { length: 13 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(-152.3, -37.8 - (7.8 * i)),
                        rotation: 1
                    })
                ))(),

                // Fence directly north of the main entrance
                ...(() => Array.from(
                    { length: 24 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(46 - (7.8 * i), -135),
                        rotation: 0
                    })
                ))(),

                // Fence north of the crane
                ...(() => Array.from(
                    { length: 9 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(132.2 - (7.8 * i), -135),
                        rotation: 0
                    })
                ))(),
                { idString: "port_fence_side", position: Vec.create(139.95, -131.59), rotation: 1 },

                { idString: "crane_base_end", position: Vec.create(65.5, 18.59), rotation: 0 },
                { idString: "crane_base_end", position: Vec.create(129, -110.46), rotation: 0 },
                { idString: "crane_base_end", position: Vec.create(129, 18.59), rotation: 0 },
                { idString: "crane_base_end", position: Vec.create(65.5, -110.46), rotation: 0 }
            ] as BuildingObstacle[],
            subBuildings: [
                { idString: "container_1", position: Vec.create(-40, 40), orientation: 1 },
                { idString: "crane", position: Vec.create(97, 25) },
                { idString: "port_warehouse_red", position: Vec.create(-95, -59), orientation: 1 },
                { idString: "port_warehouse_blue", position: Vec.create(-97, 15), orientation: 3 },
                { idString: "port_shed", position: Vec.create(-25, -134), orientation: 1 },
                // Below port shed
                { idString: "porta_potty", position: Vec.create(-47, -140.8), orientation: 1 },
                // Top left corner above crane
                { idString: "porta_potty", position: Vec.create(82.5, -100) },

                // Group 1
                {
                    idString: randomContainer2,
                    position: Vec.create(-60, 5)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-45, 5)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-30, 5)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(60, 25),
                    orientation: 2
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(45, 25),
                    orientation: 2
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(30, 25),
                    orientation: 2
                },
                // Group 2
                {
                    idString: randomContainer2,
                    position: Vec.create(5, 5)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(20, 5)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(35, 5)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-5, 25),
                    orientation: 2
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-20, 25),
                    orientation: 2
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-35, 25),
                    orientation: 2
                },
                // Group 3
                {
                    idString: randomContainer2,
                    position: Vec.create(-100, -60)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-115, -60)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-130, -60)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(100, 90),
                    orientation: 2
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(115, 90),
                    orientation: 2
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(130, 90),
                    orientation: 2
                },

                // Group 4
                {
                    idString: randomContainer2,
                    position: Vec.create(82.5, 0)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(97.5, 0)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(112.5, 0)
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-82.5, 30),
                    orientation: 2
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-97.5, 30),
                    orientation: 2
                },
                {
                    idString: randomContainer2,
                    position: Vec.create(-112.5, 30),
                    orientation: 2
                }
            ]
        },
        {
            idString: "port_complex",
            name: "Port Complex",
            spawnHitbox: RectangleHitbox.fromRect(365, 290, Vec.create(-100, 0)),
            spawnMode: MapObjectSpawnMode.Beach,
            subBuildings: [
                { idString: "port", position: Vec.create(-120, 0) },
                { idString: { ship: 1, oil_tanker_ship: 1 }, position: Vec.create(74, -65) }
            ]
        },
        {
            idString: "armory_barracks",
            name: "Armory Barracks",
            spawnHitbox: RectangleHitbox.fromRect(50, 84),
            scopeHitbox: RectangleHitbox.fromRect(50, 84),
            floorImages: [{
                key: "armory_barracks_floor",
                position: Vec.create(0, 0)
            }],
            ceilingImages: [{
                key: "armory_barracks_ceiling",
                position: Vec.create(0, 0)
            }],
            floors: [{
                type: "wood",
                hitbox: RectangleHitbox.fromRect(50, 84)
            }],
            obstacles: [
                { idString: "armory_barracks_walls", position: Vec.create(0, 0), rotation: 0 },
                { idString: "door", position: Vec.create(2.7, -41.3), rotation: 2 },
                { idString: "fridge", position: Vec.create(-19.8, -35.5), rotation: 1 },
                { idString: "stove", position: Vec.create(-19.8, -26.1), rotation: 1 },
                { idString: "bunk_bed", position: Vec.create(18, -31.25), rotation: 0 },
                { idString: "small_drawer", position: Vec.create(18.4, -18.7), rotation: 0 },
                { idString: "small_drawer", position: Vec.create(-2, -13.6), rotation: 1 },
                { idString: "bunk_bed", position: Vec.create(-14.43, -13.21), rotation: 1 },
                { idString: "bunk_bed", position: Vec.create(-18.1, 7.6), rotation: 2 },
                { idString: "bunk_bed", position: Vec.create(17.95, 7), rotation: 0 },
                { idString: "bunk_bed", position: Vec.create(-14.48, 34.83), rotation: 3 },
                { idString: "cabinet", position: Vec.create(16, 37.6), rotation: 2 },
                { idString: "cabinet", position: Vec.create(16, 20.9), rotation: 0 },
                { idString: "door", position: Vec.create(1.15, 41.3), rotation: 0 },
                { idString: "window", position: Vec.create(24.5, -9.5), rotation: 0 },
                { idString: "window", position: Vec.create(24.5, 28.75), rotation: 0 },
                { idString: "window", position: Vec.create(-24.5, 23), rotation: 0 }
            ]
        },
        {
            idString: "armory_center",
            name: "Armory Center",
            spawnHitbox: RectangleHitbox.fromRect(31, 44, Vec.create(1.5, 0)),
            scopeHitbox: RectangleHitbox.fromRect(31, 44, Vec.create(1.5, 0)),
            floorImages: [{
                key: "armory_center_floor",
                position: Vec.create(0, 0)
            }],
            ceilingImages: [{
                key: "armory_center_ceiling",
                position: Vec.create(1.25, 0)
            }],
            floors: [{
                type: "wood",
                hitbox: RectangleHitbox.fromRect(31, 44, Vec.create(1.5, 0))
            }],
            obstacles: [
                { idString: "armory_center_walls", position: Vec.create(0, 0), rotation: 0 },
                { idString: "door", position: Vec.create(-13.9, -12.43), rotation: 1 },
                { idString: "cabinet", position: Vec.create(12.45, -11.6), rotation: 3 },
                { idString: "table", position: Vec.create(8.85, 1.6), rotation: 1 },
                { idString: "chair", position: Vec.create(3, 1.7), rotation: 3 },
                { idString: "chair", position: Vec.create(10.1, 6), rotation: 0 },
                { idString: "small_drawer", position: Vec.create(-9.2, 16.8), rotation: 2 },
                { idString: "gun_mount_maul", position: Vec.create(3, 19.05), rotation: 2 },
                { idString: "window", position: Vec.create(-13.9, 7.1), rotation: 0 }
            ]
        },
        {
            idString: "armory_vault",
            name: "Armory Vault",
            spawnHitbox: RectangleHitbox.fromRect(72, 38, Vec.create(0, -2)),
            scopeHitbox: RectangleHitbox.fromRect(72, 38, Vec.create(0, -2)),
            puzzle: {
                triggerInteractOn: "vault_door",
                interactDelay: 1500,
                order: ["o", "l", "j", "y"],
                solvedSound: true,
                setSolvedImmediately: true
            },
            floorImages: [{
                key: "armory_vault_floor",
                position: Vec.create(0, 0)
            }],
            ceilingImages: [{
                key: "armory_vault_ceiling",
                position: Vec.create(0, -2.5)
            }],
            ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
            floors: [{
                type: "wood",
                hitbox: RectangleHitbox.fromRect(72, 38, Vec.create(0, -2))
            }],
            subBuildings: [{
                idString: "armory_inner_vault",
                position: Vec.create(-25, -2.25)
            }],
            obstacles: [
                { idString: "armory_vault_walls", position: Vec.create(0, 0), rotation: 0 },
                { idString: "door", position: Vec.create(3.8, 16.5), rotation: 0 },
                { idString: "window", position: Vec.create(18.1, 16.5), rotation: 1 },
                { idString: "gun_case", position: Vec.create(31.9, 10), rotation: 3 },
                { idString: "gun_case", position: Vec.create(-7.5, 12.4), rotation: 2 },
                { idString: "ammo_crate", position: Vec.create(29.5, -0.45), rotation: 0 },
                { idString: "ammo_crate", position: Vec.create(12.85, -0.45), rotation: 0 },
                { idString: "tear_gas_crate", position: Vec.create(21.2, -0.45), rotation: 1 },
                { idString: "grenade_crate", position: Vec.create(-9.1, -15.9) },
                ...Array.from(
                    { length: 4 },
                    (_, i) => ({
                        idString: "button",
                        position: Vec.create(10 + 4.75 * i, -19.2),
                        rotation: 0,
                        puzzlePiece: ["y", "o", "j", "l"][i]
                    } satisfies BuildingObstacle)
                ),
                { idString: "control_panel2", position: Vec.create(30.7, -14), rotation: 1 },
                { idString: "ammo_crate", position: Vec.create(-20, -14.8), rotation: 0 },
                { idString: "regular_crate", position: Vec.create(-29.8, -14.8), rotation: 0 },
                { idString: "barrel", position: Vec.create(-30.9, 11.3) },
                { idString: "briefcase", position: Vec.create(-20.7, 10.85), rotation: 0 },
                { idString: "vault_door", position: Vec.create(-14.1, -3.22), rotation: 3 }
            ]
        },
        {
            idString: "armory_inner_vault",
            name: "Armory Inner Vault",
            spawnHitbox: RectangleHitbox.fromRect(20.87, 36.34),
            scopeHitbox: RectangleHitbox.fromRect(20.87, 36.34),
            ceilingImages: [{
                key: "armory_inner_vault_ceiling",
                position: Vec.create(0, 0)
            }]
        },
        {
            idString: "armory",
            name: "Armory",
            spawnHitbox: RectangleHitbox.fromRect(160, 176),
            spawnMode: MapObjectSpawnMode.GrassAndSand,
            subBuildings: [
                { idString: "armory_barracks", position: Vec.create(-41.31, 27.86) },
                { idString: "armory_center", position: Vec.create(55.4, 15.07) },
                { idString: "armory_vault", position: Vec.create(-35.03, -58.37) },
                { idString: "port_shed", position: Vec.create(-60.9, -65.63), orientation: 2 },
                { idString: "porta_potty", position: Vec.create(31.87, -60.35), orientation: 1 }
            ],
            groundGraphics: [
                {
                    color: "#6664",
                    hitbox: RectangleHitbox.fromRect(153.09, 1.87, Vec.create(0, -83.96))
                },
                {
                    color: "#6664",
                    hitbox: RectangleHitbox.fromRect(153.09, 1.87, Vec.create(0, 83.96))
                },
                {
                    color: "#6664",
                    hitbox: RectangleHitbox.fromRect(1.93, 168, Vec.create(-75.57, 0))
                },
                {
                    color: "#6664",
                    hitbox: RectangleHitbox.fromRect(1.93, 168, Vec.create(75.57, 0))
                },
                {
                    color: 0x404040,
                    hitbox: new PolygonHitbox([
                        Vec.create(5.54, -80.63),
                        Vec.create(62.37, -80.63),
                        Vec.create(62.37, -24.57),
                        Vec.create(48.11, -15.97),
                        Vec.create(34.01, -15.97),
                        Vec.create(34.01, 84.86),
                        Vec.create(-8.82, 84.86),
                        Vec.create(-8.82, -32.87),
                        Vec.create(5.54, -41.2)
                    ])
                },
                ...Array.from(
                    { length: 4 },
                    (_, i) => ({
                        color: 0x555555,
                        hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec.create(-1.5, -3.4 + 25.2 * i))
                    })
                ),
                ...Array.from(
                    { length: 6 },
                    (_, i) => ({
                        color: 0x555555,
                        hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec.create(12.7, -53.8 + 25.2 * i))
                    })
                ),
                ...Array.from(
                    { length: 6 },
                    (_, i) => ({
                        color: 0x555555,
                        hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec.create(26.95, -53.8 + 25.2 * i))
                    })
                ),
                ...Array.from(
                    { length: 2 },
                    (_, i) => ({
                        color: 0x555555,
                        hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec.create(41.1, -53.8 + 25.2 * i))
                    })
                ),
                {
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec.create(55.3, -53.8))
                },
                {
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(27.27, 13.11, Vec.create(19.83, -73.38))
                },
                {
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(27.27, 13.11, Vec.create(48.2, -73.38))
                },
                {
                    color: 0x555555,
                    hitbox: new PolygonHitbox([
                        Vec.create(5.05, -40.17),
                        Vec.create(5.05, -16.47),
                        Vec.create(-8.06, -16.47),
                        Vec.create(-8.06, -32.29)
                    ])
                },
                {
                    color: 0x555555,
                    hitbox: new PolygonHitbox([
                        Vec.create(61.82, -40.67),
                        Vec.create(61.75, -24.97),
                        Vec.create(48.71, -16.97),
                        Vec.create(48.71, -40.73)
                    ])
                }
            ],
            floors: [{
                type: "stone",
                hitbox: new PolygonHitbox([
                    Vec.create(5.54, -80.63),
                    Vec.create(62.37, -80.63),
                    Vec.create(62.37, -24.57),
                    Vec.create(48.11, -15.97),
                    Vec.create(34.01, -15.97),
                    Vec.create(34.01, 84.86),
                    Vec.create(-8.82, 84.86),
                    Vec.create(-8.82, -32.87),
                    Vec.create(5.54, -41.2)
                ])
            }],
            obstacles: [
                { idString: "regular_crate", position: Vec.create(63.13, -15.17) },
                { idString: "regular_crate", position: Vec.create(-7.99, 2.28) },
                { idString: "regular_crate", position: Vec.create(7.06, 30.07) },
                { idString: "regular_crate", position: Vec.create(18.06, 27.86) },
                { idString: "regular_crate", position: Vec.create(-64.29, 76.5) },
                { idString: "regular_crate", position: Vec.create(65.01, -56.73) },
                { idString: "regular_crate", position: Vec.create(8.45, -66.79) },
                { idString: "flint_crate", position: Vec.create(33.86, -46.16) },
                { idString: "barrel", position: Vec.create(-10.72, -7.93) },
                { idString: "barrel", position: Vec.create(9.13, 40.34) },
                { idString: "barrel", position: Vec.create(69.75, 42.55) },
                { idString: "barrel", position: Vec.create(24.36, -46.95) },
                { idString: "barrel", position: Vec.create(70.01, -72.17) },
                { idString: "super_barrel", position: Vec.create(34.44, -55.28), rotation: 0 },
                { idString: "super_barrel", position: Vec.create(44.51, 78.15), rotation: 0 },
                { idString: "sandbags", position: Vec.create(15.15, 17.92), rotation: 0 },
                { idString: "sandbags", position: Vec.create(-10, 78.77), rotation: 0 },
                { idString: "sandbags", position: Vec.create(44.5, 65), rotation: 1 },
                { idString: "sandbags", position: Vec.create(31.6, -36.18), rotation: 0 },
                { idString: "sandbags", position: Vec.create(30.66, -70.69), rotation: 0 },
                { idString: "sandbags", position: Vec.create(18.54, -67.73), rotation: 1 },
                { idString: "m1117", position: Vec.create(48.93, -53.75), rotation: 0 },
                { idString: "gun_case", position: Vec.create(30.66, -28.84), rotation: 0 },
                { idString: "gun_case", position: Vec.create(63.16, -36.39), rotation: 1 },
                { idString: "gun_case", position: Vec.create(19.48, 36.69), rotation: 0 },
                { idString: "tear_gas_crate", position: Vec.create(16.55, 9.68), rotation: 0 },
                { idString: "tear_gas_crate", position: Vec.create(33.06, -62.76), rotation: 0 },
                { idString: "grenade_crate", position: Vec.create(-55.29, 78.02) },
                { idString: "grenade_crate", position: Vec.create(69.81, -34.24) },
                { idString: "ammo_crate", position: Vec.create(50.07, -20.07), rotation: 0 },
                { idString: "barrier", position: Vec.create(13.91, 70.32), rotation: 1 },

                { idString: "port_fence_side", position: Vec.create(72.29, 80.72), rotation: 0 },
                { idString: "port_fence_side", position: Vec.create(72.32, -80.71), rotation: 1 },
                { idString: "port_fence_side", position: Vec.create(-72.32, -80.69), rotation: 2 },

                ...Array.from(
                    { length: 9 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(-63.89 + 8.45 * i, -84.11),
                        rotation: 0
                    })
                ),
                ...Array.from(
                    { length: 3 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(21.1 + 8.45 * i, -84.11),
                        rotation: 0
                    })
                ),
                ...Array.from(
                    { length: 6 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(75.75, -72.31 + 8.45 * i),
                        rotation: 1
                    })
                ),
                ...Array.from(
                    { length: 9 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(75.75, 4.7 + 8.45 * i),
                        rotation: 1
                    })
                ),
                ...Array.from(
                    { length: 3 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(46.95 + 8.45 * i, 84.11),
                        rotation: 0
                    })
                ),
                ...Array.from(
                    { length: 6 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(-55.3 + 8.45 * i, 84.11),
                        rotation: 0
                    })
                ),
                ...Array.from(
                    { length: 9 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(-75.75, 4.7 + 8.45 * i),
                        rotation: 1
                    })
                ),
                ...Array.from(
                    { length: 8 },
                    (_, i) => ({
                        idString: "port_fence",
                        position: Vec.create(-75.75, -72.31 + 8.45 * i),
                        rotation: 1
                    })
                )
            ]
        },
        {
            idString: "mobile_home",
            name: "Mobile Home",
            spawnHitbox: RectangleHitbox.fromRect(65, 40),
            scopeHitbox: RectangleHitbox.fromRect(42, 20, Vec.create(2, -1)),
            floorImages: [{
                key: "mobile_home_floor",
                position: Vec.create(0, 0)
            }],
            ceilingImages: [{
                key: "mobile_home_ceiling",
                position: Vec.create(2, -1),
                residue: "mobile_home_residue"
            }],
            floors: [
                {
                    type: "wood",
                    hitbox: RectangleHitbox.fromRect(43, 20, Vec.create(2, -1))
                },
                {
                    type: "metal",
                    hitbox: RectangleHitbox.fromRect(10, 4.5, Vec.create(6, 11))
                },
                {
                    type: "metal",
                    hitbox: RectangleHitbox.fromRect(4.5, 10, Vec.create(-21.3, -4.4))
                }
            ],
            wallsToDestroy: 2,
            obstacles: [
                { idString: "door", position: Vec.create(-18.75, -4.05), rotation: 3 },
                { idString: "door", position: Vec.create(5.5, 8.33), rotation: 2 },
                { idString: "mobile_home_wall_1", position: Vec.create(-16, -10.43), rotation: 0 },
                { idString: "mobile_home_wall_1", position: Vec.create(-18.65, 4.03), rotation: 1 },
                { idString: "mobile_home_wall_2", position: Vec.create(16.45, 8.37), rotation: 0 },
                { idString: "mobile_home_wall_3", position: Vec.create(22.7, -1.03), rotation: 1 },
                { idString: "mobile_home_wall_3", position: Vec.create(11.65, -10.43), rotation: 0 },
                { idString: "mobile_home_wall_3", position: Vec.create(-9.35, 8.32), rotation: 0 },
                { idString: "mobile_home_bed", position: Vec.create(13.55, -5.72), rotation: 3 },
                { idString: "small_drawer", position: Vec.create(17.45, 3.27), rotation: 3 },
                { idString: "mobile_home_sink", position: Vec.create(-12.8, 3.4), rotation: 2 },
                { idString: "mobile_home_stove", position: Vec.create(-3.75, 3.57), rotation: 2 },
                { idString: "tire", position: Vec.create(-21.25, 4.85), rotation: 0 },
                { idString: "mobile_home_window", position: Vec.create(-5.6, -10.42), rotation: 0 },

                { idString: "box", position: Vec.create(26.2, -3.43), rotation: 0 },
                { idString: "box", position: Vec.create(28, 1.52), rotation: 0 },
                { idString: "barrel", position: Vec.create(-18.9, 14.62), rotation: 0 }
            ]
        },
        {
            idString: "tugboat_red",
            name: "Tugboat",
            spawnMode: MapObjectSpawnMode.Beach,
            spawnHitbox: RectangleHitbox.fromRect(70, 110, Vec.create(90, 0)),
            scopeHitbox: RectangleHitbox.fromRect(30, 35, Vec.create(90, 12.5)),
            floorImages: [{
                key: "tugboat_red_floor",
                position: Vec.create(90, 0)
            }],
            ceilingImages: [{
                key: "tugboat_red_ceiling",
                position: Vec.create(90, 12.5)
            }],
            floors: [
                { type: "wood", hitbox: RectangleHitbox.fromRect(29, 71.5, Vec.create(90, -7)) },
                { type: "metal", hitbox: RectangleHitbox.fromRect(39.5, 75, Vec.create(90, -8)) },
                { type: "metal", hitbox: RectangleHitbox.fromRect(9.7, 10, Vec.create(71, -23.7)) },
                { type: "metal", hitbox: RectangleHitbox.fromRect(10, 8.7, Vec.create(89.9, -46)) }
            ],
            obstacles: [
                { idString: "tugboat", position: Vec.create(90, 0), rotation: 0 },
                { idString: "tire", position: Vec.create(111.28, 5.18), rotation: 0 },
                { idString: "tire", position: Vec.create(111.4, 14.57), rotation: 0 },
                { idString: "tire", position: Vec.create(111.4, 24.17), rotation: 0 },
                { idString: "tire", position: Vec.create(71.55, 24.17), rotation: 0 },
                { idString: "tire", position: Vec.create(71.5, 14.57), rotation: 0 },
                { idString: "tire", position: Vec.create(71.45, 5.12), rotation: 0 },
                { idString: "regular_crate", position: Vec.create(81.48, -37.36) },
                { idString: "regular_crate", position: Vec.create(101.49, -11.45) },
                { idString: "grenade_crate", position: Vec.create(102.3, -38.43) },
                { idString: "barrel", position: Vec.create(102.74, -26.23) },
                { idString: "tugboat_control_panel", position: Vec.create(90, 24.1), rotation: 0 },
                { idString: "office_chair", position: Vec.create(90, 16.65), rotation: 0 },
                { idString: "door", position: Vec.create(90.45, -4.8), rotation: 0 },
                { idString: "large_drawer", position: Vec.create(99.29, 2.98), rotation: 3 },
                { idString: "life_preserver", position: Vec.create(101.23, 14.67), rotation: 0 },
                { idString: "lux_crate", position: Vec.create(80.38, 4.29), rotation: 1 },
                { idString: "window2", position: Vec.create(83.91, 30.75), rotation: 1 },
                { idString: "window2", position: Vec.create(95.63, 30.75), rotation: 1 }
            ],
            lootSpawners: [
                { table: "tugboat_red_floor", position: Vec.create(89, -25) }
            ]
        },
        {
            idString: "tugboat_white",
            name: "Tugboat",
            spawnMode: MapObjectSpawnMode.Beach,
            spawnHitbox: RectangleHitbox.fromRect(70, 110, Vec.create(90, 0)),
            scopeHitbox: RectangleHitbox.fromRect(30, 35, Vec.create(90, 12.5)),
            floorImages: [{
                key: "tugboat_white_floor",
                position: Vec.create(90, 0)
            }],
            ceilingImages: [{
                key: "tugboat_white_ceiling",
                position: Vec.create(90, 12.5)
            }],
            floors: [
                { type: "wood", hitbox: RectangleHitbox.fromRect(29, 71.5, Vec.create(90, -7)) },
                { type: "metal", hitbox: RectangleHitbox.fromRect(39.5, 75, Vec.create(90, -8)) },
                { type: "metal", hitbox: RectangleHitbox.fromRect(9.7, 10, Vec.create(71, -23.7)) },
                { type: "metal", hitbox: RectangleHitbox.fromRect(10, 8.7, Vec.create(89.9, -46)) }
            ],
            obstacles: [
                { idString: "tugboat", position: Vec.create(90, 0), rotation: 0 },
                { idString: "tire", position: Vec.create(111.28, 5.18), rotation: 0 },
                { idString: "tire", position: Vec.create(111.4, 14.57), rotation: 0 },
                { idString: "tire", position: Vec.create(111.4, 24.17), rotation: 0 },
                { idString: "tire", position: Vec.create(71.55, 24.17), rotation: 0 },
                { idString: "tire", position: Vec.create(71.5, 14.57), rotation: 0 },
                { idString: "tire", position: Vec.create(71.45, 5.12), rotation: 0 },
                { idString: "regular_crate", position: Vec.create(81.48, -37.36) },
                { idString: "regular_crate", position: Vec.create(101.49, -11.45) },
                { idString: "grenade_crate", position: Vec.create(102.3, -38.43) },
                { idString: "barrel", position: Vec.create(102.74, -26.23) },
                { idString: "tugboat_control_panel", position: Vec.create(90, 24.1), rotation: 0 },
                { idString: "office_chair", position: Vec.create(90, 16.65), rotation: 0 },
                { idString: "door", position: Vec.create(90.45, -4.8), rotation: 0 },
                { idString: "large_drawer", position: Vec.create(99.29, 2.98), rotation: 3 },
                { idString: "life_preserver", position: Vec.create(101.23, 14.67), rotation: 0 },
                { idString: "gun_case", position: Vec.create(80.38, 4.29), rotation: 1 },
                { idString: "window2", position: Vec.create(83.91, 30.75), rotation: 1 },
                { idString: "window2", position: Vec.create(95.63, 30.75), rotation: 1 }
            ]
        },
        {
            idString: "sea_traffic_control",
            name: "Sea Traffic Control",
            spawnHitbox: RectangleHitbox.fromRect(48, 98, Vec.create(0, 15)),
            scopeHitbox: RectangleHitbox.fromRect(40, 55, Vec.create(0, -2)),
            spawnMode: MapObjectSpawnMode.Beach,
            floorImages: [{
                key: "sea_traffic_control_floor",
                position: Vec.create(0, 0)
            }],
            ceilingImages: [{
                key: "sea_traffic_control_ceiling",
                position: Vec.create(-0.25, -2.4)
            }],
            floors: [
                { type: "wood", hitbox: RectangleHitbox.fromRect(40, 55, Vec.create(0, -2)) },
                { type: "stone", hitbox: RectangleHitbox.fromRect(10.5, 5.2, Vec.create(-1.7, 28.2)) }
            ],
            obstacles: [
                { idString: "sea_traffic_control", position: Vec.create(0, 0), rotation: 0 },
                { idString: "sandbags", position: Vec.create(-16.79, 33.53), rotation: 1 },
                { idString: "sandbags", position: Vec.create(-16.79, 47.1), rotation: 1 },
                { idString: "sandbags", position: Vec.create(-14.15, 58.27), rotation: 2 },
                { idString: "barrel", position: Vec.create(-7.67, 47.77) },
                { idString: "barrel", position: Vec.create(14.07, 42) },
                { idString: "regular_crate", position: Vec.create(11.03, 32.15) },
                { idString: "door", position: Vec.create(-1.35, 25.19), rotation: 0 },
                { idString: "gun_case", position: Vec.create(-13.41, 20.92), rotation: 2 },
                { idString: "large_drawer", position: Vec.create(13.83, 1.1), rotation: 3 },
                { idString: "office_chair", position: Vec.create(0.43, -16.77), rotation: 2 },
                { idString: "office_chair", position: Vec.create(-11.78, -16.82), rotation: 2 },
                { idString: "office_chair", position: Vec.create(5.67, 13.88), rotation: 1 },
                { idString: "aegis_crate", position: Vec.create(13.27, -23.45) },
                { idString: "life_preserver", position: Vec.create(-17.63, -2.6), rotation: 2 },
                { idString: "life_preserver", position: Vec.create(-17.63, 7.05), rotation: 2 },
                { idString: "table", position: Vec.create(13.47, 13.95), rotation: 2 },
                { idString: "control_panel_activated", position: Vec.create(-5.75, -24.7), rotation: 0 },
                { idString: "control_panel_small", position: Vec.create(3.81, -24.7), rotation: 0 },
                { idString: "control_panel_small", position: Vec.create(-15.34, -24.7), rotation: 0 },
                { idString: "window2", position: Vec.create(20.57, -4.5), rotation: 0 },
                { idString: "window2", position: Vec.create(20.57, 7.4), rotation: 0 },
                { idString: "window2", position: Vec.create(20.57, 19.2), rotation: 0 }
            ],
            lootSpawners: [
                { table: "sea_traffic_control_floor", position: Vec.create(0, 0) },
                { table: "sea_traffic_control_outside", position: Vec.create(1.5, 48) }
            ]
        },
        {
            idString: "small_bridge",
            name: "Small Bridge",
            spawnHitbox: RectangleHitbox.fromRect(20, 62),
            bridgeSpawnOptions: {
                minRiverWidth: 0,
                maxRiverWidth: 20,
                landCheckDist: 30
            },
            floorImages: [{
                key: "small_bridge",
                position: Vec.create(0, 0)
            }],
            floors: [
                { type: "wood", hitbox: RectangleHitbox.fromRect(13.6, 55.7, Vec.create(0, 0)) }
            ],
            obstacles: [
                { idString: "small_bridge", position: Vec.create(0, 0), rotation: 0 }
            ],
            lootSpawners: [
                { table: "ground_loot", position: Vec.create(0, 0) }
            ]
        },
        {
            idString: "large_bridge",
            name: "Large Bridge",
            spawnHitbox: RectangleHitbox.fromRect(105, 230),
            bridgeSpawnOptions: {
                minRiverWidth: 20,
                maxRiverWidth: 100,
                landCheckDist: 103
            },
            floorImages: [
                {
                    key: "large_bridge_railing",
                    position: Vec.create(23.3, -38)
                },
                {
                    key: "large_bridge_railing",
                    position: Vec.create(23.3, 35.3),
                    rotation: Math.PI,
                    scale: Vec.create(-1, 1)
                },
                {
                    key: "large_bridge_railing",
                    position: Vec.create(-23.3, -38),
                    scale: Vec.create(-1, 1)
                },
                {
                    key: "large_bridge_railing",
                    position: Vec.create(-23.3, 35.3),
                    rotation: Math.PI
                }
            ],
            groundGraphics: [
                {
                    color: "#5d5d5d",
                    hitbox: RectangleHitbox.fromRect(44.77, 211.1)
                },
                {
                    color: "#4d4d4d",
                    hitbox: RectangleHitbox.fromRect(43.77, 210.1)
                },
                {
                    color: "#5d5d5d",
                    hitbox: RectangleHitbox.fromRect(3.61, 210.1)
                }
            ],
            decals: [
                { idString: "floor_oil_02", position: Vec.create(5.28, -66.1) },
                { idString: "floor_oil_03", position: Vec.create(-12.06, 23.49), rotation: 1 },
                { idString: "smoke_explosion_decal", position: Vec.create(-12.96, -49.37) },
                { idString: "explosion_decal", position: Vec.create(15.91, -2.56) },
                { idString: "explosion_decal", position: Vec.create(-8.65, 42.84) },
                { idString: "explosion_decal", position: Vec.create(-2.11, 85.37) },
                { idString: "frag_explosion_decal", position: Vec.create(-4.31, -91.09) },
                { idString: "smoke_explosion_decal", position: Vec.create(11.09, 75.08) }
            ],
            floors: [
                { type: "stone", hitbox: RectangleHitbox.fromRect(45, 210, Vec.create(0, 0)) }
            ],
            obstacles: [
                { idString: "large_bridge", position: Vec.create(0, 0), rotation: 0 },

                // North End of Bridge
                { idString: "barrel", position: Vec.create(-17.5, -80), rotation: 0 },

                { idString: "sandbags", position: Vec.create(25, -80), rotation: 0 },
                { idString: "sandbags", position: Vec.create(36, -82.5), rotation: 1 },
                { idString: "sandbags", position: Vec.create(36, -96.5), rotation: 1 },

                { idString: "grenade_crate", position: Vec.create(27.5, -88.5) },

                // North-Center of the Bridge
                { idString: "regular_crate", position: Vec.create(13.5, -55), rotation: 1 },
                { idString: "barrel", position: Vec.create(4, -51), rotation: 1 },
                { idString: "gun_case", position: Vec.create(13.5, -47), rotation: 2 },
                { idString: "sandbags", position: Vec.create(12.5, -40), rotation: 2 },
                { idString: "aegis_crate", position: Vec.create(14.5, -30.5) },

                // Center of the Bridge
                { idString: "m1117_damaged", position: Vec.create(-8.5, -4), rotation: 0 },
                { idString: "regular_crate", position: Vec.create(7, -20), rotation: 0 },
                { idString: "gun_case", position: Vec.create(14, 10), rotation: 0 },

                // South-Center of the Bridge
                { idString: "gun_case", position: Vec.create(6, 26), rotation: 3 },
                { idString: "ammo_crate", position: Vec.create(14, 26) },
                { idString: "sandbags", position: Vec.create(12.5, 35.5), rotation: 2 },
                { idString: "barrel", position: Vec.create(15.5, 43.5), rotation: 2 },
                { idString: "tear_gas_crate", position: Vec.create(15.5, 52.5), rotation: 1 },

                // South End of the Bridge
                { idString: "barrel", position: Vec.create(17.5, 80), rotation: 0 },

                { idString: "sandbags", position: Vec.create(-25, 77), rotation: 0 },
                { idString: "sandbags", position: Vec.create(-36, 79.5), rotation: 1 },
                { idString: "sandbags", position: Vec.create(-36, 93.5), rotation: 1 },

                { idString: "grenade_crate", position: Vec.create(-27.5, 85.5) }
            ],
            lootSpawners: [

            ],
            subBuildings: [
                // North West Shed
                { idString: "port_shed", position: Vec.create(-36, -95) },
                { idString: "port_shed", position: Vec.create(-36, -95), orientation: 2 }
            ]
        },
        {
            idString: "construction_site",
            name: "Construction Site",
            spawnHitbox: RectangleHitbox.fromRect(75, 75, Vec.create(0, 0)),
            spawnMode: MapObjectSpawnMode.Grass,
            floorImages: [{
                key: "construction_site_floor",
                position: Vec.create(0, 0)
            }],
            floors: [
                { type: "sand", hitbox: RectangleHitbox.fromRect(65, 65, Vec.create(0, 0)) }
            ],
            obstacles: [
                { idString: "bunker_entrance", position: Vec.create(-10, -16), rotation: 0 },

                { idString: "sandbags", position: Vec.create(18.42, -27.15), rotation: 0 },
                { idString: "sandbags", position: Vec.create(25.28, -15.7), rotation: 1 },
                { idString: "flint_crate", position: Vec.create(15, -17) },
                { idString: "barrel", position: Vec.create(15, -7.5), rotation: 1 },
                { idString: "super_barrel", position: Vec.create(5, -17), rotation: 1 },

                { idString: "sandbags", position: Vec.create(-5.5, 7.94), rotation: 1 },
                { idString: "sandbags", position: Vec.create(0.72, 19.15), rotation: 0 },
                { idString: "cooler", position: Vec.create(2.28, 8.42), rotation: 1 },

                { idString: "box", position: Vec.create(16.66, 9.9), rotation: 0 },
                { idString: "box", position: Vec.create(13.45, 16.63), rotation: 0 },
                { idString: "box", position: Vec.create(19.13, 16.54), rotation: 0 },

                { idString: "regular_crate", position: Vec.create(-17.34, 6.54) },
                { idString: "regular_crate", position: Vec.create(-16.5, 17.85) },

                { idString: "roadblock", position: Vec.create(-26, 0), rotation: 0 },
                { idString: "roadblock", position: Vec.create(-27, 15), rotation: 0 },

                { idString: "roadblock", position: Vec.create(-12.5, 27.5), rotation: 1 },
                { idString: "roadblock", position: Vec.create(2.5, 27.5), rotation: 1 },
                { idString: "roadblock", position: Vec.create(17.5, 27.5), rotation: 1 },
                { idString: "roadblock", position: Vec.create(25, 15), rotation: 0 }
            ],
            lootSpawners: []
        }
    ]);
