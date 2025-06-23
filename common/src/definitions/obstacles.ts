import { FlyoverPref, Layers, MapObjectSpawnMode, RotationMode, ZIndexes } from "../constants";
import { Orientation, type Variation } from "../typings";
import { CircleHitbox, GroupHitbox, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { type Mutable } from "../utils/misc";
import { DefinitionType, ObjectDefinitions, type ObjectDefinition, type ReferenceOrRandom, type ReferenceTo } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";
import { ContainerTints, TentTints, TruckContainerTints } from "./buildings";
import { type GunDefinition } from "./items/guns";
import { PerkDefinition, PerkIds } from "./items/perks";
import { type LootDefinition } from "./loots";
import { ModeName } from "./modes";
import { SyncedParticleDefinition } from "./syncedParticles";

type CommonObstacleDefinition = ObjectDefinition & {
    readonly defType: DefinitionType.Obstacle

    readonly material: typeof Materials[number]
    readonly health: number
    readonly indestructible?: boolean
    readonly impenetrable?: boolean
    readonly noHitEffect?: boolean
    readonly noDestroyEffect?: boolean
    readonly noResidue?: boolean
    readonly invisible?: boolean
    readonly hideOnMap?: boolean
    readonly scale?: {
        readonly spawnMin: number
        readonly spawnMax: number
        readonly destroy: number
    }
    readonly hitbox: Hitbox
    readonly spawnHitbox?: Hitbox
    readonly noCollisions?: boolean
    readonly noCollisionAfterDestroyed?: boolean
    readonly pallet?: boolean
    readonly rotationMode: RotationMode // for obstacles with a role, this cannot be RotationMode.Full
    readonly particleVariations?: number
    readonly zIndex?: ZIndexes
    readonly spawnWithWaterOverlay?: boolean
    readonly waterOverlay?: {
        readonly scaleX: number
        readonly scaleY: number
    }

    readonly graphics?: ReadonlyArray<{
        readonly color: number | `#${string}`
        readonly hitbox: Hitbox
    }>
    readonly graphicsZIndex?: ZIndexes

    /**
     * Whether throwables can fly over this obstacle
     */
    readonly allowFlyover?: FlyoverPref
    readonly collideWithLayers?: Layers
    readonly visibleFromLayers?: Layers
    readonly hasLoot?: boolean
    readonly lootTable?: string
    readonly spawnWithLoot?: boolean
    readonly explosion?: string
    readonly detector?: boolean
    readonly noMeleeCollision?: boolean
    readonly noBulletCollision?: boolean
    readonly reflectBullets?: boolean
    readonly hitSoundVariations?: number
    readonly noInteractMessage?: boolean
    readonly customInteractMessage?: boolean
    readonly interactOnlyFromSide?: Orientation
    readonly weaponSwap?: {
        // whether the weapon swap will utilize gun tiers to determine chances for each weapon
        readonly weighted?: boolean

        // whether the possible weapons will be restricted to the current mode
        readonly modeRestricted?: boolean
    }
    readonly requiresPower?: boolean

    readonly interactionDelay?: number
    readonly regenerateAfterDestroyed?: number

    readonly applyPerkOnDestroy?: {
        readonly mode?: ModeName
        readonly perk: ReferenceTo<PerkDefinition>
        /**
         * A number between 0 and 1 indicating the chance of the perk being applied
         */
        readonly chance: number
    }

    readonly gunMount?: {
        readonly type: "gun" | "melee"
        readonly weapon: string
    }

    readonly frames?: {
        readonly base?: string
        readonly particle?: string
        readonly residue?: string
        readonly leaves?: string
        readonly opened?: string
        readonly activated?: string
        readonly powered?: string
    }

    readonly glow?: {
        readonly position?: Vector
        readonly tint?: number
        readonly scale?: number
        readonly alpha?: number
        readonly scaleAnim?: {
            readonly to: number
            readonly duration: number
        }
        readonly flicker?: {
            readonly chance: number
            readonly strength: number
            readonly interval: number
        }
    }

    readonly wall?: {
        readonly color: number
        readonly borderColor: number
        readonly rounded?: boolean
    }

    readonly spawnMode?: MapObjectSpawnMode
    readonly tint?: number
    readonly particlesOnDestroy?: ReferenceTo<SyncedParticleDefinition>
    readonly additionalDestroySounds?: readonly string[]
    readonly sound?: ({ readonly name: string } | { readonly names: string[] }) & {
        readonly maxRange?: number
        readonly falloff?: number
    }
} & (
    & TreeMixin
    & DoorMixin
    & StairMixin
    & ActivatableMixin
    & { readonly isWindow?: boolean }
    & { readonly isWall?: boolean }
);

type TreeMixin = {
    readonly isTree: true
    // trunkVariations * leavesVariations should = total variations
    readonly trunkVariations?: number
    readonly leavesVariations?: number
    readonly tree?: {
        readonly minDist?: number
        maxDist?: number
        readonly trunkMinAlpha?: number
        readonly leavesMinAlpha?: number
    }
} | {
    readonly isTree?: false
};

type VariationMixin = {
    readonly variations: Exclude<Variation, 0>
    readonly variationBits: number
} | {
    readonly variations?: never
    readonly variationBits?: never
};

type DoorMixin = ({
    readonly isDoor: true
    readonly hitbox: RectangleHitbox
    readonly locked?: boolean
    readonly openOnce?: boolean
    readonly automatic?: boolean
    readonly hideWhenOpen?: boolean
    readonly animationDuration?: number
    readonly doorSound?: string
} & ({
    readonly operationStyle?: "swivel"
    readonly hingeOffset: Vector
} | {
    readonly operationStyle: "slide"
    /**
     * Determines how much the door slides. 1 means it'll be displaced by its entire width,
     * 0.5 means it'll be displaced by half its width, etc
     */
    readonly slideFactor?: number
})) | { readonly isDoor?: false };

type StairMixin = {
    readonly isStair: true
    /**
     * A stair is a rectangular collider with two active edges (or sides):
     * one of the edges functions as the origin (the foot of the stairs) and the
     * other functions as the target (the top of the stairs). The stair always runs
     * between the two ground layers neighboring its indicated stair layer in a building.
     *
     * The edges allowing for transition are numbered 0 through 3, with 0 being top,
     * 1 being right, 2 being bottom, and 3 being right (before any orientation adjustments
     * are made)
     */
    readonly hitbox: RectangleHitbox
    readonly activeEdges: {
        readonly high: 0 | 1 | 2 | 3
        readonly low: 0 | 1 | 2 | 3
    }
} | { readonly isStair?: false };

type ActivatableMixin = {
    readonly isActivatable: true
    readonly sound?: ({
        readonly name: string
    } | {
        readonly names: string[]
    }) & {
        readonly maxRange?: number
        readonly falloff?: number
    }
    readonly requiredItem?: ReferenceTo<LootDefinition>
    readonly emitParticles?: boolean
    readonly replaceWith?: {
        readonly idString: ReferenceOrRandom<ObstacleDefinition>
        readonly delay: number
    }
} | { readonly isActivatable?: false };

export const Materials = [
    "tree",
    "stone",
    "bush",
    "crate",
    "metal_light",
    "metal_heavy",
    "wood",
    "pumpkin",
    "glass",
    "porcelain",
    "cardboard",
    "appliance",
    "sand",
    "fence",
    "iron",
    "piano",
    "trash_bag",
    "ice"
] as const;

export const MaterialSounds: Record<string, { hit?: string, destroyed?: string }> = {
    cardboard: { hit: "stone", destroyed: "crate" },
    iron: { hit: "metal_light", destroyed: "appliance" },
    ice: { hit: "glass", destroyed: "glass" },
    crate: { hit: "wood" },
    pumpkin: { hit: "stone" },
    trash_bag: { hit: "sand" }
};

// TODO Detect mode somehow
const aidrTint = 0x4059bf; // GameConstants.modeName as string === "winter" ? 0xb94646 : 0x4059bf;

export const TintedParticles: Record<string, { readonly base: string, readonly tint: number, readonly variants?: number }> = {
    _glow_: { base: "_glow_", tint: 0xffffff },

    metal_particle: { base: "metal_particle_1", tint: 0x5f5f5f },
    cargo_ship_particle: { base: "metal_particle_1", tint: 0x273140 },
    metal_column_particle: { base: "metal_particle_1", tint: 0x8f8f8f },
    super_barrel_particle: { base: "metal_particle_1", tint: 0xce2b29 },
    propane_tank_particle: { base: "metal_particle_1", tint: 0xb08b3f },
    dumpster_particle: { base: "metal_particle_1", tint: 0x3c7033 },
    washing_machine_particle: { base: "metal_particle_1", tint: 0xb3b3b3 },
    fridge_particle: { base: "metal_particle_1", tint: 0x666666 },
    tv_particle: { base: "metal_particle_1", tint: 0x333333 },
    smokestack_particle: { base: "metal_particle_1", tint: 0xb5b5b5 },
    distillation_column_particle: { base: "metal_particle_1", tint: 0x1b5e98 },
    ship_oil_tank_particle: { base: "metal_particle_1", tint: 0x00538f },
    forklift_particle: { base: "metal_particle_1", tint: 0xac5339 },
    bollard_particle: { base: "metal_particle_1", tint: 0xa66e20 },
    m1117_particle: { base: "metal_particle_1", tint: 0x2f3725 },
    file_cart_particle: { base: "metal_particle_1", tint: 0x404040 },
    filing_cabinet_particle: { base: "metal_particle_2", tint: 0x7f714d },
    briefcase_particle: { base: "metal_particle_2", tint: 0xcfcfcf },
    aegis_crate_particle: { base: "wood_particle", tint: 0x2687d9 },
    log_particle: { base: "stone_particle_1", tint: 0x5b3e24 },
    airdrop_crate_particle: { base: "wood_particle", tint: aidrTint },
    chest_particle: { base: "wood_particle", tint: 0xa87e5a },
    cooler_particle: { base: "wood_particle", tint: 0x357d99 },
    crate_particle: { base: "wood_particle", tint: 0x9e7437 },
    memorial_crate_particle: { base: "wood_particle", tint: 0x763800 },
    flint_crate_particle: { base: "wood_particle", tint: 0xda6a0b },
    furniture_particle: { base: "wood_particle", tint: 0x785a2e },
    couch_part_particle: { base: "wood_particle", tint: 0x6a330b },
    grenade_crate_particle: { base: "wood_particle", tint: 0x4c4823 },
    gun_case_particle: { base: "wood_particle", tint: 0x3e5130 },
    hazel_crate_particle: { base: "wood_particle", tint: 0x6ba371 },
    lux_crate_particle: { base: "wood_particle", tint: 0x4e5c3d },
    melee_crate_particle: { base: "wood_particle", tint: 0x23374c },
    tango_crate_particle: { base: "wood_particle", tint: 0x3f4c39 },
    wall_particle: { base: "wood_particle", tint: 0xafa08c },
    port_office_wall_particle: { base: "wood_particle", tint: 0xb98a46 },
    flint_lockbox_particle_1: { base: "stone_particle_1", tint: 0x26272c },
    flint_lockbox_particle_2: { base: "stone_particle_2", tint: 0x26272c },
    gold_rock_particle_1: { base: "stone_particle_1", tint: 0xaa8534 },
    gold_rock_particle_2: { base: "stone_particle_2", tint: 0xd3a440 },
    rock_particle_1: { base: "stone_particle_1", tint: 0x8e8e8e },
    rock_particle_2: { base: "stone_particle_2", tint: 0x8e8e8e },
    river_rock_particle_1: { base: "stone_particle_1", tint: 0x626471 },
    river_rock_particle_2: { base: "stone_particle_2", tint: 0x626471 },
    clearing_boulder_particle_1: { base: "stone_particle_1", tint: 0x5a5a5a },
    clearing_boulder_particle_2: { base: "stone_particle_2", tint: 0x5a5a5a },
    sandbags_particle: { base: "stone_particle_2", tint: 0xd59d4e },
    fire_pit_particle_1: { base: "stone_particle_1", tint: 0x5b4f3e },
    fire_pit_particle_2: { base: "stone_particle_2", tint: 0x5b4f3e },
    porta_potty_door_particle: { base: "plastic_particle", tint: 0xf5f9fd },
    porta_potty_toilet_particle: { base: "plastic_particle", tint: 0x5e5e5e },
    porta_potty_wall_particle: { base: "plastic_particle", tint: 0x1c71d8 },
    porta_potty_particle_fall: { base: "plastic_particle", tint: 0x78593b },
    porta_potty_particle: { base: "ceiling_particle", tint: 0xe7e7e7 },
    outhouse_particle: { base: "ceiling_particle", tint: 0x78593b },
    outhouse_wall_particle: { base: "wood_particle", tint: 0x6e4d2f },
    mobile_home_particle: { base: "ceiling_particle", tint: 0xa8a8a8 },
    large_warehouse_particle: { base: "ceiling_particle", tint: 0x2f3c4f },
    grey_office_chair_particle: { base: "wood_particle", tint: 0x616161 },
    office_chair_particle: { base: "wood_particle", tint: 0x7d2b2b },
    hq_stone_wall_particle_1: { base: "stone_particle_1", tint: 0x591919 },
    hq_stone_wall_particle_2: { base: "stone_particle_2", tint: 0x591919 },
    headquarters_desk_particle: { base: "wood_particle", tint: 0x61341a },
    headquarters_c_desk_particle: { base: "wood_particle", tint: 0x6e5838 },
    gold_aegis_case_particle: { base: "wood_particle", tint: 0x1a1a1a },
    hq_tp_wall_particle: { base: "wood_particle", tint: 0x74858b },
    white_small_couch_particle: { base: "wood_particle", tint: 0xcfc1af },
    red_small_couch_particle: { base: "wood_particle", tint: 0x823323 },
    planted_bushes_particle: { base: "toilet_particle", tint: 0xaaaaaa },
    barn_wall_particle_1: { base: "stone_particle_1", tint: 0x690c0c },
    barn_wall_particle_2: { base: "stone_particle_2", tint: 0x690c0c },
    lodge_particle: { base: "wood_particle", tint: 0x49371d },
    lodge_wall_particle: { base: "wood_particle", tint: 0x5a4320 },
    gun_mount_dual_rsh12_particle: { base: "wood_particle", tint: 0x595959 },
    square_desk_particle: { base: "wood_particle", tint: 0x4d3e28 },
    plumpkin_bunker_particle: { base: "metal_particle_1", tint: 0x262626 },
    metal_auto_door_particle: { base: "metal_particle_1", tint: 0x404040 },
    red_metal_auto_door_particle: { base: "metal_particle_1", tint: 0x401a1a },
    blue_metal_auto_door_particle: { base: "metal_particle_1", tint: 0x1a1a40 },
    rsh_case_particle: { base: "wood_particle", tint: 0x583928 },
    river_hut_wall_particle: { base: "wood_particle", tint: 0x736758 },
    buoy_particle: { base: "metal_particle_1", tint: 0xa43737 },
    lighthouse_crate_particle: { base: "wood_particle", tint: 0x79512a },
    loot_tree_particle: { base: "oak_tree_particle", tint: 0x999999 },

    red_gift_particle: { base: "toilet_particle", tint: 0x962626 },
    green_gift_particle: { base: "toilet_particle", tint: 0x377130 },
    blue_gift_particle: { base: "toilet_particle", tint: 0x264b96 },
    purple_gift_particle: { base: "toilet_particle", tint: 0x692d69 },
    black_gift_particle: { base: "toilet_particle", tint: 0x1b1b1b },

    pumpkin_particle: { base: "pumpkin_particle_base", tint: 0xff8c01 },
    plumpkin_particle: { base: "pumpkin_particle_base", tint: 0x8a4c70 },
    diseased_plumpkin_particle: { base: "pumpkin_particle_base", tint: 0x654646 },

    container_particle_white: { base: "metal_particle_1", tint: ContainerTints.white },
    container_particle_red: { base: "metal_particle_1", tint: ContainerTints.red },
    container_particle_green: { base: "metal_particle_1", tint: ContainerTints.green },
    container_particle_blue: { base: "metal_particle_1", tint: ContainerTints.blue },
    container_particle_yellow: { base: "metal_particle_1", tint: ContainerTints.yellow },
    container_particle_gas_can: { base: "metal_particle_1", tint: ContainerTints.gas_can },

    container_particle_military_green: { base: "metal_particle_1", tint: ContainerTints.military_green },
    container_particle_military_orange: { base: "metal_particle_1", tint: ContainerTints.military_orange },
    container_particle_military_marine: { base: "metal_particle_1", tint: ContainerTints.military_marine },
    container_particle_military_lime: { base: "metal_particle_1", tint: ContainerTints.military_lime },

    tent_particle_1: { base: "ceiling_particle", tint: TentTints.red },
    tent_particle_2: { base: "ceiling_particle", tint: TentTints.green },
    tent_particle_3: { base: "ceiling_particle", tint: TentTints.blue },
    tent_particle_4: { base: "ceiling_particle", tint: TentTints.orange },
    tent_particle_5: { base: "ceiling_particle", tint: TentTints.purple },

    tent_ceiling_particle_red_1: { base: "tent_ceiling_particle_1", tint: TentTints.red },
    tent_ceiling_particle_red_2: { base: "tent_ceiling_particle_2", tint: TentTints.red },
    tent_ceiling_particle_red_3: { base: "tent_ceiling_particle_3", tint: TentTints.red },

    tent_ceiling_particle_green_1: { base: "tent_ceiling_particle_1", tint: TentTints.green },
    tent_ceiling_particle_green_2: { base: "tent_ceiling_particle_2", tint: TentTints.green },
    tent_ceiling_particle_green_3: { base: "tent_ceiling_particle_3", tint: TentTints.green },

    tent_ceiling_particle_blue_1: { base: "tent_ceiling_particle_1", tint: TentTints.blue },
    tent_ceiling_particle_blue_2: { base: "tent_ceiling_particle_2", tint: TentTints.blue },
    tent_ceiling_particle_blue_3: { base: "tent_ceiling_particle_3", tint: TentTints.blue },

    tent_ceiling_particle_orange_1: { base: "tent_ceiling_particle_1", tint: TentTints.orange },
    tent_ceiling_particle_orange_2: { base: "tent_ceiling_particle_2", tint: TentTints.orange },
    tent_ceiling_particle_orange_3: { base: "tent_ceiling_particle_3", tint: TentTints.orange },

    tent_ceiling_particle_purple_1: { base: "tent_ceiling_particle_1", tint: TentTints.purple },
    tent_ceiling_particle_purple_2: { base: "tent_ceiling_particle_2", tint: TentTints.purple },
    tent_ceiling_particle_purple_3: { base: "tent_ceiling_particle_3", tint: TentTints.purple },

    truck_container_particle_teal: { base: "metal_particle_1", tint: TruckContainerTints.teal },
    truck_container_particle_orange: { base: "metal_particle_1", tint: TruckContainerTints.orange },
    truck_container_particle_purple: { base: "metal_particle_1", tint: TruckContainerTints.purple },
    truck_container_particle_green: { base: "metal_particle_1", tint: TruckContainerTints.green },
    truck_container_particle_red: { base: "metal_particle_1", tint: TruckContainerTints.red }
};

const houseWall = (
    lengthNumber: number,
    hitbox: RectangleHitbox,
    tintProperties?: {
        readonly color: number
        readonly border: number
        readonly particle: string
    }
): RawObstacleDefinition => ({
    idString: `house_wall_${lengthNumber}`,
    name: `House Wall ${lengthNumber}`,
    defType: DefinitionType.Obstacle,
    material: "wood",
    hideOnMap: true,
    noResidue: true,
    health: 170,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 1
    },
    hitbox,
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    frames: {
        particle: (tintProperties?.particle) ?? "wall_particle"
    },
    isWall: true,
    wall: {
        borderColor: (tintProperties?.border) ?? 0x4a4134,
        color: (tintProperties?.color) ?? 0xafa08c,
        rounded: true
    }
});

