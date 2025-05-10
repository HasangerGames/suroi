import { FlyoverPref, Layers, MapObjectSpawnMode, RotationMode, ZIndexes } from "../constants";
import { type Orientation, type Variation } from "../typings";
import { CircleHitbox, GroupHitbox, PolygonHitbox, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { DefinitionType, ObjectDefinitions, type ObjectDefinition, type ReferenceOrRandom, type ReferenceTo } from "../utils/objectDefinitions";
import { pickRandomInArray, random, randomBoolean } from "../utils/random";
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
    readonly waterOverlay?: boolean
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
    readonly damaged?: string
    readonly alpha?: number
    readonly hideOnDead?: boolean
}

interface BuildingGraphicsDefinition {
    readonly color: number | `#${string}`
    readonly hitbox: Hitbox
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
    readonly spawnOrientation?: Orientation
    readonly spawnOffset?: Vector

    readonly bridgeHitbox?: Hitbox
    readonly bridgeMinRiverWidth?: number

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
    defType: DefinitionType.Building,
    spawnHitbox: RectangleHitbox.fromRect(63.07, 114),
    obstacles
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
        case "damaged_reversed": // thanks designers
            upperCeilingImage = "container_ceiling_6";
            lowerCeilingImage = "container_ceiling_7";
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 8, Vec.create(-6.1, 10)),
                RectangleHitbox.fromRect(1.85, 8, Vec.create(-6.1, -10)),
                RectangleHitbox.fromRect(1.85, 28, Vec.create(6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, Vec.create(0, -13.07))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 7.05, Vec.create(-6.1, 10)),
                RectangleHitbox.fromRect(0.91, 7.05, Vec.create(-6.1, -10)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec.create(6.1, 0)),
                RectangleHitbox.fromRect(13.05, 0.91, Vec.create(0, -13.07))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, Vec.create(0, 2));
            break;
        case "damaged":
            upperCeilingImage = "container_ceiling_6";
            lowerCeilingImage = "container_ceiling_7";
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 8, Vec.create(6.1, 10)),
                RectangleHitbox.fromRect(1.85, 8, Vec.create(6.1, -10)),
                RectangleHitbox.fromRect(1.85, 28, Vec.create(-6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, Vec.create(0, -13.07))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 7.05, Vec.create(6.1, 10)),
                RectangleHitbox.fromRect(0.91, 7.05, Vec.create(6.1, -10)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec.create(-6.1, 0)),
                RectangleHitbox.fromRect(13.05, 0.91, Vec.create(0, -13.07))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, Vec.create(0, 2));
            break;
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
        case "closed_damaged":
        case "gas_can":
            upperCeilingImage = "container_ceiling_8";
            lowerCeilingImage = "container_ceiling_9";
            hitbox = new GroupHitbox(
                RectangleHitbox.fromRect(1.85, 8, Vec.create(-6.1, 10)),
                RectangleHitbox.fromRect(1.85, 8, Vec.create(-6.1, -10)),
                RectangleHitbox.fromRect(1.85, 28, Vec.create(6.1, 0)),
                RectangleHitbox.fromRect(14, 1.85, Vec.create(0, -13.07)),
                RectangleHitbox.fromRect(14, 1.85, Vec.create(0, 13.07))
            );
            wallHitbox = new GroupHitbox(
                RectangleHitbox.fromRect(0.91, 7.05, Vec.create(-6.1, 10)),
                RectangleHitbox.fromRect(0.91, 7.05, Vec.create(-6.1, -10)),
                RectangleHitbox.fromRect(0.91, 27.05, Vec.create(6.1, 0)),
                RectangleHitbox.fromRect(13.05, 0.91, Vec.create(0, -13.07)),
                RectangleHitbox.fromRect(13.05, 0.91, Vec.create(0, 13.07))
            );
            spawnHitbox = RectangleHitbox.fromRect(16, 34.9, Vec.create(0, 2));
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
                position: Vec.create(0, -6.97),
                ...(variant === "damaged_reversed" ? { scale: Vec.create(-1, 1) } : {}),
                tint
            },
            {
                key: lowerCeilingImage,
                position: Vec.create(-0.04, 6.97),
                ...(variant === "damaged_reversed" ? { scale: Vec.create(-1, 1) } : {}),
                rotation: Math.PI,
                tint
            },
            ...(variant === "gas_can"
                ? [
                    {
                        key: "fire_danger_symbol",
                        position: Vec.create(0, 0),
                        rotation: -Math.PI / 4
                    },
                    {
                        key: "danger_tape",
                        position: Vec.create(0, -10.1)
                    },
                    {
                        key: "danger_tape",
                        position: Vec.create(0, 10.1)
                    }
                ]
                : []),
            ...(color.includes("military")
                ? [
                    {
                        key: "nsd_logo_cont",
                        position: Vec.create(0, 0),
                        scale: Vec.create(2, 2),
                        tint
                    },
                    {
                        key: "danger_tape",
                        position: Vec.create(0, -10.1),
                        scale: Vec.create(-1, 1),
                        alpha: 0.5,
                        tint: 0xff9500
                    },
                    {
                        key: "danger_tape",
                        position: Vec.create(0, 10.1),
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
                    position: Vec.create(-4, 0),
                    scale: Vec.create(0.5, 0.5),
                    alpha: 0.8
                }]
            }
            : {}),
        ...(
            closed
                ? {}
                : variant === "gas_can"
                    ? {
                        lootSpawners: [
                            {
                                position: Vec.create(0, -8.5),
                                table: "gas_can"
                            }
                        ]
                    }
                    : color.includes("military")
                        ? {
                            lootSpawners: [
                                {
                                    position: Vec.create(0, 0),
                                    table: "airdrop_guns"
                                },
                                {
                                    position: Vec.create(0, 0),
                                    table: "military_container_skins"
                                }
                            ]
                        }
                        : {
                            lootSpawners: [
                                {
                                    position: Vec.create(0, 0),
                                    table: "ground_loot"
                                }
                            ]
                        }
        ),
        ...(variant === "gas_can"
            ? {
                obstacles: [
                    { idString: "propane_tank", position: Vec.create(3, 10) },
                    { idString: "propane_tank", position: Vec.create(-3, 10) }
                ]
            }
            : {})
    } as const;
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
            RectangleHitbox.fromRect(1.55, 15.05, Vec.create(-6.59, 12.28)),
            RectangleHitbox.fromRect(1.55, 15.05, Vec.create(-6.6, -12.3)),
            RectangleHitbox.fromRect(1.61, 39.65, Vec.create(6.6, 0)),
            RectangleHitbox.fromRect(12.93, 1.6, Vec.create(0.07, -19.01))
        )
        : new GroupHitbox(
            RectangleHitbox.fromRect(1.55, 15.05, Vec.create(-6.59, 12.28)),
            RectangleHitbox.fromRect(1.55, 15.05, Vec.create(6.59, 12.28)),
            RectangleHitbox.fromRect(1.55, 15.05, Vec.create(-6.59, -12.28)),
            RectangleHitbox.fromRect(1.55, 15.05, Vec.create(6.59, -12.28)),
            RectangleHitbox.fromRect(12.93, 1.6, Vec.create(0.07, -19.01))
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
            position: Vec.create(0, 0),
            scale: Vec.create(2, 2),
            tint
        }],
        ceilingImages: [{
            key: `truck_container_ceiling_${model}`,
            position: Vec.create(0, 0),
            scale: Vec.create(2, 2),
            tint
        }],
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(12, 38.3, Vec.create(0.07, 0.67)),
            RectangleHitbox.fromRect(14.77, 9.54, Vec.create(0, 0))
        ),
        floors: [{
            type: FloorNames.Metal,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(12, 38.3, Vec.create(0.07, 0.67)),
                RectangleHitbox.fromRect(14.77, 9.54, Vec.create(0, 0))
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
        spawnHitbox: RectangleHitbox.fromRect(25, 60, Vec.create(0, 6)),
        obstacles: [
            { idString: "truck_front", position: Vec.create(0, -11.5), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(-7.15, 30.81), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(7.15, 30.81), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(7.15, 24.71), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(-7.15, 24.71), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(-7.15, -0.5), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(7.15, -0.5), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(-7.15, 5.84), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(7.15, 5.84), rotation: 0 }
        ],
        subBuildings: [{
            idString: model === "two_sided" ? randomTruckContainerTwoSided : randomTruckContainerOneSided,
            position: Vec.create(0, 15)
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
        obstacles: [
            { idString: "pallet", position: Vec.create(0, 0), rotation: 0 },
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
        spawnHitbox: RectangleHitbox.fromRect(70, 70, Vec.create(8, 0)),
        spawnOffset: Vec.create(10, 0),
        ceilingHitbox: RectangleHitbox.fromRect(32.5, 39.25), // RectangleHitbox.fromRect(30.6, 37),
        floorImages: [
            {
                key: "river_hut_bridge_floor_1",
                position: Vec.create(20.15, -10.5)
            },
            {
                key: "river_hut_bridge_floor_2",
                position: Vec.create(bridgeUpstairs, -5),
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
                    RectangleHitbox.fromRect(13, 46, Vec.create(bridgeUpstairs, -5))
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
        defType: DefinitionType.Building,
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
        destroyOnCeilingCollapse: ["pole", `tent_wall_${id}`],
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
    defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        destroyOnCeilingCollapse: ["pole", `tent_wall_big_${id}`, "tent_window"],
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
    defType: DefinitionType.Building,
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

const blueHouse = (idString: string, subBuildings: BuildingDefinition["subBuildings"] = []): BuildingDefinition => ({
    idString,
    name: "Blue House",
    defType: DefinitionType.Building,
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
    pallet(1, [
        { idString: "box", position: Vec.create(-2.2, -1.9) },
        { idString: "box", position: Vec.create(2.2, 1.9) }
    ]),
    pallet(2, [
        { idString: "propane_tank", position: Vec.create(-2.41, -2.19) },
        { idString: "fence", position: Vec.create(-0.23, 2), rotation: 0 },
        { idString: "grenade_box", position: Vec.create(2.5, -1.8) }
    ]),
    pallet(3, [{ idString: "regular_crate", position: Vec.create(0, 0) }]),
    pallet(4, [
        { idString: "box", position: Vec.create(-2.73, -2.5) },
        { idString: "box", position: Vec.create(2.73, -2.4) },
        { idString: "grenade_box", position: Vec.create(-1.5, 2.15) }
    ]),
    pallet(5, [
        { idString: "fence", position: Vec.create(3.7, 0), rotation: 1 },
        { idString: randomBarrel, position: Vec.create(-1.16, 0.73) }
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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

    {
        idString: "mini_warehouse",
        name: "Mini Warehouse",
        defType: DefinitionType.Building,
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
                key: "mini_warehouse_floor_1_top",
                position: Vec.create(-17.4, -14)
            },
            {
                key: "mini_warehouse_floor_1_bottom",
                position: Vec.create(-17.4, 14)
            },
            {
                key: "mini_warehouse_floor_2_top",
                position: Vec.create(17.4, -14)
            },
            {
                key: "mini_warehouse_floor_2_bottom",
                position: Vec.create(17.4, 14)
            }
        ],
        ceilingImages: [
            {
                key: "mini_warehouse_ceiling_1",
                position: Vec.create(-16.5, 0),
                scale: Vec.create(2, 2)
            },

            {
                key: "mini_warehouse_ceiling_2",
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
            { idString: "box", position: Vec.create(29, -12) },
            { idString: "baby_plumpkin", position: Vec.create(-29, 12) },
            { idString: "grenade_box", position: Vec.create(-27, 7) },
            { idString: "baby_plumpkin", position: Vec.create(-22, 9) },
            { idString: "propane_tank", position: Vec.create(-17, 17) },
            { idString: "baby_plumpkin", position: Vec.create(17, -17) },
            { idString: "ammo_crate", position: Vec.create(26.8, 17) },
            { idString: "regular_crate", position: Vec.create(-26, -17) },
            { idString: { box: 9, grenade_box: 1 }, position: Vec.create(18.8, 14) },
            { idString: "grenade_box", position: Vec.create(20, 19) },
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
        defType: DefinitionType.Building,
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
    {
        idString: "port_warehouse",
        name: "Port Warehouse",
        defType: DefinitionType.Building,
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
        floorImages: [{
            key: "port_warehouse_floor",
            position: Vec.create(0, 0),
            scale: Vec.create(2, 2)
        }],
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
    {
        idString: "large_warehouse",
        name: "Large Warehouse",
        defType: DefinitionType.Building,
        reflectBullets: true,
        material: "metal_heavy",
        particle: "metal_particle",
        spawnHitbox: RectangleHitbox.fromRect(95, 150, Vec.create(-2, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(80, 137.5, Vec.create(-2, -2.1)),
        ceilingCollapseParticle: "large_warehouse_particle",
        hasDamagedCeiling: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(4.53, 4.53, Vec.create(-2.11, -34.12)),
            RectangleHitbox.fromRect(4.63, 4.54, Vec.create(-2.1, 29.62)),
            RectangleHitbox.fromRect(2.09, 72.16, Vec.create(-43.39, 31.99)),
            RectangleHitbox.fromRect(14.06, 2.06, Vec.create(-37.39, 67.64)),
            RectangleHitbox.fromRect(2.04, 38.65, Vec.create(39.25, -2.4)),
            RectangleHitbox.fromRect(44.51, 2, Vec.create(17.81, 67.61)),
            RectangleHitbox.fromRect(1.99, 26.18, Vec.create(39.19, 55.53)),
            RectangleHitbox.fromRect(2.03, 25.61, Vec.create(39.18, -59.99)),
            RectangleHitbox.fromRect(29.91, 1.95, Vec.create(25.3, -72.17)),
            RectangleHitbox.fromRect(2.09, 32.17, Vec.create(-43.4, -30.88))
        ),
        wallsToDestroy: 1,
        floorImages: [{
            key: "large_warehouse_floor",
            position: Vec.create(0, 0),
            scale: Vec.create(2, 2)
        }],
        ceilingImages: [{
            key: "large_warehouse_ceiling",
            position: Vec.create(-2, -2.1),
            scale: Vec.create(2, 2),
            damaged: "large_warehouse_ceiling_damaged"
        }],
        obstacles: [{
            idString: "large_warehouse_wall",
            position: Vec.create(-16.45, -59.67),
            rotation: 0
        }]
        // floors: [{
        //     type: FloorNames.Stone,
        //     hitbox: RectangleHitbox.fromRect(83.04, 140.32, Vec.create(-2.24, -2.24))
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(21.5, 28.9, Vec.create(21, -15.3)),
        ceilingHitbox: RectangleHitbox.fromRect(21.5, 28.9, Vec.create(21, -15.3)),
        ceilingImages: [{
            key: "blue_house_vault_ceiling",
            position: Vec.create(21, -15.3),
            scale: Vec.create(1.58, 1.25)
        }]
    },
    {
        idString: "shed",
        name: "Shed",
        defType: DefinitionType.Building,
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
        idString: "port_hay_shed",
        name: "Port Hay Shed",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(47, 32),
        ceilingHitbox: RectangleHitbox.fromRect(33.5, 24.5, Vec.create(-1.2, -0.5)),
        ceilingImages: [{
            key: "hay_shed_ceiling_2",
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
            { idString: "pole", position: Vec.create(13.98, 10.87) }
        ]
    },
    {
        idString: "port_gate_office",
        name: "Port Gate Office",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(55, 32),
        ceilingHitbox: RectangleHitbox.fromRect(41.36, 20.56, Vec.create(2.04, -2.04)),
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2, 12.1, Vec.create(-19.25, 4)),
            RectangleHitbox.fromRect(18.78, 2.01, Vec.create(-10.85, 9.03)),
            RectangleHitbox.fromRect(44.89, 1.99, Vec.create(2.23, -13.2)),
            RectangleHitbox.fromRect(15.58, 2.01, Vec.create(16.58, 9.06)),
            RectangleHitbox.fromRect(2, 13.09, Vec.create(23.63, 3.53))
        ),
        floorImages: [{
            key: "port_gate_office_floor",
            position: Vec.create(0, 0),
            scale: Vec.create(2, 2)
        }],
        ceilingImages: [{
            key: "port_gate_office_ceiling",
            position: Vec.create(2.04, -2.04),
            scale: Vec.create(2, 2)
        }],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: RectangleHitbox.fromRect(43.3, 22.15, Vec.create(1.85, -1.8))
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.5, 5.6, Vec.create(3.6, 11.35)),
                    RectangleHitbox.fromRect(2.05, 10.2, Vec.create(23.65, -7.8)),
                    RectangleHitbox.fromRect(5.3, 10.4, Vec.create(-21.95, -7.1))
                )
            }
        ],
        obstacles: [
            { idString: "window2", position: Vec.create(23.65, -7.59), rotation: 0 },
            { idString: "hq_desk_right", position: Vec.create(16.37, -2.1), rotation: 3 },
            { idString: "grey_office_chair", position: Vec.create(11.72, -5.76), rotation: 1 },
            { idString: "small_table", position: Vec.create(-11.84, 3.57), rotation: 1 },
            { idString: "chair", position: Vec.create(-6.21, 3.57), rotation: 1 },
            { idString: "door", position: Vec.create(3.2, 9.11), rotation: 2 },
            { idString: "door", position: Vec.create(-19.33, -6.68), rotation: 3 }
        ]
    },
    {
        idString: "port_storage",
        name: "Port Storage",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(55, 32, Vec.create(-10, 0)),
        ceilingHitbox: RectangleHitbox.fromRect(42, 21.55, Vec.create(-7.7, -2.04)),
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(31.32, 2, Vec.create(-0.13, -13.01)),
            RectangleHitbox.fromRect(18.95, 2, Vec.create(-6.01, 9.23)),
            RectangleHitbox.fromRect(1.99, 24.26, Vec.create(14.76, -1.87)),
            RectangleHitbox.fromRect(1.99, 23.68, Vec.create(-14.77, -1.61))
        ),
        floorImages: [{
            key: "port_storage_floor",
            position: Vec.create(0, 0),
            scale: Vec.create(2, 2)
        }],
        ceilingImages: [{
            key: "port_gate_office_ceiling",
            position: Vec.create(-6.75, -2.04),
            scale: Vec.create(2.01, 2.05)
        }],
        floors: [
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(28.43, 22.04, Vec.create(0.36, -1.9))
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(20, 20, Vec.create(0.36, -2.18))
            }
        ],
        subBuildings: [{
            idString: randomPallet,
            position: Vec.create(6.5, 9.05),
            orientation: 1
        }],
        obstacles: [
            { idString: "door", position: Vec.create(8.16, 9.3), rotation: 2 },
            { idString: "regular_crate", position: Vec.create(-8.94, 3.12) },
            { idString: "gun_case", position: Vec.create(-10.81, -6.67), rotation: 1 }
        ]
    },
    {
        idString: "port_main_office",
        name: "Port Main Office",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(102, 112),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(81.49, 17.42, Vec.create(-0.2, 24.94)),
            RectangleHitbox.fromRect(81.49, 17.42, Vec.create(0, -37.25)),
            RectangleHitbox.fromRect(72.51, 45.5, Vec.create(4.34, -6.07)),
            RectangleHitbox.fromRect(52.83, 14.01, Vec.create(0.12, 42.08)),
            RectangleHitbox.fromRect(10.3, 8, Vec.create(13.43, 34.12)),
            RectangleHitbox.fromRect(10.19, 3.02, Vec.create(35.57, -45.5))
        ),
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(24.17, 2.01, Vec.create(30.5, 34.41)),
            RectangleHitbox.fromRect(24.25, 2.01, Vec.create(18.41, 11.94)),
            RectangleHitbox.fromRect(1.99, 20.53, Vec.create(-41.35, 25.18)),
            RectangleHitbox.fromRect(12.36, 2, Vec.create(-36.18, -28.11)),
            RectangleHitbox.fromRect(12.36, 2, Vec.create(-36.18, 15.82)),
            RectangleHitbox.fromRect(2, 11.68, Vec.create(-30.98, -22.96)),
            RectangleHitbox.fromRect(2, 11.68, Vec.create(-30.98, 10.68)),
            RectangleHitbox.fromRect(2, 81.59, Vec.create(41.58, -6.93)),
            RectangleHitbox.fromRect(2.03, 23.05, Vec.create(7.3, 23.9)),
            RectangleHitbox.fromRect(72.06, 2, Vec.create(-5.62, -46.73)),
            RectangleHitbox.fromRect(48.09, 2, Vec.create(-17.02, 34.42)),
            RectangleHitbox.fromRect(2, 20, Vec.create(-41.34, -37.75)),
            RectangleHitbox.fromRect(2, 16.35, Vec.create(29.53, 3.68)),
            RectangleHitbox.fromRect(3.01, 3.07, Vec.create(-24.93, 48.48)),
            RectangleHitbox.fromRect(18.33, 1.01, Vec.create(33.08, 48.49)),
            RectangleHitbox.fromRect(18.33, 1.01, Vec.create(-33.55, 48.49)),
            RectangleHitbox.fromRect(3.01, 3.07, Vec.create(25.03, 48.46)),
            new CircleHitbox(0.79, Vec.create(-24.95, 50.69)),
            new CircleHitbox(0.91, Vec.create(-42.25, 48.48)),
            new CircleHitbox(0.91, Vec.create(-33.88, 48.49)),
            new CircleHitbox(0.91, Vec.create(42.26, 48.49)),
            new CircleHitbox(0.91, Vec.create(33.93, 48.49)),
            new CircleHitbox(0.79, Vec.create(25.03, 50.7)),
            RectangleHitbox.fromRect(1.57, 2.02, Vec.create(25.04, 49.71)),
            RectangleHitbox.fromRect(1.57, 2.02, Vec.create(-24.94, 49.73))
        ),
        ceilingImages: [
            {
                key: "port_main_office_ceiling_1",
                position: Vec.create(0, -6),
                scale: Vec.create(2, 2)
            },
            {
                key: "port_main_office_ceiling_2",
                position: Vec.create(0, 43),
                scale: Vec.create(2, 2)
            }
        ],
        floorImages: [
            {
                key: "port_main_office_floor_1",
                position: Vec.create(0, -26.2)
            },
            {
                key: "port_main_office_floor_2",
                position: Vec.create(0, 26.2),
                scale: Vec.create(1, -1)
            }
        ],
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(61.03, 34.07, Vec.create(-1.47, -5.9)),
                    RectangleHitbox.fromRect(12.54, 43.94, Vec.create(34.76, -25.79)),
                    RectangleHitbox.fromRect(59.15, 24.41, Vec.create(-1.06, -34.61)),
                    RectangleHitbox.fromRect(10.83, 18.39, Vec.create(-35.71, -37.68)),
                    RectangleHitbox.fromRect(47.39, 17.67, Vec.create(-17.03, 24.89)),
                    RectangleHitbox.fromRect(37.64, 8.11, Vec.create(-12.17, 13.62))
                )
            },
            {
                type: FloorNames.Sand,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(8.51, 8.02, Vec.create(-35.97, -23.41)),
                    RectangleHitbox.fromRect(8.51, 8.02, Vec.create(-35.87, 11.07))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.34, 26.54, Vec.create(-37.14, -6.14)),
                    RectangleHitbox.fromRect(2.29, 41.91, Vec.create(-41.22, -6.13)),
                    RectangleHitbox.fromRect(10.37, 5.22, Vec.create(35.51, -49.91))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.94, 20.64, Vec.create(35.57, 6.11)),
                    RectangleHitbox.fromRect(33.02, 20.99, Vec.create(24.49, 23.07)),
                    RectangleHitbox.fromRect(84.97, 12.97, Vec.create(0.09, 41.69)),
                    RectangleHitbox.fromRect(11.33, 2.5, Vec.create(13.16, 34.3)),
                    RectangleHitbox.fromRect(47.07, 4.29, Vec.create(0.14, 50.34))
                )
            }
        ],
        obstacles: [
            { idString: "port_main_office_wall_1", position: Vec.create(-2.11, 12.26), rotation: 0 },
            { idString: "port_main_office_wall_2", position: Vec.create(-25.31, 12.26), rotation: 0 },
            { idString: "port_main_office_wall_3", position: Vec.create(-18.96, -18.13), rotation: 0 },
            { idString: "port_main_office_wall_4", position: Vec.create(24.25, -18.16), rotation: 0 },
            { idString: "port_main_office_wall_5", position: Vec.create(12.6, -30.27), rotation: 0 },
            { idString: "port_main_office_wall_6", position: Vec.create(29.17, -37.6), rotation: 0 },
            { idString: "port_main_office_wall_6", position: Vec.create(6.04, -37.6), rotation: 0 },
            { idString: "port_main_office_column", position: Vec.create(-6.47, -18.23) },
            { idString: "port_main_office_column", position: Vec.create(6.5, -18.13) },
            { idString: "door", position: Vec.create(-15.09, 12.29), rotation: 0 },
            { idString: "bush", position: Vec.create(-36, -23.14) },
            { idString: "bush", position: Vec.create(-35.98, 10.98) },
            { idString: "cabinet", position: Vec.create(-22.41, -22.2), rotation: 2 },
            { idString: "cabinet", position: Vec.create(-37.34, 25), rotation: 1 },
            { idString: "grey_office_chair", position: Vec.create(-5.01, 22.7), rotation: 1 },
            { idString: "hq_desk_right", position: Vec.create(-0.16, 23.17), rotation: 3 },
            { idString: "large_drawer", position: Vec.create(-12.96, 29.43), rotation: 2 },
            { idString: "trash_can", position: Vec.create(-22.58, 30.31) },
            { idString: "water_cooler", position: Vec.create(24.94, 7.72), rotation: 2 },
            { idString: "box", position: Vec.create(19.09, 8.22) },
            { idString: "sandbags", position: Vec.create(0.51, 39.58), rotation: 0 },
            { idString: "box", position: Vec.create(-9, 38.28) },
            { idString: "box", position: Vec.create(-14.4, 38.06) },
            { idString: "regular_crate", position: Vec.create(35.52, 28.55) },
            { idString: "barrel", position: Vec.create(12.34, 16.95) },
            { idString: "gun_case", position: Vec.create(24.65, 30.24), rotation: 2 },
            { idString: "file_cart", position: Vec.create(-0.59, 7.57), rotation: 0 },
            { idString: "potted_plant", position: Vec.create(-26.13, 7.35), rotation: 0 },
            { idString: "box", position: Vec.create(37.6, -21.84) },
            { idString: "regular_crate", position: Vec.create(35.22, -29.69) },
            { idString: randomToilet, position: Vec.create(11.59, -42.04), rotation: 1 },
            { idString: "sink2", position: Vec.create(10.57, -34.87), rotation: 1 },
            { idString: "trash_can", position: Vec.create(25.32, -42.87) },
            { idString: "door", position: Vec.create(22.82, -30.31), rotation: 2 },
            { idString: "hq_desk_right", position: Vec.create(-4.99, -39.43), rotation: 0 },
            { idString: "grey_office_chair", position: Vec.create(-5.52, -34.12), rotation: 2 },
            { idString: "control_panel_small", position: Vec.create(-36, -41.72), rotation: 1 },
            { idString: "filing_cabinet", position: Vec.create(-36.27, -33.43), rotation: 1 },
            { idString: "trash_can", position: Vec.create(-18.16, -42.45) },
            { idString: "grey_office_chair", position: Vec.create(-27.52, -41.7), rotation: 3 },
            { idString: "bigger_glass_door", position: Vec.create(-30.95, -0.7), rotation: 1 },
            { idString: "bigger_glass_door", position: Vec.create(-30.95, -11.65), rotation: 3 },
            { idString: "door", position: Vec.create(13.74, 34.46), rotation: 0 },
            { idString: "door", position: Vec.create(35.08, -46.74), rotation: 2 }
        ]
    },
    {
        idString: "port",
        name: "Port",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(448, 490, Vec.create(0, -7.5)),
        spawnMode: MapObjectSpawnMode.Beach,
        spawnOrientation: 1,
        spawnOffset: Vec.create(-160, -15),
        floorZIndex: ZIndexes.Ground,
        sounds: {
            normal: "port_ambience",
            position: Vec.create(0, 0),
            maxRange: 385,
            falloff: 0.5
        },
        floorImages: [
            // Large warehouse broken wall area (left side, center)
            { key: "barrel_residue", position: Vec.create(-206.62, -85.47) },

            // Left Side: Top Left // Refinery-like area
            { key: "planted_bushes_residue", position: Vec.create(-109.2, -225.54) },

            // Right Side: Top Left
            { key: "planted_bushes_residue", position: Vec.create(91.67, -225.15) },

            { key: "barrier_floor", position: Vec.create(0, -183.1) },
            { key: "barrier_floor", position: Vec.create(81.8, 54.9), rotation: Math.PI / 2 }
        ],
        obstacles: [

            // ------------------------------------------------------------------------------------------
            // Right Side: Bottom Right
            // ------------------------------------------------------------------------------------------

            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(119.97, 116.31 + 8.8 * i),
                    rotation: 1
                })
            ),

            { idString: "metal_column", position: Vec.create(119.93, 110.51) },
            { idString: "metal_column", position: Vec.create(119.93, 175.08) },
            { idString: "metal_column", position: Vec.create(215.67, 152.85) },

            { idString: "barrel", position: Vec.create(180.91, 45.99) },
            { idString: "barrel", position: Vec.create(131.66, 182.27) },

            { idString: "flint_crate", position: Vec.create(181.89, 54.97) },

            { idString: "ammo_crate", position: Vec.create(209.3, 59.77) },
            { idString: "ammo_crate", position: Vec.create(197.03, 84.43) },

            { idString: "smaller_sandbags", position: Vec.create(196.48, 92.23), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec.create(137.9, 135.75), rotation: 0 },

            { idString: "box", position: Vec.create(146.98, 131.24) },
            { idString: "box", position: Vec.create(144.35, 136.2) },
            { idString: "box", position: Vec.create(149.46, 136.2) },

            { idString: "box", position: Vec.create(179.86, 142.15) },
            { idString: "box", position: Vec.create(184.96, 142.15) },
            { idString: "box", position: Vec.create(182.26, 146.96) },

            { idString: "grenade_crate", position: Vec.create(182.72, 182.48) },
            { idString: "grenade_crate", position: Vec.create(189.36, 179.71) },

            { idString: "regular_crate", position: Vec.create(205.12, 151.1) },
            { idString: "regular_crate", position: Vec.create(207.37, 160.88) },
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Right Side: Center
            // ------------------------------------------------------------------------------------------
            // fence
            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(143.88 + 8.8 * i, -38.32),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(119.8, -32.47 + 8.8 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 26 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(215.64, -73.12 + 8.8 * i),
                    rotation: 1
                })
            ),

            { idString: "regular_crate", position: Vec.create(112.95, 5.44) },

            { idString: "metal_column", position: Vec.create(215.59, -79.04) },
            { idString: "metal_column", position: Vec.create(202.54, -38.28) },
            { idString: "metal_column", position: Vec.create(137.84, -38.29) },
            { idString: "metal_column", position: Vec.create(119.86, -38.36) },
            { idString: "metal_column", position: Vec.create(119.84, 26.32) },

            { idString: "forklift", position: Vec.create(111.6, -85.18), rotation: 2 },

            { idString: "grenade_crate", position: Vec.create(200.77, -121.33) },
            { idString: "grenade_crate", position: Vec.create(81, -37.2) },
            { idString: "grenade_crate", position: Vec.create(114.59, -9.83) },

            { idString: "propane_tank", position: Vec.create(82.46, -53.54) },
            { idString: "propane_tank", position: Vec.create(96.82, -38.52) },

            { idString: "ammo_crate", position: Vec.create(142.93, -16.31) },
            { idString: "ammo_crate", position: Vec.create(209.41, -120.27) },
            { idString: "ammo_crate", position: Vec.create(89.61, -51.02) },
            { idString: "ammo_crate", position: Vec.create(79.47, -46.2) },
            { idString: "ammo_crate", position: Vec.create(89.69, -40.66) },

            { idString: "sandbags", position: Vec.create(151.87, -56.03), rotation: 0 },
            { idString: "sandbags", position: Vec.create(203.28, -129.7), rotation: 0 },
            { idString: "sandbags", position: Vec.create(184.03, -32.98), rotation: 0 },
            { idString: "sandbags", position: Vec.create(210.22, -22.85), rotation: 1 },

            { idString: "smaller_sandbags", position: Vec.create(113.58, -2.94), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec.create(210.38, 15.27), rotation: 0 },

            { idString: { box: 1, grenade_box: 0.15 }, position: Vec.create(97.78, -53.95) },
            { idString: "box", position: Vec.create(172.96, -111.62) },
            { idString: "box", position: Vec.create(211.96, 20.85) },
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Right Side: Top Left
            // ------------------------------------------------------------------------------------------

            // fence
            ...Array.from(
                { length: 17 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(68.97 + 8.8 * i, -243.15),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 15 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(215.64, -240.25 + 8.8 * i),
                    rotation: 1
                })
            ),

            // note to self: always put columns AFTER fences
            { idString: "metal_column", position: Vec.create(215.66, -243.25) },
            { idString: "metal_column", position: Vec.create(215.66, -111.21) },

            { idString: "dumpster", position: Vec.create(208.3, -210.42), rotation: 0 },
            { idString: "trash_bag", position: Vec.create(207.12, -198.56) },

            { idString: "metal_column", position: Vec.create(20.82, -221.09) },
            { idString: "metal_column", position: Vec.create(20.97, -243.09) },

            { idString: "barrel", position: Vec.create(78.38, -234.57) },
            { idString: "barrel", position: Vec.create(57.46, -163.16), waterOverlay: true },
            { idString: "regular_crate", position: Vec.create(54.54, -153.74), waterOverlay: true },

            { idString: "grenade_crate", position: Vec.create(114.83, -216.15) },

            { idString: "propane_tank", position: Vec.create(87.16, -134.58) },

            { idString: "gun_case", position: Vec.create(93.12, -135.29), rotation: 1 },

            { idString: "regular_crate", position: Vec.create(69.62, -235.69) },
            { idString: "regular_crate", position: Vec.create(85.12, -141.67) },
            { idString: "regular_crate", position: Vec.create(80.03, -131.98) },

            { idString: "box", position: Vec.create(30.27, -230.74) },
            { idString: "box", position: Vec.create(30.27, -235.7) },
            { idString: "box", position: Vec.create(70.36, -217.63) },
            { idString: "box", position: Vec.create(75.46, -217.56) },
            { idString: "box", position: Vec.create(156.55, -233.86) },
            { idString: { box: 1, grenade_box: 0.5 }, position: Vec.create(169.67, -233.93) },
            { idString: "box", position: Vec.create(77.83, -139.44) },
            { idString: "box", position: Vec.create(87.45, -129.9) },

            { idString: "planted_bushes", position: Vec.create(73.65, -225.45), rotation: 1 },
            { idString: "planted_bushes", position: Vec.create(109.69, -225.45), rotation: 1 },

            { idString: "smaller_sandbags", position: Vec.create(163.06, -234.3), rotation: 0 },

            { idString: "pallet", position: Vec.create(65.4, -155.76), rotation: 2 },
            { idString: "box", position: Vec.create(67.31, -155.12) },
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Left Side: Top Left // Refinery-like area
            // ------------------------------------------------------------------------------------------
            { idString: "silo", position: Vec.create(-181.75, -167.4), rotation: 0 },
            { idString: "silo", position: Vec.create(-141.15, -209.35), rotation: 2 },

            { idString: "regular_crate", position: Vec.create(-177.77, -222.93) },
            { idString: "melee_crate", position: Vec.create(-158.02, -198.87) },
            { idString: "regular_crate", position: Vec.create(-162.67, -155.56) },

            { idString: "barrel", position: Vec.create(-125.97, -190.27) },
            { idString: "barrel", position: Vec.create(-190.81, -192.61) },
            { idString: "barrel", position: Vec.create(-168.52, -224.26) },
            { idString: "super_barrel", position: Vec.create(-197.02, -187.09) },

            // the only ones who will survive the boom boom boom boom i want you in my room
            { idString: "sandbags", position: Vec.create(-161.08, -177.44), rotation: 0 },
            { idString: "sandbags", position: Vec.create(-197.34, -202.28), rotation: 1 },
            { idString: "smaller_sandbags", position: Vec.create(-158.31, -170.34), rotation: 0 },

            { idString: "metal_column", position: Vec.create(-202.51, -212.43) },
            { idString: "metal_column", position: Vec.create(-184.42, -229.94) },
            { idString: "metal_column", position: Vec.create(-119.81, -229.95) },
            { idString: "metal_column", position: Vec.create(-119.82, -182.91) },
            { idString: "metal_column", position: Vec.create(-119.82, -159.6) },

            // fence
            { idString: "fence", position: Vec.create(-119.81, -153.77), rotation: 1 },
            ...Array.from(
                { length: 5 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-119.79, -188.89 - 8.8 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-202.52, -153.75 - 8.8 * i),
                    rotation: 1
                })
            ),

            ...Array.from(
                { length: 7 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-125.74 - 8.8 * i, -229.97),
                    rotation: 0
                })
            ),

            ...Array.from(
                { length: 17 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-209.66 + 8.8 * i, -243.2),
                    rotation: 0
                })
            ),

            // outside refinery-like area
            { idString: "forklift", position: Vec.create(-97.1, -153.48), rotation: 0 },

            { idString: "barrel", position: Vec.create(-69.38, -216.4) },

            { idString: "grenade_crate", position: Vec.create(-105.66, -229.46) },

            { idString: "regular_crate", position: Vec.create(-112.72, -215.26) },
            { idString: "regular_crate", position: Vec.create(-75.61, -183.93) },

            { idString: "planted_bushes", position: Vec.create(-91.86, -225.47), rotation: 1 },
            { idString: "planted_bushes", position: Vec.create(-73.75, -225.47), rotation: 1 },

            { idString: "sandbags", position: Vec.create(-113.66, -226.97), rotation: 1 },
            { idString: "sandbags", position: Vec.create(-77.72, -174.34), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec.create(-105.2, -222.95), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec.create(-76.39, -216.45), rotation: 1 },
            { idString: "barrier", position: Vec.create(-0.87, -227.85), rotation: 3 },
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Left Side: Bottom Left
            // ------------------------------------------------------------------------------------------
            { idString: "ship_oil_source", position: Vec.create(-63.48, 113.09), rotation: 0 },

            // fence pieces
            { idString: "fence", position: Vec.create(-125.37, 55.7), rotation: 0 },
            { idString: "fence", position: Vec.create(-119.52, 61.57), rotation: 1 },
            { idString: "fence", position: Vec.create(-119.52, 70.37), rotation: 1 },
            { idString: "fence", position: Vec.create(-119.52, 79.17), rotation: 1 },
            { idString: "fence", position: Vec.create(-119.52, 87.91), rotation: 1 },
            { idString: "fence", position: Vec.create(-119.46, 142.75), rotation: 1 },
            { idString: "fence", position: Vec.create(-119.46, 151.46), rotation: 1 },
            { idString: "fence", position: Vec.create(-119.46, 160.23), rotation: 1 },
            { idString: "fence", position: Vec.create(-119.46, 169), rotation: 1 },

            ...Array.from(
                { length: 13 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-215.56, 149.86 - 8.8 * i),
                    rotation: 1
                })
            ),

            // fence columns
            { idString: "metal_column", position: Vec.create(-119.52, 93.83) },
            { idString: "metal_column", position: Vec.create(-119.52, 55.7) },
            { idString: "metal_column", position: Vec.create(-131.25, 55.7) },
            { idString: "metal_column", position: Vec.create(-119.46, 136.8) },
            { idString: "metal_column", position: Vec.create(-119.46, 174.95) },
            { idString: "metal_column", position: Vec.create(-215.58, 152.81) },
            { idString: "metal_column", position: Vec.create(-215.58, 38.48) },

            { idString: "sandbags", position: Vec.create(-142.32, 138.75), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec.create(-198.55, 157.42), rotation: 0 },
            { idString: "smaller_sandbags", position: Vec.create(-145.02, 74.26), rotation: 0 }, // H_S

            { idString: "barrel", position: Vec.create(-92.65, 185.04) },
            { idString: "barrel", position: Vec.create(-190.09, 156.94) },
            { idString: "barrel", position: Vec.create(-145.3, 130.52) },

            { idString: "propane_tank", position: Vec.create(-128.55, 81.93) }, // H_S
            { idString: { box: 0.5, grenade_box: 1 }, position: Vec.create(-123.93, 83.03) }, // H_S
            { idString: "regular_crate", position: Vec.create(-144.21, 65.72) }, // H_S
            { idString: "grenade_crate", position: Vec.create(-125.13, 65.32) }, // H_S

            { idString: "box", position: Vec.create(-126.9, 184.32) },
            { idString: "box", position: Vec.create(-132.22, 186.21) },
            { idString: "box", position: Vec.create(-97.01, 154.82) },
            { idString: "box", position: Vec.create(-91.61, 157.44) },
            { idString: "box", position: Vec.create(-146.62, 110.96) },
            { idString: "box", position: Vec.create(-146.55, 105.93) },
            { idString: "box", position: Vec.create(-141.3, 108.04) },

            { idString: "forklift", position: Vec.create(-123.36, 121.84), rotation: 1 },
            { idString: "dumpster", position: Vec.create(-207.76, 128.33), rotation: 2 },
            { idString: "trash_bag", position: Vec.create(-206.77, 139.05) },
            { idString: "roadblock", position: Vec.create(-140.92, 55.62), rotation: 1 }, // H_S

            { idString: "ammo_crate", position: Vec.create(-95.12, 147.13) },
            { idString: "ammo_crate", position: Vec.create(-100.03, 164.29) },
            { idString: "ammo_crate", position: Vec.create(-126.3, 74.77) }, // H_S
            // ------------------------------------------------------------------------------------------

            // ------------------------------------------------------------------------------------------
            // Left Side: Bottom Center/forklift parking area (large warehouse)
            // ------------------------------------------------------------------------------------------
            // fence / Vec.create(-215.64, 0.22),
            ...Array.from(
                { length: 28 },
                (_, i) => ({
                    idString: "fence",
                    position: Vec.create(-215.64, 0.22 - 8.8 * i),
                    rotation: 1
                })
            ),

            // fence columns
            { idString: "metal_column", position: Vec.create(-215.63, 6.16) },
            { idString: "metal_column", position: Vec.create(-215.53, -243.21) },

            { idString: "forklift", position: Vec.create(-155.48, 34.57), rotation: 0 },
            { idString: "forklift", position: Vec.create(-124.14, 35.6), rotation: 2 },
            { idString: "forklift", position: Vec.create(-176.57, -11.61), rotation: 2 },

            { idString: "grenade_crate", position: Vec.create(-141.76, 39.83) },
            { idString: "super_barrel", position: Vec.create(-138.62, 32) },
            { idString: "barrel", position: Vec.create(-195.61, 32.45) },
            { idString: "ammo_crate", position: Vec.create(-194.52, 23.24) },
            { idString: "ammo_crate", position: Vec.create(-112.52, -77.97), rotation: 0 },
            { idString: "grenade_crate", position: Vec.create(-80.03, -99.44) },
            { idString: "grenade_crate", position: Vec.create(-72.52, -106.3) },
            { idString: "sandbags", position: Vec.create(-80.14, -109.58), rotation: 1 },
            { idString: "propane_tank", position: Vec.create(-73.85, -111.96) },
            { idString: "dumpster", position: Vec.create(-208.05, -47.65), rotation: 2 },
            { idString: "dumpster", position: Vec.create(-208.05, -63.05), rotation: 2 },
            { idString: "trash_bag", position: Vec.create(-207.22, -74.08) },

            // Large Warehouse Obstacles
            { idString: "forklift", position: Vec.create(-163.52, -117.59), rotation: 1 },
            { idString: "pallet", position: Vec.create(-126.4, -26.02), rotation: 1 },
            { idString: "grenade_crate", position: Vec.create(-126.4, -26.02) },
            { idString: "pallet", position: Vec.create(-126.35, -141.46), rotation: 1 },
            { idString: "regular_crate", position: Vec.create(-126.35, -141.46) },
            { idString: "ammo_crate", position: Vec.create(-126.11, -130.4) },
            { idString: "ammo_crate", position: Vec.create(-126.18, -91.34) },
            { idString: "ammo_crate", position: Vec.create(-161.17, -88.22) },
            { idString: "ammo_crate", position: Vec.create(-161.1, -68.41) },
            { idString: "ammo_crate", position: Vec.create(-126.41, -14.79) },
            { idString: "ammo_crate", position: Vec.create(-196.14, -26.67) },

            { idString: "barrel", position: Vec.create(-167.66, -108.58) },
            { idString: "barrel", position: Vec.create(-135.53, -143.1) },
            { idString: "barrel", position: Vec.create(-125.05, -64.65) },
            { idString: "barrel", position: Vec.create(-197.38, -35.8) },
            { idString: "barrel", position: Vec.create(-146.77, -14.07) },
            { idString: "barrel", position: Vec.create(-196.87, -143.09) },
            { idString: "super_barrel", position: Vec.create(-162.51, -40.27) },

            { idString: "box", position: Vec.create(-198.66, -59.33) },
            { idString: "box", position: Vec.create(-123.75, -71.32) },
            { idString: "box", position: Vec.create(-128.85, -71.32) },

            { idString: "regular_crate", position: Vec.create(-177.87, -135.25) },
            { idString: "regular_crate", position: Vec.create(-196.33, -66.7) },
            { idString: "regular_crate", position: Vec.create(-196.33, -66.7) },

            { idString: "aegis_crate", position: Vec.create(-166.17, -78.36) },
            { idString: "aegis_crate", position: Vec.create(-156.4, -78.36) },

            { idString: "sandbags", position: Vec.create(-154.36, -44.31), rotation: 1 },
            { idString: "propane_tank", position: Vec.create(-194.04, -59.69) },
            { idString: "gun_case", position: Vec.create(-145.07, -143.59), rotation: 0 },
            // ------------------------------------------------------------------------------------------

            // Bollards
            // Left Side
            { idString: "bollard", position: Vec.create(-198.63, 185.55), rotation: 3 },
            { idString: "bollard", position: Vec.create(-141.17, 185.52), rotation: 3 },
            { idString: "bollard", position: Vec.create(-83.87, 185.62), rotation: 3 },

            // Right Side
            { idString: "bollard", position: Vec.create(84.42, 185.59), rotation: 3 },
            { idString: "bollard", position: Vec.create(141.8, 185.44), rotation: 3 },
            { idString: "bollard", position: Vec.create(199.25, 185.47), rotation: 3 }
        ],
        subBuildings: [
            { idString: "cargo_ship", position: Vec.create(0, 45.5) },
            { idString: "port_warehouse", position: Vec.create(-176.5, 98.75) },

            // Left Side: Bottom Left
            { idString: "port_hay_shed", position: Vec.create(-73.7, -135), orientation: 1 },
            { idString: "porta_potty", position: Vec.create(130, -165.4), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(-168.2, -188.5), orientation: 1 }, // y, x
            { idString: randomPallet, position: Vec.create(-153.61, -104.34), orientation: 1 },
            { idString: randomPallet, position: Vec.create(-143.74, 170.4) },
            { idString: randomPallet, position: Vec.create(-121.96, -111.74), orientation: 1 },
            { idString: randomPallet, position: Vec.create(-82.81, -144.84), orientation: 1 }, // H_S
            { idString: "truck_1", position: Vec.create(93.5, -77), orientation: 2 }, // x,y, positive -> negative

            // Left Side: Bottom Center
            { idString: randomPallet, position: Vec.create(-194.65, 13.45) },
            { idString: randomPallet, position: Vec.create(67.72, -112.69), orientation: 1 },
            { idString: randomPallet, position: Vec.create(88.26, -112.69), orientation: 1 },
            { idString: randomPallet, position: Vec.create(108, -88.97), orientation: 1 },

            // Large Warehouse
            { idString: "large_warehouse", position: Vec.create(-158.8, -76) },
            { idString: randomPortDamagedContainer, position: Vec.create(194.2, 85.5), orientation: 2 },
            { idString: randomPallet, position: Vec.create(-156.48, -14.52) },
            { idString: randomPallet, position: Vec.create(-136.78, -14.37) },
            { idString: randomPallet, position: Vec.create(-156.25, -142.2) },
            { idString: randomPallet, position: Vec.create(-151.41, -117.66) },
            { idString: randomPallet, position: Vec.create(132.88, -196.31), orientation: 1 },
            { idString: randomPallet, position: Vec.create(121.28, -196.3), orientation: 1 },
            { idString: randomPallet, position: Vec.create(23.74, -176.44), orientation: 1 },
            { idString: randomPallet, position: Vec.create(15.65, -196.41), orientation: 1 },
            { idString: randomPallet, position: Vec.create(79.79, -125.89), orientation: 1 },

            // Left Side: Top Left // Refinery-like area
            { idString: randomPallet, position: Vec.create(-126.84, -154.6) },
            { idString: randomPallet, position: Vec.create(222.21, -159.22), orientation: 1 },
            { idString: "port_gate_office", position: Vec.create(-44.15, -230) },

            // Right Side: Top Left
            { idString: "port_storage", position: Vec.create(48.8, -230.05) },
            { idString: "port_main_office", position: Vec.create(161.35, -183.07) },
            { idString: randomPallet, position: Vec.create(223.73, 208.67), orientation: 1 },

            // Right Side: Center
            { idString: randomPallet, position: Vec.create(111.65, -97.06) },
            { idString: randomPallet, position: Vec.create(46.01, 99.24), orientation: 1 },
            { idString: randomPallet, position: Vec.create(142.19, -6.04) },
            { idString: randomPallet, position: Vec.create(168.2, 22.47) },
            { idString: "truck_2", position: Vec.create(-68.6, -177), orientation: 3 },
            { idString: "mutated_forklift", position: Vec.create(153.71, -98.5) },
            { idString: "porta_potty", position: Vec.create(-50.4, -190.07), orientation: 3 }, // fucking porta potty in the middle of the road
            { idString: "large_truck", position: Vec.create(122.9, 159.1), orientation: 1 }, // y x

            { idString: randomPortOpenContainerTwoSide, position: Vec.create(169.65, -15.05) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(183.95, -15.05) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(-155.35, 15.05), orientation: 2 },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(155.35, 13.25) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(141.05, 13.25) },

            // Right Side: Bottom Right

            // ----------------------------------
            // container distance X = 14.3
            // container distance Y = 28.55
            // ----------------------------------
            { idString: randomPallet, position: Vec.create(182.22, 64.55) },
            { idString: "truck_1", position: Vec.create(100.1, 129.8) },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(-169.65, -55.05), orientation: 2 },
            { idString: randomPortOpenContainerTwoSide, position: Vec.create(-155.35, -55.05), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(-141.05, -55.05), orientation: 2 },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(169.65, 83.5) },
            { idString: randomPortDamagedContainer, position: Vec.create(-155.35, -83.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(183.95, 83.5) },

            // y = 125
            { idString: randomPortOpenContainerOneSide, position: Vec.create(-183.95, -125), orientation: 2 },
            { idString: randomPortDamagedContainerReversed, position: Vec.create(169.65, 125) },
            { idString: randomPortDamagedContainerReversed, position: Vec.create(-169.65, -153.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(141.05, 153.5) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(155.35, 153.5) }
        ],
        floors: [ // Follows ground graphics for most part
            {
                type: FloorNames.Stone,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(149, 434.5, Vec.create(-141.68, -27.59)), // G1 - L
                    RectangleHitbox.fromRect(433.5, 76, Vec.create(0, -207)), // G2 - C
                    RectangleHitbox.fromRect(149, 434.5, Vec.create(141.68, -27.59)) // G1 - R
                )
            },
            {
                type: FloorNames.Water,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(135, 388, Vec.create(0, 24.5)),
                    RectangleHitbox.fromRect(148.72, 55.77, Vec.create(-0.32, 216.9))
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
                    RectangleHitbox.fromRect(135, 388, Vec.create(0, 24.5)),
                    RectangleHitbox.fromRect(148.72, 55.77, Vec.create(-0.32, 216.9))
                )
            }
        ],
        groundGraphics: [
            {
                color: 0x666666,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(149, 434.5, Vec.create(-141.68, -27.59)), // G1 - L
                    RectangleHitbox.fromRect(433.5, 76, Vec.create(0, -207)), // G2 - C
                    RectangleHitbox.fromRect(149, 434.5, Vec.create(141.68, -27.59)) // G1 - R
                )
            },
            // Darker grey
            {
                color: 0x4d4d4d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(84.8, 121.38, Vec.create(-161.23, 115.3)), // bottom left corner
                    RectangleHitbox.fromRect(84.9, 215.63, Vec.create(161.29, 68.18)), // containers area
                    RectangleHitbox.fromRect(84.85, 224, Vec.create(-161.22, -119.5)) // the refinery-like area
                )
            },
            // Road body
            {
                color: 0x595959,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(39.2, 396.6, Vec.create(-99.2, -22.25)), // G2 - L
                    RectangleHitbox.fromRect(39.2, 396.6, Vec.create(99.2, -22.25)), // G2 - R
                    RectangleHitbox.fromRect(237.53, 39.36, Vec.create(0, -200.85)), // G2 - C
                    RectangleHitbox.fromRect(124.12, 62.44, Vec.create(-141.6, 23.49)), // L
                    RectangleHitbox.fromRect(93.5, 95.48, Vec.create(157, -86.52)), // R
                    RectangleHitbox.fromRect(39.46, 24.5, Vec.create(0, -232.7)) // main gate (Y LIMIT = 233)
                )
            },
            // for container area, the yellow "boxes" (0xa6b541, 0.59)
            {
                color: 0xa6b541,
                hitbox: new GroupHitbox(
                    // top
                    RectangleHitbox.fromRect(0.59, 58.25, Vec.create(191.6, -1.19)),
                    RectangleHitbox.fromRect(0.59, 58.25, Vec.create(133.18, -1.19)),
                    RectangleHitbox.fromRect(59, 0.59, Vec.create(162.4, 27.63)),
                    RectangleHitbox.fromRect(59, 0.59, Vec.create(162.4, -30.04)),

                    // middle
                    RectangleHitbox.fromRect(0.59, 58.25, Vec.create(191.6, 69.01)),
                    RectangleHitbox.fromRect(0.59, 58.25, Vec.create(133.18, 69.01)),
                    RectangleHitbox.fromRect(59, 0.59, Vec.create(162.4, 40.16)),
                    RectangleHitbox.fromRect(59, 0.59, Vec.create(162.4, 97.87)),

                    // bottom
                    RectangleHitbox.fromRect(0.59, 58.25, Vec.create(133.18, 139.31)),
                    RectangleHitbox.fromRect(0.59, 58.25, Vec.create(191.6, 139.31)),
                    RectangleHitbox.fromRect(59, 0.59, Vec.create(162.4, 110.45)),
                    RectangleHitbox.fromRect(59, 0.59, Vec.create(162.4, 168.15))

                )
            },
            // Road lines (road width/height must be 1.19)
            {
                color: 0xe6e6e6,
                hitbox: new GroupHitbox(
                    // forklift parking area (L)
                    RectangleHitbox.fromRect(47.8, 1.19, Vec.create(-139.61, 52.12)),
                    RectangleHitbox.fromRect(1.19, 31.48, Vec.create(-162.92, 39.01)),
                    RectangleHitbox.fromRect(1.19, 29.47, Vec.create(-147.41, 37.97)),
                    RectangleHitbox.fromRect(1.19, 29.47, Vec.create(-131.89, 37.97)),
                    RectangleHitbox.fromRect(1.19, 71.23, Vec.create(-116.3, 58.87)),
                    RectangleHitbox.fromRect(2.66, 1.19, Vec.create(-117.25, 93.9)),
                    RectangleHitbox.fromRect(1.19, 3.34, Vec.create(-190.09, 53.19)),
                    RectangleHitbox.fromRect(11.98, 1.19, Vec.create(-195.52, 52.12)),
                    RectangleHitbox.fromRect(1.19, 58.23, Vec.create(-200.95, 23.59)),
                    RectangleHitbox.fromRect(12.02, 1.19, Vec.create(-195.46, -4.94)),
                    RectangleHitbox.fromRect(1.19, 2.97, Vec.create(-190.04, -6.2)),
                    RectangleHitbox.fromRect(1.19, 2.97, Vec.create(-162.95, -6.2)),
                    RectangleHitbox.fromRect(47.75, 1.19, Vec.create(-139.67, -4.94)),
                    RectangleHitbox.fromRect(1.19, 29.03, Vec.create(-116.39, -19.02)),
                    RectangleHitbox.fromRect(3.06, 1.19, Vec.create(-117.35, -32.96)),

                    // top & center (L)
                    // these are mostly for the gates on the large warehouse
                    RectangleHitbox.fromRect(3.12, 1.19, Vec.create(-117.32, -60.11)),
                    RectangleHitbox.fromRect(1.19, 37.74, Vec.create(-116.35, -78.44)),
                    RectangleHitbox.fromRect(3.12, 1.19, Vec.create(-117.32, -96.74)),
                    RectangleHitbox.fromRect(3.12, 1.19, Vec.create(-117.32, -123.87)),
                    RectangleHitbox.fromRect(1.19, 36.89, Vec.create(-116.35, -141.74)),
                    RectangleHitbox.fromRect(3.12, 1.19, Vec.create(-117.32, -159.58)),
                    RectangleHitbox.fromRect(3.12, 1.19, Vec.create(-117.32, -183)),
                    RectangleHitbox.fromRect(1.19, 35.4, Vec.create(-116.35, -200.37)),
                    RectangleHitbox.fromRect(100.22, 1.19, Vec.create(-66.54, -217.49)), // L
                    RectangleHitbox.fromRect(100.22, 1.19, Vec.create(66.54, -217.49)), // R
                    RectangleHitbox.fromRect(1.19, 23.49, Vec.create(-17.025, -229.5)), // main gate L
                    RectangleHitbox.fromRect(1.19, 23.49, Vec.create(17.025, -229.5)), // main gate R
                    RectangleHitbox.fromRect(3.07, 1.19, Vec.create(-18.15, -240.65)),
                    RectangleHitbox.fromRect(3.07, 1.19, Vec.create(18.15, -240.65)),

                    // bottom (L)
                    RectangleHitbox.fromRect(35.31, 1.19, Vec.create(-99.28, 173.26)), // connects to main L
                    RectangleHitbox.fromRect(1.19, 37.68, Vec.create(-116.35, 155.03)),
                    RectangleHitbox.fromRect(2.9, 1.19, Vec.create(-117.25, 136.69)),
                    RectangleHitbox.fromRect(1.19, 89.4, Vec.create(82.14, 129.1)),
                    RectangleHitbox.fromRect(1.19, 63.52, Vec.create(116.35, 141.62)),
                    RectangleHitbox.fromRect(2.9, 1.19, Vec.create(117.2, 26.5)),
                    RectangleHitbox.fromRect(2.8, 1.19, Vec.create(117.15, 110.42)),

                    // bottom (R)
                    RectangleHitbox.fromRect(35.31, 1.19, Vec.create(99.28, 173.26)), // connects to main R

                    // top (R)
                    RectangleHitbox.fromRect(1.19, 86.65, Vec.create(116.34, -174.92)),
                    // cargo truck parking area
                    RectangleHitbox.fromRect(85.4, 1.19, Vec.create(158.75, -132.18)),
                    RectangleHitbox.fromRect(1.19, 91.83, Vec.create(200.95, -86.85)),
                    RectangleHitbox.fromRect(80.38, 1.19, Vec.create(160.39, -114.03)), // 1
                    RectangleHitbox.fromRect(80.38, 1.19, Vec.create(160.39, -95.91)), // 2
                    RectangleHitbox.fromRect(80.38, 1.19, Vec.create(160.39, -77.74)), // 3
                    RectangleHitbox.fromRect(80.38, 1.19, Vec.create(160.39, -59.68)), // 4
                    RectangleHitbox.fromRect(85.8, 1.19, Vec.create(158.6, -41.49)),
                    // containers area
                    RectangleHitbox.fromRect(1.19, 69.01, Vec.create(116.3, -7.57)),

                    // main
                    RectangleHitbox.fromRect(53.34, 1.19, Vec.create(-56.03, -183.34)), // C-L
                    RectangleHitbox.fromRect(53.34, 1.19, Vec.create(56.03, -183.34)), // C-R
                    RectangleHitbox.fromRect(1.19, 2.8, Vec.create(-29.89, -182.5)),
                    RectangleHitbox.fromRect(1.19, 2.8, Vec.create(29.89, -182.5)),
                    RectangleHitbox.fromRect(1.19, 357.83, Vec.create(-82.13, -5.02)), // L
                    RectangleHitbox.fromRect(1.19, 209.33, Vec.create(82.12, -79.19)), // R-1
                    RectangleHitbox.fromRect(3.1, 1.19, Vec.create(81.17, 24.99)),
                    RectangleHitbox.fromRect(3.1, 1.19, Vec.create(81.17, 84.74))
                    //       RectangleHitbox.fromRect(1.19, 357.83, Vec.create(82.13, -5.02)) // R
                )
            },
            // ---------------------------------------------------------------------------
            // Oil pipe(?), connects to ship from refinery-like area
            // ---------------------------------------------------------------------------
            {
                color: 0x6d602f,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.7, 40.37, Vec.create(-158.05, -188.79)),
                    RectangleHitbox.fromRect(87.91, 1.71, Vec.create(-115.05, -169.52)),
                    RectangleHitbox.fromRect(1.71, 273.6, Vec.create(-71.89, -32.08))
                )
            },
            // fill
            {
                color: 0x9e8b44,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(0.9, 39.57, Vec.create(-158.05, -188.79)),
                    RectangleHitbox.fromRect(87.11, 0.9, Vec.create(-114.99, -169.52)),
                    RectangleHitbox.fromRect(0.9, 273.5, Vec.create(-71.89, -32.5))
                )
            },

            // grab my hand... I can see the void..
            { // border
                color: 0x404040,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10.49, 2.5, Vec.create(-109.12, -169.49)),
                    RectangleHitbox.fromRect(10.49, 2.5, Vec.create(-91.42, -169.5)),
                    RectangleHitbox.fromRect(10.49, 4.12, Vec.create(-109.12, -169.49)),
                    RectangleHitbox.fromRect(10.49, 4.12, Vec.create(-91.42, -169.47))
                )
            },
            { // FILL_MIDDLE
                color: 0x4d4d4d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(9.6, 0.39, Vec.create(-109.12, -170.92)),
                    RectangleHitbox.fromRect(9.6, 0.39, Vec.create(-109.12, -168.07)),
                    RectangleHitbox.fromRect(9.6, 0.39, Vec.create(-91.42, -170.92)),
                    RectangleHitbox.fromRect(9.6, 0.39, Vec.create(-91.42, -168.07))
                )
            },
            { // fill
                color: 0x595959,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(9.64, 1.65, Vec.create(-109.12, -169.49)),
                    RectangleHitbox.fromRect(9.64, 1.65, Vec.create(-91.42, -169.5))
                )
            }
            // ---------------------------------------------------------------------------
        ]
    },
    {
        idString: "cargo_ship_bottom_floor_vault",
        name: "Cargo Ship Vault Ceiling",
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(28.15, 52.25),
            RectangleHitbox.fromRect(14, 4, Vec.create(7.1, 26.3)),
            RectangleHitbox.fromRect(14, 4, Vec.create(-7.1, -26.3))
        ),
        ceilingHitbox: RectangleHitbox.fromRect(28.15, 52.25),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [{
            key: "cargo_ship_vault_ceiling",
            position: Vec.create(0, 0),
            scale: Vec.create(2, 2)
        }]
    },
    {
        idString: "cargo_ship",
        name: "Cargo Ship",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(180, 400, Vec.create(-1.5, -1.8)),
        puzzle: {
            triggerOnSolve: "vault_door_deactivated",
            delay: 2000,
            unlockOnly: true
        },
        sounds: {
            solved: "generator_running",
            position: Vec.create(-1.46, 40.23),
            maxRange: 50,
            falloff: 5
        },
        obstacles: [
            {
                idString: "generator",
                position: Vec.create(-2.01, 34.23),
                rotation: 0,
                layer: 2,
                puzzlePiece: true
            },
            {
                idString: "vault_door_deactivated",
                position: Vec.create(25.6, -60),
                rotation: 0,
                locked: true,
                layer: 0
            },
            {
                idString: "vault_door_deactivated",
                position: Vec.create(42.5, -119.53),
                rotation: 2,
                locked: true,
                layer: 0
            }
        ],
        subBuildings: [
            { idString: "cargo_ship_top_floor", position: Vec.create(-0.55, -6), layer: 2 },
            { idString: "cargo_ship_bottom_floor", position: Vec.create(1.8, 0) }
        ]
    },
    {
        idString: "cargo_ship_top_floor_shadow",
        name: "Cargo Ship Shadow",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(180, 400, Vec.create(-1.5, -1.8)),
        ceilingZIndex: ZIndexes.BuildingsCeiling + 0.5,
        ceilingImages: [
            {
                key: "cargo_ship_top_floor_shadow",
                position: Vec.create(0, 0),
                scale: Vec.create(24, 24)
            }
        ]
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
            position: Vec.create(-1.5, 115.33),
            maxRange: 300,
            falloff: 0.86
        },
        floorZIndex: ZIndexes.Ground + 0.5,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(13.3, 2.27, Vec.create(59.22, 34.44)),
            RectangleHitbox.fromRect(12.47, 2.26, Vec.create(58.86, -15.53)),
            RectangleHitbox.fromRect(4.28, 3.88, Vec.create(67.04, 34.48)),
            RectangleHitbox.fromRect(1.94, 4.65, Vec.create(51.73, 34.48)),
            RectangleHitbox.fromRect(1.94, 4.65, Vec.create(51.73, -15.55)),
            RectangleHitbox.fromRect(4.3, 3.87, Vec.create(67.06, -15.5)),
            RectangleHitbox.fromRect(3.48, 113.24, Vec.create(49.41, 86.87)),
            RectangleHitbox.fromRect(77.21, 3.4, Vec.create(12.56, 144.94)),
            RectangleHitbox.fromRect(16.6, 3.4, Vec.create(-47.14, 144.92)),
            RectangleHitbox.fromRect(3.49, 184.87, Vec.create(-53.66, 51.07)),
            RectangleHitbox.fromRect(18.74, 37.62, Vec.create(-2.2, 113.14)),
            RectangleHitbox.fromRect(2.02, 20.05, Vec.create(19.91, 103.18)),
            RectangleHitbox.fromRect(2.02, 16.33, Vec.create(-28.26, 115.36)),
            RectangleHitbox.fromRect(62.25, 2.04, Vec.create(-10.17, 93.57)),
            RectangleHitbox.fromRect(16.66, 2.06, Vec.create(39.73, 93.56)),
            RectangleHitbox.fromRect(1.99, 13.47, Vec.create(-35.84, 101.13)),
            RectangleHitbox.fromRect(16.04, 2.04, Vec.create(-27.65, 106.85)),
            RectangleHitbox.fromRect(3.42, 124.74, Vec.create(49.35, -74.38)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec.create(4.61, 38.28)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec.create(-21.45, -137.01)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec.create(-8.86, 21.6)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec.create(-8.87, 38.32)),
            RectangleHitbox.fromRect(31.91, 2.04, Vec.create(-36.37, -40.33)),
            RectangleHitbox.fromRect(2.04, 33.83, Vec.create(-21.44, -57.68)),
            RectangleHitbox.fromRect(3.52, 75.47, Vec.create(-53.62, -99.34)),
            RectangleHitbox.fromRect(13.57, 2.03, Vec.create(-47.49, -62.62)),
            RectangleHitbox.fromRect(2.03, 11.06, Vec.create(-41.65, -57.36)),
            RectangleHitbox.fromRect(20, 2, Vec.create(-31.15, -112.56)),
            RectangleHitbox.fromRect(2.03, 40.39, Vec.create(-21.45, -115.8)),
            RectangleHitbox.fromRect(39.1, 2.04, Vec.create(-1.29, -119.5)),
            RectangleHitbox.fromRect(1.98, 16.11, Vec.create(17.26, -127.4)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec.create(4.6, 21.65)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec.create(17.27, -137.01)),
            RectangleHitbox.fromRect(3.01, 2.99, Vec.create(-2.07, -136.97)),
            RectangleHitbox.fromRect(11.03, 2.05, Vec.create(-48.14, -132.81)),
            RectangleHitbox.fromRect(2.08, 22.75, Vec.create(-43.63, -143.5)),
            RectangleHitbox.fromRect(2.01, 28.85, Vec.create(23.07, -168.35)),
            RectangleHitbox.fromRect(52.4, 2.02, Vec.create(-1.93, -182.82)),
            RectangleHitbox.fromRect(16.5, 2, Vec.create(-36.32, -154.17)),
            RectangleHitbox.fromRect(15.34, 2, Vec.create(-2.15, -154.38)),
            RectangleHitbox.fromRect(2.01, 15.96, Vec.create(4.5, -162.59)),
            RectangleHitbox.fromRect(2.01, 15.96, Vec.create(-8.81, -162.59)),
            RectangleHitbox.fromRect(2.01, 28.85, Vec.create(-27.17, -167.6)),
            RectangleHitbox.fromRect(16.5, 2, Vec.create(30.32, -154.2)),
            RectangleHitbox.fromRect(2.08, 22.75, Vec.create(39.52, -143.82)),
            RectangleHitbox.fromRect(11.03, 2.05, Vec.create(43.99, -132.79)),
            RectangleHitbox.fromRect(16.86, 2.05, Vec.create(24.22, -46.97)),
            RectangleHitbox.fromRect(16.86, 2.05, Vec.create(24.22, -33.71)),
            RectangleHitbox.fromRect(2.04, 15.36, Vec.create(16.47, -40.33)),

            // vault
            RectangleHitbox.fromRect(13.99, 2.02, Vec.create(39.39, -62.58)),
            RectangleHitbox.fromRect(1.98, 53.64, Vec.create(45.35, -89.15)),
            RectangleHitbox.fromRect(1.98, 55, Vec.create(19.15, -90.42)),
            RectangleHitbox.fromRect(15.65, 2.02, Vec.create(36.84, -75.7)),
            RectangleHitbox.fromRect(13.99, 2.02, Vec.create(25.12, -116.96)),
            RectangleHitbox.fromRect(15.65, 2.02, Vec.create(27.68, -98.66)),

            new CircleHitbox(5, Vec.create(-50.17, -138.59)),
            new CircleHitbox(7.68, Vec.create(-3.57, -191.99)),
            new CircleHitbox(4.8, Vec.create(-46.95, -157.33)),
            new CircleHitbox(4.83, Vec.create(-48.16, -153.03)),
            new CircleHitbox(4.83, Vec.create(-45.81, -160.41)),
            new CircleHitbox(4.83, Vec.create(-43.33, -165.9)),
            new CircleHitbox(8.72, Vec.create(-36.74, -169.78)),
            new CircleHitbox(4.83, Vec.create(-33.98, -179.79)),
            new CircleHitbox(4.04, Vec.create(-31.36, -183.65)),
            new CircleHitbox(4.36, Vec.create(46.52, -137.83)),
            new CircleHitbox(3.91, Vec.create(25.04, -185.43)),
            new CircleHitbox(5.95, Vec.create(16.62, -188.88)),
            new CircleHitbox(5.95, Vec.create(-18.73, -189.96)),
            new CircleHitbox(5.95, Vec.create(-10.97, -192.77)),
            new CircleHitbox(5.95, Vec.create(7.72, -192.56)),
            new CircleHitbox(3.91, Vec.create(-24.84, -188.84)),
            new CircleHitbox(3.91, Vec.create(-29.12, -185.58)),
            new CircleHitbox(5.74, Vec.create(29.32, -178.85)),
            new CircleHitbox(9.67, Vec.create(33.86, -165.43)),
            new CircleHitbox(4.36, Vec.create(43.7, -155.59)),
            new CircleHitbox(4.36, Vec.create(45.17, -149.82)),
            new CircleHitbox(4.36, Vec.create(46.07, -143.94)),
            new CircleHitbox(4.5, Vec.create(41.87, -160.06)),
            new CircleHitbox(4.5, Vec.create(34.49, -174.32)),
            new CircleHitbox(4.5, Vec.create(2.73, -195.05)),
            new CircleHitbox(4.5, Vec.create(21.76, -187.46)),
            new CircleHitbox(4.5, Vec.create(-36.94, -176.71)),
            new CircleHitbox(4.5, Vec.create(-7.84, -194.9)),
            new CircleHitbox(4.5, Vec.create(-15.28, -193.02)),
            new CircleHitbox(4.5, Vec.create(13.28, -192.19)),
            new CircleHitbox(5.25, Vec.create(-49.42, -143.72)),
            new CircleHitbox(5.25, Vec.create(-48.74, -148.55))
        ),
        spawnHitbox: RectangleHitbox.fromRect(180, 400, Vec.create(-1.5, -1.8)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(99.5, 211, Vec.create(-2, -13)),
            RectangleHitbox.fromRect(80.78, 21.31, Vec.create(-1.92, -142.33)),
            RectangleHitbox.fromRect(100.28, 13.61, Vec.create(-1.82, -125.2)),
            RectangleHitbox.fromRect(48.31, 33.89, Vec.create(-2.07, -164.9)),
            RectangleHitbox.fromRect(7.21, 20.34, Vec.create(-54, -51.5)),
            RectangleHitbox.fromRect(101.81, 53.3, Vec.create(-1.96, 119.35)),
            RectangleHitbox.fromRect(97.5, 18.46, Vec.create(-2.02, 153)),
            RectangleHitbox.fromRect(82.05, 20, Vec.create(-3, 165))
        ),
        floors: [
            {
                type: FloorNames.Water,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(101.81, 53.3, Vec.create(-1.96, 119.35)),
                    RectangleHitbox.fromRect(27.77, 14.14, Vec.create(-38.16, 86.7)),
                    RectangleHitbox.fromRect(40, 4.82, Vec.create(27.71, 90))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(99.5, 211, Vec.create(-2, -13)),
                    RectangleHitbox.fromRect(80.78, 21.31, Vec.create(-1.92, -142.33)),
                    RectangleHitbox.fromRect(100.28, 13.61, Vec.create(-1.82, -125.2)),
                    RectangleHitbox.fromRect(48.31, 33.89, Vec.create(-2.07, -164.9)),
                    RectangleHitbox.fromRect(7.21, 20.34, Vec.create(-54, -51.5)),
                    RectangleHitbox.fromRect(34.19, 60, Vec.create(63.34, 9.24)),
                    RectangleHitbox.fromRect(45.17, 12.38, Vec.create(63.86, 19.27)),
                    RectangleHitbox.fromRect(45.17, 12.38, Vec.create(64.01, -0.29))
                )
            },
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(15.2, 11.27, Vec.create(25.01, -40.18)),
                    RectangleHitbox.fromRect(15.2, 11.27, Vec.create(-2.15, -162.84)),
                    RectangleHitbox.fromRect(15.2, 11.27, Vec.create(-27.31, 100.22))
                ),
                layer: 1
            }
        ],
        floorImages: [
            {
                key: "floor_oil_ship",
                position: Vec.create(-36.67, 157),
                scale: Vec.create(2.3, 2.3)
            },
            {
                key: "cargo_ship_floor_bottom_1",
                position: Vec.create(-1.8, 60.25)
            },
            {
                key: "cargo_ship_floor_bottom_2",
                position: Vec.create(-1.85, -112.05),
                scale: Vec.create(-1, -1)
            },
            {
                key: "cargo_ship_floor_ramp",
                position: Vec.create(66.85, 9.5),
                scale: Vec.create(2, 2)
            },
            {
                key: "regular_crate_residue",
                position: Vec.create(-37.26, -34.51),
                rotation: Math.PI / 2
            },
            {
                key: "regular_crate_residue",
                position: Vec.create(-45.34, 15.75),
                rotation: Math.PI / 2
            },
            {
                key: "barrel_residue",
                position: Vec.create(33.73, -148.61)
            },
            {
                key: "barrel_residue",
                position: Vec.create(-33.17, 138.92),
                alpha: 0.5
            },
            {
                key: "explosion_decal",
                position: Vec.create(-19.21, 138.48),
                alpha: 0.5
            },
            {
                key: "explosion_decal",
                position: Vec.create(-15.16, 140.74),
                alpha: 0.5,
                rotation: Math.PI / 2,
                scale: Vec.create(0.7, 0.7)
            },
            {
                key: "ship_propeller",
                position: Vec.create(-2, 153.45),
                scale: Vec.create(2, 2)
            },
            {
                key: "cargo_ship_wall_residue",
                position: Vec.create(-30.4, 150.6),
                scale: Vec.create(2, 2),
                alpha: 0.5
            }
        ],
        obstacles: [
            { idString: "forklift", position: Vec.create(49.66, 19.32), rotation: 3 },
            { idString: "pallet", position: Vec.create(38.32, 19.18), rotation: 1 },
            { idString: randomSmallStove, position: Vec.create(38.32, 19.18), rotation: 0 },

            { idString: "cargo_ship_bottom_stair", position: Vec.create(23, -40.18), rotation: 0, layer: 1 },
            { idString: "cargo_ship_bottom_stair", position: Vec.create(-2.15, -162.5), rotation: 1, layer: 1 },
            { idString: "cargo_ship_bottom_stair", position: Vec.create(-29, 100.22), rotation: 0, layer: 1 },

            { idString: "ship_thing_v2", position: Vec.create(-2.07, 175.32), rotation: 0 },

            { idString: "box", position: Vec.create(-66, 134.5), waterOverlay: true },
            { idString: "box", position: Vec.create(-14.88, 178.02), waterOverlay: true },
            { idString: "barrel", position: Vec.create(-24.67, 180.93), waterOverlay: true },

            { idString: "life_preserver", position: Vec.create(-44.28, -57.06), rotation: 0 },
            { idString: "trash_bag", position: Vec.create(43.68, -23.44) },

            { idString: "gun_locker", position: Vec.create(-29.26, -108.79), rotation: 0 },

            { idString: "gun_case", position: Vec.create(-46.33, -66.86), rotation: 2 },

            { idString: "cabinet", position: Vec.create(-17.76, -127.85), rotation: 1 },
            { idString: "cabinet", position: Vec.create(13.56, -127.85), rotation: 3 },

            { idString: "box", position: Vec.create(-17.76, -51.58) },
            { idString: "box", position: Vec.create(-4.34, -132.74) },
            { idString: "box", position: Vec.create(0.55, -132.81) },
            { idString: "grenade_box", position: Vec.create(-1.93, -128) },

            { idString: "metal_door", position: Vec.create(-21.48, -80.0), rotation: 1 },
            { idString: "metal_door", position: Vec.create(-21.48, -89.95), rotation: 3 },
            { idString: "metal_door", position: Vec.create(26.45, 93.5), rotation: 0 },
            { idString: "metal_door", position: Vec.create(-46.35, 93.5), rotation: 0 },
            { idString: "metal_door", position: Vec.create(-41.58, -46.75), rotation: 1 },
            { idString: "metal_door", position: Vec.create(-46.16, -112.54), rotation: 0 },

            { idString: "barrel", position: Vec.create(-6.05, -114.3) },
            { idString: "barrel", position: Vec.create(-38.55, -149.07) },
            { idString: "barrel", position: Vec.create(2.65, -149.35) },
            { idString: "barrel", position: Vec.create(-1.89, -5.69) },
            { idString: "barrel", position: Vec.create(12.18, 110.37), waterOverlay: true },

            { idString: "propane_tank", position: Vec.create(-32.55, -151.05) },
            { idString: "propane_tank", position: Vec.create(2.73, 32.85) },

            { idString: "regular_crate", position: Vec.create(8.42, -0.22) },
            { idString: "regular_crate", position: Vec.create(-46.77, -34.5) },
            { idString: "regular_crate", position: Vec.create(17.1, -176.84) },
            { idString: "regular_crate", position: Vec.create(23.68, -124.04) },
            { idString: "regular_crate", position: Vec.create(41.82, 100.39), waterOverlay: true },
            { idString: "regular_crate", position: Vec.create(13.33, 132.54), waterOverlay: true },
            { idString: "regular_crate", position: Vec.create(2.39, 137.28), waterOverlay: true },

            { idString: "flint_crate", position: Vec.create(-14.86, -103.69) },
            { idString: "flint_crate", position: Vec.create(-1.93, 25.84) },
            { idString: "flint_crate", position: Vec.create(12.87, 100.28), waterOverlay: true },

            { idString: "tear_gas_crate", position: Vec.create(-6, -149.92), rotation: 0 },
            { idString: "tear_gas_crate", position: Vec.create(-33.17, 113.09), rotation: 1, waterOverlay: true },

            { idString: "grenade_crate", position: Vec.create(-47, -79.33) },

            { idString: "ammo_crate", position: Vec.create(-1.92, 3.78) },
            { idString: "ammo_crate", position: Vec.create(-15.2, -58.96) },
            { idString: "ammo_crate", position: Vec.create(-46.59, -89.67) },
            { idString: "ammo_crate", position: Vec.create(-15.01, -113.52) },

            { idString: "roadblock", position: Vec.create(-27.88, -122.26), rotation: 3 },
            { idString: "roadblock", position: Vec.create(-28.97, -119.19), rotation: 3 },
            { idString: "roadblock", position: Vec.create(-27.88, -116.21), rotation: 3 },

            { idString: "pallet", position: Vec.create(-1.89, -5.69), rotation: 0 },
            { idString: "pallet", position: Vec.create(8.42, -0.22), rotation: 0 },
            { idString: "pallet", position: Vec.create(23.68, -124.04), rotation: 0 },
            { idString: "pallet", position: Vec.create(-14.86, -103.69), rotation: 0 },
            { idString: "pallet", position: Vec.create(-28.3, -119.15), rotation: 1 },
            { idString: "pallet", position: Vec.create(41.21, 46.52), rotation: 0 },
            { idString: "pallet", position: Vec.create(-47, -79.33), rotation: 1 },
            { idString: "pallet", position: Vec.create(-1.84, -130.68), rotation: 0 },

            { idString: "sink", position: Vec.create(41.21, 46.52), rotation: 2 },

            { idString: "sandbags", position: Vec.create(40.83, -16.02), rotation: 0 },
            { idString: "sandbags", position: Vec.create(-36.24, -58.52), rotation: 1 },
            { idString: "sandbags", position: Vec.create(-13.81, -160.36), rotation: 1 },
            { idString: "sandbags", position: Vec.create(23.38, -135.79), rotation: 1 },
            { idString: "sandbags", position: Vec.create(-18.15, 88.38), rotation: 2 },
            { idString: "sandbags", position: Vec.create(-17.94, 77.59), rotation: 3 },
            { idString: "sandbags", position: Vec.create(25.65, 112.33), rotation: 1, waterOverlay: true },
            { idString: "sandbags", position: Vec.create(-15.6, 122.39), rotation: 1, waterOverlay: true },

            { idString: "control_panel2", position: Vec.create(-45.25, 138.06), rotation: 2, waterOverlay: true },

            { idString: "super_barrel", position: Vec.create(-3.23, 34.68) },

            { idString: "lamp", position: Vec.create(-50.67, 15.54), rotation: 3 },
            { idString: "lamp", position: Vec.create(-2.16, -152.24), rotation: 2 },
            { idString: "lamp", position: Vec.create(-2.17, 91.52), rotation: 0 },
            { idString: "lamp", position: Vec.create(46.65, 118.81), rotation: 1 },
            { idString: "lamp", position: Vec.create(-50.92, 118.9), rotation: 3 },
            { idString: "lamp", position: Vec.create(-50.67, -83.62), rotation: 3 },

            // vault
            { idString: "lamp", position: Vec.create(27.09, -96.53), rotation: 2 },
            {
                idString: {
                    tango_crate: 1,
                    briefcase: 0.75
                },
                position: Vec.create(24.7, -107.96),
                rotation: 1
            },
            { idString: "melee_crate", position: Vec.create(23.67, -93.73) },
            { idString: "grenade_crate", position: Vec.create(30.51, -93.73) },
            { idString: "gun_locker", position: Vec.create(37.53, -79.28), rotation: 2 },
            { idString: "gun_case", position: Vec.create(41.05, -69.07), rotation: 3 }
        ],
        subBuildings: [
            { idString: "mutated_forklift", position: Vec.create(-0.47, -76.52), orientation: 3 },
            { idString: randomPortDamagedContainerReversed, position: Vec.create(-101.24, 0.44), orientation: 2 },

            { idString: "cargo_ship_bottom_floor_vault", position: Vec.create(32.38, -89.75) },
            { idString: "cargo_ship_top_floor_shadow", position: Vec.create(-1.8, -3.2) },

            // ----------------------------------
            // container distance X = 14.3
            // container distance Y = 28.55
            // ----------------------------------
            { idString: randomPortOpenContainerOneSide, position: Vec.create(10.75, -75.60) },
            { idString: "container_21", position: Vec.create(10.75, -104.15) },
            { idString: randomPortOpenContainerTwoSide, position: Vec.create(-43.49, -5.3) },
            { idString: randomPortDamagedContainerReversed, position: Vec.create(29.19, 5.3), orientation: 2 },
            { idString: "container_20", position: Vec.create(-14.89, -5.3) },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(43.49, -36.25), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(29.19, -36.25), orientation: 2 },
            { idString: randomPortDamagedContainer, position: Vec.create(-29.19, 64.8) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(-43.49, 64.8) },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(39.25, 65.25) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(-24.95, -65.25), orientation: 2 },
            { idString: "container_20", position: Vec.create(10.65, 65.25) },

            { idString: "container_20", position: Vec.create(135.95, -33.5), orientation: 3 }
        ]
    },
    {
        idString: "cargo_ship_top_floor_control_room_ceiling",
        name: "Cargo Ship Control Room Ceiling",
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(50.25, 61, Vec.create(0, 0.45)),
            RectangleHitbox.fromRect(100, 50, Vec.create(0, 6))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(50.25, 61, Vec.create(0, 0.45)),
            RectangleHitbox.fromRect(100, 50, Vec.create(0, 6))
        ),
        ceilingZIndex: ZIndexes.BuildingsCeiling - 1,
        ceilingImages: [{
            key: "cargo_ship_control_room_ceiling",
            position: Vec.create(0, 0),
            scale: Vec.create(2, 2)
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
        // visibleFromLayers: Layers.All, - TODO
        collideWithLayers: Layers.Adjacent,
        ceilingHitbox: new GroupHitbox(// -0.55, -6
            RectangleHitbox.fromRect(15.2, 11.27, Vec.create(25.6, -34.18)),
            RectangleHitbox.fromRect(15.2, 11.27, Vec.create(-1.6, -156.84)),
            RectangleHitbox.fromRect(15.2, 11.27, Vec.create(-26.76, 94.22))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(3.63, 64.39, Vec.create(51.52, 158.63)),
            RectangleHitbox.fromRect(3.62, 159.73, Vec.create(51.52, 36.39)),
            RectangleHitbox.fromRect(3.58, 130.91, Vec.create(-51.41, -48.78)),
            RectangleHitbox.fromRect(3.6, 60.78, Vec.create(51.54, -83.73)),
            RectangleHitbox.fromRect(3.44, 90, Vec.create(-51.48, 71.54)),
            RectangleHitbox.fromRect(3.47, 64.39, Vec.create(-51.51, 158.63)),
            RectangleHitbox.fromRect(106.58, 3.43, Vec.create(0.05, 191.8)),
            new CircleHitbox(3.66, Vec.create(43.22, -158.53)),
            RectangleHitbox.fromRect(2.01, 31.41, Vec.create(40.02, -141.29)),
            RectangleHitbox.fromRect(2.01, 31.41, Vec.create(-39.97, -141.23)),
            RectangleHitbox.fromRect(13.62, 2.06, Vec.create(45.8, -126.61)),
            RectangleHitbox.fromRect(13.62, 2.06, Vec.create(-45.77, -126.53)),
            RectangleHitbox.fromRect(33.56, 2, Vec.create(24.23, -156.82)),
            RectangleHitbox.fromRect(33.56, 2, Vec.create(-24.22, -156.82)),
            new CircleHitbox(6.26, Vec.create(46.86, -132.54)),
            new CircleHitbox(6.26, Vec.create(46.3, -138.28)),
            new CircleHitbox(5.92, Vec.create(45.74, -143.62)),
            new CircleHitbox(5.1, Vec.create(44.84, -150.22)),
            new CircleHitbox(3.66, Vec.create(-43.57, -157.45)),
            new CircleHitbox(3.66, Vec.create(-41.76, -161.28)),
            new CircleHitbox(3.66, Vec.create(-40.03, -164.45)),
            new CircleHitbox(3.66, Vec.create(-37.85, -167.85)),
            new CircleHitbox(3.66, Vec.create(-34.68, -172.14)),
            new CircleHitbox(3.66, Vec.create(-31.15, -176.06)),
            new CircleHitbox(3.66, Vec.create(-28.26, -178.79)),
            new CircleHitbox(3.66, Vec.create(-25.15, -181.26)),
            new CircleHitbox(3.66, Vec.create(-21.33, -183.85)),
            new CircleHitbox(3.66, Vec.create(-17.06, -186.09)),
            new CircleHitbox(3.66, Vec.create(-12.15, -188.01)),
            new CircleHitbox(3.66, Vec.create(-6.68, -189.32)),
            new CircleHitbox(3.66, Vec.create(-1.87, -189.84)),
            new CircleHitbox(3.66, Vec.create(3.11, -189.76)),
            new CircleHitbox(3.66, Vec.create(8.93, -188.88)),
            new CircleHitbox(3.66, Vec.create(14.25, -187.29)),
            new CircleHitbox(3.66, Vec.create(19.46, -184.98)),
            new CircleHitbox(3.66, Vec.create(23.87, -182.29)),
            new CircleHitbox(3.66, Vec.create(27.63, -179.43)),
            new CircleHitbox(3.66, Vec.create(31.72, -175.58)),
            new CircleHitbox(6.26, Vec.create(-46.93, -132.22)),
            new CircleHitbox(6.26, Vec.create(-46.26, -138.17)),
            new CircleHitbox(5.92, Vec.create(-45.49, -144.48)),
            new CircleHitbox(5.1, Vec.create(-44.29, -151.62)),
            new CircleHitbox(3.66, Vec.create(34.65, -172.22)),
            new CircleHitbox(3.66, Vec.create(37.94, -167.93)),
            new CircleHitbox(3.66, Vec.create(40.76, -163.23)),
            new CircleHitbox(2.92, Vec.create(-49.9, -135.83)),
            new CircleHitbox(2.57, Vec.create(46.43, -153.46)),
            new CircleHitbox(1.98, Vec.create(-51.24, -128.92)),
            new CircleHitbox(2.35, Vec.create(-9.68, -190.05)),
            new CircleHitbox(2.57, Vec.create(45.6, -155.59)),
            new CircleHitbox(1.98, Vec.create(48.78, -147.72)),
            new CircleHitbox(1.98, Vec.create(50.14, -141.65)),
            new CircleHitbox(1.98, Vec.create(50.98, -135.57)),
            new CircleHitbox(2.35, Vec.create(50.98, -128.59)),
            new CircleHitbox(2.35, Vec.create(11.94, -189.48)),
            new CircleHitbox(2.35, Vec.create(-4.25, -190.96)),
            new CircleHitbox(2.35, Vec.create(0.73, -191.18)),
            new CircleHitbox(2.35, Vec.create(-30.66, -178.39)),
            new CircleHitbox(2.35, Vec.create(6.32, -190.74)),
            new CircleHitbox(2.35, Vec.create(-33.99, -175.03)),
            new CircleHitbox(2.35, Vec.create(-37.51, -170.66)),
            new CircleHitbox(2.35, Vec.create(-40.1, -166.86)),
            new CircleHitbox(2.35, Vec.create(-48.06, -148.76)),
            new CircleHitbox(2.35, Vec.create(-49.71, -141.75)),
            new CircleHitbox(2.35, Vec.create(-14.84, -188.45)),
            new CircleHitbox(2.35, Vec.create(-19.8, -186.19)),
            new CircleHitbox(2.35, Vec.create(-24.01, -183.69)),
            new CircleHitbox(2.35, Vec.create(43.36, -161.3)),
            new CircleHitbox(2.35, Vec.create(-27.4, -181.19)),
            new CircleHitbox(2.35, Vec.create(-45.85, -155.4)),
            new CircleHitbox(2.35, Vec.create(37.53, -170.68)),
            new CircleHitbox(2.35, Vec.create(34.51, -174.5)),
            new CircleHitbox(2.35, Vec.create(17.39, -187.41)),
            new CircleHitbox(2.35, Vec.create(22.4, -184.84)),
            new CircleHitbox(2.35, Vec.create(26.69, -181.9)),
            new CircleHitbox(2.35, Vec.create(30.6, -178.6)),
            new CircleHitbox(2.35, Vec.create(40.64, -166.19)),
            RectangleHitbox.fromRect(16.19, 2.02, Vec.create(44.5, 140.6)),
            RectangleHitbox.fromRect(3.55, 7.18, Vec.create(51.52, -127.73)),
            RectangleHitbox.fromRect(3.63, 7.18, Vec.create(-51.41, -127.7)),
            RectangleHitbox.fromRect(1.97, 26.52, Vec.create(24.88, 141.48)),
            RectangleHitbox.fromRect(8.62, 2.05, Vec.create(-19.95, 166.06)),
            RectangleHitbox.fromRect(2.02, 14.16, Vec.create(-13.82, 185.86)),
            RectangleHitbox.fromRect(16.19, 2.02, Vec.create(-43.81, 140.77)),
            RectangleHitbox.fromRect(19.08, 2.05, Vec.create(16.33, 166.22)),
            RectangleHitbox.fromRect(33.32, 1.97, Vec.create(-8.46, 178.53)),
            RectangleHitbox.fromRect(2.05, 38.86, Vec.create(-24.2, 147.9)),
            RectangleHitbox.fromRect(2.02, 14.16, Vec.create(7.18, 172.27))
        ),
        spawnHitbox: RectangleHitbox.fromRect(180, 400, Vec.create(-1.5, -1.8)),
        floorImages: [
            {
                key: "cargo_ship_floor_top_2",
                position: Vec.create(0.07, -94.7),
                scale: Vec.create(-1, -1)
            },
            {
                key: "cargo_ship_floor_top_1",
                position: Vec.create(0.115, 94.7)
            }
        ],
        floors: [
            { // Stairs
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(26.94, 10.06, Vec.create(63.39, -119.14)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec.create(-63.34, 21.67)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec.create(-63.47, 121.57)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec.create(63.39, -119.14)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec.create(-63.32, -119.09)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec.create(63.37, -48.46)),
                    RectangleHitbox.fromRect(26.94, 10.06, Vec.create(63.44, 121.47))
                ),
                layer: 1
            },
            // Ship Floor
            {
                type: FloorNames.Metal,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(103.06, 256.5, Vec.create(0, 0)),
                    RectangleHitbox.fromRect(78.64, 35.52, Vec.create(-0.02, -138.36)),
                    RectangleHitbox.fromRect(12.2, 11.8, Vec.create(-20.12, 184.79)),
                    RectangleHitbox.fromRect(25.48, 63.96, Vec.create(-37.62, 158.65)),
                    RectangleHitbox.fromRect(25.48, 63.96, Vec.create(37.84, 159.69)),
                    RectangleHitbox.fromRect(25.48, 24.04, Vec.create(20.44, 178.83))
                )
            },
            // Bathroom
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(20.19, 11.33, Vec.create(-3.55, 184.83))
            },
            // Control Room
            {
                type: FloorNames.Carpet,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(32.38, 13.54, Vec.create(-8.51, 171.31)),
                    RectangleHitbox.fromRect(47.91, 36.11, Vec.create(0.54, 148.19))
                )
            }
        ],
        obstacles: [
            { idString: "cargo_ship_top_stair", position: Vec.create(64, -119.14), rotation: 0, layer: -1 },
            { idString: "cargo_ship_top_stair", position: Vec.create(-64, 21.67), rotation: 2, layer: -1 },
            { idString: "cargo_ship_top_stair", position: Vec.create(-64, 121.57), rotation: 2, layer: -1 },
            { idString: "cargo_ship_top_stair", position: Vec.create(64, -119.14), rotation: 0, layer: -1 },
            { idString: "cargo_ship_top_stair", position: Vec.create(64, -48.46), rotation: 0, layer: -1 },
            { idString: "cargo_ship_top_stair", position: Vec.create(64, 121.47), rotation: 0, layer: -1 },
            { idString: "cargo_ship_top_stair", position: Vec.create(-64, -119.09), rotation: 2, layer: -1 },

            { idString: "cargo_ship_stair_support", position: Vec.create(26.36, -27.63), rotation: 0 },
            { idString: "cargo_ship_stair_support", position: Vec.create(26.28, -40.59), rotation: 0 },
            { idString: "cargo_ship_stair_support", position: Vec.create(-6.42, -156.84), rotation: 1 },
            { idString: "cargo_ship_stair_support", position: Vec.create(6.42, -156.84), rotation: 1 },
            { idString: "cargo_ship_stair_support", position: Vec.create(-26.09, 100.04), rotation: 2 },
            { idString: "cargo_ship_stair_support", position: Vec.create(-26.08, 113.1), rotation: 2 },

            { idString: "cargo_ship_stair", position: Vec.create(63.71, -48.43), rotation: 0, layer: -1 },
            { idString: "cargo_ship_stair", position: Vec.create(63.71, 121.45), rotation: 0, layer: -1 },
            { idString: "cargo_ship_stair", position: Vec.create(63.71, -119.14), rotation: 0, layer: -1 },
            { idString: "cargo_ship_stair", position: Vec.create(-63.71, -119.07), rotation: 2, layer: -1 },
            { idString: "cargo_ship_stair", position: Vec.create(-63.71, 21.75), rotation: 2, layer: -1 },
            { idString: "cargo_ship_stair", position: Vec.create(-63.71, 121.65), rotation: 2, layer: -1 },

            { idString: "cargo_ship_stair_entrance_walls", position: Vec.create(0.11, -156.81), rotation: 0 },
            { idString: "cargo_ship_stair_entrance_walls", position: Vec.create(26.3, -34.17), rotation: 3 },
            { idString: "cargo_ship_stair_entrance_walls", position: Vec.create(-26.12, 106.47), rotation: 3 },

            { idString: "life_preserver", position: Vec.create(-48.2, 5.29), rotation: 2 },
            { idString: "life_preserver", position: Vec.create(-48.27, -4.55), rotation: 2 },
            { idString: "life_preserver", position: Vec.create(-48.19, 95.05), rotation: 2 },
            { idString: "life_preserver", position: Vec.create(-48.26, 104.75), rotation: 2 },

            { idString: "box", position: Vec.create(-22.41, 187.01) },
            { idString: "box", position: Vec.create(-17.74, 187.37) },
            { idString: "box", position: Vec.create(-19.93, 182.27) },
            { idString: { box: 1, grenade_box: 0.5 }, position: Vec.create(-46.89, 136.68) },

            { idString: "sandbags", position: Vec.create(-0.01, 32), rotation: 0 },
            { idString: "sandbags", position: Vec.create(-12.23, 80.89), rotation: 0 },
            { idString: "sandbags", position: Vec.create(-5.56, 123.33), rotation: 0 },
            { idString: "sandbags", position: Vec.create(41.92, -30.07), rotation: 0 },
            { idString: "sandbags", position: Vec.create(0.52, -56.33), rotation: 1 },
            { idString: "sandbags", position: Vec.create(-4.43, -118.85), rotation: 1 },
            { idString: "sandbags", position: Vec.create(1.12, -129.68), rotation: 2 },

            { idString: "ammo_crate", position: Vec.create(-0.43, 85.3) },
            { idString: "ammo_crate", position: Vec.create(-30.36, 161.85) },
            { idString: "ammo_crate", position: Vec.create(0.74, 163.46) },
            { idString: "ammo_crate", position: Vec.create(-13.62, 39.75) },
            { idString: "ammo_crate", position: Vec.create(0.51, -44.45) },

            { idString: "flint_crate", position: Vec.create(25.16, 10.5) },
            { idString: "flint_crate", position: Vec.create(-44.69, 185.13) },
            { idString: "flint_crate", position: Vec.create(-18.23, -150.04) },

            { idString: "grenade_crate", position: Vec.create(-11.24, 31.1) },
            { idString: "grenade_crate", position: Vec.create(0.73, 173) },

            { idString: "regular_crate", position: Vec.create(28.58, 0.43) },
            { idString: "regular_crate", position: Vec.create(-0.28, 75.5) },
            { idString: "regular_crate", position: Vec.create(44.18, 134.72) },
            { idString: "regular_crate", position: Vec.create(-44.62, 146.85) },
            { idString: "regular_crate", position: Vec.create(-41.59, 103.48) },
            { idString: "regular_crate", position: Vec.create(-0.23, -67.92) },
            { idString: "regular_crate", position: Vec.create(-8.67, -54.5) },

            { idString: "barrel", position: Vec.create(3.63, -121.38) },
            { idString: "barrel", position: Vec.create(38.97, -37.99) },
            { idString: "barrel", position: Vec.create(-45.69, 176.14) },
            { idString: "barrel", position: Vec.create(-18.35, -140.62) },

            { idString: "pallet", position: Vec.create(44.18, 134.72), rotation: 0 },
            { idString: "pallet", position: Vec.create(-18.23, -150.04), rotation: 0 },
            { idString: "pallet", position: Vec.create(-18.22, -140.66), rotation: 0 },
            { idString: "pallet", position: Vec.create(-44.13, 134.75), rotation: 0 },
            { idString: "pallet", position: Vec.create(-20.34, 184.3), rotation: 0 },
            { idString: "pallet", position: Vec.create(0.73, 173), rotation: 0 },

            { idString: "window2", position: Vec.create(19.2, 128.42), rotation: 1 },
            { idString: "window2", position: Vec.create(9.73, 128.42), rotation: 1 },
            { idString: "window2", position: Vec.create(0.39, 128.42), rotation: 1 },
            { idString: "window2", position: Vec.create(-9.09, 128.42), rotation: 1 },
            { idString: "window2", position: Vec.create(-18.5, 128.42), rotation: 1 },

            { idString: "grey_office_chair", position: Vec.create(11.71, 143.32), rotation: 2 },
            { idString: "grey_office_chair", position: Vec.create(-10.02, 143.53), rotation: 2 },

            { idString: "propane_tank", position: Vec.create(-42.07, 137.08) },
            { idString: "propane_tank", position: Vec.create(-46.52, 132.05) },

            { idString: "metal_door", position: Vec.create(-30.73, 140.77), rotation: 2 },
            { idString: "metal_door", position: Vec.create(31.41, 140.77), rotation: 0 },
            { idString: "metal_door", position: Vec.create(-24.22, 172.12), rotation: 1 },
            { idString: "metal_door", position: Vec.create(24.97, 159.73), rotation: 1 },
            { idString: "metal_door", position: Vec.create(6.68, 184.65), rotation: 1 },

            // random lonely obstacles
            { idString: "super_barrel", position: Vec.create(30, -8.63) },
            { idString: randomToilet, position: Vec.create(-8.26, 184.78), rotation: 1 },
            { idString: "bunk_bed", position: Vec.create(17.13, 172.71), rotation: 1 },
            { idString: "tv", position: Vec.create(41.25, 189.44), rotation: 3 },
            { idString: "small_table", position: Vec.create(41.33, 185.74), rotation: 1 },
            { idString: "office_chair", position: Vec.create(41.54, 181.14), rotation: 0 },
            { idString: "fire_hatchet_case", position: Vec.create(-19.79, 158.1), rotation: 1 },
            { idString: "control_panel2", position: Vec.create(-16.83, 134.38), rotation: 0 },
            { idString: "control_panel_small", position: Vec.create(19.42, 134.3), rotation: 0 },
            { idString: "tugboat_control_panel", position: Vec.create(2.38, 134.74), rotation: 2 },
            { idString: "trash_can", position: Vec.create(-19.53, 141.89) },
            { idString: "cabinet", position: Vec.create(21.2, 145.84), rotation: 3 },
            { idString: "fridge", position: Vec.create(46.06, 168.98), rotation: 3 },
            { idString: randomSmallStove, position: Vec.create(46.07, 160.68), rotation: 3 },
            { idString: "kitchen_unit_1", position: Vec.create(40.08, 145.58), rotation: 0 },
            { idString: "kitchen_unit_2", position: Vec.create(46.37, 145.11), rotation: 3 },
            { idString: "kitchen_unit_3", position: Vec.create(45.91, 152.89), rotation: 3 }
        ],
        subBuildings: [
            { idString: "cargo_ship_top_floor_control_room_ceiling", position: Vec.create(0, 159.5) },

            // ----------------------------------
            // container distance X = 14.3
            // container distance Y = 28.55
            // ----------------------------------

            { idString: randomPortOpenContainerOneSide, position: Vec.create(-30.75, -140.5) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(30.75, -140.5) },
            { idString: randomPortDamagedContainerReversed, position: Vec.create(16.3, -140.5) },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(41.5, 97.75), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(27.2, 97.75), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(-41.5, -69.2) },
            { idString: "container_20", position: Vec.create(27.2, 69.2), orientation: 2 },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(-41.5, 97.75), orientation: 2 },
            { idString: "container_20", position: Vec.create(27.2, -97.75) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(41.5, -69.2) },
            { idString: randomPortDamagedContainerReversed, position: Vec.create(27.2, -69.2) },
            { idString: randomPortDamagedContainerReversed, position: Vec.create(-12.9, 69.2), orientation: 2 },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(-12.7, 1) },
            { idString: "container_20", position: Vec.create(-27, 1) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(12.7, 27.55), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(27, 27.55), orientation: 2 },
            { idString: randomPortOpenContainerTwoSide, position: Vec.create(-41.3, -27.55) },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(-41.37, -1.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(41.37, 30.05) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(27.07, 30.05) },

            { idString: randomPortOpenContainerOneSide, position: Vec.create(27.07, -42.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(41.37, -42.5), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(-41.37, 71.05) },
            { idString: randomPortDamagedContainer, position: Vec.create(-27.07, 71.05) },

            { idString: randomPortOpenContainerTwoSide, position: Vec.create(27.17, 71.8) },
            { idString: "container_20", position: Vec.create(12.87, 71.8) },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(-41.47, -71.8), orientation: 2 },
            { idString: randomPortDamagedContainer, position: Vec.create(-27.17, -100.35), orientation: 2 },
            { idString: randomPortOpenContainerOneSide, position: Vec.create(41.47, 100.35) }
        ],
        lootSpawners: [{
            table: "ship_skins",
            position: Vec.create(0.79, 151.41)
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
            { idString: "briefcase", position: Vec.create(-20.7, 10.85), rotation: 2 },
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        idString: "lighthouse",
        name: "Lighthouse",
        defType: DefinitionType.Building,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        // there's a reason we tend to avoid curved walls
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.94, 20.04, Vec.create(20.45, 27.42)),
            RectangleHitbox.fromRect(1.94, 59.32, Vec.create(-21.46, 8.34)),
            RectangleHitbox.fromRect(1.94, 27.68, Vec.create(20.45, -7.48)),
            RectangleHitbox.fromRect(16.87, 1.98, Vec.create(12.99, 37.89)),
            RectangleHitbox.fromRect(16.96, 1.98, Vec.create(-13.96, 37.89)),
            RectangleHitbox.fromRect(-21.25, 0.62, Vec.create(-9.67, 0.19)),
            RectangleHitbox.fromRect(15.26, 1.99, Vec.create(-13.18, -11.24)),
            RectangleHitbox.fromRect(10.37, 1.99, Vec.create(14.91, -11.24)),
            RectangleHitbox.fromRect(2.98, 2.97, Vec.create(8.6, -11.24)),
            RectangleHitbox.fromRect(2.98, 2.97, Vec.create(-4.38, -11.24)),
            RectangleHitbox.fromRect(2.98, 2.98, Vec.create(-4.37, 12.89)),
            new CircleHitbox(1.02, Vec.create(18.56, -31.24)),
            new CircleHitbox(1.02, Vec.create(16.48, -34.94)),
            new CircleHitbox(1.02, Vec.create(18.09, -32.25)),
            new CircleHitbox(1.02, Vec.create(19.44, -28.84)),
            new CircleHitbox(1.01, Vec.create(19.76, -27.67)),
            new CircleHitbox(0.98, Vec.create(20.44, -21.4)),
            new CircleHitbox(0.98, Vec.create(20.44, -22.1)),
            new CircleHitbox(0.98, Vec.create(20.43, -22.79)),
            new CircleHitbox(0.98, Vec.create(20.38, -23.63)),
            new CircleHitbox(0.98, Vec.create(20.31, -24.47)),
            new CircleHitbox(1, Vec.create(20.01, -26.49)),
            new CircleHitbox(1.03, Vec.create(19.04, -30.05)),
            new CircleHitbox(1.03, Vec.create(17.09, -34.04)),
            new CircleHitbox(1.02, Vec.create(15.8, -35.83)),
            new CircleHitbox(1, Vec.create(14.17, -37.56)),
            new CircleHitbox(1, Vec.create(13.36, -38.26)),
            new CircleHitbox(0.98, Vec.create(20.18, -25.45)),
            new CircleHitbox(0.99, Vec.create(10.37, -40.24)),
            new CircleHitbox(0.98, Vec.create(11.34, -39.69)),
            new CircleHitbox(0.99, Vec.create(12.38, -39.01)),
            new CircleHitbox(1.01, Vec.create(15.07, -36.65)),
            new CircleHitbox(1.02, Vec.create(17.64, -33.1)),
            new CircleHitbox(0.99, Vec.create(-2.99, -42.56)),
            new CircleHitbox(1, Vec.create(-1.61, -42.65)),
            new CircleHitbox(1, Vec.create(-0.26, -42.67)),
            new CircleHitbox(1, Vec.create(1.04, -42.63)),
            new CircleHitbox(1, Vec.create(2.3, -42.54)),
            new CircleHitbox(0.99, Vec.create(3.44, -42.4)),
            new CircleHitbox(0.99, Vec.create(4.6, -42.22)),
            new CircleHitbox(0.99, Vec.create(5.74, -41.97)),
            new CircleHitbox(0.99, Vec.create(6.94, -41.65)),
            new CircleHitbox(0.99, Vec.create(8.16, -41.23)),
            new CircleHitbox(0.99, Vec.create(9.3, -40.76)),
            new CircleHitbox(1, Vec.create(-18.27, -33.72)),
            new CircleHitbox(1.01, Vec.create(-18.88, -32.65)),
            new CircleHitbox(1.02, Vec.create(-19.5, -31.39)),
            new CircleHitbox(1.01, Vec.create(-19.98, -30.2)),
            new CircleHitbox(1.02, Vec.create(-20.45, -28.82)),
            new CircleHitbox(1.01, Vec.create(-20.81, -27.46)),
            new CircleHitbox(1.01, Vec.create(-21.09, -26.16)),
            new CircleHitbox(0.99, Vec.create(-21.28, -24.84)),
            new CircleHitbox(0.97, Vec.create(-21.39, -23.62)),
            new CircleHitbox(0.98, Vec.create(-21.44, -22.41)),
            new CircleHitbox(0.97, Vec.create(-21.44, -21.44)),
            new CircleHitbox(0.98, Vec.create(-5.66, -42.19)),
            new CircleHitbox(0.96, Vec.create(-14.12, -38.42)),
            new CircleHitbox(0.97, Vec.create(-15.13, -37.55)),
            new CircleHitbox(0.98, Vec.create(-15.99, -36.71)),
            new CircleHitbox(0.98, Vec.create(-16.78, -35.81)),
            new CircleHitbox(0.99, Vec.create(-17.57, -34.78)),
            new CircleHitbox(0.99, Vec.create(-4.36, -42.41)),
            new CircleHitbox(0.98, Vec.create(-8.38, -41.49)),
            new CircleHitbox(0.96, Vec.create(-9.65, -41.02)),
            new CircleHitbox(0.96, Vec.create(-10.87, -40.47)),
            new CircleHitbox(0.96, Vec.create(-12, -39.87)),
            new CircleHitbox(0.96, Vec.create(-13.08, -39.18)),
            new CircleHitbox(0.98, Vec.create(-7.51, -41.75)),
            new CircleHitbox(0.98, Vec.create(-6.62, -41.98))
        ),
        spawnHitbox: RectangleHitbox.fromRect(65, 98, Vec.create(0, 0)),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(42.73, 63.65, Vec.create(-0.53, 6.93)),
            RectangleHitbox.fromRect(18.84, 17.4, Vec.create(-0.76, -33.11)),
            RectangleHitbox.fromRect(4.1, 15.7, Vec.create(-11.07, -32.01)),
            RectangleHitbox.fromRect(3.81, 7.72, Vec.create(12.34, -34.62)),
            RectangleHitbox.fromRect(9.24, 6.57, Vec.create(-16.35, -26.84)),
            RectangleHitbox.fromRect(6.35, 5.5, Vec.create(14.84, -31.57)),
            RectangleHitbox.fromRect(3.37, 2.92, Vec.create(-13.83, -36.83)),
            RectangleHitbox.fromRect(9.24, 6.57, Vec.create(15.22, -27.24)),
            RectangleHitbox.fromRect(4.1, 15.7, Vec.create(9.79, -32.37)),
            RectangleHitbox.fromRect(8.27, 5.07, Vec.create(-15.14, -31.09)),
            RectangleHitbox.fromRect(5.19, 2.6, Vec.create(-14.9, -34.74)),
            RectangleHitbox.fromRect(3.37, 2.92, Vec.create(14.6, -35.05))
        ),
        spawnMode: MapObjectSpawnMode.Beach,
        spawnOffset: Vec.create(-15, 0),
        floorImages: [
            {
                key: "lighthouse_floor_1",
                position: Vec.create(0, -21.82)
            },
            {
                key: "lighthouse_floor_2",
                position: Vec.create(0, 21.82)
            }
        ],
        ceilingImages: [{
            key: "lighthouse_ceiling",
            position: Vec.create(-1, -3.5),
            scale: Vec.create(2, 2)
        }],
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
        floors: [
            {
                type: FloorNames.Wood,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(42.73, 63.65, Vec.create(-0.53, 6.93)),
                    RectangleHitbox.fromRect(18.84, 17.4, Vec.create(-0.76, -33.11)),
                    RectangleHitbox.fromRect(4.1, 15.7, Vec.create(-11.07, -32.01)),
                    RectangleHitbox.fromRect(3.81, 7.72, Vec.create(12.34, -34.62)),
                    RectangleHitbox.fromRect(9.24, 6.57, Vec.create(-16.35, -26.84)),
                    RectangleHitbox.fromRect(6.35, 5.5, Vec.create(14.84, -31.57)),
                    RectangleHitbox.fromRect(3.37, 2.92, Vec.create(-13.83, -36.83)),
                    RectangleHitbox.fromRect(9.24, 6.57, Vec.create(15.22, -27.24)),
                    RectangleHitbox.fromRect(4.1, 15.7, Vec.create(9.79, -32.37)),
                    RectangleHitbox.fromRect(8.27, 5.07, Vec.create(-15.14, -31.09)),
                    RectangleHitbox.fromRect(5.19, 2.6, Vec.create(-14.9, -34.74)),
                    RectangleHitbox.fromRect(3.37, 2.92, Vec.create(14.6, -35.05))
                )
            },
            {
                type: FloorNames.Stone,
                hitbox: RectangleHitbox.fromRect(10.37, 4.91, Vec.create(-0.47, 41.23))
            }
        ],
        obstacles: [
            { idString: "window", position: Vec.create(20.47, 11.8), rotation: 0 },
            { idString: "door", position: Vec.create(-0.02, 38), rotation: 0 },
            { idString: "small_stove", position: Vec.create(15.64, 33.27), rotation: 3 },
            { idString: "sink", position: Vec.create(15.44, 24.82), rotation: 3 },
            { idString: "small_table", position: Vec.create(14.99, 11.88), rotation: 0 },
            { idString: "chair", position: Vec.create(10.61, 12.15), rotation: 3 },
            { idString: "gun_case", position: Vec.create(-15.12, 33.96), rotation: 2 },
            { idString: "aegis_crate", position: Vec.create(14.54, -5.34), rotation: 0 },
            { idString: "control_panel_small", position: Vec.create(15.2, -16.15), rotation: 3 },
            { idString: "control_panel_small", position: Vec.create(-16.24, -16.15), rotation: 1 },
            { idString: "door", position: Vec.create(2.57, -11.24), rotation: 0 },
            { idString: "lighthouse_wall_3", position: Vec.create(-4.39, 0.86), rotation: 0 },
            { idString: "lighthouse_wall_1", position: Vec.create(-8.15, 12.89), rotation: 0 },
            { idString: "door", position: Vec.create(-15.09, 12.93), rotation: 0 },
            { idString: "small_bed", position: Vec.create(-9.2, -1.96), rotation: 0 },
            { idString: "small_drawer", position: Vec.create(-17.11, -6.47), rotation: 0 },
            { idString: "lighthouse_crate", position: Vec.create(0, -37) },
            { idString: "sandbags", position: Vec.create(11.66, 43.03), rotation: 0 },
            { idString: "sandbags", position: Vec.create(-12.55, 43.03), rotation: 0 },
            { idString: "sandbags", position: Vec.create(25.8, 32.27), rotation: 1 },
            { idString: "sandbags", position: Vec.create(-27, 32.27), rotation: 1 },
            { idString: "propane_tank", position: Vec.create(20.43, 40.97) },
            { idString: "propane_tank", position: Vec.create(20.43, 45.02) }
        ],
        subBuildings: [
            { idString: "lighthouse_lighting", position: Vec.create(0, -36.2) }
        ],
        lootSpawners: [
            { table: "ground_loot", position: Vec.create(-17, 8) },
            { table: "lighthouse_skin", position: Vec.create(-1, 20) }
        ]
    },
    {
        idString: "lighthouse_lighting",
        name: "Lighthouse Lighting",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(0.25, 0.25, Vec.create(-3.3, 6)),
        ceilingHitbox: RectangleHitbox.fromRect(0.25, 0.25, Vec.create(-3.3, 6)),
        wallsToDestroy: 1,
        noCeilingCollapseEffect: true,
        destroyOnCeilingCollapse: ["lighthouse_stairs"],
        ceilingImages: [{
            key: "lighthouse_shadow",
            position: Vec.create(0, 0),
            scale: Vec.create(2, 2),
            hideOnDead: true
        }],
        obstacles: [
            { idString: "lighthouse_wall_2", position: Vec.create(0.25, 4.7), rotation: 0 },
            { idString: "lighthouse_stairs", position: Vec.create(0.25, 7.8), rotation: 0 }
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(9, 3, Vec.create(0, 1)),
        obstacles: [
            { idString: "detector_walls", position: Vec.create(0, 0), rotation: 0 },
            { idString: "detector_top", position: Vec.create(0, 0.5), rotation: 0 }
        ]
    },
    {
        idString: "headquarters_vault",
        name: "Headquarters Vault",
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
        material: "stone",
        particle: "hq_stone_wall_particle",
        particleVariations: 2,
        collideWithLayers: Layers.Adjacent,
        hasSecondFloor: true,
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
        defType: DefinitionType.Building,
        material: "stone",
        particle: "hq_stone_wall_particle",
        particleVariations: 2,
        ceilingImages: [
            {
                key: "headquarters_torture_window", // dont touch :3
                position: Vec.create(-70.6, -84.2),
                scale: Vec.create(1, 1.055)
            },
            {
                key: "headquarters_ceiling_1",
                position: Vec.create(-5.2, -66.122),
                scale: Vec.create(2.15, 2.15)
            },
            {
                key: "headquarters_ceiling_2",
                position: Vec.create(-51.8, 6.45),
                scale: Vec.create(2.15, 2.15)
            }
        ],
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
                position: Vec.create(0, 7),
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
        defType: DefinitionType.Building,
        material: "metal_heavy",
        particle: "metal_particle",
        reflectBullets: true,
        ceilingZIndex: ZIndexes.ObstaclesLayer3,
        visibleFromLayers: Layers.All,
        hitbox: RectangleHitbox.fromRect(12, 1, Vec.create(0, 12.3)),
        floorImages: [{
            key: "small_bunker_entrance_floor",
            position: Vec.create(-0.05, 20),
            scale: Vec.create(2.2, 2.2)
        }],
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
            RectangleHitbox.fromRect(30.5, 55.5, Vec.create(-19.5, 0)),
            RectangleHitbox.fromRect(61, 14, Vec.create(7, -21))
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
        ceilingImages: [{
            key: "barn_ceiling",
            position: Vec.create(12.9, 11.35),
            scale: Vec.create(2.12, 2.12)
        }],
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
        spawnHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(120, 92),
            // temp fix (bleh)
            RectangleHitbox.fromRect(47, 32, Vec.create(-5, -58))
        ),
        ceilingHitbox: new GroupHitbox(
            RectangleHitbox.fromRect(85.5, 56, Vec.create(-11, -11.9)),
            RectangleHitbox.fromRect(64, 24, Vec.create(-23, 29.5))
        ),
        hasSecondFloor: true,
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
            { idString: "house_column", position: Vec.create(-33.5, -11.6) },
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
            { idString: "briefcase", position: Vec.create(-28.93, -14.85), rotation: 0 },
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        hasSecondFloor: true,
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
        defType: DefinitionType.Building,
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
        ceilingImages: [
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
        ceilingZIndex: ZIndexes.BuildingsCeiling + 1,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
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
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(50, 50, Vec.create(0, -10)),
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
    },

    {
        idString: "blue_stair",
        name: "Blue Stair",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(15, 15),
        material: "metal_heavy",
        particle: "metal_particle",
        reflectBullets: true,
        floorImages: [{
            key: "blue_stair",
            position: Vec.create(0, 0)
        }],
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.33, 10.49, Vec.create(4.21, -0.37)),
            RectangleHitbox.fromRect(1.33, 10.49, Vec.create(-4.2, -0.37)),
            RectangleHitbox.fromRect(1.99, 1.76, Vec.create(4.54, 4.75)),
            RectangleHitbox.fromRect(1.98, 1.76, Vec.create(-4.53, 4.76)),
            RectangleHitbox.fromRect(1.2, 2.57, Vec.create(4.94, -3.77)),
            RectangleHitbox.fromRect(1.2, 2.57, Vec.create(-4.93, -3.77))
        ),
        floors: [{
            type: FloorNames.Metal,
            hitbox: RectangleHitbox.fromRect(7.17, 9.78, Vec.create(0.08, -0.36))
        }]
    },

    {
        idString: "mutated_forklift",
        name: "Mutated Forklift",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(30, 45, Vec.create(0, -11)),
        ceilingHitbox: RectangleHitbox.fromRect(20, 10, Vec.create(0, -25)),
        noCeilingScopeEffect: true,
        material: "metal_heavy",
        particle: "metal_particle",
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(8.17, 14.87, Vec.create(0, 0)),
            RectangleHitbox.fromRect(4.6, 18.25, Vec.create(0, 0)),
            new CircleHitbox(1.88, Vec.create(2.14, -7.18)),
            new CircleHitbox(1.83, Vec.create(2.21, 7.27)),
            new CircleHitbox(1.83, Vec.create(-2.22, 7.22)),
            new CircleHitbox(1.83, Vec.create(-2.22, -7.19))
        ),
        floorImages: [{
            key: "mutated_forklift_2",
            position: Vec.create(0, 0)
        }],
        ceilingImages: [
            {
                key: "mutated_forklift_1",
                position: Vec.create(0, -24.5)
            },
            {
                key: "mutated_forklift_3",
                position: Vec.create(0, -9.5)
            }
        ],
        obstacles: [
            { idString: "truck_tire", position: Vec.create(-3.64, 6.92), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(3.64, 6.92), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(-3.64, -7.15), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(3.64, -7.15), rotation: 0 }
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
                position: Vec.create(-4.9, 8.7),
                scale: Vec.create(2, 2)
            },
            {
                key: "truck_large_back_floor",
                position: Vec.create(4.9, 8.7),
                scale: Vec.create(2, 2)
            }
        ],
        floors: [{
            type: FloorNames.Metal,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(5, 55.5, Vec.create(4.9, 8.7)),
                RectangleHitbox.fromRect(5, 55.5, Vec.create(-4.9, 8.7)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0, -8.73)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.04, 26.37)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec.create(-0.01, 10.8)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.01, -4.78)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.04, 6.86)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec.create(-0.06, -17.83)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.04, 26.37)),
                RectangleHitbox.fromRect(4.96, 2.51, Vec.create(0.02, 22.44)),
                RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.07, 35.3)),
                RectangleHitbox.fromRect(4.77, 1.36, Vec.create(-0.07, 4.32)),
                RectangleHitbox.fromRect(5.08, 1.35, Vec.create(0.03, 32.75)),
                RectangleHitbox.fromRect(5.08, 1.35, Vec.create(-0.1, 13.33))
            )
        }],
        groundGraphics: [
            {
                color: 0x1f1f1f,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.77, 1.36, Vec.create(-0.07, 4.32)),
                    RectangleHitbox.fromRect(5.08, 1.35, Vec.create(0.03, 32.75)),
                    RectangleHitbox.fromRect(5.08, 1.35, Vec.create(-0.1, 13.33)),

                    RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0, -8.73)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.04, 26.37)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec.create(-0.01, 10.8)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.01, -4.78)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.04, 6.86)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec.create(-0.06, -17.83)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.04, 26.37)),
                    RectangleHitbox.fromRect(4.96, 2.51, Vec.create(0.02, 22.44)),
                    RectangleHitbox.fromRect(5.07, 2.53, Vec.create(0.07, 35.3))
                )
            },
            {
                color: 0x363636,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.51, 0.56, Vec.create(0.04, 32.73)),
                    RectangleHitbox.fromRect(4.51, 0.56, Vec.create(0, 4.32)),
                    RectangleHitbox.fromRect(4.51, 0.56, Vec.create(0.01, 13.35))
                )
            },
            {
                color: 0x575757,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(4.56, 1.7, Vec.create(0, -8.73)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec.create(0.04, 26.37)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec.create(-0.01, 10.8)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec.create(0.01, -4.78)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec.create(0.04, 6.86)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec.create(-0.06, -17.83)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec.create(0.04, 26.37)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec.create(0.02, 22.44)),
                    RectangleHitbox.fromRect(4.56, 1.7, Vec.create(0.07, 35.3))
                )
            }
        ],

        obstacles: [
            { idString: "truck_front", position: Vec.create(0.1, -25.49), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(7.26, -15.08), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(7.26, 4.32), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(7.26, 13.43), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(7.26, 32.82), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(-7.26, -15.08), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(-7.26, 4.32), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(-7.26, 13.43), rotation: 0 },
            { idString: "truck_tire", position: Vec.create(-7.26, 32.82), rotation: 0 }
        ],

        subBuildings: [
            { idString: "blue_stair", position: Vec.create(23.33, 12.89), orientation: 3 },
            { idString: randomPortDamagedContainer, position: Vec.create(0, -23), orientation: 2 },
            { idString: randomPortDamagedContainer, position: Vec.create(0, -5.1) }
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
        { idString: "regular_crate", position: Vec.create(-0.82, -13.3) },
        { idString: "regular_crate", position: Vec.create(0.76, -3.71) },
        { idString: "box", position: Vec.create(-2.32, 16.51) },
        { idString: "box", position: Vec.create(-2.32, 11.39) },
        { idString: "box", position: Vec.create(2.86, 12.63) }
    ]),

    truckContainer(2, "two_sided", [
        { idString: "regular_crate", position: Vec.create(0.08, 14.32) },
        { idString: "propane_tank", position: Vec.create(2.55, 6.99) }
    ], [
        { idString: randomPallet, position: Vec.create(0.09, -13.43) }
    ]),

    truckContainer(3, "two_sided", [
        { idString: "barrel", position: Vec.create(-1.55, -14.23) },
        { idString: "box", position: Vec.create(-2.27, -7.29) },
        { idString: "regular_crate", position: Vec.create(-0.06, 0.67) },
        { idString: "regular_crate", position: Vec.create(0.68, 10.51) }
    ]),

    truckContainer(4, "two_sided", [
        { idString: "ammo_crate", position: Vec.create(0, -12) },
        { idString: "box", position: Vec.create(-3.14, 7.99) },
        { idString: "box", position: Vec.create(-3.21, 12.87) },
        { idString: "gun_case", position: Vec.create(2.77, 13.65), rotation: 3 }
    ]),

    truckContainer(5, "two_sided", [
        { idString: "propane_tank", position: Vec.create(2.91, -15.8) },
        { idString: "propane_tank", position: Vec.create(-2.93, -9.67) },
        { idString: "box", position: Vec.create(-2.76, -14.84) },
        { idString: "box", position: Vec.create(2.56, -8.72) },
        { idString: "ammo_crate", position: Vec.create(0.02, 7) },
        { idString: "gun_case", position: Vec.create(0.11, 15.5), rotation: 0 }
    ]),

    truckContainer(6, "two_sided", [
        { idString: "box", position: Vec.create(-2.62, -6.11) },
        { idString: "box", position: Vec.create(2.7, 16.4) }
    ], [
        { idString: randomPallet, position: Vec.create(0, -13.22) },
        { idString: randomPallet, position: Vec.create(0, 9.63) }
    ]),

    // One sided
    truckContainer(7, "one_sided", [
        { idString: "box", position: Vec.create(3.25, 15.3) },
        { idString: "box", position: Vec.create(3.18, 10.34) },
        { idString: "propane_tank", position: Vec.create(3.27, 5.38) }
    ], [
        { idString: randomPallet, position: Vec.create(0.05, -13.22) }
    ]),

    truckContainer(8, "one_sided", [
        { idString: "barrel", position: Vec.create(-1.48, 14.27) },
        { idString: "barrel", position: Vec.create(1.73, 5.53) },
        { idString: "gun_case", position: Vec.create(2.5, -12.56), rotation: 3 }
    ]),

    truckContainer(9, "one_sided", [
        { idString: "trash_bag", position: Vec.create(-2.7, -15.18) },
        { idString: "trash_bag", position: Vec.create(2.85, -12.26) },
        { idString: "trash_bag", position: Vec.create(-2.92, -7.89) },
        { idString: "trash_bag", position: Vec.create(-2.33, 9.25) },
        { idString: "trash_bag", position: Vec.create(2.42, 2.62) }
    ]),

    truckContainer(10, "one_sided", [
        { idString: "box", position: Vec.create(-2.77, -6.21) },
        { idString: "ammo_crate", position: Vec.create(0, 10.54) }
    ], [
        { idString: randomPallet, position: Vec.create(0.05, -13.22) }
    ]),

    truckContainer(11, "one_sided", [
        { idString: "gun_locker", position: Vec.create(3, -11.37), rotation: 3 },
        { idString: "grenade_crate", position: Vec.create(-2.41, 8.66) },
        { idString: "box", position: Vec.create(3.23, 7.78) }
    ]),

    truckContainer(12, "one_sided", [
        { idString: "flint_crate", position: Vec.create(0, -12.59) },
        { idString: "gun_case", position: Vec.create(2.46, -2.23), rotation: 3 },
        { idString: "box", position: Vec.create(2.71, 5.74) },
        { idString: "gun_locker", position: Vec.create(-3.01, 0.22), rotation: 3 }, // LMAO no
        { idString: "ammo_crate", position: Vec.create(0.04, 13.03) }
    ]),

    {
        // we use tugboat "HACK" to generate these in the ocean
        idString: "buoy",
        name: "Buoy",
        defType: DefinitionType.Building,
        spawnMode: MapObjectSpawnMode.Beach,
        spawnHitbox: RectangleHitbox.fromRect(70, 110, Vec.create(50, 0)),
        obstacles: [{
            idString: "buoy",
            get position() { return Vec.create(random(50, 100), 0); }
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
                    Vec.create(75.23, 2.27),
                    Vec.create(76.39, 3.23),
                    Vec.create(78.37, 4.13),
                    Vec.create(80.3, 4.46),
                    Vec.create(82.98, 4.37),
                    Vec.create(85.4, 3.98),
                    Vec.create(88.34, 3.33),
                    Vec.create(91.48, 2.63),
                    Vec.create(94.35, 1.88),
                    Vec.create(97.49, 0.72),
                    Vec.create(99.68, -0.63),
                    Vec.create(101.11, -2.15),
                    Vec.create(102.07, -3.86),
                    Vec.create(102.79, -6.16),
                    Vec.create(103.16, -9.34),
                    Vec.create(102.99, -12.5),
                    Vec.create(102.55, -15.74),
                    Vec.create(101.83, -18.56),
                    Vec.create(100.67, -21.45),
                    Vec.create(99.2, -24.06),
                    Vec.create(97.15, -26.57),
                    Vec.create(95, -28.45),
                    Vec.create(92.37, -30.12),
                    Vec.create(89.33, -31.45),
                    Vec.create(86.43, -32.36),
                    Vec.create(83.47, -32.84),
                    Vec.create(80.86, -33.13),
                    Vec.create(77.91, -33.21),
                    Vec.create(75.28, -32.99),
                    Vec.create(72.92, -32.53),
                    Vec.create(70.31, -31.66),
                    Vec.create(68.38, -30.36),
                    Vec.create(66.72, -28.5),
                    Vec.create(65.44, -26.26),
                    Vec.create(64.59, -23.77),
                    Vec.create(64.3, -21.55),
                    Vec.create(64.33, -19.38),
                    Vec.create(64.93, -17.33),
                    Vec.create(65.8, -15.25),
                    Vec.create(67.42, -12.5),
                    Vec.create(69.49, -8.98),
                    Vec.create(70.92, -5.96),
                    Vec.create(72, -3.55),
                    Vec.create(73.38, -0.7),
                    Vec.create(74.34, 1.02)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec.create(83.61, 21.65),
                    Vec.create(86.92, 21.39),
                    Vec.create(90.68, 22.23),
                    Vec.create(93.79, 23.82),
                    Vec.create(96.56, 26.33),
                    Vec.create(99.05, 30.01),
                    Vec.create(100.66, 33.94),
                    Vec.create(101.54, 36.87),
                    Vec.create(102.31, 40.53),
                    Vec.create(102.6, 44.3),
                    Vec.create(101.94, 48.8),
                    Vec.create(100.26, 52.36),
                    Vec.create(97.51, 55.47),
                    Vec.create(93.08, 59.57),
                    Vec.create(87.56, 64.14),
                    Vec.create(83.09, 66.49),
                    Vec.create(80.82, 66.93),
                    Vec.create(77.86, 66.27),
                    Vec.create(75.51, 64.84),
                    Vec.create(73.06, 62.28),
                    Vec.create(71.34, 60.04),
                    Vec.create(69.17, 55.86),
                    Vec.create(68, 51.84),
                    Vec.create(67.36, 48.01),
                    Vec.create(67.33, 44.43),
                    Vec.create(67.8, 41.07),
                    Vec.create(68.7, 37.99),
                    Vec.create(70.28, 33.95),
                    Vec.create(72.16, 30.55),
                    Vec.create(74.44, 27.45),
                    Vec.create(76.76, 24.99),
                    Vec.create(80.3, 22.64)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec.create(-9.67, -92.78),
                    Vec.create(-6.58, -87.91),
                    Vec.create(-3.76, -80.47),
                    Vec.create(-2.46, -75.85),
                    Vec.create(-1.41, -71.91),
                    Vec.create(-0.08, -65.74),
                    Vec.create(0.48, -61.51),
                    Vec.create(0.57, -55.46),
                    Vec.create(0.42, -49.93),
                    Vec.create(0.03, -44.33),
                    Vec.create(-0.31, -38.56),
                    Vec.create(-0.47, -34),
                    Vec.create(3.42, -33.22),
                    Vec.create(8.26, -33.53),
                    Vec.create(8.91, -32.63),
                    Vec.create(9.09, -28.8),
                    Vec.create(9.09, -25.63),
                    Vec.create(8.8, -22.5),
                    Vec.create(5.4, -22.25),
                    Vec.create(0.85, -22.5),
                    Vec.create(0.06, -18.09),
                    Vec.create(-1, -12.04),
                    Vec.create(-1, -6.43),
                    Vec.create(-0.69, -0.0),
                    Vec.create(-0.51, 7.3),
                    Vec.create(-0.51, 17.36),
                    Vec.create(-0.57, 26.67),
                    Vec.create(-0.75, 30.55),
                    Vec.create(-1.6, 35.24),
                    Vec.create(-7.15, 34.97),
                    Vec.create(-12.65, 31.81),
                    Vec.create(-12.79, 30.63),
                    Vec.create(-12.35, 28.09),
                    Vec.create(-12.3, 23.7),
                    Vec.create(-12.35, 15.73),
                    Vec.create(-12.28, 6.23),
                    Vec.create(-12.37, -0.92),
                    Vec.create(-12.2, -17.23),
                    Vec.create(-11.58, -29.88),
                    Vec.create(-11.4, -38.97),
                    Vec.create(-10.63, -50.03),
                    Vec.create(-10.57, -56.52),
                    Vec.create(-10.76, -62.36),
                    Vec.create(-11.87, -68.26),
                    Vec.create(-12.89, -72.36),
                    Vec.create(-13.91, -76.06),
                    Vec.create(-15.41, -81.02),
                    Vec.create(-17.99, -86.65)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec.create(8.44, -24.96),
                    Vec.create(8.72, -22.34),
                    Vec.create(10.22, -19.96),
                    Vec.create(13, -16.81),
                    Vec.create(16.84, -14.21),
                    Vec.create(21.24, -12.67),
                    Vec.create(26.84, -12.09),
                    Vec.create(31.49, -12.63),
                    Vec.create(36.06, -14.43),
                    Vec.create(40.02, -17.21),
                    Vec.create(42.73, -20.25),
                    Vec.create(44.34, -23.4),
                    Vec.create(44.51, -26.43),
                    Vec.create(44.41, -29.26),
                    Vec.create(44.16, -32.58),
                    Vec.create(44.05, -34.58),
                    Vec.create(43.11, -36.46),
                    Vec.create(41.77, -38.37),
                    Vec.create(38.99, -41.01),
                    Vec.create(36.44, -42.79),
                    Vec.create(33.41, -44.17),
                    Vec.create(30.2, -45.03),
                    Vec.create(26.73, -45.36),
                    Vec.create(23.66, -45.21),
                    Vec.create(20.73, -44.61),
                    Vec.create(18.23, -43.8),
                    Vec.create(15.84, -42.56),
                    Vec.create(13.58, -40.99),
                    Vec.create(11.69, -39.31),
                    Vec.create(10.34, -37.5),
                    Vec.create(9.16, -35.64),
                    Vec.create(8.3, -33.65),
                    Vec.create(8.18, -30.94),
                    Vec.create(8.28, -27.87)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec.create(43.65, -24.12),
                    Vec.create(44.04, -34.56),
                    Vec.create(44.94, -34.31),
                    Vec.create(46.38, -33.83),
                    Vec.create(48.52, -33),
                    Vec.create(50.97, -31.58),
                    Vec.create(53.24, -29.76),
                    Vec.create(55.44, -27.7),
                    Vec.create(57.75, -25.05),
                    Vec.create(59.74, -22.3),
                    Vec.create(61.82, -18.68),
                    Vec.create(63.34, -15.1),
                    Vec.create(64.85, -10.36),
                    Vec.create(65.89, -5.79),
                    Vec.create(66.96, -1.88),
                    Vec.create(67.96, 2.73),
                    Vec.create(68.62, 5.58),
                    Vec.create(68.9, 7.47),
                    Vec.create(69.09, 9.27),
                    Vec.create(70.02, 19.17),
                    Vec.create(70.13, 22.6),
                    Vec.create(69.86, 25.71),
                    Vec.create(68.93, 29.98),
                    Vec.create(67.42, 34.83),
                    Vec.create(66.23, 38.7),
                    Vec.create(65.06, 43.96),
                    Vec.create(64.18, 47.95),
                    Vec.create(62.58, 52.14),
                    Vec.create(60.04, 56.77),
                    Vec.create(55.08, 62),
                    Vec.create(51.17, 64.39),
                    Vec.create(45.68, 65.79),
                    Vec.create(39.96, 66.45),
                    Vec.create(32.45, 66.52),
                    Vec.create(30.05, 56.05),
                    Vec.create(34.13, 55.94),
                    Vec.create(38.52, 55.89),
                    Vec.create(42.65, 55.56),
                    Vec.create(46.57, 54.67),
                    Vec.create(48.65, 53.14),
                    Vec.create(50.52, 51.09),
                    Vec.create(52.36, 48.26),
                    Vec.create(53.79, 44.75),
                    Vec.create(54.72, 40.36),
                    Vec.create(56, 35.43),
                    Vec.create(57.16, 31.72),
                    Vec.create(58.54, 27.14),
                    Vec.create(59.42, 22.96),
                    Vec.create(59.4, 20.08),
                    Vec.create(59.06, 16.71),
                    Vec.create(58.72, 14),
                    Vec.create(58.51, 11.1),
                    Vec.create(58.23, 7.64),
                    Vec.create(57.19, 3.41),
                    Vec.create(56, -1.37),
                    Vec.create(55.37, -5.08),
                    Vec.create(54.37, -8.87),
                    Vec.create(53.11, -12.63),
                    Vec.create(51.38, -16.13),
                    Vec.create(49.23, -19.26),
                    Vec.create(47.05, -21.49),
                    Vec.create(44.44, -23.44)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec.create(-8.48, 40.37),
                    Vec.create(-2.52, 41.81),
                    Vec.create(-2.62, 43.66),
                    Vec.create(-2.75, 46.35),
                    Vec.create(-2.73, 49.48),
                    Vec.create(-2.04, 52.08),
                    Vec.create(0.5, 53.23),
                    Vec.create(2.04, 53.58),
                    Vec.create(3.42, 54.4),
                    Vec.create(7.05, 54.94),
                    Vec.create(11.69, 55.25),
                    Vec.create(15.93, 55.38),
                    Vec.create(20.82, 55.42),
                    Vec.create(26.29, 55.79),
                    Vec.create(31.11, 56),
                    Vec.create(33.69, 56.03),
                    Vec.create(34.18, 66.53),
                    Vec.create(32.37, 66.61),
                    Vec.create(33.1, 69.51),
                    Vec.create(33.36, 71.97),
                    Vec.create(33.45, 74.84),
                    Vec.create(33.47, 78.41),
                    Vec.create(33.43, 81.85),
                    Vec.create(33.34, 85.11),
                    Vec.create(33.21, 87.79),
                    Vec.create(33.05, 90.34),
                    Vec.create(32.96, 92.59),
                    Vec.create(32.78, 94.87),
                    Vec.create(32.56, 97.66),
                    Vec.create(32.29, 100.44),
                    Vec.create(32.15, 103.13),
                    Vec.create(32.29, 106.61),
                    Vec.create(32.29, 109.22),
                    Vec.create(31.88, 110.74),
                    Vec.create(31.11, 112.15),
                    Vec.create(29.73, 112.54),
                    Vec.create(28.21, 112.37),
                    Vec.create(26.65, 111.86),
                    Vec.create(25.28, 110.42),
                    Vec.create(23.87, 108.94),
                    Vec.create(22.81, 107.74),
                    Vec.create(22.38, 106.73),
                    Vec.create(22.36, 104.55),
                    Vec.create(22.26, 101.95),
                    Vec.create(22.48, 98.92),
                    Vec.create(22.78, 95.47),
                    Vec.create(23.02, 92.34),
                    Vec.create(23.19, 89.52),
                    Vec.create(23.41, 85.82),
                    Vec.create(23.53, 82.4),
                    Vec.create(23.56, 79.12),
                    Vec.create(23.56, 76.75),
                    Vec.create(23.56, 74.18),
                    Vec.create(23.36, 71.08),
                    Vec.create(22.86, 67.56),
                    Vec.create(22.65, 66.12),
                    Vec.create(18.25, 66.01),
                    Vec.create(13.48, 65.84),
                    Vec.create(9.06, 65.56),
                    Vec.create(5.03, 65.16),
                    Vec.create(1.16, 64.73),
                    Vec.create(-2.76, 63.94),
                    Vec.create(-6.66, 62.53),
                    Vec.create(-9.64, 60.61),
                    Vec.create(-12.04, 58.02),
                    Vec.create(-13.33, 55.6),
                    Vec.create(-14.09, 53.24),
                    Vec.create(-14.49, 50.7),
                    Vec.create(-14.66, 48.06),
                    Vec.create(-14.62, 45.61),
                    Vec.create(-14.51, 43.28),
                    Vec.create(-14.4, 41.83)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec.create(-1.46, 33.75),
                    Vec.create(-1.06, 31.8),
                    Vec.create(-4.79, 32.13),
                    Vec.create(-9.83, 32.1),
                    Vec.create(-12.91, 30.76),
                    Vec.create(-16.05, 30.71),
                    Vec.create(-19.15, 30.7),
                    Vec.create(-23.24, 30.67),
                    Vec.create(-28.28, 30.67),
                    Vec.create(-32.69, 30.75),
                    Vec.create(-36.85, 31.14),
                    Vec.create(-41.26, 31.09),
                    Vec.create(-47.04, 30.35),
                    Vec.create(-51.02, 28.1),
                    Vec.create(-54.43, 25.62),
                    Vec.create(-57.18, 22.42),
                    Vec.create(-58.67, 19.67),
                    Vec.create(-59.19, 17.11),
                    Vec.create(-61.63, 15.88),
                    Vec.create(-63.62, 15),
                    Vec.create(-65.92, 13.91),
                    Vec.create(-68.6, 12.59),
                    Vec.create(-70.96, 11.45),
                    Vec.create(-70.94, 13.11),
                    Vec.create(-70.54, 15.79),
                    Vec.create(-70.14, 18.44),
                    Vec.create(-69.8, 21.37),
                    Vec.create(-68.8, 24.01),
                    Vec.create(-67.34, 26.73),
                    Vec.create(-64.98, 30.14),
                    Vec.create(-61.87, 33.38),
                    Vec.create(-58.07, 36.26),
                    Vec.create(-53.68, 39.16),
                    Vec.create(-49.41, 40.89),
                    Vec.create(-43.97, 41.75),
                    Vec.create(-38.92, 42.22),
                    Vec.create(-33.45, 42.09),
                    Vec.create(-27.04, 41.88),
                    Vec.create(-22.04, 41.73),
                    Vec.create(-14.5, 41.78),
                    Vec.create(-11.57, 42.76),
                    Vec.create(-8.68, 41.88),
                    Vec.create(-5.61, 42.72),
                    Vec.create(-2.59, 41.96),
                    Vec.create(-2.3, 39.32),
                    Vec.create(-1.8, 36.14)
                ])
            },
            {
                type: FloorNames.Sand,
                hitbox: new PolygonHitbox([
                    Vec.create(67.05, 10.89),
                    Vec.create(69.16, 9.24),
                    Vec.create(71.68, 8.99),
                    Vec.create(74.89, 8.85),
                    Vec.create(78.56, 8.63),
                    Vec.create(82.05, 8.32),
                    Vec.create(85.49, 7.98),
                    Vec.create(88.39, 7.81),
                    Vec.create(91.81, 7.82),
                    Vec.create(95.63, 7.5),
                    Vec.create(99.06, 6.94),
                    Vec.create(102.61, 6.04),
                    Vec.create(105.6, 4.86),
                    Vec.create(108, 3.54),
                    Vec.create(110.08, 2.42),
                    Vec.create(112.29, 1.36),
                    Vec.create(114, 1.24),
                    Vec.create(115.67, 2.36),
                    Vec.create(117.31, 3.52),
                    Vec.create(118.92, 4.56),
                    Vec.create(119.6, 5.63),
                    Vec.create(120.01, 6.97),
                    Vec.create(119.63, 8.27),
                    Vec.create(118.7, 9.51),
                    Vec.create(117.4, 10.05),
                    Vec.create(115.78, 10.82),
                    Vec.create(113.93, 11.71),
                    Vec.create(111.84, 12.96),
                    Vec.create(109.88, 13.94),
                    Vec.create(107.13, 15.04),
                    Vec.create(103.92, 15.98),
                    Vec.create(101.27, 16.63),
                    Vec.create(98.26, 17.15),
                    Vec.create(94.2, 17.54),
                    Vec.create(90.6, 17.62),
                    Vec.create(85.91, 17.89),
                    Vec.create(80.99, 18.29),
                    Vec.create(76.5, 18.61),
                    Vec.create(73.3, 18.79),
                    Vec.create(69.99, 19.42),
                    Vec.create(67.52, 16.76),
                    Vec.create(68.58, 13.4)
                ])
            }
        ],
        groundGraphics: [
            {
                color: 0x5e442e,
                hitbox: new PolygonHitbox([
                    Vec.create(75.23, 2.27),
                    Vec.create(76.39, 3.23),
                    Vec.create(78.37, 4.13),
                    Vec.create(80.3, 4.46),
                    Vec.create(82.98, 4.37),
                    Vec.create(85.4, 3.98),
                    Vec.create(88.34, 3.33),
                    Vec.create(91.48, 2.63),
                    Vec.create(94.35, 1.88),
                    Vec.create(97.49, 0.72),
                    Vec.create(99.68, -0.63),
                    Vec.create(101.11, -2.15),
                    Vec.create(102.07, -3.86),
                    Vec.create(102.79, -6.16),
                    Vec.create(103.16, -9.34),
                    Vec.create(102.99, -12.5),
                    Vec.create(102.55, -15.74),
                    Vec.create(101.83, -18.56),
                    Vec.create(100.67, -21.45),
                    Vec.create(99.2, -24.06),
                    Vec.create(97.15, -26.57),
                    Vec.create(95, -28.45),
                    Vec.create(92.37, -30.12),
                    Vec.create(89.33, -31.45),
                    Vec.create(86.43, -32.36),
                    Vec.create(83.47, -32.84),
                    Vec.create(80.86, -33.13),
                    Vec.create(77.91, -33.21),
                    Vec.create(75.28, -32.99),
                    Vec.create(72.92, -32.53),
                    Vec.create(70.31, -31.66),
                    Vec.create(68.38, -30.36),
                    Vec.create(66.72, -28.5),
                    Vec.create(65.44, -26.26),
                    Vec.create(64.59, -23.77),
                    Vec.create(64.3, -21.55),
                    Vec.create(64.33, -19.38),
                    Vec.create(64.93, -17.33),
                    Vec.create(65.8, -15.25),
                    Vec.create(67.42, -12.5),
                    Vec.create(69.49, -8.98),
                    Vec.create(70.92, -5.96),
                    Vec.create(72, -3.55),
                    Vec.create(73.38, -0.7),
                    Vec.create(74.34, 1.02)
                ])
            },
            {
                color: 0x705136,
                hitbox: new PolygonHitbox([
                    Vec.create(87.26, -31.25),
                    Vec.create(89.52, -30.43),
                    Vec.create(92.06, -29.24),
                    Vec.create(94.7, -27.54),
                    Vec.create(96.85, -25.73),
                    Vec.create(98.71, -23.26),
                    Vec.create(100.18, -20.48),
                    Vec.create(101.2, -17.65),
                    Vec.create(101.83, -14.96),
                    Vec.create(102.26, -11.07),
                    Vec.create(102.3, -7.83),
                    Vec.create(101.69, -5.1),
                    Vec.create(100.27, -2.61),
                    Vec.create(98.46, -0.84),
                    Vec.create(95.92, 0.42),
                    Vec.create(92.94, 1.4),
                    Vec.create(90.11, 2.1),
                    Vec.create(87.06, 2.75),
                    Vec.create(83.39, 3.41),
                    Vec.create(80.54, 3.57),
                    Vec.create(78.28, 3.23),
                    Vec.create(76.38, 2.19),
                    Vec.create(75.11, 0.67),
                    Vec.create(74.05, -1.16),
                    Vec.create(72.92, -3.58),
                    Vec.create(71.56, -6.79),
                    Vec.create(70.31, -9.82),
                    Vec.create(68.57, -12.29),
                    Vec.create(66.97, -14.78),
                    Vec.create(65.95, -17.06),
                    Vec.create(65.27, -19.58),
                    Vec.create(65.22, -21.77),
                    Vec.create(65.59, -24.21),
                    Vec.create(66.38, -26.34),
                    Vec.create(68.01, -28.69),
                    Vec.create(70.16, -30.48),
                    Vec.create(72.4, -31.43),
                    Vec.create(75.2, -32.22),
                    Vec.create(78.12, -32.38),
                    Vec.create(81.54, -32.2),
                    Vec.create(84.7, -31.79)
                ])
            },
            {
                color: 0x5e442e,
                hitbox: new PolygonHitbox([
                    Vec.create(83.61, 21.65),
                    Vec.create(86.92, 21.39),
                    Vec.create(90.68, 22.23),
                    Vec.create(93.79, 23.82),
                    Vec.create(96.56, 26.33),
                    Vec.create(99.05, 30.01),
                    Vec.create(100.66, 33.94),
                    Vec.create(101.54, 36.87),
                    Vec.create(102.31, 40.53),
                    Vec.create(102.6, 44.3),
                    Vec.create(101.94, 48.8),
                    Vec.create(100.26, 52.36),
                    Vec.create(97.51, 55.47),
                    Vec.create(93.08, 59.57),
                    Vec.create(87.56, 64.14),
                    Vec.create(83.09, 66.49),
                    Vec.create(80.82, 66.93),
                    Vec.create(77.86, 66.27),
                    Vec.create(75.51, 64.84),
                    Vec.create(73.06, 62.28),
                    Vec.create(71.34, 60.04),
                    Vec.create(69.17, 55.86),
                    Vec.create(68, 51.84),
                    Vec.create(67.36, 48.01),
                    Vec.create(67.33, 44.43),
                    Vec.create(67.8, 41.07),
                    Vec.create(68.7, 37.99),
                    Vec.create(70.28, 33.95),
                    Vec.create(72.16, 30.55),
                    Vec.create(74.44, 27.45),
                    Vec.create(76.76, 24.99),
                    Vec.create(80.3, 22.64)
                ])
            },
            {
                color: 0x705136,
                hitbox: new PolygonHitbox([
                    Vec.create(94.54, 25.66),
                    Vec.create(95.51, 26.74),
                    Vec.create(96.65, 28.13),
                    Vec.create(97.73, 29.91),
                    Vec.create(98.83, 31.93),
                    Vec.create(99.73, 34.22),
                    Vec.create(100.46, 36.49),
                    Vec.create(101.16, 39.42),
                    Vec.create(101.56, 42.24),
                    Vec.create(101.64, 44.28),
                    Vec.create(101.46, 46.53),
                    Vec.create(100.96, 48.51),
                    Vec.create(100.19, 50.48),
                    Vec.create(98.69, 52.8),
                    Vec.create(96.44, 55.24),
                    Vec.create(93.77, 57.75),
                    Vec.create(91.88, 59.45),
                    Vec.create(89.58, 61.37),
                    Vec.create(87.35, 63.12),
                    Vec.create(84.83, 64.75),
                    Vec.create(82.93, 65.99),
                    Vec.create(80.67, 66.3),
                    Vec.create(78.61, 65.76),
                    Vec.create(76.38, 64.2),
                    Vec.create(74.7, 62.74),
                    Vec.create(73.25, 61),
                    Vec.create(72.4, 59.67),
                    Vec.create(71.45, 58.18),
                    Vec.create(70.67, 56.77),
                    Vec.create(70.03, 55.3),
                    Vec.create(69.44, 53.46),
                    Vec.create(68.85, 51.45),
                    Vec.create(68.46, 49.21),
                    Vec.create(68.26, 46.87),
                    Vec.create(68.35, 44.51),
                    Vec.create(68.67, 42.4),
                    Vec.create(69.09, 40.39),
                    Vec.create(69.68, 38.35),
                    Vec.create(70.54, 36.07),
                    Vec.create(71.5, 33.82),
                    Vec.create(72.77, 31.54),
                    Vec.create(74.06, 29.5),
                    Vec.create(75.29, 27.93),
                    Vec.create(76.8, 26.32),
                    Vec.create(78.3, 25.07),
                    Vec.create(79.88, 23.98),
                    Vec.create(81.7, 23.08),
                    Vec.create(83.5, 22.46),
                    Vec.create(85.55, 22.16),
                    Vec.create(87.52, 22.22),
                    Vec.create(89.45, 22.57),
                    Vec.create(91.44, 23.51),
                    Vec.create(93.38, 24.68)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec.create(-9.67, -92.78),
                    Vec.create(-6.58, -87.91),
                    Vec.create(-3.76, -80.47),
                    Vec.create(-2.46, -75.85),
                    Vec.create(-1.41, -71.91),
                    Vec.create(-0.08, -65.74),
                    Vec.create(0.48, -61.51),
                    Vec.create(0.57, -55.46),
                    Vec.create(0.42, -49.93),
                    Vec.create(0.03, -44.33),
                    Vec.create(-0.31, -38.56),
                    Vec.create(-0.47, -34),
                    Vec.create(3.42, -33.22),
                    Vec.create(8.26, -33.53),
                    Vec.create(8.91, -32.63),
                    Vec.create(9.09, -28.8),
                    Vec.create(9.09, -25.63),
                    Vec.create(8.8, -22.5),
                    Vec.create(5.4, -22.25),
                    Vec.create(0.85, -22.5),
                    Vec.create(0.06, -18.09),
                    Vec.create(-1, -12.04),
                    Vec.create(-1, -6.43),
                    Vec.create(-0.69, -0.0),
                    Vec.create(-0.51, 7.3),
                    Vec.create(-0.51, 17.36),
                    Vec.create(-0.57, 26.67),
                    Vec.create(-0.75, 30.55),
                    Vec.create(-1.6, 35.24),
                    Vec.create(-7.15, 34.97),
                    Vec.create(-12.65, 31.81),
                    Vec.create(-12.79, 30.63),
                    Vec.create(-12.35, 28.09),
                    Vec.create(-12.3, 23.7),
                    Vec.create(-12.35, 15.73),
                    Vec.create(-12.28, 6.23),
                    Vec.create(-12.37, -0.92),
                    Vec.create(-12.2, -17.23),
                    Vec.create(-11.58, -29.88),
                    Vec.create(-11.4, -38.97),
                    Vec.create(-10.63, -50.03),
                    Vec.create(-10.57, -56.52),
                    Vec.create(-10.76, -62.36),
                    Vec.create(-11.87, -68.26),
                    Vec.create(-12.89, -72.36),
                    Vec.create(-13.91, -76.06),
                    Vec.create(-15.41, -81.02),
                    Vec.create(-17.99, -86.65)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec.create(8.44, -24.96),
                    Vec.create(8.72, -22.34),
                    Vec.create(10.22, -19.96),
                    Vec.create(13, -16.81),
                    Vec.create(16.84, -14.21),
                    Vec.create(21.24, -12.67),
                    Vec.create(26.84, -12.09),
                    Vec.create(31.49, -12.63),
                    Vec.create(36.06, -14.43),
                    Vec.create(40.02, -17.21),
                    Vec.create(42.73, -20.25),
                    Vec.create(44.34, -23.4),
                    Vec.create(44.51, -26.43),
                    Vec.create(44.41, -29.26),
                    Vec.create(44.16, -32.58),
                    Vec.create(44.05, -34.58),
                    Vec.create(43.11, -36.46),
                    Vec.create(41.77, -38.37),
                    Vec.create(38.99, -41.01),
                    Vec.create(36.44, -42.79),
                    Vec.create(33.41, -44.17),
                    Vec.create(30.2, -45.03),
                    Vec.create(26.73, -45.36),
                    Vec.create(23.66, -45.21),
                    Vec.create(20.73, -44.61),
                    Vec.create(18.23, -43.8),
                    Vec.create(15.84, -42.56),
                    Vec.create(13.58, -40.99),
                    Vec.create(11.69, -39.31),
                    Vec.create(10.34, -37.5),
                    Vec.create(9.16, -35.64),
                    Vec.create(8.3, -33.65),
                    Vec.create(8.18, -30.94),
                    Vec.create(8.28, -27.87)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec.create(43.65, -24.12),
                    Vec.create(44.04, -34.56),
                    Vec.create(44.94, -34.31),
                    Vec.create(46.38, -33.83),
                    Vec.create(48.52, -33),
                    Vec.create(50.97, -31.58),
                    Vec.create(53.24, -29.76),
                    Vec.create(55.44, -27.7),
                    Vec.create(57.75, -25.05),
                    Vec.create(59.74, -22.3),
                    Vec.create(61.82, -18.68),
                    Vec.create(63.34, -15.1),
                    Vec.create(64.85, -10.36),
                    Vec.create(65.89, -5.79),
                    Vec.create(66.96, -1.88),
                    Vec.create(67.96, 2.73),
                    Vec.create(68.62, 5.58),
                    Vec.create(68.9, 7.47),
                    Vec.create(69.09, 9.27),
                    Vec.create(70.02, 19.17),
                    Vec.create(70.13, 22.6),
                    Vec.create(69.86, 25.71),
                    Vec.create(68.93, 29.98),
                    Vec.create(67.42, 34.83),
                    Vec.create(66.23, 38.7),
                    Vec.create(65.06, 43.96),
                    Vec.create(64.18, 47.95),
                    Vec.create(62.58, 52.14),
                    Vec.create(60.04, 56.77),
                    Vec.create(55.08, 62),
                    Vec.create(51.17, 64.39),
                    Vec.create(45.68, 65.79),
                    Vec.create(39.96, 66.45),
                    Vec.create(32.45, 66.52),
                    Vec.create(30.05, 56.05),
                    Vec.create(34.13, 55.94),
                    Vec.create(38.52, 55.89),
                    Vec.create(42.65, 55.56),
                    Vec.create(46.57, 54.67),
                    Vec.create(48.65, 53.14),
                    Vec.create(50.52, 51.09),
                    Vec.create(52.36, 48.26),
                    Vec.create(53.79, 44.75),
                    Vec.create(54.72, 40.36),
                    Vec.create(56, 35.43),
                    Vec.create(57.16, 31.72),
                    Vec.create(58.54, 27.14),
                    Vec.create(59.42, 22.96),
                    Vec.create(59.4, 20.08),
                    Vec.create(59.06, 16.71),
                    Vec.create(58.72, 14),
                    Vec.create(58.51, 11.1),
                    Vec.create(58.23, 7.64),
                    Vec.create(57.19, 3.41),
                    Vec.create(56, -1.37),
                    Vec.create(55.37, -5.08),
                    Vec.create(54.37, -8.87),
                    Vec.create(53.11, -12.63),
                    Vec.create(51.38, -16.13),
                    Vec.create(49.23, -19.26),
                    Vec.create(47.05, -21.49),
                    Vec.create(44.44, -23.44)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec.create(-8.48, 40.37),
                    Vec.create(-2.52, 41.81),
                    Vec.create(-2.62, 43.66),
                    Vec.create(-2.75, 46.35),
                    Vec.create(-2.73, 49.48),
                    Vec.create(-2.04, 52.08),
                    Vec.create(0.5, 53.23),
                    Vec.create(2.04, 53.58),
                    Vec.create(3.42, 54.4),
                    Vec.create(7.05, 54.94),
                    Vec.create(11.69, 55.25),
                    Vec.create(15.93, 55.38),
                    Vec.create(20.82, 55.42),
                    Vec.create(26.29, 55.79),
                    Vec.create(31.11, 56),
                    Vec.create(33.69, 56.03),
                    Vec.create(34.18, 66.53),
                    Vec.create(32.37, 66.61),
                    Vec.create(33.1, 69.51),
                    Vec.create(33.36, 71.97),
                    Vec.create(33.45, 74.84),
                    Vec.create(33.47, 78.41),
                    Vec.create(33.43, 81.85),
                    Vec.create(33.34, 85.11),
                    Vec.create(33.21, 87.79),
                    Vec.create(33.05, 90.34),
                    Vec.create(32.96, 92.59),
                    Vec.create(32.78, 94.87),
                    Vec.create(32.56, 97.66),
                    Vec.create(32.29, 100.44),
                    Vec.create(32.15, 103.13),
                    Vec.create(32.29, 106.61),
                    Vec.create(32.29, 109.22),
                    Vec.create(31.88, 110.74),
                    Vec.create(31.11, 112.15),
                    Vec.create(29.73, 112.54),
                    Vec.create(28.21, 112.37),
                    Vec.create(26.65, 111.86),
                    Vec.create(25.28, 110.42),
                    Vec.create(23.87, 108.94),
                    Vec.create(22.81, 107.74),
                    Vec.create(22.38, 106.73),
                    Vec.create(22.36, 104.55),
                    Vec.create(22.26, 101.95),
                    Vec.create(22.48, 98.92),
                    Vec.create(22.78, 95.47),
                    Vec.create(23.02, 92.34),
                    Vec.create(23.19, 89.52),
                    Vec.create(23.41, 85.82),
                    Vec.create(23.53, 82.4),
                    Vec.create(23.56, 79.12),
                    Vec.create(23.56, 76.75),
                    Vec.create(23.56, 74.18),
                    Vec.create(23.36, 71.08),
                    Vec.create(22.86, 67.56),
                    Vec.create(22.65, 66.12),
                    Vec.create(18.25, 66.01),
                    Vec.create(13.48, 65.84),
                    Vec.create(9.06, 65.56),
                    Vec.create(5.03, 65.16),
                    Vec.create(1.16, 64.73),
                    Vec.create(-2.76, 63.94),
                    Vec.create(-6.66, 62.53),
                    Vec.create(-9.64, 60.61),
                    Vec.create(-12.04, 58.02),
                    Vec.create(-13.33, 55.6),
                    Vec.create(-14.09, 53.24),
                    Vec.create(-14.49, 50.7),
                    Vec.create(-14.66, 48.06),
                    Vec.create(-14.62, 45.61),
                    Vec.create(-14.51, 43.28),
                    Vec.create(-14.4, 41.83)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec.create(-1.46, 33.75),
                    Vec.create(-1.06, 31.8),
                    Vec.create(-4.79, 32.13),
                    Vec.create(-9.83, 32.1),
                    Vec.create(-12.91, 30.76),
                    Vec.create(-16.05, 30.71),
                    Vec.create(-19.15, 30.7),
                    Vec.create(-23.24, 30.67),
                    Vec.create(-28.28, 30.67),
                    Vec.create(-32.69, 30.75),
                    Vec.create(-36.85, 31.14),
                    Vec.create(-41.26, 31.09),
                    Vec.create(-47.04, 30.35),
                    Vec.create(-51.02, 28.1),
                    Vec.create(-54.43, 25.62),
                    Vec.create(-57.18, 22.42),
                    Vec.create(-58.67, 19.67),
                    Vec.create(-59.19, 17.11),
                    Vec.create(-61.63, 15.88),
                    Vec.create(-63.62, 15),
                    Vec.create(-65.92, 13.91),
                    Vec.create(-68.6, 12.59),
                    Vec.create(-70.96, 11.45),
                    Vec.create(-70.94, 13.11),
                    Vec.create(-70.54, 15.79),
                    Vec.create(-70.14, 18.44),
                    Vec.create(-69.8, 21.37),
                    Vec.create(-68.8, 24.01),
                    Vec.create(-67.34, 26.73),
                    Vec.create(-64.98, 30.14),
                    Vec.create(-61.87, 33.38),
                    Vec.create(-58.07, 36.26),
                    Vec.create(-53.68, 39.16),
                    Vec.create(-49.41, 40.89),
                    Vec.create(-43.97, 41.75),
                    Vec.create(-38.92, 42.22),
                    Vec.create(-33.45, 42.09),
                    Vec.create(-27.04, 41.88),
                    Vec.create(-22.04, 41.73),
                    Vec.create(-14.5, 41.78),
                    Vec.create(-11.57, 42.76),
                    Vec.create(-8.68, 41.88),
                    Vec.create(-5.61, 42.72),
                    Vec.create(-2.59, 41.96),
                    Vec.create(-2.3, 39.32),
                    Vec.create(-1.8, 36.14)
                ])
            },
            {
                color: 0x996f33,
                hitbox: new PolygonHitbox([
                    Vec.create(67.05, 10.89),
                    Vec.create(69.16, 9.24),
                    Vec.create(71.68, 8.99),
                    Vec.create(74.89, 8.85),
                    Vec.create(78.56, 8.63),
                    Vec.create(82.05, 8.32),
                    Vec.create(85.49, 7.98),
                    Vec.create(88.39, 7.81),
                    Vec.create(91.81, 7.82),
                    Vec.create(95.63, 7.5),
                    Vec.create(99.06, 6.94),
                    Vec.create(102.61, 6.04),
                    Vec.create(105.6, 4.86),
                    Vec.create(108, 3.54),
                    Vec.create(110.08, 2.42),
                    Vec.create(112.29, 1.36),
                    Vec.create(114, 1.24),
                    Vec.create(115.67, 2.36),
                    Vec.create(117.31, 3.52),
                    Vec.create(118.92, 4.56),
                    Vec.create(119.6, 5.63),
                    Vec.create(120.01, 6.97),
                    Vec.create(119.63, 8.27),
                    Vec.create(118.7, 9.51),
                    Vec.create(117.4, 10.05),
                    Vec.create(115.78, 10.82),
                    Vec.create(113.93, 11.71),
                    Vec.create(111.84, 12.96),
                    Vec.create(109.88, 13.94),
                    Vec.create(107.13, 15.04),
                    Vec.create(103.92, 15.98),
                    Vec.create(101.27, 16.63),
                    Vec.create(98.26, 17.15),
                    Vec.create(94.2, 17.54),
                    Vec.create(90.6, 17.62),
                    Vec.create(85.91, 17.89),
                    Vec.create(80.99, 18.29),
                    Vec.create(76.5, 18.61),
                    Vec.create(73.3, 18.79),
                    Vec.create(69.99, 19.42),
                    Vec.create(67.52, 16.76),
                    Vec.create(68.58, 13.4)
                ])
            },
            {
                color: 0x542828,
                hitbox: RectangleHitbox.fromRect(12.65, 25.09, Vec.create(47.38, 25.18))
            },
            {
                color: 0xaaaaaa,
                hitbox: RectangleHitbox.fromRect(11.15, 23.6, Vec.create(47.4, 25.16))
            },
            {
                color: 0x6b3232,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(1.16, 0.91, Vec.create(52.39, 36.51)),
                    RectangleHitbox.fromRect(0.95, 2.98, Vec.create(42.3, 19.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(47.29, 25.5)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(50.27, 28.51)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(44.27, 28.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(47.27, 31.51)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(44.27, 34.52)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(44.26, 22.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(50.27, 22.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(47.27, 19.48)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(44.27, 16.49)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(50.27, 16.46)),
                    RectangleHitbox.fromRect(1.21, 2.98, Vec.create(52.38, 19.49)),
                    RectangleHitbox.fromRect(1.21, 2.98, Vec.create(52.4, 25.49)),
                    RectangleHitbox.fromRect(1.19, 2.98, Vec.create(52.38, 31.51)),
                    RectangleHitbox.fromRect(0.95, 2.98, Vec.create(42.3, 31.5)),
                    RectangleHitbox.fromRect(0.95, 2.98, Vec.create(42.32, 25.5)),
                    RectangleHitbox.fromRect(2.97, 2.98, Vec.create(50.28, 34.49)),
                    RectangleHitbox.fromRect(2.97, 0.96, Vec.create(47.29, 36.47)),
                    RectangleHitbox.fromRect(2.97, 0.96, Vec.create(47.28, 13.84)),
                    RectangleHitbox.fromRect(1.16, 1.62, Vec.create(52.39, 14.16)),
                    RectangleHitbox.fromRect(0.95, 1.62, Vec.create(42.3, 14.18)),
                    RectangleHitbox.fromRect(0.95, 0.95, Vec.create(42.29, 36.49))
                )
            }
        ],
        obstacles: [
            { idString: "campsite_case", position: Vec.create(61.56, -48.94), rotation: 0 },

            { idString: "pebble", position: Vec.create(-5.9, -3.68) },
            { idString: "pebble", position: Vec.create(-54.97, 27.96) },
            { idString: "pebble", position: Vec.create(-4.89, 32.17) },
            { idString: "pebble", position: Vec.create(-36.46, 40.17) },
            { idString: "pebble", position: Vec.create(24.95, 59.42) },
            { idString: "pebble", position: Vec.create(60.61, 37.69) },
            { idString: "pebble", position: Vec.create(-6.77, -38.21) },
            { idString: "pebble", position: Vec.create(-4.67, -61.59) },
            { idString: "pebble", position: Vec.create(-9.91, -85.03) },
            { idString: "pebble", position: Vec.create(57.63, -13.41) },
            { idString: "pebble", position: Vec.create(103.16, 7.98) },
            { idString: "pebble", position: Vec.create(28.6, 98.55) },

            { idString: "campsite_crate", position: Vec.create(-26.22, 20.96) },
            { idString: "campsite_crate", position: Vec.create(-17.47, 25.33) },
            { idString: "campsite_crate", position: Vec.create(-57.88, -43.67) },
            { idString: "campsite_crate", position: Vec.create(-48.34, -47.03) },
            { idString: "campsite_crate", position: Vec.create(69.8, -9.28) },
            { idString: "campsite_crate", position: Vec.create(54.51, 71.1) },

            { idString: "barrel", position: Vec.create(-37.78, -13.62) },
            { idString: "barrel", position: Vec.create(40.68, -113.28) },
            { idString: "barrel", position: Vec.create(47.76, 87.97) },

            { idString: "clearing_boulder", position: Vec.create(-100, 105.73) },
            { idString: "clearing_boulder", position: Vec.create(-123.28, 72.58) },
            { idString: "clearing_boulder", position: Vec.create(120.42, 104.75) },
            { idString: "clearing_boulder", position: Vec.create(-124.42, -102.24) },

            { idString: "regular_crate", position: Vec.create(11.19, -55.86) },
            { idString: "flint_crate", position: Vec.create(9.3, -66.29) },
            { idString: "regular_crate", position: Vec.create(-89.84, -7.51) },
            { idString: "regular_crate", position: Vec.create(-91.89, -17.5) },
            { idString: "regular_crate", position: Vec.create(-22, 58.36) },
            { idString: "regular_crate", position: Vec.create(-21.62, 68.79) },
            { idString: "regular_crate", position: Vec.create(97.17, -114.18) },
            { idString: "regular_crate", position: Vec.create(111, -113.18) },
            { idString: "regular_crate", position: Vec.create(129.49, -14.44) },
            { idString: "regular_crate", position: Vec.create(139.78, 39.52) },

            { idString: "box", position: Vec.create(4.37, -4.1) },
            { idString: { box: 1, grenade_box: 0.5 }, position: Vec.create(6.33, 0.79) },
            { idString: "box", position: Vec.create(15.6, 66.84) },
            { idString: "box", position: Vec.create(13.92, 71.94) },
            { idString: "box", position: Vec.create(37.03, 45.18) },
            { idString: "box", position: Vec.create(44.83, 32.46) },
            { idString: "box", position: Vec.create(49.87, 34.06) },
            { idString: "box", position: Vec.create(105.79, -82.57) },
            { idString: "box", position: Vec.create(-36.26, -21.29) },

            { idString: "stump", position: Vec.create(-50.49, 2) },
            { idString: "stump", position: Vec.create(-76.23, -7.7) },
            { idString: "hatchet_stump", position: Vec.create(-56.26, -19.3) },
            { idString: "stump", position: Vec.create(-75.79, -31.48) },
            { idString: "stump", position: Vec.create(-112.42, 33.21) },
            { idString: "stump", position: Vec.create(-112.42, 33.21) },
            { idString: "stump", position: Vec.create(-74.33, -86.97) },
            { idString: randomStump, position: Vec.create(-130.31, -29.57) },
            { idString: randomStump, position: Vec.create(101.68, -46.53) },
            { idString: randomStump, position: Vec.create(87.31, 80.6) },

            { idString: "pumpkin", position: Vec.create(75.4, 50.55) },
            { idString: "pumpkin", position: Vec.create(83.56, 56.39) },
            { idString: "pumpkin", position: Vec.create(81.31, 31.66) },
            { idString: "pumpkin", position: Vec.create(82.83, -2.29) },
            { idString: "pumpkin", position: Vec.create(71.13, -23.64) },
            { idString: "pumpkin", position: Vec.create(78.3, -26.06) },
            { idString: "pumpkin", position: Vec.create(90.55, -21.96) },

            { idString: "large_pumpkin", position: Vec.create(92.12, -13.89) },
            { idString: "large_pumpkin", position: Vec.create(91.13, 37.64) },
            { idString: "large_pumpkin", position: Vec.create(93.9, 48.21) },

            { idString: "pine_tree", position: Vec.create(-66.33, -68.15) },
            { idString: "pine_tree", position: Vec.create(42.71, -93.71) },
            { idString: "pine_tree", position: Vec.create(76.03, -50.86) },
            { idString: "pine_tree", position: Vec.create(-86.1, 72.38) },

            { idString: "oak_tree", position: Vec.create(-102.86, -24.63) },
            { idString: "oak_tree", position: Vec.create(-63.51, -101.43) },
            { idString: "oak_tree", position: Vec.create(14.2, -103.61) },
            { idString: "oak_tree", position: Vec.create(-93.28, 35.66) },
            { idString: "oak_tree", position: Vec.create(-103.86, 2.86) },
            { idString: "oak_tree", position: Vec.create(-120.76, -42.59) },
            { idString: "oak_tree", position: Vec.create(-103.93, -71.77) },
            { idString: "oak_tree", position: Vec.create(-45.6, -98.66) },
            { idString: "oak_tree", position: Vec.create(-41.77, 99.59) },
            { idString: "oak_tree", position: Vec.create(4.86, 84.4) },
            { idString: "oak_tree", position: Vec.create(5.7, 106.07) },
            { idString: "oak_tree", position: Vec.create(61.69, 85.94) },
            { idString: "oak_tree", position: Vec.create(114.42, 63.52) },
            { idString: "oak_tree", position: Vec.create(121.78, 47.04) },
            { idString: "oak_tree", position: Vec.create(113.29, 30.21) },
            { idString: "oak_tree", position: Vec.create(118.15, -34.69) },
            { idString: "oak_tree", position: Vec.create(60.07, -60.79) },
            { idString: "oak_tree", position: Vec.create(-33.44, -64.7) },
            { idString: "oak_tree", position: Vec.create(132.49, -107.99) },
            { idString: "oak_tree", position: Vec.create(121.46, -65.32) },
            { idString: "oak_tree", position: Vec.create(67.82, -107.86) },
            { idString: "oak_tree", position: Vec.create(133.24, 6.9) },

            { idString: "cooler", position: Vec.create(47.17, 16.51), rotation: 0 },
            { idString: "fire_pit", position: Vec.create(25.87, -29) },

            { idString: "large_logs_pile", position: Vec.create(-72.55, -46.88), rotation: 0 },
            { idString: "large_logs_pile", position: Vec.create(6.9, 66.48), rotation: 1 },
            { idString: "large_logs_pile", position: Vec.create(40.15, -61.21), rotation: 1 },

            { idString: "small_logs_pile", position: Vec.create(-79.95, 15.45), rotation: 0 },
            { idString: "small_logs_pile", position: Vec.create(45.49, 75.44), rotation: 0 },
            { idString: "small_logs_pile", position: Vec.create(66.66, -0.52), rotation: 0 },
            { idString: "small_logs_pile", position: Vec.create(-16.28, 99.83), rotation: 0 },
            { idString: "small_logs_pile", position: Vec.create(97.4, -80.86), rotation: 0 }
        ],
        subBuildings: [
            { idString: randomTent, position: Vec.create(102.18, -95.33) },
            { idString: randomBigTent, position: Vec.create(-18, 24.5), orientation: 1 },
            { idString: randomTent, position: Vec.create(61.28, 25.97), orientation: 1 },
            { idString: randomHayShed, position: Vec.create(-50, 65.27) },
            { idString: "outhouse", position: Vec.create(-24.51, -17) }
        ]
    },
    {
        idString: "breached_dam",
        name: "Breached Dam(n)",
        defType: DefinitionType.Building,
        spawnHitbox: RectangleHitbox.fromRect(100, 230, Vec.create(-16, -4.25)),
        allowFlyover: FlyoverPref.Always,
        material: "stone",
        particle: "rock_particle",
        particleVariations: 2,
        floorZIndex: ZIndexes.Ground,
        bridgeMinRiverWidth: 18,
        bridgeHitbox: new GroupHitbox(
            // RectangleHitbox.fromRect(25, 42.3, Vec.create(-17.5, 37.93)),
            // RectangleHitbox.fromRect(25, 42.3, Vec.create(-17.5, -46.35)),
            RectangleHitbox.fromRect(100, 55, Vec.create(-16, -92)),
            RectangleHitbox.fromRect(100, 55, Vec.create(-16, 83))
        ),
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.8, 9.91)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.97, -46.78)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.99, 19.36)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.99, 28.8)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.99, 38.25)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.96, 47.7)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.96, 9.91)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.97, -18.46)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.85, -18.46)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.88, -27.92)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-10.01, -27.92)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.85, -37.32)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.97, -37.35)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-10.01, -65.69)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.99, 57.21)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.85, 57.17)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.84, 47.71)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.9, 38.26)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.85, 28.79)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.85, 19.38)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.88, -46.82)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.91, -56.23)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-9.97, -56.26)),
            RectangleHitbox.fromRect(2.13, 2.24, Vec.create(-24.87, -65.69)),
            RectangleHitbox.fromRect(3.81, 36.35, Vec.create(-7.79, -43.61)),
            RectangleHitbox.fromRect(3.81, 36.35, Vec.create(-7.84, 35.09)),
            RectangleHitbox.fromRect(3.81, 36.35, Vec.create(-27.08, 35.12)),
            RectangleHitbox.fromRect(3.81, 36.35, Vec.create(-27.08, -43.59)),
            RectangleHitbox.fromRect(1.52, 49.69, Vec.create(-10, -39.95)),
            RectangleHitbox.fromRect(1.52, 49.69, Vec.create(-24.85, 32.46)),
            RectangleHitbox.fromRect(1.52, 49.69, Vec.create(-10.01, 32.05)),
            RectangleHitbox.fromRect(1.52, 49.69, Vec.create(-24.85, -39.93))
        ),
        groundGraphics: [
            {
                color: 0x363630,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.34, 36.45, Vec.create(-8.57, -43.59)),
                    RectangleHitbox.fromRect(5.34, 36.45, Vec.create(-8.62, 35.05)),
                    RectangleHitbox.fromRect(5.34, 36.45, Vec.create(-26.32, 35.14)),
                    RectangleHitbox.fromRect(5.34, 36.45, Vec.create(-26.27, -43.59))
                )
            },
            {
                color: 0x6c6c60,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.15, 35.43, Vec.create(-8.95, -43.61)),
                    RectangleHitbox.fromRect(5.15, 35.43, Vec.create(-8.99, 35.1)),
                    RectangleHitbox.fromRect(5.15, 35.43, Vec.create(-25.88, 35.1)),
                    RectangleHitbox.fromRect(5.15, 35.43, Vec.create(-25.88, -43.61))
                )
            }
        ],
        floors: [
            {
                type: FloorNames.Water,
                hitbox: new PolygonHitbox([
                    Vec.create(-25.14, -17.94),
                    Vec.create(-24.98, 9.69),
                    Vec.create(-16.72, 11.86),
                    Vec.create(-9.64, 7.22),
                    Vec.create(-9.85, -18.37),
                    Vec.create(-20.39, -20.34)
                ])
            },
            {
                type: FloorNames.Metal,
                hitbox: RectangleHitbox.fromRect(15.24, 125.07, Vec.create(-17.56, -4.28))
            }
        ],
        floorImages: [
            {
                key: "breached_dam_pillar",
                position: Vec.create(-23.53, -16.15)
            },
            {
                key: "breached_dam_pillar",
                position: Vec.create(-23.53, -4.26)
            },
            {
                key: "breached_dam_pillar",
                position: Vec.create(-23.53, 7.62)
            },
            {
                key: "breached_dam_floor",
                position: Vec.create(-17.5, -4.25),
                scale: Vec.create(2, 2)
            }
        ],
        obstacles: [
            { idString: "oak_tree", position: Vec.create(-34.95, 95.26) },
            { idString: "oak_tree", position: Vec.create(-39.54, -93.9) },
            { idString: "oak_tree", position: Vec.create(2.65, -105.9) },
            { idString: "oak_tree", position: Vec.create(-9.45, -87.93) },

            { idString: "regular_crate", position: Vec.create(18.88, -88.73) },
            { idString: "regular_crate", position: Vec.create(-17.43, -33.26) },
            { idString: "regular_crate", position: Vec.create(-17.49, 36.64) },
            { idString: "regular_crate", position: Vec.create(-44.61, 73.56) },

            { idString: "barrel", position: Vec.create(-19.5, 26.43) },
            { idString: "barrel", position: Vec.create(29.46, -88.82) },
            { idString: "barrel", position: Vec.create(-44.58, 63.1) },

            { idString: "propane_tank", position: Vec.create(-36.93, -73.22) },
            { idString: "propane_tank", position: Vec.create(-39.85, -77.38) },
            { idString: "propane_tank", position: Vec.create(4.18, 68.95) },
            { idString: "propane_tank", position: Vec.create(4.18, 63.99) },

            { idString: "sandbags", position: Vec.create(-15.4, -44.88), rotation: 1 },
            { idString: "ammo_crate", position: Vec.create(24.85, -78.26) },
            { idString: "ammo_crate", position: Vec.create(-34.17, 67.72) },
            { idString: "ammo_crate", position: Vec.create(11.91, 66.33) },

            { idString: "hatchet_stump", position: Vec.create(-43.91, -72.21) },
            { idString: "stump", position: Vec.create(-18.25, -98.24) },
            { idString: "stump", position: Vec.create(-16.86, 99) }
        ],
        subBuildings: [
            { idString: randomHayShed, position: Vec.create(9.77, 87) }
        ]
    }
]);
