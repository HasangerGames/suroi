import { FlyoverPref, Layer, Layers, MapObjectSpawnMode, RotationMode, ZIndexes } from "../constants";
import { type Orientation, type Variation } from "../typings";
import { CircleHitbox, GroupHitbox, PolygonHitbox, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { DefinitionType, ObjectDefinitions, type ObjectDefinition, type ReferenceOrRandom, type ReferenceTo } from "../utils/objectDefinitions";
import { pickRandomInArray, random, randomBoolean } from "../utils/random";
import { FloorNames } from "../utils/terrain";
import { Vec, type Vector } from "../utils/vector";
import { Materials, type ObstacleDefinition } from "./obstacles";
import "../utils/isClient";
import { ScopeDefinition } from "./items/scopes";

declare const IS_CLIENT: boolean;

export interface BuildingObstacle {
    readonly idString: ReferenceOrRandom<ObstacleDefinition>
    readonly position: Vector
    readonly rotation?: number
    // specified as an _offset_ relative to the layer of the building in which this obstacle is placed
    readonly layer?: Layer
    readonly variation?: Variation
    readonly scale?: number
    readonly lootSpawnOffset?: Vector
    readonly puzzlePiece?: string | boolean
    readonly locked?: boolean
    readonly activated?: boolean
    readonly outdoors?: boolean
    readonly waterOverlay?: boolean
    readonly replaceableBy?: ReferenceTo<ObstacleDefinition>
}

interface LootSpawner {
    readonly position: Vector
    readonly table: string
}

export interface SubBuilding {
    readonly idString: ReferenceOrRandom<BuildingDefinition>
    readonly position: Vector
    readonly orientation?: Orientation
    // specified as an _offset_ relative to the layer of the building in which this building appears
    readonly layer?: Layer
    readonly replaceableBy?: ReferenceTo<BuildingDefinition>
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
    readonly residuePosition?: Vector
    readonly beachTinted?: boolean
    readonly damaged?: string
    readonly alpha?: number
    readonly hideOnDead?: boolean
}

interface BuildingGraphicsDefinition {
    readonly color: number | `#${string}`
    readonly hitbox: Hitbox
    readonly waterTint?: boolean
}

export interface BuildingDefinition extends ObjectDefinition {
    readonly defType: DefinitionType.Building

    readonly noCollisions?: boolean
    readonly noBulletCollision?: boolean
    readonly reflectBullets?: boolean
    readonly hasDamagedCeiling?: boolean
    readonly collideWithLayers?: Layers
    readonly visibleFromLayers?: Layers
    readonly ceilingCollapseParticle?: string
    readonly ceilingCollapseParticleVariations?: number
    readonly resetCeilingResidueScale?: boolean
    readonly ceilingCollapseSound?: string
    readonly noCeilingCollapseEffect?: boolean
    readonly destroyOnCeilingCollapse?: readonly string[]
    readonly material?: typeof Materials[number]
    readonly particle?: string
    readonly particleVariations?: number
    readonly bulletMask?: RectangleHitbox

    readonly hitbox?: Hitbox
    readonly spawnHitbox: Hitbox
    readonly bunkerSpawnHitbox?: Hitbox
    readonly ceilingHitbox?: Hitbox
    readonly ceilingScope?: ReferenceTo<ScopeDefinition>
    readonly ceilingInfectionUnits?: number
    /**
     * @default {FlyoverPref.Never}
     */
    readonly allowFlyover?: FlyoverPref
    readonly hideOnMap?: boolean
    /**
     * @default {MapObjectSpawnMode.Grass}
     */
    readonly spawnMode?: MapObjectSpawnMode
    readonly spawnOrientation?: Orientation
    readonly spawnOffset?: Vector | { min: Vector, max: Vector }
    /** used by MapObjectSpawnMode.Ring */
    readonly spawnRadius?: number

    readonly bridgeHitbox?: Hitbox
    /** If true, the hitbox will be tested in more orientations */
    readonly asymmetricalBridgeHitbox?: boolean
    readonly bridgeMinRiverWidth?: number
    readonly bridgeSpawnRanges?: [number, number][]

    readonly noCeilingScopeEffect?: boolean
    readonly hasSecondFloor?: boolean
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
        readonly solved?: string | null
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

    readonly graphics?: readonly BuildingGraphicsDefinition[]
    readonly terrainGraphics?: readonly BuildingGraphicsDefinition[]
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

const randomHollowLog = {
    hollow_log_1: 1,
    hollow_log_2: 1,
    hollow_log_3: 1
};

const randomBigTent = {
    tent_big_1: 1,
    tent_big_2: 1,
    tent_big_3: 1,
    tent_big_4: 1
};

const randomTent = {
    tent_1: 1,
    tent_2: 1,
    tent_3: 1,
    tent_4: 1,
    tent_5: 0.1
};

const randomStump = {
    stump: 1,
    hatchet_stump: 0.1
};

const randomGift = {
    red_gift: 1,
    green_gift: 1,
    blue_gift: 1,
    black_gift: 0.25,
    purple_gift: 0.1
};

const randomPallet = {
    pallet_1: 1,
    pallet_2: 1,
    pallet_3: 1,
    pallet_4: 1,
    pallet_5: 1,
    pallet_6: 0.5
};

const randomTruckContainerTwoSided = {
    // Two Sided (1 - 6)
    truck_container_1: 1,
    truck_container_2: 1,
    truck_container_3: 1,
    truck_container_4: 1,
    truck_container_5: 1,
    truck_container_6: 1
};

const randomTruckContainerOneSided = {
    truck_container_7: 1,
    truck_container_8: 1,
    truck_container_9: 1,
    truck_container_10: 1,
    truck_container_11: 1,
    truck_container_12: 0.85
};

const randomTree = {
    oak_tree: 1,
    birch_tree: 1
};

const randomCelebrationWinterTree = {
    oak_tree: 1,
    birch_tree: 1,
    pine_tree: 0.9
};

const randomPortOpenContainerOneSide = {
    container_3: 1,
    container_4: 1,
    container_5: 1,
    container_6: 1,
    container_9: 1,

    // Military
    container_22: 0.05,
    container_23: 0.05,
    container_24: 0.05,
    container_25: 0.05
};

const randomPortOpenContainerTwoSide = {
    container_1: 0.25,
    container_2: 0.25,
    container_7: 2,
    container_8: 2,
    container_16: 2
};

const randomPortDamagedContainer = {
    container_13: 1,
    container_14: 1,
    container_15: 1
};

const randomPortDamagedContainerReversed = {
    container_17: 1,
    container_18: 1,
    container_19: 1
};

/* const randomContainer1 = {
    container_1: 1,
    container_2: 2,
    container_3: 3,
    container_4: 4,
    container_5: 3,
    container_6: 4,
    container_7: 3,
    container_8: 4,
    container_10: 3
}; */

/* const randomContainer2 = {
    ...randomContainer1,
    [NullString]: 7
}; */

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

const randomBathtub = {
    bathtub: 0.9925,
    ducktub: 0.0075
};

const randomStove = {
    stove: 0.99,
    pan_stove: 0.01
};

const randomSmallStove = {
    small_stove: 0.99,
    small_pan_stove: 0.01
};

const randomHayShed = {
    hay_shed_1: 1,
    hay_shed_2: 1,
    hay_shed_3: 1
};

export const TruckContainerTints = { // colors by angel and me :3
    teal: 0x14544d,
    orange: 0x994e11,
    purple: 0x460e69,
    green: 0x5cb64a,
    red: 0xc02d0e
};

export const ContainerTints = {
    white: 0xc0c0c0,
    red: 0xa33229,
    green: 0x419e2e,
    blue: 0x2e6e9e,
    yellow: 0xc1b215,
    gas_can: 0xd64533,
    military_green: 0x243315,
    military_orange: 0x918556,
    military_marine: 0x273b3b,
    military_lime: 0x727825
};

const ContainerWallOutlineTints = {
    white: 0x797979,
    red: 0x661900,
    green: 0x006608,
    blue: 0x003b66,
    yellow: 0x808000,
    gas_can: 0x571b14,
    military_green: 0x161f0d,
    military_orange: 0x574f33,
    military_marine: 0x172424,
    military_lime: 0x3f4214
};

const ContainerWallTints = {
    white: 0xa8a8a8,
    red: 0x8f2400,
    green: 0x008f0c,
    blue: 0x00538f,
    yellow: 0xb3b300,
    gas_can: 0xd64533,
    military_green: 0x31451c,
    military_orange: 0xab9d65,
    military_marine: 0x3e5e5e,
    military_lime: 0x838a2b
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
    defType: DefinitionType.Building,
    spawnHitbox: RectangleHitbox.fromRect(40, 35, Vec(18.4, 18)),
    floorImages: [{
        key: subBuildings ? "blue_house_floor_2_2_special" : "blue_house_floor_2_2",
        position: Vec(18.4, 18),
        scale: Vec(1.07, 1.07)
    }],
    obstacles,
    subBuildings,
    ...(subBuildings === undefined ? { lootSpawners: IS_CLIENT ? undefined : [{ table: "ground_loot", position: Vec(23.5, 14.4) }] } : {})
});

const warehouseLayout = (id: number, obstacles: readonly BuildingObstacle[]): BuildingDefinition => ({
    idString: `warehouse_layout_${id}`,
    name: "Warehouse Layout",
    defType: DefinitionType.Building,
    spawnHitbox: RectangleHitbox.fromRect(63.07, 114),
    obstacles
});

const huntingStandLayout = (id: number, obstacles: readonly BuildingObstacle[], lootSpawners_?: readonly LootSpawner[]): BuildingDefinition => ({
    idString: `hunting_stand_layout_${id}`,
    name: "Hunting Stand Layout",
    defType: DefinitionType.Building,
    spawnHitbox: RectangleHitbox.fromRect(24.22, 30.14),
    obstacles,
    lootSpawners: lootSpawners_ ?? undefined
});

const container = (
    id: number,
    color: keyof typeof ContainerTints,
    variant: "open2" | "open1" | "closed" | "closed_damaged" | "damaged" | "damaged_reversed" | "gas_can",
    damaged?: boolean
): BuildingDefinition => {
    const tint = ContainerTints[color];

    let hitbox: Hitbox;
    let wallHitbox: Hitbox | undefined;
    let spawnHitbox: Hitbox;
    let upperCeilingImage;
    let lowerCeilingImage;

    const _snowDecalDefinitions = {
        closed: pickRandomInArray([
            [
                {
                    key: "snow_decal_container_closed_1",
                    position: Vec(-2.5, -9.08)
                },
                {
                    key: "snow_decal_container_closed_2",
                    position: Vec(4.4, -6.5)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(-6.7, -7),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec(1.5, 1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(-1.9, -13.525),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec(1.1, 1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(6.65, -7),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec(1.5, 1)
                }
            ],
            [
                {
                    key: "snow_decal_container_closed_2",
                    position: Vec(-4.4, -6.5),
                    rotation: Math.PI
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(-6.7, -7),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec(1.5, 1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(-1.9, -13.525),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec(1.1, 1)
                },
                {
                    key: "snow_decal_container_open1_2",
                    position: Vec(1.8, 10),
                    rotation: Math.PI / 2
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(6.6, 7),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec(1.5, 1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(1.8, 13.525),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec(1.1, 1)
                }
            ]
        ]),
        open1: pickRandomInArray([
            [
                {
                    key: "snow_decal_container_open1_1",
                    position: Vec(3.5, 8.5),
                    rotation: Math.PI
                },
                {
                    key: "snow_decal_container_open1_2",
                    position: Vec(3.25, -8.5)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(6.7, -8),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(1, -13.6),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(6.7, 8),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(5.9, 13.65),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec(0.25, 1.4)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(4.5, 13),
                    tint: tint,
                    rotation: 45,
                    scale: Vec(0.2125, 1.1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(0, 12.4),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec(0.95, 1.4)
                }
            ],
            [
                {
                    key: "snow_decal_container_open1_1",
                    position: Vec(3.5, 8.5),
                    rotation: Math.PI
                },
                {
                    key: "snow_decal_container_open1_2",
                    position: Vec(-2, -10),
                    rotation: -Math.PI / 2
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(-6.7, -8),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(-1, -13.6),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(6.7, 8),
                    tint: tint,
                    rotation: Math.PI / 2,
                    scale: Vec(1.25, 1.25)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(5.9, 13.65),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec(0.25, 1.4)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(4.5, 13),
                    tint: tint,
                    rotation: 45,
                    scale: Vec(0.2125, 1.1)
                },
                {
                    key: "container_snow_cover_patch",
                    position: Vec(0, 12.4),
                    tint: tint,
                    rotation: Math.PI,
                    scale: Vec(0.95, 1.4)
                }
            ]
        ]),
        open2: [
            {
                key: "snow_decal_container_closed_2",
                position: Vec(4.4, -6.5)
            },
            {
                key: "snow_decal_container_open2_1",
                position: Vec(-5, 2.5),
                rotation: Math.PI
            },
            {
                key: "container_snow_cover_patch",
                position: Vec(-6.7, 4.5),
                tint: tint,
                rotation: Math.PI / 2,
                scale: Vec(1.5, 1)
            },
            {
                key: "container_snow_cover_patch",
                position: Vec(6.65, -7),
                tint: tint,
                rotation: Math.PI / 2,
                scale: Vec(1.5, 1)
            }
        ]
    };

    switch (variant) {
        case "damaged_reversed": // thanks designers
            upperCeilingImage = "container_ceiling_6";
            lowerCeilingImage = "container_ceiling_7";
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 8, Vec(-6.1, 10)),
                RectangleHitbox.fromRect(1.85, 8, Vec(-6.1, -10)),
                RectangleHitbox.fromRect(1.85, 28, Vec(6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, Vec(0, -13.07))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 7.05, Vec(-6.1, 10)),
                RectangleHitbox.fromRect(0.91, 7.05, Vec(-6.1, -10)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec(6.1, 0)),
                RectangleHitbox.fromRect(13.05, 0.91, Vec(0, -13.07))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, Vec(0, 2));
            break;
        case "damaged":
            upperCeilingImage = "container_ceiling_6";
            lowerCeilingImage = "container_ceiling_7";
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 8, Vec(6.1, 10)),
                RectangleHitbox.fromRect(1.85, 8, Vec(6.1, -10)),
                RectangleHitbox.fromRect(1.85, 28, Vec(-6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, Vec(0, -13.07))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 7.05, Vec(6.1, 10)),
                RectangleHitbox.fromRect(0.91, 7.05, Vec(6.1, -10)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec(-6.1, 0)),
                RectangleHitbox.fromRect(13.05, 0.91, Vec(0, -13.07))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, Vec(0, 2));
            break;
        case "open2":
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 28, Vec(6.1, 0)),
                RectangleHitbox.fromRect(1.85, 28, Vec(-6.1, 0))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 27.05, Vec(-6.11, 0)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec(6.11, 0))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 39.9);
            upperCeilingImage = damaged ? "container_ceiling_3" : "container_ceiling_2";
            lowerCeilingImage = "container_ceiling_2";
            break;
        case "open1":
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 28, Vec(6.1, 0)),
                RectangleHitbox.fromRect(1.85, 28, Vec(-6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, Vec(0, -13.07))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 27.05, Vec(-6.11, 0)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec(6.11, 0)),
                RectangleHitbox.fromRect(13.13, 0.92, Vec(0, -13.07))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, Vec(0, 2));
            upperCeilingImage = damaged ? "container_ceiling_4" : "container_ceiling_1";
            lowerCeilingImage = damaged ? "container_ceiling_5" : "container_ceiling_2";
            break;
        case "closed_damaged":
        case "gas_can":
            upperCeilingImage = "container_ceiling_8";
            lowerCeilingImage = "container_ceiling_9";
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 8, Vec(-6.1, 10)),
                RectangleHitbox.fromRect(1.85, 8, Vec(-6.1, -10)),
                RectangleHitbox.fromRect(1.85, 28, Vec(6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, Vec(0, -13.07)),
                RectangleHitbox.fromRect(14, 1.85, Vec(0, 13.07))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 7.05, Vec(-6.1, 10)),
                RectangleHitbox.fromRect(0.91, 7.05, Vec(-6.1, -10)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec(6.1, 0)),
                RectangleHitbox.fromRect(13.05, 0.91, Vec(0, -13.07)),
                RectangleHitbox.fromRect(13.05, 0.91, Vec(0, 13.07))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, Vec(0, 2));
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
        defType: DefinitionType.Building,
        hitbox,
        reflectBullets: true,
        material: "metal_heavy",
        particle: `container_particle_${color}`,
        spawnHitbox,
        ceilingHitbox: RectangleHitbox.fromRect(12, 27),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 0.5,
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
                position: Vec(0, -6.97),
                ...(variant === "damaged_reversed" ? { scale: Vec(-1, 1) } : {}),
                tint
            },
            {
                key: lowerCeilingImage,
                position: Vec(-0.04, 6.97),
                ...(variant === "damaged_reversed" ? { scale: Vec(-1, 1) } : {}),
                rotation: Math.PI,
                tint
            },
            ...(variant === "gas_can"
                ? [
                    {
                        key: "fire_danger_symbol",
                        position: Vec(0, 0),
                        rotation: -Math.PI / 4
                    },
                    {
                        key: "danger_tape",
                        position: Vec(0, -10.1)
                    },
                    {
                        key: "danger_tape",
                        position: Vec(0, 10.1)
                    }
                ]
                : []),
            ...(color.includes("military")
                ? [
                    {
                        key: "nsd_logo_cont",
                        position: Vec(0, 0),
                        scale: Vec(2, 2),
                        tint
                    },
                    {
                        key: "danger_tape",
                        position: Vec(0, -10.1),
                        scale: Vec(-1, 1),
                        alpha: 0.5,
                        tint: 0xff9500
                    },
                    {
                        key: "danger_tape",
                        position: Vec(0, 10.1),
                        alpha: 0.5,
                        tint: 0xff9500
                    }
                ]
                : [])
            // TODO Detect mode somehow
            // ...(GameConstants.modeName === "winter" ? snowDecalDefinitions[open] : [])
        ],
        floors: [{
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(14, 28)
        }],
        floorZIndex: ZIndexes.BuildingsFloor + 1.1,
        ...(variant === "gas_can"
            ? {
                floorImages: [{
                    key: "large_refinery_barrel_residue",
                    position: Vec(-4, 0),
                    scale: Vec(0.5, 0.5),
                    alpha: 0.8
                }]
            }
            : {}),
        ...(
            closed
                ? {}
                : variant === "gas_can"
                    ? {
                        lootSpawners: IS_CLIENT ? undefined : [
                            {
                                position: Vec(0, -8.5),
                                table: "gas_can"
                            }
                        ]
                    }
                    : color.includes("military")
                        ? {
                            lootSpawners: IS_CLIENT ? undefined : [
                                {
                                    position: Vec(0, 0),
                                    table: "airdrop_guns"
                                },
                                {
                                    position: Vec(0, 0),
                                    table: "military_container_skins"
                                }
                            ]
                        }
                        : {
                            lootSpawners: IS_CLIENT ? undefined : [
                                {
                                    position: Vec(0, 0),
                                    table: "ground_loot"
                                }
                            ]
                        }
        ),
        ...(variant === "gas_can"
            ? {
                obstacles: IS_CLIENT ? undefined : [
                    { idString: "propane_tank", position: Vec(3, 10) },
                    { idString: "propane_tank", position: Vec(-3, 10) }
                ]
            }
            : {})
    } as const;
};
const hollowLog = (
    id: number,
    variant: "damaged" | "moldy" | "extended"
): BuildingDefinition => {
    return {
        idString: `hollow_log_${id}`,
        name: "Hollow Log",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(11.05, 21.97),
        ceilingHitbox: RectangleHitbox.fromRect(4.78, 19.66),
        ceilingImages: [{
            key: `hollow_log_ceiling_${variant}`,
            position: Vec(variant === "extended" ? -0.75 : 0, 0),
            scale: Vec(2.06, 1.985),
            residue: "hollow_log_ceiling_residue",
            residuePosition: Vec(0, 0)
        }],
        ceilingCollapseParticle: "hollow_log_ceiling_particle",
        resetCeilingResidueScale: true,
        floorZIndex: ZIndexes.BuildingsFloor + 0.55,
        floorImages: [{
            key: "hollow_log_floor",
            position: Vec(0, 0)
        }],
        wallsToDestroy: 1,
        obstacles: IS_CLIENT ? undefined : [
            { idString: "hollow_log_wall", position: Vec(-3.23, 0), rotation: 0 },
            { idString: "hollow_log_wall", position: Vec(3.28, 0), rotation: 0 }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            {
                table: "hollow_log",
                position: Vec(0, 4.8)
            },
            {
                table: "hollow_log",
                position: Vec(0, -4.8)
            }
        ],
        floors: [{
            type: FloorNames.Log,
            hitbox: RectangleHitbox.fromRect(8.21, 19.66)
        }]
    };
};
const truckContainer = (
    id: number,
    model: "two_sided" | "one_sided",
    obstacles: readonly BuildingObstacle[],
    subBuildings?: readonly SubBuilding[]
): BuildingDefinition => {
    const chosen = pickRandomInArray(Object.keys(TruckContainerTints));
    const tint = TruckContainerTints[chosen as "teal" | "orange" | "purple" | "green" | "red"];

    const hitbox = model === "one_sided"
        ? new GroupHitbox(
            RectangleHitbox.fromRect(1.55, 15.05, Vec(-6.59, 12.28)),
            RectangleHitbox.fromRect(1.55, 15.05, Vec(-6.6, -12.3)),
            RectangleHitbox.fromRect(1.61, 39.65, Vec(6.6, 0)),
            RectangleHitbox.fromRect(12.93, 1.6, Vec(0.07, -19.01))
        )
        : new GroupHitbox(
            RectangleHitbox.fromRect(1.55, 15.05, Vec(-6.59, 12.28)),
            RectangleHitbox.fromRect(1.55, 15.05, Vec(6.59, 12.28)),
            RectangleHitbox.fromRect(1.55, 15.05, Vec(-6.59, -12.28)),
            RectangleHitbox.fromRect(1.55, 15.05, Vec(6.59, -12.28)),
            RectangleHitbox.fromRect(12.93, 1.6, Vec(0.07, -19.01))
        );

    return {
        idString: `truck_container_${id}`,
        name: `Truck Container ${id}`,
        defType: DefinitionType.Building,
        reflectBullets: true,
        material: "metal_heavy",
        particle: `truck_container_particle_${chosen}`,
        hitbox,
        spawnHitbox: RectangleHitbox.fromRect(18, 42),
        obstacles,
        ...(subBuildings === undefined ? {} : { subBuildings: subBuildings }),
        floorImages: [{
            key: `truck_container_floor_${model}`,
            position: Vec(0, 0),
            scale: Vec(2, 2),
            tint
        }],
        ceilingImages: [{
            key: `truck_container_ceiling_${model}`,
            position: Vec(0, 0),
            scale: Vec(2, 2),
            tint
        }],
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(12, 38.3, Vec(0.07, 0.67)),
            RectangleHitbox.fromRect(14.77, 9.54, Vec(0, 0))
        ),
        floors: [{
            type: FloorNames.Metal,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(12, 38.3, Vec(0.07, 0.67)),
                RectangleHitbox.fromRect(14.77, 9.54, Vec(0, 0))
            )
        }]
    };
};

const truck = (
    id: number,
    model: "two_sided" | "one_sided"
): BuildingDefinition => {
    return {
        idString: `truck_${id}`,
        name: `Truck ${id}`,
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(25, 60, Vec(0, 6)),
        obstacles: IS_CLIENT ? undefined : [
            { idString: "truck_front", position: Vec(0, -11.5), rotation: 0 },
            { idString: "truck_tire", position: Vec(-7.15, 30.81), rotation: 0 },
            { idString: "truck_tire", position: Vec(7.15, 30.81), rotation: 0 },
            { idString: "truck_tire", position: Vec(7.15, 24.71), rotation: 0 },
            { idString: "truck_tire", position: Vec(-7.15, 24.71), rotation: 0 },
            { idString: "truck_tire", position: Vec(-7.15, -0.5), rotation: 0 },
            { idString: "truck_tire", position: Vec(7.15, -0.5), rotation: 0 },
            { idString: "truck_tire", position: Vec(-7.15, 5.84), rotation: 0 },
            { idString: "truck_tire", position: Vec(7.15, 5.84), rotation: 0 }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: model === "two_sided" ? randomTruckContainerTwoSided : randomTruckContainerOneSided,
            position: Vec(0, 15)
        }]
    };
};

const pallet = (
    id: number,
    obstacles: readonly BuildingObstacle[]
): BuildingDefinition => {
    return {
        idString: `pallet_${id}`,
        name: `Pallet ${id}`,
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(10.1, 9),
        obstacles: IS_CLIENT ? undefined : [
            { idString: "pallet", position: Vec(0, 0), rotation: 0 },
            ...obstacles
        ]
    };
};

const riverHut = (id: number, obstacles: readonly BuildingObstacle[]): BuildingDefinition => {
    const bridgeUpstairs = 31.5;
    return {
        idString: `river_hut_${id}`,
        name: "River Hut",
        defType: DefinitionType.Building,
        wallsToDestroy: 3,
        ceilingCollapseParticle: "river_hut_ceiling_particle",
        spawnMode: MapObjectSpawnMode.Beach, // TODO: river bank spawn mode support
        spawnHitbox: RectangleHitbox.fromRect(70, 70, Vec(8, 0)),
        spawnOffset: Vec(10, 0),
        ceilingHitbox: RectangleHitbox.fromRect(32.5, 39.25), // RectangleHitbox.fromRect(30.6, 37),
        floorImages: [
            {
                key: "river_hut_bridge_floor_1",
                position: Vec(20.15, -10.5)
            },
            {
                key: "river_hut_bridge_floor_2",
                position: Vec(bridgeUpstairs, -5),
                scale: Vec(2, 2)
            },
            {
                key: "river_hut_floor",
                position: Vec(-2.6, 0),
                scale: Vec(2.14, 2.14)
            }
        ],
        ceilingImages: [{
            key: "river_hut_ceiling",
            position: Vec(0, 0),
            scale: Vec(2.1, 2.1),
            residue: "river_hut_residue"
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(32.5, 39.25),
                    RectangleHitbox.fromRect(10, 13, Vec(20.4, -10.5)),
                    RectangleHitbox.fromRect(13, 46, Vec(bridgeUpstairs, -5))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(5.3, 11, Vec(-18.7, 12))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "door", position: Vec(-15.5, 12.18), rotation: 1 },
            { idString: "house_wall_20", position: Vec(0, -18.65), rotation: 0 },
            { idString: "house_wall_21", position: Vec(15.38, 8.12), rotation: 1 },
            { idString: "house_wall_22", position: Vec(-0.87, 18.68), rotation: 0 },
            { idString: "house_wall_23", position: Vec(-15.35, -5.09), rotation: 1 },
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
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(31, 23),
        ceilingHitbox: RectangleHitbox.fromRect(26, 16),
        floorImages: [{
            key: "tent_floor",
            position: Vec(0, 0),
            scale: Vec(1.02, 1.02),
            tint: tint
        }],
        ceilingImages: [{
            key: "tent_ceiling",
            position: Vec(0, 0),
            tint: tint,
            residue: "tent_residue",
            scale: Vec(2.04, 2.04)
        }],
        floors: [{
            type: FloorNames.Carpet,
            hitbox: RectangleHitbox.fromRect(26.5, 18)
        }],
        ceilingCollapseSound: "tent_collapse",
        ceilingCollapseParticle: `tent_ceiling_particle_${color}`,
        ceilingCollapseParticleVariations: 3,
        resetCeilingResidueScale: true,
        destroyOnCeilingCollapse: ["pole", `tent_wall_${id}`],
        wallsToDestroy: 1,
        obstacles: IS_CLIENT ? undefined : (
            special
                ? [
                    { idString: "pole", position: Vec(0, 0) },
                    { idString: `tent_wall_${id}`, position: Vec(0, -8), rotation: 0 },
                    { idString: `tent_wall_${id}`, position: Vec(0, 8), rotation: 2 },
                    { idString: "gun_case", position: Vec(0, 5), rotation: 2 }
                ]
                : [
                    { idString: "pole", position: Vec(0, 0) },
                    { idString: `tent_wall_${id}`, position: Vec(0, -8), rotation: 0 },
                    { idString: `tent_wall_${id}`, position: Vec(0, 8), rotation: 2 },
                    { idString: "box", position: Vec(0, 5) }
                ]
        ),
        lootSpawners: IS_CLIENT ? undefined : [{
            table: special ? "warehouse" : "ground_loot",
            position: Vec(0, -5)
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
    defType: DefinitionType.Building,
    spawnHitbox: RectangleHitbox.fromRect(47, 32),
    ceilingHitbox: RectangleHitbox.fromRect(33.5, 24.5, Vec(-1.2, -0.5)),
    floorImages: [{
        key: "fall_patch_floor",
        position: Vec(0, 0),
        scale: Vec(2.14, 2.14),
        zIndex: ZIndexes.Ground
    }],
    ceilingImages: [{
        key: `hay_shed_ceiling_${ceilingVariation}`,
        position: Vec(-1, -0.5),
        residue: "hay_shed_residue",
        scale: Vec(2.14, 2.14)
    }],
    ceilingCollapseParticle: "hay_shed_ceiling_particle",
    ceilingCollapseParticleVariations: 2,
    wallsToDestroy: 2,
    obstacles: IS_CLIENT ? undefined : [
        { idString: "pole", position: Vec(14.04, -11.53) },
        { idString: "pole", position: Vec(-16.68, -11.55) },
        { idString: "pole", position: Vec(-16.52, 10.83) },
        { idString: "pole", position: Vec(13.98, 10.87) },
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
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(58, 35),
        ceilingHitbox: RectangleHitbox.fromRect(44, 27),
        floorImages: [{
            key: "tent_floor_big",
            position: Vec(0, 0),
            scale: Vec(2.04, 2.04),
            tint
        }],
        ceilingImages: [{
            key: "tent_ceiling_big",
            position: Vec(0, 0),
            tint,
            residue: "tent_residue_big",
            scale: Vec(2.02, 2.02)
        }],
        floors: [{
            type: FloorNames.Carpet,
            hitbox: RectangleHitbox.fromRect(44.25, 29)
        }],
        ceilingCollapseSound: "tent_collapse",
        ceilingCollapseParticle: `tent_ceiling_particle_${color}`,
        ceilingCollapseParticleVariations: 3,
        wallsToDestroy: 1,
        destroyOnCeilingCollapse: ["pole", `tent_wall_big_${id}`, "tent_window"],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "pole", position: Vec(3.42, -5.76) },
            { idString: "pole", position: Vec(-3.42, 5.76) },
            { idString: `tent_wall_big_${id}`, position: Vec(0, -10.5), rotation: 2 },
            { idString: `tent_wall_big_${id}`, position: Vec(0, 10.5), rotation: 0 },
            { idString: "office_chair", position: Vec(-17, -9.73), rotation: 1 },
            { idString: { box: 1, office_chair: 2 }, position: Vec(25.5, 9.65), rotation: 2 },
            { idString: { grenade_box: 1, box: 0.5 }, position: Vec(-18.07, 10.49) },
            { idString: "box", position: Vec(-0.07, -10.51) },
            { idString: "small_bed", position: Vec(12, 8.56), rotation: 3 },
            { idString: "box", position: Vec(18.17, -10.51), rotation: 0 },
            { idString: { box: 2, office_chair: 1 }, position: Vec(-25.5, -9.65), rotation: 0 },
            { idString: "tent_window", position: Vec(9.11, -14.03), rotation: 0 },
            { idString: "tent_window", position: Vec(-9.11, -14.03), rotation: 0 },
            { idString: "tent_window", position: Vec(-9.11, 14.03), rotation: 0 },
            { idString: "tent_window", position: Vec(9.11, 14.03), rotation: 0 }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(-10.68, 0) },
            { table: "ground_loot", position: Vec(10.68, 0) }
        ]
    };
};

const tugboat = (color: string, mainLoot: string): BuildingDefinition => ({
    idString: `tugboat_${color}`,
    name: "Tugboat",
    defType: DefinitionType.Building,
    reflectBullets: true,
    material: "metal_heavy",
    particle: "metal_particle",
    hitbox: new GroupHitbox(
        RectangleHitbox.fromRect(8.93, 2.09, Vec(80.47, -4.78)),
        RectangleHitbox.fromRect(8.93, 2.09, Vec(99.51, -4.78)),
        RectangleHitbox.fromRect(2.21, 35.83, Vec(104.37, 12.09)),
        RectangleHitbox.fromRect(2.14, 35.83, Vec(75.67, 12.09)),
        RectangleHitbox.fromRect(30.88, 1.98, Vec(90.04, 29.78)),
        RectangleHitbox.fromRect(0.99, 14, Vec(69.21, -38)),
        RectangleHitbox.fromRect(12, 1, Vec(76, -46.2)),
        RectangleHitbox.fromRect(13, 1, Vec(103.5, -46.2)),
        RectangleHitbox.fromRect(1, 73, Vec(110.59, -8.5)),
        RectangleHitbox.fromRect(0.99, 45, Vec(69.21, 5.5)),
        new CircleHitbox(1.45, Vec(70.1, -45.5)),
        new CircleHitbox(1.45, Vec(81.7, -45.5)),
        new CircleHitbox(1.45, Vec(97.4, -45.5)),
        new CircleHitbox(1.45, Vec(109.7, -45.5)),
        new CircleHitbox(1.45, Vec(109.7, -30.8)),
        new CircleHitbox(1.45, Vec(70.1, -30.8)),
        new CircleHitbox(1.45, Vec(109.7, -16.6)),
        new CircleHitbox(1.45, Vec(70.1, -16.6)),
        new CircleHitbox(1.45, Vec(109.7, -1.6)),
        new CircleHitbox(1.45, Vec(70.1, -1.6)),
        new CircleHitbox(1.45, Vec(109.7, 13.4)),
        new CircleHitbox(1.45, Vec(70.1, 13.4)),
        new CircleHitbox(1.45, Vec(109.7, 27.6)),
        new CircleHitbox(1.45, Vec(70.1, 27.6)),
        new CircleHitbox(2, Vec(90, 45)),
        new CircleHitbox(2, Vec(91.5, 44.99)),
        new CircleHitbox(2, Vec(93, 44.95)),
        new CircleHitbox(2, Vec(94.5, 44.84)),
        new CircleHitbox(2, Vec(96, 44.61)),
        new CircleHitbox(2, Vec(97.5, 44.23)),
        new CircleHitbox(2, Vec(99, 43.65)),
        new CircleHitbox(2, Vec(100.5, 42.8)),
        new CircleHitbox(2, Vec(102, 41.61)),
        new CircleHitbox(2, Vec(103.5, 39.99)),
        new CircleHitbox(2, Vec(105, 37.78)),
        new CircleHitbox(2, Vec(106.5, 34.72)),
        new CircleHitbox(2, Vec(108, 30.23)),
        new CircleHitbox(2, Vec(90, 45)),
        new CircleHitbox(2, Vec(88.5, 44.99)),
        new CircleHitbox(2, Vec(87, 44.95)),
        new CircleHitbox(2, Vec(85.5, 44.84)),
        new CircleHitbox(2, Vec(84, 44.61)),
        new CircleHitbox(2, Vec(82.5, 44.23)),
        new CircleHitbox(2, Vec(81, 43.65)),
        new CircleHitbox(2, Vec(79.5, 42.8)),
        new CircleHitbox(2, Vec(78, 41.61)),
        new CircleHitbox(2, Vec(76.5, 39.99)),
        new CircleHitbox(2, Vec(75, 37.78)),
        new CircleHitbox(2, Vec(73.5, 34.72)),
        new CircleHitbox(2, Vec(72, 30.23))
    ),
    spawnMode: MapObjectSpawnMode.Beach,
    spawnHitbox: RectangleHitbox.fromRect(70, 110, Vec(90, 0)),
    ceilingHitbox: RectangleHitbox.fromRect(30, 35, Vec(90, 12.5)),
    floorImages: [
        {
            key: `tugboat_${color}_floor_1`,
            position: Vec(90, -23.7)
        },
        {
            key: `tugboat_${color}_floor_2`,
            position: Vec(90, 23.7)
        }
    ],
    ceilingImages: [{
        key: `tugboat_${color}_ceiling`,
        position: Vec(90, 12.5)
    }],
    floors: [
        { type: FloorNames.Wood, hitbox: RectangleHitbox.fromRect(29, 71.5, Vec(90, -7)) },
        { type: FloorNames.Metal, hitbox: RectangleHitbox.fromRect(39.5, 75, Vec(90, -8)) },
        { type: FloorNames.Metal, hitbox: RectangleHitbox.fromRect(9.7, 10, Vec(71, -23.7)) },
        { type: FloorNames.Metal, hitbox: RectangleHitbox.fromRect(10, 8.7, Vec(89.9, -46)) }
    ],
    obstacles: IS_CLIENT ? undefined : [
        { idString: "tire", position: Vec(111.28, 5.18), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec(111.4, 14.57), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec(111.4, 24.17), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec(71.55, 24.17), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec(71.5, 14.57), rotation: 0, outdoors: true },
        { idString: "tire", position: Vec(71.45, 5.12), rotation: 0, outdoors: true },
        { idString: "regular_crate", position: Vec(81.48, -37.36), outdoors: true },
        { idString: "regular_crate", position: Vec(101.49, -11.45), outdoors: true },
        { idString: "grenade_crate", position: Vec(102.3, -38.43), outdoors: true },
        { idString: "barrel", position: Vec(102.74, -26.23), outdoors: true },
        { idString: "tugboat_control_panel", position: Vec(90, 24.1), rotation: 0 },
        { idString: "office_chair", position: Vec(90, 16.65), rotation: 0 },
        { idString: "door", position: Vec(90.45, -4.8), rotation: 0 },
        { idString: "large_drawer", position: Vec(99.29, 2.98), rotation: 3 },
        { idString: "life_preserver", position: Vec(101.23, 14.67), rotation: 0 },
        { idString: mainLoot, position: Vec(80.38, 4.29), rotation: 1 },
        { idString: "window2", position: Vec(83.91, 30.75), rotation: 1 },
        { idString: "window2", position: Vec(95.63, 30.75), rotation: 1 }
    ],
    ...(
        color === "red"
            ? {
                lootSpawners: IS_CLIENT ? undefined : [
                    { table: "tugboat_red_floor", position: Vec(89, -25) }
                ]
            }
            : {}
    )
} as const);

const blueHouse = (idString: string, subBuildings: BuildingDefinition["subBuildings"] = []): BuildingDefinition => ({
    idString,
    name: "Blue House",
    defType: DefinitionType.Building,
    hitbox: new GroupHitbox(
        // Left.
        RectangleHitbox.fromRect(2, 11, Vec(-34.4, 18.25)),
        RectangleHitbox.fromRect(2, 32.55, Vec(-34.4, -14.6)),

        // Right.
        RectangleHitbox.fromRect(2, 20.5, Vec(34.5, 13.1)),
        RectangleHitbox.fromRect(2, 21.5, Vec(34.5, -19)),

        // Center and corners.
        RectangleHitbox.fromRect(10, 2, Vec(-29.25, -29.9)), // TL
        RectangleHitbox.fromRect(6, 2, Vec(-10.8, -29.9)),
        RectangleHitbox.fromRect(58, 2, Vec(5.6, 22.5)),
        RectangleHitbox.fromRect(33.4, 2, Vec(18.9, -29.9)), // TR

        RectangleHitbox.fromRect(3, 3, Vec(7.5, -12.5))
    ),
    material: "stone",
    particle: "wall_particle",
    spawnHitbox: RectangleHitbox.fromRect(90, 90),
    bunkerSpawnHitbox: idString === "blue_house_special" ? RectangleHitbox.fromRect(75, 70, Vec(1.5, 4.25)) : undefined, // evil
    ceilingHitbox: new GroupHitbox(
        RectangleHitbox.fromRect(68, 53, Vec(0, -3.5)),
        RectangleHitbox.fromRect(11, 10, Vec(-28, 27))
    ),
    floorImages: [
        {
            key: "blue_house_floor_2_1",
            position: Vec(-18.67, 17.97),
            scale: Vec(1.07, 1.07)
        },
        {
            key: "blue_house_floor_1",
            position: Vec(0, -17),
            scale: Vec(1.07, 1.07)
        }
    ],
    ceilingImages: [{
        key: "blue_house_ceiling",
        position: Vec(0, 1.5),
        scale: Vec(2.3, 2.3)
    }],
    floors: [
        {
            type: FloorNames.Stone,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(11, 5.5, Vec(-3.25, -32.6)),
                RectangleHitbox.fromRect(71, 11, Vec(0, 29)),
                // mini vault
                RectangleHitbox.fromRect(22.5, 11, Vec(20.5, 14)),
                RectangleHitbox.fromRect(10, 14, Vec(26.5, 12))
            )
        },
        {
            type: FloorNames.Wood,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(41, 52, Vec(-13.5, -3.6)),
                RectangleHitbox.fromRect(41, 34, Vec(13.5, -12)),

                // patches
                RectangleHitbox.fromRect(12, 2, Vec(-28, 22.5)),
                RectangleHitbox.fromRect(12, 2, Vec(-3.3, -30)),
                RectangleHitbox.fromRect(14, 2, Vec(13, 6))
            )
        }
    ],
    obstacles: IS_CLIENT ? undefined : [
        // windows
        { idString: "window", position: Vec(-34.7, 7.2), rotation: 0 },
        { idString: "window", position: Vec(34.7, -2.6), rotation: 0 },
        { idString: "window", position: Vec(-18.9, -30), rotation: 1 },

        // door fun
        { idString: "door", position: Vec(-3.3, -29.9), rotation: 2 },
        { idString: "door", position: Vec(-29, 22.6), rotation: 2 },

        // outside part
        { idString: "barrel", position: Vec(-7, 29), outdoors: true },
        { idString: { box: 1, trash_bag: 0.6 }, position: Vec(25, 27), outdoors: true },
        { idString: "box", position: Vec(19, 28.5), outdoors: true },

        // top right
        { idString: "house_wall_6", position: Vec(7.5, -21.5), rotation: 1 },
        { idString: "small_drawer", position: Vec(30.25, -25), rotation: 0 },
        { idString: "fridge", position: Vec(21.5, -25.1), rotation: 0 },
        { idString: randomSmallStove, position: Vec(12.5, -25), rotation: 0 },
        //   { idString: "bookshelf", position: Vec(4.25, -22), rotation: 1 },

        // bottom right (mini vault ig)
        { idString: "house_wall_14", position: Vec(6.25, 13.1), rotation: 1 },
        { idString: "metal_door", position: Vec(26.15, 5.7), rotation: 2 },
        { idString: "box", position: Vec(16, 1.7) },

        // bathroom
        { idString: "house_wall_3", position: Vec(-10.5, 5.6), rotation: 0 },
        { idString: { toilet: 2, used_toilet: 1 }, position: Vec(-11.25, 10.1), rotation: 1 },
        { idString: "small_drawer", position: Vec(-11.6, 17.5), rotation: 1 },
        { idString: "door", position: Vec(-0.2, 5.6), rotation: 2 },
        { idString: "house_wall_14", position: Vec(-17, 13.15), rotation: 1 },
        { idString: "bookshelf", position: Vec(-20.27, 15), rotation: 1 },
        { idString: "trash_can", position: Vec(2.1, 18) },

        // top left
        { idString: "house_wall_16", position: Vec(-10, -13.65), rotation: 1 },
        { idString: "door", position: Vec(-10, -23.5), rotation: 3 },
        { idString: "house_wall_17", position: Vec(-22.26, -9.4), rotation: 0 },
        { idString: "small_drawer", position: Vec(-14.7, -14.5), rotation: 2 },
        { idString: "small_bed", position: Vec(-29.25, -19.9), rotation: 2 },
        { idString: "bookshelf", position: Vec(-15.25, -6), rotation: 0 },
        { idString: "potted_plant", position: Vec(-29, -4) },

        // TEMP: Remove if halloween ends.
        { idString: "cobweb", position: Vec(28.86, -24.21), rotation: 3 },
        { idString: "jack_o_lantern", position: Vec(11.49, -35.99), rotation: 3 },
        { idString: "small_lamp_thingy", position: Vec(-1.25, -3.7) }
    ],
    subBuildings: subBuildings.length > 1
        ? [
            { idString: "blue_house_vault", position: Vec(-14.1, 20.5), orientation: 1 },
            ...subBuildings
        ]
        : [
            { idString: "blue_house_vault", position: Vec(-14.1, 20.5), orientation: 1 },
            {
                idString: {
                    blue_house_vault_layout_1: 1,
                    blue_house_vault_layout_3: 1,
                    blue_house_vault_layout_4: 1,
                    blue_house_vault_layout_5: 1,
                    blue_house_vault_layout_6: 1,
                    blue_house_vault_layout_7: 0.5

                },
                position: Vec(0, 0)
            },
            ...subBuildings
        ]
});

const shed = (num: number, ceilingTint: number): BuildingDefinition => ({
    idString: `shed_${num}`,
    name: "Shed",
    defType: DefinitionType.Building,
    material: "stone",
    particle: "rock_particle",
    particleVariations: 2,
    hitbox: new GroupHitbox(
        RectangleHitbox.fromRect(1.75, 29.5, Vec(-11.03, -1.7)), // Left wall
        RectangleHitbox.fromRect(1.75, 9.2, Vec(9.43, -11.9)), // Right wall above window
        RectangleHitbox.fromRect(1.75, 10.7, Vec(9.43, 7.6)), // Right wall below window
        RectangleHitbox.fromRect(20, 1.75, Vec(-0.8, -15.56)), // Top wall
        RectangleHitbox.fromRect(9, 1.75, Vec(-6.05, 12.19)) // Bottom wall
    ),
    spawnHitbox: RectangleHitbox.fromRect(27, 37, Vec(-0.8, 0)),
    ceilingHitbox: RectangleHitbox.fromRect(20, 27.5, Vec(-0.8, -1.5)),
    floorImages: [
        {
            key: "shed_floor",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }
    ],
    ceilingImages: [
        {
            key: "shed_ceiling",
            position: Vec(-0.8, -1.6),
            tint: ceilingTint
        }
    ],
    floors: [
        {
            type: FloorNames.Stone,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(20.5, 27, Vec(-0.5, -2)),
                RectangleHitbox.fromRect(10, 4.5, Vec(3.55, 14))
            )
        }
    ],
    obstacles: IS_CLIENT ? undefined : [
        { idString: "door", position: Vec(3.95, 12.15), rotation: 0 },
        { idString: "window", position: Vec(9.45, -2.6), rotation: 0 },
        { idString: "bookshelf", position: Vec(-7.75, 4.9), rotation: 1 },
        { idString: "small_table", position: Vec(2.2, -10.35), rotation: 1, variation: 0 },
        { idString: "chair", position: Vec(2.2, -5.5), rotation: 0 },
        { idString: "trash_can", position: Vec(-7, -11.5), lootSpawnOffset: Vec(1, 1) }
    ]
});

export const Buildings = new ObjectDefinitions<BuildingDefinition>([
    pallet(1, [
        { idString: "box", position: Vec(-2.2, -1.9) },
        { idString: "box", position: Vec(2.2, 1.9) }
    ]),
    pallet(2, [
        { idString: "propane_tank", position: Vec(-2.41, -2.19) },
        { idString: "fence", position: Vec(-0.23, 2), rotation: 0 },
        { idString: "grenade_box", position: Vec(2.5, -1.8) }
    ]),
    pallet(3, [{ idString: "regular_crate", position: Vec(0, 0) }]),
    pallet(4, [
        { idString: "box", position: Vec(-2.73, -2.5) },
        { idString: "box", position: Vec(2.73, -2.4) },
        { idString: "grenade_box", position: Vec(-1.5, 2.15) }
    ]),
    pallet(5, [
        { idString: "fence", position: Vec(3.7, 0), rotation: 1 },
        { idString: randomBarrel, position: Vec(-1.16, 0.73) }
    ]),
    pallet(6, []), // blank/empty pallet
    {
        idString: "porta_potty",
        name: "Porta Potty",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(20, 32),
        ceilingHitbox: RectangleHitbox.fromRect(14, 18),
        floorImages: [
            {
                key: "porta_potty_floor",
                position: Vec(0, 1.5)
            }
        ],
        ceilingImages: [
            {
                key: "porta_potty_ceiling",
                position: Vec(0, 0),
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
                hitbox: RectangleHitbox.fromRect(9.8, 3.5, Vec(1.5, 10.6))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            {
                idString: {
                    porta_potty_toilet_open: 0.7,
                    porta_potty_toilet_closed: 0.3
                },
                position: Vec(0, -5),
                lootSpawnOffset: Vec(0, 5),
                rotation: 0
            },
            {
                idString: "porta_potty_back_wall",
                position: Vec(0, -8.75),
                rotation: 0
            },
            {
                idString: "porta_potty_sink_wall",
                position: Vec(-5.65, 0),
                rotation: 3
            },
            {
                idString: "porta_potty_toilet_paper_wall",
                position: Vec(5.7, 0),
                rotation: 3
            },
            {
                idString: "door2",
                position: Vec(2.2, 8.8),
                rotation: 0
            },
            {
                idString: "porta_potty_front_wall",
                position: Vec(-4.6, 8.66),
                rotation: 2
            }
        ]
    },
    {
        idString: "outhouse",
        name: "Outhouse",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(19, 29),
        ceilingHitbox: RectangleHitbox.fromRect(14.94, 20, Vec(0, -2.02)),
        floorImages: [
            {
                key: "outhouse_floor",
                position: Vec(0, 0)
            }
        ],
        ceilingImages: [
            {
                key: "outhouse_ceiling",
                position: Vec(0, -1.95),
                residue: "outhouse_residue"
            }
        ],
        wallsToDestroy: 2,
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(14.94, 20.8, Vec(0, -2.02))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10, 4.7, Vec(0, 10.07))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: randomToilet, position: Vec(0, -6), rotation: 0 },
            { idString: "outhouse_back_wall", position: Vec(0, -11.55), rotation: 0 },
            { idString: "outhouse_toilet_paper_wall", position: Vec(-5.58, -2.83), rotation: 0 },
            { idString: "outhouse_side_wall", position: Vec(6.76, -2.83), rotation: 0 },
            { idString: "outhouse_front_wall", position: Vec(6.25, 7.68), rotation: 0 },
            { idString: "outhouse_front_wall", position: Vec(-6.25, 7.68), rotation: 0 },
            { idString: "outhouse_door", position: Vec(-0.05, 7.64), rotation: 0 }
        ]
    },
    {
        idString: "firework_warehouse",
        name: "Firework Warehouse",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(27.7, 1.75, Vec(-19, -23)),
            RectangleHitbox.fromRect(27.7, 1.75, Vec(19, -23)),
            RectangleHitbox.fromRect(27.7, 1.75, Vec(-19, 23)),
            RectangleHitbox.fromRect(27.7, 1.75, Vec(19, 23)),
            RectangleHitbox.fromRect(1.75, 18, Vec(32.3, 15)),
            RectangleHitbox.fromRect(1.75, 18, Vec(32.3, -15)),
            RectangleHitbox.fromRect(1.75, 18, Vec(-32.3, 15)),
            RectangleHitbox.fromRect(1.75, 18, Vec(-32.3, -15))
        ),
        spawnHitbox: RectangleHitbox.fromRect(110, 70),
        ceilingHitbox: RectangleHitbox.fromRect(65, 48),
        floorImages: [
            {
                key: "firework_warehouse_floor_1_top",
                position: Vec(-17.4, -14)
            },
            {
                key: "firework_warehouse_floor_1_bottom",
                position: Vec(-17.4, 14)
            },
            {
                key: "firework_warehouse_floor_2_top",
                position: Vec(17.4, -14)
            },
            {
                key: "firework_warehouse_floor_2_bottom",
                position: Vec(17.4, 14)
            }
        ],
        ceilingImages: [
            {
                key: "firework_warehouse_ceiling_1",
                position: Vec(-16.5, 0),
                scale: Vec(2, 2)
            },

            {
                key: "firework_warehouse_ceiling_2",
                position: Vec(17, 0),
                scale: Vec(2, 2)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(65, 48, Vec(0, 0))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: randomBarrel, position: Vec(-27, 18) },
            { idString: randomBarrel, position: Vec(27, -18) },
            { idString: "window", position: Vec(32.4, 0), rotation: 2 },
            { idString: "window", position: Vec(-32.4, 0), rotation: 2 },
            { idString: "door", position: Vec(-0.47, 23), rotation: 2 },
            { idString: "door", position: Vec(0.47, -23), rotation: 0 },
            { idString: "confetti_grenade_box", position: Vec(29, -12) },
            { idString: "rocket_box", position: Vec(-29, 12) },
            { idString: "confetti_grenade_box", position: Vec(-27, 7) },
            { idString: "rocket_box", position: Vec(-22, 9) },
            { idString: fireworkWarehouseObstacle, position: Vec(-17, 17) },
            { idString: fireworkWarehouseObstacle, position: Vec(17, -17) },
            { idString: "ammo_crate", position: Vec(26.8, 17) },
            { idString: fireworkWarehouseObstacle, position: Vec(-26.8, -17) },
            { idString: { box: 9, grenade_box: 1 }, position: Vec(18.8, 14) },
            { idString: "confetti_grenade_box", position: Vec(20, 19) },
            { idString: "hazel_crate", position: Vec(0, 0) }
        ]
    },

    {
        idString: "mini_warehouse",
        name: "Mini Warehouse",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(27.7, 1.75, Vec(-19, -23)),
            RectangleHitbox.fromRect(27.7, 1.75, Vec(19, -23)),
            RectangleHitbox.fromRect(27.7, 1.75, Vec(-19, 23)),
            RectangleHitbox.fromRect(27.7, 1.75, Vec(19, 23)),
            RectangleHitbox.fromRect(1.75, 18, Vec(32.3, 15)),
            RectangleHitbox.fromRect(1.75, 18, Vec(32.3, -15)),
            RectangleHitbox.fromRect(1.75, 18, Vec(-32.3, 15)),
            RectangleHitbox.fromRect(1.75, 18, Vec(-32.3, -15))
        ),
        spawnHitbox: RectangleHitbox.fromRect(110, 70),
        ceilingHitbox: RectangleHitbox.fromRect(65, 45),
        floorImages: [
            {
                key: "mini_warehouse_floor_1_top",
                position: Vec(-17.4, -14)
            },
            {
                key: "mini_warehouse_floor_1_bottom",
                position: Vec(-17.4, 14)
            },
            {
                key: "mini_warehouse_floor_2_top",
                position: Vec(17.4, -14)
            },
            {
                key: "mini_warehouse_floor_2_bottom",
                position: Vec(17.4, 14)
            }
        ],
        ceilingImages: [
            {
                key: "mini_warehouse_ceiling_1",
                position: Vec(-16.5, 0),
                scale: Vec(2, 2)
            },

            {
                key: "mini_warehouse_ceiling_2",
                position: Vec(17, 0),
                scale: Vec(2, 2)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(65, 48, Vec(0, 0))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: randomBarrel, position: Vec(-27, 18) },
            { idString: randomBarrel, position: Vec(27, -18) },
            { idString: "window", position: Vec(32.4, 0), rotation: 2 },
            { idString: "window", position: Vec(-32.4, 0), rotation: 2 },
            { idString: "door", position: Vec(-0.47, 23), rotation: 2 },
            { idString: "door", position: Vec(0.47, -23), rotation: 0 },
            { idString: "box", position: Vec(29, -12) },
            { idString: "baby_plumpkin_infection", position: Vec(-29, 12) },
            { idString: "grenade_box", position: Vec(-27, 7) },
            { idString: "baby_plumpkin_infection", position: Vec(-22, 9) },
            { idString: "propane_tank", position: Vec(-17, 17) },
            { idString: "baby_plumpkin_infection", position: Vec(17, -17) },
            { idString: "ammo_crate", position: Vec(26.8, 17) },
            { idString: "regular_crate", position: Vec(-26, -17) },
            { idString: { box: 9, grenade_box: 1 }, position: Vec(18.8, 14) },
            { idString: "grenade_box", position: Vec(20, 19) },
            { idString: "hazel_crate", position: Vec(0, 0) }
        ]
    },

    warehouseLayout(1, [
        // top left
        { idString: "ammo_crate", position: Vec(-19.53, -26.33) },

        // top right
        { idString: "box", position: Vec(22.08, -38.77) },
        { idString: "box", position: Vec(17, -38) },
        { idString: "box", position: Vec(20.47, -33) },
        { idString: "super_barrel", position: Vec(20.13, -26.24) },

        // center
        { idString: "ammo_crate", position: Vec(-10, 0) },
        { idString: "ammo_crate", position: Vec(10, 0) },
        { idString: "regular_crate", position: Vec(0, 5) },
        { idString: "regular_crate", position: Vec(0, -5) },

        // bottom left
        { idString: "barrel", position: Vec(-20.34, 27.05) },

        // bottom right
        { idString: "box", position: Vec(21.65, 28.5) },
        { idString: "regular_crate", position: Vec(19.39, 36.48) }
    ]),

    warehouseLayout(2, [
        // top left
        { idString: "barrel", position: Vec(-20.34, -27.05) },
        { idString: "grenade_box", position: Vec(-21.81, -19.82) },

        // top right
        { idString: "regular_crate", position: Vec(19.39, -36.48) },
        { idString: "super_barrel", position: Vec(20.13, -26.24) },

        // center
        { idString: "ammo_crate", position: Vec(-10, 0) },
        { idString: "ammo_crate", position: Vec(10, 0) },
        { idString: "barrel", position: Vec(0, 5) },
        { idString: "box", position: Vec(-2.26, -3.25) },
        { idString: "box", position: Vec(2.5, -7.02) },
        { idString: "box", position: Vec(8.39, 8.04) },
        { idString: "box", position: Vec(-8.39, 8.04) },

        // bottom left
        { idString: "ammo_crate", position: Vec(-19.53, 26.33) },
        { idString: "box", position: Vec(-21.74, 17.98) },

        // bottom right
        { idString: "box", position: Vec(21.65, 28.5) },
        { idString: "grenade_box", position: Vec(17.06, 23.3) },
        { idString: "regular_crate", position: Vec(19.39, 36.48) }
    ]),

    warehouseLayout(3, [
        // top left
        { idString: "barrel", position: Vec(-20.34, -26.33) },

        // top right
        { idString: "grenade_crate", position: Vec(20.42, -37.61) },
        { idString: "barrel", position: Vec(20.13, -28.5) },

        // center
        { idString: "regular_crate", position: Vec(-10, 0) },
        { idString: "regular_crate", position: Vec(10, 0) },
        { idString: "ammo_crate", position: Vec(0, 5) },
        { idString: "ammo_crate", position: Vec(0, -5) },

        // bottom left
        { idString: "super_barrel", position: Vec(-20.34, 27.05) },

        // bottom right
        { idString: "box", position: Vec(16.57, 38.75) },
        { idString: "box", position: Vec(21.97, 33.38) },
        { idString: "grenade_box", position: Vec(21.96, 38.75) }
    ]),

    warehouseLayout(4, [
        // top left
        { idString: "barrel", position: Vec(-19.39, -26.33) },

        // top right
        { idString: "ammo_crate", position: Vec(19.39, -36.48) },

        // center
        { idString: "super_barrel", position: Vec(0, 0) },

        { idString: "box", position: Vec(-7.84, -1.9) },
        { idString: "box", position: Vec(-12.28, 2.68) },
        { idString: "pallet", position: Vec(-10.21, 0.18), rotation: 1 },

        { idString: "pallet", position: Vec(10.21, 0.18), rotation: 1 },
        { idString: "grenade_crate", position: Vec(11.43, -2.41) },
        { idString: "box", position: Vec(7.84, 3.5) },

        { idString: "regular_crate", position: Vec(0, 10) },

        { idString: "pallet", position: Vec(0, -10), rotation: 0 },
        { idString: "box", position: Vec(-2.32, -12.17) },
        { idString: "grenade_box", position: Vec(-0.36, -7.65) },
        { idString: "box", position: Vec(2.79, -12.25) },

        // sides
        { idString: "ammo_crate", position: Vec(19.7, 0) },
        { idString: "ammo_crate", position: Vec(-19.7, 0) },

        // bottom right
        { idString: "barrel", position: Vec(19.39, 36.48) },
        { idString: "pallet", position: Vec(19.53, 26.04), rotation: 1 },
        { idString: "box", position: Vec(21.19, 23.6) },
        { idString: "grenade_box", position: Vec(17.61, 28.33) }

    ]),

    {
        idString: "warehouse",
        name: "Warehouse",
        defType: DefinitionType.Building,
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14.05, 1.97, Vec(-20.01, -43.01)),
            RectangleHitbox.fromRect(14.05, 1.97, Vec(20.01, -43.01)),
            RectangleHitbox.fromRect(14.05, 1.97, Vec(-20.01, 43.01)),
            RectangleHitbox.fromRect(14.05, 1.97, Vec(20.01, 43.01)),
            RectangleHitbox.fromRect(1.97, 87.84, Vec(-26, 0)),
            RectangleHitbox.fromRect(1.97, 87.84, Vec(26, 0))
        ),
        spawnHitbox: RectangleHitbox.fromRect(63.07, 114),
        ceilingHitbox: RectangleHitbox.fromRect(52.92, 89),
        floorImages: [
            {
                key: "warehouse_floor_1",
                position: Vec(0, -26.5)
            },
            {
                key: "warehouse_floor_2",
                position: Vec(0, 26.5)
            }
        ],
        ceilingImages: [
            {
                key: "warehouse_ceiling_1",
                position: Vec(0, -22.25),
                scale: Vec(2, 2)
            },
            {
                key: "warehouse_ceiling_2",
                position: Vec(0, 22.25),
                scale: Vec(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Stone,
            hitbox: RectangleHitbox.fromRect(54.04, 105.96)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: warehouseObstacle, position: Vec(-19.39, -36.48) },
            { idString: warehouseObstacle, position: Vec(-19.39, 36.48) },

            // TEMP: Remove if halloween ends.
            { idString: "small_lamp_thingy", position: Vec(0.27, 26.93) },
            { idString: "small_lamp_thingy", position: Vec(0.27, -25.15) },
            { idString: "cobweb", position: Vec(-20.19, -37.18), rotation: 0 },
            { idString: "cobweb", position: Vec(20.14, 37.32), rotation: 2 }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: {
                warehouse_layout_1: 1,
                warehouse_layout_2: 1,
                warehouse_layout_3: 1,
                warehouse_layout_4: 1
            },
            position: Vec(0, 0)
        }]
    },
    {
        idString: "port_warehouse",
        name: "Port Warehouse",
        defType: DefinitionType.Building,
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14.05, 1.97, Vec(-20.01, -43.01)),
            RectangleHitbox.fromRect(14.05, 1.97, Vec(20.01, -43.01)),
            RectangleHitbox.fromRect(14.05, 1.97, Vec(-20.01, 43.01)),
            RectangleHitbox.fromRect(14.05, 1.97, Vec(20.01, 43.01)),
            RectangleHitbox.fromRect(1.97, 87.84, Vec(-26, 0)),
            RectangleHitbox.fromRect(1.97, 87.84, Vec(26, 0))
        ),
        spawnHitbox: RectangleHitbox.fromRect(63.07, 114),
        ceilingHitbox: RectangleHitbox.fromRect(52.92, 89),
        floorImages: [{
            key: "port_warehouse_floor",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        ceilingImages: [
            {
                key: "warehouse_ceiling_1",
                position: Vec(0, -22.25),
                scale: Vec(2, 2)
            },
            {
                key: "warehouse_ceiling_2",
                position: Vec(0, 22.25),
                scale: Vec(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Stone,
            hitbox: RectangleHitbox.fromRect(54.04, 105.96)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: warehouseObstacle, position: Vec(-19.39, -36.48) },
            { idString: warehouseObstacle, position: Vec(-19.39, 36.48) }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: {
                warehouse_layout_1: 1,
                warehouse_layout_2: 1,
                warehouse_layout_3: 1,
                warehouse_layout_4: 1
            },
            position: Vec(0, 0)
        }]
    },
    {
        idString: "large_warehouse",
        name: "Large Warehouse",
        defType: DefinitionType.Building,
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        spawnHitbox: RectangleHitbox.fromRect(95, 150, Vec(-2, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(80, 137.5, Vec(-2, -2.1)),
        ceilingCollapseParticle: "large_warehouse_particle",
        hasDamagedCeiling: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(4.53, 4.53, Vec(-2.11, -34.12)),
            RectangleHitbox.fromRect(4.63, 4.54, Vec(-2.1, 29.62)),
            RectangleHitbox.fromRect(2.09, 72.16, Vec(-43.39, 31.99)),
            RectangleHitbox.fromRect(14.06, 2.06, Vec(-37.39, 67.64)),
            RectangleHitbox.fromRect(2.04, 38.65, Vec(39.25, -2.4)),
            RectangleHitbox.fromRect(44.51, 2, Vec(17.81, 67.61)),
            RectangleHitbox.fromRect(1.99, 26.18, Vec(39.19, 55.53)),
            RectangleHitbox.fromRect(2.03, 25.61, Vec(39.18, -59.99)),
            RectangleHitbox.fromRect(29.91, 1.95, Vec(25.3, -72.17)),
            RectangleHitbox.fromRect(2.09, 32.17, Vec(-43.4, -30.88))
        ),
        wallsToDestroy: 1,
        floorImages: [{
            key: "large_warehouse_floor",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        ceilingImages: [{
            key: "large_warehouse_ceiling",
            position: Vec(-2, -2.1),
            scale: Vec(2, 2),
            damaged: "large_warehouse_ceiling_damaged"
        }],
        obstacles: IS_CLIENT ? undefined : [{
            idString: "large_warehouse_wall",
            position: Vec(-16.45, -59.67),
            rotation: 0
        }]
        // floors: [{
        //     type: FloorNames.Stone,
        //     hitbox: RectangleHitbox.fromRect(83.04, 140.32, Vec(-2.24, -2.24))
        // }]
    },
    {
        idString: "refinery",
        name: "Refinery",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            // Building walls
            RectangleHitbox.fromRect(57, 1.8, Vec(-22, -36.1)), // First topmost wall
            RectangleHitbox.fromRect(30.75, 1.8, Vec(35.38, -36.1)), // Wall after the hole
            RectangleHitbox.fromRect(2, 33.5, Vec(49.75, -22.25)), // Wall from top right to bottom right
            RectangleHitbox.fromRect(16.25, 2.05, Vec(42.63, -6.53)), // Wall to the right of the entrance
            RectangleHitbox.fromRect(38.5, 2.05, Vec(2.25, -6.53)), // Wall to the left of the entrance
            RectangleHitbox.fromRect(2, 21.55, Vec(-16, 3.23)), // Wall on top of the window
            RectangleHitbox.fromRect(2, 13.5, Vec(-16, 30.25)), // Wall bellow the window
            RectangleHitbox.fromRect(35.5, 2, Vec(-32.75, 36.25)), // Bottommost wall
            RectangleHitbox.fromRect(2, 74, Vec(-49.5, 0)), // Wall from topmost to bottommost
            RectangleHitbox.fromRect(13.3, 2, Vec(-43.35, 9)), // inner door walls
            RectangleHitbox.fromRect(10.5, 2, Vec(-21.25, 9)),

            // Outer walls
            RectangleHitbox.fromRect(40.2, 1.93, Vec(-33.85, 83)), // Bottom bottom left
            RectangleHitbox.fromRect(1.93, 18, Vec(-53, 73.3)), // Left bottom left
            RectangleHitbox.fromRect(1.93, 86, Vec(-53, 2.05)), // Left top left
            RectangleHitbox.fromRect(60, 1.93, Vec(-22, -40)), // Top top left
            RectangleHitbox.fromRect(64, 1.93, Vec(51, -40)), // Top
            RectangleHitbox.fromRect(19, 1.93, Vec(114.45, -40)), // Top top right
            RectangleHitbox.fromRect(1.93, 39, Vec(123, -19.7)), // Right top right
            RectangleHitbox.fromRect(1.93, 55.7, Vec(123, 56.1)), // Right bottom right
            RectangleHitbox.fromRect(102, 1.93, Vec(71.7, 83)) // Bottom bottom right
        ),
        spawnHitbox: RectangleHitbox.fromRect(184, 131, Vec(35, 21.50)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(33.50, 72, Vec(-32.75, 0)),
            RectangleHitbox.fromRect(65.50, 29.50, Vec(16.75, -21.25))
        ),
        floorImages: [
            {
                key: "refinery_floor_1",
                position: Vec(0, -18.1)
            },
            {
                key: "refinery_floor_2",
                position: Vec(-32.85, 19)
            },

            // Outer walls
            // Bottom left walls
            { key: "concrete_wall_end", position: Vec(-15, 83) },
            { key: "concrete_wall_corner", position: Vec(-53, 83) },
            { key: "concrete_wall_end_broken_1", position: Vec(-53, 65.5), rotation: Math.PI * 1.5 },
            // Wall from bottom left to top left
            { key: "concrete_wall_end_broken_2", position: Vec(-53, 44), rotation: Math.PI / 2 },
            // Top left corner
            { key: "concrete_wall_corner", position: Vec(-53, -40), rotation: Math.PI / 2 },
            { key: "concrete_wall_end_broken_1", position: Vec(7, -40) },
            { key: "concrete_wall_end_broken_2", position: Vec(20, -40), rotation: Math.PI },
            { key: "concrete_wall_end_broken_2", position: Vec(82, -40) },
            { key: "concrete_wall_end_broken_1", position: Vec(106, -40), rotation: Math.PI },
            // Top right corner
            { key: "concrete_wall_corner", position: Vec(123, -40), rotation: Math.PI },
            { key: "concrete_wall_end", position: Vec(123, -1.5), rotation: Math.PI / 2 },
            { key: "concrete_wall_end", position: Vec(123, 29.5), rotation: Math.PI * 1.5 },
            // Bottom right corner
            { key: "concrete_wall_corner", position: Vec(123, 83), rotation: Math.PI * 1.5 },
            { key: "concrete_wall_end", position: Vec(22, 83), rotation: Math.PI }
        ],
        ceilingImages: [
            {
                key: "refinery_ceiling_1",
                position: Vec(0, -21.3)
            },
            {
                key: "refinery_ceiling_2",
                position: Vec(-32.85, 15.75)
            }
        ],
        groundGraphics: [
            { color: 0x595959, hitbox: RectangleHitbox.fromRect(176, 123, Vec(35, 21.50)) }, // base
            { color: 0xb2b200, hitbox: new CircleHitbox(21, Vec(45.5, 59.1)) }, // circles
            { color: 0x505050, hitbox: new CircleHitbox(19, Vec(45.5, 59.1)) },
            { color: 0xb2b200, hitbox: new CircleHitbox(21, Vec(97, 59.1)) },
            { color: 0x505050, hitbox: new CircleHitbox(19, Vec(97, 59.1)) },
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(2, 81, Vec(-9, 42.50)) }, // roads
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(2, 59, Vec(16, 53.50)) },
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(133, 2, Vec(56.50, 3)) },
            { color: 0xb2b200, hitbox: RectangleHitbox.fromRect(108, 2, Vec(69, 25)) }
        ],
        graphics: [ // Outer walls
            // Bottom bottom left
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(36, 1.93, Vec(-34.25, 83)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(36, 1.22, Vec(-34.25, 83)) },

            // Left bottom left
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(1.93, 16, Vec(-53, 74.2)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(1.22, 16, Vec(-53, 74.2)) },

            // Left top left
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(1.93, 82, Vec(-53, 1.75)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(1.22, 82, Vec(-53, 1.75)) },

            // Top top left
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(58, 1.93, Vec(-23.4, -40)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(58, 1.22, Vec(-23.4, -40)) },

            // Top
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(60, 1.93, Vec(51, -40)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(60, 1.22, Vec(51, -40)) },

            // Top top right
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(15, 1.93, Vec(114.7, -40)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(15, 1.22, Vec(114.7, -40)) },

            // Right top right
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(1.93, 36.5, Vec(123, -21)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(1.22, 36.5, Vec(123, -21)) },

            // Right bottom right
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(1.93, 52, Vec(123, 56.2)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(1.22, 52, Vec(123, 56.2)) },

            // Bottom bottom right
            { color: 0x333333, hitbox: RectangleHitbox.fromRect(100, 1.93, Vec(72.2, 83)) },
            { color: 0x808080, hitbox: RectangleHitbox.fromRect(100, 1.22, Vec(72.2, 83)) }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(33.50, 27, Vec(-32.75, 22.50))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(176, 123, Vec(35, 21.50))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            //
            // Inner room obstacles
            //
            {
                idString: "window",
                position: Vec(-16, 18.5),
                rotation: 0
            },
            {
                idString: "door",
                position: Vec(-31.15, 9.2),
                rotation: 0
            },
            {
                idString: "small_table",
                position: Vec(-22, 28),
                rotation: 0,
                variation: 0
            },
            {
                idString: "chair",
                position: Vec(-26, 28),
                rotation: 3
            },
            {
                idString: { gun_mount_mcx_spear: 0.95, gun_mount_stoner_63: 0.05 },
                position: Vec(-46.8, 28),
                rotation: 1,
                lootSpawnOffset: Vec(4, 0)
            },
            {
                idString: "trash_can", position: Vec(-44.9, 13.43),
                lootSpawnOffset: Vec(1, 0)
            },
            //
            // Building obstacles
            //
            {
                idString: "small_refinery_barrel",
                position: Vec(41.3, -14.8)
            },
            {
                idString: "distillation_column",
                position: Vec(42.7, -28),
                rotation: 0
            },
            {
                idString: "distillation_column",
                position: Vec(-42.65, 1),
                rotation: 0
            },
            {
                idString: "distillation_equipment",
                position: Vec(0, -18),
                rotation: 2
            },
            {
                idString: "smokestack",
                position: Vec(-39, -25.59)
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: Vec(-26, -30)
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: Vec(-21.5, 4)
            },
            {
                idString: "regular_crate",
                position: Vec(28.75, -30)
            },
            {
                idString: "regular_crate",
                position: Vec(-43, -11)
            },
            //
            // Outside obstacles
            //
            // Bottom left
            {
                idString: "oil_tank",
                position: Vec(-38, 73),
                rotation: 0,
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec(-20.5, 77.5),
                rotation: 0,
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec(-21.5, 67),
                rotation: 0,
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec(-46.5, 45.5),
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec(-36, 48),
                outdoors: true
            },
            // Bottom right
            {
                idString: "large_refinery_barrel",
                position: Vec(45.5, 59.1),
                outdoors: true
                //           ^^^^ One large refinery barrel is a mode variant and the other is a reskin. This ensures they will never use the same texture.
            },
            {
                idString: "large_refinery_barrel",
                position: Vec(97, 59.2)
            },
            {
                idString: "regular_crate",
                position: Vec(69, 62),
                outdoors: true
            },
            {
                idString: "aegis_crate",
                position: Vec(64, 75),
                outdoors: true
            },
            {
                idString: "aegis_crate",
                position: Vec(77, 73),
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec(117.5, 77.5),
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec(117, 40),
                outdoors: true
            },
            {
                idString: "super_barrel",
                position: Vec(27.5, 39),
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec(-10, 0),
                outdoors: true
            },
            // Top right
            {
                idString: "oil_tank",
                position: Vec(113, -25),
                rotation: 1,
                outdoors: true
            },
            {
                idString: "barrel",
                position: Vec(117.5, -7),
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec(95, -33),
                outdoors: true
            },
            {
                idString: "aegis_crate",
                position: Vec(76.25, -33.5),
                outdoors: true
            },
            {
                idString: "super_barrel",
                position: Vec(85.25, -33.5),
                outdoors: true
            },
            {
                idString: { barrel: 1, super_barrel: 1 },
                position: Vec(83, -25),
                outdoors: true
            },
            {
                idString: "super_barrel",
                position: Vec(75, -23),
                outdoors: true
            },
            {
                idString: "regular_crate",
                position: Vec(76.25, -12),
                outdoors: true
            },
            //
            // Inner walls
            //
            // Top right
            { idString: "inner_concrete_wall_1", position: Vec(116.75, -1.5), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec(106.05, -1.5), rotation: 0 },
            { idString: "inner_concrete_wall_2", position: Vec(70.05, -20.75), rotation: 1 },
            { idString: "inner_concrete_wall_1", position: Vec(74.5, -1.5), rotation: 0 },
            // Bottom right
            { idString: "inner_concrete_wall_1", position: Vec(116.75, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec(106.05, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec(95.35, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec(47.84, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec(37.14, 34), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec(26.44, 34), rotation: 0 },
            { idString: "inner_concrete_wall_4", position: Vec(22, 58.5), rotation: 1 },
            // Bottom left
            { idString: "inner_concrete_wall_3", position: Vec(-32.45, 39), rotation: 0 },
            { idString: "inner_concrete_wall_1", position: Vec(-15, 76.65), rotation: 1 },
            { idString: "inner_concrete_wall_1", position: Vec(-15, 65.95), rotation: 1 },

            // TEMP: Remove if halloween ends.
            { idString: "cobweb", position: Vec(-47.26, 77.18), rotation: 1 },
            { idString: "cobweb", position: Vec(43.93, -12.29), rotation: 2 },
            { idString: "cobweb", position: Vec(-43.82, 30.13), rotation: 1 },
            { idString: "cobweb", position: Vec(117.2, -34.21), rotation: 3 },
            { idString: "small_lamp_thingy", position: Vec(71.97, 44.39) },
            { idString: "small_lamp_thingy", position: Vec(92.74, -14.86) }
        ] as BuildingObstacle[],
        subBuildings: IS_CLIENT ? undefined : [
            {
                idString: "porta_potty",
                position: Vec(59.75, -27.6)
            }
        ]
    },
    {
        idString: "red_house",
        name: "Red House",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 9, Vec(30.8, -26)),
            RectangleHitbox.fromRect(2, 22, Vec(30.8, -0.2)),
            RectangleHitbox.fromRect(2, 9.8, Vec(30.8, 25)),
            RectangleHitbox.fromRect(19.8, 2, Vec(-22, -29.5)),
            RectangleHitbox.fromRect(8.2, 2, Vec(26, -29.5)),
            RectangleHitbox.fromRect(14, 2, Vec(4.6, -29.5)),
            RectangleHitbox.fromRect(2, 32, Vec(-30.9, -13.5)),
            RectangleHitbox.fromRect(2, 16, Vec(-30.9, 20.5)),
            RectangleHitbox.fromRect(12.3, 2, Vec(-25.8, 28.9)),
            RectangleHitbox.fromRect(39.4, 2, Vec(10.45, 28.9)),
            RectangleHitbox.fromRect(3, 3, Vec(8.75, -6.12))
        ),
        spawnHitbox: RectangleHitbox.fromRect(80, 80),
        ceilingHitbox: RectangleHitbox.fromRect(60, 56),
        floorImages: [
            {
                key: "red_house_floor_1",
                position: Vec(0, -17.23)
            },
            {
                key: "red_house_floor_2",
                position: Vec(0, 17.23)
            }
        ],
        ceilingImages: [{
            key: "red_house_ceiling",
            position: Vec(0, -0.25),
            scale: Vec(2, 2)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(62, 58.50, Vec(0, -0.25))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(-10.10, 4.70, Vec(16.55, -31.75))

            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.10, -4.70, Vec(-14.45, 31.75))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [

            // -----------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // -----------------------------------------------------------------------
            { idString: "cobweb", position: Vec(-25.11, 23.03), rotation: 1 },
            { idString: "jack_o_lantern", position: Vec(6.2, -36.5), rotation: 3 },
            { idString: "jack_o_lantern", position: Vec(27.2, -36.5), rotation: 3 },
            { idString: "small_lamp_thingy", position: Vec(3.36, -11.02) },
            // -----------------------------------------------------------------------

            { idString: "house_wall_4", position: Vec(8.6, -18), rotation: 1 },
            { idString: "house_wall_1", position: Vec(2.6, -6.07), rotation: 0 },
            { idString: "house_wall_9", position: Vec(-20.98, -6.07), rotation: 0 },
            { idString: "door", position: Vec(-7.45, -6.06), rotation: 2 },
            { idString: "bookshelf", position: Vec(5.11, -21.95), rotation: 1 },
            { idString: "couch", position: Vec(-21.48, -1.01), rotation: 3 },
            { idString: "large_drawer", position: Vec(-25.98, 21.3), rotation: 1 },
            // Bathroom Left
            {
                idString: "house_wall_4",
                position: Vec(-2.50, 17.2),
                rotation: 1
            },
            // Bathroom Right
            {
                idString: "house_wall_4",
                position: Vec(9.55, 17.2),
                rotation: 1
            },
            // Bathroom Door
            {
                idString: "door",
                position: Vec(3.1, 7.2),
                rotation: 2
            },
            // Bathroom Toilet
            {
                idString: { toilet: 2, used_toilet: 1 },
                position: Vec(3.6, 23),
                rotation: 2
            },
            // Front Door
            {
                idString: "door",
                position: Vec(-14.85, 29),
                rotation: 2
            },
            {
                idString: "door",
                position: Vec(16.2, -29.5),
                rotation: 2
            },
            // Living Room Bookshelf
            {
                idString: "bookshelf",
                position: Vec(-6, 17.5),
                rotation: 3
            },
            // Kitchen Stove
            {
                idString: randomStove,
                position: Vec(15.5, 24),
                rotation: 2
            },
            // Kitchen Fridge
            {
                idString: "fridge",
                position: Vec(25, 24),
                rotation: 2
            },
            // Near Kitchen Chair
            {
                idString: "chair",
                position: Vec(25, 5),
                rotation: 0
            },
            // Near Backdoor Chair
            {
                idString: "chair",
                position: Vec(25, -5),
                rotation: 2
            },
            // Dining Room Table
            {
                idString: "small_table",
                position: Vec(25, 0),
                rotation: 2,
                variation: 0
            },
            // Backdoor Drawer
            {
                idString: "small_drawer",
                position: Vec(26, -25),
                rotation: 3
            },
            // Bedroom Bed
            {
                idString: "bed",
                position: Vec(-21.5, -22.5),
                rotation: 1
            },
            // Bedroom Drawer
            {
                idString: "small_drawer",
                position: Vec(-26, -11.5),
                rotation: 1
            },
            // Bedroom Window
            {
                idString: "window",
                position: Vec(-7.2, -29.5),
                rotation: 1
            },
            // Living Room Window
            {
                idString: "window",
                position: Vec(-31, 7.5),
                rotation: 2
            },
            // Kitchen Window
            {
                idString: "window",
                position: Vec(31, 15.4),
                rotation: 2
            },
            // Backdoor Window
            {
                idString: "window",
                position: Vec(31, -15.9),
                rotation: 2
            }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(16.44, -15.64) },
            { table: "ground_loot", position: Vec(-15.42, 17.44) }
        ]
    },
    {
        idString: "red_house_v2",
        name: "Red House Variation 2",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.8, 60.1, Vec(-31.25, -0.3)),
            RectangleHitbox.fromRect(1.8, 40.5, Vec(30.1, -9)),
            RectangleHitbox.fromRect(1.8, 6.5, Vec(30.1, 25.1)),

            // Top walls
            RectangleHitbox.fromRect(18.6, 1.8, Vec(21.6, -29.5)),
            RectangleHitbox.fromRect(12, 1.8, Vec(-4.1, -29.5)),
            RectangleHitbox.fromRect(10.5, 1.8, Vec(-26, -29.5)),

            // Bottom Walls
            RectangleHitbox.fromRect(18.6, 1.8, Vec(21.6, 28.7)),
            RectangleHitbox.fromRect(12, 1.8, Vec(-4.1, 28.7)),
            RectangleHitbox.fromRect(10.5, 1.8, Vec(-26, 28.7)),

            RectangleHitbox.fromRect(3, 3, Vec(16.15, -5.6)),
            RectangleHitbox.fromRect(3, 3, Vec(0.8, 10.35))
        ),
        spawnHitbox: RectangleHitbox.fromRect(80, 80),
        ceilingHitbox: RectangleHitbox.fromRect(60, 56),
        floorImages: [
            {
                key: "red_house_v2_floor_1",
                position: Vec(-16.22, 0)
            },
            {
                key: "red_house_v2_floor_2",
                position: Vec(16.28, 0)
            }
        ],
        ceilingImages: [{
            key: "red_house_ceiling",
            position: Vec(-0.6, -0.25),
            scale: Vec(2, 2)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(62, 59, Vec(0, -0.25))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(-10.10, 4.70, Vec(7.15, -31.75))

            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.10, -4.70, Vec(7.15, 31.75))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [

            // -----------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // -----------------------------------------------------------------------
            { idString: "cobweb", position: Vec(-25.88, 23.18), rotation: 1 },
            { idString: "jack_o_lantern", position: Vec(-3.3, -36.8), rotation: 3 },
            { idString: "jack_o_lantern", position: Vec(17.7, -36.8), rotation: 3 },
            { idString: "small_lamp_thingy", position: Vec(-15.22, 0.56) },
            // -----------------------------------------------------------------------

            { idString: "door", position: Vec(7.6, -29.6), rotation: 0 },
            { idString: "door", position: Vec(6.7, 28.8), rotation: 2 },

            // top left corner room (with the bed)
            { idString: "house_wall_1", position: Vec(-4.5, -9), rotation: 0 },
            { idString: "house_wall_3", position: Vec(-24.85, -9), rotation: 0 },
            { idString: "door", position: Vec(-14.55, -9), rotation: 2 },
            { idString: "house_wall_10", position: Vec(1, -18.3), rotation: 1 },
            { idString: "small_bed", position: Vec(-4, -19.4), rotation: 0 },
            { idString: "large_drawer", position: Vec(-26.7, -19.4), lootSpawnOffset: Vec(2, 0), rotation: 1 },
            { idString: "tv", position: Vec(-29.8, -19.4), rotation: 2 },

            // under bathroom (right)
            { idString: "small_table", position: Vec(24.85, 2), rotation: 0, variation: 0 },
            { idString: "chair", position: Vec(24.85, 7.5), rotation: 0 },
            { idString: "chair", position: Vec(21, 0), rotation: 3 },
            { idString: "bookshelf", position: Vec(22.5, 25.5), rotation: 0 },

            // bottom left
            { idString: "house_wall_1", position: Vec(-5, 10.25), rotation: 0 },
            { idString: "house_wall_1", position: Vec(-26.05, 10.25), rotation: 0 },
            { idString: "house_wall_12", position: Vec(1, 19.85), rotation: 1 },
            { idString: "potted_plant", position: Vec(-26, 5.55) },
            { idString: "red_small_couch", position: Vec(-26.6, -3), rotation: 1 },
            { idString: randomSmallStove, position: Vec(-26.6, 14.9), rotation: 1 },
            { idString: "fridge", position: Vec(-26.77, 23.1), rotation: 1 },
            { idString: "sink", position: Vec(-4.5, 16.4), rotation: 3 },
            { idString: "small_drawer", position: Vec(-4.3, 24.5), rotation: 3 },

            // bathroom (top right)
            { idString: "door", position: Vec(16.1, -12.5), rotation: 1 },
            { idString: "house_wall_11", position: Vec(16.1, -22.9), rotation: 1 },
            { idString: randomToilet, position: Vec(23, -24), rotation: 0 },
            { idString: "house_wall_11", position: Vec(23.4, -5.5), rotation: 0 },

            // windows (y += 0.2, (x, y + 0.2))
            { idString: "window", position: Vec(30.2, 16.7), rotation: 0 },
            { idString: "window", position: Vec(-15.2, 28.9), rotation: 1 },
            { idString: "window", position: Vec(-15.6, -29.7), rotation: 1 }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(0, 0) }
        ]
    },
    {
        idString: "green_house",
        name: "Green House",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(21.8, 1.88, Vec(-39.9, -30.2)),
            RectangleHitbox.fromRect(51.88, 1.88, Vec(8, -30.2)),
            RectangleHitbox.fromRect(1.88, 9.3, Vec(33, -2.55)),
            RectangleHitbox.fromRect(10.78, 1.87, Vec(28.55, 27.46)),
            RectangleHitbox.fromRect(1.88, 58, Vec(-49.86, -1)),
            RectangleHitbox.fromRect(42.74, 1.87, Vec(-9.3, 27.46)),
            RectangleHitbox.fromRect(10.02, 1.87, Vec(-45.79, 27.46)),
            RectangleHitbox.fromRect(1.88, 15.98, Vec(33, 20.22)),
            RectangleHitbox.fromRect(1.88, 11.08, Vec(33, -23.88)),
            RectangleHitbox.fromRect(3.5, 3.5, Vec(42.75, -0.67)),
            RectangleHitbox.fromRect(3.5, 3.5, Vec(42.75, 14.8)),
            RectangleHitbox.fromRect(3, 3, Vec(-7.33, 9.98)),
            RectangleHitbox.fromRect(3, 3, Vec(11.76, -6.26)),
            RectangleHitbox.fromRect(3, 3, Vec(-7.27, -6.32))
        ),
        spawnHitbox: RectangleHitbox.fromRect(110, 70),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(83, 58, Vec(-8.5, -1.5)),
            RectangleHitbox.fromRect(14, 19.4, Vec(38, 7.1))
        ),
        floorImages: [
            {
                key: "green_house_floor_1",
                position: Vec(-26.66, 0)
            },
            {
                key: "green_house_floor_2",
                position: Vec(21.5, 0)
            }
        ],
        ceilingImages: [
            {
                key: "green_house_ceiling_1",
                position: Vec(22, -1.1),
                scale: Vec(2, 2)
            },
            {
                key: "green_house_ceiling_2",
                position: Vec(-27, -1.1),
                scale: Vec(2, 2)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(83, 58, Vec(-8.5, -1.5)),
                    RectangleHitbox.fromRect(14, 19.4, Vec(38, 7.1)),
                    RectangleHitbox.fromRect(6, 13.5, Vec(47.7, 7.1))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.3, 5, Vec(-35.7, 30.2))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [

            // -----------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // -----------------------------------------------------------------------
            { idString: "cobweb", position: Vec(27.32, -24.59), rotation: 3 },
            { idString: "cobweb", position: Vec(-44.2, -24.57), rotation: 0 },
            { idString: "jack_o_lantern", position: Vec(-46.48, 35.06), rotation: -0.1 }, // cursed
            { idString: "jack_o_lantern", position: Vec(40.24, 24), rotation: -1 },
            { idString: "small_lamp_thingy", position: Vec(17.45, 18.24) },
            // -----------------------------------------------------------------------

            { idString: "window", position: Vec(32.99, -12.81), rotation: 0 },
            { idString: "window", position: Vec(17.59, 27.52), rotation: 1 },
            { idString: "window", position: Vec(-23.44, -30.22), rotation: 1 },
            { idString: "door", position: Vec(33.03, 6.74), rotation: 1 },
            { idString: "door", position: Vec(11.94, -13.22), rotation: 1 },
            { idString: "door", position: Vec(-36.15, 27.47), rotation: 2 },
            { idString: "door", position: Vec(-22.56, -6.26), rotation: 0 },
            { idString: "house_wall_1", position: Vec(-13.3, -6.24), rotation: 0 },
            { idString: "house_wall_3", position: Vec(11.94, -23.55), rotation: 1 },
            { idString: "house_wall_4", position: Vec(-7.26, -18.54), rotation: 1 },
            { idString: "house_wall_5", position: Vec(2.24, -6.35), rotation: 0 },
            { idString: "house_wall_6", position: Vec(-7.33, 18.92), rotation: 1 },
            { idString: "house_wall_7", position: Vec(-38.53, -6.29), rotation: 0 },

            { idString: randomToilet, position: Vec(-2.75, -24.92), rotation: 0 },
            { idString: "trash_can", position: Vec(-3, -10.5) },
            { idString: "sink", position: Vec(5.91, -25.15), rotation: 0 },
            { idString: "bed", position: Vec(-43.06, -20.98), rotation: 0 },
            { idString: "small_drawer", position: Vec(-33.63, -25.48), rotation: 0 },
            { idString: "potted_plant", position: Vec(17.46, -25.03) },
            { idString: "potted_plant", position: Vec(-12.73, -12.13) },
            { idString: "washing_machine", position: Vec(27.07, -25.54), rotation: 0 },
            { idString: "tv", position: Vec(2.43, -4.51), rotation: 1 },
            { idString: "large_drawer", position: Vec(28.24, 20), rotation: 3 },
            { idString: "couch", position: Vec(2.36, 22.18), rotation: 1 },
            { idString: "small_table", position: Vec(2.02, 11.51), rotation: 1, variation: 1 },
            { idString: "large_table", position: Vec(-15.91, 16.87), rotation: 0, variation: 1 },
            { idString: "chair", position: Vec(-21.87, 20.61), rotation: 3 },
            { idString: "chair", position: Vec(-21.87, 13.45), rotation: 3 },
            { idString: "chair", position: Vec(-16.02, 8.25), rotation: 2 },
            { idString: "fridge", position: Vec(-45.15, 21.66), rotation: 1 },
            { idString: randomStove, position: Vec(-45.15, 12.3), rotation: 1 },
            { idString: "large_drawer", position: Vec(-45.12, 1.28), rotation: 1 },
            { idString: "bookshelf", position: Vec(-10.88, -22.62), rotation: 1 },
            {
                idString: {
                    gun_mount_hp18: 1,
                    gun_mount_model_37: 0.5,
                    gun_mount_sks: 0.5,
                    gun_mount_hatchet_bloodstained: 1 // halloween only
                    // gun_mount_crowbar_aged: 1
                },
                position: Vec(30.33, -2.98),
                rotation: 3,
                lootSpawnOffset: Vec(-4, 0)
            }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(18.48, 6.37) },
            { table: "ground_loot", position: Vec(-23.91, -18.07) }
        ]
    },

    // -------------------------------------------------------------------------
    // Vault layout variations for blue house.
    // -------------------------------------------------------------------------
    blueHouseVaultLayout(1, [
        { idString: "box", position: Vec(12.5, 10.5) },
        { idString: "box", position: Vec(14, 15.5) }
    ]),

    blueHouseVaultLayout(2,
        [
            { idString: "blue_house_stair", position: Vec(17, 14.5), layer: Layer.ToBasement, rotation: 0 },
            { idString: "blue_house_stair_walls", position: Vec(15, 7), rotation: 0 }
        ],
        [
            { idString: "blue_house_basement", position: Vec(1.5, 4.25), layer: Layer.Basement }
        ]
    ),

    blueHouseVaultLayout(3, [
        { idString: "box", position: Vec(12.5, 10.5) },
        { idString: "box", position: Vec(12.5, 15.5) },
        { idString: "box", position: Vec(17.5, 15.5) }
    ]),

    blueHouseVaultLayout(4, [
        { idString: "gun_case", position: Vec(12.5, 13), rotation: 1 },
        { idString: "box", position: Vec(18.1, 10.5) }
    ]),

    blueHouseVaultLayout(5, [
        { idString: "box", position: Vec(11.97, 9.53) },
        { idString: "trash_bag", position: Vec(18.5, 9.9) },
        { idString: "bookshelf", position: Vec(15.85, 17.01), rotation: 0 }
    ]),

    blueHouseVaultLayout(6, [
        { idString: "grenade_crate", position: Vec(13.4, 10.5) },
        { idString: "box", position: Vec(19.25, 9.3) },
        { idString: "box", position: Vec(12.71, 16.6) }
    ]),

    blueHouseVaultLayout(7, [
        { idString: "melee_crate", position: Vec(13.4, 10.5) },
        { idString: "box", position: Vec(19.25, 9.3) },
        { idString: "box", position: Vec(12.71, 16.6) }
    ]),
    // -------------------------------------------------------------------------

    blueHouse("blue_house"),
    blueHouse("blue_house_special", [
        { idString: "blue_house_vault", position: Vec(-14.1, 20.5), orientation: 1 },
        { idString: "blue_house_vault_layout_2", position: Vec(0, 0) }
    ]),
    {
        idString: "blue_house_vault",
        name: "Blue House Vault",
        defType: DefinitionType.Building,
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14.8, 2, Vec(0.1, -12.1)),
            RectangleHitbox.fromRect(15.5, 2, Vec(2.1, 11.9)),
            RectangleHitbox.fromRect(2, 25, Vec(-6.3, 0.5)),
            RectangleHitbox.fromRect(2, 14, Vec(8.7, -6))
        ),
        spawnHitbox: RectangleHitbox.fromRect(22.73, 28.32),
        ceilingHitbox: RectangleHitbox.fromRect(14, 24),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [{
            key: "blue_house_vault_ceiling",
            position: Vec(1, -0.1)
        }]
    },
    {
        idString: "blue_house_basement",
        name: "Blue House Basement",
        defType: DefinitionType.Building,
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(40.5, 58, Vec(-11.28, -0.5)),
            RectangleHitbox.fromRect(63.25, 28.5, Vec(0, -15.45)),
            RectangleHitbox.fromRect(11, 11, Vec(14, 10))
        ),
        hitbox: new GroupHitbox(
            // WALL.
            RectangleHitbox.fromRect(66.5, 1.8, Vec(0, -30.35)),
            RectangleHitbox.fromRect(1.8, 61, Vec(-32.35, -0.5)),
            RectangleHitbox.fromRect(44, 1.8, Vec(-11.25, 29.05)),
            RectangleHitbox.fromRect(1.8, 14.1, Vec(9.8, 22.25)),
            RectangleHitbox.fromRect(1.8125, 24.35, Vec(9.8, -6.75)),
            RectangleHitbox.fromRect(1.75, 31.25, Vec(32.4, -15)),
            RectangleHitbox.fromRect(22.5, 1.8, Vec(21, -0.25)),

            // weird ahh rounded columns
            RectangleHitbox.fromRect(3.5, 3.5, Vec(-14.23, 7.15)),
            RectangleHitbox.fromRect(3.5, 3.5, Vec(-14.23, -7.99)),

            // stair walls
            RectangleHitbox.fromRect(11, 1.8, Vec(14.5, 4.6)),
            RectangleHitbox.fromRect(11, 1.8, Vec(14.5, 16))
        ),
        spawnHitbox: RectangleHitbox.fromRect(75, 70),
        floors: [{
            type: FloorNames.Wood,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(40.5, 58, Vec(-11.28, -0.5)),
                RectangleHitbox.fromRect(63.25, 28.5, Vec(0, -15.45))
            )
        },
        {
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(11, 11, Vec(14.25, 10)),
            layer: Layer.ToBasement
        },
        {
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(11, 11, Vec(14, 10))
        }],
        floorImages: [
            {
                key: "blue_house_basement_top",
                position: Vec(0, -15.3)
            },
            {
                key: "blue_house_basement_bottom",
                position: Vec(-11.28, 15.3)
            },
            {
                key: "blue_house_basement_stairs",
                position: Vec(15.25, 10.35)
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "metal_door", position: Vec(9.8, -23.8), rotation: 3 },
            { idString: randomBarrel, position: Vec(4.61, 23.69) },
            { idString: "ammo_crate", position: Vec(-4.66, 22.71) },
            { idString: "small_table", position: Vec(-24.96, 23.6), rotation: 1 },
            { idString: "chair", position: Vec(-25.08, 19.79), rotation: 2 },
            { idString: "box", position: Vec(-16.32, 25.26) },
            { idString: { box: 1, grenade_box: 0.25 }, position: Vec(-12.02, 20.6) },
            { idString: { box: 1, grenade_box: 0.1 }, position: Vec(5.83, 3.69) },
            { idString: "box", position: Vec(0.95, 2.37) },
            { idString: "bunk_bed", position: Vec(3.25, -9.57), rotation: 0 },
            { idString: "door", position: Vec(-25.97, -7.85), rotation: 0 },
            { idString: "house_wall_18", position: Vec(-18.75, -7.85), rotation: 0 },
            { idString: "house_wall_19", position: Vec(-14.23, -19.58), rotation: 1 },
            { idString: randomToilet, position: Vec(-27.5, -24.65), rotation: 0 },
            { idString: "small_drawer", position: Vec(-19.26, -25.16), rotation: 0 },
            { idString: "trash_can", position: Vec(-18.15, -11.85) },
            { idString: "regular_crate", position: Vec(15.98, -14.35) },
            { idString: "regular_crate", position: Vec(26.33, -6.41) },
            { idString: "barrel", position: Vec(26.65, -15.28) },
            { idString: { box: 1, grenade_box: 0.25 }, position: Vec(28.49, -26.58) },
            { idString: "potted_plant", position: Vec(-8.84, -25.32) },
            {
                // rest in peace, BFR. This was your place.
                idString: {
                    rsh_case_single: 1,
                    rsh_case_dual: 0.1
                },
                position: Vec(15.93, -5.14),
                rotation: 2
            },

            // TEMP: Remove if halloween ends.
            { idString: "small_lamp_thingy", position: Vec(-23.98, 7.26) },
            { idString: "cobweb", position: Vec(-26.54, 23.26), rotation: 1 },
            { idString: "cobweb", position: Vec(26.62, -24.48), rotation: 3 }
        ],
        subBuildings: IS_CLIENT ? undefined : [{ idString: "blue_house_basement_ceiling", position: Vec(0, 0) }]
    },
    {
        idString: "blue_house_basement_ceiling",
        name: "blue house basement ceiling",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(21.5, 28.9, Vec(21, -15.3)),
        ceilingHitbox: RectangleHitbox.fromRect(21.5, 28.9, Vec(21, -15.3)),
        ceilingImages: [{
            key: "blue_house_vault_ceiling",
            position: Vec(21, -15.3),
            scale: Vec(1.58, 1.25)
        }]
    },

    shed(1, 0x257636),
    shed(2, 0xb96114),

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
    container(13, "yellow", "damaged"),
    container(14, "green", "damaged"),
    container(15, "blue", "damaged"),
    container(16, "yellow", "open2", true),
    container(17, "blue", "damaged_reversed"),
    container(18, "yellow", "damaged_reversed"),
    container(19, "green", "damaged_reversed"),
    container(20, "red", "closed_damaged"),

    // special containers
    container(21, "gas_can", "gas_can"),
    container(22, "military_green", "open1"),
    container(23, "military_orange", "open1"),
    container(24, "military_marine", "open1"),
    container(25, "military_lime", "open1"),

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
        { idString: "flint_crate", position: Vec(-1, -0.25) },
        { idString: "barrel", position: Vec(0.27, -9.26) },
        { idString: "super_barrel", position: Vec(-1.82, 8.8) },
        { idString: "hay_bale", position: Vec(-11.5, 3), rotation: 1 },
        { idString: "hay_bale", position: Vec(9.5, -3.29), rotation: 1 }
    ]),

    hayShed(2, (randomBoolean() ? 1 : 2),
        [
            { idString: "regular_crate", position: Vec(10.22, 4.45) },
            { idString: "barrel", position: Vec(11.56, -6.05) },
            { idString: "hay_bale", position: Vec(-11.89, 2.82), rotation: 1 },
            { idString: "box", position: Vec(-11.4, -7.28) }
        ],
        [{
            table: "ground_loot",
            position: Vec(-0.99, -1.75)
        }]
    ),

    hayShed(3, 1, [
        { idString: "super_barrel", position: Vec(-11.56, -6.05) },
        { idString: "hay_bale", position: Vec(9.5, 2.82), rotation: 1 },
        { idString: "box", position: Vec(-13.03, 7.34) },
        { idString: "box", position: Vec(-8.27, 2.09) },
        { idString: "grenade_crate", position: Vec(8.85, -8.02) },
        { idString: "box", position: Vec(-6.71, 8.27) }
    ]),

    hayShed(4, 1, [
        { idString: "hay_bale", position: Vec(9.68, 3.88), rotation: 0 },
        { idString: "super_barrel", position: Vec(7.71, -6.26) }
    ]),
    {
        idString: "port_hay_shed",
        name: "Port Hay Shed",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(47, 32),
        ceilingHitbox: RectangleHitbox.fromRect(33.5, 24.5, Vec(-1.2, -0.5)),
        ceilingImages: [{
            key: "hay_shed_ceiling_2",
            position: Vec(-1, -0.5),
            residue: "hay_shed_residue",
            scale: Vec(2.14, 2.14)
        }],
        ceilingCollapseParticle: "hay_shed_ceiling_particle",
        ceilingCollapseParticleVariations: 2,
        wallsToDestroy: 2,
        obstacles: IS_CLIENT ? undefined : [
            { idString: "pole", position: Vec(14.04, -11.53) },
            { idString: "pole", position: Vec(-16.68, -11.55) },
            { idString: "pole", position: Vec(-16.52, 10.83) },
            { idString: "pole", position: Vec(13.98, 10.87) }
        ]
    },
    {
        idString: "port_gate_office",
        name: "Port Gate Office",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(55, 32),
        ceilingHitbox: RectangleHitbox.fromRect(41.36, 20.56, Vec(2.04, -2.04)),
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 12.1, Vec(-19.25, 4)),
            RectangleHitbox.fromRect(18.78, 2.01, Vec(-10.85, 9.03)),
            RectangleHitbox.fromRect(44.89, 1.99, Vec(2.23, -13.2)),
            RectangleHitbox.fromRect(15.58, 2.01, Vec(16.58, 9.06)),
            RectangleHitbox.fromRect(2, 13.09, Vec(23.63, 3.53))
        ),
        floorImages: [{
            key: "port_gate_office_floor",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        ceilingImages: [{
            key: "port_gate_office_ceiling",
            position: Vec(2.04, -2.04),
            scale: Vec(2, 2)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(43.3, 22.15, Vec(1.85, -1.8))
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.5, 5.6, Vec(3.6, 11.35)),
                    RectangleHitbox.fromRect(2.05, 10.2, Vec(23.65, -7.8)),
                    RectangleHitbox.fromRect(5.3, 10.4, Vec(-21.95, -7.1))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "window2", position: Vec(23.65, -7.59), rotation: 0 },
            { idString: "desk_right", position: Vec(16.37, -2.1), rotation: 3 },
            { idString: "grey_office_chair", position: Vec(11.72, -5.76), rotation: 1 },
            { idString: "small_table", position: Vec(-11.84, 3.57), rotation: 1 },
            { idString: "chair", position: Vec(-6.21, 3.57), rotation: 1 },
            { idString: "door", position: Vec(3.2, 9.11), rotation: 2 },
            { idString: "door", position: Vec(-19.33, -6.68), rotation: 3 }
        ]
    },
    {
        idString: "port_storage",
        name: "Port Storage",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(55, 32, Vec(-10, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(42, 21.55, Vec(-7.7, -2.04)),
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(31.32, 2, Vec(-0.13, -13.01)),
            RectangleHitbox.fromRect(18.95, 2, Vec(-6.01, 9.23)),
            RectangleHitbox.fromRect(1.99, 24.26, Vec(14.76, -1.87)),
            RectangleHitbox.fromRect(1.99, 23.68, Vec(-14.77, -1.61))
        ),
        floorImages: [{
            key: "port_storage_floor",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        ceilingImages: [{
            key: "port_gate_office_ceiling",
            position: Vec(-6.75, -2.04),
            scale: Vec(2.01, 2.05)
        }],
        floors: [
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(28.43, 22.04, Vec(0.36, -1.9))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(20, 20, Vec(0.36, -2.18))
            }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: randomPallet,
            position: Vec(6.5, 9.05),
            orientation: 1
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "door", position: Vec(8.16, 9.3), rotation: 2 },
            { idString: "regular_crate", position: Vec(-8.94, 3.12) },
            { idString: "gun_case", position: Vec(-10.81, -6.67), rotation: 1 }
        ]
    },
    {
        idString: "port_main_office",
        name: "Port Main Office",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(102, 112),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(81.49, 17.42, Vec(-0.2, 24.94)),
            RectangleHitbox.fromRect(81.49, 17.42, Vec(0, -37.25)),
            RectangleHitbox.fromRect(72.51, 45.5, Vec(4.34, -6.07)),
            RectangleHitbox.fromRect(52.83, 14.01, Vec(0.12, 42.08)),
            RectangleHitbox.fromRect(10.3, 8, Vec(13.43, 34.12)),
            RectangleHitbox.fromRect(10.19, 3.02, Vec(35.57, -45.5))
        ),
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(24.17, 2.01, Vec(30.5, 34.41)),
            RectangleHitbox.fromRect(24.25, 2.01, Vec(18.41, 11.94)),
            RectangleHitbox.fromRect(1.99, 20.53, Vec(-41.35, 25.18)),
            RectangleHitbox.fromRect(12.36, 2, Vec(-36.18, -28.11)),
            RectangleHitbox.fromRect(12.36, 2, Vec(-36.18, 15.82)),
            RectangleHitbox.fromRect(2, 11.68, Vec(-30.98, -22.96)),
            RectangleHitbox.fromRect(2, 11.68, Vec(-30.98, 10.68)),
            RectangleHitbox.fromRect(2, 81.59, Vec(41.58, -6.93)),
            RectangleHitbox.fromRect(2.03, 23.05, Vec(7.3, 23.9)),
            RectangleHitbox.fromRect(72.06, 2, Vec(-5.62, -46.73)),
            RectangleHitbox.fromRect(48.09, 2, Vec(-17.02, 34.42)),
            RectangleHitbox.fromRect(2, 20, Vec(-41.34, -37.75)),
            RectangleHitbox.fromRect(2, 16.35, Vec(29.53, 3.68)),
            RectangleHitbox.fromRect(3.01, 3.07, Vec(-24.93, 48.48)),
            RectangleHitbox.fromRect(18.33, 1.01, Vec(33.08, 48.49)),
            RectangleHitbox.fromRect(18.33, 1.01, Vec(-33.55, 48.49)),
            RectangleHitbox.fromRect(3.01, 3.07, Vec(25.03, 48.46)),
            new CircleHitbox(0.79, Vec(-24.95, 50.69)),
            new CircleHitbox(0.91, Vec(-42.25, 48.48)),
            new CircleHitbox(0.91, Vec(-33.88, 48.49)),
            new CircleHitbox(0.91, Vec(42.26, 48.49)),
            new CircleHitbox(0.91, Vec(33.93, 48.49)),
            new CircleHitbox(0.79, Vec(25.03, 50.7)),
            RectangleHitbox.fromRect(1.57, 2.02, Vec(25.04, 49.71)),
            RectangleHitbox.fromRect(1.57, 2.02, Vec(-24.94, 49.73))
        ),
        ceilingImages: [
            {
                key: "port_main_office_ceiling_1",
                position: Vec(0, -6),
                scale: Vec(2, 2)
            },
            {
                key: "port_main_office_ceiling_2",
                position: Vec(0, 43),
                scale: Vec(2, 2)
            }
        ],
        floorImages: [
            {
                key: "port_main_office_floor_1",
                position: Vec(0, -26.2)
            },
            {
                key: "port_main_office_floor_2",
                position: Vec(0, 26.2),
                scale: Vec(1, -1)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(61.03, 34.07, Vec(-1.47, -5.9)),
                    RectangleHitbox.fromRect(12.54, 43.94, Vec(34.76, -25.79)),
                    RectangleHitbox.fromRect(59.15, 24.41, Vec(-1.06, -34.61)),
                    RectangleHitbox.fromRect(10.83, 18.39, Vec(-35.71, -37.68)),
                    RectangleHitbox.fromRect(47.39, 17.67, Vec(-17.03, 24.89)),
                    RectangleHitbox.fromRect(37.64, 8.11, Vec(-12.17, 13.62))
                )
            },
            {
                type: FloorNames.Sand,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(8.51, 8.02, Vec(-35.97, -23.41)),
                    RectangleHitbox.fromRect(8.51, 8.02, Vec(-35.87, 11.07))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.34, 26.54, Vec(-37.14, -6.14)),
                    RectangleHitbox.fromRect(2.29, 41.91, Vec(-41.22, -6.13)),
                    RectangleHitbox.fromRect(10.37, 5.22, Vec(35.51, -49.91))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.94, 20.64, Vec(35.57, 6.11)),
                    RectangleHitbox.fromRect(33.02, 20.99, Vec(24.49, 23.07)),
                    RectangleHitbox.fromRect(84.97, 12.97, Vec(0.09, 41.69)),
                    RectangleHitbox.fromRect(11.33, 2.5, Vec(13.16, 34.3)),
                    RectangleHitbox.fromRect(47.07, 4.29, Vec(0.14, 50.34))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "port_main_office_wall_1", position: Vec(-2.11, 12.26), rotation: 0 },
            { idString: "port_main_office_wall_2", position: Vec(-25.31, 12.26), rotation: 0 },
            { idString: "port_main_office_wall_3", position: Vec(-18.96, -18.13), rotation: 0 },
            { idString: "port_main_office_wall_4", position: Vec(24.25, -18.16), rotation: 0 },
            { idString: "port_main_office_wall_5", position: Vec(12.6, -30.27), rotation: 0 },
            { idString: "port_main_office_wall_6", position: Vec(29.17, -37.6), rotation: 0 },
            { idString: "port_main_office_wall_6", position: Vec(6.04, -37.6), rotation: 0 },
            { idString: "port_main_office_column", position: Vec(-6.47, -18.23) },
            { idString: "port_main_office_column", position: Vec(6.5, -18.13) },
            { idString: "door", position: Vec(-15.09, 12.29), rotation: 0 },
            { idString: "bush", position: Vec(-36, -23.14) },
            { idString: "bush", position: Vec(-35.98, 10.98) },
            { idString: "cabinet", position: Vec(-22.41, -22.2), rotation: 2 },
            { idString: "cabinet", position: Vec(-37.34, 25), rotation: 1 },
            { idString: "grey_office_chair", position: Vec(-5.01, 22.7), rotation: 1 },
            { idString: "desk_right", position: Vec(-0.16, 23.17), rotation: 3 },
            { idString: "large_drawer", position: Vec(-12.96, 29.43), rotation: 2 },
            { idString: "trash_can", position: Vec(-22.58, 30.31) },
            { idString: "water_cooler", position: Vec(24.94, 7.72), rotation: 2 },
            { idString: "box", position: Vec(19.09, 8.22) },
            { idString: "sandbags", position: Vec(0.51, 39.58), rotation: 0 },
            { idString: "box", position: Vec(-9, 38.28) },
            { idString: "box", position: Vec(-14.4, 38.06) },
            { idString: "regular_crate", position: Vec(35.52, 28.55) },
            { idString: "barrel", position: Vec(12.34, 16.95) },
            { idString: "gun_case", position: Vec(24.65, 30.24), rotation: 2 },
            { idString: "file_cart", position: Vec(-0.59, 7.57), rotation: 0 },
            { idString: "potted_plant", position: Vec(-26.13, 7.35), rotation: 0 },
            { idString: "box", position: Vec(37.6, -21.84) },
            { idString: "regular_crate", position: Vec(35.22, -29.69) },
            { idString: randomToilet, position: Vec(11.59, -42.04), rotation: 1 },
            { idString: "sink2", position: Vec(10.57, -34.87), rotation: 1 },
            { idString: "trash_can", position: Vec(25.32, -42.87) },
            { idString: "door", position: Vec(22.82, -30.31), rotation: 2 },
            { idString: "desk_right", position: Vec(-4.99, -39.43), rotation: 0 },
            { idString: "grey_office_chair", position: Vec(-5.52, -34.12), rotation: 2 },
            { idString: "control_panel_small", position: Vec(-36, -41.72), rotation: 1 },
            { idString: "filing_cabinet", position: Vec(-36.27, -33.43), rotation: 1 },
            { idString: "trash_can", position: Vec(-18.16, -42.45) },
            { idString: "grey_office_chair", position: Vec(-27.52, -41.7), rotation: 3 },
            { idString: "glass_door", position: Vec(-30.95, -0.7), rotation: 1 },
            { idString: "glass_door", position: Vec(-30.95, -11.65), rotation: 3 },
            { idString: "door", position: Vec(13.74, 34.46), rotation: 0 },
            { idString: "door", position: Vec(35.08, -46.74), rotation: 2 }
        ]
    },
    {
        idString: "port",
        name: "Port",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(448, 490, Vec(0, -7.5)),
        spawnMode: MapObjectSpawnMode.Beach,
        spawnOrientation: 1,
        spawnOffset: Vec(-160, -15),
        floorZIndex: ZIndexes.Ground,
        sounds: {
            normal: "port_ambience",
            position: Vec(0, 0),
            maxRange: 385,
            falloff: 0.5
        },
        floorImages: [
            // Large warehouse broken wall area (left side, center)
            { key: "barrel_residue", position: Vec(-206.62, -85.47) },

            // Left Side: Top Left // Refinery-like area
            { key: "planted_bushes_residue", position: Vec(-109.2, -225.54) },

            // Right Side: Top Left
            { key: "planted_bushes_residue", position: Vec(91.67, -225.15) },

            { key: "barrier_floor", position: Vec(0, -183.1) },
            { key: "barrier_floor", position: Vec(81.8, 54.9), rotation: Math.PI / 2 }
        ],
        obstacles: IS_CLIENT ? undefined : [

            // ------------------------------------------------------------------------------------------
            // Right Side: Bottom Right
            // ------------------------------------------------------------------------------------------

            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(119.97, 116.31 + 8.8 * i),
                    rotation: 1
                })
            ),

            { idString: "metal_column", position: Vec(119.93, 110.51) },
            { idString: "metal_column", position: Vec(119.93, 175.08) },
            { idString: "metal_column", position: Vec(215.67, 152.85) },

            { idString: "barrel", position: Vec(180.91, 45.99), outdoors: true },
            { idString: "barrel", position: Vec(131.66, 182.27), outdoors: true },

            { idString: "flint_crate", position: Vec(181.89, 54.97), outdoors: true },

            { idString: "ammo_crate", position: Vec(209.3, 59.77), outdoors: true },
            { idString: "ammo_crate", position: Vec(197.03, 84.43), outdoors: true },

            { idString: "smaller_sandbags", position: Vec(196.48, 92.23), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(137.9, 135.75), rotation: 0, outdoors: true },

            { idString: "box", position: Vec(146.98, 131.24), outdoors: true },
            { idString: "box", position: Vec(144.35, 136.2), outdoors: true },
            { idString: "box", position: Vec(149.46, 136.2), outdoors: true },

            { idString: "box", position: Vec(179.86, 142.15), outdoors: true },
            { idString: "box", position: Vec(184.96, 142.15), outdoors: true },
            { idString: "box", position: Vec(182.26, 146.96), outdoors: true },

            { idString: "grenade_crate", position: Vec(182.72, 182.48), outdoors: true },
            { idString: "grenade_crate", position: Vec(189.36, 179.71), outdoors: true },

            { idString: "regular_crate", position: Vec(205.12, 151.1), outdoors: true },
            { idString: "regular_crate", position: Vec(207.37, 160.88), outdoors: true },
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Right Side: Center
            // ------------------------------------------------------------------------------------------
            // fence
            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(143.88 + 8.8 * i, -38.32),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(119.8, -32.47 + 8.8 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 26 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(215.64, -73.12 + 8.8 * i),
                    rotation: 1
                })
            ),

            { idString: "regular_crate", position: Vec(112.95, 5.44), outdoors: true },

            { idString: "metal_column", position: Vec(215.59, -79.04) },
            { idString: "metal_column", position: Vec(202.54, -38.28) },
            { idString: "metal_column", position: Vec(137.84, -38.29) },
            { idString: "metal_column", position: Vec(119.86, -38.36) },
            { idString: "metal_column", position: Vec(119.84, 26.32) },

            { idString: "forklift", position: Vec(111.6, -85.18), rotation: 2, outdoors: true },

            { idString: "grenade_crate", position: Vec(200.77, -121.33), outdoors: true },
            { idString: "grenade_crate", position: Vec(81, -37.2), outdoors: true },
            { idString: "grenade_crate", position: Vec(114.59, -9.83), outdoors: true },

            { idString: "propane_tank", position: Vec(82.46, -53.54), outdoors: true },
            { idString: "propane_tank", position: Vec(96.82, -38.52), outdoors: true },

            { idString: "ammo_crate", position: Vec(142.93, -16.31), outdoors: true },
            { idString: "ammo_crate", position: Vec(209.41, -120.27), outdoors: true },
            { idString: "ammo_crate", position: Vec(89.61, -51.02), outdoors: true },
            { idString: "ammo_crate", position: Vec(79.47, -46.2), outdoors: true },
            { idString: "ammo_crate", position: Vec(89.69, -40.66), outdoors: true },

            { idString: "sandbags", position: Vec(151.87, -56.03), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(203.28, -129.7), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(184.03, -32.98), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(210.22, -22.85), rotation: 1, outdoors: true },

            { idString: "smaller_sandbags", position: Vec(113.58, -2.94), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(210.38, 15.27), rotation: 0, outdoors: true },

            { idString: { box: 1, grenade_box: 0.15 }, position: Vec(97.78, -53.95), outdoors: true },
            { idString: "box", position: Vec(172.96, -111.62), outdoors: true },
            { idString: "box", position: Vec(211.96, 20.85), outdoors: true },
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Right Side: Top Left
            // ------------------------------------------------------------------------------------------

            // fence
            ...Array.from(
                { length: 17 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(68.97 + 8.8 * i, -243.15),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 15 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(215.64, -240.25 + 8.8 * i),
                    rotation: 1
                })
            ),

            // note to self: always put columns AFTER fences
            { idString: "metal_column", position: Vec(215.66, -243.25) },
            { idString: "metal_column", position: Vec(215.66, -111.21) },

            { idString: "dumpster", position: Vec(208.3, -210.42), rotation: 0, outdoors: true },
            { idString: "trash_bag", position: Vec(207.12, -198.56), outdoors: true },

            { idString: "metal_column", position: Vec(20.82, -221.09) },
            { idString: "metal_column", position: Vec(20.97, -243.09) },

            { idString: "barrel", position: Vec(78.38, -234.57), outdoors: true },
            { idString: "barrel", position: Vec(57.46, -163.16), waterOverlay: true, outdoors: true },
            { idString: "regular_crate", position: Vec(54.54, -153.74), waterOverlay: true, outdoors: true },

            { idString: "grenade_crate", position: Vec(114.83, -216.15), outdoors: true },

            { idString: "propane_tank", position: Vec(87.16, -134.58), outdoors: true },

            { idString: "gun_case", position: Vec(93.12, -135.29), rotation: 1, outdoors: true },

            { idString: "regular_crate", position: Vec(69.62, -235.69), outdoors: true },
            { idString: "regular_crate", position: Vec(85.12, -141.67), outdoors: true },
            { idString: "regular_crate", position: Vec(80.03, -131.98), outdoors: true },

            { idString: "box", position: Vec(30.27, -230.74), outdoors: true },
            { idString: "box", position: Vec(30.27, -235.7), outdoors: true },
            { idString: "box", position: Vec(70.36, -217.63), outdoors: true },
            { idString: "box", position: Vec(75.46, -217.56), outdoors: true },
            { idString: "box", position: Vec(156.55, -233.86), outdoors: true },
            { idString: { box: 1, grenade_box: 0.5 }, position: Vec(169.67, -233.93), outdoors: true },
            { idString: "box", position: Vec(77.83, -139.44), outdoors: true },
            { idString: "box", position: Vec(87.45, -129.9), outdoors: true },

            { idString: "planted_bushes", position: Vec(73.65, -225.45), rotation: 1, outdoors: true },
            { idString: "planted_bushes", position: Vec(109.69, -225.45), rotation: 1, outdoors: true },

            { idString: "smaller_sandbags", position: Vec(163.06, -234.3), rotation: 0, outdoors: true },

            { idString: "pallet", position: Vec(65.4, -155.76), rotation: 2, outdoors: true },
            { idString: "box", position: Vec(67.31, -155.12), outdoors: true },
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Left Side: Top Left // Refinery-like area
            // ------------------------------------------------------------------------------------------
            { idString: "silo", position: Vec(-181.75, -167.4), rotation: 0, outdoors: true },
            { idString: "silo", position: Vec(-141.15, -209.35), rotation: 2, outdoors: true },

            { idString: "regular_crate", position: Vec(-177.77, -222.93), outdoors: true },
            { idString: "melee_crate", position: Vec(-158.02, -198.87), outdoors: true },
            { idString: "regular_crate", position: Vec(-162.67, -155.56), outdoors: true },

            { idString: "barrel", position: Vec(-125.97, -190.27), outdoors: true },
            { idString: "barrel", position: Vec(-190.81, -192.61), outdoors: true },
            { idString: "barrel", position: Vec(-168.52, -224.26), outdoors: true },
            { idString: "super_barrel", position: Vec(-197.02, -187.09), outdoors: true },

            // the only ones who will survive the boom boom boom boom i want you in my room
            { idString: "sandbags", position: Vec(-161.08, -177.44), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(-197.34, -202.28), rotation: 1, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-158.31, -170.34), rotation: 0, outdoors: true },

            { idString: "metal_column", position: Vec(-202.51, -212.43) },
            { idString: "metal_column", position: Vec(-184.42, -229.94) },
            { idString: "metal_column", position: Vec(-119.81, -229.95) },
            { idString: "metal_column", position: Vec(-119.82, -182.91) },
            { idString: "metal_column", position: Vec(-119.82, -159.6) },

            // fence
            { idString: "fence", position: Vec(-119.81, -153.77), rotation: 1 },
            ...Array.from(
                { length: 5 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-119.79, -188.89 - 8.8 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-202.52, -153.75 - 8.8 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-125.74 - 8.8 * i, -229.97),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 17 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-209.66 + 8.8 * i, -243.2),
                    rotation: 0
                })
            ),

            // outside refinery-like area
            { idString: "forklift", position: Vec(-97.1, -153.48), rotation: 0, outdoors: true },

            { idString: "barrel", position: Vec(-69.38, -216.4), outdoors: true },

            { idString: "grenade_crate", position: Vec(-105.66, -229.46), outdoors: true },

            { idString: "regular_crate", position: Vec(-112.72, -215.26), outdoors: true },
            { idString: "regular_crate", position: Vec(-75.61, -183.93), outdoors: true },

            { idString: "planted_bushes", position: Vec(-91.86, -225.47), rotation: 1, outdoors: true },
            { idString: "planted_bushes", position: Vec(-73.75, -225.47), rotation: 1, outdoors: true },

            { idString: "sandbags", position: Vec(-113.66, -226.97), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec(-77.72, -174.34), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-105.2, -222.95), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-76.39, -216.45), rotation: 1, outdoors: true },
            { idString: "barrier", position: Vec(-0.87, -227.85), rotation: 3, outdoors: true },
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Left Side: Bottom Left
            // ------------------------------------------------------------------------------------------
            { idString: "ship_oil_source", position: Vec(-63.48, 113.09), rotation: 0, outdoors: true },

            // fence pieces
            { idString: "fence", position: Vec(-125.37, 55.7), rotation: 0 },
            { idString: "fence", position: Vec(-119.52, 61.57), rotation: 1 },
            { idString: "fence", position: Vec(-119.52, 70.37), rotation: 1 },
            { idString: "fence", position: Vec(-119.52, 79.17), rotation: 1 },
            { idString: "fence", position: Vec(-119.52, 87.91), rotation: 1 },
            { idString: "fence", position: Vec(-119.46, 142.75), rotation: 1 },
            { idString: "fence", position: Vec(-119.46, 151.46), rotation: 1 },
            { idString: "fence", position: Vec(-119.46, 160.23), rotation: 1 },
            { idString: "fence", position: Vec(-119.46, 169), rotation: 1 },

            ...Array.from(
                { length: 13 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-215.56, 149.86 - 8.8 * i),
                    rotation: 1
                })
            ),

            // fence columns
            { idString: "metal_column", position: Vec(-119.52, 93.83) },
            { idString: "metal_column", position: Vec(-119.52, 55.7) },
            { idString: "metal_column", position: Vec(-131.25, 55.7) },
            { idString: "metal_column", position: Vec(-119.46, 136.8) },
            { idString: "metal_column", position: Vec(-119.46, 174.95) },
            { idString: "metal_column", position: Vec(-215.58, 152.81) },
            { idString: "metal_column", position: Vec(-215.58, 38.48) },

            { idString: "sandbags", position: Vec(-142.32, 138.75), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-198.55, 157.42), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-145.02, 74.26), rotation: 0 }, // H_S

            { idString: "barrel", position: Vec(-92.65, 185.04), outdoors: true },
            { idString: "barrel", position: Vec(-190.09, 156.94), outdoors: true },
            { idString: "barrel", position: Vec(-145.3, 130.52), outdoors: true },

            { idString: "propane_tank", position: Vec(-128.55, 81.93) }, // H_S
            { idString: { box: 0.5, grenade_box: 1 }, position: Vec(-123.93, 83.03) }, // H_S
            { idString: "regular_crate", position: Vec(-144.21, 65.72) }, // H_S
            { idString: "grenade_crate", position: Vec(-125.13, 65.32) }, // H_S

            { idString: "box", position: Vec(-126.9, 184.32), outdoors: true },
            { idString: "box", position: Vec(-132.22, 186.21), outdoors: true },
            { idString: "box", position: Vec(-97.01, 154.82), outdoors: true },
            { idString: "box", position: Vec(-91.61, 157.44), outdoors: true },
            { idString: "box", position: Vec(-146.62, 110.96), outdoors: true },
            { idString: "box", position: Vec(-146.55, 105.93), outdoors: true },
            { idString: "box", position: Vec(-141.3, 108.04), outdoors: true },

            { idString: "forklift", position: Vec(-123.36, 121.84), rotation: 1, outdoors: true },
            { idString: "dumpster", position: Vec(-207.76, 128.33), rotation: 2, outdoors: true },
            { idString: "trash_bag", position: Vec(-206.77, 139.05), outdoors: true },
            { idString: "roadblock", position: Vec(-140.92, 55.62), rotation: 1 }, // H_S

            { idString: "ammo_crate", position: Vec(-95.12, 147.13), outdoors: true },
            { idString: "ammo_crate", position: Vec(-100.03, 164.29), outdoors: true },
            { idString: "ammo_crate", position: Vec(-126.3, 74.77) }, // H_S
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Left Side: Bottom Center/forklift parking area (large warehouse)
            // ------------------------------------------------------------------------------------------
            // fence / Vec(-215.64, 0.22),
            ...Array.from(
                { length: 28 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-215.64, 0.22 - 8.8 * i),
                    rotation: 1
                })
            ),

            // fence columns
            { idString: "metal_column", position: Vec(-215.63, 6.16) },
            { idString: "metal_column", position: Vec(-215.53, -243.21) },

            { idString: "forklift", position: Vec(-155.48, 34.57), rotation: 0, outdoors: true },
            { idString: "forklift", position: Vec(-124.14, 35.6), rotation: 2, outdoors: true },
            { idString: "forklift", position: Vec(-176.57, -11.61), rotation: 2, outdoors: true },

            { idString: "grenade_crate", position: Vec(-141.76, 39.83), outdoors: true },
            { idString: "super_barrel", position: Vec(-138.62, 32), outdoors: true },
            { idString: "barrel", position: Vec(-195.61, 32.45), outdoors: true },
            { idString: "ammo_crate", position: Vec(-194.52, 23.24), outdoors: true },
            { idString: "ammo_crate", position: Vec(-112.52, -77.97), rotation: 0, outdoors: true },
            { idString: "grenade_crate", position: Vec(-80.03, -99.44), outdoors: true },
            { idString: "grenade_crate", position: Vec(-72.52, -106.3), outdoors: true },
            { idString: "sandbags", position: Vec(-80.14, -109.58), rotation: 1, outdoors: true },
            { idString: "propane_tank", position: Vec(-73.85, -111.96), outdoors: true },
            { idString: "dumpster", position: Vec(-208.05, -47.65), rotation: 2, outdoors: true },
            { idString: "dumpster", position: Vec(-208.05, -63.05), rotation: 2, outdoors: true },
            { idString: "trash_bag", position: Vec(-207.22, -74.08), outdoors: true },

            // Large Warehouse Obstacles
            { idString: "forklift", position: Vec(-163.52, -117.59), rotation: 1 },
            { idString: "pallet", position: Vec(-126.4, -26.02), rotation: 1 },
            { idString: "grenade_crate", position: Vec(-126.4, -26.02) },
            { idString: "pallet", position: Vec(-126.35, -141.46), rotation: 1 },
            { idString: "regular_crate", position: Vec(-126.35, -141.46) },
            { idString: "ammo_crate", position: Vec(-126.11, -130.4) },
            { idString: "ammo_crate", position: Vec(-126.18, -91.34) },
            { idString: "ammo_crate", position: Vec(-161.17, -88.22) },
            { idString: "ammo_crate", position: Vec(-161.1, -68.41) },
            { idString: "ammo_crate", position: Vec(-126.41, -14.79) },
            { idString: "ammo_crate", position: Vec(-196.14, -26.67) },

            { idString: "barrel", position: Vec(-167.66, -108.58) },
            { idString: "barrel", position: Vec(-135.53, -143.1) },
            { idString: "barrel", position: Vec(-125.05, -64.65) },
            { idString: "barrel", position: Vec(-197.38, -35.8) },
            { idString: "barrel", position: Vec(-146.77, -14.07) },
            { idString: "barrel", position: Vec(-196.87, -143.09) },
            { idString: "super_barrel", position: Vec(-162.51, -40.27) },

            { idString: "box", position: Vec(-198.66, -59.33) },
            { idString: "box", position: Vec(-123.75, -71.32) },
            { idString: "box", position: Vec(-128.85, -71.32) },

            { idString: "regular_crate", position: Vec(-177.87, -135.25) },
            { idString: "regular_crate", position: Vec(-196.33, -66.7) },

            { idString: "aegis_crate", position: Vec(-166.17, -78.36) },
            { idString: "aegis_crate", position: Vec(-156.4, -78.36) },

            { idString: "sandbags", position: Vec(-154.36, -44.31), rotation: 1 },
            { idString: "propane_tank", position: Vec(-194.04, -59.69) },
            { idString: "gun_case", position: Vec(-145.07, -143.59), rotation: 0 },
            // ------------------------------------------------------------------------------------------

            // Bollards
            // Left Side
            { idString: "bollard", position: Vec(-198.63, 185.55), rotation: 3, outdoors: true },
            { idString: "bollard", position: Vec(-141.17, 185.52), rotation: 3, outdoors: true },
            { idString: "bollard", position: Vec(-83.87, 185.62), rotation: 3, outdoors: true },

            // Right Side
            { idString: "bollard", position: Vec(84.42, 185.59), rotation: 3, outdoors: true },
            { idString: "bollard", position: Vec(141.8, 185.44), rotation: 3, outdoors: true },
            { idString: "bollard", position: Vec(199.25, 185.47), rotation: 3, outdoors: true }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "cargo_ship", position: Vec(0, 45.5) },
            { idString: "port_warehouse", position: Vec(-176.5, 98.75) },

            // Left Side: Bottom Left
            { idString: "port_hay_shed", position: Vec(-73.7, -135), orientation: 1 },
            { idString: "porta_potty", position: Vec(130, -165.4), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(-168.2, -188.5), orientation: 1 }, // y, x
            { idString: randomPallet, position: Vec(-153.61, -104.34), orientation: 1 },
            { idString: randomPallet, position: Vec(-143.74, 170.4) },
            { idString: randomPallet, position: Vec(-121.96, -111.74), orientation: 1 },
            { idString: randomPallet, position: Vec(-82.81, -144.84), orientation: 1 }, // H_S
            { idString: "truck_1", position: Vec(93.5, -77), orientation: 2 }, // x,y, positive -> negative

            // Left Side: Bottom Center
            { idString: randomPallet, position: Vec(-194.65, 13.45) },
            { idString: randomPallet, position: Vec(67.72, -112.69), orientation: 1 },
            { idString: randomPallet, position: Vec(88.26, -112.69), orientation: 1 },
            { idString: randomPallet, position: Vec(108, -88.97), orientation: 1 },

            // Large Warehouse
            { idString: "large_warehouse", position: Vec(-158.8, -76) },
            { idString: randomPortDamagedContainer, position: Vec(194.2, 85.5), orientation: 2 },
            { idString: randomPallet, position: Vec(-156.48, -14.52) },
            { idString: randomPallet, position: Vec(-136.78, -14.37) },
            { idString: randomPallet, position: Vec(-156.25, -142.2) },
            { idString: randomPallet, position: Vec(-151.41, -117.66) },
            { idString: randomPallet, position: Vec(132.88, -196.31), orientation: 1 },
            { idString: randomPallet, position: Vec(121.28, -196.3), orientation: 1 },
            { idString: randomPallet, position: Vec(23.74, -176.44), orientation: 1 },
            { idString: randomPallet, position: Vec(15.65, -196.41), orientation: 1 },
            { idString: randomPallet, position: Vec(79.79, -125.89), orientation: 1 },

            // Left Side: Top Left // Refinery-like area
            { idString: randomPallet, position: Vec(-126.84, -154.6) },
            { idString: randomPallet, position: Vec(222.21, -159.22), orientation: 1 },
            { idString: "port_gate_office", position: Vec(-44.15, -230) },

            // Right Side: Top Left
            { idString: "port_storage", position: Vec(48.8, -230.05) },
            { idString: "port_main_office", position: Vec(161.35, -183.07) },
            { idString: randomPallet, position: Vec(223.73, 208.67), orientation: 1 },

            // Right Side: Center
            { idString: randomPallet, position: Vec(111.65, -97.06) },
            { idString: randomPallet, position: Vec(46.01, 99.24), orientation: 1 },
            { idString: randomPallet, position: Vec(142.19, -6.04) },
            { idString: randomPallet, position: Vec(168.2, 22.47) },
            { idString: "truck_2", position: Vec(-68.6, -177), orientation: 3 },
            { idString: "mutated_forklift", position: Vec(153.71, -98.5) },
            { idString: "porta_potty", position: Vec(-50.4, -190.07), orientation: 3 }, // fucking porta potty in the middle of the road
            { idString: "large_truck", position: Vec(122.9, 159.1), orientation: 1 }, // y x

            { idString: randomPortOpenContainerTwoSide, position: Vec(169.65, -15.05) },
            { idString: randomPortOpenContainerOneSide, position: Vec(183.95, -15.05) },
            { idString: randomPortOpenContainerOneSide, position: Vec(-155.35, 15.05), orientation: 2 },

            { idString: randomPortOpenContainerOneSide, position: Vec(155.35, 13.25) },
            { idString: randomPortOpenContainerOneSide, position: Vec(141.05, 13.25) },

            // Right Side: Bottom Right

            // ----------------------------------
            // container distance X = 14.3
            // container distance Y = 28.55
            // ----------------------------------
            { idString: randomPallet, position: Vec(182.22, 64.55) },
            { idString: "truck_1", position: Vec(100.1, 129.8) },

            { idString: randomPortOpenContainerOneSide, position: Vec(-169.65, -55.05), orientation: 2 },
            { idString: randomPortOpenContainerTwoSide, position: Vec(-155.35, -55.05), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(-141.05, -55.05), orientation: 2 },

            { idString: randomPortOpenContainerOneSide, position: Vec(169.65, 83.5) },
            { idString: randomPortDamagedContainer, position: Vec(-155.35, -83.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(183.95, 83.5) },

            // y = 125
            { idString: randomPortOpenContainerOneSide, position: Vec(-183.95, -125), orientation: 2 },
            { idString: randomPortDamagedContainerReversed, position: Vec(169.65, 125) },
            { idString: randomPortDamagedContainerReversed, position: Vec(-169.65, -153.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(141.05, 153.5) },
            { idString: randomPortOpenContainerOneSide, position: Vec(155.35, 153.5) }
        ],
        floors: [ // Follows ground graphics for most part
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(149, 434.5, Vec(-141.68, -27.59)), // G1 - L
                    RectangleHitbox.fromRect(432, 76, Vec(0, -207)), // G2 - C
                    RectangleHitbox.fromRect(149, 434.5, Vec(141.68, -27.59)) // G1 - R
                )
            },
            {
                type: FloorNames.Water,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(135, 388, Vec(0, 24.5)),
                    RectangleHitbox.fromRect(148.72, 55.77, Vec(-0.32, 216.9))
                )
            }
        ],
        // ----------------------------------------------------
        // very important pap notes
        // ----------------------------------------------------
        // color sillies
        // 0xe6e6e6 - white lines
        // 0x666666 - another ground
        // 0x595959 - ground

        // weh
        // G - Ground
        // L - Left
        // R - Right
        // C - Center
        // ----------------------------------------------------
        terrainGraphics: [
            { // water
                color: 0x2869af,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(135, 388, Vec(0, 24.5)),
                    RectangleHitbox.fromRect(148.72, 55.77, Vec(-0.32, 216.9))
                ),
                waterTint: true
            }
        ],
        groundGraphics: [
            {
                color: 0x666666,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(149, 434.5, Vec(-141.68, -27.59)), // G1 - L
                    RectangleHitbox.fromRect(432, 76, Vec(0, -207)), // G2 - C
                    RectangleHitbox.fromRect(149, 434.5, Vec(141.68, -27.59)) // G1 - R
                )
            },
            // Darker grey
            {
                color: 0x4d4d4d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(84.8, 121.38, Vec(-161.23, 115.3)), // bottom left corner
                    RectangleHitbox.fromRect(84.9, 215.63, Vec(161.29, 68.18)), // containers area
                    RectangleHitbox.fromRect(84.85, 224, Vec(-161.22, -119.5)) // the refinery-like area
                )
            },
            // Road body
            {
                color: 0x595959,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(39.2, 396.6, Vec(-99.2, -22.25)), // G2 - L
                    RectangleHitbox.fromRect(39.2, 396.6, Vec(99.2, -22.25)), // G2 - R
                    RectangleHitbox.fromRect(237.53, 39.36, Vec(0, -200.85)), // G2 - C
                    RectangleHitbox.fromRect(124.12, 62.44, Vec(-141.6, 23.49)), // L
                    RectangleHitbox.fromRect(93.5, 95.48, Vec(157, -86.52)), // R
                    RectangleHitbox.fromRect(39.46, 24.5, Vec(0, -232.7)) // main gate (Y LIMIT = 233)
                )
            },
            // for container area, the yellow "boxes" (0xa6b541, 0.59)
            {
                color: 0xa6b541,
                hitbox: new GroupHitbox(
                    // top
                    RectangleHitbox.fromRect(0.59, 58.25, Vec(191.6, -1.19)),
                    RectangleHitbox.fromRect(0.59, 58.25, Vec(133.18, -1.19)),
                    RectangleHitbox.fromRect(59, 0.59, Vec(162.4, 27.63)),
                    RectangleHitbox.fromRect(59, 0.59, Vec(162.4, -30.04)),

                    // middle
                    RectangleHitbox.fromRect(0.59, 58.25, Vec(191.6, 69.01)),
                    RectangleHitbox.fromRect(0.59, 58.25, Vec(133.18, 69.01)),
                    RectangleHitbox.fromRect(59, 0.59, Vec(162.4, 40.16)),
                    RectangleHitbox.fromRect(59, 0.59, Vec(162.4, 97.87)),

                    // bottom
                    RectangleHitbox.fromRect(0.59, 58.25, Vec(133.18, 139.31)),
                    RectangleHitbox.fromRect(0.59, 58.25, Vec(191.6, 139.31)),
                    RectangleHitbox.fromRect(59, 0.59, Vec(162.4, 110.45)),
                    RectangleHitbox.fromRect(59, 0.59, Vec(162.4, 168.15))

                )
            },
            // Road lines (road width/height must be 1.19)
            {
                color: 0xe6e6e6,
                hitbox: new GroupHitbox(
                    // forklift parking area (L)
                    RectangleHitbox.fromRect(47.8, 1.19, Vec(-139.61, 52.12)),
                    RectangleHitbox.fromRect(1.19, 31.48, Vec(-162.92, 39.01)),
                    RectangleHitbox.fromRect(1.19, 29.47, Vec(-147.41, 37.97)),
                    RectangleHitbox.fromRect(1.19, 29.47, Vec(-131.89, 37.97)),
                    RectangleHitbox.fromRect(1.19, 71.23, Vec(-116.3, 58.87)),
                    RectangleHitbox.fromRect(2.66, 1.19, Vec(-117.25, 93.9)),
                    RectangleHitbox.fromRect(1.19, 3.34, Vec(-190.09, 53.19)),
                    RectangleHitbox.fromRect(11.98, 1.19, Vec(-195.52, 52.12)),
                    RectangleHitbox.fromRect(1.19, 58.23, Vec(-200.95, 23.59)),
                    RectangleHitbox.fromRect(12.02, 1.19, Vec(-195.46, -4.94)),
                    RectangleHitbox.fromRect(1.19, 2.97, Vec(-190.04, -6.2)),
                    RectangleHitbox.fromRect(1.19, 2.97, Vec(-162.95, -6.2)),
                    RectangleHitbox.fromRect(47.75, 1.19, Vec(-139.67, -4.94)),
                    RectangleHitbox.fromRect(1.19, 29.03, Vec(-116.39, -19.02)),
                    RectangleHitbox.fromRect(3.06, 1.19, Vec(-117.35, -32.96)),

                    // top & center (L)
                    // these are mostly for the gates on the large warehouse
                    RectangleHitbox.fromRect(3.12, 1.19, Vec(-117.32, -60.11)),
                    RectangleHitbox.fromRect(1.19, 37.74, Vec(-116.35, -78.44)),
                    RectangleHitbox.fromRect(3.12, 1.19, Vec(-117.32, -96.74)),
                    RectangleHitbox.fromRect(3.12, 1.19, Vec(-117.32, -123.87)),
                    RectangleHitbox.fromRect(1.19, 36.89, Vec(-116.35, -141.74)),
                    RectangleHitbox.fromRect(3.12, 1.19, Vec(-117.32, -159.58)),
                    RectangleHitbox.fromRect(3.12, 1.19, Vec(-117.32, -183)),
                    RectangleHitbox.fromRect(1.19, 35.4, Vec(-116.35, -200.37)),
                    RectangleHitbox.fromRect(100.22, 1.19, Vec(-66.54, -217.49)), // L
                    RectangleHitbox.fromRect(100.22, 1.19, Vec(66.54, -217.49)), // R
                    RectangleHitbox.fromRect(1.19, 23.49, Vec(-17.025, -229.5)), // main gate L
                    RectangleHitbox.fromRect(1.19, 23.49, Vec(17.025, -229.5)), // main gate R
                    RectangleHitbox.fromRect(3.07, 1.19, Vec(-18.15, -240.65)),
                    RectangleHitbox.fromRect(3.07, 1.19, Vec(18.15, -240.65)),

                    // bottom (L)
                    RectangleHitbox.fromRect(35.31, 1.19, Vec(-99.28, 173.26)), // connects to main L
                    RectangleHitbox.fromRect(1.19, 37.68, Vec(-116.35, 155.03)),
                    RectangleHitbox.fromRect(2.9, 1.19, Vec(-117.25, 136.69)),
                    RectangleHitbox.fromRect(1.19, 89.4, Vec(82.14, 129.1)),
                    RectangleHitbox.fromRect(1.19, 63.52, Vec(116.35, 141.62)),
                    RectangleHitbox.fromRect(2.9, 1.19, Vec(117.2, 26.5)),
                    RectangleHitbox.fromRect(2.8, 1.19, Vec(117.15, 110.42)),

                    // bottom (R)
                    RectangleHitbox.fromRect(35.31, 1.19, Vec(99.28, 173.26)), // connects to main R

                    // top (R)
                    RectangleHitbox.fromRect(1.19, 86.65, Vec(116.34, -174.92)),
                    // cargo truck parking area
                    RectangleHitbox.fromRect(85.4, 1.19, Vec(158.75, -132.18)),
                    RectangleHitbox.fromRect(1.19, 91.83, Vec(200.95, -86.85)),
                    RectangleHitbox.fromRect(80.38, 1.19, Vec(160.39, -114.03)), // 1
                    RectangleHitbox.fromRect(80.38, 1.19, Vec(160.39, -95.91)), // 2
                    RectangleHitbox.fromRect(80.38, 1.19, Vec(160.39, -77.74)), // 3
                    RectangleHitbox.fromRect(80.38, 1.19, Vec(160.39, -59.68)), // 4
                    RectangleHitbox.fromRect(85.8, 1.19, Vec(158.6, -41.49)),
                    // containers area
                    RectangleHitbox.fromRect(1.19, 69.01, Vec(116.3, -7.57)),

                    // main
                    RectangleHitbox.fromRect(53.34, 1.19, Vec(-56.03, -183.34)), // C-L
                    RectangleHitbox.fromRect(53.34, 1.19, Vec(56.03, -183.34)), // C-R
                    RectangleHitbox.fromRect(1.19, 2.8, Vec(-29.89, -182.5)),
                    RectangleHitbox.fromRect(1.19, 2.8, Vec(29.89, -182.5)),
                    RectangleHitbox.fromRect(1.19, 357.83, Vec(-82.13, -5.02)), // L
                    RectangleHitbox.fromRect(1.19, 209.33, Vec(82.12, -79.19)), // R-1
                    RectangleHitbox.fromRect(3.1, 1.19, Vec(81.17, 24.99)),
                    RectangleHitbox.fromRect(3.1, 1.19, Vec(81.17, 84.74))
                    //       RectangleHitbox.fromRect(1.19, 357.83, Vec(82.13, -5.02)) // R
                )
            },
            // ---------------------------------------------------------------------------
            // Oil pipe(?), connects to ship from refinery-like area
            // ---------------------------------------------------------------------------
            {
                color: 0x6d602f,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.7, 40.37, Vec(-158.05, -188.79)),
                    RectangleHitbox.fromRect(87.91, 1.71, Vec(-115.05, -169.52)),
                    RectangleHitbox.fromRect(1.71, 273.6, Vec(-71.89, -32.08))
                )
            },
            // fill
            {
                color: 0x9e8b44,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(0.9, 39.57, Vec(-158.05, -188.79)),
                    RectangleHitbox.fromRect(87.11, 0.9, Vec(-114.99, -169.52)),
                    RectangleHitbox.fromRect(0.9, 273.5, Vec(-71.89, -32.5))
                )
            },

            // grab my hand... I can see the void..
            { // border
                color: 0x404040,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.49, 2.5, Vec(-109.12, -169.49)),
                    RectangleHitbox.fromRect(10.49, 2.5, Vec(-91.42, -169.5)),
                    RectangleHitbox.fromRect(10.49, 4.12, Vec(-109.12, -169.49)),
                    RectangleHitbox.fromRect(10.49, 4.12, Vec(-91.42, -169.47))
                )
            },
            { // FILL_MIDDLE
                color: 0x4d4d4d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(9.6, 0.39, Vec(-109.12, -170.92)),
                    RectangleHitbox.fromRect(9.6, 0.39, Vec(-109.12, -168.07)),
                    RectangleHitbox.fromRect(9.6, 0.39, Vec(-91.42, -170.92)),
                    RectangleHitbox.fromRect(9.6, 0.39, Vec(-91.42, -168.07))
                )
            },
            { // fill
                color: 0x595959,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(9.64, 1.65, Vec(-109.12, -169.49)),
                    RectangleHitbox.fromRect(9.64, 1.65, Vec(-91.42, -169.5))
                )
            }
            // ---------------------------------------------------------------------------
        ]
    },
    {
        idString: "cargo_ship_bottom_floor_vault",
        name: "Cargo Ship Vault",
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(28.15, 52.25),
            RectangleHitbox.fromRect(14, 4, Vec(7.1, 26.3)),
            RectangleHitbox.fromRect(14, 4, Vec(-7.1, -26.3))
        ),
        ceilingHitbox: RectangleHitbox.fromRect(28.15, 52.25),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.98, 55, Vec(13.11, -0.55)),
            RectangleHitbox.fromRect(1.98, 55, Vec(-13.11, 0.55)),
            RectangleHitbox.fromRect(15.65, 2.02, Vec(4.5, 8.85)),
            RectangleHitbox.fromRect(15.65, 2.02, Vec(-4.5, -14.1)),
            RectangleHitbox.fromRect(13.99, 2.02, Vec(7.15, 27.2)),
            RectangleHitbox.fromRect(13.99, 2.02, Vec(-7.15, -27.2))
        ),
        floorImages: [{
            key: "cargo_ship_vault_floor",
            position: Vec(0, 0)
        }],
        ceilingImages: [{
            key: "cargo_ship_vault_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "gun_case", position: Vec(-8.84, -20.65), rotation: 1 },
            { idString: "lamp", position: Vec(4.52, 6.59), rotation: 0, variation: 0 },
            { idString: "melee_crate", position: Vec(8.41, 4.07) },
            { idString: "grenade_crate", position: Vec(1.5, 4.07) },
            { idString: "gun_locker", position: Vec(-5.08, -10.13), rotation: 0 },
            {
                idString: {
                    tango_crate: 1,
                    briefcase: 0.75
                },
                position: Vec(7.56, 18.02),
                rotation: 3
            }
        ]
    },
    {
        idString: "cargo_ship_bottom_floor_vault_special",
        name: "Cargo Ship Vault",
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(28.15, 52.25),
            RectangleHitbox.fromRect(14, 4, Vec(7.1, 26.3)),
            RectangleHitbox.fromRect(14, 4, Vec(-7.1, -26.3))
        ),
        ceilingHitbox: RectangleHitbox.fromRect(28.15, 52.25),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.98, 55, Vec(13.11, -0.55)),
            RectangleHitbox.fromRect(1.98, 55, Vec(-13.11, 0.55)),
            RectangleHitbox.fromRect(13.99, 2.02, Vec(7.15, 27.2)),
            RectangleHitbox.fromRect(13.99, 2.02, Vec(-7.15, -27.2))
        ),
        floorImages: [{
            key: "cargo_ship_vault_floor_secret",
            position: Vec(0, 0),
            scale: Vec(-1, -1)
        }],
        ceilingImages: [{
            key: "cargo_ship_vault_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        puzzle: {
            delay: 450
        },
        sounds: {
            solved: "recorder_buzz",
            position: Vec(-7.5, -22.73),
            maxRange: 150,
            falloff: 1
        },
        obstacles: IS_CLIENT ? undefined : [
            { idString: "melee_crate", position: Vec(8.39, 22.26) },
            { idString: "gun_case", position: Vec(9.12, 13.39), rotation: 3 },
            { idString: "lamp", position: Vec(10.73, -2), rotation: 1, variation: 0 },
            { idString: "vat", position: Vec(8.6, 4.53), rotation: 1, variation: 0 },
            { idString: "vat", position: Vec(8.9, -2.76), rotation: 1, variation: 1 },
            { idString: "vat", position: Vec(8.6, -10.05), rotation: 1, variation: 0 },
            { idString: "propane_tank", position: Vec(9.9, -15.74) },
            { idString: "vat", position: Vec(-8.9, 12.8), rotation: 3, variation: 1 },
            { idString: "vat", position: Vec(-8.6, 5.49), rotation: 3, variation: 0 },
            { idString: "lamp", position: Vec(-10.82, -6.98), rotation: 3, variation: 1 },
            { idString: "recorder_interactable", position: Vec(-7.5, -22.73), rotation: 0, puzzlePiece: true } // TODO
        ],
        lootSpawners: IS_CLIENT ? undefined : [{
            table: "gun_mount_m590m",
            position: Vec(-2.63, -11.39)
        }]
    },
    {
        idString: "cargo_ship",
        name: "Hyperion",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(180, 400, Vec(-1.5, -1.8)),
        puzzle: {
            triggerOnSolve: "vault_door_deactivated",
            delay: 2000,
            unlockOnly: true
        },
        sounds: {
            solved: "generator_running",
            position: Vec(-1.46, 40.23),
            maxRange: 50,
            falloff: 5
        },
        obstacles: IS_CLIENT ? undefined : [
            {
                idString: "generator",
                position: Vec(-2.01, 34.23),
                rotation: 0,
                layer: Layer.Upstairs,
                puzzlePiece: true
            },
            {
                idString: "vault_door_deactivated",
                position: Vec(25.6, -60),
                rotation: 0,
                locked: true,
                layer: Layer.Ground
            },
            {
                idString: "vault_door_deactivated",
                position: Vec(42.5, -119.53),
                rotation: 2,
                locked: true,
                layer: Layer.Ground
            }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "cargo_ship_top_floor", position: Vec(-0.55, -6), layer: Layer.Upstairs },
            { idString: "cargo_ship_bottom_floor", position: Vec(1.8, 0) },

            // Top
            { idString: "container_20", position: Vec(27.75, 75.2), orientation: 2, replaceableBy: "container_21", layer: Layer.Upstairs },
            { idString: "container_20", position: Vec(26.65, -103.75), replaceableBy: "container_21", layer: Layer.Upstairs },
            { idString: "container_20", position: Vec(-27.55, -5), replaceableBy: "container_21", layer: Layer.Upstairs },
            { idString: "container_20", position: Vec(12.32, 65.8), replaceableBy: "container_21", layer: Layer.Upstairs },

            // Bottom
            { idString: "container_20", position: Vec(12.45, 65.25), replaceableBy: "container_21" },
            { idString: "container_20", position: Vec(12.55, -104.15), replaceableBy: "container_21" },
            { idString: "container_20", position: Vec(-13.09, -5.3), replaceableBy: "container_21" },
            { idString: "container_20", position: Vec(135.95, -35.3), orientation: 3, replaceableBy: "container_21" }
        ]
    },
    {
        idString: "cargo_ship_top_floor_shadow",
        name: "Cargo Ship Shadow",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(180, 400, Vec(-1.5, -1.8)),
        ceilingZIndex: ZIndexes.BuildingsCeiling + 0.5,
        ceilingImages: [{
            key: "cargo_ship_top_floor_shadow",
            position: Vec(0, 0),
            scale: Vec(24, 24)
        }]
    },
    {
        // implemented by pap with a lot of love >w<
        idString: "cargo_ship_bottom_floor",
        name: "Cargo Ship (Bottom Floor)",
        defType: DefinitionType.Building,
        material: "metal_heavy",
        particle: "cargo_ship_particle",
        reflectBullets: true,
        hasSecondFloor: true,
        collideWithLayers: Layers.Equal,
        sounds: {
            normal: "ship_ambience",
            position: Vec(-1.5, 115.33),
            maxRange: 300,
            falloff: 0.86
        },
        floorZIndex: ZIndexes.Ground + 0.5,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(13.3, 2.27, Vec(59.22, 34.44)),
            RectangleHitbox.fromRect(12.47, 2.26, Vec(58.86, -15.53)),
            RectangleHitbox.fromRect(4.28, 3.88, Vec(67.04, 34.48)),
            RectangleHitbox.fromRect(1.94, 4.65, Vec(51.73, 34.48)),
            RectangleHitbox.fromRect(1.94, 4.65, Vec(51.73, -15.55)),
            RectangleHitbox.fromRect(4.3, 3.87, Vec(67.06, -15.5)),
            RectangleHitbox.fromRect(3.48, 113.24, Vec(49.41, 86.87)),
            RectangleHitbox.fromRect(77.21, 3.4, Vec(12.56, 144.94)),
            RectangleHitbox.fromRect(16.6, 3.4, Vec(-47.14, 144.92)),
            RectangleHitbox.fromRect(3.49, 184.87, Vec(-53.66, 51.07)),
            RectangleHitbox.fromRect(18.74, 37.62, Vec(-2.2, 113.14)),
            RectangleHitbox.fromRect(2.02, 20.05, Vec(19.91, 103.18)),
            RectangleHitbox.fromRect(2.02, 16.33, Vec(-28.26, 115.36)),
            RectangleHitbox.fromRect(62.25, 2.04, Vec(-10.17, 93.57)),
            RectangleHitbox.fromRect(16.66, 2.06, Vec(39.73, 93.56)),
            RectangleHitbox.fromRect(1.99, 13.47, Vec(-35.84, 101.13)),
            RectangleHitbox.fromRect(16.04, 2.04, Vec(-27.65, 106.85)),
            RectangleHitbox.fromRect(3.42, 124.74, Vec(49.35, -74.38)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec(4.61, 38.28)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec(-21.45, -137.01)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec(-8.86, 21.6)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec(-8.87, 38.32)),
            RectangleHitbox.fromRect(31.91, 2.04, Vec(-36.37, -40.33)),
            RectangleHitbox.fromRect(2.04, 33.83, Vec(-21.44, -57.68)),
            RectangleHitbox.fromRect(3.52, 75.47, Vec(-53.62, -99.34)),
            RectangleHitbox.fromRect(13.57, 2.03, Vec(-47.49, -62.62)),
            RectangleHitbox.fromRect(2.03, 11.06, Vec(-41.65, -57.36)),
            RectangleHitbox.fromRect(20, 2, Vec(-31.15, -112.56)),
            RectangleHitbox.fromRect(2.03, 40.39, Vec(-21.45, -115.8)),
            RectangleHitbox.fromRect(39.1, 2.04, Vec(-1.29, -119.5)),
            RectangleHitbox.fromRect(1.98, 16.11, Vec(17.26, -127.4)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec(4.6, 21.65)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec(17.27, -137.01)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec(-2.07, -136.97)),
            RectangleHitbox.fromRect(11.03, 2.05, Vec(-48.14, -132.81)),
            RectangleHitbox.fromRect(2.08, 22.75, Vec(-43.63, -143.5)),
            RectangleHitbox.fromRect(2.01, 28.85, Vec(23.07, -168.35)),
            RectangleHitbox.fromRect(52.4, 2.02, Vec(-1.93, -182.82)),
            RectangleHitbox.fromRect(16.5, 2, Vec(-36.32, -154.17)),
            RectangleHitbox.fromRect(15.34, 2, Vec(-2.15, -154.38)),
            RectangleHitbox.fromRect(2.01, 15.96, Vec(4.5, -162.59)),
            RectangleHitbox.fromRect(2.01, 15.96, Vec(-8.81, -162.59)),
            RectangleHitbox.fromRect(2.01, 28.85, Vec(-27.17, -167.6)),
            RectangleHitbox.fromRect(16.5, 2, Vec(30.32, -154.2)),
            RectangleHitbox.fromRect(2.08, 22.75, Vec(39.52, -143.82)),
            RectangleHitbox.fromRect(11.03, 2.05, Vec(43.99, -132.79)),
            RectangleHitbox.fromRect(16.86, 2.05, Vec(24.22, -46.97)),
            RectangleHitbox.fromRect(16.86, 2.05, Vec(24.22, -33.71)),
            RectangleHitbox.fromRect(2.04, 15.36, Vec(16.47, -40.33)),

            new CircleHitbox(5, Vec(-50.17, -138.59)),
            new CircleHitbox(7.68, Vec(-3.57, -191.99)),
            new CircleHitbox(4.8, Vec(-46.95, -157.33)),
            new CircleHitbox(4.83, Vec(-48.16, -153.03)),
            new CircleHitbox(4.83, Vec(-45.81, -160.41)),
            new CircleHitbox(4.83, Vec(-43.33, -165.9)),
            new CircleHitbox(8.72, Vec(-36.74, -169.78)),
            new CircleHitbox(4.83, Vec(-33.98, -179.79)),
            new CircleHitbox(4.04, Vec(-31.36, -183.65)),
            new CircleHitbox(4.36, Vec(46.52, -137.83)),
            new CircleHitbox(3.91, Vec(25.04, -185.43)),
            new CircleHitbox(5.95, Vec(16.62, -188.88)),
            new CircleHitbox(5.95, Vec(-18.73, -189.96)),
            new CircleHitbox(5.95, Vec(-10.97, -192.77)),
            new CircleHitbox(5.95, Vec(7.72, -192.56)),
            new CircleHitbox(3.91, Vec(-24.84, -188.84)),
            new CircleHitbox(3.91, Vec(-29.12, -185.58)),
            new CircleHitbox(5.74, Vec(29.32, -178.85)),
            new CircleHitbox(9.67, Vec(33.86, -165.43)),
            new CircleHitbox(4.36, Vec(43.7, -155.59)),
            new CircleHitbox(4.36, Vec(45.17, -149.82)),
            new CircleHitbox(4.36, Vec(46.07, -143.94)),
            new CircleHitbox(4.5, Vec(41.87, -160.06)),
            new CircleHitbox(4.5, Vec(34.49, -174.32)),
            new CircleHitbox(4.5, Vec(2.73, -195.05)),
            new CircleHitbox(4.5, Vec(21.76, -187.46)),
            new CircleHitbox(4.5, Vec(-36.94, -176.71)),
            new CircleHitbox(4.5, Vec(-7.84, -194.9)),
            new CircleHitbox(4.5, Vec(-15.28, -193.02)),
            new CircleHitbox(4.5, Vec(13.28, -192.19)),
            new CircleHitbox(5.25, Vec(-49.42, -143.72)),
            new CircleHitbox(5.25, Vec(-48.74, -148.55))
        ),
        spawnHitbox: RectangleHitbox.fromRect(180, 400, Vec(-1.5, -1.8)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(99.5, 211, Vec(-2, -13)),
            RectangleHitbox.fromRect(80.78, 21.31, Vec(-1.92, -142.33)),
            RectangleHitbox.fromRect(100.28, 13.61, Vec(-1.82, -125.2)),
            RectangleHitbox.fromRect(48.31, 33.89, Vec(-2.07, -164.9)),
            RectangleHitbox.fromRect(7.21, 20.34, Vec(-54, -51.5)),
            RectangleHitbox.fromRect(101.81, 53.3, Vec(-1.96, 119.35)),
            RectangleHitbox.fromRect(97.5, 18.46, Vec(-2.02, 153)),
            RectangleHitbox.fromRect(82.05, 20, Vec(-3, 165))
        ),
        floors: [
            {
                type: FloorNames.Water,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(101.81, 53.3, Vec(-1.96, 119.35)),
                    RectangleHitbox.fromRect(27.77, 14.14, Vec(-38.16, 86.7)),
                    RectangleHitbox.fromRect(40, 4.82, Vec(27.71, 90))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(99.5, 211, Vec(-2, -13)),
                    RectangleHitbox.fromRect(80.78, 21.31, Vec(-1.92, -142.33)),
                    RectangleHitbox.fromRect(100.28, 13.61, Vec(-1.82, -125.2)),
                    RectangleHitbox.fromRect(48.31, 33.89, Vec(-2.07, -164.9)),
                    RectangleHitbox.fromRect(7.21, 20.34, Vec(-54, -51.5)),
                    RectangleHitbox.fromRect(34.19, 60, Vec(63.34, 9.24)),
                    RectangleHitbox.fromRect(45.17, 12.38, Vec(63.86, 19.27)),
                    RectangleHitbox.fromRect(45.17, 12.38, Vec(64.01, -0.29))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(15.2, 11.27, Vec(25.01, -40.18)),
                    RectangleHitbox.fromRect(15.2, 11.27, Vec(-2.15, -162.84)),
                    RectangleHitbox.fromRect(15.2, 11.27, Vec(-27.31, 100.22))
                ),
                layer: Layer.ToUpstairs
            }
        ],
        floorImages: [
            {
                key: "floor_oil_ship",
                position: Vec(-36.67, 157),
                scale: Vec(2.3, 2.3)
            },
            {
                key: "cargo_ship_floor_bottom_1",
                position: Vec(-1.8, 60.25)
            },
            {
                key: "cargo_ship_floor_bottom_2",
                position: Vec(-1.85, -112.05),
                scale: Vec(-1, -1)
            },
            {
                key: "cargo_ship_floor_ramp",
                position: Vec(66.85, 9.5),
                scale: Vec(2, 2)
            },
            {
                key: "regular_crate_residue",
                position: Vec(-37.26, -34.51),
                rotation: Math.PI / 2
            },
            {
                key: "regular_crate_residue",
                position: Vec(-45.34, 15.75),
                rotation: Math.PI / 2
            },
            {
                key: "barrel_residue",
                position: Vec(33.73, -148.61)
            },
            {
                key: "barrel_residue",
                position: Vec(-33.17, 138.92),
                alpha: 0.5
            },
            {
                key: "explosion_decal",
                position: Vec(-19.21, 138.48),
                alpha: 0.5
            },
            {
                key: "explosion_decal",
                position: Vec(-15.16, 140.74),
                alpha: 0.5,
                rotation: Math.PI / 2,
                scale: Vec(0.7, 0.7)
            },
            {
                key: "ship_propeller",
                position: Vec(-2, 153.45),
                scale: Vec(2, 2)
            },
            {
                key: "cargo_ship_wall_residue",
                position: Vec(-30.4, 150.6),
                scale: Vec(2, 2),
                alpha: 0.5
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "forklift", position: Vec(49.66, 19.32), rotation: 3 },
            { idString: "pallet", position: Vec(38.32, 19.18), rotation: 1 },
            { idString: randomSmallStove, position: Vec(38.32, 19.18), rotation: 0 },

            { idString: "cargo_ship_bottom_stair", position: Vec(23, -40.18), rotation: 0, layer: Layer.ToUpstairs },
            { idString: "cargo_ship_bottom_stair", position: Vec(-2.15, -162.5), rotation: 1, layer: Layer.ToUpstairs },
            { idString: "cargo_ship_bottom_stair", position: Vec(-29, 100.22), rotation: 0, layer: Layer.ToUpstairs },

            { idString: "ship_thing_v2", position: Vec(-2.07, 175.32), rotation: 0 },

            { idString: "box", position: Vec(-66, 134.5), waterOverlay: true },
            { idString: "box", position: Vec(-14.88, 178.02), waterOverlay: true },
            { idString: "barrel", position: Vec(-24.67, 180.93), waterOverlay: true },

            { idString: "life_preserver", position: Vec(-44.28, -57.06), rotation: 0 },
            { idString: "trash_bag", position: Vec(43.68, -23.44) },

            { idString: "gun_locker", position: Vec(-29.26, -108.79), rotation: 0 },

            { idString: "gun_case", position: Vec(-46.33, -66.86), rotation: 2 },

            { idString: "cabinet", position: Vec(-17.76, -127.85), rotation: 1 },
            { idString: "cabinet", position: Vec(13.56, -127.85), rotation: 3 },

            { idString: "box", position: Vec(-17.76, -51.58) },
            { idString: "box", position: Vec(-4.34, -132.74) },
            { idString: "box", position: Vec(0.55, -132.81) },
            { idString: "grenade_box", position: Vec(-1.93, -128) },

            { idString: "metal_door", position: Vec(-21.48, -80.0), rotation: 1 },
            { idString: "metal_door", position: Vec(-21.48, -89.95), rotation: 3 },
            { idString: "metal_door", position: Vec(26.45, 93.5), rotation: 0 },
            { idString: "metal_door", position: Vec(-46.35, 93.5), rotation: 0 },
            { idString: "metal_door", position: Vec(-41.58, -46.75), rotation: 1 },
            { idString: "metal_door", position: Vec(-46.16, -112.54), rotation: 0 },

            { idString: "barrel", position: Vec(-6.05, -114.3) },
            { idString: "barrel", position: Vec(-38.55, -149.07) },
            { idString: "barrel", position: Vec(2.65, -149.35) },
            { idString: "barrel", position: Vec(-1.89, -5.69) },
            { idString: "barrel", position: Vec(12.18, 110.37), waterOverlay: true },

            { idString: "propane_tank", position: Vec(-32.55, -151.05) },
            { idString: "propane_tank", position: Vec(2.73, 32.85) },

            { idString: "regular_crate", position: Vec(8.42, -0.22) },
            { idString: "regular_crate", position: Vec(-46.77, -34.5) },
            { idString: "regular_crate", position: Vec(17.1, -176.84) },
            { idString: "regular_crate", position: Vec(23.68, -124.04) },
            { idString: "regular_crate", position: Vec(41.82, 100.39), waterOverlay: true },
            { idString: "regular_crate", position: Vec(13.33, 132.54), waterOverlay: true },
            { idString: "regular_crate", position: Vec(2.39, 137.28), waterOverlay: true },

            { idString: "flint_crate", position: Vec(-14.86, -103.69) },
            { idString: "flint_crate", position: Vec(-1.93, 25.84) },
            { idString: "flint_crate", position: Vec(12.87, 100.28), waterOverlay: true },

            { idString: "tear_gas_crate", position: Vec(-6, -149.92), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec(-33.17, 113.09), rotation: 1, waterOverlay: true },

            { idString: "grenade_crate", position: Vec(-47, -79.33) },

            { idString: "ammo_crate", position: Vec(-1.92, 3.78) },
            { idString: "ammo_crate", position: Vec(-15.2, -58.96) },
            { idString: "ammo_crate", position: Vec(-46.59, -89.67) },
            { idString: "ammo_crate", position: Vec(-15.01, -113.52) },

            { idString: "roadblock", position: Vec(-27.88, -122.26), rotation: 3 },
            { idString: "roadblock", position: Vec(-28.97, -119.19), rotation: 3 },
            { idString: "roadblock", position: Vec(-27.88, -116.21), rotation: 3 },

            { idString: "pallet", position: Vec(-1.89, -5.69), rotation: 0 },
            { idString: "pallet", position: Vec(8.42, -0.22), rotation: 0 },
            { idString: "pallet", position: Vec(23.68, -124.04), rotation: 0 },
            { idString: "pallet", position: Vec(-14.86, -103.69), rotation: 0 },
            { idString: "pallet", position: Vec(-28.3, -119.15), rotation: 1 },
            { idString: "pallet", position: Vec(41.21, 46.52), rotation: 0 },
            { idString: "pallet", position: Vec(-47, -79.33), rotation: 1 },
            { idString: "pallet", position: Vec(-1.84, -130.68), rotation: 0 },

            { idString: "sink", position: Vec(41.21, 46.52), rotation: 2 },

            { idString: "sandbags", position: Vec(40.83, -16.02), rotation: 0 },
            { idString: "sandbags", position: Vec(-36.24, -58.52), rotation: 1 },
            { idString: "sandbags", position: Vec(-13.81, -160.36), rotation: 1 },
            { idString: "sandbags", position: Vec(23.38, -135.79), rotation: 1 },
            { idString: "sandbags", position: Vec(-18.15, 88.38), rotation: 2 },
            { idString: "sandbags", position: Vec(-17.94, 77.59), rotation: 3 },
            { idString: "sandbags", position: Vec(25.65, 112.33), rotation: 1, waterOverlay: true },
            { idString: "sandbags", position: Vec(-15.6, 122.39), rotation: 1, waterOverlay: true },

            { idString: "control_panel2", position: Vec(-45.25, 138.06), rotation: 2, waterOverlay: true },

            { idString: "super_barrel", position: Vec(-3.23, 34.68) },

            { idString: "lamp", position: Vec(-50.67, 15.54), rotation: 3, variation: 0 },
            { idString: "lamp", position: Vec(-2.16, -152.24), rotation: 2, variation: 0 },
            { idString: "lamp", position: Vec(-2.17, 91.52), rotation: 0, variation: 0 },
            { idString: "lamp", position: Vec(46.65, 118.81), rotation: 1, variation: 0 },
            { idString: "lamp", position: Vec(-50.92, 118.9), rotation: 3, variation: 0 },
            { idString: "lamp", position: Vec(-50.67, -83.62), rotation: 3, variation: 0 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "mutated_forklift", position: Vec(-0.47, -76.52), orientation: 3 },
            { idString: randomPortDamagedContainerReversed, position: Vec(-101.24, 0.44), orientation: 2 },

            {
                /* idString: {
                    cargo_ship_bottom_floor_vault: 1
                    // cargo_ship_bottom_floor_vault_special: 0.1
                }, */
                idString: "cargo_ship_bottom_floor_vault",
                position: Vec(-32.38, 89.75),
                orientation: 2
            },
            { idString: "cargo_ship_top_floor_shadow", position: Vec(-1.8, -3.2) },

            // ----------------------------------
            // container distance X = 14.3
            // container distance Y = 28.55
            // ----------------------------------
            { idString: randomPortOpenContainerOneSide, position: Vec(10.75, -75.60) },
            { idString: randomPortOpenContainerTwoSide, position: Vec(-43.49, -5.3) },
            { idString: randomPortDamagedContainerReversed, position: Vec(29.19, 5.3), orientation: 2 },

            { idString: randomPortOpenContainerOneSide, position: Vec(43.49, -36.25), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(29.19, -36.25), orientation: 2 },
            { idString: randomPortDamagedContainer, position: Vec(-29.19, 64.8) },
            { idString: randomPortOpenContainerOneSide, position: Vec(-43.49, 64.8) },

            { idString: randomPortOpenContainerOneSide, position: Vec(39.25, 65.25) },
            { idString: randomPortOpenContainerOneSide, position: Vec(-24.95, -65.25), orientation: 2 }
        ]
    },
    {
        idString: "cargo_ship_top_floor_control_room_ceiling",
        name: "Cargo Ship Control Room Ceiling",
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(50.25, 61, Vec(0, 0.45)),
            RectangleHitbox.fromRect(100, 50, Vec(0, 6))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(50.25, 61, Vec(0, 0.45)),
            RectangleHitbox.fromRect(100, 50, Vec(0, 6))
        ),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [{
            key: "cargo_ship_control_room_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }]
    },
    {
        // implemented by pap with a lot of love >w<
        idString: "cargo_ship_top_floor",
        name: "Cargo Ship (Top Floor)",
        defType: DefinitionType.Building,
        material: "metal_heavy",
        particle: "cargo_ship_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        ceilingHitbox: new GroupHitbox(// -0.55, -6
            RectangleHitbox.fromRect(15.2, 11.27, Vec(25.6, -34.18)),
            RectangleHitbox.fromRect(15.2, 11.27, Vec(-1.6, -156.84)),
            RectangleHitbox.fromRect(15.2, 11.27, Vec(-26.76, 94.22))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(3.63, 64.39, Vec(51.52, 158.63)),
            RectangleHitbox.fromRect(3.62, 159.73, Vec(51.52, 36.39)),
            RectangleHitbox.fromRect(3.58, 130.91, Vec(-51.41, -48.78)),
            RectangleHitbox.fromRect(3.6, 60.78, Vec(51.54, -83.73)),
            RectangleHitbox.fromRect(3.44, 90, Vec(-51.48, 71.54)),
            RectangleHitbox.fromRect(3.47, 64.39, Vec(-51.51, 158.63)),
            RectangleHitbox.fromRect(106.58, 3.43, Vec(0.05, 191.8)),
            new CircleHitbox(3.66, Vec(43.22, -158.53)),
            RectangleHitbox.fromRect(2.01, 31.41, Vec(40.02, -141.29)),
            RectangleHitbox.fromRect(2.01, 31.41, Vec(-39.97, -141.23)),
            RectangleHitbox.fromRect(13.62, 2.06, Vec(45.8, -126.61)),
            RectangleHitbox.fromRect(13.62, 2.06, Vec(-45.77, -126.53)),
            RectangleHitbox.fromRect(33.56, 2, Vec(24.23, -156.82)),
            RectangleHitbox.fromRect(33.56, 2, Vec(-24.22, -156.82)),
            new CircleHitbox(6.26, Vec(46.86, -132.54)),
            new CircleHitbox(6.26, Vec(46.3, -138.28)),
            new CircleHitbox(5.92, Vec(45.74, -143.62)),
            new CircleHitbox(5.1, Vec(44.84, -150.22)),
            new CircleHitbox(3.66, Vec(-43.57, -157.45)),
            new CircleHitbox(3.66, Vec(-41.76, -161.28)),
            new CircleHitbox(3.66, Vec(-40.03, -164.45)),
            new CircleHitbox(3.66, Vec(-37.85, -167.85)),
            new CircleHitbox(3.66, Vec(-34.68, -172.14)),
            new CircleHitbox(3.66, Vec(-31.15, -176.06)),
            new CircleHitbox(3.66, Vec(-28.26, -178.79)),
            new CircleHitbox(3.66, Vec(-25.15, -181.26)),
            new CircleHitbox(3.66, Vec(-21.33, -183.85)),
            new CircleHitbox(3.66, Vec(-17.06, -186.09)),
            new CircleHitbox(3.66, Vec(-12.15, -188.01)),
            new CircleHitbox(3.66, Vec(-6.68, -189.32)),
            new CircleHitbox(3.66, Vec(-1.87, -189.84)),
            new CircleHitbox(3.66, Vec(3.11, -189.76)),
            new CircleHitbox(3.66, Vec(8.93, -188.88)),
            new CircleHitbox(3.66, Vec(14.25, -187.29)),
            new CircleHitbox(3.66, Vec(19.46, -184.98)),
            new CircleHitbox(3.66, Vec(23.87, -182.29)),
            new CircleHitbox(3.66, Vec(27.63, -179.43)),
            new CircleHitbox(3.66, Vec(31.72, -175.58)),
            new CircleHitbox(6.26, Vec(-46.93, -132.22)),
            new CircleHitbox(6.26, Vec(-46.26, -138.17)),
            new CircleHitbox(5.92, Vec(-45.49, -144.48)),
            new CircleHitbox(5.1, Vec(-44.29, -151.62)),
            new CircleHitbox(3.66, Vec(34.65, -172.22)),
            new CircleHitbox(3.66, Vec(37.94, -167.93)),
            new CircleHitbox(3.66, Vec(40.76, -163.23)),
            new CircleHitbox(2.92, Vec(-49.9, -135.83)),
            new CircleHitbox(2.57, Vec(46.43, -153.46)),
            new CircleHitbox(1.98, Vec(-51.24, -128.92)),
            new CircleHitbox(2.35, Vec(-9.68, -190.05)),
            new CircleHitbox(2.57, Vec(45.6, -155.59)),
            new CircleHitbox(1.98, Vec(48.78, -147.72)),
            new CircleHitbox(1.98, Vec(50.14, -141.65)),
            new CircleHitbox(1.98, Vec(50.98, -135.57)),
            new CircleHitbox(2.35, Vec(50.98, -128.59)),
            new CircleHitbox(2.35, Vec(11.94, -189.48)),
            new CircleHitbox(2.35, Vec(-4.25, -190.96)),
            new CircleHitbox(2.35, Vec(0.73, -191.18)),
            new CircleHitbox(2.35, Vec(-30.66, -178.39)),
            new CircleHitbox(2.35, Vec(6.32, -190.74)),
            new CircleHitbox(2.35, Vec(-33.99, -175.03)),
            new CircleHitbox(2.35, Vec(-37.51, -170.66)),
            new CircleHitbox(2.35, Vec(-40.1, -166.86)),
            new CircleHitbox(2.35, Vec(-48.06, -148.76)),
            new CircleHitbox(2.35, Vec(-49.71, -141.75)),
            new CircleHitbox(2.35, Vec(-14.84, -188.45)),
            new CircleHitbox(2.35, Vec(-19.8, -186.19)),
            new CircleHitbox(2.35, Vec(-24.01, -183.69)),
            new CircleHitbox(2.35, Vec(43.36, -161.3)),
            new CircleHitbox(2.35, Vec(-27.4, -181.19)),
            new CircleHitbox(2.35, Vec(-45.85, -155.4)),
            new CircleHitbox(2.35, Vec(37.53, -170.68)),
            new CircleHitbox(2.35, Vec(34.51, -174.5)),
            new CircleHitbox(2.35, Vec(17.39, -187.41)),
            new CircleHitbox(2.35, Vec(22.4, -184.84)),
            new CircleHitbox(2.35, Vec(26.69, -181.9)),
            new CircleHitbox(2.35, Vec(30.6, -178.6)),
            new CircleHitbox(2.35, Vec(40.64, -166.19)),
            RectangleHitbox.fromRect(16.19, 2.02, Vec(44.5, 140.6)),
            RectangleHitbox.fromRect(3.55, 7.18, Vec(51.52, -127.73)),
            RectangleHitbox.fromRect(3.63, 7.18, Vec(-51.41, -127.7)),
            RectangleHitbox.fromRect(1.97, 26.52, Vec(24.88, 141.48)),
            RectangleHitbox.fromRect(8.62, 2.05, Vec(-19.95, 166.06)),
            RectangleHitbox.fromRect(2.02, 14.16, Vec(-13.82, 185.86)),
            RectangleHitbox.fromRect(16.19, 2.02, Vec(-43.81, 140.77)),
            RectangleHitbox.fromRect(19.08, 2.05, Vec(16.33, 166.22)),
            RectangleHitbox.fromRect(33.32, 1.97, Vec(-8.46, 178.53)),
            RectangleHitbox.fromRect(2.05, 38.86, Vec(-24.2, 147.9)),
            RectangleHitbox.fromRect(2.02, 14.16, Vec(7.18, 172.27))
        ),
        spawnHitbox: RectangleHitbox.fromRect(180, 400, Vec(-1.5, -1.8)),
        floorImages: [
            {
                key: "cargo_ship_floor_top_2",
                position: Vec(0.07, -94.7),
                scale: Vec(-1, -1)
            },
            {
                key: "cargo_ship_floor_top_1",
                position: Vec(0.115, 94.7)
            },
            { key: "cargo_ship_stair_holder", position: Vec(53.19, -124.55) },
            { key: "cargo_ship_stair_holder", position: Vec(53.18, -113.69) },
            { key: "cargo_ship_stair_holder", position: Vec(53.19, -53.86) },
            { key: "cargo_ship_stair_holder", position: Vec(53.19, -43) },
            { key: "cargo_ship_stair_holder", position: Vec(53.19, 115.98) },
            { key: "cargo_ship_stair_holder", position: Vec(53.19, 126.93) },
            { key: "cargo_ship_stair_holder", position: Vec(-53.15, 116.22) },
            { key: "cargo_ship_stair_holder", position: Vec(-53.15, 127.14) },
            { key: "cargo_ship_stair_holder", position: Vec(-53.15, 16.39) },
            { key: "cargo_ship_stair_holder", position: Vec(-53.15, 27.26) },
            { key: "cargo_ship_stair_holder", position: Vec(-53.15, -124.5) },
            { key: "cargo_ship_stair_holder", position: Vec(-53.06, -113.56) }
        ],
        floors: [
            { // Stairs
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(26.94, 10.06, Vec(63.39, -119.14)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec(-63.34, 21.67)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec(-63.47, 121.57)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec(63.39, -119.14)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec(-63.32, -119.09)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec(63.37, -48.46)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec(63.44, 121.47))
                ),
                layer: Layer.ToUpstairs
            },
            // Ship Floor
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(103.06, 256.5, Vec(0, 0)),
                    RectangleHitbox.fromRect(78.64, 35.52, Vec(-0.02, -138.36)),
                    RectangleHitbox.fromRect(12.2, 11.8, Vec(-20.12, 184.79)),
                    RectangleHitbox.fromRect(25.48, 63.96, Vec(-37.62, 158.65)),
                    RectangleHitbox.fromRect(25.48, 63.96, Vec(37.84, 159.69)),
                    RectangleHitbox.fromRect(25.48, 24.04, Vec(20.44, 178.83))
                )
            },
            // Bathroom
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(20.19, 11.33, Vec(-3.55, 184.83))
            },
            // Control Room
            {
                type: FloorNames.Carpet,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(32.38, 13.54, Vec(-8.51, 171.31)),
                    RectangleHitbox.fromRect(47.91, 36.11, Vec(0.54, 148.19))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "cargo_ship_top_stair", position: Vec(64, -119.14), rotation: 0, layer: Layer.ToBasement },
            { idString: "cargo_ship_top_stair", position: Vec(-64, 21.67), rotation: 2, layer: Layer.ToBasement },
            { idString: "cargo_ship_top_stair", position: Vec(-64, 121.57), rotation: 2, layer: Layer.ToBasement },
            { idString: "cargo_ship_top_stair", position: Vec(64, -119.14), rotation: 0, layer: Layer.ToBasement },
            { idString: "cargo_ship_top_stair", position: Vec(64, -48.46), rotation: 0, layer: Layer.ToBasement },
            { idString: "cargo_ship_top_stair", position: Vec(64, 121.47), rotation: 0, layer: Layer.ToBasement },
            { idString: "cargo_ship_top_stair", position: Vec(-64, -119.09), rotation: 2, layer: Layer.ToBasement },

            { idString: "cargo_ship_stair_support", position: Vec(26.36, -27.63), rotation: 0 },
            { idString: "cargo_ship_stair_support", position: Vec(26.28, -40.59), rotation: 0 },
            { idString: "cargo_ship_stair_support", position: Vec(-6.42, -156.84), rotation: 1 },
            { idString: "cargo_ship_stair_support", position: Vec(6.42, -156.84), rotation: 1 },
            { idString: "cargo_ship_stair_support", position: Vec(-26.09, 100.04), rotation: 2 },
            { idString: "cargo_ship_stair_support", position: Vec(-26.08, 113.1), rotation: 2 },

            { idString: "cargo_ship_stair", position: Vec(63.71, -48.43), rotation: 0, layer: Layer.ToBasement },
            { idString: "cargo_ship_stair", position: Vec(63.71, 121.45), rotation: 0, layer: Layer.ToBasement },
            { idString: "cargo_ship_stair", position: Vec(63.71, -119.14), rotation: 0, layer: Layer.ToBasement },
            { idString: "cargo_ship_stair", position: Vec(-63.71, -119.07), rotation: 2, layer: Layer.ToBasement },
            { idString: "cargo_ship_stair", position: Vec(-63.71, 21.75), rotation: 2, layer: Layer.ToBasement },
            { idString: "cargo_ship_stair", position: Vec(-63.71, 121.65), rotation: 2, layer: Layer.ToBasement },

            { idString: "cargo_ship_stair_entrance_walls", position: Vec(0.11, -156.81), rotation: 0 },
            { idString: "cargo_ship_stair_entrance_walls", position: Vec(26.3, -34.17), rotation: 3 },
            { idString: "cargo_ship_stair_entrance_walls", position: Vec(-26.12, 106.47), rotation: 3 },

            { idString: "life_preserver", position: Vec(-48.2, 5.29), rotation: 2 },
            { idString: "life_preserver", position: Vec(-48.27, -4.55), rotation: 2 },
            { idString: "life_preserver", position: Vec(-48.19, 95.05), rotation: 2 },
            { idString: "life_preserver", position: Vec(-48.26, 104.75), rotation: 2 },

            { idString: "box", position: Vec(-22.41, 187.01) },
            { idString: "box", position: Vec(-17.74, 187.37) },
            { idString: "box", position: Vec(-19.93, 182.27) },
            { idString: { box: 1, grenade_box: 0.5 }, position: Vec(-46.89, 136.68) },

            { idString: "sandbags", position: Vec(-0.01, 32), rotation: 0 },
            { idString: "sandbags", position: Vec(-12.23, 80.89), rotation: 0 },
            { idString: "sandbags", position: Vec(-5.56, 123.33), rotation: 0 },
            { idString: "sandbags", position: Vec(41.92, -30.07), rotation: 0 },
            { idString: "sandbags", position: Vec(0.52, -56.33), rotation: 1 },
            { idString: "sandbags", position: Vec(-4.43, -118.85), rotation: 1 },
            { idString: "sandbags", position: Vec(1.12, -129.68), rotation: 2 },

            { idString: "ammo_crate", position: Vec(-0.43, 85.3) },
            { idString: "ammo_crate", position: Vec(-30.36, 161.85) },
            { idString: "ammo_crate", position: Vec(0.74, 163.46) },
            { idString: "ammo_crate", position: Vec(-13.62, 39.75) },
            { idString: "ammo_crate", position: Vec(0.51, -44.45) },

            { idString: "flint_crate", position: Vec(25.16, 10.5) },
            { idString: "flint_crate", position: Vec(-44.69, 185.13) },
            { idString: "flint_crate", position: Vec(-18.23, -150.04) },

            { idString: "grenade_crate", position: Vec(-11.24, 31.1) },
            { idString: "grenade_crate", position: Vec(0.73, 173) },

            { idString: "regular_crate", position: Vec(28.58, 0.43) },
            { idString: "regular_crate", position: Vec(-0.28, 75.5) },
            { idString: "regular_crate", position: Vec(44.18, 134.72) },
            { idString: "regular_crate", position: Vec(-44.62, 146.85) },
            { idString: "regular_crate", position: Vec(-41.59, 103.48) },
            { idString: "regular_crate", position: Vec(-0.23, -67.92) },
            { idString: "regular_crate", position: Vec(-8.67, -54.5) },

            { idString: "barrel", position: Vec(3.63, -121.38) },
            { idString: "barrel", position: Vec(38.97, -37.99) },
            { idString: "barrel", position: Vec(-45.69, 176.14) },
            { idString: "barrel", position: Vec(-18.35, -140.62) },

            { idString: "pallet", position: Vec(44.18, 134.72), rotation: 0 },
            { idString: "pallet", position: Vec(-18.23, -150.04), rotation: 0 },
            { idString: "pallet", position: Vec(-18.22, -140.66), rotation: 0 },
            { idString: "pallet", position: Vec(-44.13, 134.75), rotation: 0 },
            { idString: "pallet", position: Vec(-20.34, 184.3), rotation: 0 },
            { idString: "pallet", position: Vec(0.73, 173), rotation: 0 },

            { idString: "window2", position: Vec(19.2, 128.42), rotation: 1 },
            { idString: "window2", position: Vec(9.73, 128.42), rotation: 1 },
            { idString: "window2", position: Vec(0.39, 128.42), rotation: 1 },
            { idString: "window2", position: Vec(-9.09, 128.42), rotation: 1 },
            { idString: "window2", position: Vec(-18.5, 128.42), rotation: 1 },

            { idString: "grey_office_chair", position: Vec(11.71, 143.32), rotation: 2 },
            { idString: "grey_office_chair", position: Vec(-10.02, 143.53), rotation: 2 },

            { idString: "propane_tank", position: Vec(-42.07, 137.08) },
            { idString: "propane_tank", position: Vec(-46.52, 132.05) },

            { idString: "metal_door", position: Vec(-30.73, 140.77), rotation: 2 },
            { idString: "metal_door", position: Vec(31.41, 140.77), rotation: 0 },
            { idString: "metal_door", position: Vec(-24.22, 172.12), rotation: 1 },
            { idString: "metal_door", position: Vec(24.97, 159.73), rotation: 1 },
            { idString: "metal_door", position: Vec(6.68, 184.65), rotation: 1 },

            // random lonely obstacles
            { idString: "super_barrel", position: Vec(30, -8.63) },
            { idString: randomToilet, position: Vec(-8.26, 184.78), rotation: 1 },
            { idString: "bunk_bed", position: Vec(17.13, 172.71), rotation: 1 },
            { idString: "tv", position: Vec(41.25, 189.44), rotation: 3 },
            { idString: "small_table", position: Vec(41.33, 185.74), rotation: 1 },
            { idString: "office_chair", position: Vec(41.54, 181.14), rotation: 0 },
            { idString: "fire_hatchet_case", position: Vec(-19.79, 158.1), rotation: 1 },
            { idString: "control_panel2", position: Vec(-16.83, 134.38), rotation: 0 },
            { idString: "control_panel_small", position: Vec(19.42, 134.3), rotation: 0 },
            { idString: "tugboat_control_panel", position: Vec(2.38, 134.74), rotation: 2 },
            { idString: "trash_can", position: Vec(-19.53, 141.89) },
            { idString: "cabinet", position: Vec(21.2, 145.84), rotation: 3 },
            { idString: "fridge", position: Vec(46.06, 168.98), rotation: 3 },
            { idString: randomSmallStove, position: Vec(46.07, 160.68), rotation: 3 },
            { idString: "kitchen_unit_1", position: Vec(40.08, 145.58), rotation: 0 },
            { idString: "kitchen_unit_2", position: Vec(46.37, 145.11), rotation: 3 },
            { idString: "kitchen_unit_3", position: Vec(45.91, 152.89), rotation: 3 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "cargo_ship_top_floor_control_room_ceiling", position: Vec(0, 159.5) },

            // ----------------------------------
            // container distance X = 14.3
            // container distance Y = 28.55
            // ----------------------------------

            { idString: randomPortOpenContainerOneSide, position: Vec(-30.75, -140.5) },
            { idString: randomPortOpenContainerOneSide, position: Vec(30.75, -140.5) },
            { idString: randomPortDamagedContainerReversed, position: Vec(16.3, -140.5) },

            { idString: randomPortOpenContainerOneSide, position: Vec(41.5, 97.75), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(27.2, 97.75), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(-41.5, -69.2) },

            { idString: randomPortOpenContainerOneSide, position: Vec(-41.5, 97.75), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(41.5, -69.2) },
            { idString: randomPortDamagedContainerReversed, position: Vec(27.2, -69.2) },
            { idString: randomPortDamagedContainerReversed, position: Vec(-12.9, 69.2), orientation: 2 },

            { idString: randomPortOpenContainerOneSide, position: Vec(-12.7, 1) },
            { idString: randomPortOpenContainerOneSide, position: Vec(12.7, 27.55), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(27, 27.55), orientation: 2 },
            { idString: randomPortOpenContainerTwoSide, position: Vec(-41.3, -27.55) },

            { idString: randomPortOpenContainerOneSide, position: Vec(-41.37, -1.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(41.37, 30.05) },
            { idString: randomPortOpenContainerOneSide, position: Vec(27.07, 30.05) },

            { idString: randomPortOpenContainerOneSide, position: Vec(27.07, -42.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(41.37, -42.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(-41.37, 71.05) },
            { idString: randomPortDamagedContainer, position: Vec(-27.07, 71.05) },

            { idString: randomPortOpenContainerTwoSide, position: Vec(27.17, 71.8) },
            { idString: randomPortOpenContainerOneSide, position: Vec(-41.47, -71.8), orientation: 2 },
            { idString: randomPortDamagedContainer, position: Vec(-27.17, -100.35), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec(41.47, 100.35) }
        ],
        lootSpawners: IS_CLIENT ? undefined : [{
            table: "ship_skins",
            position: Vec(0.79, 151.41)
        }]
    },
    {
        idString: "armory_barracks",
        name: "Armory Barracks",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            new RectangleHitbox(Vec(23.44, -41), Vec(25.54, -15.1)),
            new RectangleHitbox(Vec(23.44, -4), Vec(25.54, 23.13)),
            new RectangleHitbox(Vec(23.44, 34.23), Vec(25.54, 41)),
            new RectangleHitbox(Vec(-25.51, -42.34), Vec(-1.91, -40.25)),
            new RectangleHitbox(Vec(7, 16.1), Vec(24, 18.2)),
            new RectangleHitbox(Vec(8.18, -42.34), Vec(25.54, -40.25)),
            new RectangleHitbox(Vec(-25.51, -41), Vec(-23.42, 17.54)),
            new RectangleHitbox(Vec(-25.51, 28.57), Vec(-23.42, 42.35)),
            new RectangleHitbox(Vec(-24, 40.25), Vec(-4.33, 42.35)),
            new RectangleHitbox(Vec(5.76, 40.25), Vec(25.54, 42.35)),
            new RectangleHitbox(Vec(4.05, 15.59), Vec(7.06, 18.77)),
            new RectangleHitbox(Vec(-4.12, -21.39), Vec(-1.11, -18.21)),
            new RectangleHitbox(Vec(-24, -20.85), Vec(-4, -18.76))
        ),
        spawnHitbox: RectangleHitbox.fromRect(50, 84),
        ceilingHitbox: RectangleHitbox.fromRect(50, 84),
        floorImages: [
            {
                key: "armory_barracks_floor_1",
                position: Vec(0, -23.2)
            },
            {
                key: "armory_barracks_floor_2",
                position: Vec(0, 23.2)
            }
        ],
        ceilingImages: [
            {
                key: "armory_barracks_ceiling_1",
                position: Vec(0, -21),
                scale: Vec(2, 2)
            },
            {
                key: "armory_barracks_ceiling_2",
                position: Vec(0, 20.6),
                scale: Vec(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(50, 84)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "door", position: Vec(2.7, -41.3), rotation: 2 },
            { idString: "fridge", position: Vec(-19.8, -35.5), rotation: 1 },
            { idString: randomStove, position: Vec(-19.8, -26.1), rotation: 1 },
            { idString: "bunk_bed", position: Vec(18, -31.25), rotation: 0 },
            { idString: "small_drawer", position: Vec(18.4, -18.7), rotation: 0 },
            { idString: "small_drawer", position: Vec(-2, -13.6), rotation: 1 },
            { idString: "bunk_bed", position: Vec(-14.43, -13.21), rotation: 1 },
            { idString: "bunk_bed", position: Vec(-18.1, 7.6), rotation: 2 },
            { idString: "bunk_bed", position: Vec(17.95, 7), rotation: 0 },
            { idString: "bunk_bed", position: Vec(-14.48, 34.83), rotation: 3 },
            { idString: "cabinet", position: Vec(16, 37.6), rotation: 2 },
            { idString: "cabinet", position: Vec(16, 20.9), rotation: 0 },
            { idString: "door", position: Vec(1.15, 41.3), rotation: 0 },
            { idString: "window", position: Vec(24.5, -9.5), rotation: 0 },
            { idString: "window", position: Vec(24.5, 28.75), rotation: 0 },
            { idString: "window", position: Vec(-24.5, 23), rotation: 0 }
        ]
    },
    {
        idString: "armory_center",
        name: "Armory Center",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.09, 42, Vec(16.38, 0)),
            RectangleHitbox.fromRect(32.34, 2.08, Vec(1.24, -21.87)),
            RectangleHitbox.fromRect(2.09, 3.97, Vec(-13.88, -19.01)),
            RectangleHitbox.fromRect(2.09, 8.27, Vec(-13.88, 16.87)),
            RectangleHitbox.fromRect(2.09, 8.58, Vec(-13.88, -2.64)),
            RectangleHitbox.fromRect(32.34, 2.07, Vec(1.24, 21.88))
        ),
        spawnHitbox: RectangleHitbox.fromRect(31, 44, Vec(1.5, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(31, 44, Vec(1.5, 0)),
        floorImages: [
            {
                key: "armory_center_floor_1",
                position: Vec(0, -11.5)
            },
            {
                key: "armory_center_floor_2",
                position: Vec(0, 11.5)
            }
        ],
        ceilingImages: [
            {
                key: "armory_center_ceiling_1",
                position: Vec(1.25, -11),
                scale: Vec(2, 2)
            },
            {
                key: "armory_center_ceiling_2",
                position: Vec(1.25, 11.4),
                scale: Vec(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(31, 44, Vec(1.5, 0))
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "door", position: Vec(-13.9, -12.43), rotation: 1 },
            { idString: "cabinet", position: Vec(12.45, -11.6), rotation: 3 },
            { idString: "small_table", position: Vec(8.85, 1.6), rotation: 1, variation: 0 },
            { idString: "chair", position: Vec(3, 1.7), rotation: 3 },
            { idString: "chair", position: Vec(10.1, 6), rotation: 0 },
            { idString: "small_drawer", position: Vec(-9.2, 16.8), rotation: 2 },
            { idString: "gun_mount_maul", position: Vec(2, 19.05), rotation: 2 },
            { idString: "window", position: Vec(-13.9, 7.1), rotation: 0 },
            { idString: "trash_can", position: Vec(12, 17.5) }
        ]
    },
    {
        idString: "armory_vault",
        name: "Armory Vault",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.09, 36, Vec(36.03, -2)),
            RectangleHitbox.fromRect(2.09, 11.67, Vec(-13.96, -15.1)),
            RectangleHitbox.fromRect(13.4, 2.09, Vec(30.37, 16.52)),
            RectangleHitbox.fromRect(74.12, 2.09, Vec(0.01, -20.98)),
            RectangleHitbox.fromRect(2.09, 11.07, Vec(-13.96, 10.47)),
            RectangleHitbox.fromRect(29, 2.09, Vec(21.9, -6.66)),
            RectangleHitbox.fromRect(2.07, 37, Vec(-36.01, -2.5)),
            RectangleHitbox.fromRect(35.39, 2.09, Vec(-19.35, 16.52)),
            RectangleHitbox.fromRect(4.16, 2.09, Vec(10.5, 16.52))
        ),
        spawnHitbox: RectangleHitbox.fromRect(72, 38, Vec(0, -2)),
        ceilingHitbox: RectangleHitbox.fromRect(72, 38, Vec(0, -2)),
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
                position: Vec(-16.6, 0)
            },
            {
                key: "armory_vault_floor_2",
                position: Vec(20.2, 0)
            }
        ],
        ceilingImages: [{
            key: "armory_vault_ceiling",
            position: Vec(0, -2.5),
            scale: Vec(2, 2)
        }],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(72, 38, Vec(0, -2))
        }],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: "armory_inner_vault",
            position: Vec(-25, -2.25)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "door", position: Vec(3.8, 16.5), rotation: 0 },
            { idString: "window", position: Vec(18.1, 16.5), rotation: 1 },
            { idString: "gun_case", position: Vec(31.9, 10), rotation: 3 },
            { idString: "gun_case", position: Vec(-7.5, 12.4), rotation: 2 },
            { idString: "ammo_crate", position: Vec(29.5, -0.45), rotation: 0 },
            { idString: "ammo_crate", position: Vec(12.85, -0.45), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec(21.2, -0.45), rotation: 1 },
            { idString: "grenade_crate", position: Vec(-9.1, -15.9) },
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "button",
                    position: Vec(10 + 4.75 * i, -19.2),
                    rotation: 0,
                    variation: 0,
                    puzzlePiece: ["y", "o", "j", "l"][i]
                } satisfies BuildingObstacle)
            ),
            { idString: "control_panel2", position: Vec(30.7, -14), rotation: 3 },
            { idString: "ammo_crate", position: Vec(-20, -14.8), rotation: 0 },
            { idString: "regular_crate", position: Vec(-29.8, -14.8), rotation: 0 },
            { idString: "barrel", position: Vec(-30.9, 11.3) },
            { idString: "briefcase", position: Vec(-20.7, 10.85), rotation: 2 },
            { idString: "vault_door", position: Vec(-14.1, -3.22), rotation: 3 }
        ],
        lootSpawners: IS_CLIENT ? undefined : [{
            position: Vec(-25.5, -1),
            table: "armory_skin"
        }]
    },
    {
        idString: "armory_inner_vault",
        name: "Armory Inner Vault",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(20.87, 36.34),
        ceilingHitbox: RectangleHitbox.fromRect(20.87, 36.34),
        ceilingImages: [
            {
                key: "armory_inner_vault_ceiling_1",
                position: Vec(0, -9)
            },
            {
                key: "armory_inner_vault_ceiling_2",
                position: Vec(0, 9.1)
            }
        ]
    },
    {
        idString: "armory",
        name: "Armory",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(160, 176),
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "armory_barracks", position: Vec(-41.31, 27.86) },
            { idString: "armory_center", position: Vec(55.4, 15.07) },
            { idString: "armory_vault", position: Vec(-35.03, -58.37) },
            { idString: "shed_1", position: Vec(-60.9, -65.63), orientation: 2 },
            { idString: "porta_potty", position: Vec(31.87, -60.35), orientation: 1 }
        ],
        groundGraphics: [
            {
                color: "#6664",
                hitbox: RectangleHitbox.fromRect(153.09, 1.87, Vec(0, -83.96))
            },
            {
                color: "#6664",
                hitbox: RectangleHitbox.fromRect(153.09, 1.87, Vec(0, 83.96))
            },
            {
                color: "#6664",
                hitbox: RectangleHitbox.fromRect(1.93, 168, Vec(-75.57, 0))
            },
            {
                color: "#6664",
                hitbox: RectangleHitbox.fromRect(1.93, 168, Vec(75.57, 0))
            },
            {
                color: 0x404040,
                hitbox: new PolygonHitbox([
                    Vec(5.54, -80.63),
                    Vec(62.37, -80.63),
                    Vec(62.37, -24.57),
                    Vec(48.11, -15.97),
                    Vec(34.01, -15.97),
                    Vec(34.01, 84.86),
                    Vec(-8.82, 84.86),
                    Vec(-8.82, -32.87),
                    Vec(5.54, -41.2)
                ])
            },
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(-1.5, -3.4 + 25.2 * i))
                })
            ),
            ...Array.from(
                { length: 6 },
                (_, i) => ({
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(12.7, -53.8 + 25.2 * i))
                })
            ),
            ...Array.from(
                { length: 6 },
                (_, i) => ({
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(26.95, -53.8 + 25.2 * i))
                })
            ),
            ...Array.from(
                { length: 2 },
                (_, i) => ({
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(41.1, -53.8 + 25.2 * i))
                })
            ),
            {
                color: 0x555555,
                hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(55.3, -53.8))
            },
            {
                color: 0x555555,
                hitbox: RectangleHitbox.fromRect(27.27, 13.11, Vec(19.83, -73.38))
            },
            {
                color: 0x555555,
                hitbox: RectangleHitbox.fromRect(27.27, 13.11, Vec(48.2, -73.38))
            },
            {
                color: 0x555555,
                hitbox: new PolygonHitbox([
                    Vec(5.05, -40.17),
                    Vec(5.05, -16.47),
                    Vec(-8.06, -16.47),
                    Vec(-8.06, -32.29)
                ])
            },
            {
                color: 0x555555,
                hitbox: new PolygonHitbox([
                    Vec(61.82, -40.67),
                    Vec(61.75, -24.97),
                    Vec(48.71, -16.97),
                    Vec(48.71, -40.73)
                ])
            }
        ],
        floors: [{
            type: FloorNames.Stone,
            hitbox: new PolygonHitbox([
                Vec(5.54, -80.63),
                Vec(62.37, -80.63),
                Vec(62.37, -24.57),
                Vec(48.11, -15.97),
                Vec(34.01, -15.97),
                Vec(34.01, 84.86),
                Vec(-8.82, 84.86),
                Vec(-8.82, -32.87),
                Vec(5.54, -41.2)
            ])
        }],
        obstacles: IS_CLIENT ? undefined : [
            // -----------------------------------------------------
            // TEMP: Remove if halloween ends.
            // -----------------------------------------------------
            { idString: "small_lamp_thingy", position: Vec(-41.19, 33.19) },
            { idString: "small_lamp_thingy", position: Vec(56.28, 2.85) },
            { idString: "small_lamp_thingy", position: Vec(-64.12, -59.61) },
            { idString: "cobweb", position: Vec(65.91, -1.02), rotation: 3 },
            { idString: "cobweb", position: Vec(-4.87, -47.66), rotation: 2 },
            { idString: "cobweb", position: Vec(-65.14, -73.48), rotation: 0 },
            { idString: "cobweb", position: Vec(-60.06, -7.76), rotation: 0 },
            { idString: "cobweb", position: Vec(-22.66, 39.43), rotation: 2 },
            // -----------------------------------------------------

            { idString: "regular_crate", position: Vec(63.13, -15.17), outdoors: true },
            { idString: "regular_crate", position: Vec(-7.99, 2.28), outdoors: true },
            { idString: "regular_crate", position: Vec(7.06, 30.07), outdoors: true },
            { idString: "regular_crate", position: Vec(18.06, 27.86), outdoors: true },
            { idString: "regular_crate", position: Vec(-64.29, 76.5), outdoors: true },
            { idString: "regular_crate", position: Vec(65.01, -56.73), outdoors: true },
            { idString: "regular_crate", position: Vec(8.45, -66.79), outdoors: true },
            { idString: "flint_crate", position: Vec(33.86, -46.16), outdoors: true },
            { idString: "barrel", position: Vec(-10.72, -7.93), outdoors: true },
            { idString: "barrel", position: Vec(9.13, 40.34), outdoors: true },
            { idString: "barrel", position: Vec(69.75, 42.55), outdoors: true },
            { idString: "barrel", position: Vec(24.36, -46.95), outdoors: true },
            { idString: "barrel", position: Vec(70.01, -72.17), outdoors: true },
            { idString: "super_barrel", position: Vec(34.44, -55.28), rotation: 0, outdoors: true },
            { idString: "super_barrel", position: Vec(44.51, 78.15), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(15.15, 17.92), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(-10, 78.77), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(44.5, 65), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec(31.6, -36.18), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(30.66, -70.69), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(18.54, -67.73), rotation: 1, outdoors: true },
            { idString: "m1117", position: Vec(48.93, -53.75), rotation: 0, variation: 0 },
            { idString: "gun_case", position: Vec(30.66, -28.84), rotation: 0, outdoors: true },
            { idString: "gun_case", position: Vec(63.16, -36.39), rotation: 1, outdoors: true },
            { idString: "gun_case", position: Vec(19.48, 36.69), rotation: 0, outdoors: true },
            { idString: "tear_gas_crate", position: Vec(16.55, 9.68), rotation: 0, outdoors: true },
            { idString: "tear_gas_crate", position: Vec(33.06, -62.76), rotation: 0, outdoors: true },
            { idString: "grenade_crate", position: Vec(-55.29, 78.02), outdoors: true },
            { idString: "grenade_crate", position: Vec(69.81, -34.24), outdoors: true },
            { idString: "ammo_crate", position: Vec(50.07, -20.07), rotation: 0, outdoors: true },
            { idString: "barrier", position: Vec(13.91, 70.32), rotation: 1 },

            { idString: "fence", position: Vec(70.5, -83.93), rotation: 0 },

            // top top left
            ...Array.from(
                { length: 10 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-72.1 + 8.45 * i, -83.93),
                    rotation: 0
                })
            ),
            // top middle
            ...Array.from(
                { length: 3 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(23 + 8.45 * i, -83.93),
                    rotation: 0
                })
            ),
            // top right
            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(75.55, -80.45 + 8.45 * i),
                    rotation: 1
                })
            ),
            // right bottom right
            ...Array.from(
                { length: 10 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(75.55, 4.4 + 8.45 * i),
                    rotation: 1
                })
            ),
            // bottom bottom right
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(45.1 + 8.45 * i, 83.93),
                    rotation: 0
                })
            ),
            // bottom bottom left
            ...Array.from(
                { length: 6 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-58 + 8.45 * i, 83.93),
                    rotation: 0
                })
            ),
            // left bottom left
            ...Array.from(
                { length: 9 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-75.55, 7 + 8.45 * i),
                    rotation: 1
                })
            ),
            // left top left
            ...Array.from(
                { length: 9 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-75.55, -78.85 + 8.45 * i),
                    rotation: 1
                })
            )
        ]
    },
    {
        idString: "mobile_home",
        name: "Mobile Home",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(65, 40),
        ceilingHitbox: RectangleHitbox.fromRect(43.5, 20, Vec(0, -1)),
        floorImages: [
            {
                key: "mobile_home_floor_1",
                position: Vec(-11, 0),
                scale: Vec(1.07, 1.07)
            },
            {
                key: "mobile_home_floor_2",
                position: Vec(11, 0.01),
                scale: Vec(1.07, 1.07)
            }
        ],
        ceilingImages: [{
            key: "mobile_home_ceiling",
            position: Vec(0, -1),
            residue: "mobile_home_residue",
            scale: Vec(1.07, 1.07)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(43.5, 20, Vec(0, -1))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(9.8, 4, Vec(5, 11))
            }
        ],
        wallsToDestroy: 2,
        obstacles: IS_CLIENT ? undefined : [
            { idString: "small_drawer", position: Vec(8.5, -5.5), rotation: 0 },
            { idString: "sink", position: Vec(-16.8, -4.6), rotation: 1 },
            { idString: randomSmallStove, position: Vec(-16.8, 3.9), rotation: 1 },
            { idString: "door", position: Vec(4.5, 8.45), rotation: 2 },
            { idString: "mobile_home_wall_4", position: Vec(15.5, 8.45), rotation: 0 },
            { idString: "mobile_home_wall_2", position: Vec(-10.5, 8.45), rotation: 0 },
            { idString: "tire", position: Vec(-24.25, 4.85), rotation: 0, outdoors: true },
            { idString: "small_bed", position: Vec(16.8, -1), rotation: 0 },
            { idString: "mobile_home_window", position: Vec(-6.6, -10.5), rotation: 0 },
            { idString: "mobile_home_wall_1", position: Vec(-17.25, -10.5), rotation: 0 },
            { idString: "mobile_home_wall_2", position: Vec(21.7, -1), rotation: 1 },
            { idString: "mobile_home_wall_2", position: Vec(-21.7, -1), rotation: 1 },
            { idString: "mobile_home_wall_3", position: Vec(10.6, -10.5), rotation: 0 },
            { idString: "box", position: Vec(25.7, -3.5), outdoors: true },
            { idString: "box", position: Vec(27.5, 1.55), outdoors: true }
        ]
    },
    tugboat("red", "lux_crate"),
    tugboat("white", "gun_case"),
    {
        idString: "lighthouse",
        name: "Lighthouse",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        // there's a reason we tend to avoid curved walls
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.94, 20.04, Vec(20.45, 27.42)),
            RectangleHitbox.fromRect(1.94, 59.32, Vec(-21.46, 8.34)),
            RectangleHitbox.fromRect(1.94, 27.68, Vec(20.45, -7.48)),
            RectangleHitbox.fromRect(16.87, 1.98, Vec(12.99, 37.89)),
            RectangleHitbox.fromRect(16.96, 1.98, Vec(-13.96, 37.89)),
            RectangleHitbox.fromRect(15.26, 1.99, Vec(-13.18, -11.24)),
            RectangleHitbox.fromRect(10.37, 1.99, Vec(14.91, -11.24)),
            RectangleHitbox.fromRect(2.98, 2.97, Vec(8.6, -11.24)),
            RectangleHitbox.fromRect(2.98, 2.97, Vec(-4.38, -11.24)),
            RectangleHitbox.fromRect(2.98, 2.98, Vec(-4.37, 12.89)),
            new CircleHitbox(1.02, Vec(18.56, -31.24)),
            new CircleHitbox(1.02, Vec(16.48, -34.94)),
            new CircleHitbox(1.02, Vec(18.09, -32.25)),
            new CircleHitbox(1.02, Vec(19.44, -28.84)),
            new CircleHitbox(1.01, Vec(19.76, -27.67)),
            new CircleHitbox(0.98, Vec(20.44, -21.4)),
            new CircleHitbox(0.98, Vec(20.44, -22.1)),
            new CircleHitbox(0.98, Vec(20.43, -22.79)),
            new CircleHitbox(0.98, Vec(20.38, -23.63)),
            new CircleHitbox(0.98, Vec(20.31, -24.47)),
            new CircleHitbox(1, Vec(20.01, -26.49)),
            new CircleHitbox(1.03, Vec(19.04, -30.05)),
            new CircleHitbox(1.03, Vec(17.09, -34.04)),
            new CircleHitbox(1.02, Vec(15.8, -35.83)),
            new CircleHitbox(1, Vec(14.17, -37.56)),
            new CircleHitbox(1, Vec(13.36, -38.26)),
            new CircleHitbox(0.98, Vec(20.18, -25.45)),
            new CircleHitbox(0.99, Vec(10.37, -40.24)),
            new CircleHitbox(0.98, Vec(11.34, -39.69)),
            new CircleHitbox(0.99, Vec(12.38, -39.01)),
            new CircleHitbox(1.01, Vec(15.07, -36.65)),
            new CircleHitbox(1.02, Vec(17.64, -33.1)),
            new CircleHitbox(0.99, Vec(-2.99, -42.56)),
            new CircleHitbox(1, Vec(-1.61, -42.65)),
            new CircleHitbox(1, Vec(-0.26, -42.67)),
            new CircleHitbox(1, Vec(1.04, -42.63)),
            new CircleHitbox(1, Vec(2.3, -42.54)),
            new CircleHitbox(0.99, Vec(3.44, -42.4)),
            new CircleHitbox(0.99, Vec(4.6, -42.22)),
            new CircleHitbox(0.99, Vec(5.74, -41.97)),
            new CircleHitbox(0.99, Vec(6.94, -41.65)),
            new CircleHitbox(0.99, Vec(8.16, -41.23)),
            new CircleHitbox(0.99, Vec(9.3, -40.76)),
            new CircleHitbox(1, Vec(-18.27, -33.72)),
            new CircleHitbox(1.01, Vec(-18.88, -32.65)),
            new CircleHitbox(1.02, Vec(-19.5, -31.39)),
            new CircleHitbox(1.01, Vec(-19.98, -30.2)),
            new CircleHitbox(1.02, Vec(-20.45, -28.82)),
            new CircleHitbox(1.01, Vec(-20.81, -27.46)),
            new CircleHitbox(1.01, Vec(-21.09, -26.16)),
            new CircleHitbox(0.99, Vec(-21.28, -24.84)),
            new CircleHitbox(0.97, Vec(-21.39, -23.62)),
            new CircleHitbox(0.98, Vec(-21.44, -22.41)),
            new CircleHitbox(0.97, Vec(-21.44, -21.44)),
            new CircleHitbox(0.98, Vec(-5.66, -42.19)),
            new CircleHitbox(0.96, Vec(-14.12, -38.42)),
            new CircleHitbox(0.97, Vec(-15.13, -37.55)),
            new CircleHitbox(0.98, Vec(-15.99, -36.71)),
            new CircleHitbox(0.98, Vec(-16.78, -35.81)),
            new CircleHitbox(0.99, Vec(-17.57, -34.78)),
            new CircleHitbox(0.99, Vec(-4.36, -42.41)),
            new CircleHitbox(0.98, Vec(-8.38, -41.49)),
            new CircleHitbox(0.96, Vec(-9.65, -41.02)),
            new CircleHitbox(0.96, Vec(-10.87, -40.47)),
            new CircleHitbox(0.96, Vec(-12, -39.87)),
            new CircleHitbox(0.96, Vec(-13.08, -39.18)),
            new CircleHitbox(0.98, Vec(-7.51, -41.75)),
            new CircleHitbox(0.98, Vec(-6.62, -41.98))
        ),
        spawnHitbox: RectangleHitbox.fromRect(65, 98, Vec(0, 0)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(42.73, 63.65, Vec(-0.53, 6.93)),
            RectangleHitbox.fromRect(18.84, 17.4, Vec(-0.76, -33.11)),
            RectangleHitbox.fromRect(4.1, 15.7, Vec(-11.07, -32.01)),
            RectangleHitbox.fromRect(3.81, 7.72, Vec(12.34, -34.62)),
            RectangleHitbox.fromRect(9.24, 6.57, Vec(-16, -26.84)),
            RectangleHitbox.fromRect(6.35, 5.5, Vec(14.84, -31.57)),
            RectangleHitbox.fromRect(3.37, 2.92, Vec(-13.83, -36.83)),
            RectangleHitbox.fromRect(9.24, 6.57, Vec(15.22, -27.24)),
            RectangleHitbox.fromRect(4.1, 15.7, Vec(9.79, -32.37)),
            RectangleHitbox.fromRect(8.27, 5.07, Vec(-15.14, -31.09)),
            RectangleHitbox.fromRect(5.19, 2.6, Vec(-14.9, -34.74)),
            RectangleHitbox.fromRect(3.37, 2.92, Vec(14.6, -35.05))
        ),
        spawnMode: MapObjectSpawnMode.Beach,
        spawnOffset: Vec(-15, 0),
        floorImages: [
            {
                key: "lighthouse_floor_1",
                position: Vec(0, -21.82)
            },
            {
                key: "lighthouse_floor_2",
                position: Vec(0, 21.82)
            }
        ],
        ceilingImages: [{
            key: "lighthouse_ceiling",
            position: Vec(-1, -3.5),
            scale: Vec(2, 2)
        }],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(42.73, 63.65, Vec(-0.53, 6.93)),
                    RectangleHitbox.fromRect(18.84, 17.4, Vec(-0.76, -33.11)),
                    RectangleHitbox.fromRect(4.1, 15.7, Vec(-11.07, -32.01)),
                    RectangleHitbox.fromRect(3.81, 7.72, Vec(12.34, -34.62)),
                    RectangleHitbox.fromRect(9.24, 6.57, Vec(-16.35, -26.84)),
                    RectangleHitbox.fromRect(6.35, 5.5, Vec(14.84, -31.57)),
                    RectangleHitbox.fromRect(3.37, 2.92, Vec(-13.83, -36.83)),
                    RectangleHitbox.fromRect(9.24, 6.57, Vec(15.22, -27.24)),
                    RectangleHitbox.fromRect(4.1, 15.7, Vec(9.79, -32.37)),
                    RectangleHitbox.fromRect(8.27, 5.07, Vec(-15.14, -31.09)),
                    RectangleHitbox.fromRect(5.19, 2.6, Vec(-14.9, -34.74)),
                    RectangleHitbox.fromRect(3.37, 2.92, Vec(14.6, -35.05))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.37, 4.91, Vec(-0.47, 41.23))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "small_lamp_thingy", position: Vec(-0.12, -22.2) },
            { idString: "window", position: Vec(20.47, 11.8), rotation: 0 },
            { idString: "door", position: Vec(-0.02, 38), rotation: 0 },
            { idString: "small_stove", position: Vec(15.64, 33.27), rotation: 3 },
            { idString: "sink", position: Vec(15.44, 24.82), rotation: 3 },
            { idString: "small_table", position: Vec(14.99, 11.88), rotation: 0 },
            { idString: "chair", position: Vec(10.61, 12.15), rotation: 3 },
            { idString: "gun_case", position: Vec(-15.12, 33.96), rotation: 2 },
            { idString: "aegis_crate", position: Vec(14.54, -5.34) },
            { idString: "control_panel_small", position: Vec(15.2, -16.15), rotation: 3 },
            { idString: "control_panel_small", position: Vec(-16.24, -16.15), rotation: 1 },
            { idString: "door", position: Vec(2.57, -11.24), rotation: 0 },
            { idString: "lighthouse_wall_3", position: Vec(-4.39, 0.86), rotation: 0 },
            { idString: "lighthouse_wall_1", position: Vec(-8.15, 12.89), rotation: 0 },
            { idString: "door", position: Vec(-15.09, 12.93), rotation: 0 },
            { idString: "small_bed", position: Vec(-9.2, -1.96), rotation: 0 },
            { idString: "small_drawer", position: Vec(-17.11, -6.47), rotation: 0 },
            { idString: "lighthouse_crate", position: Vec(0, -37) },
            { idString: "sandbags", position: Vec(11.66, 43.03), rotation: 0 },
            { idString: "sandbags", position: Vec(-12.55, 43.03), rotation: 0 },
            { idString: "sandbags", position: Vec(25.8, 32.27), rotation: 1 },
            { idString: "sandbags", position: Vec(-27, 32.27), rotation: 1 },
            { idString: "propane_tank", position: Vec(20.43, 40.97) },
            { idString: "propane_tank", position: Vec(20.43, 45.02) }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "lighthouse_lighting", position: Vec(0, -36.2) }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(-17, 8) },
            { table: "lighthouse_skin", position: Vec(-1, 20) }
        ]
    },
    {
        idString: "lighthouse_lighting",
        name: "Lighthouse Lighting",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(0.25, 0.25, Vec(-3.3, 6)),
        ceilingHitbox: RectangleHitbox.fromRect(0.25, 0.25, Vec(-3.3, 6)),
        wallsToDestroy: 1,
        noCeilingCollapseEffect: true,
        destroyOnCeilingCollapse: ["lighthouse_stairs"],
        ceilingImages: [{
            key: "lighthouse_shadow",
            position: Vec(0, 0),
            scale: Vec(2, 2),
            hideOnDead: true
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "lighthouse_wall_2", position: Vec(0.25, 4.7), rotation: 0 },
            { idString: "lighthouse_stairs", position: Vec(0.25, 7.8), rotation: 0 }
        ]
    },
    {
        idString: "small_bridge",
        name: "Small Bridge",
        defType: DefinitionType.Building,
        noBulletCollision: true,
        allowFlyover: FlyoverPref.Always,
        material: "wood",
        particle: "furniture_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.02, 56, Vec(6.39, 0)),
            RectangleHitbox.fromRect(1.02, 56, Vec(-6.39, 0)),
            ...Array.from({ length: 2 }, (_, i) => {
                const a = i === 0 ? 1 : -1;
                return Array.from({ length: 2 }, (_, i) => {
                    const b = i === 0 ? 1 : -1;
                    return [
                        new CircleHitbox(1.1, Vec(6.39 * a, 0)),
                        new CircleHitbox(1.1, Vec(6.39 * a, 9.54 * b)),
                        new CircleHitbox(1.1, Vec(6.39 * a, 19.17 * b)),
                        new CircleHitbox(1.1, Vec(6.39 * a, 27.97 * b))
                    ];
                }).flat();
            }).flat()
        ),
        spawnHitbox: RectangleHitbox.fromRect(20, 62),
        bridgeHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20, 5, Vec(0, 28.5)),
            RectangleHitbox.fromRect(20, 5, Vec(0, -28.5))
        ),
        floorImages: [
            {
                key: "small_bridge",
                position: Vec(0, -14.5)
            },
            {
                key: "small_bridge",
                position: Vec(0, 14.5),
                rotation: Math.PI
            }
        ],
        floors: [
            { type: FloorNames.Wood, hitbox: RectangleHitbox.fromRect(13.6, 55.7, Vec(0, 0)) }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(0, 0) }
        ]
    },
    {
        idString: "large_bridge",
        name: "Large Bridge",
        defType: DefinitionType.Building,
        allowFlyover: FlyoverPref.Always,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            // Main Bridge Sides
            RectangleHitbox.fromRect(4, 136, Vec(21.5, -1.5)),
            RectangleHitbox.fromRect(4, 136, Vec(-21.5, -1.5)),

            // Cinder Blocks on Edge of Bridge
            RectangleHitbox.fromRect(5, 5, Vec(-21.5, -72)),
            RectangleHitbox.fromRect(5, 5, Vec(21.5, -72)),
            RectangleHitbox.fromRect(5, 5, Vec(-21.5, 69)),
            RectangleHitbox.fromRect(5, 5, Vec(21.5, 69)),

            // Pillars
            RectangleHitbox.fromRect(5, 3.25, Vec(-25.25, -1.35)),
            RectangleHitbox.fromRect(5, 3.25, Vec(25.25, -1.35)),
            RectangleHitbox.fromRect(5, 3.25, Vec(-25.25, -35.9)),
            RectangleHitbox.fromRect(5, 3.25, Vec(25.25, -35.9)),
            RectangleHitbox.fromRect(5, 3.25, Vec(-25.25, 33.15)),
            RectangleHitbox.fromRect(5, 3.25, Vec(25.25, 33.15)),
            RectangleHitbox.fromRect(5, 3.25, Vec(-25.25, 67.8)),
            RectangleHitbox.fromRect(5, 3.25, Vec(25.25, 67.8)),
            RectangleHitbox.fromRect(5, 3.25, Vec(-25.25, -70.65)),
            RectangleHitbox.fromRect(5, 3.25, Vec(25.25, -70.65))
        ),
        spawnHitbox: RectangleHitbox.fromRect(105, 230),
        bridgeHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(105, 45, Vec(0, 92.5)),
            RectangleHitbox.fromRect(105, 45, Vec(0, -92.5))
        ),
        bridgeMinRiverWidth: 25,
        floorImages: [
            { key: "large_bridge_railing", position: Vec(23.3, -38) },
            { key: "large_bridge_railing", position: Vec(23.3, 35.3), rotation: Math.PI, scale: Vec(-1, 1) },
            { key: "large_bridge_railing", position: Vec(-23.3, -38), scale: Vec(-1, 1) },
            { key: "large_bridge_railing", position: Vec(-23.3, 35.3), rotation: Math.PI },

            { key: "floor_oil_02", position: Vec(5.28, -66.1), zIndex: ZIndexes.Decals },
            { key: "floor_oil_03", position: Vec(-12.06, 23.49), rotation: Math.PI / 2, zIndex: ZIndexes.Decals },
            { key: "smoke_explosion_decal", position: Vec(-12.96, -49.37), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(15.91, -2.56), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(-8.65, 42.84), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(-2.11, 85.37), zIndex: ZIndexes.Decals },
            { key: "frag_explosion_decal", position: Vec(-4.31, -91.09), zIndex: ZIndexes.Decals },
            { key: "smoke_explosion_decal", position: Vec(11.09, 75.08), zIndex: ZIndexes.Decals }
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
            { type: FloorNames.Stone, hitbox: RectangleHitbox.fromRect(45, 210, Vec(0, 0)) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            // North End of Bridge
            { idString: "barrel", position: Vec(-17.5, -80), rotation: 0, outdoors: true },

            { idString: "sandbags", position: Vec(25, -80), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(36, -82.5), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec(36, -96.5), rotation: 1, outdoors: true },

            { idString: "grenade_crate", position: Vec(27.5, -88.5), outdoors: true },

            // North-Center of the Bridge
            { idString: "regular_crate", position: Vec(13.5, -55), rotation: 1, outdoors: true },
            { idString: "barrel", position: Vec(4, -51), rotation: 1, outdoors: true },
            { idString: "gun_case", position: Vec(13.5, -47), rotation: 2, outdoors: true },
            { idString: "sandbags", position: Vec(12.5, -40), rotation: 2, outdoors: true },
            { idString: "aegis_crate", position: Vec(14.5, -30.5), outdoors: true },

            // Center of the Bridge
            { idString: "m1117", position: Vec(-8.5, -4), rotation: 0, variation: 1 },
            { idString: "regular_crate", position: Vec(7, -20), rotation: 0, outdoors: true },
            { idString: "gun_case", position: Vec(14, 10), rotation: 0, outdoors: true },

            // South-Center of the Bridge
            { idString: "gun_case", position: Vec(6, 26), rotation: 3, outdoors: true },
            { idString: "ammo_crate", position: Vec(14, 26), outdoors: true },
            { idString: "sandbags", position: Vec(12.5, 35.5), rotation: 2, outdoors: true },
            { idString: "barrel", position: Vec(15.5, 43.5), rotation: 2, outdoors: true },
            { idString: "tear_gas_crate", position: Vec(15.5, 52.5), rotation: 1, outdoors: true },

            // South End of the Bridge
            { idString: "barrel", position: Vec(17.5, 80), rotation: 0, outdoors: true },

            { idString: "sandbags", position: Vec(-25, 77), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(-36, 79.5), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec(-36, 93.5), rotation: 1, outdoors: true },

            { idString: "grenade_crate", position: Vec(-27.5, 85.5), outdoors: true }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            // North West Shed
            { idString: "shed_1", position: Vec(-36, -95) },
            { idString: "shed_1", position: Vec(-36, -95), orientation: 2 }
        ]
    },
    {
        idString: "construction_site",
        name: "Construction Site",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(75, 75, Vec(0, 0)),
        spawnMode: MapObjectSpawnMode.Grass,
        floorImages: [
            {
                key: "construction_site_floor_1_left",
                position: Vec(-16.5, -16.5),
                scale: Vec(2, 2)
            },
            {
                key: "construction_site_floor_1_right",
                position: Vec(15.5, -16.5),
                scale: Vec(2, 2)
            },
            {
                key: "construction_site_floor_2_right",
                position: Vec(-16.5, 16),
                scale: Vec(2, 2)
            },
            {
                key: "construction_site_floor_2_left",
                position: Vec(16.5, 16),
                scale: Vec(2, 2)
            }
        ],
        floors: [
            { type: FloorNames.Sand, hitbox: RectangleHitbox.fromRect(65, 65, Vec(0, 0)) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "bunker_entrance", position: Vec(-10, -16), rotation: 0 },

            { idString: "sandbags", position: Vec(18.42, -27.15), rotation: 0, outdoors: true },
            { idString: "sandbags", position: Vec(25.28, -15.7), rotation: 1, outdoors: true },
            { idString: "flint_crate", position: Vec(15, -17), outdoors: true },
            { idString: "barrel", position: Vec(15, -7.5), rotation: 1, outdoors: true },
            { idString: "super_barrel", position: Vec(5, -17), rotation: 1, outdoors: true },

            { idString: "sandbags", position: Vec(-5.5, 7.94), rotation: 1, outdoors: true },
            { idString: "sandbags", position: Vec(0.72, 19.15), rotation: 0, outdoors: true },
            { idString: "cooler", position: Vec(2.28, 8.42), rotation: 1, outdoors: true },

            { idString: "box", position: Vec(16.66, 9.9), outdoors: true },
            { idString: "box", position: Vec(13.45, 16.63), outdoors: true },
            { idString: "box", position: Vec(19.13, 16.54), outdoors: true },
            { idString: "box", position: Vec(-20.5, -15.28), outdoors: true },
            { idString: "box", position: Vec(-25.19, -10.4), outdoors: true },

            { idString: "regular_crate", position: Vec(-17.34, 6.54), outdoors: true },
            { idString: "regular_crate", position: Vec(-16.5, 17.85), outdoors: true },
            { idString: "regular_crate", position: Vec(-24.02, -23.2), outdoors: true },

            { idString: "roadblock", position: Vec(-10.07, -29.04), rotation: 1 },

            { idString: "roadblock", position: Vec(-26, 0), rotation: 0 },
            { idString: "roadblock", position: Vec(-27, 15), rotation: 0 },

            { idString: "roadblock", position: Vec(-12.5, 27.5), rotation: 1 },
            { idString: "roadblock", position: Vec(2.5, 27.5), rotation: 1 },
            { idString: "roadblock", position: Vec(17.5, 27.5), rotation: 1 },
            { idString: "roadblock", position: Vec(25, 15), rotation: 0 }
        ]
    },

    // -----------------------------------------------------------------------------------------------
    // Headquarters.
    // -----------------------------------------------------------------------------------------------
    {
        idString: "detector",
        name: "Detector",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(9, 3, Vec(0, 1)),
        obstacles: IS_CLIENT ? undefined : [
            { idString: "detector_walls", position: Vec(0, 0), rotation: 0 },
            { idString: "detector_top", position: Vec(0, 0.5), rotation: 0 }
        ]
    },
    {
        idString: "headquarters_vault",
        name: "Headquarters Vault",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(22, 30.6, Vec(0, -7.2)),
        ceilingHitbox: RectangleHitbox.fromRect(22, 30.6, Vec(0, -7.2)),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [
            {
                key: "headquarters_vault_ceiling",
                position: Vec(0.1, -7.4),
                scale: Vec(2.02, 2.01)
            }
        ]
    },
    {
        idString: "headquarters_secret_room",
        name: "Headquarters Secret Room",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(20, 20),
        ceilingHitbox: RectangleHitbox.fromRect(20, 20),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [{
            key: "secret_room_ceiling",
            position: Vec(0, 0),
            scale: Vec(1.1, 1.01)
        }],
        ceilingHiddenAlpha: 0.45
    },
    {
        idString: "headquarters",
        name: "Headquarters",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "hq_stone_wall_particle",
        particleVariations: 2,
        collideWithLayers: Layers.Adjacent,
        hasSecondFloor: true,
        hitbox: new GroupHitbox(
            // Outer walls
            RectangleHitbox.fromRect(84.9, 1.75, Vec(-29.2, -106.4)), // T, W1
            RectangleHitbox.fromRect(47.7, 1.75, Vec(47.65, -106.4)), // T, W2
            RectangleHitbox.fromRect(1.75, 95.5, Vec(70.7, -59)), // R, W3
            RectangleHitbox.fromRect(1.75, 38.25, Vec(70.7, 18.5)), // R, W4
            RectangleHitbox.fromRect(23.6, 1.75, Vec(58.6, 36.75)), // B, W5
            RectangleHitbox.fromRect(12.5, 1.75, Vec(30.1, 36.75)), // B, W6
            RectangleHitbox.fromRect(33.4, 1.75, Vec(-3.3, 36.75)), // B, W7
            RectangleHitbox.fromRect(31.4, 1.75, Vec(-55.9, 36.75)), // B, W8
            RectangleHitbox.fromRect(1.75, 70, Vec(-70.7, 1.1)), // L, W9
            RectangleHitbox.fromRect(1.75, 45.25, Vec(-70.7, -84.4)), // L, W10
            RectangleHitbox.fromRect(14.6, 1.75, Vec(-64, -62.7)), // L, W11
            RectangleHitbox.fromRect(1.75, 17.6, Vec(-57.6, -53.8)), // L, W12
            RectangleHitbox.fromRect(1.75, 2, Vec(-57.6, -33.5)), // L, ???
            RectangleHitbox.fromRect(22, 1.75, Vec(-60, -33)), // L, W13

            // Inner walls
            RectangleHitbox.fromRect(24.25, 1.75, Vec(-7.8, -24.5)), // W14
            RectangleHitbox.fromRect(46.1, 1.75, Vec(47.4, -24.5)), // R, W15
            RectangleHitbox.fromRect(1.75, 20, Vec(-19, -14.9)), // W16
            RectangleHitbox.fromRect(1.86, 21.15, Vec(-19, 25.8)), // W17
            RectangleHitbox.fromRect(1.75, 18, Vec(-41.1, 27.1)), // W18
            RectangleHitbox.fromRect(1.75, 9.5, Vec(-41.1, 3.25)), // L, W19
            RectangleHitbox.fromRect(18, 1.75, Vec(-50.25, -0.6)), // L, W20
            RectangleHitbox.fromRect(1.75, 30, Vec(-46.8, -16)), // L, W21
            RectangleHitbox.fromRect(1.75, 40.8, Vec(-33.55, -85.5)), // L, W22
            RectangleHitbox.fromRect(25, 1.75, Vec(-45.9, -94)), // L, W23
            RectangleHitbox.fromRect(1.75, 17, Vec(-57.5, -85.8)), // L, W24
            RectangleHitbox.fromRect(12.5, 1.75, Vec(-50.7, -78.25)), // L, W25

            // squares
            RectangleHitbox.fromRect(4.1, 4, Vec(-47, -33)), // L, 1
            RectangleHitbox.fromRect(4.1, 4, Vec(-32.8, -63)), // L, 2
            RectangleHitbox.fromRect(4.1, 4, Vec(11, -63)), // R, 3
            RectangleHitbox.fromRect(4.1, 4, Vec(32.7, -84)), // R, 4
            RectangleHitbox.fromRect(4.1, 4, Vec(57.5, -84)), // R, 5
            RectangleHitbox.fromRect(4.1, 4, Vec(14.6, 4.5)) // CENT, 6
        ),
        spawnHitbox: RectangleHitbox.fromRect(195, 200, Vec(0, -26)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(140, 70, Vec(-0.5, 1.5)),
            RectangleHitbox.fromRect(128, 73, Vec(5.75, -70)),
            RectangleHitbox.fromRect(11.5, 43, Vec(-64, -84)), // stair
            RectangleHitbox.fromRect(45, 25, Vec(-30, 47)) // ADJUST THIS! (not sure if its correct) - pap,
            // RectangleHitbox.fromRect(12.4, 12, Vec(66.05, -42.5))
        ),
        spawnMode: MapObjectSpawnMode.Grass,
        puzzle: {
            triggerOnSolve: "powered_metal_door",
            delay: 1000,
            unlockOnly: true
        },
        floorImages: [
            {
                key: "headquarters_floor_entrance",
                position: Vec(-30, 45)
            },
            {
                key: "headquarters_large_stair",
                position: Vec(77.7, -55.5)
            },
            {
                key: "headquarters_floor_top",
                position: Vec(0, -69.5)
            },
            {
                key: "headquarters_floor_bottom",
                position: Vec(0.78, 5)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.67, 20, Vec(-18.5, 5.1)), // patch
                    RectangleHitbox.fromRect(88.3, 59.5, Vec(26, 6)),
                    RectangleHitbox.fromRect(20, 1.5, Vec(14.3, -24)), // patch
                    RectangleHitbox.fromRect(37, 58.25, Vec(51.5, -54.7))
                    /* RectangleHitbox.fromRect(1.5, 10, Vec(33.5, -41.5)),
                    RectangleHitbox.fromRect(1.5, 10, Vec(33.5, -81)),
                    RectangleHitbox.fromRect(1.5, 80, Vec(32.5, -67)) // P2 */
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.67, 10, Vec(-40.25, 13)), // patch
                    RectangleHitbox.fromRect(20, 1.05, Vec(14.3, -25.2)), // patch
                    RectangleHitbox.fromRect(1.67, 20, Vec(-19.9, 5.1)), // patch
                    RectangleHitbox.fromRect(20.1, 55, Vec(-30.1, 10)),
                    RectangleHitbox.fromRect(26, 34, Vec(-33, -18.5)),
                    RectangleHitbox.fromRect(78, 40, Vec(-7, -45)),
                    RectangleHitbox.fromRect(20.1, 71, Vec(22, -71.5)),
                    RectangleHitbox.fromRect(22.5, 42, Vec(-45.8, -55)),
                    RectangleHitbox.fromRect(22.5, 16, Vec(-30, 45.15)),
                    RectangleHitbox.fromRect(3.8, 10.4, Vec(-59.25, -39.5)), // D1
                    RectangleHitbox.fromRect(10.3, 3.8, Vec(18.5, -107.9)), // D2
                    RectangleHitbox.fromRect(35.5, 14, Vec(-52.1, -70.5)),
                    RectangleHitbox.fromRect(10.7, 1.67, Vec(-39.5, -77.8)), // patch
                    RectangleHitbox.fromRect(1.67, 80.1, Vec(32.5, -65.5)), // large patch

                    // TODO: new floor types for these (positions are done)
                    RectangleHitbox.fromRect(45.1, 43.5, Vec(-10.8, -84)), // toilet (grey and white tiles)
                    RectangleHitbox.fromRect(37, 22, Vec(51.4, -95)) // toilet (grey and white tiles)
                )
            },
            {
                type: FloorNames.Carpet,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.67, 10, Vec(-41.8, 13)), // P1 - a
                    RectangleHitbox.fromRect(10.5, 1.67, Vec(-64.5, 0.4)), // P1 - b
                    RectangleHitbox.fromRect(27.6, 35.5, Vec(-56, 18))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.7, 1.65, Vec(-64.5, -1)), // patch
                    RectangleHitbox.fromRect(22.5, 30.6, Vec(-59, -17)),
                    RectangleHitbox.fromRect(23, 15, Vec(-45.5, -86)),
                    RectangleHitbox.fromRect(11, 28.5, Vec(-64, -91.5)) // small stair
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(11.55, 25.5, Vec(77.6, -63)), // large stair
                    RectangleHitbox.fromRect(11.5, 11, Vec(-64.11, -100.43)),
                    RectangleHitbox.fromRect(12.5, 16, Vec(-52, -100.1))
                ),
                layer: Layer.ToUpstairs
            }
        ],
        groundGraphics: [{
            color: 0x666666,
            hitbox: RectangleHitbox.fromRect(23, 11, Vec(-45.5, -100))
        }],
        visibilityOverrides: [{
            collider: new GroupHitbox(
                RectangleHitbox.fromRect(16, 11, Vec(-42.5, -100.2)),
                RectangleHitbox.fromRect(8.5, 16, Vec(79.2, -42.75)),
                RectangleHitbox.fromRect(10, 2, Vec(78, -49.5)),
                RectangleHitbox.fromRect(10, 2, Vec(78, -36.5))
            ),
            layer: Layer.Upstairs,
            allow: [0]
        }],
        obstacles: IS_CLIENT ? undefined : [

            // ------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // ------------------------------------------------------------------
            { idString: "cobweb", position: Vec(-65.03, 30.97), rotation: 1 },
            { idString: "cobweb", position: Vec(65.08, -100.66), rotation: 3 },
            { idString: "cobweb", position: Vec(64.95, -30.26), rotation: 2 },
            { idString: "cobweb", position: Vec(-51.82, -83.99), rotation: 1 },
            { idString: "jack_o_lantern", position: Vec(7.64, -112.63), rotation: 3 },
            { idString: "jack_o_lantern", position: Vec(-56.86, 42.99), rotation: 0 },
            { idString: "jack_o_lantern", position: Vec(-3.42, 42.99), rotation: 0 },
            { idString: "small_lamp_thingy", position: Vec(-7.16, 4.94) },
            { idString: "small_lamp_thingy", position: Vec(43.47, -52.67) },

            // ------------------------------------------------------------------

            { idString: "headquarters_bottom_entrance", position: Vec(1, 2), rotation: 0 },
            { idString: "headquarters_main_desk", position: Vec(-10.7, -49.5), rotation: 0 },
            { idString: "headquarters_cafeteria_table", position: Vec(45, -82), rotation: 0 },
            { idString: "headquarters_sinks", position: Vec(1, 1.5), rotation: 0 },

            // i have fully given up at this point
            { idString: "hq_second_floor_collider_hack", position: Vec(0, 0), rotation: 0, layer: Layer.Upstairs },
            { idString: "hq_second_floor_collider_hack_2", position: Vec(0, 0), rotation: 0, layer: Layer.Upstairs },

            // main entrance
            { idString: "planted_bushes", position: Vec(-46, 45.9), rotation: 0 },
            { idString: "planted_bushes", position: Vec(-14, 45.9), rotation: 0 },
            { idString: "glass_door", position: Vec(-35.1, 36.9), rotation: 0, scale: 0.936 },
            { idString: "glass_door", position: Vec(-25, 36.9), rotation: 2, scale: 0.936 },

            // main area (hallway/where unbreakable large desk is)
            { idString: "potted_plant", position: Vec(-32, -56.5) },
            { idString: "potted_plant", position: Vec(10.9, -56.5) },
            { idString: "white_small_couch", position: Vec(-41.25, -57.5), rotation: 0 },
            { idString: "white_small_couch", position: Vec(17, -71), rotation: 1 },
            { idString: "small_drawer", position: Vec(17, -79.5), rotation: 1 },
            { idString: "bookshelf", position: Vec(-8, -28.5), rotation: 0 },
            { idString: "trash_can", position: Vec(28.5, -28.7) },
            { idString: "file_cart", position: Vec(-30, -19), rotation: 1 },
            { idString: "cabinet", position: Vec(-43, -9.2), rotation: 1 },
            { idString: "file_cart", position: Vec(17, -42), rotation: 0 },

            // near stairs + near stairs room
            { idString: { box: 1, trash_can: 1, grenade_box: 0.5 }, position: Vec(-66.5, -67) },
            { idString: "hq_stair", position: Vec(-57.7, -100.2), layer: Layer.ToUpstairs, rotation: 3 },
            { idString: "headquarters_wall_1", position: Vec(-40.9, -62.7), rotation: 0 },
            { idString: "door", position: Vec(-51.15, -62.7), rotation: 0 },
            { idString: "cabinet", position: Vec(-42.25, -90.25), lootSpawnOffset: Vec(0, 2), rotation: 0 },
            { idString: "trash_bag", position: Vec(-53, -90.25) },
            { idString: "door", position: Vec(-40, -78.2), rotation: 2 },

            // outside of hq (also windows and metal doors)
            { idString: "fire_exit_railing", position: Vec(79.1, -56.6), rotation: 0 },
            { idString: "fire_exit_railing", position: Vec(79.1, -56.6), layer: Layer.ToUpstairs, rotation: 0 },
            { idString: "hq_large_stair", position: Vec(77.7, -63.49), layer: Layer.ToUpstairs, rotation: 0 },
            { idString: "metal_door", position: Vec(-57.55, -39.55), rotation: 3 },
            { idString: "metal_door", position: Vec(18.25, -106.4), rotation: 2 },
            { idString: "window", position: Vec(18.5, 36.75), rotation: 1 },
            { idString: "window", position: Vec(41.6, 36.75), rotation: 1 },
            { idString: "window", position: Vec(70.7, -6), rotation: 0 },
            { idString: "dumpster", position: Vec(-63, -54.1), rotation: 2, outdoors: true },
            { idString: "trash_bag", position: Vec(-69.5, -57.3), outdoors: true },

            // office room
            { idString: "desk_left", position: Vec(-8, -17.3), rotation: 0 },
            { idString: "trash_can", position: Vec(-15, -8.25) },
            { idString: "grey_office_chair", position: Vec(-6.5, -13), rotation: 2 },
            { idString: "desk_right", position: Vec(36.6, -17.3), rotation: 0 },
            { idString: "grey_office_chair", position: Vec(31.5, -11.5), rotation: 2 },
            { idString: "desk_left", position: Vec(59.6, -17.3), rotation: 0 },
            { idString: "grey_office_chair", position: Vec(60, -13), rotation: 2 },
            { idString: "headquarters_wall_4", position: Vec(3.1, -15.57), rotation: 1 },
            { idString: "headquarters_wall_4", position: Vec(25.5, -15.57), rotation: 1 },
            { idString: "headquarters_wall_4", position: Vec(48, -15.57), rotation: 1 },
            { idString: "desk_left", position: Vec(-8, 29.6), rotation: 2 },
            { idString: "box", position: Vec(-1.6, 21) },
            { idString: "grey_office_chair", position: Vec(-10, 24), rotation: 0 },
            { idString: "headquarters_wall_9", position: Vec(3, 25.25), rotation: 1 },
            { idString: "water_cooler", position: Vec(7.5, 25), rotation: 1 },
            { idString: "filing_cabinet", position: Vec(8, 32), rotation: 1 },
            { idString: "potted_plant", position: Vec(64.5, 5) },
            { idString: "bookshelf", position: Vec(42, 6.25), rotation: 0 },
            { idString: "headquarters_wall_6", position: Vec(50.05, 10), rotation: 0 },
            { idString: "house_column", position: Vec(29, 9.9) },
            { idString: "house_column", position: Vec(29, 34.38) },
            { idString: "headquarters_wall_1", position: Vec(29, 17), rotation: 1 },
            { idString: "door", position: Vec(29, 28.25), rotation: 3 },
            { idString: "gun_case", position: Vec(36, 14.5), rotation: 0 },
            { idString: "trash_can", position: Vec(66.5, 14.5) },
            { idString: "grey_office_chair", position: Vec(56, 16), rotation: 0 },
            { idString: "desk_left", position: Vec(59.6, 23.25), rotation: 2 },
            { idString: "office_chair", position: Vec(58, 32.25), rotation: 2 },

            // cafeteria (top right)
            { idString: "potted_plant", position: Vec(28, -101.1) },
            { idString: "headquarters_wall_3", position: Vec(33, -100.9), rotation: 1 },
            { idString: "door", position: Vec(33, -91.7), rotation: 1 },
            { idString: "sink", position: Vec(39, -101.25), rotation: 0 },
            { idString: randomSmallStove, position: Vec(47.5, -101.5), rotation: 0 },
            { idString: "fridge", position: Vec(55.7, -101.65), rotation: 0 },
            { idString: "fridge", position: Vec(65, -101.65), rotation: 0 },
            { idString: "door", position: Vec(64.225, -84), rotation: 2 },

            // under cafeteria
            { idString: "headquarters_wall_4", position: Vec(32.7, -73.55), rotation: 1 },
            { idString: "house_column", position: Vec(32.7, -64) },
            { idString: "house_column", position: Vec(32.75, -42.8) },
            { idString: "headquarters_wall_4", position: Vec(32.7, -33.5), rotation: 1 },
            { idString: "vending_machine", position: Vec(37.5, -30.5), rotation: 1 },
            { idString: "large_table", position: Vec(60.7, -60), rotation: 1, variation: 1 },
            { idString: "chair", position: Vec(64.7, -53.6), rotation: 0 },
            { idString: "chair", position: Vec(57.2, -53.6), rotation: 0 },
            { idString: "chair", position: Vec(64.7, -66.2), rotation: 2 },
            { idString: "chair", position: Vec(57.2, -66.2), rotation: 2 },
            { idString: "large_table", position: Vec(63.2, -34.4), rotation: 0, variation: 1 },
            { idString: "chair", position: Vec(57, -38), rotation: 3 }, // chair dist = 7.5
            { idString: "chair", position: Vec(57, -30.5), rotation: 3 },
            { idString: "chair", position: Vec(64.5, -42.8), rotation: 2 },

            // toilets area
            { idString: "headquarters_wall_2", position: Vec(11.9, -75.8), rotation: 1 },
            { idString: "headquarters_wall_3", position: Vec(11.9, -100.9), rotation: 1 },
            { idString: "door", position: Vec(11.9, -91.85), rotation: 1 },
            { idString: "headquarters_wall_6", position: Vec(-10.9, -62.7), rotation: 0 },
            { idString: "toilet", position: Vec(5.5, -69), rotation: 2 },
            { idString: "toilet", position: Vec(-10, -69), rotation: 2 },
            { idString: "used_toilet", position: Vec(-25, -69), rotation: 2 },
            { idString: "hq_toilet_paper_wall", position: Vec(-2, -73.3), rotation: 1 },
            { idString: "hq_toilet_paper_wall", position: Vec(-17.6, -73.3), rotation: 1 },
            { idString: "headquarters_wall_8", position: Vec(-6.2, -82.1), rotation: 0 },
            { idString: "headquarters_wall_7", position: Vec(9.3, -82.1), rotation: 0 },
            { idString: "headquarters_wall_7", position: Vec(-30.9, -82.1), rotation: 0 },
            { idString: "door2", position: Vec(3.25, -82.1), rotation: 0 },
            { idString: "door2", position: Vec(-12.3, -82.1), rotation: 0 },
            { idString: "door2", position: Vec(-23.6, -82.1), rotation: 0 },
            { idString: "trash_can", position: Vec(-29, -102) },

            // security room + vault
            { idString: "door", position: Vec(-41.1, 13.45), rotation: 3 },
            { idString: "gun_case", position: Vec(-47.8, 3.2), rotation: 0 },
            { idString: "grey_office_chair", position: Vec(-47, 26), rotation: 0 },
            { idString: "grey_office_chair", position: Vec(-60, 18), rotation: 0 },
            { idString: "powered_metal_door", position: Vec(-64.25, -0.65), rotation: 0, locked: true },
            { idString: "headquarters_security_desk", position: Vec(-55.9, 33.25), rotation: 0, puzzlePiece: true },
            { idString: "gun_mount_mini14", position: Vec(-68, -27), lootSpawnOffset: Vec(5, 0.5), rotation: 1 },
            { idString: "gun_locker", position: Vec(-62.5, -13.5), lootSpawnOffset: Vec(0.5, 0), rotation: 0 },
            { idString: "gun_locker", position: Vec(-62.5, -19), lootSpawnOffset: Vec(0.5, 0), rotation: 2 },
            { idString: "box", position: Vec(-53, -19) },
            { idString: "box", position: Vec(-51, -14) }

        ] as BuildingObstacle[],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "headquarters_second_floor", position: Vec(5.6, -0.6), layer: Layer.Upstairs },
            { idString: "headquarters_vault", position: Vec(-58.8, -9.4) },
            { idString: "detector", position: Vec(-35, 25.5) },
            { idString: "detector", position: Vec(-25, 25.5) }
        ]
    },
    {
        idString: "headquarters_second_floor",
        name: "Headquarters Second Floor",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "hq_stone_wall_particle",
        particleVariations: 2,
        ceilingImages: [
            {
                key: "headquarters_torture_window", // dont touch :3
                position: Vec(-70.6, -84.2),
                scale: Vec(1, 1.055)
            },
            {
                key: "headquarters_ceiling_1",
                position: Vec(-5.2, -66.122),
                scale: Vec(2.15, 2.15)
            },
            {
                key: "headquarters_ceiling_2",
                position: Vec(-51.8, 6.45),
                scale: Vec(2.15, 2.15)
            }
        ],
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20, 40, Vec(75.975, -15)),
            RectangleHitbox.fromRect(60, 40, Vec(35.975, -5)),
            RectangleHitbox.fromRect(35, 80, Vec(95.975, -35)),

            // outer
            RectangleHitbox.fromRect(1.75, 59, Vec(65.1, -77.1)), // L, W1
            RectangleHitbox.fromRect(93, 1.75, Vec(19.5, -26.5)), // C, W2
            RectangleHitbox.fromRect(1.75, 10, Vec(65.1, -32.1)), // L, W3
            RectangleHitbox.fromRect(140, 1.75, Vec(-5.5, -105.8)), // T, W4
            RectangleHitbox.fromRect(1.75, 61, Vec(-63.2, -63.75)), // L, W5
            RectangleHitbox.fromRect(1.75, 45.8, Vec(-76.4, -83.8)), // L, W6
            RectangleHitbox.fromRect(14.6, 1.75, Vec(-70, -62)), // L, W7
            // Discussion room perimeter
            RectangleHitbox.fromRect(14.4, 1.75, Vec(-69.5, -32.39)),
            RectangleHitbox.fromRect(1.75, 71.4, Vec(-76.4, 2.3)),
            RectangleHitbox.fromRect(1.75, 71.4, Vec(-27.3, 2.45)),
            RectangleHitbox.fromRect(48, 1.75, Vec(-51.7, 37)),

            // inner
            RectangleHitbox.fromRect(14.4, 1.75, Vec(-35, -32.39)), // discussion room inner perimeter part
            RectangleHitbox.fromRect(13, 1.75, Vec(-57.7, -93.5)),
            RectangleHitbox.fromRect(13, 1.75, Vec(-57.7, -77.5)),
            RectangleHitbox.fromRect(1.75, 15, Vec(-63.3, -85.5)),
            RectangleHitbox.fromRect(1.75, 15, Vec(-52.07, -85.5)),
            RectangleHitbox.fromRect(1.75, 48.8, Vec(-39.1, -81.25)),
            RectangleHitbox.fromRect(20, 1.75, Vec(8.8, -56)),
            RectangleHitbox.fromRect(36, 1.75, Vec(46.95, -56)),
            RectangleHitbox.fromRect(1.75, 12.1, Vec(-3.8, -88.9)),
            RectangleHitbox.fromRect(1.75, 23, Vec(18.7, -94.425)),
            RectangleHitbox.fromRect(12.1, 1.75, Vec(13, -83.8)),

            // squares
            RectangleHitbox.fromRect(4.1, 4.15, Vec(-40.3, -54.7)), // L, 1
            RectangleHitbox.fromRect(4.1, 4.15, Vec(-3, -54.8)) // C, 2
        ),
        spawnHitbox: RectangleHitbox.fromRect(195, 200, Vec(0, -26)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(47, 68, Vec(-52, 2.5)),
            RectangleHitbox.fromRect(128, 77.1, Vec(0, -66)),
            RectangleHitbox.fromRect(11.5, 40, Vec(-70, -86)),
            RectangleHitbox.fromRect(12.4, 15, Vec(77.05 - 5.6, -42.5 + 0.6))
        ),
        spawnMode: MapObjectSpawnMode.Grass,
        floorImages: [
            {
                key: "headquarters_second_floor_top",
                position: Vec(-5.57, -68.31)
            },
            {
                key: "headquarters_second_floor_bottom",
                position: Vec(-5.6, 16)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(47, 68, Vec(-52, 2.5)), // discussion room floor
                    RectangleHitbox.fromRect(20.1, 1.7, Vec(-52.2, -31.5)), // patch
                    RectangleHitbox.fromRect(104, 49.5, Vec(13, -80))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(33.1, 1.8, Vec(-22, -54.3)), // patch
                    RectangleHitbox.fromRect(12, 1.8, Vec(24, -56)), // patch
                    RectangleHitbox.fromRect(1.88, 11, Vec(65.2, -42.5)), // patch
                    RectangleHitbox.fromRect(65.1, 28, Vec(31.6, -41)), // FS1
                    RectangleHitbox.fromRect(28, 28, Vec(-12.5, -41)), // FS2
                    RectangleHitbox.fromRect(50, 22, Vec(-37.25, -43.25)), // FS3
                    RectangleHitbox.fromRect(22.25, 44.3, Vec(-51.1, -54.5)) // FS4
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(11, 20.5, Vec(-45.7, -86.8)),
                    RectangleHitbox.fromRect(35.5, 11, Vec(-57.7, -99.5)),
                    RectangleHitbox.fromRect(11.55, 14, Vec(71.9, -42.4)) // large stair landing
                )
            }
        ],
        puzzle: {
            triggerOnSolve: "speaker",
            delay: 500
        },
        sounds: {
            solved: "speaker",
            position: Vec(29.71, -79.14),
            maxRange: 105,
            falloff: 0.5
        },
        obstacles: IS_CLIENT ? undefined : [
            /*  couch parts (note by pap)
                couch_end_right
                couch_end_left
                couch_part
                couch_corner
            */

            // ------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // ------------------------------------------------------------------
            { idString: "cobweb", position: Vec(-33.45, -100.2), rotation: 0 },
            { idString: "cobweb", position: Vec(-33.22, -26.7), rotation: 3 },
            { idString: "cobweb", position: Vec(-57.56, -71.91), rotation: 0 },
            { idString: "small_lamp_thingy", position: Vec(30.8, -74.01) },
            { idString: "small_lamp_thingy", position: Vec(0.16, -41.27) },
            // ------------------------------------------------------------------

            { idString: "fire_exit_railing", position: Vec(73.5, -56), rotation: 0 },

            // near stairs
            { idString: "small_drawer", position: Vec(-58, -62), rotation: 1 },
            { idString: "white_small_couch", position: Vec(-58, -70.6), rotation: 1 },

            // main hallway
            { idString: "metal_door", position: Vec(65.15, -42.7), rotation: 1 },
            { idString: "cabinet", position: Vec(56.5, -52), lootSpawnOffset: Vec(-1, 1), rotation: 0 },
            { idString: "file_cart", position: Vec(56.5, -32.5), rotation: 0 },
            { idString: "bookshelf", position: Vec(-10, -30.5), lootSpawnOffset: Vec(0, -2), rotation: 0 },
            { idString: "potted_plant", position: Vec(-22.5, -31.8), lootSpawnOffset: Vec(1, -1) },
            { idString: "hq_large_cart", position: Vec(28.1, -39), rotation: 0 },
            { idString: "white_small_couch", position: Vec(17.5, -39), rotation: 2 },
            { idString: "box", position: Vec(25.5, -39.5) },

            // big wood room above hallway (has piano and speaker)
            // at this point you can tell I got tired and just spammed stuff to position them one by one
            { idString: "headquarters_boss_desk", position: Vec(-28.1, -82), rotation: 0 },
            { idString: "headquarters_wood_table_second_floor", position: Vec(62.5, -93.8), rotation: 0 },
            { idString: "office_chair", position: Vec(56, -86), rotation: 1 },
            { idString: "office_chair", position: Vec(54, -95.25), rotation: 1 },
            { idString: "speaker", position: Vec(61, -77), rotation: 3, puzzlePiece: true },
            { idString: "piano", position: Vec(55.25, -65), rotation: 1 },
            { idString: "small_drawer", position: Vec(47, -100.6), rotation: 0, lootSpawnOffset: Vec(0, 2) },
            { idString: "couch_part", position: Vec(31.45, -100.9), rotation: 3 },
            { idString: "couch_end_right", position: Vec(38, -100.6), rotation: 0 },
            { idString: "couch_end_left", position: Vec(24.9, -100.6), rotation: 3 },
            { idString: "small_table", position: Vec(31.45, -90.5), rotation: 1, variation: 1 },
            { idString: "couch_corner", position: Vec(1.5, -79), rotation: 0 },
            { idString: "couch_part", position: Vec(7.45, -78.93), rotation: 3 },
            { idString: "couch_end_right", position: Vec(14, -78.6), rotation: 0 },
            { idString: "couch_end_left", position: Vec(1.98, -72.25), rotation: 0 },
            { idString: "door", position: Vec(24.27, -56), rotation: 0 },
            { idString: "headquarters_wall_1", position: Vec(-11.15, -54.5), rotation: 0 },
            { idString: "door", position: Vec(-22.4, -54.5), rotation: 2 },
            { idString: "headquarters_wall_5", position: Vec(-32.58, -54.5), rotation: 0 },
            { idString: "trash_can", position: Vec(-8.5, -58.5) },
            { idString: "potted_plant", position: Vec(-33, -59.3) },
            { idString: "house_column", position: Vec(-3.6, -69.9) },
            { idString: "headquarters_wall_1", position: Vec(-3.6, -77.1), rotation: 1 },
            { idString: "headquarters_wall_1", position: Vec(-3.6, -62.7), rotation: 1 },
            { idString: "grey_office_chair", position: Vec(-26.8, -90), rotation: 0 },
            { idString: "grey_office_chair", position: Vec(-28, -74.5), rotation: 2 },
            { idString: "filing_cabinet", position: Vec(-8.4, -101), lootSpawnOffset: Vec(0, 2), rotation: 0 },
            { idString: "bookshelf", position: Vec(-18.6, -102), lootSpawnOffset: Vec(0, 2), rotation: 0 },
            { idString: "bookshelf", position: Vec(-31.5, -102), lootSpawnOffset: Vec(0, 2), rotation: 0 },
            { idString: "potted_plant", position: Vec(1.5, -61) },
            { idString: "bookshelf", position: Vec(12, -59.5), rotation: 0 },

            // secret room
            { idString: "secret_door", position: Vec(-3.85, -99.4), rotation: 3 },
            { idString: "aegis_golden_case", position: Vec(14, -98.5), lootSpawnOffset: Vec(-1, 1), rotation: 3 },
            { idString: "secret_door", position: Vec(2.5, -83.8), rotation: 0 },

            // ---------------------------------------------------------------------------------------------------------------
            // discussion room? (bottom left)
            // ---------------------------------------------------------------------------------------------------------------
            { idString: "door", position: Vec(-47.65, -32.3), rotation: 2 },
            { idString: "door", position: Vec(-56.85, -32.3), rotation: 0 },
            { idString: "bookshelf", position: Vec(-30.8, -13), lootSpawnOffset: Vec(-3, 0), rotation: 1 },
            { idString: "tv", position: Vec(-29.2, 1.75), rotation: 0 },
            { idString: "large_drawer", position: Vec(-32.3, 1.75), lootSpawnOffset: Vec(-3, 0), rotation: 3 },
            { idString: "bookshelf", position: Vec(-30.8, 16.5), lootSpawnOffset: Vec(-3, 0), rotation: 1 },
            { idString: "potted_plant", position: Vec(-71.7, 31.5) },
            { idString: "potted_plant", position: Vec(-32.5, 32.2) },
            { idString: "falchion_case", position: Vec(-51, 32.25), lootSpawnOffset: Vec(0, -2), rotation: 2 },
            { idString: "water_cooler", position: Vec(-71.8, -27.5), rotation: 1 },
            { idString: "filing_cabinet", position: Vec(-32.5, -27.5), lootSpawnOffset: Vec(-2, 0), rotation: 3 },

            // schematic: 3 tables, 2 chairs on each (left & right) with 2 chairs on top and bottom of the whole table group
            { idString: "chair", position: Vec(-54.1, -14.6), rotation: 2 },
            { idString: "chair", position: Vec(-54.1, 19.1), rotation: 0 },

            { idString: "large_table", variation: 1, position: Vec(-54.1, -9), rotation: 1 },
            { idString: "chair", position: Vec(-62.5, -9), rotation: 3 }, // rotation1=I_
            { idString: "chair", position: Vec(-45.5, -9), rotation: 1 },

            { idString: "large_table", variation: 0, position: Vec(-54.1, 2.25), rotation: 1 },
            { idString: "chair", position: Vec(-62.5, 2.25), rotation: 3 },
            { idString: "chair", position: Vec(-45.5, 2.25), rotation: 1 },

            { idString: "large_table", variation: 0, position: Vec(-54.1, 13.4), rotation: 1 },
            { idString: "chair", position: Vec(-62.5, 13.4), rotation: 3 },
            { idString: "chair", position: Vec(-45.5, 13.4), rotation: 1 }
            // ---------------------------------------------------------------------------------------------------------------
        ] as BuildingObstacle[],
        subBuildings: IS_CLIENT ? undefined : [{ idString: "headquarters_secret_room", position: Vec(7.4, -94.5) }],
        lootSpawners: IS_CLIENT ? undefined : [{
            position: Vec(16, -88),
            table: "hq_skin"
        }]
    },
    {
        idString: "small_bunker_entrance",
        name: "Small Bunker Entrance",
        defType: DefinitionType.Building,
        reflectBullets: true,
        collideWithLayers: Layers.All,
        visibleFromLayers: Layers.All,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            // RectangleHitbox.fromRect(12, 1, Vec(0, -7.5)),
            RectangleHitbox.fromRect(1.9, 16.6, Vec(6.1, 0.15)),
            RectangleHitbox.fromRect(1.9, 16.6, Vec(-6.1, 0.15))
        ),
        spawnHitbox: RectangleHitbox.fromRect(75, 75, Vec(0, 0)),
        floors: [
            { type: FloorNames.Metal, hitbox: RectangleHitbox.fromRect(10, 18, Vec(0, 0)) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "bunker_stair", position: Vec(0, 2.6), rotation: 0 }
        ]
    },
    {
        idString: "small_bunker_main",
        name: "Small Bunker",
        defType: DefinitionType.Building,
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        material: "metal_heavy",
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(44.5, 1.7, Vec(0, -18)),
            RectangleHitbox.fromRect(1.7, 37.9, Vec(21.5, 0)),
            RectangleHitbox.fromRect(1.7, 37.9, Vec(-21.5, 0)),
            RectangleHitbox.fromRect(16, 1.7, Vec(-13.1, 18)),
            RectangleHitbox.fromRect(16, 1.7, Vec(13.1, 18))
        ),
        spawnHitbox: RectangleHitbox.fromRect(55, 55, Vec(0, 5)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(42, 34.5),
            RectangleHitbox.fromRect(10, 20, Vec(0, 20))
        ),
        floorImages: [
            {
                key: "small_bunker_floor",
                position: Vec(0, 7),
                scale: Vec(2.2, 2.2)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(42, 34.5),
                    RectangleHitbox.fromRect(10, 4.5, Vec(0, 19))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(10, 12, Vec(0, 27)),
                layer: Layer.ToBasement
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "small_desk", position: Vec(-12.9, 13.9), rotation: 0 },
            { idString: "metal_door", position: Vec(0.25, 18.3), rotation: 0 },
            { idString: "control_panel2", position: Vec(-14.5, -12.6), rotation: 0 },
            { idString: "box", position: Vec(-17, -2), lootSpawnOffset: Vec(2, 0) },
            { idString: "box", position: Vec(-15, 3.5), lootSpawnOffset: Vec(2, 0) },
            { idString: "small_drawer", position: Vec(-5, -13), lootSpawnOffset: Vec(0, 2), rotation: 0 },
            { idString: "house_wall_13", position: Vec(0, -12.5), rotation: 1 },
            { idString: "fridge", position: Vec(6.5, -13), lootSpawnOffset: Vec(0, 2), rotation: 0 },
            { idString: "small_bed", position: Vec(16, -8.5), rotation: 0 },
            { idString: "small_drawer", position: Vec(16, 3.3), lootSpawnOffset: Vec(-2, 0), rotation: 3 },
            { idString: "flint_crate", position: Vec(15, 11.5), lootSpawnOffset: Vec(-2, -2) }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(0, -0.5) }
        ]
    },
    {
        idString: "small_bunker",
        name: "Small Bunker",
        defType: DefinitionType.Building,
        material: "metal_heavy",
        particle: "metal_particle",
        reflectBullets: true,
        ceilingZIndex: ZIndexes.ObstaclesLayer3,
        visibleFromLayers: Layers.All,
        hitbox: RectangleHitbox.fromRect(12, 1, Vec(0, 12.3)),
        floorImages: [{
            key: "small_bunker_entrance_floor",
            position: Vec(-0.05, 20),
            scale: Vec(2.2, 2.2)
        }],
        ceilingImages: [{
            key: "small_bunker_entrance_ceiling",
            position: Vec(0, 18),
            scale: Vec(2.35, 2.1)
        }],
        spawnHitbox: RectangleHitbox.fromRect(53, 53, Vec(0, 20)),
        bunkerSpawnHitbox: RectangleHitbox.fromRect(55, 55),
        ceilingHitbox: RectangleHitbox.fromRect(10, 15, Vec(0, 20)),
        obstacles: IS_CLIENT ? undefined : [
            { idString: randomTree, position: Vec(7.5, 9.8) },
            { idString: randomTree, position: Vec(10, 23) },
            { idString: randomTree, position: Vec(-10, 16) },
            { idString: randomTree, position: Vec(-5, 37) }
        ],
        bulletMask: RectangleHitbox.fromRect(11, 30, Vec(0, 30)),
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "small_bunker_main", position: Vec(0, -5), layer: Layer.Basement },
            { idString: "small_bunker_entrance", position: Vec(0, 20), layer: Layer.ToBasement }
        ]
    },
    {
        idString: "barn_top_floor_shadow",
        name: "Barn Shadow",
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20, 55, Vec(-19, 0)),
            RectangleHitbox.fromRect(58, 14, Vec(0, -21))
        ),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [
            {
                key: "barn_top_floor_shadow",
                position: Vec(0, 0),
                scale: Vec(8.5, 8.5)
            }
        ]
    },
    {
        idString: "barn_top_floor",
        name: "Barn Top Floor",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(17, 1, Vec(18.5, -14.9)),
            RectangleHitbox.fromRect(17, 1, Vec(-0.5, -14.9)),
            RectangleHitbox.fromRect(1, 14, Vec(-9.5, -7.5)),
            RectangleHitbox.fromRect(1, 26.5, Vec(-9.5, 14.5)),
            RectangleHitbox.fromRect(1, 21, Vec(-20, 5.45)),
            RectangleHitbox.fromRect(9.5, 1, Vec(-25, -4.55)),
            RectangleHitbox.fromRect(1, 3, Vec(28.25, -17)),
            RectangleHitbox.fromRect(2, 1, Vec(29, -18))
        ),
        spawnHitbox: RectangleHitbox.fromRect(120, 92, Vec(-23.9, -11.85)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(30.5, 55.5, Vec(-19.5, 0)),
            RectangleHitbox.fromRect(61, 14, Vec(7, -21))
        ),
        floorImages: [
            {
                key: "barn_top_floor_2",
                position: Vec(10, -21.15),
                scale: Vec(1.07, 1.07)
            },
            {
                key: "barn_top_floor_1",
                position: Vec(-19.5, 0),
                scale: Vec(1.07, 1.07)
            },
            {
                key: "barn_top_floor_wall",
                position: Vec(-23.14, -21.51),
                scale: Vec(1.07, 1.07)
            }
        ],
        ceilingImages: [{
            key: "barn_ceiling",
            position: Vec(12.9, 11.35),
            scale: Vec(2.12, 2.12)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(60, 14, Vec(0, -21)),
                    RectangleHitbox.fromRect(20, 23, Vec(-19.5, -16.5)),
                    RectangleHitbox.fromRect(10, 40, Vec(-15, 0)),
                    RectangleHitbox.fromRect(20, 12, Vec(-20, 21.5))
                )
            }
        ]
    },
    {
        idString: "barn_exterior", // spanAdjacent layer thingy no work
        name: "Barn Exterior",
        defType: DefinitionType.Building,
        material: "stone",
        particleVariations: 2,
        spawnHitbox: RectangleHitbox.fromRect(120, 92),
        particle: "barn_wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(77, 1.75, Vec(-4.5, -41)),
            RectangleHitbox.fromRect(1.75, 45, Vec(-55.1, -5.8)),
            RectangleHitbox.fromRect(31.5, 1.75, Vec(-40.25, 17)),
            RectangleHitbox.fromRect(48, 1.75, Vec(10, 17)),
            RectangleHitbox.fromRect(1.75, 16, Vec(33.1, 9)),
            RectangleHitbox.fromRect(1.75, 16, Vec(33.1, -32.25))
        )
    },
    {
        idString: "barn_exterior_top_floor", // spanAdjacent layer thingy no work
        name: "Barn Exterior",
        defType: DefinitionType.Building,
        material: "stone",
        particleVariations: 2,
        spawnHitbox: RectangleHitbox.fromRect(120, 92),
        particle: "barn_wall_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(90, 1.75, Vec(-11, -41)),
            RectangleHitbox.fromRect(1.75, 58, Vec(-55.1, -11.5)),
            RectangleHitbox.fromRect(31.5, 1.75, Vec(-40.25, 17)),
            RectangleHitbox.fromRect(48, 1.75, Vec(10, 17)),
            RectangleHitbox.fromRect(1.75, 16, Vec(33.1, 9)),
            RectangleHitbox.fromRect(1.75, 16, Vec(33.1, -32.25))
        )
    },
    {
        idString: "barn",
        name: "Barn",
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(120, 92),
            // temp fix (bleh)
            RectangleHitbox.fromRect(47, 32, Vec(-5, -58))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(85.5, 56, Vec(-11, -11.9)),
            RectangleHitbox.fromRect(64, 24, Vec(-23, 29.5))
        ),
        ceilingImages: [{
            key: "barn_ceiling",
            position: Vec(-11, -0.5),
            scale: Vec(2.12, 2.12)
        }],
        hasSecondFloor: true,
        floorImages: [
            {
                key: "barn_floor_4",
                position: Vec(-22.5, 30),
                scale: Vec(2.14, 2.14)
            },
            {
                key: "barn_floor_1",
                position: Vec(-27.5, -10),
                scale: Vec(1.07, 1.07)
            },
            {
                key: "barn_floor_3",
                position: Vec(44.8, -11.94),
                scale: Vec(2.14, 2.14)
            },
            {
                key: "barn_floor_2",
                position: Vec(16, -11.9),
                scale: Vec(1.07, 1.07)
            },
            {
                key: "barn_floor_explosion",
                position: Vec(-50, -37)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(86, 25.25, Vec(12.7, -11.6)),
                    RectangleHitbox.fromRect(22, 59.5, Vec(44.7, -11.8)),
                    RectangleHitbox.fromRect(10.25, 5.5, Vec(-19.3, 19))
                )
            },

            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(86.25, 16, Vec(-11.1, -32.25)),
                    RectangleHitbox.fromRect(24, 40, Vec(-42.25, -10)),
                    RectangleHitbox.fromRect(86.25, 16, Vec(-11.1, 9))
                )
            },

            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(7, 7, Vec(-49.25, 0)),
                    RectangleHitbox.fromRect(7, 7, Vec(9.5, -35.25))
                ),
                layer: Layer.ToUpstairs
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "barn_stair_walls", position: Vec(0, 0), rotation: 0 },
            { idString: "barn_stair_walls_2", position: Vec(0, 0), rotation: 0 },
            { idString: "barn_stair_walls_top_floor", position: Vec(0, 0), rotation: 0, layer: Layer.Upstairs },

            // Columns
            { idString: "house_column", position: Vec(-33.5, -11.6) },
            { idString: "house_column", position: Vec(-33.5, -26.7) },
            { idString: "house_column", position: Vec(-15, -26.7) },
            { idString: "house_column", position: Vec(4.1, -26.7) },
            { idString: "house_column", position: Vec(19.39, 3.36) },
            { idString: "house_column", position: Vec(3.6, 3.36) },
            { idString: "house_column", position: Vec(-12.36, 3.36) },
            { idString: "house_column", position: Vec(-13.59, 40.32) },
            { idString: "house_column", position: Vec(8.43, 40.32) },
            { idString: "house_column", position: Vec(-32.29, 40.32) },
            { idString: "house_column", position: Vec(-53.78, 40.32) },

            { idString: "house_column", position: Vec(-33.5, -26.7), layer: Layer.Upstairs },
            { idString: "house_column", position: Vec(-15, -26.7), layer: Layer.Upstairs },
            { idString: "house_column", position: Vec(4.1, -26.7), layer: Layer.Upstairs },
            { idString: "house_column", position: Vec(-33.5, -11.6), layer: Layer.Upstairs },

            // stairs
            { idString: "barn_stair", position: Vec(11, -35.35), rotation: 1, layer: Layer.ToUpstairs },
            { idString: "barn_stair", position: Vec(-49.17, -1.9), rotation: 2, layer: Layer.ToUpstairs },

            // outside
            { idString: "barrel", position: Vec(-31.04, 22.49) },
            { idString: "regular_crate", position: Vec(-40.5, 23.21) },
            { idString: "ammo_crate", position: Vec(-7.85, 24.13) },
            { idString: "regular_crate", position: Vec(39.88, 6.83) },
            { idString: "hay_bale", position: Vec(41.62, -33.27), rotation: 0 },

            // inside
            { idString: "barn_door", position: Vec(33.06, -4.48), rotation: 1 },
            { idString: "barn_door", position: Vec(33.06, -18.9), rotation: 3 },
            { idString: "regular_crate", position: Vec(-5.16, 10.94) },
            { idString: "ammo_crate", position: Vec(-48.33, -18) },
            { idString: "bookshelf", position: Vec(29.66, 9.22), rotation: 1 },
            { idString: "bookshelf", position: Vec(-25.21, -37.16), rotation: 0 },
            { idString: "box", position: Vec(-24, -20.18) },
            { idString: "box", position: Vec(8.98, 12.94) },
            { idString: "box", position: Vec(14.16, 10.48) },
            { idString: "flint_crate", position: Vec(-48.59, 10.82) },
            { idString: "bookshelf", position: Vec(12.45, -28.13), rotation: 0 },
            { idString: "gun_case", position: Vec(0.92, -34.24), rotation: 3 },
            { idString: "box", position: Vec(-4.98, -36.84) },
            { idString: "grenade_crate", position: Vec(-28.13, 12.05) },
            { idString: "door", position: Vec(-19.78, 17.11), rotation: 2 },
            { idString: "hay_bale", position: Vec(6.22, -10.53), rotation: 2 },
            { idString: "box", position: Vec(16.55, -10.34) },
            { idString: "hay_bale", position: Vec(-15.64, -18.12), rotation: 1 },
            { idString: "hay_bale", position: Vec(-37.68, 9.15), rotation: 3 },

            { idString: "house_wall_3", position: Vec(19.39, 10.31), rotation: 1 },
            { idString: "house_wall_3", position: Vec(3.6, 10.31), rotation: 1 },
            { idString: "house_wall_3", position: Vec(-12.36, 10.31), rotation: 1 },

            // top floor stuff
            { idString: "regular_crate", position: Vec(-10.4, -34.56), layer: Layer.Upstairs },
            { idString: "gun_case", position: Vec(-50.37, -33.89), rotation: 1, layer: Layer.Upstairs },
            { idString: "regular_crate", position: Vec(-40.5, -25.5), layer: Layer.Upstairs },
            { idString: "box", position: Vec(-20.71, -30.47), layer: Layer.Upstairs },
            { idString: "gun_locker", position: Vec(-22.5, -36.7), lootSpawnOffset: Vec(0, 1), rotation: 0, layer: Layer.Upstairs },
            { idString: "barrel", position: Vec(-49.44, -21.25), layer: Layer.Upstairs },
            { idString: "grenade_box", position: Vec(-37.47, 13.07), layer: Layer.Upstairs },
            { idString: "bookshelf", position: Vec(-46.82, 13.36), rotation: 0, layer: Layer.Upstairs, lootSpawnOffset: Vec(0, -1) }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "barn_top_floor_shadow", position: Vec(-24.5, -11.7) },
            { idString: "barn_top_floor", position: Vec(-23.9, -11.85), layer: Layer.Upstairs },
            { idString: "barn_exterior", position: Vec(0, 0) },
            { idString: "barn_exterior_top_floor", position: Vec(0, 0), layer: Layer.Upstairs },
            { idString: randomHayShed, position: Vec(-5, -58) }
        ]
    },
    {
        idString: "bombed_armory_barracks",
        name: "Armory Barracks",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            new RectangleHitbox(Vec(23.44, -41), Vec(25.54, -15.1)),
            new RectangleHitbox(Vec(23.44, -4), Vec(25.54, 23.13)),
            new RectangleHitbox(Vec(23.44, 34.23), Vec(25.54, 41)),
            new RectangleHitbox(Vec(-25.51, -42.34), Vec(-1.91, -40.25)),
            new RectangleHitbox(Vec(7, 16.1), Vec(24, 18.2)),
            new RectangleHitbox(Vec(8.18, -42.34), Vec(25.54, -40.25)),
            new RectangleHitbox(Vec(-25.51, -41), Vec(-23.42, 17.54)),
            new RectangleHitbox(Vec(-25.51, 28.57), Vec(-23.42, 42.35)),
            new RectangleHitbox(Vec(-24, 40.25), Vec(-4.33, 42.35)),
            new RectangleHitbox(Vec(5.76, 40.25), Vec(25.54, 42.35)),
            new RectangleHitbox(Vec(4.05, 15.59), Vec(7.06, 18.77)),
            new RectangleHitbox(Vec(-4.12, -21.39), Vec(-1.11, -18.21)),
            new RectangleHitbox(Vec(-24, -20.85), Vec(-4, -18.76))
        ),
        spawnHitbox: RectangleHitbox.fromRect(50, 84),
        ceilingHitbox: RectangleHitbox.fromRect(50, 84),
        floorImages: [
            {
                key: "armory_barracks_floor_1",
                position: Vec(0, -23.2)
            },
            {
                key: "armory_barracks_floor_2",
                position: Vec(0, 23.2)
            },

            { key: "window_residue", position: Vec(24.5, -9.5), zIndex: ZIndexes.Decals },
            { key: "window_residue", position: Vec(24.5, 28.75), zIndex: ZIndexes.Decals },
            { key: "window_residue", position: Vec(-24.5, 23), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec(-11.2, 8.07), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec(14.64, 29.21), scale: Vec(0.8, 0.8), zIndex: ZIndexes.Decals },
            { key: "cabinet_residue", position: Vec(16, 37.6), zIndex: ZIndexes.Decals },
            { key: "cabinet_residue", position: Vec(16, 20.9), zIndex: ZIndexes.Decals }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "cabinet", position: Vec(16, 20.9) },
            { table: "cabinet", position: Vec(16, 37.6) }
        ],
        ceilingImages: [
            {
                key: "armory_barracks_ceiling_1",
                position: Vec(0, -21),
                scale: Vec(2, 2)
            },
            {
                key: "armory_barracks_ceiling_2",
                position: Vec(0, 20.6),
                scale: Vec(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(50, 84)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "fridge", position: Vec(-19.8, -35.5), rotation: 1 },
            { idString: randomStove, position: Vec(-19.8, -26.1), rotation: 1 },
            { idString: "bunk_bed", position: Vec(18, -31.25), rotation: 0 },
            { idString: "small_drawer", position: Vec(18.4, -18.7), rotation: 0 },
            { idString: "small_drawer", position: Vec(-2, -13.6), rotation: 1 },
            { idString: "box", position: Vec(-10.95, 25.29) },
            { idString: "box", position: Vec(8.04, 11.36) },
            { idString: "bunk_bed", position: Vec(-14.43, -13.21), rotation: 1 },
            { idString: "bunk_bed", position: Vec(17.95, 7), rotation: 0 },
            { idString: "bunk_bed", position: Vec(-14.48, 34.83), rotation: 3 },
            { idString: "door", position: Vec(1.15, 41.3), rotation: 0 },
            { idString: "window_damaged", position: Vec(24.5, -9.5), rotation: 0 },
            { idString: "window_damaged", position: Vec(24.5, 28.75), rotation: 0 },
            { idString: "window_damaged", position: Vec(-24.5, 23), rotation: 0 }
        ]
    },
    {
        idString: "bombed_armory_center",
        name: "Armory Center",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.09, 42, Vec(16.38, 0)),
            RectangleHitbox.fromRect(32.34, 2.08, Vec(1.24, -21.87)),
            RectangleHitbox.fromRect(2.09, 3.97, Vec(-13.88, -19.01)),
            RectangleHitbox.fromRect(2.09, 8.27, Vec(-13.88, 16.87)),
            RectangleHitbox.fromRect(2.09, 8.58, Vec(-13.88, -2.64)),
            RectangleHitbox.fromRect(32.34, 2.07, Vec(1.24, 21.88))
        ),
        spawnHitbox: RectangleHitbox.fromRect(31, 44, Vec(1.5, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(31, 44, Vec(1.5, 0)),
        floorImages: [
            {
                key: "armory_center_floor_1",
                position: Vec(0, -11.5)
            },
            {
                key: "armory_center_floor_2",
                position: Vec(0, 11.5)
            },
            {
                key: "window_residue",
                position: Vec(-13.9, 7.1)
            },
            {
                key: "chair_residue",
                rotation: 3,
                position: Vec(3, 1.7)
            },
            {
                key: "large_refinery_barrel_residue",
                position: Vec(-1.42, -10),
                scale: Vec(0.8, 0.8)
            },
            {
                key: "small_drawer_residue",
                position: Vec(-9.2, 16.8),
                rotation: 2
            },
            {
                key: "explosion_decal",
                position: Vec(-13.9, -12.43)
            },
            {
                key: "cabinet_residue",
                position: Vec(12.3, -11.6),
                rotation: 2
            }
        ],
        ceilingImages: [
            {
                key: "armory_center_ceiling_1",
                position: Vec(1.25, -11),
                scale: Vec(2, 2)
            },
            {
                key: "armory_center_ceiling_2",
                position: Vec(1.25, 11.4),
                scale: Vec(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(31, 44, Vec(1.5, 0))
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "chair", position: Vec(10.1, 6), rotation: 0 },
            { idString: "gun_mount_maul", position: Vec(2, 19.05), rotation: 2 },
            { idString: "trash_can", position: Vec(12, 17.5) },
            { idString: "window_damaged", position: Vec(-13.9, 7.1), rotation: 0 }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            {
                table: "small_drawer",
                position: Vec(-9.2, 16.8)
            },
            {
                table: "cabinet",
                position: Vec(12.45, -11.6)
            }
        ]
    },
    {
        idString: "bombed_armory_vault",
        name: "Armory Vault",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.09, 36, Vec(36.03, -2)),
            RectangleHitbox.fromRect(2.09, 11.67, Vec(-13.96, -15.16)),
            RectangleHitbox.fromRect(13.4, 2.09, Vec(30.37, 16.52)),
            RectangleHitbox.fromRect(74.12, 2.09, Vec(0.01, -20.98)),
            RectangleHitbox.fromRect(2.09, 11.07, Vec(-13.96, 10.47)),
            RectangleHitbox.fromRect(29, 2.09, Vec(21.9, -6.66)),
            RectangleHitbox.fromRect(2.07, 37, Vec(-36.01, -2.5)),
            RectangleHitbox.fromRect(35.39, 2.09, Vec(-19.35, 16.52)),
            RectangleHitbox.fromRect(4.16, 2.09, Vec(10.5, 16.52))
        ),
        spawnHitbox: RectangleHitbox.fromRect(72, 38, Vec(0, -2)),
        ceilingHitbox: RectangleHitbox.fromRect(72, 38, Vec(0, -2)),
        floorImages: [
            {
                key: "armory_vault_floor_1",
                position: Vec(-16.6, 0)
            },
            {
                key: "armory_vault_floor_2",
                position: Vec(20.2, 0)
            },
            {
                key: "fridge_residue",
                position: Vec(-9, -3.22),
                zIndex: ZIndexes.Decals,
                rotation: 1
            },
            {
                key: "window_residue",
                position: Vec(18.1, 16.5),
                zIndex: ZIndexes.Decals,
                rotation: 1.5
            },
            { key: "explosion_decal", position: Vec(3.8, 16.5), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(-8, -8), zIndex: ZIndexes.Decals },
            { key: "ammo_crate_residue", position: Vec(12.85, -0.45), zIndex: ZIndexes.Decals },
            { key: "barrel_residue", position: Vec(30.7, -14), zIndex: ZIndexes.Decals },
            { key: "gun_case_residue", position: Vec(-7.5, 12.4), zIndex: ZIndexes.Decals },
            { key: "regular_crate_residue", position: Vec(-21.06, 0.29), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec(6.43, 7.48), scale: Vec(0.8, 0.8), zIndex: ZIndexes.Decals },
            { key: "armory_vault_door_residue", position: Vec(-8.37, -1.59), zIndex: ZIndexes.Decals, rotation: 2 },
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    key: "explosion_decal",
                    position: Vec(10 + 4.75 * i, -16 - (i % 2 === 0 ? -2 : 0))
                })
            )
        ],
        ceilingImages: [{
            key: "armory_vault_ceiling",
            position: Vec(0, -2.5),
            scale: Vec(2, 2)
        }],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(72, 38, Vec(0, -2))
        }],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: "armory_inner_vault",
            position: Vec(-25, -2.25)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "gun_case", position: Vec(31.9, 10), rotation: 3 },
            { idString: "ammo_crate", position: Vec(29.5, -0.45), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec(21.2, -0.45), rotation: 1 },
            { idString: "window_damaged", position: Vec(18.1, 16.5), rotation: 1 },
            { idString: "grenade_crate", position: Vec(-9.1, -15.9) },
            { idString: "briefcase", position: Vec(-28.93, -14.85), rotation: 0 },
            { idString: "barrel", position: Vec(-19.59, -9.22) },
            { idString: "barrel", position: Vec(-29.81, -6.01) },
            { idString: "box", position: Vec(-18.46, -16.58) },
            { idString: "regular_crate", position: Vec(-29.77, 10.54) },
            { idString: "box", position: Vec(-21.29, 12.33) },
            { idString: "box", position: Vec(-17.88, 6.72) },
            { idString: "bombed_armory_vault_wall", position: Vec(-13.94, -2.1), rotation: 1 }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            {
                position: Vec(12.85, -0.45),
                table: "ammo_crate"
            },
            {
                position: Vec(-7.5, 12.4),
                table: "gun_case"
            }
        ]
    },
    {
        idString: "bombed_armory",
        name: "Bombed Armory",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(160, 176),
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "bombed_armory_barracks", position: Vec(-41.31, 27.86) },
            { idString: "bombed_armory_center", position: Vec(55.4, 15.07) },
            { idString: "bombed_armory_vault", position: Vec(-35.03, -58.37) },
            { idString: "outhouse", position: Vec(-60.9, -65.63), orientation: 2 }
        ],
        groundGraphics: [
            {
                color: "#6664",
                hitbox: RectangleHitbox.fromRect(153.09, 1.87, Vec(0, -83.96))
            },
            {
                color: "#6664",
                hitbox: RectangleHitbox.fromRect(153.09, 1.87, Vec(0, 83.96))
            },
            {
                color: "#6664",
                hitbox: RectangleHitbox.fromRect(1.93, 168, Vec(-75.57, 0))
            },
            {
                color: "#6664",
                hitbox: RectangleHitbox.fromRect(1.93, 168, Vec(75.57, 0))
            },
            {
                color: 0x404040,
                hitbox: new PolygonHitbox([
                    Vec(5.54, -80.63),
                    Vec(62.37, -80.63),
                    Vec(62.37, -24.57),
                    Vec(48.11, -15.97),
                    Vec(34.01, -15.97),
                    Vec(34.01, 84.86),
                    Vec(-8.82, 84.86),
                    Vec(-8.82, -32.87),
                    Vec(5.54, -41.2)
                ])
            },
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(-1.5, -3.4 + 25.2 * i))
                })
            ),
            ...Array.from(
                { length: 6 },
                (_, i) => ({
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(12.7, -53.8 + 25.2 * i))
                })
            ),
            ...Array.from(
                { length: 6 },
                (_, i) => ({
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(26.95, -53.8 + 25.2 * i))
                })
            ),
            ...Array.from(
                { length: 2 },
                (_, i) => ({
                    color: 0x555555,
                    hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(41.1, -53.8 + 25.2 * i))
                })
            ),
            {
                color: 0x555555,
                hitbox: RectangleHitbox.fromRect(13.15, 24.16, Vec(55.3, -53.8))
            },
            {
                color: 0x555555,
                hitbox: RectangleHitbox.fromRect(27.27, 13.11, Vec(19.83, -73.38))
            },
            {
                color: 0x555555,
                hitbox: RectangleHitbox.fromRect(27.27, 13.11, Vec(48.2, -73.38))
            },
            {
                color: 0x555555,
                hitbox: new PolygonHitbox([
                    Vec(5.05, -40.17),
                    Vec(5.05, -16.47),
                    Vec(-8.06, -16.47),
                    Vec(-8.06, -32.29)
                ])
            },
            {
                color: 0x555555,
                hitbox: new PolygonHitbox([
                    Vec(61.82, -40.67),
                    Vec(61.75, -24.97),
                    Vec(48.71, -16.97),
                    Vec(48.71, -40.73)
                ])
            }
        ],
        floors: [{
            type: FloorNames.Stone,
            hitbox: new PolygonHitbox([
                Vec(5.54, -80.63),
                Vec(62.37, -80.63),
                Vec(62.37, -24.57),
                Vec(48.11, -15.97),
                Vec(34.01, -15.97),
                Vec(34.01, 84.86),
                Vec(-8.82, 84.86),
                Vec(-8.82, -32.87),
                Vec(5.54, -41.2)
            ])
        }],
        floorImages: [
            { key: "barrel_residue", position: Vec(69.75, 42.55), zIndex: ZIndexes.Decals },
            { key: "barrel_residue", position: Vec(24.36, -46.95), zIndex: ZIndexes.Decals },
            { key: "super_barrel_residue", position: Vec(34.44, -55.28), zIndex: ZIndexes.Decals },
            { key: "flint_crate_residue", position: Vec(33.86, -46.16), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(13.58, -51.92), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(1.76, -22.42), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(20.06, -37.77), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(-4.11, -72.35), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(-39.57, -62.76), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(-3.07, 18.8), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(-26.02, -48.71), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(23.68, -6.46), zIndex: ZIndexes.Decals },
            { key: "explosion_decal", position: Vec(63.5, -78.8), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec(66.42, -33.58), zIndex: ZIndexes.Decals },
            { key: "gun_case_residue", position: Vec(63.16, -36.39), zIndex: ZIndexes.Decals, rotation: 1 },
            { key: "grenade_crate_residue", position: Vec(69.81, -34.24), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec(-60.35, -31.87), zIndex: ZIndexes.Decals },
            { key: "outhouse_residue", position: Vec(-60.35, -31.87), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec(40, 50.33), zIndex: ZIndexes.Decals },
            { key: "regular_crate_residue", position: Vec(7.06, 30.07), zIndex: ZIndexes.Decals },
            { key: "large_refinery_barrel_residue", position: Vec(-5.81, 5.18), scale: Vec(0.8, 0.8), zIndex: ZIndexes.Decals }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "roadblock", position: Vec(-44.18, -59.93), rotation: 0 },
            { idString: "roadblock", position: Vec(-59.26, -19.45), rotation: 1 },
            { idString: "roadblock", position: Vec(-46.35, -30.64), rotation: 0 },
            { idString: "roadblock", position: Vec(-25.87, -72.26), rotation: 0 },
            { idString: "roadblock", position: Vec(-31.56, -39.5), rotation: 1 },
            { idString: "roadblock", position: Vec(38.9, 2.88), rotation: 0 },
            { idString: "roadblock", position: Vec(32.42, 50.74), rotation: 0 },
            { idString: "roadblock", position: Vec(47.87, 51.55), rotation: 0 },
            { idString: "roadblock", position: Vec(39.78, 43.6), rotation: 1 },
            { idString: "roadblock", position: Vec(40.44, 57.3), rotation: 1 },
            { idString: "box", position: Vec(-3.68, -68.92) },
            { idString: "box", position: Vec(-10.09, -68.99) },
            { idString: "box", position: Vec(-3.38, -75.34) },

            { idString: "regular_crate", position: Vec(63.13, -15.17) },
            { idString: "ammo_crate", position: Vec(-7.99, 2.28) },
            { idString: "regular_crate", position: Vec(18.06, 27.86) },
            { idString: "regular_crate", position: Vec(-64.29, 76.5) },
            { idString: "regular_crate", position: Vec(65.01, -56.73) },
            { idString: "regular_crate", position: Vec(8.45, -66.79) },

            { idString: "super_barrel", position: Vec(-10.72, -7.93) },
            { idString: "super_barrel", position: Vec(9.13, 40.34) },

            { idString: "super_barrel", position: Vec(70.01, -72.17) },
            { idString: "super_barrel", position: Vec(44.51, 78.15), rotation: 0 },
            { idString: "sandbags", position: Vec(15.15, 17.92), rotation: 0 },
            { idString: "sandbags", position: Vec(-10, 78.77), rotation: 0 },
            { idString: "ammo_crate", position: Vec(44.5, 65), rotation: 1 },
            { idString: "sandbags", position: Vec(31.6, -36.18), rotation: 0 },
            { idString: "sandbags", position: Vec(30.66, -70.69), rotation: 0 },
            { idString: "sandbags", position: Vec(18.54, -67.73), rotation: 1 },
            { idString: "m1117", position: Vec(48.93, -53.75), rotation: 0, variation: 1 },
            { idString: "gun_case", position: Vec(30.66, -28.84), rotation: 0 },
            { idString: "gun_case", position: Vec(19.48, 36.69), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec(16.55, 9.68), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec(33.06, -62.76), rotation: 0 },
            { idString: "grenade_crate", position: Vec(-55.29, 78.02) },
            { idString: "ammo_crate", position: Vec(50.07, -20.07), rotation: 0 },
            { idString: "barrier", position: Vec(13.91, 70.32), rotation: 1 },

            { idString: "fence", position: Vec(70.5, -83.93), rotation: 0 },
            { idString: "box", position: Vec(-21.45, -28.69) },
            { idString: "box", position: Vec(-16.41, -23.86) },

            // top top left
            ...Array.from(
                { length: 10 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-72.1 + 8.45 * i, -83.93),
                    rotation: 0
                })
            ),
            // top middle
            ...Array.from(
                { length: 3 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(23 + 8.45 * i, -83.93),
                    rotation: 0
                })
            ),
            // top right
            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(75.55, -80.45 + 8.45 * i),
                    rotation: 1
                })
            ),
            // right bottom right
            ...Array.from(
                { length: 10 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(75.55, 4.4 + 8.45 * i),
                    rotation: 1
                })
            ),
            // bottom bottom right
            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(45.1 + 8.45 * i, 83.93),
                    rotation: 0
                })
            ),
            // bottom bottom left
            ...Array.from(
                { length: 6 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-58 + 8.45 * i, 83.93),
                    rotation: 0
                })
            ),
            // left bottom left
            ...Array.from(
                { length: 9 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-75.55, 7 + 8.45 * i),
                    rotation: 1
                })
            ),
            // left top left
            ...Array.from(
                { length: 9 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-75.55, -78.85 + 8.45 * i),
                    rotation: 1
                })
            )
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            {
                table: "flint_crate",
                position: Vec(33.86, -46.16)
            },
            {
                table: "bombed_armory_skin",
                position: Vec(33.86, -45.6)
            },
            {
                table: "gun_case",
                position: Vec(63.16, -36.39)
            },
            {
                table: "grenade_crate",
                position: Vec(69.81, -34.24)
            },
            {
                table: "regular_crate",
                position: Vec(7.06, 30.07)
            }
        ]
    },
    {
        idString: "lodge",
        name: "Lodge",
        defType: DefinitionType.Building,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(10, 10, Vec(235.14, 40.53)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(20.05, 57.73)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(-2.67, -4.07)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(-14.9, 15.4)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(9.45, 15.38)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(47, -59.24)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(-47.09, 33.64)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(-47.09, 57.73)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(-26.2, 57.73)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(-3.08, 57.73)),
            RectangleHitbox.fromRect(45.05, 1.55, Vec(-3.17, 57.76)),
            RectangleHitbox.fromRect(1.89, 10.18, Vec(48.1, 36.23)),
            RectangleHitbox.fromRect(1.92, 21.1, Vec(-26.44, -49.7)),
            RectangleHitbox.fromRect(41.7, 1.89, Vec(28.2, 41.01)),
            RectangleHitbox.fromRect(2.96, 2.98, Vec(-8.41, -21.93)),
            RectangleHitbox.fromRect(1.91, 38.19, Vec(21.04, -25.91)),
            RectangleHitbox.fromRect(8.53, 1.89, Vec(17.73, -60.3)),
            RectangleHitbox.fromRect(1.9, 4.8, Vec(21.04, -57.5)),
            RectangleHitbox.fromRect(1.91, 26.33, Vec(-48.17, 18.65)),
            RectangleHitbox.fromRect(1.91, 35.26, Vec(48.12, 2.77)),
            RectangleHitbox.fromRect(1.91, 38.99, Vec(-48.18, -24.78)),
            RectangleHitbox.fromRect(26.19, 1.89, Vec(34.76, -35.84)),
            RectangleHitbox.fromRect(35.43, 1.89, Vec(-14.83, -60.26)),
            RectangleHitbox.fromRect(1.9, 6.28, Vec(-48.15, -58.09)),
            RectangleHitbox.fromRect(1.91, 33.42, Vec(21.04, 23.84)),
            RectangleHitbox.fromRect(5.25, 1.89, Vec(-45.28, -60.29)),
            RectangleHitbox.fromRect(1.9, 11.11, Vec(48.1, -31.23)),
            RectangleHitbox.fromRect(14.65, 1.89, Vec(-20.12, 41.02)),
            RectangleHitbox.fromRect(1.92, 33.2, Vec(-26.48, 23.74)),
            RectangleHitbox.fromRect(21.08, 1.89, Vec(-37.59, 30.88))
        ),
        collideWithLayers: Layers.Adjacent,
        material: "stone",
        spawnHitbox: RectangleHitbox.fromRect(110, 140),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(97.2, 102, Vec(0, -9.5)),
            RectangleHitbox.fromRect(70.5, 18.5, Vec(-13.38, 50))
        ),
        hasSecondFloor: true,
        floors: [
            {
                type: FloorNames.Carpet,
                hitbox: RectangleHitbox.fromRect(16.55, 30.95, Vec(-2.77, 18.55))
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(11.7, 11.48, Vec(29.52, -61.28)),
                    RectangleHitbox.fromRect(98.21, 103.21, Vec(-0.05, -9.65)),
                    RectangleHitbox.fromRect(71.22, 18.04, Vec(-13.5, 50.74)),
                    RectangleHitbox.fromRect(10.25, 11.48, Vec(24.33, 48.98)),
                    RectangleHitbox.fromRect(14.46, 11.48, Vec(-36.61, 61.35))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.36, 5.23, Vec(-37.56, -63.2))
            },
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(11.72, 8.8, Vec(-33.26, 24.86)),
                layer: Layer.ToUpstairs
            }
        ],
        floorImages: [
            {
                key: "lodge_floor_top",
                position: Vec(0, -33.4)
            },
            {
                key: "lodge_floor_bottom",
                position: Vec(0, 33.4)
            }
        ],
        ceilingImages: [
            {
                key: "lodge_second_floor_top",
                position: Vec(0, -30.7)
            },
            {
                key: "lodge_second_floor_bottom",
                position: Vec(0, 29.9)
            },
            {
                key: "lodge_ceiling_top",
                position: Vec(0, -35),
                scale: Vec(2, 2)
            },
            {
                key: "lodge_ceiling_bottom",
                position: Vec(0, 16.85),
                scale: Vec(2, 2)
            }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "lodge_second_floor", position: Vec(0, 0), layer: Layer.Upstairs }
        ],
        obstacles: IS_CLIENT ? undefined : [
            //
            // windows & doors (placed clockwise)
            //

            // ------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // ------------------------------------------------------------------
            { idString: "cobweb", position: Vec(-20.59, -54.47), rotation: 0 },
            { idString: "cobweb", position: Vec(42.33, -30.14), rotation: 3 },
            { idString: "cobweb", position: Vec(-20.75, 35.29), rotation: 1 },
            { idString: "jack_o_lantern", position: Vec(-25.48, -66.63), rotation: 3 },
            { idString: "small_lamp_thingy", position: Vec(-2.41, 18.03) },
            // ------------------------------------------------------------------

            // windows
            { idString: "window", position: Vec(-48.18, 0.04), rotation: 0 },
            { idString: "window", position: Vec(-48.2, -49.57), rotation: 0 },
            { idString: "window", position: Vec(8.08, -60.36), rotation: 1 },
            { idString: "window", position: Vec(48.2, -20.34), rotation: 0 },
            { idString: "window", position: Vec(48.19, 25.82), rotation: 0 },

            // outside doors
            { idString: "door", position: Vec(-37.14, -60.32), rotation: 0 },
            { idString: "door", position: Vec(21.05, -50.48), rotation: 1 },
            { idString: "door", position: Vec(1.86, 41), rotation: 2 },
            { idString: "door", position: Vec(-7.3, 41), rotation: 0 },

            // inside doors
            { idString: "door", position: Vec(-26.44, 2.61), rotation: 3 },
            { idString: "door", position: Vec(-32.98, -27.69), rotation: 2 },
            { idString: "door", position: Vec(-26.41, -33.66), rotation: 3 },
            { idString: "door", position: Vec(27.5, -7.78), rotation: 0 },
            { idString: "door", position: Vec(33.13, 6.87), rotation: 1 },
            { idString: "door", position: Vec(27.5, 13.49), rotation: 0 },

            //
            // walls
            //

            // front entrance
            { idString: "lodge_wall_1", position: Vec(15.5, 15.4), rotation: 0 },
            { idString: "lodge_wall_1", position: Vec(-20.92, 15.4), rotation: 0 },

            // bathroom
            { idString: "lodge_wall_4", position: Vec(39.67, -7.79), rotation: 0 },
            { idString: "lodge_wall_4", position: Vec(39.67, 13.39), rotation: 0 },
            { idString: "lodge_wall_1", position: Vec(33.11, -2.34), rotation: 1 },

            // laundry room
            { idString: "lodge_wall_5", position: Vec(-37.33, -9.94), rotation: 0 },
            { idString: "lodge_wall_7", position: Vec(-26.45, -16), rotation: 1 },
            { idString: "lodge_wall_2", position: Vec(-42.47, -27.75), rotation: 0 },

            // between dining table and couch
            { idString: "lodge_wall_8", position: Vec(6.58, -21.93), rotation: 0 },

            //
            // obstacles
            //

            // front porch
            { idString: "barrel", position: Vec(-32.09, 36.35) },
            { idString: "trash_bag", position: Vec(-38.97, 41.27), rotation: 0 },
            { idString: "box", position: Vec(-42.36, 35.52) },

            // front entrance
            { idString: "red_small_couch", position: Vec(-21.2, 21.81), rotation: 1 },
            { idString: "red_small_couch", position: Vec(15.77, 21.7), rotation: 3 },
            { idString: "large_drawer", position: Vec(-21.38, 33.19), rotation: 1 },
            { idString: "bookshelf", position: Vec(17.37, 33.09), rotation: 1 },

            // living room/main area
            { idString: "small_table", position: Vec(5.5, -5.08), rotation: 1 },
            { idString: "couch_end_left", position: Vec(-1.54, -16.37), rotation: 3 },
            { idString: "couch_part", position: Vec(5.4, -16.69), rotation: 3 },
            { idString: "couch_end_right", position: Vec(12.44, -16.36), rotation: 0 },
            { idString: "small_drawer", position: Vec(16.24, 10.36), rotation: 2 },
            { idString: "potted_plant", position: Vec(-21.04, 10.09) },
            { idString: "bookshelf", position: Vec(-22.83, -18.2), rotation: 1 },

            // big bedroom
            { idString: "bed", position: Vec(30.33, -28.95), rotation: 1 },
            { idString: "small_drawer", position: Vec(43.56, -30.85), rotation: 0 },
            { idString: "bookshelf", position: Vec(40.54, -11.34), rotation: 0 },

            // small bedroom
            { idString: "small_bed", position: Vec(30.64, 35.92), rotation: 1 },
            { idString: "potted_plant", position: Vec(43.19, 35.93) },
            { idString: "bookshelf", position: Vec(40.58, 16.84), rotation: 0 },

            // bathroom
            { idString: randomToilet, position: Vec(40.76, -2.19), rotation: 0 },

            // stairs area
            { idString: "bookshelf", position: Vec(-34.05, -6.26), rotation: 0 },
            { idString: "box", position: Vec(-30.42, 16) },
            { idString: "lodge_railing", position: Vec(0, 0), rotation: 0 },
            { idString: "lodge_stair", position: Vec(-33.26, 24.86), rotation: 0, layer: Layer.ToUpstairs },

            // laundry room
            { idString: "trash_can", position: Vec(-44.02, -14.19), rotation: 0 },
            { idString: "washing_machine", position: Vec(-43.47, -21.73), rotation: 1 },

            // room above laundry room
            { idString: "red_small_couch", position: Vec(-43.33, -33.69), rotation: 1 },
            { idString: "box", position: Vec(-44.24, -40.98) },
            { idString: "bookshelf", position: Vec(-29.82, -52.62), rotation: 1 },

            // kitchen + dining room
            { idString: "kitchen_unit_1", position: Vec(-21.78, -49.79), rotation: 1 },
            { idString: "kitchen_unit_3", position: Vec(-14.56, -55.59), rotation: 0 },
            { idString: "kitchen_unit_2", position: Vec(-22.21, -56.1), rotation: 0 },
            { idString: "fridge", position: Vec(-5.09, -55.81), rotation: 0 },
            { idString: randomSmallStove, position: Vec(-21.74, -42.92), rotation: 1 },
            { idString: "large_table", position: Vec(6.81, -31.59), rotation: 0 },
            { idString: "chair", position: Vec(6.92, -40.01), rotation: 2 },
            { idString: "chair", position: Vec(13.81, -34.49), rotation: 1 },
            { idString: "chair", position: Vec(13.81, -27.38), rotation: 1 },
            { idString: "chair", position: Vec(0.13, -34.49), rotation: 3 },
            { idString: "chair", position: Vec(0.13, -27.38), rotation: 3 },

            // back porch
            { idString: "round_table", position: Vec(41.47, -47.84) },
            { idString: "chair", position: Vec(41.52, -41.77), rotation: 0 },
            { idString: "chair", position: Vec(41.52, -53.97), rotation: 2 },
            { idString: "potted_plant", position: Vec(26.66, -41.09), rotation: 0 }
        ]
    },
    {
        idString: "lodge_second_floor",
        name: "Lodge Second Floor",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "lodge_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(11.73, 1.28, Vec(-41.36, 9.24)),
            RectangleHitbox.fromRect(4, 12.72, Vec(-37.5, 15.09)),
            RectangleHitbox.fromRect(13.47, 1.53, Vec(-2.21, 25.18)),
            RectangleHitbox.fromRect(13.47, 1.51, Vec(-2.57, 11.38)),
            RectangleHitbox.fromRect(1.54, 12.05, Vec(-10.08, 18.39)),
            RectangleHitbox.fromRect(1.54, 12.05, Vec(5.09, 18.24)),
            RectangleHitbox.fromRect(3.01, 3, Vec(9.5, -3.79)),
            RectangleHitbox.fromRect(3.01, 3, Vec(-10.11, 11.35)),
            RectangleHitbox.fromRect(3.01, 3, Vec(5.09, 11.36)),
            RectangleHitbox.fromRect(3.01, 3, Vec(5.09, 25.19)),
            RectangleHitbox.fromRect(3.01, 3, Vec(-10.11, 25.2)),
            RectangleHitbox.fromRect(3.01, 3, Vec(-3.59, -3.8)),
            RectangleHitbox.fromRect(1.91, 57.24, Vec(-26.47, -32.12)),
            RectangleHitbox.fromRect(1.91, 46.22, Vec(21.09, 19.38)),
            RectangleHitbox.fromRect(1.91, 36.84, Vec(-48.15, 13.74)),
            RectangleHitbox.fromRect(1.91, 32.26, Vec(48.17, -18.91)),
            RectangleHitbox.fromRect(1.91, 25.25, Vec(21.09, -48.11)),
            RectangleHitbox.fromRect(1.91, 34.18, Vec(-26.47, 24.4)),
            RectangleHitbox.fromRect(21.82, 1.91, Vec(-37.12, 31.37)),
            RectangleHitbox.fromRect(49.02, 1.91, Vec(-2.91, 41.53)),
            RectangleHitbox.fromRect(27.79, 1.91, Vec(34.02, -3.73)),
            RectangleHitbox.fromRect(46.75, 1.91, Vec(-2.85, -59.79)),
            RectangleHitbox.fromRect(40.23, 1.91, Vec(29, -35.34)),
            RectangleHitbox.fromRect(19.89, 1.91, Vec(-16.31, -35.34)),
            RectangleHitbox.fromRect(23.11, 1.91, Vec(-37.07, -3.73))
        ).transform(Vec(0, -0.4)),
        spawnHitbox: RectangleHitbox.fromRect(105, 130),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(48.4, 101.5, Vec(-2.61, -8.89)),
            RectangleHitbox.fromRect(22.35, 35.02, Vec(-37.24, 13.81)),
            RectangleHitbox.fromRect(29.6, 32.08, Vec(33.77, -19.63))
        ),
        floors: [
            {
                type: FloorNames.Carpet,
                hitbox: RectangleHitbox.fromRect(17.67, 11.63, Vec(0.6, -18.99))
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(48.4, 101.5, Vec(-2.61, -8.89)),
                    RectangleHitbox.fromRect(22.35, 35.02, Vec(-37.24, 13.81)),
                    RectangleHitbox.fromRect(29.6, 32.08, Vec(33.77, -19.63))
                )
            }
        ],
        floorImages: [
            {
                key: "lodge_second_floor_top",
                position: Vec(0, -30.7)
            },
            {
                key: "lodge_second_floor_bottom",
                position: Vec(0, 29.8)
            }
        ],
        ceilingImages: [
            {
                key: "lodge_ceiling_top",
                position: Vec(0, -35),
                scale: Vec(2, 2)
            },
            {
                key: "lodge_ceiling_bottom",
                position: Vec(0, 16.85),
                scale: Vec(2, 2)
            }
        ],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "lodge_secret_room", position: Vec(-2.7, -48) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            // ------------------------------------------------------------------
            // TEMP: Remove if halloween ends.
            // ------------------------------------------------------------------
            { idString: "cobweb", position: Vec(15.32, 35.27), rotation: 2 },
            { idString: "cobweb", position: Vec(-20.76, -54.56), rotation: 0 },
            { idString: "cobweb", position: Vec(-42.44, 1.57), rotation: 0 },
            { idString: "small_lamp_thingy", position: Vec(1.03, -19.13) },
            // ------------------------------------------------------------------

            // near stairs
            { idString: "small_drawer", position: Vec(-43.29, 0.37), rotation: 1 },
            { idString: "door", position: Vec(-26.44, 2.24), rotation: 3 },

            // balcony area
            { idString: "bookshelf", position: Vec(-18.85, 37.54), rotation: 0 },
            { idString: "bookshelf", position: Vec(-6, 37.54), rotation: 0 },
            { idString: "potted_plant", position: Vec(15.46, 35.54), rotation: 0 },
            { idString: "red_small_couch", position: Vec(16.23, 1.76), rotation: 3 },

            // fireplace area
            { idString: "lodge_wall_1", position: Vec(15.55, -4.28), rotation: 0 },
            { idString: "lodge_wall_6", position: Vec(-15.28, -4.28), rotation: 0 },
            { idString: "door", position: Vec(3.41, -4.15), rotation: 0 },
            { idString: "couch_end_right", position: Vec(-21.24, -16.68), rotation: 1 },
            { idString: "couch_part", position: Vec(-15.33, -9.51), rotation: 1 },
            { idString: "couch_corner", position: Vec(-21.68, -9.4), rotation: 1 },
            { idString: "couch_end_left", position: Vec(-8.23, -9.85), rotation: 1 },
            { idString: "fireplace", position: Vec(0.84, -30.75), rotation: 0 },
            { idString: "grenade_box", position: Vec(16.62, -31.92), rotation: 0 },
            { idString: "potted_plant", position: Vec(15.6, -9.61), rotation: 0 },
            { idString: "large_drawer", position: Vec(-15.85, -31.06), rotation: 0 },
            { idString: "tv", position: Vec(-15.94, -34.02), rotation: 1 },

            // bathroom
            { idString: "door", position: Vec(21.13, -20.44), rotation: 1 },
            { idString: "lodge_wall_3", position: Vec(21.15, -10.04), rotation: 1 },
            { idString: "lodge_wall_3", position: Vec(21.15, -29.96), rotation: 1 },
            { idString: "small_drawer", position: Vec(25.85, -30.78), rotation: 0 },
            { idString: "sink2", position: Vec(33.52, -30.95), rotation: 0 },
            { idString: randomToilet, position: Vec(41.73, -30.27), rotation: 0 },
            { idString: randomBathtub, position: Vec(38.2, -9.99), rotation: 0 },
            { idString: "trash_can", position: Vec(25.61, -8.19), rotation: 0 },

            // secret room
            { idString: "lodge_secret_room_wall", position: Vec(0.67, -35.78), rotation: 0 },
            { idString: "regular_crate", position: Vec(-10.13, -53.51), rotation: 0 },
            { idString: "gun_locker", position: Vec(13.19, -56.51), rotation: 0 },
            { idString: "box", position: Vec(-21.82, -39.93), rotation: 0 },
            { idString: "box", position: Vec(-19.8, -45.18), rotation: 0 },
            { idString: "ammo_crate", position: Vec(-11.38, -42.41), rotation: 0 },
            { idString: "bookshelf", position: Vec(13.5, -39.3), rotation: 0 },
            { idString: "gun_mount_m590m", position: Vec(-20.59, -57.46), rotation: 0, lootSpawnOffset: Vec(0, 4) }
        ]
    },
    {
        idString: "lodge_secret_room",
        name: "Lodge Secret Room",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(47.5, 24.5),
        ceilingHitbox: RectangleHitbox.fromRect(47.5, 24.5),
        ceilingImages: [
            {
                key: "lodge_secret_room_ceiling",
                position: Vec(0, 0),
                scale: Vec(8, 8)
            }
        ],
        ceilingHiddenAlpha: 0.45
    },
    {
        idString: "plumpkin_bunker",
        name: "Plumpkin Bunker",
        defType: DefinitionType.Building,
        material: "metal_heavy",
        particle: "bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Equal,
        hitbox: new GroupHitbox(
            // main entrance
            RectangleHitbox.fromRect(2.2, 17.09, Vec(35.58, 82.2)),
            RectangleHitbox.fromRect(45.52, 2.2, Vec(12.94, 128.31)),
            RectangleHitbox.fromRect(32.67, 2.2, Vec(7.67, 114.8)),
            RectangleHitbox.fromRect(2.2, 54.64, Vec(-8.72, 100.99)),
            RectangleHitbox.fromRect(14.19, 2.2, Vec(-1.02, 74.76)),
            RectangleHitbox.fromRect(2.2, 27.13, Vec(35.58, 115.84)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec(16.08, 93.57)),
            RectangleHitbox.fromRect(18.12, 2.2, Vec(26.65, 74.75)),

            // utility entrance (hay shed)
            RectangleHitbox.fromRect(2.01, 17.11, Vec(139.98, -33.33)),
            RectangleHitbox.fromRect(15.15, 2.02, Vec(146.54, -24.82)),
            RectangleHitbox.fromRect(2.01, 17.11, Vec(153.12, -33.33)),

            // emergency entrance
            RectangleHitbox.fromRect(17.11, 2.01, Vec(-145.59, -46.28)),
            RectangleHitbox.fromRect(2.02, 15.15, Vec(-137.08, -52.84)),
            RectangleHitbox.fromRect(17.11, 2.01, Vec(-145.59, -59.42))
        ),
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(150, 150, Vec(13.43, 101.53)),
            RectangleHitbox.fromRect(18, 21, Vec(146.55, -32.85)),
            RectangleHitbox.fromRect(21, 18, Vec(-145.11, -52.85)),

            // hack to prevent pumpkins from spawning in rivers
            new CircleHitbox(5, Vec(34.56, 45.47)),
            new CircleHitbox(5, Vec(-15.32, 11.51)),
            new CircleHitbox(5, Vec(-37.9, 70.13)),
            new CircleHitbox(5, Vec(85.4, 92.41)),
            new CircleHitbox(5, Vec(53.68, 124.53)),
            new CircleHitbox(5, Vec(52.75, 177.7)),
            new CircleHitbox(5, Vec(-1.25, 149.53)),
            new CircleHitbox(5, Vec(-30.64, 120.28)),
            new CircleHitbox(5, Vec(-78.35, 143.03)),
            new CircleHitbox(5, Vec(-124.64, 77.28)),
            new CircleHitbox(5, Vec(-44.87, 186.93)),
            new CircleHitbox(5, Vec(33.95, 221.81)),
            new CircleHitbox(5, Vec(137.84, 147.78)),
            new CircleHitbox(5, Vec(175.47, 111.61)),
            new CircleHitbox(5, Vec(137.14, 21.4)),
            new CircleHitbox(5, Vec(-94.06, 8.14)),
            new CircleHitbox(5, Vec(75.8, -45.12)),
            new CircleHitbox(5, Vec(136.98, 211.13)),
            new CircleHitbox(5, Vec(-40.07, -49.44)),
            new CircleHitbox(5, Vec(-170.08, 137.13)),
            new CircleHitbox(5, Vec(-62.39, 247.93)),
            new CircleHitbox(5, Vec(112.61, 281.56))
        ),
        bunkerSpawnHitbox: RectangleHitbox.fromRect(350, 290),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(45, 54, Vec(13.43, 101.53)),
            RectangleHitbox.fromRect(14, 17, Vec(146.55, -32.85)),
            RectangleHitbox.fromRect(17, 14, Vec(-145.11, -52.85))
        ),
        ceilingZIndex: ZIndexes.ObstaclesLayer3,
        floors: [{
            type: FloorNames.Stone,
            hitbox: RectangleHitbox.fromRect(46.52, 55.74, Vec(13.43, 101.53))
        }],
        floorImages: [
            { key: "plumpkin_bunker_main_entrance_floor", position: Vec(13.43, 101.5) },
            { key: "plumpkin_bunker_entrance_floor", position: Vec(146.55, -32.85), rotation: Math.PI },
            { key: "plumpkin_bunker_entrance_floor", position: Vec(-145.11, -52.85), rotation: Math.PI / 2 }
        ],
        floorZIndex: ZIndexes.BuildingsFloor + 0.5,
        ceilingImages: [
            { key: "plumpkin_bunker_main_entrance_ceiling", position: Vec(13.43, 101.5), scale: Vec(2, 2) },
            { key: "plumpkin_bunker_entrance_ceiling", position: Vec(146.55, -32.85), rotation: Math.PI },
            { key: "plumpkin_bunker_entrance_ceiling", position: Vec(-145.11, -52.85), rotation: Math.PI / 2 }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "plumpkin_bunker_stair", position: Vec(0.39, 121.67), rotation: 0, layer: Layer.ToBasement },
            { idString: "plumpkin_bunker_stair", position: Vec(146.52, -33.84), rotation: 1, layer: Layer.ToBasement },
            { idString: "plumpkin_bunker_stair", position: Vec(-146.1, -52.88), rotation: 2, layer: Layer.ToBasement },

            // emergency entrance
            { idString: "dormant_oak_tree", position: Vec(-144.44, -62.77) },
            { idString: "dormant_oak_tree", position: Vec(-129.73, -51.34) },
            { idString: "dormant_oak_tree", position: Vec(-139.02, -43.52) },
            { idString: "dormant_oak_tree", position: Vec(-155.7, -43.14) },
            { idString: "dormant_oak_tree", position: Vec(-156.96, -60.07) },
            { idString: "dormant_oak_tree", position: Vec(-129.59, -61.37) },

            // main entrance
            { idString: "box", position: Vec(6.76, 109.03) },
            { idString: "regular_crate", position: Vec(-1.21, 91.53) },
            { idString: "regular_crate", position: Vec(-2.14, 81.36) },
            { idString: "ammo_crate", position: Vec(-1.44, 107.44) },
            { idString: "grenade_crate", position: Vec(22.35, 79.86) },
            { idString: "barrel", position: Vec(30.12, 80.17) },
            { idString: "gun_case", position: Vec(14.92, 110.4), rotation: 2 },
            { idString: "metal_auto_door", position: Vec(29.27, 114.78), rotation: 0 },
            // pumpkin patch
            { idString: "large_pumpkin", position: Vec(34.56, 45.47) },
            { idString: "large_pumpkin", position: Vec(-15.32, 11.51) },
            { idString: "large_pumpkin", position: Vec(-37.9, 70.13) },
            { idString: "large_pumpkin", position: Vec(85.4, 92.41) },
            { idString: "large_pumpkin", position: Vec(53.68, 124.53) },
            { idString: "large_pumpkin", position: Vec(52.75, 177.7) },
            { idString: "large_pumpkin", position: Vec(-1.25, 149.53) },
            { idString: "large_pumpkin", position: Vec(-30.64, 120.28) },
            { idString: "large_pumpkin", position: Vec(-78.35, 143.03) },
            { idString: "large_pumpkin", position: Vec(-124.64, 77.28) },
            { idString: "large_pumpkin", position: Vec(-44.87, 186.93) },
            { idString: "large_pumpkin", position: Vec(33.95, 221.81) },
            { idString: "large_pumpkin", position: Vec(137.84, 147.78) },
            { idString: "large_pumpkin", position: Vec(175.47, 111.61) },
            { idString: "large_pumpkin", position: Vec(137.14, 21.4) },
            { idString: "large_pumpkin", position: Vec(-94.06, 8.14) },
            { idString: "large_pumpkin", position: Vec(75.8, -45.12) },
            { idString: "large_pumpkin", position: Vec(136.98, 211.13) },
            { idString: "large_pumpkin", position: Vec(-40.07, -49.44) },
            { idString: "large_pumpkin", position: Vec(-170.08, 137.13) },
            { idString: "large_pumpkin", position: Vec(-62.39, 247.93) },
            { idString: "large_pumpkin", position: Vec(112.61, 281.56) },
            { idString: "vibrant_bush", position: Vec(-19.11, 42.93) },
            { idString: "vibrant_bush", position: Vec(-106.56, 41.65) },
            { idString: "vibrant_bush", position: Vec(-104.52, 119.49) },
            { idString: "vibrant_bush", position: Vec(-122.06, 189.4) },
            { idString: "vibrant_bush", position: Vec(0.57, 229.84) },
            { idString: "vibrant_bush", position: Vec(92.86, 213.36) },
            { idString: "vibrant_bush", position: Vec(187.25, 173.39) },
            { idString: "vibrant_bush", position: Vec(88.89, 135.27) },
            { idString: "vibrant_bush", position: Vec(156.44, 65.25) },
            { idString: "vibrant_bush", position: Vec(95.86, -18.52) },

            // TEMP: Remove if halloween ends.
            { idString: "jack_o_lantern", position: Vec(24.07, 66.73) },
            { idString: "jack_o_lantern", position: Vec(-0.54, 66.73) },
            { idString: "jack_o_lantern", position: Vec(43.69, 84.06) },
            { idString: "jack_o_lantern", position: Vec(43.69, 106.7) }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "hay_shed_4", position: Vec(40.03, 146.55), orientation: 1 },
            { idString: "plumpkin_bunker_main", position: Vec(0, 0), layer: Layer.Basement }
        ]
    },
    {
        idString: "plumpkin_bunker_main",
        name: "Plumpkin Bunker Main",
        defType: DefinitionType.Building,
        material: "metal_heavy",
        particle: "bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        spawnHitbox: RectangleHitbox.fromRect(350, 290),
        sounds: {
            normal: "plumpkin_bunker_ambience",
            position: Vec(119.27, -51.22),
            maxRange: 350,
            falloff: 1
        },
        floorImages: [
            {
                key: "plumpkin_bunker_floor",
                position: Vec(0, 0),
                scale: Vec(1.506, 1.506)
            },

            // TEMP: Remove if halloween ends.
            {
                key: "windowed_vault_door_residue",
                position: Vec(24.88, -104.54),
                zIndex: ZIndexes.DeadObstacles,
                scale: Vec(0.9, 0.9)
            }
        ],
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.01, 49.16, Vec(-89.3, 1.6)),
            RectangleHitbox.fromRect(26.92, 2.01, Vec(-64.74, -21.75)),
            RectangleHitbox.fromRect(1.99, 70.06, Vec(139.89, -60.88)),
            RectangleHitbox.fromRect(83.54, 2, Vec(52.84, 75.19)),
            RectangleHitbox.fromRect(2, 4.38, Vec(-104, -47.53)),
            RectangleHitbox.fromRect(17.01, 1.99, Vec(-144.6, -59.49)),
            RectangleHitbox.fromRect(1.96, 19.04, Vec(-38.12, -47.89)),
            RectangleHitbox.fromRect(5.66, 19.78, Vec(10.43, 35.72)),
            //   RectangleHitbox.fromRect(51.43, 1.67, Vec(-13.39, -56.93)),
            RectangleHitbox.fromRect(87.54, 2, Vec(97.13, -96.08)),
            RectangleHitbox.fromRect(24.64, 2, Vec(0.9, 25.83)),
            RectangleHitbox.fromRect(1.98, 20.08, Vec(52.67, -66.98)),
            RectangleHitbox.fromRect(40.59, 2, Vec(46.12, -56.79)),
            RectangleHitbox.fromRect(12.37, 31.09, Vec(30.73, -42.26)),
            RectangleHitbox.fromRect(12.92, 2, Vec(133.48, -76.02)),
            RectangleHitbox.fromRect(24.24, 2, Vec(104.45, -76.02)),
            RectangleHitbox.fromRect(1.98, 37.97, Vec(153.18, -24.41)),
            RectangleHitbox.fromRect(4.17, 2, Vec(16.37, -104.9)),
            RectangleHitbox.fromRect(20.42, 2, Vec(89.38, -56.78)),
            RectangleHitbox.fromRect(13.2, 2, Vec(133.63, -26.83)),
            RectangleHitbox.fromRect(15.5, 24.12, Vec(-12.77, -115.96)),
            RectangleHitbox.fromRect(14.49, 2, Vec(-44.28, -26.84)),
            RectangleHitbox.fromRect(2.01, 23.51, Vec(-153.18, -70.24)),
            RectangleHitbox.fromRect(27.86, 2.15, Vec(-64.21, -56.71)),
            RectangleHitbox.fromRect(18.56, 1.98, Vec(-68.97, -104.89)),
            RectangleHitbox.fromRect(1.96, 48.84, Vec(99.33, -51.3)),
            RectangleHitbox.fromRect(29.17, 2, Vec(67.27, -76.02)),
            RectangleHitbox.fromRect(96.85, 2, Vec(-12.3, -128.27)),
            RectangleHitbox.fromRect(1.99, 17.42, Vec(52.67, -96.2)),
            RectangleHitbox.fromRect(1.99, 24.16, Vec(35.13, -116.35)),
            RectangleHitbox.fromRect(22.36, 2, Vec(42.49, -104.9)),
            RectangleHitbox.fromRect(1.99, 24.76, Vec(-60.68, -116.89)),
            RectangleHitbox.fromRect(1.99, 24.16, Vec(14.55, -115.97)),
            RectangleHitbox.fromRect(1.99, 24.16, Vec(-40.1, -115.99)),
            RectangleHitbox.fromRect(75.09, 2, Vec(-115.96, -80.99)),
            RectangleHitbox.fromRect(1.91, 7.89, Vec(-78.42, -53.84)),
            RectangleHitbox.fromRect(1.99, 37.13, Vec(-78.37, -86.84)),
            RectangleHitbox.fromRect(9.06, 1.99, Vec(-107.68, -46.33)),
            RectangleHitbox.fromRect(30.46, 1.99, Vec(-137.93, -46.32)),
            RectangleHitbox.fromRect(2.01, 23.05, Vec(-123.7, -58.09)),
            RectangleHitbox.fromRect(13.42, 82.9, Vec(-147.42, 66.29)),
            RectangleHitbox.fromRect(53.8, 2, Vec(-78.11, -50.17)),
            RectangleHitbox.fromRect(61.41, 2, Vec(85.9, -26.84)),
            RectangleHitbox.fromRect(2.01, 73.45, Vec(-153.16, -10.59)),
            RectangleHitbox.fromRect(84.24, 2, Vec(-33.69, 128.28)),
            RectangleHitbox.fromRect(1.96, 19.48, Vec(12.37, -48.03)),
            RectangleHitbox.fromRect(69.78, 24.38, Vec(-109.08, 118.19)),
            RectangleHitbox.fromRect(2.01, 8.2, Vec(-129.22, 79.35)),
            RectangleHitbox.fromRect(41.85, 2, Vec(-98.02, 25.83)),
            RectangleHitbox.fromRect(32.42, 2, Vec(28.5, -26.84)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec(-124.02, 49.94)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec(-10.78, 44.56)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec(-10.77, 65.55)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec(-31.87, 65.48)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec(-31.82, 44.51)),
            RectangleHitbox.fromRect(4.51, 4.51, Vec(-73.25, 49.94)),
            RectangleHitbox.fromRect(2.01, 55.95, Vec(12.29, 0.14)),
            RectangleHitbox.fromRect(78.65, 2, Vec(-90.89, 75.19)),
            RectangleHitbox.fromRect(2.01, 102.12, Vec(-51.28, -5.46)),
            RectangleHitbox.fromRect(34.66, 2, Vec(-49.67, 25.83)),
            RectangleHitbox.fromRect(5.66, 19.78, Vec(10.44, 76.44)),
            RectangleHitbox.fromRect(17.13, 31.24, Vec(-0.15, 100.38)),
            RectangleHitbox.fromRect(60.85, 82.78, Vec(123.02, 33.94)),
            RectangleHitbox.fromRect(2.01, 28.58, Vec(-51.29, 80.83)),
            RectangleHitbox.fromRect(8.96, 2, Vec(-6.94, 85.76)),
            RectangleHitbox.fromRect(18.73, 2, Vec(-41.7, 85.75)),
            RectangleHitbox.fromRect(19.92, 2, Vec(-42.29, 115.8)),
            RectangleHitbox.fromRect(34.7, 2, Vec(-67.64, 94.86)),
            RectangleHitbox.fromRect(2.01, 30.75, Vec(-33.34, 100.84)),
            RectangleHitbox.fromRect(2.01, 8.2, Vec(-83.99, 79.32)),
            RectangleHitbox.fromRect(3.03, 3.03, Vec(-20.53, 100.56)),
            RectangleHitbox.fromRect(18.98, 9.46, Vec(119.57, -41.97)),
            RectangleHitbox.fromRect(18.98, 9.46, Vec(119.57, -60.91)),
            RectangleHitbox.fromRect(16.22, 6.09, Vec(132.23, -92.07)),
            RectangleHitbox.fromRect(13.99, 25.08, Vec(90.87, -42.13)),
            new CircleHitbox(6.43, Vec(44.59, -64.9)),
            new CircleHitbox(10.32, Vec(-40.12, -82.14)),
            new CircleHitbox(10.32, Vec(14.73, -82.06))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14.45, 31.53, Vec(18.97, -42.02)),
            RectangleHitbox.fromRect(26.15, 30.85, Vec(-91.47, -65.47)),
            RectangleHitbox.fromRect(14.45, 31.53, Vec(-44.73, -41.96)),
            RectangleHitbox.fromRect(41.44, 50.28, Vec(119.66, -52.06)),
            RectangleHitbox.fromRect(87.56, 20.07, Vec(96.58, -86.2)),
            RectangleHitbox.fromRect(32.65, 20.07, Vec(-67.85, 85.24)),
            RectangleHitbox.fromRect(16.05, 13.43, Vec(0.39, 121.47)),
            RectangleHitbox.fromRect(48.96, 34.73, Vec(-127.96, -63.52)),
            RectangleHitbox.fromRect(14.45, 31.53, Vec(18.97, -42.02)),
            RectangleHitbox.fromRect(26.15, 30.85, Vec(-91.47, -65.47)),
            RectangleHitbox.fromRect(14.45, 31.53, Vec(-44.73, -41.96)),
            RectangleHitbox.fromRect(41.44, 50.28, Vec(119.66, -52.06)),
            RectangleHitbox.fromRect(87.56, 20.07, Vec(96.58, -86.2)),
            RectangleHitbox.fromRect(32.65, 20.07, Vec(-67.85, 85.24)),
            RectangleHitbox.fromRect(16.05, 13.43, Vec(0.39, 121.47)),
            RectangleHitbox.fromRect(48.96, 34.73, Vec(-127.96, -63.52)),
            RectangleHitbox.fromRect(64.01, 70.98, Vec(-121.09, -10.57)),
            RectangleHitbox.fromRect(49.34, 81.6, Vec(-12.84, -15.94)),
            RectangleHitbox.fromRect(16.81, 52.06, Vec(-42.96, -0.67)),
            RectangleHitbox.fromRect(51.85, 27.66, Vec(-77.15, -35.9)),
            RectangleHitbox.fromRect(296.09, 235.94, Vec(5.94, -10.79)),
            RectangleHitbox.fromRect(68.6, 46.75, Vec(-41.95, 104.97))
        ),
        floors: [
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(14.45, 31.53, Vec(18.97, -42.02)),
                    RectangleHitbox.fromRect(26.15, 30.85, Vec(-91.47, -65.47)),
                    RectangleHitbox.fromRect(14.45, 31.53, Vec(-44.73, -41.96)),
                    RectangleHitbox.fromRect(41.44, 50.28, Vec(119.66, -52.06)),
                    RectangleHitbox.fromRect(87.56, 20.07, Vec(96.58, -86.2)),
                    RectangleHitbox.fromRect(32.65, 20.07, Vec(-67.85, 85.24)),
                    RectangleHitbox.fromRect(16.05, 13.43, Vec(0.39, 121.47)),
                    RectangleHitbox.fromRect(48.96, 34.73, Vec(-127.96, -63.52))
                )
            },
            { // stairs
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(16.07, 11.3, Vec(0.39, 121.67)),
                    RectangleHitbox.fromRect(11.3, 16.07, Vec(146.52, -33.84)),
                    RectangleHitbox.fromRect(16.07, 11.3, Vec(-146.1, -52.88))
                ),
                layer: Layer.ToBasement
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(64.01, 70.98, Vec(-121.09, -10.57)),
                    RectangleHitbox.fromRect(49.34, 81.6, Vec(-12.84, -15.94)),
                    RectangleHitbox.fromRect(16.81, 52.06, Vec(-42.96, -0.67)),
                    RectangleHitbox.fromRect(51.85, 27.66, Vec(-77.15, -35.9))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(296.09, 235.94, Vec(5.94, -10.79)),
                    RectangleHitbox.fromRect(68.6, 46.75, Vec(-41.95, 104.97))
                )
            }
        ],
        puzzle: {
            triggerOnSolve: "blue_metal_auto_door",
            solvedSound: true,
            soundPosition: Vec(-95.68, 46.52),
            setSolvedImmediately: true,
            delay: 1000
        },
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "plumpkin_bunker_skin", position: Vec(-49.23, -110.21) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            // security office
            { idString: "blue_metal_auto_door", position: Vec(-33.27, 122.05), rotation: 3 },
            { idString: "blue_metal_auto_door", position: Vec(-135.45, 75.18), rotation: 2 },
            { idString: "cabinet", position: Vec(-92.46, 78.93), rotation: 0 },
            { idString: "cabinet", position: Vec(-120.63, 78.99), rotation: 0 },
            { idString: "gun_locker", position: Vec(-106.58, 78.99), rotation: 0 },
            { idString: "ammo_crate", position: Vec(-107.64, 100.57), rotation: 0 },
            { idString: "barrel", position: Vec(-116.75, 101.47), rotation: 0 },
            { idString: "gun_case", position: Vec(-135.03, 102.56), rotation: 2 },
            { idString: "door", position: Vec(-75.25, 100.5), rotation: 1 },
            { idString: "grenade_crate", position: Vec(-70.23, 113.01) },
            { idString: "flint_crate", position: Vec(-69.01, 122.1) },
            { idString: "grey_office_chair", position: Vec(-46.79, 104.25), rotation: 1 },
            { idString: "potted_plant", position: Vec(-38.35, 90.99), rotation: 0 },
            { idString: "control_panel_small", position: Vec(-46.14, 91.33), rotation: 0 },
            { idString: "desk_right", position: Vec(-40.79, 104.56), rotation: 3 },
            { idString: "pipe", position: Vec(-136.1, 95.9), rotation: 0, variation: 3 },

            // vault
            { idString: "metal_door", position: Vec(-84.12, 88.37), rotation: 1 },
            {
                idString: { gun_mount_dual_rsh12: 0.1, gun_mount_mini14: 1, gun_mount_m590m: 0.2 },
                position: Vec(-54.09, 84.63),
                rotation: 3,
                lootSpawnOffset: Vec(-4, 0)
            },
            { idString: "regular_crate", position: Vec(-62.71, 81.57) },
            { idString: { box: 1, grenade_box: 1 }, position: Vec(-66.18, 89.31) },
            { idString: { box: 1, grenade_box: 1 }, position: Vec(-60.05, 90.57) },
            { idString: "trash_can", position: Vec(-79.69, 79.48) },

            // center area with plumpkin logo
            { idString: "metal_auto_door", position: Vec(8.67, 61.27), rotation: 1 },
            { idString: "metal_auto_door", position: Vec(8.67, 50.87), rotation: 3 },
            { idString: "metal_auto_door", position: Vec(-51.27, 50.83), rotation: 3 },
            { idString: "metal_auto_door", position: Vec(-51.27, 61.31), rotation: 1 },
            { idString: "metal_auto_door", position: Vec(-16.65, 25.89), rotation: 2 },
            { idString: "metal_auto_door", position: Vec(-27.13, 25.89), rotation: 0 },
            { idString: "metal_auto_door", position: Vec(-27.13, 85.62), rotation: 0 },
            { idString: "metal_auto_door", position: Vec(-16.65, 85.62), rotation: 2 },
            { idString: "couch", position: Vec(-31.89, 54.94), rotation: 0 },
            { idString: "couch", position: Vec(-10.72, 54.94), rotation: 2 },
            { idString: "potted_plant", position: Vec(-45.97, 80.45) },
            { idString: "potted_plant", position: Vec(-45.46, 31.26) },
            { idString: "potted_plant", position: Vec(3.11, 31.37) },
            { idString: "water_cooler", position: Vec(3.65, 81.22), rotation: 2 },
            { idString: "trash_can", position: Vec(-3.25, 81.24) },

            // west office
            { idString: "square_desk", position: Vec(-98.23, 50.04), rotation: 0 },
            { idString: "button", position: Vec(-95.68, 46.52), rotation: 3, variation: 1, puzzlePiece: true },
            { idString: "bookshelf", position: Vec(-110.44, 29.36), rotation: 0 },
            { idString: "bookshelf", position: Vec(-97.48, 29.36), rotation: 0 },
            { idString: "bookshelf", position: Vec(-109.18, 71.58), rotation: 0 },
            { idString: "white_small_couch", position: Vec(-57.77, 70.03), rotation: 2 },
            { idString: "small_drawer", position: Vec(-66.36, 70.25), rotation: 2 },
            { idString: "water_cooler", position: Vec(-119.28, 70.58), rotation: 2 },
            { idString: "filing_cabinet", position: Vec(-126.68, 70.11), rotation: 2 },
            { idString: "large_drawer", position: Vec(-59.14, 30.99), rotation: 0 },

            // bathroom
            { idString: "door", position: Vec(-71.61, 25.97), rotation: 0 },
            { idString: "sink2", position: Vec(-56.09, 20.93), rotation: 3 },
            { idString: "sink2", position: Vec(-56.09, 13.38), rotation: 3 },
            { idString: "hq_toilet_paper_wall", position: Vec(-61.88, 7.31), rotation: 2 },
            { idString: "hq_toilet_paper_wall", position: Vec(-61.88, -7.65), rotation: 2 },
            { idString: "door2", position: Vec(-70.58, 2.03), rotation: 1 },
            { idString: "door2", position: Vec(-70.58, -13.1), rotation: 1 },
            { idString: randomToilet, position: Vec(-57.06, 0.82), rotation: 3 },
            { idString: randomToilet, position: Vec(-57.06, -14.38), rotation: 3 },
            { idString: "headquarters_wall_7", position: Vec(-70.63, -18.9), rotation: 1 },
            { idString: "headquarters_wall_7", position: Vec(-70.63, -3.71), rotation: 1 },
            { idString: "potted_plant", position: Vec(-83.85, 20.77) },
            { idString: "door", position: Vec(-82.81, -21.71), rotation: 0 },

            // sleeping quarters
            { idString: "metal_door", position: Vec(-117.2, -46.26), rotation: 0 },
            { idString: "bookshelf", position: Vec(-96.31, -46.66), rotation: 0 },
            { idString: "potted_plant", position: Vec(-56.67, -27.04) },
            { idString: "bunk_bed", position: Vec(-57.95, -39.8), rotation: 0 },
            { idString: "bunk_bed", position: Vec(-80.86, -43.68), rotation: 1 },
            { idString: "bunk_bed", position: Vec(-99.45, -19.03), rotation: 3 },
            { idString: "bunk_bed", position: Vec(-99.45, 0.49), rotation: 3 },
            { idString: "bunk_bed", position: Vec(-99.45, 19.14), rotation: 3 },
            { idString: "small_table", position: Vec(-135.52, -30.65), rotation: 1 },
            { idString: "large_drawer", position: Vec(-140.88, -17.35), rotation: 2 },
            { idString: "tv", position: Vec(-140.91, -14.46), rotation: 3 },
            { idString: "couch_end_left", position: Vec(-147.63, -34.07), rotation: 0 },
            { idString: "couch_corner", position: Vec(-148.05, -41.34), rotation: 0 },
            { idString: "couch_part", position: Vec(-141.7, -41.19), rotation: 3 },
            { idString: "couch_end_right", position: Vec(-134.71, -40.81), rotation: 0 },
            { idString: "house_column", position: Vec(-129.67, -12.68) },
            { idString: "house_column", position: Vec(-129.67, 9.58) },
            { idString: "headquarters_wall_2", position: Vec(-141.6, -12.63), rotation: 0 },
            { idString: "headquarters_wall_2", position: Vec(-141.6, 9.58), rotation: 0 },
            { idString: "cabinet", position: Vec(-144.6, -8.7), rotation: 0 },
            { idString: "cabinet", position: Vec(-144.6, 5.74), rotation: 2 },
            { idString: "small_drawer", position: Vec(-148.13, 14.18), rotation: 1 },
            { idString: "water_cooler", position: Vec(-148.65, 20.95), rotation: 1 },
            { idString: "glass_door", position: Vec(-135.25, 25.85), rotation: 0 },
            { idString: "glass_door", position: Vec(-124.42, 25.85), rotation: 2 },

            // northwest entrance/fire hatchet area
            { idString: "fire_hatchet_case", position: Vec(-119.35, -63.03), rotation: 1 },
            { idString: "ammo_crate", position: Vec(-99.92, -56.44), rotation: 0 },
            { idString: "ammo_crate", position: Vec(-99.92, -74.76), rotation: 0 },
            { idString: "cabinet", position: Vec(-87, -53.95), rotation: 2 },
            { idString: "barrel", position: Vec(-90.56, -75.38) },
            { idString: "metal_door", position: Vec(-123.69, -74.57), rotation: 3 },
            { idString: { box: 1, grenade_box: 1 }, position: Vec(-139.01, -73.68) },
            { idString: "regular_crate", position: Vec(-146.74, -75.09) },
            { idString: "bookshelf", position: Vec(-145.4, -62.95), rotation: 0 },
            { idString: "pipe", position: Vec(-145.31, -71.6), rotation: 0, variation: 2 },

            // lab
            // { idString: "pumpkin", position: Vec(-47.26, -117.89), rotation: 0 },// VVVVVV
            // { idString: "pumpkin", position: Vec(-53.98, -114.99), rotation: 0 }, // re-add when halloween ends
            { idString: "baby_plumpkin", position: Vec(-34.18, -111.23), rotation: 0 },
            { idString: "baby_plumpkin", position: Vec(-26.74, -114.57), rotation: 0 },
            { idString: "baby_plumpkin", position: Vec(-31.39, -120.37), rotation: 0 },
            { idString: "plumpkin", position: Vec(3.67, -115.06), rotation: 0 },
            { idString: "diseased_plumpkin", position: Vec(24.92, -114.04), rotation: 0 },
            { idString: "bulletproof_window", position: Vec(-50.37, -104.85), rotation: 0 },
            { idString: "bulletproof_window", position: Vec(-29.8, -104.85), rotation: 0 },
            { idString: "bulletproof_window", position: Vec(4.32, -104.85), rotation: 0 },
            // { idString: "windowed_vault_door", position: Vec(24.88, -104.54), rotation: 2 }, // disabled for halloween only

            // ------------------------------------------------------------------
            // TEMP: Remove if halloween ends. (dont forget to re-enable windowed vault door)
            // ------------------------------------------------------------------
            { idString: {
                pumpkin: 1,
                diseased_mini_plumpkin: 0.7
            }, position: Vec(-47.26, -117.89) },
            { idString: {
                pumpkin: 1,
                diseased_mini_plumpkin: 0.7,
                golden_pumpkin: 0.15
            }, position: Vec(-53.98, -114.99) },
            { idString: "cobweb", position: Vec(-72.69, -99.3), rotation: 0 },
            { idString: "cobweb", position: Vec(29.57, -122.53), rotation: 3 },
            { idString: "cobweb", position: Vec(-45.48, 20.04), rotation: 1 },
            { idString: "cobweb", position: Vec(2.71, 79.89), rotation: 2 },
            { idString: "cobweb", position: Vec(-147.43, -40.53), rotation: 0 },
            { idString: "cobweb", position: Vec(-57.19, -27.53), rotation: 2 },
            { idString: "cobweb", position: Vec(-54.92, -122.6), rotation: 0 },
            { idString: "cobweb", position: Vec(134.05, -70.22), rotation: 3 },
            { idString: "cobweb", position: Vec(93.55, -32.66), rotation: 2 },
            { idString: "cobweb", position: Vec(41.6, -51.01), rotation: 0 },
            { idString: "cobweb", position: Vec(87.78, 69.43), rotation: 2 },
            { idString: "graveyard_light", position: Vec(104.29, -31.55) },
            { idString: "graveyard_light", position: Vec(41.53, -41.31) },
            { idString: "graveyard_light", position: Vec(50.93, 52.3) },
            { idString: "graveyard_light", position: Vec(-86.09, 31.62) },
            { idString: "graveyard_light", position: Vec(-99.08, -8.79) },
            { idString: "graveyard_light", position: Vec(-99.08, 10.38) },
            { idString: "graveyard_light", position: Vec(-3.5, 20.83) },
            { idString: "small_lamp_thingy", position: Vec(-20.99, 54.89) },
            // ------------------------------------------------------------------

            { idString: "control_panel2", position: Vec(-12.74, -99.53), rotation: 0 },
            { idString: "control_panel_small", position: Vec(-0.04, -81.91), rotation: 3 },
            { idString: "control_panel_small", position: Vec(-25.47, -81.91), rotation: 1 },
            { idString: "gun_case", position: Vec(48.34, -98.34), rotation: 3 },
            { idString: "regular_crate", position: Vec(-71.7, -97.79) },
            { idString: "barrel", position: Vec(-71.84, -88.09) },

            // main office/control room
            { idString: "window2", position: Vec(-32.06, -57.7), rotation: 1 },
            { idString: "window2", position: Vec(-22.38, -57.7), rotation: 1 },
            { idString: "window2", position: Vec(-12.81, -57.7), rotation: 1 },
            { idString: "window2", position: Vec(-3.19, -57.7), rotation: 1 },
            { idString: "window2", position: Vec(6.39, -57.7), rotation: 1 },
            { idString: "desk_right", position: Vec(1.15, -49.64), rotation: 0 },
            { idString: "desk_right", position: Vec(-43.83, -15.7), rotation: 1 },
            { idString: "desk_left", position: Vec(-43.86, 14.69), rotation: 1 },
            { idString: "desk_left", position: Vec(4.98, -7.99), rotation: 3 },
            { idString: "potted_plant", position: Vec(7.24, -24.14) },
            { idString: "potted_plant", position: Vec(-46.06, 0.73) },
            { idString: "bookshelf", position: Vec(8.73, 11.05), rotation: 1 },
            { idString: "water_cooler", position: Vec(7.71, 20.97), rotation: 3 },
            { idString: "grey_office_chair", position: Vec(-28.19, -45.52), rotation: 2 },
            { idString: "grey_office_chair", position: Vec(-6.76, -40.38), rotation: 2 },
            { idString: "grey_office_chair", position: Vec(-38.13, -14.42), rotation: 3 },
            { idString: "grey_office_chair", position: Vec(-38.3, 13.36), rotation: 3 },
            { idString: "grey_office_chair", position: Vec(-0.35, -5.96), rotation: 1 },
            { idString: "file_cart", position: Vec(-21.24, -6.17), rotation: 3 },
            { idString: "headquarters_wall_4", position: Vec(3.21, -19.2), rotation: 0 },
            { idString: "headquarters_wall_4", position: Vec(3.21, 3.27), rotation: 0 },
            { idString: "house_column", position: Vec(-6.3, -19.07) },
            { idString: "house_column", position: Vec(-6.3, 3.22) },
            { idString: "house_wall_15", position: Vec(-44.24, -4.36), rotation: 0 },

            // northeast hall
            { idString: "gun_locker", position: Vec(60.72, -92.17), rotation: 0 },
            { idString: "ammo_crate", position: Vec(99.91, -82.15), rotation: 0 },
            { idString: "barrel", position: Vec(109.1, -81.6) },
            { idString: "regular_crate", position: Vec(133.93, -82.06) },

            // generator room
            { idString: "metal_door", position: Vec(87.38, -76.06), rotation: 0 },
            { idString: "cabinet", position: Vec(95.36, -66.43), rotation: 3 },
            { idString: { box: 1, grenade_box: 1 }, position: Vec(56.68, -71.05) },
            { idString: { box: 1, grenade_box: 1 }, position: Vec(62.1, -69.57) },
            { idString: "barrel", position: Vec(58.34, -62.63) },
            { idString: "grenade_crate", position: Vec(69.29, -32.1) },
            { idString: "flint_crate", position: Vec(42.41, -50.77) },
            { idString: "super_barrel", position: Vec(51.32, -51.37) },
            { idString: "metal_door", position: Vec(49.71, -26.82), rotation: 2 },

            // server room
            { idString: "metal_auto_door", position: Vec(121.81, -26.84), rotation: 2 },
            { idString: "metal_auto_door", position: Vec(121.81, -76.09), rotation: 2 },

            // storage room
            { idString: "flint_crate", position: Vec(87.15, 68.99) },
            { idString: "box", position: Vec(89.08, 61.01) },
            { idString: "dumpster", position: Vec(36.91, 69.82), rotation: 1 },
            { idString: "dumpster", position: Vec(21.47, 69.82), rotation: 1 },
            { idString: "metal_column", position: Vec(60.08, 61.85) },
            { idString: "fence", position: Vec(60.06, 55.91), rotation: 1 },
            { idString: "fence", position: Vec(60.06, 47.33), rotation: 1 },
            { idString: "metal_column", position: Vec(60.07, 41.38) },
            { idString: "fence", position: Vec(66.12, 41.4), rotation: 0 },
            { idString: "fence", position: Vec(74.84, 41.4), rotation: 0 },
            { idString: "metal_column", position: Vec(80.84, 41.38) },
            { idString: "pallet", position: Vec(67.03, 47.59), rotation: 0 },
            { idString: "regular_crate", position: Vec(67.03, 47.59) },
            { idString: "ammo_crate", position: Vec(67.03, 57.66) },
            { idString: "super_barrel", position: Vec(77.21, 47.24) },
            { idString: "regular_crate", position: Vec(74.57, 35.05) },
            { idString: "pallet", position: Vec(62.56, 20.04), rotation: 0 },
            { idString: "barrel", position: Vec(62.56, 20.04) },
            { idString: "forklift", position: Vec(62.8, 8.65), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec(89.08, -2.13), rotation: 1 },
            { idString: "ammo_crate", position: Vec(87.34, 8.05) },
            { idString: "pallet", position: Vec(86.93, 18.37), rotation: 0 },
            { idString: "box", position: Vec(89.48, 15.5) },
            { idString: "grenade_box", position: Vec(89.48, 20.5) },
            { idString: "box", position: Vec(84.67, 17) },
            { idString: "pallet", position: Vec(18.72, 33.04), rotation: 0 },
            { idString: "grenade_crate", position: Vec(18.72, 33.04) },
            { idString: "tear_gas_crate", position: Vec(28.84, 31.97), rotation: 2 },
            { idString: "fence", position: Vec(17.78, 27.01), rotation: 0 },
            { idString: "fence", position: Vec(26.31, 27.01), rotation: 0 },
            { idString: "fence", position: Vec(34.89, 27.01), rotation: 0 },
            { idString: "metal_column", position: Vec(40.81, 27.01) },
            { idString: "fence", position: Vec(40.81, 21.09), rotation: 1 },
            { idString: "fence", position: Vec(40.81, 12.54), rotation: 1 },
            { idString: "metal_column", position: Vec(40.81, 6.7) },
            { idString: "regular_crate", position: Vec(34.25, 20.86) },
            { idString: "barrel", position: Vec(25.17, 21.72) },
            { idString: "pallet", position: Vec(34.06, 11.22), rotation: 0 },
            { idString: "box", position: Vec(31.62, 12.37) },
            { idString: "box", position: Vec(36.45, 10.32) },
            { idString: "fence", position: Vec(40.81, -21.44), rotation: 1 },
            { idString: "fence", position: Vec(40.81, -12.78), rotation: 1 },
            { idString: "metal_column", position: Vec(40.81, -6.88) },
            { idString: "box", position: Vec(34.57, -20.63) },
            { idString: "ammo_crate", position: Vec(26, -20.63) },
            { idString: "pallet", position: Vec(18.07, -4.83), rotation: 1 },
            { idString: "gun_case", position: Vec(18.07, -4.83), rotation: 1 },
            { idString: "ammo_crate", position: Vec(63.73, -20.65) },
            { idString: "barrel", position: Vec(73.17, -21.67) },
            { idString: "pipe", position: Vec(106.85, -16.65), rotation: 0, variation: 4 }, // why does dv hate this? (variation: 4)
            { idString: "pipe", position: Vec(62.22, -86.05), rotation: 0, variation: 1 },
            { idString: "ammo_crate", position: Vec(107.16, -12.64) },
            { idString: "ammo_crate", position: Vec(134.15, -20.66) },
            { idString: "melee_crate", position: Vec(17.17, -21.35) }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "detector", position: Vec(13.82, -100.67), orientation: 2 },
            { idString: "detector", position: Vec(27.24, -100.67), orientation: 2 },
            { idString: "plumpkin_bunker_second_puzzle", position: Vec(0, 0) },
            { idString: "plumpkin_bunker_third_puzzle", position: Vec(0, 0) },
            { idString: "plumpkin_bunker_vault", position: Vec(0, 0) }
        ]
    },
    {
        idString: "plumpkin_bunker_second_puzzle",
        name: "Plumpkin Bunker Second Puzzle",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(104.67, 37.14, Vec(0, -75.62)),
        sounds: {
            normal: "plumpkin_bunker_pump_ambience",
            solved: "plumpkin_bunker_pump_ambience",
            position: Vec(-13.28, -81.95),
            maxRange: 250,
            falloff: 0.5
        },
        floorImages: [
            { key: "plumpkin_bunker_large_mixing_stick", position: Vec(14.75, -82.03), spinSpeed: -0.032 },
            { key: "plumpkin_bunker_large_mixing_stick", position: Vec(-40.11, -82.03), spinSpeed: -0.032 },
            { key: "plumpkin_bunker_small_mixing_stick", position: Vec(44.62, -64.92), spinSpeed: -0.032 },
            { key: "plumpkin_bunker_large_mixing_frame", position: Vec(14.75, -82.03) },
            { key: "plumpkin_bunker_large_mixing_frame", position: Vec(-40.11, -82.03) },
            { key: "plumpkin_bunker_small_mixing_frame", position: Vec(44.62, -64.92) }
        ],
        puzzle: {
            triggerOnSolve: "red_metal_auto_door",
            delay: 1000
        },
        obstacles: IS_CLIENT ? undefined : [
            { idString: "red_metal_auto_door", position: Vec(-78.35, -63.04), rotation: 3 },
            { idString: "red_metal_auto_door", position: Vec(52.68, -82.25), rotation: 3 },
            { idString: "red_metal_auto_door", position: Vec(12.34, -33.03), rotation: 3 },
            { idString: "red_metal_auto_door", position: Vec(-38.1, -33.03), rotation: 3 },
            { idString: "headquarters_security_desk", position: Vec(-22.75, -52.96), rotation: 2, puzzlePiece: true }
        ]
    },
    {
        idString: "plumpkin_bunker_third_puzzle",
        name: "Plumpkin Bunker Third Puzzle",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(104.67, 37.14, Vec(0, -75.62)),
        sounds: {
            solved: "recorder_buzz",
            position: Vec(40.55, -32.63),
            maxRange: 200,
            falloff: 2
        },
        puzzle: {
            triggerOnSolve: "recorder",
            delay: 2000
        },
        obstacles: IS_CLIENT ? undefined : [
            { idString: "generator", position: Vec(78.21, -32.55), rotation: 0, puzzlePiece: true },
            { idString: "recorder", position: Vec(40.55, -32.63), rotation: 1 }
        ]
    },
    {
        idString: "plumpkin_bunker_vault",
        name: "Plumpkin Bunker Vault",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(33.39, 20.34, Vec(-67.67, 85.03)),
        ceilingHitbox: RectangleHitbox.fromRect(33.39, 20.34, Vec(-67.67, 85.03)),
        ceilingImages: [{
            key: "plumpkin_bunker_vault_ceiling",
            position: Vec(-67.67, 85.03)
        }]
    },

    {
        idString: "christmas_camp",
        name: "Christmas Camp",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(150, 75, Vec(0, -1)),
        obstacles: IS_CLIENT ? undefined : [
            { idString: "christmas_tree", position: Vec(0, 0) },
            { idString: "ice_pick_case", position: Vec(65.8, 24.41), rotation: 3 },
            { idString: "regular_crate", position: Vec(64.3, -10.79), outdoors: true },
            { idString: "regular_crate", position: Vec(51.78, -23.32), outdoors: true },
            { idString: randomCelebrationWinterTree, position: Vec(-60.37, 23.31) },
            { idString: randomCelebrationWinterTree, position: Vec(-56.15, 0.58) },
            { idString: "pine_tree", position: Vec(54.24, -12.53) },
            { idString: "box", position: Vec(-44.79, 21.76), outdoors: true },
            { idString: "box", position: Vec(-40.17, 15.6), outdoors: true },
            { idString: randomBarrel, position: Vec(-65.99, -14.17), outdoors: true },
            { idString: "office_chair", position: Vec(38.01, 15.69), rotation: 0 },
            { idString: "fire_pit", position: Vec(35.73, -6.19) },
            { idString: { frozen_crate: 1, regular_crate_winter: 1 }, position: Vec(0.4, -32.01) },
            { idString: { frozen_crate: 0.25, regular_crate_winter: 1, grenade_crate_winter: 0.5, barrel_winter: 0.5 }, position: Vec(-27.8, 29.06) },
            { idString: "blueberry_bush", position: Vec(67.77, -31.64) },
            { idString: "bush", position: Vec(-23.21, -25.42) },
            { idString: { frozen_crate: 0.25, regular_crate_winter: 1, box_winter: 0.5 }, position: Vec(-66.54, 10.5) },

            { idString: randomCelebrationWinterTree, position: Vec(22.07, 31.78) },
            { idString: "box", position: Vec(13.6, 34.06), outdoors: true },

            // Hidden gift(s)
            { idString: randomGift, position: Vec(-67.1, -32.45) },
            { idString: randomGift, position: Vec(49.29, -7.59) },

            // Around the christmas tree (gift placements)
            ...pickRandomInArray([
                [
                    { idString: randomGift, position: Vec(-8.77, -8.43) },
                    { idString: randomGift, position: Vec(8.77, -8.43) },
                    { idString: randomGift, position: Vec(-8.77, 8.43) },
                    { idString: randomGift, position: Vec(8.77, 8.43) },
                    { idString: randomGift, position: Vec(-12, 0) },
                    { idString: randomGift, position: Vec(12, 0) }
                ],
                [
                    { idString: randomGift, position: Vec(-12, 0) },
                    { idString: randomGift, position: Vec(12, 0) },
                    { idString: randomGift, position: Vec(0, -12) },
                    { idString: randomGift, position: Vec(0, 12) }
                ],
                [
                    { idString: randomGift, position: Vec(-9.85, -10.12) },
                    { idString: randomGift, position: Vec(9.85, -10.12) },
                    { idString: randomGift, position: Vec(-9.85, 10.12) },
                    { idString: randomGift, position: Vec(9.85, 10.12) }
                ]
            ])
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "shed_1", position: Vec(22, -55), orientation: 3 },
            {
                idString: {
                    container_3: 1,
                    container_4: 1,
                    container_5: 1,
                    container_6: 1
                }, position: Vec(30, -58), orientation: 1
            }
        ]
    },

    // Normal Mode Only
    riverHut(1, [
        { idString: "small_bed", position: Vec(-10.55, -9.38), rotation: 0 },
        { idString: "small_drawer", position: Vec(-3.48, -13.6), rotation: 0 },
        { idString: "small_table", position: Vec(9.54, 11.44), rotation: 0 },
        { idString: "chair", position: Vec(5.1, 11.44), rotation: 3 },
        { idString: "box", position: Vec(11.66, 0.14) },
        { idString: "box", position: Vec(6.84, 2.69) },
        { idString: "flint_crate", position: Vec(31.58, -22.6), outdoors: true },
        { idString: "barrel", position: Vec(31.49, 11.78), outdoors: true }
    ]),

    riverHut(2, [
        { idString: "trash_bag", position: Vec(-19.99, -5.03), outdoors: true },
        { idString: "barrel", position: Vec(-21.27, 2.62), outdoors: true },
        { idString: "regular_crate", position: Vec(31.56, -21.66), outdoors: true },
        { idString: "box", position: Vec(33.9, 9.33), outdoors: true },
        { idString: "box", position: Vec(29.16, 13.99), outdoors: true },
        { idString: "small_bed", position: Vec(-5.89, -13.83), rotation: 3 },
        { idString: "box", position: Vec(-11.56, -5.55) },
        { idString: "box", position: Vec(-6.56, -7.35) },
        { idString: "small_table", position: Vec(9.86, 4.59), rotation: 0 },
        { idString: "chair", position: Vec(5.72, 4.59), rotation: 3 },
        { idString: "small_drawer", position: Vec(10.49, 14.3), rotation: 3 },
        { idString: "trash_can", position: Vec(-10.86, 2.48) }
    ]),

    riverHut(3, [
        { idString: "small_bed", position: Vec(-10.55, -9.38), rotation: 0 },
        { idString: "large_drawer", position: Vec(-0.26, -13.52), rotation: 0 },
        { idString: "small_table", position: Vec(8.01, 13.4), rotation: 1 },
        { idString: "chair", position: Vec(8.01, 9.7), rotation: 2 },
        { idString: "trash_can", position: Vec(-1.69, 14.64) },
        { idString: "potted_plant", position: Vec(-10.31, 3.33), rotation: 0 },
        { idString: "barrel", position: Vec(-21.06, -2.26), outdoors: true },
        { idString: "box", position: Vec(-19.46, 4.73), outdoors: true },
        { idString: "grenade_box", position: Vec(28.14, 4.01), outdoors: true },
        { idString: "super_barrel", position: Vec(31.58, -22.6), outdoors: true },
        { idString: "regular_crate", position: Vec(31.49, 11.3), outdoors: true }
    ]),

    // Fall Mode Only
    riverHut(4, [
        { idString: "small_bed", position: Vec(-10.55, -9.38), rotation: 0 },
        { idString: "cooler", position: Vec(-1.83, -14.4), rotation: 0 },
        { idString: "small_table", position: Vec(9.54, 11.44), rotation: 0 },
        { idString: "chair", position: Vec(5.1, 11.44), rotation: 3 },
        { idString: "small_drawer", position: Vec(10.11, 1.69), rotation: 3 },
        { idString: "box", position: Vec(-2.92, -22.55), outdoors: true },
        { idString: "propane_tank", position: Vec(1.77, -22.01), outdoors: true },
        { idString: "box", position: Vec(7.39, 22.27), outdoors: true },
        { idString: "box", position: Vec(2.62, 24.11), outdoors: true },
        { idString: "barrel", position: Vec(-4.58, 24.41), outdoors: true },
        { idString: "super_barrel", position: Vec(31.59, -22.89), outdoors: true }
    ]),

    riverHut(5, [
        { idString: "small_bed", position: Vec(-5.74, -13.61), rotation: 3 },
        { idString: "cooler", position: Vec(-11.12, -4.91), rotation: 1 },
        { idString: "small_table", position: Vec(9.76, 4.3), rotation: 0 },
        { idString: "chair", position: Vec(5.64, 4.3), rotation: 3 },
        { idString: "small_drawer", position: Vec(10.51, 14.23), rotation: 3 },
        { idString: "barrel", position: Vec(-20.58, 0.31), outdoors: true },
        { idString: "box", position: Vec(-19.47, -6.71), outdoors: true },
        { idString: "box", position: Vec(-21, -12), outdoors: true },
        { idString: "box", position: Vec(2.19, 22.4), outdoors: true },
        { idString: "propane_tank", position: Vec(-2.64, 21.93), outdoors: true }
    ]),

    riverHut(6, [
        { idString: "small_bed", position: Vec(-10.55, -9.38), rotation: 0 },
        { idString: "small_drawer", position: Vec(-3.48, -13.6), rotation: 0 },
        { idString: "small_table", position: Vec(9.54, 11.44), rotation: 0 },
        { idString: "chair", position: Vec(5.1, 11.44), rotation: 3 },
        { idString: "cooler", position: Vec(9.4, 2.16), rotation: 2 },
        { idString: "barrel", position: Vec(-5.16, -23.9), outdoors: true },
        { idString: "box", position: Vec(1.49, -25.52), outdoors: true },
        { idString: "box", position: Vec(6.31, -22.32), outdoors: true },
        { idString: "box", position: Vec(-19.11, -1.56), outdoors: true },
        { idString: "propane_tank", position: Vec(-18.6, 3.13), outdoors: true }
    ]),

    {
        idString: "memorial_bunker_entrance",
        name: "Memorial Bunker (Entrance)",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(30, 30),
        material: "metal_heavy",
        particle: "bunker_particle",
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 17.4, Vec(-6.56, 0)),
            RectangleHitbox.fromRect(2, 17.4, Vec(6.56, 0)),
            RectangleHitbox.fromRect(12, 2, Vec(0, -7.7))
        ),
        collideWithLayers: Layers.Adjacent,
        ceilingHitbox: RectangleHitbox.fromRect(11, 8, Vec(0, -3.4)),
        floors: [{
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(11, 15, Vec(0, 0.8))
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "memorial_bunker_stair", position: Vec(0, 2.5), rotation: 0, layer: Layer.ToBasement }
        ]
    },

    {
        idString: "memorial_bunker_main",
        name: "Memorial Bunker",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(30, 40),
        material: "metal_heavy",
        particle: "bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        ceilingHitbox: RectangleHitbox.fromRect(11.5, 30),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 34, Vec(-6.56, 0)),
            RectangleHitbox.fromRect(2, 34, Vec(6.56, 0)),
            RectangleHitbox.fromRect(12, 2, Vec(0, -16))
        ),
        floorImages: [{
            key: "memorial_bunker_main_floor",
            position: Vec(0, 0)
        }],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(11.5, 16, Vec(0, -7))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(11, 16, Vec(0, 9)),
                layer: Layer.Basement
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(11, 16, Vec(0, 9)),
                layer: Layer.ToBasement
            }
        ],
        obstacles: IS_CLIENT ? undefined : [{
            idString: "memorial_crate",
            position: Vec(0, -9)
        }]
    },

    {
        idString: "memorial",
        name: "Memorial",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(50, 50, Vec(0, -10)),
        bunkerSpawnHitbox: RectangleHitbox.fromRect(30, 40, Vec(0, -8.5)),
        rotationMode: RotationMode.None,
        spawnMode: MapObjectSpawnMode.Grass,
        hideOnMap: true,
        floorImages: [
            {
                key: "memorial_bunker_stair",
                position: Vec(0, 0)
            },
            {
                key: "monument_railing",
                position: Vec(-8.5, 0)
            },
            {
                key: "monument_railing",
                position: Vec(8.5, 0)
            }
        ],
        ceilingHitbox: RectangleHitbox.fromRect(11, 8, Vec(0, 4.5)),
        noCeilingScopeEffect: true,
        ceilingImages: [{
            key: "memorial_bunker_entrance_ceiling",
            position: Vec(0, -3.4)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "monument", position: Vec(0, 0), rotation: 3 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "memorial_bunker_entrance", position: Vec(0, 0) },
            { idString: "memorial_bunker_main", position: Vec(0, -8.5), layer: Layer.Basement }
        ]
    },

    {
        idString: "blue_stair",
        name: "Blue Stair",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(15, 15),
        material: "metal_heavy",
        particle: "cargo_ship_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        floorImages: [{
            key: "blue_stair",
            position: Vec(0, 0)
        }],
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.33, 10.49, Vec(4.21, -0.37)),
            RectangleHitbox.fromRect(1.33, 10.49, Vec(-4.2, -0.37)),
            RectangleHitbox.fromRect(1.99, 1.76, Vec(4.54, 4.75)),
            RectangleHitbox.fromRect(1.98, 1.76, Vec(-4.53, 4.76)),
            RectangleHitbox.fromRect(1.2, 2.57, Vec(4.94, -3.77)),
            RectangleHitbox.fromRect(1.2, 2.57, Vec(-4.93, -3.77))
        ),
        floors: [{
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(7.17, 9.78, Vec(0.08, -0.36))
        }]
    },

    {
        idString: "mutated_forklift",
        name: "Mutated Forklift",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(30, 45, Vec(0, -11)),
        ceilingHitbox: RectangleHitbox.fromRect(20, 10, Vec(0, -25)),
        noCeilingScopeEffect: true,
        material: "metal_heavy",
        particle: "metal_particle",
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(8.17, 14.87, Vec(0, 0)),
            RectangleHitbox.fromRect(4.6, 18.25, Vec(0, 0)),
            new CircleHitbox(1.88, Vec(2.14, -7.18)),
            new CircleHitbox(1.83, Vec(2.21, 7.27)),
            new CircleHitbox(1.83, Vec(-2.22, 7.22)),
            new CircleHitbox(1.83, Vec(-2.22, -7.19))
        ),
        floorImages: [{
            key: "mutated_forklift_2",
            position: Vec(0, 0)
        }],
        ceilingImages: [
            {
                key: "mutated_forklift_1",
                position: Vec(0, -24.5)
            },
            {
                key: "mutated_forklift_3",
                position: Vec(0, -9.5)
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "truck_tire", position: Vec(-3.64, 6.92), rotation: 0 },
            { idString: "truck_tire", position: Vec(3.64, 6.92), rotation: 0 },
            { idString: "truck_tire", position: Vec(-3.64, -7.15), rotation: 0 },
            { idString: "truck_tire", position: Vec(3.64, -7.15), rotation: 0 }
        ]
    },

    // Trucks
    {
        idString: "large_truck",
        name: "Large Truck",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(30, 85),
        floorImages: [
            {
                key: "truck_large_back_floor",
                position: Vec(-4.9, 8.7),
                scale: Vec(2, 2)
            },
            {
                key: "truck_large_back_floor",
                position: Vec(4.9, 8.7),
                scale: Vec(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Metal,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(5, 55.5, Vec(4.9, 8.7)),
                RectangleHitbox.fromRect(5, 55.5, Vec(-4.9, 8.7)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec(0, -8.73)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec(0.04, 26.37)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec(-0.01, 10.8)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec(0.01, -4.78)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec(0.04, 6.86)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec(-0.06, -17.83)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec(0.04, 26.37)),
                RectangleHitbox.fromRect(4.96, 2.51, Vec(0.02, 22.44)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec(0.07, 35.3)),
                RectangleHitbox.fromRect(4.77, 1.36, Vec(-0.07, 4.32)),
                RectangleHitbox.fromRect(5.08, 1.35, Vec(0.03, 32.75)),
                RectangleHitbox.fromRect(5.08, 1.35, Vec(-0.1, 13.33))
            )
        }],
        groundGraphics: [
            {
                color: 0x1f1f1f,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.77, 1.36, Vec(-0.07, 4.32)),
                    RectangleHitbox.fromRect(5.08, 1.35, Vec(0.03, 32.75)),
                    RectangleHitbox.fromRect(5.08, 1.35, Vec(-0.1, 13.33)),

                    RectangleHitbox.fromRect(5.07, 2.53, Vec(0, -8.73)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec(0.04, 26.37)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec(-0.01, 10.8)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec(0.01, -4.78)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec(0.04, 6.86)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec(-0.06, -17.83)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec(0.04, 26.37)),
                    RectangleHitbox.fromRect(4.96, 2.51, Vec(0.02, 22.44)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec(0.07, 35.3))
                )
            },
            {
                color: 0x363636,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.51, 0.56, Vec(0.04, 32.73)),
                    RectangleHitbox.fromRect(4.51, 0.56, Vec(0, 4.32)),
                    RectangleHitbox.fromRect(4.51, 0.56, Vec(0.01, 13.35))
                )
            },
            {
                color: 0x575757,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.56, 1.7, Vec(0, -8.73)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec(0.04, 26.37)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec(-0.01, 10.8)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec(0.01, -4.78)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec(0.04, 6.86)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec(-0.06, -17.83)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec(0.04, 26.37)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec(0.02, 22.44)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec(0.07, 35.3))
                )
            }
        ],

        obstacles: IS_CLIENT ? undefined : [
            { idString: "truck_front", position: Vec(0.1, -25.49), rotation: 0 },
            { idString: "truck_tire", position: Vec(7.26, -15.08), rotation: 0 },
            { idString: "truck_tire", position: Vec(7.26, 4.32), rotation: 0 },
            { idString: "truck_tire", position: Vec(7.26, 13.43), rotation: 0 },
            { idString: "truck_tire", position: Vec(7.26, 32.82), rotation: 0 },
            { idString: "truck_tire", position: Vec(-7.26, -15.08), rotation: 0 },
            { idString: "truck_tire", position: Vec(-7.26, 4.32), rotation: 0 },
            { idString: "truck_tire", position: Vec(-7.26, 13.43), rotation: 0 },
            { idString: "truck_tire", position: Vec(-7.26, 32.82), rotation: 0 }
        ],

        subBuildings: IS_CLIENT ? undefined : [
            { idString: "blue_stair", position: Vec(23.33, 12.89), orientation: 3 },
            { idString: randomPortDamagedContainer, position: Vec(0, -22.7), orientation: 2 },
            { idString: randomPortDamagedContainer, position: Vec(0, -5.1) }
        ]
    },

    // ----------------------------------------------------------------
    // The front of the truck is an obstacle, while the container
    // is a sub building of the "truck" which is the actual "building".
    // Each truck, depending on the model, will be generated with a
    // random "truck" container layout and tint.
    // ----------------------------------------------------------------

    // CAUTION: RANDOMLY GENERATED CONTAINER
    truck(1, "two_sided"),
    truck(2, "one_sided"),

    // Two sided
    truckContainer(1, "two_sided", [
        { idString: "regular_crate", position: Vec(-0.82, -13.3) },
        { idString: "regular_crate", position: Vec(0.76, -3.71) },
        { idString: "box", position: Vec(-2.32, 16.51) },
        { idString: "box", position: Vec(-2.32, 11.39) },
        { idString: "box", position: Vec(2.86, 12.63) }
    ]),

    truckContainer(2, "two_sided", [
        { idString: "regular_crate", position: Vec(0.08, 14.32) },
        { idString: "propane_tank", position: Vec(2.55, 6.99) }
    ], [
        { idString: randomPallet, position: Vec(0.09, -13.43) }
    ]),

    truckContainer(3, "two_sided", [
        { idString: "barrel", position: Vec(-1.55, -14.23) },
        { idString: "box", position: Vec(-2.27, -7.29) },
        { idString: "regular_crate", position: Vec(-0.06, 0.67) },
        { idString: "regular_crate", position: Vec(0.68, 10.51) }
    ]),

    truckContainer(4, "two_sided", [
        { idString: "ammo_crate", position: Vec(0, -12) },
        { idString: "box", position: Vec(-3.14, 7.99) },
        { idString: "box", position: Vec(-3.21, 12.87) },
        { idString: "gun_case", position: Vec(2.77, 13.65), rotation: 3 }
    ]),

    truckContainer(5, "two_sided", [
        { idString: "propane_tank", position: Vec(2.91, -15.8) },
        { idString: "propane_tank", position: Vec(-2.93, -9.67) },
        { idString: "box", position: Vec(-2.76, -14.84) },
        { idString: "box", position: Vec(2.56, -8.72) },
        { idString: "ammo_crate", position: Vec(0.02, 7) },
        { idString: "gun_case", position: Vec(0.11, 15.5), rotation: 0 }
    ]),

    truckContainer(6, "two_sided", [
        { idString: "box", position: Vec(-2.62, -6.11) },
        { idString: "box", position: Vec(2.7, 16.4) }
    ], [
        { idString: randomPallet, position: Vec(0, -13.22) },
        { idString: randomPallet, position: Vec(0, 9.63) }
    ]),

    // One sided
    truckContainer(7, "one_sided", [
        { idString: "box", position: Vec(3.25, 15.3) },
        { idString: "box", position: Vec(3.18, 10.34) },
        { idString: "propane_tank", position: Vec(3.27, 5.38) }
    ], [
        { idString: randomPallet, position: Vec(0.05, -13.22) }
    ]),

    truckContainer(8, "one_sided", [
        { idString: "barrel", position: Vec(-1.48, 14.27) },
        { idString: "barrel", position: Vec(1.73, 5.53) },
        { idString: "gun_case", position: Vec(2.5, -12.56), rotation: 3 }
    ]),

    truckContainer(9, "one_sided", [
        { idString: "trash_bag", position: Vec(-2.7, -15.18) },
        { idString: "trash_bag", position: Vec(2.85, -12.26) },
        { idString: "trash_bag", position: Vec(-2.92, -7.89) },
        { idString: "trash_bag", position: Vec(-2.33, 9.25) },
        { idString: "trash_bag", position: Vec(2.42, 2.62) }
    ]),

    truckContainer(10, "one_sided", [
        { idString: "box", position: Vec(-2.77, -6.21) },
        { idString: "ammo_crate", position: Vec(0, 10.54) }
    ], [
        { idString: randomPallet, position: Vec(0.05, -13.22) }
    ]),

    truckContainer(11, "one_sided", [
        { idString: "gun_locker", position: Vec(3, -11.37), rotation: 3 },
        { idString: "grenade_crate", position: Vec(-2.41, 8.66) },
        { idString: "box", position: Vec(3.23, 7.78) }
    ]),

    truckContainer(12, "one_sided", [
        { idString: "flint_crate", position: Vec(0, -12.59) },
        { idString: "gun_case", position: Vec(2.46, -2.23), rotation: 3 },
        { idString: "box", position: Vec(2.71, 5.74) },
        { idString: "gun_locker", position: Vec(-3.01, 0.22), rotation: 3 }, // LMAO no
        { idString: "ammo_crate", position: Vec(0.04, 13.03) }
    ]),

    {
        // we use tugboat "HACK" to generate these in the ocean
        idString: "buoy",
        name: "Buoy",
        defType: DefinitionType.Building,
        spawnMode: MapObjectSpawnMode.Beach,
        spawnHitbox: RectangleHitbox.fromRect(70, 110, Vec(50, 0)),
        obstacles: IS_CLIENT ? undefined : [{
            idString: "buoy",
            get position() { return Vec(random(50, 100), 0); }
        }]
    },
    { // implemented by pap with a lot of love >w<
        idString: "campsite",
        name: "Campsite",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(300, 250),
        floors: [
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(75.23, 2.27),
                    Vec(76.39, 3.23),
                    Vec(78.37, 4.13),
                    Vec(80.3, 4.46),
                    Vec(82.98, 4.37),
                    Vec(85.4, 3.98),
                    Vec(88.34, 3.33),
                    Vec(91.48, 2.63),
                    Vec(94.35, 1.88),
                    Vec(97.49, 0.72),
                    Vec(99.68, -0.63),
                    Vec(101.11, -2.15),
                    Vec(102.07, -3.86),
                    Vec(102.79, -6.16),
                    Vec(103.16, -9.34),
                    Vec(102.99, -12.5),
                    Vec(102.55, -15.74),
                    Vec(101.83, -18.56),
                    Vec(100.67, -21.45),
                    Vec(99.2, -24.06),
                    Vec(97.15, -26.57),
                    Vec(95, -28.45),
                    Vec(92.37, -30.12),
                    Vec(89.33, -31.45),
                    Vec(86.43, -32.36),
                    Vec(83.47, -32.84),
                    Vec(80.86, -33.13),
                    Vec(77.91, -33.21),
                    Vec(75.28, -32.99),
                    Vec(72.92, -32.53),
                    Vec(70.31, -31.66),
                    Vec(68.38, -30.36),
                    Vec(66.72, -28.5),
                    Vec(65.44, -26.26),
                    Vec(64.59, -23.77),
                    Vec(64.3, -21.55),
                    Vec(64.33, -19.38),
                    Vec(64.93, -17.33),
                    Vec(65.8, -15.25),
                    Vec(67.42, -12.5),
                    Vec(69.49, -8.98),
                    Vec(70.92, -5.96),
                    Vec(72, -3.55),
                    Vec(73.38, -0.7),
                    Vec(74.34, 1.02)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(83.61, 21.65),
                    Vec(86.92, 21.39),
                    Vec(90.68, 22.23),
                    Vec(93.79, 23.82),
                    Vec(96.56, 26.33),
                    Vec(99.05, 30.01),
                    Vec(100.66, 33.94),
                    Vec(101.54, 36.87),
                    Vec(102.31, 40.53),
                    Vec(102.6, 44.3),
                    Vec(101.94, 48.8),
                    Vec(100.26, 52.36),
                    Vec(97.51, 55.47),
                    Vec(93.08, 59.57),
                    Vec(87.56, 64.14),
                    Vec(83.09, 66.49),
                    Vec(80.82, 66.93),
                    Vec(77.86, 66.27),
                    Vec(75.51, 64.84),
                    Vec(73.06, 62.28),
                    Vec(71.34, 60.04),
                    Vec(69.17, 55.86),
                    Vec(68, 51.84),
                    Vec(67.36, 48.01),
                    Vec(67.33, 44.43),
                    Vec(67.8, 41.07),
                    Vec(68.7, 37.99),
                    Vec(70.28, 33.95),
                    Vec(72.16, 30.55),
                    Vec(74.44, 27.45),
                    Vec(76.76, 24.99),
                    Vec(80.3, 22.64)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(-9.67, -92.78),
                    Vec(-6.58, -87.91),
                    Vec(-3.76, -80.47),
                    Vec(-2.46, -75.85),
                    Vec(-1.41, -71.91),
                    Vec(-0.08, -65.74),
                    Vec(0.48, -61.51),
                    Vec(0.57, -55.46),
                    Vec(0.42, -49.93),
                    Vec(0.03, -44.33),
                    Vec(-0.31, -38.56),
                    Vec(-0.47, -34),
                    Vec(3.42, -33.22),
                    Vec(8.26, -33.53),
                    Vec(8.91, -32.63),
                    Vec(9.09, -28.8),
                    Vec(9.09, -25.63),
                    Vec(8.8, -22.5),
                    Vec(5.4, -22.25),
                    Vec(0.85, -22.5),
                    Vec(0.06, -18.09),
                    Vec(-1, -12.04),
                    Vec(-1, -6.43),
                    Vec(-0.69, -0.0),
                    Vec(-0.51, 7.3),
                    Vec(-0.51, 17.36),
                    Vec(-0.57, 26.67),
                    Vec(-0.75, 30.55),
                    Vec(-1.6, 35.24),
                    Vec(-7.15, 34.97),
                    Vec(-12.65, 31.81),
                    Vec(-12.79, 30.63),
                    Vec(-12.35, 28.09),
                    Vec(-12.3, 23.7),
                    Vec(-12.35, 15.73),
                    Vec(-12.28, 6.23),
                    Vec(-12.37, -0.92),
                    Vec(-12.2, -17.23),
                    Vec(-11.58, -29.88),
                    Vec(-11.4, -38.97),
                    Vec(-10.63, -50.03),
                    Vec(-10.57, -56.52),
                    Vec(-10.76, -62.36),
                    Vec(-11.87, -68.26),
                    Vec(-12.89, -72.36),
                    Vec(-13.91, -76.06),
                    Vec(-15.41, -81.02),
                    Vec(-17.99, -86.65)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(8.44, -24.96),
                    Vec(8.72, -22.34),
                    Vec(10.22, -19.96),
                    Vec(13, -16.81),
                    Vec(16.84, -14.21),
                    Vec(21.24, -12.67),
                    Vec(26.84, -12.09),
                    Vec(31.49, -12.63),
                    Vec(36.06, -14.43),
                    Vec(40.02, -17.21),
                    Vec(42.73, -20.25),
                    Vec(44.34, -23.4),
                    Vec(44.51, -26.43),
                    Vec(44.41, -29.26),
                    Vec(44.16, -32.58),
                    Vec(44.05, -34.58),
                    Vec(43.11, -36.46),
                    Vec(41.77, -38.37),
                    Vec(38.99, -41.01),
                    Vec(36.44, -42.79),
                    Vec(33.41, -44.17),
                    Vec(30.2, -45.03),
                    Vec(26.73, -45.36),
                    Vec(23.66, -45.21),
                    Vec(20.73, -44.61),
                    Vec(18.23, -43.8),
                    Vec(15.84, -42.56),
                    Vec(13.58, -40.99),
                    Vec(11.69, -39.31),
                    Vec(10.34, -37.5),
                    Vec(9.16, -35.64),
                    Vec(8.3, -33.65),
                    Vec(8.18, -30.94),
                    Vec(8.28, -27.87)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(43.65, -24.12),
                    Vec(44.04, -34.56),
                    Vec(44.94, -34.31),
                    Vec(46.38, -33.83),
                    Vec(48.52, -33),
                    Vec(50.97, -31.58),
                    Vec(53.24, -29.76),
                    Vec(55.44, -27.7),
                    Vec(57.75, -25.05),
                    Vec(59.74, -22.3),
                    Vec(61.82, -18.68),
                    Vec(63.34, -15.1),
                    Vec(64.85, -10.36),
                    Vec(65.89, -5.79),
                    Vec(66.96, -1.88),
                    Vec(67.96, 2.73),
                    Vec(68.62, 5.58),
                    Vec(68.9, 7.47),
                    Vec(69.09, 9.27),
                    Vec(70.02, 19.17),
                    Vec(70.13, 22.6),
                    Vec(69.86, 25.71),
                    Vec(68.93, 29.98),
                    Vec(67.42, 34.83),
                    Vec(66.23, 38.7),
                    Vec(65.06, 43.96),
                    Vec(64.18, 47.95),
                    Vec(62.58, 52.14),
                    Vec(60.04, 56.77),
                    Vec(55.08, 62),
                    Vec(51.17, 64.39),
                    Vec(45.68, 65.79),
                    Vec(39.96, 66.45),
                    Vec(32.45, 66.52),
                    Vec(30.05, 56.05),
                    Vec(34.13, 55.94),
                    Vec(38.52, 55.89),
                    Vec(42.65, 55.56),
                    Vec(46.57, 54.67),
                    Vec(48.65, 53.14),
                    Vec(50.52, 51.09),
                    Vec(52.36, 48.26),
                    Vec(53.79, 44.75),
                    Vec(54.72, 40.36),
                    Vec(56, 35.43),
                    Vec(57.16, 31.72),
                    Vec(58.54, 27.14),
                    Vec(59.42, 22.96),
                    Vec(59.4, 20.08),
                    Vec(59.06, 16.71),
                    Vec(58.72, 14),
                    Vec(58.51, 11.1),
                    Vec(58.23, 7.64),
                    Vec(57.19, 3.41),
                    Vec(56, -1.37),
                    Vec(55.37, -5.08),
                    Vec(54.37, -8.87),
                    Vec(53.11, -12.63),
                    Vec(51.38, -16.13),
                    Vec(49.23, -19.26),
                    Vec(47.05, -21.49),
                    Vec(44.44, -23.44)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(-8.48, 40.37),
                    Vec(-2.52, 41.81),
                    Vec(-2.62, 43.66),
                    Vec(-2.75, 46.35),
                    Vec(-2.73, 49.48),
                    Vec(-2.04, 52.08),
                    Vec(0.5, 53.23),
                    Vec(2.04, 53.58),
                    Vec(3.42, 54.4),
                    Vec(7.05, 54.94),
                    Vec(11.69, 55.25),
                    Vec(15.93, 55.38),
                    Vec(20.82, 55.42),
                    Vec(26.29, 55.79),
                    Vec(31.11, 56),
                    Vec(33.69, 56.03),
                    Vec(34.18, 66.53),
                    Vec(32.37, 66.61),
                    Vec(33.1, 69.51),
                    Vec(33.36, 71.97),
                    Vec(33.45, 74.84),
                    Vec(33.47, 78.41),
                    Vec(33.43, 81.85),
                    Vec(33.34, 85.11),
                    Vec(33.21, 87.79),
                    Vec(33.05, 90.34),
                    Vec(32.96, 92.59),
                    Vec(32.78, 94.87),
                    Vec(32.56, 97.66),
                    Vec(32.29, 100.44),
                    Vec(32.15, 103.13),
                    Vec(32.29, 106.61),
                    Vec(32.29, 109.22),
                    Vec(31.88, 110.74),
                    Vec(31.11, 112.15),
                    Vec(29.73, 112.54),
                    Vec(28.21, 112.37),
                    Vec(26.65, 111.86),
                    Vec(25.28, 110.42),
                    Vec(23.87, 108.94),
                    Vec(22.81, 107.74),
                    Vec(22.38, 106.73),
                    Vec(22.36, 104.55),
                    Vec(22.26, 101.95),
                    Vec(22.48, 98.92),
                    Vec(22.78, 95.47),
                    Vec(23.02, 92.34),
                    Vec(23.19, 89.52),
                    Vec(23.41, 85.82),
                    Vec(23.53, 82.4),
                    Vec(23.56, 79.12),
                    Vec(23.56, 76.75),
                    Vec(23.56, 74.18),
                    Vec(23.36, 71.08),
                    Vec(22.86, 67.56),
                    Vec(22.65, 66.12),
                    Vec(18.25, 66.01),
                    Vec(13.48, 65.84),
                    Vec(9.06, 65.56),
                    Vec(5.03, 65.16),
                    Vec(1.16, 64.73),
                    Vec(-2.76, 63.94),
                    Vec(-6.66, 62.53),
                    Vec(-9.64, 60.61),
                    Vec(-12.04, 58.02),
                    Vec(-13.33, 55.6),
                    Vec(-14.09, 53.24),
                    Vec(-14.49, 50.7),
                    Vec(-14.66, 48.06),
                    Vec(-14.62, 45.61),
                    Vec(-14.51, 43.28),
                    Vec(-14.4, 41.83)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(-1.46, 33.75),
                    Vec(-1.06, 31.8),
                    Vec(-4.79, 32.13),
                    Vec(-9.83, 32.1),
                    Vec(-12.91, 30.76),
                    Vec(-16.05, 30.71),
                    Vec(-19.15, 30.7),
                    Vec(-23.24, 30.67),
                    Vec(-28.28, 30.67),
                    Vec(-32.69, 30.75),
                    Vec(-36.85, 31.14),
                    Vec(-41.26, 31.09),
                    Vec(-47.04, 30.35),
                    Vec(-51.02, 28.1),
                    Vec(-54.43, 25.62),
                    Vec(-57.18, 22.42),
                    Vec(-58.67, 19.67),
                    Vec(-59.19, 17.11),
                    Vec(-61.63, 15.88),
                    Vec(-63.62, 15),
                    Vec(-65.92, 13.91),
                    Vec(-68.6, 12.59),
                    Vec(-70.96, 11.45),
                    Vec(-70.94, 13.11),
                    Vec(-70.54, 15.79),
                    Vec(-70.14, 18.44),
                    Vec(-69.8, 21.37),
                    Vec(-68.8, 24.01),
                    Vec(-67.34, 26.73),
                    Vec(-64.98, 30.14),
                    Vec(-61.87, 33.38),
                    Vec(-58.07, 36.26),
                    Vec(-53.68, 39.16),
                    Vec(-49.41, 40.89),
                    Vec(-43.97, 41.75),
                    Vec(-38.92, 42.22),
                    Vec(-33.45, 42.09),
                    Vec(-27.04, 41.88),
                    Vec(-22.04, 41.73),
                    Vec(-14.5, 41.78),
                    Vec(-11.57, 42.76),
                    Vec(-8.68, 41.88),
                    Vec(-5.61, 42.72),
                    Vec(-2.59, 41.96),
                    Vec(-2.3, 39.32),
                    Vec(-1.8, 36.14)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(67.05, 10.89),
                    Vec(69.16, 9.24),
                    Vec(71.68, 8.99),
                    Vec(74.89, 8.85),
                    Vec(78.56, 8.63),
                    Vec(82.05, 8.32),
                    Vec(85.49, 7.98),
                    Vec(88.39, 7.81),
                    Vec(91.81, 7.82),
                    Vec(95.63, 7.5),
                    Vec(99.06, 6.94),
                    Vec(102.61, 6.04),
                    Vec(105.6, 4.86),
                    Vec(108, 3.54),
                    Vec(110.08, 2.42),
                    Vec(112.29, 1.36),
                    Vec(114, 1.24),
                    Vec(115.67, 2.36),
                    Vec(117.31, 3.52),
                    Vec(118.92, 4.56),
                    Vec(119.6, 5.63),
                    Vec(120.01, 6.97),
                    Vec(119.63, 8.27),
                    Vec(118.7, 9.51),
                    Vec(117.4, 10.05),
                    Vec(115.78, 10.82),
                    Vec(113.93, 11.71),
                    Vec(111.84, 12.96),
                    Vec(109.88, 13.94),
                    Vec(107.13, 15.04),
                    Vec(103.92, 15.98),
                    Vec(101.27, 16.63),
                    Vec(98.26, 17.15),
                    Vec(94.2, 17.54),
                    Vec(90.6, 17.62),
                    Vec(85.91, 17.89),
                    Vec(80.99, 18.29),
                    Vec(76.5, 18.61),
                    Vec(73.3, 18.79),
                    Vec(69.99, 19.42),
                    Vec(67.52, 16.76),
                    Vec(68.58, 13.4)
                ])
            }
        ],
        groundGraphics: [
            {
                color: 0x5e442e,
                hitbox: new PolygonHitbox([
                    Vec(75.23, 2.27),
                    Vec(76.39, 3.23),
                    Vec(78.37, 4.13),
                    Vec(80.3, 4.46),
                    Vec(82.98, 4.37),
                    Vec(85.4, 3.98),
                    Vec(88.34, 3.33),
                    Vec(91.48, 2.63),
                    Vec(94.35, 1.88),
                    Vec(97.49, 0.72),
                    Vec(99.68, -0.63),
                    Vec(101.11, -2.15),
                    Vec(102.07, -3.86),
                    Vec(102.79, -6.16),
                    Vec(103.16, -9.34),
                    Vec(102.99, -12.5),
                    Vec(102.55, -15.74),
                    Vec(101.83, -18.56),
                    Vec(100.67, -21.45),
                    Vec(99.2, -24.06),
                    Vec(97.15, -26.57),
                    Vec(95, -28.45),
                    Vec(92.37, -30.12),
                    Vec(89.33, -31.45),
                    Vec(86.43, -32.36),
                    Vec(83.47, -32.84),
                    Vec(80.86, -33.13),
                    Vec(77.91, -33.21),
                    Vec(75.28, -32.99),
                    Vec(72.92, -32.53),
                    Vec(70.31, -31.66),
                    Vec(68.38, -30.36),
                    Vec(66.72, -28.5),
                    Vec(65.44, -26.26),
                    Vec(64.59, -23.77),
                    Vec(64.3, -21.55),
                    Vec(64.33, -19.38),
                    Vec(64.93, -17.33),
                    Vec(65.8, -15.25),
                    Vec(67.42, -12.5),
                    Vec(69.49, -8.98),
                    Vec(70.92, -5.96),
                    Vec(72, -3.55),
                    Vec(73.38, -0.7),
                    Vec(74.34, 1.02)
                ])
            },
            {
                color: 0x705136,
                hitbox: new PolygonHitbox([
                    Vec(87.26, -31.25),
                    Vec(89.52, -30.43),
                    Vec(92.06, -29.24),
                    Vec(94.7, -27.54),
                    Vec(96.85, -25.73),
                    Vec(98.71, -23.26),
                    Vec(100.18, -20.48),
                    Vec(101.2, -17.65),
                    Vec(101.83, -14.96),
                    Vec(102.26, -11.07),
                    Vec(102.3, -7.83),
                    Vec(101.69, -5.1),
                    Vec(100.27, -2.61),
                    Vec(98.46, -0.84),
                    Vec(95.92, 0.42),
                    Vec(92.94, 1.4),
                    Vec(90.11, 2.1),
                    Vec(87.06, 2.75),
                    Vec(83.39, 3.41),
                    Vec(80.54, 3.57),
                    Vec(78.28, 3.23),
                    Vec(76.38, 2.19),
                    Vec(75.11, 0.67),
                    Vec(74.05, -1.16),
                    Vec(72.92, -3.58),
                    Vec(71.56, -6.79),
                    Vec(70.31, -9.82),
                    Vec(68.57, -12.29),
                    Vec(66.97, -14.78),
                    Vec(65.95, -17.06),
                    Vec(65.27, -19.58),
                    Vec(65.22, -21.77),
                    Vec(65.59, -24.21),
                    Vec(66.38, -26.34),
                    Vec(68.01, -28.69),
                    Vec(70.16, -30.48),
                    Vec(72.4, -31.43),
                    Vec(75.2, -32.22),
                    Vec(78.12, -32.38),
                    Vec(81.54, -32.2),
                    Vec(84.7, -31.79)
                ])
            },
            {
                color: 0x5e442e,
                hitbox: new PolygonHitbox([
                    Vec(83.61, 21.65),
                    Vec(86.92, 21.39),
                    Vec(90.68, 22.23),
                    Vec(93.79, 23.82),
                    Vec(96.56, 26.33),
                    Vec(99.05, 30.01),
                    Vec(100.66, 33.94),
                    Vec(101.54, 36.87),
                    Vec(102.31, 40.53),
                    Vec(102.6, 44.3),
                    Vec(101.94, 48.8),
                    Vec(100.26, 52.36),
                    Vec(97.51, 55.47),
                    Vec(93.08, 59.57),
                    Vec(87.56, 64.14),
                    Vec(83.09, 66.49),
                    Vec(80.82, 66.93),
                    Vec(77.86, 66.27),
                    Vec(75.51, 64.84),
                    Vec(73.06, 62.28),
                    Vec(71.34, 60.04),
                    Vec(69.17, 55.86),
                    Vec(68, 51.84),
                    Vec(67.36, 48.01),
                    Vec(67.33, 44.43),
                    Vec(67.8, 41.07),
                    Vec(68.7, 37.99),
                    Vec(70.28, 33.95),
                    Vec(72.16, 30.55),
                    Vec(74.44, 27.45),
                    Vec(76.76, 24.99),
                    Vec(80.3, 22.64)
                ])
            },
            {
                color: 0x705136,
                hitbox: new PolygonHitbox([
                    Vec(94.54, 25.66),
                    Vec(95.51, 26.74),
                    Vec(96.65, 28.13),
                    Vec(97.73, 29.91),
                    Vec(98.83, 31.93),
                    Vec(99.73, 34.22),
                    Vec(100.46, 36.49),
                    Vec(101.16, 39.42),
                    Vec(101.56, 42.24),
                    Vec(101.64, 44.28),
                    Vec(101.46, 46.53),
                    Vec(100.96, 48.51),
                    Vec(100.19, 50.48),
                    Vec(98.69, 52.8),
                    Vec(96.44, 55.24),
                    Vec(93.77, 57.75),
                    Vec(91.88, 59.45),
                    Vec(89.58, 61.37),
                    Vec(87.35, 63.12),
                    Vec(84.83, 64.75),
                    Vec(82.93, 65.99),
                    Vec(80.67, 66.3),
                    Vec(78.61, 65.76),
                    Vec(76.38, 64.2),
                    Vec(74.7, 62.74),
                    Vec(73.25, 61),
                    Vec(72.4, 59.67),
                    Vec(71.45, 58.18),
                    Vec(70.67, 56.77),
                    Vec(70.03, 55.3),
                    Vec(69.44, 53.46),
                    Vec(68.85, 51.45),
                    Vec(68.46, 49.21),
                    Vec(68.26, 46.87),
                    Vec(68.35, 44.51),
                    Vec(68.67, 42.4),
                    Vec(69.09, 40.39),
                    Vec(69.68, 38.35),
                    Vec(70.54, 36.07),
                    Vec(71.5, 33.82),
                    Vec(72.77, 31.54),
                    Vec(74.06, 29.5),
                    Vec(75.29, 27.93),
                    Vec(76.8, 26.32),
                    Vec(78.3, 25.07),
                    Vec(79.88, 23.98),
                    Vec(81.7, 23.08),
                    Vec(83.5, 22.46),
                    Vec(85.55, 22.16),
                    Vec(87.52, 22.22),
                    Vec(89.45, 22.57),
                    Vec(91.44, 23.51),
                    Vec(93.38, 24.68)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec(-9.67, -92.78),
                    Vec(-6.58, -87.91),
                    Vec(-3.76, -80.47),
                    Vec(-2.46, -75.85),
                    Vec(-1.41, -71.91),
                    Vec(-0.08, -65.74),
                    Vec(0.48, -61.51),
                    Vec(0.57, -55.46),
                    Vec(0.42, -49.93),
                    Vec(0.03, -44.33),
                    Vec(-0.31, -38.56),
                    Vec(-0.47, -34),
                    Vec(3.42, -33.22),
                    Vec(8.26, -33.53),
                    Vec(8.91, -32.63),
                    Vec(9.09, -28.8),
                    Vec(9.09, -25.63),
                    Vec(8.8, -22.5),
                    Vec(5.4, -22.25),
                    Vec(0.85, -22.5),
                    Vec(0.06, -18.09),
                    Vec(-1, -12.04),
                    Vec(-1, -6.43),
                    Vec(-0.69, -0.0),
                    Vec(-0.51, 7.3),
                    Vec(-0.51, 17.36),
                    Vec(-0.57, 26.67),
                    Vec(-0.75, 30.55),
                    Vec(-1.6, 35.24),
                    Vec(-7.15, 34.97),
                    Vec(-12.65, 31.81),
                    Vec(-12.79, 30.63),
                    Vec(-12.35, 28.09),
                    Vec(-12.3, 23.7),
                    Vec(-12.35, 15.73),
                    Vec(-12.28, 6.23),
                    Vec(-12.37, -0.92),
                    Vec(-12.2, -17.23),
                    Vec(-11.58, -29.88),
                    Vec(-11.4, -38.97),
                    Vec(-10.63, -50.03),
                    Vec(-10.57, -56.52),
                    Vec(-10.76, -62.36),
                    Vec(-11.87, -68.26),
                    Vec(-12.89, -72.36),
                    Vec(-13.91, -76.06),
                    Vec(-15.41, -81.02),
                    Vec(-17.99, -86.65)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec(8.44, -24.96),
                    Vec(8.72, -22.34),
                    Vec(10.22, -19.96),
                    Vec(13, -16.81),
                    Vec(16.84, -14.21),
                    Vec(21.24, -12.67),
                    Vec(26.84, -12.09),
                    Vec(31.49, -12.63),
                    Vec(36.06, -14.43),
                    Vec(40.02, -17.21),
                    Vec(42.73, -20.25),
                    Vec(44.34, -23.4),
                    Vec(44.51, -26.43),
                    Vec(44.41, -29.26),
                    Vec(44.16, -32.58),
                    Vec(44.05, -34.58),
                    Vec(43.11, -36.46),
                    Vec(41.77, -38.37),
                    Vec(38.99, -41.01),
                    Vec(36.44, -42.79),
                    Vec(33.41, -44.17),
                    Vec(30.2, -45.03),
                    Vec(26.73, -45.36),
                    Vec(23.66, -45.21),
                    Vec(20.73, -44.61),
                    Vec(18.23, -43.8),
                    Vec(15.84, -42.56),
                    Vec(13.58, -40.99),
                    Vec(11.69, -39.31),
                    Vec(10.34, -37.5),
                    Vec(9.16, -35.64),
                    Vec(8.3, -33.65),
                    Vec(8.18, -30.94),
                    Vec(8.28, -27.87)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec(43.65, -24.12),
                    Vec(44.04, -34.56),
                    Vec(44.94, -34.31),
                    Vec(46.38, -33.83),
                    Vec(48.52, -33),
                    Vec(50.97, -31.58),
                    Vec(53.24, -29.76),
                    Vec(55.44, -27.7),
                    Vec(57.75, -25.05),
                    Vec(59.74, -22.3),
                    Vec(61.82, -18.68),
                    Vec(63.34, -15.1),
                    Vec(64.85, -10.36),
                    Vec(65.89, -5.79),
                    Vec(66.96, -1.88),
                    Vec(67.96, 2.73),
                    Vec(68.62, 5.58),
                    Vec(68.9, 7.47),
                    Vec(69.09, 9.27),
                    Vec(70.02, 19.17),
                    Vec(70.13, 22.6),
                    Vec(69.86, 25.71),
                    Vec(68.93, 29.98),
                    Vec(67.42, 34.83),
                    Vec(66.23, 38.7),
                    Vec(65.06, 43.96),
                    Vec(64.18, 47.95),
                    Vec(62.58, 52.14),
                    Vec(60.04, 56.77),
                    Vec(55.08, 62),
                    Vec(51.17, 64.39),
                    Vec(45.68, 65.79),
                    Vec(39.96, 66.45),
                    Vec(32.45, 66.52),
                    Vec(30.05, 56.05),
                    Vec(34.13, 55.94),
                    Vec(38.52, 55.89),
                    Vec(42.65, 55.56),
                    Vec(46.57, 54.67),
                    Vec(48.65, 53.14),
                    Vec(50.52, 51.09),
                    Vec(52.36, 48.26),
                    Vec(53.79, 44.75),
                    Vec(54.72, 40.36),
                    Vec(56, 35.43),
                    Vec(57.16, 31.72),
                    Vec(58.54, 27.14),
                    Vec(59.42, 22.96),
                    Vec(59.4, 20.08),
                    Vec(59.06, 16.71),
                    Vec(58.72, 14),
                    Vec(58.51, 11.1),
                    Vec(58.23, 7.64),
                    Vec(57.19, 3.41),
                    Vec(56, -1.37),
                    Vec(55.37, -5.08),
                    Vec(54.37, -8.87),
                    Vec(53.11, -12.63),
                    Vec(51.38, -16.13),
                    Vec(49.23, -19.26),
                    Vec(47.05, -21.49),
                    Vec(44.44, -23.44)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec(-8.48, 40.37),
                    Vec(-2.52, 41.81),
                    Vec(-2.62, 43.66),
                    Vec(-2.75, 46.35),
                    Vec(-2.73, 49.48),
                    Vec(-2.04, 52.08),
                    Vec(0.5, 53.23),
                    Vec(2.04, 53.58),
                    Vec(3.42, 54.4),
                    Vec(7.05, 54.94),
                    Vec(11.69, 55.25),
                    Vec(15.93, 55.38),
                    Vec(20.82, 55.42),
                    Vec(26.29, 55.79),
                    Vec(31.11, 56),
                    Vec(33.69, 56.03),
                    Vec(34.18, 66.53),
                    Vec(32.37, 66.61),
                    Vec(33.1, 69.51),
                    Vec(33.36, 71.97),
                    Vec(33.45, 74.84),
                    Vec(33.47, 78.41),
                    Vec(33.43, 81.85),
                    Vec(33.34, 85.11),
                    Vec(33.21, 87.79),
                    Vec(33.05, 90.34),
                    Vec(32.96, 92.59),
                    Vec(32.78, 94.87),
                    Vec(32.56, 97.66),
                    Vec(32.29, 100.44),
                    Vec(32.15, 103.13),
                    Vec(32.29, 106.61),
                    Vec(32.29, 109.22),
                    Vec(31.88, 110.74),
                    Vec(31.11, 112.15),
                    Vec(29.73, 112.54),
                    Vec(28.21, 112.37),
                    Vec(26.65, 111.86),
                    Vec(25.28, 110.42),
                    Vec(23.87, 108.94),
                    Vec(22.81, 107.74),
                    Vec(22.38, 106.73),
                    Vec(22.36, 104.55),
                    Vec(22.26, 101.95),
                    Vec(22.48, 98.92),
                    Vec(22.78, 95.47),
                    Vec(23.02, 92.34),
                    Vec(23.19, 89.52),
                    Vec(23.41, 85.82),
                    Vec(23.53, 82.4),
                    Vec(23.56, 79.12),
                    Vec(23.56, 76.75),
                    Vec(23.56, 74.18),
                    Vec(23.36, 71.08),
                    Vec(22.86, 67.56),
                    Vec(22.65, 66.12),
                    Vec(18.25, 66.01),
                    Vec(13.48, 65.84),
                    Vec(9.06, 65.56),
                    Vec(5.03, 65.16),
                    Vec(1.16, 64.73),
                    Vec(-2.76, 63.94),
                    Vec(-6.66, 62.53),
                    Vec(-9.64, 60.61),
                    Vec(-12.04, 58.02),
                    Vec(-13.33, 55.6),
                    Vec(-14.09, 53.24),
                    Vec(-14.49, 50.7),
                    Vec(-14.66, 48.06),
                    Vec(-14.62, 45.61),
                    Vec(-14.51, 43.28),
                    Vec(-14.4, 41.83)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec(-1.46, 33.75),
                    Vec(-1.06, 31.8),
                    Vec(-4.79, 32.13),
                    Vec(-9.83, 32.1),
                    Vec(-12.91, 30.76),
                    Vec(-16.05, 30.71),
                    Vec(-19.15, 30.7),
                    Vec(-23.24, 30.67),
                    Vec(-28.28, 30.67),
                    Vec(-32.69, 30.75),
                    Vec(-36.85, 31.14),
                    Vec(-41.26, 31.09),
                    Vec(-47.04, 30.35),
                    Vec(-51.02, 28.1),
                    Vec(-54.43, 25.62),
                    Vec(-57.18, 22.42),
                    Vec(-58.67, 19.67),
                    Vec(-59.19, 17.11),
                    Vec(-61.63, 15.88),
                    Vec(-63.62, 15),
                    Vec(-65.92, 13.91),
                    Vec(-68.6, 12.59),
                    Vec(-70.96, 11.45),
                    Vec(-70.94, 13.11),
                    Vec(-70.54, 15.79),
                    Vec(-70.14, 18.44),
                    Vec(-69.8, 21.37),
                    Vec(-68.8, 24.01),
                    Vec(-67.34, 26.73),
                    Vec(-64.98, 30.14),
                    Vec(-61.87, 33.38),
                    Vec(-58.07, 36.26),
                    Vec(-53.68, 39.16),
                    Vec(-49.41, 40.89),
                    Vec(-43.97, 41.75),
                    Vec(-38.92, 42.22),
                    Vec(-33.45, 42.09),
                    Vec(-27.04, 41.88),
                    Vec(-22.04, 41.73),
                    Vec(-14.5, 41.78),
                    Vec(-11.57, 42.76),
                    Vec(-8.68, 41.88),
                    Vec(-5.61, 42.72),
                    Vec(-2.59, 41.96),
                    Vec(-2.3, 39.32),
                    Vec(-1.8, 36.14)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec(67.05, 10.89),
                    Vec(69.16, 9.24),
                    Vec(71.68, 8.99),
                    Vec(74.89, 8.85),
                    Vec(78.56, 8.63),
                    Vec(82.05, 8.32),
                    Vec(85.49, 7.98),
                    Vec(88.39, 7.81),
                    Vec(91.81, 7.82),
                    Vec(95.63, 7.5),
                    Vec(99.06, 6.94),
                    Vec(102.61, 6.04),
                    Vec(105.6, 4.86),
                    Vec(108, 3.54),
                    Vec(110.08, 2.42),
                    Vec(112.29, 1.36),
                    Vec(114, 1.24),
                    Vec(115.67, 2.36),
                    Vec(117.31, 3.52),
                    Vec(118.92, 4.56),
                    Vec(119.6, 5.63),
                    Vec(120.01, 6.97),
                    Vec(119.63, 8.27),
                    Vec(118.7, 9.51),
                    Vec(117.4, 10.05),
                    Vec(115.78, 10.82),
                    Vec(113.93, 11.71),
                    Vec(111.84, 12.96),
                    Vec(109.88, 13.94),
                    Vec(107.13, 15.04),
                    Vec(103.92, 15.98),
                    Vec(101.27, 16.63),
                    Vec(98.26, 17.15),
                    Vec(94.2, 17.54),
                    Vec(90.6, 17.62),
                    Vec(85.91, 17.89),
                    Vec(80.99, 18.29),
                    Vec(76.5, 18.61),
                    Vec(73.3, 18.79),
                    Vec(69.99, 19.42),
                    Vec(67.52, 16.76),
                    Vec(68.58, 13.4)
                ])
            },
            {
                color: 0x542828,
                hitbox: RectangleHitbox.fromRect(12.65, 25.09, Vec(47.38, 25.18))
            },
            {
                color: 0xaaaaaa,
                hitbox: RectangleHitbox.fromRect(11.15, 23.6, Vec(47.4, 25.16))
            },
            {
                color: 0x6b3232,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.16, 0.91, Vec(52.39, 36.51)),
                    RectangleHitbox.fromRect(0.95, 2.98, Vec(42.3, 19.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(47.29, 25.5)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(50.27, 28.51)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(44.27, 28.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(47.27, 31.51)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(44.27, 34.52)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(44.26, 22.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(50.27, 22.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(47.27, 19.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(44.27, 16.49)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(50.27, 16.46)),
                    RectangleHitbox.fromRect(1.21, 2.98, Vec(52.38, 19.49)),
                    RectangleHitbox.fromRect(1.21, 2.98, Vec(52.4, 25.49)),
                    RectangleHitbox.fromRect(1.19, 2.98, Vec(52.38, 31.51)),
                    RectangleHitbox.fromRect(0.95, 2.98, Vec(42.3, 31.5)),
                    RectangleHitbox.fromRect(0.95, 2.98, Vec(42.32, 25.5)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec(50.28, 34.49)),
                    RectangleHitbox.fromRect(2.97, 0.96, Vec(47.29, 36.47)),
                    RectangleHitbox.fromRect(2.97, 0.96, Vec(47.28, 13.84)),
                    RectangleHitbox.fromRect(1.16, 1.62, Vec(52.39, 14.16)),
                    RectangleHitbox.fromRect(0.95, 1.62, Vec(42.3, 14.18)),
                    RectangleHitbox.fromRect(0.95, 0.95, Vec(42.29, 36.49))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "campsite_case", position: Vec(61.56, -48.94), rotation: 0 },

            { idString: "pebble", position: Vec(-5.9, -3.68) },
            { idString: "pebble", position: Vec(-54.97, 27.96) },
            { idString: "pebble", position: Vec(-4.89, 32.17) },
            { idString: "pebble", position: Vec(-36.46, 40.17) },
            { idString: "pebble", position: Vec(24.95, 59.42) },
            { idString: "pebble", position: Vec(60.61, 37.69) },
            { idString: "pebble", position: Vec(-6.77, -38.21) },
            { idString: "pebble", position: Vec(-4.67, -61.59) },
            { idString: "pebble", position: Vec(-9.91, -85.03) },
            { idString: "pebble", position: Vec(57.63, -13.41) },
            { idString: "pebble", position: Vec(103.16, 7.98) },
            { idString: "pebble", position: Vec(28.6, 98.55) },

            { idString: "campsite_crate", position: Vec(-26.22, 20.96) },
            { idString: "campsite_crate", position: Vec(-17.47, 25.33) },
            { idString: "campsite_crate", position: Vec(-57.88, -43.67) },
            { idString: "campsite_crate", position: Vec(-48.34, -47.03) },
            { idString: "campsite_crate", position: Vec(69.8, -9.28) },
            { idString: "campsite_crate", position: Vec(54.51, 71.1) },

            { idString: "barrel", position: Vec(-37.78, -13.62) },
            { idString: "barrel", position: Vec(40.68, -113.28) },
            { idString: "barrel", position: Vec(47.76, 87.97) },

            { idString: "clearing_boulder", position: Vec(-100, 105.73) },
            { idString: "clearing_boulder", position: Vec(-123.28, 72.58) },
            { idString: "clearing_boulder", position: Vec(120.42, 104.75) },
            { idString: "clearing_boulder", position: Vec(-124.42, -102.24) },

            { idString: "regular_crate", position: Vec(11.19, -55.86) },
            { idString: "flint_crate", position: Vec(9.3, -66.29) },
            { idString: "regular_crate", position: Vec(-89.84, -7.51) },
            { idString: "regular_crate", position: Vec(-91.89, -17.5) },
            { idString: "regular_crate", position: Vec(-22, 58.36) },
            { idString: "regular_crate", position: Vec(-21.62, 68.79) },
            { idString: "regular_crate", position: Vec(97.17, -114.18) },
            { idString: "regular_crate", position: Vec(111, -113.18) },
            { idString: "regular_crate", position: Vec(129.49, -14.44) },
            { idString: "regular_crate", position: Vec(139.78, 39.52) },

            { idString: "box", position: Vec(4.37, -4.1) },
            { idString: { box: 1, grenade_box: 0.5 }, position: Vec(6.33, 0.79) },
            { idString: "box", position: Vec(15.6, 66.84) },
            { idString: "box", position: Vec(13.92, 71.94) },
            { idString: "box", position: Vec(37.03, 45.18) },
            { idString: "box", position: Vec(44.83, 32.46) },
            { idString: "box", position: Vec(49.87, 34.06) },
            { idString: "box", position: Vec(105.79, -82.57) },
            { idString: "box", position: Vec(-36.26, -21.29) },

            { idString: "stump", position: Vec(-50.49, 2) },
            { idString: "stump", position: Vec(-76.23, -7.7) },
            { idString: "hatchet_stump", position: Vec(-56.26, -19.3) },
            { idString: "stump", position: Vec(-75.79, -31.48) },
            { idString: "stump", position: Vec(-112.42, 33.21) },
            { idString: "stump", position: Vec(-74.33, -86.97) },
            { idString: randomStump, position: Vec(-130.31, -29.57) },
            { idString: randomStump, position: Vec(101.68, -46.53) },
            { idString: randomStump, position: Vec(87.31, 80.6) },

            { idString: "pumpkin", position: Vec(75.4, 50.55) },
            { idString: "pumpkin", position: Vec(83.56, 56.39) },
            { idString: "pumpkin", position: Vec(81.31, 31.66) },
            { idString: "pumpkin", position: Vec(82.83, -2.29) },
            { idString: "pumpkin", position: Vec(71.13, -23.64) },
            { idString: "pumpkin", position: Vec(78.3, -26.06) },
            { idString: "pumpkin", position: Vec(90.55, -21.96) },

            { idString: "large_pumpkin", position: Vec(92.12, -13.89) },
            { idString: "large_pumpkin", position: Vec(91.13, 37.64) },
            { idString: "large_pumpkin", position: Vec(93.9, 48.21) },

            { idString: "pine_tree", position: Vec(-66.33, -68.15) },
            { idString: "pine_tree", position: Vec(42.71, -93.71) },
            { idString: "pine_tree", position: Vec(76.03, -50.86) },
            { idString: "pine_tree", position: Vec(-86.1, 72.38) },

            { idString: "oak_tree", position: Vec(-102.86, -24.63) },
            { idString: "oak_tree", position: Vec(-63.51, -101.43) },
            { idString: "oak_tree", position: Vec(14.2, -103.61) },
            { idString: "oak_tree", position: Vec(-93.28, 35.66) },
            { idString: "oak_tree", position: Vec(-103.86, 2.86) },
            { idString: "oak_tree", position: Vec(-120.76, -42.59) },
            { idString: "oak_tree", position: Vec(-103.93, -71.77) },
            { idString: "oak_tree", position: Vec(-45.6, -98.66) },
            { idString: "oak_tree", position: Vec(-41.77, 99.59) },
            { idString: "oak_tree", position: Vec(4.86, 84.4) },
            { idString: "oak_tree", position: Vec(5.7, 106.07) },
            { idString: "oak_tree", position: Vec(61.69, 85.94) },
            { idString: "oak_tree", position: Vec(114.42, 63.52) },
            { idString: "oak_tree", position: Vec(121.78, 47.04) },
            { idString: "oak_tree", position: Vec(113.29, 30.21) },
            { idString: "oak_tree", position: Vec(118.15, -34.69) },
            { idString: "oak_tree", position: Vec(60.07, -60.79) },
            { idString: "oak_tree", position: Vec(-33.44, -64.7) },
            { idString: "oak_tree", position: Vec(132.49, -107.99) },
            { idString: "oak_tree", position: Vec(121.46, -65.32) },
            { idString: "oak_tree", position: Vec(67.82, -107.86) },
            { idString: "oak_tree", position: Vec(133.24, 6.9) },

            { idString: "cooler", position: Vec(47.17, 16.51), rotation: 0 },
            { idString: "fire_pit", position: Vec(25.87, -29) },

            { idString: "large_logs_pile", position: Vec(-72.55, -46.88), rotation: 0 },
            { idString: "large_logs_pile", position: Vec(6.9, 66.48), rotation: 1 },
            { idString: "large_logs_pile", position: Vec(40.15, -61.21), rotation: 1 },

            { idString: "small_logs_pile", position: Vec(-79.95, 15.45), rotation: 0 },
            { idString: "small_logs_pile", position: Vec(45.49, 75.44), rotation: 0 },
            { idString: "small_logs_pile", position: Vec(66.66, -0.52), rotation: 0 },
            { idString: "small_logs_pile", position: Vec(-16.28, 99.83), rotation: 0 },
            { idString: "small_logs_pile", position: Vec(97.4, -80.86), rotation: 0 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: randomTent, position: Vec(102.18, -95.33) },
            { idString: randomBigTent, position: Vec(-18, 24.5), orientation: 1 },
            { idString: randomTent, position: Vec(61.28, 25.97), orientation: 1 },
            { idString: randomHayShed, position: Vec(-50, 65.27) },
            { idString: "outhouse", position: Vec(-24.51, -17) }
        ]
    },
    {
        idString: "breached_dam",
        name: "Breached Dam(n)",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(100, 230, Vec(-16, -4.25)),
        allowFlyover: FlyoverPref.Always,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        floorZIndex: ZIndexes.Ground,
        bridgeMinRiverWidth: 18,
        bridgeHitbox: new GroupHitbox(
            // RectangleHitbox.fromRect(25, 42.3, Vec(-17.5, 37.93)),
            // RectangleHitbox.fromRect(25, 42.3, Vec(-17.5, -46.35)),
            RectangleHitbox.fromRect(100, 55, Vec(-16, -92)),
            RectangleHitbox.fromRect(100, 55, Vec(-16, 83))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.8, 9.91)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.97, -46.78)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.99, 19.36)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.99, 28.8)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.99, 38.25)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.96, 47.7)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.96, 9.91)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.97, -18.46)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.85, -18.46)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.88, -27.92)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-10.01, -27.92)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.85, -37.32)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.97, -37.35)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-10.01, -65.69)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.99, 57.21)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.85, 57.17)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.84, 47.71)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.9, 38.26)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.85, 28.79)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.85, 19.38)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.88, -46.82)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.91, -56.23)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-9.97, -56.26)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec(-24.87, -65.69)),
            RectangleHitbox.fromRect(3.81, 36.35, Vec(-7.79, -43.61)),
            RectangleHitbox.fromRect(3.81, 36.35, Vec(-7.84, 35.09)),
            RectangleHitbox.fromRect(3.81, 36.35, Vec(-27.08, 35.12)),
            RectangleHitbox.fromRect(3.81, 36.35, Vec(-27.08, -43.59)),
            RectangleHitbox.fromRect(1.52, 49.69, Vec(-10, -39.95)),
            RectangleHitbox.fromRect(1.52, 49.69, Vec(-24.85, 32.46)),
            RectangleHitbox.fromRect(1.52, 49.69, Vec(-10.01, 32.05)),
            RectangleHitbox.fromRect(1.52, 49.69, Vec(-24.85, -39.93))
        ),
        groundGraphics: [
            {
                color: 0x363630,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.34, 36.45, Vec(-8.57, -43.59)),
                    RectangleHitbox.fromRect(5.34, 36.45, Vec(-8.62, 35.05)),
                    RectangleHitbox.fromRect(5.34, 36.45, Vec(-26.32, 35.14)),
                    RectangleHitbox.fromRect(5.34, 36.45, Vec(-26.27, -43.59))
                )
            },
            {
                color: 0x6c6c60,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.15, 35.43, Vec(-8.95, -43.61)),
                    RectangleHitbox.fromRect(5.15, 35.43, Vec(-8.99, 35.1)),
                    RectangleHitbox.fromRect(5.15, 35.43, Vec(-25.88, 35.1)),
                    RectangleHitbox.fromRect(5.15, 35.43, Vec(-25.88, -43.61))
                )
            }
        ],
        floors: [
            {
                type: FloorNames.Water,
                hitbox: new PolygonHitbox([
                    Vec(-25.14, -17.94),
                    Vec(-24.98, 9.69),
                    Vec(-16.72, 11.86),
                    Vec(-9.64, 7.22),
                    Vec(-9.85, -18.37),
                    Vec(-20.39, -20.34)
                ])
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(15.24, 125.07, Vec(-17.56, -4.28))
            }
        ],
        floorImages: [
            {
                key: "breached_dam_pillar",
                position: Vec(-23.53, -16.15)
            },
            {
                key: "breached_dam_pillar",
                position: Vec(-23.53, -4.26)
            },
            {
                key: "breached_dam_pillar",
                position: Vec(-23.53, 7.62)
            },
            {
                key: "breached_dam_floor",
                position: Vec(-17.5, -4.25),
                scale: Vec(2, 2)
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "oak_tree", position: Vec(-34.95, 95.26) },
            { idString: "oak_tree", position: Vec(-39.54, -93.9) },
            { idString: "oak_tree", position: Vec(2.65, -105.9) },
            { idString: "oak_tree", position: Vec(-9.45, -87.93) },

            { idString: "regular_crate", position: Vec(18.88, -88.73) },
            { idString: "regular_crate", position: Vec(-17.43, -33.26) },
            { idString: "regular_crate", position: Vec(-17.49, 36.64) },
            { idString: "regular_crate", position: Vec(-44.61, 73.56) },

            { idString: "barrel", position: Vec(-19.5, 26.43) },
            { idString: "barrel", position: Vec(29.46, -88.82) },
            { idString: "barrel", position: Vec(-44.58, 63.1) },

            { idString: "propane_tank", position: Vec(-36.93, -73.22) },
            { idString: "propane_tank", position: Vec(-39.85, -77.38) },
            { idString: "propane_tank", position: Vec(4.18, 68.95) },
            { idString: "propane_tank", position: Vec(4.18, 63.99) },

            { idString: "sandbags", position: Vec(-15.4, -44.88), rotation: 1 },
            { idString: "ammo_crate", position: Vec(24.85, -78.26) },
            { idString: "ammo_crate", position: Vec(-34.17, 67.72) },
            { idString: "ammo_crate", position: Vec(11.91, 66.33) },

            { idString: "hatchet_stump", position: Vec(-43.91, -72.21) },
            { idString: "stump", position: Vec(-18.25, -98.24) },
            { idString: "stump", position: Vec(-16.86, 99) }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: randomHayShed, position: Vec(9.77, 87) }
        ]
    },
    {
        idString: "fulcrum_bunker",
        name: "Fulcrum Bunker",
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14, 20.5, Vec(-9.81, 47.65)),
            RectangleHitbox.fromRect(14, 20.5, Vec(-30.2, -40.75)),
            RectangleHitbox.fromRect(27, 37, Vec(-0.8, 0))
        ),
        bunkerSpawnHitbox: RectangleHitbox.fromRect(150, 110),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.01, 12.65, Vec(-34.94, -38)),
            RectangleHitbox.fromRect(2.01, 12.65, Vec(-25.46, -38)),
            RectangleHitbox.fromRect(2.01, 12.65, Vec(-5.07, 44.9)),
            RectangleHitbox.fromRect(2.01, 12.65, Vec(-14.55, 44.9))
        ),
        material: "metal_heavy",
        particle: "bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        floorImages: [
            { key: "fulcrum_bunker_entrance", position: Vec(-30.2, -38), rotation: Math.PI },
            { key: "fulcrum_bunker_entrance", position: Vec(-9.81, 44.9) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "fulcrum_bunker_collider_hack", position: Vec(0, 0), rotation: 0 },

            // Upper entrance
            { idString: randomTree, position: Vec(-18.85, -38.2) },
            { idString: randomTree, position: Vec(-41.97, -39.29) },
            { idString: randomTree, position: Vec(-29.92, -27.26) },
            { idString: "bush", position: Vec(-35.88, -48.65), rotation: 0 },
            { idString: "bush", position: Vec(-27.44, -47.82), rotation: 0 },
            { idString: "bush", position: Vec(-8.38, -28.77), rotation: 0 },
            { idString: "bush", position: Vec(-55.92, -38.54), rotation: 0 },
            { idString: "fulcrum_bunker_stair", position: Vec(-30.2, -39.26), rotation: 0, layer: Layer.ToBasement },

            // Lower entrance
            { idString: randomTree, position: Vec(-9.82, 32.88) },
            { idString: randomTree, position: Vec(3.62, 43.58) },
            { idString: randomTree, position: Vec(-20.92, 47.64) },
            { idString: "bush", position: Vec(-13.13, 55.88) },
            { idString: "bush", position: Vec(16.63, 37.75) },
            { idString: "bush", position: Vec(-27.11, 35.18) },
            { idString: "bush", position: Vec(-5.24, 55.57) },
            { idString: "fulcrum_bunker_stair", position: Vec(-9.81, 45.95), rotation: 2, layer: Layer.ToBasement }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "shed_2", position: Vec(0, 0) },
            { idString: "fulcrum_bunker_main", position: Vec(0, 0), layer: Layer.Basement }
        ]
    },
    {
        idString: "fulcrum_bunker_main",
        name: "Fulcrum Bunker",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(150, 110),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.99, 12.68, Vec(-34.96, -40.11)),
            RectangleHitbox.fromRect(55.38, 13.11, Vec(-41.2, 46.61)),
            RectangleHitbox.fromRect(2, 65.34, Vec(67.91, 8.68)),
            RectangleHitbox.fromRect(77.61, 1.99, Vec(12.36, -52.17)),
            RectangleHitbox.fromRect(1.99, 5.69, Vec(18.75, -6.2)),
            RectangleHitbox.fromRect(51.18, 1.99, Vec(43.32, -23.18)),
            RectangleHitbox.fromRect(1.99, 29.45, Vec(50.17, -37.9)),
            RectangleHitbox.fromRect(1.99, 3.78, Vec(18.73, -21.39)),
            RectangleHitbox.fromRect(1.99, 75.57, Vec(-67.91, 3.58)),
            RectangleHitbox.fromRect(8.57, 1.99, Vec(-38.26, 27.91)),
            RectangleHitbox.fromRect(74.6, 13.31, Vec(31.29, 46.53)),
            RectangleHitbox.fromRect(1.99, 32.15, Vec(-25.45, -35.66)),
            RectangleHitbox.fromRect(43.79, 1.99, Vec(-3.34, -4.35)),
            RectangleHitbox.fromRect(1.99, 25.42, Vec(-25.38, 3.77)),
            RectangleHitbox.fromRect(28.71, 1.99, Vec(-12.03, 16.73)),
            RectangleHitbox.fromRect(34, 1.99, Vec(-51.9, -34.77)),
            RectangleHitbox.fromRect(1.99, 14.34, Vec(-34.15, 34.08)),
            RectangleHitbox.fromRect(14.65, 1.99, Vec(-60.3, 27.88)),
            RectangleHitbox.fromRect(1.99, 22.73, Vec(2.19, 18.04))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(136.17, 64.86, Vec(0.05, 9.38)),
            RectangleHitbox.fromRect(76.22, 33.26, Vec(12.5, -35.12)),
            RectangleHitbox.fromRect(42.91, 12.98, Vec(-46.62, -28.09)),
            RectangleHitbox.fromRect(9.95, 10.28, Vec(-9.71, 46.62)),
            RectangleHitbox.fromRect(9.95, 10.28, Vec(-30.3, -38.88))
        ),
        material: "metal_heavy",
        particle: "bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Adjacent,
        floors: [
            {
                type: FloorNames.Carpet,
                hitbox: RectangleHitbox.fromRect(38.57, 10.93, Vec(-2.88, -13.11))
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(33.14, 29.28, Vec(33.94, -37.8)),
                    RectangleHitbox.fromRect(44.23, 48.64, Vec(-3.29, -28.12))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.28, 11.31, Vec(-9.63, 46.92)),
                    RectangleHitbox.fromRect(70.08, 79.42, Vec(-33.02, 3.19)),
                    RectangleHitbox.fromRect(10.28, 11.31, Vec(-30.31, -40.35))
                )
            },
            {
                type: FloorNames.Water,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(18.55, 45.56, Vec(10.71, 18.37)),
                    RectangleHitbox.fromRect(80.09, 65.24, Vec(58, 9.01))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(7.5, 10.68, Vec(-30.2, -39.26)),
                    RectangleHitbox.fromRect(7.5, 10.68, Vec(-9.81, 45.95))
                ),
                layer: Layer.ToBasement
            }
        ],
        floorImages: [
            {
                key: "fulcrum_bunker_floor_1",
                position: Vec(-34.45, 0)
            },
            {
                key: "fulcrum_bunker_floor_2",
                position: Vec(34.45, 0)
            }
        ],
        puzzle: {
            triggerOnSolve: "powered_metal_door",
            delay: 1000,
            unlockOnly: true
        },
        obstacles: IS_CLIENT ? undefined : [
            // TV/living area
            { idString: "bookshelf", position: Vec(-64.7, 0.33), rotation: 1, lootSpawnOffset: Vec(2, 0) },
            { idString: "bookshelf", position: Vec(-64.7, 13.15), rotation: 1, lootSpawnOffset: Vec(2, 0) },
            { idString: "tv", position: Vec(-66.33, 6.68), rotation: 2 },
            { idString: "couch", position: Vec(-49.47, 6.73), rotation: 2 },
            { idString: "water_cooler", position: Vec(-29.77, 2.3), rotation: 3 },
            { idString: "small_drawer", position: Vec(-30.41, 9.19), rotation: 3 },

            // Kitchen
            { idString: "kitchen_unit_1", position: Vec(-62.97, -14.49), rotation: 1 },
            { idString: "kitchen_unit_3", position: Vec(-62.97, -22.46), rotation: 1 },
            { idString: "kitchen_unit_2", position: Vec(-63.44, -30.27), rotation: 0 },
            { idString: "kitchen_unit_1", position: Vec(-57.26, -29.8), rotation: 0 },
            { idString: "fridge", position: Vec(-49.22, -30.12), rotation: 0 },
            { idString: "potted_plant", position: Vec(-40.94, -30.04) },

            // Lower left storage area
            { idString: "metal_door", position: Vec(-47.58, 27.93), rotation: 0 },
            { idString: "flint_crate", position: Vec(-61.56, 34.57) },
            { idString: "box", position: Vec(-38.44, 31.91), rotation: 0 },
            { idString: "box", position: Vec(-40.55, 37.07), rotation: 0 },

            // Dining area
            { idString: "small_table", position: Vec(-10.94, 22.23), rotation: 1 },
            { idString: "chair", position: Vec(-17.26, 22.23), rotation: 3 },
            { idString: "chair", position: Vec(-4.6, 22.23), rotation: 1 },
            { idString: "trash_can", position: Vec(-30.16, 29.88) },
            { idString: "potted_plant", position: Vec(-29.3, 36.21) },
            { idString: "metal_door", position: Vec(2.09, 34.41), rotation: 1 },

            // Flooded area
            { idString: "sandbags", position: Vec(23.28, 21.91), rotation: 0 },
            { idString: "sandbags", position: Vec(20.78, 32.93), rotation: 1 },
            { idString: "regular_crate", position: Vec(30.31, 32.15), rotation: 0 },
            { idString: "regular_crate", position: Vec(40.47, 33.94), rotation: 0 },
            { idString: "sandbags", position: Vec(59.84, 6.45), rotation: 0 },
            { idString: "control_panel", position: Vec(62.34, -16.05), rotation: 3, puzzlePiece: true },
            { idString: "control_panel2", position: Vec(62.34, -4.02), rotation: 3 },
            { idString: "pipe", position: Vec(28.89, -7.25), rotation: 1, variation: 0 },
            { idString: "pipe", position: Vec(44.93, -13.75), rotation: 0, variation: 2 },
            { idString: "pipe", position: Vec(56.8, 35.23), rotation: 1, variation: 3 },
            { idString: "pipe", position: Vec(7.86, 29.77), rotation: 0, variation: 3 },

            // Vault
            { idString: "powered_metal_door", position: Vec(2.04, 2.12), rotation: 3, locked: true },
            { idString: "gun_case", position: Vec(-18.99, -0.25), rotation: 0 },
            { idString: "box", position: Vec(-21.05, 12.46) },
            { idString: "barrel", position: Vec(-3.2, 11.67) },
            { idString: "gun_mount_svu", position: Vec(-13.07, 13.87), rotation: 2 },

            // Living quarters hallway
            { idString: "metal_door", position: Vec(-25.4, -14.45), rotation: 1 },
            { idString: "metal_door", position: Vec(18.66, -14.06), rotation: 3 },
            { idString: "bookshelf", position: Vec(-3.01, -7.85), rotation: 0 },
            { idString: "bookshelf", position: Vec(16.21, -31.29), rotation: 1 },
            { idString: "box", position: Vec(-1.29, -48.56), rotation: 0 },
            { idString: "box", position: Vec(-2.54, -43.17), rotation: 0 },

            // Bathroom
            { idString: "house_wall_14", position: Vec(-15.98, -23.01), rotation: 0 },
            { idString: "house_wall_25", position: Vec(-5.98, -42.87), rotation: 1 },
            { idString: "house_column", position: Vec(-6.05, -23.01) },
            { idString: "door", position: Vec(-5.98, -30), rotation: 1 },
            { idString: randomToilet, position: Vec(-20.9, -46.45), rotation: 0 },
            { idString: "sink", position: Vec(-12.15, -46.84), rotation: 0 },
            { idString: "potted_plant", position: Vec(-20.59, -27.62) },

            // Bedroom
            { idString: "house_wall_24", position: Vec(19.73, -31.19), rotation: 1 },
            { idString: "house_column", position: Vec(19.73, -39.7) },
            { idString: "door", position: Vec(19.73, -46.67), rotation: 1 },
            { idString: "trash_can", position: Vec(23.71, -27.38) },
            { idString: "potted_plant", position: Vec(44.72, -28.24) },
            { idString: "small_drawer", position: Vec(45.2, -35.82), rotation: 3 },
            { idString: "bed", position: Vec(40.71, -45.2), rotation: 3 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: randomPallet, position: Vec(36, 22) },
            { idString: randomPallet, position: Vec(-25, 61), orientation: 1 },
            { idString: randomPallet, position: Vec(41, -16) },
            { idString: "fulcrum_bunker_vault", position: Vec(-11.6, 6.3) }
        ]
    },
    {
        idString: "fulcrum_bunker_vault",
        name: "Fulcrum Bunker Vault",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(26.4, 19.97),
        ceilingHitbox: RectangleHitbox.fromRect(26.4, 19.97),
        ceilingImages: [{
            key: "fulcrum_bunker_vault_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }]
    },
    {
        idString: "fox_bunker",
        name: "Panther Bunker",
        defType: DefinitionType.Building,
        spawnMode: MapObjectSpawnMode.Ring,
        spawnRadius: 300,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(15, 18, Vec(-14.49, -27.97)),
            RectangleHitbox.fromRect(15, 18, Vec(-14.31, 27.75))
        ),
        bunkerSpawnHitbox: RectangleHitbox.fromRect(80, 80),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(7.5, 10, Vec(-14.49, -29.4)),
            RectangleHitbox.fromRect(7.5, 10, Vec(-14.31, 29.4))
        ),
        ceilingImages: [
            { key: "hunted_bunker_entrance_ceiling", position: Vec(-14.49, -27.97), rotation: Math.PI },
            { key: "hunted_bunker_entrance_ceiling", position: Vec(-14.31, 27.75) },
            { key: "fox_logo", position: Vec(-14.49, -27.97), rotation: Math.PI },
            { key: "fox_logo", position: Vec(-14.31, 27.75) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "hunted_bunker_collider_hack", position: Vec(-18.83, 28.2), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_collider_hack", position: Vec(-9.77, 28.12), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_collider_hack", position: Vec(-19.18, -28.44), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_collider_hack", position: Vec(-10.02, -28.57), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_entrance", position: Vec(-14.31, 27.75), rotation: 0 },
            { idString: "hunted_bunker_entrance", position: Vec(-14.49, -27.97), rotation: 2 },
            { idString: "hunted_bunker_stair", position: Vec(-14.2, 27), rotation: 2, layer: Layer.ToBasement },
            { idString: "hunted_bunker_stair", position: Vec(-14.5, -27), rotation: 0, layer: Layer.ToBasement }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "fox_bunker_main", position: Vec(0, 0), layer: Layer.Basement }
        ]
    },
    {
        idString: "fox_bunker_main",
        name: "Panther Bunker",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(80, 80),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(43.32, 69.63, Vec(-14.31, 0.01)),
            RectangleHitbox.fromRect(30.11, 34.43, Vec(21.04, -0.27))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(29.01, 1.64, Vec(22.62, 17.49)),
            RectangleHitbox.fromRect(1.69, 13.66, Vec(-9.67, 28.73)),
            RectangleHitbox.fromRect(1.69, 13.66, Vec(-9.96, -28.75)),
            RectangleHitbox.fromRect(1.69, 28.55, Vec(7.65, 21.03)),
            RectangleHitbox.fromRect(1.69, 71.58, Vec(-36.27, -0.01)),
            RectangleHitbox.fromRect(1.69, 36.02, Vec(36.27, 0.27)),
            RectangleHitbox.fromRect(29.01, 1.64, Vec(22.62, -17.5)),
            RectangleHitbox.fromRect(1.69, 31.79, Vec(7.71, -19.68)),
            RectangleHitbox.fromRect(44.15, 1.66, Vec(-13.51, -34.94)),
            RectangleHitbox.fromRect(44.05, 1.66, Vec(-13.53, 34.94)),
            RectangleHitbox.fromRect(1.69, 13.66, Vec(-18.8, 28.73)),
            RectangleHitbox.fromRect(1.69, 13.66, Vec(-19.12, -28.77)),
            RectangleHitbox.fromRect(3.21, 3.21, Vec(-7.05, 8.44)),
            RectangleHitbox.fromRect(3.21, 3.21, Vec(-21.87, 8.41)),
            RectangleHitbox.fromRect(3.21, 3.21, Vec(-21.83, -6.33)),
            RectangleHitbox.fromRect(3.21, 3.21, Vec(-7.07, -6.31))
        ),
        material: "metal_heavy",
        particle: "bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Equal,
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(43.32, 69.63, Vec(-14.31, 0.01)),
                    RectangleHitbox.fromRect(30.11, 34.43, Vec(21.04, -0.27))
                )
            },
            { // stairs
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(7.68, 10.82, Vec(-14.63, -28.85)),
                    RectangleHitbox.fromRect(7.68, 10.82, Vec(-14.32, 28.84))
                ),
                layer: Layer.ToBasement
            },
            { // stairs
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(7.68, 10.82, Vec(-14.63, -28.85)),
                    RectangleHitbox.fromRect(7.68, 10.82, Vec(-14.32, 28.84))
                ),
                layer: Layer.Ground
            }
        ],
        floorImages: [
            {
                key: "fox_bunker_floor_2",
                position: Vec(22.25, 0)
            },
            {
                key: "fox_bunker_floor_1",
                position: Vec(-14.4, 0)
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "small_lamp_thingy", position: Vec(18.18, 0) },

            { idString: "control_panel_small", position: Vec(-14.36, 11.22), rotation: 0 },
            { idString: "control_panel_small", position: Vec(-14.36, -9.22), rotation: 2 },

            { idString: "ammo_crate", position: Vec(13.96, 11.66) },
            { idString: "ammo_crate", position: Vec(13.96, -11.66) },
            { idString: "ammo_crate", position: Vec(-19.05, 1.26) },
            { idString: "ammo_crate", position: Vec(-9.5, 1.26) },

            { idString: "cabinet", position: Vec(-27.79, -31.02), rotation: 0 },
            { idString: "cabinet", position: Vec(-1.31, -31.02), rotation: 0 },
            { idString: "cabinet", position: Vec(-27.79, 31.02), rotation: 2 },
            { idString: "cabinet", position: Vec(-1.31, 31.02), rotation: 2 },

            { idString: "grenade_crate", position: Vec(-31.7, -24.11) },
            { idString: "grenade_crate", position: Vec(2.66, 24.11) },
            { idString: "grenade_crate", position: Vec(31.73, 12.54) },

            { idString: "nsd_crate", position: Vec(30.48, -11.52) },
            { idString: "special_table_helmet", position: Vec(30.98, 0.51), rotation: 0 },
            { idString: "pink_metal_auto_door", position: Vec(7.65, 1.55), rotation: 1, locked: true }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: "fox_bunker_vault",
            position: Vec(0, 22),
            orientation: 1
        }]
    },
    {
        idString: "fox_bunker_vault",
        name: "Panther Bunker Vault",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(34.05, 28),
        ceilingHitbox: RectangleHitbox.fromRect(34.05, 28),
        ceilingImages: [{
            key: "vault_ceiling",
            position: Vec(0, 0),
            scale: Vec(2.68, 2.16)
        }]
    },
    {
        idString: "moose_bunker",
        name: "Moose Bunker",
        defType: DefinitionType.Building,
        spawnMode: MapObjectSpawnMode.Ring,
        spawnRadius: 300,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(15, 18, Vec(30.78, -28.42)),
            RectangleHitbox.fromRect(15, 18, Vec(-30.71, 28.2))
        ),
        bunkerSpawnHitbox: RectangleHitbox.fromRect(83.74, 83.74),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(7.5, 10, Vec(30.78, -29.6)),
            RectangleHitbox.fromRect(7.5, 10, Vec(-30.71, 29.42))
        ),
        ceilingImages: [
            { key: "hunted_bunker_entrance_ceiling", position: Vec(30.78, -28.42), rotation: Math.PI },
            { key: "hunted_bunker_entrance_ceiling", position: Vec(-30.71, 28.2) },
            { key: "moose_logo", position: Vec(30.78, -28.42), rotation: Math.PI },
            { key: "moose_logo", position: Vec(-30.71, 28.2) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "hunted_bunker_collider_hack", position: Vec(-26.19, 28.76), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_collider_hack", position: Vec(-35.39, 29.12), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_collider_hack", position: Vec(26.18, -29.48), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_collider_hack", position: Vec(35.35, -29.41), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_entrance", position: Vec(-30.71, 28.2), rotation: 0 },
            { idString: "hunted_bunker_entrance", position: Vec(30.78, -28.42), rotation: 2 },
            { idString: "hunted_bunker_stair", position: Vec(30.72, -27.6), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_stair", position: Vec(-30.72, 27.5), rotation: 2, layer: Layer.ToBasement }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "moose_bunker_main", position: Vec(0, 0), layer: Layer.Basement }
        ]
    },
    {
        idString: "moose_bunker_main",
        name: "Tiger Bunker",
        defType: DefinitionType.Building,
        material: "metal_heavy",
        particle: "bunker_particle",
        collideWithLayers: Layers.Equal,
        reflectBullets: true,
        spawnHitbox: RectangleHitbox.fromRect(83.74, 83.74),
        ceilingHitbox: RectangleHitbox.fromRect(69.85, 69.85),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(5.08, 5.1, Vec(11.91, -11.83)),
            RectangleHitbox.fromRect(5.08, 5.08, Vec(11.92, 11.89)),
            RectangleHitbox.fromRect(5.08, 5.09, Vec(-11.92, 11.83)),
            RectangleHitbox.fromRect(5.08, 5.08, Vec(-11.87, -11.89)),
            RectangleHitbox.fromRect(1.66, 20, Vec(-11.88, -0.46)),
            RectangleHitbox.fromRect(1.66, 20, Vec(11.92, -0.13)),
            RectangleHitbox.fromRect(1.72, 72.72, Vec(35.37, -0.02)),
            RectangleHitbox.fromRect(1.66, 71.7, Vec(-35.37, 0.49)),
            RectangleHitbox.fromRect(9.51, 1.65, Vec(5.95, -11.83)),
            RectangleHitbox.fromRect(9.5, 1.66, Vec(-5.79, 11.84)),
            RectangleHitbox.fromRect(71.19, 1.65, Vec(-0.61, -35.47)),
            RectangleHitbox.fromRect(70.44, 1.71, Vec(0.19, 35.47)),
            RectangleHitbox.fromRect(1.66, 13.37, Vec(26.21, -29.24)),
            RectangleHitbox.fromRect(1.65, 13.38, Vec(-26.2, 29.25))
        ),
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(60.38, 21.97, Vec(-4.72, -23.66)),
                    RectangleHitbox.fromRect(69.71, 48.11, Vec(-0.12, 0)),
                    RectangleHitbox.fromRect(60.38, 21.97, Vec(4.48, 23.84))
                )
            },
            // Stairs
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(7.76, 10.89, Vec(30.77, -29.39)),
                    RectangleHitbox.fromRect(7.76, 10.89, Vec(-30.81, 29.35))
                ),
                layer: Layer.ToBasement
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(7.76, 10.89, Vec(30.77, -29.39)),
                    RectangleHitbox.fromRect(7.76, 10.89, Vec(-30.81, 29.35))
                ),
                layer: Layer.Ground
            }
        ],
        floorImages: [{
            key: "moose_bunker_floor",
            position: Vec(0, 0)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "small_lamp_thingy", position: Vec(0.09, -4.68) },
            { idString: "special_table_vest", position: Vec(0.19, 0.17), rotation: 1 },

            { idString: "pink_metal_auto_door", position: Vec(4.16, 11.81), rotation: 0, locked: true },
            { idString: "pink_metal_auto_door", position: Vec(-4.07, -11.85), rotation: 2, locked: true },

            { idString: "fire_hatchet_case", position: Vec(-15.16, 30.29), rotation: 2 },

            { idString: "nsd_crate", position: Vec(18.19, -29.25) },

            { idString: "ammo_crate", position: Vec(-0.02, -29.25) },
            { idString: "ammo_crate", position: Vec(29.37, 0.05) },
            { idString: "ammo_crate", position: Vec(-29.33, -0.02) },
            { idString: "ammo_crate", position: Vec(0.05, 29.25) },

            { idString: "control_panel_small", position: Vec(-29.59, -29.63), rotation: 0 }, // this poor control panel is as lonely as me

            { idString: "control_panel2", position: Vec(29.41, 12.11), rotation: 3 },
            { idString: "control_panel2", position: Vec(-19.5, -29.63), rotation: 0 },

            { idString: "grey_office_chair", position: Vec(-29.84, -21.55), rotation: 2 },
            { idString: "grey_office_chair", position: Vec(-21.31, -21.7), rotation: 1 },

            {
                idString: "cabinet",
                position: Vec(12.4, 31.73),
                rotation: 2,
                lootSpawnOffset: Vec(0, -2)
            },
            {
                idString: "cabinet",
                position: Vec(27.06, 31.73),
                rotation: 2,
                lootSpawnOffset: Vec(-0.5, -2)
            }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: "moose_bunker_vault",
            position: Vec(0, 0)
        }]
    },
    {
        idString: "moose_bunker_vault",
        name: "Tiger Bunker Vault",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(25, 25),
        ceilingHitbox: RectangleHitbox.fromRect(22, 22),
        ceilingImages: [{
            key: "moose_bunker_vault_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }]
    },
    {
        idString: "bear_bunker",
        name: "Bear Bunker",
        defType: DefinitionType.Building,
        spawnMode: MapObjectSpawnMode.Ring,
        spawnRadius: 300,
        material: "metal_heavy",
        particle: "bunker_particle",
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(18, 15, Vec(52.3, -5.11)),
            RectangleHitbox.fromRect(15, 18, Vec(0, 28.3))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(10, 7.5, Vec(54, -5.11)),
            RectangleHitbox.fromRect(7.5, 10, Vec(0, 29.6))
        ),
        bunkerSpawnHitbox: RectangleHitbox.fromRect(130, 80),
        ceilingImages: [
            { key: "hunted_bunker_entrance_ceiling", position: Vec(52.54, -5.11), rotation: -Math.PI / 2 },
            { key: "hunted_bunker_entrance_ceiling", position: Vec(0, 28.3) },
            { key: "bear_logo", position: Vec(52.54, -5.11), rotation: -Math.PI / 2 },
            { key: "bear_logo", position: Vec(0, 28.3) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "hunted_bunker_collider_hack", position: Vec(-4.57, 28.71), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_collider_hack", position: Vec(4.66, 28.71), rotation: 0, layer: Layer.ToBasement },
            { idString: "hunted_bunker_collider_hack", position: Vec(52.7, -9.67), rotation: 1, layer: Layer.ToBasement },
            { idString: "hunted_bunker_collider_hack", position: Vec(52.7, -0.55), rotation: 1, layer: Layer.ToBasement },
            { idString: "hunted_bunker_stair", position: Vec(51.7, -5.14), rotation: 3, layer: Layer.ToBasement },
            { idString: "hunted_bunker_stair", position: Vec(0, 27.5), rotation: 2, layer: Layer.ToBasement },
            { idString: "hunted_bunker_entrance", position: Vec(0, 28.3), rotation: 0 },
            { idString: "hunted_bunker_entrance", position: Vec(52.54, -5.11), rotation: 1 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "bear_bunker_main", position: Vec(0, 0), layer: Layer.Basement }
        ]
    },
    {
        idString: "bear_bunker_main",
        name: "Lion Bunker",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(130, 80),
        ceilingHitbox: RectangleHitbox.fromRect(120, 71),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.67, 13.03, Vec(-4.59, 28.95)),
            RectangleHitbox.fromRect(1.67, 72.64, Vec(-59.74, 0.01)),
            RectangleHitbox.fromRect(119.88, 1.66, Vec(0.02, -35.49)),
            RectangleHitbox.fromRect(1.66, 72.64, Vec(59.74, 0)),
            RectangleHitbox.fromRect(1.66, 36.39, Vec(-17.43, 6)),
            RectangleHitbox.fromRect(1.67, 13.03, Vec(4.58, 28.96)),
            RectangleHitbox.fromRect(2.99, 2.99, Vec(40.13, 10.68)),
            RectangleHitbox.fromRect(49.85, 1.66, Vec(0.05, -12.14)),
            RectangleHitbox.fromRect(11.23, 1.65, Vec(23.02, -0.54)),
            RectangleHitbox.fromRect(12.85, 1.65, Vec(53.35, -9.7)),
            RectangleHitbox.fromRect(1.66, 22.21, Vec(17.5, -1.09)),
            RectangleHitbox.fromRect(119.88, 1.66, Vec(0.12, 35.5)),
            RectangleHitbox.fromRect(1.66, 12.13, Vec(24.19, -29.51)),
            RectangleHitbox.fromRect(1.66, 12.13, Vec(-24.03, -29.52)),
            RectangleHitbox.fromRect(20.73, 1.65, Vec(49.49, -0.54)),
            RectangleHitbox.fromRect(16.19, 7.03, Vec(51.83, -32.06)),
            RectangleHitbox.fromRect(4.64, 16.09, Vec(-57.52, -27.5))
        ),
        material: "metal_heavy",
        particle: "bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Equal,
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(120, 71)
            },
            { // stairs
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(7.51, 10.68, Vec(0, 29.33)),
                    RectangleHitbox.fromRect(10.68, 7.51, Vec(53.58, -5.12))
                ),
                layer: Layer.ToBasement
            },
            { // stairs
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(7.51, 10.68, Vec(0, 29.33)),
                    RectangleHitbox.fromRect(10.68, 7.51, Vec(53.58, -5.12))
                ),
                layer: Layer.Ground
            }
        ],
        floorImages: [{
            key: "bear_bunker_floor",
            position: Vec(0, 0)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "small_lamp_thingy", position: Vec(-17.05, -28.85) },
            { idString: "regular_crate", position: Vec(-11.5, -6.15) },
            { idString: "regular_crate", position: Vec(12.73, 29.39) },
            { idString: "regular_crate", position: Vec(22.63, 27.75) },
            { idString: "ammo_crate", position: Vec(-11.51, 3.82) },
            { idString: "ammo_crate", position: Vec(-7.54, -18.16) },
            { idString: "bunk_bed", position: Vec(-24, 11.08), rotation: 0 },
            { idString: "bunk_bed", position: Vec(-53.2, 7.48), rotation: 2 },
            { idString: "grey_office_chair", position: Vec(-47.9, 22.61), rotation: 3 },
            { idString: "grey_office_chair", position: Vec(-48.4, -24.22), rotation: 2 },
            { idString: "grey_office_chair", position: Vec(-36.64, -24.05), rotation: 2 },
            { idString: "small_table_papers", position: Vec(-53.88, -7.6), rotation: 0 },
            { idString: "chair", position: Vec(-50.33, -7.62), rotation: 1 },
            { idString: "desk_right", position: Vec(-48.54, 28.09), rotation: 2 },
            { idString: "bookshelf", position: Vec(-21.11, -4.29), rotation: 1 },
            { idString: "headquarters_security_desk", position: Vec(-39.3, -31.52), rotation: 2, activated: true },
            { idString: "box", position: Vec(-56.01, 19.08) },
            { idString: "box", position: Vec(50.75, -21.72) },
            { idString: "box", position: Vec(56.05, -24.02) },
            { idString: "propane_tank", position: Vec(-14.2, 11.15) },
            { idString: "propane_tank", position: Vec(56.52, 16.35) },
            { idString: "kitchen_unit_1", position: Vec(49.21, 30.96), rotation: 2 },
            { idString: "kitchen_unit_2", position: Vec(55.67, 31.35), rotation: 2 },
            { idString: "kitchen_unit_3", position: Vec(55.19, 23.67), rotation: 3 },
            { idString: "small_stove", position: Vec(42.1, 30.8), rotation: 2 },
            { idString: "fridge", position: Vec(33.71, 30.86), rotation: 2 },
            { idString: "nsd_crate", position: Vec(23.46, 5.43) },
            { idString: "couch", position: Vec(49.98, 4.67), rotation: 3 },
            { idString: "fence", position: Vec(40.12, 4.81), rotation: 1 },
            { idString: "gun_case", position: Vec(13.4, -5.64), rotation: 3 },
            { idString: "grenade_crate", position: Vec(12.68, 3.72) },
            { idString: "bear_bunker_recorder", position: Vec(22.09, -6.29), rotation: 1 },
            { idString: "barrel", position: Vec(54.56, -14.81) },
            { idString: "control_panel2", position: Vec(31.19, -30.25), rotation: 0 },
            { idString: "control_panel_small", position: Vec(18.87, -30.51), rotation: 3 },
            { idString: "special_table_pack", position: Vec(3.94, -17.76), rotation: 1 },
            { idString: "pink_metal_auto_door", position: Vec(24.18, -18.17), rotation: 3, locked: true },
            { idString: "pink_metal_auto_door", position: Vec(-24.05, -18.25), rotation: 3, locked: true },
            { idString: "metal_door", position: Vec(33.63, -0.58), rotation: 2 },
            { idString: "metal_door", position: Vec(-17.39, 29.16), rotation: 1 }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: "bear_bunker_vault",
            position: Vec(0.1, -23.8)
        }]
    },
    {
        idString: "bear_bunker_vault",
        name: "Lion Bunker Vault",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(25, 25),
        ceilingHitbox: RectangleHitbox.fromRect(22, 22),
        ceilingImages: [{
            key: "vault_ceiling",
            position: Vec(0, 0),
            scale: Vec(3.745, 1.78)
        }]
    },
    { // mrrraowww :3
        idString: "sawmill",
        name: "sawmill",
        defType: DefinitionType.Building,
        spawnMode: MapObjectSpawnMode.River,
        bridgeSpawnRanges: [[0, 0.3], [0.7, 1]],
        asymmetricalBridgeHitbox: true,
        bridgeHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(292.05, 217.69, Vec(-0.25, 125.76)),
            RectangleHitbox.fromRect(250.43, 148.3, Vec(20.37, -160.65))
        ),
        spawnOffset: Vec(13.74, 34.62),
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(208.03, 113.63, Vec(13.83, -32.27)),
            RectangleHitbox.fromRect(308.65, 230.96, Vec(-0.02, 126.46)),
            RectangleHitbox.fromRect(304.3, 175.6, Vec(24.02, -159.72))
        ),
        puzzle: {
            triggerOnSolve: "saw",
            delay: 1500
        },
        sounds: {
            solved: "saw",
            position: Vec(5.88, -10.22),
            maxRange: 260,
            falloff: 1
        },
        groundGraphics: [
            {
                color: 0x614c35,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(142.1, 187.94, Vec(14.04, -39.87)),
                    RectangleHitbox.fromRect(291.56, 217.11, Vec(0, 126.05)),
                    RectangleHitbox.fromRect(249.63, 148.34, Vec(20.4, -160.65))
                )
            },
            // ROAD
            {
                color: 0x5a4731,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(49.38, 370.23, Vec(25.85, -47.49)),
                    RectangleHitbox.fromRect(152.97, 49.55, Vec(-25.94, -162.85)),
                    RectangleHitbox.fromRect(92.45, 39.39, Vec(96.55, -149.14)),
                    RectangleHitbox.fromRect(41.65, 258.28, Vec(-19.23, -11.92)),
                    RectangleHitbox.fromRect(193.52, 49.79, Vec(-46.22, 92.32)),
                    RectangleHitbox.fromRect(55.18, 123.4, Vec(8.47, 170.43)),
                    RectangleHitbox.fromRect(96.63, 44.85, Vec(94.82, 57.86))
                )
            },
            // Road Lines
            {
                color: 0xd5a244,
                hitbox: new GroupHitbox(
                    /// LINE WIDTH = 2.09

                    // Special Case: Bottom Left, building entrance along with barricade line
                    RectangleHitbox.fromRect(1.88, 42.14, Vec(-103.4, 187.4)),

                    // Bottom
                    RectangleHitbox.fromRect(2.09, 35.79, Vec(-34.99, 55.58)),
                    RectangleHitbox.fromRect(102.66, 2.09, Vec(-85.49, 72.43)),
                    RectangleHitbox.fromRect(121.68, 2.09, Vec(-75.54, 112.44)),

                    // [Barricade Line]
                    RectangleHitbox.fromRect(2.09, 99.22, Vec(32.45, 182.52)),
                    RectangleHitbox.fromRect(2.09, 119.85, Vec(-15.74, 172.19)),
                    RectangleHitbox.fromRect(14.52, 2.09, Vec(38.63, 133.91)),
                    RectangleHitbox.fromRect(2.09, 96.2, Vec(44.86, 86.23)),

                    // Top
                    RectangleHitbox.fromRect(2.09, 29.46, Vec(-33.69, -127.37)),
                    RectangleHitbox.fromRect(69.82, 2.09, Vec(-67.58, -141.12)),
                    RectangleHitbox.fromRect(41.51, 2.09, Vec(-14.96, -184.02)),
                    RectangleHitbox.fromRect(2.09, 4.91, Vec(-34.69, -186.81)),
                    RectangleHitbox.fromRect(2.09, 4.91, Vec(-67.18, -186.82)),
                    RectangleHitbox.fromRect(36.29, 2.09, Vec(-84.3, -183.99)),
                    RectangleHitbox.fromRect(2.09, 40.28, Vec(4.77, -203.39)),
                    RectangleHitbox.fromRect(2.09, 110.78, Vec(44.78, -168.48)),

                    // f o r k l i f t  p a r k
                    RectangleHitbox.fromRect(67.6, 2.09, Vec(105.95, -199.87)),
                    RectangleHitbox.fromRect(2.09, 30.94, Vec(138.71, -184.28)),
                    RectangleHitbox.fromRect(2.09, 30.94, Vec(87.29, -184.3)),
                    RectangleHitbox.fromRect(2.09, 30.94, Vec(105.05, -184.31)),
                    RectangleHitbox.fromRect(2.09, 30.94, Vec(121.87, -184.31))
                )
            },
            // bottom forklift park
            {
                color: 0x473827,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.85, 30.08, Vec(-45.52, 52.7)),
                    RectangleHitbox.fromRect(1.85, 30.08, Vec(-79.23, 52.7)),
                    RectangleHitbox.fromRect(1.85, 30.08, Vec(-61.31, 52.7)),
                    RectangleHitbox.fromRect(35.57, 1.85, Vec(-62.37, 38.01))
                )
            },
            // pine tree places
            // border
            {
                color: 0x3f2e0a,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(22.19, 22.22, Vec(7.35, 197.01)),
                    RectangleHitbox.fromRect(22.19, 22.22, Vec(7.79, 139.99))
                )
            },
            // fill
            {
                color: 0x543d0d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(19.94, 19.98, Vec(7.32, 197.02)),
                    RectangleHitbox.fromRect(19.94, 19.98, Vec(7.83, 140.01))
                )
            },
            // for warehouse entrance "step" at bottom right
            { // stroke
                color: 0x4d4d4d,
                hitbox: RectangleHitbox.fromRect(10, 7, Vec(136.21, 199.4))
            },
            { // fill
                color: 0x666666,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4, 3.7, Vec(133.93, 200.41)),
                    RectangleHitbox.fromRect(4, 3.7, Vec(138.43, 200.41))
                )
            },
            // for the warehouse main entrance "step" at bottom right
            { // stroke
                color: 0x343434,
                hitbox: RectangleHitbox.fromRect(36.37, 6.98, Vec(106.68, 77.55))
            },
            { // fill
                color: 0x4c4c4c,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(16.93, 6.17, Vec(115.62, 77.88)),
                    RectangleHitbox.fromRect(16.98, 6.17, Vec(97.78, 77.92))
                )
            },
            // for the sawmill storage entrance "step" Vec(-51.47, -212.03
            { // stroke
                color: 0x484848,
                hitbox: RectangleHitbox.fromRect(10.25, 5, Vec(-96.07, -234.56))
            },
            { // fill
                color: 0x6a6a6a,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.1, 3.56, Vec(-93.67, -234.56)),
                    RectangleHitbox.fromRect(3.99, 3.56, Vec(-98.47, -234.56))
                )
            }
        ],
        // i have no idea on how to fix the zindex of ground graphics its really messed up so we use "hacky" method
        graphicsZIndex: ZIndexes.BuildingsFloor + 0.1,
        graphics: [
        // small office entrance "steps" (2)
            { // stroke
                color: 0x4d4d4d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.37, 4.02, Vec(-136.78, 65.70)),
                    RectangleHitbox.fromRect(10.38, 4.77, Vec(-93.37, 34.07)),
                    RectangleHitbox.fromRect(10.37, 4.02, Vec(61.82, -200.08)),
                    RectangleHitbox.fromRect(10.38, 4.77, Vec(105.23, -231.70))
                )
            },
            { // fill
                color: 0x666666,
                hitbox: new GroupHitbox(

                    RectangleHitbox.fromRect(4.65, 3.59, Vec(64.36, -200.07)),
                    RectangleHitbox.fromRect(4.65, 3.59, Vec(59.19, -200.08)),
                    RectangleHitbox.fromRect(4.66, 4.38, Vec(107.78, -231.62)),
                    RectangleHitbox.fromRect(4.66, 4.38, Vec(102.62, -231.63)),

                    RectangleHitbox.fromRect(4.65, 3.59, Vec(-134.24, 65.71)),
                    RectangleHitbox.fromRect(4.65, 3.59, Vec(-139.41, 65.70)),
                    RectangleHitbox.fromRect(4.66, 4.38, Vec(-90.82, 34.16)),
                    RectangleHitbox.fromRect(4.66, 4.38, Vec(-95.98, 34.15))
                )
            }
        ],
        floors: [{
            type: FloorNames.Sand,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(142.1, 187.94, Vec(14.04, -39.87)),
                RectangleHitbox.fromRect(291.56, 217.11, Vec(0, 126.05)),
                RectangleHitbox.fromRect(249.63, 148.34, Vec(20.4, -160.65))
            )
        }],
        floorImages: [
            // Mud/ground cracks (decals)
            // Top
            { key: "mud_decal_1", position: Vec(-38.22, -161.23) },
            { key: "mud_decal_2", position: Vec(27.78, -181.49) },
            { key: "mud_decal_3", position: Vec(109.04, -140.77) },

            { key: "ground_crack_1", position: Vec(-19.27, -150.02) },
            { key: "ground_crack_2", position: Vec(19.59, -194.59) },
            { key: "ground_crack_3", position: Vec(31.44, -133.88) },
            { key: "ground_crack_3", position: Vec(93.92, -154.09), rotation: Math.PI / 3 },
            { key: "ground_crack_1", position: Vec(-54.5, -106.5), rotation: -Math.PI / 1.8, alpha: 0.3 },
            { key: "ground_crack_2", position: Vec(121.94, -210.89), rotation: Math.PI / 2.1, alpha: 0.3 },

            // Bottom
            { key: "est_1973_residue", position: Vec(47.08, 221.25) },
            { key: "mud_decal_1", position: Vec(-55, 92.4), rotation: -Math.PI / 3.1 },
            { key: "mud_decal_2", position: Vec(-8.5, 48.5), rotation: -Math.PI / 2.4 },
            { key: "mud_decal_3", position: Vec(69.94, 64.22), rotation: Math.PI / 4 },
            { key: "mud_decal_1", position: Vec(24.58, 160.3), rotation: Math.PI / 10.1, scale: Vec(0.7, 0.7), alpha: 0.7 },
            { key: "mud_decal_1", position: Vec(100, 206.55), rotation: -Math.PI / 14, alpha: 0.3 },
            { key: "mud_decal_2", position: Vec(-131.1, 222.55), rotation: Math.PI, scale: Vec(0.75, 0.75), alpha: 0.35 },

            { key: "ground_crack_1", position: Vec(-29.5, 91.3), rotation: -Math.PI / 3.25 },
            { key: "ground_crack_2", position: Vec(115.89, 48.95), rotation: Math.PI / 9 },
            { key: "ground_crack_3", position: Vec(27.18, 110.39), rotation: Math.PI / 2.2 },
            { key: "ground_crack_1", position: Vec(13.73, 177.1), rotation: -Math.PI / 6.25 },
            { key: "ground_crack_1", position: Vec(65.8, 217), rotation: -Math.PI / 1.25, alpha: 0.25 },
            { key: "ground_crack_1", position: Vec(-115.2, 218), rotation: -Math.PI / 4.8, alpha: 0.25 },
            { key: "ground_crack_2", position: Vec(-130.52, 133.1), rotation: Math.PI / 10.15, alpha: 0.3 },
            { key: "ground_crack_3", position: Vec(119.42, 217.26), rotation: Math.PI / 1.15, alpha: 0.3 },

            { key: "oil_decal_hunted_1", position: Vec(-79.52, -106.97) },

            { key: "sawmill_main_logo", position: Vec(6, 75.25), scale: Vec(2, 2) },

            // Tinted
            { key: "barricade_line", position: Vec(24.775, -226.65), tint: 0xd5a244, rotation: Math.PI / 2, scale: Vec(2, 2.007) }, // Top Center Road Line
            { key: "barricade_line", position: Vec(-139.59, 92.45), tint: 0xd5a244, scale: Vec(2, 2.007) }, // Bottom Left Road Line
            { key: "barricade_line", position: Vec(-106.59, 187.5), tint: 0xd5a244, scale: Vec(2, 2) }, // Bottom Left, entrance
            { key: "barricade_line", position: Vec(47.5, 168.19), tint: 0xd5a244, scale: Vec(2, 2) }, // Bottom Right, entrance

            // Barriers (NOT tinted)
            { key: "barricade_line_yellow", position: Vec(63.51, -185), scale: Vec(2, 2) },
            { key: "barricade_line_small", position: Vec(-77.6, -89.7), rotation: Math.PI / 2, scale: Vec(2, 2) },
            { key: "barricade_line_small2", position: Vec(112.25, 20.1), rotation: Math.PI / 2, scale: Vec(1, 1.005) },
            { key: "barricade_line_small2", position: Vec(112.09, -89), rotation: Math.PI / 2 },
            { key: "barricade_line_medium", position: Vec(-98.255, 20.31), rotation: Math.PI / 2, scale: Vec(2, 1.999) },
            { key: "barricade_line_large", position: Vec(-53.6, -34.83), scale: Vec(2, 2) },
            { key: "barricade_line_large", position: Vec(81.97, -34.83), scale: Vec(2, 2) }
        ],
        obstacles: IS_CLIENT ? undefined : [
            // Bottom

            ...Array.from(
                { length: 5 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-103.06 - 8.5 * i, 115.42),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 13 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-142.78, 118.48 + 8.5 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 10 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-106.02 + 8.5 * i, 231.49),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 11 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(38.13 + 8.5 * i, 231.48),
                    rotation: 0
                })
            ),

            { idString: "fence", position: Vec(-142.94, 31.39), rotation: 1 },
            { idString: "fence", position: Vec(-98.73, 121.25), rotation: 1 },
            { idString: "fence", position: Vec(142.39, 31.02), rotation: 1 },
            { idString: "fence", position: Vec(51.15, 84.52), rotation: 1 },
            { idString: "fence", position: Vec(51.22, 93.12), rotation: 1 },
            { idString: "fence", position: Vec(64.63, 81.13), rotation: 0 },
            { idString: "fence", position: Vec(56.24, 81.13), rotation: 0 },
            { idString: "fence", position: Vec(50.58, 133.11), rotation: 1 },
            { idString: "fence", position: Vec(50.58, 125.88), rotation: 1 },
            { idString: "fence", position: Vec(142.12, 202.87), rotation: 1 },
            { idString: "fence", position: Vec(142.12, 211.01), rotation: 1 },
            { idString: "fence", position: Vec(142.12, 219.34), rotation: 1 },
            { idString: "fence", position: Vec(142.12, 227.63), rotation: 1 },
            { idString: "fence", position: Vec(-142.78, 228.61), rotation: 1 }, // this because some designer miscalculated the fence distance
            { idString: "fence", position: Vec(-22.52, 231.53), rotation: 0 }, // this because some designer miscalculated the fence distance

            { idString: "metal_column", position: Vec(-142.96, 26.09) },
            { idString: "metal_column", position: Vec(-142.78, 115.5) },
            { idString: "metal_column", position: Vec(-142.78, 231.5) },
            { idString: "metal_column", position: Vec(-98.73, 115.29) },
            { idString: "metal_column", position: Vec(-110.19, 231.53) },
            { idString: "metal_column", position: Vec(-18.29, 231.44) },
            { idString: "metal_column", position: Vec(35.05, 231.46) },
            { idString: "metal_column", position: Vec(142.22, 231.44) },
            { idString: "metal_column", position: Vec(142.22, 78.68) },
            { idString: "metal_column", position: Vec(142.39, 36.4) },
            { idString: "metal_column", position: Vec(142.39, 25.17) },
            { idString: "metal_column", position: Vec(50.71, 120.24) },
            { idString: "metal_column", position: Vec(51.36, 97.42) },
            { idString: "metal_column", position: Vec(128, 231.59) },

            { idString: "barrier", position: Vec(-100.92, 92.36), rotation: 2 },
            { idString: "barrier", position: Vec(8.34, 226.46), rotation: 1 },

            { idString: "regular_crate", position: Vec(-110.18, 125.31) },
            { idString: "regular_crate", position: Vec(-120.39, 122.69) },
            { idString: "regular_crate", position: Vec(-135.23, 167.4) },
            { idString: "regular_crate", position: Vec(3.41, 123.84) },
            { idString: "regular_crate", position: Vec(25.73, 69.5) }, // P1
            { idString: "regular_crate", position: Vec(94.08, 51.17) },

            { idString: { grenade_box: 0.65, box: 1 }, position: Vec(-102.59, 121.36) },
            { idString: "box", position: Vec(-63.01, 120.4) },
            { idString: "box", position: Vec(-57.53, 122.81) },
            { idString: "box", position: Vec(-133.24, 175.28) },
            { idString: "box", position: Vec(-138.57, 191.9) },
            { idString: "box", position: Vec(-133.18, 193.07) },
            { idString: "box", position: Vec(-63.21, 217.75) },
            { idString: { grenade_box: 0.65, box: 1 }, position: Vec(78.88, 219.43) },
            { idString: "box", position: Vec(110.8, 31.2) },
            { idString: "box", position: Vec(26.08, 78.16) },
            { idString: "box", position: Vec(30.97, 79.76) },
            { idString: "box", position: Vec(-113.08, 29.9) },
            { idString: "box", position: Vec(-54.73, 40.45) }, // P2
            { idString: "box", position: Vec(-50.42, 43.88) }, // P2

            { idString: "grenade_crate", position: Vec(-111.41, 92.44) }, // P4
            { idString: "grenade_crate", position: Vec(63.6, 91.1) }, // P7

            { idString: "log", position: Vec(1.37, 100.55), rotation: 0, variation: 2 },
            { idString: "log", position: Vec(-88.48, 216.96), rotation: 0, variation: 2 },

            { idString: "small_moldy_logs", position: Vec(-78.92, 68.79), rotation: 0 },
            { idString: "small_moldy_logs", position: Vec(136.5, 216.19), rotation: 1 },
            { idString: "small_moldy_logs", position: Vec(-68.77, 74.2), rotation: 3 },

            { idString: "small_logs_pile_2", position: Vec(-17.61, 69.07), rotation: 0 },
            { idString: "small_logs_pile_hs", position: Vec(13.28, 123.94), rotation: 2 },
            { idString: "small_logs_pile_2", position: Vec(-70.89, 121.51), rotation: 2 },
            { idString: "small_logs_pile_2", position: Vec(-127.39, 202.94), rotation: 1 },
            { idString: "small_logs_pile_2", position: Vec(63.51, 100.71), rotation: 0 },
            { idString: "small_logs_pile_2", position: Vec(84.21, 49.22), rotation: 0 },

            { idString: "large_logs_pile_2", position: Vec(6.04, 93.4), rotation: 0, variation: 2 },
            { idString: "large_logs_pile_2", position: Vec(-7.61, 89.32), rotation: 1, variation: 1 },
            { idString: "large_logs_pile_2", position: Vec(-122.89, 146.31), rotation: 0, variation: 2 },
            { idString: "large_logs_pile_2", position: Vec(-125.21, 170.94), rotation: 1, variation: 1 },
            { idString: "large_logs_pile_2", position: Vec(-130.91, 184.79), rotation: 2, variation: 1 },
            { idString: "large_logs_pile_2", position: Vec(22.94, 197.88), rotation: 1, variation: 1 },

            { idString: "pine_tree", position: Vec(7.32, 197.02) },
            { idString: "pine_tree", position: Vec(7.83, 140.01) },

            { idString: "barrel", position: Vec(-15.02, 167.23) }, // P6
            { idString: "barrel", position: Vec(77.32, 226.36) },
            { idString: "barrel", position: Vec(85.09, 223.08) },

            { idString: "trash_bag", position: Vec(64.12, 119.39) },
            { idString: "trash_bag", position: Vec(65.65, 126.1) },
            { idString: "trash_bag", position: Vec(71.26, 203.2) },

            { idString: "dumpster", position: Vec(99.89, 203.46), rotation: 3 },
            { idString: "dumpster", position: Vec(115.58, 203.39), rotation: 3 },

            { idString: "ammo_crate", position: Vec(-120.76, 25.13) },
            { idString: "ammo_crate", position: Vec(102.81, 29.96) },
            { idString: "ammo_crate", position: Vec(113.32, 23.44) },

            { idString: "forklift", position: Vec(-70.18, 53.42), rotation: 0 },
            { idString: "forklift", position: Vec(-52.77, 53.42), rotation: 2 },
            { idString: "forklift", position: Vec(25.9, 58.16), rotation: 0 },
            { idString: "forklift", position: Vec(-3.81, 167.55), rotation: 3 },
            { idString: "forklift", position: Vec(-122.62, 92.29), rotation: 1 },

            { idString: "pallet", position: Vec(25.73, 69.5), rotation: 0 }, // P1
            { idString: "pallet", position: Vec(-52.56, 42.29), rotation: 0 }, // P2
            { idString: "pallet", position: Vec(-111.41, 92.44), rotation: 1 }, // P4
            { idString: "pallet", position: Vec(-15.02, 167.23), rotation: 1 }, // P6
            { idString: "pallet", position: Vec(63.6, 91.1), rotation: 1 }, // P7

            // Top

            ...Array.from(
                { length: 3 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(119.44 + 8.5 * i, -228.46),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(141.97, -225.35 + 8.5 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(55.24 + 8.5 * i, -128.2),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(141.69, -99.31 - 8.5 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(111.71 + 8.5 * i, -128.12),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 3 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-39.38, -115.4 - 8.5 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 3 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-45.28 - 8.5 * i, -136.63),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 3 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-96.12 + 8.5 * i, -136.63),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 5 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-101.44, -99.42 - 8.5 * i),
                    rotation: 1
                })
            ),

            { idString: "fence", position: Vec(51.35, -228.95), rotation: 0, scale: 0.75 },
            { idString: "fence", position: Vec(50.08, -115.07), rotation: 1 },
            { idString: "fence", position: Vec(50.07, -123.5), rotation: 1 },

            { idString: "metal_column", position: Vec(1.48, -228.82) },
            { idString: "metal_column", position: Vec(47.91, -229.06) },
            { idString: "metal_column", position: Vec(113.75, -228.47) },
            { idString: "metal_column", position: Vec(142.1, -228.47) },
            { idString: "metal_column", position: Vec(141.72, -170.15) },
            { idString: "metal_column", position: Vec(49.91, -128.23) },
            { idString: "metal_column", position: Vec(141.72, -128.19) },
            { idString: "metal_column", position: Vec(141.71, -96.16) },
            { idString: "metal_column", position: Vec(-39.41, -136.65) },
            { idString: "metal_column", position: Vec(-101.38, -136.55) },
            { idString: "metal_column", position: Vec(-101.42, -96.18) },
            { idString: "metal_column", position: Vec(-101.34, -189.11) },

            { idString: "lansirama_crate", position: Vec(-61.72, -119.9) },
            { idString: "lansirama_crate", position: Vec(135.17, -221.47) },

            { idString: "barrel", position: Vec(-76.86, -105.29) },
            { idString: "barrel", position: Vec(124.89, -221.59) },
            { idString: "barrel", position: Vec(134.3, -211.76) },

            { idString: "ammo_crate", position: Vec(-50.97, -125.68) },
            { idString: "ammo_crate", position: Vec(-67.2, -103.03) },
            { idString: "ammo_crate", position: Vec(-77.7, -96.55) },
            { idString: "ammo_crate", position: Vec(66.85, -147.85) },

            { idString: "regular_crate", position: Vec(-61.75, -162.56) },
            { idString: "regular_crate", position: Vec(77.06, -143.65) },
            { idString: "regular_crate", position: Vec(100.02, -188.44) },
            { idString: "regular_crate", position: Vec(109.92, -185.27) },
            { idString: "regular_crate", position: Vec(134.84, -104.53) },

            { idString: "box", position: Vec(-70.08, -95.62) },
            { idString: "box", position: Vec(-90.97, -108.57) }, // P8
            { idString: "box", position: Vec(-94.25, -113.17) }, // P8
            { idString: "box", position: Vec(12.86, -143.04) },
            { idString: "box", position: Vec(14.47, -138.07) },
            { idString: "box", position: Vec(-9.05, -163.37) }, // P9
            { idString: "box", position: Vec(-12.12, -168.18) }, // P9
            { idString: "box", position: Vec(82.53, -103.69) }, // P10

            { idString: "barrier", position: Vec(24.53, -203.9), rotation: 3 },
            { idString: "barrier", position: Vec(-96.93, -162.48), rotation: 0 },

            { idString: "large_logs_pile_2", position: Vec(105.39, -101.22), rotation: 0, variation: 2 },
            { idString: "large_logs_pile_2", position: Vec(90.8, -105.51), rotation: 1, variation: 1 },
            { idString: "large_logs_pile_2", position: Vec(5.8, -140.08), rotation: 3, variation: 2 },

            { idString: "small_logs_pile_2", position: Vec(64.83, -115.86), rotation: 0 },
            { idString: "small_logs_pile_2", position: Vec(-71.44, -167.01), rotation: 2 },

            { idString: "small_moldy_logs", position: Vec(120.62, -169.01), rotation: 0 },
            { idString: "small_moldy_logs", position: Vec(130.35, -163.62), rotation: 3 },

            { idString: "pallet", position: Vec(-92.6, -110.86), rotation: 1 }, // P8
            { idString: "pallet", position: Vec(-10.18, -165.75), rotation: 1 }, // P9
            { idString: "pallet", position: Vec(81.28, -105.19), rotation: 1 }, // P10
            { idString: "pallet", position: Vec(-93.07, -121.72), rotation: 0 }, // P12

            { idString: "forklift", position: Vec(1.02, -165.82), rotation: 3 },
            { idString: "forklift", position: Vec(79.4, -185.2), rotation: 2 },
            { idString: "forklift", position: Vec(130.95, -183.99), rotation: 0 },

            { idString: "grenade_crate", position: Vec(-93.07, -121.72) }, // P12

            { idString: "log", position: Vec(-1.02, -139.43), rotation: 3, variation: 2 },

            // Center
            { idString: "regular_crate", position: Vec(-49.22, -27.19) },
            { idString: "regular_crate", position: Vec(-51.63, -36.81) },

            { idString: "small_logs_pile_2", position: Vec(-45.27, -64.89), rotation: 2 },
            { idString: "small_logs_pile_2", position: Vec(73.31, -25.39), rotation: 2 },

            { idString: "barrel", position: Vec(-45.23, -73.05) },

            { idString: "log", position: Vec(72.02, -42.31), rotation: 3, variation: 2 },

            { idString: "saw", position: Vec(5.88, -10.22), rotation: 0 },
            { idString: "headquarters_security_desk", position: Vec(85.04, 118.94), rotation: 2, puzzlePiece: true }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: randomPallet, position: Vec(-70.25, 64.65) }, // P3
            { idString: randomPallet, position: Vec(-71.27, 219.63) }, // P5
            { idString: randomPallet, position: Vec(130.72, -172.72) }, // P11

            { idString: "abandoned_warehouse_1", position: Vec(-62.54, 167.62) },
            { idString: "sawmill_warehouse", position: Vec(96.43, 136.61) },
            { idString: "sawmill_office", position: Vec(-115.17, 49.69) },
            { idString: "sawmill_office", position: Vec(83.43, -216.09) },
            { idString: "sawmill_center_warehouse", position: Vec(13.75, -37) },
            { idString: "sawmill_storage", position: Vec(-51.47, -212.03) },
            { idString: "porta_potty", position: Vec(-118.1, -130), orientation: 3 }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(-37.87, -161.59) },
            { table: "ground_loot", position: Vec(102.02, -152.49) },
            { table: "ground_loot", position: Vec(-54.68, 91.21) },
            { table: "ground_loot", position: Vec(116.63, 52.96) }
        ]
    },
    {
        idString: "abandoned_warehouse_1",
        name: "Abandoned Warehouse",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(98.99, 102.8, Vec(0.27, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(77.17, 84.98, Vec(-1.36, 2.83)),
        material: "stone",
        particleVariations: 2,
        particle: "abandoned_warehouse_1_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(34.6, 2.03, Vec(-3.01, -15.25)),
            RectangleHitbox.fromRect(2.02, 61.6, Vec(13.28, 16.17)),
            RectangleHitbox.fromRect(79.1, 2, Vec(-1.88, 46.28)),
            RectangleHitbox.fromRect(2.01, 6.43, Vec(-40.43, 44.05)),
            RectangleHitbox.fromRect(2, 13.46, Vec(-19.3, -7.93)),
            RectangleHitbox.fromRect(2, 39.2, Vec(-40.43, -20.74)),
            RectangleHitbox.fromRect(59.3, 2.01, Vec(-11.78, -40.56))
        ),
        floors: [
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(76.75, 23.4, Vec(-1.01, -27.94)),
                    RectangleHitbox.fromRect(23.14, 66.54, Vec(25.87, 12.25)),
                    RectangleHitbox.fromRect(11.86, 16.87, Vec(40.28, 37.29)),
                    RectangleHitbox.fromRect(19.65, 9.73, Vec(28.07, -42.81)),
                    RectangleHitbox.fromRect(19.49, 18.15, Vec(-29.66, -10.25))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(30.67, 59.67, Vec(-3.01, 15.44)),
                    RectangleHitbox.fromRect(22.78, 46.69, Vec(-29.58, 21.96))
                )
            }
        ],
        ceilingImages: [{
            key: "abandoned_warehouse_1_ceiling",
            position: Vec(-1.36, 2.83),
            scale: Vec(2, 2)
        }],
        floorImages: [
            {
                key: "abandoned_warehouse_1_stair",
                position: Vec(28, -43.22),
                scale: Vec(1, 1.2),
                rotation: -Math.PI / 2
            },
            {
                key: "abandoned_warehouse_1_stair",
                position: Vec(41.81, 37.31)
            },
            {
                key: "abandoned_warehouse_1_floor",
                position: Vec(-0.85, 2.9)
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "abandoned_warehouse_metal_collider", position: Vec(0, 0), rotation: 0 },
            { idString: "grenade_crate", position: Vec(19.68, 8.05) },
            { idString: "barrel", position: Vec(-2.98, -8.19) },
            { idString: "small_logs_pile_2", position: Vec(6.17, -8.57), rotation: 2 },
            { idString: "lansirama_crate", position: Vec(-12.5, -7.96) },
            { idString: "small_moldy_logs", position: Vec(8, 16.81), rotation: 2 },
            { idString: "forklift", position: Vec(-33.73, 17.78), rotation: 1 },
            { idString: "cobweb", position: Vec(7.42, 40.52), rotation: 2 },
            { idString: "gun_case", position: Vec(18.36, -6.88), rotation: 1 },

            { idString: "regular_crate", position: Vec(-3.21, 35.96) },
            { idString: "regular_crate", position: Vec(6.99, 39.82) },

            { idString: "ammo_crate", position: Vec(-13.2, -32.58) },
            { idString: "ammo_crate", position: Vec(-2.96, -34.49) },

            { idString: "pallet", position: Vec(20.59, 3.03), rotation: 0 },
            { idString: "pallet", position: Vec(19.73, 12.66), rotation: 1 },
            { idString: "pallet", position: Vec(-22.5, 17.83), rotation: 1 },

            { idString: "box", position: Vec(-35.61, -35.85) },
            { idString: "box", position: Vec(-24.4, 20.2) },
            { idString: "box", position: Vec(-20.9, 15.46) },
            { idString: "box", position: Vec(21.68, 42.52) },
            { idString: "box", position: Vec(18.53, 14.36) },
            { idString: { box: 1, grenade_box: 0.75 }, position: Vec(21.52, 1.61) }
        ]
    },
    {
        idString: "sawmill_center_warehouse",
        name: "Sawmill Center Warehouse",
        defType: DefinitionType.Building,
        material: "stone",
        particleVariations: 2,
        particle: "sawmill_warehouse_particle",
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(108, 160, Vec(-7.39, 0.9)),
            RectangleHitbox.fromRect(22, 118.96, Vec(49.48, 1.5))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(89.56, 145.55, Vec(-8.06, -0.01)),
            RectangleHitbox.fromRect(17.31, 102.66, Vec(43.76, 0.85))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.01, 105.66, Vec(53.37, 0.72)),
            RectangleHitbox.fromRect(2.05, 101.97, Vec(-52.89, 0.88)),
            RectangleHitbox.fromRect(17, 1.98, Vec(45.88, 53.18)),
            RectangleHitbox.fromRect(17.02, 2.01, Vec(45.87, -51.48))
        ),
        floorImages: [
            {
                key: "sawmill_center_warehouse_floor_2",
                position: Vec(44.76, 0.92)
            },
            {
                key: "sawmill_center_warehouse_floor_1",
                position: Vec(-8.66, -0.71)
            }
        ],
        ceilingImages: [
            {
                key: "sawmill_center_warehouse_ceiling_2",
                position: Vec(46.58, 1.16),
                scale: Vec(2, 2)
            },
            {
                key: "sawmill_center_warehouse_ceiling_1",
                position: Vec(-7.84, 0.4),
                scale: Vec(2, 2)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(37.05, 145.56, Vec(18.11, -0.03)),
                    RectangleHitbox.fromRect(37.05, 145.56, Vec(-34.73, 0.01)),
                    RectangleHitbox.fromRect(26.24, 20.18, Vec(-7.65, 62.72)),
                    RectangleHitbox.fromRect(26.24, 21.07, Vec(-6.52, -62.24))
                )
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(17.31, 102.66, Vec(43.76, 0.85)),
                    RectangleHitbox.fromRect(16.88, 104.95, Vec(-8, 0.55))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "sawmill_center_warehouse_table_collider", position: Vec(0, 0), rotation: 0 },

            { idString: "solid_crate", position: Vec(-7.89, 33.12) },
            // { idString: "saw", position: Vec(-7.93, 26.83), rotation: 0 },

            { idString: "cobweb", position: Vec(47.58, 47.46), rotation: 2 },
            { idString: "grenade_crate", position: Vec(47.34, -21.84) },
            { idString: "barrel", position: Vec(-47.38, 30.85) },
            { idString: "barrel", position: Vec(19.05, -10.33) },
            { idString: "forklift", position: Vec(19.19, 1.17), rotation: 2 },

            { idString: "sawmill_center_warehouse_column", position: Vec(-52.84, -51.44) },
            { idString: "sawmill_center_warehouse_column", position: Vec(-52.84, -72.35) },
            { idString: "sawmill_center_warehouse_column", position: Vec(-7.92, -72.75) },
            { idString: "sawmill_center_warehouse_column", position: Vec(36.27, -72.35) },
            { idString: "sawmill_center_warehouse_column", position: Vec(36.27, -51.44) },
            { idString: "sawmill_center_warehouse_column", position: Vec(36.24, 53.19) },
            { idString: "sawmill_center_warehouse_column", position: Vec(36.29, 72.4) },
            { idString: "sawmill_center_warehouse_column", position: Vec(-7.93, 72.8) },
            { idString: "sawmill_center_warehouse_column", position: Vec(-52.85, 72.4) },
            { idString: "sawmill_center_warehouse_column", position: Vec(-52.85, 53.19) },

            { idString: { box: 1, grenade_box: 0.2 }, position: Vec(-44.76, -38.23) },
            { idString: "box", position: Vec(-47.45, -28.39) },
            { idString: "box", position: Vec(-43.15, -25.62) },
            { idString: "box", position: Vec(48.41, -47.05) },
            { idString: "box", position: Vec(43.81, -43.77) },
            { idString: { box: 1, grenade_box: 0.2 }, position: Vec(46.95, 6.81) },
            { idString: "box", position: Vec(41.63, 4.55) },
            { idString: "box", position: Vec(3.37, 39.74) },

            { idString: "regular_crate", position: Vec(43.51, 14.77) },
            { idString: "regular_crate", position: Vec(42.99, 35.32) },
            { idString: "regular_crate", position: Vec(-45.65, 40.19) },

            { idString: "lansirama_crate", position: Vec(44.58, 45.86) },
            { idString: "lansirama_crate", position: Vec(-46.34, 2.45) },
            { idString: "lansirama_crate", position: Vec(-44.08, -7.46) },

            { idString: "pallet", position: Vec(-45.75, -37.82), rotation: 1 },
            { idString: "pallet", position: Vec(-45.02, -27.19), rotation: 0 },
            { idString: "pallet", position: Vec(46.3, -45.47), rotation: 0 },
            { idString: "pallet", position: Vec(19.05, -10.33), rotation: 0 },

            { idString: "small_logs_pile_2", position: Vec(5.81, 32.13), rotation: 3 },
            { idString: "small_logs_pile_2", position: Vec(46.2, 24.98), rotation: 2 },
            { idString: "small_logs_pile_2", position: Vec(47.04, -31.65), rotation: 2 },
            { idString: "small_logs_pile_2", position: Vec(37.85, -27.06), rotation: 3 },

            { idString: "large_logs_pile_2", position: Vec(-41.61, -17.12), rotation: 0, variation: 2 },

            { idString: "small_moldy_logs", position: Vec(3.74, -47), rotation: 0 },
            { idString: "small_moldy_logs", position: Vec(47.7, -8.71), rotation: 1 },

            { idString: "log", position: Vec(3.22, -30.19), rotation: 1, variation: 1 },
            { idString: "log", position: Vec(-18.58, 8.35), rotation: 3, variation: 2 },
            { idString: "log", position: Vec(-19.77, 13.81), rotation: 1, variation: 2 }
        ]
    },
    {
        idString: "sawmill_warehouse",
        name: "sawmill Warehouse",
        defType: DefinitionType.Building,
        material: "stone",
        particleVariations: 2,
        particle: "sawmill_warehouse_particle",
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(107.27, 77.64, Vec(-0.83, 32)),
            RectangleHitbox.fromRect(88.2, 63.17, Vec(8.73, -36.48))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(70.14, 115.07, Vec(9.82, 2.95)),
            RectangleHitbox.fromRect(20.88, 57.89, Vec(-35.22, 31.54))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(21.52, 2.02, Vec(-35.98, 1.79)),
            RectangleHitbox.fromRect(2.01, 14.48, Vec(-45.74, 8.12)),
            RectangleHitbox.fromRect(2.01, 117.88, Vec(45.82, 3.33)),
            RectangleHitbox.fromRect(26.57, 2.01, Vec(33.55, -55.51)),
            RectangleHitbox.fromRect(27.38, 2.03, Vec(-13.54, -55.51)),
            RectangleHitbox.fromRect(2.03, 58.1, Vec(-26.22, -26.81)),
            RectangleHitbox.fromRect(2, 14.13, Vec(-45.83, 54.62)),
            RectangleHitbox.fromRect(81.56, 1.9, Vec(-6.05, 61.25))
        ),
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(47.4, 23.58, Vec(-1.49, -26.84)),
                    RectangleHitbox.fromRect(19.72, 22.56, Vec(12.37, -8.68)),
                    RectangleHitbox.fromRect(30.14, 69.31, Vec(29.83, -19.87)),
                    RectangleHitbox.fromRect(22.33, 19.02, Vec(9.38, -45.89)),
                    RectangleHitbox.fromRect(41.53, 2.15, Vec(-4.57, 1.85))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(61.36, 57.91, Vec(-15.01, 31.49)),
                    RectangleHitbox.fromRect(31.59, 45.54, Vec(29.08, 37.91)),
                    RectangleHitbox.fromRect(24.83, 17.01, Vec(-12.88, -46.14)),
                    RectangleHitbox.fromRect(36.45, 7.85, Vec(10.25, -58.66)),
                    RectangleHitbox.fromRect(10, 7, Vec(39.78, 62.8))
                )
            },
            {
                type: FloorNames.Carpet,
                hitbox: RectangleHitbox.fromRect(27.75, 15.75, Vec(-11.33, -7.13))
            }
        ],
        floorImages: [
            {
                key: "sawmill_warehouse_floor_2",
                position: Vec(9.8, -27.88)
            },
            {
                key: "sawmill_warehouse_floor_1",
                position: Vec(0.06, 31.57)
            }
        ],
        ceilingImages: [
            {
                key: "sawmill_warehouse_ceiling_2",
                position: Vec(9.7, -26.86),
                scale: Vec(2, 2)
            },
            {
                key: "sawmill_warehouse_ceiling_1",
                position: Vec(-0.02, 31.64),
                scale: Vec(2, 2)
            }
        ],
        groundGraphics: [
            { // stroke
                color: 0x4d4d4d,
                hitbox: RectangleHitbox.fromRect(10, 7, Vec(39.78, 62.79))
            },
            { // fill
                color: 0x666666,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4, 3.7, Vec(37.5, 63.8)),
                    RectangleHitbox.fromRect(4, 3.7, Vec(42, 63.8))
                )
            },
            { // stroke
                color: 0x343434,
                hitbox: RectangleHitbox.fromRect(36.37, 6.98, Vec(10.25, -59.06))
            },
            { // fill
                color: 0x4c4c4c,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(16.93, 6.17, Vec(19.19, -58.73)),
                    RectangleHitbox.fromRect(16.98, 6.17, Vec(1.35, -58.69))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            // { idString: "headquarters_security_desk", position: Vec(-11.33, -17.63), rotation: 2, activated: true },
            { idString: "gun_mount_hatchet", position: Vec(10.05, -0.99), rotation: 2 },
            { idString: randomToilet, position: Vec(-20.58, -46.84), rotation: 1 },
            { idString: "box", position: Vec(-41.54, 6.09) },
            { idString: "box", position: Vec(-41.39, 10.98) },
            { idString: "box", position: Vec(36.5, 18.7) },
            { idString: "box", position: Vec(41.02, 21.62) },
            { idString: "box", position: Vec(-22.04, -9.38) },
            { idString: "box", position: Vec(42.06, -32.99) },
            { idString: "large_logs_pile_2", position: Vec(-25.22, 7.95), rotation: 2, variation: 2 },
            { idString: "large_logs_pile_2", position: Vec(-14.07, 17.72), rotation: 2, variation: 1 },
            { idString: "large_logs_pile_2", position: Vec(1.56, 41.95), rotation: 1, variation: 1 },
            { idString: "barrel", position: Vec(-39.88, 54.75) },
            { idString: "barrel", position: Vec(40.35, 42.35) },
            { idString: "pallet", position: Vec(38.67, 20.25), rotation: 0 },
            { idString: "regular_crate", position: Vec(11.22, 48.05) },
            { idString: "regular_crate", position: Vec(21.34, 44.9) },
            { idString: "small_logs_pile_2", position: Vec(-20.55, 55.01), rotation: 3 },
            { idString: "small_logs_pile_2", position: Vec(10.7, 37.82), rotation: 3 },
            { idString: "large_drawer", position: Vec(40.29, 6.61), rotation: 3 },
            { idString: "desk_left", position: Vec(34.52, -48.19), rotation: 0 },
            { idString: "desk_right", position: Vec(34.48, -15.7), rotation: 2 },
            { idString: "ammo_crate", position: Vec(-30.03, 54.84) },
            { idString: "lansirama_crate", position: Vec(-10.75, 8.12) },
            { idString: "filing_cabinet", position: Vec(-21.09, -3.38), rotation: 1 },
            { idString: "trash_can", position: Vec(-4.68, -51.76) },
            { idString: "potted_plant", position: Vec(40.75, -3.29), rotation: 0 },
            { idString: "potted_plant", position: Vec(-21.44, -33.41), rotation: 0 },
            { idString: "grey_office_chair", position: Vec(35.77, -20.84), rotation: 0 },
            { idString: "grey_office_chair", position: Vec(-6.16, -9.76), rotation: 2 },
            { idString: "file_cart", position: Vec(10.38, -30.47), rotation: 3 },
            { idString: "cobweb", position: Vec(39.97, -49.62), rotation: 3 },
            { idString: "door", position: Vec(5.69, -55.48), rotation: 0 },
            { idString: "door", position: Vec(14.84, -55.48), rotation: 2 },
            { idString: "door", position: Vec(15.13, 7.61), rotation: 1 },
            { idString: "door", position: Vec(40.21, 61.24), rotation: 0 },
            { idString: "door", position: Vec(-7.5, -38.14), rotation: 2 },
            { idString: "sawmill_warehouse_wall_1", position: Vec(-4.63, 1.76), rotation: 0 },
            { idString: "sawmill_warehouse_wall_2", position: Vec(29.58, 14.39), rotation: 0 },
            { idString: "sawmill_warehouse_wall_3", position: Vec(-18.62, -38.08), rotation: 0 },
            { idString: "sawmill_warehouse_wall_4", position: Vec(-0.98, -45.8), rotation: 0 },
            { idString: "sawmill_warehouse_wall_5", position: Vec(22.93, -15), rotation: 0 },
            { idString: "sawmill_warehouse_wall_6", position: Vec(22.93, -46.68), rotation: 0 },
            { idString: "sawmill_warehouse_wall_7", position: Vec(33.43, -8.14), rotation: 0 },
            { idString: "sawmill_warehouse_column", position: Vec(22.93, -22.4) },
            { idString: "sawmill_warehouse_column", position: Vec(22.93, -37.42) }
        ]
    },
    {
        idString: "sawmill_office",
        name: "sawmill Office",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(70, 42),
        ceilingHitbox: RectangleHitbox.fromRect(53.85, 24.8, Vec(-0.03, 0.35)),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(19.47, 2.01, Vec(-6.76, 13.4)),
            RectangleHitbox.fromRect(2, 28.09, Vec(27.85, 0.25)),
            RectangleHitbox.fromRect(2.01, 27.49, Vec(-27.85, 0.65)),
            RectangleHitbox.fromRect(45.57, 2, Vec(-6.06, -12.8)),
            RectangleHitbox.fromRect(6.38, 2, Vec(25.66, 13.39))
        ),
        material: "stone",
        particle: "sawmill_office_particle",
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(54.3, 27.2)
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.49, 5.31, Vec(21.77, -15.35)),
                    RectangleHitbox.fromRect(10.4, 4.52, Vec(-21.65, 15.74))
                )
            }
        ],
        ceilingImages: [{
            key: "sawmill_office_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        groundGraphics: [
            { // stroke
                color: 0x4d4d4d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.37, 4.02, Vec(-21.61, 16.01)),
                    RectangleHitbox.fromRect(10.38, 4.77, Vec(21.8, -15.62))
                )
            },
            { // fill
                color: 0x666666,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.65, 3.59, Vec(-19.07, 16.02)),
                    RectangleHitbox.fromRect(4.65, 3.59, Vec(-24.24, 16.01)),
                    RectangleHitbox.fromRect(4.66, 4.38, Vec(24.35, -15.53)),
                    RectangleHitbox.fromRect(4.66, 4.38, Vec(19.19, -15.54))
                )
            }
        ],
        floorImages: [{
            key: "sawmill_office_floor",
            position: Vec(0.07, 0.32)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "door", position: Vec(-22.11, 13.43), rotation: 2 },
            { idString: "door", position: Vec(21.37, -12.75), rotation: 2 },
            { idString: "cobweb", position: Vec(-21.95, -6.99), rotation: 0 },
            { idString: "window2", position: Vec(7.78, 13.36), rotation: 1 },
            { idString: "window2", position: Vec(17.27, 13.36), rotation: 1 },
            { idString: "potted_plant", position: Vec(-22.71, -7.81), rotation: 0 },
            { idString: { box: 1, grenade_box: 0.1 }, position: Vec(-16.19, -9.05) },
            { idString: "desk_left", position: Vec(-5.92, 6.16), rotation: 2, lootSpawnOffset: Vec(0, -1) },
            { idString: "small_desk", position: Vec(23.99, 5.97), rotation: 1, lootSpawnOffset: Vec(-1, -0.5) }
        ]
    },

    {
        idString: "cabin",
        name: "Cabin",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "cabin_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.52, 18.96, Vec(-46.54, 1.55)),
            RectangleHitbox.fromRect(1.52, 19.91, Vec(-46.54, 23.97)),
            RectangleHitbox.fromRect(1.9, 26.83, Vec(-26.6, -19.92)),
            RectangleHitbox.fromRect(1.9, 33.33, Vec(-26.6, 20.25)),
            RectangleHitbox.fromRect(19.41, 1.91, Vec(-17.86, -32.39)),
            RectangleHitbox.fromRect(35.21, 1.9, Vec(-9.95, 35.96)),
            RectangleHitbox.fromRect(11.97, 1.91, Vec(45.5, -32.38)),
            RectangleHitbox.fromRect(23, 1.91, Vec(14.1, -32.38)),
            RectangleHitbox.fromRect(1.51, 5.28, Vec(6.91, 39.55)),
            new CircleHitbox(1.04, Vec(6.91, 43.22)),
            RectangleHitbox.fromRect(13.09, 1.9, Vec(24.24, 35.97)),
            RectangleHitbox.fromRect(1.54, 5.45, Vec(18.47, 39.65)),
            new CircleHitbox(1.04, Vec(18.46, 43.4)),
            RectangleHitbox.fromRect(1.9, 19.55, Vec(50.57, -23.57)),
            RectangleHitbox.fromRect(1.91, 39.59, Vec(50.57, 17.13)),
            RectangleHitbox.fromRect(9.62, 1.89, Vec(46.71, 35.97))
        ),
        spawnHitbox: RectangleHitbox.fromRect(108.61, 134.94, Vec(3.16, 3.27)),
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "outhouse", position: Vec(-42.87, -32.12), orientation: 3 }
        ],
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(75.36, 66.63, Vec(11.95, 1.77)),
            RectangleHitbox.fromRect(18.34, 47.81, Vec(-36.7, 12.94)),
            RectangleHitbox.fromRect(10, 10.38, Vec(-26.9, -1.42)),
            RectangleHitbox.fromRect(10, 2.09, Vec(12.71, 34.83))
        ),
        floorImages: [
            {
                key: "cabin_front_stair",
                position: Vec(12.71, 40.13)
            },
            {
                key: "cabin_floor_1",
                position: Vec(-37.1, 13.05)
            },
            {
                key: "cabin_floor_2",
                position: Vec(12.77, 1.93)
            },
            {
                key: "cabin_stair",
                position: Vec(-36.28, -14.58)
            },
            {
                key: "cabin_stair",
                position: Vec(-36.28, 40.67),
                rotation: Math.PI
            },
            // particles (floor)
            {
                key: "wood_particle",
                position: Vec(51.33, 39.12),
                tint: 0x5d4622
            },
            {
                key: "wood_particle",
                position: Vec(50.41, -41.21),
                tint: 0x5d4622
            },
            {
                key: "wood_particle",
                position: Vec(50.86, -46.67),
                rotation: Math.PI / 3,
                tint: 0x5d4622
            },
            {
                key: "wood_particle",
                position: Vec(50.15, -53.71),
                rotation: Math.PI,
                tint: 0x5d4622
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(75.4, 40.34, Vec(12.07, -11.26)),
                    RectangleHitbox.fromRect(20.34, 47.58, Vec(-35.78, 12.99)),
                    RectangleHitbox.fromRect(45.85, 26.32, Vec(26.74, 21.98)),
                    RectangleHitbox.fromRect(10, 10, Vec(12.69, 38.45)),
                    RectangleHitbox.fromRect(14.59, 10, Vec(-36.29, 39.54)),
                    RectangleHitbox.fromRect(14.57, 10, Vec(-36.26, -13.46))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(30.1, 26.7, Vec(-10.85, 21.9))
            }
        ],
        ceilingImages: [
            {
                key: "cabin_ceiling_1",
                position: Vec(11.94, 1.91),
                scale: Vec(2, 2)
            },
            {
                key: "cabin_ceiling_2",
                position: Vec(-37.97, 13),
                scale: Vec(2, 2.015)
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "window", position: Vec(-2.66, -32.41), rotation: 1 },
            { idString: "window", position: Vec(50.63, -8.23), rotation: 0 },
            { idString: "window", position: Vec(36.2, 36), rotation: 1 },

            { idString: "small_logs_pile", position: Vec(-32.87, 10.96), rotation: 0 },
            { idString: "trash_bag", position: Vec(-31.32, 18.88), rotation: 0 },
            { idString: "door", position: Vec(-26.63, -0.98), rotation: 3 },
            { idString: "bed", position: Vec(-17.28, -25.6), rotation: 1 },
            { idString: "small_drawer", position: Vec(-21.7, -15.41), rotation: 1 },
            { idString: randomStove, position: Vec(-21.84, 13.9), rotation: 1 },
            { idString: "kitchen_unit_3", position: Vec(-21.87, 23.66), rotation: 1 },
            { idString: "kitchen_unit_2", position: Vec(-22.34, 31.7), rotation: 1 },
            { idString: "kitchen_unit_1", position: Vec(-15.73, 31.26), rotation: 2 },
            { idString: "fridge", position: Vec(-7.52, 31.07), rotation: 2 },
            { idString: "door", position: Vec(-1.27, -10.25), rotation: 0 },
            { idString: "small_table", position: Vec(2.52, 8.97), rotation: 1, variation: 1 },
            { idString: "bookshelf", position: Vec(9.37, -21.55), rotation: 3 },
            { idString: "door", position: Vec(12.26, 35.99), rotation: 2 },
            { idString: "potted_plant", position: Vec(19.54, -27.25), rotation: 0 },
            { idString: "small_bed", position: Vec(26.6, 26.81), rotation: 2 },
            { idString: "fireplace", position: Vec(32.68, -27.28), rotation: 0 },
            { idString: "couch", position: Vec(32.65, -10.98), rotation: 1 },
            { idString: "door", position: Vec(35.98, 7.16), rotation: 2 },
            { idString: "potted_plant", position: Vec(44.87, -26.73), rotation: 2 },
            { idString: "trash_can", position: Vec(46.23, 11.33), rotation: 0 },
            { idString: "large_drawer", position: Vec(45.37, 28.18), rotation: 3 },
            { idString: "cabin_secret_wall", position: Vec(33.25, -32.327), rotation: 0 },

            { idString: "cabin_wall_2", position: Vec(27.2, 7.13), rotation: 0 },
            { idString: "cabin_wall_3", position: Vec(-16.25, -10.17), rotation: 0 },
            { idString: "cabin_wall_4", position: Vec(13.03, -21.53), rotation: 1 },
            { idString: "cabin_wall_5", position: Vec(21.69, 21.8), rotation: 1 },
            { idString: "cabin_wall_1", position: Vec(45.53, 7.13), rotation: 0 },
            { idString: "cabin_wall_1", position: Vec(7.44, -10.16), rotation: 0 },

            { idString: "cabin_fence", position: Vec(-31.57, 63.71), rotation: 0 },
            { idString: "cabin_fence", position: Vec(-7.63, 63.71), rotation: 0 },
            { idString: "cabin_fence", position: Vec(15.71, 63.71), rotation: 0 },
            { idString: "cabin_fence", position: Vec(38.38, 63.71), rotation: 0 },
            { idString: "cabin_fence", position: Vec(49.59, 52.84), rotation: 1 },
            { idString: "cabin_fence", position: Vec(38.66, -58.86), rotation: 0 },
            { idString: "cabin_fence", position: Vec(15.49, -58.86), rotation: 0 },
            { idString: "cabin_fence", position: Vec(-7.82, -58.86), rotation: 0 },

            { idString: "box", position: Vec(-7.53, -53.77) },
            { idString: "box", position: Vec(-2.59, -55.04) },
            { idString: "box", position: Vec(-29.67, 59.77) },
            { idString: "trash_bag", position: Vec(-11.8, 41.41), rotation: 0 },
            { idString: "trash_bag", position: Vec(-6.01, 42.69), rotation: 3 },
            { idString: "barrel", position: Vec(33.59, 57.14) },
            { idString: "regular_crate", position: Vec(43.08, 57.22) },

            { idString: "cabin_column", position: Vec(-19.43, -58.87) },
            { idString: "cabin_column", position: Vec(3.81, -58.85) },
            { idString: "cabin_column", position: Vec(27.43, -58.9) },
            { idString: "cabin_column", position: Vec(50.1, -58.84) },
            { idString: "cabin_column", position: Vec(50.18, -34.99) },
            { idString: "cabin_column", position: Vec(-43.51, 63.65) },
            { idString: "cabin_column", position: Vec(-19.56, 63.75) },
            { idString: "cabin_column", position: Vec(4.39, 63.7) },
            { idString: "cabin_column", position: Vec(26.99, 63.74) },
            { idString: "cabin_column", position: Vec(49.63, 63.65) },
            { idString: "cabin_column", position: Vec(12.96, -10.22) },
            { idString: "cabin_column", position: Vec(21.64, 7.2) },
            { idString: "cabin_column", position: Vec(-46.8, 35.44) },
            { idString: "cabin_column", position: Vec(-46.8, 12.48) },
            { idString: "cabin_column", position: Vec(-46.8, -9.48) }
        ],
        lootSpawners: IS_CLIENT ? undefined : [{ table: "ground_loot", position: Vec(-37.59, -2.24) }]
    },
    {
        idString: "sawmill_storage",
        name: "Sawmill Storage",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(114.82, 52.97, Vec(0.99, -0.09)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(99.01, 39.08, Vec(-0.03, -0.3)),
            RectangleHitbox.fromRect(29.53, 2.74, Vec(0.56, 19.38))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(89.67, 2.01, Vec(5.4, -20.4)),
            RectangleHitbox.fromRect(2, 42.01, Vec(-50.47, -0.39)),
            RectangleHitbox.fromRect(2, 41.84, Vec(50.46, -0.48)),
            RectangleHitbox.fromRect(34.66, 2, Vec(34.13, 20.24)),
            RectangleHitbox.fromRect(34.66, 2.01, Vec(-34.14, 20.24))
        ),
        material: "stone",
        particle: "sawmill_warehouse_particle",
        particleVariations: 2,
        floorImages: [
            {
                key: "sawmill_storage_floor",
                position: Vec(0, 0)
            },
            {
                key: "porta_potty_floor",
                position: Vec(-38.24, 11.3),
                rotation: -Math.PI / 2
            },
            {
                key: "porta_potty_residue",
                position: Vec(-38.61, 11.37),
                rotation: -Math.PI / 2
            }
        ],
        ceilingImages: [{
            key: "sawmill_storage_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        groundGraphics: [
            { // stroke
                color: 0x484848,
                hitbox: RectangleHitbox.fromRect(10.25, 5, Vec(-44.6, -22.53))
            },
            { // fill
                color: 0x6a6a6a,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.1, 3.56, Vec(-42.2, -22.53)),
                    RectangleHitbox.fromRect(3.99, 3.56, Vec(-47, -22.53))
                )
            }
        ],
        floors: [{
            type: FloorNames.Stone,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(100.32, 41.74, Vec(-0.09, -0.13)),
                RectangleHitbox.fromRect(10.25, 5.14, Vec(-44.6, -22.53))
            )
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "sawmill_storage_column", position: Vec(-15.64, 20.24) },
            { idString: "sawmill_storage_column", position: Vec(16.85, 20.24) },
            { idString: "forklift", position: Vec(0.09, 20.22), rotation: 2 },
            { idString: "door", position: Vec(-43.9, -20.43), rotation: 0 },
            { idString: "cobweb", position: Vec(44.62, -14.63), rotation: 3 },
            { idString: "box", position: Vec(-36.77, 0.8) },
            { idString: "box", position: Vec(-7.45, 2.4) },
            { idString: "box", position: Vec(-2.56, -1.17) },
            { idString: "log", position: Vec(6.54, -17.34), rotation: 0, variation: 2 },
            { idString: "small_moldy_logs", position: Vec(-9.68, -14.99), rotation: 0 },
            { idString: "regular_crate", position: Vec(43.58, -13.3) },
            { idString: "regular_crate", position: Vec(33.44, -10.67) },
            { idString: "lansirama_crate", position: Vec(40.9, 11.59) },
            { idString: "grenade_crate", position: Vec(0.41, 8.53) },
            { idString: "pallet", position: Vec(0.2, 8.09), rotation: 0 },
            { idString: "small_logs_pile_2", position: Vec(-44.19, -1.03), rotation: 2 },
            { idString: "large_logs_pile_2", position: Vec(39.26, 0.2), rotation: 2, variation: 2 },
            { idString: "porta_potty_toilet_open", position: Vec(-44.41, 11.59), rotation: 1 },
            { idString: "porta_potty_sink_wall", position: Vec(-39.6, 5.7), rotation: 2 }
        ]
    },
    {
        idString: "warehouse_hunted",
        name: "Abandoned Warehouse",
        particle: "warehouse_hunted_particle",
        material: "stone",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(120.62, 66.26, Vec(0.95, -0.4)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(67.91, 31.66, Vec(-10.57, -8.33)),
            RectangleHitbox.fromRect(3.82, 14.16, Vec(23.46, -8.33)),
            RectangleHitbox.fromRect(10, 10, Vec(-39.86, 2.48))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(71.36, 2, Vec(-10.81, 8.51)),
            RectangleHitbox.fromRect(70.66, 2, Vec(-10.51, -25.14)),
            RectangleHitbox.fromRect(2.02, 23.55, Vec(-45.49, -14.36)),
            RectangleHitbox.fromRect(2.01, 10.76, Vec(24.37, -20.76)),
            RectangleHitbox.fromRect(2.01, 10.76, Vec(24.37, 4.13))
        ),
        floors: [
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(29.13, 19.84, Vec(-29.96, -14.24))
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(71.74, 12.2, Vec(-10.51, 1.5)),
                    RectangleHitbox.fromRect(41.42, 20.49, Vec(4.66, -13.9))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(29.03, 10, Vec(39.78, -8.42)),
                    RectangleHitbox.fromRect(5.14, 10.19, Vec(-48.08, 2.48))
                )
            },
            {
                type: FloorNames.Sand,
                hitbox: RectangleHitbox.fromRect(10, 10.09, Vec(30.35, 1.4))
            },
            // TODO simplify these, we absolutely do not need polygon hitboxes for floors
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(31.77, -3.79),
                    Vec(-0.19, 9.42),
                    Vec(-0.27, 12.94),
                    Vec(-0.29, 16.61),
                    Vec(-0.29, 20.15),
                    Vec(-0.21, 23.78),
                    Vec(-0.23, 25.48),
                    Vec(-0.55, 26.64),
                    Vec(-0.75, 27.56),
                    Vec(0.97, 27.82),
                    Vec(3.38, 28.01),
                    Vec(5.87, 28.19),
                    Vec(8.79, 28.35),
                    Vec(11.51, 28.43),
                    Vec(14.05, 28.5),
                    Vec(16.96, 28.42),
                    Vec(19.8, 28.31),
                    Vec(22.68, 28.12),
                    Vec(25.28, 27.96),
                    Vec(27.87, 27.84),
                    Vec(30.54, 27.8),
                    Vec(33.35, 27.86),
                    Vec(36.22, 27.94),
                    Vec(39.07, 28.08),
                    Vec(41.87, 28.25),
                    Vec(44.13, 28.47),
                    Vec(45.87, 28.56),
                    Vec(47.93, 28.39),
                    Vec(50.13, 28.21),
                    Vec(51.66, 27.52),
                    Vec(52.7, 26.31),
                    Vec(53.56, 24.94),
                    Vec(54.01, 23.7),
                    Vec(54.32, 22.48),
                    Vec(54.53, 21.32),
                    Vec(54.62, 20.06),
                    Vec(54.77, 18.98),
                    Vec(54.77, 17.84),
                    Vec(54.69, 16.91),
                    Vec(54.63, 15.94),
                    Vec(54.53, 15.01),
                    Vec(54.53, 13.9),
                    Vec(54.47, 12.87),
                    Vec(54.33, 11.82),
                    Vec(54.14, 10.75),
                    Vec(53.9, 9.46),
                    Vec(53.78, 8.24),
                    Vec(53.64, 7.33),
                    Vec(53.66, 6.55),
                    Vec(53.59, 5.35),
                    Vec(53.63, 4.24),
                    Vec(53.63, 3.04),
                    Vec(53.63, 1.74),
                    Vec(53.66, -1.9),
                    Vec(53.63, -3.6),
                    Vec(51.51, -3.67),
                    Vec(49.29, -3.7),
                    Vec(47.37, -3.74),
                    Vec(46.41, -5.07),
                    Vec(45.77, -5.36),
                    Vec(44.6, -5.25),
                    Vec(43.98, -5.07),
                    Vec(43.64, -4.99),
                    Vec(42.95, -4.69),
                    Vec(42.31, -4.49),
                    Vec(41.68, -4.46),
                    Vec(41.09, -4.53),
                    Vec(40.55, -4.63),
                    Vec(40.07, -4.66),
                    Vec(39.69, -4.57),
                    Vec(39.5, -4.4),
                    Vec(39.38, -4.17),
                    Vec(39.29, -3.96),
                    Vec(39.22, -3.67),
                    Vec(38.5, -3.64)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(24.94, -13.68),
                    Vec(16.11, -26.36),
                    Vec(16.63, -26.51),
                    Vec(17.23, -26.68),
                    Vec(17.64, -26.77),
                    Vec(18.02, -26.89),
                    Vec(18.49, -26.99),
                    Vec(18.93, -27.1),
                    Vec(19.33, -27.2),
                    Vec(19.72, -27.29),
                    Vec(20.11, -27.38),
                    Vec(20.53, -27.47),
                    Vec(20.95, -27.56),
                    Vec(21.36, -27.63),
                    Vec(21.77, -27.71),
                    Vec(22.19, -27.77),
                    Vec(22.63, -27.83),
                    Vec(23.07, -27.87),
                    Vec(23.5, -27.9),
                    Vec(23.96, -27.92),
                    Vec(24.44, -27.94),
                    Vec(24.92, -27.92),
                    Vec(25.44, -27.86),
                    Vec(25.87, -27.79),
                    Vec(26.28, -27.69),
                    Vec(26.68, -27.58),
                    Vec(27.21, -27.45),
                    Vec(27.72, -27.35),
                    Vec(28.27, -27.28),
                    Vec(28.88, -27.22),
                    Vec(29.79, -27.17),
                    Vec(30.95, -27.14),
                    Vec(32.23, -27.15),
                    Vec(32.87, -27.16),
                    Vec(33.51, -27.19),
                    Vec(34.16, -27.22),
                    Vec(34.84, -27.26),
                    Vec(35.52, -27.31),
                    Vec(36.33, -27.36),
                    Vec(37.14, -27.42),
                    Vec(37.89, -27.48),
                    Vec(38.66, -27.55),
                    Vec(39.53, -27.63),
                    Vec(40.35, -27.71),
                    Vec(41.61, -27.81),
                    Vec(42.66, -27.93),
                    Vec(43.93, -28.05),
                    Vec(45.05, -28.16),
                    Vec(45.99, -28.25),
                    Vec(46.82, -28.31),
                    Vec(47.62, -28.38),
                    Vec(48.41, -28.44),
                    Vec(48.99, -28.48),
                    Vec(49.41, -28.51),
                    Vec(49.88, -28.52),
                    Vec(50.28, -28.54),
                    Vec(50.81, -28.55),
                    Vec(51.26, -28.53),
                    Vec(51.68, -28.52),
                    Vec(52.09, -28.51),
                    Vec(52.46, -28.49),
                    Vec(52.84, -28.45),
                    Vec(53.12, -28.38),
                    Vec(53.35, -28.3),
                    Vec(53.56, -28.21),
                    Vec(53.68, -28.12),
                    Vec(53.77, -28),
                    Vec(53.82, -27.77),
                    Vec(53.85, -27.42),
                    Vec(53.85, -26.81),
                    Vec(53.85, -25.97),
                    Vec(53.85, -25.12),
                    Vec(53.88, -24.34),
                    Vec(53.9, -23.34),
                    Vec(53.9, -22.57),
                    Vec(53.88, -21.56),
                    Vec(53.89, -20.34),
                    Vec(53.88, -18.76),
                    Vec(53.88, -17.19),
                    Vec(53.88, -15.64),
                    Vec(53.87, -13.69),
                    Vec(52.17, -13.69),
                    Vec(50.19, -13.69),
                    Vec(48.04, -13.69),
                    Vec(46.26, -13.69),
                    Vec(44.34, -13.69),
                    Vec(42.14, -13.69),
                    Vec(40.44, -13.69),
                    Vec(38.38, -13.69),
                    Vec(36.41, -13.69),
                    Vec(35.39, -13.68),
                    Vec(35.07, -13.42),
                    Vec(34.78, -13.25),
                    Vec(34.46, -13.06),
                    Vec(34.2, -12.94),
                    Vec(33.92, -12.84),
                    Vec(33.62, -12.74),
                    Vec(33.28, -12.64),
                    Vec(32.96, -12.55),
                    Vec(32.6, -12.43),
                    Vec(32.24, -12.34),
                    Vec(31.88, -12.25),
                    Vec(31.51, -12.18),
                    Vec(31.14, -12.1),
                    Vec(30.77, -12.07),
                    Vec(30.39, -12.06),
                    Vec(30.02, -12.09),
                    Vec(29.66, -12.18),
                    Vec(29.29, -12.26),
                    Vec(28.95, -12.42),
                    Vec(28.65, -12.63),
                    Vec(28.36, -12.86),
                    Vec(28.1, -13.12),
                    Vec(27.84, -13.39),
                    Vec(27.74, -13.65),
                    Vec(27.04, -13.67),
                    Vec(26.51, -13.68)
                ])
            }
        ],
        groundGraphics: [
            { // stroke
                color: 0x484848,
                hitbox: RectangleHitbox.fromRect(5.14, 10.19, Vec(-48.08, 2.48))
            },
            { // fill
                color: 0x6a6a6a,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(3.56, 4.1, Vec(-48.16, 4.82)),
                    RectangleHitbox.fromRect(3.56, 3.99, Vec(-48.16, 0.08))
                )
            },
            { // stroke
                color: 0x535353,
                hitbox: RectangleHitbox.fromRect(28.92, 10.05, Vec(39.82, -8.65))
            },
            { // fill
                color: 0x646464,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.52, 9.08, Vec(53.04, -8.65)),
                    RectangleHitbox.fromRect(0.84, 9.08, Vec(25.79, -8.65)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(29.33, -8.65)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(31.31, -8.65)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(33.3, -8.64)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(35.26, -8.64)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(37.25, -8.64)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(39.25, -8.64)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(41.22, -8.65)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(43.21, -8.64)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(45.19, -8.64)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(45.19, -8.64)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(47.18, -8.64)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(49.16, -8.64)),
                    RectangleHitbox.fromRect(1.68, 9.08, Vec(51.13, -8.64)),
                    RectangleHitbox.fromRect(1.67, 9.08, Vec(27.34, -8.65))
                )
            },
            {
                color: 0x614c35,
                hitbox: RectangleHitbox.fromRect(10, 10.09, Vec(30.35, 1.4))
            },
            {
                color: 0x614c35,
                hitbox: new PolygonHitbox([
                    Vec(31.77, -3.79),
                    Vec(-0.19, 9.42),
                    Vec(-0.27, 12.94),
                    Vec(-0.29, 16.61),
                    Vec(-0.29, 20.15),
                    Vec(-0.21, 23.78),
                    Vec(-0.23, 25.48),
                    Vec(-0.55, 26.64),
                    Vec(-0.75, 27.56),
                    Vec(0.97, 27.82),
                    Vec(3.38, 28.01),
                    Vec(5.87, 28.19),
                    Vec(8.79, 28.35),
                    Vec(11.51, 28.43),
                    Vec(14.05, 28.5),
                    Vec(16.96, 28.42),
                    Vec(19.8, 28.31),
                    Vec(22.68, 28.12),
                    Vec(25.28, 27.96),
                    Vec(27.87, 27.84),
                    Vec(30.54, 27.8),
                    Vec(33.35, 27.86),
                    Vec(36.22, 27.94),
                    Vec(39.07, 28.08),
                    Vec(41.87, 28.25),
                    Vec(44.13, 28.47),
                    Vec(45.87, 28.56),
                    Vec(47.93, 28.39),
                    Vec(50.13, 28.21),
                    Vec(51.66, 27.52),
                    Vec(52.7, 26.31),
                    Vec(53.56, 24.94),
                    Vec(54.01, 23.7),
                    Vec(54.32, 22.48),
                    Vec(54.53, 21.32),
                    Vec(54.62, 20.06),
                    Vec(54.77, 18.98),
                    Vec(54.77, 17.84),
                    Vec(54.69, 16.91),
                    Vec(54.63, 15.94),
                    Vec(54.53, 15.01),
                    Vec(54.53, 13.9),
                    Vec(54.47, 12.87),
                    Vec(54.33, 11.82),
                    Vec(54.14, 10.75),
                    Vec(53.9, 9.46),
                    Vec(53.78, 8.24),
                    Vec(53.64, 7.33),
                    Vec(53.66, 6.55),
                    Vec(53.59, 5.35),
                    Vec(53.63, 4.24),
                    Vec(53.63, 3.04),
                    Vec(53.63, 1.74),
                    Vec(53.66, -1.9),
                    Vec(53.63, -3.6),
                    Vec(51.51, -3.67),
                    Vec(49.29, -3.7),
                    Vec(47.37, -3.74),
                    Vec(46.41, -5.07),
                    Vec(45.77, -5.36),
                    Vec(44.6, -5.25),
                    Vec(43.98, -5.07),
                    Vec(43.64, -4.99),
                    Vec(42.95, -4.69),
                    Vec(42.31, -4.49),
                    Vec(41.68, -4.46),
                    Vec(41.09, -4.53),
                    Vec(40.55, -4.63),
                    Vec(40.07, -4.66),
                    Vec(39.69, -4.57),
                    Vec(39.5, -4.4),
                    Vec(39.38, -4.17),
                    Vec(39.29, -3.96),
                    Vec(39.22, -3.67),
                    Vec(38.5, -3.64)
                ])
            },
            {
                color: 0x614c35,
                hitbox: new PolygonHitbox([
                    Vec(24.94, -13.68),
                    Vec(16.11, -26.36),
                    Vec(16.63, -26.51),
                    Vec(17.23, -26.68),
                    Vec(17.64, -26.77),
                    Vec(18.02, -26.89),
                    Vec(18.49, -26.99),
                    Vec(18.93, -27.1),
                    Vec(19.33, -27.2),
                    Vec(19.72, -27.29),
                    Vec(20.11, -27.38),
                    Vec(20.53, -27.47),
                    Vec(20.95, -27.56),
                    Vec(21.36, -27.63),
                    Vec(21.77, -27.71),
                    Vec(22.19, -27.77),
                    Vec(22.63, -27.83),
                    Vec(23.07, -27.87),
                    Vec(23.5, -27.9),
                    Vec(23.96, -27.92),
                    Vec(24.44, -27.94),
                    Vec(24.92, -27.92),
                    Vec(25.44, -27.86),
                    Vec(25.87, -27.79),
                    Vec(26.28, -27.69),
                    Vec(26.68, -27.58),
                    Vec(27.21, -27.45),
                    Vec(27.72, -27.35),
                    Vec(28.27, -27.28),
                    Vec(28.88, -27.22),
                    Vec(29.79, -27.17),
                    Vec(30.95, -27.14),
                    Vec(32.23, -27.15),
                    Vec(32.87, -27.16),
                    Vec(33.51, -27.19),
                    Vec(34.16, -27.22),
                    Vec(34.84, -27.26),
                    Vec(35.52, -27.31),
                    Vec(36.33, -27.36),
                    Vec(37.14, -27.42),
                    Vec(37.89, -27.48),
                    Vec(38.66, -27.55),
                    Vec(39.53, -27.63),
                    Vec(40.35, -27.71),
                    Vec(41.61, -27.81),
                    Vec(42.66, -27.93),
                    Vec(43.93, -28.05),
                    Vec(45.05, -28.16),
                    Vec(45.99, -28.25),
                    Vec(46.82, -28.31),
                    Vec(47.62, -28.38),
                    Vec(48.41, -28.44),
                    Vec(48.99, -28.48),
                    Vec(49.41, -28.51),
                    Vec(49.88, -28.52),
                    Vec(50.28, -28.54),
                    Vec(50.81, -28.55),
                    Vec(51.26, -28.53),
                    Vec(51.68, -28.52),
                    Vec(52.09, -28.51),
                    Vec(52.46, -28.49),
                    Vec(52.84, -28.45),
                    Vec(53.12, -28.38),
                    Vec(53.35, -28.3),
                    Vec(53.56, -28.21),
                    Vec(53.68, -28.12),
                    Vec(53.77, -28),
                    Vec(53.82, -27.77),
                    Vec(53.85, -27.42),
                    Vec(53.85, -26.81),
                    Vec(53.85, -25.97),
                    Vec(53.85, -25.12),
                    Vec(53.88, -24.34),
                    Vec(53.9, -23.34),
                    Vec(53.9, -22.57),
                    Vec(53.88, -21.56),
                    Vec(53.89, -20.34),
                    Vec(53.88, -18.76),
                    Vec(53.88, -17.19),
                    Vec(53.88, -15.64),
                    Vec(53.87, -13.69),
                    Vec(52.17, -13.69),
                    Vec(50.19, -13.69),
                    Vec(48.04, -13.69),
                    Vec(46.26, -13.69),
                    Vec(44.34, -13.69),
                    Vec(42.14, -13.69),
                    Vec(40.44, -13.69),
                    Vec(38.38, -13.69),
                    Vec(36.41, -13.69),
                    Vec(35.39, -13.68),
                    Vec(35.07, -13.42),
                    Vec(34.78, -13.25),
                    Vec(34.46, -13.06),
                    Vec(34.2, -12.94),
                    Vec(33.92, -12.84),
                    Vec(33.62, -12.74),
                    Vec(33.28, -12.64),
                    Vec(32.96, -12.55),
                    Vec(32.6, -12.43),
                    Vec(32.24, -12.34),
                    Vec(31.88, -12.25),
                    Vec(31.51, -12.18),
                    Vec(31.14, -12.1),
                    Vec(30.77, -12.07),
                    Vec(30.39, -12.06),
                    Vec(30.02, -12.09),
                    Vec(29.66, -12.18),
                    Vec(29.29, -12.26),
                    Vec(28.95, -12.42),
                    Vec(28.65, -12.63),
                    Vec(28.36, -12.86),
                    Vec(28.1, -13.12),
                    Vec(27.84, -13.39),
                    Vec(27.74, -13.65),
                    Vec(27.04, -13.67),
                    Vec(26.51, -13.68)
                ])
            }
        ],
        floorImages: [{
            key: "warehouse_hunted_floor",
            position: Vec(-10.54, -8.32)
        }],
        ceilingImages: [{
            key: "warehouse_hunted_ceiling",
            position: Vec(-10.42, -8.06),
            scale: Vec(2, 1.8)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "door", position: Vec(-45.51, 2.91), rotation: 3 },
            { idString: "ammo_crate", position: Vec(-39.02, -18.68) },
            { idString: "lansirama_crate", position: Vec(43.7, 18.73), outdoors: true },
            { idString: "box", position: Vec(-11.85, -11.25) },
            { idString: { box: 1, grenade_box: 0.5 }, position: Vec(-31.08, -20.87) },
            { idString: "box", position: Vec(-29.62, -15.62) },
            { idString: "box", position: Vec(14.96, -21.59) },
            { idString: "box", position: Vec(20.21, -19.83) },
            { idString: "box", position: Vec(19.86, 4.52) },
            { idString: { box: 1, grenade_box: 0.7 }, position: Vec(-50.28, -19.75), outdoors: true },
            { idString: { box: 1, grenade_box: 0.1 }, position: Vec(46.66, -18.86), outdoors: true },
            { idString: "box", position: Vec(41.48, -20.91), outdoors: true },
            { idString: "box", position: Vec(36.16, 21.24), outdoors: true },
            { idString: "pallet", position: Vec(43.88, -19.54), rotation: 0, outdoors: true },
            { idString: "pallet", position: Vec(8.71, 14.14), rotation: 0, outdoors: true },
            { idString: "pallet", position: Vec(-9.84, 16.25), rotation: 1, outdoors: true },
            { idString: "propane_tank", position: Vec(10.5, 15.75), outdoors: true },
            { idString: "propane_tank", position: Vec(6.7, 12.54), outdoors: true },
            { idString: "barrel", position: Vec(-1.04, 3.06) },
            { idString: "barrel", position: Vec(-50.99, -12.54), outdoors: true },
            { idString: "barrel", position: Vec(30.2, 3.57), outdoors: true },
            { idString: "small_logs_pile_2", position: Vec(-22.17, -18.56), rotation: 0 },
            { idString: "small_logs_pile_2", position: Vec(-9.61, 16.49), rotation: 3, outdoors: true },
            { idString: "small_moldy_logs", position: Vec(-39.16, -9.41), rotation: 0 },
            { idString: "cobweb", position: Vec(-39.66, -19.32), rotation: 0 },
            { idString: "grenade_crate", position: Vec(32.19, -19.82), outdoors: true },
            { idString: "forklift", position: Vec(-21.11, 16.38), rotation: 1, outdoors: true },
            { idString: "regular_crate", position: Vec(11.63, 1.86) },
            { idString: "regular_crate", position: Vec(-9.88, -19.1) },
            { idString: "fence", position: Vec(29.74, -25.06), rotation: 0 },
            { idString: "fence", position: Vec(38.64, -25.06), rotation: 0 },
            { idString: "fence", position: Vec(46.95, -25.06), rotation: 0 },
            { idString: "fence", position: Vec(50.38, -19.78), rotation: 1 },
            { idString: "fence", position: Vec(50.38, 3.14), rotation: 1 },
            { idString: "fence", position: Vec(50.38, 11.7), rotation: 1 },
            { idString: "fence", position: Vec(50.38, 20.27), rotation: 1 },
            { idString: "fence", position: Vec(47.24, 25.24), rotation: 0 },
            { idString: "fence", position: Vec(38.68, 25.24), rotation: 0 },
            { idString: "fence", position: Vec(30.23, 25.24), rotation: 0 },
            { idString: "fence", position: Vec(21.78, 25.24), rotation: 0 },
            { idString: "fence", position: Vec(1.94, 13.89), rotation: 1 },
            { idString: "fence", position: Vec(1.95, 22.35), rotation: 1 },
            { idString: "metal_column", position: Vec(1.91, 25.37) },
            { idString: "metal_column", position: Vec(18.82, 25.37) },
            { idString: "warehouse_hunted_column", position: Vec(-16.05, -5.87) },
            { idString: "warehouse_hunted_column", position: Vec(4.45, -6.09) },
            { idString: "warehouse_hunted_wall_1", position: Vec(4.45, 1.43), rotation: 0 },
            { idString: "warehouse_hunted_wall_2", position: Vec(-16.07, -15.74), rotation: 0 }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(-29.05, -2.76) },
            { table: "ground_loot", position: Vec(39.69, -8.94) }
        ]
    },
    {
        idString: "hunting_stand_bottom",
        name: "Hunting Stand (Bottom)",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(24.22, 30.14),
        ceilingHitbox: RectangleHitbox.fromRect(20.77, 27.13),
        floorZIndex: ZIndexes.Ground,
        hasSecondFloor: true,
        groundGraphics: [{
            color: 0x34513e,
            hitbox: RectangleHitbox.fromRect(20.77, 27.13)
        }],
        ceilingImages: [{
            key: "hunting_stand_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "hunting_stand_wall_1", position: Vec(-0.19, -10.54), rotation: 0 },
            { idString: "hunting_stand_wall_1", position: Vec(-0.19, 10.26), rotation: 0 },
            { idString: "hunting_stand_column", position: Vec(-6.86, -10.54) },
            { idString: "hunting_stand_column", position: Vec(6.48, -10.54) },
            { idString: "hunting_stand_column", position: Vec(-6.85, 10.26) },
            { idString: "hunting_stand_column", position: Vec(6.48, 10.26) },
            { idString: "box", position: Vec(-3.1, 4.3) },
            { idString: { box: 1, grenade_box: 0.35 }, position: Vec(1.89, 6.12) },
            { idString: "regular_crate", position: Vec(-0.5, -4.07) }
        ]
    },
    {
        idString: "hunting_stand_top",
        name: "Hunting Stand (Top)",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "hunting_stand_particle",
        collideWithLayers: Layers.Adjacent,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.01, 21.34, Vec(8.62, 0.17)),
            RectangleHitbox.fromRect(2.01, 21.23, Vec(-8.67, 0.07)),
            RectangleHitbox.fromRect(15.08, 2, Vec(0.02, -11.64)),
            RectangleHitbox.fromRect(2.57, 2, Vec(5.86, 11.86)),
            RectangleHitbox.fromRect(2.57, 2, Vec(-6.29, 11.75))
        ),
        spawnHitbox: RectangleHitbox.fromRect(24.22, 30.14),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(15.29, 21.49, Vec(-0.01, 0.09)),
            RectangleHitbox.fromRect(9.58, 2.84, Vec(-0.21, 11.87))
        ),
        ceilingScope: "8x_scope",
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(21.27, 27.59)
        }],
        floorImages: [{
            key: "hunting_stand_floor",
            position: Vec(0, 0)
        }],
        ceilingImages: [{
            key: "hunting_stand_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "gun_locker", position: Vec(-0.02, -7.47), rotation: 0 },
            { idString: "hunting_stand_column", position: Vec(-8.59, -11.7) },
            { idString: "hunting_stand_column", position: Vec(8.63, -11.7) },
            { idString: "hunting_stand_column", position: Vec(-8.73, 11.8) },
            { idString: "hunting_stand_column", position: Vec(8.54, 11.88) }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: {
                hunting_stand_layout_1: 1,
                hunting_stand_layout_2: 1,
                hunting_stand_layout_3: 1
            },
            position: Vec(0, 0)
        }]
    },
    huntingStandLayout(1, [
        { idString: "box", position: Vec(3.01, -1.47) },
        { idString: "box", position: Vec(4.17, 3.64) }
    ]),
    huntingStandLayout(2, [
        { idString: "box", position: Vec(-4.33, 7.91) }
    ], [{
        table: "ground_loot",
        position: Vec(0, 0)
    }]),
    huntingStandLayout(3, [
        { idString: "box", position: Vec(-4.89, -2.17) },
        { idString: "box", position: Vec(4.17, 3.64) },
        { idString: "box", position: Vec(-4.91, 8.03) }
    ]),
    {
        idString: "hunting_stand",
        name: "Hunting Stand",
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(30, 36, Vec(0.23, -5.57)),
            RectangleHitbox.fromRect(13.97, 14, Vec(-0.2, 13.47))
        ),
        floors: [{
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(7.13, 9.85, Vec(-0.28, 13.17)),
            layer: Layer.ToUpstairs
        }],
        obstacles: IS_CLIENT ? undefined : [{
            idString: "blue_stair_collider",
            position: Vec(0, 13.27),
            layer: Layer.ToUpstairs,
            rotation: 2
        }],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "blue_stair", position: Vec(0, 13.66), layer: Layer.ToUpstairs },
            { idString: "hunting_stand_bottom", position: Vec(0, -5.4) },
            { idString: "hunting_stand_top", position: Vec(0, -5.33), layer: Layer.Upstairs }
        ]
    },
    {
        idString: "tavern_recording_puzzle",
        name: "Tavern Recording Puzzle",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(178.2, 147.94, Vec(2.31, -0.89)),
        puzzle: { delay: 0 },
        sounds: {
            normal: "tavern_music",
            solved: null,
            position: Vec(17.25, 6.59),
            falloff: 0.75,
            maxRange: 150
        },
        obstacles: IS_CLIENT ? undefined : [
            { idString: "tavern_recorder", position: Vec(6.77, -0.26), rotation: 0, puzzlePiece: true }
        ]
    },
    {
        idString: "tavern",
        name: "Tavern",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "cabin_wall_particle",
        collideWithLayers: Layers.Equal,
        bunkerSpawnHitbox: RectangleHitbox.fromRect(106.29, 130.73, Vec(42.71, -53.34)),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.01, 52.82, Vec(-75.92, -26.65)),
            RectangleHitbox.fromRect(37.57, 2.01, Vec(-57.14, -52.06)),
            RectangleHitbox.fromRect(2.03, 2.76, Vec(-39.43, -64.52)),
            RectangleHitbox.fromRect(73.6, 2.01, Vec(-2.31, -64.9)),
            RectangleHitbox.fromRect(2.01, 13.45, Vec(33.48, -57.67)),
            RectangleHitbox.fromRect(37.85, 2.01, Vec(52.35, -51.95)),
            RectangleHitbox.fromRect(2.01, 28.73, Vec(70.41, 13.14)),
            RectangleHitbox.fromRect(2.01, 28.69, Vec(70.41, -26.51)),
            RectangleHitbox.fromRect(14.3, 2.01, Vec(3.81, 38.61)),
            RectangleHitbox.fromRect(50.05, 2.01, Vec(46.41, 38.61)),
            RectangleHitbox.fromRect(53.45, 2.01, Vec(-50.2, 38.61)),
            RectangleHitbox.fromRect(2.01, 19.57, Vec(33.48, -5.57)),
            RectangleHitbox.fromRect(15.89, 2.01, Vec(40.43, 20.89)),
            RectangleHitbox.fromRect(15.89, 2.01, Vec(41.04, -14.35)),
            RectangleHitbox.fromRect(2.01, 35.57, Vec(47.99, 4.12)),
            RectangleHitbox.fromRect(2.01, 17.36, Vec(-75.92, 18.88)),
            RectangleHitbox.fromRect(1.56, 16.98, Vec(-25.94, 47.43)),
            RectangleHitbox.fromRect(26.29, 1.54, Vec(14.59, 56.99))
        ),
        spawnHitbox: RectangleHitbox.fromRect(178.2, 147.94, Vec(2.31, -0.89)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(144.55, 88.64, Vec(-2.65, -6.71)),
            RectangleHitbox.fromRect(71.21, 13.07, Vec(-3.05, -57.47)),
            RectangleHitbox.fromRect(56.83, 19.14, Vec(3.1, 46.75)),
            RectangleHitbox.fromRect(23.56, 5.38, Vec(-12.95, 56.4))
        ),
        puzzle: {
            triggerOnSolve: "tavern_bottle_table",
            delay: 2500,
            solvedSound: true,
            setSolvedImmediately: true
        },
        floors: [
            {
                type: FloorNames.Carpet,
                hitbox: RectangleHitbox.fromRect(33.81, 52.42, Vec(15.56, 11.37))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(14.51, 15.83, Vec(39.75, 12.01))
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(71.71, 31.77, Vec(-3.33, -48.01)),
                    RectangleHitbox.fromRect(73.77, 88.69, Vec(-37.99, -6.69)),
                    RectangleHitbox.fromRect(71.9, 18.2, Vec(33.5, -23.97)),
                    RectangleHitbox.fromRect(39.52, 88.65, Vec(50.29, -6.7)),
                    RectangleHitbox.fromRect(59.57, 21.55, Vec(1.81, 48.37)),
                    RectangleHitbox.fromRect(22.77, 7.23, Vec(-13.4, 62.29)),
                    RectangleHitbox.fromRect(7.52, 13.83, Vec(34.63, 46.49)),
                    RectangleHitbox.fromRect(1.78, 10.22, Vec(69.45, 32.54)),
                    RectangleHitbox.fromRect(2.93, 10.39, Vec(-74.74, 32.76))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.68, 11.78, Vec(72.86, -46.11)),
                    RectangleHitbox.fromRect(37.64, 12.51, Vec(-57.91, -59.27)),
                    RectangleHitbox.fromRect(5, 11.72, Vec(-78.61, 32.56)),
                    RectangleHitbox.fromRect(10.86, 33.64, Vec(75.7, 22.55))
                )
            },
            { // stair floor, at layer -1
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(12.47, 17.59, Vec(40.76, -4.55)),
                layer: Layer.ToBasement
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(12.47, 17.59, Vec(40.76, -4.55)),
                layer: Layer.Basement
            }
        ],
        floorImages: [
            {
                key: "tavern_floor_1",
                position: Vec(-2.95, -59.45)
            },
            {
                key: "tavern_floor_3",
                position: Vec(1.85, 48.56)
            },
            {
                key: "tavern_floor_2",
                position: Vec(-2.825, -6.77)
            },
            {
                key: "tavern_stair",
                position: Vec(34.96, 46.45)
            },
            {
                key: "tavern_stair",
                position: Vec(-13.42, 62.47),
                rotation: Math.PI / 2,
                scale: Vec(1, 1.65)
            },
            {
                key: "chair_residue",
                position: Vec(35, 27.29),
                zIndex: ZIndexes.Decals,
                rotation: Math.PI / 2
            }
        ],
        ceilingImages: [
            {
                key: "tavern_ceiling_2",
                position: Vec(-2.65, -58.32),
                scale: Vec(2, 2)
            },
            {
                key: "tavern_ceiling_3",
                position: Vec(0.81, 48.29),
                scale: Vec(2, 2)
            },
            {
                key: "tavern_ceiling_1",
                position: Vec(-2.59, -6.6),
                scale: Vec(2, 2)
            }
        ],
        groundGraphics: [
            { // stroke
                color: 0x323232,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(37.54, 13.18, Vec(-57.94, -58.95)),
                    RectangleHitbox.fromRect(5.33, 11.73, Vec(-78.45, 32.55)),
                    RectangleHitbox.fromRect(5.67, 11.75, Vec(72.84, -46.07)),
                    RectangleHitbox.fromRect(10.83, 33.63, Vec(75.71, 22.56))
                )
            },
            { // fill
                color: 0x595959,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(36.39, 12.04, Vec(-57.94, -58.97)),
                    RectangleHitbox.fromRect(4.41, 5, Vec(-78.37, 29.76)),
                    RectangleHitbox.fromRect(4.43, 5.06, Vec(-78.38, 35.32)),
                    RectangleHitbox.fromRect(4.52, 5.02, Vec(72.84, -43.3)),
                    RectangleHitbox.fromRect(4.52, 5.04, Vec(72.84, -48.88)),
                    RectangleHitbox.fromRect(9.69, 32.51, Vec(75.72, 22.55))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "tavern_bar_collider", position: Vec(0, 0), rotation: 0 },
            { idString: "tavern_table_collider", position: Vec(0, 0), rotation: 0 },
            { idString: "tavern_basement_collider_hack", position: Vec(43.66, -53.7), rotation: 0, layer: Layer.ToBasement },
            { idString: "tavern_stair", position: Vec(40.82, -5), rotation: 0, layer: Layer.ToBasement },

            { idString: "tavern_wall_1", position: Vec(-18.725, -32.3), rotation: 0 },
            { idString: "tavern_wall_2", position: Vec(-39.42, -41.21), rotation: 0 },
            { idString: "tavern_wall_3", position: Vec(21.73, -32.33), rotation: 0 },
            { idString: "tavern_wall_4", position: Vec(33.52, -38.2), rotation: 0 },
            { idString: "tavern_wall_5", position: Vec(-52.66, -32.3), rotation: 0 },
            { idString: "tavern_wall_6", position: Vec(33.51, 34.79), rotation: 0 },

            { idString: "wine_barrel", position: Vec(48.66, -19.7), replaceableBy: "special_wine_barrel" },
            { idString: "wine_barrel", position: Vec(65.17, -32.77), replaceableBy: "special_wine_barrel" },
            { idString: "wine_barrel", position: Vec(9.73, -49.31), replaceableBy: "special_wine_barrel" },

            { idString: "bar_seat", position: Vec(-5.05, -3.84), rotation: 0 },
            { idString: "bar_seat", position: Vec(-5.13, 8.42), rotation: 0 },
            { idString: "bar_seat", position: Vec(-5.29, 20.66), rotation: 0 },

            { idString: "door", position: Vec(6.3, -32.28), rotation: 0 },
            { idString: "door", position: Vec(-39.39, -57.67), rotation: 3 },
            { idString: "door", position: Vec(33.48, -20.79), rotation: 1 },
            { idString: "door", position: Vec(70.47, -46.36), rotation: 1 },
            { idString: "door", position: Vec(70.4, 32.07), rotation: 1 },
            { idString: "door", position: Vec(-8.82, 38.81), rotation: 2 },
            { idString: "door", position: Vec(-18.01, 38.81), rotation: 0 },
            { idString: "door", position: Vec(-75.91, 32.12), rotation: 1 },
            { idString: "door", position: Vec(-69.41, -32.2), rotation: 0 },
            // { idString: "door", position: Vec(33.54, 27.29), rotation: 3 },

            { idString: "cabin_column", position: Vec(-25.95, 56.99) },
            { idString: "cabin_column", position: Vec(0.24, 57.02) },
            { idString: "cabin_column", position: Vec(28.97, 57.02) },
            { idString: "cabin_column", position: Vec(-30, -14) },
            { idString: "cabin_column", position: Vec(-30, 4.11) },
            { idString: "cabin_column", position: Vec(-30, 22.15) },

            { idString: "window", position: Vec(16.19, 38.63), rotation: 1 },
            { idString: "window", position: Vec(70.41, -6.61), rotation: 0 },
            { idString: "window", position: Vec(-75.87, 4.97), rotation: 0 },

            { idString: "trash_can", position: Vec(29.27, 1) },
            { idString: "trash_can", position: Vec(29.57, -28.33) },
            { idString: "trash_can", position: Vec(-71.51, -47.73) },

            { idString: "regular_crate", position: Vec(39.84, -45.41) },
            { idString: "regular_crate", position: Vec(54.01, -0.46) },

            { idString: "trash_bag", position: Vec(-61.65, -56.49), rotation: 0 },
            { idString: "trash_bag", position: Vec(-68.22, -59.19), rotation: 0 },

            { idString: "box", position: Vec(-30.22, 17.65) },
            { idString: "box", position: Vec(-29.09, 12.65) },
            { idString: "box", position: Vec(-71.87, -5.24) },
            { idString: "box", position: Vec(12.18, 7.56) },
            { idString: { box: 1, grenade_box: 0.4 }, position: Vec(11.17, 2.68) },
            { idString: "box", position: Vec(2.45, -51.47) },
            { idString: "box", position: Vec(-2.51, -48.89) },
            { idString: "box", position: Vec(47.72, -47.76) },
            { idString: "box", position: Vec(47.65, -42.66) },
            { idString: "box", position: Vec(74.37, 17.11) },
            { idString: "box", position: Vec(50.42, 35.01) },
            { idString: "box", position: Vec(12.88, 51.79) },
            { idString: "box", position: Vec(7.64, 53.39) },

            { idString: "chair", position: Vec(53.54, 16.43), rotation: 0 },
            { idString: "chair", position: Vec(56.39, 8.26), rotation: 1 },
            { idString: "chair", position: Vec(-41.9, -24), rotation: 1 },
            { idString: "chair", position: Vec(-54.36, -17.73), rotation: 0 },
            { idString: "chair", position: Vec(-46.56, -17.73), rotation: 0 },

            { idString: "bookshelf", position: Vec(19.57, -29.11), rotation: 0, lootSpawnOffset: Vec(0, 1) },
            { idString: "bookshelf", position: Vec(41.09, 34.93), rotation: 0, lootSpawnOffset: Vec(0, -1) },
            { idString: "bookshelf", position: Vec(-72.62, 19.94), rotation: 3, lootSpawnOffset: Vec(-1, 0) },

            { idString: "small_drawer", position: Vec(75.71, 10.98), rotation: 1 },
            { idString: "small_drawer", position: Vec(-70.66, -11.23), rotation: 1 },
            { idString: "large_drawer", position: Vec(65.44, -21.96), rotation: 3, lootSpawnOffset: Vec(-1, 0) },

            { idString: "large_table", position: Vec(-50.13, -24.34), rotation: 1, variation: 1 },
            { idString: "small_table", position: Vec(-51.07, 19.13), rotation: 1, variation: 1 },

            { idString: "potted_plant", position: Vec(28.29, -37.53), rotation: 0 },
            { idString: "potted_plant", position: Vec(-39.94, 33.93), rotation: 0 },

            { idString: "sink", position: Vec(-33.17, -37.27), rotation: 2 },
            { idString: "sink", position: Vec(-23.69, -37.27), rotation: 2 },
            { idString: "fridge", position: Vec(27.72, -59.93), rotation: 0 },
            { idString: randomStove, position: Vec(18.31, -59.93), rotation: 0 },
            { idString: randomToilet, position: Vec(-44.98, -37.81), rotation: 3 },
            { idString: "sink2", position: Vec(-44.48, -46.31), rotation: 3 },
            { idString: "fireplace", position: Vec(-51.19, 33.42), rotation: 2 },
            { idString: "couch", position: Vec(-50.82, 5.93), rotation: 3 },
            { idString: "gun_mount_ak47", position: Vec(-14.35, -29.45), rotation: 0 },
            { idString: "tavern_bottle_table", position: Vec(29.95, 11.85), rotation: 1 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "tavern_secret_ceiling", position: Vec(39.85, 3.2) },
            { idString: "tavern_basement", position: Vec(43.66, -53.7), layer: Layer.Basement },
            { idString: "tavern_recording_puzzle", position: Vec(0, 0) }
        ],
        lootSpawners: IS_CLIENT ? undefined : [{ table: "ground_loot", position: Vec(-14.99, 48.38) }]
    },
    {
        idString: "tavern_secret_ceiling",
        name: "Tavern Secret Ceiling",
        defType: DefinitionType.Building,
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingHiddenAlpha: 0.45,
        spawnHitbox: RectangleHitbox.fromRect(19.39, 40.15, Vec(0.24, -0.09)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(12.5, 24.01, Vec(0.97, -4.62)),
            RectangleHitbox.fromRect(14.45, 15.77, Vec(0, 8.73))
        ),
        ceilingImages: [{
            key: "tavern_secret_ceiling",
            position: Vec(0, 0),
            scale: Vec(4.05, 4.05)
        }]
    },
    {
        idString: "tavern_basement",
        name: "Tavern Basement",
        defType: DefinitionType.Building,
        material: "metal_heavy",
        particle: "bunker_particle",
        reflectBullets: true,
        collideWithLayers: Layers.Equal,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.06, 19.23, Vec(4.33, 49.24)),
            RectangleHitbox.fromRect(2.06, 19.23, Vec(-10.2, 49.25)),
            RectangleHitbox.fromRect(91.13, 2.01, Vec(-0.13, 58.77)),
            RectangleHitbox.fromRect(2, 83.14, Vec(45.35, 18.21)),
            RectangleHitbox.fromRect(25.08, 38.7, Vec(33.84, -40.55)),
            RectangleHitbox.fromRect(23.86, 38.53, Vec(-34.44, -40.5)),
            RectangleHitbox.fromRect(2, 82.57, Vec(-45.35, 18.49)),
            RectangleHitbox.fromRect(11.1, 2.02, Vec(15.77, -22.23)),
            RectangleHitbox.fromRect(11.1, 2.02, Vec(-17.01, -22.23)),
            RectangleHitbox.fromRect(44.87, 2.02, Vec(-0.29, -58.78))
        ),
        spawnHitbox: RectangleHitbox.fromRect(106.29, 130.73, Vec(-0.95, 0.37)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(88.75, 79.01, Vec(0.01, 18.28)),
            RectangleHitbox.fromRect(43.87, 38.85, Vec(-0.6, -38.38))
        ),
        puzzle: {
            triggerOnSolve: "bulletproof_automatic_glass_door",
            delay: 500
        },
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(39.12, 79.07, Vec(24.86, 18.26)),
                    RectangleHitbox.fromRect(33.3, 79.19, Vec(-27.72, 18.2)),
                    RectangleHitbox.fromRect(23.83, 63.4, Vec(-1.5, 8.49))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(43.87, 36.23, Vec(-0.6, -39.69))
            }
        ],
        floorImages: [
            {
                key: "tavern_basement_floor_1",
                position: Vec(-0.02, 18.33)
            },
            {
                key: "tavern_basement_floor_2",
                position: Vec(-0.7, -41),
                scale: Vec(2, 2)
            },
            {
                key: "regular_crate_residue",
                position: Vec(17.45, -53.97)
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "tavern_basement_table_colliders", position: Vec(0, 0), rotation: 0 },

            { idString: "bulletproof_automatic_glass_door", position: Vec(-6.03, -22.36), rotation: 0 },
            { idString: "bulletproof_automatic_glass_door", position: Vec(4.76, -22.36), rotation: 2 },

            { idString: "tavern_wall_7", position: Vec(-37.7, -2.09), rotation: 0 },
            { idString: "tavern_wall_7", position: Vec(-37.7, 22.32), rotation: 0 },
            { idString: "tavern_wall_8", position: Vec(-32.81, 40.42), rotation: 0 },

            { idString: "wine_barrel", position: Vec(39.05, -4.78) },
            { idString: "wine_barrel", position: Vec(39.14, 25.79) },
            { idString: "wine_barrel", position: Vec(39.21, 34.81) },
            { idString: "wine_barrel", position: Vec(13.04, 20.53) },
            { idString: "wine_barrel", position: Vec(5.3, 23.01) },
            { idString: "wine_barrel", position: Vec(-33.42, 34.95) },
            { idString: "wine_barrel", position: Vec(-39.11, 27.66) },
            { idString: "wine_barrel", position: Vec(-31.77, 3.85) },

            { idString: "box", position: Vec(-1.07, 2.01) },
            { idString: "box", position: Vec(-40.76, 35.3) }, // huh
            { idString: "box", position: Vec(30.72, 53.61) },
            { idString: "box", position: Vec(39.97, 15.15) },
            { idString: "box", position: Vec(16.04, -26.31) },
            { idString: "box", position: Vec(17.43, -31.63) },

            { idString: "tavern_column", position: Vec(-29.66, 22.3) },
            { idString: "tavern_column", position: Vec(-29.66, -2.12) },

            { idString: "small_drawer", position: Vec(-39.49, 45.81), rotation: 1 },
            { idString: "small_drawer", position: Vec(-40.16, 4.08), rotation: 0 },

            { idString: "chair", position: Vec(18.63, 51.74), rotation: 1 },
            { idString: "chair", position: Vec(12.36, 46.92), rotation: 2 },

            { idString: "trash_can", position: Vec(-19.29, -54.61) },
            { idString: "trash_can", position: Vec(-14.11, 54.64) },

            { idString: "lamp", position: Vec(19.84, -41.61), rotation: 1, variation: 2 },
            { idString: "lamp", position: Vec(-21.15, -41.46), rotation: 3, variation: 2 },

            { idString: "small_table", position: Vec(12.36, 51.59), rotation: 1, variation: 2 },
            { idString: "large_drawer", position: Vec(-39.7, -12.17), rotation: 1 },
            { idString: "small_bed", position: Vec(-35.84, 53.63), rotation: 1 },
            { idString: "nsd_crate", position: Vec(38.03, 6.64) },
            { idString: "regular_crate", position: Vec(38.55, 51.38) },
            { idString: "regular_crate", position: Vec(-17.5, -28.18) },
            { idString: "button", position: Vec(-14.73, -20.5), rotation: 0, variation: 0, puzzlePiece: true },
            { idString: "potted_plant", position: Vec(19.68, -17.44), rotation: 0 },
            { idString: "door", position: Vec(-16.75, 40.32), rotation: 2 },
            { idString: "rare_wine_case", position: Vec(-0.73, -41.54), rotation: 0 },
            {
                idString: {
                    gun_mount_rpk16: 0.3,
                    gun_mount_an94: 0.2,
                    gun_mount_stoner_63: 0.5
                },
                position: Vec(-0.73, -56.17),
                lootSpawnOffset: Vec(0, 5),
                rotation: 0
            }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: "tavern_basement_vault_ceiling",
            position: Vec(-0.55, -40.6)
        }]
    },
    {
        idString: "tavern_basement_vault_ceiling",
        name: "Tavern Basement Vault Ceiling",
        defType: DefinitionType.Building,
        ceilingHiddenAlpha: 0.5,
        spawnHitbox: RectangleHitbox.fromRect(50.85, 43.97),
        ceilingHitbox: RectangleHitbox.fromRect(43.81, 34.55),
        ceilingImages: [{
            key: "tavern_basement_vault_ceiling",
            position: Vec(0, 0),
            scale: Vec(4.05, 4.075)
        }]
    },
    {
        idString: "docks",
        name: "Docks",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(87.43, 70.21, Vec(0.47, -0.4)),
        spawnMode: MapObjectSpawnMode.Beach,
        material: "metal_heavy",
        particle: "metal_particle",
        reflectBullets: true,
        spawnOrientation: 3,
        spawnOffset: { min: Vec(35, 0), max: Vec(45, 0) },
        allowFlyover: FlyoverPref.Always,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.35, 17.14, Vec(38.34, 18.02)),
            RectangleHitbox.fromRect(1.35, 17.14, Vec(-38.27, 17.65)),
            RectangleHitbox.fromRect(18, 1.33, Vec(28.71, 26.89)),
            RectangleHitbox.fromRect(18, 1.33, Vec(-28.66, 26.61)),
            RectangleHitbox.fromRect(3.82, 2.39, Vec(-5.93, 9.64)),
            RectangleHitbox.fromRect(3.82, 2.39, Vec(-22.81, 9.64)),
            new CircleHitbox(1.28, Vec(38.32, 26.8)),
            new CircleHitbox(1.28, Vec(-38.32, 8.83)),
            new CircleHitbox(1.28, Vec(-38.28, 26.62)),
            new CircleHitbox(1.28, Vec(-18.78, 26.62)),
            new CircleHitbox(1.28, Vec(-5.93, 8.77)),
            new CircleHitbox(1.28, Vec(18.91, 26.89)),
            new CircleHitbox(1.28, Vec(38.31, 8.95)),
            new CircleHitbox(1.28, Vec(21.87, 10.12)),
            new CircleHitbox(1.28, Vec(-22.8, 8.76)),
            new CircleHitbox(1.28, Vec(7.37, -29.2)),
            new CircleHitbox(1.28, Vec(7.38, 10.11)),
            new CircleHitbox(1.28, Vec(7.36, -9.32)),
            new CircleHitbox(1.28, Vec(21.88, -9.25)),
            new CircleHitbox(1.28, Vec(21.88, -29.19))
        ),
        floors: [{
            type: FloorNames.Wood,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(14.81, 53.52, Vec(14.67, -2.73)),
                RectangleHitbox.fromRect(77.29, 20.14, Vec(-0.06, 16.98)),
                RectangleHitbox.fromRect(37.93, 5.13, Vec(0.17, 27.93))
            )
        }],
        groundGraphics: [
            { // stroke
                color: 0x423a30,
                hitbox: RectangleHitbox.fromRect(37.92, 3.8, Vec(0.15, 28.58))
            },
            // filling
            { // 1
                color: 0x5b4f43,
                hitbox: RectangleHitbox.fromRect(37.2, 1.36, Vec(0.17, 27.73))
            },
            { // 2
                color: 0x5b4c42,
                hitbox: RectangleHitbox.fromRect(37.2, 1.36, Vec(0.17, 29.45))
            }
        ],
        floorImages: [
            {
                key: "docks_floor_1",
                position: Vec(0.04, 17.55)
            },
            {
                key: "docks_floor_2",
                position: Vec(14.71, -9.2)
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "trash_can", position: Vec(27.53, 22.36), outdoors: true },
            { idString: "box", position: Vec(-23.82, 22.38), outdoors: true },
            { idString: { box: 1, grenade_box: 0.35 }, position: Vec(33.26, 23.11), outdoors: true },
            { idString: "box", position: Vec(34.57, 17.93), outdoors: true },
            { idString: "nsd_crate", position: Vec(14.67, -22.46), outdoors: true },
            { idString: "regular_crate", position: Vec(-31.57, 19.99), outdoors: true }
        ],
        lootSpawners: IS_CLIENT ? undefined : [{ table: "ground_loot", position: Vec(0.05, 18.36) }]
    },
    {
        idString: "shooting_range",
        name: "Shooting Range",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(214.75, 183.47, Vec(0.55, 1.27)),
        groundGraphics: [
            {
                color: 0x365440,
                hitbox: RectangleHitbox.fromRect(194.67, 159.24, Vec(0.23, 1.21))
            },
            {
                color: 0x2b4232,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(42.8, 2.05, Vec(-70.84, 63.28)),
                    RectangleHitbox.fromRect(42.8, 2.05, Vec(-71.04, 12.38)),
                    RectangleHitbox.fromRect(42.8, 2.05, Vec(-70.92, 37.8))
                )
            },
            // sand
            {
                color: 0x5a4731,
                hitbox: new PolygonHitbox([
                    Vec(-3.4, 7.29),
                    Vec(-2.44, 7.15),
                    Vec(-1.44, 7.26),
                    Vec(-0.49, 7.41),
                    Vec(0.54, 7.66),
                    Vec(1.28, 7.82),
                    Vec(2.21, 7.73),
                    Vec(9.17, 6.97),
                    Vec(12.69, 8.75),
                    Vec(14.17, 9.76),
                    Vec(14.98, 11.11),
                    Vec(16.14, 13.72),
                    Vec(16.89, 14.99),
                    Vec(17.68, 15.82),
                    Vec(18.4, 16.03),
                    Vec(18.65, 16.56),
                    Vec(18.31, 17.01),
                    Vec(17.52, 17.37),
                    Vec(16.36, 17.59),
                    Vec(6.83, 18.09),
                    Vec(2.66, 18.17),
                    Vec(-0.12, 18.54),
                    Vec(-1.01, 18.9),
                    Vec(-1.49, 20.41),
                    Vec(-1.3, 22.4),
                    Vec(-2, 24.43),
                    Vec(-4.33, 25.75),
                    Vec(-6.27, 26.42),
                    Vec(-8, 26.66),
                    Vec(-9.28, 26.5),
                    Vec(-10.02, 25.6),
                    Vec(-10.6, 23.87),
                    Vec(-10.88, 21.86),
                    Vec(-11.2, 20.26),
                    Vec(-11.87, 18.52),
                    Vec(-12.42, 16.34),
                    Vec(-12.48, 14.68),
                    Vec(-12.44, 13.27),
                    Vec(-12.08, 11.84),
                    Vec(-11.45, 10.63),
                    Vec(-10.5, 9.73),
                    Vec(-9.3, 9.12)
                ])
            },
            {
                color: 0x5a4731,
                hitbox: new PolygonHitbox([
                    Vec(61.62, 11.29),
                    Vec(63.04, 10.16),
                    Vec(64.78, 9.78),
                    Vec(67.21, 9.59),
                    Vec(71.9, 9.14),
                    Vec(73.88, 9.2),
                    Vec(74.81, 9.18),
                    Vec(76.32, 8.93),
                    Vec(78.52, 8.52),
                    Vec(80.68, 8.24),
                    Vec(82.38, 8.07),
                    Vec(83.26, 8.1),
                    Vec(84.59, 8.7),
                    Vec(87.28, 10.57),
                    Vec(87.75, 11.27),
                    Vec(88, 12),
                    Vec(89.62, 13.67),
                    Vec(88.05, 14.78),
                    Vec(84.59, 15.67),
                    Vec(81.15, 16.03),
                    Vec(79.61, 16.53),
                    Vec(78.52, 16.73),
                    Vec(77.6, 16.56),
                    Vec(76.4, 16),
                    Vec(75.71, 15.48),
                    Vec(74.92, 15.03),
                    Vec(74.26, 15.58),
                    Vec(73.59, 16.19),
                    Vec(72.61, 16.6),
                    Vec(71.47, 16.5),
                    Vec(70.51, 16.22),
                    Vec(70.13, 15.56),
                    Vec(68.79, 15),
                    Vec(61.31, 13.75),
                    Vec(60.39, 13.51),
                    Vec(60.79, 12.57)
                ])
            },
            {
                color: 0x5a4731,
                hitbox: new PolygonHitbox([
                    Vec(-36.53, -9.87),
                    Vec(-34.47, -12.77),
                    Vec(-33.44, -14.74),
                    Vec(-28.14, -25.33),
                    Vec(-28.01, -27.19),
                    Vec(-28.22, -29.6),
                    Vec(-29.24, -38.47),
                    Vec(-29.68, -39.14),
                    Vec(-31.09, -40.57),
                    Vec(-34.55, -43.18),
                    Vec(-35.38, -42.31),
                    Vec(-40.69, -27.73),
                    Vec(-41.82, -27.2),
                    Vec(-42.27, -26.42),
                    Vec(-42.26, -25.24),
                    Vec(-41.81, -24.26),
                    Vec(-41.12, -23.53),
                    Vec(-40.78, -23.05),
                    Vec(-41.16, -21.93),
                    Vec(-41.92, -20.41),
                    Vec(-42.26, -19.58),
                    Vec(-42.26, -18.79),
                    Vec(-41.81, -17.45),
                    Vec(-41.47, -16.47),
                    Vec(-40.44, -9.74),
                    Vec(-39.95, -8.62),
                    Vec(-39.53, -8.24),
                    Vec(-38.61, -8.62),
                    Vec(-38, -9.39),
                    Vec(-37.43, -9.59)
                ])
            },
            { // stroke
                color: 0x3d3d3d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.88, 24.6, Vec(-37.98, -7.57)),
                    RectangleHitbox.fromRect(5.88, 24.6, Vec(-38.01, -39.59)),
                    RectangleHitbox.fromRect(24.63, 6.23, Vec(43.96, -14.88)),
                    RectangleHitbox.fromRect(4.39, 11.66, Vec(98.31, -46.04))
                )
            },
            { // fill
                color: 0x5e5e5e,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.74, 11.25, Vec(-38.15, -1.60)),
                    RectangleHitbox.fromRect(4.74, 11.25, Vec(-38.17, -45.57)),
                    RectangleHitbox.fromRect(4.74, 11.25, Vec(-38.17, -33.66)),
                    RectangleHitbox.fromRect(4.74, 11.25, Vec(-38.17, -13.53)),
                    RectangleHitbox.fromRect(11.21, 5.03, Vec(49.94, -15.01)),
                    RectangleHitbox.fromRect(11.21, 5.03, Vec(38.01, -15.04)),
                    RectangleHitbox.fromRect(3.34, 4.98, Vec(98.29, -43.28)),
                    RectangleHitbox.fromRect(3.34, 4.98, Vec(98.28, -48.79))
                )
            }
        ],
        floors: [
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(-3.4, 7.29),
                    Vec(-2.44, 7.15),
                    Vec(-1.44, 7.26),
                    Vec(-0.49, 7.41),
                    Vec(0.54, 7.66),
                    Vec(1.28, 7.82),
                    Vec(2.21, 7.73),
                    Vec(9.17, 6.97),
                    Vec(12.69, 8.75),
                    Vec(14.17, 9.76),
                    Vec(14.98, 11.11),
                    Vec(16.14, 13.72),
                    Vec(16.89, 14.99),
                    Vec(17.68, 15.82),
                    Vec(18.4, 16.03),
                    Vec(18.65, 16.56),
                    Vec(18.31, 17.01),
                    Vec(17.52, 17.37),
                    Vec(16.36, 17.59),
                    Vec(6.83, 18.09),
                    Vec(2.66, 18.17),
                    Vec(-0.12, 18.54),
                    Vec(-1.01, 18.9),
                    Vec(-1.49, 20.41),
                    Vec(-1.3, 22.4),
                    Vec(-2, 24.43),
                    Vec(-4.33, 25.75),
                    Vec(-6.27, 26.42),
                    Vec(-8, 26.66),
                    Vec(-9.28, 26.5),
                    Vec(-10.02, 25.6),
                    Vec(-10.6, 23.87),
                    Vec(-10.88, 21.86),
                    Vec(-11.2, 20.26),
                    Vec(-11.87, 18.52),
                    Vec(-12.42, 16.34),
                    Vec(-12.48, 14.68),
                    Vec(-12.44, 13.27),
                    Vec(-12.08, 11.84),
                    Vec(-11.45, 10.63),
                    Vec(-10.5, 9.73),
                    Vec(-9.3, 9.12)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(61.62, 11.29),
                    Vec(63.04, 10.16),
                    Vec(64.78, 9.78),
                    Vec(67.21, 9.59),
                    Vec(71.9, 9.14),
                    Vec(73.88, 9.2),
                    Vec(74.81, 9.18),
                    Vec(76.32, 8.93),
                    Vec(78.52, 8.52),
                    Vec(80.68, 8.24),
                    Vec(82.38, 8.07),
                    Vec(83.26, 8.1),
                    Vec(84.59, 8.7),
                    Vec(87.28, 10.57),
                    Vec(87.75, 11.27),
                    Vec(88, 12),
                    Vec(89.62, 13.67),
                    Vec(88.05, 14.78),
                    Vec(84.59, 15.67),
                    Vec(81.15, 16.03),
                    Vec(79.61, 16.53),
                    Vec(78.52, 16.73),
                    Vec(77.6, 16.56),
                    Vec(76.4, 16),
                    Vec(75.71, 15.48),
                    Vec(74.92, 15.03),
                    Vec(74.26, 15.58),
                    Vec(73.59, 16.19),
                    Vec(72.61, 16.6),
                    Vec(71.47, 16.5),
                    Vec(70.51, 16.22),
                    Vec(70.13, 15.56),
                    Vec(68.79, 15),
                    Vec(61.31, 13.75),
                    Vec(60.39, 13.51),
                    Vec(60.79, 12.57)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(61.62, 11.29),
                    Vec(63.04, 10.16),
                    Vec(64.78, 9.78),
                    Vec(67.21, 9.59),
                    Vec(71.9, 9.14),
                    Vec(73.88, 9.2),
                    Vec(74.81, 9.18),
                    Vec(76.32, 8.93),
                    Vec(78.52, 8.52),
                    Vec(80.68, 8.24),
                    Vec(82.38, 8.07),
                    Vec(83.26, 8.1),
                    Vec(84.59, 8.7),
                    Vec(87.28, 10.57),
                    Vec(87.75, 11.27),
                    Vec(88, 12),
                    Vec(89.62, 13.67),
                    Vec(88.05, 14.78),
                    Vec(84.59, 15.67),
                    Vec(81.15, 16.03),
                    Vec(79.61, 16.53),
                    Vec(78.52, 16.73),
                    Vec(77.6, 16.56),
                    Vec(76.4, 16),
                    Vec(75.71, 15.48),
                    Vec(74.92, 15.03),
                    Vec(74.26, 15.58),
                    Vec(73.59, 16.19),
                    Vec(72.61, 16.6),
                    Vec(71.47, 16.5),
                    Vec(70.51, 16.22),
                    Vec(70.13, 15.56),
                    Vec(68.79, 15),
                    Vec(61.31, 13.75),
                    Vec(60.39, 13.51),
                    Vec(60.79, 12.57)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(-36.53, -9.87),
                    Vec(-34.47, -12.77),
                    Vec(-33.44, -14.74),
                    Vec(-28.14, -25.33),
                    Vec(-28.01, -27.19),
                    Vec(-28.22, -29.6),
                    Vec(-29.24, -38.47),
                    Vec(-29.68, -39.14),
                    Vec(-31.09, -40.57),
                    Vec(-34.55, -43.18),
                    Vec(-35.38, -42.31),
                    Vec(-40.69, -27.73),
                    Vec(-41.82, -27.2),
                    Vec(-42.27, -26.42),
                    Vec(-42.26, -25.24),
                    Vec(-41.81, -24.26),
                    Vec(-41.12, -23.53),
                    Vec(-40.78, -23.05),
                    Vec(-41.16, -21.93),
                    Vec(-41.92, -20.41),
                    Vec(-42.26, -19.58),
                    Vec(-42.26, -18.79),
                    Vec(-41.81, -17.45),
                    Vec(-41.47, -16.47),
                    Vec(-40.44, -9.74),
                    Vec(-39.95, -8.62),
                    Vec(-39.53, -8.24),
                    Vec(-38.61, -8.62),
                    Vec(-38, -9.39),
                    Vec(-37.43, -9.59)
                ])
            }
        ],
        floorImages: [
            {
                key: "mud_decal_3",
                position: Vec(-19.69, -65.34),
                zIndex: ZIndexes.Decals,
                alpha: 0.25,
                rotation: Math.PI
            },
            {
                key: "mud_decal_2",
                position: Vec(-0.9, -7.77),
                zIndex: ZIndexes.Decals,
                alpha: 0.25
            },
            {
                key: "mud_decal_1",
                position: Vec(-34.77, 49.64),
                zIndex: ZIndexes.Decals,
                alpha: 0.25
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "humvee", position: Vec(-70.59, 25.15), rotation: 0, outdoors: true },
            { idString: "humvee", position: Vec(6.04, -43.11), rotation: 3, outdoors: true },
            { idString: "nsd_crate", position: Vec(-22.25, -4.09), outdoors: true },
            { idString: "pallet", position: Vec(-22.25, -4.09), rotation: 0, outdoors: true },
            { idString: "regular_crate", position: Vec(-77.85, 45.14), outdoors: true },
            { idString: "pallet", position: Vec(-74.84, 72.48), rotation: 0, outdoors: true },
            { idString: "super_barrel", position: Vec(-74.84, 72.48), outdoors: true },
            { idString: "ammo_crate", position: Vec(-63.33, 72.56), outdoors: true },
            { idString: "forklift", position: Vec(-22.3, 7.44), rotation: 2, outdoors: true },
            { idString: "grenade_crate", position: Vec(-84.53, 72.04), outdoors: true },
            { idString: "barrel", position: Vec(-9.31, -43.42) },
            { idString: "box", position: Vec(-9.38, -36.83), outdoors: true },
            { idString: "box", position: Vec(92.01, 9.94), outdoors: true },
            { idString: "sandbags", position: Vec(41.6, 7.96), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(72.33, -14.7), rotation: 1, outdoors: true },
            { idString: "regular_crate", position: Vec(53.82, 6.92), outdoors: true },
            { idString: "grenade_crate", position: Vec(79.34, -15.03), outdoors: true },
            { idString: "lansirama_log", position: Vec(81.81, -23.05), rotation: 0, outdoors: true },

            // fence system
            { idString: "fence", position: Vec(-12.65, 80), rotation: 0, outdoors: true },
            { idString: "fence", position: Vec(96.27, 8.86), rotation: 1, outdoors: true },
            { idString: "fence", position: Vec(96.35, -23.8), rotation: 1, outdoors: true },
            { idString: "fence", position: Vec(15, -77.62), rotation: 0, outdoors: true },
            { idString: "fence", position: Vec(6.4, -77.62), rotation: 0, outdoors: true },
            { idString: "fence", position: Vec(-35.33, -77.33), rotation: 0, outdoors: true },

            ...Array.from(
                { length: 8 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-96.19, 14.2 + 8.6 * i),
                    rotation: 1,
                    outdoors: true
                })
            ),

            ...Array.from(
                { length: 5 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-90.22 + 8.6 * i, 80),
                    rotation: 0,
                    outdoors: true
                })
            ),

            { idString: "metal_column", position: Vec(-96.16, 80) },
            { idString: "metal_column", position: Vec(-50.22, 80) },
            { idString: "metal_column", position: Vec(-18.65, 80) },
            { idString: "metal_column", position: Vec(96.24, 2.94) },
            { idString: "metal_column", position: Vec(96.31, -17.96) },
            { idString: "metal_column", position: Vec(0.58, -77.58) },
            { idString: "metal_column", position: Vec(-29.5, -77.29) }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: randomPallet, position: Vec(-67.63, 45.4) },
            { idString: "shooting_range_garage", position: Vec(-65.8, -33.92) },
            { idString: "shooting_range_practice", position: Vec(42.12, 45.81) },
            { idString: "shooting_range_office", position: Vec(59.93, -46.62) }
        ],
        lootSpawners: IS_CLIENT ? undefined : [
            { table: "ground_loot", position: Vec(-35.78, 49.5) },
            { table: "ground_loot", position: Vec(-20.5, -62.69) },
            { table: "ground_loot", position: Vec(-52.41, -23.68) }
        ]
    },
    {
        idString: "shooting_range_garage",
        name: "Shooting Range Garage",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(80, 97.82, Vec(-1, 0.08)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(54.3, 83.98, Vec(-2.94, -0.24)),
            RectangleHitbox.fromRect(9.74, 66, Vec(28.31, 10.19))
        ),
        material: "stone",
        particle: "abandoned_warehouse_1_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(56.96, 2.02, Vec(-2.91, -43.22)),
            RectangleHitbox.fromRect(2.03, 28.06, Vec(24.98, -30.19)),
            RectangleHitbox.fromRect(2.08, 10.41, Vec(24.97, 10.72)),
            RectangleHitbox.fromRect(3.06, 3.02, Vec(24.96, 42.71)),
            RectangleHitbox.fromRect(3.06, 3, Vec(24.98, 10.7)),
            RectangleHitbox.fromRect(3.06, 3, Vec(24.96, -21.32)),
            RectangleHitbox.fromRect(2.07, 3.7, Vec(24.99, 39.4)),
            RectangleHitbox.fromRect(2.07, 63.74, Vec(-30.37, -0.22)),
            RectangleHitbox.fromRect(55.03, 2.04, Vec(-3.86, 42.73))
        ),
        floorImages: [{
            key: "shooting_range_garage_floor",
            position: Vec(-2.29, 0)
        }],
        ceilingImages: [
            {
                key: "shooting_range_garage_ceiling_2",
                position: Vec(29.26, 10.18),
                scale: Vec(2, 2)
            },
            {
                key: "shooting_range_garage_ceiling_1",
                position: Vec(-2.57, -0.2),
                scale: Vec(2, 2)
            }
        ],
        graphics: [
            { // stroke
                color: 0x3d3d3d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.72, 11.65, Vec(-32.45, 36.68)),
                    RectangleHitbox.fromRect(4.72, 11.65, Vec(-32.3, -37.16)),
                    RectangleHitbox.fromRect(5.88, 24.6, Vec(27.82, 26.35)),
                    RectangleHitbox.fromRect(5.88, 24.6, Vec(27.79, -5.67))
                )
            },
            { // fill
                color: 0x5e5e5e,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.74, 11.25, Vec(27.65, 32.32)),
                    RectangleHitbox.fromRect(4.74, 11.25, Vec(27.63, -11.65)),
                    RectangleHitbox.fromRect(4.74, 11.25, Vec(27.63, 0.26)),
                    RectangleHitbox.fromRect(4.74, 11.25, Vec(27.63, 20.39)),
                    RectangleHitbox.fromRect(3.36, 5, Vec(-32.57, 39.43)),
                    RectangleHitbox.fromRect(3.36, 5, Vec(-32.41, -39.91)),
                    RectangleHitbox.fromRect(3.36, 5, Vec(-32.4, -34.39)),
                    RectangleHitbox.fromRect(3.36, 5, Vec(-32.57, 33.92))
                )
            }
        ],
        graphicsZIndex: ZIndexes.BuildingsFloor - 0.1,
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.72, 11.65, Vec(-32.45, 36.68)),
                    RectangleHitbox.fromRect(4.72, 11.65, Vec(-32.3, -37.16)),
                    RectangleHitbox.fromRect(5.88, 24.6, Vec(27.82, 26.35)),
                    RectangleHitbox.fromRect(5.88, 24.6, Vec(27.79, -5.67)),
                    RectangleHitbox.fromRect(21.31, 85.23, Vec(-20.77, -0.49)),
                    RectangleHitbox.fromRect(37.05, 64.35, Vec(5.93, 9.92)),
                    RectangleHitbox.fromRect(35.05, 1.32, Vec(6.5, -41.72)),
                    RectangleHitbox.fromRect(1.03, 20.32, Vec(23.52, -32.05))
                )
            },
            {
                type: FloorNames.Sand,
                hitbox: RectangleHitbox.fromRect(33.36, 19.11, Vec(6.52, -31.75))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "sandbags", position: Vec(-0.9, -35.36), rotation: 1 },
            { idString: "smaller_sandbags", position: Vec(-7.85, -35.51), rotation: 1 },
            { idString: "smaller_sandbags", position: Vec(-1.15, -25.58), rotation: 0 },
            { idString: "forklift", position: Vec(-0.21, 4.19), rotation: 0 },
            { idString: "gun_case", position: Vec(7.51, 38.49), rotation: 2 },
            { idString: "gun_case", position: Vec(-18.45, -10.74), rotation: 1 },
            { idString: "box", position: Vec(-18.27, -2.34) },
            { idString: "box", position: Vec(-19.14, 2.77) },
            { idString: { box: 1, grenade_box: 0.35 }, position: Vec(15.64, 38.77) },
            { idString: "trash_can", position: Vec(-8.19, 38.61) },
            { idString: "toolbox", position: Vec(-24.9, 17.4), rotation: 1 },
            { idString: "research_desk", position: Vec(-25.39, -4.69), rotation: 3 },
            { idString: "garage_door", position: Vec(25.33, -5.25), rotation: 1 },
            { idString: "garage_door", position: Vec(25.34, 26.74), rotation: 1 },
            { idString: "small_lansirama_log", position: Vec(12.59, -21.3), rotation: 0 },
            { idString: "small_lansirama_log", position: Vec(-1.4, 33.83), rotation: 1 },
            { idString: "door", position: Vec(-30.28, -37.57), rotation: 1 },
            { idString: "door", position: Vec(-30.28, 36.16), rotation: 1 },
            { idString: "cobweb", position: Vec(19.21, -37.46), rotation: 3 },
            { idString: "abandoned_bunker_entrance", position: Vec(12.21, -32.42), rotation: 3 }
        ]
    },
    {
        idString: "shooting_range_practice",
        name: "Shooting Range Practice",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "abandoned_warehouse_1_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.01, 17.18, Vec(-49.49, 26.45)),
            RectangleHitbox.fromRect(2.01, 17.18, Vec(-49.45, -23.7)),
            RectangleHitbox.fromRect(70.27, 2.03, Vec(19.36, -31.47)),
            RectangleHitbox.fromRect(25.74, 2.03, Vec(-37.59, -31.46)),
            RectangleHitbox.fromRect(2.01, 37.05, Vec(54.15, 16.09)),
            RectangleHitbox.fromRect(2.01, 21.17, Vec(54.15, -21.9)),
            RectangleHitbox.fromRect(56.66, 2.01, Vec(-22.17, 34.22)),
            RectangleHitbox.fromRect(40.11, 2.06, Vec(35.1, 34.2))
        ),
        spawnHitbox: RectangleHitbox.fromRect(118.88, 77.79, Vec(0.87, 1.34)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(101.64, 63.75, Vec(2.33, 1.32)),
            RectangleHitbox.fromRect(1.72, 33.01, Vec(-49.28, 1.39))
        ),
        floors: [
            {
                type: FloorNames.Sand,
                hitbox: RectangleHitbox.fromRect(34.17, 16.91, Vec(35.27, -21.44))
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(73.07, 34.33, Vec(16.67, 16.03)),
                    RectangleHitbox.fromRect(8.98, 2.64, Vec(10.63, 33.9))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(29.02, 63.93, Vec(-33.98, 1.36)),
                    RectangleHitbox.fromRect(73.31, 30.11, Vec(16.56, -15.53)),
                    RectangleHitbox.fromRect(2.06, 9.01, Vec(54.12, -6.88)),
                    RectangleHitbox.fromRect(9.02, 1.95, Vec(-20.28, -31.52)),
                    RectangleHitbox.fromRect(1.92, 33.88, Vec(-49.34, 0.88))
                )
            }
        ],
        ceilingImages: [{
            key: "shooting_range_practice_ceiling",
            position: Vec(2.37, 1.3),
            scale: Vec(2, 2)
        }],
        floorImages: [
            {
                key: "shooting_range_practice_floor",
                position: Vec(2.37, 1.3)
            },
            {
                key: "barricade_line_shooting_range",
                position: Vec(-51.86, 1.26)
            },
            {
                key: "explosion_decal",
                position: Vec(-20.38, -31.31),
                zIndex: ZIndexes.Decals,
                scale: Vec(1.7, 1.7),
                alpha: 0.5
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "sandbags", position: Vec(42.54, -21.38), rotation: 1 },
            { idString: "sandbags", position: Vec(48.66, 12.02), rotation: 1 },
            { idString: "sandbags", position: Vec(48.66, 25.92), rotation: 1 },
            { idString: "sandbags", position: Vec(-34.02, 28.89), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(-22.57, 9.07), rotation: 1 },
            { idString: "smaller_sandbags", position: Vec(48.66, 1.77), rotation: 0 },
            { idString: "cobweb", position: Vec(-43.6, -25.64), rotation: 0 },
            { idString: "cobweb", position: Vec(48.36, 28.38), rotation: 2 },
            { idString: "box", position: Vec(-33.91, -27.14) },
            { idString: "box", position: Vec(-32.6, -21.96) },
            { idString: { box: 1, grenade_box: 0.3 }, position: Vec(9.64, -17.22) },
            { idString: "gun_case", position: Vec(-5.18, 29.85), rotation: 2 },
            { idString: "gun_case", position: Vec(-23.1, 27.59), rotation: 3 },
            { idString: "regular_crate", position: Vec(-42.3, -24.59) },
            { idString: "nsd_crate", position: Vec(7.1, -24.87) },
            { idString: "small_drawer", position: Vec(-44.61, 29.09), rotation: 2 },
            { idString: "barrel", position: Vec(18.87, 28.62) },
            { idString: "small_lansirama_log", position: Vec(15.92, -21.66), rotation: 3 },
            { idString: "abandoned_bunker_entrance", position: Vec(28.98, -21.75), rotation: 1 },
            { idString: "nsd_wall", position: Vec(54.19, -7.01), rotation: 1 },
            { idString: "nsd_wall", position: Vec(-20.25, -31.55), rotation: 2 },
            { idString: "nsd_wall", position: Vec(10.66, 34.11), rotation: 0 },
            { idString: "shooting_range_practice_log", position: Vec(-14.38, 16.46), rotation: 0 },
            { idString: "dummy", position: Vec(38.48, 7.64), rotation: 3 },
            { idString: "dummy", position: Vec(38.48, 17.04), rotation: 3 },
            { idString: "dummy", position: Vec(38.48, 26.15), rotation: 3 }
        ]
    },
    {
        idString: "shooting_range_office",
        name: "Shooting Range Office",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(89.01, 75.58, Vec(-0.32, 1.66)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(74.36, 46.33, Vec(-1.44, -6.92)),
            RectangleHitbox.fromRect(45.03, 12.55, Vec(-16.1, 21.92))
        ),
        material: "stone",
        particle: "abandoned_warehouse_1_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 61.68, Vec(-39.57, -1.16)),
            RectangleHitbox.fromRect(13.62, 2.06, Vec(0.92, 28.78)),
            RectangleHitbox.fromRect(14.57, 2.06, Vec(-33.3, 28.78)),
            RectangleHitbox.fromRect(2.03, 49.56, Vec(7.29, 5.03)),
            RectangleHitbox.fromRect(28.74, 1.95, Vec(22.46, 17.23)),
            RectangleHitbox.fromRect(2.11, 12.59, Vec(36.32, 11.91)),
            RectangleHitbox.fromRect(2.03, 26.7, Vec(36.35, -17.79)),
            RectangleHitbox.fromRect(39.06, 2.03, Vec(17.84, -31.01)),
            RectangleHitbox.fromRect(28.08, 2, Vec(-24.64, -31))
        ),
        groundGraphics: [
            { // stroke
                color: 0x3d3d3d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(24.63, 6.23, Vec(-15.97, 31.74)),
                    RectangleHitbox.fromRect(4.39, 11.66, Vec(38.38, 0.58))
                )
            },
            { // fill
                color: 0x5e5e5e,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(11.21, 5.03, Vec(-9.99, 31.61)),
                    RectangleHitbox.fromRect(11.21, 5.03, Vec(-21.92, 31.58)),
                    RectangleHitbox.fromRect(3.34, 4.98, Vec(38.36, 3.34)),
                    RectangleHitbox.fromRect(3.34, 4.98, Vec(38.35, -2.17))
                )
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(45.73, 59.38, Vec(-15.82, -0.33))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(29.93, 46.41, Vec(21.46, -6.81))
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(24.63, 6.23, Vec(-15.97, 31.74)),
                    RectangleHitbox.fromRect(4.39, 11.66, Vec(38.38, 0.58))
                )
            }
        ],
        floorImages: [
            {
                key: "shooting_range_office_floor_2",
                position: Vec(22.49, -6.9)
            },
            {
                key: "shooting_range_office_floor_1",
                position: Vec(-16.03, -1.11)
            },
            {
                key: "explosion_decal",
                position: Vec(-6.17, -30.63),
                zIndex: ZIndexes.Decals,
                scale: Vec(1.7, 1.7),
                alpha: 0.5
            }
        ],
        ceilingImages: [
            {
                key: "shooting_range_office_ceiling_2",
                position: Vec(-16.1, 23.75),
                scale: Vec(2, 2)
            },
            {
                key: "shooting_range_office_ceiling_1",
                position: Vec(-1.66, -6.89),
                scale: Vec(2, 2)
            }
        ],
        puzzle: {
            triggerOnSolve: "blue_metal_auto_door",
            solvedSound: true,
            soundPosition: Vec(-19.16, -10.9),
            setSolvedImmediately: true,
            delay: 1000
        },
        obstacles: IS_CLIENT ? undefined : [
            { idString: "shooting_range_server_colliders", position: Vec(0, 0), rotation: 0 },
            { idString: "server_interactor", position: Vec(14.74, 9.81), rotation: 0, puzzlePiece: true },
            { idString: "blue_metal_auto_door", position: Vec(-19.15, -10.9), rotation: 3 },
            { idString: "small_desk", position: Vec(3.27, 8.44), rotation: 1 },
            { idString: "small_desk", position: Vec(3.27, 21.18), rotation: 1 },
            { idString: "desk_left", position: Vec(-28.63, 4.79), rotation: 0 },
            { idString: "small_drawer", position: Vec(-14.65, -26.07), rotation: 0 },
            { idString: "small_drawer", position: Vec(-34.66, 24.37), rotation: 1 },
            { idString: "grey_office_chair", position: Vec(-26.02, 11.13), rotation: 2 },
            { idString: "door", position: Vec(36.31, 1.11), rotation: 3 },
            { idString: "door", position: Vec(7.3, -24.55), rotation: 3 },
            { idString: "door", position: Vec(-20.5, 28.82), rotation: 0 },
            { idString: "door", position: Vec(-11.31, 28.74), rotation: 2 },
            { idString: "potted_plant", position: Vec(2.29, -7.62), rotation: 0 },
            { idString: "trash_can", position: Vec(23.62, -26.9) },
            { idString: "smaller_sandbags", position: Vec(11.45, -11.84), rotation: 1 },
            { idString: "box", position: Vec(11.08, -5.11) },
            { idString: "sawmill_warehouse_wall_8", position: Vec(-28.37, -2.57), rotation: 0 },
            { idString: "sawmill_warehouse_wall_9", position: Vec(2.34, -2.57), rotation: 0 },
            { idString: "sawmill_warehouse_column", position: Vec(-16.57, -2.57) },
            { idString: "sawmill_warehouse_column", position: Vec(-3.14, -2.57) },
            { idString: "nsd_wall", position: Vec(-6.16, -30.99), rotation: 2 },
            { idString: "cobweb", position: Vec(1.62, 23.08), rotation: 2 }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: "shooting_range_office_vault",
            position: Vec(-28.36, -16.8)
        }]
    },
    {
        idString: "shooting_range_office_vault",
        name: "Shooting Range Office Vault",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(22.75, 28.56, Vec(0.03, 0)),
        floorZIndex: ZIndexes.BuildingsFloor + 0.5,
        ceilingZIndex: ZIndexes.BuildingsCeiling - 0.5,
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(16.36, 22.6, Vec(-0.07, 0)),
            RectangleHitbox.fromRect(1.61, 10.7, Vec(8.76, 5.94))
        ),
        particle: "metal_particle",
        reflectBullets: true,
        material: "metal_heavy",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.01, 26.34, Vec(-9.22, -0.13)),
            RectangleHitbox.fromRect(20.44, 2, Vec(-0.01, 12.28)),
            RectangleHitbox.fromRect(17.56, 2, Vec(0.49, -12.3)),
            RectangleHitbox.fromRect(2.01, 13.89, Vec(9.09, -6.35))
        ),
        floorImages: [{
            key: "shooting_range_office_vault_floor",
            position: Vec(0, 0)
        }],
        ceilingImages: [{
            key: "shooting_range_office_vault_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        floors: [{
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(17.85, 22.75, Vec(0.68, -0.03))
        }],
        obstacles: IS_CLIENT ? undefined : [
            {
                idString: {
                    gun_mount_stoner_63: 0.25,
                    gun_mount_fn_fal: 0.25,
                    gun_mount_rpk74: 0.25,
                    gun_mount_mcx_spear: 0.25
                },
                position: Vec(-0.14, -9.45),
                rotation: 0
            },
            { idString: "box", position: Vec(-5.42, 8.6) }
        ]
    },
    {
        idString: "carport",
        name: "Carport",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(116.99, 112.22, Vec(-0.39, 0.4)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(91.03, 92.07, Vec(-6.29, -4.11)),
            RectangleHitbox.fromRect(32.45, 2.47, Vec(8.42, 42.56)),
            RectangleHitbox.fromRect(2.21, 32.45, Vec(40.03, -26.67))
        ),
        material: "stone",
        particleVariations: 2,
        floorZIndex: ZIndexes.Ground,
        particle: "carport_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.01, 95.8, Vec(-52.72, -4.1)),
            RectangleHitbox.fromRect(93.65, 1.94, Vec(-6.54, -51.04)),
            RectangleHitbox.fromRect(1.95, 9.18, Vec(40.17, -47.42)),
            RectangleHitbox.fromRect(45.24, 1.92, Vec(-30.39, 42.83)),
            RectangleHitbox.fromRect(15.74, 1.94, Vec(32.46, 42.84)),
            RectangleHitbox.fromRect(1.97, 54.28, Vec(40.17, 16.67))
        ),
        floors: [{
            type: FloorNames.Stone,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(91.03, 92.77, Vec(-6.26, -3.73)),
                RectangleHitbox.fromRect(7.92, 32.48, Vec(42.85, -26.67)),
                RectangleHitbox.fromRect(32.49, 7.53, Vec(8.39, 45.81))
            )
        }],
        ceilingImages: [{
            key: "carport_ceiling",
            position: Vec(-6.27, -4.1),
            scale: Vec(2, 2)
        }],
        floorImages: [
            {
                key: "carport_floor",
                position: Vec(-6.27, -4)
            },
            {
                key: "barricade_line_carport",
                position: Vec(43.91, -26.63)
            },
            {
                key: "barricade_line_carport",
                position: Vec(8.48, 46.67),
                rotation: Math.PI / 2
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "pickup_truck", position: Vec(-24.01, -5.02), rotation: 2 },
            { idString: "regular_crate", position: Vec(-23.63, -31.09) },
            { idString: "regular_crate", position: Vec(-35, -24.02) },
            { idString: "regular_crate", position: Vec(23.56, -44.73) },
            { idString: "regular_crate", position: Vec(46.6, 12.09) },
            { idString: "ammo_crate", position: Vec(-23.66, -20.29) },
            { idString: "ammo_crate", position: Vec(-31.54, 35.82) },
            { idString: "ammo_crate", position: Vec(47.72, 22.77) },
            { idString: "tire", position: Vec(-11.62, -47.49), rotation: 1 },
            { idString: "tire", position: Vec(-2.72, -47.86), rotation: 1 },
            { idString: "tire", position: Vec(-9.29, -43.7), rotation: 1 },
            { idString: "barrel", position: Vec(-46.09, -44.96) },
            { idString: "barrel", position: Vec(33.02, -44.09) },
            { idString: "barrel", position: Vec(-20.66, 37.81) },
            { idString: "barrel", position: Vec(-12.53, 34.75) },
            { idString: "box", position: Vec(45.21, 34.56) },
            { idString: "box", position: Vec(51.7, 30.91) },
            { idString: "sandbags", position: Vec(-18.36, 49.36), rotation: 0 },
            { idString: "generator", position: Vec(7.89, -45.55), rotation: 0 },
            { idString: "forklift", position: Vec(32.7, 17.99), rotation: 2 },
            { idString: "toolbox", position: Vec(-30.12, -45.72), rotation: 0 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: randomPallet, position: Vec(32.65, 6.72) },
            { idString: randomPallet, position: Vec(-43.58, 35.45) }
        ],
        lootSpawners: IS_CLIENT ? undefined : [{ table: "ground_loot", position: Vec(-31.38, 17.04) }]
    },
    hollowLog(1, "damaged"),
    hollowLog(2, "extended"),
    hollowLog(3, "moldy"),

    {
        idString: "decayed_bridge_storage",
        name: "Decayed Bridge Storage",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(48, 39.04, Vec(4.2, 0.3)),
        material: "stone",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(33.85, 2.01, Vec(0, -16.2)),
            RectangleHitbox.fromRect(2.01, 20.14, Vec(-15.93, 6.54)),
            RectangleHitbox.fromRect(18.14, 2, Vec(-7.87, 16.18))
        ),
        floorImages: [{
            key: "decayed_bridge_storage_floor",
            position: Vec(0, 0)
        }],
        floors: [{
            type: FloorNames.Stone,
            hitbox: RectangleHitbox.fromRect(33.86, 34.39, Vec(-0.02, -0.02))
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "lansirama_crate", position: Vec(-9.45, 9.95), outdoors: true },
            { idString: "barrel", position: Vec(-10.29, 1.01), outdoors: true },
            { idString: "trash_bag", position: Vec(-1.15, -11.8), rotation: 0, outdoors: true },
            { idString: "trash_bag", position: Vec(5.49, -11.5), outdoors: true },
            { idString: "grenade_crate", position: Vec(21.61, -5), outdoors: true },
            { idString: "large_logs_pile_2", position: Vec(22.8, 7.98), rotation: 1, variation: 1, outdoors: true }
        ]
    },
    {
        idString: "decayed_bridge_lmr_office",
        name: "Decayed Bridge LMR Office",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(59.15, 58.04, Vec(-3.4, -2.84)),
        material: "stone",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(18.14, 2, Vec(-14.19, -22.6)),
            RectangleHitbox.fromRect(2, 33.42, Vec(-22.24, 6.86)),
            RectangleHitbox.fromRect(17.21, 2, Vec(14.59, 22.56)),
            RectangleHitbox.fromRect(2.01, 17.21, Vec(22.19, -15)),
            RectangleHitbox.fromRect(2.01, 17.09, Vec(22.19, 14.89))
        ),
        floorImages: [{
            key: "decayed_bridge_lmr_office_floor",
            position: Vec(0, 0)
        }],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(46.5, 47.17, Vec(0.07, -0.02))
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "box", position: Vec(18.15, 18.55), outdoors: true },
            { idString: "trash_can", position: Vec(17.7, 12.98), outdoors: true },
            { idString: "regular_crate", position: Vec(-15.82, -0.97), outdoors: true },
            { idString: "regular_crate", position: Vec(-13.11, 8.95), outdoors: true },
            { idString: "chair", position: Vec(4.88, 3.07), rotation: 1, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-27.41, -22.43), rotation: 0, outdoors: true },
            { idString: { box: 1, grenade_box: 0.35 }, position: Vec(-26.27, -1.1), outdoors: true },
            { idString: "box", position: Vec(-12.63, -27.8), outdoors: true },
            { idString: "box", position: Vec(-7.31, -26.35), outdoors: true },
            { idString: "small_logs_pile_2", position: Vec(-27.9, 6.16), rotation: 1, outdoors: true }
        ]
    },
    {
        idString: "decayed_bridge",
        name: "Decayed Bridge",
        defType: DefinitionType.Building,
        spawnMode: MapObjectSpawnMode.Beach,
        spawnOrientation: 3,
        spawnOffset: Vec(25, 0),
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(151.74, 63.34, Vec(-1.05, 42.25)),
            RectangleHitbox.fromRect(63.94, 92.71, Vec(-7.49, -26.07))
        ),
        floorImages: [{
            key: "decayed_bridge_floor",
            position: Vec(-6.49, 0.07),
            scale: Vec(2, 2)
        }],
        floors: [
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(3.14, 31.6, Vec(-0.06, 46.13)),
                    RectangleHitbox.fromRect(3.16, 91.8, Vec(-14.1, -21.26)),
                    RectangleHitbox.fromRect(3.14, 78.87, Vec(-0.04, -14.83))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new PolygonHitbox([
                    Vec(-10.15, 64.7),
                    Vec(-17.31, 34.1),
                    Vec(-14.35, 33.4),
                    Vec(-7.25, 64)
                ])
            },
            {
                type: FloorNames.Log,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(21.62, 4.66, Vec(-5.36, 54.24)),
                    RectangleHitbox.fromRect(21.63, 4.66, Vec(-6.98, -54.26)),
                    RectangleHitbox.fromRect(21.65, 4.66, Vec(-6.97, 6.92)),
                    RectangleHitbox.fromRect(21.65, 4.66, Vec(-7.08, -14.23)),
                    RectangleHitbox.fromRect(21.65, 4.66, Vec(-7.05, -23.52)),
                    RectangleHitbox.fromRect(21.65, 4.66, Vec(-7.02, -44.99)),
                    RectangleHitbox.fromRect(21.62, 4.66, Vec(-7.03, 16.22))
                )
            },
            {
                type: FloorNames.Log,
                hitbox: new PolygonHitbox([
                    Vec(2.66, -9.43),
                    Vec(-18.18, -3.88),
                    Vec(-16.91, 0.37),
                    Vec(3.78, -5.06)
                ])
            },
            {
                type: FloorNames.Log,
                hitbox: new PolygonHitbox([
                    Vec(2.59, -70.14),
                    Vec(-18.16, -64.58),
                    Vec(-17.04, -60.25),
                    Vec(3.84, -65.75)
                ])
            },
            {
                type: FloorNames.Log,
                hitbox: new PolygonHitbox([
                    Vec(3.66, -33.74),
                    Vec(-17.06, -39.27),
                    Vec(-18.25, -34.89),
                    Vec(2.47, -29.38)
                ])
            },
            {
                type: FloorNames.Log,
                hitbox: new PolygonHitbox([
                    Vec(2.58, 33.82),
                    Vec(-18.24, 39.33),
                    Vec(-17.04, 43.75),
                    Vec(3.73, 38.16)
                ])
            },
            {
                type: FloorNames.Stone,
                hitbox: new PolygonHitbox([
                    Vec(-14.5, 4.58),
                    Vec(-21.74, 3.29),
                    Vec(-21.73, 68.2),
                    Vec(-17.2, 69.98),
                    Vec(-7.9, 69.58),
                    Vec(1.8, 70.08),
                    Vec(7.7, 68.68),
                    Vec(7.7, 3.58),
                    Vec(-2.3, 1.38)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(-28.63, -55.13),
                    Vec(-29.6, 1.35),
                    Vec(-14.94, 4.93),
                    Vec(-2.42, 1.56),
                    Vec(8.78, 3.98),
                    Vec(16.78, 0.98),
                    Vec(17.78, -57.02),
                    Vec(13.78, -56.02),
                    Vec(9.31, -57.61),
                    Vec(4.31, -53.74),
                    Vec(0.92, -58.9),
                    Vec(-7.35, -54),
                    Vec(-17.63, -59.86)
                ])
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "decayed_bridge_wall", position: Vec(-28.72, -28.24), rotation: 0, outdoors: true },
            { idString: "decayed_bridge_wall", position: Vec(16.05, -28.24), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-20.62, -28.26), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-21.79, -20.97), rotation: 1, outdoors: true },
            { idString: "gun_case", position: Vec(-21.58, -37.06), rotation: 1, outdoors: true },
            { idString: "box", position: Vec(8.42, -40.89), outdoors: true },
            { idString: "box", position: Vec(9.59, -35.72), outdoors: true },
            { idString: "barrel", position: Vec(8.08, -5.18), outdoors: true },
            { idString: "pebble", position: Vec(-24.84, 25.18), rotation: 1, variation: 2 },
            { idString: "pebble", position: Vec(11.24, 69.12), rotation: 3, variation: 2 },
            { idString: "pebble", position: Vec(-25.71, 60.87), rotation: 0, variation: 1 },
            { idString: "pebble", position: Vec(10.89, 51.04), rotation: 2, variation: 1 },
            { idString: "pebble", position: Vec(10.82, 35.06), rotation: 3, variation: 1 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "decayed_bridge_storage", position: Vec(-53.35, 35.78) },
            { idString: "decayed_bridge_lmr_office", position: Vec(46.89, 44.19) }
        ]
    },
    {
        idString: "train_engine",
        name: "Train Engine",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(118.72, 34.81, Vec(-0.16, 0.08)),
        ceilingHitbox: RectangleHitbox.fromRect(29.91, 27.54, Vec(20.2, -0.04)),
        material: "metal_heavy",
        particle: "metal_particle",
        floorZIndex: ZIndexes.BuildingsFloor + 0.5, // otherwise it doesn't display on the map
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(66.61, 1, Vec(21.88, 14.18)),
            RectangleHitbox.fromRect(29.95, 1, Vec(-39.9, 14.29)),
            RectangleHitbox.fromRect(50.18, 1, Vec(16.72, -14.14)),
            RectangleHitbox.fromRect(29.95, 1, Vec(-39.9, -14.38)),
            RectangleHitbox.fromRect(1, 27.67, Vec(54.91, 0.14)),
            RectangleHitbox.fromRect(1, 27.67, Vec(-55.19, 0.14)),
            RectangleHitbox.fromRect(6.62, 1, Vec(51.67, -14.23)),
            new CircleHitbox(0.83, Vec(-55.22, 14.28)),
            new CircleHitbox(0.84, Vec(-55.23, -14.36)),
            new CircleHitbox(0.83, Vec(-24.32, -14.38)),
            new CircleHitbox(0.83, Vec(35.67, -14.14)),
            new CircleHitbox(0.83, Vec(41.72, -14.14)),
            new CircleHitbox(0.83, Vec(48.39, -14.24)),
            new CircleHitbox(0.83, Vec(54.89, -14.24)),
            new CircleHitbox(0.83, Vec(54.89, -0.75)),
            new CircleHitbox(0.83, Vec(54.89, 14.23)),
            new CircleHitbox(0.83, Vec(35.64, 14.18)),
            new CircleHitbox(0.83, Vec(-24.89, 14.3))
        ),
        floorImages: [
            // {
            //     key: "train_barricade_line",
            //     position: Vec(55.09, -0.44),
            //     scale: Vec(2, 2),
            // },
            {
                key: "train_engine_floor",
                position: Vec(-0.21, 0.01)
            }
        ],
        ceilingImages: [{
            key: "train_engine_ceiling",
            position: Vec(20.28, 0.11),
            scale: Vec(2.02, 2)
        }],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(2.97, 27.46, Vec(36.48, -0.04)),
                    RectangleHitbox.fromRect(2.97, 27.61, Vec(3.95, -0.12))
                )
            },
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(29.91, 27.54, Vec(20.2, -0.04))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(109.28, 29.11, Vec(-0.15, -0.04))
            }
        ],
        puzzle: {
            triggerOnSolve: "powered_metal_door",
            delay: 1000,
            unlockOnly: true
        },
        obstacles: IS_CLIENT ? undefined : [
            // station units
            { idString: "powered_metal_door", position: Vec(5.77, -47.26), rotation: 1, locked: true },
            { idString: "control_panel_train", position: Vec(29.6, -0.22), rotation: 3, puzzlePiece: true },

            { idString: "train_barricade_line", position: Vec(55.09, -0.44), rotation: 0, scale: 2 },
            { idString: "train_engine_collider", position: Vec(0, 0), rotation: 0 }, // mbhmbmbrtb uwu,,
            { idString: "gun_case", position: Vec(9.85, -0.07), rotation: 1 },
            { idString: "box", position: Vec(-28.61, -10.9), outdoors: true },
            { idString: "box", position: Vec(50.77, -4.12), outdoors: true },
            { idString: "box", position: Vec(51.42, 0.99), outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-35.55, -11), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-51.75, 1.69), rotation: 1, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-29.37, 10.81), rotation: 0, outdoors: true },
            { idString: "train_connector", position: Vec(55.89, -8.52), rotation: 0 },
            { idString: "train_connector", position: Vec(55.89, -0.71), rotation: 0 },
            { idString: "train_connector", position: Vec(55.89, 8.12), rotation: 0 },
            { idString: "train_connector", position: Vec(-55.87, 8.82), rotation: 2 },
            { idString: "train_connector", position: Vec(-55.87, 0.07), rotation: 2 },
            { idString: "train_connector", position: Vec(-55.95, -7.73), rotation: 2 }
        ]
    },
    {
        idString: "passenger_train",
        name: "Passenger Train",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(118.72, 37, Vec(-0.16, 0.08)),
        ceilingHitbox: RectangleHitbox.fromRect(102.98, 27.95, Vec(1.27, 0.43)),
        material: "stone",
        particle: "abandoned_warehouse_1_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(71.51, 1.25, Vec(-14.36, 14.94)),
            RectangleHitbox.fromRect(53.5, 1.25, Vec(15.12, -14.17)),
            RectangleHitbox.fromRect(1.25, 29.89, Vec(53.36, 0.16)),
            RectangleHitbox.fromRect(1.25, 17.11, Vec(35.69, -5.22)),
            RectangleHitbox.fromRect(19.54, 1.25, Vec(44.21, 14.95)),
            RectangleHitbox.fromRect(25.68, 1.29, Vec(-37.85, -14.15)),
            RectangleHitbox.fromRect(1.25, 7.04, Vec(-50.07, 12.05)),
            RectangleHitbox.fromRect(1.25, 6.75, Vec(-50.07, -11.13))
        ),
        floorZIndex: ZIndexes.BuildingsFloor + 0.5, // otherwise it doesn't display on the map
        graphicsZIndex: ZIndexes.BuildingsFloor + 0.6,
        floorImages: [{
            key: "passenger_train_floor",
            position: Vec(-1.19, 0.35)
        }],
        ceilingImages: [{
            key: "passenger_train_ceiling",
            position: Vec(1.7, 0.25),
            scale: Vec(2, 2)
        }],
        graphics: [
            { // stroke
                color: 0x303030,
                hitbox: RectangleHitbox.fromRect(12.5, 1.2, Vec(47.3, -15.45))
            },
            { // fill
                color: 0x525252,
                hitbox: RectangleHitbox.fromRect(11, 1.72, Vec(47.2, -14.5))
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(17.68, 28.55, Vec(44.05, 0.27)),
                    RectangleHitbox.fromRect(12.66, 2.24, Vec(47.38, -14.75))
                )
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(85.43, 28.12, Vec(-7.34, 0.4)),
                    RectangleHitbox.fromRect(13.43, 1.19, Vec(-18.3, -14.2)),
                    RectangleHitbox.fromRect(13.07, 1.19, Vec(27.93, 14.98))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(5.68, 28.77, Vec(-52.98, 0.28))
            }
        ],
        puzzle: {
            triggerOnSolve: "powered_metal_door",
            delay: 1000,
            unlockOnly: true
        },
        obstacles: IS_CLIENT ? undefined : [
            // station units
            { idString: "powered_metal_door", position: Vec(5.77, -47.26), rotation: 1, locked: true },
            { idString: "control_panel", position: Vec(48.58, 8.37), rotation: 3, puzzlePiece: true },

            { idString: "passenger_train_back_collider", position: Vec(0, 0), rotation: 0 },
            { idString: "train_connector", position: Vec(54.72, -7.66), rotation: 0 },
            { idString: "train_connector", position: Vec(54.72, 0.21), rotation: 0 },
            { idString: "train_connector", position: Vec(54.72, 8.88), rotation: 0 },
            { idString: "gun_case", position: Vec(-33.34, -10.39), rotation: 0 },
            { idString: "propane_tank", position: Vec(39.01, -10.99) },
            { idString: "potted_plant", position: Vec(-12.74, 9.97), rotation: 0 },
            { idString: "small_drawer", position: Vec(48.39, -1.23), rotation: 3 },
            { idString: "box", position: Vec(-5.98, 10.9) },
            { idString: "box", position: Vec(20.71, -9.81) },
            { idString: "box", position: Vec(23.12, -4.56) },
            { idString: "office_chair", position: Vec(31.08, -10.28), rotation: 3 },
            { idString: "office_chair", position: Vec(31.08, -4.01), rotation: 3 },
            { idString: "office_chair", position: Vec(6.98, 10.75), rotation: 3 },

            // SEAT-RW-1
            { idString: "office_chair", position: Vec(7.12, -10.07), rotation: 3 },
            { idString: "office_chair", position: Vec(7.12, -3.72), rotation: 3 },

            // SEAT-RW-2
            { idString: "office_chair", position: Vec(13.9, -10.07), rotation: 1 },
            { idString: "office_chair", position: Vec(13.9, -3.72), rotation: 1 },
            { idString: "office_chair", position: Vec(13.9, 10.75), rotation: 1 },

            { idString: "small_table", position: Vec(-2.31, -7.15), rotation: 0 },
            { idString: "small_table", position: Vec(-33.59, 8.75), rotation: 1 },
            { idString: "chair", position: Vec(-7.56, -6.68), rotation: 3 },
            { idString: "chair", position: Vec(-39.86, 8.75), rotation: 3 },
            { idString: "chair", position: Vec(-27.32, 8.75), rotation: 1 }
        ]
    },
    {
        idString: "wood_train",
        name: "Wood Train",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(112.89, 37.98, Vec(0.07, 0.03)),
        material: "stone",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(37.96, 1.61, Vec(32.84, 14.58)),
            RectangleHitbox.fromRect(65.07, 1.61, Vec(9.23, -14.87)),
            RectangleHitbox.fromRect(38.19, 1.61, Vec(-32.76, 14.88)),
            RectangleHitbox.fromRect(1.61, 29.31, Vec(-52.09, -0.14)),
            RectangleHitbox.fromRect(1.61, 29.31, Vec(52.11, -0.19)),
            RectangleHitbox.fromRect(13.41, 1.61, Vec(-44.87, -14.83)),
            new CircleHitbox(1.2, Vec(-52.1, 14.89)),
            new CircleHitbox(1.2, Vec(-52.07, -14.89)),
            new CircleHitbox(1.2, Vec(52.14, -14.9)),
            new CircleHitbox(1.2, Vec(52.12, 14.88))
        ),
        floorZIndex: ZIndexes.BuildingsFloor + 0.5, // otherwise it doesn't display on the map
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(12.8, 15.88, Vec(-44.89, 6.14))
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(102.62, 30.37, Vec(0, -0.04))
            }
        ],
        floorImages: [{
            key: "wood_train_floor",
            position: Vec(0.07, 0)
        }],
        puzzle: {
            triggerOnSolve: "powered_metal_door",
            delay: 1000,
            unlockOnly: true
        },
        obstacles: IS_CLIENT ? undefined : [
            // station units
            { idString: "powered_metal_door", position: Vec(5.77, -47.26), rotation: 1, locked: true },
            { idString: "control_panel", position: Vec(-44.84, 6.16), rotation: 1, puzzlePiece: true, outdoors: true },

            { idString: "train_connector", position: Vec(53.38, -7.51), rotation: 0 },
            { idString: "train_connector", position: Vec(53.38, 0.29), rotation: 0 },
            { idString: "train_connector", position: Vec(53.38, 9.04), rotation: 0 },
            { idString: "train_connector", position: Vec(-53.38, -7.51), rotation: 2 },
            { idString: "train_connector", position: Vec(-53.38, 0.29), rotation: 2 },
            { idString: "train_connector", position: Vec(-53.38, 9.04), rotation: 2 },
            { idString: "box", position: Vec(-17.39, 10.98), outdoors: true },
            { idString: "box", position: Vec(36.12, 10.69), outdoors: true },
            { idString: "gun_case", position: Vec(44.49, 10.31), rotation: 2, outdoors: true },
            { idString: "small_logs_pile_2", position: Vec(-29.45, -0.37), rotation: 0, outdoors: true },
            { idString: "small_logs_pile_2", position: Vec(-40.68, -8.1), rotation: 3, outdoors: true },
            { idString: "small_logs_pile_2", position: Vec(10.66, -0.08), rotation: 0, outdoors: true },
            { idString: "large_logs_pile_2", position: Vec(31.79, -9.13), rotation: 2, outdoors: true }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: randomHollowLog, position: Vec(9.21, -13.14), orientation: 1 },
            { idString: randomHollowLog, position: Vec(9.03, -10.85), orientation: 3 }
        ]
    },
    {
        idString: "container_train",
        name: "Container Train",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(115.01, 37.5, Vec(0.59, 0.24)),
        ceilingHitbox: RectangleHitbox.fromRect(100.71, 26.6, Vec(0.13, -0.06)),
        material: "metal_heavy",
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(70.93, 2, Vec(15.96, 14.23)),
            RectangleHitbox.fromRect(73.3, 2, Vec(-0.36, -14.12)),
            RectangleHitbox.fromRect(2, 30.36, Vec(-51.2, 0.05)),
            RectangleHitbox.fromRect(2.01, 12.16, Vec(-7.64, 7.9)),
            RectangleHitbox.fromRect(2.01, 12.16, Vec(8.65, 7.9)),
            RectangleHitbox.fromRect(2, 30.36, Vec(51.48, 0.05)),
            RectangleHitbox.fromRect(15.58, 2.01, Vec(-43.92, 14.23)),
            RectangleHitbox.fromRect(3, 3.01, Vec(8.64, 0.58)),
            RectangleHitbox.fromRect(3, 3.01, Vec(-7.65, 0.77))
        ),
        graphics: [
            { // stroke
                color: 0x333333,
                hitbox: RectangleHitbox.fromRect(107.11, 32.43, Vec(0.04, -0.01))
            },
            { // fill
                color: 0x4d4d4d,
                hitbox: RectangleHitbox.fromRect(105.99, 31.32, Vec(0.04, -0.01))
            }
        ],
        graphicsZIndex: ZIndexes.BuildingsFloor + 0.2,
        floorZIndex: ZIndexes.BuildingsFloor + 0.5, // otherwise it doesn't display on the map
        floorImages: [{
            key: "container_train_floor",
            position: Vec(0.15, 0.17)
        }],
        ceilingImages: [{
            key: "container_train_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        floors: [
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(101.49, 30.37, Vec(-0.27, 0.05))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(107.11, 32.43, Vec(0.04, -0.01))
            }
        ],
        puzzle: {
            triggerOnSolve: "powered_metal_door",
            delay: 1000,
            unlockOnly: true
        },
        obstacles: IS_CLIENT ? undefined : [
            // station units
            { idString: "powered_metal_door", position: Vec(5.77, -47.26), rotation: 1, locked: true },
            { idString: "control_panel", position: Vec(0.27, 8.54), rotation: 2, puzzlePiece: true },

            { idString: "train_connector", position: Vec(53.64, -8.27), rotation: 0 },
            { idString: "train_connector", position: Vec(53.64, -0.4), rotation: 0 },
            { idString: "train_connector", position: Vec(53.64, 8.34), rotation: 0 },
            { idString: "train_connector", position: Vec(-53.64, -8.27), rotation: 2 },
            { idString: "train_connector", position: Vec(-53.64, -0.4), rotation: 2 },
            { idString: "train_connector", position: Vec(-53.64, 8.34), rotation: 2 },
            { idString: "propane_tank", position: Vec(26.71, 10.57) },
            { idString: "barrel", position: Vec(45.23, -2.59) },
            { idString: "barrel", position: Vec(-23.2, 0.47) },
            { idString: "barrel", position: Vec(-31.37, -2.01) },
            { idString: "super_barrel", position: Vec(14.67, 8.43) },
            { idString: "box", position: Vec(-12.17, 10.49) },
            { idString: "box", position: Vec(-46.88, 0.87) },
            { idString: "box", position: Vec(21.86, 10.57) },
            { idString: "regular_crate", position: Vec(-44.77, 8.1) },
            { idString: "gun_case", position: Vec(46.73, 7.39), rotation: 3 }
        ]
    },
    {
        idString: "train_station_office",
        name: "Train Station Office",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(105.92, 36.86, Vec(0.4, -0.63)),
        ceilingHitbox: RectangleHitbox.fromRect(100, 31, Vec(0.77, -1)),
        material: "stone",
        particleVariations: 2,
        particle: "abandoned_warehouse_1_particle",
        floorImages: [{
            key: "train_station_office_floor",
            position: Vec(0.77, -1.33)
        }],
        ceilingImages: [{
            key: "train_station_office_ceiling",
            position: Vec(0.77, 0.2),
            scale: Vec(2, 2)
        }],
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(35.23, 2.01, Vec(-8.62, 12.74)),
            RectangleHitbox.fromRect(35.23, 2.01, Vec(-8.7, -15.32)),
            RectangleHitbox.fromRect(2.01, 29.42, Vec(-25.31, -0.97)),
            RectangleHitbox.fromRect(2.01, 17.49, Vec(7.97, -7.58)),
            RectangleHitbox.fromRect(2.57, 2.36, Vec(-47.75, -15.03))
        ),
        floorZIndex: ZIndexes.BuildingsFloor + 0.5, // so it always displays above station floor
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(32.32, 26.24, Vec(-8.16, -1.29))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(97.41, 29.31, Vec(0.73, -0.9))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "sawmill_center_warehouse_column", position: Vec(49.12, -14.82) },
            { idString: "sawmill_center_warehouse_column", position: Vec(49.12, 13.28) },
            { idString: "sawmill_center_warehouse_column", position: Vec(-47.22, 13.28) },
            { idString: "sawmill_center_warehouse_column", position: Vec(-47.69, -14.82) },
            { idString: "smaller_sandbags", position: Vec(-30.47, 13.13), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(-47.84, -9.19), rotation: 1 },
            { idString: "smaller_sandbags", position: Vec(43.31, 13.51), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(-9.26, 7.32), rotation: 1 },
            { idString: "office_chair", position: Vec(25.76, 3.35), rotation: 0 },
            { idString: "office_chair", position: Vec(32.18, 3.35), rotation: 0 },
            { idString: "office_chair", position: Vec(25.91, -2.92), rotation: 2 },
            { idString: "office_chair", position: Vec(32.18, -2.92), rotation: 2 },
            { idString: "trash_can", position: Vec(-29.47, 7.09) },
            { idString: "trash_can", position: Vec(12.32, -11.08) },
            { idString: "lansirama_crate", position: Vec(1.79, -9.1) },
            { idString: "box", position: Vec(-5.84, -11.48) },
            { idString: "gun_case", position: Vec(-18.44, 8.25), rotation: 2 },
            { idString: "vending_machine", position: Vec(-20.06, -8.8), rotation: 1 }
        ]
    },
    {
        idString: "train_station",
        name: "Train Station",
        defType: DefinitionType.Building,
        spawnMode: MapObjectSpawnMode.Grass,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(219.15, 54.29, Vec(0.13, 28.76)),
            RectangleHitbox.fromRect(172.82, 60.94, Vec(-1.79, -25.47))
        ),
        material: "metal_heavy",
        reflectBullets: true,
        particle: "metal_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(30.49, 1.26, Vec(-60.82, -41.23)),
            RectangleHitbox.fromRect(1.28, 14, Vec(-76.58, -33.43)),
            RectangleHitbox.fromRect(8.32, 1.24, Vec(8.67, -41.18)),
            RectangleHitbox.fromRect(36.51, 1.27, Vec(52.13, -41.13)),
            RectangleHitbox.fromRect(1.28, 47.49, Vec(70.08, -16.66)),
            RectangleHitbox.fromRect(1.27, 12.35, Vec(-76.59, 0.95)),
            RectangleHitbox.fromRect(3.7, 1.28, Vec(-35.53, -41.19)),
            RectangleHitbox.fromRect(2.02, 1.97, Vec(-76.61, -41.24)),
            RectangleHitbox.fromRect(2.02, 1.97, Vec(-33.04, -41.23)),
            RectangleHitbox.fromRect(2.02, 1.97, Vec(4.27, -41.23)),
            RectangleHitbox.fromRect(2.02, 1.97, Vec(13.6, -41.21)),
            RectangleHitbox.fromRect(2.02, 1.97, Vec(33.33, -41.18)),
            RectangleHitbox.fromRect(2.02, 1.97, Vec(51.49, -41.2)),
            RectangleHitbox.fromRect(2.02, 1.97, Vec(70.04, -41.22)),
            RectangleHitbox.fromRect(2, 1.97, Vec(70.09, -16.83)),
            RectangleHitbox.fromRect(2, 1.97, Vec(70.09, 7.81)),
            RectangleHitbox.fromRect(2, 1.97, Vec(-76.56, 7.9)),
            RectangleHitbox.fromRect(2, 1.97, Vec(-76.59, -25.57)),
            RectangleHitbox.fromRect(2, 1.97, Vec(-76.61, -5.85))
        ),
        floorImages: [
            {
                key: "train_station_stair",
                position: Vec(23.51, -45.5),
                rotation: Math.PI
            },
            {
                key: "train_station_stair",
                position: Vec(-80.19, -15.68),
                rotation: Math.PI / 2
            },
            {
                key: "train_station_floor_2",
                position: Vec(-0.8, 27.76),
                scale: Vec(2, 2)
            },
            {
                key: "train_station_floor_1",
                position: Vec(-3.21, -15.84)
            },
            {
                key: "train_station_decal_1",
                position: Vec(-41.08, -44.62),
                rotation: -Math.PI / 10
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(147.44, 52.29, Vec(-3.21, -15.54))
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(20.1, 7.43, Vec(23.43, -45.5)),
                    RectangleHitbox.fromRect(7.61, 20.16, Vec(-80.03, -15.66))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(60.38, 3.13, Vec(-46.46, 34.4)),
                    RectangleHitbox.fromRect(76.58, 3.13, Vec(-43.22, 20.33)),
                    RectangleHitbox.fromRect(98.98, 3.13, Vec(34.08, 20.13)),
                    RectangleHitbox.fromRect(98.98, 3.13, Vec(29.72, 34.21))
                )
            },
            {
                type: FloorNames.Log,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.68, 21.61, Vec(90.33, 28)),
                    RectangleHitbox.fromRect(4.63, 21.59, Vec(-71.26, 27.43)),
                    RectangleHitbox.fromRect(4.63, 21.59, Vec(-61.98, 27.46)),
                    RectangleHitbox.fromRect(4.63, 21.59, Vec(62.87, 27.05)),
                    RectangleHitbox.fromRect(4.63, 21.61, Vec(70.87, 27.12))
                )
            },
            {
                type: FloorNames.Log,
                hitbox: new PolygonHitbox([
                    Vec(-91.48, 40.6),
                    Vec(-97.08, 19.8),
                    Vec(-92.58, 18.6),
                    Vec(-86.98, 39.4)
                ])
            },
            {
                type: FloorNames.Log,
                hitbox: new PolygonHitbox([
                    Vec(79.99, 38.45),
                    Vec(74.37, 17.74),
                    Vec(78.75, 16.54),
                    Vec(84.35, 37.35)
                ])
            },
            {
                type: FloorNames.Stone,
                hitbox: new PolygonHitbox([
                    Vec(100.22, 9.81),
                    Vec(-101.7, 9.85),
                    Vec(-98.44, 13.95),
                    Vec(-100.22, 18.13),
                    Vec(-101.76, 26.52),
                    Vec(-98.21, 40.24),
                    Vec(-102, 45.67),
                    Vec(100.45, 45.65),
                    Vec(98.13, 39.2),
                    Vec(100.11, 26.79),
                    Vec(97.89, 16.83)
                ])
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "regular_crate", position: Vec(-70.62, -35.48), outdoors: true },
            { idString: "regular_crate", position: Vec(63.26, -34.7), outdoors: true },
            { idString: "regular_crate", position: Vec(53.12, -32.66), outdoors: true },
            { idString: "lansirama_crate", position: Vec(63.75, 2.19), outdoors: true },
            { idString: "box", position: Vec(-73.11, -28.19), outdoors: true },
            { idString: "box", position: Vec(-67.56, -27.39), outdoors: true },
            { idString: "box", position: Vec(-62.82, 3.16), outdoors: true },
            { idString: "box", position: Vec(65.99, -5.48), outdoors: true },
            { idString: "box", position: Vec(66, -26.19), outdoors: true },
            { idString: "box", position: Vec(60.9, -27), outdoors: true },
            { idString: "sandbags", position: Vec(21.39, 2.62), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(0.4, -8.1), rotation: 1, outdoors: true },
            { idString: "barrel", position: Vec(-24.71, -8.46), outdoors: true },
            { idString: "pallet", position: Vec(-70.15, 0.71), rotation: 1 },
            { idString: "grenade_crate", position: Vec(-70.15, 0.71), outdoors: true },
            { idString: "pebble", position: Vec(24.29, 47.58), rotation: 0, variation: 2 },
            { idString: "pebble", position: Vec(86.87, 49.84), rotation: 1, variation: 2 },
            { idString: "pebble", position: Vec(80.91, 4.37), rotation: 3, variation: 2 },
            { idString: "pebble", position: Vec(-83.19, 5.81), rotation: 0, variation: 1 },
            { idString: "pebble", position: Vec(-105.25, 13.41), rotation: 0, variation: 1 },
            { idString: "pebble", position: Vec(-22, 48.96), rotation: 0, variation: 1 },
            { idString: "pebble", position: Vec(4.28, 50.2), rotation: 0, variation: 1 },
            { idString: "pebble", position: Vec(50.01, 50.06), rotation: 3, variation: 1 },
            { idString: "pebble", position: Vec(105.4, 29.7), rotation: 1, variation: 1 },
            { idString: "pebble", position: Vec(-73.02, 49.91), rotation: 1, variation: 1 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            {
                idString: {
                    train_engine: 0.25,
                    passenger_train: 0.25,
                    wood_train: 0.25,
                    container_train: 0.25
                },
                position: Vec(-3.52, 26.91)
            },
            { idString: "train_station_office", position: Vec(-5.75, -26.5) },
            { idString: randomHollowLog, position: Vec(-75.76, 14.5), orientation: 2 },
            { idString: randomHollowLog, position: Vec(-47.8, 14.22), orientation: 3 },
            { idString: randomPallet, position: Vec(-8.08, -7.37) }
        ]
    },
    {
        idString: "graveyard",
        name: "Graveyard",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(161.81, 158.59, Vec(2.61, -3.32)),
        bunkerSpawnHitbox: RectangleHitbox.fromRect(73.2, 78.77, Vec(-17.78, -45.92)),
        material: "stone",
        particleVariations: 2,
        sounds: {
            normal: "graveyard_ambience",
            position: Vec(0, 0),
            maxRange: 300,
            falloff: 0.75
        },
        allowFlyover: FlyoverPref.Always,
        graphicsZIndex: ZIndexes.BuildingsFloor + 0.25,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.6, 33.6, Vec(-36.88, -54.22)),
            RectangleHitbox.fromRect(68.87, 1.6, Vec(37.03, -71.31)),
            RectangleHitbox.fromRect(18.35, 1.6, Vec(-26.99, -71.39)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(-16.37, 46.91)),
            RectangleHitbox.fromRect(3.38, 3.36, Vec(-16.4, -71.32)),
            RectangleHitbox.fromRect(1.61, 45.53, Vec(71.73, -47.89)),
            new CircleHitbox(1.62, Vec(71.73, -71.39)),
            new CircleHitbox(1.62, Vec(-36.87, -71.39)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(1.29, -71.32)),
            RectangleHitbox.fromRect(1.61, 25.1, Vec(71.73, 6.12)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(71.73, -24.46)),
            RectangleHitbox.fromRect(39.19, 1.6, Vec(21.69, 46.91)),
            RectangleHitbox.fromRect(51.32, 1.61, Vec(-43, 46.86)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(71.73, -6.78)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(1.33, 46.91)),
            RectangleHitbox.fromRect(1.61, 8.08, Vec(-68.97, 29.64)),
            new CircleHitbox(1.62, Vec(-69.15, 46.87)),
            new CircleHitbox(0.8, Vec(-68.97, 33.68)),
            RectangleHitbox.fromRect(8.08, 2.92, Vec(6.04, -24.44)),
            RectangleHitbox.fromRect(2.94, 8.07, Vec(-16.31, -53.25)),
            RectangleHitbox.fromRect(2.93, 8.08, Vec(42.84, 13.43)),
            RectangleHitbox.fromRect(2.93, 8.08, Vec(66.71, -62.5)),
            RectangleHitbox.fromRect(2.93, 8.08, Vec(51.13, -48.76)),
            RectangleHitbox.fromRect(2.93, 8.08, Vec(46.4, 11.81)),
            RectangleHitbox.fromRect(2.93, 8.07, Vec(-31.11, -27.25))
        ),
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.22, 10.42, Vec(39.63, 40.69)),
                    RectangleHitbox.fromRect(10.45, 5.04, Vec(65.53, 17.01)),
                    RectangleHitbox.fromRect(4.05, 10.39, Vec(-71.76, 18.65)),
                    RectangleHitbox.fromRect(10.99, 119.53, Vec(-7.66, -12.39)),
                    RectangleHitbox.fromRect(74.33, 11.26, Vec(34.22, -15.61)),
                    RectangleHitbox.fromRect(25.2, 25.67, Vec(-22.99, 7.4))
                )
            },
            {
                type: FloorNames.Sand,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(107.32, 119.76, Vec(17.69, -11.79)),
                    RectangleHitbox.fromRect(34.72, 21.14, Vec(-52.41, 35.78))
                )
            }
        ],
        floorImages: [
            {
                key: "graveyard_floor_1",
                position: Vec(1.44, 8.39)
            },
            {
                key: "graveyard_floor_2",
                position: Vec(17.15, -51.79)
            }
        ],
        graphics: [
            { // stroke
                color: 0x4d4d4d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.22, 10.42, Vec(39.63, 40.69)),
                    RectangleHitbox.fromRect(10.45, 5.04, Vec(65.53, 17.01)),
                    RectangleHitbox.fromRect(4.05, 10.39, Vec(-71.76, 18.65))
                )
            },
            { // fill
                color: 0x666666,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(3.57, 4.67, Vec(-71.75, 21.26)),
                    RectangleHitbox.fromRect(3.99, 4.64, Vec(39.31, 38.15)),
                    RectangleHitbox.fromRect(4, 4.66, Vec(39.33, 43.31)),
                    RectangleHitbox.fromRect(4.65, 4.1, Vec(62.9, 16.81)),
                    RectangleHitbox.fromRect(4.65, 4.1, Vec(68.07, 16.83)),
                    RectangleHitbox.fromRect(3.57, 4.67, Vec(-71.75, 16.09))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "graveyard_basement_collider_hack", position: Vec(-18, -45.25), rotation: 0, layer: Layer.ToBasement },
            { idString: "dormant_oak_tree", position: Vec(13.57, 60.23) },
            { idString: "dormant_oak_tree", position: Vec(-30.26, 60.23) },
            { idString: "baby_plumpkin_infection", position: Vec(20.08, -32.71) },
            { idString: "baby_plumpkin_infection", position: Vec(56.18, -49.45) },
            { idString: "baby_plumpkin_infection", position: Vec(-26.12, -28) },
            { idString: "baby_plumpkin_infection", position: Vec(62.08, -48.02) },
            { idString: "baby_plumpkin_infection", position: Vec(-20.2, -26.25) },
            { idString: "baby_plumpkin_infection", position: Vec(57.67, -35.37), variation: 2 },
            { idString: "sandbags", position: Vec(33.12, -26.9), rotation: 0 },
            { idString: "sandbags", position: Vec(13.43, -4.85), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(43.88, -25.73), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(64.76, -6.84), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(10.87, 2.27), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(-17.98, -8.98), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(3.41, -49.91), rotation: 0 },
            { idString: "roadblock", position: Vec(1.77, 9.9), rotation: 0 },
            { idString: "roadblock", position: Vec(1.92, 31.65), rotation: 0 },
            { idString: "roadblock", position: Vec(29.23, -6.78), rotation: 1 },
            { idString: "roadblock", position: Vec(49.33, -6.77), rotation: 1 },
            { idString: "box", position: Vec(-32.44, -67.32) },
            { idString: "box", position: Vec(10.65, -50.05) },
            { idString: "box", position: Vec(15.66, -48.91) },
            { idString: "box", position: Vec(61.17, -62.41) },
            { idString: "box", position: Vec(36.56, -33.7) },
            { idString: "box", position: Vec(56.75, -0.69) },
            { idString: "box", position: Vec(3.76, 0.44) },
            { idString: "box", position: Vec(2.61, -4.77) },
            { idString: "box", position: Vec(14.19, 39.06) },
            { idString: "box", position: Vec(18.77, 42.81) },
            { idString: "pallet", position: Vec(16.4, 41.18), rotation: 0 },
            { idString: "regular_crate", position: Vec(-44.96, -43.25) },
            { idString: "regular_crate", position: Vec(-55.39, -45.88) },
            { idString: "regular_crate", position: Vec(64.57, 1.73) },
            { idString: "grenade_crate", position: Vec(-25.92, -65.88) },
            { idString: "trash_bag", position: Vec(54.64, -62.21), rotation: 1 },
            { idString: "trash_bag", position: Vec(-45.97, 29.43), rotation: 0 },
            { idString: "super_barrel", position: Vec(26.57, 41.73) },
            { idString: "dumpster", position: Vec(-56.86, 30.23), rotation: 3 },
            { idString: "large_coffin", position: Vec(21.61, 20.71), rotation: 2 },

            // halloween only
            { idString: "cobweb", position: Vec(-15.09, -26.11), rotation: 0 },
            { idString: "cobweb", position: Vec(15.48, -26.12), rotation: 3 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "graveyard_basement", position: Vec(-18, -45.25), layer: Layer.Basement },
            { idString: "graveyard_basement_entrance", position: Vec(12.3, -61.4) },
            { idString: "graveyard_basement_entrance_main", position: Vec(-52.78, -5.94) },
            { idString: "graveyard_storage", position: Vec(56.99, 33.4) }
        ]
    },
    {
        idString: "graveyard_basement_entrance_main",
        name: "Main Graveyard Basement Entrance",
        defType: DefinitionType.Building,
        floorZIndex: ZIndexes.BuildingsFloor + 0.5,
        spawnHitbox: RectangleHitbox.fromRect(42.47, 70.33, Vec(-0.47, 0.18)),
        ceilingHitbox: RectangleHitbox.fromRect(31.49, 59.28, Vec(0.01, -0.01)),
        collideWithLayers: Layers.Equal,
        material: "stone",
        particle: "graveyard_basement_entrance_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 50.75, Vec(-16.7, -5.91)),
            RectangleHitbox.fromRect(22.24, 2, Vec(5.59, -17.96)),
            RectangleHitbox.fromRect(2.01, 34.54, Vec(16.66, -14.28)),
            RectangleHitbox.fromRect(34.39, 2, Vec(-0.5, -30.55)),
            RectangleHitbox.fromRect(34.42, 2, Vec(-0.49, 30.55)),
            RectangleHitbox.fromRect(2.02, 8.39, Vec(16.66, 27.36))
        ),
        floorImages: [{
            key: "graveyard_basement_entrance_main_floor",
            position: Vec(0, 0)
        }],
        ceilingImages: [{
            key: "graveyard_basement_entrance_main_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(33.7, 59.19, Vec(0.24, 0.06))
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "graveyard_stair", position: Vec(9.6, -24.24), rotation: 1, layer: Layer.ToBasement },
            { idString: "large_coffin", position: Vec(-9, 6.86), rotation: 3 },
            { idString: "box", position: Vec(2.84, -13.98) },
            { idString: "box", position: Vec(7.21, 26.87) },
            { idString: "door", position: Vec(-16.62, 24.08), rotation: 1 },
            { idString: "door", position: Vec(16.69, 17.74), rotation: 1 },
            { idString: "door", position: Vec(16.69, 8.45), rotation: 3 },
            { idString: "door", position: Vec(-10.14, -17.97), rotation: 0 },
            { idString: "trash_can", position: Vec(12.67, 26.41) },
            { idString: "aegis_crate", position: Vec(10.33, -11.59) },
            { idString: "urn", position: Vec(12.54, -3.57) }
        ]
    },
    {
        idString: "graveyard_basement_entrance",
        name: "Graveyard Basement Entrance",
        defType: DefinitionType.Building,
        floorZIndex: ZIndexes.BuildingsFloor + 0.5,
        spawnHitbox: RectangleHitbox.fromRect(29.45, 17.4, Vec(0.08, 0.15)),
        ceilingHitbox: RectangleHitbox.fromRect(20, 10.7, Vec(-0.45, 0.05)),
        collideWithLayers: Layers.Equal,
        material: "stone",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(21.83, 2, Vec(-0.49, 6.28)),
            RectangleHitbox.fromRect(21.85, 2.5, Vec(-0.49, -6.15)),
            RectangleHitbox.fromRect(2.02, 14.56, Vec(-11.41, 0))
        ),
        ceilingImages: [{
            key: "graveyard_basement_entrance_ceiling",
            position: Vec(-1, 0),
            scale: Vec(2, 2)
        }],
        floorImages: [{
            key: "graveyard_basement_entrance_floor",
            position: Vec(0, 0)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(20, 10.7, Vec(-0.45, 0.05))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(2.92, 10.59, Vec(11.01, -0.01))
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "door", position: Vec(9.62, -0.18), rotation: 1 },
            { idString: "graveyard_stair", position: Vec(-3.87, 0.07), rotation: 3, layer: Layer.ToBasement }
        ]
    },
    {
        idString: "graveyard_basement",
        name: "Graveyard Basement",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(73.2, 78.77, Vec(0.22, -0.67)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(39.99, 61.83, Vec(0.11, 0.02)),
            RectangleHitbox.fromRect(12.72, 10.92, Vec(-25.97, 15.18)),
            RectangleHitbox.fromRect(12.33, 10.92, Vec(26.08, -16.12))
        ),
        material: "stone",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.99, 42.08, Vec(-20.88, -11.62)),
            RectangleHitbox.fromRect(44.02, 2.02, Vec(0.13, 31.9)),
            RectangleHitbox.fromRect(2, 12.13, Vec(-20.9, 26.84)),
            RectangleHitbox.fromRect(1.99, 42.08, Vec(21.14, 11.06)),
            RectangleHitbox.fromRect(2, 10.82, Vec(21.21, -27.5)),
            RectangleHitbox.fromRect(43.44, 2, Vec(-0.17, -31.9)),
            RectangleHitbox.fromRect(12.45, 1.99, Vec(-26.11, 21.31)),
            RectangleHitbox.fromRect(12.14, 2.01, Vec(26.21, -9.75)),
            RectangleHitbox.fromRect(12.47, 2.02, Vec(-26.1, 8.72)),
            RectangleHitbox.fromRect(12.15, 1.99, Vec(26.27, -22.33))
        ),
        floorImages: [
            {
                key: "graveyard_basement_floor_stair",
                position: Vec(26.05, -16.13)
            },
            {
                key: "graveyard_basement_floor_stair",
                position: Vec(-25.9, 15),
                rotation: Math.PI
            },
            {
                key: "graveyard_basement_floor",
                position: Vec(0.19, -0.07)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(39.99, 61.83, Vec(0.11, 0.02)),
                    RectangleHitbox.fromRect(12.72, 10.92, Vec(-25.97, 15.18)),
                    RectangleHitbox.fromRect(12.33, 10.92, Vec(26.08, -16.12))
                )
            },
            { // stairs
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(12.72, 10.92, Vec(-25.97, 15.18)),
                    RectangleHitbox.fromRect(12.33, 10.92, Vec(26.08, -16.12))
                ),
                layer: Layer.ToBasement
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "regular_crate", position: Vec(-13.84, 25.56) },
            { idString: "aegis_crate", position: Vec(14.96, -25.39) },
            { idString: "box", position: Vec(16.67, 9.66) },
            { idString: "box", position: Vec(-5, -27.83) },
            { idString: "box", position: Vec(7.33, -26.15) },
            { idString: "small_coffin", position: Vec(-15.75, -23.35), rotation: 3 },
            { idString: "small_coffin", position: Vec(11.14, 15.25), rotation: 2 },
            { idString: "large_coffin", position: Vec(0.19, -6.18), rotation: 3 },
            { idString: "seedshot_case", position: Vec(15.13, 24.84), rotation: 3 },
            { idString: "graveyard_light", position: Vec(-0.17, 27.03) },
            { idString: "graveyard_light", position: Vec(0.69, -27.27) },
            { idString: "urn", position: Vec(16.61, 3.48) },

            // TEMP: Remove if halloween ends.
            { idString: "cobweb", position: Vec(-15.02, 25.98), rotation: 1 },
            { idString: "cobweb", position: Vec(-14.96, -26.18), rotation: 0 }
        ],
        lootSpawners: IS_CLIENT ? undefined : [{
            table: "graveyard_skins",
            position: Vec(-12, -5)
        }]
    },
    {
        idString: "graveyard_storage",
        name: "Graveyard Storage",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(38.71, 34.71, Vec(0.76, 0.27)),
        floorZIndex: ZIndexes.BuildingsFloor + 0.5,
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(28.52, 26.4, Vec(0.3, 0.16)),
            RectangleHitbox.fromRect(9.52, 10.26, Vec(10.76, 9.22)),
            RectangleHitbox.fromRect(10.2, 1.78, Vec(8.26, -13.2)),
            RectangleHitbox.fromRect(1.55, 10.26, Vec(-14.41, 7.19))
        ),
        ceilingImages: [{
            key: "graveyard_storage_ceiling",
            position: Vec(0, 0),
            scale: Vec(2, 2)
        }],
        floorImages: [{
            key: "graveyard_storage_floor",
            position: Vec(0, 0)
        }],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(30.74, 28.47, Vec(0.13, 0.11))
        }],
        material: "stone",
        particle: "graveyard_basement_entrance_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 17.9, Vec(15.24, -4.82)),
            RectangleHitbox.fromRect(2, 16.85, Vec(-14.92, -6.33)),
            RectangleHitbox.fromRect(2.93, 2.01, Vec(14.77, -13.84)),
            RectangleHitbox.fromRect(21.96, 2, Vec(-4.98, 14.09)),
            RectangleHitbox.fromRect(19.15, 2, Vec(-6.35, -13.85)),
            RectangleHitbox.fromRect(2.01, 1.53, Vec(-14.95, 13.06))
        ),
        obstacles: IS_CLIENT ? undefined : [
            { idString: "aegis_crate", position: Vec(-8.71, -7.68) },
            { idString: "box", position: Vec(-10.84, -0.44) },
            { idString: "door", position: Vec(-14.77, 6.78), rotation: 1 },
            { idString: "door", position: Vec(7.81, -13.79), rotation: 2 },
            { idString: "urn", position: Vec(-0.82, -9.54) }
        ]
    },
    {
        idString: "medical_camp_kitchen",
        name: "Medical Camp Kitchen",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(51.36, 68.56, Vec(-0.15, -0.05)),
        ceilingHitbox: RectangleHitbox.fromRect(43.46, 57.43, Vec(0.51, 0.34)),
        particle: "medical_camp_particle",
        material: "stone",
        graphicsZIndex: ZIndexes.BuildingsFloor + 0.5,
        floorZIndex: ZIndexes.BuildingsFloor + 0.6,
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.04, 57.98, Vec(-22.23, 0.88)),
            RectangleHitbox.fromRect(2.04, 29.8, Vec(22.24, -14.41)),
            RectangleHitbox.fromRect(2.03, 11.14, Vec(22.22, 23.08)),
            RectangleHitbox.fromRect(31.09, 2.04, Vec(7.7, 28.85)),
            RectangleHitbox.fromRect(31.84, 2.03, Vec(-7.35, -28.28))
        ),
        floors: [{
            type: FloorNames.Stone,
            hitbox: RectangleHitbox.fromRect(29.66, 20.05, Vec(-6.39, -17.45))
        }],
        floorImages: [{
            key: "medical_camp_kitchen_floor",
            position: Vec(-0.06, 0.33)
        }],
        ceilingImages: [{
            key: "medical_camp_kitchen_ceiling",
            position: Vec(0, 0.33),
            scale: Vec(2.01, 2)
        }],
        graphics: [{
            color: 0x513c51,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(13.39, 5.2, Vec(-14.53, 29.53)),
                RectangleHitbox.fromRect(13.21, 5.2, Vec(15.07, -29.53))
            )
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "chair", position: Vec(-8.41, 10.91), rotation: 0 },
            { idString: "chair", position: Vec(-0.25, 11.13), rotation: 0 },
            { idString: "chair", position: Vec(-8.27, -1.36), rotation: 2 },
            { idString: "chair", position: Vec(0.26, -1.36), rotation: 2 },
            { idString: "large_table", position: Vec(-4.4, 4.61), rotation: 1 },
            { idString: "box", position: Vec(2.48, 24.88) },
            { idString: "trash_can", position: Vec(-3.33, 24.6) },
            { idString: "gun_case", position: Vec(17.43, -5.37), rotation: 3 },
            { idString: "fridge", position: Vec(-17.19, -15.76), rotation: 1 },
            { idString: "kitchen_unit_1", position: Vec(-10.83, -23.26), rotation: 0 },
            { idString: "kitchen_unit_2", position: Vec(-17.44, -23.73), rotation: 0 },
            { idString: "kitchen_unit_3", position: Vec(-2.85, -23.26), rotation: 0 }
        ]
    },
    {
        idString: "medical_camp_passage",
        name: "Medical Camp Passage",
        defType: DefinitionType.Building,
        floorZIndex: ZIndexes.BuildingsFloor + 0.75,
        material: "metal_heavy",
        reflectBullets: true,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20.47, 25.47, Vec(2.05, -7.74)),
            RectangleHitbox.fromRect(62.19, 21.33, Vec(-0.34, 8.9))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14.64, 16.44, Vec(2.08, -3.22)),
            RectangleHitbox.fromRect(51.31, 15.78, Vec(3.06, 9.18))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.5, 13.22, Vec(10.1, -4.83)),
            RectangleHitbox.fromRect(1.5, 13.21, Vec(-5.97, -4.8)),
            RectangleHitbox.fromRect(17.98, 1.5, Vec(18.34, 1.32)),
            RectangleHitbox.fromRect(17.35, 1.51, Vec(-13.89, 1.3)),
            RectangleHitbox.fromRect(19.24, 1.5, Vec(17.72, 16.81)),
            RectangleHitbox.fromRect(19.17, 1.5, Vec(-13.03, 16.83))
        ),
        floors: [{
            type: FloorNames.Metal,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(15.8, 25.45, Vec(2.1, -4.85)),
                RectangleHitbox.fromRect(57.38, 16.04, Vec(0, 9.05))
            )
        }],
        floorImages: [
            {
                key: "medical_camp_passage_floor_1",
                position: Vec(0.03, 9.06)
            },
            {
                key: "medical_camp_passage_floor_2",
                position: Vec(2, -7.28)
            }
        ],
        ceilingImages: [
            {
                key: "medical_camp_passage_ceiling_1",
                position: Vec(2.37, 9.05),
                scale: Vec(2, 2)
            },
            {
                key: "medical_camp_passage_ceiling_2",
                position: Vec(2.05, -5.2),
                scale: Vec(2, 2.0125)
            }
        ]
    },
    {
        idString: "medical_camp_office",
        name: "Medical Camp Office",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(91.58, 51.63, Vec(0.84, -0.25)),
        ceilingHitbox: RectangleHitbox.fromRect(81.45, 37.44, Vec(-0.59, -0.47)),
        material: "stone",
        particleVariations: 2,
        particle: "medical_camp_particle",
        graphicsZIndex: ZIndexes.BuildingsFloor + 0.5,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(29.09, 2.01, Vec(-27.55, -19.38)),
            RectangleHitbox.fromRect(2.01, 23.05, Vec(-21.24, -7.17)),
            RectangleHitbox.fromRect(8.33, 2.01, Vec(3.11, -19.38)),
            RectangleHitbox.fromRect(22.92, 2.01, Vec(30.67, -19.37)),
            RectangleHitbox.fromRect(2, 26.69, Vec(-41.1, 6.91)),
            RectangleHitbox.fromRect(59.09, 2, Vec(-11.15, 19.25)),
            RectangleHitbox.fromRect(9.97, 2, Vec(36.88, 19.25)),
            RectangleHitbox.fromRect(2.01, 38.97, Vec(41.12, 0.77))
        ),
        graphics: [
            // walls
            { // stroke
                color: 0x5f5f5f,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(29.09, 2.01, Vec(-27.55, -19.38)),
                    RectangleHitbox.fromRect(2.01, 23.05, Vec(-21.24, -7.17)),
                    RectangleHitbox.fromRect(8.33, 2.01, Vec(3.11, -19.38)),
                    RectangleHitbox.fromRect(22.92, 2.01, Vec(30.67, -19.37)),
                    RectangleHitbox.fromRect(2, 26.69, Vec(-41.1, 6.91)),
                    RectangleHitbox.fromRect(59.09, 2, Vec(-11.15, 19.25)),
                    RectangleHitbox.fromRect(9.97, 2, Vec(36.88, 19.25)),
                    RectangleHitbox.fromRect(2.01, 38.97, Vec(41.12, 0.77))
                )
            },
            { // fill
                color: 0xa0a0a0,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(27.82, 1.15, Vec(-27.31, -19.38)),
                    RectangleHitbox.fromRect(1.15, 22.99, Vec(-21.24, -7.57)),
                    RectangleHitbox.fromRect(21.5, 1.15, Vec(30.47, -19.37)),
                    RectangleHitbox.fromRect(59.35, 1.16, Vec(-11.66, 19.25)),
                    RectangleHitbox.fromRect(1.15, 39.17, Vec(41.12, -0.24)),
                    RectangleHitbox.fromRect(7.35, 1.15, Vec(3.11, -19.37)),
                    RectangleHitbox.fromRect(8.55, 1.16, Vec(36.51, 19.25)),
                    RectangleHitbox.fromRect(1.15, 25.34, Vec(-41.1, 6.64))
                )
            },
            // stroke
            {
                color: 0x313131,
                hitbox: new CircleHitbox(0.87, Vec(-41.09, 19.19))
            },
            {
                color: 0x313131,
                hitbox: new CircleHitbox(0.87, Vec(-41.1, -19.38))
            },
            {
                color: 0x313131,
                hitbox: new CircleHitbox(0.87, Vec(41.1, -19.38))
            },
            {
                color: 0x313131,
                hitbox: new CircleHitbox(0.87, Vec(41.09, 19.19))
            },
            // fill
            {
                color: 0x4d4d4d,
                hitbox: new CircleHitbox(0.62, Vec(-41.09, 19.19))
            },
            {
                color: 0x4d4d4d,
                hitbox: new CircleHitbox(0.62, Vec(-41.1, -19.38))
            },
            {
                color: 0x4d4d4d,
                hitbox: new CircleHitbox(0.62, Vec(41.1, -19.38))
            },
            {
                color: 0x4d4d4d,
                hitbox: new CircleHitbox(0.62, Vec(41.09, 19.19))
            }
        ],
        ceilingImages: [{
            key: "medical_camp_office_ceiling",
            position: Vec(0, -0.05),
            scale: Vec(2, 2)
        }],
        floorImages: [
            {
                key: "medical_camp_office_floor",
                position: Vec(-31.22, -0.25)
            },
            {
                key: "gauze_residue",
                position: Vec(-7.25, 2.37),
                rotation: Math.PI / 4,
                zIndex: ZIndexes.Decals
            },
            {
                key: "gauze_residue",
                position: Vec(-4.1, 14.56),
                rotation: -Math.PI,
                zIndex: ZIndexes.Decals
            },
            {
                key: "medikit_residue",
                position: Vec(-6.6, 9.05),
                rotation: -Math.PI * 0.55,
                zIndex: ZIndexes.Decals
            },
            {
                key: "vaccine_syringe_residue",
                position: Vec(17.92, -8.78),
                rotation: Math.PI / 4,
                zIndex: ZIndexes.Decals
            },
            {
                key: "vaccine_syringe_residue",
                position: Vec(18.94, -13.67),
                rotation: -Math.PI / 2,
                zIndex: ZIndexes.Decals
            }
        ],
        floors: [{
            type: FloorNames.Wood,
            hitbox: RectangleHitbox.fromRect(20.42, 36.63, Vec(-31.19, -0.07))
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "aegis_crate", position: Vec(-34.97, 13.15) },
            { idString: "grenade_crate", position: Vec(-25.96, -14.46) },
            { idString: "box", position: Vec(-25.2, -8.1) },
            { idString: "small_drawer", position: Vec(10.54, 13.42), rotation: 2 },
            { idString: "small_drawer", position: Vec(35.35, -1.46), rotation: 3 },
            { idString: "bookshelf", position: Vec(36.7, 9.8), rotation: 3 },
            { idString: "trash_can", position: Vec(-16.67, -7.22) },
            { idString: "potted_plant", position: Vec(-15.35, -14.31), rotation: 0 },
            { idString: "small_medical_bed", position: Vec(2.92, 9.12), rotation: 1 },
            { idString: "large_medical_bed", position: Vec(30.89, -11.37), rotation: 2 }
        ]
    },
    {
        idString: "medical_camp_lab_sub_ceiling",
        name: "Medical Camp Lab Sub-Ceiling",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(64.99, 38.68),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [{
            key: "medical_camp_lab_sub_ceiling",
            position: Vec(0, 0),
            scale: Vec(4.05, 4.07)
        }]
    },
    {
        idString: "medical_camp_lab",
        name: "Medical Camp Laboratory",
        defType: DefinitionType.Building,
        floorZIndex: ZIndexes.BuildingsFloor + 0.8,
        spawnHitbox: RectangleHitbox.fromRect(68.22, 42, Vec(0.13, 0.36)),
        ceilingHitbox: RectangleHitbox.fromRect(59.71, 33.53, Vec(0.28, -0.03)),
        ceilingInfectionUnits: 0.05,
        material: "stone",
        particleVariations: 2,
        particle: "medical_camp_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(61.83, 2.06, Vec(-0.34, -17.72)),
            RectangleHitbox.fromRect(2.03, 23.47, Vec(30.26, -7.03)),
            RectangleHitbox.fromRect(62.57, 2.03, Vec(0, 17.72)),
            RectangleHitbox.fromRect(2.03, 12, Vec(-30.26, -11.28)),
            RectangleHitbox.fromRect(2.04, 11.88, Vec(-30.26, 11.18)),
            RectangleHitbox.fromRect(2, 18.61, Vec(12.2, -7.94))
        ),
        floors: [{
            type: FloorNames.Stone,
            hitbox: RectangleHitbox.fromRect(60.3, 34.63, Vec(0.29, 0.54))
        }],
        floorImages: [{
            key: "medical_camp_lab_floor",
            position: Vec(0, 0)
        }],
        ceilingImages: [{
            key: "medical_camp_lab_ceiling",
            position: Vec(0, 0),
            scale: Vec(2.01, 2)
        }],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "small_medical_bed", position: Vec(-19.46, 11.22), rotation: 0 },
            { idString: "small_medical_bed", position: Vec(6.4, -7.95), rotation: 3 },
            { idString: "propane_tank", position: Vec(26.5, 9.72) },
            { idString: "propane_tank", position: Vec(26.43, 14.16) },
            { idString: "vaccinator_case", position: Vec(21.6, -11.87), rotation: 0 },
            { idString: "aegis_crate", position: Vec(-2.63, -10.98) },
            { idString: "box", position: Vec(-0.74, -3.38) },
            { idString: "baby_plumpkin_infection", position: Vec(-20.07, -13.29), rotation: 0, variation: 0 },
            { idString: "baby_plumpkin_infection", position: Vec(-24.94, -10.36), rotation: 0, variation: 1 },
            { idString: "baby_plumpkin_infection", position: Vec(-7.57, 12.82), rotation: 0, variation: 2 },
            { idString: "infected_wall", position: Vec(30.3, 10.66), rotation: 0 }
        ],
        subBuildings: IS_CLIENT ? undefined : [{
            idString: "medical_camp_lab_sub_ceiling",
            position: Vec(0, -0.15)
        }],
        lootSpawners: IS_CLIENT ? undefined : [{
            table: "medical_camp_skins",
            position: Vec(5, 9)
        }]
    },
    {
        idString: "medical_camp",
        name: "Medical Camp",
        defType: DefinitionType.Building,
        reflectBullets: true,
        particle: "metal_particle",
        material: "metal_heavy",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(6.03, 1.13, Vec(-37.69, 28.73)),
            RectangleHitbox.fromRect(6.03, 1.13, Vec(-37.69, 44.63)),
            RectangleHitbox.fromRect(1.14, 6.15, Vec(-2.01, 13.13)),
            RectangleHitbox.fromRect(1.17, 6.15, Vec(-17.88, 13.13))
        ),
        spawnHitbox: RectangleHitbox.fromRect(177.57, 133.11, Vec(-0.31, -0.71)),
        floorImages: [
            {
                key: "barrel_residue",
                position: Vec(-9.12, 48.21),
                rotation: -Math.PI / 2,
                zIndex: ZIndexes.Decals
            },
            {
                key: "medical_hazel_note",
                position: Vec(-8.51, 5.87),
                rotation: -Math.PI / 4,
                zIndex: ZIndexes.Decals
            }
        ],
        groundGraphics: [
            {
                color: 0x5d455d,
                hitbox: new PolygonHitbox([
                    Vec(-62.27, -58.8),
                    Vec(-82.24, -58),
                    Vec(-83.24, -28),
                    Vec(-83.03, 21),
                    Vec(-82.62, 61.12),
                    Vec(-43.6, 60.07),
                    Vec(-6.43, 59.11),
                    Vec(7.72, 59.29),
                    Vec(20.84, 59.07),
                    Vec(79.63, 57.01),
                    Vec(80.13, 37.49),
                    Vec(80.75, 20.69),
                    Vec(81.1, -3.54),
                    Vec(80.8, -25.49),
                    Vec(80.27, -37.85),
                    Vec(78.72, -56.92),
                    Vec(58.74, -60.07),
                    Vec(51.96, -60.71),
                    Vec(45.55, -61.05),
                    Vec(40.51, -61.24),
                    Vec(32.57, -61.08),
                    Vec(23.4, -60.72),
                    Vec(14.04, -60.33),
                    Vec(-34.27, -58.4)
                ])
            },
            {
                color: 0x584158,
                hitbox: new PolygonHitbox([
                    Vec(-66.22, -48.56),
                    Vec(-67.36, -58.17),
                    Vec(-58.04, -57.89),
                    Vec(-57.04, -49.54),
                    Vec(-54.02, -39.41),
                    Vec(-45.25, -27.33),
                    Vec(-33.89, -17.64),
                    Vec(-24.01, -12.51),
                    Vec(-11.22, -7.58),
                    Vec(5.78, -7.41),
                    Vec(16.78, -7.41),
                    Vec(41.58, -7.14),
                    Vec(54.39, -6.45),
                    Vec(62.16, -5.77),
                    Vec(69.01, -5),
                    Vec(74.99, -3.97),
                    Vec(80.81, -3.59),
                    Vec(80.54, 5.71),
                    Vec(73.65, 5.25),
                    Vec(65.29, 4.04),
                    Vec(51.02, 2.86),
                    Vec(30.95, 2.27),
                    Vec(10.01, 2.11),
                    Vec(-3.63, 2.17),
                    Vec(-4.6, 5.44),
                    Vec(-4.44, 8.39),
                    Vec(-3.82, 13.39),
                    Vec(-15.05, 13.29),
                    Vec(-15.54, 10.81),
                    Vec(-15.96, 8.21),
                    Vec(-16.01, 5.25),
                    Vec(-15.31, 1.09),
                    Vec(-24.43, -2.4),
                    Vec(-31.57, -5.71),
                    Vec(-38.84, -9.71),
                    Vec(-45, -14.69),
                    Vec(-53.09, -21.96),
                    Vec(-59.24, -28.96),
                    Vec(-62.63, -35.44),
                    Vec(-64.63, -41.44)
                ])
            },
            {
                color: 0x513c51,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(61.19, 36.67, Vec(45.69, -36.63)),
                    RectangleHitbox.fromRect(12.46, 5.22, Vec(49.59, -56.99)),
                    RectangleHitbox.fromRect(12.1, 5.22, Vec(29, -57.02)),
                    RectangleHitbox.fromRect(14.22, 5.71, Vec(61.23, -16.34))
                )
            }
        ],
        puzzle: {
            triggerOnSolve: "pink_metal_auto_door",
            delay: 3000,
            setSolvedImmediately: true
        },
        sounds: {
            solved: "medical_camp_alarm",
            position: Vec(46.72, 36.77),
            falloff: 0.95,
            maxRange: 200
        },
        obstacles: IS_CLIENT ? undefined : [
            { idString: "button", position: Vec(-37.63, 51.08), rotation: 3, variation: 2, puzzlePiece: true },
            { idString: "pink_metal_auto_door", position: Vec(16.57, 36.78), rotation: 1, locked: true },
            { idString: "forklift", position: Vec(-48.12, -29.24), rotation: 1, outdoors: true },
            { idString: "grenade_crate", position: Vec(-74.63, -30.15), outdoors: true },
            { idString: "sandbags", position: Vec(-13.61, -33.59), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-52.82, -6), rotation: 1, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-23.38, 15.21), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(10.73, 24.59), rotation: 0, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(3.08, 23.34), rotation: 1, outdoors: true },
            { idString: "box", position: Vec(-65.98, -4.81), outdoors: true },
            { idString: "box", position: Vec(-31.27, 25.19), outdoors: true },
            { idString: "box", position: Vec(-10.41, -26.38), outdoors: true },
            { idString: { box: 1, grenade_box: 0.35 }, position: Vec(-15.8, -25.07), outdoors: true },
            { idString: "box", position: Vec(56.02, 14.01), outdoors: true },
            { idString: "box", position: Vec(50.84, 12.26), outdoors: true },
            { idString: "regular_crate", position: Vec(-73.83, -6.89), outdoors: true },
            { idString: "aegis_crate", position: Vec(-23.66, 23.07), outdoors: true },
            { idString: "regular_crate", position: Vec(43.17, 13.03), outdoors: true },
            { idString: "pallet", position: Vec(-73.6, -39.81), rotation: 1, outdoors: true },
            { idString: "chair", position: Vec(3.46, -9.61), rotation: 2, outdoors: true },
            { idString: "chair", position: Vec(-72.22, -39.22), rotation: 1, outdoors: true },
            { idString: "trash_bag", position: Vec(10.68, -12.59), rotation: 1, outdoors: true },
            { idString: "trash_bag", position: Vec(17.54, -10.91), rotation: 0 },
            { idString: "barrel", position: Vec(-17.07, 50), outdoors: true },
            { idString: "small_medical_bed", position: Vec(-37.67, -29.3), rotation: 1, outdoors: true },
            { idString: "small_medical_bed", position: Vec(33.59, 9.18), rotation: 3, outdoors: true },
            { idString: "baby_plumpkin_infection", position: Vec(74.27, 59.19), rotation: 0, variation: 0, outdoors: true },
            { idString: "baby_plumpkin_infection", position: Vec(81.23, 40.27), rotation: 0, variation: 1, outdoors: true },
            { idString: "baby_plumpkin_infection", position: Vec(80.74, 57.04), rotation: 0, variation: 2, outdoors: true },

            ...Array.from(
                { length: 4 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-10.43 - 8.8 * i, -55.98),
                    rotation: 0
                })
            ),
            ...Array.from(
                { length: 6 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec(-80.07, -50.2 + 8.8 * i),
                    rotation: 1
                })
            ),
            { idString: "fence", position: Vec(77.22, -11.87), rotation: 1 },
            { idString: "fence", position: Vec(77.07, 13.62), rotation: 1 },
            { idString: "metal_column", position: Vec(-42.81, -55.96) },
            { idString: "metal_column", position: Vec(-80.07, -56.03) },
            { idString: "metal_column", position: Vec(77.07, 7.62) },
            { idString: "metal_column", position: Vec(77.22, -5.91) }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: randomPallet, position: Vec(8.46, 50.46) },
            { idString: "medical_camp_office", position: Vec(36.09, -36.55) },
            { idString: "medical_camp_kitchen", position: Vec(-57.9, 27.82) },
            { idString: "medical_camp_passage", position: Vec(-11.95, 27.63) },
            { idString: "medical_camp_lab", position: Vec(46.72, 36.77) }
        ]
    },
    {
        idString: "graveyard_halloween",
        name: "Graveyard",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(161.81, 158.59, Vec(2.61, -3.32)),
        bunkerSpawnHitbox: RectangleHitbox.fromRect(73.2, 78.77, Vec(-17.78, -45.92)),
        // sounds: {
        //     normal: "graveyard_ambience",
        //     position: Vec(0, 0),
        //     maxRange: 300,
        //     falloff: 0.75
        // },
        material: "stone",
        particleVariations: 2,
        particle: "graveyard_particle",
        allowFlyover: FlyoverPref.Always,
        graphicsZIndex: ZIndexes.BuildingsFloor + 0.25,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.6, 33.6, Vec(-36.88, -54.22)),
            RectangleHitbox.fromRect(68.87, 1.6, Vec(37.03, -71.31)),
            RectangleHitbox.fromRect(18.35, 1.6, Vec(-26.99, -71.39)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(-16.37, 46.91)),
            RectangleHitbox.fromRect(3.38, 3.36, Vec(-16.4, -71.32)),
            RectangleHitbox.fromRect(1.61, 45.53, Vec(71.73, -47.89)),
            new CircleHitbox(1.62, Vec(71.73, -71.39)),
            new CircleHitbox(1.62, Vec(-36.87, -71.39)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(1.29, -71.32)),
            RectangleHitbox.fromRect(1.61, 25.1, Vec(71.73, 6.12)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(71.73, -24.46)),
            RectangleHitbox.fromRect(39.19, 1.6, Vec(21.69, 46.91)),
            RectangleHitbox.fromRect(51.32, 1.61, Vec(-43, 46.86)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(71.73, -6.78)),
            RectangleHitbox.fromRect(3.38, 3.37, Vec(1.33, 46.91)),
            RectangleHitbox.fromRect(1.61, 8.08, Vec(-68.97, 29.64)),
            new CircleHitbox(1.62, Vec(-69.15, 46.87)),
            new CircleHitbox(0.8, Vec(-68.97, 33.68)),
            RectangleHitbox.fromRect(8.08, 2.92, Vec(6.04, -24.44)),
            RectangleHitbox.fromRect(2.94, 8.07, Vec(-16.31, -53.25)),
            RectangleHitbox.fromRect(2.93, 8.08, Vec(42.84, 13.43)),
            RectangleHitbox.fromRect(2.93, 8.08, Vec(66.71, -62.5)),
            RectangleHitbox.fromRect(2.93, 8.08, Vec(51.13, -48.76)),
            RectangleHitbox.fromRect(2.93, 8.08, Vec(46.4, 11.81)),
            RectangleHitbox.fromRect(2.93, 8.07, Vec(-31.11, -27.25))
        ),
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.22, 10.42, Vec(39.63, 40.69)),
                    RectangleHitbox.fromRect(10.45, 5.04, Vec(65.53, 17.01)),
                    RectangleHitbox.fromRect(4.05, 10.39, Vec(-71.76, 18.65)),
                    RectangleHitbox.fromRect(10.99, 119.53, Vec(-7.66, -12.39)),
                    RectangleHitbox.fromRect(74.33, 11.26, Vec(34.22, -15.61)),
                    RectangleHitbox.fromRect(25.2, 25.67, Vec(-22.99, 7.4))
                )
            },
            {
                type: FloorNames.Sand,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(107.32, 119.76, Vec(17.69, -11.79)),
                    RectangleHitbox.fromRect(34.72, 21.14, Vec(-52.41, 35.78))
                )
            }
        ],
        floorImages: [
            {
                key: "graveyard_floor_1",
                position: Vec(1.44, 8.39)
            },
            {
                key: "graveyard_floor_2",
                position: Vec(17.15, -51.79)
            }
        ],
        graphics: [
            { // stroke
                color: 0x4d4d4d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.22, 10.42, Vec(39.63, 40.69)),
                    RectangleHitbox.fromRect(10.45, 5.04, Vec(65.53, 17.01)),
                    RectangleHitbox.fromRect(4.05, 10.39, Vec(-71.76, 18.65))
                )
            },
            { // fill
                color: 0x666666,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(3.57, 4.67, Vec(-71.75, 21.26)),
                    RectangleHitbox.fromRect(3.99, 4.64, Vec(39.31, 38.15)),
                    RectangleHitbox.fromRect(4, 4.66, Vec(39.33, 43.31)),
                    RectangleHitbox.fromRect(4.65, 4.1, Vec(62.9, 16.81)),
                    RectangleHitbox.fromRect(4.65, 4.1, Vec(68.07, 16.83)),
                    RectangleHitbox.fromRect(3.57, 4.67, Vec(-71.75, 16.09))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "graveyard_basement_collider_hack", position: Vec(-18, -45.25), rotation: 0, layer: Layer.ToBasement },
            { idString: "dormant_oak_tree", position: Vec(13.57, 60.23) },
            { idString: "dormant_oak_tree", position: Vec(-30.26, 60.23) },
            { idString: "pumpkin", position: Vec(20.08, -32.71) },
            { idString: "pumpkin", position: Vec(56.18, -49.45) },
            { idString: "pumpkin", position: Vec(-26.12, -28) },
            { idString: "pumpkin", position: Vec(62.08, -48.02) },
            { idString: "pumpkin", position: Vec(-20.2, -26.25) },
            { idString: "pumpkin", position: Vec(57.67, -35.37) },
            { idString: "sandbags", position: Vec(33.12, -26.9), rotation: 0 },
            { idString: "sandbags", position: Vec(13.43, -4.85), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(43.88, -25.73), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(64.76, -6.84), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(10.87, 2.27), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(-17.98, -8.98), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec(3.41, -49.91), rotation: 0 },
            { idString: "roadblock", position: Vec(1.77, 9.9), rotation: 0 },
            { idString: "roadblock", position: Vec(1.92, 31.65), rotation: 0 },
            { idString: "roadblock", position: Vec(29.23, -6.78), rotation: 1 },
            { idString: "roadblock", position: Vec(49.33, -6.77), rotation: 1 },
            { idString: "box", position: Vec(-32.44, -67.32) },
            { idString: "box", position: Vec(10.65, -50.05) },
            { idString: "box", position: Vec(15.66, -48.91) },
            { idString: "box", position: Vec(61.17, -62.41) },
            { idString: "box", position: Vec(36.56, -33.7) },
            { idString: "box", position: Vec(56.75, -0.69) },
            { idString: "box", position: Vec(3.76, 0.44) },
            { idString: "box", position: Vec(2.61, -4.77) },
            { idString: "box", position: Vec(14.19, 39.06) },
            { idString: "box", position: Vec(18.77, 42.81) },
            { idString: "pallet", position: Vec(16.4, 41.18), rotation: 0 },
            { idString: "regular_crate", position: Vec(-44.96, -43.25) },
            { idString: "regular_crate", position: Vec(-55.39, -45.88) },
            { idString: "regular_crate", position: Vec(64.57, 1.73) },
            { idString: "grenade_crate", position: Vec(-25.92, -65.88) },
            { idString: "trash_bag", position: Vec(54.64, -62.21), rotation: 1 },
            { idString: "trash_bag", position: Vec(-45.97, 29.43), rotation: 0 },
            { idString: "super_barrel", position: Vec(26.57, 41.73) },
            { idString: "dumpster", position: Vec(-56.86, 30.23), rotation: 3 },
            { idString: "large_coffin", position: Vec(21.61, 20.71), rotation: 2 },
            { idString: "gun_mount_hatchet_bloodstained", position: Vec(-53.94, 21.76), rotation: 2 }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "graveyard_basement", position: Vec(-18, -45.25), layer: Layer.Basement },
            { idString: "graveyard_basement_entrance", position: Vec(12.3, -61.4) },
            { idString: "graveyard_basement_entrance_main", position: Vec(-52.78, -5.94) },
            { idString: "graveyard_storage", position: Vec(56.99, 33.4) }
        ]
    },
    {
        idString: "mansion",
        name: "Mansion",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(160.02, 145.41, Vec(1.97, -0.56)),
        particleVariations: 2,
        material: "stone",
        particle: "mansion_gate_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.65, 19.4, Vec(-56.63, 5.25)),
            RectangleHitbox.fromRect(7.76, 7.76, Vec(68.28, 47.23)),
            RectangleHitbox.fromRect(7.77, 7.76, Vec(-56.68, 18.78)),
            RectangleHitbox.fromRect(7.76, 7.76, Vec(-56.68, 47.3)),
            RectangleHitbox.fromRect(73.06, 1.66, Vec(-16.33, 47.22)),
            RectangleHitbox.fromRect(1.65, 36.46, Vec(68.3, 25.68)),
            RectangleHitbox.fromRect(23.34, 1.66, Vec(52.92, 47.28)),
            new CircleHitbox(1.42, Vec(68.3, 10.65)),
            new CircleHitbox(1.42, Vec(-56.62, -0.87)),
            new CircleHitbox(1.42, Vec(-56.62, 4.85)),
            new CircleHitbox(1.42, Vec(-56.68, 10.57)),
            new CircleHitbox(1.42, Vec(-48.19, 47.28)),
            new CircleHitbox(1.42, Vec(-42.48, 47.33)),
            new CircleHitbox(1.42, Vec(-36.75, 47.33)),
            new CircleHitbox(1.42, Vec(-30.96, 47.22)),
            new CircleHitbox(1.42, Vec(-25.25, 47.26)),
            new CircleHitbox(1.42, Vec(-19.52, 47.26)),
            new CircleHitbox(1.42, Vec(-13.7, 47.26)),
            new CircleHitbox(1.42, Vec(-7.99, 47.29)),
            new CircleHitbox(1.42, Vec(-2.26, 47.3)),
            new CircleHitbox(1.42, Vec(3.51, 47.19)),
            new CircleHitbox(1.42, Vec(9.23, 47.22)),
            new CircleHitbox(1.42, Vec(14.95, 47.21)),
            new CircleHitbox(1.42, Vec(20.19, 47.21)),
            new CircleHitbox(1.42, Vec(43.14, 47.18)),
            new CircleHitbox(1.42, Vec(48.84, 47.18)),
            new CircleHitbox(1.42, Vec(54.32, 47.21)),
            new CircleHitbox(1.42, Vec(60.04, 47.22)),
            new CircleHitbox(1.42, Vec(68.3, 39.21)),
            new CircleHitbox(1.42, Vec(68.3, 33.5)),
            new CircleHitbox(1.42, Vec(68.3, 27.95)),
            new CircleHitbox(1.42, Vec(68.3, 22.22)),
            new CircleHitbox(1.42, Vec(68.3, 16.38))
        ),
        floorImages: [
            {
                key: "mansion_gate",
                position: Vec(35.5, 57),
                zIndex: ZIndexes.Decals,
                rotation: -Math.PI / 1.34,
                tint: 0x858585
            },
            {
                key: "mansion_gate",
                position: Vec(-61.5, 37),
                rotation: Math.PI / 4.1
            },
            {
                key: "mansion_gate_wall_1",
                position: Vec(-56.65, 5.26)
            },
            {
                key: "mansion_gate_wall_2",
                position: Vec(68.25, 25.31)
            },
            {
                key: "mansion_gate_wall_3",
                position: Vec(52.8, 47.26)
            },
            {
                key: "mansion_gate_wall_4",
                position: Vec(-15.6, 47.27)
            },
            {
                key: "mansion_gate_corner",
                position: Vec(-56.64, 47.3)
            },
            {
                key: "mansion_gate_corner",
                position: Vec(-56.64, 18.79)
            },
            {
                key: "mansion_gate_corner",
                position: Vec(68.31, 47.23)
            },
            {
                key: "blood_decal",
                position: Vec(-35.66, 22.86),
                zIndex: ZIndexes.Decals
            },
            {
                key: "blood_decal",
                position: Vec(-37.5, 17.34),
                rotation: Math.PI,
                zIndex: ZIndexes.Decals
            },
            {
                key: "blood_decal",
                position: Vec(-42.31, 19.92),
                rotation: Math.PI / 5,
                zIndex: ZIndexes.Decals
            },
            {
                key: "blood_decal",
                position: Vec(-45.75, 12.61),
                rotation: Math.PI / 5,
                zIndex: ZIndexes.Decals
            },
            {
                key: "blood_decal",
                position: Vec(-46.98, 6.41),
                rotation: Math.PI / 2.5,
                zIndex: ZIndexes.Decals
            },
            {
                key: "blood_decal",
                position: Vec(-40.06, 11.88),
                rotation: -Math.PI / 1.5,
                zIndex: ZIndexes.Decals
            },
            {
                key: "blood_decal",
                position: Vec(-32.3, 17.51),
                rotation: Math.PI / 1.1,
                zIndex: ZIndexes.Decals
            },
            {
                key: "mansion_gate_residue",
                position: Vec(66.8, 3.46)
            }
        ],
        floors: [
            {
                type: FloorNames.Sand,
                hitbox: new GroupHitbox(
                    new CircleHitbox(2.08, Vec(-13.52, 29.28)),
                    new CircleHitbox(2.2, Vec(-7.54, 26.56)),
                    new CircleHitbox(1.55, Vec(25.45, 33.07)),
                    new CircleHitbox(1.62, Vec(-4.72, 30.75)),
                    new CircleHitbox(2.07, Vec(-8.62, 32.44)),
                    new CircleHitbox(2.07, Vec(-7.47, 36.09)),
                    new CircleHitbox(2.19, Vec(19.5, 31.61)),
                    new CircleHitbox(1.55, Vec(15.8, 31.17)),
                    new CircleHitbox(1.55, Vec(20.4, 35.51))
                )
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec(-18.84, 26.46),
                    Vec(-13.8, 25.54),
                    Vec(-10.91, 38.99),
                    Vec(-18.91, 39.99),
                    Vec(-27.21, 40.77),
                    Vec(-33.41, 41.04),
                    Vec(-57.97, 41.16),
                    Vec(-58.13, 28.1),
                    Vec(-41.22, 27.92),
                    Vec(-32.29, 27.7),
                    Vec(-24.33, 27.28)
                ])
            }
        ],
        groundGraphics: [
            {
                color: 0x221c0e,
                hitbox: new CircleHitbox(2.08, Vec(-13.52, 29.28))
            },
            {
                color: 0x221c0e,
                hitbox: new CircleHitbox(2.2, Vec(-7.54, 26.56)),
            },
            {
                color: 0x221c0e,
                hitbox: new CircleHitbox(1.55, Vec(25.45, 33.07)),
            },
            {
                color: 0x221c0e,
                hitbox: new CircleHitbox(1.62, Vec(-4.72, 30.75)),
            },
            {
                color: 0x221c0e,
                hitbox: new CircleHitbox(2.07, Vec(-8.62, 32.44)),
            },
            {
                color: 0x221c0e,
                hitbox: new CircleHitbox(2.07, Vec(-7.47, 36.09)),
            },
            {
                color: 0x221c0e,
                hitbox: new CircleHitbox(2.19, Vec(19.5, 31.61)),
            },
            {
                color: 0x221c0e,
                hitbox: new CircleHitbox(1.55, Vec(15.8, 31.17)),
            },
            {
                color: 0x221c0e,
                hitbox: new CircleHitbox(1.55, Vec(20.4, 35.51))
            },
            {
                color: 0x221c0e,
                hitbox: new PolygonHitbox([
                    Vec(-18.84, 26.46),
                    Vec(-13.8, 25.54),
                    Vec(-10.91, 38.99),
                    Vec(-18.91, 39.99),
                    Vec(-27.21, 40.77),
                    Vec(-33.41, 41.04),
                    Vec(-57.97, 41.16),
                    Vec(-58.13, 28.1),
                    Vec(-41.22, 27.92),
                    Vec(-32.29, 27.7),
                    Vec(-24.33, 27.28)
                ])
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "regular_crate", position: Vec(-32.34, 2.16), outdoors: true },
            { idString: "regular_crate", position: Vec(-22.36, 4.95), outdoors: true },
            { idString: "regular_crate", position: Vec(58.35, 39.42), outdoors: true },
            { idString: "box", position: Vec(-14.43, -0.55), outdoors: true },
            { idString: "box", position: Vec(50.41, 42.27), outdoors: true },
            { idString: "box", position: Vec(48.73, 36.88), outdoors: true },
            { idString: { box: 1, grenade_box: 0.38 }, position: Vec(-11.88, 4.74), outdoors: true },
            { idString: "smaller_sandbags", position: Vec(-0.33, 40.95), rotation: 1, outdoors: true },
            { idString: "smaller_sandbags", position: Vec(62.41, 27.91), rotation: 0, outdoors: true },
            { idString: "small_coffin", position: Vec(-10.73, 40.96), rotation: 0, outdoors: true },
            { idString: "jack_o_lantern", position: Vec(6.6, 17.78), rotation: 0, outdoors: true },
            { idString: "jack_o_lantern", position: Vec(35.22, 18.09), rotation: 0, outdoors: true },
            { idString: "jack_o_lantern", position: Vec(-15.08, -55.77), rotation: 3, outdoors: true },
            { idString: "pebble", position: Vec(-26.46, 32.68), rotation: 3, variation: 2 },
            { idString: "pebble", position: Vec(-41.62, 36.47), rotation: 2, variation: 2 },
            { idString: "pebble", position: Vec(19.25, 31.66), rotation: 2, variation: 2 },
            { idString: "pebble", position: Vec(-51.49, 32.69), rotation: 0, variation: 1 },
            { idString: "pebble", position: Vec(-30.69, 37.72), rotation: 1, variation: 1 },
            { idString: "pebble", position: Vec(-18.58, 29.04), rotation: 3, variation: 1 },
            { idString: "graveyard_light", position: Vec(6.18, 41.65) },
            { idString: "graveyard_light", position: Vec(-48.8, 18.85) },
            { idString: "graveyard_light", position: Vec(62.47, 21.57) },
            { idString: "graveyard_light", position: Vec(66.71, -55.61) }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "mansion_bottom_floor", position: Vec(6.96, -21.13) }
        ]
        
        // -----------------------
        // CONSTRUCTION GUIDE
        // -----------------------
        // "mansion" -> main gate, parent building
        // "mansion_bottom_floor", "mansion_top_floor" sub buildings
    },
    {
        idString: "mansion_bottom_floor",
        name: "Mansion (Bottom Floor)",
        defType: DefinitionType.Building,
        collideWithLayers: Layers.Equal,
        hasSecondFloor: true,
        ceilingZIndex: ZIndexes.BuildingsCeiling + 0.6,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(95.34, 106.28, Vec(25.99, -0.77)),
            RectangleHitbox.fromRect(56.03, 55.45, Vec(-42.38, -5.85))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(57.34, 41.38, Vec(-36.68, -5.97)),
            RectangleHitbox.fromRect(56.15, 74.3, Vec(14.07, -5.87)),
            RectangleHitbox.fromRect(24.19, 45.93, Vec(53.18, -6.37)),
            RectangleHitbox.fromRect(18.53, 15.08, Vec(14.05, 37.48))
        ),
        material: "stone",
        particle: "mansion_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.03, 44.99, Vec(-66.21, -6.02)),
            RectangleHitbox.fromRect(24.24, 2.01, Vec(-3.11, -44.02)),
            RectangleHitbox.fromRect(21.92, 2.01, Vec(-56.27, -27.61)),
            RectangleHitbox.fromRect(2.01, 18.25, Vec(-15.01, -35.9)),
            RectangleHitbox.fromRect(21.23, 2, Vec(-24.61, -27.59)),
            RectangleHitbox.fromRect(24.38, 2.01, Vec(31.29, -44.02)),
            RectangleHitbox.fromRect(2, 16.5, Vec(43.14, -36.78)),
            RectangleHitbox.fromRect(12.65, 2.01, Vec(60.65, -29.5)),
            RectangleHitbox.fromRect(2, 48.67, Vec(66.22, -6.17)),
            RectangleHitbox.fromRect(7.24, 2.01, Vec(63.6, 17.58)),
            RectangleHitbox.fromRect(7.75, 2, Vec(46.04, 17.55)),
            RectangleHitbox.fromRect(2.01, 15.25, Vec(43.16, 25.03)),
            RectangleHitbox.fromRect(25.05, 2.01, Vec(-3.49, 32.14)),
            RectangleHitbox.fromRect(25.04, 2, Vec(31.64, 32.07)),
            RectangleHitbox.fromRect(2.01, 16.47, Vec(-15.01, 22.91)),
            RectangleHitbox.fromRect(33.27, 2.01, Vec(-31.14, 15.66)),
            RectangleHitbox.fromRect(9.44, 2, Vec(-62.52, 15.66))
        ),
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(22.75, 26.67, Vec(-25.98, 1.66)),
                    RectangleHitbox.fromRect(10.37, 4.01, Vec(49.32, -31.95)),
                    RectangleHitbox.fromRect(10.37, 3.74, Vec(14.08, -46.82))
                )
            },
            {
                type: FloorNames.Carpet,
                hitbox: RectangleHitbox.fromRect(16.46, 89.08, Vec(14.1, -0.49))
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(56.28, 74.47, Vec(13.96, -5.85)),
                    RectangleHitbox.fromRect(25.16, 46.37, Vec(52.74, -6.58)),
                    RectangleHitbox.fromRect(51.61, 41.7, Vec(-39.52, -5.83)),
                    RectangleHitbox.fromRect(18.32, 4.67, Vec(14.02, 46.36)),
                    RectangleHitbox.fromRect(18.58, 11.5, Vec(14.03, 38.27))
                )
            }
        ],
        floorImages: [
            {
                key: "mansion_bottom_floor_4",
                position: Vec(14.12, 40.11)
            },
            {
                key: "mansion_bottom_floor_1",
                position: Vec(-40.95, -6.06)
            },
            {
                key: "mansion_bottom_floor_2",
                position: Vec(14.09, -5.96)
            },
            {
                key: "mansion_bottom_floor_3",
                position: Vec(55.54, -5.25)
            }
        ],
        ceilingImages: [
            {
                key: "mansion_ceiling_1",
                position: Vec(-41.44, -6.01),
                scale: Vec(2, 2)
            },
            {
                key: "mansion_ceiling_3",
                position: Vec(55.62, -5.98),
                scale: Vec(2, 2.05)
            },
            {
                key: "mansion_ceiling_4",
                position: Vec(14.13, 39.39),
                scale: Vec(2, 2)
            },
            {
                key: "mansion_ceiling_2",
                position: Vec(14.07, -6.14),
                scale: Vec(2, 2)
            }
        ],
        groundGraphics: [
            { // stroke
                color: 0x2d2d2d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.39, 4, Vec(49.32, -31.95)),
                    RectangleHitbox.fromRect(10.4, 3.72, Vec(14.06, -46.82))
                )
            },
            { // fill
                color: 0x4e4e4e,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.65, 3.76, Vec(16.62, -46.53)),
                    RectangleHitbox.fromRect(4.65, 3.94, Vec(51.87, -31.71)),
                    RectangleHitbox.fromRect(4.65, 3.76, Vec(11.45, -46.53)),
                    RectangleHitbox.fromRect(4.65, 3.94, Vec(46.71, -31.71))
                )
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "mansion_bottom_floor_colliders", position: Vec(0, 0), rotation: 0 },
            { idString: "mansion_collider_hack", position: Vec(0, 0), rotation: 0, layer: Layer.ToUpstairs },
            { idString: "mansion_stair", position: Vec(-59.76, -4.31), rotation: 0, layer: Layer.ToUpstairs },
            { idString: "mansion_damaged_wall_1", position: Vec(-15.14, 10.66), rotation: 0 },
            { idString: "mansion_damaged_wall_2", position: Vec(-15.14, -4.96), rotation: 0 },
            { idString: "cobweb", position: Vec(-9.19, 26.33), rotation: 1 },
            { idString: "cobweb", position: Vec(-60.35, -21.76), rotation: 0 },
            { idString: "bookshelf", position: Vec(6.26, 0.08), rotation: 1 },
            { idString: "bookshelf", position: Vec(21.78, -9.78), rotation: 3 },
            { idString: "bookshelf", position: Vec(-48.98, -5.13), rotation: 1 },
            { idString: "bookshelf", position: Vec(-26.4, -24.23), rotation: 0 },
            { idString: "small_drawer", position: Vec(-9.95, 26.79), rotation: 2 },
            { idString: "small_drawer", position: Vec(38.15, -38.85), rotation: 0 },
            { idString: "small_drawer", position: Vec(48.26, 0.42), rotation: 0 },
            { idString: "large_drawer", position: Vec(60.65, -13.47), rotation: 3 }, // diddy drawer
            { idString: "potted_plant", position: Vec(61.06, -24.56), rotation: 0 },
            { idString: "potted_plant", position: Vec(26.82, 26.71), rotation: 0 },
            { idString: "small_bed", position: Vec(60.73, 4.92), rotation: 2 },
            { idString: "trash_can", position: Vec(31.6, -39.62) },
            { idString: "trash_can", position: Vec(-19.79, -7.23) },
            { idString: "trash_can",  position: Vec(-2.68, 27.29) },
            { idString: {
                white_small_couch: 1,
                red_small_couch: 1
            }, position: Vec(36.3, 26.3), rotation: 2 },
            { idString: "window", position: Vec(-52.77, 15.66), rotation: 1 },
            { idString: "window", position: Vec(-40.3, -27.62), rotation: 1 },
            { idString: "window", position: Vec(54.98, 17.49), rotation: 1 },
            { idString: "door", position: Vec(14.53, 32.1), rotation: 0 },
            { idString: "door", position: Vec(13.53, -44.14), rotation: 2 },
            { idString: "door", position: Vec(49.7, -29.54), rotation: 0 },
            { idString: "door", position: Vec(43.13, 10.96), rotation: 1 },
            { idString: "fridge", position: Vec(-21.49, 10.63), rotation: 2 },
            { idString: randomStove, position: Vec(-31.05, 10.57), rotation: 2 },
            { idString: "box", position: Vec(-61.74, 11.12) },
            { idString: "box", position: Vec(-56.27, 7.98) },
            { idString: "box", position: Vec(-17.36, -24.01) },
            { idString: { box: 1, grenade_box: 0.35 }, position: Vec(-62.28, -23.63) },
            { idString: "box", position: Vec(46.41, -8.89) },
            { idString: "couch", position: Vec(-5.04, -38.04), rotation: 3 },
            { idString: "round_table", position: Vec(-5.2, -31.62), rotation: 0 },
            { idString: "mansion_column", position: Vec(-15.02, -10.2) },
            { idString: "mansion_column", position: Vec(6.36, 8.36) },
            { idString: "mansion_column", position: Vec(21.79, 8.36) },
            { idString: "mansion_column", position: Vec(6.36, -17.94) },
            { idString: "mansion_column", position: Vec(21.79, -17.87) },
            { idString: "mansion_column", position: Vec(-53.14, -12.27) },
            { idString: "mansion_column", position: Vec(6.25, 44.28) },
            { idString: "mansion_column", position: Vec(21.92, 44.28) },
            { idString: "mansion_wall_1", position: Vec(43.16, 0.09), rotation: 0 },
            { idString: "mansion_wall_2", position: Vec(54.64, -5.12), rotation: 0 },
            { idString: "graveyard_light", position: Vec(-40.25, 11.05) },
            { idString: "graveyard_light", position: Vec(14.33, -10.84) },
            { idString: "graveyard_light", position: Vec(14.38, 3.21) }
        ],
        subBuildings: IS_CLIENT ? undefined : [
            { idString: "mansion_top_floor_shadow", position: Vec(-39.65, -6.02) },
            { idString: "mansion_top_floor", position: Vec(-40.5, -6.02), layer: Layer.Upstairs }
        ],
        lootSpawners: IS_CLIENT ? undefined : [{
            table: "mansion_skin",
            position: Vec(14.25, -5)
        }]
    },
    {
        idString: "mansion_top_floor_shadow",
        name: "Mansion (Top Floor) Shadow",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(51.25, 41.27),
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
        ceilingImages: [{
            key: "mansion_top_floor_shadow",
            position: Vec(0, 0),
            scale: Vec(4, 4)
        }]
    },
    {
        idString: "mansion_top_floor",
        name: "Mansion (Top Floor)",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(58.65, 52),
        ceilingHitbox: RectangleHitbox.fromRect(49.2, 41.38, Vec(-0.13, 0.04)),
        material: "stone",
        particle: "mansion_particle",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.02, 44.43, Vec(-25.67, -0.24)),
            RectangleHitbox.fromRect(53.22, 2, Vec(-0.06, 21.63)),
            RectangleHitbox.fromRect(53.22, 2, Vec(-0.06, -21.64))
        ),
        floorImages: [{
            key: "mansion_top_floor",
            position: Vec(0, 0)
        }],
        ceilingImages: [
            {
                key: "mansion_ceiling_1",
                position: Vec(-1, 0),
                scale: Vec(2, 2)
            },
            {
                key: "mansion_ceiling_2",
                position: Vec(54.5, 0),
                scale: Vec(2, 2)
            }
        ],
        floors: [
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(16.05, 14.78, Vec(-3.58, -13.26))
            },
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(48.83, 12.24, Vec(-0.01, 14.52)),
                    RectangleHitbox.fromRect(35.94, 29.19, Vec(6.43, -6.05)),
                    RectangleHitbox.fromRect(11.09, 13.51, Vec(-19.11, 1.65))
                )
            },
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(11.09, 13.51, Vec(-19.11, 1.65)),
                layer: Layer.ToUpstairs
            }
        ],
        obstacles: IS_CLIENT ? undefined : [
            { idString: "mansion_top_floor_colliders", position: Vec(0, 0), rotation: 0 },
            { idString: "bed", position: Vec(17.89, 12.02), rotation: 2 },
            { idString: "gun_case", position: Vec(-5.75, -1.22), rotation: 0 },
            { idString: "gun_case", position: Vec(20.36, -14.35), rotation: 3 },
            { idString: { box: 1, grenade_box: 0.35 }, position: Vec(-8.3, 5.15) },
            { idString: "box", position: Vec(-3.19, 4.2) },
            { idString: randomToilet, position: Vec(-6.43, -13.28), rotation: 1 },
            { idString: "trash_can", position: Vec(20.14, -5.69) },
            { idString: "cobweb", position: Vec(-6.78, -15.8), rotation: 0 },
            { idString: "mansion_column", position: Vec(3.36, -5.81) },
            { idString: "mansion_column", position: Vec(-12.59, -6.25) },
            { idString: "mansion_wall_3", position: Vec(-4.84, -5.75), rotation: 0 },
            { idString: {
                gun_mount_scythe: 0.95,
                gun_mount_chainsaw_leatherfaced: 0.05
            }, position: Vec(10.83, -18.86), rotation: 0, lootSpawnOffset: Vec(0, 2.5) },
            { idString: "graveyard_light", position: Vec(7.14, 16.71) },
            { idString: "graveyard_light", position: Vec(11.2, -11.56) }
        ]
    },
    {
        idString: "park",
        name: "Park",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(90, 90),
        obstacles: IS_CLIENT ? undefined : [
            { idString: "cabin_fence", position: Vec(29.63, -41.86), rotation: 0 },
            { idString: "cabin_fence", position: Vec(-29.63, -41.86), rotation: 0 },
            { idString: "cabin_fence", position: Vec(29.63, 41.86), rotation: 0 },
            { idString: "cabin_fence", position: Vec(-29.63, 41.86), rotation: 0 },
            { idString: "cabin_fence", position: Vec(-42.15, -29.49), rotation: 1 },
            { idString: "cabin_fence", position: Vec(42.15, 29.49), rotation: 1 },
            { idString: "cabin_fence", position: Vec(-42.15, 29.49), rotation: 1 },
            { idString: "cabin_fence", position: Vec(42.15, -29.49), rotation: 1 },
            { idString: "park_column", position: Vec(42.15, -41.86) },
            { idString: "park_column", position: Vec(-42.15, -41.86) },
            { idString: "park_column", position: Vec(-42.15, 41.86) },
            { idString: "park_column", position: Vec(42.15, 41.86) },
            { idString: "park_column", position: Vec(42.15, -41.86) },
            { idString: "park_column", position: Vec(-42.15, -41.86) },
            { idString: "park_column", position: Vec(42.15, 17.13) },
            { idString: "park_column", position: Vec(-42.15, 17.13) },
            { idString: "park_column", position: Vec(-42.15, -17.13) },
            { idString: "park_column", position: Vec(42.15, -17.13) },
            { idString: "park_column", position: Vec(-17.2, -41.86) },
            { idString: "park_column", position: Vec(17.2, -41.86) },
            { idString: "park_column", position: Vec(-17.2, 41.86) },
            { idString: "park_column", position: Vec(17.2, 41.86) },
            { idString: "park_column", position: Vec(10, -10) },
            { idString: "park_column", position: Vec(-10, -10) },
            { idString: "park_column", position: Vec(10, 10) },
            { idString: "park_column", position: Vec(-10, 10) },
            { idString: "dormant_oak_tree", position: Vec(-27.6, -28.02) },
            { idString: "regular_crate", position: Vec(-35.59, -35.15), outdoors: true },
            { idString: "regular_crate", position: Vec(23.98, -35.51), outdoors: true },
            { idString: {
                regular_crate: 1,
                aegis_crate: 0.5,
                flint_crate: 0.5
            }, position: Vec(-2.38, 0.49), outdoors: true },
            { idString: randomBarrel, position: Vec(-35.65, 22.49), outdoors: true },
            { idString: "barrel", position: Vec(26.58, -23.47), outdoors: true },
            { idString: "dead_pine_tree", position: Vec(31.57, -27.86) },
            { idString: {
                pumpkin: 1,
                large_pumpkin: 0.25
            }, position: Vec(15.65, -9.2), outdoors: true },
            { idString: {
                dead_pine_tree: 1,
                dormant_oak_tree: 1
            }, position: Vec(-29.29, 31.79) },
            { idString: {
                pumpkin: 1,
                box: 0.65
            }, position: Vec(-32.89, -21.25), outdoors: true },
            { idString: "box", position: Vec(-27.79, -37.59), outdoors: true },
            { idString: "box", position: Vec(-37.65, 37.34), outdoors: true },
            { idString: "pumpkin", position: Vec(32.91, -37.64), outdoors: true },
            { idString: "pumpkin", position: Vec(37.94, -33.63), outdoors: true },
            { idString: "large_pumpkin", position: Vec(34.42, 34.94), outdoors: true },
            { idString: "chair", position: Vec(35.97, -19.67), rotation: 1, outdoors: true },
            { idString: "chair", position: Vec(-19.34, 35.87), rotation: 0, outdoors: true },
            { idString: "rock", position: Vec(35.23, 24.66), outdoors: true },
            { idString: "rock", position: Vec(-24.33, 24.46), outdoors: true },
            { idString: {
                grenade_crate: 0.8,
                campsite_crate: 0.2,
                melee_crate: 0.1
            }, position: Vec(24, 36), outdoors: true },
            { idString: {
                box: 1,
                grenade_box: 0.35,
                campsite_crate: 0.85
            }, position: Vec(-21.52, -19.78), outdoors: true },
            { idString: "vibrant_bush", position: Vec(-19.35, -29.88), outdoors: true },
            { idString: "vibrant_bush", position: Vec(25.76, 19.72), outdoors: true },
            { idString: randomTree, position: Vec(-3.39, 16.91), outdoors: true },
            { idString: randomTree, position: Vec(4.9, -15.27), outdoors: true },
            { idString: randomTree, position: Vec(-26.94, 0.63), outdoors: true },
            { idString: "hay_bale", position: Vec(9.1, -37.96), rotation: 0, outdoors: true },
            { idString: "hay_bale", position: Vec(-9.44, 37.98), rotation: 0, outdoors: true },
        ],
        lootSpawners: IS_CLIENT ? undefined : [{
            table: "ground_loot",
            position: Vec(30.15, 1.31)
        }]
    }
]);