const hqWall = (lengthNumber: number, hitbox: RectangleHitbox, customHealth = false): RawObstacleDefinition => ({
    idString: `headquarters_wall_${lengthNumber}`,
    name: "Headquarters Wall",
    defType: DefinitionType.Obstacle,
    material: "wood",
    hideOnMap: true,
    noResidue: true,
    health: customHealth ? 100 : 170,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 1
    },
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    frames: {
        particle: customHealth ? "hq_tp_wall_particle" : "wall_particle"
    },
    hitbox,
    isWall: true,
    wall: {
        borderColor: customHealth ? 0x23282a : 0x4a4134,
        color: customHealth ? 0x74858b : 0xafa08c,
        ...(customHealth ? {} : { rounded: !customHealth })
    }
});

const lodgeWall = (id: string, length: number): RawObstacleDefinition => ({
    idString: `lodge_wall_${id}`,
    name: "Lodge Wall",
    defType: DefinitionType.Obstacle,
    material: "wood",
    hideOnMap: true,
    noResidue: true,
    health: 170,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 1
    },
    hitbox: RectangleHitbox.fromRect(length, 2.06),
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    frames: {
        particle: "lodge_wall_particle"
    },
    isWall: true,
    wall: {
        borderColor: 0x291e0f,
        color: 0x5a4320,
        rounded: true
    }
});

const portMainOfficeWall = (
    lengthNumber: number,
    hitbox: RectangleHitbox
): RawObstacleDefinition => ({
    idString: `port_main_office_wall_${lengthNumber}`,
    name: `Port Main Office Wall ${lengthNumber}`,
    defType: DefinitionType.Obstacle,
    material: "wood",
    hideOnMap: true,
    noResidue: true,
    health: 200,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 1
    },
    hitbox,
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    frames: {
        particle: "port_office_wall_particle"
    },
    isWall: true,
    wall: {
        borderColor: 0x302412,
        color: 0xb98a46
    }
});

const lighthouseWall = (
    lengthNumber: number,
    hitbox: RectangleHitbox
): RawObstacleDefinition => ({
    idString: `lighthouse_wall_${lengthNumber}`,
    name: `Lighthouse Wall ${lengthNumber}`,
    defType: DefinitionType.Obstacle,
    material: "wood",
    hideOnMap: true,
    noResidue: true,
    health: 200,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 1
    },
    hitbox,
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    frames: {
        particle: "port_office_wall_particle"
    },
    isWall: true,
    wall: {
        borderColor: 0x352719,
        color: 0x85613c
    }
});

const innerConcreteWall = (id: number, hitbox: Hitbox): RawObstacleDefinition => ({
    idString: `inner_concrete_wall_${id}`,
    name: "Inner Concrete Wall",
    defType: DefinitionType.Obstacle,
    material: "stone",
    hitbox,
    health: 500,
    noResidue: true,
    hideOnMap: true,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 1
    },
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    particleVariations: 2,
    frames: {
        particle: "rock_particle"
    },
    isWall: true,
    wall: {
        color: 0x808080,
        borderColor: 0x484848,
        rounded: true
    }
});

const mobileHomeWall = (lengthNumber: string, hitbox: RectangleHitbox): RawObstacleDefinition => ({
    idString: `mobile_home_wall_${lengthNumber}`,
    name: `Mobile Home Wall ${lengthNumber}`,
    defType: DefinitionType.Obstacle,
    material: "appliance",
    noResidue: true,
    hideOnMap: true,
    health: 240,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 1
    },
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    hitbox,
    frames: {
        particle: "briefcase_particle"
    },
    isWall: true,
    wall: {
        borderColor: 0x666666,
        color: 0xbfbfbf
    }
});

const tentWall = (
    id: number,
    color: "red" | "green" | "blue" | "orange" | "purple"
): RawObstacleDefinition => ({
    idString: `tent_wall_${id}`,
    name: `Tent Wall ${id}`,
    defType: DefinitionType.Obstacle,
    material: "stone",
    hideOnMap: true,
    noResidue: true,
    health: 100,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 1
    },
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    hitbox: new GroupHitbox(
        RectangleHitbox.fromRect(26.1, 1.25, Vec.create(0, -0.75)),
        RectangleHitbox.fromRect(1.25, 2.8, Vec.create(-12.9, 0)),
        RectangleHitbox.fromRect(1.25, 2.8, Vec.create(12.9, 0))
    ),
    particleVariations: 3,
    frames: {
        base: "tent_wall",
        particle: `tent_ceiling_particle_${color}`
    },
    tint: TentTints[color],
    isWall: true
});

const portaPottyWall = (
    name: string,
    hitbox: RectangleHitbox,
    outhouse?: boolean
): RawObstacleDefinition => ({
    idString: name.toLowerCase().replace(/'/g, "").replace(/ /g, "_"),
    name: name,
    defType: DefinitionType.Obstacle,
    material: "wood",
    health: 100,
    noResidue: true,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 0.9
    },
    hideOnMap: true,
    hitbox,
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    isWall: true,
    wall: outhouse
        ? { color: 0x6e4d2f, borderColor: 0x261b14 }
        : { color: 0x1c71d8, borderColor: 0x0d3565 },
    frames: {
        particle: outhouse
            ? "outhouse_wall_particle"
            : "porta_potty_wall_particle"
    }
});

const bigTentWall = (
    id: number,
    color: "red" | "green" | "blue" | "orange" | "purple"
): RawObstacleDefinition => ({
    idString: `tent_wall_big_${id}`,
    name: `Big Tent Wall ${id}`,
    defType: DefinitionType.Obstacle,
    material: "stone",
    hideOnMap: true,
    noResidue: true,
    health: 200,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 1
    },
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    hitbox: new GroupHitbox(
        RectangleHitbox.fromRect(1.25, 6.5, Vec.create(-3.425, -0.5)),
        RectangleHitbox.fromRect(10.5, 1.25, Vec.create(0, 3.5)),
        // RectangleHitbox.fromRect(7, 2.1, Vec.create(-8.5, 3.25)),
        // RectangleHitbox.fromRect(7, 2.1, Vec.create(8.5, 3.25)),
        RectangleHitbox.fromRect(9, 1.25, Vec.create(-17.45, 3.5)),
        RectangleHitbox.fromRect(9, 1.25, Vec.create(17.45, 3.5)),
        RectangleHitbox.fromRect(1.25, 8.7, Vec.create(-21.5, -0.3)),
        RectangleHitbox.fromRect(1.25, 8.7, Vec.create(21.5, -0.3))
    ),
    particleVariations: 2,
    frames: {
        base: "tent_wall_big",
        particle: `tent_ceiling_particle_${color}`
    },
    tint: TentTints[color],
    isWall: true
});

const gunMount = (
    gunID: ReferenceTo<GunDefinition>,
    weaponType: "gun" | "melee",
    useSvg = false,
    hitbox?: Hitbox,
    frames?: ObstacleDefinition["frames"]
): RawObstacleDefinition => ({
    idString: `gun_mount_${gunID}`,
    name: "Gun Mount",
    defType: DefinitionType.Obstacle,
    material: "wood",
    health: 60,
    hideOnMap: true,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 0.95
    },
    hasLoot: true,
    hitbox: hitbox ?? new GroupHitbox(
        RectangleHitbox.fromRect(8.2, 0.95, Vec.create(0, -1.32)), // Base
        RectangleHitbox.fromRect(0.75, 2.75, Vec.create(0, 0.48)), // Center post
        RectangleHitbox.fromRect(0.75, 2.75, Vec.create(-3.11, 0.48)), // Left post
        RectangleHitbox.fromRect(0.75, 2.75, Vec.create(3.17, 0.48)) // Right post
    ),
    rotationMode: RotationMode.Limited,
    frames: frames ?? {
        base: "gun_mount",
        particle: "furniture_particle",
        residue: "gun_mount_residue"
    },
    gunMount: !useSvg
        ? {
            type: weaponType,
            weapon: `${gunID}${weaponType === "gun" ? "_world" : ""}`
        }
        : undefined
} as const);

const kitchenUnit = (id: string, hitbox: RectangleHitbox, residue?: string): RawObstacleDefinition => ({
    idString: `kitchen_unit_${id}`,
    name: "Kitchen Unit",
    defType: DefinitionType.Obstacle,
    material: "wood",
    health: 100,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 0.7
    },
    hitbox,
    hideOnMap: true,
    hasLoot: true,
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Always,
    frames: {
        particle: "furniture_particle",
        residue: residue ?? "small_drawer_residue"
    }
});

const controlPanel = (idString: string, name: string): RawObstacleDefinition => ({
    idString,
    name,
    defType: DefinitionType.Obstacle,
    material: "metal_light",
    health: 200,
    reflectBullets: true,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 0.7
    },
    hitbox: RectangleHitbox.fromRect(11, 8),
    rotationMode: RotationMode.Limited,
    explosion: "control_panel_explosion",
    frames: {
        particle: "metal_particle",
        residue: "barrel_residue"
    }
});

const gift = (
    color: "red" | "green" | "blue" | "purple" | "black",
    explode = false
): RawObstacleDefinition => ({
    idString: `${color}_gift`,
    name: `${color.charAt(0).toUpperCase() + color.slice(1)} Gift`,
    defType: DefinitionType.Obstacle,
    material: "cardboard",
    hideOnMap: true,
    health: 60,
    scale: {
        spawnMin: 1,
        spawnMax: 1,
        destroy: 0.8
    },
    rotationMode: RotationMode.Limited,
    allowFlyover: FlyoverPref.Never,
    hitbox: RectangleHitbox.fromRect(4.4, 4.4),
    zIndex: ZIndexes.ObstaclesLayer2,
    hasLoot: true,
    explosion: explode ? "coal_explosion" : undefined
});

const rshCase = (idString: string): RawObstacleDefinition => ({
    idString,
    name: "RSh-12 Case",
    defType: DefinitionType.Obstacle,
    material: "crate",
    health: 150,
    hitbox: new GroupHitbox(
        RectangleHitbox.fromRect(8.5, 5.5),
        RectangleHitbox.fromRect(1.3, 6, Vec.create(-2.7, 0)),
        RectangleHitbox.fromRect(1.3, 6, Vec.create(2.7, 0))
    ),
    scale: {
        spawnMax: 1,
        spawnMin: 1,
        destroy: 0.8
    },
    rotationMode: RotationMode.Limited,
    hasLoot: true,
    frames: {
        particle: "rsh_case_particle",
        residue: "rsh_case_residue"
    }
});

type RawObstacleDefinition = CommonObstacleDefinition & {
    readonly variations?: Exclude<Variation, 0>
    readonly variationBits?: never
    readonly winterVariations?: Exclude<Variation, 0>
};

export type ObstacleDefinition = CommonObstacleDefinition & VariationMixin;

