import { Layers, ZIndexes, FlyoverPref, MapObjectSpawnMode, RotationMode } from "../constants";
import { type Orientation, type Variation } from "../typings";
import { CircleHitbox, GroupHitbox, PolygonHitbox, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { NullString, ObjectDefinitions, type ObjectDefinition, type ReferenceOrRandom, type ReferenceTo } from "../utils/objectDefinitions";
import { pickRandomInArray, randomBoolean } from "../utils/random";
import { FloorNames } from "../utils/terrain";
import { Vec, type Vector } from "../utils/vector";
import { Materials, type ObstacleDefinition } from "./obstacles";

interface BuildingObstacle {
    readonly idString: ReferenceOrRandom<ObstacleDefinition>
    readonly position: Vector
    readonly rotation?: number
    // specified as an _offset_ relative to the layer of the building in which this obstacle is placed
    readonly layer?: number
    readonly variation?: Variation
    readonly scale?: number
    readonly lootSpawnOffset?: Vector
    readonly puzzlePiece?: string | boolean
    readonly locked?: boolean
    readonly activated?: boolean
    readonly outdoors?: boolean
}

interface LootSpawner {
    readonly position: Vector
    readonly table: string
}

interface SubBuilding {
    readonly idString: ReferenceOrRandom<BuildingDefinition>
    readonly position: Vector
    readonly orientation?: Orientation
    // specified as an _offset_ relative to the layer of the building in which this building appears
    readonly layer?: number
}

export interface BuildingImageDefinition {
    readonly key: string
    readonly position: Vector
    readonly rotation?: number
    readonly scale?: Vector
    readonly tint?: number | `#${string}`
    readonly zIndex?: ZIndexes
    readonly spinSpeed?: number
    readonly spinOnSolve?: boolean
    readonly residue?: string
    readonly beachTinted?: boolean
}

export interface BuildingDefinition extends ObjectDefinition {
    readonly noCollisions?: boolean
    readonly noBulletCollision?: boolean
    readonly reflectBullets?: boolean
    readonly collideWithLayers?: Layers
    readonly visibleFromLayers?: Layers
    readonly ceilingCollapseParticle?: string
    readonly ceilingCollapseParticleVariations?: number
    readonly resetCeilingResidueScale?: boolean
    readonly ceilingCollapseSound?: string
    readonly destroyUponCeilingCollapse?: readonly string[]
    readonly material?: typeof Materials[number]
    readonly particle?: string
    readonly particleVariations?: number
    readonly bulletMask?: RectangleHitbox

    readonly hitbox?: Hitbox
    readonly spawnHitbox: Hitbox
    readonly ceilingHitbox?: Hitbox
    /**
     * @default {FlyoverPref.Never}
     */
    readonly allowFlyover?: FlyoverPref
    readonly hideOnMap?: boolean
    /**
     * @default {MapObjectSpawnMode.Grass}
     */
    readonly spawnMode?: MapObjectSpawnMode

    readonly bridgeHitbox?: Hitbox
    readonly bridgeMinRiverWidth?: number

    readonly noCeilingScopeEffect?: boolean
    readonly obstacles?: readonly BuildingObstacle[]
    readonly lootSpawners?: readonly LootSpawner[]
    readonly subBuildings?: readonly SubBuilding[]

    readonly puzzle?: {
        readonly triggerOnSolve?: ReferenceTo<ObstacleDefinition>
        readonly delay: number
        readonly order?: readonly string[]
        readonly solvedSound?: boolean
        readonly soundPosition?: Vector
        /**
         * Don't wait for the interact delay before setting solved to true
         */
        readonly setSolvedImmediately?: boolean
        /**
         * Don't activate the object when the puzzle is solved, only unlock it
         */
        readonly unlockOnly?: boolean
    }

    readonly sounds?: {
        readonly normal?: string
        readonly solved?: string
        readonly position?: Vector
        readonly maxRange: number
        readonly falloff: number
    }

    readonly floorImages?: readonly BuildingImageDefinition[]
    /**
     * @default {ZIndexes.BuildingsFloor}
     */
    readonly floorZIndex?: ZIndexes

    readonly ceilingImages?: readonly BuildingImageDefinition[]
    /**
     * @default {ZIndexes.BuildingsCeiling}
     */
    readonly ceilingZIndex?: ZIndexes
    readonly ceilingHiddenAlpha?: number

    // players within these zones are subjected to the override
    readonly visibilityOverrides?: ReadonlyArray<{
        readonly collider: Hitbox
        // specified as an offset relative to the building in which this floor appears
        readonly layer?: number
        /**
         * list out layers (relative to the building) which would normally be unable to see
         * players in the collider, but that should be visible
         */
        readonly allow?: readonly number[]
        /**
         * list out layers (relative to the building) which would normally be able to see
         * players in the collider, but that should be invisible
         */
        // readonly deny?: readonly number[]
        // note: this feature is functional, just remember to uncomment its implementation
        // in server::Player#secondUpdate (find the comment concerning blacklisting)
    }>

    /**
     * How many walls need to be broken to destroy the ceiling
     * @default {Infinity}
     */
    readonly wallsToDestroy?: number

    readonly floors?: ReadonlyArray<{
        readonly type: FloorNames
        readonly hitbox: Hitbox
        // specified as an offset relative to the building in which this floor appears
        readonly layer?: number
    }>

    readonly graphics?: ReadonlyArray<{
        readonly color: number | `#${string}`
        readonly hitbox: Hitbox
    }>
    /**
     * @default {ZIndexes.BuildingsFloor}
     */
    readonly graphicsZIndex?: ZIndexes

    readonly groundGraphics?: ReadonlyArray<{
        readonly color: number | `#${string}`
        readonly hitbox: Hitbox
    }>

    /**
     * @default {RotationMode.Limited}
     */
    readonly rotationMode?: RotationMode.Limited | RotationMode.Binary | RotationMode.None
}

const randomGift = {
    red_gift: 1,
    green_gift: 1,
    blue_gift: 1,
    black_gift: 0.25,
    purple_gift: 0.1
};

const randomCelebrationWinterTree = {
    oak_tree: 1,
    birch_tree: 1,
    pine_tree: 0.9
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
    [NullString]: 7
};

const warehouseObstacle = {
    regular_crate: 2,
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

const randomToilet = {
    toilet: 1,
    used_toilet: 1
};

const randomStove = {
    stove: 0.97,
    pan_stove: 0.03
};

const randomSmallStove = {
    small_stove: 0.97,
    small_pan_stove: 0.03
};

const randomHayShed = {
    hay_shed_1: 1,
    hay_shed_2: 1,
    hay_shed_3: 1
};

const ContainerTints = {
    white: 0xc0c0c0,
    red: 0xa33229,
    green: 0x419e2e,
    blue: 0x2e6e9e,
    yellow: 0xc1b215
};

const ContainerWallOutlineTints = {
    white: 0x797979,
    red: 0x661900,
    green: 0x006608,
    blue: 0x003b66,
    yellow: 0x808000
};

const ContainerWallTints = {
    white: 0xa8a8a8,
    red: 0x8f2400,
    green: 0x008f0c,
    blue: 0x00538f,
    yellow: 0xb3b300
};

export const TentTints = {
    red: 0xb24c4c,
    green: 0x90b24c,
    blue: 0x4c7fb2,
    orange: 0xc67438,
    purple: 0x994cb2
};

const blueHouseVaultLayout = (
    id: number,
    obstacles: readonly BuildingObstacle[],
    subBuildings?: readonly SubBuilding[]
): BuildingDefinition => ({
    idString: `blue_house_vault_layout_${id}`,
    name: "Blue House Vault Layout",
    spawnHitbox: RectangleHitbox.fromRect(40, 35, Vec.create(18.4, 18)),
    floorImages: [{
        key: subBuildings ? "blue_house_floor_2_2_special" : "blue_house_floor_2_2",
        position: Vec.create(18.4, 18),
        scale: Vec.create(1.07, 1.07)
    }],
    obstacles,
    subBuildings,
    ...(subBuildings === undefined ? { lootSpawners: [{ table: "ground_loot", position: Vec.create(23.5, 14.4) }] } : {})
});

const warehouseLayout = (id: number, obstacles: readonly BuildingObstacle[]): BuildingDefinition => ({
    idString: `warehouse_layout_${id}`,
    name: "Warehouse Layout",
    spawnHitbox: RectangleHitbox.fromRect(63.07, 114),
    obstacles
});

const container = (
    id: number,
    color: "white" | "red" | "green" | "blue" | "yellow",
    variant: "open2" | "open1" | "closed",
    damaged?: boolean
): BuildingDefinition => {
    const tint = ContainerTints[color];

    let hitbox: Hitbox;
    let wallHitbox: Hitbox | undefined;
    let spawnHitbox: Hitbox;
    let upperCeilingImage;
    let lowerCeilingImage;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const snowDecalDefinitions = {
        closed: pickRandomInArray([
            [
                {
                    key: "snow_decal_container_closed_1",
                    position: Vec.create(-2.5, -9.08)
                },
                {
                    key: "snow_decal_container_closed_2",
                    position: Vec.create(4.4, -6.5)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(-6.7, -7),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec.create(1.5, 1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(-1.9, -13.525),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec.create(1.1, 1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(6.65, -7),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec.create(1.5, 1)
                }
            ],
            [
                {
                    key: "snow_decal_container_closed_2",
                    position: Vec.create(-4.4, -6.5),
                    rotation: Math.PI
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(-6.7, -7),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec.create(1.5, 1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(-1.9, -13.525),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec.create(1.1, 1)
                },
                {
                    key: "snow_decal_container_open1_2",
                    position: Vec.create(1.8, 10),
                    rotation: Math.PI / 2
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(6.6, 7),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec.create(1.5, 1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(1.8, 13.525),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec.create(1.1, 1)
                }
            ]
        ]),
        open1: pickRandomInArray([
            [
                {
                    key: "snow_decal_container_open1_1",
                    position: Vec.create(3.5, 8.5),
                    rotation: Math.PI
                },
                {
                    key: "snow_decal_container_open1_2",
                    position: Vec.create(3.25, -8.5)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(6.7, -8),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec.create(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(1, -13.6),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec.create(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(6.7, 8),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec.create(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(5.9, 13.65),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec.create(0.25, 1.4)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(4.5, 13),
                    tint: tint,
                    rotation: 45,
                    scale: Vec.create(0.2125, 1.1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(0, 12.4),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec.create(0.95, 1.4)
                }
            ],
            [
                {
                    key: "snow_decal_container_open1_1",
                    position: Vec.create(3.5, 8.5),
                    rotation: Math.PI
                },
                {
                    key: "snow_decal_container_open1_2",
                    position: Vec.create(-2, -10),
                    rotation: -Math.PI / 2
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(-6.7, -8),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec.create(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(-1, -13.6),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec.create(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(6.7, 8),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec.create(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(5.9, 13.65),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec.create(0.25, 1.4)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(4.5, 13),
                    tint: tint,
                    rotation: 45,
                    scale: Vec.create(0.2125, 1.1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec.create(0, 12.4),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec.create(0.95, 1.4)
                }
            ]
        ]),
        open2: [
            {
                key: "snow_decal_container_closed_2",
                position: Vec.create(4.4, -6.5)
            },
            {
                key: "snow_decal_container_open2_1",
                position: Vec.create(-5, 2.5),
                rotation: Math.PI
            },
            {
                key: "container_snow_cover_patch",
                position: Vec.create(-6.7, 4.5),
                tint: tint,
                rotation: Math.PI / 2,
                scale: Vec.create(1.5, 1)
            },
            {
                key: "container_snow_cover_patch",
                position: Vec.create(6.65, -7),
                tint: tint,
                rotation: Math.PI / 2,
                scale: Vec.create(1.5, 1)
            }
        ]
    };

    switch (variant) {
        case "open2":
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 28, Vec.create(6.1, 0)),
                RectangleHitbox.fromRect(1.85, 28, Vec.create(-6.1, 0))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 27.05, Vec.create(-6.11, 0)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec.create(6.11, 0))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 39.9);
            upperCeilingImage = damaged ? "container_ceiling_3" : "container_ceiling_2";
            lowerCeilingImage = "container_ceiling_2";
            break;
        case "open1":
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 28, Vec.create(6.1, 0)),
                RectangleHitbox.fromRect(1.85, 28, Vec.create(-6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, Vec.create(0, -13.07))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 27.05, Vec.create(-6.11, 0)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec.create(6.11, 0)),
                RectangleHitbox.fromRect(13.13, 0.92, Vec.create(0, -13.07))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, Vec.create(0, 2));
            upperCeilingImage = damaged ? "container_ceiling_4" : "container_ceiling_1";
            lowerCeilingImage = damaged ? "container_ceiling_5" : "container_ceiling_2";
            break;
        case "closed":
        default:
            hitbox = RectangleHitbox.fromRect(14, 28);
            spawnHitbox = RectangleHitbox.fromRect(16, 30);
            upperCeilingImage = lowerCeilingImage = "container_ceiling_1";
            break;
    }

    const closed = variant === "closed";

    return {
        idString: `container_${id}`,
        name: `Container ${id}`,
        hitbox,
        reflectBullets: true,
        material: "metal_heavy",
        particle: `container_particle_${color}`,
        spawnHitbox,
        ceilingHitbox: RectangleHitbox.fromRect(12, 27),
        // TODO this is a bit of a mess, refactor
        graphics: closed
            ? []
            : wallHitbox
                ? [
                    { color: tint, hitbox: RectangleHitbox.fromRect(14, 28) },
                    { color: ContainerWallOutlineTints[color], hitbox },
                    { color: ContainerWallTints[color], hitbox: wallHitbox }
                ]
                : [
                    { color: tint, hitbox: RectangleHitbox.fromRect(14, 28) },
                    { color: ContainerWallOutlineTints[color], hitbox }
                ],
        graphicsZIndex: ZIndexes.BuildingsFloor + 1,
        ceilingImages: [
            {
                key: upperCeilingImage,
                position: Vec.create(0, -6.97),
                tint
            },
            {
                key: lowerCeilingImage,
                position: Vec.create(-0.04, 6.97),
                rotation: Math.PI,
                tint
            }
            // TODO Detect mode somehow
            // ...(GameConstants.modeName === "winter" ? snowDecalDefinitions[open] : [])
        ],
        floors: [{
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(14, 28)
        }],
        ...(
            closed
                ? {}
                : { lootSpawners: [{
                    position: Vec.create(0, 0),
                    table: "ground_loot"
                }] }
        )
    } as const;
};

const riverHut = (id: number, obstacles: readonly BuildingObstacle[]): BuildingDefinition => {
    const bridgeFloor1 = 31.5;
    return {
        idString: `river_hut_${id}`,
        name: "River Hut",
        wallsToDestroy: 3,
        ceilingCollapseParticle: "river_hut_ceiling_particle",
        spawnMode: MapObjectSpawnMode.Beach, // TODO: river bank spawn mode support
        spawnHitbox: RectangleHitbox.fromRect(70, 70, Vec.create(8, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(32.5, 39.25), // RectangleHitbox.fromRect(30.6, 37),
        floorImages: [
            {
                key: "river_hut_bridge_floor_1",
                position: Vec.create(20.15, -10.5)
            },
            {
                key: "river_hut_bridge_floor_2",
                position: Vec.create(bridgeFloor1, -5),
                scale: Vec.create(2, 2)
            },
            {
                key: "river_hut_floor",
                position: Vec.create(-2.6, 0),
                scale: Vec.create(2.14, 2.14)
            }
        ],
        ceilingImages: [{
            key: "river_hut_ceiling",
            position: Vec.create(0, 0),
            scale: Vec.create(2.1, 2.1),
            residue: "river_hut_residue"
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(32.5, 39.25),
                    RectangleHitbox.fromRect(10, 13, Vec.create(20.4, -10.5)),
                    RectangleHitbox.fromRect(13, 46, Vec.create(bridgeFloor1, -5))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(5.3, 11, Vec.create(-18.7, 12))
            }
        ],
        obstacles: [
            { idString: "door", position: Vec.create(-15.5, 12.18), rotation: 1 },
            { idString: "house_wall_20", position: Vec.create(0, -18.65), rotation: 0 },
            { idString: "house_wall_21", position: Vec.create(15.38, 8.12), rotation: 1 },
            { idString: "house_wall_22", position: Vec.create(-0.87, 18.68), rotation: 0 },
            { idString: "house_wall_23", position: Vec.create(-15.35, -5.09), rotation: 1 },
            ...obstacles
        ]
    };
};

const tent = (
    id: number,
    color: "red" | "green" | "blue" | "orange" | "purple",
    special = false
): BuildingDefinition => {
    const tint = TentTints[color];

    return {
        idString: `tent_${id}`,
        name: `Tent ${id}`,
        spawnHitbox: RectangleHitbox.fromRect(31, 23),
        ceilingHitbox: RectangleHitbox.fromRect(26, 16),
        floorImages: [{
            key: "tent_floor",
            position: Vec.create(0, 0),
            scale: Vec.create(1.02, 1.02),
            tint: tint
        }],
        ceilingImages: [{
            key: "tent_ceiling",
            position: Vec.create(0, 0),
            tint: tint,
            residue: "tent_residue",
            scale: Vec.create(2.04, 2.04)
        }],
        floors: [{
            type: FloorNames.Carpet,
            hitbox: RectangleHitbox.fromRect(26.5, 18)
        }],
        ceilingCollapseSound: "tent_collapse",
        ceilingCollapseParticle: `tent_ceiling_particle_${color}`,
        ceilingCollapseParticleVariations: 3,
        resetCeilingResidueScale: true,
        destroyUponCeilingCollapse: ["pole", `tent_wall_${id}`],
        wallsToDestroy: 1,
        obstacles: special
            ? [
                { idString: "pole", position: Vec.create(0, 0) },
                { idString: `tent_wall_${id}`, position: Vec.create(0, -8), rotation: 0 },
                { idString: `tent_wall_${id}`, position: Vec.create(0, 8), rotation: 2 },
                { idString: "gun_case", position: Vec.create(0, 5), rotation: 2 }
            ]
            : [
                { idString: "pole", position: Vec.create(0, 0) },
                { idString: `tent_wall_${id}`, position: Vec.create(0, -8), rotation: 0 },
                { idString: `tent_wall_${id}`, position: Vec.create(0, 8), rotation: 2 },
                { idString: "box", position: Vec.create(0, 5) }
            ],
        lootSpawners: [{
            table: special ? "warehouse" : "ground_loot",
            position: Vec.create(0, -5)
        }]
    };
};

const hayShed = (
    id: number,
    ceilingVariation: number,
    obstacles: readonly BuildingObstacle[],
    lootSpawners?: readonly LootSpawner[]
): BuildingDefinition => ({
    idString: `hay_shed_${id}`,
    name: `Hay Shed ${id}`,
    spawnHitbox: RectangleHitbox.fromRect(47, 32),
    ceilingHitbox: RectangleHitbox.fromRect(33.5, 24.5, Vec.create(-1.2, -0.5)),
    floorImages: [{
        key: "fall_patch_floor",
        position: Vec.create(0, 0),
        scale: Vec.create(2.14, 2.14),
        zIndex: ZIndexes.Ground
    }],
    ceilingImages: [{
        key: `hay_shed_ceiling_${ceilingVariation}`,
        position: Vec.create(-1, -0.5),
        residue: "hay_shed_residue",
        scale: Vec.create(2.14, 2.14)
    }],
    ceilingCollapseParticle: "hay_shed_ceiling_particle",
    ceilingCollapseParticleVariations: 2,
    wallsToDestroy: 2,
    obstacles: [
        { idString: "pole", position: Vec.create(14.04, -11.53) },
        { idString: "pole", position: Vec.create(-16.68, -11.55) },
        { idString: "pole", position: Vec.create(-16.52, 10.83) },
        { idString: "pole", position: Vec.create(13.98, 10.87) },
        ...obstacles
    ],
    lootSpawners
});

const bigTent = (
    id: number,
    color: "red" | "green" | "blue" | "orange" | "purple"
): BuildingDefinition => {
    const tint = TentTints[color];

    return {
        idString: `tent_big_${id}`,
        name: `Big Tent ${id}`,
        spawnHitbox: RectangleHitbox.fromRect(58, 35),
        ceilingHitbox: RectangleHitbox.fromRect(44, 27),
        floorImages: [{
            key: "tent_floor_big",
            position: Vec.create(0, 0),
            scale: Vec.create(2.04, 2.04),
            tint
        }],
        ceilingImages: [{
            key: "tent_ceiling_big",
            position: Vec.create(0, 0),
            tint,
            residue: "tent_residue_big",
            scale: Vec.create(2.02, 2.02)
        }],
        floors: [{
            type: FloorNames.Carpet,
            hitbox: RectangleHitbox.fromRect(44.25, 29)
        }],
        ceilingCollapseSound: "tent_collapse",
        ceilingCollapseParticle: `tent_ceiling_particle_${color}`,
        ceilingCollapseParticleVariations: 3,
        wallsToDestroy: 1,
        destroyUponCeilingCollapse: ["pole", `tent_wall_big_${id}`, "tent_window"],
        obstacles: [
            { idString: "pole", position: Vec.create(3.42, -5.76) },
            { idString: "pole", position: Vec.create(-3.42, 5.76) },
            { idString: `tent_wall_big_${id}`, position: Vec.create(0, -10.5), rotation: 2 },
            { idString: `tent_wall_big_${id}`, position: Vec.create(0, 10.5), rotation: 0 },
            { idString: "office_chair", position: Vec.create(-17, -9.73), rotation: 1 },
            { idString: { box: 1, office_chair: 2 }, position: Vec.create(25.5, 9.65), rotation: 2 },
            { idString: { grenade_box: 1, box: 0.5 }, position: Vec.create(-18.07, 10.49) },
            { idString: "box", position: Vec.create(-0.07, -10.51) },
            { idString: "small_bed", position: Vec.create(12, 8.56), rotation: 3 },
            { idString: "box", position: Vec.create(18.17, -10.51), rotation: 0 },
            { idString: { box: 2, office_chair: 1 }, position: Vec.create(-25.5, -9.65), rotation: 0 },
            { idString: "tent_window", position: Vec.create(9.11, -14.03), rotation: 0 },
            { idString: "tent_window", position: Vec.create(-9.11, -14.03), rotation: 0 },
            { idString: "tent_window", position: Vec.create(-9.11, 14.03), rotation: 0 },
            { idString: "tent_window", position: Vec.create(9.11, 14.03), rotation: 0 }
        ],
        lootSpawners: [
            { table: "ground_loot", position: Vec.create(-10.68, 0) },
            { table: "ground_loot", position: Vec.create(10.68, 0) }
        ]
    };
};

const tugboat = (color: string, mainLoot: string): BuildingDefinition => ({
    idString: `tugboat_${color}`,
    name: "Tugboat",
    reflectBullets: true,
    material: "metal_heavy",
    particle: "metal_particle",
    hitbox: new GroupHitbox(
        RectangleHitbox.fromRect(8.93, 2.09, Vec.create(80.47, -4.78)),
        RectangleHitbox.fromRect(8.93, 2.09, Vec.create(99.51, -4.78)),
        RectangleHitbox.fromRect(2.21, 35.83, Vec.create(104.37, 12.09)),
        RectangleHitbox.fromRect(2.14, 35.83, Vec.create(75.67, 12.09)),
        RectangleHitbox.fromRect(30.88, 1.98, Vec.create(90.04, 29.78)),
        RectangleHitbox.fromRect(0.99, 14, Vec.create(69.21, -38)),
        RectangleHitbox.fromRect(12, 1, Vec.create(76, -46.2)),
        RectangleHitbox.fromRect(13, 1, Vec.create(103.5, -46.2)),
        RectangleHitbox.fromRect(1, 73, Vec.create(110.59, -8.5)),
        RectangleHitbox.fromRect(0.99, 45, Vec.create(69.21, 5.5)),
        new CircleHitbox(1.45, Vec.create(70.1, -45.5)),
        new CircleHitbox(1.45, Vec.create(81.7, -45.5)),
        new CircleHitbox(1.45, Vec.create(97.4, -45.5)),
        new CircleHitbox(1.45, Vec.create(109.7, -45.5)),
        new CircleHitbox(1.45, Vec.create(109.7, -30.8)),
        new CircleHitbox(1.45, Vec.create(70.1, -30.8)),
        new CircleHitbox(1.45, Vec.create(109.7, -16.6)),
        new CircleHitbox(1.45, Vec.create(70.1, -16.6)),
        new CircleHitbox(1.45, Vec.create(109.7, -1.6)),
        new CircleHitbox(1.45, Vec.create(70.1, -1.6)),
        new CircleHitbox(1.45, Vec.create(109.7, 13.4)),
        new CircleHitbox(1.45, Vec.create(70.1, 13.4)),
        new CircleHitbox(1.45, Vec.create(109.7, 27.6)),
        new CircleHitbox(1.45, Vec.create(70.1, 27.6)),
        new CircleHitbox(2, Vec.create(90, 45)),
        new CircleHitbox(2, Vec.create(91.5, 44.99)),
        new CircleHitbox(2, Vec.create(93, 44.95)),
        new CircleHitbox(2, Vec.create(94.5, 44.84)),
        new CircleHitbox(2, Vec.create(96, 44.61)),
        new CircleHitbox(2, Vec.create(97.5, 44.23)),
        new CircleHitbox(2, Vec.create(99, 43.65)),
        new CircleHitbox(2, Vec.create(100.5, 42.8)),
        new CircleHitbox(2, Vec.create(102, 41.61)),
        new CircleHitbox(2, Vec.create(103.5, 39.99)),
        new CircleHitbox(2, Vec.create(105, 37.78)),
        new CircleHitbox(2, Vec.create(106.5, 34.72)),
        new CircleHitbox(2, Vec.create(108, 30.23)),
        new CircleHitbox(2, Vec.create(90, 45)),
        new CircleHitbox(2, Vec.create(88.5, 44.99)),
        new CircleHitbox(2, Vec.create(87, 44.95)),
        new CircleHitbox(2, Vec.create(85.5, 44.84)),
        new CircleHitbox(2, Vec.create(84, 44.61)),
        new CircleHitbox(2, Vec.create(82.5, 44.23)),
        new CircleHitbox(2, Vec.create(81, 43.65)),
        new CircleHitbox(2, Vec.create(79.5, 42.8)),
        new CircleHitbox(2, Vec.create(78, 41.61)),
        new CircleHitbox(2, Vec.create(76.5, 39.99)),
        new CircleHitbox(2, Vec.create(75, 37.78)),
        new CircleHitbox(2, Vec.create(73.5, 34.72)),
        new CircleHitbox(2, Vec.create(72, 30.23))
    ),
    spawnMode: MapObjectSpawnMode.Beach,
    spawnHitbox: RectangleHitbox.fromRect(70, 110, Vec.create(90, 0)),
    ceilingHitbox: RectangleHitbox.fromRect(30, 35, Vec.create(90, 12.5)),
    floorImages: [
        {
            key: `tugboat_${color}_floor_1`,
            position: Vec.create(90, -23.7)
        },
        {
            key: `tugboat_${color}_floor_2`,
            position: Vec.create(90, 23.7)
        }
    ],
    ceilingImages: [{
        key: `tugboat_${color}_ceiling`,
        position: Vec.create(90, 12.5)
    }],
    floors: [
        { type: FloorNames.Wood, hitbox: RectangleHitbox.fromRect(29, 71.5, Vec.create(90, -7)) },
        { type: FloorNames.Metal, hitbox: RectangleHitbox.fromRect(39.5, 75, Vec.create(90, -8)) },
        { type: FloorNames.Metal, hitbox: RectangleHitbox.fromRect(9.7, 10, Vec.create(71, -23.7)) },
        { type: FloorNames.Metal, hitbox: RectangleHitbox.fromRect(10, 8.7, Vec.create(89.9, -46)) }
    ],
    obstacles: [
        { idString: "tire", position: Vec.create(111.28, 5.18), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec.create(111.4, 14.57), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec.create(111.4, 24.17), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec.create(71.55, 24.17), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec.create(71.5, 14.57), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec.create(71.45, 5.12), rotation: 0, outdoors: true },
        { idString: "regular_crate", position: Vec.create(81.48, -37.36), outdoors: true },
        { idString: "regular_crate", position: Vec.create(101.49, -11.45), outdoors: true },
        { idString: "grenade_crate", position: Vec.create(102.3, -38.43), outdoors: true },
        { idString: "barrel", position: Vec.create(102.74, -26.23), outdoors: true },
        { idString: "tugboat_control_panel", position: Vec.create(90, 24.1), rotation: 0 },
        { idString: "office_chair", position: Vec.create(90, 16.65), rotation: 0 },
        { idString: "door", position: Vec.create(90.45, -4.8), rotation: 0 },
        { idString: "large_drawer", position: Vec.create(99.29, 2.98), rotation: 3 },
        { idString: "life_preserver", position: Vec.create(101.23, 14.67), rotation: 0 },
        { idString: mainLoot, position: Vec.create(80.38, 4.29), rotation: 1 },
        { idString: "window2", position: Vec.create(83.91, 30.75), rotation: 1 },
        { idString: "window2", position: Vec.create(95.63, 30.75), rotation: 1 }
    ],
    ...(
        color === "red"
            ? {
                lootSpawners: [
                    { table: "tugboat_red_floor", position: Vec.create(89, -25) }
                ]
            }
            : {}
    )
} as const);

const port_warehouse = (color: string, tint: number): BuildingDefinition => ({
    idString: `port_warehouse_${color}`,
    name: "Port Warehouse",
    reflectBullets: true,
    material: "metal_heavy",
    particle: "metal_particle",
    hitbox: new GroupHitbox(
        // Outer corners
        RectangleHitbox.fromRect(2, 18.4, Vec.create(-29.53, -51.54)),
        RectangleHitbox.fromRect(2, 18.4, Vec.create(29.53, 51.54)),
        RectangleHitbox.fromRect(2, 18.4, Vec.create(-29.53, 51.54)),
        RectangleHitbox.fromRect(2, 18.4, Vec.create(29.53, -51.54)),

        // Top and bottom
        RectangleHitbox.fromRect(60, 2, Vec.create(0, -59.79)),
        RectangleHitbox.fromRect(60, 2, Vec.create(0, 59.79)),

        // Sides
        RectangleHitbox.fromRect(2, 35.55, Vec.create(-29.53, 0)),
        RectangleHitbox.fromRect(2, 35.55, Vec.create(29.53, 0)),

        // Inner corners
        RectangleHitbox.fromRect(13, 2, Vec.create(22.34, -16.85)),
        RectangleHitbox.fromRect(13, 2, Vec.create(-22.34, 16.85)),

        // Doors
        RectangleHitbox.fromRect(1.74, 25, Vec.create(-29.65, -30)),
        RectangleHitbox.fromRect(1.74, 25, Vec.create(29.65, 30))
    ),
    spawnHitbox: RectangleHitbox.fromRect(72, 130),
    ceilingHitbox: RectangleHitbox.fromRect(58, 118),
    floorImages: [
        { key: "port_warehouse_floor", position: Vec.create(2.04, -30.38) },
        { key: "port_warehouse_floor", position: Vec.create(-2.04, 30.38), rotation: Math.PI }
    ],
    ceilingImages: [
        {
            key: "port_warehouse_ceiling",
            position: Vec.create(0, 0),
            tint,
            scale: Vec.create(2.01, 2.05)
        }
        // TODO Detect mode somehow
        // ...(GameConstants.modeName === "winter"
        //     ? [
        //         {
        //             key: "snow_decal_1",
        //             position: Vec.create(5, 0),
        //             scale: Vec.create(1.5, 1.5)
        //         },
        //         {
        //             key: "snow_decal_2",
        //             position: Vec.create(12, -39),
        //             scale: Vec.create(1.5, 1.5),
        //             rotation: Math.PI / 2
        //         },
        //         {
        //             key: "snow_decal_3",
        //             position: Vec.create(-15, 33),
        //             scale: Vec.create(2, 2),
        //             rotation: Math.PI
        //         },
        //         {
        //             key: "port_warehouse_snow_decal_1",
        //             position: Vec.create(-28.5, -53.7),
        //             scale: Vec.create(2, 2),
        //             rotation: -Math.PI / 2
        //         },
        //         {
        //             key: "port_warehouse_snow_decal_2",
        //             position: Vec.create(13.1, 53.5),
        //             rotation: Math.PI,
        //             scale: Vec.create(2, 2)
        //         },
        //         {
        //             key: "port_warehouse_snow_decal_3",
        //             position: Vec.create(17.5, -52.25),
        //             scale: Vec.create(2, 2),
        //             rotation: -Math.PI / 2
        //         },
        //         {
        //             key: "port_warehouse_snow_decal_4",
        //             position: Vec.create(-23, -20),
        //             scale: Vec.create(2, 2)
        //         },
        //         {
        //             key: "port_warehouse_snow_decal_5",
        //             position: Vec.create(22.8, -20),
        //             scale: Vec.create(2, 2)
        //         },
        //         {
        //             key: "port_warehouse_snow_decal_1",
        //             position: Vec.create(-23.5, 58.6),
        //             scale: Vec.create(2, 2),
        //             rotation: Math.PI
        //         }
        //     ]
        //     : [])
    ],
    obstacles: [
        { idString: "super_barrel", position: Vec.create(-10, -52) },
        { idString: "regular_crate", position: Vec.create(-22, -52) },
        { idString: "forklift", position: Vec.create(15, -52), rotation: 3 },
        { idString: "regular_crate", position: Vec.create(-22, -10) },
        { idString: "regular_crate", position: Vec.create(-20, 0) },
        { idString: "regular_crate", position: Vec.create(-22, 10) },
        { idString: "forklift", position: Vec.create(-8, -2), rotation: 2 },
        { idString: { regular_crate: 0.3, flint_crate: 1 }, position: Vec.create(-11, 50) },
        { idString: "regular_crate", position: Vec.create(-22, 52) },
        { idString: "barrel", position: Vec.create(1, 52) },
        { idString: "super_barrel", position: Vec.create(10, 48) },
        { idString: "barrel", position: Vec.create(23, 52) },
        { idString: "barrel", position: Vec.create(17, 5) },
        { idString: "barrel", position: Vec.create(24, 0) },
        { idString: "box", position: Vec.create(24, 9) },
        { idString: "box", position: Vec.create(19, 12) }
    ]
} as const);

const blueHouse = (idString: string, subBuildings: BuildingDefinition["subBuildings"] = []): BuildingDefinition => ({
    idString,
    name: "Blue House",
    hitbox: new GroupHitbox(
        // Left.
        RectangleHitbox.fromRect(2, 11, Vec.create(-34.4, 18.25)),
        RectangleHitbox.fromRect(2, 32.55, Vec.create(-34.4, -14.6)),

        // Right.
        RectangleHitbox.fromRect(2, 20.5, Vec.create(34.5, 13.1)),
        RectangleHitbox.fromRect(2, 21.5, Vec.create(34.5, -19)),

        // Center and corners.
        RectangleHitbox.fromRect(10, 2, Vec.create(-29.25, -29.9)), // TL
        RectangleHitbox.fromRect(6, 2, Vec.create(-10.8, -29.9)),
        RectangleHitbox.fromRect(58, 2, Vec.create(5.6, 22.5)),
        RectangleHitbox.fromRect(33.4, 2, Vec.create(18.9, -29.9)), // TR

        RectangleHitbox.fromRect(3, 3, Vec.create(7.5, -12.5))
    ),
    material: "stone",
    particle: "wall_particle",
    spawnHitbox: RectangleHitbox.fromRect(90, 90),
    ceilingHitbox: new GroupHitbox(
        RectangleHitbox.fromRect(68, 53, Vec.create(0, -3.5)),
        RectangleHitbox.fromRect(11, 10, Vec.create(-28, 27))
    ),
    floorImages: [
        {
            key: "blue_house_floor_2_1",
            position: Vec.create(-18.67, 17.97),
            scale: Vec.create(1.07, 1.07)
        },
        {
            key: "blue_house_floor_1",
            position: Vec.create(0, -17),
            scale: Vec.create(1.07, 1.07)
        }
    ],
    ceilingImages: [{
        key: "blue_house_ceiling",
        position: Vec.create(0, 1.5),
        scale: Vec.create(2.3, 2.3)
    }],
    floors: [
        {
            type: FloorNames.Stone,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(11, 5.5, Vec.create(-3.25, -32.6)),
                RectangleHitbox.fromRect(71, 11, Vec.create(0, 29)),
                // mini vault
                RectangleHitbox.fromRect(22.5, 11, Vec.create(20.5, 14)),
                RectangleHitbox.fromRect(10, 14, Vec.create(26.5, 12))
            )
        },
        {
            type: FloorNames.Wood,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(41, 52, Vec.create(-13.5, -3.6)),
                RectangleHitbox.fromRect(41, 34, Vec.create(13.5, -12)),

                // patches
                RectangleHitbox.fromRect(12, 2, Vec.create(-28, 22.5)),
                RectangleHitbox.fromRect(12, 2, Vec.create(-3.3, -30)),
                RectangleHitbox.fromRect(14, 2, Vec.create(13, 6))
            )
        }
    ],
    obstacles: [
        // windows
        { idString: "window", position: Vec.create(-34.7, 7.2), rotation: 0 },
        { idString: "window", position: Vec.create(34.7, -2.6), rotation: 0 },
        { idString: "window", position: Vec.create(-18.9, -30), rotation: 1 },

        // door fun
        { idString: "door", position: Vec.create(-3.3, -29.9), rotation: 2 },
        { idString: "door", position: Vec.create(-29, 22.6), rotation: 2 },

        // outside part
        { idString: "barrel", position: Vec.create(-7, 29), outdoors: true },
        { idString: { box: 1, trash_bag: 0.6 }, position: Vec.create(25, 27), outdoors: true },
        { idString: "box", position: Vec.create(19, 28.5), outdoors: true },

        // top right
        { idString: "house_wall_6", position: Vec.create(7.5, -21.5), rotation: 1 },
        { idString: "small_drawer", position: Vec.create(30.25, -25), rotation: 0 },
        { idString: "fridge", position: Vec.create(21.5, -25.1), rotation: 0 },
        { idString: randomSmallStove, position: Vec.create(12.5, -25), rotation: 0 },
        //   { idString: "bookshelf", position: Vec.create(4.25, -22), rotation: 1 },

        // bottom right (mini vault ig)
        { idString: "house_wall_14", position: Vec.create(6.25, 13.1), rotation: 1 },
        { idString: "metal_door", position: Vec.create(26.15, 5.7), rotation: 2 },
        { idString: "box", position: Vec.create(16, 1.7) },

        // bathroom
        { idString: "house_wall_3", position: Vec.create(-10.5, 5.6), rotation: 0 },
        { idString: { toilet: 2, used_toilet: 1 }, position: Vec.create(-11.25, 10.1), rotation: 1 },
        { idString: "small_drawer", position: Vec.create(-11.6, 17.5), rotation: 1 },
        { idString: "door", position: Vec.create(-0.2, 5.6), rotation: 2 },
        { idString: "house_wall_14", position: Vec.create(-17, 13.15), rotation: 1 },
        { idString: "bookshelf", position: Vec.create(-20.27, 15), rotation: 1 },
        { idString: "trash_can", position: Vec.create(2.1, 18) },

        // top left
        { idString: "house_wall_16", position: Vec.create(-10, -13.65), rotation: 1 },
        { idString: "door", position: Vec.create(-10, -23.5), rotation: 3 },
        { idString: "house_wall_17", position: Vec.create(-22.3, -9.4), rotation: 0 },
        { idString: "small_drawer", position: Vec.create(-14.7, -14.5), rotation: 2 },
        { idString: "small_bed", position: Vec.create(-29.25, -19.9), rotation: 2 },
        { idString: "bookshelf", position: Vec.create(-15.25, -6), rotation: 0 },
        { idString: "potted_plant", position: Vec.create(-29, -4) }
    ],
    subBuildings: subBuildings.length > 1
        ? [
            { idString: "blue_house_vault", position: Vec.create(-14.1, 20.5), orientation: 1 },
            ...subBuildings
        ]
        : [
            { idString: "blue_house_vault", position: Vec.create(-14.1, 20.5), orientation: 1 },
            {
                idString: {
                    blue_house_vault_layout_1: 1,
                    blue_house_vault_layout_3: 1,
                    blue_house_vault_layout_4: 1,
                    blue_house_vault_layout_5: 1,
                    blue_house_vault_layout_6: 1,
                    blue_house_vault_layout_7: 0.5

                },
                position: Vec.create(0, 0)
            },
            ...subBuildings
        ]
});

export const Buildings = new ObjectDefinitions<BuildingDefinition>([
    {
        idString: "porta_potty",
        name: "Porta Potty",
        spawnHitbox: RectangleHitbox.fromRect(20, 32),
        ceilingHitbox: RectangleHitbox.fromRect(14, 18),
        floorImages: [
            {
                key: "porta_potty_floor",
                position: Vec.create(0, 1.5)
            }
        ],
        ceilingImages: [
            {
                key: "porta_potty_ceiling",
                position: Vec.create(0, 0),
                residue: "porta_potty_residue"
            }
        ],
        wallsToDestroy: 2,
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(14, 18)
            },
            {
                type: FloorNames.Wood,
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
        idString: "outhouse",
        name: "Outhouse",
        spawnHitbox: RectangleHitbox.fromRect(19, 29),
        ceilingHitbox: RectangleHitbox.fromRect(14.94, 20, Vec.create(0, -2.02)),
        floorImages: [
            {
                key: "outhouse_floor",
                position: Vec.create(0, 0)
            }
        ],
        ceilingImages: [
            {
                key: "outhouse_ceiling",
                position: Vec.create(0, -1.95),
                residue: "outhouse_residue"
            }
        ],
        wallsToDestroy: 2,
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(14.94, 20.8, Vec.create(0, -2.02))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10, 4.7, Vec.create(0, 10.07))
            }
        ],
        obstacles: [
            { idString: randomToilet, position: Vec.create(0, -6), rotation: 0 },
            { idString: "outhouse_back_wall", position: Vec.create(0, -11.55), rotation: 0 },
            { idString: "outhouse_toilet_paper_wall", position: Vec.create(-5.58, -2.83), rotation: 0 },
            { idString: "outhouse_side_wall", position: Vec.create(6.76, -2.83), rotation: 0 },
            { idString: "outhouse_front_wall", position: Vec.create(6.25, 7.68), rotation: 0 },
            { idString: "outhouse_front_wall", position: Vec.create(-6.25, 7.68), rotation: 0 },
            { idString: "outhouse_door", position: Vec.create(-0.05, 7.64), rotation: 0 }
        ]
    },
    {
        idString: "firework_warehouse",
        name: "Firework Warehouse",
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(27.7, 1.75, Vec.create(-19, -23)),
            RectangleHitbox.fromRect(27.7, 1.75, Vec.create(19, -23)),
            RectangleHitbox.fromRect(27.7, 1.75, Vec.create(-19, 23)),
            RectangleHitbox.fromRect(27.7, 1.75, Vec.create(19, 23)),
            RectangleHitbox.fromRect(1.75, 18, Vec.create(32.3, 15)),
            RectangleHitbox.fromRect(1.75, 18, Vec.create(32.3, -15)),
            RectangleHitbox.fromRect(1.75, 18, Vec.create(-32.3, 15)),
            RectangleHitbox.fromRect(1.75, 18, Vec.create(-32.3, -15))
        ),
        spawnHitbox: RectangleHitbox.fromRect(110, 70),
        ceilingHitbox: RectangleHitbox.fromRect(65, 48),
        floorImages: [
            {
                key: "firework_warehouse_floor_1_top",
                position: Vec.create(-17.4, -14)
            },
            {
                key: "firework_warehouse_floor_1_bottom",
                position: Vec.create(-17.4, 14)
            },
            {
                key: "firework_warehouse_floor_2_top",
                position: Vec.create(17.4, -14)
            },
            {
                key: "firework_warehouse_floor_2_bottom",
                position: Vec.create(17.4, 14)
            }
        ],
        ceilingImages: [
            {
                key: "firework_warehouse_ceiling_1",
                position: Vec.create(-16.5, 0),
                scale: Vec.create(2, 2)
            },

            {
                key: "firework_warehouse_ceiling_2",
                position: Vec.create(17, 0),
                scale: Vec.create(2, 2)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(65, 48, Vec.create(0, 0))
            }
        ],
        obstacles: [
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

    warehouseLayout(1, [
        // top left
        { idString: "ammo_crate", position: Vec.create(-19.53, -26.33) },

        // top right
        { idString: "box", position: Vec.create(22.08, -38.77) },
        { idString: "box", position: Vec.create(17, -38) },
        { idString: "box", position: Vec.create(20.47, -33) },
        { idString: "super_barrel", position: Vec.create(20.13, -26.24) },

        // center
        { idString: "ammo_crate", position: Vec.create(-10, 0) },
        { idString: "ammo_crate", position: Vec.create(10, 0) },
        { idString: "regular_crate", position: Vec.create(0, 5) },
        { idString: "regular_crate", position: Vec.create(0, -5) },

        // bottom left
        { idString: "barrel", position: Vec.create(-20.34, 27.05) },

        // bottom right
        { idString: "box", position: Vec.create(21.65, 28.5) },
        { idString: "regular_crate", position: Vec.create(19.39, 36.48) }
    ]),

    warehouseLayout(2, [
        // top left
        { idString: "barrel", position: Vec.create(-20.34, -27.05) },
        { idString: "grenade_box", position: Vec.create(-21.81, -19.82) },

        // top right
        { idString: "regular_crate", position: Vec.create(19.39, -36.48) },
        { idString: "super_barrel", position: Vec.create(20.13, -26.24) },

        // center
        { idString: "ammo_crate", position: Vec.create(-10, 0) },
        { idString: "ammo_crate", position: Vec.create(10, 0) },
        { idString: "barrel", position: Vec.create(0, 5) },
        { idString: "box", position: Vec.create(-2.26, -3.25) },
        { idString: "box", position: Vec.create(2.5, -7.02) },
        { idString: "box", position: Vec.create(8.39, 8.04) },
        { idString: "box", position: Vec.create(-8.39, 8.04) },

        // bottom left
        { idString: "ammo_crate", position: Vec.create(-19.53, 26.33) },
        { idString: "box", position: Vec.create(-21.74, 17.98) },

        // bottom right
        { idString: "box", position: Vec.create(21.65, 28.5) },
        { idString: "grenade_box", position: Vec.create(17.06, 23.3) },
        { idString: "regular_crate", position: Vec.create(19.39, 36.48) }
    ]),

    warehouseLayout(3, [
        // top left
        { idString: "barrel", position: Vec.create(-20.34, -26.33) },

        // top right
        { idString: "grenade_crate", position: Vec.create(20.42, -37.61) },
        { idString: "barrel", position: Vec.create(20.13, -28.5) },

        // center
        { idString: "regular_crate", position: Vec.create(-10, 0) },
        { idString: "regular_crate", position: Vec.create(10, 0) },
        { idString: "ammo_crate", position: Vec.create(0, 5) },
        { idString: "ammo_crate", position: Vec.create(0, -5) },

        // bottom left
        { idString: "super_barrel", position: Vec.create(-20.34, 27.05) },

        // bottom right
        { idString: "box", position: Vec.create(16.57, 38.75) },
        { idString: "box", position: Vec.create(21.97, 33.38) },
        { idString: "grenade_box", position: Vec.create(21.96, 38.75) }
    ]),

    warehouseLayout(4, [
        // top left
        { idString: "barrel", position: Vec.create(-19.39, -26.33) },

        // top right
        { idString: "ammo_crate", position: Vec.create(19.39, -36.48) },

        // center
        { idString: "super_barrel", position: Vec.create(0, 0) },

        { idString: "box", position: Vec.create(-7.84, -1.9) },
        { idString: "box", position: Vec.create(-12.28, 2.68) },
        { idString: "pallet", position: Vec.create(-10.21, 0.18), rotation: 1 },

        { idString: "pallet", position: Vec.create(10.21, 0.18), rotation: 1 },
        { idString: "grenade_crate", position: Vec.create(11.43, -2.41) },
        { idString: "box", position: Vec.create(7.84, 3.5) },

        { idString: "regular_crate", position: Vec.create(0, 10) },

        { idString: "pallet", position: Vec.create(0, -10), rotation: 0 },
        { idString: "box", position: Vec.create(-2.32, -12.17) },
        { idString: "grenade_box", position: Vec.create(-0.36, -7.65) },
        { idString: "box", position: Vec.create(2.79, -12.25) },

        // sides
        { idString: "ammo_crate", position: Vec.create(19.7, 0) },
        { idString: "ammo_crate", position: Vec.create(-19.7, 0) },

        // bottom right
        { idString: "barrel", position: Vec.create(19.39, 36.48) },
        { idString: "pallet", position: Vec.create(19.53, 26.04), rotation: 1 },
        { idString: "box", position: Vec.create(21.19, 23.6) },
        { idString: "grenade_box", position: Vec.create(17.61, 28.33) }

    ]),

    {
        idString: "warehouse",
        name: "Warehouse",
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14.05, 1.97, Vec.create(-20.01, -43.01)),
            RectangleHitbox.fromRect(14.05, 1.97, Vec.create(20.01, -43.01)),
            RectangleHitbox.fromRect(14.05, 1.97, Vec.create(-20.01, 43.01)),
            RectangleHitbox.fromRect(14.05, 1.97, Vec.create(20.01, 43.01)),
            RectangleHitbox.fromRect(1.97, 87.84, Vec.create(-26, 0)),
            RectangleHitbox.fromRect(1.97, 87.84, Vec.create(26, 0))
        ),
        spawnHitbox: RectangleHitbox.fromRect(63.07, 114),
        ceilingHitbox: RectangleHitbox.fromRect(52.92, 89),
        floorImages: [
            {
                key: "warehouse_floor_1",
                position: Vec.create(0, -26.5)
            },
            {
                key: "warehouse_floor_2",
                position: Vec.create(0, 26.5)
            }
        ],
        ceilingImages: [
            {
                key: "warehouse_ceiling_1",
                position: Vec.create(0, -22.25),
                scale: Vec.create(2, 2)
            },
            {
                key: "warehouse_ceiling_2",
                position: Vec.create(0, 22.25),
                scale: Vec.create(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Stone,
            hitbox: RectangleHitbox.fromRect(54.04, 105.96)
        }],
        obstacles: [
            { idString: warehouseObstacle, position: Vec.create(-19.39, -36.48) },
            { idString: warehouseObstacle, position: Vec.create(-19.39, 36.48) }
        ],
        subBuildings: [{
            idString: {
                warehouse_layout_1: 1,
                warehouse_layout_2: 1,
                warehouse_layout_3: 1,
                warehouse_layout_4: 1
            },
            position: Vec.create(0, 0)
        }]
    },
    port_warehouse("red", 0x813131),
    port_warehouse("blue", 0x2e2e6a),
    {
        idString: "refinery",
        name: "Refinery",
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            // Building walls
            RectangleHitbox.fromRect(57, 1.8, Vec.create(-22, -36.1)), // First topmost wall
            RectangleHitbox.fromRect(30.75, 1.8, Vec.create(35.38, -36.1)), // Wall after the hole
            RectangleHitbox.fromRect(2, 33.5, Vec.create(49.75, -22.25)), // Wall from top right to bottom right
            RectangleHitbox.fromRect(16.25, 2.05, Vec.create(42.63, -6.53)), // Wall to the right of the entrance
            RectangleHitbox.fromRect(38.5, 2.05, Vec.create(2.25, -6.53)), // Wall to the left of the entrance
            RectangleHitbox.fromRect(2, 21.55, Vec.create(-16, 3.23)), // Wall on top of the window
            RectangleHitbox.fromRect(2, 13.5, Vec.create(-16, 30.25)), // Wall bellow the window
            RectangleHitbox.fromRect(35.5, 2, Vec.create(-32.75, 36.25)), // Bottommost wall
            RectangleHitbox.fromRect(2, 74, Vec.create(-49.5, 0)), // Wall from topmost to bottommost
            RectangleHitbox.fromRect(13.3, 2, Vec.create(-43.35, 9)), // inner door walls
            RectangleHitbox.fromRect(10.5, 2, Vec.create(-21.25, 9)),

            // Outer walls
            RectangleHitbox.fromRect(40.2, 1.93, Vec.create(-33.85, 83)), // Bottom bottom left
            RectangleHitbox.fromRect(1.93, 18, Vec.create(-53, 73.3)), // Left bottom left
            RectangleHitbox.fromRect(1.93, 86, Vec.create(-53, 2.05)), // Left top left
            RectangleHitbox.fromRect(60, 1.93, Vec.create(-22, -40)), // Top top left
            RectangleHitbox.fromRect(64, 1.93, Vec.create(51, -40)), // Top
            RectangleHitbox.fromRect(19, 1.93, Vec.create(114.45, -40)), // Top top right
            RectangleHitbox.fromRect(1.93, 39, Vec.create(123, -19.7)), // Right top right
            RectangleHitbox.fromRect(1.93, 55.7, Vec.create(123, 56.1)), // Right bottom right
            RectangleHitbox.fromRect(102, 1.93, Vec.create(71.7, 83)) // Bottom bottom right
        ),
        spawnHitbox: RectangleHitbox.fromRect(184, 131, Vec.create(35, 21.50)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(33.50, 72, Vec.create(-32.75, 0)),
            RectangleHitbox.fromRect(65.50, 29.50, Vec.create(16.75, -21.25))
        ),
        floorImages: [
            {
                key: "refinery_floor_1",
                position: Vec.create(0, -18.1)
            },
            {
                key: "refinery_floor_2",
                position: Vec.create(-32.85, 19)
            },

            // Outer walls
            // Bottom left walls
            { key: "concrete_wall_end", position: Vec.create(-15, 83) },
            { key: "concrete_wall_corner", position: Vec.create(-53, 83) },
            { key: "concrete_wall_end_broken_1", position: Vec.create(-53, 65.5), rotation: Math.PI * 1.5 },
            // Wall from bottom left to top left
            { key: "concrete_wall_end_broken_2", position: Vec.create(-53, 44), rotation: Math.PI / 2 },
            // Top left corner
            { key: "concrete_wall_corner", position: Vec.create(-53, -40), rotation: Math.PI / 2 },
            { key: "concrete_wall_end_broken_1", position: Vec.create(7, -40) },
            { key: "concrete_wall_end_broken_2", position: Vec.create(20, -40), rotation: Math.PI },
            { key: "concrete_wall_end_broken_2", position: Vec.create(82, -40) },
            { key: "concrete_wall_end_broken_1", position: Vec.create(106, -40), rotation: Math.PI },
            // Top right corner
            { key: "concrete_wall_corner", position: Vec.create(123, -40), rotation: Math.PI },
            { key: "concrete_wall_end", position: Vec.create(123, -1.5), rotation: Math.PI / 2 },
            { key: "concrete_wall_end", position: Vec.create(123, 29.5), rotation: Math.PI * 1.5 },
            // Bottom right corner
            { key: "concrete_wall_corner", position: Vec.create(123, 83), rotation: Math.PI * 1.5 },
            { key: "concrete_wall_end", position: Vec.create(22, 83), rotation: Math.PI }
        ],
        ceilingImages: [
            {
                key: "refinery_ceiling_1",
                position: Vec.create(0, -21.3)
            },
            {
                key: "refinery_ceiling_2",
                position: Vec.create(-32.85, 15.75)
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
        graphics: [ // Outer walls
            // Bottom bottom left
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(36, 1.93, Vec.create(-34.25, 83)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(36, 1.22, Vec.create(-34.25, 83)) },

            // Left bottom left
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(1.93, 16, Vec.create(-53, 74.2)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(1.22, 16, Vec.create(-53, 74.2)) },

            // Left top left
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(1.93, 82, Vec.create(-53, 1.75)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(1.22, 82, Vec.create(-53, 1.75)) },

            // Top top left
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(58, 1.93, Vec.create(-23.4, -40)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(58, 1.22, Vec.create(-23.4, -40)) },

            // Top
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(60, 1.93, Vec.create(51, -40)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(60, 1.22, Vec.create(51, -40)) },

            // Top top right
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(15, 1.93, Vec.create(114.7, -40)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(15, 1.22, Vec.create(114.7, -40)) },

            // Right top right
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(1.93, 36.5, Vec.create(123, -21)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(1.22, 36.5, Vec.create(123, -21)) },

            // Right bottom right
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(1.93, 52, Vec.create(123, 56.2)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(1.22, 52, Vec.create(123, 56.2)) },

            // Bottom bottom right
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(100, 1.93, Vec.create(72.2, 83)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(100, 1.22, Vec.create(72.2, 83)) }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(33.50, 27, Vec.create(-32.75, 22.50))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(176, 123, Vec.create(35, 21.50))
            }
        ],
        obstacles: [
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
                idString: "small_table",
                position: Vec.create(-22, 28),
                rotation: 0,
                variation: 0
            },
            {
                idString: "chair",
                position: Vec.create(-26, 28),
                rotation: 3
            },
            {
                idString: { gun_mount_mcx_spear: 0.95, gun_mount_stoner_63: 0.05 },
                position: Vec.create(-46.8, 28),
                rotation: 1,
                lootSpawnOffset: Vec.create(4, 0)
            },
            {
                idString: "trash_can", position: Vec.create(-44.9, 13.43),
                lootSpawnOffset: Vec.create(1, 0)
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
                rotation: 0,
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec.create(-20.5, 77.5),
                rotation: 0,
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec.create(-21.5, 67),
                rotation: 0,
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec.create(-46.5, 45.5),
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec.create(-36, 48),
                outdoors: true
            },
            // Bottom right
            {
                idString: "large_refinery_barrel",
                position: Vec.create(45.5, 59.1),
                outdoors: true
                //           ^^^^ One large refinery barrel is a mode variant and the other is a reskin. This ensures they will never use the same texture.
            },
            {
                idString: "large_refinery_barrel",
                position: Vec.create(97, 59.2)
            },
            {
                idString: "regular_crate",
                position: Vec.create(69, 62),
                outdoors: true
            },
            {
                idString: "aegis_crate",
                position: Vec.create(64, 75),
                outdoors: true
            },
            {
                idString: "aegis_crate",
                position: Vec.create(77, 73),
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec.create(117.5, 77.5),
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec.create(117, 40),
                outdoors: true
            },
            {
                idString: "super_barrel",
                position: Vec.create(27.5, 39),
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec.create(-10, 0),
                outdoors: true
            },
            // Top right
            {
                idString: "oil_tank",
                position: Vec.create(113, -25),
                rotation: 1,
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec.create(117.5, -7),
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec.create(95, -33),
                outdoors: true
            },
            {
                idString: "aegis_crate",
                position: Vec.create(76.25, -33.5),
                outdoors: true
            },
            {
                idString: "super_barrel",
                position: Vec.create(85.25, -33.5),
                outdoors: true
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: Vec.create(83, -25),
                outdoors: true
            },
            {
                idString: "super_barrel",
                position: Vec.create(75, -23),
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec.create(76.25, -12),
                outdoors: true
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
            { idString: "inner_concrete_wall_1", position: Vec.create(-15, 65.95), rotation: 1 }
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
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 9, Vec.create(30.8, -26)),
            RectangleHitbox.fromRect(2, 22, Vec.create(30.8, -0.2)),
            RectangleHitbox.fromRect(2, 9.8, Vec.create(30.8, 25)),
            RectangleHitbox.fromRect(19.8, 2, Vec.create(-22, -29.5)),
            RectangleHitbox.fromRect(8.2, 2, Vec.create(26, -29.5)),
            RectangleHitbox.fromRect(14, 2, Vec.create(4.6, -29.5)),
            RectangleHitbox.fromRect(2, 32, Vec.create(-30.9, -13.5)),
            RectangleHitbox.fromRect(2, 16, Vec.create(-30.9, 20.5)),
            RectangleHitbox.fromRect(12.3, 2, Vec.create(-25.8, 28.9)),
            RectangleHitbox.fromRect(39.4, 2, Vec.create(10.45, 28.9)),
            RectangleHitbox.fromRect(3, 3, Vec.create(8.75, -6.12))
        ),
        spawnHitbox: RectangleHitbox.fromRect(80, 80),
        ceilingHitbox: RectangleHitbox.fromRect(60, 56),
        floorImages: [
            {
                key: "red_house_floor_1",
                position: Vec.create(0, -17.23)
            },
            {
                key: "red_house_floor_2",
                position: Vec.create(0, 17.23)
            }
        ],
        ceilingImages: [{
            key: "red_house_ceiling",
            position: Vec.create(0, -0.25),
            scale: Vec.create(2, 2)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(62, 58.50, Vec.create(0, -0.25))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(-10.10, 4.70, Vec.create(16.55, -31.75))

            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.10, -4.70, Vec.create(-14.45, 31.75))
            }
        ],
        obstacles: [

            // -----------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // -----------------------------------------------------------------------
            // { idString: "cobweb", position: Vec.create(25.64, -24.17), rotation: 3 },
            // { idString: "jack_o_lantern", position: Vec.create(6.2, -36.5), rotation: 3 },
            // { idString: "jack_o_lantern", position: Vec.create(27.2, -36.5), rotation: 3 },
            // -----------------------------------------------------------------------

            { idString: "house_wall_4", position: Vec.create(8.6, -18), rotation: 1 },
            { idString: "house_wall_1", position: Vec.create(2.6, -6.07), rotation: 0 },
            { idString: "house_wall_9", position: Vec.create(-20.98, -6.07), rotation: 0 },
            { idString: "door", position: Vec.create(-7.45, -6.06), rotation: 2 },
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
                position: Vec.create(3.6, 23),
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
                idString: randomStove,
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
                idString: "small_table",
                position: Vec.create(25, 0),
                rotation: 2,
                variation: 0
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
            }
        ],
        lootSpawners: [
            { table: "ground_loot", position: Vec.create(16.44, -15.64) },
            { table: "ground_loot", position: Vec.create(-15.42, 17.44) }
        ]
    },
    {
        idString: "red_house_v2",
        name: "Red House Variation 2",
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.8, 60.1, Vec.create(-31.25, -0.3)),
            RectangleHitbox.fromRect(1.8, 40.5, Vec.create(30.1, -9)),
            RectangleHitbox.fromRect(1.8, 6.5, Vec.create(30.1, 25.1)),

            // Top walls
            RectangleHitbox.fromRect(18.6, 1.8, Vec.create(21.6, -29.5)),
            RectangleHitbox.fromRect(12, 1.8, Vec.create(-4.1, -29.5)),
            RectangleHitbox.fromRect(10.5, 1.8, Vec.create(-26, -29.5)),

            // Bottom Walls
            RectangleHitbox.fromRect(18.6, 1.8, Vec.create(21.6, 28.7)),
            RectangleHitbox.fromRect(12, 1.8, Vec.create(-4.1, 28.7)),
            RectangleHitbox.fromRect(10.5, 1.8, Vec.create(-26, 28.7)),

            RectangleHitbox.fromRect(3, 3, Vec.create(16.15, -5.6)),
            RectangleHitbox.fromRect(3, 3, Vec.create(0.8, 10.35))
        ),
        spawnHitbox: RectangleHitbox.fromRect(80, 80),
        ceilingHitbox: RectangleHitbox.fromRect(60, 56),
        floorImages: [
            {
                key: "red_house_v2_floor_1",
                position: Vec.create(-16.22, 0)
            },
            {
                key: "red_house_v2_floor_2",
                position: Vec.create(16.28, 0)
            }
        ],
        ceilingImages: [{
            key: "red_house_ceiling",
            position: Vec.create(-0.6, -0.25),
            scale: Vec.create(2, 2)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(62, 59, Vec.create(0, -0.25))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(-10.10, 4.70, Vec.create(7.15, -31.75))

            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.10, -4.70, Vec.create(7.15, 31.75))
            }
        ],
        obstacles: [

            // -----------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // -----------------------------------------------------------------------
            // { idString: "cobweb", position: Vec.create(-26.19, 23.5), rotation: 1 },
            // { idString: "jack_o_lantern", position: Vec.create(-3.3, -36.8), rotation: 3 },
            // { idString: "jack_o_lantern", position: Vec.create(17.7, -36.8), rotation: 3 },
            // -----------------------------------------------------------------------

            { idString: "door", position: Vec.create(7.6, -29.6), rotation: 0 },
            { idString: "door", position: Vec.create(6.7, 28.8), rotation: 2 },

            // top left corner room (with the bed)
            { idString: "house_wall_1", position: Vec.create(-4.5, -9), rotation: 0 },
            { idString: "house_wall_3", position: Vec.create(-24.85, -9), rotation: 0 },
            { idString: "door", position: Vec.create(-14.55, -9), rotation: 2 },
            { idString: "house_wall_10", position: Vec.create(1, -18.3), rotation: 1 },
            { idString: "small_bed", position: Vec.create(-4, -19.4), rotation: 0 },
            { idString: "large_drawer", position: Vec.create(-26.7, -19.4), lootSpawnOffset: Vec.create(2, 0), rotation: 1 },
            { idString: "tv", position: Vec.create(-29.8, -19.4), rotation: 2 },

            // under bathroom (right)
            { idString: "small_table", position: Vec.create(24.85, 2), rotation: 0, variation: 0 },
            { idString: "chair", position: Vec.create(24.85, 7.5), rotation: 0 },
            { idString: "chair", position: Vec.create(21, 0), rotation: 3 },
            { idString: "bookshelf", position: Vec.create(22.5, 25.5), rotation: 0 },

            // bottom left
            { idString: "house_wall_1", position: Vec.create(-5, 10.25), rotation: 0 },
            { idString: "house_wall_1", position: Vec.create(-26.05, 10.25), rotation: 0 },
            { idString: "house_wall_12", position: Vec.create(1, 19.85), rotation: 1 },
            { idString: "potted_plant", position: Vec.create(-26, 5.55) },
            { idString: "red_small_couch", position: Vec.create(-26.6, -3), rotation: 1 },
            { idString: randomSmallStove, position: Vec.create(-26.6, 14.9), rotation: 1 },
            { idString: "fridge", position: Vec.create(-26.77, 23.1), rotation: 1 },
            { idString: "sink", position: Vec.create(-4.5, 16.4), rotation: 3 },
            { idString: "small_drawer", position: Vec.create(-4.3, 24.5), rotation: 3 },

            // bathroom (top right)
            { idString: "door", position: Vec.create(16.1, -12.5), rotation: 1 },
            { idString: "house_wall_11", position: Vec.create(16.1, -22.9), rotation: 1 },
            { idString: randomToilet, position: Vec.create(23, -24), rotation: 0 },
            { idString: "house_wall_11", position: Vec.create(23.4, -5.5), rotation: 0 },

            // windows (y += 0.2, (x, y + 0.2))
            { idString: "window", position: Vec.create(30.2, 16.7), rotation: 0 },
            { idString: "window", position: Vec.create(-15.2, 28.9), rotation: 1 },
            { idString: "window", position: Vec.create(-15.6, -29.7), rotation: 1 }
        ],
        lootSpawners: [
            { table: "ground_loot", position: Vec.create(0, 0) }
        ]
    },
    {
        idString: "green_house",
        name: "Green House",
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(21.8, 1.88, Vec.create(-39.9, -30.2)),
            RectangleHitbox.fromRect(51.88, 1.88, Vec.create(8, -30.2)),
            RectangleHitbox.fromRect(1.88, 9.3, Vec.create(33, -2.55)),
            RectangleHitbox.fromRect(10.78, 1.87, Vec.create(28.55, 27.46)),
            RectangleHitbox.fromRect(1.88, 58, Vec.create(-49.86, -1)),
            RectangleHitbox.fromRect(42.74, 1.87, Vec.create(-9.3, 27.46)),
            RectangleHitbox.fromRect(10.02, 1.87, Vec.create(-45.79, 27.46)),
            RectangleHitbox.fromRect(1.88, 15.98, Vec.create(33, 20.22)),
            RectangleHitbox.fromRect(1.88, 11.08, Vec.create(33, -23.88)),
            RectangleHitbox.fromRect(3.5, 3.5, Vec.create(42.75, -0.67)),
            RectangleHitbox.fromRect(3.5, 3.5, Vec.create(42.75, 14.8)),
            RectangleHitbox.fromRect(3, 3, Vec.create(-7.33, 9.98)),
            RectangleHitbox.fromRect(3, 3, Vec.create(11.76, -6.26)),
            RectangleHitbox.fromRect(3, 3, Vec.create(-7.27, -6.32))
        ),
        spawnHitbox: RectangleHitbox.fromRect(110, 70),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(83, 58, Vec.create(-8.5, -1.5)),
            RectangleHitbox.fromRect(14, 19.4, Vec.create(38, 7.1))
        ),
        floorImages: [
            {
                key: "green_house_floor_1",
                position: Vec.create(-26.66, 0)
            },
            {
                key: "green_house_floor_2",
                position: Vec.create(21.5, 0)
            }
        ],
        ceilingImages: [
            {
                key: "green_house_ceiling_1",
                position: Vec.create(22, -1.1),
                scale: Vec.create(2, 2)
            },
            {
                key: "green_house_ceiling_2",
                position: Vec.create(-27, -1.1),
                scale: Vec.create(2, 2)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(83, 58, Vec.create(-8.5, -1.5)),
                    RectangleHitbox.fromRect(14, 19.4, Vec.create(38, 7.1)),
                    RectangleHitbox.fromRect(6, 13.5, Vec.create(47.7, 7.1))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.3, 5, Vec.create(-35.7, 30.2))
            }
        ],
        obstacles: [

            // -----------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // -----------------------------------------------------------------------
            // { idString: "cobweb", position: Vec.create(27.74, -24.95), rotation: 3 },
            // { idString: "cobweb", position: Vec.create(-44.48, -25.06), rotation: 0 },
            // { idString: "jack_o_lantern", position: Vec.create(-46.48, 35.06), rotation: -0.1 }, // cursed
            // { idString: "jack_o_lantern", position: Vec.create(40.24, 24), rotation: -1 },
            // -----------------------------------------------------------------------

            { idString: "window", position: Vec.create(32.99, -12.81), rotation: 0 },
            { idString: "window", position: Vec.create(17.59, 27.52), rotation: 1 },
            { idString: "window", position: Vec.create(-23.44, -30.22), rotation: 1 },
            { idString: "door", position: Vec.create(33.03, 6.74), rotation: 1 },
            { idString: "door", position: Vec.create(11.94, -13.22), rotation: 1 },
            { idString: "door", position: Vec.create(-36.15, 27.47), rotation: 2 },
            { idString: "door", position: Vec.create(-22.56, -6.26), rotation: 0 },
            { idString: "house_wall_1", position: Vec.create(-13.3, -6.24), rotation: 0 },
            { idString: "house_wall_3", position: Vec.create(11.94, -23.55), rotation: 1 },
            { idString: "house_wall_4", position: Vec.create(-7.26, -18.54), rotation: 1 },
            { idString: "house_wall_5", position: Vec.create(2.24, -6.35), rotation: 0 },
            { idString: "house_wall_6", position: Vec.create(-7.33, 18.92), rotation: 1 },
            { idString: "house_wall_7", position: Vec.create(-38.53, -6.29), rotation: 0 },

            { idString: randomToilet, position: Vec.create(-2.75, -24.92), rotation: 0 },
            { idString: "trash_can", position: Vec.create(-3, -10.5) },
            { idString: "sink", position: Vec.create(5.91, -25.15), rotation: 0 },
            { idString: "bed", position: Vec.create(-43.06, -20.98), rotation: 0 },
            { idString: "small_drawer", position: Vec.create(-33.63, -25.48), rotation: 0 },
            { idString: "potted_plant", position: Vec.create(17.46, -25.03) },
            { idString: "potted_plant", position: Vec.create(-12.73, -12.13) },
            { idString: "washing_machine", position: Vec.create(27.07, -25.54), rotation: 0 },
            { idString: "tv", position: Vec.create(2.43, -4.51), rotation: 1 },
            { idString: "large_drawer", position: Vec.create(28.24, 20), rotation: 3 },
            { idString: "couch", position: Vec.create(2.36, 22.18), rotation: 1 },
            { idString: "small_table", position: Vec.create(2.02, 11.51), rotation: 1, variation: 1 },
            { idString: "large_table", position: Vec.create(-15.91, 16.87), rotation: 0, variation: 1 },
            { idString: "chair", position: Vec.create(-21.87, 20.61), rotation: 3 },
            { idString: "chair", position: Vec.create(-21.87, 13.45), rotation: 3 },
            { idString: "chair", position: Vec.create(-16.02, 8.25), rotation: 2 },
            { idString: "fridge", position: Vec.create(-45.15, 21.66), rotation: 1 },
            { idString: randomStove, position: Vec.create(-45.15, 12.3), rotation: 1 },
            { idString: "large_drawer", position: Vec.create(-45.12, 1.28), rotation: 1 },
            { idString: "bookshelf", position: Vec.create(-10.88, -22.62), rotation: 1 },
            {
                idString: {
                    gun_mount_hp18: 1,
                    gun_mount_model_37: 0.5,
                    gun_mount_sks: 0.5
                    // gun_mount_crowbar_aged: 1
                },
                position: Vec.create(30.33, -2.98),
                rotation: 3,
                lootSpawnOffset: Vec.create(-4, 0)
            }
        ],
        lootSpawners: [
            { table: "ground_loot", position: Vec.create(18.48, 6.37) },
            { table: "ground_loot", position: Vec.create(-23.91, -18.07) }
        ]
    },

    // -------------------------------------------------------------------------
    // Vault layout variations for blue house.
    // -------------------------------------------------------------------------
    blueHouseVaultLayout(1, [
        { idString: "box", position: Vec.create(12.5, 10.5) },
        { idString: "box", position: Vec.create(14, 15.5) }
    ]),

    blueHouseVaultLayout(2,
        [
            { idString: "blue_house_stair", position: Vec.create(17, 14.5), layer: -1, rotation: 0 },
            { idString: "blue_house_stair_walls", position: Vec.create(15, 7), rotation: 0 }
        ],
        [
            { idString: "blue_house_basement", position: Vec.create(1.5, 4.25), layer: -2 }
        ]
    ),

    blueHouseVaultLayout(3, [
        { idString: "box", position: Vec.create(12.5, 10.5) },
        { idString: "box", position: Vec.create(12.5, 15.5) },
        { idString: "box", position: Vec.create(17.5, 15.5) }
    ]),

    blueHouseVaultLayout(4, [
        { idString: "gun_case", position: Vec.create(12.5, 13), rotation: 1 },
        { idString: "box", position: Vec.create(18.1, 10.5) }
    ]),

    blueHouseVaultLayout(5, [
        { idString: "box", position: Vec.create(11.97, 9.53) },
        { idString: "trash_bag", position: Vec.create(18.5, 9.9) },
        { idString: "bookshelf", position: Vec.create(15.85, 17.01), rotation: 0 }
    ]),

    blueHouseVaultLayout(6, [
        { idString: "grenade_crate", position: Vec.create(13.4, 10.5) },
        { idString: "box", position: Vec.create(19.25, 9.3) },
        { idString: "box", position: Vec.create(12.71, 16.6) }
    ]),

    blueHouseVaultLayout(7, [
        { idString: "melee_crate", position: Vec.create(13.4, 10.5) },
        { idString: "box", position: Vec.create(19.25, 9.3) },
        { idString: "box", position: Vec.create(12.71, 16.6) }
    ]),
    // -------------------------------------------------------------------------

    blueHouse("blue_house"),
    blueHouse("blue_house_special", [
        { idString: "blue_house_vault", position: Vec.create(-14.1, 20.5), orientation: 1 },
        { idString: "blue_house_vault_layout_2", position: Vec.create(0, 0) }
    ]),
    {
        idString: "blue_house_vault",
        name: "Blue House Vault",
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14.8, 2, Vec.create(0.1, -12.1)),
            RectangleHitbox.fromRect(15.5, 2, Vec.create(2.1, 11.9)),
            RectangleHitbox.fromRect(2, 25, Vec.create(-6.3, 0.5)),
            RectangleHitbox.fromRect(2, 14, Vec.create(8.7, -6))
        ),
        spawnHitbox: RectangleHitbox.fromRect(22.73, 28.32),
        ceilingHitbox: RectangleHitbox.fromRect(14, 24),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [{
            key: "blue_house_vault_ceiling",
            position: Vec.create(1, -0.1)
        }]
    },
    {
        idString: "blue_house_basement",
        name: "Blue House Basement",
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(40.5, 58, Vec.create(-11.28, -0.5)),
            RectangleHitbox.fromRect(63.25, 28.5, Vec.create(0, -15.45)),
            RectangleHitbox.fromRect(11, 11, Vec.create(14, 10))
        ),
        hitbox: new GroupHitbox(
            // WALL.
            RectangleHitbox.fromRect(66.5, 1.8, Vec.create(0, -30.35)),
            RectangleHitbox.fromRect(1.8, 61, Vec.create(-32.35, -0.5)),
            RectangleHitbox.fromRect(44, 1.8, Vec.create(-11.25, 29.05)),
            RectangleHitbox.fromRect(1.8, 14.1, Vec.create(9.8, 22.25)),
            RectangleHitbox.fromRect(1.8125, 24.35, Vec.create(9.8, -6.75)),
            RectangleHitbox.fromRect(1.75, 31.25, Vec.create(32.4, -15)),
            RectangleHitbox.fromRect(22.5, 1.8, Vec.create(21, -0.25)),

            // weird ahh rounded columns
            RectangleHitbox.fromRect(3.5, 3.5, Vec.create(-14.23, 7.15)),
            RectangleHitbox.fromRect(3.5, 3.5, Vec.create(-14.23, -7.99)),

            // stair walls
            RectangleHitbox.fromRect(11, 1.8, Vec.create(14.5, 4.6)),
            RectangleHitbox.fromRect(11, 1.8, Vec.create(14.5, 16))
        ),
        spawnHitbox: RectangleHitbox.fromRect(75, 70),
        floors: [{
            type: FloorNames.Wood,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(40.5, 58, Vec.create(-11.28, -0.5)),
                RectangleHitbox.fromRect(63.25, 28.5, Vec.create(0, -15.45))
            )
        },
        {
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(11, 11, Vec.create(14.25, 10)),
            layer: -1
        },
        {
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(11, 11, Vec.create(14, 10))
        }],
        floorImages: [
            {
                key: "blue_house_basement_top",
                position: Vec.create(0, -15.3)
            },
            {
                key: "blue_house_basement_bottom",
                position: Vec.create(-11.28, 15.3)
            },
            {
                key: "blue_house_basement_stairs",
                position: Vec.create(15.25, 10.35)
            }
        ],
        obstacles: [
            { idString: "metal_door", position: Vec.create(9.8, -23.8), rotation: 3 },
            { idString: randomBarrel, position: Vec.create(4.61, 23.69) },
            { idString: "ammo_crate", position: Vec.create(-4.66, 22.71) },
            { idString: "small_table", position: Vec.create(-24.96, 23.6), rotation: 1 },
            { idString: "chair", position: Vec.create(-25.08, 19.79), rotation: 2 },
            { idString: "box", position: Vec.create(-16.32, 25.26) },
            { idString: { box: 1, grenade_box: 0.25 }, position: Vec.create(-12.02, 20.6) },
            { idString: { box: 1, grenade_box: 0.1 }, position: Vec.create(5.83, 3.69) },
            { idString: "box", position: Vec.create(0.95, 2.37) },
            { idString: "bunk_bed", position: Vec.create(3.25, -9.57), rotation: 0 },
            { idString: "door", position: Vec.create(-25.97, -7.85), rotation: 0 },
            { idString: "house_wall_18", position: Vec.create(-18.75, -7.85), rotation: 0 },
            { idString: "house_wall_19", position: Vec.create(-14.23, -19.58), rotation: 1 },
            { idString: randomToilet, position: Vec.create(-27.5, -24.65), rotation: 0 },
            { idString: "small_drawer", position: Vec.create(-19.26, -25.16), rotation: 0 },
            { idString: "trash_can", position: Vec.create(-18.15, -11.85) },
            { idString: "regular_crate", position: Vec.create(15.98, -14.35) },
            { idString: "regular_crate", position: Vec.create(26.33, -6.41) },
            { idString: "barrel", position: Vec.create(26.65, -15.28) },
            { idString: { box: 1, grenade_box: 0.25 }, position: Vec.create(28.49, -26.58) },
            { idString: "potted_plant", position: Vec.create(-8.84, -25.32) },
            {
                // rest in peace, BFR. This was your place.
                idString: {
                    rsh_case_single: 1,
                    rsh_case_dual: 0.1
                },
                position: Vec.create(15.93, -5.14),
                rotation: 2
            }
        ],
        subBuildings: [{ idString: "blue_house_basement_ceiling", position: Vec.create(0, 0) }]
    },
    {
        idString: "blue_house_basement_ceiling",
        name: "blue house basement ceiling",
        spawnHitbox: RectangleHitbox.fromRect(21.5, 28.9, Vec.create(21, -15.3)),
        ceilingHitbox: RectangleHitbox.fromRect(21.5, 28.9, Vec.create(21, -15.3)),
        ceilingImages: [{
            key: "blue_house_vault_ceiling",
            position: Vec.create(21, -15.3),
            scale: Vec.create(1.58, 1.25)
        }]
    },
    {
        idString: "crane",
        name: "Crane",
        reflectBullets: true,
        noCeilingScopeEffect: true,
        material: "metal_heavy",
        particle: "container_particle_yellow",
        hitbox: new GroupHitbox(
            // base ends
            RectangleHitbox.fromRect(4.82, 1.8, Vec.create(32, -6.42)),
            RectangleHitbox.fromRect(4.82, 1.8, Vec.create(-31.5, -6.42)),
            RectangleHitbox.fromRect(4.82, 1.8, Vec.create(32, -135.5)),
            RectangleHitbox.fromRect(4.82, 1.8, Vec.create(-31.5, -135.5)),

            // base parts
            RectangleHitbox.fromRect(5.89, 15, Vec.create(-31.55, -87.3)),
            RectangleHitbox.fromRect(4.99, 25.69, Vec.create(-31.55, -87.3)),
            RectangleHitbox.fromRect(4.29, 31.46, Vec.create(-31.55, -87.3)),

            RectangleHitbox.fromRect(5.89, 15, Vec.create(-31.55, -35.6)),
            RectangleHitbox.fromRect(4.99, 25.69, Vec.create(-31.55, -35.6)),
            RectangleHitbox.fromRect(4.29, 31.46, Vec.create(-31.55, -35.6)),

            RectangleHitbox.fromRect(5.89, 15, Vec.create(32, -87.3)),
            RectangleHitbox.fromRect(4.99, 25.69, Vec.create(32, -87.3)),
            RectangleHitbox.fromRect(4.29, 31.46, Vec.create(32, -87.3)),

            RectangleHitbox.fromRect(5.89, 15, Vec.create(32, -35.6)),
            RectangleHitbox.fromRect(4.99, 25.69, Vec.create(32, -35.6)),
            RectangleHitbox.fromRect(4.29, 31.46, Vec.create(32, -35.6))
        ),
        spawnHitbox: RectangleHitbox.fromRect(210, 140, Vec.create(55, -72)),
        ceilingHitbox: RectangleHitbox.fromRect(210, 100, Vec.create(55, -60)),
        floorImages: [
            { key: "crane_base_part", position: Vec.create(-31.55, -87.3) },
            { key: "crane_base_part", position: Vec.create(-31.55, -35.6) },

            { key: "crane_base_part", position: Vec.create(32, -87.3) },
            { key: "crane_base_part", position: Vec.create(32, -35.6) },

            { key: "crane_base_end", position: Vec.create(32, -6.42) },
            { key: "crane_base_end", position: Vec.create(-31.5, -6.42) },

            { key: "crane_base_end", position: Vec.create(32, -135.5) },
            { key: "crane_base_end", position: Vec.create(-31.5, -135.5) }
        ],
        floorZIndex: ZIndexes.ObstaclesLayer4,
        ceilingImages: [
            { key: "crane_ceiling_1", position: Vec.create(31, -60), scale: Vec.create(2, 2) },
            { key: "crane_ceiling_2", position: Vec.create(77.5, -60), scale: Vec.create(2, 2) },
            { key: "crane_ceiling_3", position: Vec.create(-20, -60), scale: Vec.create(2, 2) },
            { key: "crane_ceiling_4", position: Vec.create(131, -60), scale: Vec.create(2, 2) }
        ],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1 // makes the crane ceiling render above container ceilings
    },
    {
        idString: "shed",
        name: "Shed",
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.75, 29.5, Vec.create(-11.03, -1.7)), // Left wall
            RectangleHitbox.fromRect(1.75, 9.2, Vec.create(9.43, -11.9)), // Right wall above window
            RectangleHitbox.fromRect(1.75, 10.7, Vec.create(9.43, 7.6)), // Right wall below window
            RectangleHitbox.fromRect(20, 1.75, Vec.create(-0.8, -15.56)), // Top wall
            RectangleHitbox.fromRect(9, 1.75, Vec.create(-6.05, 12.19)) // Bottom wall
        ),
        spawnHitbox: RectangleHitbox.fromRect(27, 37, Vec.create(-0.8, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(20, 27.5, Vec.create(-0.8, -1.5)),
        floorImages: [
            {
                key: "shed_floor",
                position: Vec.create(0, 0),
                scale: Vec.create(2, 2)
            }
        ],
        ceilingImages: [
            {
                key: "shed_ceiling",
                position: Vec.create(-0.8, -1.6)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(20.5, 27, Vec.create(-0.5, -2)),
                    RectangleHitbox.fromRect(10, 4.5, Vec.create(3.55, 14))
                )
            }
        ],
        obstacles: [
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
                idString: "small_table",
                position: Vec.create(2.2, -10.35),
                rotation: 1,
                variation: 0
            },
            {
                idString: "chair",
                position: Vec.create(2.2, -5.5),
                rotation: 0
            },
            {
                idString: "trash_can",
                position: Vec.create(-7, -11.5),
                lootSpawnOffset: Vec.create(1, 1)
            }
        ]
    },
    container(1, "white", "closed"),
    container(2, "red", "closed"),
    container(3, "green", "open1"),
    container(4, "green", "open1", true),
    container(5, "blue", "open1"),
    container(6, "blue", "open1", true),
    container(7, "blue", "open2"),
    container(8, "blue", "open2", true),
    container(9, "yellow", "open1"),
    container(10, "yellow", "open2"),
    container(11, "green", "closed"),
    container(12, "yellow", "closed"),

    bigTent(1, "red"),
    bigTent(2, "green"),
    bigTent(3, "blue"),
    bigTent(4, "orange"),
    tent(1, "red"),
    tent(2, "green"),
    tent(3, "blue"),
    tent(4, "orange"),
    tent(5, "purple", true),

    hayShed(1, 2, [
        { idString: "flint_crate", position: Vec.create(-1, -0.25) },
        { idString: "barrel", position: Vec.create(0.27, -9.26) },
        { idString: "super_barrel", position: Vec.create(-1.82, 8.8) },
        { idString: "hay_bale", position: Vec.create(-11.5, 3), rotation: 1 },
        { idString: "hay_bale", position: Vec.create(9.5, -3.29), rotation: 1 }
    ]),

    hayShed(2, (randomBoolean() ? 1 : 2),
        [
            { idString: "regular_crate", position: Vec.create(10.22, 4.45) },
            { idString: "barrel", position: Vec.create(11.56, -6.05) },
            { idString: "hay_bale", position: Vec.create(-11.89, 2.82), rotation: 1 },
            { idString: "box", position: Vec.create(-11.4, -7.28) }
        ],
        [{
            table: "ground_loot",
            position: Vec.create(-0.99, -1.75)
        }]
    ),

    hayShed(3, 1, [
        { idString: "super_barrel", position: Vec.create(-11.56, -6.05) },
        { idString: "hay_bale", position: Vec.create(9.5, 2.82), rotation: 1 },
        { idString: "box", position: Vec.create(-13.03, 7.34) },
        { idString: "box", position: Vec.create(-8.27, 2.09) },
        { idString: "grenade_crate", position: Vec.create(8.85, -8.02) },
        { idString: "box", position: Vec.create(-6.71, 8.27) }
    ]),

    hayShed(4, 1, [
        { idString: "hay_bale", position: Vec.create(9.68, 3.88), rotation: 0 },
        { idString: "super_barrel", position: Vec.create(7.71, -6.26) }
    ]),

    {
        idString: "cargo_ship_center_roof",
        name: "Cargo Ship Center Roof",
        spawnHitbox: RectangleHitbox.fromRect(40, 95, Vec.create(0, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(25, 90, Vec.create(0.5, 0)), // why doesn't this work well? (you have to go in full center?)
        ceilingImages: [
            {
                key: "cargo_ship_center_ceiling",
                position: Vec.create(1.25, 0),
                scale: Vec.create(2.15, 2.15)
            }
        ]
    },
    {
        idString: "cargo_ship",
        name: "Cargo Ship",
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(

            // outer walls
            RectangleHitbox.fromRect(237, 3, Vec.create(-18.5, -45.5)),
            RectangleHitbox.fromRect(3, 92, Vec.create(-135.5, 0)),
            RectangleHitbox.fromRect(78.7, 3, Vec.create(-52.25, 45.5)),
            RectangleHitbox.fromRect(35.5, 3, Vec.create(-119.5, 45.5)),
            RectangleHitbox.fromRect(105.5, 3, Vec.create(50, 45.5)),

            // inner walls

            // cargo ship front
            RectangleHitbox.fromRect(3.8, 17, Vec.create(99, -36.1)),
            RectangleHitbox.fromRect(3.8, 17, Vec.create(99, 36.1)),

            // vault
            RectangleHitbox.fromRect(1.8, 19.5, Vec.create(98, 16.5)),
            RectangleHitbox.fromRect(1.8, 19.5, Vec.create(98, -16.8)),
            RectangleHitbox.fromRect(34, 1.7, Vec.create(114, -26.5)),
            RectangleHitbox.fromRect(34, 1.7, Vec.create(114, 26.5)),
            RectangleHitbox.fromRect(1.7, 53, Vec.create(130.65, 0)),

            // gas can/control room?
            RectangleHitbox.fromRect(10.5, 1.6, Vec.create(-21.5, 31.1)),
            RectangleHitbox.fromRect(10.5, 1.6, Vec.create(-42.1, 31.1)),
            RectangleHitbox.fromRect(10.5, 1.6, Vec.create(-21.5, -31.1)),
            RectangleHitbox.fromRect(10.5, 1.6, Vec.create(-42.1, -31.1)),

            // RectangleHitbox.fromRect(1.5, 61, Vec.create(-17, 0)),
            RectangleHitbox.fromRect(1.5, 61, Vec.create(-46.5, 0)),

            RectangleHitbox.fromRect(12.8, 0.9, Vec.create(-39, 42.35)),
            RectangleHitbox.fromRect(13.15, 0.9, Vec.create(-24.7, 42.35)),
            RectangleHitbox.fromRect(1.5, 2, Vec.create(-32, 42.35)),
            RectangleHitbox.fromRect(1.5, 2, Vec.create(-17.3, 42.35)),
            RectangleHitbox.fromRect(1.5, 2, Vec.create(-46.1, 42.35)),

            RectangleHitbox.fromRect(12.8, 0.9, Vec.create(-39, -42.35)),
            RectangleHitbox.fromRect(13.15, 0.9, Vec.create(-24.7, -42.35)),
            RectangleHitbox.fromRect(1.5, 2, Vec.create(-32, -42.35)),
            RectangleHitbox.fromRect(1.5, 2, Vec.create(-17.3, -42.35)),
            RectangleHitbox.fromRect(1.5, 2, Vec.create(-46.1, -42.35)),

            new CircleHitbox(11.1, Vec.create(143.8, -0.5)),
            new CircleHitbox(4, Vec.create(103, -43.3)),
            new CircleHitbox(4, Vec.create(150.5, -7.5)),
            new CircleHitbox(4, Vec.create(150.5, 7.5)),
            new CircleHitbox(6, Vec.create(149, -2.5)),
            new CircleHitbox(6, Vec.create(149, 2.5)),
            new CircleHitbox(4, Vec.create(149, -12.5)),
            new CircleHitbox(4, Vec.create(146.5, -16.5)),
            new CircleHitbox(4, Vec.create(145.5, -18.5)),
            new CircleHitbox(4, Vec.create(144, -20.5)),
            new CircleHitbox(4, Vec.create(143, -22.5)),
            new CircleHitbox(4, Vec.create(141.5, -24.5)),
            new CircleHitbox(4, Vec.create(139.5, -26.5)),
            new CircleHitbox(4, Vec.create(137.5, -28.5)),
            new CircleHitbox(4, Vec.create(136, -30.5)),
            new CircleHitbox(4, Vec.create(133.5, -32.5)),
            new CircleHitbox(4, Vec.create(131, -34.5)),
            new CircleHitbox(4, Vec.create(127, -36.5)),
            new CircleHitbox(4, Vec.create(122.5, -38.5)),
            new CircleHitbox(4, Vec.create(118, -39.5)),
            new CircleHitbox(4, Vec.create(114, -40.5)),
            new CircleHitbox(4, Vec.create(111, -41.5)),
            new CircleHitbox(4, Vec.create(106, -42.5)),
            new CircleHitbox(4, Vec.create(149, 12.5)),
            new CircleHitbox(4, Vec.create(146.5, 16.5)),
            new CircleHitbox(4, Vec.create(145.5, 18.5)),
            new CircleHitbox(4, Vec.create(144, 20.5)),
            new CircleHitbox(4, Vec.create(143, 22.5)),
            new CircleHitbox(4, Vec.create(141.5, 24.5)),
            new CircleHitbox(4, Vec.create(139.5, 26.5)),
            new CircleHitbox(4, Vec.create(137.5, 28.5)),
            new CircleHitbox(4, Vec.create(136, 30.5)),
            new CircleHitbox(4, Vec.create(133.5, 32.5)),
            new CircleHitbox(4, Vec.create(131, 34.5)),
            new CircleHitbox(4, Vec.create(127, 36.5)),
            new CircleHitbox(4, Vec.create(122.5, 38.5)),
            new CircleHitbox(4, Vec.create(118, 39.5)),
            new CircleHitbox(4, Vec.create(114, 40.5)),
            new CircleHitbox(4, Vec.create(111, 41.5)),
            new CircleHitbox(4, Vec.create(106, 42.5))
        ),
        spawnHitbox: RectangleHitbox.fromRect(320, 130, Vec.create(5, 5)),
        ceilingHitbox: RectangleHitbox.fromRect(34, 51, Vec.create(115, 0)),
        puzzle: {
            triggerOnSolve: "vault_door",
            delay: 2000
        },
        sounds: {
            solved: "generator_running",
            position: Vec.create(91, -18.5),
            maxRange: 416,
            falloff: 2
        },
        ceilingImages: [
            {
                key: "cargo_ship_front_ceiling",
                position: Vec.create(126.5, 0.1),
                scale: Vec.create(2.14, 2.14)
            }
        ],
        floorImages: [
            {
                key: "cargo_ship_floor_3_1",
                position: Vec.create(126.5, -23.75),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "cargo_ship_floor_3_2",
                position: Vec.create(126.5, 23.8),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "cargo_ship_floor_2",
                position: Vec.create(41.5, 0.05),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "cargo_ship_floor_1",
                position: Vec.create(-70, 0),
                scale: Vec.create(2.139, 2.139)
            },
            {
                key: "ship_stair",
                position: Vec.create(-8, 54.25)
            },
            {
                key: "ship_stair",
                position: Vec.create(-97, 54.25)
            }
        ],

        floors: [
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10, 20.25, Vec.create(-8, 54.25)), // stair right
                    RectangleHitbox.fromRect(10, 20.25, Vec.create(-97, 54.25)), // stair left
                    RectangleHitbox.fromRect(232, 88.5, Vec.create(-18.5, 0.05)) // main floor
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(33, 52, Vec.create(114, 0.05)) // vault
            }
        ],

        obstacles: [
            // vault/tango room
            { idString: "tango_crate", position: Vec.create(126.25, 0), rotation: 3 },
            { idString: "regular_crate", position: Vec.create(105.5, -20) },
            { idString: "barrel", position: Vec.create(118, -20) },
            { idString: "barrel", position: Vec.create(125, -14) },
            { idString: "box", position: Vec.create(126.5, 22) },
            { idString: "box", position: Vec.create(120.5, 21.5) },
            { idString: "box", position: Vec.create(126.8, 16) },
            { idString: "grenade_crate", position: Vec.create(104, 21) },

            // front
            { idString: "vault_door", position: Vec.create(98.25, 1), rotation: 1 },
            { idString: "aegis_crate", position: Vec.create(91, -29), outdoors: true },
            { idString: "barrel", position: Vec.create(85, -39), outdoors: true },
            { idString: "generator", position: Vec.create(91, -18.5), rotation: 0, puzzlePiece: true, outdoors: true },

            { idString: "regular_crate", position: Vec.create(35, -37), outdoors: true },

            { idString: "regular_crate", position: Vec.create(91, 38.5), outdoors: true },
            { idString: "regular_crate", position: Vec.create(80, 36.5), outdoors: true },
            { idString: "sandbags", position: Vec.create(79.5, 21), rotation: 0, outdoors: true },

            { idString: "sandbags", position: Vec.create(61, -5.25), rotation: 1, outdoors: true },
            { idString: "gun_case", position: Vec.create(53.5, -7), rotation: 3, outdoors: true },
            { idString: "regular_crate", position: Vec.create(66, 7.1), outdoors: true },
            { idString: "regular_crate", position: Vec.create(55.5, 7.1), outdoors: true },
            { idString: "ship_oil_tank", position: Vec.create(58, 20), rotation: 0 },

            { idString: "sandbags", position: Vec.create(22, 22), rotation: 1, outdoors: true },
            { idString: "regular_crate", position: Vec.create(12.5, 23), outdoors: true },
            { idString: "sandbags", position: Vec.create(18, -5.5), rotation: 1, outdoors: true },
            { idString: "grenade_crate", position: Vec.create(10, -7.8), outdoors: true },
            { idString: "barrel", position: Vec.create(28, -7.8), outdoors: true },

            // middle (gas can room)
            { idString: "tear_gas_crate", position: Vec.create(-11.5, -3.8), rotation: 3, outdoors: true },
            { idString: "bookshelf", position: Vec.create(-43.25, -23.5), rotation: 1 },
            { idString: "barrel", position: Vec.create(-22.5, -26) },
            { idString: "tugboat_control_panel", position: Vec.create(-23, -5.5), rotation: 1 },
            { idString: "large_drawer", position: Vec.create(-22, 14.5), rotation: 3 },
            { idString: "control_panel_small", position: Vec.create(-22.5, 26), rotation: 1 },
            { idString: "life_preserver", position: Vec.create(-44, 25), rotation: 2 },
            { idString: "life_preserver", position: Vec.create(-44, 15), rotation: 2 },
            { idString: "window2", position: Vec.create(-16, -25), rotation: 0 },
            { idString: "window2", position: Vec.create(-16, -15), rotation: 0 },
            { idString: "window2", position: Vec.create(-16, -5), rotation: 0 },
            { idString: "window2", position: Vec.create(-16, 5), rotation: 0 },
            { idString: "window2", position: Vec.create(-16, 15), rotation: 0 },
            { idString: "window2", position: Vec.create(-16, 25), rotation: 0 },

            // back

            { idString: "sandbags", position: Vec.create(-66.25, 5.5), rotation: 1, outdoors: true },
            { idString: "tear_gas_crate", position: Vec.create(-76, 8), rotation: 0, outdoors: true },

            // top left corner
            { idString: "aegis_crate", position: Vec.create(-126.5, -35), outdoors: true },
            { idString: "barrel", position: Vec.create(-115, -38), outdoors: true },
            { idString: "ship_oil_tank", position: Vec.create(-119.5, -20), rotation: 0 },

            { idString: "aegis_crate", position: Vec.create(-69.5, -19.5), outdoors: true },
            { idString: "regular_crate", position: Vec.create(-82.5, -22), outdoors: true },
            { idString: "super_barrel", position: Vec.create(-80, -12.5), outdoors: true },

            // bottom left
            { idString: "regular_crate", position: Vec.create(-129, 7), outdoors: true },
            { idString: "sandbags", position: Vec.create(-114, -5.5), rotation: 1, outdoors: true },
            { idString: "gun_case", position: Vec.create(-124, -8.5), rotation: 0, outdoors: true }
        ],

        subBuildings: [
            {
                idString: "cargo_ship_center_roof",
                position: Vec.create(-32, 0)
            },
            {
                idString: randomContainer1,
                position: Vec.create(-36.25, 58), // reversed coordinates moment
                orientation: 1
            },
            {
                idString: randomContainer1,
                position: Vec.create(36.25, 58),
                orientation: 1
            },
            {
                idString: randomContainer1,
                position: Vec.create(36.25, -74.9),
                orientation: 1
            },
            {
                idString: "container_2",
                position: Vec.create(19.9, 58),
                orientation: 1
            },
            {
                idString: "container_11",
                position: Vec.create(-36.2, -15.5),
                orientation: 3
            },
            {
                idString: randomContainer1,
                position: Vec.create(-19.9, -15.5),
                orientation: 3
            },
            {
                idString: randomContainer1,
                position: Vec.create(36.25, -15.5),
                orientation: 3
            },
            {
                idString: "container_12",
                position: Vec.create(-19.9, -74.9),
                orientation: 1
            },
            {
                idString: randomContainer1,
                position: Vec.create(-36.25, -74.9),
                orientation: 1
            },
            {
                idString: "container_2",
                position: Vec.create(-36.25, -119.6),
                orientation: 1
            },
            {
                idString: randomContainer1,
                position: Vec.create(-19.9, -119.6),
                orientation: 1
            }
        ] as SubBuilding[],
        lootSpawners: [{
            position: Vec.create(-35, 0),
            table: "gas_can"
        }]
    },
    {
        idString: "oil_tanker_ship",
        name: "Oil Tanker",
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            // outer walls
            RectangleHitbox.fromRect(250, 4.5, Vec.create(14, -42.6)),
            RectangleHitbox.fromRect(98.25, 4.5, Vec.create(20.5, 42.6)),
            RectangleHitbox.fromRect(71.5, 4.5, Vec.create(-74.5, 42.6)),
            RectangleHitbox.fromRect(3.8, 6.2, Vec.create(-111.6, 42.6)),
            RectangleHitbox.fromRect(3.8, 6.2, Vec.create(-111.6, -42.6)),
            RectangleHitbox.fromRect(60, 4.5, Vec.create(110, 42.6)),
            RectangleHitbox.fromRect(4.5, 80.5, Vec.create(137.5, 0)),

            // oil barrels (small)
            new CircleHitbox(4.8, Vec.create(7, 39.8)),
            new CircleHitbox(4.8, Vec.create(7, -39.8)),
            new CircleHitbox(4.8, Vec.create(-67.8, 39.8)),
            new CircleHitbox(4.8, Vec.create(-67.8, -39.8)),
            new CircleHitbox(4.8, Vec.create(94.25, 39.8)),
            new CircleHitbox(4.8, Vec.create(94.25, -39.8)),

            // vault
            RectangleHitbox.fromRect(2, 80, Vec.create(-112.9, 0)),
            RectangleHitbox.fromRect(18.7, 2, Vec.create(-83.7, -27.25)),
            RectangleHitbox.fromRect(23, 2, Vec.create(-86.2, 17)),
            RectangleHitbox.fromRect(1.9, 21.25, Vec.create(-75.5, 28)),
            RectangleHitbox.fromRect(1.9, 2.7, Vec.create(-75, -4.9)),
            RectangleHitbox.fromRect(38, 2, Vec.create(-93, -38.8)),
            RectangleHitbox.fromRect(38, 2, Vec.create(-93, 38.8)),

            // back
            RectangleHitbox.fromRect(10, 25, Vec.create(-120, 0)),
            RectangleHitbox.fromRect(3, 45, Vec.create(-115.5, 0)),
            RectangleHitbox.fromRect(3, 35.5, Vec.create(-120.5, 0)),
            RectangleHitbox.fromRect(3, 25, Vec.create(-125.5, 0.5)),
            RectangleHitbox.fromRect(3, 38, Vec.create(-118.5, 0)),

            // front
            new CircleHitbox(13.25, Vec.create(178.5, 1)),
            new CircleHitbox(3, Vec.create(140, -41.8)),
            new CircleHitbox(3, Vec.create(187.5, -6)),
            new CircleHitbox(3, Vec.create(187.5, 9)),
            new CircleHitbox(3, Vec.create(186, -11)),
            new CircleHitbox(3, Vec.create(183.5, -15)),
            new CircleHitbox(3, Vec.create(182.5, -17)),
            new CircleHitbox(3, Vec.create(181, -19)),
            new CircleHitbox(3, Vec.create(180, -21)),
            new CircleHitbox(3, Vec.create(178.5, -23)),
            new CircleHitbox(3, Vec.create(176.5, -25)),
            new CircleHitbox(3, Vec.create(174.5, -27)),
            new CircleHitbox(3, Vec.create(173, -29)),
            new CircleHitbox(3, Vec.create(170.5, -31)),
            new CircleHitbox(3, Vec.create(168, -33)),
            new CircleHitbox(3, Vec.create(164, -35)),
            new CircleHitbox(3, Vec.create(159.5, -37)),
            new CircleHitbox(3, Vec.create(155, -38)),
            new CircleHitbox(3, Vec.create(151, -39)),
            new CircleHitbox(3, Vec.create(148, -40)),
            new CircleHitbox(3, Vec.create(143, -41)),
            new CircleHitbox(3, Vec.create(186, 12)),
            new CircleHitbox(3, Vec.create(183.5, 16)),
            new CircleHitbox(3, Vec.create(182.5, 18)),
            new CircleHitbox(3, Vec.create(181, 20)),
            new CircleHitbox(3, Vec.create(180, 22)),
            new CircleHitbox(3, Vec.create(178.5, 24)),
            new CircleHitbox(3, Vec.create(176.5, 26)),
            new CircleHitbox(3, Vec.create(174.5, 28)),
            new CircleHitbox(3, Vec.create(173, 30)),
            new CircleHitbox(3, Vec.create(170.5, 32)),
            new CircleHitbox(3, Vec.create(168, 34)),
            new CircleHitbox(3, Vec.create(164, 36)),
            new CircleHitbox(3, Vec.create(159.5, 38)),
            new CircleHitbox(3, Vec.create(155, 39)),
            new CircleHitbox(3, Vec.create(151, 40)),
            new CircleHitbox(3, Vec.create(148, 41)),
            new CircleHitbox(3, Vec.create(143, 42))
        ),
        spawnHitbox: RectangleHitbox.fromRect(360, 130, Vec.create(30, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(38, 80, Vec.create(-94, 0)),
        puzzle: {
            triggerOnSolve: "vault_door",
            delay: 1500
        },
        ceilingImages: [
            {
                key: "oil_tanker_ship_room_ceiling",
                position: Vec.create(-101.5, 0),
                scale: Vec.create(1.8, 1.9)
            }
        ],
        floorImages: [
            {
                key: "oil_tanker_ship_floor_2",
                position: Vec.create(57.6, -0.09),
                scale: Vec.create(2.141, 2.141)
            },
            {
                key: "oil_tanker_ship_floor_3",
                position: Vec.create(153, -0.2),
                scale: Vec.create(2.141, 2.141)
            },
            {
                key: "oil_tanker_ship_back",
                position: Vec.create(-120, 0),
                scale: Vec.create(2.1, 1.8)
            },
            {
                key: "oil_tanker_ship_floor_1",
                position: Vec.create(-57, 0),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "ship_stair",
                position: Vec.create(-33.9, 50)
            },
            {
                key: "ship_stair",
                position: Vec.create(75.2, 50)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(212, 80, Vec.create(31, 0))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(38, 76.5, Vec.create(-94, 0))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(10, 20.25, Vec.create(-33.9, 50))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(10, 20.25, Vec.create(75.2, 50))
            }
        ],
        obstacles: [
            // back
            { idString: "regular_crate", position: Vec.create(-55.9, 32.7), outdoors: true },
            { idString: "barrel", position: Vec.create(-62, 23), outdoors: true },
            { idString: "aegis_crate", position: Vec.create(-59, -32.25), outdoors: true },
            { idString: "grenade_crate", position: Vec.create(-50, -35), outdoors: true },
            { idString: "aegis_crate", position: Vec.create(-17.5, -35), outdoors: true },
            { idString: "barrel", position: Vec.create(-8.5, -36), outdoors: true },
            { idString: "regular_crate", position: Vec.create(1, 24), outdoors: true },
            { idString: "super_barrel", position: Vec.create(11, 24), outdoors: true },
            { idString: "fire_hatchet_case", position: Vec.create(2, -24), rotation: 2, outdoors: true },

            // front
            { idString: "grenade_crate", position: Vec.create(128, -34), outdoors: true },
            { idString: "aegis_crate", position: Vec.create(129.5, 34), outdoors: true },
            { idString: "barrel", position: Vec.create(74.5, -35), outdoors: true },
            { idString: "regular_crate", position: Vec.create(84.25, -34), outdoors: true },
            { idString: "regular_crate", position: Vec.create(75, -6.5), outdoors: true },
            { idString: "regular_crate", position: Vec.create(75, 4), outdoors: true },

            // vault
            { idString: "vault_door", position: Vec.create(-105.9, 17.7), rotation: 0 },
            { idString: "barrel", position: Vec.create(-107, 33.25) },
            { idString: "briefcase", position: Vec.create(-82.5, 33.3), rotation: 0 },
            { idString: "regular_crate", position: Vec.create(-92.9, 32.7) },
            { idString: "regular_crate", position: Vec.create(-81.9, 23.1) },
            { idString: "gun_case", position: Vec.create(-109, -32.3), rotation: 1 },
            { idString: "life_preserver", position: Vec.create(-110.1, -21.6), rotation: 2 },
            { idString: "life_preserver", position: Vec.create(-110.1, -11.5), rotation: 2 },
            { idString: "tugboat_control_panel", position: Vec.create(-81.5, 0), rotation: 1 },
            { idString: "control_panel", position: Vec.create(-81, -19.25), rotation: 3, puzzlePiece: true },
            { idString: "window2", position: Vec.create(-74.5, -21.5), rotation: 0 },
            { idString: "window2", position: Vec.create(-74.5, -11.5), rotation: 0 },
            { idString: "window2", position: Vec.create(-74.5, 1.3), rotation: 0 },
            { idString: "window2", position: Vec.create(-74.5, 11.5), rotation: 0 }

        ] as BuildingObstacle[],
        subBuildings: [
            { idString: "oil_tanker_ship_vault", position: Vec.create(-28.1, -94.25), orientation: 1 },
            { idString: "oil_tanker_tanks", position: Vec.create(39, -5) } // P A I N
        ],
        lootSpawners: [{
            position: Vec.create(-93, 23),
            table: "ship_skin"
        }]
    },
    {
        idString: "oil_tanker_ship_vault",
        name: "Oil Tanker Ship Vault",
        spawnHitbox: RectangleHitbox.fromRect(20, 35),
        ceilingHitbox: RectangleHitbox.fromRect(20, 35),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [{
            key: "oil_tanker_ship_vault_ceiling",
            position: Vec.create(0, 0),
            scale: Vec.create(0.895, 1.28)
        }]
    },
    {
        idString: "oil_tanker_tanks",
        name: "Oil Tanker Tanks",
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            new CircleHitbox(31.25, Vec.create(-0.5, 4.4)),
            new CircleHitbox(31.25, Vec.create(-72.25, 4.4)),
            new CircleHitbox(31.25, Vec.create(73.1, 4.4)),
            RectangleHitbox.fromRect(10.5, 16.3, Vec.create(-98.5, 5)),
            RectangleHitbox.fromRect(17.5, 13, Vec.create(-74.7, -29.7)),
            RectangleHitbox.fromRect(4.6, 37.8, Vec.create(-32.5, 4)),
            RectangleHitbox.fromRect(4.6, 37.8, Vec.create(-39.9, 4)),
            RectangleHitbox.fromRect(30, 20, Vec.create(10.5, -13.3)),
            RectangleHitbox.fromRect(30, 20, Vec.create(10.25, 22.6)),
            RectangleHitbox.fromRect(30, 20, Vec.create(62, -13.3)),
            RectangleHitbox.fromRect(30, 20, Vec.create(62, 22.6)),
            RectangleHitbox.fromRect(30, 20, Vec.create(-61.25, -13.3)),
            RectangleHitbox.fromRect(30, 20, Vec.create(-60, 22))
        ),
        spawnHitbox: RectangleHitbox.fromRect(200, 90),
        ceilingImages: [
            {
                key: "oil_tanker_tanks_1",
                position: Vec.create(-52, 0),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "oil_tanker_tanks_2",
                position: Vec.create(53.4, 0.06),
                scale: Vec.create(1.07, 1.07)
            }
        ]
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
                hitbox: new GroupHitbox(
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
                hitbox: RectangleHitbox.fromRect(1.87, 186.8, Vec.create(143.17, -32.5))
            },
            {
                color: 0x2b2b2b,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(0.75, 128, Vec.create(64.33, -46)),
                    RectangleHitbox.fromRect(0.75, 128, Vec.create(66.55, -46)),
                    RectangleHitbox.fromRect(0.75, 128, Vec.create(127.9, -46)),
                    RectangleHitbox.fromRect(0.75, 128, Vec.create(130.1, -46))
                )
            }
        ],
        floors: [{
            type: FloorNames.Stone,
            hitbox: RectangleHitbox.fromRect(300, 270, Vec.create(-5, 0))
        }],
        floorImages: [
            { key: "floor_oil_01", position: Vec.create(69.49, 116.11), zIndex: ZIndexes.Decals },
            { key: "floor_oil_02", position: Vec.create(-87.54, -117.88), zIndex: ZIndexes.Decals },
            { key: "floor_oil_03", position: Vec.create(-147.56, -92.28), zIndex: ZIndexes.Decals },
            { key: "floor_oil_04", position: Vec.create(86.72, -64.06), zIndex: ZIndexes.Decals },
            { key: "floor_oil_05", position: Vec.create(-135.24, 82.47), zIndex: ZIndexes.Decals },
            { key: "floor_oil_06", position: Vec.create(-79.85, -46.97), zIndex: ZIndexes.Decals },
            { key: "floor_oil_07", position: Vec.create(-13.48, 10.95), zIndex: ZIndexes.Decals },

            // Group 1 Near Entrance
            { key: "container_mark", position: Vec.create(-60, 5), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-45, 5), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-30, 5), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-60, -25), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-45, -25), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-30, -25), zIndex: ZIndexes.Decals },

            // Group 2 Near Crane
            { key: "container_mark", position: Vec.create(5, 5), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(20, 5), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(35, 5), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(5, -25), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(20, -25), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(35, -25), zIndex: ZIndexes.Decals },

            // Group 3 Top Left corner
            { key: "container_mark", position: Vec.create(-100, -60), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-115, -60), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-130, -60), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-100, -90), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-115, -90), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(-130, -90), zIndex: ZIndexes.Decals },

            // Group 4 Under crane
            { key: "container_mark", position: Vec.create(82.5, 0), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(97.5, 0), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(112.5, 0), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(82.5, -30), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(97.5, -30), zIndex: ZIndexes.Decals },
            { key: "container_mark", position: Vec.create(112.5, -30), zIndex: ZIndexes.Decals }
        ],
        obstacles: [
            // Parking lot
            { idString: "regular_crate", position: Vec.create(67.36, 58.18), outdoors: true },

            { idString: "forklift", position: Vec.create(95, 64), rotation: 1, outdoors: true },
            { idString: "pallet", position: Vec.create(107.5, 64), rotation: 1 },
            { idString: "barrel", position: Vec.create(107.5, 64), outdoors: true },

            { idString: "trailer", position: Vec.create(100, 84), rotation: 3 },
            { idString: "truck", position: Vec.create(72, 84), rotation: 3 },

            { idString: "regular_crate", position: Vec.create(120, 110), outdoors: true },
            { idString: { regular_crate: 3, grenade_crate: 1 }, position: Vec.create(110, 115), outdoors: true },

            { idString: "box", position: Vec.create(87, 123), outdoors: true },
            { idString: "box", position: Vec.create(92, 120), outdoors: true },
            { idString: "box", position: Vec.create(85, 117), outdoors: true },
            { idString: "box", position: Vec.create(92, 114), outdoors: true },

            { idString: "forklift", position: Vec.create(90, 102.5), rotation: 1, outdoors: true },
            { idString: "pallet", position: Vec.create(100, 102.5), rotation: 1 },
            { idString: "regular_crate", position: Vec.create(100, 102.5), outdoors: true },

            // Above red warehouse
            { idString: "truck", position: Vec.create(12.5, 40), rotation: 3 },
            { idString: "trailer", position: Vec.create(40, 40), rotation: 3 },

            // next to red warehouse
            { idString: "dumpster", position: Vec.create(-7, -62), rotation: 3, outdoors: true },
            { idString: "dumpster", position: Vec.create(-22, -62), rotation: 3, outdoors: true },

            // The main entrance
            { idString: "barrier", position: Vec.create(-124, -10), rotation: 0 },

            // Secret loot area sort of
            { idString: "sandbags", position: Vec.create(-144, 65), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec.create(-132, 60), rotation: 2, outdoors: true },

            { idString: "super_barrel", position: Vec.create(-137, 75), outdoors: true },
            { idString: "barrel", position: Vec.create(-147, 80), outdoors: true },

            { idString: "super_barrel", position: Vec.create(-134, 90), outdoors: true },
            { idString: "barrel", position: Vec.create(-126, 85), outdoors: true },

            {
                idString: {
                    aegis_crate: 1,
                    flint_crate: 1
                },
                position: Vec.create(-126, 100),
                outdoors: true
            },
            {
                idString: {
                    aegis_crate: 1,
                    flint_crate: 1
                },
                position: Vec.create(-136, 105),
                outdoors: true
            },

            { idString: "sandbags", position: Vec.create(-132, 117), rotation: 2, outdoors: true },
            { idString: "barrel", position: Vec.create(-145, 117), outdoors: true },

            // Top left corner above group 3 of the port.
            { idString: "grenade_crate", position: Vec.create(-124, -120), outdoors: true },
            { idString: { regular_crate: 3, grenade_crate: 1 }, position: Vec.create(-135, -125), outdoors: true },
            {
                idString: {
                    regular_crate: 2,
                    flint_crate: 1,
                    aegis_crate: 1
                },
                position: Vec.create(-140, -115),
                rotation: 1,
                outdoors: true
            },

            { idString: "barrel", position: Vec.create(-142, -95), outdoors: true },
            { idString: "super_barrel", position: Vec.create(-147, -87), outdoors: true },

            { idString: "regular_crate", position: Vec.create(54.57, -72.34), outdoors: true },

            // Below Blue Warehouse
            { idString: "forklift", position: Vec.create(-60, -55), rotation: 1, outdoors: true },
            { idString: "pallet", position: Vec.create(-50, -55), rotation: 1 },

            { idString: { flint_crate: 1, regular_crate: 1 }, position: Vec.create(-75, -45), outdoors: true },
            { idString: "flint_crate", position: Vec.create(-50, -55), outdoors: true },

            // Top right corner above crane of the port
            { idString: { regular_crate: 3, grenade_crate: 1 }, position: Vec.create(108, -110), outdoors: true },
            { idString: "regular_crate", position: Vec.create(97, -100), outdoors: true },
            { idString: "grenade_crate", position: Vec.create(99, -90), outdoors: true },
            { idString: "forklift", position: Vec.create(110, -95), rotation: 2, outdoors: true },
            { idString: "pallet", position: Vec.create(110, -107.5), rotation: 2 },
            { idString: "box", position: Vec.create(115.28, -104.85), outdoors: true },
            { idString: { barrel: 2, super_barrel: 1 }, position: Vec.create(93.77, -72.33), outdoors: true },
            { idString: { barrel: 2, super_barrel: 1 }, position: Vec.create(75.38, -68.72), outdoors: true },

            { idString: "aegis_crate", position: Vec.create(54.48, -118.9), outdoors: true },
            { idString: { aegis_crate: 1, regular_crate: 1 }, position: Vec.create(64.96, -123.57), outdoors: true },

            ...(() => Array.from(
                { length: 5 },
                (_, i) => ({
                    idString: "bollard",
                    position: Vec.create(140.4, 50 - (41.5 * i)),
                    rotation: 0,
                    outdoors: true
                })
            ))(),

            // Fence to the bottom of the red warehouse
            ...(() => Array.from(
                { length: 19 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(5 - (8.45 * i), 135),
                    rotation: 0
                })
            ))(),

            // Fence to the bottom of the parking lot
            ...(() => Array.from(
                { length: 12 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(130 - (8.45 * i), 135),
                    rotation: 0
                })
            ))(),

            // Fence to the left of the red warehouse
            ...(() => Array.from(
                { length: 15 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-152.25, 131.5 - (8.45 * i)),
                    rotation: 1
                })
            ))(),

            // Fence going north of the main entrance to the left.
            ...(() => Array.from(
                { length: 12 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-152.25, -38.5 - (8.45 * i)),
                    rotation: 1
                })
            ))(),

            // Fence directly north of the main entrance
            ...(() => Array.from(
                { length: 21 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(46 - (8.45 * i), -135),
                    rotation: 0
                })
            ))(),

            // Fence north of the crane
            ...(() => Array.from(
                { length: 8 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(139.7 - (8.45 * i), -135),
                    rotation: 0
                })
            ))(),
            { idString: "fence", position: Vec.create(143.1, -130), rotation: 1 }
        ] as BuildingObstacle[],
        subBuildings: [
            { idString: "container_1", position: Vec.create(-40, 40), orientation: 1 },
            { idString: "crane", position: Vec.create(97, 25) },
            { idString: "port_warehouse_red", position: Vec.create(-95, -59), orientation: 1 },
            { idString: "port_warehouse_blue", position: Vec.create(-97, 15), orientation: 3 },
            { idString: "shed", position: Vec.create(-25, -134), orientation: 1 },
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
        idString: "cargo_ship_holder",
        name: "Cargo Ship (Holder)",
        spawnHitbox: RectangleHitbox.fromRect(365, 290, Vec.create(-100, 0)),
        spawnMode: MapObjectSpawnMode.Beach,
        sounds: {
            normal: "port_ambience",
            position: Vec.create(86, 40),
            maxRange: 380,
            falloff: 1
        },
        subBuildings: [
            { idString: "cargo_ship", position: Vec.create(40, -86), orientation: 3 }
        ]
    },
    {
        idString: "oil_tanker_ship_holder",
        name: "Oil Tanker Ship (Holder)",
        spawnHitbox: RectangleHitbox.fromRect(365, 290, Vec.create(-100, 0)),
        spawnMode: MapObjectSpawnMode.Beach,
        sounds: {
            normal: "port_ambience",
            position: Vec.create(81.8, -55),
            maxRange: 380,
            falloff: 1
        },
        subBuildings: [
            { idString: "oil_tanker_ship", position: Vec.create(-55, -81.8), orientation: 3 }
        ]
    },
    {
        idString: "port_complex",
        name: "Port Complex",
        spawnHitbox: RectangleHitbox.fromRect(365, 290, Vec.create(-100, 0)),
        spawnMode: MapObjectSpawnMode.Beach,
        subBuildings: [
            { idString: "port", position: Vec.create(-120, 0) },
            { idString: { cargo_ship_holder: 1, oil_tanker_ship_holder: 1 }, position: Vec.create(0, 0) }
        ]
    },
    {
        idString: "armory_barracks",
        name: "Armory Barracks",
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            new RectangleHitbox(Vec.create(23.44, -41), Vec.create(25.54, -15.1)),
            new RectangleHitbox(Vec.create(23.44, -4), Vec.create(25.54, 23.13)),
            new RectangleHitbox(Vec.create(23.44, 34.23), Vec.create(25.54, 41)),
            new RectangleHitbox(Vec.create(-25.51, -42.34), Vec.create(-1.91, -40.25)),
            new RectangleHitbox(Vec.create(7, 16.1), Vec.create(24, 18.2)),
            new RectangleHitbox(Vec.create(8.18, -42.34), Vec.create(25.54, -40.25)),
            new RectangleHitbox(Vec.create(-25.51, -41), Vec.create(-23.42, 17.54)),
            new RectangleHitbox(Vec.create(-25.51, 28.57), Vec.create(-23.42, 42.35)),
            new RectangleHitbox(Vec.create(-24, 40.25), Vec.create(-4.33, 42.35)),
            new RectangleHitbox(Vec.create(5.76, 40.25), Vec.create(25.54, 42.35)),
            new RectangleHitbox(Vec.create(4.05, 15.59), Vec.create(7.06, 18.77)),
            new RectangleHitbox(Vec.create(-4.12, -21.39), Vec.create(-1.11, -18.21)),
            new RectangleHitbox(Vec.create(-24, -20.85), Vec.create(-4, -18.76))
        ),
        spawnHitbox: RectangleHitbox.fromRect(50, 84),
        ceilingHitbox: RectangleHitbox.fromRect(50, 84),
        floorImages: [
            {
                key: "armory_barracks_floor_1",
                position: Vec.create(0, -23.2)
            },
            {
                key: "armory_barracks_floor_2",
                position: Vec.create(0, 23.2)
            }
        ],
        ceilingImages: [
            {
                key: "armory_barracks_ceiling_1",
                position: Vec.create(0, -21),
                scale: Vec.create(2, 2)
            },
            {
                key: "armory_barracks_ceiling_2",
                position: Vec.create(0, 20.6),
                scale: Vec.create(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(50, 84)
        }],
        obstacles: [
            { idString: "door", position: Vec.create(2.7, -41.3), rotation: 2 },
            { idString: "fridge", position: Vec.create(-19.8, -35.5), rotation: 1 },
            { idString: randomStove, position: Vec.create(-19.8, -26.1), rotation: 1 },
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
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.09, 42, Vec.create(16.38, 0)),
            RectangleHitbox.fromRect(32.34, 2.08, Vec.create(1.24, -21.87)),
            RectangleHitbox.fromRect(2.09, 3.97, Vec.create(-13.88, -19.01)),
            RectangleHitbox.fromRect(2.09, 8.27, Vec.create(-13.88, 16.87)),
            RectangleHitbox.fromRect(2.09, 8.58, Vec.create(-13.88, -2.64)),
            RectangleHitbox.fromRect(32.34, 2.07, Vec.create(1.24, 21.88))
        ),
        spawnHitbox: RectangleHitbox.fromRect(31, 44, Vec.create(1.5, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(31, 44, Vec.create(1.5, 0)),
        floorImages: [
            {
                key: "armory_center_floor_1",
                position: Vec.create(0, -11.5)
            },
            {
                key: "armory_center_floor_2",
                position: Vec.create(0, 11.5)
            }
        ],
        ceilingImages: [
            {
                key: "armory_center_ceiling_1",
                position: Vec.create(1.25, -11),
                scale: Vec.create(2, 2)
            },
            {
                key: "armory_center_ceiling_2",
                position: Vec.create(1.25, 11.4),
                scale: Vec.create(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(31, 44, Vec.create(1.5, 0))
        }],
        obstacles: [
            { idString: "door", position: Vec.create(-13.9, -12.43), rotation: 1 },
            { idString: "cabinet", position: Vec.create(12.45, -11.6), rotation: 3 },
            { idString: "small_table", position: Vec.create(8.85, 1.6), rotation: 1, variation: 0 },
            { idString: "chair", position: Vec.create(3, 1.7), rotation: 3 },
            { idString: "chair", position: Vec.create(10.1, 6), rotation: 0 },
            { idString: "small_drawer", position: Vec.create(-9.2, 16.8), rotation: 2 },
            { idString: "gun_mount_maul", position: Vec.create(2, 19.05), rotation: 2 },
            { idString: "window", position: Vec.create(-13.9, 7.1), rotation: 0 },
            { idString: "trash_can", position: Vec.create(12, 17.5) }
        ]
    },
    {
        idString: "armory_vault",
        name: "Armory Vault",
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.09, 36, Vec.create(36.03, -2)),
            RectangleHitbox.fromRect(2.09, 11.67, Vec.create(-13.96, -15.1)),
            RectangleHitbox.fromRect(13.4, 2.09, Vec.create(30.37, 16.52)),
            RectangleHitbox.fromRect(74.12, 2.09, Vec.create(0.01, -20.98)),
            RectangleHitbox.fromRect(2.09, 11.07, Vec.create(-13.96, 10.47)),
            RectangleHitbox.fromRect(29, 2.09, Vec.create(21.9, -6.66)),
            RectangleHitbox.fromRect(2.07, 37, Vec.create(-36.01, -2.5)),
            RectangleHitbox.fromRect(35.39, 2.09, Vec.create(-19.35, 16.52)),
            RectangleHitbox.fromRect(4.16, 2.09, Vec.create(10.5, 16.52))
        ),
        spawnHitbox: RectangleHitbox.fromRect(72, 38, Vec.create(0, -2)),
        ceilingHitbox: RectangleHitbox.fromRect(72, 38, Vec.create(0, -2)),
        puzzle: {
            triggerOnSolve: "vault_door",
            delay: 1500,
            order: ["o", "l", "j", "y"],
            solvedSound: true,
            setSolvedImmediately: true
        },
        floorImages: [
            {
                key: "armory_vault_floor_1",
                position: Vec.create(-16.6, 0)
            },
            {
                key: "armory_vault_floor_2",
                position: Vec.create(20.2, 0)
            }
        ],
        ceilingImages: [{
            key: "armory_vault_ceiling",
            position: Vec.create(0, -2.5),
            scale: Vec.create(2, 2)
        }],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(72, 38, Vec.create(0, -2))
        }],
        subBuildings: [{
            idString: "armory_inner_vault",
            position: Vec.create(-25, -2.25)
        }],
        obstacles: [
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
                    variation: 0,
                    puzzlePiece: ["y", "o", "j", "l"][i]
                } satisfies BuildingObstacle)
            ),
            { idString: "control_panel2", position: Vec.create(30.7, -14), rotation: 3 },
            { idString: "ammo_crate", position: Vec.create(-20, -14.8), rotation: 0 },
            { idString: "regular_crate", position: Vec.create(-29.8, -14.8), rotation: 0 },
            { idString: "barrel", position: Vec.create(-30.9, 11.3) },
            { idString: "briefcase", position: Vec.create(-20.7, 10.85), rotation: 0 },
            { idString: "vault_door", position: Vec.create(-14.1, -3.22), rotation: 3 }
        ],
        lootSpawners: [{
            position: Vec.create(-25.5, -1),
            table: "armory_skin"
        }]
    },
    {
        idString: "armory_inner_vault",
        name: "Armory Inner Vault",
        spawnHitbox: RectangleHitbox.fromRect(20.87, 36.34),
        ceilingHitbox: RectangleHitbox.fromRect(20.87, 36.34),
        ceilingImages: [
            {
                key: "armory_inner_vault_ceiling_1",
                position: Vec.create(0, -9)
            },
            {
                key: "armory_inner_vault_ceiling_2",
                position: Vec.create(0, 9.1)
            }
        ]
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
            { idString: "shed", position: Vec.create(-60.9, -65.63), orientation: 2 },
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
            type: FloorNames.Stone,
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
            { idString: "regular_crate", position: Vec.create(63.13, -15.17), outdoors: true },
            { idString: "regular_crate", position: Vec.create(-7.99, 2.28), outdoors: true },
            { idString: "regular_crate", position: Vec.create(7.06, 30.07), outdoors: true },
            { idString: "regular_crate", position: Vec.create(18.06, 27.86), outdoors: true },
            { idString: "regular_crate", position: Vec.create(-64.29, 76.5), outdoors: true },
            { idString: "regular_crate", position: Vec.create(65.01, -56.73), outdoors: true },
            { idString: "regular_crate", position: Vec.create(8.45, -66.79), outdoors: true },
            { idString: "flint_crate", position: Vec.create(33.86, -46.16), outdoors: true },
            { idString: "barrel", position: Vec.create(-10.72, -7.93), outdoors: true },
            { idString: "barrel", position: Vec.create(9.13, 40.34), outdoors: true },
            { idString: "barrel", position: Vec.create(69.75, 42.55), outdoors: true },
            { idString: "barrel", position: Vec.create(24.36, -46.95), outdoors: true },
            { idString: "barrel", position: Vec.create(70.01, -72.17), outdoors: true },
            { idString: "super_barrel", position: Vec.create(34.44, -55.28), rotation: 0, outdoors: true },
            { idString: "super_barrel", position: Vec.create(44.51, 78.15), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec.create(15.15, 17.92), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec.create(-10, 78.77), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec.create(44.5, 65), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec.create(31.6, -36.18), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec.create(30.66, -70.69), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec.create(18.54, -67.73), rotation: 1, outdoors: true },
            { idString: "m1117", position: Vec.create(48.93, -53.75), rotation: 0, variation: 0 },
            { idString: "gun_case", position: Vec.create(30.66, -28.84), rotation: 0, outdoors: true },
            { idString: "gun_case", position: Vec.create(63.16, -36.39), rotation: 1, outdoors: true },
            { idString: "gun_case", position: Vec.create(19.48, 36.69), rotation: 0, outdoors: true },
            { idString: "tear_gas_crate", position: Vec.create(16.55, 9.68), rotation: 0, outdoors: true },
            { idString: "tear_gas_crate", position: Vec.create(33.06, -62.76), rotation: 0, outdoors: true },
            { idString: "grenade_crate", position: Vec.create(-55.29, 78.02), outdoors: true },
            { idString: "grenade_crate", position: Vec.create(69.81, -34.24), outdoors: true },
            { idString: "ammo_crate", position: Vec.create(50.07, -20.07), rotation: 0, outdoors: true },
            { idString: "barrier", position: Vec.create(13.91, 70.32), rotation: 1 },

            { idString: "fence", position: Vec.create(70.5, -83.93), rotation: 0 },

            // top top left
            ...Array.from(
                { length: 10 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-72.1 + 8.45 * i, -83.93),
                    rotation: 0
                })
            ),
            // top middle
            ...Array.from(
                { length: 3 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(23 + 8.45 * i, -83.93),
                    rotation: 0
                })
            ),
            // top right
            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(75.55, -80.45 + 8.45 * i),
                    rotation: 1
                })
            ),
            // right bottom right
            ...Array.from(
                { length: 10 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(75.55, 4.4 + 8.45 * i),
                    rotation: 1
                })
            ),
            // bottom bottom right
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(45.1 + 8.45 * i, 83.93),
                    rotation: 0
                })
            ),
            // bottom bottom left
            ...Array.from(
                { length: 6 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-58 + 8.45 * i, 83.93),
                    rotation: 0
                })
            ),
            // left bottom left
            ...Array.from(
                { length: 9 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-75.55, 7 + 8.45 * i),
                    rotation: 1
                })
            ),
            // left top left
            ...Array.from(
                { length: 9 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-75.55, -78.85 + 8.45 * i),
                    rotation: 1
                })
            )
        ]
    },
    {
        idString: "mobile_home",
        name: "Mobile Home",
        spawnHitbox: RectangleHitbox.fromRect(65, 40),
        ceilingHitbox: RectangleHitbox.fromRect(43.5, 20, Vec.create(0, -1)),
        floorImages: [
            {
                key: "mobile_home_floor_1",
                position: Vec.create(-11, 0),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "mobile_home_floor_2",
                position: Vec.create(11, 0.01),
                scale: Vec.create(1.07, 1.07)
            }
        ],
        ceilingImages: [{
            key: "mobile_home_ceiling",
            position: Vec.create(0, -1),
            residue: "mobile_home_residue",
            scale: Vec.create(1.07, 1.07)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(43.5, 20, Vec.create(0, -1))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(9.8, 4, Vec.create(5, 11))
            }
        ],
        wallsToDestroy: 2,
        obstacles: [
            { idString: "small_drawer", position: Vec.create(8.5, -5.5), rotation: 0 },
            { idString: "sink", position: Vec.create(-16.8, -4.6), rotation: 1 },
            { idString: randomSmallStove, position: Vec.create(-16.8, 3.9), rotation: 1 },
            { idString: "door", position: Vec.create(4.5, 8.45), rotation: 2 },
            { idString: "mobile_home_wall_4", position: Vec.create(15.5, 8.45), rotation: 0 },
            { idString: "mobile_home_wall_2", position: Vec.create(-10.5, 8.45), rotation: 0 },
            { idString: "tire", position: Vec.create(-24.25, 4.85), rotation: 0, outdoors: true },
            { idString: "small_bed", position: Vec.create(16.8, -1), rotation: 0 },
            { idString: "mobile_home_window", position: Vec.create(-6.6, -10.5), rotation: 0 },
            { idString: "mobile_home_wall_1", position: Vec.create(-17.25, -10.5), rotation: 0 },
            { idString: "mobile_home_wall_2", position: Vec.create(21.7, -1), rotation: 1 },
            { idString: "mobile_home_wall_2", position: Vec.create(-21.7, -1), rotation: 1 },
            { idString: "mobile_home_wall_3", position: Vec.create(10.6, -10.5), rotation: 0 },
            { idString: "box", position: Vec.create(25.7, -3.5), outdoors: true },
            { idString: "box", position: Vec.create(27.5, 1.55), outdoors: true }
        ]
    },
    tugboat("red", "lux_crate"),
    tugboat("white", "gun_case"),
    {
        idString: "sea_traffic_control",
        name: "Sea Traffic Control",
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.87, 20.8, Vec.create(19.6, -20.4)),
            RectangleHitbox.fromRect(2.37, 1.52, Vec.create(19.85, 1.62)),
            RectangleHitbox.fromRect(17.25, 1.74, Vec.create(11.91, 25.14)),
            RectangleHitbox.fromRect(1.78, 55, Vec.create(-20.19, -2.5)),
            RectangleHitbox.fromRect(2.4, 1.51, Vec.create(19.87, 13.27)),
            RectangleHitbox.fromRect(14.31, 1.78, Vec.create(-13.93, 25.12)),
            RectangleHitbox.fromRect(40.08, 1.78, Vec.create(-1.04, -29.91))
        ),
        spawnHitbox: RectangleHitbox.fromRect(48, 98, Vec.create(0, 15)),
        ceilingHitbox: RectangleHitbox.fromRect(40, 55, Vec.create(0, -2)),
        spawnMode: MapObjectSpawnMode.Beach,
        floorImages: [
            {
                key: "sea_traffic_control_floor_1",
                position: Vec.create(0, -15.45),
                scale: Vec.create(2, 2)
            },
            {
                key: "sea_traffic_control_floor_2",
                position: Vec.create(0, 15.4),
                scale: Vec.create(2, 2)
            }
        ],
        ceilingImages: [{
            key: "sea_traffic_control_ceiling",
            position: Vec.create(-0.25, -2.4),
            scale: Vec.create(2, 2)
        }],
        floors: [
            { type: FloorNames.Wood, hitbox: RectangleHitbox.fromRect(40, 55, Vec.create(0, -2)) },
            { type: FloorNames.Stone, hitbox: RectangleHitbox.fromRect(10.5, 5.2, Vec.create(-1.7, 28.2)) }
        ],
        obstacles: [
            { idString: "sandbags", position: Vec.create(-16.79, 33.53), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec.create(-16.79, 47.1), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec.create(-14.15, 58.27), rotation: 2, outdoors: true },
            { idString: "barrel", position: Vec.create(-7.67, 47.77), outdoors: true },
            { idString: "barrel", position: Vec.create(14.07, 42), outdoors: true },
            { idString: "regular_crate", position: Vec.create(11.03, 32.15), outdoors: true },
            { idString: "door", position: Vec.create(-1.35, 25.19), rotation: 0 },
            { idString: "gun_case", position: Vec.create(-13.41, 20.92), rotation: 2 },
            { idString: "large_drawer", position: Vec.create(13.83, 1.1), rotation: 3 },
            { idString: "office_chair", position: Vec.create(0.43, -16.77), rotation: 2 },
            { idString: "office_chair", position: Vec.create(-11.78, -16.82), rotation: 2 },
            { idString: "office_chair", position: Vec.create(5.67, 13.88), rotation: 1 },
            { idString: "aegis_crate", position: Vec.create(13.27, -23.45) },
            { idString: "life_preserver", position: Vec.create(-17.63, -2.6), rotation: 2 },
            { idString: "life_preserver", position: Vec.create(-17.63, 7.05), rotation: 2 },
            { idString: "small_table", position: Vec.create(13.47, 13.95), rotation: 2, variation: 0 },
            { idString: "control_panel", position: Vec.create(-5.75, -24.7), rotation: 0, activated: true },
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
        noBulletCollision: true,
        allowFlyover: FlyoverPref.Always,
        material: "wood",
        particle: "furniture_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.02, 56, Vec.create(6.39, 0)),
            RectangleHitbox.fromRect(1.02, 56, Vec.create(-6.39, 0)),
            ...Array.from({ length: 2 }, (_, i) => {
                const a = i === 0 ? 1 : -1;
                return Array.from({ length: 2 }, (_, i) => {
                    const b = i === 0 ? 1 : -1;
                    return [
                        new CircleHitbox(1.1, Vec.create(6.39 * a, 0)),
                        new CircleHitbox(1.1, Vec.create(6.39 * a, 9.54 * b)),
                        new CircleHitbox(1.1, Vec.create(6.39 * a, 19.17 * b)),
                        new CircleHitbox(1.1, Vec.create(6.39 * a, 27.97 * b))
                    ];
                }).flat();
            }).flat()
        ),
        spawnHitbox: RectangleHitbox.fromRect(20, 62),
        bridgeHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20, 5, Vec.create(0, 28.5)),
            RectangleHitbox.fromRect(20, 5, Vec.create(0, -28.5))
        ),
        floorImages: [
            {
                key: "small_bridge",
                position: Vec.create(0, -14.5)
            },
            {
                key: "small_bridge",
                position: Vec.create(0, 14.5),
                rotation: Math.PI
            }
        ],
        floors: [
            { type: FloorNames.Wood, hitbox: RectangleHitbox.fromRect(13.6, 55.7, Vec.create(0, 0)) }
        ],
        lootSpawners: [
            { table: "ground_loot", position: Vec.create(0, 0) }
        ]
    },
    {
        idString: "large_bridge",
        name: "Large Bridge",
        allowFlyover: FlyoverPref.Always,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            // Main Bridge Sides
            RectangleHitbox.fromRect(4, 136, Vec.create(21.5, -1.5)),
            RectangleHitbox.fromRect(4, 136, Vec.create(-21.5, -1.5)),

            // Cinder Blocks on Edge of Bridge
            RectangleHitbox.fromRect(5, 5, Vec.create(-21.5, -72)),
            RectangleHitbox.fromRect(5, 5, Vec.create(21.5, -72)),
            RectangleHitbox.fromRect(5, 5, Vec.create(-21.5, 69)),
            RectangleHitbox.fromRect(5, 5, Vec.create(21.5, 69)),

            // Pillars
            RectangleHitbox.fromRect(5, 3.25, Vec.create(-25.25, -1.35)),
            RectangleHitbox.fromRect(5, 3.25, Vec.create(25.25, -1.35)),
            RectangleHitbox.fromRect(5, 3.25, Vec.create(-25.25, -35.9)),
            RectangleHitbox.fromRect(5, 3.25, Vec.create(25.25, -35.9)),
            RectangleHitbox.fromRect(5, 3.25, Vec.create(-25.25, 33.15)),
            RectangleHitbox.fromRect(5, 3.25, Vec.create(25.25, 33.15)),
            RectangleHitbox.fromRect(5, 3.25, Vec.create(-25.25, 67.8)),
            RectangleHitbox.fromRect(5, 3.25, Vec.create(25.25, 67.8)),
            RectangleHitbox.fromRect(5, 3.25, Vec.create(-25.25, -70.65)),
            RectangleHitbox.fromRect(5, 3.25, Vec.create(25.25, -70.65))
        ),
        spawnHitbox: RectangleHitbox.fromRect(105, 230),
        bridgeHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(105, 45, Vec.create(0, 92.5)),
            RectangleHitbox.fromRect(105, 45, Vec.create(0, -92.5))
        ),
        bridgeMinRiverWidth: 25,
        floorImages: [
            { key: "large_bridge_railing", position: Vec.create(23.3, -38) },
            { key: "large_bridge_railing", position: Vec.create(23.3, 35.3), rotation: Math.PI, scale: Vec.create(-1, 1) },
            { key: "large_bridge_railing", position: Vec.create(-23.3, -38), scale: Vec.create(-1, 1) },
            { key: "large_bridge_railing", position: Vec.create(-23.3, 35.3), rotation: Math.PI },

            { key: "floor_oil_02", position: Vec.create(5.28, -66.1), zIndex: ZIndexes.Decals },
            { key: "floor_oil_03", position: Vec.create(-12.06, 23.49), rotation: Math.PI / 2, zIndex: ZIndexes.Decals },
            { key: "smoke_explosion_decal", position: Vec.create(-12.96, -49.37), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(15.91, -2.56), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(-8.65, 42.84), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(-2.11, 85.37), zIndex: ZIndexes.Decals },
            { key: "frag_explosion_decal", position: Vec.create(-4.31, -91.09), zIndex: ZIndexes.Decals },
            { key: "smoke_explosion_decal", position: Vec.create(11.09, 75.08), zIndex: ZIndexes.Decals }
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
        floors: [
            { type: FloorNames.Stone, hitbox: RectangleHitbox.fromRect(45, 210, Vec.create(0, 0)) }
        ],
        obstacles: [
            // North End of Bridge
            { idString: "barrel", position: Vec.create(-17.5, -80), rotation: 0, outdoors: true },

            { idString: "sandbags", position: Vec.create(25, -80), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec.create(36, -82.5), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec.create(36, -96.5), rotation: 1, outdoors: true },

            { idString: "grenade_crate", position: Vec.create(27.5, -88.5), outdoors: true },

            // North-Center of the Bridge
            { idString: "regular_crate", position: Vec.create(13.5, -55), rotation: 1, outdoors: true },
            { idString: "barrel", position: Vec.create(4, -51), rotation: 1, outdoors: true },
            { idString: "gun_case", position: Vec.create(13.5, -47), rotation: 2, outdoors: true },
            { idString: "sandbags", position: Vec.create(12.5, -40), rotation: 2, outdoors: true },
            { idString: "aegis_crate", position: Vec.create(14.5, -30.5), outdoors: true },

            // Center of the Bridge
            { idString: "m1117", position: Vec.create(-8.5, -4), rotation: 0, variation: 1 },
            { idString: "regular_crate", position: Vec.create(7, -20), rotation: 0, outdoors: true },
            { idString: "gun_case", position: Vec.create(14, 10), rotation: 0, outdoors: true },

            // South-Center of the Bridge
            { idString: "gun_case", position: Vec.create(6, 26), rotation: 3, outdoors: true },
            { idString: "ammo_crate", position: Vec.create(14, 26), outdoors: true },
            { idString: "sandbags", position: Vec.create(12.5, 35.5), rotation: 2, outdoors: true },
            { idString: "barrel", position: Vec.create(15.5, 43.5), rotation: 2, outdoors: true },
            { idString: "tear_gas_crate", position: Vec.create(15.5, 52.5), rotation: 1, outdoors: true },

            // South End of the Bridge
            { idString: "barrel", position: Vec.create(17.5, 80), rotation: 0, outdoors: true },

            { idString: "sandbags", position: Vec.create(-25, 77), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec.create(-36, 79.5), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec.create(-36, 93.5), rotation: 1, outdoors: true },

            { idString: "grenade_crate", position: Vec.create(-27.5, 85.5), outdoors: true }
        ],
        subBuildings: [
            // North West Shed
            { idString: "shed", position: Vec.create(-36, -95) },
            { idString: "shed", position: Vec.create(-36, -95), orientation: 2 }
        ]
    },
    {
        idString: "construction_site",
        name: "Construction Site",
        spawnHitbox: RectangleHitbox.fromRect(75, 75, Vec.create(0, 0)),
        spawnMode: MapObjectSpawnMode.Grass,
        floorImages: [
            {
                key: "construction_site_floor_1_left",
                position: Vec.create(-16.5, -16.5),
                scale: Vec.create(2, 2)
            },
            {
                key: "construction_site_floor_1_right",
                position: Vec.create(15.5, -16.5),
                scale: Vec.create(2, 2)
            },
            {
                key: "construction_site_floor_2_right",
                position: Vec.create(-16.5, 16),
                scale: Vec.create(2, 2)
            },
            {
                key: "construction_site_floor_2_left",
                position: Vec.create(16.5, 16),
                scale: Vec.create(2, 2)
            }
        ],
        floors: [
            { type: FloorNames.Sand, hitbox: RectangleHitbox.fromRect(65, 65, Vec.create(0, 0)) }
        ],
        obstacles: [
            { idString: "bunker_entrance", position: Vec.create(-10, -16), rotation: 0 },

            { idString: "sandbags", position: Vec.create(18.42, -27.15), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec.create(25.28, -15.7), rotation: 1, outdoors: true },
            { idString: "flint_crate", position: Vec.create(15, -17), outdoors: true },
            { idString: "barrel", position: Vec.create(15, -7.5), rotation: 1, outdoors: true },
            { idString: "super_barrel", position: Vec.create(5, -17), rotation: 1, outdoors: true },

            { idString: "sandbags", position: Vec.create(-5.5, 7.94), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec.create(0.72, 19.15), rotation: 0, outdoors: true },
            { idString: "cooler", position: Vec.create(2.28, 8.42), rotation: 1, outdoors: true },

            { idString: "box", position: Vec.create(16.66, 9.9), outdoors: true },
            { idString: "box", position: Vec.create(13.45, 16.63), outdoors: true },
            { idString: "box", position: Vec.create(19.13, 16.54), outdoors: true },
            { idString: "box", position: Vec.create(-20.5, -15.28), outdoors: true },
            { idString: "box", position: Vec.create(-25.19, -10.4), outdoors: true },

            { idString: "regular_crate", position: Vec.create(-17.34, 6.54), outdoors: true },
            { idString: "regular_crate", position: Vec.create(-16.5, 17.85), outdoors: true },
            { idString: "regular_crate", position: Vec.create(-24.02, -23.2), outdoors: true },

            { idString: "roadblock", position: Vec.create(-10.07, -29.04), rotation: 1 },

            { idString: "roadblock", position: Vec.create(-26, 0), rotation: 0 },
            { idString: "roadblock", position: Vec.create(-27, 15), rotation: 0 },

            { idString: "roadblock", position: Vec.create(-12.5, 27.5), rotation: 1 },
            { idString: "roadblock", position: Vec.create(2.5, 27.5), rotation: 1 },
            { idString: "roadblock", position: Vec.create(17.5, 27.5), rotation: 1 },
            { idString: "roadblock", position: Vec.create(25, 15), rotation: 0 }
        ]
    },

    // -----------------------------------------------------------------------------------------------
    // Headquarters.
    // -----------------------------------------------------------------------------------------------
    {
        idString: "detector",
        name: "Detector",
        spawnHitbox: RectangleHitbox.fromRect(9, 3, Vec.create(0, 1)),
        obstacles: [
            { idString: "detector_walls", position: Vec.create(0, 0), rotation: 0 },
            { idString: "detector_top", position: Vec.create(0, 0.5), rotation: 0 }
        ]
    },
    {
        idString: "headquarters_vault",
        name: "Headquarters Vault",
        spawnHitbox: RectangleHitbox.fromRect(22, 30.6, Vec.create(0, -7.2)),
        ceilingHitbox: RectangleHitbox.fromRect(22, 30.6, Vec.create(0, -7.2)),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [
            {
                key: "headquarters_vault_ceiling",
                position: Vec.create(0.1, -7.4),
                scale: Vec.create(2.16, 2.15)
            }
        ]
    },
    {
        idString: "headquarters_secret_room",
        name: "Headquarters Secret Room",
        spawnHitbox: RectangleHitbox.fromRect(20, 20),
        ceilingHitbox: RectangleHitbox.fromRect(20, 20),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [{
            key: "secret_room_ceiling",
            position: Vec.create(0, 0),
            scale: Vec.create(1.1, 1.01)
        }],
        ceilingHiddenAlpha: 0.45
    },
    {
        idString: "headquarters",
        name: "Headquarters",
        material: "stone",
        particle: "hq_stone_wall_particle",
        particleVariations: 2,
        collideWithLayers: Layers.Adjacent,
        ceilingImages: [
            {
                key: "headquarters_second_floor_bottom",
                position: Vec.create(0.5, 15.8)
            },
            {
                key: "headquarters_second_floor_top", // dont touch :3
                position: Vec.create(0, -69)
            },
            {
                key: "headquarters_torture_window", // dont touch :3
                position: Vec.create(-65, -84.8),
                scale: Vec.create(1, 1.055)
            },
            {
                key: "headquarters_ceiling_1",
                position: Vec.create(0.4, -66.722),
                scale: Vec.create(2.15, 2.15)
            },
            {
                key: "headquarters_ceiling_2",
                position: Vec.create(-46.2, 5.85),
                scale: Vec.create(2.15, 2.15)
            }
        ],
        hitbox: new GroupHitbox(
            // Outer walls
            RectangleHitbox.fromRect(84.9, 1.75, Vec.create(-29.2, -106.4)), // T, W1
            RectangleHitbox.fromRect(47.7, 1.75, Vec.create(47.65, -106.4)), // T, W2
            RectangleHitbox.fromRect(1.75, 95.5, Vec.create(70.7, -59)), // R, W3
            RectangleHitbox.fromRect(1.75, 38.25, Vec.create(70.7, 18.5)), // R, W4
            RectangleHitbox.fromRect(23.6, 1.75, Vec.create(58.6, 36.75)), // B, W5
            RectangleHitbox.fromRect(12.5, 1.75, Vec.create(30.1, 36.75)), // B, W6
            RectangleHitbox.fromRect(33.4, 1.75, Vec.create(-3.3, 36.75)), // B, W7
            RectangleHitbox.fromRect(31.4, 1.75, Vec.create(-55.9, 36.75)), // B, W8
            RectangleHitbox.fromRect(1.75, 70, Vec.create(-70.7, 1.1)), // L, W9
            RectangleHitbox.fromRect(1.75, 45.25, Vec.create(-70.7, -84.4)), // L, W10
            RectangleHitbox.fromRect(14.6, 1.75, Vec.create(-64, -62.7)), // L, W11
            RectangleHitbox.fromRect(1.75, 17.6, Vec.create(-57.6, -53.8)), // L, W12
            RectangleHitbox.fromRect(1.75, 2, Vec.create(-57.6, -33.5)), // L, ???
            RectangleHitbox.fromRect(22, 1.75, Vec.create(-60, -33)), // L, W13

            // Inner walls
            RectangleHitbox.fromRect(24.25, 1.75, Vec.create(-7.8, -24.5)), // W14
            RectangleHitbox.fromRect(46.1, 1.75, Vec.create(47.4, -24.5)), // R, W15
            RectangleHitbox.fromRect(1.75, 20, Vec.create(-19, -14.9)), // W16
            RectangleHitbox.fromRect(1.86, 21.15, Vec.create(-19, 25.8)), // W17
            RectangleHitbox.fromRect(1.75, 18, Vec.create(-41.1, 27.1)), // W18
            RectangleHitbox.fromRect(1.75, 9.5, Vec.create(-41.1, 3.25)), // L, W19
            RectangleHitbox.fromRect(18, 1.75, Vec.create(-50.25, -0.6)), // L, W20
            RectangleHitbox.fromRect(1.75, 30, Vec.create(-46.8, -16)), // L, W21
            RectangleHitbox.fromRect(1.75, 40.8, Vec.create(-33.55, -85.5)), // L, W22
            RectangleHitbox.fromRect(25, 1.75, Vec.create(-45.9, -94)), // L, W23
            RectangleHitbox.fromRect(1.75, 17, Vec.create(-57.5, -85.8)), // L, W24
            RectangleHitbox.fromRect(12.5, 1.75, Vec.create(-50.7, -78.25)), // L, W25

            // squares
            RectangleHitbox.fromRect(4.1, 4, Vec.create(-47, -33)), // L, 1
            RectangleHitbox.fromRect(4.1, 4, Vec.create(-32.8, -63)), // L, 2
            RectangleHitbox.fromRect(4.1, 4, Vec.create(11, -63)), // R, 3
            RectangleHitbox.fromRect(4.1, 4, Vec.create(32.7, -84)), // R, 4
            RectangleHitbox.fromRect(4.1, 4, Vec.create(57.5, -84)), // R, 5
            RectangleHitbox.fromRect(4.1, 4, Vec.create(14.6, 4.5)) // CENT, 6
        ),
        spawnHitbox: RectangleHitbox.fromRect(195, 200, Vec.create(0, -26)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(140, 70, Vec.create(-0.5, 1.5)),
            RectangleHitbox.fromRect(128, 73, Vec.create(5.75, -70)),
            RectangleHitbox.fromRect(11.5, 43, Vec.create(-64, -84)), // stair
            RectangleHitbox.fromRect(45, 25, Vec.create(-30, 47)) // ADJUST THIS! (not sure if its correct) - pap,
            // RectangleHitbox.fromRect(12.4, 12, Vec.create(66.05, -42.5))
        ),
        spawnMode: MapObjectSpawnMode.Grass,
        puzzle: {
            triggerOnSolve: "metal_door",
            delay: 1000,
            unlockOnly: true
        },
        floorImages: [
            {
                key: "headquarters_floor_entrance",
                position: Vec.create(-30, 45)
            },
            {
                key: "headquarters_large_stair",
                position: Vec.create(77.7, -55.5)
            },
            {
                key: "headquarters_floor_top",
                position: Vec.create(0, -69.5)
            },
            {
                key: "headquarters_floor_bottom",
                position: Vec.create(0.78, 5)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.67, 20, Vec.create(-18.5, 5.1)), // patch
                    RectangleHitbox.fromRect(88.3, 59.5, Vec.create(26, 6)),
                    RectangleHitbox.fromRect(20, 1.5, Vec.create(14.3, -24)), // patch
                    RectangleHitbox.fromRect(37, 58.25, Vec.create(51.5, -54.7))
                    /* RectangleHitbox.fromRect(1.5, 10, Vec.create(33.5, -41.5)),
                    RectangleHitbox.fromRect(1.5, 10, Vec.create(33.5, -81)),
                    RectangleHitbox.fromRect(1.5, 80, Vec.create(32.5, -67)) // P2 */
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.67, 10, Vec.create(-40.25, 13)), // patch
                    RectangleHitbox.fromRect(20, 1.05, Vec.create(14.3, -25.2)), // patch
                    RectangleHitbox.fromRect(1.67, 20, Vec.create(-19.9, 5.1)), // patch
                    RectangleHitbox.fromRect(20.1, 55, Vec.create(-30.1, 10)),
                    RectangleHitbox.fromRect(26, 34, Vec.create(-33, -18.5)),
                    RectangleHitbox.fromRect(78, 40, Vec.create(-7, -45)),
                    RectangleHitbox.fromRect(20.1, 71, Vec.create(22, -71.5)),
                    RectangleHitbox.fromRect(22.5, 42, Vec.create(-45.8, -55)),
                    RectangleHitbox.fromRect(22.5, 16, Vec.create(-30, 45.15)),
                    RectangleHitbox.fromRect(3.8, 10.4, Vec.create(-59.25, -39.5)), // D1
                    RectangleHitbox.fromRect(10.3, 3.8, Vec.create(18.5, -107.9)), // D2
                    RectangleHitbox.fromRect(35.5, 14, Vec.create(-52.1, -70.5)),
                    RectangleHitbox.fromRect(10.7, 1.67, Vec.create(-39.5, -77.8)), // patch
                    RectangleHitbox.fromRect(1.67, 80.1, Vec.create(32.5, -65.5)), // large patch

                    // TODO: new floor types for these (positions are done)
                    RectangleHitbox.fromRect(45.1, 43.5, Vec.create(-10.8, -84)), // toilet (grey and white tiles)
                    RectangleHitbox.fromRect(37, 22, Vec.create(51.4, -95)) // toilet (grey and white tiles)
                )
            },
            {
                type: FloorNames.Carpet,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.67, 10, Vec.create(-41.8, 13)), // P1 - a
                    RectangleHitbox.fromRect(10.5, 1.67, Vec.create(-64.5, 0.4)), // P1 - b
                    RectangleHitbox.fromRect(27.6, 35.5, Vec.create(-56, 18))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.7, 1.65, Vec.create(-64.5, -1)), // patch
                    RectangleHitbox.fromRect(22.5, 30.6, Vec.create(-59, -17)),
                    RectangleHitbox.fromRect(23, 15, Vec.create(-45.5, -86)),
                    RectangleHitbox.fromRect(11, 28.5, Vec.create(-64, -91.5)) // small stair
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(11.55, 25.5, Vec.create(77.6, -63)), // large stair
                    RectangleHitbox.fromRect(11.5, 11, Vec.create(-64.11, -100.43)),
                    RectangleHitbox.fromRect(12.5, 16, Vec.create(-52, -100.1))
                ),
                layer: 1
            }
        ],
        groundGraphics: [{
            color: 0x666666,
            hitbox: RectangleHitbox.fromRect(23, 11, Vec.create(-45.5, -100))
        }],
        visibilityOverrides: [{
            collider: new GroupHitbox(
                RectangleHitbox.fromRect(16, 11, Vec.create(-42.5, -100.2)),
                RectangleHitbox.fromRect(8.5, 16, Vec.create(79.2, -42.75)),
                RectangleHitbox.fromRect(10, 2, Vec.create(78, -49.5)),
                RectangleHitbox.fromRect(10, 2, Vec.create(78, -36.5))
            ),
            layer: 2,
            allow: [0]
        }],
        obstacles: [
            { idString: "headquarters_bottom_entrance", position: Vec.create(1, 2), rotation: 0 },
            { idString: "headquarters_main_desk", position: Vec.create(-10.7, -49.5), rotation: 0 },
            { idString: "headquarters_cafeteria_table", position: Vec.create(45, -82), rotation: 0 },
            { idString: "headquarters_sinks", position: Vec.create(1, 1.5), rotation: 0 },

            // i have fully given up at this point
            { idString: "hq_second_floor_collider_hack", position: Vec.create(0, 0), rotation: 0, layer: 2 },
            { idString: "hq_second_floor_collider_hack_2", position: Vec.create(0, 0), rotation: 0, layer: 2 },

            // main entrance
            { idString: "planted_bushes", position: Vec.create(-46, 45.9), rotation: 0 },
            { idString: "planted_bushes", position: Vec.create(-14, 45.9), rotation: 0 },
            { idString: "glass_door", position: Vec.create(-35.1, 36.9), rotation: 0 },
            { idString: "glass_door", position: Vec.create(-25, 36.9), rotation: 2 },

            // main area (hallway/where unbreakable large desk is)
            { idString: "potted_plant", position: Vec.create(-32, -56.5) },
            { idString: "potted_plant", position: Vec.create(10.9, -56.5) },
            { idString: "white_small_couch", position: Vec.create(-41.25, -57.5), rotation: 0 },
            { idString: "white_small_couch", position: Vec.create(17, -71), rotation: 1 },
            { idString: "small_drawer", position: Vec.create(17, -79.5), rotation: 1 },
            { idString: "bookshelf", position: Vec.create(-8, -28.5), rotation: 0 },
            { idString: "trash_can", position: Vec.create(28.5, -28.7) },
            { idString: "file_cart", position: Vec.create(-30, -19), rotation: 1 },
            { idString: "cabinet", position: Vec.create(-43, -9.2), rotation: 1 },
            { idString: "file_cart", position: Vec.create(17, -42), rotation: 0 },

            // near stairs + near stairs room
            { idString: { box: 1, trash_can: 1, grenade_box: 0.5 }, position: Vec.create(-66.5, -67) },
            { idString: "hq_stair", position: Vec.create(-57.7, -100.2), layer: 1, rotation: 3 },
            { idString: "headquarters_wall_1", position: Vec.create(-40.9, -62.7), rotation: 0 },
            { idString: "door", position: Vec.create(-51.15, -62.7), rotation: 0 },
            { idString: "cabinet", position: Vec.create(-42.25, -90.25), lootSpawnOffset: Vec.create(0, 2), rotation: 0 },
            { idString: "trash_bag", position: Vec.create(-53, -90.25) },
            { idString: "door", position: Vec.create(-40, -78.2), rotation: 2 },

            // outside of hq (also windows and metal doors)
            { idString: "fire_exit_railing", position: Vec.create(79.1, -56.6), rotation: 0 },
            { idString: "fire_exit_railing", position: Vec.create(79.1, -56.6), layer: 1, rotation: 0 },
            { idString: "hq_large_stair", position: Vec.create(77.7, -63.49), layer: 1, rotation: 0 },
            { idString: "metal_door", position: Vec.create(-57.55, -39.55), rotation: 3 },
            { idString: "metal_door", position: Vec.create(18.25, -106.4), rotation: 2 },
            { idString: "window", position: Vec.create(18.5, 36.75), rotation: 1 },
            { idString: "window", position: Vec.create(41.6, 36.75), rotation: 1 },
            { idString: "window", position: Vec.create(70.7, -6), rotation: 0 },
            { idString: "dumpster", position: Vec.create(-63, -54.1), rotation: 2, outdoors: true },
            { idString: "trash_bag", position: Vec.create(-69.5, -57.3), outdoors: true },

            // office room
            { idString: "hq_desk_left", position: Vec.create(-8, -17.3), rotation: 0 },
            { idString: "trash_can", position: Vec.create(-15, -8.25) },
            { idString: "grey_office_chair", position: Vec.create(-6.5, -13), rotation: 2 },
            { idString: "hq_desk_right", position: Vec.create(36.6, -17.3), rotation: 0 },
            { idString: "grey_office_chair", position: Vec.create(31.5, -11.5), rotation: 2 },
            { idString: "hq_desk_left", position: Vec.create(59.6, -17.3), rotation: 0 },
            { idString: "grey_office_chair", position: Vec.create(60, -13), rotation: 2 },
            { idString: "headquarters_wall_4", position: Vec.create(3.1, -15.57), rotation: 1 },
            { idString: "headquarters_wall_4", position: Vec.create(25.5, -15.57), rotation: 1 },
            { idString: "headquarters_wall_4", position: Vec.create(48, -15.57), rotation: 1 },
            { idString: "hq_desk_left", position: Vec.create(-8, 29.6), rotation: 2 },
            { idString: "box", position: Vec.create(-1.6, 21) },
            { idString: "grey_office_chair", position: Vec.create(-10, 24), rotation: 0 },
            { idString: "headquarters_wall_9", position: Vec.create(3, 25.25), rotation: 1 },
            { idString: "water_cooler", position: Vec.create(7.5, 25), rotation: 1 },
            { idString: "filing_cabinet", position: Vec.create(8, 32), rotation: 1 },
            { idString: "potted_plant", position: Vec.create(64.5, 5) },
            { idString: "bookshelf", position: Vec.create(42, 6.25), rotation: 0 },
            { idString: "headquarters_wall_6", position: Vec.create(50.05, 10), rotation: 0 },
            { idString: "house_column", position: Vec.create(29, 9.9) },
            { idString: "house_column", position: Vec.create(29, 34.38) },
            { idString: "headquarters_wall_1", position: Vec.create(29, 17), rotation: 1 },
            { idString: "door", position: Vec.create(29, 28.25), rotation: 3 },
            { idString: "gun_case", position: Vec.create(36, 14.5), rotation: 0 },
            { idString: "trash_can", position: Vec.create(66.5, 14.5) },
            { idString: "grey_office_chair", position: Vec.create(56, 16), rotation: 0 },
            { idString: "hq_desk_left", position: Vec.create(59.6, 23.25), rotation: 2 },
            { idString: "office_chair", position: Vec.create(58, 32.25), rotation: 2 },

            // cafeteria (top right)
            { idString: "potted_plant", position: Vec.create(28, -101.1) },
            { idString: "headquarters_wall_3", position: Vec.create(33, -100.9), rotation: 1 },
            { idString: "door", position: Vec.create(33, -91.7), rotation: 1 },
            { idString: "sink", position: Vec.create(39, -101.25), rotation: 0 },
            { idString: randomSmallStove, position: Vec.create(47.5, -101.5), rotation: 0 },
            { idString: "fridge", position: Vec.create(55.7, -101.65), rotation: 0 },
            { idString: "fridge", position: Vec.create(65, -101.65), rotation: 0 },
            { idString: "door", position: Vec.create(64.225, -84), rotation: 2 },

            // under cafeteria
            { idString: "headquarters_wall_4", position: Vec.create(32.7, -73.55), rotation: 1 },
            { idString: "house_column", position: Vec.create(32.7, -64) },
            { idString: "house_column", position: Vec.create(32.75, -42.8) },
            { idString: "headquarters_wall_4", position: Vec.create(32.7, -33.5), rotation: 1 },
            { idString: "vending_machine", position: Vec.create(37.5, -30.5), rotation: 1 },
            { idString: "large_table", position: Vec.create(60.7, -60), rotation: 1, variation: 1 },
            { idString: "chair", position: Vec.create(64.7, -53.6), rotation: 0 },
            { idString: "chair", position: Vec.create(57.2, -53.6), rotation: 0 },
            { idString: "chair", position: Vec.create(64.7, -66.2), rotation: 2 },
            { idString: "chair", position: Vec.create(57.2, -66.2), rotation: 2 },
            { idString: "large_table", position: Vec.create(63.2, -34.4), rotation: 0, variation: 1 },
            { idString: "chair", position: Vec.create(57, -38), rotation: 3 }, // chair dist = 7.5
            { idString: "chair", position: Vec.create(57, -30.5), rotation: 3 },
            { idString: "chair", position: Vec.create(64.5, -42.8), rotation: 2 },

            // toilets area
            { idString: "headquarters_wall_2", position: Vec.create(11.9, -75.8), rotation: 1 },
            { idString: "headquarters_wall_3", position: Vec.create(11.9, -100.9), rotation: 1 },
            { idString: "door", position: Vec.create(11.9, -91.85), rotation: 1 },
            { idString: "headquarters_wall_6", position: Vec.create(-10.9, -62.7), rotation: 0 },
            { idString: "toilet", position: Vec.create(5.5, -69), rotation: 2 },
            { idString: "toilet", position: Vec.create(-9, -69), rotation: 2 },
            { idString: "used_toilet", position: Vec.create(-24, -69), rotation: 2 },
            { idString: "hq_toilet_paper_wall", position: Vec.create(-2, -73.3), rotation: 1 },
            { idString: "hq_toilet_paper_wall", position: Vec.create(-17, -73.3), rotation: 1 },
            { idString: "headquarters_wall_7", position: Vec.create(-5.55, -82.1), rotation: 0 },
            { idString: "headquarters_wall_7", position: Vec.create(9.3, -82.1), rotation: 0 },
            { idString: "headquarters_wall_8", position: Vec.create(-30.9, -82.1), rotation: 0 },
            { idString: "porta_potty_door", position: Vec.create(3.25, -82.1), rotation: 0 },
            { idString: "porta_potty_door", position: Vec.create(-11.7, -82.1), rotation: 0 },
            { idString: "porta_potty_door", position: Vec.create(-23.6, -82.1), rotation: 0 },
            { idString: "trash_can", position: Vec.create(-29, -102) },

            // security room + vault
            { idString: "door", position: Vec.create(-41.1, 13.45), rotation: 3 },
            { idString: "gun_case", position: Vec.create(-47.8, 3.2), rotation: 0 },
            { idString: "grey_office_chair", position: Vec.create(-47, 26), rotation: 0 },
            { idString: "grey_office_chair", position: Vec.create(-60, 18), rotation: 0 },
            { idString: "metal_door", position: Vec.create(-64.25, -0.65), rotation: 0, locked: true },
            { idString: "headquarters_security_desk", position: Vec.create(-55.9, 33.25), rotation: 0, puzzlePiece: true },
            { idString: "gun_mount_mini14", position: Vec.create(-68, -27), lootSpawnOffset: Vec.create(5, 0.5), rotation: 1 },
            { idString: "gun_locker", position: Vec.create(-62.5, -13.5), lootSpawnOffset: Vec.create(0.5, 0), rotation: 0 },
            { idString: "gun_locker", position: Vec.create(-62.5, -19), lootSpawnOffset: Vec.create(0.5, 0), rotation: 2 },
            { idString: "box", position: Vec.create(-53, -19) },
            { idString: "box", position: Vec.create(-51, -14) }

        ] as BuildingObstacle[],
        subBuildings: [
            { idString: "headquarters_second_floor", position: Vec.create(5.6, -0.6), layer: 2 },
            { idString: "headquarters_vault", position: Vec.create(-58.8, -9.4) },
            { idString: "detector", position: Vec.create(-35, 25.5) },
            { idString: "detector", position: Vec.create(-25, 25.5) }
        ]
    },
    {
        idString: "headquarters_second_floor",
        name: "Headquarters Second Floor",
        material: "stone",
        particle: "hq_stone_wall_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20, 40, Vec.create(75.975, -15)),
            RectangleHitbox.fromRect(60, 40, Vec.create(35.975, -5)),
            RectangleHitbox.fromRect(35, 80, Vec.create(95.975, -35)),

            // outer
            RectangleHitbox.fromRect(1.75, 59, Vec.create(65.1, -77.1)), // L, W1
            RectangleHitbox.fromRect(93, 1.75, Vec.create(19.5, -26.5)), // C, W2
            RectangleHitbox.fromRect(1.75, 10, Vec.create(65.1, -32.1)), // L, W3
            RectangleHitbox.fromRect(140, 1.75, Vec.create(-5.5, -105.8)), // T, W4
            RectangleHitbox.fromRect(1.75, 61, Vec.create(-63.2, -63.75)), // L, W5
            RectangleHitbox.fromRect(1.75, 45.8, Vec.create(-76.4, -83.8)), // L, W6
            RectangleHitbox.fromRect(14.6, 1.75, Vec.create(-70, -62)), // L, W7
            // Discussion room perimeter
            RectangleHitbox.fromRect(14.4, 1.75, Vec.create(-69.5, -32.39)),
            RectangleHitbox.fromRect(1.75, 71.4, Vec.create(-76.4, 2.3)),
            RectangleHitbox.fromRect(1.75, 71.4, Vec.create(-27.3, 2.45)),
            RectangleHitbox.fromRect(48, 1.75, Vec.create(-51.7, 37)),

            // inner
            RectangleHitbox.fromRect(14.4, 1.75, Vec.create(-35, -32.39)), // discussion room inner perimeter part
            RectangleHitbox.fromRect(13, 1.75, Vec.create(-57.7, -93.5)),
            RectangleHitbox.fromRect(13, 1.75, Vec.create(-57.7, -77.5)),
            RectangleHitbox.fromRect(1.75, 15, Vec.create(-63.3, -85.5)),
            RectangleHitbox.fromRect(1.75, 15, Vec.create(-52.07, -85.5)),
            RectangleHitbox.fromRect(1.75, 48.8, Vec.create(-39.1, -81.25)),
            RectangleHitbox.fromRect(20, 1.75, Vec.create(8.8, -56)),
            RectangleHitbox.fromRect(36, 1.75, Vec.create(46.95, -56)),
            RectangleHitbox.fromRect(1.75, 12.1, Vec.create(-3.8, -88.9)),
            RectangleHitbox.fromRect(1.75, 23, Vec.create(18.7, -94.425)),
            RectangleHitbox.fromRect(12.1, 1.75, Vec.create(13, -83.8)),

            // squares
            RectangleHitbox.fromRect(4.1, 4.15, Vec.create(-40.3, -54.7)), // L, 1
            RectangleHitbox.fromRect(4.1, 4.15, Vec.create(-3, -54.8)) // C, 2
        ),
        spawnHitbox: RectangleHitbox.fromRect(195, 200, Vec.create(0, -26)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(47, 68, Vec.create(-52, 2.5)),
            RectangleHitbox.fromRect(128, 77.1, Vec.create(0, -66)),
            RectangleHitbox.fromRect(11.5, 40, Vec.create(-70, -86)),
            RectangleHitbox.fromRect(12.4, 15, Vec.create(77.05 - 5.6, -42.5 + 0.6))
        ),
        spawnMode: MapObjectSpawnMode.Grass,
        floorImages: [
            {
                key: "headquarters_second_floor_top",
                position: Vec.create(-5.57, -68.35)
            },
            {
                key: "headquarters_second_floor_bottom",
                position: Vec.create(-5.6, 16)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(47, 68, Vec.create(-52, 2.5)), // discussion room floor
                    RectangleHitbox.fromRect(20.1, 1.7, Vec.create(-52.2, -31.5)), // patch
                    RectangleHitbox.fromRect(104, 49.5, Vec.create(13, -80))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(33.1, 1.8, Vec.create(-22, -54.3)), // patch
                    RectangleHitbox.fromRect(12, 1.8, Vec.create(24, -56)), // patch
                    RectangleHitbox.fromRect(1.88, 11, Vec.create(65.2, -42.5)), // patch
                    RectangleHitbox.fromRect(65.1, 28, Vec.create(31.6, -41)), // FS1
                    RectangleHitbox.fromRect(28, 28, Vec.create(-12.5, -41)), // FS2
                    RectangleHitbox.fromRect(50, 22, Vec.create(-37.25, -43.25)), // FS3
                    RectangleHitbox.fromRect(22.25, 44.3, Vec.create(-51.1, -54.5)) // FS4
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(11, 20.5, Vec.create(-45.7, -86.8)),
                    RectangleHitbox.fromRect(35.5, 11, Vec.create(-57.7, -99.5)),
                    RectangleHitbox.fromRect(11.55, 14, Vec.create(71.9, -42.4)) // large stair landing
                )
            }
        ],
        puzzle: {
            triggerOnSolve: "speaker",
            delay: 500
        },
        sounds: {
            solved: "speaker",
            position: Vec.create(29.71, -79.14),
            maxRange: 105,
            falloff: 0.5
        },
        obstacles: [
            /*  couch parts (note by pap)
                couch_end_right
                couch_end_left
                couch_part
                couch_corner
            */

            { idString: "fire_exit_railing", position: Vec.create(73.5, -56), rotation: 0 },

            // near stairs
            { idString: "small_drawer", position: Vec.create(-58, -62), rotation: 1 },
            { idString: "white_small_couch", position: Vec.create(-58, -70.6), rotation: 1 },

            // main hallway
            { idString: "metal_door", position: Vec.create(65.15, -42.7), rotation: 1 },
            { idString: "cabinet", position: Vec.create(56.5, -52), lootSpawnOffset: Vec.create(-1, 1), rotation: 0 },
            { idString: "file_cart", position: Vec.create(56.5, -32.5), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(-10, -30.5), lootSpawnOffset: Vec.create(0, -2), rotation: 0 },
            { idString: "potted_plant", position: Vec.create(-22.5, -31.8), lootSpawnOffset: Vec.create(1, -1) },
            { idString: "hq_large_cart", position: Vec.create(28.1, -39), rotation: 0 },
            { idString: "white_small_couch", position: Vec.create(17.5, -39), rotation: 2 },
            { idString: "box", position: Vec.create(25.5, -39.5) },

            // big wood room above hallway (has piano and speaker)
            // at this point you can tell I got tired and just spammed stuff to position them one by one
            { idString: "headquarters_boss_desk", position: Vec.create(-28.1, -82), rotation: 0 },
            { idString: "headquarters_wood_table_second_floor", position: Vec.create(62.5, -93.8), rotation: 0 },
            { idString: "office_chair", position: Vec.create(56, -86), rotation: 1 },
            { idString: "office_chair", position: Vec.create(54, -95.25), rotation: 1 },
            { idString: "speaker", position: Vec.create(61, -77), rotation: 3, puzzlePiece: true },
            { idString: "piano", position: Vec.create(55.25, -65), rotation: 1 },
            { idString: "small_drawer", position: Vec.create(47, -100.6), rotation: 0, lootSpawnOffset: Vec.create(0, 2) },
            { idString: "couch_part", position: Vec.create(31.45, -100.9), rotation: 3 },
            { idString: "couch_end_right", position: Vec.create(38, -100.6), rotation: 0 },
            { idString: "couch_end_left", position: Vec.create(24.9, -100.6), rotation: 3 },
            { idString: "small_table", position: Vec.create(31.45, -90.5), rotation: 1, variation: 1 },
            { idString: "couch_corner", position: Vec.create(1.5, -79), rotation: 0 },
            { idString: "couch_part", position: Vec.create(7.45, -78.93), rotation: 3 },
            { idString: "couch_end_right", position: Vec.create(14, -78.6), rotation: 0 },
            { idString: "couch_end_left", position: Vec.create(1.98, -72.25), rotation: 0 },
            { idString: "door", position: Vec.create(24.27, -56), rotation: 0 },
            { idString: "headquarters_wall_1", position: Vec.create(-11.15, -54.5), rotation: 0 },
            { idString: "door", position: Vec.create(-22.4, -54.5), rotation: 2 },
            { idString: "headquarters_wall_5", position: Vec.create(-32.58, -54.5), rotation: 0 },
            { idString: "trash_can", position: Vec.create(-8.5, -58.5) },
            { idString: "potted_plant", position: Vec.create(-33, -59.3) },
            { idString: "house_column", position: Vec.create(-3.6, -69.9) },
            { idString: "headquarters_wall_1", position: Vec.create(-3.6, -77.1), rotation: 1 },
            { idString: "headquarters_wall_1", position: Vec.create(-3.6, -62.7), rotation: 1 },
            { idString: "grey_office_chair", position: Vec.create(-26.8, -90), rotation: 0 },
            { idString: "grey_office_chair", position: Vec.create(-28, -74.5), rotation: 2 },
            { idString: "filing_cabinet", position: Vec.create(-8.4, -101), lootSpawnOffset: Vec.create(0, 2), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(-18.6, -102), lootSpawnOffset: Vec.create(0, 2), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(-31.5, -102), lootSpawnOffset: Vec.create(0, 2), rotation: 0 },
            { idString: "potted_plant", position: Vec.create(1.5, -61) },
            { idString: "bookshelf", position: Vec.create(12, -59.5), rotation: 0 },

            // secret room
            { idString: "secret_door", position: Vec.create(-3.85, -99.4), rotation: 3 },
            { idString: "aegis_golden_case", position: Vec.create(14, -98.5), lootSpawnOffset: Vec.create(-1, 1), rotation: 3 },
            { idString: "secret_door", position: Vec.create(2.5, -83.8), rotation: 0 },

            // ---------------------------------------------------------------------------------------------------------------
            // discussion room? (bottom left)
            // ---------------------------------------------------------------------------------------------------------------
            { idString: "door", position: Vec.create(-47.65, -32.3), rotation: 2 },
            { idString: "door", position: Vec.create(-56.85, -32.3), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(-30.8, -13), lootSpawnOffset: Vec.create(-3, 0), rotation: 1 },
            { idString: "tv", position: Vec.create(-29.2, 1.75), rotation: 0 },
            { idString: "large_drawer", position: Vec.create(-32.3, 1.75), lootSpawnOffset: Vec.create(-3, 0), rotation: 3 },
            { idString: "bookshelf", position: Vec.create(-30.8, 16.5), lootSpawnOffset: Vec.create(-3, 0), rotation: 1 },
            { idString: "potted_plant", position: Vec.create(-71.7, 31.5) },
            { idString: "potted_plant", position: Vec.create(-32.5, 32.2) },
            { idString: "falchion_case", position: Vec.create(-51, 32.25), lootSpawnOffset: Vec.create(0, -2), rotation: 2 },
            { idString: "water_cooler", position: Vec.create(-71.8, -27.5), rotation: 1 },
            { idString: "filing_cabinet", position: Vec.create(-32.5, -27.5), lootSpawnOffset: Vec.create(-2, 0), rotation: 3 },

            // schematic: 3 tables, 2 chairs on each (left & right) with 2 chairs on top and bottom of the whole table group
            { idString: "chair", position: Vec.create(-54.1, -14.6), rotation: 2 },
            { idString: "chair", position: Vec.create(-54.1, 19.1), rotation: 0 },

            { idString: "large_table", variation: 1, position: Vec.create(-54.1, -9), rotation: 1 },
            { idString: "chair", position: Vec.create(-62.5, -9), rotation: 3 }, // rotation1=I_
            { idString: "chair", position: Vec.create(-45.5, -9), rotation: 1 },

            { idString: "large_table", variation: 0, position: Vec.create(-54.1, 2.25), rotation: 1 },
            { idString: "chair", position: Vec.create(-62.5, 2.25), rotation: 3 },
            { idString: "chair", position: Vec.create(-45.5, 2.25), rotation: 1 },

            { idString: "large_table", variation: 0, position: Vec.create(-54.1, 13.4), rotation: 1 },
            { idString: "chair", position: Vec.create(-62.5, 13.4), rotation: 3 },
            { idString: "chair", position: Vec.create(-45.5, 13.4), rotation: 1 }
            // ---------------------------------------------------------------------------------------------------------------
        ] as BuildingObstacle[],
        subBuildings: [{ idString: "headquarters_secret_room", position: Vec.create(7.4, -94.5) }],
        lootSpawners: [{
            position: Vec.create(16, -88),
            table: "hq_skin"
        }]
    },
    // -----------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------------
    // Small HAZEL Bunker (To tease the next update)
    // --------------------------------------------------------------------------------------------------
    {
        idString: "small_bunker_entrance",
        name: "Small Bunker Entrance",
        reflectBullets: true,
        collideWithLayers: Layers.All,
        visibleFromLayers: Layers.All,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            // RectangleHitbox.fromRect(12, 1, Vec.create(0, -7.5)),
            RectangleHitbox.fromRect(1.9, 16.6, Vec.create(6.1, 0.15)),
            RectangleHitbox.fromRect(1.9, 16.6, Vec.create(-6.1, 0.15))
        ),
        spawnHitbox: RectangleHitbox.fromRect(75, 75, Vec.create(0, 0)),
        floorImages: [{
            key: "small_bunker_entrance_floor",
            position: Vec.create(-0.05, 0),
            scale: Vec.create(2.2, 2.2)
        }],
        floors: [
            { type: FloorNames.Metal, hitbox: RectangleHitbox.fromRect(10, 18, Vec.create(0, 0)) }
        ],
        obstacles: [
            { idString: "bunker_stair", position: Vec.create(0, 2.6), rotation: 0 }
        ]
    },
    {
        idString: "small_bunker_main",
        name: "Small Bunker",
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(44.5, 1.7, Vec.create(0, -18)),
            RectangleHitbox.fromRect(1.7, 37.9, Vec.create(21.5, 0)),
            RectangleHitbox.fromRect(1.7, 37.9, Vec.create(-21.5, 0)),
            RectangleHitbox.fromRect(16, 1.7, Vec.create(-13.1, 18)),
            RectangleHitbox.fromRect(16, 1.7, Vec.create(13.1, 18))
        ),
        spawnHitbox: RectangleHitbox.fromRect(55, 55, Vec.create(0, 5)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(42, 34.5),
            RectangleHitbox.fromRect(10, 20, Vec.create(0, 20))
        ),
        floorImages: [
            {
                key: "small_bunker_floor",
                position: Vec.create(0, 0),
                scale: Vec.create(2.2, 2.2)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(42, 34.5),
                    RectangleHitbox.fromRect(10, 4.5, Vec.create(0, 19))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(10, 12, Vec.create(0, 27)),
                layer: -1
            }
        ],
        obstacles: [
            { idString: "small_desk", position: Vec.create(-12.9, 13.9), rotation: 0 },
            { idString: "metal_door", position: Vec.create(0.25, 18.3), rotation: 0 },
            { idString: "control_panel2", position: Vec.create(-14.5, -12.6), rotation: 0 },
            { idString: "box", position: Vec.create(-17, -2), lootSpawnOffset: Vec.create(2, 0) },
            { idString: "box", position: Vec.create(-15, 3.5), lootSpawnOffset: Vec.create(2, 0) },
            { idString: "small_drawer", position: Vec.create(-5, -13), lootSpawnOffset: Vec.create(0, 2), rotation: 0 },
            { idString: "house_wall_13", position: Vec.create(0, -12.5), rotation: 1 },
            { idString: "fridge", position: Vec.create(6.5, -13), lootSpawnOffset: Vec.create(0, 2), rotation: 0 },
            { idString: "small_bed", position: Vec.create(16, -8.5), rotation: 0 },
            { idString: "small_drawer", position: Vec.create(16, 3.3), lootSpawnOffset: Vec.create(-2, 0), rotation: 3 },
            { idString: "flint_crate", position: Vec.create(15, 11.5), lootSpawnOffset: Vec.create(-2, -2) }
        ],
        lootSpawners: [
            { table: "ground_loot", position: Vec.create(0, -0.5) }
        ]
    },
    {
        idString: "small_bunker",
        name: "Small Bunker",
        material: "metal_heavy",
        particle: "metal_particle",
        reflectBullets: true,
        ceilingZIndex: ZIndexes.ObstaclesLayer3,
        visibleFromLayers: Layers.All,
        hitbox: RectangleHitbox.fromRect(12, 1, Vec.create(0, 12.3)),
        ceilingImages: [{
            key: "small_bunker_entrance_ceiling",
            position: Vec.create(0, 18),
            scale: Vec.create(2.35, 2.1)
        }],
        spawnHitbox: RectangleHitbox.fromRect(53, 53, Vec.create(0, 20)),
        ceilingHitbox: RectangleHitbox.fromRect(10, 15, Vec.create(0, 20)),
        obstacles: [
            { idString: { oak_tree: 1, birch_tree: 1 }, position: Vec.create(7.5, 9.8) },
            { idString: { oak_tree: 1, birch_tree: 1 }, position: Vec.create(10, 23) },
            { idString: { oak_tree: 1, birch_tree: 1 }, position: Vec.create(-10, 16) },
            { idString: { oak_tree: 1, birch_tree: 1 }, position: Vec.create(-5, 37) }
        ],
        bulletMask: RectangleHitbox.fromRect(11, 30, Vec.create(0, 30)),
        subBuildings: [
            { idString: "small_bunker_main", position: Vec.create(0, -5), layer: -2 },
            { idString: "small_bunker_entrance", position: Vec.create(0, 20), layer: -1 }
        ]
    },
    {
        idString: "barn_top_floor_shadow",
        name: "Barn Shadow",
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20, 55, Vec.create(-19, 0)),
            RectangleHitbox.fromRect(58, 14, Vec.create(0, -21))
        ),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [
            {
                key: "barn_top_floor_shadow",
                position: Vec.create(0, 0),
                scale: Vec.create(8.5, 8.5)
            }
        ]
    },
    {
        idString: "barn_top_floor",
        name: "Barn Top Floor",
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(17, 1, Vec.create(18.5, -14.9)),
            RectangleHitbox.fromRect(17, 1, Vec.create(-0.5, -14.9)),
            RectangleHitbox.fromRect(1, 14, Vec.create(-9.5, -7.5)),
            RectangleHitbox.fromRect(1, 26.5, Vec.create(-9.5, 14.5)),
            RectangleHitbox.fromRect(1, 21, Vec.create(-20, 5.45)),
            RectangleHitbox.fromRect(9.5, 1, Vec.create(-25, -4.55)),
            RectangleHitbox.fromRect(1, 3, Vec.create(28.25, -17)),
            RectangleHitbox.fromRect(2, 1, Vec.create(29, -18))
        ),
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20.5, 55.5, Vec.create(-19.5, 0)),
            RectangleHitbox.fromRect(60, 14, Vec.create(0, -21))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20.5, 55.5, Vec.create(-19.5, 0)),
            RectangleHitbox.fromRect(61, 14, Vec.create(0, -21))
        ),
        floorImages: [
            {
                key: "barn_top_floor_2",
                position: Vec.create(10, -21.15),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "barn_top_floor_1",
                position: Vec.create(-19.5, 0),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "barn_top_floor_wall",
                position: Vec.create(-23.14, -21.51),
                scale: Vec.create(1.07, 1.07)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(60, 14, Vec.create(0, -21)),
                    RectangleHitbox.fromRect(20, 23, Vec.create(-19.5, -16.5)),
                    RectangleHitbox.fromRect(10, 40, Vec.create(-15, 0)),
                    RectangleHitbox.fromRect(20, 12, Vec.create(-20, 21.5))
                )
            }
        ]
    },
    {
        idString: "barn_exterior", // spanAdjacent layer thingy no work
        name: "Barn Exterior",
        material: "stone",
        particleVariations: 2,
        spawnHitbox: RectangleHitbox.fromRect(120, 92),
        particle: "barn_wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(77, 1.75, Vec.create(-4.5, -41)),
            RectangleHitbox.fromRect(1.75, 45, Vec.create(-55.1, -5.8)),
            RectangleHitbox.fromRect(31.5, 1.75, Vec.create(-40.25, 17)),
            RectangleHitbox.fromRect(48, 1.75, Vec.create(10, 17)),
            RectangleHitbox.fromRect(1.75, 16, Vec.create(33.1, 9)),
            RectangleHitbox.fromRect(1.75, 16, Vec.create(33.1, -32.25))
        )
    },
    {
        idString: "barn_exterior_top_floor", // spanAdjacent layer thingy no work
        name: "Barn Exterior",
        material: "stone",
        particleVariations: 2,
        spawnHitbox: RectangleHitbox.fromRect(120, 92),
        particle: "barn_wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(90, 1.75, Vec.create(-11, -41)),
            RectangleHitbox.fromRect(1.75, 58, Vec.create(-55.1, -11.5)),
            RectangleHitbox.fromRect(31.5, 1.75, Vec.create(-40.25, 17)),
            RectangleHitbox.fromRect(48, 1.75, Vec.create(10, 17)),
            RectangleHitbox.fromRect(1.75, 16, Vec.create(33.1, 9)),
            RectangleHitbox.fromRect(1.75, 16, Vec.create(33.1, -32.25))
        )
    },
    {
        idString: "barn",
        name: "Barn",
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(120, 92),
            // temp fix (bleh)
            RectangleHitbox.fromRect(47, 32, Vec.create(-5, -58))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(85.5, 56, Vec.create(-11, -11.9)),
            RectangleHitbox.fromRect(64, 24, Vec.create(-23, 29.5))
        ),
        floorImages: [
            {
                key: "barn_floor_4",
                position: Vec.create(-22.5, 30),
                scale: Vec.create(2.14, 2.14)
            },
            {
                key: "barn_floor_1",
                position: Vec.create(-27.5, -10),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "barn_floor_3",
                position: Vec.create(44.8, -11.94),
                scale: Vec.create(2.14, 2.14)
            },
            {
                key: "barn_floor_2",
                position: Vec.create(16, -11.9),
                scale: Vec.create(1.07, 1.07)
            },
            {
                key: "barn_floor_explosion",
                position: Vec.create(-50, -37)
            }
        ],
        ceilingImages: [{
            key: "barn_ceiling",
            position: Vec.create(-11, -0.5),
            scale: Vec.create(2.12, 2.12)
        }],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(86, 25.25, Vec.create(12.7, -11.6)),
                    RectangleHitbox.fromRect(22, 59.5, Vec.create(44.7, -11.8)),
                    RectangleHitbox.fromRect(10.25, 5.5, Vec.create(-19.3, 19))
                )
            },

            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(86.25, 16, Vec.create(-11.1, -32.25)),
                    RectangleHitbox.fromRect(24, 40, Vec.create(-42.25, -10)),
                    RectangleHitbox.fromRect(86.25, 16, Vec.create(-11.1, 9))
                )
            },

            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(7, 7, Vec.create(-49.25, 0)),
                    RectangleHitbox.fromRect(7, 7, Vec.create(9.5, -35.25))
                ),
                layer: 1
            }
        ],
        obstacles: [

            // -----------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // -----------------------------------------------------------------------
            // { idString: "cobweb", position: Vec.create(-49.38, -35.17), rotation: 0 },
            // { idString: "cobweb", position: Vec.create(27.33, 11.48), rotation: 2 },
            // { idString: "cobweb", position: Vec.create(-49.38, -35.11), rotation: 0, layer: 2 },
            // -----------------------------------------------------------------------

            { idString: "barn_stair_walls", position: Vec.create(0, 0), rotation: 0 },
            { idString: "barn_stair_walls_2", position: Vec.create(0, 0), rotation: 0 },
            { idString: "barn_stair_walls_top_floor", position: Vec.create(0, 0), rotation: 0, layer: 2 },

            // Columns
            { idString: "bush", position: Vec.create(-33.5, -11.6) },
            { idString: "house_column", position: Vec.create(-33.5, -26.7) },
            { idString: "house_column", position: Vec.create(-15, -26.7) },
            { idString: "house_column", position: Vec.create(4.1, -26.7) },
            { idString: "house_column", position: Vec.create(19.39, 3.36) },
            { idString: "house_column", position: Vec.create(3.6, 3.36) },
            { idString: "house_column", position: Vec.create(-12.36, 3.36) },
            { idString: "house_column", position: Vec.create(-13.59, 40.32) },
            { idString: "house_column", position: Vec.create(8.43, 40.32) },
            { idString: "house_column", position: Vec.create(-32.29, 40.32) },
            { idString: "house_column", position: Vec.create(-53.78, 40.32) },

            { idString: "house_column", position: Vec.create(-33.5, -26.7), layer: 2 },
            { idString: "house_column", position: Vec.create(-15, -26.7), layer: 2 },
            { idString: "house_column", position: Vec.create(4.1, -26.7), layer: 2 },
            { idString: "house_column", position: Vec.create(-33.5, -11.6), layer: 2 },

            // stairs
            { idString: "barn_stair", position: Vec.create(11, -35.35), rotation: 1, layer: 1 },
            { idString: "barn_stair", position: Vec.create(-49.17, -1.9), rotation: 2, layer: 1 },

            // outside
            { idString: "barrel", position: Vec.create(-31.04, 22.49) },
            { idString: "regular_crate", position: Vec.create(-40.5, 23.21) },
            { idString: "ammo_crate", position: Vec.create(-7.85, 24.13) },
            { idString: "regular_crate", position: Vec.create(39.88, 6.83) },
            { idString: "hay_bale", position: Vec.create(41.62, -33.27), rotation: 0 },

            // inside
            { idString: "barn_door", position: Vec.create(33.06, -4.48), rotation: 1 },
            { idString: "barn_door", position: Vec.create(33.06, -18.9), rotation: 3 },
            { idString: "regular_crate", position: Vec.create(-5.16, 10.94) },
            { idString: "ammo_crate", position: Vec.create(-48.33, -18) },
            { idString: "bookshelf", position: Vec.create(29.66, 9.22), rotation: 1 },
            { idString: "bookshelf", position: Vec.create(-25.21, -37.16), rotation: 0 },
            { idString: "box", position: Vec.create(-24, -20.18) },
            { idString: "box", position: Vec.create(8.98, 12.94) },
            { idString: "box", position: Vec.create(14.16, 10.48) },
            { idString: "flint_crate", position: Vec.create(-48.59, 10.82) },
            { idString: "bookshelf", position: Vec.create(12.45, -28.13), rotation: 0 },
            { idString: "gun_case", position: Vec.create(0.92, -34.24), rotation: 3 },
            { idString: "box", position: Vec.create(-4.98, -36.84) },
            { idString: "grenade_crate", position: Vec.create(-28.13, 12.05) },
            { idString: "door", position: Vec.create(-19.78, 17.11), rotation: 2 },
            { idString: "hay_bale", position: Vec.create(6.22, -10.53), rotation: 2 },
            { idString: "box", position: Vec.create(16.55, -10.34) },
            { idString: "hay_bale", position: Vec.create(-15.64, -18.12), rotation: 1 },
            { idString: "hay_bale", position: Vec.create(-37.68, 9.15), rotation: 3 },

            { idString: "house_wall_3", position: Vec.create(19.39, 10.31), rotation: 1 },
            { idString: "house_wall_3", position: Vec.create(3.6, 10.31), rotation: 1 },
            { idString: "house_wall_3", position: Vec.create(-12.36, 10.31), rotation: 1 },

            // top floor stuff
            { idString: "regular_crate", position: Vec.create(-10.4, -34.56), layer: 2 },
            { idString: "gun_case", position: Vec.create(-50.37, -33.89), rotation: 1, layer: 2 },
            { idString: "regular_crate", position: Vec.create(-40.5, -25.5), layer: 2 },
            { idString: "box", position: Vec.create(-20.71, -30.47), layer: 2 },
            { idString: "gun_locker", position: Vec.create(-22.5, -36.7), lootSpawnOffset: Vec.create(0, 1), rotation: 0, layer: 2 },
            { idString: "barrel", position: Vec.create(-49.44, -21.25), layer: 2 },
            { idString: "grenade_box", position: Vec.create(-37.47, 13.07), layer: 2 },
            { idString: "bookshelf", position: Vec.create(-46.82, 13.36), rotation: 0, layer: 2, lootSpawnOffset: Vec.create(0, -1) }
        ],
        subBuildings: [
            { idString: "barn_top_floor_shadow", position: Vec.create(-24.5, -11.7) },
            { idString: "barn_top_floor", position: Vec.create(-23.9, -11.85), layer: 2 },
            { idString: "barn_exterior", position: Vec.create(0, 0) },
            { idString: "barn_exterior_top_floor", position: Vec.create(0, 0), layer: 2 },
            { idString: randomHayShed, position: Vec.create(-5, -58) }
        ]
    },
    {
        idString: "bombed_armory_barracks",
        name: "Armory Barracks",
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            new RectangleHitbox(Vec.create(23.44, -41), Vec.create(25.54, -15.1)),
            new RectangleHitbox(Vec.create(23.44, -4), Vec.create(25.54, 23.13)),
            new RectangleHitbox(Vec.create(23.44, 34.23), Vec.create(25.54, 41)),
            new RectangleHitbox(Vec.create(-25.51, -42.34), Vec.create(-1.91, -40.25)),
            new RectangleHitbox(Vec.create(7, 16.1), Vec.create(24, 18.2)),
            new RectangleHitbox(Vec.create(8.18, -42.34), Vec.create(25.54, -40.25)),
            new RectangleHitbox(Vec.create(-25.51, -41), Vec.create(-23.42, 17.54)),
            new RectangleHitbox(Vec.create(-25.51, 28.57), Vec.create(-23.42, 42.35)),
            new RectangleHitbox(Vec.create(-24, 40.25), Vec.create(-4.33, 42.35)),
            new RectangleHitbox(Vec.create(5.76, 40.25), Vec.create(25.54, 42.35)),
            new RectangleHitbox(Vec.create(4.05, 15.59), Vec.create(7.06, 18.77)),
            new RectangleHitbox(Vec.create(-4.12, -21.39), Vec.create(-1.11, -18.21)),
            new RectangleHitbox(Vec.create(-24, -20.85), Vec.create(-4, -18.76))
        ),
        spawnHitbox: RectangleHitbox.fromRect(50, 84),
        ceilingHitbox: RectangleHitbox.fromRect(50, 84),
        floorImages: [
            {
                key: "armory_barracks_floor_1",
                position: Vec.create(0, -23.2)
            },
            {
                key: "armory_barracks_floor_2",
                position: Vec.create(0, 23.2)
            },

            { key: "window_residue", position: Vec.create(24.5, -9.5), zIndex: ZIndexes.Decals },
            { key: "window_residue", position: Vec.create(24.5, 28.75), zIndex: ZIndexes.Decals },
            { key: "window_residue", position: Vec.create(-24.5, 23), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec.create(-11.2, 8.07), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec.create(14.64, 29.21), scale: Vec.create(0.8, 0.8), zIndex: ZIndexes.Decals },
            { key: "cabinet_residue", position: Vec.create(16, 37.6), zIndex: ZIndexes.Decals },
            { key: "cabinet_residue", position: Vec.create(16, 20.9), zIndex: ZIndexes.Decals }
        ],
        lootSpawners: [
            { table: "cabinet", position: Vec.create(16, 20.9) },
            { table: "cabinet", position: Vec.create(16, 37.6) }
        ],
        ceilingImages: [
            {
                key: "armory_barracks_ceiling_1",
                position: Vec.create(0, -21),
                scale: Vec.create(2, 2)
            },
            {
                key: "armory_barracks_ceiling_2",
                position: Vec.create(0, 20.6),
                scale: Vec.create(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(50, 84)
        }],
        obstacles: [
            { idString: "fridge", position: Vec.create(-19.8, -35.5), rotation: 1 },
            { idString: randomStove, position: Vec.create(-19.8, -26.1), rotation: 1 },
            { idString: "bunk_bed", position: Vec.create(18, -31.25), rotation: 0 },
            { idString: "small_drawer", position: Vec.create(18.4, -18.7), rotation: 0 },
            { idString: "small_drawer", position: Vec.create(-2, -13.6), rotation: 1 },
            { idString: "box", position: Vec.create(-10.95, 25.29) },
            { idString: "box", position: Vec.create(8.04, 11.36) },
            { idString: "bunk_bed", position: Vec.create(-14.43, -13.21), rotation: 1 },
            { idString: "bunk_bed", position: Vec.create(17.95, 7), rotation: 0 },
            { idString: "bunk_bed", position: Vec.create(-14.48, 34.83), rotation: 3 },
            { idString: "door", position: Vec.create(1.15, 41.3), rotation: 0 },
            { idString: "window_damaged", position: Vec.create(24.5, -9.5), rotation: 0 },
            { idString: "window_damaged", position: Vec.create(24.5, 28.75), rotation: 0 },
            { idString: "window_damaged", position: Vec.create(-24.5, 23), rotation: 0 }
        ]
    },
    {
        idString: "bombed_armory_center",
        name: "Armory Center",
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.09, 42, Vec.create(16.38, 0)),
            RectangleHitbox.fromRect(32.34, 2.08, Vec.create(1.24, -21.87)),
            RectangleHitbox.fromRect(2.09, 3.97, Vec.create(-13.88, -19.01)),
            RectangleHitbox.fromRect(2.09, 8.27, Vec.create(-13.88, 16.87)),
            RectangleHitbox.fromRect(2.09, 8.58, Vec.create(-13.88, -2.64)),
            RectangleHitbox.fromRect(32.34, 2.07, Vec.create(1.24, 21.88))
        ),
        spawnHitbox: RectangleHitbox.fromRect(31, 44, Vec.create(1.5, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(31, 44, Vec.create(1.5, 0)),
        floorImages: [
            {
                key: "armory_center_floor_1",
                position: Vec.create(0, -11.5)
            },
            {
                key: "armory_center_floor_2",
                position: Vec.create(0, 11.5)
            },
            {
                key: "window_residue",
                position: Vec.create(-13.9, 7.1)
            },
            {
                key: "chair_residue",
                rotation: 3,
                position: Vec.create(3, 1.7)
            },
            {
                key: "large_refinery_barrel_residue",
                position: Vec.create(-1.42, -10),
                scale: Vec.create(0.8, 0.8)
            },
            {
                key: "small_drawer_residue",
                position: Vec.create(-9.2, 16.8),
                rotation: 2
            },
            {
                key: "explosion_decal",
                position: Vec.create(-13.9, -12.43)
            },
            {
                key: "cabinet_residue",
                position: Vec.create(12.3, -11.6),
                rotation: 2
            }
        ],
        ceilingImages: [
            {
                key: "armory_center_ceiling_1",
                position: Vec.create(1.25, -11),
                scale: Vec.create(2, 2)
            },
            {
                key: "armory_center_ceiling_2",
                position: Vec.create(1.25, 11.4),
                scale: Vec.create(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(31, 44, Vec.create(1.5, 0))
        }],
        obstacles: [
            { idString: "chair", position: Vec.create(10.1, 6), rotation: 0 },
            { idString: "gun_mount_maul", position: Vec.create(2, 19.05), rotation: 2 },
            { idString: "trash_can", position: Vec.create(12, 17.5) },
            { idString: "window_damaged", position: Vec.create(-13.9, 7.1), rotation: 0 }
        ],
        lootSpawners: [
            {
                table: "small_drawer",
                position: Vec.create(-9.2, 16.8)
            },
            {
                table: "cabinet",
                position: Vec.create(12.45, -11.6)
            }
        ]
    },
    {
        idString: "bombed_armory_vault",
        name: "Armory Vault",
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.09, 36, Vec.create(36.03, -2)),
            RectangleHitbox.fromRect(2.09, 11.67, Vec.create(-13.96, -15.16)),
            RectangleHitbox.fromRect(13.4, 2.09, Vec.create(30.37, 16.52)),
            RectangleHitbox.fromRect(74.12, 2.09, Vec.create(0.01, -20.98)),
            RectangleHitbox.fromRect(2.09, 11.07, Vec.create(-13.96, 10.47)),
            RectangleHitbox.fromRect(29, 2.09, Vec.create(21.9, -6.66)),
            RectangleHitbox.fromRect(2.07, 37, Vec.create(-36.01, -2.5)),
            RectangleHitbox.fromRect(35.39, 2.09, Vec.create(-19.35, 16.52)),
            RectangleHitbox.fromRect(4.16, 2.09, Vec.create(10.5, 16.52))
        ),
        spawnHitbox: RectangleHitbox.fromRect(72, 38, Vec.create(0, -2)),
        ceilingHitbox: RectangleHitbox.fromRect(72, 38, Vec.create(0, -2)),
        floorImages: [
            {
                key: "armory_vault_floor_1",
                position: Vec.create(-16.6, 0)
            },
            {
                key: "armory_vault_floor_2",
                position: Vec.create(20.2, 0)
            },
            {
                key: "fridge_residue",
                position: Vec.create(-9, -3.22),
                zIndex: ZIndexes.Decals,
                rotation: 1
            },
            {
                key: "window_residue",
                position: Vec.create(18.1, 16.5),
                zIndex: ZIndexes.Decals,
                rotation: 1.5
            },
            { key: "explosion_decal", position: Vec.create(3.8, 16.5), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(-8, -8), zIndex: ZIndexes.Decals },
            { key: "ammo_crate_residue", position: Vec.create(12.85, -0.45), zIndex: ZIndexes.Decals },
            { key: "barrel_residue", position: Vec.create(30.7, -14), zIndex: ZIndexes.Decals },
            { key: "gun_case_residue", position: Vec.create(-7.5, 12.4), zIndex: ZIndexes.Decals },
            { key: "regular_crate_residue", position: Vec.create(-21.06, 0.29), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec.create(6.43, 7.48), scale: Vec.create(0.8, 0.8), zIndex: ZIndexes.Decals },
            { key: "armory_vault_door_residue", position: Vec.create(-8.37, -1.59), zIndex: ZIndexes.Decals, rotation: 2 },
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    key: "explosion_decal",
                    position: Vec.create(10 + 4.75 * i, -16 - (i % 2 === 0 ? -2 : 0))
                })
            )
        ],
        ceilingImages: [{
            key: "armory_vault_ceiling",
            position: Vec.create(0, -2.5),
            scale: Vec.create(2, 2)
        }],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(72, 38, Vec.create(0, -2))
        }],
        subBuildings: [{
            idString: "armory_inner_vault",
            position: Vec.create(-25, -2.25)
        }],
        obstacles: [
            { idString: "gun_case", position: Vec.create(31.9, 10), rotation: 3 },
            { idString: "ammo_crate", position: Vec.create(29.5, -0.45), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec.create(21.2, -0.45), rotation: 1 },
            { idString: "window_damaged", position: Vec.create(18.1, 16.5), rotation: 1 },
            { idString: "grenade_crate", position: Vec.create(-9.1, -15.9) },
            { idString: "briefcase", position: Vec.create(-28.93, -14.85), rotation: 2 },
            { idString: "barrel", position: Vec.create(-19.59, -9.22) },
            { idString: "barrel", position: Vec.create(-29.81, -6.01) },
            { idString: "box", position: Vec.create(-18.46, -16.58) },
            { idString: "regular_crate", position: Vec.create(-29.77, 10.54) },
            { idString: "box", position: Vec.create(-21.29, 12.33) },
            { idString: "box", position: Vec.create(-17.88, 6.72) },
            { idString: "bombed_armory_vault_wall", position: Vec.create(-13.94, -2.1), rotation: 1 }
        ],
        lootSpawners: [
            {
                position: Vec.create(12.85, -0.45),
                table: "ammo_crate"
            },
            {
                position: Vec.create(-7.5, 12.4),
                table: "gun_case"
            }
        ]
    },
    {
        idString: "bombed_armory",
        name: "Bombed Armory",
        spawnHitbox: RectangleHitbox.fromRect(160, 176),
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        subBuildings: [
            { idString: "bombed_armory_barracks", position: Vec.create(-41.31, 27.86) },
            { idString: "bombed_armory_center", position: Vec.create(55.4, 15.07) },
            { idString: "bombed_armory_vault", position: Vec.create(-35.03, -58.37) },
            { idString: "outhouse", position: Vec.create(-60.9, -65.63), orientation: 2 }
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
            type: FloorNames.Stone,
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
        floorImages: [
            { key: "barrel_residue", position: Vec.create(69.75, 42.55), zIndex: ZIndexes.Decals },
            { key: "barrel_residue", position: Vec.create(24.36, -46.95), zIndex: ZIndexes.Decals },
            { key: "super_barrel_residue", position: Vec.create(34.44, -55.28), zIndex: ZIndexes.Decals },
            { key: "flint_crate_residue", position: Vec.create(33.86, -46.16), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(13.58, -51.92), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(1.76, -22.42), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(20.06, -37.77), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(-4.11, -72.35), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(-39.57, -62.76), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(-3.07, 18.8), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(-26.02, -48.71), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(23.68, -6.46), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec.create(63.5, -78.8), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec.create(66.42, -33.58), zIndex: ZIndexes.Decals },
            { key: "gun_case_residue", position: Vec.create(63.16, -36.39), zIndex: ZIndexes.Decals, rotation: 1 },
            { key: "grenade_crate_residue", position: Vec.create(69.81, -34.24), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec.create(-60.35, -31.87), zIndex: ZIndexes.Decals },
            { key: "outhouse_residue", position: Vec.create(-60.35, -31.87), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec.create(40, 50.33), zIndex: ZIndexes.Decals },
            { key: "regular_crate_residue", position: Vec.create(7.06, 30.07), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec.create(-5.81, 5.18), scale: Vec.create(0.8, 0.8), zIndex: ZIndexes.Decals }
        ],
        obstacles: [
            { idString: "roadblock", position: Vec.create(-44.18, -59.93), rotation: 0 },
            { idString: "roadblock", position: Vec.create(-59.26, -19.45), rotation: 1 },
            { idString: "roadblock", position: Vec.create(-46.35, -30.64), rotation: 0 },
            { idString: "roadblock", position: Vec.create(-25.87, -72.26), rotation: 0 },
            { idString: "roadblock", position: Vec.create(-31.56, -39.5), rotation: 1 },
            { idString: "roadblock", position: Vec.create(38.9, 2.88), rotation: 0 },
            { idString: "roadblock", position: Vec.create(32.42, 50.74), rotation: 0 },
            { idString: "roadblock", position: Vec.create(47.87, 51.55), rotation: 0 },
            { idString: "roadblock", position: Vec.create(39.78, 43.6), rotation: 1 },
            { idString: "roadblock", position: Vec.create(40.44, 57.3), rotation: 1 },
            { idString: "box", position: Vec.create(-3.68, -68.92) },
            { idString: "box", position: Vec.create(-10.09, -68.99) },
            { idString: "box", position: Vec.create(-3.38, -75.34) },

            { idString: "regular_crate", position: Vec.create(63.13, -15.17) },
            { idString: "ammo_crate", position: Vec.create(-7.99, 2.28) },
            { idString: "regular_crate", position: Vec.create(18.06, 27.86) },
            { idString: "regular_crate", position: Vec.create(-64.29, 76.5) },
            { idString: "regular_crate", position: Vec.create(65.01, -56.73) },
            { idString: "regular_crate", position: Vec.create(8.45, -66.79) },

            { idString: "super_barrel", position: Vec.create(-10.72, -7.93) },
            { idString: "super_barrel", position: Vec.create(9.13, 40.34) },

            { idString: "super_barrel", position: Vec.create(70.01, -72.17) },
            { idString: "super_barrel", position: Vec.create(44.51, 78.15), rotation: 0 },
            { idString: "sandbags", position: Vec.create(15.15, 17.92), rotation: 0 },
            { idString: "sandbags", position: Vec.create(-10, 78.77), rotation: 0 },
            { idString: "ammo_crate", position: Vec.create(44.5, 65), rotation: 1 },
            { idString: "sandbags", position: Vec.create(31.6, -36.18), rotation: 0 },
            { idString: "sandbags", position: Vec.create(30.66, -70.69), rotation: 0 },
            { idString: "sandbags", position: Vec.create(18.54, -67.73), rotation: 1 },
            { idString: "m1117", position: Vec.create(48.93, -53.75), rotation: 0, variation: 1 },
            { idString: "gun_case", position: Vec.create(30.66, -28.84), rotation: 0 },
            { idString: "gun_case", position: Vec.create(19.48, 36.69), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec.create(16.55, 9.68), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec.create(33.06, -62.76), rotation: 0 },
            { idString: "grenade_crate", position: Vec.create(-55.29, 78.02) },
            { idString: "ammo_crate", position: Vec.create(50.07, -20.07), rotation: 0 },
            { idString: "barrier", position: Vec.create(13.91, 70.32), rotation: 1 },

            { idString: "fence", position: Vec.create(70.5, -83.93), rotation: 0 },
            { idString: "box", position: Vec.create(-21.45, -28.69) },
            { idString: "box", position: Vec.create(-16.41, -23.86) },

            // top top left
            ...Array.from(
                { length: 10 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-72.1 + 8.45 * i, -83.93),
                    rotation: 0
                })
            ),
            // top middle
            ...Array.from(
                { length: 3 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(23 + 8.45 * i, -83.93),
                    rotation: 0
                })
            ),
            // top right
            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(75.55, -80.45 + 8.45 * i),
                    rotation: 1
                })
            ),
            // right bottom right
            ...Array.from(
                { length: 10 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(75.55, 4.4 + 8.45 * i),
                    rotation: 1
                })
            ),
            // bottom bottom right
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(45.1 + 8.45 * i, 83.93),
                    rotation: 0
                })
            ),
            // bottom bottom left
            ...Array.from(
                { length: 6 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-58 + 8.45 * i, 83.93),
                    rotation: 0
                })
            ),
            // left bottom left
            ...Array.from(
                { length: 9 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-75.55, 7 + 8.45 * i),
                    rotation: 1
                })
            ),
            // left top left
            ...Array.from(
                { length: 9 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-75.55, -78.85 + 8.45 * i),
                    rotation: 1
                })
            )
        ],
        lootSpawners: [
            {
                table: "flint_crate",
                position: Vec.create(33.86, -46.16)
            },
            {
                table: "bombed_armory_skin",
                position: Vec.create(33.86, -45.6)
            },
            {
                table: "gun_case",
                position: Vec.create(63.16, -36.39)
            },
            {
                table: "grenade_crate",
                position: Vec.create(69.81, -34.24)
            },
            {
                table: "regular_crate",
                position: Vec.create(7.06, 30.07)
            }
        ]
    },
    {
        idString: "lodge",
        name: "Lodge",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(10, 10, Vec.create(235.14, 40.53)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(20.05, 57.73)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(-2.67, -4.07)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(-14.9, 15.4)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(9.45, 15.38)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(47, -59.24)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(-47.09, 33.64)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(-47.09, 57.73)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(-26.2, 57.73)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(-3.08, 57.73)),
            RectangleHitbox.fromRect(45.05, 1.55, Vec.create(-3.17, 57.76)),
            RectangleHitbox.fromRect(1.89, 10.18, Vec.create(48.1, 36.23)),
            RectangleHitbox.fromRect(1.92, 21.1, Vec.create(-26.44, -49.7)),
            RectangleHitbox.fromRect(41.7, 1.89, Vec.create(28.2, 41.01)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec.create(-8.41, -21.93)),
            RectangleHitbox.fromRect(1.91, 38.19, Vec.create(21.04, -25.91)),
            RectangleHitbox.fromRect(8.53, 1.89, Vec.create(17.73, -60.3)),
            RectangleHitbox.fromRect(1.9, 4.8, Vec.create(21.04, -57.5)),
            RectangleHitbox.fromRect(1.91, 26.33, Vec.create(-48.17, 18.65)),
            RectangleHitbox.fromRect(1.91, 35.26, Vec.create(48.12, 2.77)),
            RectangleHitbox.fromRect(1.91, 38.99, Vec.create(-48.18, -24.78)),
            RectangleHitbox.fromRect(26.19, 1.89, Vec.create(34.76, -35.84)),
            RectangleHitbox.fromRect(35.43, 1.89, Vec.create(-14.83, -60.26)),
            RectangleHitbox.fromRect(1.9, 6.28, Vec.create(-48.15, -58.09)),
            RectangleHitbox.fromRect(1.91, 33.42, Vec.create(21.04, 23.84)),
            RectangleHitbox.fromRect(5.25, 1.89, Vec.create(-45.28, -60.29)),
            RectangleHitbox.fromRect(1.9, 11.11, Vec.create(48.1, -31.23)),
            RectangleHitbox.fromRect(14.65, 1.89, Vec.create(-20.12, 41.02)),
            RectangleHitbox.fromRect(1.92, 33.2, Vec.create(-26.48, 23.74)),
            RectangleHitbox.fromRect(21.08, 1.89, Vec.create(-37.59, 30.88))
        ),
        collideWithLayers: Layers.Adjacent,
        material: "stone",
        spawnHitbox: RectangleHitbox.fromRect(110, 140),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(97.2, 102, Vec.create(0, -9.5)),
            RectangleHitbox.fromRect(70.5, 18.5, Vec.create(-13.38, 50))
        ),
        floors: [
            {
                type: FloorNames.Carpet,
                hitbox: RectangleHitbox.fromRect(16.55, 30.95, Vec.create(-2.77, 18.55))
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(11.7, 11.48, Vec.create(29.52, -61.28)),
                    RectangleHitbox.fromRect(98.21, 103.21, Vec.create(-0.05, -9.65)),
                    RectangleHitbox.fromRect(71.22, 18.04, Vec.create(-13.5, 50.74)),
                    RectangleHitbox.fromRect(10.25, 11.48, Vec.create(24.33, 48.98)),
                    RectangleHitbox.fromRect(14.46, 11.48, Vec.create(-36.61, 61.35))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.36, 5.23, Vec.create(-37.56, -63.2))
            },
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(11.72, 8.8, Vec.create(-33.26, 24.86)),
                layer: 1
            }
        ],
        floorImages: [
            {
                key: "lodge_floor_top",
                position: Vec.create(0, -33.4)
            },
            {
                key: "lodge_floor_bottom",
                position: Vec.create(0, 33.4)
            }
        ],
        ceilingImages: [
            {
                key: "lodge_second_floor_top",
                position: Vec.create(0, -30.7)
            },
            {
                key: "lodge_second_floor_bottom",
                position: Vec.create(0, 29.9)
            },
            {
                key: "lodge_ceiling_top",
                position: Vec.create(0, -35),
                scale: Vec.create(2, 2)
            },
            {
                key: "lodge_ceiling_bottom",
                position: Vec.create(0, 16.85),
                scale: Vec.create(2, 2)
            }
        ],
        subBuildings: [
            { idString: "lodge_second_floor", position: Vec.create(0, 0), layer: 2 }
        ],
        obstacles: [
            //
            // windows & doors (placed clockwise)
            //

            // windows
            { idString: "window", position: Vec.create(-48.18, 0.04), rotation: 0 },
            { idString: "window", position: Vec.create(-48.2, -49.57), rotation: 0 },
            { idString: "window", position: Vec.create(8.08, -60.36), rotation: 1 },
            { idString: "window", position: Vec.create(48.2, -20.34), rotation: 0 },
            { idString: "window", position: Vec.create(48.19, 25.82), rotation: 0 },

            // outside doors
            { idString: "door", position: Vec.create(-37.14, -60.32), rotation: 0 },
            { idString: "door", position: Vec.create(21.05, -50.48), rotation: 1 },
            { idString: "door", position: Vec.create(1.86, 41), rotation: 2 },
            { idString: "door", position: Vec.create(-7.3, 41), rotation: 0 },

            // inside doors
            { idString: "door", position: Vec.create(-26.44, 2.61), rotation: 3 },
            { idString: "door", position: Vec.create(-32.98, -27.69), rotation: 2 },
            { idString: "door", position: Vec.create(-26.41, -33.66), rotation: 3 },
            { idString: "door", position: Vec.create(27.5, -7.78), rotation: 0 },
            { idString: "door", position: Vec.create(33.13, 6.87), rotation: 1 },
            { idString: "door", position: Vec.create(27.5, 13.49), rotation: 0 },

            //
            // walls
            //

            // front entrance
            { idString: "lodge_wall_1", position: Vec.create(15.5, 15.4), rotation: 0 },
            { idString: "lodge_wall_1", position: Vec.create(-20.92, 15.4), rotation: 0 },

            // bathroom
            { idString: "lodge_wall_4", position: Vec.create(39.67, -7.79), rotation: 0 },
            { idString: "lodge_wall_4", position: Vec.create(39.67, 13.39), rotation: 0 },
            { idString: "lodge_wall_1", position: Vec.create(33.11, -2.34), rotation: 1 },

            // laundry room
            { idString: "lodge_wall_5", position: Vec.create(-37.33, -9.94), rotation: 0 },
            { idString: "lodge_wall_7", position: Vec.create(-26.45, -16), rotation: 1 },
            { idString: "lodge_wall_7", position: Vec.create(-26.45, -16), rotation: 1 },
            { idString: "lodge_wall_2", position: Vec.create(-42.47, -27.75), rotation: 0 },

            // between dining table and couch
            { idString: "lodge_wall_8", position: Vec.create(6.58, -21.93), rotation: 0 },

            //
            // obstacles
            //

            // front porch
            { idString: "barrel", position: Vec.create(-32.09, 36.35) },
            { idString: "trash_bag", position: Vec.create(-38.97, 41.27), rotation: 0 },
            { idString: "box", position: Vec.create(-42.36, 35.52) },

            // front entrance
            { idString: "red_small_couch", position: Vec.create(-21.2, 21.81), rotation: 1 },
            { idString: "red_small_couch", position: Vec.create(15.77, 21.7), rotation: 3 },
            { idString: "large_drawer", position: Vec.create(-21.38, 33.19), rotation: 1 },
            { idString: "bookshelf", position: Vec.create(17.37, 33.09), rotation: 1 },

            // living room/main area
            { idString: "small_table", position: Vec.create(5.5, -5.08), rotation: 1 },
            { idString: "couch_end_left", position: Vec.create(-1.54, -16.37), rotation: 3 },
            { idString: "couch_part", position: Vec.create(5.4, -16.69), rotation: 3 },
            { idString: "couch_end_right", position: Vec.create(12.44, -16.36), rotation: 0 },
            { idString: "small_drawer", position: Vec.create(16.24, 10.36), rotation: 2 },
            { idString: "potted_plant", position: Vec.create(-21.04, 10.09) },
            { idString: "bookshelf", position: Vec.create(-22.83, -18.2), rotation: 1 },

            // big bedroom
            { idString: "bed", position: Vec.create(30.33, -28.95), rotation: 1 },
            { idString: "small_drawer", position: Vec.create(43.56, -30.85), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(40.54, -11.34), rotation: 0 },

            // small bedroom
            { idString: "small_bed", position: Vec.create(30.64, 35.92), rotation: 1 },
            { idString: "potted_plant", position: Vec.create(43.19, 35.93) },
            { idString: "bookshelf", position: Vec.create(40.58, 16.84), rotation: 0 },

            // bathroom
            { idString: randomToilet, position: Vec.create(40.76, -2.19), rotation: 0 },

            // stairs area
            { idString: "bookshelf", position: Vec.create(-34.05, -6.26), rotation: 0 },
            { idString: "box", position: Vec.create(-30.42, 16) },
            { idString: "lodge_railing", position: Vec.create(0, 0), rotation: 0 },
            { idString: "lodge_stair", position: Vec.create(-33.26, 24.86), rotation: 0, layer: 1 },

            // laundry room
            { idString: "trash_can", position: Vec.create(-44.02, -14.19), rotation: 0 },
            { idString: "washing_machine", position: Vec.create(-43.47, -21.73), rotation: 1 },

            // room above laundry room
            { idString: "red_small_couch", position: Vec.create(-43.33, -33.69), rotation: 1 },
            { idString: "box", position: Vec.create(-44.24, -40.98) },
            { idString: "bookshelf", position: Vec.create(-29.82, -52.62), rotation: 1 },

            // kitchen + dining room
            { idString: "kitchen_unit_1", position: Vec.create(-21.78, -49.79), rotation: 1 },
            { idString: "kitchen_unit_3", position: Vec.create(-14.56, -55.59), rotation: 0 },
            { idString: "kitchen_unit_2", position: Vec.create(-22.21, -56.1), rotation: 0 },
            { idString: "fridge", position: Vec.create(-5.09, -55.81), rotation: 0 },
            { idString: randomSmallStove, position: Vec.create(-21.74, -42.92), rotation: 1 },
            { idString: "large_table", position: Vec.create(6.81, -31.59), rotation: 0 },
            { idString: "chair", position: Vec.create(6.92, -40.01), rotation: 2 },
            { idString: "chair", position: Vec.create(13.81, -34.49), rotation: 1 },
            { idString: "chair", position: Vec.create(13.81, -27.38), rotation: 1 },
            { idString: "chair", position: Vec.create(0.13, -34.49), rotation: 3 },
            { idString: "chair", position: Vec.create(0.13, -27.38), rotation: 3 },

            // back porch
            { idString: "round_table", position: Vec.create(41.47, -47.84) },
            { idString: "chair", position: Vec.create(41.52, -41.77), rotation: 0 },
            { idString: "chair", position: Vec.create(41.52, -53.97), rotation: 2 },
            { idString: "potted_plant", position: Vec.create(26.66, -41.09), rotation: 0 }
        ]
    },
    {
        idString: "lodge_second_floor",
        name: "Lodge Second Floor",
        material: "stone",
        particle: "lodge_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(11.73, 1.28, Vec.create(-41.36, 9.24)),
            RectangleHitbox.fromRect(4, 12.72, Vec.create(-37.5, 15.09)),
            RectangleHitbox.fromRect(13.47, 1.53, Vec.create(-2.21, 25.18)),
            RectangleHitbox.fromRect(13.47, 1.51, Vec.create(-2.57, 11.38)),
            RectangleHitbox.fromRect(1.54, 12.05, Vec.create(-10.08, 18.39)),
            RectangleHitbox.fromRect(1.54, 12.05, Vec.create(5.09, 18.24)),
            RectangleHitbox.fromRect(3.01, 3, Vec.create(9.5, -3.79)),
            RectangleHitbox.fromRect(3.01, 3, Vec.create(-10.11, 11.35)),
            RectangleHitbox.fromRect(3.01, 3, Vec.create(5.09, 11.36)),
            RectangleHitbox.fromRect(3.01, 3, Vec.create(5.09, 25.19)),
            RectangleHitbox.fromRect(3.01, 3, Vec.create(-10.11, 25.2)),
            RectangleHitbox.fromRect(3.01, 3, Vec.create(-3.59, -3.8)),
            RectangleHitbox.fromRect(1.91, 57.24, Vec.create(-26.47, -32.12)),
            RectangleHitbox.fromRect(1.91, 46.22, Vec.create(21.09, 19.38)),
            RectangleHitbox.fromRect(1.91, 36.84, Vec.create(-48.15, 13.74)),
            RectangleHitbox.fromRect(1.91, 32.26, Vec.create(48.17, -18.91)),
            RectangleHitbox.fromRect(1.91, 25.25, Vec.create(21.09, -48.11)),
            RectangleHitbox.fromRect(1.91, 34.18, Vec.create(-26.47, 24.4)),
            RectangleHitbox.fromRect(21.82, 1.91, Vec.create(-37.12, 31.37)),
            RectangleHitbox.fromRect(49.02, 1.91, Vec.create(-2.91, 41.53)),
            RectangleHitbox.fromRect(27.79, 1.91, Vec.create(34.02, -3.73)),
            RectangleHitbox.fromRect(46.75, 1.91, Vec.create(-2.85, -59.79)),
            RectangleHitbox.fromRect(40.23, 1.91, Vec.create(29, -35.34)),
            RectangleHitbox.fromRect(19.89, 1.91, Vec.create(-16.31, -35.34)),
            RectangleHitbox.fromRect(23.11, 1.91, Vec.create(-37.07, -3.73))
        ).transform(Vec.create(0, -0.4)),
        spawnHitbox: RectangleHitbox.fromRect(105, 130),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(48.4, 101.5, Vec.create(-2.61, -8.89)),
            RectangleHitbox.fromRect(22.35, 35.02, Vec.create(-37.24, 13.81)),
            RectangleHitbox.fromRect(29.6, 32.08, Vec.create(33.77, -19.63))
        ),
        floors: [
            {
                type: FloorNames.Carpet,
                hitbox: RectangleHitbox.fromRect(17.67, 11.63, Vec.create(0.6, -18.99))
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(48.4, 101.5, Vec.create(-2.61, -8.89)),
                    RectangleHitbox.fromRect(22.35, 35.02, Vec.create(-37.24, 13.81)),
                    RectangleHitbox.fromRect(29.6, 32.08, Vec.create(33.77, -19.63))
                )
            }
        ],
        floorImages: [
            {
                key: "lodge_second_floor_top",
                position: Vec.create(0, -30.7)
            },
            {
                key: "lodge_second_floor_bottom",
                position: Vec.create(0, 29.8)
            }
        ],
        subBuildings: [
            { idString: "lodge_secret_room", position: Vec.create(-2.7, -48) }
        ],
        obstacles: [
            // near stairs
            { idString: "small_drawer", position: Vec.create(-43.29, 0.37), rotation: 1 },
            { idString: "door", position: Vec.create(-26.44, 2.24), rotation: 3 },

            // balcony area
            { idString: "bookshelf", position: Vec.create(-18.85, 37.54), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(-6, 37.54), rotation: 0 },
            { idString: "potted_plant", position: Vec.create(15.46, 35.54), rotation: 0 },
            { idString: "red_small_couch", position: Vec.create(16.23, 1.76), rotation: 3 },

            // fireplace area
            { idString: "lodge_wall_1", position: Vec.create(15.55, -4.28), rotation: 0 },
            { idString: "lodge_wall_6", position: Vec.create(-15.28, -4.28), rotation: 0 },
            { idString: "door", position: Vec.create(3.41, -4.15), rotation: 0 },
            { idString: "couch_end_right", position: Vec.create(-21.24, -16.68), rotation: 1 },
            { idString: "couch_part", position: Vec.create(-15.33, -9.51), rotation: 1 },
            { idString: "couch_corner", position: Vec.create(-21.68, -9.4), rotation: 1 },
            { idString: "couch_end_left", position: Vec.create(-8.23, -9.85), rotation: 1 },
            { idString: "fireplace", position: Vec.create(0.84, -30.75), rotation: 0 },
            { idString: "grenade_box", position: Vec.create(16.62, -31.92), rotation: 0 },
            { idString: "potted_plant", position: Vec.create(15.6, -9.61), rotation: 0 },
            { idString: "large_drawer", position: Vec.create(-15.85, -31.06), rotation: 0 },
            { idString: "tv", position: Vec.create(-15.94, -34.02), rotation: 1 },

            // bathroom
            { idString: "door", position: Vec.create(21.13, -20.44), rotation: 1 },
            { idString: "lodge_wall_3", position: Vec.create(21.15, -10.04), rotation: 1 },
            { idString: "lodge_wall_3", position: Vec.create(21.15, -29.96), rotation: 1 },
            { idString: "small_drawer", position: Vec.create(25.85, -30.78), rotation: 0 },
            { idString: "sink2", position: Vec.create(33.52, -30.95), rotation: 0 },
            { idString: randomToilet, position: Vec.create(41.73, -30.27), rotation: 0 },
            { idString: "bathtub", position: Vec.create(38.2, -9.99), rotation: 0 },
            { idString: "trash_can", position: Vec.create(25.61, -8.19), rotation: 0 },

            // secret room
            { idString: "lodge_secret_room_wall", position: Vec.create(0.67, -35.78), rotation: 0 },
            { idString: "regular_crate", position: Vec.create(-10.13, -53.51), rotation: 0 },
            { idString: "gun_locker", position: Vec.create(13.19, -56.51), rotation: 0 },
            { idString: "box", position: Vec.create(-21.82, -39.93), rotation: 0 },
            { idString: "box", position: Vec.create(-19.8, -45.18), rotation: 0 },
            { idString: "ammo_crate", position: Vec.create(-11.38, -42.41), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(13.5, -39.3), rotation: 0 },
            { idString: "gun_mount_m590m", position: Vec.create(-20.59, -57.46), rotation: 0, lootSpawnOffset: Vec.create(0, 4) }
        ]
    },
    {
        idString: "lodge_secret_room",
        name: "Lodge Secret Room",
        spawnHitbox: RectangleHitbox.fromRect(47.5, 24.5),
        ceilingHitbox: RectangleHitbox.fromRect(47.5, 24.5),
        ceilingImages: [
            {
                key: "lodge_secret_room_ceiling",
                position: Vec.create(0, 0),
                scale: Vec.create(8, 8)
            }
        ],
        ceilingHiddenAlpha: 0.45
    },
    {
        idString: "plumpkin_bunker",
        name: "Plumpkin Bunker",
        material: "metal_heavy",
        reflectBullets: true,
        collideWithLayers: Layers.Equal,
        hitbox: new GroupHitbox(
            // main entrance
            RectangleHitbox.fromRect(2.2, 17.09, Vec.create(35.58, 82.2)),
            RectangleHitbox.fromRect(45.52, 2.2, Vec.create(12.94, 128.31)),
            RectangleHitbox.fromRect(32.67, 2.2, Vec.create(7.67, 114.8)),
            RectangleHitbox.fromRect(2.2, 54.64, Vec.create(-8.72, 100.99)),
            RectangleHitbox.fromRect(14.19, 2.2, Vec.create(-1.02, 74.76)),
            RectangleHitbox.fromRect(2.2, 27.13, Vec.create(35.58, 115.84)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec.create(16.08, 93.57)),
            RectangleHitbox.fromRect(18.12, 2.2, Vec.create(26.65, 74.75)),

            // utility entrance (hay shed)
            RectangleHitbox.fromRect(2.01, 17.11, Vec.create(139.98, -33.33)),
            RectangleHitbox.fromRect(15.15, 2.02, Vec.create(146.54, -24.82)),
            RectangleHitbox.fromRect(2.01, 17.11, Vec.create(153.12, -33.33)),

            // emergency entrance
            RectangleHitbox.fromRect(17.11, 2.01, Vec.create(-145.59, -46.28)),
            RectangleHitbox.fromRect(2.02, 15.15, Vec.create(-137.08, -52.84)),
            RectangleHitbox.fromRect(17.11, 2.01, Vec.create(-145.59, -59.42))
        ),
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(150, 150, Vec.create(13.43, 101.53)),
            RectangleHitbox.fromRect(18, 21, Vec.create(146.55, -32.85)),
            RectangleHitbox.fromRect(21, 18, Vec.create(-145.11, -52.85)),

            // hack to prevent pumpkins from spawning in rivers
            new CircleHitbox(5, Vec.create(34.56, 45.47)),
            new CircleHitbox(5, Vec.create(-15.32, 11.51)),
            new CircleHitbox(5, Vec.create(-37.9, 70.13)),
            new CircleHitbox(5, Vec.create(85.4, 92.41)),
            new CircleHitbox(5, Vec.create(53.68, 124.53)),
            new CircleHitbox(5, Vec.create(52.75, 177.7)),
            new CircleHitbox(5, Vec.create(-1.25, 149.53)),
            new CircleHitbox(5, Vec.create(-30.64, 120.28)),
            new CircleHitbox(5, Vec.create(-78.35, 143.03)),
            new CircleHitbox(5, Vec.create(-124.64, 77.28)),
            new CircleHitbox(5, Vec.create(-44.87, 186.93)),
            new CircleHitbox(5, Vec.create(33.95, 221.81)),
            new CircleHitbox(5, Vec.create(137.84, 147.78)),
            new CircleHitbox(5, Vec.create(175.47, 111.61)),
            new CircleHitbox(5, Vec.create(137.14, 21.4)),
            new CircleHitbox(5, Vec.create(-94.06, 8.14)),
            new CircleHitbox(5, Vec.create(75.8, -45.12)),
            new CircleHitbox(5, Vec.create(136.98, 211.13)),
            new CircleHitbox(5, Vec.create(-40.07, -49.44)),
            new CircleHitbox(5, Vec.create(-170.08, 137.13)),
            new CircleHitbox(5, Vec.create(-62.39, 247.93)),
            new CircleHitbox(5, Vec.create(112.61, 281.56))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(45, 54, Vec.create(13.43, 101.53)),
            RectangleHitbox.fromRect(14, 17, Vec.create(146.55, -32.85)),
            RectangleHitbox.fromRect(17, 14, Vec.create(-145.11, -52.85))
        ),
        ceilingZIndex: ZIndexes.ObstaclesLayer3,
        floors: [{
            type: FloorNames.Stone,
            hitbox: RectangleHitbox.fromRect(46.52, 55.74, Vec.create(13.43, 101.53))
        }],
        floorImages: [
            { key: "plumpkin_bunker_main_entrance_floor", position: Vec.create(13.43, 101.5) },
            { key: "plumpkin_bunker_entrance_floor", position: Vec.create(146.55, -32.85), rotation: Math.PI },
            { key: "plumpkin_bunker_entrance_floor", position: Vec.create(-145.11, -52.85), rotation: Math.PI / 2 }
        ],
        floorZIndex: ZIndexes.BuildingsFloor + 0.5,
        ceilingImages: [
            { key: "plumpkin_bunker_main_entrance_ceiling", position: Vec.create(13.43, 101.5), scale: Vec.create(2, 2) },
            { key: "plumpkin_bunker_entrance_ceiling", position: Vec.create(146.55, -32.85), rotation: Math.PI },
            { key: "plumpkin_bunker_entrance_ceiling", position: Vec.create(-145.11, -52.85), rotation: Math.PI / 2 }
        ],
        obstacles: [
            { idString: "plumpkin_bunker_stair", position: Vec.create(0.39, 121.67), rotation: 0, layer: -1 },
            { idString: "plumpkin_bunker_stair", position: Vec.create(146.52, -33.84), rotation: 1, layer: -1 },
            { idString: "plumpkin_bunker_stair", position: Vec.create(-146.1, -52.88), rotation: 2, layer: -1 },

            // emergency entrance
            { idString: "dormant_oak_tree", position: Vec.create(-144.44, -62.77) },
            { idString: "dormant_oak_tree", position: Vec.create(-129.73, -51.34) },
            { idString: "dormant_oak_tree", position: Vec.create(-139.02, -43.52) },
            { idString: "dormant_oak_tree", position: Vec.create(-155.7, -43.14) },
            { idString: "dormant_oak_tree", position: Vec.create(-156.96, -60.07) },
            { idString: "dormant_oak_tree", position: Vec.create(-129.59, -61.37) },

            // main entrance
            { idString: "box", position: Vec.create(6.76, 109.03) },
            { idString: "regular_crate", position: Vec.create(-1.21, 91.53) },
            { idString: "regular_crate", position: Vec.create(-2.14, 81.36) },
            { idString: "ammo_crate", position: Vec.create(-1.44, 107.44) },
            { idString: "grenade_crate", position: Vec.create(22.35, 79.86) },
            { idString: "barrel", position: Vec.create(30.12, 80.17) },
            { idString: "gun_case", position: Vec.create(14.92, 110.4), rotation: 2 },
            { idString: "metal_auto_door", position: Vec.create(29.27, 114.78), rotation: 0 },
            // pumpkin patch
            { idString: "large_pumpkin", position: Vec.create(34.56, 45.47) },
            { idString: "large_pumpkin", position: Vec.create(-15.32, 11.51) },
            { idString: "large_pumpkin", position: Vec.create(-37.9, 70.13) },
            { idString: "large_pumpkin", position: Vec.create(85.4, 92.41) },
            { idString: "large_pumpkin", position: Vec.create(53.68, 124.53) },
            { idString: "large_pumpkin", position: Vec.create(52.75, 177.7) },
            { idString: "large_pumpkin", position: Vec.create(-1.25, 149.53) },
            { idString: "large_pumpkin", position: Vec.create(-30.64, 120.28) },
            { idString: "large_pumpkin", position: Vec.create(-78.35, 143.03) },
            { idString: "large_pumpkin", position: Vec.create(-124.64, 77.28) },
            { idString: "large_pumpkin", position: Vec.create(-44.87, 186.93) },
            { idString: "large_pumpkin", position: Vec.create(33.95, 221.81) },
            { idString: "large_pumpkin", position: Vec.create(137.84, 147.78) },
            { idString: "large_pumpkin", position: Vec.create(175.47, 111.61) },
            { idString: "large_pumpkin", position: Vec.create(137.14, 21.4) },
            { idString: "large_pumpkin", position: Vec.create(-94.06, 8.14) },
            { idString: "large_pumpkin", position: Vec.create(75.8, -45.12) },
            { idString: "large_pumpkin", position: Vec.create(136.98, 211.13) },
            { idString: "large_pumpkin", position: Vec.create(-40.07, -49.44) },
            { idString: "large_pumpkin", position: Vec.create(-170.08, 137.13) },
            { idString: "large_pumpkin", position: Vec.create(-62.39, 247.93) },
            { idString: "large_pumpkin", position: Vec.create(112.61, 281.56) },
            { idString: "vibrant_bush", position: Vec.create(-19.11, 42.93) },
            { idString: "vibrant_bush", position: Vec.create(-106.56, 41.65) },
            { idString: "vibrant_bush", position: Vec.create(-104.52, 119.49) },
            { idString: "vibrant_bush", position: Vec.create(-122.06, 189.4) },
            { idString: "vibrant_bush", position: Vec.create(0.57, 229.84) },
            { idString: "vibrant_bush", position: Vec.create(92.86, 213.36) },
            { idString: "vibrant_bush", position: Vec.create(187.25, 173.39) },
            { idString: "vibrant_bush", position: Vec.create(88.89, 135.27) },
            { idString: "vibrant_bush", position: Vec.create(156.44, 65.25) },
            { idString: "vibrant_bush", position: Vec.create(95.86, -18.52) }

            // halloween only
            // { idString: "jack_o_lantern", position: Vec.create(24.07, 66.73) },
            // { idString: "jack_o_lantern", position: Vec.create(-0.54, 66.73) },
            // { idString: "jack_o_lantern", position: Vec.create(43.69, 84.06) },
            // { idString: "jack_o_lantern", position: Vec.create(43.69, 106.7) }
        ],
        subBuildings: [
            { idString: "hay_shed_4", position: Vec.create(40.03, 146.55), orientation: 1 },
            { idString: "plumpkin_bunker_main", position: Vec.create(0, 0), layer: -2 }
        ]
    },
    {
        idString: "plumpkin_bunker_main",
        name: "Plumpkin Bunker Main",
        material: "metal_heavy",
        particle: "plumpkin_bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        spawnHitbox: RectangleHitbox.fromRect(350, 290),
        sounds: {
            normal: "plumpkin_bunker_ambience",
            position: Vec.create(119.27, -51.22),
            maxRange: 350,
            falloff: 1
        },
        floorImages: [
            {
                key: "plumpkin_bunker_floor",
                position: Vec.create(0, 0),
                scale: Vec.create(1.506, 1.506)
            }

            // halloween only.
            // {
            //     key: "windowed_vault_door_residue",
            //     position: Vec.create(24.88, -104.54),
            //     zIndex: ZIndexes.DeadObstacles,
            //     scale: Vec.create(0.9, 0.9)
            // }
        ],
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.01, 49.16, Vec.create(-89.3, 1.6)),
            RectangleHitbox.fromRect(26.92, 2.01, Vec.create(-64.74, -21.75)),
            RectangleHitbox.fromRect(1.99, 70.06, Vec.create(139.89, -60.88)),
            RectangleHitbox.fromRect(83.54, 2, Vec.create(52.84, 75.19)),
            RectangleHitbox.fromRect(2, 4.38, Vec.create(-104, -47.53)),
            RectangleHitbox.fromRect(17.01, 1.99, Vec.create(-144.6, -59.49)),
            RectangleHitbox.fromRect(1.96, 19.04, Vec.create(-38.12, -47.89)),
            RectangleHitbox.fromRect(5.66, 19.78, Vec.create(10.43, 35.72)),
            //   RectangleHitbox.fromRect(51.43, 1.67, Vec.create(-13.39, -56.93)),
            RectangleHitbox.fromRect(87.54, 2, Vec.create(97.13, -96.08)),
            RectangleHitbox.fromRect(24.64, 2, Vec.create(0.9, 25.83)),
            RectangleHitbox.fromRect(1.98, 20.08, Vec.create(52.67, -66.98)),
            RectangleHitbox.fromRect(40.59, 2, Vec.create(46.12, -56.79)),
            RectangleHitbox.fromRect(12.37, 31.09, Vec.create(30.73, -42.26)),
            RectangleHitbox.fromRect(12.92, 2, Vec.create(133.48, -76.02)),
            RectangleHitbox.fromRect(24.24, 2, Vec.create(104.45, -76.02)),
            RectangleHitbox.fromRect(1.98, 37.97, Vec.create(153.18, -24.41)),
            RectangleHitbox.fromRect(4.17, 2, Vec.create(16.37, -104.9)),
            RectangleHitbox.fromRect(20.42, 2, Vec.create(89.38, -56.78)),
            RectangleHitbox.fromRect(13.2, 2, Vec.create(133.63, -26.83)),
            RectangleHitbox.fromRect(15.5, 24.12, Vec.create(-12.77, -115.96)),
            RectangleHitbox.fromRect(14.49, 2, Vec.create(-44.28, -26.84)),
            RectangleHitbox.fromRect(2.01, 23.51, Vec.create(-153.18, -70.24)),
            RectangleHitbox.fromRect(27.86, 2.15, Vec.create(-64.21, -56.71)),
            RectangleHitbox.fromRect(18.56, 1.98, Vec.create(-68.97, -104.89)),
            RectangleHitbox.fromRect(1.96, 48.84, Vec.create(99.33, -51.3)),
            RectangleHitbox.fromRect(29.17, 2, Vec.create(67.27, -76.02)),
            RectangleHitbox.fromRect(96.85, 2, Vec.create(-12.3, -128.27)),
            RectangleHitbox.fromRect(1.99, 17.42, Vec.create(52.67, -96.2)),
            RectangleHitbox.fromRect(1.99, 24.16, Vec.create(35.13, -116.35)),
            RectangleHitbox.fromRect(22.36, 2, Vec.create(42.49, -104.9)),
            RectangleHitbox.fromRect(1.99, 24.76, Vec.create(-60.68, -116.89)),
            RectangleHitbox.fromRect(1.99, 24.16, Vec.create(14.55, -115.97)),
            RectangleHitbox.fromRect(1.99, 24.16, Vec.create(-40.1, -115.99)),
            RectangleHitbox.fromRect(75.09, 2, Vec.create(-115.96, -80.99)),
            RectangleHitbox.fromRect(1.91, 7.89, Vec.create(-78.42, -53.84)),
            RectangleHitbox.fromRect(1.99, 37.13, Vec.create(-78.37, -86.84)),
            RectangleHitbox.fromRect(9.06, 1.99, Vec.create(-107.68, -46.33)),
            RectangleHitbox.fromRect(30.46, 1.99, Vec.create(-137.93, -46.32)),
            RectangleHitbox.fromRect(2.01, 23.05, Vec.create(-123.7, -58.09)),
            RectangleHitbox.fromRect(13.42, 82.9, Vec.create(-147.42, 66.29)),
            RectangleHitbox.fromRect(53.8, 2, Vec.create(-78.11, -50.17)),
            RectangleHitbox.fromRect(61.41, 2, Vec.create(85.9, -26.84)),
            RectangleHitbox.fromRect(2.01, 73.45, Vec.create(-153.16, -10.59)),
            RectangleHitbox.fromRect(84.24, 2, Vec.create(-33.69, 128.28)),
            RectangleHitbox.fromRect(1.96, 19.48, Vec.create(12.37, -48.03)),
            RectangleHitbox.fromRect(69.78, 24.38, Vec.create(-109.08, 118.19)),
            RectangleHitbox.fromRect(2.01, 8.2, Vec.create(-129.22, 79.35)),
            RectangleHitbox.fromRect(41.85, 2, Vec.create(-98.02, 25.83)),
            RectangleHitbox.fromRect(32.42, 2, Vec.create(28.5, -26.84)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec.create(-124.02, 49.94)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec.create(-10.78, 44.56)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec.create(-10.77, 65.55)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec.create(-31.87, 65.48)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec.create(-31.82, 44.51)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec.create(-73.25, 49.94)),
            RectangleHitbox.fromRect(2.01, 55.95, Vec.create(12.29, 0.14)),
            RectangleHitbox.fromRect(78.65, 2, Vec.create(-90.89, 75.19)),
            RectangleHitbox.fromRect(2.01, 102.12, Vec.create(-51.28, -5.46)),
            RectangleHitbox.fromRect(34.66, 2, Vec.create(-49.67, 25.83)),
            RectangleHitbox.fromRect(5.66, 19.78, Vec.create(10.44, 76.44)),
            RectangleHitbox.fromRect(17.13, 31.24, Vec.create(-0.15, 100.38)),
            RectangleHitbox.fromRect(60.85, 82.78, Vec.create(123.02, 33.94)),
            RectangleHitbox.fromRect(2.01, 28.58, Vec.create(-51.29, 80.83)),
            RectangleHitbox.fromRect(8.96, 2, Vec.create(-6.94, 85.76)),
            RectangleHitbox.fromRect(18.73, 2, Vec.create(-41.7, 85.75)),
            RectangleHitbox.fromRect(19.92, 2, Vec.create(-42.29, 115.8)),
            RectangleHitbox.fromRect(34.7, 2, Vec.create(-67.64, 94.86)),
            RectangleHitbox.fromRect(2.01, 30.75, Vec.create(-33.34, 100.84)),
            RectangleHitbox.fromRect(2.01, 8.2, Vec.create(-83.99, 79.32)),
            RectangleHitbox.fromRect(3.03, 3.03, Vec.create(-20.53, 100.56)),
            RectangleHitbox.fromRect(18.98, 9.46, Vec.create(119.57, -41.97)),
            RectangleHitbox.fromRect(18.98, 9.46, Vec.create(119.57, -60.91)),
            RectangleHitbox.fromRect(16.22, 6.09, Vec.create(132.23, -92.07)),
            RectangleHitbox.fromRect(13.99, 25.08, Vec.create(90.87, -42.13)),
            new CircleHitbox(6.43, Vec.create(44.59, -64.9)),
            new CircleHitbox(10.32, Vec.create(-40.12, -82.14)),
            new CircleHitbox(10.32, Vec.create(14.73, -82.06))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14.45, 31.53, Vec.create(18.97, -42.02)),
            RectangleHitbox.fromRect(26.15, 30.85, Vec.create(-91.47, -65.47)),
            RectangleHitbox.fromRect(14.45, 31.53, Vec.create(-44.73, -41.96)),
            RectangleHitbox.fromRect(41.44, 50.28, Vec.create(119.66, -52.06)),
            RectangleHitbox.fromRect(87.56, 20.07, Vec.create(96.58, -86.2)),
            RectangleHitbox.fromRect(32.65, 20.07, Vec.create(-67.85, 85.24)),
            RectangleHitbox.fromRect(16.05, 13.43, Vec.create(0.39, 121.47)),
            RectangleHitbox.fromRect(48.96, 34.73, Vec.create(-127.96, -63.52)),
            RectangleHitbox.fromRect(14.45, 31.53, Vec.create(18.97, -42.02)),
            RectangleHitbox.fromRect(26.15, 30.85, Vec.create(-91.47, -65.47)),
            RectangleHitbox.fromRect(14.45, 31.53, Vec.create(-44.73, -41.96)),
            RectangleHitbox.fromRect(41.44, 50.28, Vec.create(119.66, -52.06)),
            RectangleHitbox.fromRect(87.56, 20.07, Vec.create(96.58, -86.2)),
            RectangleHitbox.fromRect(32.65, 20.07, Vec.create(-67.85, 85.24)),
            RectangleHitbox.fromRect(16.05, 13.43, Vec.create(0.39, 121.47)),
            RectangleHitbox.fromRect(48.96, 34.73, Vec.create(-127.96, -63.52)),
            RectangleHitbox.fromRect(64.01, 70.98, Vec.create(-121.09, -10.57)),
            RectangleHitbox.fromRect(49.34, 81.6, Vec.create(-12.84, -15.94)),
            RectangleHitbox.fromRect(16.81, 52.06, Vec.create(-42.96, -0.67)),
            RectangleHitbox.fromRect(51.85, 27.66, Vec.create(-77.15, -35.9)),
            RectangleHitbox.fromRect(296.09, 235.94, Vec.create(5.94, -10.79)),
            RectangleHitbox.fromRect(68.6, 46.75, Vec.create(-41.95, 104.97))
        ),
        floors: [
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(14.45, 31.53, Vec.create(18.97, -42.02)),
                    RectangleHitbox.fromRect(26.15, 30.85, Vec.create(-91.47, -65.47)),
                    RectangleHitbox.fromRect(14.45, 31.53, Vec.create(-44.73, -41.96)),
                    RectangleHitbox.fromRect(41.44, 50.28, Vec.create(119.66, -52.06)),
                    RectangleHitbox.fromRect(87.56, 20.07, Vec.create(96.58, -86.2)),
                    RectangleHitbox.fromRect(32.65, 20.07, Vec.create(-67.85, 85.24)),
                    RectangleHitbox.fromRect(16.05, 13.43, Vec.create(0.39, 121.47)),
                    RectangleHitbox.fromRect(48.96, 34.73, Vec.create(-127.96, -63.52))
                )
            },
            { // stairs
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(16.07, 11.3, Vec.create(0.39, 121.67)),
                    RectangleHitbox.fromRect(11.3, 16.07, Vec.create(146.52, -33.84)),
                    RectangleHitbox.fromRect(16.07, 11.3, Vec.create(-146.1, -52.88))
                ),
                layer: -1
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(64.01, 70.98, Vec.create(-121.09, -10.57)),
                    RectangleHitbox.fromRect(49.34, 81.6, Vec.create(-12.84, -15.94)),
                    RectangleHitbox.fromRect(16.81, 52.06, Vec.create(-42.96, -0.67)),
                    RectangleHitbox.fromRect(51.85, 27.66, Vec.create(-77.15, -35.9))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(296.09, 235.94, Vec.create(5.94, -10.79)),
                    RectangleHitbox.fromRect(68.6, 46.75, Vec.create(-41.95, 104.97))
                )
            }
        ],
        puzzle: {
            triggerOnSolve: "blue_metal_auto_door",
            solvedSound: true,
            soundPosition: Vec.create(-95.68, 46.52),
            setSolvedImmediately: true,
            delay: 1000
        },
        lootSpawners: [
            { table: "plumpkin_bunker_skin", position: Vec.create(-49.23, -110.21) }
        ],
        obstacles: [
            // security office
            { idString: "blue_metal_auto_door", position: Vec.create(-33.27, 122.05), rotation: 3 },
            { idString: "blue_metal_auto_door", position: Vec.create(-135.45, 75.18), rotation: 2 },
            { idString: "cabinet", position: Vec.create(-92.46, 78.93), rotation: 0 },
            { idString: "cabinet", position: Vec.create(-120.63, 78.99), rotation: 0 },
            { idString: "gun_locker", position: Vec.create(-106.58, 78.99), rotation: 0 },
            { idString: "ammo_crate", position: Vec.create(-107.64, 100.57), rotation: 0 },
            { idString: "barrel", position: Vec.create(-116.75, 101.47), rotation: 0 },
            { idString: "gun_case", position: Vec.create(-135.03, 102.56), rotation: 2 },
            { idString: "door", position: Vec.create(-75.25, 100.5), rotation: 1 },
            { idString: "grenade_crate", position: Vec.create(-70.23, 113.01) },
            { idString: "flint_crate", position: Vec.create(-69.01, 122.1) },
            { idString: "grey_office_chair", position: Vec.create(-46.79, 104.25), rotation: 1 },
            { idString: "potted_plant", position: Vec.create(-38.35, 90.99), rotation: 0 },
            { idString: "control_panel_small", position: Vec.create(-46.14, 91.33), rotation: 0 },
            { idString: "hq_desk_right", position: Vec.create(-40.79, 104.56), rotation: 3 },
            { idString: "pipe", position: Vec.create(-136.1, 95.9), rotation: 0, variation: 3 },

            // vault
            { idString: "metal_door", position: Vec.create(-84.12, 88.37), rotation: 1 },
            {
                idString: { gun_mount_dual_rsh12: 0.1, gun_mount_mini14: 1, gun_mount_m590m: 0.2 },
                position: Vec.create(-54.09, 84.63),
                rotation: 3,
                lootSpawnOffset: Vec.create(-4, 0)
            },
            { idString: "regular_crate", position: Vec.create(-62.71, 81.57) },
            { idString: { box: 1, grenade_box: 1 }, position: Vec.create(-66.18, 89.31) },
            { idString: { box: 1, grenade_box: 1 }, position: Vec.create(-60.05, 90.57) },
            { idString: "trash_can", position: Vec.create(-79.69, 79.48) },

            // center area with plumpkin logo
            { idString: "metal_auto_door", position: Vec.create(8.67, 61.27), rotation: 1 },
            { idString: "metal_auto_door", position: Vec.create(8.67, 50.87), rotation: 3 },
            { idString: "metal_auto_door", position: Vec.create(-51.27, 50.83), rotation: 3 },
            { idString: "metal_auto_door", position: Vec.create(-51.27, 61.31), rotation: 1 },
            { idString: "metal_auto_door", position: Vec.create(-16.65, 25.89), rotation: 2 },
            { idString: "metal_auto_door", position: Vec.create(-27.13, 25.89), rotation: 0 },
            { idString: "metal_auto_door", position: Vec.create(-27.13, 85.62), rotation: 0 },
            { idString: "metal_auto_door", position: Vec.create(-16.65, 85.62), rotation: 2 },
            { idString: "couch", position: Vec.create(-31.89, 54.94), rotation: 0 },
            { idString: "couch", position: Vec.create(-10.72, 54.94), rotation: 2 },
            { idString: "potted_plant", position: Vec.create(-45.97, 80.45) },
            { idString: "potted_plant", position: Vec.create(-45.46, 31.26) },
            { idString: "potted_plant", position: Vec.create(3.11, 31.37) },
            { idString: "water_cooler", position: Vec.create(3.65, 81.22), rotation: 2 },
            { idString: "trash_can", position: Vec.create(-3.25, 81.24) },

            // west office
            { idString: "square_desk", position: Vec.create(-98.23, 50.04), rotation: 0 },
            { idString: "button", position: Vec.create(-95.68, 46.52), rotation: 3, variation: 1, puzzlePiece: true },
            { idString: "bookshelf", position: Vec.create(-110.44, 29.36), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(-97.48, 29.36), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(-109.18, 71.58), rotation: 0 },
            { idString: "white_small_couch", position: Vec.create(-57.77, 70.03), rotation: 2 },
            { idString: "small_drawer", position: Vec.create(-66.36, 70.25), rotation: 2 },
            { idString: "water_cooler", position: Vec.create(-119.28, 70.58), rotation: 2 },
            { idString: "filing_cabinet", position: Vec.create(-126.68, 70.11), rotation: 2 },
            { idString: "large_drawer", position: Vec.create(-59.14, 30.99), rotation: 0 },

            // bathroom
            { idString: "door", position: Vec.create(-71.61, 25.97), rotation: 0 },
            { idString: "sink2", position: Vec.create(-56.09, 20.93), rotation: 3 },
            { idString: "sink2", position: Vec.create(-56.09, 13.38), rotation: 3 },
            { idString: "hq_toilet_paper_wall", position: Vec.create(-61.88, 7.31), rotation: 2 },
            { idString: "hq_toilet_paper_wall", position: Vec.create(-61.88, -7.84), rotation: 2 },
            { idString: "porta_potty_door", position: Vec.create(-70.58, 2.03), rotation: 1 },
            { idString: "porta_potty_door", position: Vec.create(-70.58, -13.06), rotation: 1 },
            { idString: randomToilet, position: Vec.create(-57.06, 0.82), rotation: 3 },
            { idString: randomToilet, position: Vec.create(-57.06, -14.38), rotation: 3 },
            { idString: "headquarters_wall_7", position: Vec.create(-70.63, -19.18), rotation: 1 },
            { idString: "headquarters_wall_7", position: Vec.create(-70.63, -4.19), rotation: 1 },
            { idString: "potted_plant", position: Vec.create(-83.85, 20.77) },
            { idString: "door", position: Vec.create(-82.81, -21.71), rotation: 0 },

            // sleeping quarters
            { idString: "metal_door", position: Vec.create(-117.2, -46.26), rotation: 0 },
            { idString: "bookshelf", position: Vec.create(-96.31, -46.66), rotation: 0 },
            { idString: "potted_plant", position: Vec.create(-56.67, -27.04) },
            { idString: "bunk_bed", position: Vec.create(-57.95, -39.8), rotation: 0 },
            { idString: "bunk_bed", position: Vec.create(-80.86, -43.68), rotation: 1 },
            { idString: "bunk_bed", position: Vec.create(-99.45, -19.03), rotation: 3 },
            { idString: "bunk_bed", position: Vec.create(-99.45, 0.49), rotation: 3 },
            { idString: "bunk_bed", position: Vec.create(-99.45, 19.14), rotation: 3 },
            { idString: "small_table", position: Vec.create(-135.52, -30.65), rotation: 1 },
            { idString: "large_drawer", position: Vec.create(-140.88, -17.35), rotation: 2 },
            { idString: "tv", position: Vec.create(-140.91, -14.46), rotation: 3 },
            { idString: "couch_end_left", position: Vec.create(-147.63, -34.07), rotation: 0 },
            { idString: "couch_corner", position: Vec.create(-148.05, -41.34), rotation: 0 },
            { idString: "couch_part", position: Vec.create(-141.7, -41.19), rotation: 3 },
            { idString: "couch_end_right", position: Vec.create(-134.71, -40.81), rotation: 0 },
            { idString: "house_column", position: Vec.create(-129.67, -12.68), rotation: 0 },
            { idString: "house_column", position: Vec.create(-129.67, 9.58), rotation: 0 },
            { idString: "headquarters_wall_2", position: Vec.create(-141.6, -12.63), rotation: 0 },
            { idString: "headquarters_wall_2", position: Vec.create(-141.6, 9.58), rotation: 0 },
            { idString: "cabinet", position: Vec.create(-144.6, -8.7), rotation: 0 },
            { idString: "cabinet", position: Vec.create(-144.6, 5.74), rotation: 2 },
            { idString: "small_drawer", position: Vec.create(-148.13, 14.18), rotation: 1 },
            { idString: "water_cooler", position: Vec.create(-148.65, 20.95), rotation: 1 },
            { idString: "bigger_glass_door", position: Vec.create(-135.25, 25.85), rotation: 0 },
            { idString: "bigger_glass_door", position: Vec.create(-124.42, 25.85), rotation: 2 },

            // northwest entrance/fire hatchet area
            { idString: "fire_hatchet_case", position: Vec.create(-119.35, -63.03), rotation: 1 },
            { idString: "ammo_crate", position: Vec.create(-99.92, -56.44), rotation: 0 },
            { idString: "ammo_crate", position: Vec.create(-99.92, -74.76), rotation: 0 },
            { idString: "cabinet", position: Vec.create(-87, -53.95), rotation: 2 },
            { idString: "barrel", position: Vec.create(-90.56, -75.38) },
            { idString: "metal_door", position: Vec.create(-123.69, -74.57), rotation: 3 },
            { idString: { box: 1, grenade_box: 1 }, position: Vec.create(-139.01, -73.68) },
            { idString: "regular_crate", position: Vec.create(-146.74, -75.09) },
            { idString: "bookshelf", position: Vec.create(-145.4, -62.95), rotation: 0 },
            { idString: "pipe", position: Vec.create(-145.31, -71.6), rotation: 0, variation: 2 },

            // lab
            { idString: "pumpkin", position: Vec.create(-47.26, -117.89), rotation: 0 },
            { idString: "pumpkin", position: Vec.create(-53.98, -114.99), rotation: 0 },
            { idString: "baby_plumpkin", position: Vec.create(-34.18, -111.23), rotation: 0 },
            { idString: "baby_plumpkin", position: Vec.create(-26.74, -114.57), rotation: 0 },
            { idString: "baby_plumpkin", position: Vec.create(-31.39, -120.37), rotation: 0 },
            { idString: "plumpkin", position: Vec.create(3.67, -115.06), rotation: 0 },
            { idString: "diseased_plumpkin", position: Vec.create(24.92, -114.04), rotation: 0 },
            { idString: "bulletproof_window", position: Vec.create(-50.37, -104.85), rotation: 0 },
            { idString: "bulletproof_window", position: Vec.create(-29.8, -104.85), rotation: 0 },
            { idString: "bulletproof_window", position: Vec.create(4.32, -104.85), rotation: 0 },
            { idString: "windowed_vault_door", position: Vec.create(24.88, -104.54), rotation: 2 }, // disabled for halloween only

            // halloween only.
            // { idString: "cobweb", position: Vec.create(-72.69, -99.3), rotation: 0 },
            // { idString: "cobweb", position: Vec.create(29.57, -122.53), rotation: 3 },

            { idString: "control_panel2", position: Vec.create(-12.74, -99.53), rotation: 0 },
            { idString: "control_panel_small", position: Vec.create(-0.04, -81.91), rotation: 3 },
            { idString: "control_panel_small", position: Vec.create(-25.47, -81.91), rotation: 1 },
            { idString: "gun_case", position: Vec.create(48.34, -98.34), rotation: 3 },
            { idString: "regular_crate", position: Vec.create(-71.7, -97.79) },
            { idString: "barrel", position: Vec.create(-71.84, -88.09) },

            // main office/control room
            { idString: "window2", position: Vec.create(-32.06, -57.7), rotation: 1 },
            { idString: "window2", position: Vec.create(-22.38, -57.7), rotation: 1 },
            { idString: "window2", position: Vec.create(-12.81, -57.7), rotation: 1 },
            { idString: "window2", position: Vec.create(-3.19, -57.7), rotation: 1 },
            { idString: "window2", position: Vec.create(6.39, -57.7), rotation: 1 },
            { idString: "hq_desk_right", position: Vec.create(1.15, -49.64), rotation: 0 },
            { idString: "hq_desk_right", position: Vec.create(-43.83, -15.7), rotation: 1 },
            { idString: "hq_desk_left", position: Vec.create(-43.86, 14.69), rotation: 1 },
            { idString: "hq_desk_left", position: Vec.create(4.98, -7.99), rotation: 3 },
            { idString: "potted_plant", position: Vec.create(7.24, -24.14) },
            { idString: "potted_plant", position: Vec.create(-46.06, 0.73) },
            { idString: "bookshelf", position: Vec.create(8.73, 11.05), rotation: 1 },
            { idString: "water_cooler", position: Vec.create(7.71, 20.97), rotation: 3 },
            { idString: "grey_office_chair", position: Vec.create(-28.19, -45.52), rotation: 2 },
            { idString: "grey_office_chair", position: Vec.create(-6.76, -40.38), rotation: 2 },
            { idString: "grey_office_chair", position: Vec.create(-38.13, -14.42), rotation: 3 },
            { idString: "grey_office_chair", position: Vec.create(-38.3, 13.36), rotation: 3 },
            { idString: "grey_office_chair", position: Vec.create(-0.35, -5.96), rotation: 1 },
            { idString: "file_cart", position: Vec.create(-21.24, -6.17), rotation: 3 },
            { idString: "headquarters_wall_4", position: Vec.create(3.21, -19.2), rotation: 0 },
            { idString: "headquarters_wall_4", position: Vec.create(3.21, 3.27), rotation: 0 },
            { idString: "house_column", position: Vec.create(-6.3, -19.07), rotation: 0 },
            { idString: "house_column", position: Vec.create(-6.3, 3.22), rotation: 0 },
            { idString: "house_wall_15", position: Vec.create(-44.24, -4.36), rotation: 0 },

            // northeast hall
            { idString: "gun_locker", position: Vec.create(60.72, -92.17), rotation: 0 },
            { idString: "ammo_crate", position: Vec.create(99.91, -82.15), rotation: 0 },
            { idString: "barrel", position: Vec.create(109.1, -81.6) },
            { idString: "regular_crate", position: Vec.create(133.93, -82.06) },

            // generator room
            { idString: "metal_door", position: Vec.create(87.38, -76.06), rotation: 0 },
            { idString: "cabinet", position: Vec.create(95.36, -66.43), rotation: 3 },
            { idString: { box: 1, grenade_box: 1 }, position: Vec.create(56.68, -71.05) },
            { idString: { box: 1, grenade_box: 1 }, position: Vec.create(62.1, -69.57) },
            { idString: "barrel", position: Vec.create(58.34, -62.63) },
            { idString: "grenade_crate", position: Vec.create(69.29, -32.1) },
            { idString: "flint_crate", position: Vec.create(42.41, -50.77) },
            { idString: "super_barrel", position: Vec.create(51.32, -51.37) },
            { idString: "metal_door", position: Vec.create(49.71, -26.82), rotation: 2 },

            // server room
            { idString: "metal_auto_door", position: Vec.create(121.81, -26.84), rotation: 2 },
            { idString: "metal_auto_door", position: Vec.create(121.81, -76.09), rotation: 2 },

            // storage room
            { idString: "flint_crate", position: Vec.create(87.15, 68.99) },
            { idString: "box", position: Vec.create(89.08, 61.01) },
            { idString: "dumpster", position: Vec.create(36.91, 69.82), rotation: 1 },
            { idString: "dumpster", position: Vec.create(21.47, 69.82), rotation: 1 },
            { idString: "metal_column", position: Vec.create(60.08, 61.85) },
            { idString: "fence", position: Vec.create(60.06, 55.91), rotation: 1 },
            { idString: "fence", position: Vec.create(60.06, 47.33), rotation: 1 },
            { idString: "metal_column", position: Vec.create(60.07, 41.38) },
            { idString: "fence", position: Vec.create(66.12, 41.4), rotation: 0 },
            { idString: "fence", position: Vec.create(74.84, 41.4), rotation: 0 },
            { idString: "metal_column", position: Vec.create(80.84, 41.38), rotation: 0 },
            { idString: "pallet", position: Vec.create(67.03, 47.59), rotation: 0 },
            { idString: "regular_crate", position: Vec.create(67.03, 47.59) },
            { idString: "ammo_crate", position: Vec.create(67.03, 57.66) },
            { idString: "super_barrel", position: Vec.create(77.21, 47.24) },
            { idString: "regular_crate", position: Vec.create(74.57, 35.05) },
            { idString: "pallet", position: Vec.create(62.56, 20.04), rotation: 0 },
            { idString: "barrel", position: Vec.create(62.56, 20.04) },
            { idString: "forklift", position: Vec.create(62.8, 8.65), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec.create(89.08, -2.13), rotation: 1 },
            { idString: "ammo_crate", position: Vec.create(87.34, 8.05) },
            { idString: "pallet", position: Vec.create(86.93, 18.37), rotation: 0 },
            { idString: "box", position: Vec.create(89.48, 15.5) },
            { idString: "grenade_box", position: Vec.create(89.48, 20.5) },
            { idString: "box", position: Vec.create(84.67, 17) },
            { idString: "pallet", position: Vec.create(18.72, 33.04), rotation: 0 },
            { idString: "grenade_crate", position: Vec.create(18.72, 33.04) },
            { idString: "tear_gas_crate", position: Vec.create(28.84, 31.97), rotation: 2 },
            { idString: "fence", position: Vec.create(17.78, 27.01), rotation: 0 },
            { idString: "fence", position: Vec.create(26.31, 27.01), rotation: 0 },
            { idString: "fence", position: Vec.create(34.89, 27.01), rotation: 0 },
            { idString: "metal_column", position: Vec.create(40.81, 27.01) },
            { idString: "fence", position: Vec.create(40.81, 21.09), rotation: 1 },
            { idString: "fence", position: Vec.create(40.81, 12.54), rotation: 1 },
            { idString: "metal_column", position: Vec.create(40.81, 6.7), rotation: 0 },
            { idString: "regular_crate", position: Vec.create(34.25, 20.86) },
            { idString: "barrel", position: Vec.create(25.17, 21.72) },
            { idString: "pallet", position: Vec.create(34.06, 11.22), rotation: 0 },
            { idString: "box", position: Vec.create(31.62, 12.37) },
            { idString: "box", position: Vec.create(36.45, 10.32) },
            { idString: "fence", position: Vec.create(40.81, -21.44), rotation: 1 },
            { idString: "fence", position: Vec.create(40.81, -12.78), rotation: 1 },
            { idString: "metal_column", position: Vec.create(40.81, -6.88) },
            { idString: "box", position: Vec.create(34.57, -20.63) },
            { idString: "ammo_crate", position: Vec.create(26, -20.63) },
            { idString: "pallet", position: Vec.create(18.07, -4.83), rotation: 1 },
            { idString: "gun_case", position: Vec.create(18.07, -4.83), rotation: 1 },
            { idString: "ammo_crate", position: Vec.create(63.73, -20.65) },
            { idString: "barrel", position: Vec.create(73.17, -21.67) },
            { idString: "pipe", position: Vec.create(106.85, -16.65), rotation: 0, variation: 4 }, // why does dv hate this? (variation: 4)
            { idString: "pipe", position: Vec.create(62.22, -86.05), rotation: 0, variation: 1 },
            { idString: "ammo_crate", position: Vec.create(107.16, -12.64) },
            { idString: "ammo_crate", position: Vec.create(134.15, -20.66) },
            { idString: "melee_crate", position: Vec.create(17.17, -21.35) }
        ],
        subBuildings: [
            { idString: "detector", position: Vec.create(13.82, -100.67), orientation: 2 },
            { idString: "detector", position: Vec.create(27.24, -100.67), orientation: 2 },
            { idString: "plumpkin_bunker_second_puzzle", position: Vec.create(0, 0) },
            { idString: "plumpkin_bunker_third_puzzle", position: Vec.create(0, 0) },
            { idString: "plumpkin_bunker_vault", position: Vec.create(0, 0) }
        ]
    },
    {
        idString: "plumpkin_bunker_second_puzzle",
        name: "Plumpkin Bunker Second Puzzle",
        spawnHitbox: RectangleHitbox.fromRect(104.67, 37.14, Vec.create(0, -75.62)),
        sounds: {
            normal: "plumpkin_bunker_pump_ambience",
            solved: "plumpkin_bunker_pump_ambience",
            position: Vec.create(-13.28, -81.95),
            maxRange: 250,
            falloff: 0.5
        },
        floorImages: [
            { key: "plumpkin_bunker_large_mixing_stick", position: Vec.create(14.75, -82.03), spinSpeed: -0.032 },
            { key: "plumpkin_bunker_large_mixing_stick", position: Vec.create(-40.11, -82.03), spinSpeed: -0.032 },
            { key: "plumpkin_bunker_small_mixing_stick", position: Vec.create(44.62, -64.92), spinSpeed: -0.032 },
            { key: "plumpkin_bunker_large_mixing_frame", position: Vec.create(14.75, -82.03) },
            { key: "plumpkin_bunker_large_mixing_frame", position: Vec.create(-40.11, -82.03) },
            { key: "plumpkin_bunker_small_mixing_frame", position: Vec.create(44.62, -64.92) }
        ],
        puzzle: {
            triggerOnSolve: "red_metal_auto_door",
            delay: 1000
        },
        obstacles: [
            { idString: "red_metal_auto_door", position: Vec.create(-78.35, -63.04), rotation: 3 },
            { idString: "red_metal_auto_door", position: Vec.create(52.68, -82.25), rotation: 3 },
            { idString: "red_metal_auto_door", position: Vec.create(12.34, -33.03), rotation: 3 },
            { idString: "red_metal_auto_door", position: Vec.create(-38.1, -33.03), rotation: 3 },
            { idString: "headquarters_security_desk", position: Vec.create(-22.75, -52.96), rotation: 2, puzzlePiece: true }
        ]
    },
    {
        idString: "plumpkin_bunker_third_puzzle",
        name: "Plumpkin Bunker Third Puzzle",
        spawnHitbox: RectangleHitbox.fromRect(104.67, 37.14, Vec.create(0, -75.62)),
        sounds: {
            solved: "recorder_buzz",
            position: Vec.create(40.55, -32.63),
            maxRange: 200,
            falloff: 2
        },
        puzzle: {
            triggerOnSolve: "recorder",
            delay: 2000
        },
        obstacles: [
            { idString: "generator", position: Vec.create(78.21, -32.55), rotation: 0, puzzlePiece: true },
            { idString: "recorder", position: Vec.create(40.55, -32.63), rotation: 1 }
        ]
    },
    {
        idString: "plumpkin_bunker_vault",
        name: "Plumpkin Bunker Vault",
        spawnHitbox: RectangleHitbox.fromRect(33.39, 20.34, Vec.create(-67.67, 85.03)),
        ceilingHitbox: RectangleHitbox.fromRect(33.39, 20.34, Vec.create(-67.67, 85.03)),
        ceilingImages: [{
            key: "plumpkin_bunker_vault_ceiling",
            position: Vec.create(-67.67, 85.03)
        }]
    },

    {
        idString: "christmas_camp",
        name: "Christmas Camp",
        spawnHitbox: RectangleHitbox.fromRect(150, 75, Vec.create(0, -1)),
        obstacles: [
            { idString: "christmas_tree", position: Vec.create(0, 0) },
            { idString: "ice_pick_case", position: Vec.create(65.8, 24.41), rotation: 3 },
            { idString: "regular_crate", position: Vec.create(64.3, -10.79), outdoors: true },
            { idString: "regular_crate", position: Vec.create(51.78, -23.32), outdoors: true },
            { idString: randomCelebrationWinterTree, position: Vec.create(-60.37, 23.31) },
            { idString: randomCelebrationWinterTree, position: Vec.create(-56.15, 0.58) },
            { idString: "pine_tree", position: Vec.create(54.24, -12.53) },
            { idString: "box", position: Vec.create(-44.79, 21.76), outdoors: true },
            { idString: "box", position: Vec.create(-40.17, 15.6), outdoors: true },
            { idString: randomBarrel, position: Vec.create(-65.99, -14.17), outdoors: true },
            { idString: "office_chair", position: Vec.create(38.01, 15.69), rotation: 0 },
            { idString: "fire_pit", position: Vec.create(35.73, -6.19) },
            { idString: { frozen_crate: 1, regular_crate_winter: 1 }, position: Vec.create(0.4, -32.01) },
            { idString: { frozen_crate: 0.25, regular_crate_winter: 1, grenade_crate_winter: 0.5, barrel_winter: 0.5 }, position: Vec.create(-27.8, 29.06) },
            { idString: "blueberry_bush", position: Vec.create(67.77, -31.64) },
            { idString: "bush", position: Vec.create(-23.21, -25.42) },
            { idString: { frozen_crate: 0.25, regular_crate_winter: 1, box_winter: 0.5 }, position: Vec.create(-66.54, 10.5) },

            { idString: randomCelebrationWinterTree, position: Vec.create(22.07, 31.78) },
            { idString: "box", position: Vec.create(13.6, 34.06), outdoors: true },

            // Hidden gift(s)
            { idString: randomGift, position: Vec.create(-67.1, -32.45) },
            { idString: randomGift, position: Vec.create(49.29, -7.59) },

            // Around the christmas tree (gift placements)
            ...pickRandomInArray([
                [
                    { idString: randomGift, position: Vec.create(-8.77, -8.43) },
                    { idString: randomGift, position: Vec.create(8.77, -8.43) },
                    { idString: randomGift, position: Vec.create(-8.77, 8.43) },
                    { idString: randomGift, position: Vec.create(8.77, 8.43) },
                    { idString: randomGift, position: Vec.create(-12, 0) },
                    { idString: randomGift, position: Vec.create(12, 0) }
                ],
                [
                    { idString: randomGift, position: Vec.create(-12, 0) },
                    { idString: randomGift, position: Vec.create(12, 0) },
                    { idString: randomGift, position: Vec.create(0, -12) },
                    { idString: randomGift, position: Vec.create(0, 12) }
                ],
                [
                    { idString: randomGift, position: Vec.create(-9.85, -10.12) },
                    { idString: randomGift, position: Vec.create(9.85, -10.12) },
                    { idString: randomGift, position: Vec.create(-9.85, 10.12) },
                    { idString: randomGift, position: Vec.create(9.85, 10.12) }
                ]
            ])
        ],
        subBuildings: [
            { idString: "shed", position: Vec.create(22, -55), orientation: 3 },
            {
                idString: {
                    container_3: 1,
                    container_4: 1,
                    container_5: 1,
                    container_6: 1
                }, position: Vec.create(30, -58), orientation: 1
            }
        ]
    },

    // Normal Mode Only
    riverHut(1, [
        { idString: "small_bed", position: Vec.create(-10.55, -9.38), rotation: 0 },
        { idString: "small_drawer", position: Vec.create(-3.48, -13.6), rotation: 0 },
        { idString: "small_table", position: Vec.create(9.54, 11.44), rotation: 0 },
        { idString: "chair", position: Vec.create(5.1, 11.44), rotation: 3 },
        { idString: "box", position: Vec.create(11.66, 0.14) },
        { idString: "box", position: Vec.create(6.84, 2.69) },
        { idString: "flint_crate", position: Vec.create(31.58, -22.6), outdoors: true },
        { idString: "barrel", position: Vec.create(31.49, 11.78), outdoors: true }
    ]),

    riverHut(2, [
        { idString: "trash_bag", position: Vec.create(-19.99, -5.03), outdoors: true },
        { idString: "barrel", position: Vec.create(-21.27, 2.62), outdoors: true },
        { idString: "regular_crate", position: Vec.create(31.56, -21.66), outdoors: true },
        { idString: "box", position: Vec.create(33.9, 9.33), outdoors: true },
        { idString: "box", position: Vec.create(29.16, 13.99), outdoors: true },
        { idString: "small_bed", position: Vec.create(-5.89, -13.83), rotation: 3 },
        { idString: "box", position: Vec.create(-11.56, -5.55) },
        { idString: "box", position: Vec.create(-6.56, -7.35) },
        { idString: "small_table", position: Vec.create(9.86, 4.59), rotation: 0 },
        { idString: "chair", position: Vec.create(5.72, 4.59), rotation: 3 },
        { idString: "small_drawer", position: Vec.create(10.49, 14.3), rotation: 3 },
        { idString: "trash_can", position: Vec.create(-10.86, 2.48) }
    ]),

    riverHut(3, [
        { idString: "small_bed", position: Vec.create(-10.55, -9.38), rotation: 0 },
        { idString: "large_drawer", position: Vec.create(-0.26, -13.52), rotation: 0 },
        { idString: "small_table", position: Vec.create(8.01, 13.4), rotation: 1 },
        { idString: "chair", position: Vec.create(8.01, 9.7), rotation: 2 },
        { idString: "trash_can", position: Vec.create(-1.69, 14.64) },
        { idString: "potted_plant", position: Vec.create(-10.31, 3.33), rotation: 0 },
        { idString: "barrel", position: Vec.create(-21.06, -2.26), outdoors: true },
        { idString: "box", position: Vec.create(-19.46, 4.73), outdoors: true },
        { idString: "grenade_box", position: Vec.create(28.14, 4.01), outdoors: true },
        { idString: "super_barrel", position: Vec.create(31.58, -22.6), outdoors: true },
        { idString: "regular_crate", position: Vec.create(31.49, 11.3), outdoors: true }
    ]),

    // Fall Mode Only
    riverHut(4, [
        { idString: "small_bed", position: Vec.create(-10.55, -9.38), rotation: 0 },
        { idString: "cooler", position: Vec.create(-1.83, -14.4), rotation: 0 },
        { idString: "small_table", position: Vec.create(9.54, 11.44), rotation: 0 },
        { idString: "chair", position: Vec.create(5.1, 11.44), rotation: 3 },
        { idString: "small_drawer", position: Vec.create(10.11, 1.69), rotation: 3 },
        { idString: "box", position: Vec.create(-2.92, -22.55), outdoors: true },
        { idString: "propane_tank", position: Vec.create(1.77, -22.01), outdoors: true },
        { idString: "box", position: Vec.create(7.39, 22.27), outdoors: true },
        { idString: "box", position: Vec.create(2.62, 24.11), outdoors: true },
        { idString: "barrel", position: Vec.create(-4.58, 24.41), outdoors: true },
        { idString: "super_barrel", position: Vec.create(31.59, -22.89), outdoors: true }
    ]),

    riverHut(5, [
        { idString: "small_bed", position: Vec.create(-5.74, -13.61), rotation: 3 },
        { idString: "cooler", position: Vec.create(-11.12, -4.91), rotation: 1 },
        { idString: "small_table", position: Vec.create(9.76, 4.3), rotation: 0 },
        { idString: "chair", position: Vec.create(5.64, 4.3), rotation: 3 },
        { idString: "small_drawer", position: Vec.create(10.51, 14.23), rotation: 3 },
        { idString: "barrel", position: Vec.create(-20.58, 0.31), outdoors: true },
        { idString: "box", position: Vec.create(-19.47, -6.71), outdoors: true },
        { idString: "box", position: Vec.create(-21, -12), outdoors: true },
        { idString: "box", position: Vec.create(2.19, 22.4), outdoors: true },
        { idString: "propane_tank", position: Vec.create(-2.64, 21.93), outdoors: true }
    ]),

    riverHut(6, [
        { idString: "small_bed", position: Vec.create(-10.55, -9.38), rotation: 0 },
        { idString: "small_drawer", position: Vec.create(-3.48, -13.6), rotation: 0 },
        { idString: "small_table", position: Vec.create(9.54, 11.44), rotation: 0 },
        { idString: "chair", position: Vec.create(5.1, 11.44), rotation: 3 },
        { idString: "cooler", position: Vec.create(9.4, 2.16), rotation: 2 },
        { idString: "barrel", position: Vec.create(-5.16, -23.9), outdoors: true },
        { idString: "box", position: Vec.create(1.49, -25.52), outdoors: true },
        { idString: "box", position: Vec.create(6.31, -22.32), outdoors: true },
        { idString: "box", position: Vec.create(-19.11, -1.56), outdoors: true },
        { idString: "propane_tank", position: Vec.create(-18.6, 3.13), outdoors: true }
    ]),

    {
        idString: "memorial_bunker_entrance",
        name: "Memorial Bunker (Entrance)",
        spawnHitbox: RectangleHitbox.fromRect(30, 30),
        material: "metal_heavy",
        particle: "plumpkin_bunker_particle",
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 17.4, Vec.create(-6.56, 0)),
            RectangleHitbox.fromRect(2, 17.4, Vec.create(6.56, 0)),
            RectangleHitbox.fromRect(12, 2, Vec.create(0, -7.7))
        ),
        collideWithLayers: Layers.Adjacent,
        ceilingHitbox: RectangleHitbox.fromRect(11, 8, Vec.create(0, -3.4)),
        floors: [{
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(11, 15, Vec.create(0, 0.8))
        }],
        obstacles: [
            { idString: "memorial_bunker_stair", position: Vec.create(0, 2.5), rotation: 0, layer: -1 }
        ]
    },

    {
        idString: "memorial_bunker_main",
        name: "Memorial Bunker",
        spawnHitbox: RectangleHitbox.fromRect(30, 40),
        material: "metal_heavy",
        particle: "plumpkin_bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        ceilingHitbox: RectangleHitbox.fromRect(11.5, 30),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 34, Vec.create(-6.56, 0)),
            RectangleHitbox.fromRect(2, 34, Vec.create(6.56, 0)),
            RectangleHitbox.fromRect(12, 2, Vec.create(0, -16))
        ),
        floorImages: [{
            key: "memorial_bunker_main_floor",
            position: Vec.create(0, 0)
        }],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(11.5, 16, Vec.create(0, -7))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(11, 16, Vec.create(0, 9)),
                layer: -2
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(11, 16, Vec.create(0, 9)),
                layer: -1
            }
        ],
        obstacles: [{
            idString: "memorial_crate",
            position: Vec.create(0, -9)
        }]
    },

    {
        idString: "memorial",
        name: "Memorial",
        spawnHitbox: RectangleHitbox.fromRect(30, 40, Vec.create(0, -10)),
        rotationMode: RotationMode.None,
        spawnMode: MapObjectSpawnMode.Grass,
        hideOnMap: true,
        floorImages: [
            {
                key: "memorial_bunker_stair",
                position: Vec.create(0, 0)
            },
            {
                key: "monument_railing",
                position: Vec.create(-8.5, 0)
            },
            {
                key: "monument_railing",
                position: Vec.create(8.5, 0)
            }
        ],
        ceilingHitbox: RectangleHitbox.fromRect(11, 8, Vec.create(0, 4.5)),
        noCeilingScopeEffect: true,
        ceilingImages: [{
            key: "memorial_bunker_entrance_ceiling",
            position: Vec.create(0, -3.4)
        }],
        obstacles: [
            { idString: "monument", position: Vec.create(0, 0), rotation: 3 }
        ],
        subBuildings: [
            { idString: "memorial_bunker_entrance", position: Vec.create(0, 0) },
            { idString: "memorial_bunker_main", position: Vec.create(0, -8.5), layer: -2 }
        ]
    }
]);