export const Obstacles = new ObjectDefinitions<ObstacleDefinition>(([
    {
        idString: "oak_tree",
        name: "Oak Tree",
        defType: DefinitionType.Obstacle,
        material: "tree",
        health: 180,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.2,
            destroy: 0.75
        },
        hitbox: new CircleHitbox(3.5),
        spawnHitbox: new CircleHitbox(8.5),
        rotationMode: RotationMode.Full,
        isTree: true,
        variations: 4,
        trunkVariations: 2,
        leavesVariations: 2,
        frames: {
            base: "oak_tree_trunk",
            leaves: "oak_tree_leaves"
        },
        allowFlyover: FlyoverPref.Never,
        zIndex: ZIndexes.ObstaclesLayer5
    },
    {
        idString: "birch_tree",
        name: "Birch Tree",
        defType: DefinitionType.Obstacle,
        material: "tree",
        isTree: true,
        health: 180,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.75
        },
        hitbox: new CircleHitbox(3.5),
        spawnHitbox: new CircleHitbox(8.5),
        rotationMode: RotationMode.Full,
        variations: 2,
        leavesVariations: 2,
        frames: {
            base: "birch_tree_trunk",
            leaves: "birch_tree_leaves"
        },
        allowFlyover: FlyoverPref.Never,
        zIndex: ZIndexes.ObstaclesLayer5
    },
    {
        idString: "pine_tree",
        name: "Pine Tree",
        defType: DefinitionType.Obstacle,
        material: "tree",
        isTree: true,
        tree: {
            leavesMinAlpha: 0.45
        },
        trunkVariations: 1,
        leavesVariations: 1,
        health: 180,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.75
        },
        hitbox: new CircleHitbox(2.5),
        spawnHitbox: new CircleHitbox(8.5),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Never,
        zIndex: ZIndexes.ObstaclesLayer5,
        frames: {
            base: "pine_tree_trunk",
            leaves: "pine_tree"
        }
    },
    {
        idString: "big_oak_tree",
        name: "Big Oak Tree",
        defType: DefinitionType.Obstacle,
        material: "tree",
        health: 240,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.2,
            destroy: 0.75
        },
        spawnHitbox: new CircleHitbox(8.5),
        rotationMode: RotationMode.Full,
        hitbox: new CircleHitbox(3.5),
        isTree: true,
        tree: {
            minDist: 64,
            maxDist: 1764,
            trunkMinAlpha: 0.75,
            leavesMinAlpha: 0.3
        },
        variations: 6,
        trunkVariations: 6,
        zIndex: ZIndexes.ObstaclesLayer5,
        frames: {
            base: "big_oak_tree_trunk",
            leaves: "big_oak_tree_leaves",
            particle: "oak_tree_particle",
            residue: "oak_tree_residue"
        }
    },
    {
        idString: "maple_tree",
        name: "Maple Tree",
        defType: DefinitionType.Obstacle,
        material: "tree",
        health: 290,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.2,
            destroy: 0.75
        },
        spawnHitbox: new CircleHitbox(20),
        rotationMode: RotationMode.Full,
        hitbox: new CircleHitbox(5.5),
        isTree: true,
        tree: {
            minDist: 64,
            maxDist: 1764,
            trunkMinAlpha: 0.75,
            leavesMinAlpha: 0.3
        },
        variations: 3,
        leavesVariations: 3,
        allowFlyover: FlyoverPref.Never,
        zIndex: ZIndexes.ObstaclesLayer5,
        frames: {
            base: "maple_tree_trunk",
            leaves: "maple_tree_leaves"
        }
    },
    {
        idString: "dormant_oak_tree",
        name: "Dormant Oak Tree",
        defType: DefinitionType.Obstacle,
        material: "tree",
        health: 120,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.75
        },
        spawnHitbox: new CircleHitbox(8.5),
        rotationMode: RotationMode.Full,
        hitbox: new CircleHitbox(2.5),
        variations: 2,
        allowFlyover: FlyoverPref.Never,
        zIndex: ZIndexes.ObstaclesLayer5
    },
    {
        idString: "christmas_tree",
        name: "Christmas Tree",
        defType: DefinitionType.Obstacle,
        material: "tree",
        health: 720,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.75
        },
        hitbox: new CircleHitbox(10),
        spawnHitbox: new CircleHitbox(15),
        rotationMode: RotationMode.Full,
        zIndex: ZIndexes.ObstaclesLayer5,
        allowFlyover: FlyoverPref.Never,
        hasLoot: true,
        glow: {
            tint: 0xffff00,
            scale: 1.5,
            alpha: 0.8,
            scaleAnim: {
                to: 2,
                duration: 1e3
            }
        }
    },
    {
        idString: "stump",
        name: "Stump",
        defType: DefinitionType.Obstacle,
        material: "tree",
        health: 180,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1,
            destroy: 0.5
        },
        hitbox: new CircleHitbox(2.9),
        rotationMode: RotationMode.Full
    },
    {
        idString: "hatchet_stump",
        name: "Hatchet Stump",
        defType: DefinitionType.Obstacle,
        material: "tree",
        health: 180,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        hitbox: new CircleHitbox(2.9),
        rotationMode: RotationMode.None,
        hasLoot: true,
        frames: {
            particle: "stump_particle",
            residue: "stump_residue"
        }
    },
    {
        idString: "rock",
        name: "Rock",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 200,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: new CircleHitbox(4),
        spawnHitbox: new CircleHitbox(4.5),
        rotationMode: RotationMode.Full,
        variations: 7,
        particleVariations: 2
    },
    {
        idString: "river_rock",
        name: "River Rock",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 550,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.River,
        zIndex: ZIndexes.DownedPlayers - 1,
        hitbox: new CircleHitbox(8),
        spawnHitbox: new CircleHitbox(10),
        rotationMode: RotationMode.Full,
        variations: 5,
        particleVariations: 2
    },
    {
        idString: "clearing_boulder",
        name: "Clearing Boulder",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 850,
        scale: {
            spawnMin: 1,
            spawnMax: 1.2,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.Grass,
        hitbox: new CircleHitbox(8.2),
        spawnHitbox: new CircleHitbox(12),
        rotationMode: RotationMode.Full,
        variations: 2,
        particleVariations: 2
    },
    {
        idString: "pebble",
        name: "Pebble",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 200,
        indestructible: true,
        noCollisions: true,
        noMeleeCollision: true,
        noBulletCollision: true,
        scale: {
            spawnMin: 0.8,
            spawnMax: 1.2,
            destroy: 0
        },
        spawnMode: MapObjectSpawnMode.Trail,
        hitbox: new CircleHitbox(0.5),
        spawnHitbox: new CircleHitbox(0.5),
        rotationMode: RotationMode.Full,
        variations: 2
    },
    {
        idString: "pumpkin",
        name: "Pumpkin",
        defType: DefinitionType.Obstacle,
        material: "pumpkin",
        health: 100,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.5
        },
        hitbox: new CircleHitbox(2.55),
        spawnHitbox: new CircleHitbox(3),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        frames: {
            particle: "pumpkin_particle"
        }
    },
    {
        idString: "large_pumpkin",
        name: "Large Pumpkin",
        defType: DefinitionType.Obstacle,
        material: "pumpkin",
        health: 160,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.5
        },
        hitbox: new CircleHitbox(4.69),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        frames: {
            particle: "pumpkin_particle",
            residue: "pumpkin_residue"
        }
    },
    {
        idString: "jack_o_lantern",
        name: "Jack O' Lantern",
        defType: DefinitionType.Obstacle,
        material: "pumpkin",
        health: 300,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.5
        },
        glow: {
            tint: 0xfca202,
            scale: 0.6,
            alpha: 0.8,
            scaleAnim: {
                to: 0.7,
                duration: 2e3
            },
            flicker: {
                chance: 0.5,
                strength: 0.9,
                interval: 7e2
            }
        },
        hitbox: new CircleHitbox(4.69),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        frames: {
            particle: "pumpkin_particle",
            residue: "pumpkin_residue"
        }
    },
    {
        idString: "baby_plumpkin",
        name: "Baby Plumpkin",
        defType: DefinitionType.Obstacle,
        material: "pumpkin",
        health: 100,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.6
        },
        hitbox: new CircleHitbox(1.83),
        spawnHitbox: new CircleHitbox(2),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "plumpkin_particle"
        },
        variations: 1,
        weaponSwap: {
            modeRestricted: true
        }
    },
    {
        idString: "baby_plumpkin_infection",
        name: "Baby Plumpkin (Infection)",
        defType: DefinitionType.Obstacle,
        material: "pumpkin",
        health: 100,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.6
        },
        hitbox: new CircleHitbox(1.83),
        spawnHitbox: new CircleHitbox(2),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        frames: {
            base: "baby_plumpkin",
            particle: "plumpkin_particle",
            residue: "baby_plumpkin_residue"
        },
        variations: 3,
        weaponSwap: {
            weighted: true
        },
        regenerateAfterDestroyed: 30000,
        applyPerkOnDestroy: {
            mode: "infection",
            perk: PerkIds.Infected,
            chance: 0.05
        }
    },
    {
        idString: "plumpkin",
        name: "Plumpkin",
        defType: DefinitionType.Obstacle,
        material: "pumpkin",
        health: 300,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.5
        },
        hitbox: new CircleHitbox(4.69),
        spawnHitbox: new CircleHitbox(5),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "plumpkin_particle"
        },
        hasLoot: true
    },
    {
        idString: "diseased_plumpkin",
        name: "Diseased Plumpkin",
        defType: DefinitionType.Obstacle,
        material: "pumpkin",
        health: 200,
        hideOnMap: true,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.5
        },
        glow: {
            tint: 0x643554,
            scale: 0.6,
            alpha: 0.8,
            scaleAnim: {
                to: 0.7,
                duration: 3e3
            }
        },
        hitbox: new CircleHitbox(4.45),
        spawnHitbox: new CircleHitbox(5),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true
    },
    {
        idString: "birthday_cake",
        name: "Birthday Cake",
        defType: DefinitionType.Obstacle,
        material: "pumpkin",
        health: 70,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.75
        },
        hitbox: new CircleHitbox(1.9),
        spawnHitbox: new CircleHitbox(2.9),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true
    },
    {
        idString: "cobweb",
        name: "Cobweb",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 69420,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0
        },
        hitbox: RectangleHitbox.fromRect(9, 9),
        noCollisions: true,
        noMeleeCollision: true,
        noBulletCollision: true,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        zIndex: ZIndexes.ObstaclesLayer4

    },
    {
        idString: "oil_tank",
        name: "Oil Tank",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(16.8, 13.6),
            RectangleHitbox.fromRect(26, 2),
            new CircleHitbox(5, Vec.create(-8, 1.8)),
            new CircleHitbox(5, Vec.create(-8, -1.8)),
            new CircleHitbox(5, Vec.create(8, 1.8)),
            new CircleHitbox(5, Vec.create(8, -1.8))
        ),
        spawnHitbox: RectangleHitbox.fromRect(28, 18),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        noResidue: true,
        frames: {
            particle: "metal_particle"
        },
        reflectBullets: true,
        winterVariations: 2
    },
    {
        idString: "flint_lockbox",
        name: "Flint Lockbox",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 200,
        impenetrable: true,
        hasLoot: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: RectangleHitbox.fromRect(8.9, 8.9, Vec.create(0, 0.1)),
        rotationMode: RotationMode.None,
        particleVariations: 2,
        winterVariations: 1
    },
    {
        idString: "monument",
        name: "Monument",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 200,
        indestructible: true,
        noResidue: true,
        doorSound: "monument_slide",
        zIndex: ZIndexes.BuildingsCeiling + 1,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        customInteractMessage: true,
        interactOnlyFromSide: 2,
        isDoor: true,
        openOnce: true,
        operationStyle: "slide",
        slideFactor: 0.8,
        animationDuration: 6000,
        hitbox: RectangleHitbox.fromRect(19.25, 19.25),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "clearing_boulder_particle"
        },
        particleVariations: 2
    },
    {
        idString: "bush",
        name: "Bush",
        defType: DefinitionType.Obstacle,
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
        zIndex: ZIndexes.ObstaclesLayer3
    },
    {
        idString: "vibrant_bush",
        name: "Vibrant Bush",
        defType: DefinitionType.Obstacle,
        material: "bush",
        health: 120,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.8
        },
        hitbox: new CircleHitbox(5.4),
        noCollisions: true,
        spawnWithLoot: true,
        lootTable: "special_bush",
        rotationMode: RotationMode.Full,
        particleVariations: 2,
        variations: 3,
        zIndex: ZIndexes.ObstaclesLayer3
    },
    {
        idString: "lamp",
        name: "Lamp",
        defType: DefinitionType.Obstacle,
        material: "glass",
        variations: 2,
        health: 69,
        indestructible: true,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.8
        },
        hitbox: new CircleHitbox(0),
        noCollisions: true,
        noBulletCollision: true,
        noHitEffect: true,
        noMeleeCollision: true,
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsCeiling - 2
    },
    {
        idString: "vat",
        name: "Vat",
        defType: DefinitionType.Obstacle,
        rotationMode: RotationMode.Limited,
        material: "appliance",
        variations: 2,
        health: 200,
        indestructible: true,
        reflectBullets: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.75
        },
        frames: {
            particle: "washing_machine_particle"
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(7.03, 3.98, Vec.create(0, 1.19)),
            RectangleHitbox.fromRect(5.61, 2.74, Vec.create(-0.03, -1.27)),
            RectangleHitbox.fromRect(1, 3.79, Vec.create(-3.03, -0.21)),
            RectangleHitbox.fromRect(1, 3.79, Vec.create(3.01, -0.21)),
            new CircleHitbox(0.56, Vec.create(2.69, -2.09)),
            new CircleHitbox(0.56, Vec.create(-2.63, -2.11))
        )
    },
    {
        idString: "detector_walls",
        name: "Detector Walls",
        defType: DefinitionType.Obstacle,
        material: "iron",
        health: 1000,
        reflectBullets: true,
        indestructible: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1, 9.1, Vec.create(4, 0)),
            RectangleHitbox.fromRect(1, 9, Vec.create(-3.9, 0.1))
        ),
        noResidue: true,
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "detector_top",
        name: "Detector Top",
        defType: DefinitionType.Obstacle,
        material: "iron",
        health: 1000,
        detector: true,
        indestructible: true,
        noBulletCollision: true,
        noMeleeCollision: true,
        hitbox: RectangleHitbox.fromRect(9, 3),
        noCollisions: true,
        noResidue: true,
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "metal_particle"
        },
        zIndex: ZIndexes.ObstaclesLayer3
    },
    {
        idString: "blueberry_bush",
        name: "Blueberry Bush",
        defType: DefinitionType.Obstacle,
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
        lootTable: "special_bush",
        frames: {
            particle: "bush_particle",
            residue: "bush_residue"
        }
    },
    {
        idString: "oak_leaf_pile",
        name: "Oak Leaf Pile",
        defType: DefinitionType.Obstacle,
        material: "bush",
        health: 50,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.3,
            destroy: 0.8
        },
        hitbox: new CircleHitbox(5),
        noCollisions: true,
        noResidue: true,
        rotationMode: RotationMode.Full,
        zIndex: ZIndexes.ObstaclesLayer3,
        // spawnWithLoot: true,
        frames: {
            particle: "leaf_particle_3"
        }
    },
    {
        idString: "regular_crate",
        name: "Regular Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        rotationMode: RotationMode.Binary,
        hitbox: RectangleHitbox.fromRect(9.2, 9.2),
        hasLoot: true,
        frames: {
            particle: "crate_particle",
            residue: "regular_crate_residue"
        },
        winterVariations: 6
    },
    {
        idString: "flint_crate",
        name: "Flint Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        rotationMode: RotationMode.None,
        hitbox: RectangleHitbox.fromRect(9.2, 9.2),
        hasLoot: true,
        hideOnMap: true,
        winterVariations: 6
    },
    {
        idString: "aegis_crate",
        name: "AEGIS Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        rotationMode: RotationMode.None,
        hitbox: RectangleHitbox.fromRect(9.2, 9.2),
        hasLoot: true,
        hideOnMap: true,
        winterVariations: 6
    },
    {
        idString: "grenade_crate",
        name: "Grenade Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: RectangleHitbox.fromRect(6.5, 6.3),
        rotationMode: RotationMode.None,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        winterVariations: 3
    },
    {
        idString: "melee_crate",
        name: "Melee Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: RectangleHitbox.fromRect(6.5, 6.3),
        rotationMode: RotationMode.None,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        winterVariations: 1
    },
    {
        idString: "lighthouse_crate",
        name: "Lighthouse Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: RectangleHitbox.fromRect(6.5, 6.3),
        rotationMode: RotationMode.None,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        winterVariations: 1
    },
    {
        idString: "hazel_crate",
        name: "HAZEL Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 1700,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        hitbox: RectangleHitbox.fromRect(9.2, 9.2),
        rotationMode: RotationMode.None,
        frames: {
            particle: "hazel_crate_particle",
            residue: "hazel_crate_residue"
        },
        hasLoot: true
    },
    {
        idString: "frozen_crate",
        name: "Frozen Crate",
        defType: DefinitionType.Obstacle,
        material: "ice",
        health: 1000,
        variations: 2,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        rotationMode: RotationMode.Binary,
        hitbox: RectangleHitbox.fromRect(9.2, 9.2),
        frames: {
            residue: "regular_crate_residue",
            particle: "window_particle"
        },
        hasLoot: true,
        hideOnMap: true
    },
    {
        idString: "ammo_crate",
        name: "Ammo Crate",
        defType: DefinitionType.Obstacle,
        material: "cardboard",
        health: 160,
        impenetrable: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.6
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: RectangleHitbox.fromRect(8.49, 8.36),
        rotationMode: RotationMode.Limited,
        hasLoot: true,
        frames: {
            particle: "crate_particle"
        },
        winterVariations: 2
    },
    {
        idString: "hq_desk_left",
        name: "Headquarters Desk",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(18.25, 5.25, Vec.create(0, -3)),
            RectangleHitbox.fromRect(4.5, 11, Vec.create(-6.8, 0))
        ),
        rotationMode: RotationMode.Limited,
        hasLoot: true,
        lootTable: "hq_desk",
        frames: {
            particle: "headquarters_desk_particle"
        }
    },
    {
        idString: "hq_desk_right",
        name: "Headquarters Desk",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(18.25, 5.25, Vec.create(0, -3)),
            RectangleHitbox.fromRect(4.5, 11, Vec.create(6.8, 0))
        ),
        rotationMode: RotationMode.Limited,
        hasLoot: true,
        lootTable: "hq_desk",
        frames: {
            particle: "headquarters_desk_particle"
        }
    },
    {
        idString: "square_desk",
        name: "Square Desk",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 120,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(18.55, 3.76, Vec.create(0, -7.39)),
            RectangleHitbox.fromRect(18.55, 3.76, Vec.create(0, 7.39)),
            RectangleHitbox.fromRect(6.02, 14.27, Vec.create(6.27, 0)),
            RectangleHitbox.fromRect(3.77, 3.37, Vec.create(-7.39, -4.57)),
            RectangleHitbox.fromRect(3.77, 3.37, Vec.create(-7.39, 4.57))
        ),
        rotationMode: RotationMode.Limited
    },
    {
        idString: "piano",
        name: "Piano",
        defType: DefinitionType.Obstacle,
        material: "piano",
        health: 350,
        hitSoundVariations: 4,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(12.9, 3, Vec.create(0.1, -6.5)),
            RectangleHitbox.fromRect(11, 5, Vec.create(0.1, -3)),
            RectangleHitbox.fromRect(7, 5, Vec.create(3.5, 2.5)),
            RectangleHitbox.fromRect(2, 8, Vec.create(6, 0)),
            new CircleHitbox(1.6, Vec.create(-5.1, -4)),
            new CircleHitbox(1.6, Vec.create(-4.5, -2)),
            new CircleHitbox(1.6, Vec.create(-3, -1)),
            new CircleHitbox(1.6, Vec.create(0.5, 3)),
            new CircleHitbox(1.6, Vec.create(0, 2)),
            new CircleHitbox(1.6, Vec.create(-0.5, 1)),
            new CircleHitbox(1.6, Vec.create(-1, 0.5)),
            new CircleHitbox(1, Vec.create(6, -4.5)),
            new CircleHitbox(0.8, Vec.create(-6.4, -4.8)),
            new CircleHitbox(2.8, Vec.create(3.5, 5)),
            new CircleHitbox(3, Vec.create(4, 5)),
            new CircleHitbox(3, Vec.create(3, 4))
        ),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        frames: {
            particle: "furniture_particle"
        }
    },
    {
        idString: "rocket_box",
        name: "Firework rocket box",
        defType: DefinitionType.Obstacle,
        material: "cardboard",
        health: 45,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.6
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: RectangleHitbox.fromRect(4, 4),
        rotationMode: RotationMode.Limited,
        hasLoot: true,
        frames: {
            particle: "box_particle",
            residue: "box_residue"
        }
    },
    {
        idString: "confetti_grenade_box",
        name: "Confetti grenade box",
        defType: DefinitionType.Obstacle,
        material: "cardboard",
        health: 45,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.6
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: RectangleHitbox.fromRect(4, 4),
        rotationMode: RotationMode.Limited,
        hasLoot: true,
        frames: {
            particle: "box_particle",
            residue: "box_residue"
        }
    },
    {
        idString: "tear_gas_crate",
        name: "Tear Gas Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.6
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: RectangleHitbox.fromRect(9.15, 6.3),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "crate_particle",
            residue: "regular_crate_residue"
        },
        particlesOnDestroy: "tear_gas_particle",
        additionalDestroySounds: ["smoke_grenade"],
        winterVariations: 1,
        waterOverlay: {
            scaleX: 1,
            scaleY: 0.65
        }
    },
    {
        idString: "barrel",
        name: "Barrel",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 160,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,

        hitbox: new CircleHitbox(3.75),
        rotationMode: RotationMode.Full,
        explosion: "barrel_explosion",
        frames: {
            particle: "metal_particle"
        },
        reflectBullets: true,
        winterVariations: 3
    },
    {
        idString: "super_barrel",
        name: "Super Barrel",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 240,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: new CircleHitbox(3.75),
        rotationMode: RotationMode.Full,
        explosion: "super_barrel_explosion",
        reflectBullets: true,
        winterVariations: 3
    },
    {
        idString: "propane_tank",
        name: "Propane Tank",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 60,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        reflectBullets: true,
        hitbox: new CircleHitbox(1.9),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        explosion: "propane_tank_explosion",
        frames: {
            particle: "propane_tank_particle",
            residue: "explosion_decal"
        }
    },
    {
        idString: "loot_barrel",
        name: "Loot Barrel",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        hideOnMap: true,
        health: 160,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hasLoot: true,
        hitbox: new CircleHitbox(3.75),
        rotationMode: RotationMode.Full,
        explosion: "barrel_explosion",
        reflectBullets: true,
        frames: {
            particle: "metal_particle",
            residue: "barrel_residue"
        }
    },
    {
        idString: "airdrop_crate_locked",
        name: "Airdrop",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 10000,
        indestructible: true,
        reflectBullets: true,
        hitbox: RectangleHitbox.fromRect(8.7, 8.7),
        spawnHitbox: RectangleHitbox.fromRect(10, 10),
        rotationMode: RotationMode.None,
        hideOnMap: true,
        isActivatable: true,
        zIndex: ZIndexes.ObstaclesLayer2,
        sound: {
            name: "airdrop_unlock",
            maxRange: 64,
            falloff: 0.3
        },
        replaceWith: {
            idString: { airdrop_crate: 0.95, gold_airdrop_crate: 0.05 },
            delay: 800
        },
        noResidue: true,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "airdrop_crate",
        name: "Airdrop Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 150,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        hitbox: RectangleHitbox.fromRect(8.7, 8.7),
        spawnHitbox: RectangleHitbox.fromRect(10, 10),
        hideOnMap: true,
        rotationMode: RotationMode.None,
        hasLoot: true
    },
    {
        idString: "gold_airdrop_crate",
        name: "Gold Airdrop Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 170,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        hitbox: RectangleHitbox.fromRect(8.7, 8.7),
        spawnHitbox: RectangleHitbox.fromRect(10, 10),
        rotationMode: RotationMode.None,
        hideOnMap: true,
        hasLoot: true,
        frames: {
            particle: "airdrop_crate_particle"
        }
    },
    {
        idString: "gold_rock",
        name: "Gold Rock",
        defType: DefinitionType.Obstacle,
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
        particleVariations: 2,
        rotationMode: RotationMode.Full,
        hasLoot: true
    },
    {
        idString: "loot_tree",
        name: "Loot Tree",
        defType: DefinitionType.Obstacle,
        material: "stone",
        hideOnMap: true,
        health: 250,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1,
            destroy: 0.75
        },
        hitbox: new CircleHitbox(5.5),
        spawnHitbox: new CircleHitbox(15),
        rotationMode: RotationMode.Full,
        zIndex: ZIndexes.ObstaclesLayer5,
        allowFlyover: FlyoverPref.Never,
        hasLoot: true,
        isTree: true,
        variations: 4,
        trunkVariations: 2,
        leavesVariations: 2,
        frames: {
            base: "oak_tree_trunk",
            leaves: "oak_tree_leaves"
        },
        tint: 0x999999
    },
    {
        idString: "box",
        name: "Box",
        defType: DefinitionType.Obstacle,
        material: "cardboard",
        health: 40,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(4.4, 4.4),
        rotationMode: RotationMode.Limited,
        variations: 3,
        zIndex: ZIndexes.ObstaclesLayer2,
        hasLoot: true,
        winterVariations: 3,
        waterOverlay: {
            scaleX: 0.45,
            scaleY: 0.45
        }
    },
    gift("red"),
    gift("green"),
    gift("blue"),
    gift("purple"),
    gift("black", true),
    {
        idString: "hq_large_cart",
        name: "Large Cart",
        defType: DefinitionType.Obstacle,
        material: "iron",
        health: 210,
        indestructible: true,
        hideOnMap: true,
        invisible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.6, 10.8, Vec.create(-16.5, 0.2)),
            RectangleHitbox.fromRect(1.6, 10.8, Vec.create(1.5, 0.2))
        ),
        rotationMode: RotationMode.Limited,
        reflectBullets: true,
        noResidue: true,
        frames: {
            particle: "file_cart_particle"
        }
    },
    {
        idString: "file_cart",
        name: "File Cart",
        defType: DefinitionType.Obstacle,
        material: "iron",
        health: 210,
        hideOnMap: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(11, 5.7)
        ),
        rotationMode: RotationMode.Limited,
        reflectBullets: true,
        frames: {
            particle: "file_cart_particle"
        }
    },

    houseWall(1, RectangleHitbox.fromRect(9, 2)),
    houseWall(2, RectangleHitbox.fromRect(20.86, 2)),
    houseWall(3, RectangleHitbox.fromRect(11.4, 2)),
    houseWall(4, RectangleHitbox.fromRect(21.4, 2)),
    houseWall(5, RectangleHitbox.fromRect(16, 2)),
    houseWall(6, RectangleHitbox.fromRect(15.1, 2)),
    houseWall(7, RectangleHitbox.fromRect(20.6, 2)),
    houseWall(8, RectangleHitbox.fromRect(10.7, 2)),
    houseWall(9, RectangleHitbox.fromRect(17.7, 2)),
    houseWall(10, RectangleHitbox.fromRect(20.6, 2)),
    houseWall(11, RectangleHitbox.fromRect(11.6, 2)),
    houseWall(12, RectangleHitbox.fromRect(16.2, 2)),
    houseWall(14, RectangleHitbox.fromRect(17, 2)),
    houseWall(15, RectangleHitbox.fromRect(12.1, 2)),
    houseWall(16, RectangleHitbox.fromRect(10.5, 2)),
    houseWall(17, RectangleHitbox.fromRect(22.5, 2)),

    // small bunker special wall
    houseWall(
        13, RectangleHitbox.fromRect(9, 2),
        { color: 0x74858b, border: 0x23282a, particle: "hq_tp_wall_particle" }
    ),

    // blue house basement shit
    houseWall(
        18, RectangleHitbox.fromRect(5.25, 2),
        { color: 0x74858b, border: 0x23282a, particle: "hq_tp_wall_particle" }
    ),
    houseWall(
        19, RectangleHitbox.fromRect(19.55, 2),
        { color: 0x74858b, border: 0x23282a, particle: "hq_tp_wall_particle" }
    ),

    // river hut
    houseWall(
        20, RectangleHitbox.fromRect(32.7, 2),
        { color: 0x736758, border: 0x383127, particle: "river_hut_wall_particle" }
    ),
    houseWall(
        21, RectangleHitbox.fromRect(23.15, 2),
        { color: 0x736758, border: 0x383127, particle: "river_hut_wall_particle" }
    ),
    houseWall(
        22, RectangleHitbox.fromRect(30.8, 2),
        { color: 0x736758, border: 0x383127, particle: "river_hut_wall_particle" }
    ),
    houseWall(
        23, RectangleHitbox.fromRect(25.4, 2),
        { color: 0x736758, border: 0x383127, particle: "river_hut_wall_particle" }
    ),

    // flooded bunker
    houseWall(24, RectangleHitbox.fromRect(14.1, 2)),
    houseWall(25, RectangleHitbox.fromRect(16.52, 2)),

    // HQ walls (headquarters)
    hqWall(1, RectangleHitbox.fromRect(11.4, 2)),
    hqWall(2, RectangleHitbox.fromRect(21.05, 2)),
    hqWall(3, RectangleHitbox.fromRect(9.1, 2)),
    hqWall(4, RectangleHitbox.fromRect(16, 2.1)),
    hqWall(5, RectangleHitbox.fromRect(11.2, 2)),
    hqWall(6, RectangleHitbox.fromRect(39.2, 2)),
    hqWall(7, RectangleHitbox.fromRect(3.2, 1.6), true),
    hqWall(8, RectangleHitbox.fromRect(3.5, 1.6), true),
    hqWall(9, RectangleHitbox.fromRect(21, 2.1)),

    lodgeWall("1", 9.15),
    lodgeWall("2", 9.7),
    lodgeWall("3", 9.82),
    lodgeWall("4", 15.08),
    lodgeWall("5", 19.77),
    lodgeWall("6", 20.44),
    lodgeWall("7", 26.15),
    lodgeWall("8", 27.03),
    {
        idString: "lodge_secret_room_wall",
        name: "Lodge Secret Room Wall",
        defType: DefinitionType.Obstacle,
        material: "wood",
        hideOnMap: true,
        noResidue: true,
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 1
        },
        hitbox: RectangleHitbox.fromRect(17.62, 1.91),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "lodge_wall_particle"
        },
        isWall: true
    },

    tentWall(1, "red"),
    tentWall(2, "green"),
    tentWall(3, "blue"),
    tentWall(4, "orange"),
    tentWall(5, "purple"),

    bigTentWall(1, "red"),
    bigTentWall(2, "green"),
    bigTentWall(3, "blue"),
    bigTentWall(4, "orange"),

    portaPottyWall("Porta Potty Back Wall", RectangleHitbox.fromRect(12.8, 1.6)),
    portaPottyWall("Porta Potty Front Wall", RectangleHitbox.fromRect(3, 1.6)),

    portaPottyWall("Outhouse Back Wall", RectangleHitbox.fromRect(11.71, 1.81), true),
    portaPottyWall("Outhouse Side Wall", RectangleHitbox.fromRect(1.81, 19.2), true),
    portaPottyWall("Outhouse Front Wall", RectangleHitbox.fromRect(2.8, 1.81), true),

    portMainOfficeWall(1, RectangleHitbox.fromRect(16.7, 1.8)),
    portMainOfficeWall(2, RectangleHitbox.fromRect(9.5, 1.8)),
    portMainOfficeWall(3, RectangleHitbox.fromRect(22.05, 1.8)),
    portMainOfficeWall(4, RectangleHitbox.fromRect(32.6, 1.8)),
    portMainOfficeWall(5, RectangleHitbox.fromRect(11.4, 1.8)),
    portMainOfficeWall(6, RectangleHitbox.fromRect(1.8, 16.5)),

    lighthouseWall(1, RectangleHitbox.fromRect(4.69, 2)),
    lighthouseWall(2, RectangleHitbox.fromRect(11.89, 2)),
    lighthouseWall(3, RectangleHitbox.fromRect(2, 21.14)),

    {
        idString: "fridge",
        name: "Fridge",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 140,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hasLoot: true,
        hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.2)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "fridge_particle"
        },
        reflectBullets: true
    },
    {
        idString: "water_cooler",
        name: "Cool Water",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 125,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(6, 5, Vec.create(0, -0.2)),
            RectangleHitbox.fromRect(5.7, 0.25, Vec.create(0, 2.5))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "briefcase_particle"
        }
    },
    {
        idString: "stove",
        name: "Stove",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 140,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.2)),
        rotationMode: RotationMode.Limited,
        explosion: "stove_explosion",
        frames: {
            particle: "metal_particle"
        },
        reflectBullets: true
    },
    {
        idString: "small_stove",
        name: "Small Stove",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 140,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(6.9, 6.64, Vec.create(0, -0.3)),
        rotationMode: RotationMode.Limited,
        explosion: "stove_explosion",
        frames: {
            particle: "metal_particle",
            residue: "stove_residue"
        },
        reflectBullets: true
    },
    {
        idString: "pan_stove",
        name: "Pan Stove",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 140,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.2)),
        rotationMode: RotationMode.Limited,
        explosion: "stove_explosion",
        frames: {
            particle: "metal_particle",
            residue: "stove_residue"
        },
        reflectBullets: true,
        hasLoot: true
    },
    {
        idString: "small_pan_stove",
        name: "Small Pan Stove",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 140,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(6.9, 6.64, Vec.create(0, -0.3)),
        rotationMode: RotationMode.Limited,
        explosion: "stove_explosion",
        frames: {
            particle: "metal_particle",
            residue: "stove_residue"
        },
        reflectBullets: true,
        hasLoot: true
    },
    {
        idString: "fireplace",
        name: "Fireplace",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 300,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(15.05, 7.71, Vec.create(0, -0.3)),
        rotationMode: RotationMode.Limited,
        explosion: "fireplace_explosion",
        frames: {
            particle: "metal_particle",
            residue: "stove_residue"
        },
        reflectBullets: true
    },
    {
        idString: "fire_pit",
        name: "Fire Pit",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 400,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: new CircleHitbox(6.35),
        rotationMode: RotationMode.Full,
        particleVariations: 2,
        frames: {
            particle: "fire_pit_particle"
        }
    },
    {
        idString: "speaker",
        name: "Speaker",
        defType: DefinitionType.Obstacle,
        material: "iron",
        health: 160,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        sound: {
            name: "speaker_start",
            maxRange: 30,
            falloff: 0.25
        },
        noResidue: true,
        hitbox: RectangleHitbox.fromRect(6, 5, Vec.create(0, -0.1)),
        rotationMode: RotationMode.Limited,
        isActivatable: true,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "metal_particle"
        },
        reflectBullets: true
    },
    {
        idString: "vending_machine",
        name: "Vending Machine",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 165,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hasLoot: true,
        hitbox: RectangleHitbox.fromRect(9.25, 6.45, Vec.create(0, -0.2)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "super_barrel_particle"
        },
        reflectBullets: true
    },
    {
        idString: "washing_machine",
        name: "Washing Machine",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 140,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hasLoot: true,
        hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.2)),
        rotationMode: RotationMode.Limited,
        reflectBullets: true
    },
    {
        idString: "door",
        name: "Door",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 120,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 1
        },
        hitbox: RectangleHitbox.fromRect(10.15, 1.6, Vec.create(-0.44, 0)),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        isDoor: true,
        hingeOffset: Vec.create(-5.5, 0),
        zIndex: ZIndexes.ObstaclesLayer3,
        frames: {
            particle: "furniture_particle"
        }
    },
    {
        idString: "barn_door",
        name: "Barn Door",
        defType: DefinitionType.Obstacle,
        material: "wood",
        doorSound: "barn_door",
        health: 150,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 1
        },
        hitbox: RectangleHitbox.fromRect(12.7, 1.6, Vec.create(0.85, 0)),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        animationDuration: 600,
        isDoor: true,
        hingeOffset: Vec.create(-5.5, 0),
        zIndex: ZIndexes.ObstaclesLayer3,
        frames: {
            particle: "furniture_particle"
        }
    },
    {
        idString: "aegis_golden_case",
        name: "Golden Aegis Case",
        defType: DefinitionType.Obstacle,
        material: "wood", // crate or wood?
        health: 150,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(11, 6, Vec.create(0, -0.2)),
            RectangleHitbox.fromRect(1, 0.4, Vec.create(-3.6, 3)),
            RectangleHitbox.fromRect(1, 0.4, Vec.create(3.8, 3))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        frames: {
            particle: "gold_aegis_case_particle"
        }
    },
    {
        idString: "falchion_case",
        name: "Falchion Case",
        defType: DefinitionType.Obstacle,
        material: "glass",
        health: 200,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(13, 6)
        ),
        hasLoot: true,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "window_particle"
        }
    },
    {
        idString: "dumpster",
        name: "Dumpster",
        defType: DefinitionType.Obstacle,
        material: "iron",
        reflectBullets: true,
        hasLoot: true,
        health: 200,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(6.5, 12.5, Vec.create(0.2, 0)),
            RectangleHitbox.fromRect(5.8, 0.8, Vec.create(0.25, 6.4)),
            RectangleHitbox.fromRect(5.8, 0.8, Vec.create(0.25, -6.4))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        winterVariations: 2
    },
    {
        idString: "trash_bag",
        name: "Trash Bag",
        defType: DefinitionType.Obstacle,
        material: "trash_bag",
        health: 40,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hitbox: new CircleHitbox(2.2),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        lootTable: "trash",
        frames: {
            particle: "flint_lockbox_particle"
        },
        particleVariations: 2,
        winterVariations: 1
    },
    {
        idString: "hay_bale",
        name: "Hay Bale",
        defType: DefinitionType.Obstacle,
        material: "bush",
        hideOnMap: true,
        health: 180,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hitbox: RectangleHitbox.fromRect(11.91, 10.2),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        particleVariations: 2
    },
    {
        idString: "secret_door",
        name: "Secret Door",
        defType: DefinitionType.Obstacle,
        material: "wood",
        noInteractMessage: true,
        health: 120,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 1
        },
        hitbox: RectangleHitbox.fromRect(11, 1.75, Vec.create(-0.8, 0)),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        isDoor: true,
        hingeOffset: Vec.create(-5.5, 0),
        frames: {
            particle: "furniture_particle"
        }
    },
    {
        idString: "glass_door",
        name: "Glass Door",
        defType: DefinitionType.Obstacle,
        material: "glass",
        doorSound: "auto_door",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 1
        },
        hitbox: RectangleHitbox.fromRect(10.86, 1.13),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        isDoor: true,
        automatic: true,
        hideWhenOpen: true,
        operationStyle: "slide",
        slideFactor: 0.9,
        frames: {
            particle: "window_particle"
        }
    },
    {
        idString: "red_metal_auto_door",
        name: "Red Metal Automatic Door",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        doorSound: "metal_auto_door",
        locked: true,
        openOnce: true,
        indestructible: true,
        reflectBullets: true,
        health: 100,
        hitbox: RectangleHitbox.fromRect(10.5, 1.62),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        isDoor: true,
        hideWhenOpen: true,
        operationStyle: "slide",
        slideFactor: 0.9,
        animationDuration: 400,
        frames: {
            base: "auto_door"
        },
        tint: 0x401a1a
    },
    {
        idString: "blue_metal_auto_door",
        name: "Blue Metal Automatic Door",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        doorSound: "metal_auto_door",
        locked: true,
        openOnce: true,
        indestructible: true,
        reflectBullets: true,
        health: 100,
        hitbox: RectangleHitbox.fromRect(10.5, 1.62),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        isDoor: true,
        hideWhenOpen: true,
        operationStyle: "slide",
        slideFactor: 0.9,
        animationDuration: 400,
        frames: {
            base: "auto_door"
        },
        tint: 0x1a1a40
    },
    {
        idString: "metal_auto_door",
        name: "Metal Automatic Door",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        doorSound: "metal_auto_door",
        health: 100,
        indestructible: true,
        reflectBullets: true,
        hitbox: RectangleHitbox.fromRect(10.5, 1.62),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        isDoor: true,
        automatic: true,
        hideWhenOpen: true,
        operationStyle: "slide",
        slideFactor: 0.9,
        animationDuration: 400,
        frames: {
            base: "auto_door",
            particle: "metal_auto_door_particle"
        },
        tint: 0x404040
    },
    {
        idString: "metal_door",
        name: "Metal Door",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        reflectBullets: true,
        doorSound: "metal_door",
        indestructible: true,
        collideWithLayers: Layers.Adjacent,
        //  visibleFromLayers: Layers.All,
        health: 500,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 1
        },
        hitbox: RectangleHitbox.fromRect(10.46, 1.69, Vec.create(-0.25, 0)),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        animationDuration: 80,
        isDoor: true,
        hingeOffset: Vec.create(-5.5, 0),
        //   zIndex: ZIndexes.ObstaclesLayer3,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "vault_door",
        name: "Vault Door",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        reflectBullets: true,
        hitbox: RectangleHitbox.fromRect(14.2, 1.9, Vec.create(1.1, -0.4)),
        rotationMode: RotationMode.Limited,
        isDoor: true,
        locked: true,
        openOnce: true,
        doorSound: "vault_door",
        animationDuration: 2000,
        hingeOffset: Vec.create(-6.1, -0.8),
        zIndex: ZIndexes.ObstaclesLayer3,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "vault_door_deactivated",
        name: "Vault Door",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        reflectBullets: true,
        hitbox: RectangleHitbox.fromRect(14.2, 1.95, Vec.create(1.6, -2.9)),
        rotationMode: RotationMode.Limited,
        isDoor: true,
        openOnce: true,
        doorSound: "vault_door_powered",
        requiresPower: true,
        animationDuration: 2000,
        interactionDelay: 2500,
        hingeOffset: Vec.create(-5.6, -2.3),
        frames: {
            particle: "metal_particle",
            powered: "vault_door_activated",
            opened: "vault_door_off"
        }
    },
    {
        idString: "tent_window",
        name: "Tent Window",
        defType: DefinitionType.Obstacle,
        material: "wood",
        indestructible: true,
        noBulletCollision: true,
        noMeleeCollision: true,
        health: 100,
        isWindow: true,
        invisible: true,
        noHitEffect: true,
        hitbox: RectangleHitbox.fromRect(7.6, 2.5),
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.ObstaclesLayer3,
        frames: {}
    },
    {
        idString: "windowed_vault_door",
        name: "Windowed Vault Door",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        reflectBullets: true,
        hitbox: RectangleHitbox.fromRect(12.83, 1.9, Vec.create(0, -0.4)),
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.ObstaclesLayer3,
        allowFlyover: FlyoverPref.Never, // LMAO no
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "toilet",
        name: "Toilet",
        defType: DefinitionType.Obstacle,
        material: "porcelain",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: new CircleHitbox(2.5),
        allowFlyover: FlyoverPref.Always,
        rotationMode: RotationMode.Limited,
        hasLoot: true
    },
    {
        idString: "used_toilet",
        name: "Used Toilet",
        defType: DefinitionType.Obstacle,
        material: "porcelain",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: new CircleHitbox(2.5),
        allowFlyover: FlyoverPref.Always,
        rotationMode: RotationMode.Limited,
        hasLoot: true,
        frames: {
            particle: "toilet_particle",
            residue: "toilet_residue"
        }
    },
    {
        idString: "sink",
        name: "Sink",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hideOnMap: true,
        hasLoot: true,
        hitbox: RectangleHitbox.fromRect(9.5, 6.63, Vec.create(0, -0.47)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "furniture_particle"
        }
    },
    {
        idString: "sink2",
        name: "Sink",
        defType: DefinitionType.Obstacle,
        material: "porcelain",
        health: 120,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(7.32, 5.79, Vec.create(0, -0.52)),
        allowFlyover: FlyoverPref.Always,
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "toilet_particle"
        },
        hideOnMap: true,
        hasLoot: true
    },
    {
        idString: "bathtub",
        name: "Bathtub",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 180,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(17.72, 9.29),
        allowFlyover: FlyoverPref.Sometimes,
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "toilet_particle"
        },
        hideOnMap: true
    },
    {
        idString: "small_drawer",
        name: "Small Drawer",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(6.2, 6, Vec.create(0, -0.5)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        frames: {
            particle: "furniture_particle"
        }
    },
    {
        idString: "filing_cabinet",
        name: "Filing Cabinet",
        defType: DefinitionType.Obstacle,
        material: "iron",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(6.2, 6, Vec.create(0, -0.4)),
        rotationMode: RotationMode.Limited,
        reflectBullets: true,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true
    },
    {
        idString: "large_drawer",
        name: "Large Drawer",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(12.5, 6, Vec.create(0, -0.5)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        frames: {
            particle: "furniture_particle"
        }
    },
    {
        idString: "couch",
        name: "Couch",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(6.85, 15.4, Vec.create(-0.3, 0)),
        rotationMode: RotationMode.Limited
    },
    {
        idString: "white_small_couch",
        name: "White Small Couch",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 95,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(5, 5),
            RectangleHitbox.fromRect(2, 7, Vec.create(-3.5, 0)),
            RectangleHitbox.fromRect(2, 7, Vec.create(3.5, 0)),
            RectangleHitbox.fromRect(7, 2, Vec.create(0, -2.5))
        ),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "white_small_couch_particle"
        }
    },
    {
        idString: "red_small_couch",
        name: "Red Small Couch",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 95,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        tint: 0x823323, // tints are so cool
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(5, 5),
            RectangleHitbox.fromRect(2, 7, Vec.create(-3.5, 0)),
            RectangleHitbox.fromRect(2, 7, Vec.create(3.5, 0)),
            RectangleHitbox.fromRect(7, 2, Vec.create(0, -2.5))
        ),
        rotationMode: RotationMode.Limited,
        frames: {
            base: "white_small_couch",
            residue: "white_small_couch_residue",
            particle: "red_small_couch_particle"
        }
    },
    {
        idString: "couch_part",
        name: "Couch Part",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 95,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(5, 5),
            RectangleHitbox.fromRect(1.5, 6, Vec.create(-2.5, 0)),
            new CircleHitbox(2.5, Vec.create(0.9, 0))
        ),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "couch_part_particle",
            residue: "brown_couch_part_residue"
        }
    },
    {
        idString: "couch_corner",
        name: "Couch Corner",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 95,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(5, 5, Vec.create(0.6, 0.6)),
            RectangleHitbox.fromRect(1.5, 5, Vec.create(-2.5, 0.6)),
            RectangleHitbox.fromRect(5, 1.5, Vec.create(0.6, -2.5)),
            new CircleHitbox(0.8, Vec.create(-2.4, -2.4))
        ),
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.ObstaclesLayer2,
        frames: {
            particle: "couch_part_particle",
            residue: "brown_couch_part_residue"
        }
    },
    {
        idString: "couch_end_right",
        name: "Couch Part",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 95,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(5, 5, Vec.create(-1, 0)),
            RectangleHitbox.fromRect(6.8, 1.5, Vec.create(-0.25, -2.6)),
            RectangleHitbox.fromRect(1.5, 4.5, Vec.create(2.6, -0.5)),
            new CircleHitbox(0.85, Vec.create(2.6, -2.6)),
            new CircleHitbox(0.85, Vec.create(2.6, 2.65)),
            new CircleHitbox(2.635, Vec.create(-1, 0.25))
        ),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "couch_part_particle",
            residue: "brown_couch_part_residue"
        }
    },
    {
        idString: "couch_end_left",
        name: "Couch Part",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 95,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(5, 5, Vec.create(0, -1)),
            RectangleHitbox.fromRect(1.5, 6.8, Vec.create(-2.6, -0.5)),
            RectangleHitbox.fromRect(4.5, 1.5, Vec.create(0, 2.6)),
            new CircleHitbox(0.85, Vec.create(2.6, 2.6)),
            new CircleHitbox(0.85, Vec.create(-2.6, 2.65)),
            new CircleHitbox(2.65, Vec.create(0.25, -0.5))
        ),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "couch_part_particle",
            residue: "brown_couch_part_residue"
        }
    },
    {
        idString: "tv",
        name: "TV",
        defType: DefinitionType.Obstacle,
        material: "glass",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(1.1, 15.1, Vec.create(-0.25, 0)),
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.ObstaclesLayer3 + 0.5 // needs to be above table
    },
    {
        idString: "small_table",
        name: "Small Table",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        variations: 2,
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(8.3, 12.3),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "furniture_particle"
        },
        zIndex: ZIndexes.ObstaclesLayer3,
        noCollisions: true,
        noResidue: true
    },
    {
        idString: "large_table",
        name: "Large Table",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        variations: 2,
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(12, 16.6),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "furniture_particle"
        },
        zIndex: ZIndexes.ObstaclesLayer3,
        noCollisions: true,
        noResidue: true
    },
    {
        idString: "round_table",
        name: "Round Table",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: new CircleHitbox(6.12),
        rotationMode: RotationMode.Full,
        frames: {
            particle: "furniture_particle"
        },
        zIndex: ZIndexes.ObstaclesLayer3,
        noCollisions: true,
        noResidue: true
    },
    {
        idString: "chair",
        name: "Chair",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(6.8, 6.7),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "furniture_particle"
        }
    },
    {
        idString: "bookshelf",
        name: "Bookshelf",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hideOnMap: true,
        variations: 2,
        allowFlyover: FlyoverPref.Always,
        hitbox: RectangleHitbox.fromRect(12.49, 4.24),
        rotationMode: RotationMode.Limited,
        hasLoot: true,
        frames: {
            particle: "furniture_particle"
        }
    },
    {
        idString: "window_damaged",
        name: "Window",
        defType: DefinitionType.Obstacle,
        material: "glass",
        health: 20,
        invisible: true,
        noMeleeCollision: true,
        noBulletCollision: true,
        indestructible: true,
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(1.8, 9.4),
        zIndex: ZIndexes.ObstaclesLayer2,
        allowFlyover: FlyoverPref.Always,
        rotationMode: RotationMode.Limited,
        isWindow: true
    },
    {
        idString: "window",
        name: "Window",
        defType: DefinitionType.Obstacle,
        material: "glass",
        health: 20,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(1.8, 10),
        zIndex: ZIndexes.ObstaclesLayer2,
        allowFlyover: FlyoverPref.Never,
        rotationMode: RotationMode.Limited,
        isWindow: true
    },
    {
        idString: "window2",
        name: "Window",
        defType: DefinitionType.Obstacle,
        material: "glass",
        health: 20,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: RectangleHitbox.fromRect(1.8, 9.4),
        allowFlyover: FlyoverPref.Never,
        rotationMode: RotationMode.Limited,
        isWindow: true
    },
    {
        idString: "bulletproof_window",
        name: "Bulletproof Window",
        defType: DefinitionType.Obstacle,
        material: "glass",
        health: 1000,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 1
        },
        hitbox: RectangleHitbox.fromRect(18.57, 2.45),
        allowFlyover: FlyoverPref.Never,
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "window_particle"
        }
    },
    {
        idString: "bed",
        name: "Bed",
        defType: DefinitionType.Obstacle,
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
        allowFlyover: FlyoverPref.Always
    },
    {
        idString: "small_bed",
        name: "Small Bed",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(7.12, 16.06),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "bed_particle"
        }
    },
    {
        idString: "bunk_bed",
        name: "Bunk Bed",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        reflectBullets: true,
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(8.2, 15.6, Vec.create(0.4, 0)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "porta_potty_toilet_open",
        name: "Porta Potty Toilet Open",
        defType: DefinitionType.Obstacle,
        material: "porcelain",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(12.13, 4.3, Vec.create(0.02, -1.05)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        frames: {
            particle: "porta_potty_toilet_particle",
            residue: "porta_potty_toilet_residue"
        }
    },
    {
        idString: "porta_potty_toilet_closed",
        name: "Porta Potty Toilet Closed",
        defType: DefinitionType.Obstacle,
        material: "porcelain",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(12, 4.3, Vec.create(0, -1.05)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        frames: {
            particle: "porta_potty_toilet_particle",
            residue: "porta_potty_toilet_residue"
        }
    },
    {
        idString: "porta_potty_door",
        name: "Porta Potty Door",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        noResidue: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 1
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(10.5, 1.4, Vec.create(-0.8, 0)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        isDoor: true,
        zIndex: ZIndexes.ObstaclesLayer3,
        hingeOffset: Vec.create(-5.5, 0)
    },
    {
        idString: "outhouse_door",
        name: "Outhouse Door",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        noResidue: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 1
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(9.91, 1.5),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        isDoor: true,
        zIndex: ZIndexes.ObstaclesLayer3,
        hingeOffset: Vec.create(-4.96, 0),
        frames: {
            particle: "outhouse_wall_particle"
        }
    },
    {
        idString: "porta_potty_sink_wall",
        name: "Porta Potty Sink Wall",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        noResidue: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(19.2, 1.9, Vec.create(0, 1.25)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        isWall: true,
        zIndex: ZIndexes.ObstaclesLayer2,
        frames: {
            particle: "porta_potty_wall_particle"
        }
    },
    {
        idString: "porta_potty_sink_wall_fall",
        name: "Porta Potty Sink Wall",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        noResidue: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(19.2, 1.9, Vec.create(0, 1.25)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        isWall: true,
        zIndex: ZIndexes.ObstaclesLayer2,
        frames: {
            base: "porta_potty_sink_wall",
            particle: "porta_potty_particle_fall"
        }
    },
    {
        idString: "outhouse_toilet_paper_wall",
        name: "Outhouse Toilet Paper Wall",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        noResidue: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(1.81, 19.2, Vec.create(-1.16, 0.01)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        isWall: true,
        zIndex: ZIndexes.ObstaclesLayer2,
        frames: {
            particle: "outhouse_wall_particle"
        }
    },
    {
        idString: "porta_potty_toilet_paper_wall",
        name: "Porta Potty Toilet Paper Wall",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        noResidue: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(19.2, 1.7, Vec.create(0, -1.15)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        isWall: true,
        zIndex: ZIndexes.ObstaclesLayer2,
        frames: {
            particle: "porta_potty_wall_particle"
        }
    },
    {
        idString: "hq_toilet_paper_wall",
        name: "Headquarters Toilet Paper Wall",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        noResidue: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(19.2, 1.7, Vec.create(0, -1.15)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        isWall: true,
        zIndex: ZIndexes.ObstaclesLayer2,
        frames: {
            particle: "hq_tp_wall_particle"
        }
    },
    innerConcreteWall(1, RectangleHitbox.fromRect(10.8, 1.9)),
    innerConcreteWall(2, RectangleHitbox.fromRect(36.7, 1.9)),
    innerConcreteWall(3, RectangleHitbox.fromRect(39.14, 1.9)),
    innerConcreteWall(4, RectangleHitbox.fromRect(47.14, 1.9)),
    {
        idString: "bombed_armory_vault_wall",
        name: "Bombed Armory Vault Wall",
        defType: DefinitionType.Obstacle,
        material: "stone",
        hitbox: RectangleHitbox.fromRect(15, 2.04),
        health: 500,
        noResidue: true,
        hideOnMap: true,
        impenetrable: true,
        rotationMode: RotationMode.Limited,
        isWall: true,
        allowFlyover: FlyoverPref.Never,
        particleVariations: 2,
        frames: {
            particle: "rock_particle"
        }
        /* wall: {
            color: 0x606060,
            borderColor: 0x262626
        } */
    },
    {
        idString: "large_warehouse_wall", // todo: make this wall only damageable by big white barrel explosion
        name: "Large Warehouse Wall",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(55.19, 2.02, Vec.create(0.35, -12.47)),
            RectangleHitbox.fromRect(2, 27, Vec.create(-26.95, -0.02))
        ),
        graphics: [
            { // Border
                color: 0x1a1a1a,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(55.19, 2, Vec.create(0.35, -12.52)),
                    RectangleHitbox.fromRect(2, 27, Vec.create(-26.95, -0.02))
                )
            },
            { // Fill
                color: 0x4d4d4d,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(55.15, 1.155, Vec.create(0.35, -12.51)),
                    RectangleHitbox.fromRect(1.155, 26.56, Vec.create(-26.95, 0.2))
                )
            }
        ],
        graphicsZIndex: ZIndexes.ObstaclesLayer1,
        health: 9999,
        hideOnMap: true,
        reflectBullets: true,
        rotationMode: RotationMode.Limited,
        isWall: true,
        allowFlyover: FlyoverPref.Never,
        frames: {
            base: "column",
            particle: "metal_particle",
            residue: "large_warehouse_ceiling_residue"
        }
    },
    {
        idString: "small_refinery_barrel",
        name: "Small Refinery Barrel",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 250,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        hitbox: new CircleHitbox(6.8),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Never,
        explosion: "small_refinery_barrel_explosion",
        reflectBullets: true,
        frames: {
            particle: "metal_particle",
            residue: "barrel_residue"
        }
    },
    {
        idString: "large_refinery_barrel",
        name: "Large Refinery Barrel",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 2000,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        hitbox: new CircleHitbox(17.15),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Never,
        explosion: "large_refinery_barrel_explosion",
        reflectBullets: true,
        zIndex: ZIndexes.ObstaclesLayer5,
        frames: {
            particle: "metal_particle"
        },
        winterVariations: 1
    },
    {
        idString: "smokestack",
        name: "Smokestack",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 500,
        indestructible: true,
        hitbox: new CircleHitbox(8.9),
        rotationMode: RotationMode.Limited,
        reflectBullets: true,
        allowFlyover: FlyoverPref.Never,
        zIndex: ZIndexes.ObstaclesLayer5,
        noResidue: true
    },
    {
        idString: "distillation_column",
        name: "Distillation Column",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 500,
        indestructible: true,
        hitbox: new GroupHitbox(
            new CircleHitbox(5.22, Vec.create(0, -0.65)),
            new CircleHitbox(4.9, Vec.create(0, 0.9))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        reflectBullets: true,
        zIndex: ZIndexes.ObstaclesLayer5,
        noResidue: true
    },
    {
        idString: "distillation_equipment",
        name: "Distillation Equipment",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 500,
        indestructible: true,
        hitbox: new GroupHitbox(
            new CircleHitbox(3, Vec.create(-11.3, -3.85)), // Main tank rounded corners
            new CircleHitbox(3, Vec.create(-11.3, -6.55)),
            RectangleHitbox.fromRect(17.5, 3.5, Vec.create(-5.55, -5.25)),
            RectangleHitbox.fromRect(14.2, 8.5, Vec.create(-3.9, -5.15)), // Main tank
            new CircleHitbox(3.15, Vec.create(0.72, 5.62)), // Bottom left circle
            new CircleHitbox(4.4, Vec.create(8.95, 5.62)), // Bottom right circle
            new CircleHitbox(5.35, Vec.create(8.95, -4.7)), // Top circle
            RectangleHitbox.fromRect(1.8, 3.7, Vec.create(0.65, 0.85)), // Pipe connected to bottom left circle
            RectangleHitbox.fromRect(2.6, 1.2, Vec.create(8.95, 1)), // Pipe between 2 rightmost circles
            RectangleHitbox.fromRect(1.6, 1.75, Vec.create(4.2, 5.53)), // Pipe between 2 bottommost circles
            RectangleHitbox.fromRect(1.9, -2.6, Vec.create(4.05, -6.65)) // Pipe connected to topmost circle
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        reflectBullets: true,
        noResidue: true,
        frames: {
            particle: "metal_particle"
        }
    },
    gunMount("mcx_spear", "gun"),
    gunMount("stoner_63", "gun"),
    gunMount("mini14", "gun"),
    gunMount("hp18", "gun"),
    gunMount("model_37", "gun"),
    gunMount("sks", "gun"),
    gunMount("m590m", "gun"),
    gunMount("svu", "gun"),
    gunMount(
        "maul",
        "melee",
        false,
        new GroupHitbox(
            RectangleHitbox.fromRect(5.05, 1, Vec.create(0, -1.3)),
            RectangleHitbox.fromRect(0.8, 3, Vec.create(-1.55, 0.35)),
            RectangleHitbox.fromRect(0.8, 3, Vec.create(1.55, 0.35))
        ),
        {
            base: "gun_mount_melee",
            particle: "furniture_particle",
            residue: "gun_mount_residue"
        }
    ),
    gunMount(
        "dual_rsh12",
        "gun",
        true,
        new GroupHitbox(
            RectangleHitbox.fromRect(6.5, 0.99, Vec.create(0, -1.36)),
            RectangleHitbox.fromRect(5.7, 2.5, Vec.create(0, 0.4))
        ),
        {
            particle: "gun_mount_dual_rsh12_particle",
            residue: "gun_mount_dual_rsh12_residue"
        }
    ),
    {
        idString: "truck",
        name: "Truck",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20.25, 2.15, Vec.create(0, 25.1)), // Front bumper
            RectangleHitbox.fromRect(18.96, 9.2, Vec.create(0, 19.4)), // Hood
            RectangleHitbox.fromRect(16.7, 23.5, Vec.create(0, 3)), // Cab
            RectangleHitbox.fromRect(4.75, 15.9, Vec.create(0, -16.65)), // Fifth wheel
            RectangleHitbox.fromRect(17, 6.9, Vec.create(0, -13.2)), // Front-most back wheels
            RectangleHitbox.fromRect(17, 6.9, Vec.create(0, -20.7)), // Rearmost back wheels
            RectangleHitbox.fromRect(16.55, 1.6, Vec.create(0, -25.35)) // Rear bumper
        ),
        reflectBullets: true,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        zIndex: ZIndexes.ObstaclesLayer3,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "truck_front",
        name: "Truck",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(13.25, 12.3, Vec.create(0, 0)),
            RectangleHitbox.fromRect(16.8, 4.85, Vec.create(0, -6.85)),
            new CircleHitbox(0.39, Vec.create(-5.25, -10.5)),
            new CircleHitbox(1.13, Vec.create(6.24, -9.63)),
            RectangleHitbox.fromRect(10.27, 3.9, Vec.create(0.03, -9.09)),
            new CircleHitbox(1.13, Vec.create(-6.27, -9.63)),
            new CircleHitbox(0.39, Vec.create(5.34, -10.46))
        ),
        reflectBullets: true,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        zIndex: ZIndexes.BuildingsFloor - 1,
        variations: 3,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "trailer",
        name: "Trailer",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(14.9, 44.7, Vec.create(-0.05, 0)), // Body
            RectangleHitbox.fromRect(15.9, 6.4, Vec.create(0, -11.2)), // Front-most back wheels
            RectangleHitbox.fromRect(15.9, 6.4, Vec.create(0, -18.2)), // Rearmost back wheels
            RectangleHitbox.fromRect(15.5, 1.5, Vec.create(0, -22.5)), // Rear bumper
            RectangleHitbox.fromRect(9.75, 1, Vec.create(-0.05, 22.75)) // Front part (idk)
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        zIndex: ZIndexes.ObstaclesLayer4,
        noResidue: true,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "tango_crate",
        name: "Tango Crate",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 120,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(15.49, 5.85),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true
    },
    {
        ...controlPanel("control_panel", "Control Panel"),
        isActivatable: true,
        sound: {
            names: ["button_press", "puzzle_solved"]
        },
        frames: {
            activated: "control_panel_activated",
            particle: "metal_particle",
            residue: "barrel_residue"
        }
    },
    {
        ...controlPanel("control_panel2", "Control Panel"),
        waterOverlay: {
            scaleX: 1.2,
            scaleY: 0.85
        }
    },
    {
        ...controlPanel("recorder", "Recorder"),
        hitbox: RectangleHitbox.fromRect(8.7, 6.34),
        indestructible: true,
        isActivatable: true,
        noInteractMessage: true,
        requiredItem: "heap_sword", // womp womp
        sound: {
            names: ["speaker_start", "speaker_start"]
        },
        frames: {
            activated: "recorder_used",
            particle: "metal_particle",
            residue: "barrel_residue"
        }
    },
    {
        ...controlPanel("control_panel_small", "Small Control Panel"),
        hitbox: RectangleHitbox.fromRect(7.5, 8)
    },
    {
        idString: "small_desk",
        name: "Small Desk",
        defType: DefinitionType.Obstacle,
        material: "wood",
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.79
        },
        noResidue: true, // TODO
        health: 150,
        hasLoot: true,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "headquarters_desk_particle"
        },
        hitbox: RectangleHitbox.fromRect(12.5, 5)
    },
    {
        idString: "generator",
        name: "Generator",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 200,
        indestructible: true,
        reflectBullets: true,
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "super_barrel_particle"
        },
        isActivatable: true,
        sound: {
            name: "generator_starting",
            maxRange: 412,
            falloff: 2
        },
        emitParticles: true,
        requiredItem: "gas_can",
        hitbox: RectangleHitbox.fromRect(9, 7),
        winterVariations: 1
    },

    {
        idString: "ship_oil_tank",
        name: "Ship Oil Tank",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 200,
        indestructible: true,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        hitbox: RectangleHitbox.fromRect(28, 14)
    },
    {
        idString: "forklift",
        name: "Forklift",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(8.15, 17.3, Vec.create(0, -3.8)),
            RectangleHitbox.fromRect(9.45, 10.6, Vec.create(0, -4.9))
        ),
        zIndex: ZIndexes.ObstaclesLayer1 - 2,
        rotationMode: RotationMode.Limited,
        winterVariations: 1
    },
    {
        idString: "pallet",
        name: "Pallet",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 120,
        indestructible: true,
        hitbox: RectangleHitbox.fromRect(10.1, 9),
        zIndex: ZIndexes.ObstaclesLayer1 - 1,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "crate_particle",
            residue: "regular_crate_residue"
        },
        noCollisions: true,
        noMeleeCollision: true,
        noBulletCollision: true,
        pallet: true
    },
    {
        idString: "pipe",
        name: "Pipe",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        health: 200,
        indestructible: true,
        hitbox: RectangleHitbox.fromRect(0, 0),
        zIndex: ZIndexes.ObstaclesLayer4,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        noBulletCollision: true,
        noMeleeCollision: true,
        noCollisions: true,
        variations: 4
    },
    {
        idString: "bollard",
        name: "Bollard",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(8.2, 9.2, Vec.create(-0.36, 0)),
            new CircleHitbox(3.45, Vec.create(1, 0))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        winterVariations: 2
    },
    {
        idString: "barrier",
        name: "Barrier",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.2, 31.75, Vec.create(-2.2, -2.8)),
            RectangleHitbox.fromRect(2, 5, Vec.create(-2.3, 15.4)),
            RectangleHitbox.fromRect(4.71, 6.59, Vec.create(0.95, 15.4))
        ),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "fence",
        name: "Fence",
        defType: DefinitionType.Obstacle,
        material: "fence",
        health: 40,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(8.45, 1.6),
        rotationMode: RotationMode.Limited,
        noResidue: true,
        frames: {
            particle: "fence_particle"
        }
    },
    {
        idString: "port_main_office_column",
        name: "Port Main Office Column",
        defType: DefinitionType.Obstacle,
        material: "stone",
        indestructible: true,
        health: 340,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(3, 3)
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        tint: 0xb98a46,
        frames: {
            base: "column",
            particle: "port_office_wall_particle"
        },
        isWall: true
    },
    {
        idString: "house_column",
        name: "House Column",
        defType: DefinitionType.Obstacle,
        material: "stone",
        indestructible: true,
        health: 340,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(3, 3)
        ),
        rotationMode: RotationMode.None,
        allowFlyover: FlyoverPref.Never,
        tint: 0xa3917b,
        frames: {
            base: "column",
            particle: "wall_particle"
        },
        isWall: true
    },
    {
        idString: "metal_column",
        name: "Metal Column",
        defType: DefinitionType.Obstacle,
        material: "metal_light",
        reflectBullets: true,
        indestructible: true,
        health: 340,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(3, 3)
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        tint: 0x8f8f8f,
        frames: {
            base: "column",
            particle: "metal_column_particle"
        },
        isWall: true
    },
    {
        idString: "potted_plant",
        name: "Potted Plant",
        defType: DefinitionType.Obstacle,
        material: "porcelain",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: new CircleHitbox(2.45, Vec.create(-0.15, 0.9)),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true
    },
    {
        idString: "poinsettia",
        name: "Poinsettia",
        defType: DefinitionType.Obstacle,
        material: "porcelain",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: new CircleHitbox(1.9),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        zIndex: ZIndexes.ObstaclesLayer3,
        hasLoot: true,
        lootTable: "potted_plant",
        frames: {
            particle: "potted_plant_particle"
        }
    },
    {
        idString: "trash_can",
        name: "Trash Can",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 60,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hasLoot: true,
        lootTable: "trash",
        reflectBullets: true,
        hitbox: new CircleHitbox(2.5),
        rotationMode: RotationMode.Full,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "sandbags",
        name: "Sandbags",
        defType: DefinitionType.Obstacle,
        material: "sand",
        health: 1000,
        indestructible: true,
        hitbox: RectangleHitbox.fromRect(13.1, 7.7),
        rotationMode: RotationMode.Limited,
        winterVariations: 1,
        waterOverlay: {
            scaleX: 1.4,
            scaleY: 0.8
        }
    },
    {
        idString: "smaller_sandbags",
        name: "Sandbags",
        defType: DefinitionType.Obstacle,
        material: "sand",
        health: 1000,
        indestructible: true,
        hitbox: RectangleHitbox.fromRect(8, 5.9),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "sandbags_particle"
        }
        // winterVariations: 1
    },
    {
        idString: "gun_locker",
        name: "Gun Locker",
        defType: DefinitionType.Obstacle,
        material: "iron",
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        health: 220,
        impenetrable: true,
        hasLoot: true,
        reflectBullets: true,
        hitbox: RectangleHitbox.fromRect(13.1, 4.2, Vec.create(0, -0.25)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        hideOnMap: true,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "roadblock",
        name: "Road Block",
        defType: DefinitionType.Obstacle,
        material: "fence",
        health: 80,
        indestructible: false,
        hitbox: RectangleHitbox.fromRect(1, 10),
        rotationMode: RotationMode.Limited
    },
    {
        idString: "gun_case",
        name: "Gun Case",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(10.19, 4.76),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        winterVariations: 3
    },
    {
        idString: "cooler",
        name: "Cooler",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 100,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(8.3, 4.73),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true,
        winterVariations: 1
    },
    {
        idString: "m1117",
        name: "M1117",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(18.51, 32.28, Vec.create(0, -5.17)), // Body
            RectangleHitbox.fromRect(19.69, 6.67, Vec.create(0, -10.87)), // Back wheels
            RectangleHitbox.fromRect(19.69, 6.67, Vec.create(0, 10.8)), // Front wheels
            RectangleHitbox.fromRect(17, 5.38, Vec.create(0, 16.14)), // Back of hood
            RectangleHitbox.fromRect(15.06, 5.38, Vec.create(0, 19.7)) // Front of hood
        ),
        variations: 2,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never
    },
    {
        idString: "cabinet",
        name: "Cabinet",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 100,
        reflectBullets: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(14.53, 4.3, Vec.create(0, -0.22)),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "metal_particle"
        },
        hasLoot: true
    },
    {
        idString: "briefcase",
        name: "Briefcase",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 150,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(10.65, 7.42, Vec.create(0, 0.43)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true
    },
    {
        idString: "fire_hatchet_case",
        name: "Fire Hatchet Case",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 180,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hasLoot: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(10.5, 4.5, Vec.create(-0.1, -0.1)),
            RectangleHitbox.fromRect(0.55, 5.95, Vec.create(-4.15, 0)),
            RectangleHitbox.fromRect(0.55, 5.95, Vec.create(3.15, 0))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "super_barrel_particle"
        },
        reflectBullets: true,
        winterVariations: 1
    },
    {
        idString: "ice_pick_case",
        name: "Ice Pick Case",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 180,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hasLoot: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(10.5, 4.5, Vec.create(-0.1, -0.1)),
            RectangleHitbox.fromRect(0.55, 5.95, Vec.create(-3.7, 0)),
            RectangleHitbox.fromRect(0.55, 5.95, Vec.create(3.7, 0))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "crate_particle"
        }
    },
    {
        idString: "campsite_case",
        name: "Campsite Case",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 180,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hasLoot: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(10.5, 4.5, Vec.create(-0.1, -0.1)),
            RectangleHitbox.fromRect(0.55, 5.95, Vec.create(-3.7, 0)),
            RectangleHitbox.fromRect(0.55, 5.95, Vec.create(3.7, 0))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "crate_particle"
        }
    },
    {
        idString: "button",
        name: "Button",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 1000,
        indestructible: true,
        variations: 2,
        isActivatable: true,
        sound: {
            name: "button_press"
        },
        hitbox: RectangleHitbox.fromRect(2.15, 1.51),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        frames: {
            particle: "metal_particle",
            activated: "button_activated"
        }
    },
    mobileHomeWall("1", RectangleHitbox.fromRect(7.5, 1.68)),
    mobileHomeWall("2", RectangleHitbox.fromRect(20.6, 1.68)),
    mobileHomeWall("3", RectangleHitbox.fromRect(20.5, 1.68)),
    mobileHomeWall("4", RectangleHitbox.fromRect(10.65, 1.68)),
    kitchenUnit("1", RectangleHitbox.fromRect(6.61, 6.61, Vec.create(0, -0.45))),
    kitchenUnit("2", RectangleHitbox.fromRect(6.61, 6.61)),
    kitchenUnit("3", RectangleHitbox.fromRect(9.45, 6.61, Vec.create(0, -0.48)), "sink_residue"),
    {
        idString: "tire",
        name: "Tire",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 200,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(3.47, 8.35),
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor - 1,
        noResidue: true,
        frames: {
            particle: "flint_lockbox_particle"
        },
        particleVariations: 2,
        winterVariations: 2
    },
    {
        idString: "truck_tire",
        name: "Truck Tire",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 200,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1, 5.31, Vec.create(0, 0)),
            RectangleHitbox.fromRect(2.18, 4.28, Vec.create(-0.01, 0.01)),
            new CircleHitbox(0.51, Vec.create(0.57, 2.14)),
            new CircleHitbox(0.51, Vec.create(-0.57, -2.14)),
            new CircleHitbox(0.51, Vec.create(-0.57, 2.14)),
            new CircleHitbox(0.51, Vec.create(0.57, -2.13))
        ),
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor - 1,
        noResidue: true,
        frames: {
            particle: "flint_lockbox_particle"
        },
        particleVariations: 2
    },
    {
        idString: "mobile_home_window",
        name: "Mobile Home Window",
        defType: DefinitionType.Obstacle,
        material: "glass",
        health: 20,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hideOnMap: true,
        noCollisionAfterDestroyed: true,
        hitbox: RectangleHitbox.fromRect(13.8, 1.5),
        zIndex: ZIndexes.ObstaclesLayer2,
        allowFlyover: FlyoverPref.Never,
        rotationMode: RotationMode.Limited,
        isWindow: true,
        frames: {
            particle: "window_particle"
        }
    },
    {
        idString: "lux_crate",
        name: "Lux Crate",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 120,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(15.49, 5.85),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hasLoot: true
    },
    {
        idString: "tugboat_control_panel",
        name: "Tugboat Control Panel",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 250,
        reflectBullets: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hitbox: RectangleHitbox.fromRect(26.3, 8.02, Vec.create(0, 0.5)),
        rotationMode: RotationMode.Limited,
        explosion: "control_panel_explosion",
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "office_chair",
        name: "Office Chair",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 140,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(4.5, 5.3, Vec.create(0, -0.14)),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "office_chair_particle"
        }
    },
    {
        idString: "grey_office_chair",
        name: "Office Chair (Grey Edition)",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 155,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.9
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(5, 5.1),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "grey_office_chair_particle"
        }
    },
    {
        idString: "life_preserver",
        name: "Life Preserver",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 80,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hideOnMap: true,
        hitbox: RectangleHitbox.fromRect(3.2, 8.87, Vec.create(-0.4, 0)),
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor
    },
    {
        idString: "grenade_box",
        name: "Grenade Box",
        defType: DefinitionType.Obstacle,
        material: "cardboard",
        health: 40,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(4.4, 4.4),
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.ObstaclesLayer2,
        hasLoot: true,
        frames: {
            particle: "box_particle",
            residue: "box_residue"
        },
        winterVariations: 2
    },
    {
        idString: "lily_pad",
        name: "Lily Pad",
        defType: DefinitionType.Obstacle,
        material: "bush",
        health: 80,
        scale: {
            spawnMin: 1.1,
            spawnMax: 1.4, // fall mode only, original 0.9, 1.1, 0.8
            destroy: 1
        },
        hitbox: new CircleHitbox(4.2),
        noCollisions: true,
        rotationMode: RotationMode.Full,
        spawnMode: MapObjectSpawnMode.River,
        variations: 2,
        zIndex: ZIndexes.ObstaclesLayer3
    },
    {
        idString: "planted_bushes",
        name: "Planted Bushes",
        defType: DefinitionType.Obstacle,
        material: "porcelain",
        health: 800,
        indestructible: true,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.8
        },
        hitbox: RectangleHitbox.fromRect(9.5, 16.5),
        rotationMode: RotationMode.Limited,
        spawnMode: MapObjectSpawnMode.River,
        noResidue: true
    },
    {
        idString: "viking_chest",
        name: "Viking Chest",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 150,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(12, 7, Vec.create(0, -0.4)),
        rotationMode: RotationMode.Limited,
        hasLoot: true,
        hideOnMap: true,
        frames: {
            particle: "chest_particle",
            residue: "chest_residue"
        },
        spawnMode: MapObjectSpawnMode.Beach,
        allowFlyover: FlyoverPref.Always
    },
    {
        idString: "river_chest",
        name: "River Chest",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 150,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(12, 7),
        spawnHitbox: RectangleHitbox.fromRect(14, 9),
        rotationMode: RotationMode.None,
        zIndex: ZIndexes.DownedPlayers - 1,
        hasLoot: true,
        hideOnMap: true,
        frames: {
            particle: "chest_particle"
        },
        spawnMode: MapObjectSpawnMode.River,
        allowFlyover: FlyoverPref.Always
    },
    {
        idString: "cargo_ship_stair_entrance_walls",
        name: "Cargo Ship Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 69,
        indestructible: true,
        reflectBullets: true,
        collideWithLayers: Layers.Equal,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(15.27, 2.72, Vec.create(0.01, -7.24)),
            RectangleHitbox.fromRect(2.36, 15.71, Vec.create(-6.45, 0.71)),
            RectangleHitbox.fromRect(2.36, 16.68, Vec.create(6.46, 0.19))
        ),
        frames: {
            base: "cargo_ship_stair_entrance",
            particle: "cargo_ship_particle"
        },
        rotationMode: RotationMode.Limited
    },
    {
        idString: "cargo_ship_stair",
        name: "Cargo Ship Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 69,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(23.99, 1.01, Vec.create(1.34, 5.45)),
            RectangleHitbox.fromRect(23.99, 1.01, Vec.create(1.6, -5.47)),
            new CircleHitbox(0.91, Vec.create(13.01, 5.45)),
            new CircleHitbox(0.91, Vec.create(-2.7, -5.48)),
            new CircleHitbox(0.91, Vec.create(5.16, -5.46)),
            new CircleHitbox(0.91, Vec.create(13, -5.48)),
            new CircleHitbox(0.91, Vec.create(-10.57, -5.48)),
            new CircleHitbox(0.91, Vec.create(-10.57, 5.45)),
            new CircleHitbox(0.91, Vec.create(-2.7, 5.45)),
            new CircleHitbox(0.91, Vec.create(5.15, 5.45))
        ),
        frames: {
            particle: "metal_particle"
        },
        hideOnMap: false,
        rotationMode: RotationMode.Limited
    },
    {
        idString: "bunker_entrance",
        name: "Bunker Entrance",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        reflectBullets: true,
        indestructible: true,
        hitbox: RectangleHitbox.fromRect(13, 16.9),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited
    },
    {
        idString: "bunker_stair",
        name: "Bunker Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        isStair: true,
        activeEdges: {
            high: 2,
            low: 0
        },
        invisible: true,
        hitbox: RectangleHitbox.fromRect(10, 11.5),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited
    },
    {
        idString: "cargo_ship_bottom_stair",
        name: "Cargo Ship Bottom Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        isStair: true,
        activeEdges: {
            high: 3,
            low: 1
        },
        invisible: true,
        hitbox: RectangleHitbox.fromRect(13, 11.27),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited
    },
    {
        idString: "cargo_ship_top_stair",
        name: "Cargo Ship Top Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        isStair: true,
        activeEdges: {
            high: 3,
            low: 1
        },
        invisible: true,
        hitbox: RectangleHitbox.fromRect(10, 10),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited
    },
    {
        idString: "blue_house_stair_walls",
        name: "Blue House Stair Walls",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        invisible: true,
        hitbox: RectangleHitbox.fromRect(13, 4),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited
    },
    {
        idString: "blue_house_stair",
        name: "Blue House Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        isStair: true,
        activeEdges: {
            high: 1,
            low: 3
        },
        invisible: true,
        hitbox: RectangleHitbox.fromRect(9, 10),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor
    },
    {
        idString: "ship_thing_v2",
        name: "the snack that smiles back",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 42069,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(5.24, 21.1, Vec.create(0, 0.2)),
            new CircleHitbox(2.55, Vec.create(0, 10.7)),
            new CircleHitbox(3.37, Vec.create(-0.02, -9.91)),
            RectangleHitbox.fromRect(6.87, 3.96, Vec.create(-0.01, -7.98))
        ),
        frames: {
            particle: "cargo_ship_particle"
        },
        rotationMode: RotationMode.Limited
    },
    {
        idString: "ship_oil_source",
        name: "Ship Oil Source",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 69,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(7.7, 19.43, Vec.create(-6.47, 0)),
            RectangleHitbox.fromRect(2.38, 15.56, Vec.create(9.13, -0.3))
        ),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsCeiling
    },
    {
        idString: "cargo_ship_stair_support",
        name: "cargo ship stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        indestructible: true,
        collideWithLayers: Layers.All,
        health: 69,
        reflectBullets: true,
        invisible: true,
        hitbox: RectangleHitbox.fromRect(17.22, 2.09),
        frames: {
            particle: "cargo_ship_particle"
        },
        rotationMode: RotationMode.Limited
    },
    {
        idString: "memorial_bunker_stair",
        name: "Memorial Bunker Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        isStair: true,
        activeEdges: {
            high: 2,
            low: 0
        },
        invisible: true,
        hitbox: RectangleHitbox.fromRect(11, 12),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor
    },
    {
        idString: "hq_stair",
        name: "HQ Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        invisible: true,
        isStair: true,
        activeEdges: {
            high: 0,
            low: 1
        },
        hitbox: RectangleHitbox.fromRect(10.8, 24),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor
    },
    {
        idString: "barn_stair",
        name: "Barn Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        invisible: true,
        isStair: true,
        activeEdges: {
            high: 0,
            low: 2
        },
        hitbox: RectangleHitbox.fromRect(6.5, 4),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor
    },
    {
        idString: "hq_large_stair",
        name: "HQ Large Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        invisible: true,
        isStair: true,
        activeEdges: {
            high: 2,
            low: 0
        },
        hitbox: RectangleHitbox.fromRect(11.55, 25.5),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor
    },
    {
        idString: "lodge_stair",
        name: "Lodge Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        invisible: true,
        isStair: true,
        activeEdges: {
            high: 0,
            low: 3
        },
        hitbox: RectangleHitbox.fromRect(11.72, 8.8),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor
    },
    {
        idString: "plumpkin_bunker_stair",
        name: "Plumpkin Bunker Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        invisible: true,
        isStair: true,
        activeEdges: {
            high: 1,
            low: 3
        },
        hitbox: RectangleHitbox.fromRect(16.07, 11.3),
        frames: {
            // base: "plumpkin_bunker_entrance_floor",
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited
        // zIndex: 9999
    },
    {
        idString: "fulcrum_bunker_stair",
        name: "Flooded Bunker Stair",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        invisible: true,
        isStair: true,
        activeEdges: {
            high: 0,
            low: 2
        },
        hitbox: RectangleHitbox.fromRect(7.5, 10.68),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.BuildingsFloor
    },
    {
        idString: "fulcrum_bunker_collider_hack",
        name: "Flooded Bunker Collider Hack",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        invisible: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(10.68, 0.68, Vec.create(-30.19, -32.02)),
            RectangleHitbox.fromRect(10.68, 0.68, Vec.create(-9.82, 38.92))
        ),
        reflectBullets: true,
        frames: {
            particle: "plumpkin_bunker_particle"
        },
        rotationMode: RotationMode.Limited,
        collideWithLayers: Layers.Equal
    },
    {
        idString: "fire_exit_railing",
        name: "Fire exit railing",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        indestructible: true,
        invisible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.4, 41, Vec.create(5.18, 1)),
            RectangleHitbox.fromRect(11.6, 1.4, Vec.create(-0.3, 21.5)),
            new CircleHitbox(0.95, Vec.create(5.18, -19.3)),
            new CircleHitbox(0.95, Vec.create(5.18, 6.6)),
            new CircleHitbox(0.95, Vec.create(5.18, 21.5)),
            new CircleHitbox(0.95, Vec.create(-6.18, 21.5))
        ),
        frames: {
            particle: "metal_particle"
        },
        rotationMode: RotationMode.Limited,
        zIndex: ZIndexes.ObstaclesLayer1
    },
    {
        idString: "hq_second_floor_collider_hack",
        name: "HQ Second Floor Collider Hack",
        defType: DefinitionType.Obstacle,
        material: "stone",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(84.9, 1.75, Vec.create(-28.9, -105.9)),
            RectangleHitbox.fromRect(1.75, 40.8, Vec.create(-33.35, -85.5)),
            RectangleHitbox.fromRect(1.75, 44.5, Vec.create(-70.3, -84.4))
        ),
        health: 1000,
        indestructible: true,
        invisible: true,
        frames: {
            particle: "hq_stone_wall_particle"
        },
        particleVariations: 2,
        visibleFromLayers: Layers.All,
        collideWithLayers: Layers.All,
        rotationMode: RotationMode.Limited
    },
    { // i have fully given up at this point
        idString: "hq_second_floor_collider_hack_2",
        name: "HQ Second Floor Collider Hack 2",
        defType: DefinitionType.Obstacle,
        material: "stone",
        hitbox: RectangleHitbox.fromRect(13, 17.7, Vec.create(-52, -85.5)),
        health: 1000,
        indestructible: true,
        invisible: true,
        noHitEffect: true,
        particleVariations: 2,
        visibleFromLayers: Layers.All,
        rotationMode: RotationMode.Limited
    },
    {
        idString: "lodge_railing",
        name: "Lodge Railing",
        defType: DefinitionType.Obstacle,
        material: "stone",
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(12.04, 1.28, Vec.create(-32.61, 20.51)),
            RectangleHitbox.fromRect(1.24, 12.93, Vec.create(-38.53, 14.66))
        ),
        collideWithLayers: Layers.Equal,
        health: 1000,
        indestructible: true,
        invisible: true,
        visibleFromLayers: Layers.All,
        frames: {
            particle: "lodge_particle"
        },
        rotationMode: RotationMode.Limited
    },

    // --------------------------------------------------------------------------------------------
    // Headquarters.
    // --------------------------------------------------------------------------------------------
    {
        idString: "headquarters_bottom_entrance",
        name: "Headquarters Bottom Entrance",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 1000,
        hideOnMap: true,
        indestructible: true,
        hitbox: new GroupHitbox(
            // left
            RectangleHitbox.fromRect(0.25, 12.5, Vec.create(-40.9, 43)),
            new CircleHitbox(0.5, Vec.create(-41.1, 50.15)),
            new CircleHitbox(0.5, Vec.create(-41.1, 36.75)),

            // right
            RectangleHitbox.fromRect(0.25, 12.5, Vec.create(-20.86, 43.1)),
            new CircleHitbox(0.5, Vec.create(-20.95, 50.15)),
            new CircleHitbox(0.5, Vec.create(-20.95, 36.9))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        invisible: true,
        particleVariations: 2,
        frames: {
            particle: "rock_particle"
        }
    },
    {
        idString: "barn_stair_walls",
        name: "Barn Stair Walls",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        hideOnMap: true,
        indestructible: true,
        collideWithLayers: Layers.Adjacent,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1, 9, Vec.create(-45, 0.5)),
            RectangleHitbox.fromRect(1, 9, Vec.create(-52.8, 0.5)),
            RectangleHitbox.fromRect(9, 1, Vec.create(9.1, -31.1)),
            RectangleHitbox.fromRect(9, 1, Vec.create(9.1, -39))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        invisible: true,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "barn_stair_walls_top_floor",
        name: "Barn Stair Walls",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        hideOnMap: true,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1, 8, Vec.create(-45, 0)),
            RectangleHitbox.fromRect(1, 8, Vec.create(-52.8, 0)),
            RectangleHitbox.fromRect(8, 1, Vec.create(9.5, -31.1)),
            RectangleHitbox.fromRect(8, 1, Vec.create(9.5, -39))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        invisible: true,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "barn_stair_walls_2",
        name: "Barn Stair Walls",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        hideOnMap: true,
        indestructible: true,
        reflectBullets: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(8, 1.5, Vec.create(-48.5, 4.25)),
            RectangleHitbox.fromRect(1.5, 8, Vec.create(5.25, -35))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never, // todo
        invisible: true,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "lighthouse_stairs",
        name: "Lighthouse Stairs",
        defType: DefinitionType.Obstacle,
        material: "appliance",
        health: 10000,
        hideOnMap: true,
        reflectBullets: true,
        noResidue: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(1.18, 4.25, Vec.create(-3.83, 0)),
            RectangleHitbox.fromRect(1.18, 4.25, Vec.create(3.83, 0))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        frames: {
            particle: "metal_particle"
        }
    },
    {
        idString: "headquarters_main_desk",
        name: "Headquarters Main Desk",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 120,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hideOnMap: true,
        invisible: true,
        noResidue: true,
        rotationMode: RotationMode.Limited,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(23.6, 5, Vec.create(0, 3)),
            RectangleHitbox.fromRect(4.6, 8, Vec.create(9.5, -1.5)),
            RectangleHitbox.fromRect(4.6, 8, Vec.create(-9.5, -1.5))
        ),
        frames: {
            particle: "hq_stone_wall_particle"
        },
        particleVariations: 2
    },
    {
        idString: "headquarters_boss_desk",
        name: "Headquarters Boss Desk",
        defType: DefinitionType.Obstacle,
        material: "stone",
        health: 120,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hideOnMap: true,
        invisible: true,
        noResidue: true,
        rotationMode: RotationMode.Limited,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(20, 6.3, Vec.create(0, 0)),
            RectangleHitbox.fromRect(11, 7, Vec.create(0, -0.5))
        ),
        frames: {
            particle: "hq_stone_wall_particle"
        },
        particleVariations: 2
    },
    {
        idString: "headquarters_cafeteria_table",
        name: "Headquarters Cafeteria Table",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 120,
        noBulletCollision: true,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hideOnMap: true,
        invisible: true,
        noResidue: true,
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        hitbox: RectangleHitbox.fromRect(22.8, 5),
        frames: {
            particle: "headquarters_c_desk_particle"
        }
    },
    {
        idString: "headquarters_security_desk",
        name: "Headquarters Security Desk",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 120,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.95
        },
        hideOnMap: true,
        noResidue: true,
        hitbox: RectangleHitbox.fromRect(27.5, 5.2),
        rotationMode: RotationMode.Limited,
        isActivatable: true,
        allowFlyover: FlyoverPref.Always,
        replaceWith: {
            idString: "headquarters_security_desk_activated",
            delay: 0
        },
        sound: {
            names: ["button_press", "puzzle_solved"]
        },
        frames: {
            particle: "headquarters_desk_particle"
        }
    },
    {
        idString: "headquarters_security_desk_activated",
        name: "Headquarters Security Panel (active)",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 120,
        indestructible: true,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(27.5, 5.2),
        rotationMode: RotationMode.Limited,
        frames: {
            particle: "headquarters_desk_particle"
        }
    },
    {
        idString: "headquarters_wood_obstacles",
        name: "Headquarters Wood Obstacles",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 1000,
        hideOnMap: true,
        indestructible: true,
        hitbox: RectangleHitbox.fromRect(27.5, 5, Vec.create(-56.3, 31)),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        invisible: true,
        frames: {
            particle: "headquarters_desk_particle"
        }
    },
    {
        idString: "headquarters_wood_table_second_floor",
        name: "Headquarters Wood Obstacles",
        defType: DefinitionType.Obstacle,
        material: "wood",
        health: 1000,
        hideOnMap: true,
        indestructible: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(3.05, 21.5),
            RectangleHitbox.fromRect(13.4, 4.25, Vec.create(-5, -8.8))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        invisible: true,
        frames: {
            particle: "headquarters_desk_particle"
        }
    },
    {
        idString: "headquarters_sinks",
        name: "Headquarters Sinks",
        defType: DefinitionType.Obstacle,
        material: "porcelain",
        health: 1000,
        hideOnMap: true,
        indestructible: true,
        hitbox: new GroupHitbox(
            RectangleHitbox.fromRect(34, 6, Vec.create(-7.4, -103.5))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        invisible: true,
        frames: {
            particle: "toilet_particle"
        }
    },
    {
        idString: "pole",
        name: "Pole",
        defType: DefinitionType.Obstacle,
        material: "fence",
        health: 150,
        scale: {
            spawnMin: 0.9,
            spawnMax: 1.1,
            destroy: 0.5
        },
        noResidue: true,
        isWall: true,
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        hitbox: new CircleHitbox(1.1),
        rotationMode: RotationMode.None,
        frames: {
            particle: "metal_particle"
        }
    },
    rshCase("rsh_case_single"),
    rshCase("rsh_case_dual"),
    {
        idString: "memorial_crate",
        name: "Aged Memorial Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        hasLoot: true,
        health: 140,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.8
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        rotationMode: RotationMode.None,
        hitbox: RectangleHitbox.fromRect(9.2, 9.2),
        frames: {
            particle: "memorial_crate_particle"
        }
    },
    {
        idString: "silo",
        name: "Silo",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 1000,
        hitbox: new GroupHitbox(
            new CircleHitbox(17.07, Vec.create(-2.03, 0)),
            new CircleHitbox(3.26, Vec.create(-13.43, -11.4)),
            new CircleHitbox(3.26, Vec.create(-13.43, 11.4)),
            new CircleHitbox(3.26, Vec.create(9.36, -11.4)),
            new CircleHitbox(3.26, Vec.create(9.36, 11.4)),
            RectangleHitbox.fromRect(5.48, 11.65, Vec.create(16.35, 0))
        ),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Never,
        explosion: "silo_explosion",
        reflectBullets: true,
        zIndex: ZIndexes.ObstaclesLayer5,
        frames: {
            particle: "metal_particle",
            residue: "large_refinery_barrel_residue"
        }
        // winterVariations: 1
    },
    {
        idString: "buoy",
        name: "Buoy",
        defType: DefinitionType.Obstacle,
        material: "metal_heavy",
        health: 69,
        indestructible: true,
        reflectBullets: true,
        hitbox: new CircleHitbox(7.27),
        frames: {
            particle: "buoy_particle"
        },
        rotationMode: RotationMode.Full,
        spawnWithWaterOverlay: true,
        waterOverlay: {
            scaleX: 2.4,
            scaleY: 2.4
        },
        allowFlyover: FlyoverPref.Always
        // spawnMode: MapObjectSpawnMode.Beach // todo: ocean spawn mode
    },
    {
        idString: "large_logs_pile",
        name: "Large Logs Pile",
        defType: DefinitionType.Obstacle,
        material: "tree",
        health: 250,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(17.54, 8.22),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        noResidue: true,
        frames: {
            particle: "log_particle"
        }
    },
    {
        idString: "small_logs_pile",
        name: "Small Logs Pile",
        defType: DefinitionType.Obstacle,
        material: "tree",
        health: 230,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.7
        },
        hitbox: RectangleHitbox.fromRect(8.6, 8.21),
        rotationMode: RotationMode.Limited,
        allowFlyover: FlyoverPref.Always,
        noResidue: true,
        frames: {
            particle: "log_particle"
        }
    },
    {
        idString: "campsite_crate",
        name: "Campsite Crate",
        defType: DefinitionType.Obstacle,
        material: "crate",
        health: 65,
        scale: {
            spawnMin: 1,
            spawnMax: 1,
            destroy: 0.5
        },
        spawnMode: MapObjectSpawnMode.GrassAndSand,
        rotationMode: RotationMode.Binary,
        hitbox: RectangleHitbox.fromRect(7.96, 7.96),
        hasLoot: true,
        frames: {
            particle: "crate_particle",
            residue: "regular_crate_residue"
        }
    }
] satisfies readonly RawObstacleDefinition[] as readonly RawObstacleDefinition[]).flatMap((def: Mutable<RawObstacleDefinition>) => {
    if (def.variations !== undefined) (def as Mutable<ObstacleDefinition>).variationBits = Math.ceil(Math.log2(def.variations));
    if (def.allowFlyover === undefined) def.allowFlyover = FlyoverPref.Sometimes;
    if (def.visibleFromLayers === undefined) def.visibleFromLayers = Layers.Adjacent;
    const winterVariations = def.winterVariations;
    return winterVariations
        ? [
            def,
            {
                ...def,
                idString: `${def.idString}_winter`,
                variations: winterVariations === 1 ? undefined : winterVariations,
                winterVariations: undefined
            }
        ]
        : def;
}) as readonly ObstacleDefinition[]);
