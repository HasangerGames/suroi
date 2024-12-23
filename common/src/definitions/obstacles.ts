import { GameConstants, Layers, TentTints, ZIndexes } from "../constants";
import { type Variation } from "../typings";
import { CircleHitbox, GroupHitbox, RectangleHitbox, type Hitbox } from "../utils/hitbox";
import { type DeepPartial, type GetEnumMemberName, type Mutable } from "../utils/misc";
import { MapObjectSpawnMode, ObjectDefinitions, ObstacleSpecialRoles, type ObjectDefinition, type RawDefinition, type ReferenceOrRandom, type ReferenceTo } from "../utils/objectDefinitions";
import { Vec, type Vector } from "../utils/vector";
import { type GunDefinition } from "./guns";
import { type LootDefinition } from "./loots";
import { type SyncedParticleSpawnerDefinition } from "./syncedParticles";

/*

    eslint-disable

    @stylistic/no-multi-spaces,
    @stylistic/key-spacing
*/

/**
 * An enum indicating the degree to which an obstacle should allow
 * throwables to sail over it.
 *
 * Note that any throwable whose velocity is below 0.03 u/ms won't be able to sail
 * over any obstacle, even those marked as `Always`. Additionally, if the obstacle
 * in question has a role that is `ObstacleSpecialRoles.Door`, its preference will only
 * be honored when the door is opened; if it is closed, it will act as {@link Never}.
 */
export enum FlyoverPref {
    /**
     * Always allow throwables to fly over the object.
     */
    Always,

    /**
     * Only allow throwables to fly over the object if the throwable's velocity exceeds 0.04 u/ms.
     * For reference, the maximum throwing speed is around 0.09 u/ms for a 1x scope.
     */
    Sometimes,

    /**
     * Never allow throwables to fly over the object.
     */
    Never
}

// yes these two types are mostly copied from ./utils/gameObject.ts
// when ts adds hkt's and better enum type support, i'll rewrite it to reduce repetition

type PredicateFor<Role extends ObstacleSpecialRoles | undefined = ObstacleSpecialRoles | undefined> = ObstacleSpecialRoles extends Role
    ? {
        // if Cat === ObstacleSpecialRoles, then they should all be boolean | undefined; if not, narrow as appropriate
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        readonly [K in (keyof typeof ObstacleSpecialRoles & string) as `is${K}`]?: boolean | undefined
    }
    : Role extends undefined
        ? {
            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
            readonly [K in (keyof typeof ObstacleSpecialRoles & string) as `is${K}`]?: false | undefined
        }
        : Readonly<Record<`is${GetName<NonNullable<Role>>}`, true>> & {
            readonly [K in Exclude<ObstacleSpecialRoles, Role> as `is${GetName<K>}`]?: K extends GetName<NonNullable<Role>> ? never : false
        };

type GetName<Member extends number> = GetEnumMemberName<typeof ObstacleSpecialRoles, Member>;

type RawObstacleDefinition = ObjectDefinition & {
    readonly material: typeof Materials[number]
    readonly health: number
    readonly indestructible: boolean
    readonly impenetrable: boolean
    readonly noHitEffect: boolean
    readonly noDestroyEffect?: boolean
    readonly noResidue: boolean
    readonly invisible: boolean
    readonly hideOnMap: boolean
    readonly scale?: {
        readonly spawnMin: number
        readonly spawnMax: number
        readonly destroy: number
    }
    readonly hitbox: Hitbox
    readonly spawnHitbox?: Hitbox
    readonly noCollisions: boolean
    readonly noCollisionAfterDestroyed?: boolean
    readonly pallet?: boolean
    readonly rotationMode: RotationMode // for obstacles with a role, this cannot be RotationMode.Full
    readonly particleVariations?: number
    readonly zIndex?: ZIndexes
    /**
     * Whether throwables can fly over this obstacle
     */
    readonly allowFlyover: FlyoverPref
    readonly collideWithLayers?: Layers
    readonly visibleFromLayers: Layers
    readonly hasLoot: boolean
    readonly lootTable?: string
    readonly spawnWithLoot: boolean
    readonly explosion?: string
    readonly detector: boolean
    readonly noMeleeCollision: boolean
    readonly noBulletCollision: boolean
    readonly reflectBullets: boolean
    readonly hitSoundVariations?: number
    readonly noInteractMessage?: boolean
    readonly weaponSwap?: boolean
    readonly gunMount?: {
        readonly type: "gun" | "melee"
        readonly weapon: string
    }

    readonly frames: {
        readonly base?: string
        readonly particle?: string
        readonly residue?: string
        readonly opened?: string
        readonly activated?: string
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

    readonly imageAnchor?: Vector
    readonly spawnMode: MapObjectSpawnMode
    readonly tint?: number
    readonly particlesOnDestroy?: SyncedParticleSpawnerDefinition
    readonly additionalDestroySounds: readonly string[]
    readonly sound?: ({ readonly name: string } | { readonly names: string[] }) & {
        readonly maxRange?: number
        readonly falloff?: number
    }
} & ObstacleRoleMixin & VariationMixin;

export type VariationMixin = {
    readonly variations: Exclude<Variation, 0>
    readonly variationBits: number
} | {
    readonly variations?: never
    readonly variationBits?: never
};

export type DoorMixin = {
    readonly role: ObstacleSpecialRoles.Door
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
});

type ActivatableMixin = {
    readonly role: ObstacleSpecialRoles.Activatable
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
        readonly idString: ReferenceOrRandom<RawObstacleDefinition>
        readonly delay: number
    }
};

type StairMixin = {
    readonly role: ObstacleSpecialRoles.Stair
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
};

export type ObstacleRoleMixin = (
    DoorMixin | ActivatableMixin | {
        readonly role: ObstacleSpecialRoles.Window
    } | {
        readonly role: ObstacleSpecialRoles.Wall
    } | StairMixin | {
        readonly role?: undefined
    }
);

export type ObstacleDefinition = RawObstacleDefinition & (
    {
        [K in ObstacleSpecialRoles]: PredicateFor<K> & { readonly role: K }
    }[ObstacleSpecialRoles]
    | ({ readonly role?: undefined } & PredicateFor<undefined>)
);

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
    cardboard: { hit: "stone",       destroyed: "crate"     },
    iron:      { hit: "metal_light", destroyed: "appliance" },
    crate:     { hit: "wood"  },
    pumpkin:   { hit: "stone" },
    trash_bag: { hit: "sand" }
};

const aidrTint = GameConstants.modeName as string === "winter" ? 0xb94646 : 0x4059bf;

/* eslint-disable @stylistic/key-spacing, @stylistic/no-multi-spaces */
export const TintedParticles: Record<string, { readonly base: string, readonly tint: number, readonly variants?: number }> = {
    _glow_:                        { base: "_glow_",           tint: 0xffffff },

    metal_particle:                { base: "metal_particle_1", tint: 0x5f5f5f },
    metal_column_particle:         { base: "metal_particle_1", tint: 0x8f8f8f },
    super_barrel_particle:         { base: "metal_particle_1", tint: 0xce2b29 },
    propane_tank_particle:         { base: "metal_particle_1", tint: 0xb08b3f },
    dumpster_particle:             { base: "metal_particle_1", tint: 0x3c7033 },
    washing_machine_particle:      { base: "metal_particle_1", tint: 0xcccccc },
    tv_particle:                   { base: "metal_particle_1", tint: 0x333333 },
    smokestack_particle:           { base: "metal_particle_1", tint: 0xb5b5b5 },
    distillation_column_particle:  { base: "metal_particle_1", tint: 0x1b5e98 },
    ship_oil_tank_particle:        { base: "metal_particle_1", tint: 0x00538f },
    forklift_particle:             { base: "metal_particle_1", tint: 0xac5339 },
    bollard_particle:              { base: "metal_particle_1", tint: 0xa66e20 },
    m1117_particle:                { base: "metal_particle_1", tint: 0x2f3725 },
    file_cart_particle:            { base: "metal_particle_1", tint: 0x404040 },
    container_particle_white:      { base: "metal_particle_1", tint: 0xc0c0c0 },
    container_particle_red:        { base: "metal_particle_1", tint: 0xa32900 },
    container_particle_green:      { base: "metal_particle_1", tint: 0x00a30e },
    container_particle_blue:       { base: "metal_particle_1", tint: 0x005fa3 },
    container_particle_yellow:     { base: "metal_particle_1", tint: 0xcccc00 },
    filing_cabinet_particle:       { base: "metal_particle_2", tint: 0x7f714d },
    briefcase_particle:            { base: "metal_particle_2", tint: 0xcfcfcf },
    aegis_crate_particle:          { base: "wood_particle",    tint: 0x2687d9 },
    airdrop_crate_particle:        { base: "wood_particle",    tint: aidrTint },
    chest_particle:                { base: "wood_particle",    tint: 0xa87e5a },
    cooler_particle:               { base: "wood_particle",    tint: 0x406c65 },
    crate_particle:                { base: "wood_particle",    tint: 0x9e7437 },
    flint_crate_particle:          { base: "wood_particle",    tint: 0xda6a0b },
    furniture_particle:            { base: "wood_particle",    tint: 0x785a2e },
    couch_part_particle:           { base: "wood_particle",    tint: 0x6a330b },
    grenade_crate_particle:        { base: "wood_particle",    tint: 0x4c4823 },
    gun_case_particle:             { base: "wood_particle",    tint: 0x3e5130 },
    hazel_crate_particle:          { base: "wood_particle",    tint: 0x6ba371 },
    lux_crate_particle:            { base: "wood_particle",    tint: 0x4e5c3d },
    melee_crate_particle:          { base: "wood_particle",    tint: 0x23374c },
    tango_crate_particle:          { base: "wood_particle",    tint: 0x3f4c39 },
    wall_particle:                 { base: "wood_particle",    tint: 0xafa08c },
    flint_stone_particle_1:        { base: "stone_particle_1", tint: 0x26272c },
    flint_stone_particle_2:        { base: "stone_particle_2", tint: 0x26272c },
    gold_rock_particle_1:          { base: "stone_particle_1", tint: 0xaa8534 },
    gold_rock_particle_2:          { base: "stone_particle_2", tint: 0xd3a440 },
    rock_particle_1:               { base: "stone_particle_1", tint: 0x8e8e8e },
    rock_particle_2:               { base: "stone_particle_2", tint: 0x8e8e8e },
    river_rock_particle_1:         { base: "stone_particle_1", tint: 0x626471 },
    river_rock_particle_2:         { base: "stone_particle_2", tint: 0x626471 },
    clearing_boulder_particle_1:   { base: "stone_particle_1", tint: 0x5a5a5a },
    clearing_boulder_particle_2:   { base: "stone_particle_2", tint: 0x5a5a5a },
    sandbags_particle:             { base: "stone_particle_2", tint: 0xd59d4e },
    fire_pit_particle_1:           { base: "stone_particle_1", tint: 0x5b4f3e },
    fire_pit_particle_2:           { base: "stone_particle_2", tint: 0x5b4f3e },
    porta_potty_door_particle:     { base: "plastic_particle", tint: 0xf5f9fd },
    porta_potty_toilet_particle:   { base: "plastic_particle", tint: 0x5e5e5e },
    porta_potty_wall_particle:     { base: "plastic_particle", tint: 0x1c71d8 },
    porta_potty_particle_fall:     { base: "plastic_particle", tint: 0x78593b },
    porta_potty_particle:          { base: "ceiling_particle", tint: 0xe7e7e7 },
    outhouse_particle:             { base: "ceiling_particle", tint: 0x78593b },
    outhouse_wall_particle:        { base: "wood_particle",    tint: 0x6e4d2f },
    mobile_home_particle:          { base: "ceiling_particle", tint: 0xa8a8a8 },
    grey_office_chair_particle:    { base: "wood_particle",    tint: 0x616161 },
    office_chair_particle:         { base: "wood_particle",    tint: 0x7d2b2b },
    hq_stone_wall_particle_1:      { base: "stone_particle_1", tint: 0x591919 },
    hq_stone_wall_particle_2:      { base: "stone_particle_2", tint: 0x591919 },
    headquarters_desk_particle:    { base: "wood_particle",    tint: 0x61341a },
    headquarters_c_desk_particle:  { base: "wood_particle",    tint: 0x6e5838 },
    gold_aegis_case_particle:      { base: "wood_particle",    tint: 0x1a1a1a },
    hq_tp_wall_particle:           { base: "wood_particle",    tint: 0x74858b },
    white_small_couch_particle:    { base: "wood_particle",    tint: 0xcfc1af },
    red_small_couch_particle:      { base: "wood_particle",    tint: 0x823323 },
    planted_bushes_particle:       { base: "toilet_particle",  tint: 0xaaaaaa },
    barn_wall_particle_1:          { base: "stone_particle_1", tint: 0x690c0c },
    barn_wall_particle_2:          { base: "stone_particle_2", tint: 0x690c0c },
    lodge_particle:                { base: "wood_particle",    tint: 0x49371d },
    lodge_wall_particle:           { base: "wood_particle",    tint: 0x5a4320 },
    gun_mount_dual_rsh12_particle: { base: "wood_particle",    tint: 0x595959 },
    square_desk_particle:          { base: "wood_particle",    tint: 0x4d3e28 },
    plumpkin_bunker_particle:      { base: "metal_particle_1", tint: 0x262626 },
    metal_auto_door_particle:      { base: "metal_particle_1", tint: 0x404040 },
    red_metal_auto_door_particle:  { base: "metal_particle_1", tint: 0x401a1a },
    blue_metal_auto_door_particle: { base: "metal_particle_1", tint: 0x1a1a40 },

    red_gift_particle:             { base: "toilet_particle",  tint: 0x962626 },
    green_gift_particle:           { base: "toilet_particle",  tint: 0x377130 },
    blue_gift_particle:            { base: "toilet_particle",  tint: 0x264b96 },
    purple_gift_particle:          { base: "toilet_particle",  tint: 0x692d69 },
    black_gift_particle:           { base: "toilet_particle",  tint: 0x1b1b1b },

    pumpkin_particle:              { base: "pumpkin_particle_base", tint: 0xff8c01 },
    plumpkin_particle:             { base: "pumpkin_particle_base", tint: 0x8a4c70 },
    diseased_plumpkin_particle:    { base: "pumpkin_particle_base", tint: 0x654646 },

    tent_particle_1:               { base: "ceiling_particle", tint: TentTints.red },
    tent_particle_2:               { base: "ceiling_particle", tint: TentTints.green },
    tent_particle_3:               { base: "ceiling_particle", tint: TentTints.blue },
    tent_particle_4:               { base: "ceiling_particle", tint: TentTints.orange },
    tent_particle_5:               { base: "ceiling_particle", tint: TentTints.purple },

    tent_ceiling_particle_red_1:     { base: "tent_ceiling_particle_1", tint: TentTints.red },
    tent_ceiling_particle_red_2:     { base: "tent_ceiling_particle_2", tint: TentTints.red },
    tent_ceiling_particle_red_3:     { base: "tent_ceiling_particle_3", tint: TentTints.red },

    tent_ceiling_particle_green_1:     { base: "tent_ceiling_particle_1", tint: TentTints.green },
    tent_ceiling_particle_green_2:     { base: "tent_ceiling_particle_2", tint: TentTints.green },
    tent_ceiling_particle_green_3:     { base: "tent_ceiling_particle_3", tint: TentTints.green },

    tent_ceiling_particle_blue_1:     { base: "tent_ceiling_particle_1", tint: TentTints.blue },
    tent_ceiling_particle_blue_2:     { base: "tent_ceiling_particle_2", tint: TentTints.blue },
    tent_ceiling_particle_blue_3:     { base: "tent_ceiling_particle_3", tint: TentTints.blue },

    tent_ceiling_particle_orange_1:     { base: "tent_ceiling_particle_1", tint: TentTints.orange },
    tent_ceiling_particle_orange_2:     { base: "tent_ceiling_particle_2", tint: TentTints.orange },
    tent_ceiling_particle_orange_3:     { base: "tent_ceiling_particle_3", tint: TentTints.orange },

    tent_ceiling_particle_purple_1:     { base: "tent_ceiling_particle_1", tint: TentTints.purple },
    tent_ceiling_particle_purple_2:     { base: "tent_ceiling_particle_2", tint: TentTints.purple },
    tent_ceiling_particle_purple_3:     { base: "tent_ceiling_particle_3", tint: TentTints.purple }
};
/* eslint-enable @stylistic/key-spacing, @stylistic/no-multi-spaces */

const defaultObstacle: DeepPartial<RawObstacleDefinition> = {
    indestructible: false,
    impenetrable: false,
    noHitEffect: false,
    noResidue: false,
    invisible: false,
    hideOnMap: false,
    noCollisions: false,
    allowFlyover: FlyoverPref.Sometimes,
    visibleFromLayers: Layers.Adjacent,
    hasLoot: false,
    spawnWithLoot: false,
    detector: false,
    noMeleeCollision: false,
    noBulletCollision: false,
    reflectBullets: false,
    frames: {},
    imageAnchor: Vec.create(0, 0),
    spawnMode: MapObjectSpawnMode.Grass,
    additionalDestroySounds: []
} satisfies DeepPartial<RawObstacleDefinition>;

export const Obstacles = ObjectDefinitions.withDefault<ObstacleDefinition>()(
    "Obstacles",
    defaultObstacle,
    ([derive, inheritFrom, , _missingType]) => {
        type Missing = typeof _missingType;

        const tree = derive(
            (
                props: {
                    readonly name: string
                    readonly health: number
                    readonly variations?: Exclude<Variation, 0>
                    readonly hitbox: Hitbox
                    readonly spawnHitbox: Hitbox
                    readonly rotationMode: RotationMode
                    readonly scaleProps: {
                        readonly destroy: number
                        readonly spawnMax: number
                        readonly spawnMin: number
                    }
                    readonly zIndex?: ZIndexes
                    readonly allowFlyOver?: FlyoverPref
                    readonly hasLoot?: boolean
                    readonly frames?: {
                        readonly base?: string
                        readonly particle?: string
                        readonly residue?: string
                    }
                }
            ) => ({
                name: props.name,
                idString: props.name.toLowerCase().replace(/'/g, "").replace(/ /g, "_"),
                material: "tree",
                health: props.health,
                scale: {
                    spawnMin: props.scaleProps.spawnMin,
                    spawnMax: props.scaleProps.spawnMax,
                    destroy: props.scaleProps.destroy
                },
                spawnHitbox: props.spawnHitbox,
                spawnMode: MapObjectSpawnMode.Grass,
                rotationMode: props.rotationMode,
                variations: props.variations ?? undefined,
                hitbox: props.hitbox,
                zIndex: props.zIndex ?? ZIndexes.ObstaclesLayer5,
                hasLoot: props.hasLoot ?? false,
                allowFlyover: props.allowFlyOver ?? FlyoverPref.Sometimes,
                frames: {
                    base: props.frames?.base,
                    particle: props.frames?.particle,
                    residue: props.frames?.residue
                }
            })
        );

        const crate = derive({
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
            hasLoot: true
        });

        const houseWall = derive(
            (
                lengthNumber: number,
                tintProperties?: {
                    readonly color: number
                    readonly border: number
                    readonly particle: string
                }
            ) => ({
                idString: `house_wall_${lengthNumber}`,
                name: `House Wall ${lengthNumber}`,
                material: "wood",
                hideOnMap: true,
                noResidue: true,
                health: 170,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.95
                },
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                frames: {
                    particle: (tintProperties?.particle) ?? "wall_particle"
                },
                wall: {
                    borderColor: (tintProperties?.border) ?? 0x4a4134,
                    color: (tintProperties?.color) ?? 0xafa08c,
                    rounded: true
                },
                role: ObstacleSpecialRoles.Wall
            })
        );

        const hqWall = derive((lengthNumber: number, customHealth = false) => ({
            idString: `headquarters_wall_${lengthNumber}`,
            name: `Headquarters Wall ${lengthNumber}`,
            material: "wood",
            hideOnMap: true,
            noResidue: true,
            health: customHealth ? 100 : 170,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: customHealth ? "hq_tp_wall_particle" : "wall_particle"
            },
            wall: {
                borderColor: customHealth ? 0x23282a : 0x4a4134,
                color: customHealth ? 0x74858b : 0xafa08c,
                ...(customHealth ? {} : { rounded: !customHealth })
            },
            role: ObstacleSpecialRoles.Wall
        }));

        const lodgeWall = derive((id: string, length: number) => ({
            idString: `lodge_wall_${id}`,
            name: "Lodge Wall",
            material: "wood",
            hideOnMap: true,
            noResidue: true,
            health: 170,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hitbox: RectangleHitbox.fromRect(length, 2.06),
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "lodge_wall_particle"
            },
            wall: {
                borderColor: 0x291e0f,
                color: 0x5a4320,
                rounded: true
            },
            role: ObstacleSpecialRoles.Wall
        }));

        const innerConcreteWall = derive((id: number, hitbox: Hitbox) => ({
            idString: `inner_concrete_wall_${id}`,
            material: "stone",
            hitbox,
            health: 500,
            noResidue: true,
            hideOnMap: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            rotationMode: RotationMode.Limited,
            role: ObstacleSpecialRoles.Wall,
            allowFlyover: FlyoverPref.Never,
            particleVariations: 2,
            frames: {
                particle: "rock_particle"
            },
            wall: {
                color: 0x808080,
                borderColor: 0x484848,
                rounded: true
            }
        }));

        const mobileHomeWall = derive((lengthNumber: string) => ({
            idString: `mobile_home_wall_${lengthNumber}`,
            name: `Mobile Home Wall ${lengthNumber}`,
            material: "appliance",
            noResidue: true,
            hideOnMap: true,
            health: 240,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Never,
            frames: {
                particle: "briefcase_particle"
            },
            wall: {
                borderColor: 0x666666,
                color: 0xbfbfbf
            },
            role: ObstacleSpecialRoles.Wall
        }));
        /*                name: "Porta Potty Back Wall",
                material: "wood",
                health: 100,
                noResidue: true,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.9
                },
                hideOnMap: true,
                hitbox: RectangleHitbox.fromRect(12.8, 1.6),
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                role: ObstacleSpecialRoles.Wall,
                wall: {
                    borderColor: 0x0d3565,
                    color: 0x1c71d8
                },
                frames: {
                    particle: "porta_potty_wall_particle"
                } */
        const tentWall = derive(
            (
                id: number,
                color: "red" | "green" | "blue" | "orange" | "purple"
            ) => ({
                idString: `tent_wall_${id}`,
                name: `Tent Wall ${id}`,
                material: "stone",
                hideOnMap: true,
                noResidue: true,
                health: 100,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.95
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
                role: ObstacleSpecialRoles.Wall
            })
        );

        const portaPottyWall = derive(
            (
                name: string,
                particle: string,
                colors: {
                    readonly borderColor: number
                    readonly color: number
                }
            ) => ({
                idString: name.toLowerCase().replace(/'/g, "").replace(/ /g, "_"),
                name: name,
                material: "wood",
                health: 100,
                noResidue: true,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.9
                },
                hideOnMap: true,
                hitbox: RectangleHitbox.fromRect(12.8, 1.6),
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                role: ObstacleSpecialRoles.Wall,
                wall: {
                    borderColor: colors.borderColor,
                    color: colors.color
                },
                frames: {
                    particle: particle
                }
            })
        );

        const bigTentWall = derive(
            (
                id: number,
                color: "red" | "green" | "blue" | "orange" | "purple"
            ) => ({
                idString: `tent_wall_big_${id}`,
                name: `Big Tent Wall ${id}`,
                material: "stone",
                hideOnMap: true,
                noResidue: true,
                health: 200,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.95
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
                role: ObstacleSpecialRoles.Wall
            })
        );

        const gunMount = derive((gunID: ReferenceTo<GunDefinition>, weaponType: "gun" | "melee", useSvg = false) => ({
            idString: `gun_mount_${gunID}`,
            name: "Gun Mount",
            material: "wood",
            health: 60,
            hideOnMap: true,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.95
            },
            hasLoot: true,
            hitbox: new GroupHitbox(
                RectangleHitbox.fromRect(8.2, 0.95, Vec.create(0, -1.32)), // Base
                RectangleHitbox.fromRect(0.75, 2.75, Vec.create(0, 0.48)), // Center post
                RectangleHitbox.fromRect(0.75, 2.75, Vec.create(-3.11, 0.48)), // Left post
                RectangleHitbox.fromRect(0.75, 2.75, Vec.create(3.17, 0.48)) // Right post
            ),
            rotationMode: RotationMode.Limited,
            frames: {
                particle: "furniture_particle",
                residue: "gun_mount_residue"
            },
            gunMount: !useSvg
                ? {
                    type: weaponType,
                    weapon: `${gunID}${weaponType === "gun" ? "_world" : ""}`
                }
                : undefined
        } as const));

        const kitchenUnit = derive((id: string) => ({
            idString: `kitchen_unit_${id}`,
            name: "Kitchen Unit",
            material: "wood",
            health: 100,
            scale: {
                spawnMin: 1,
                spawnMax: 1,
                destroy: 0.7
            },
            hideOnMap: true,
            hasLoot: true,
            rotationMode: RotationMode.Limited,
            allowFlyover: FlyoverPref.Always
        }));

        const controlPanel = derive((idString: string, name: string) => ({
            idString,
            name,
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
        }));
        const gift = derive(
            (
                color: "red" | "green" | "blue" | "purple" | "black",
                explode = false
            ) => ({
                idString: `${color}_gift`,
                name: `${color.charAt(0).toUpperCase() + color.slice(1)} Gift`,
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
            })
        );

        const withWinterVariation = (
            ...defs: ReadonlyArray<
                Missing | [
                    base: Missing,
                    variants?: Exclude<Variation, 0>
                ]
            >
        ): Array<Missing | RawDefinition<Missing>> => defs.flatMap(
            arg => {
                const [base, variants] = Array.isArray(arg) ? arg : [arg];

                return [
                    base,
                    {
                        [inheritFrom]: base.idString,
                        idString: `${base.idString}_winter`,
                        variations: variants,
                        frames: {
                            particle: base.frames?.particle ?? `${base.idString}_particle`,
                            residue: base.noResidue ? undefined : base.frames?.residue ?? `${base.idString}_residue`
                        },
                        lootTable: (base.hasLoot || base.spawnWithLoot) ? (base.lootTable ?? base.idString) : undefined
                    }
                ];
            }
        );

        return ([
            tree([{
                name: "Oak Tree",
                health: 180,
                scaleProps: {
                    spawnMin: 0.9,
                    spawnMax: 1.2,
                    destroy: 0.75
                },
                spawnHitbox: new CircleHitbox(8.5),
                rotationMode: RotationMode.Full,
                hitbox: new CircleHitbox(3.5),
                variations: 6
            }]),

            tree([{
                name: "Small Oak Tree",
                health: 180,
                scaleProps: {
                    spawnMin: 0.9,
                    spawnMax: 1.2,
                    destroy: 0.75
                },
                spawnHitbox: new CircleHitbox(8.5),
                rotationMode: RotationMode.Full,
                hitbox: new CircleHitbox(3.5),
                variations: 3,
                zIndex: ZIndexes.ObstaclesLayer4,
                frames: {
                    particle: "oak_tree_particle",
                    residue: "oak_tree_residue"
                }
            }]),

            tree([{
                name: "Dormant Oak Tree",
                health: 120,
                scaleProps: {
                    spawnMin: 0.9,
                    spawnMax: 1.1,
                    destroy: 0.75
                },
                spawnHitbox: new CircleHitbox(8.5),
                rotationMode: RotationMode.Full,
                hitbox: new CircleHitbox(2.5),
                variations: 2,
                allowFlyOver: FlyoverPref.Never,
                zIndex: ZIndexes.ObstaclesLayer4
            }]),

            tree([{
                name: "Maple Tree",
                health: 290,
                scaleProps: {
                    spawnMin: 0.9,
                    spawnMax: 1.2,
                    destroy: 0.75
                },
                spawnHitbox: new CircleHitbox(20),
                rotationMode: RotationMode.Full,
                hitbox: new CircleHitbox(5.5),
                variations: 3,
                allowFlyOver: FlyoverPref.Never
            }]),

            tree([{
                name: "Pine Tree",
                health: 180,
                scaleProps: {
                    spawnMin: 0.9,
                    spawnMax: 1.1,
                    destroy: 0.75
                },
                hitbox: new CircleHitbox(2.5),
                spawnHitbox: new CircleHitbox(8.5),
                rotationMode: RotationMode.Full,
                allowFlyOver: FlyoverPref.Never
            }]),

            tree([{
                name: "Birch Tree",
                health: 240,
                scaleProps: {
                    spawnMin: 0.9,
                    spawnMax: 1.1,
                    destroy: 0.75
                },
                hitbox: new CircleHitbox(3.5),
                spawnHitbox: new CircleHitbox(8.5),
                rotationMode: RotationMode.Full,
                variations: 2,
                allowFlyOver: FlyoverPref.Never
            }]),

            ...withWinterVariation([
                {
                    idString: "oil_tank",
                    name: "Oil Tank",
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
                    reflectBullets: true
                }, 2
            ]),

            {
                idString: "christmas_tree",
                name: "Christmas Tree",
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
                zIndex: ZIndexes.ObstaclesLayer4,
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
                material: "stone",
                health: 550,
                scale: {
                    spawnMin: 0.9,
                    spawnMax: 1.1,
                    destroy: 0.5
                },
                spawnMode: MapObjectSpawnMode.River,
                zIndex: ZIndexes.UnderwaterPlayers - 1,
                hitbox: new CircleHitbox(8),
                spawnHitbox: new CircleHitbox(9),
                rotationMode: RotationMode.Full,
                variations: 5,
                particleVariations: 2
            },
            {
                idString: "clearing_boulder",
                name: "Clearing Boulder",
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
                material: "pumpkin",
                health: 100,
                scale: {
                    spawnMin: 0.9,
                    spawnMax: 1.1,
                    destroy: 0.5
                },
                hitbox: new CircleHitbox(1.83),
                spawnHitbox: new CircleHitbox(2),
                rotationMode: RotationMode.Full,
                allowFlyover: FlyoverPref.Always,
                frames: {
                    particle: "plumpkin_particle"
                },
                weaponSwap: true
            },
            {
                idString: "plumpkin",
                name: "Plumpkin",
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
            ...withWinterVariation([
                {
                    idString: "flint_stone",
                    name: "Flint Stone",
                    material: "stone",
                    health: 200,
                    impenetrable: true,
                    hasLoot: true,
                    scale: {
                        spawnMin: 1,
                        spawnMax: 1,
                        destroy: 0.5
                    },
                    spawnMode: MapObjectSpawnMode.GrassAndSand,
                    hitbox: RectangleHitbox.fromRect(6.1, 6.1),
                    rotationMode: RotationMode.None,
                    particleVariations: 2
                }
            ]),
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
                particleVariations: 2,
                zIndex: ZIndexes.ObstaclesLayer3
            },
            {
                idString: "vibrant_bush",
                name: "Vibrant Bush",
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
                idString: "detector_walls",
                name: "Detector Walls",
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
            ...withWinterVariation(
                [
                    crate(
                        {
                            idString: "regular_crate",
                            name: "Regular Crate",
                            rotationMode: RotationMode.Binary,
                            frames: {
                                particle: "crate_particle",
                                residue: "regular_crate_residue"
                            }
                        }
                    ), 6
                ],
                [
                    crate(
                        {
                            idString: "flint_crate",
                            name: "Flint Crate",
                            rotationMode: RotationMode.None,
                            hideOnMap: true
                        }
                    ), 6
                ],
                [
                    crate(
                        {
                            idString: "aegis_crate",
                            name: "AEGIS Crate",
                            rotationMode: RotationMode.None,
                            hideOnMap: true
                        }
                    ), 6
                ],
                [
                    crate(
                        {
                            idString: "grenade_crate",
                            name: "Grenade Crate",
                            hitbox: RectangleHitbox.fromRect(6.5, 6.3),
                            rotationMode: RotationMode.None,
                            allowFlyover: FlyoverPref.Always
                        }
                    ), 3
                ],
                [
                    crate(
                        {
                            idString: "melee_crate",
                            name: "Melee Crate",
                            hitbox: RectangleHitbox.fromRect(6.5, 6.3),
                            rotationMode: RotationMode.None,
                            allowFlyover: FlyoverPref.Always
                        }
                    )
                ]
            ),
            crate(
                {
                    idString: "hazel_crate",
                    name: "Hazel Crate",
                    rotationMode: RotationMode.Binary,
                    health: 1700,
                    frames: {
                        particle: "hazel_crate_particle",
                        residue: "hazel_crate_residue"
                    }
                }
            ),
            {
                [inheritFrom]: "regular_crate",
                idString: "frozen_crate",
                name: "Frozen Crate",
                material: "ice",
                health: 1000,
                variations: 2,
                frames: {
                    residue: "regular_crate_residue",
                    particle: "window_particle"
                },
                hideOnMap: true
            },
            ...withWinterVariation([
                {
                    idString: "ammo_crate",
                    name: "Ammo Crate",
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
                    }
                }, 2
            ]),
            {
                idString: "hq_desk_left",
                name: "Headquarters Desk",
                material: "wood",
                health: 120,
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
                lootTable: "small_drawer",
                frames: {
                    particle: "headquarters_desk_particle"
                }
            },
            {
                idString: "hq_desk_right",
                name: "Headquarters Desk",
                material: "wood",
                health: 120,
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
                lootTable: "small_drawer",
                frames: {
                    particle: "headquarters_desk_particle"
                }
            },
            {
                idString: "square_desk",
                name: "Square Desk",
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
                material: "piano",
                health: 350,
                hitSoundVariations: 8, // blus
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
            ...withWinterVariation([
                {
                    idString: "tear_gas_crate",
                    name: "Tear Gas Crate",
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
                    particlesOnDestroy: {
                        type: "tear_gas_particle",
                        count: 10,
                        deployAnimation: {
                            duration: 4000,
                            staggering: {
                                delay: 300,
                                initialAmount: 2
                            }
                        },
                        spawnRadius: 15
                    },
                    additionalDestroySounds: ["smoke_grenade"]
                }
            ]),
            ...withWinterVariation([
                {
                    idString: "barrel",
                    name: "Barrel",
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
                    reflectBullets: true
                }, 3
            ],
            [
                {
                    idString: "super_barrel",
                    name: "Super Barrel",
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
                    reflectBullets: true
                }, 3
            ]),
            {
                idString: "propane_tank",
                name: "Propane Tank",
                material: "metal_light",
                health: 80,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.95
                },
                reflectBullets: true,
                hitbox: new CircleHitbox(2.5),
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
                material: "metal_light",
                health: 10000,
                indestructible: true,
                reflectBullets: true,
                hitbox: RectangleHitbox.fromRect(8.7, 8.7),
                spawnHitbox: RectangleHitbox.fromRect(10, 10),
                rotationMode: RotationMode.None,
                hideOnMap: true,
                role: ObstacleSpecialRoles.Activatable,
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
                material: "crate",
                health: 150,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.5
                },
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(8.7, 8.7)
                ),
                spawnHitbox: RectangleHitbox.fromRect(10, 10),
                hideOnMap: true,
                rotationMode: RotationMode.None,
                hasLoot: true
            },
            {
                idString: "gold_airdrop_crate",
                name: "Gold Airdrop Crate",
                material: "crate",
                health: 170,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.5
                },
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(8.7, 8.7)
                ),
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
                zIndex: ZIndexes.ObstaclesLayer4,
                allowFlyover: FlyoverPref.Never,
                hasLoot: true
            },
            ...withWinterVariation([
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
                }, 3
            ]),
            gift(["red"]),
            gift(["green"]),
            gift(["blue"]),
            gift(["purple"]),
            gift(["black", true]),
            {
                idString: "hq_large_cart",
                name: "Large Cart",
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
            houseWall([1], { hitbox: RectangleHitbox.fromRect(9, 2) }),
            houseWall([2], { hitbox: RectangleHitbox.fromRect(20.86, 2) }),
            houseWall([3], { hitbox: RectangleHitbox.fromRect(11.4, 2) }),
            houseWall([4], { hitbox: RectangleHitbox.fromRect(21.4, 2) }),
            houseWall([5], { hitbox: RectangleHitbox.fromRect(16, 2) }),
            houseWall([6], { hitbox: RectangleHitbox.fromRect(15.1, 2) }),
            houseWall([7], { hitbox: RectangleHitbox.fromRect(20.6, 2) }),
            houseWall([8], { hitbox: RectangleHitbox.fromRect(10.7, 2) }),
            houseWall([9], { hitbox: RectangleHitbox.fromRect(17.7, 2) }),
            houseWall([10], { hitbox: RectangleHitbox.fromRect(20.6, 2) }),
            houseWall([11], { hitbox: RectangleHitbox.fromRect(11.6, 2) }),
            houseWall([12], { hitbox: RectangleHitbox.fromRect(16.2, 2) }),
            houseWall([14], { hitbox: RectangleHitbox.fromRect(17, 2) }),
            houseWall([15], { hitbox: RectangleHitbox.fromRect(12.1, 2) }),
            houseWall([16], { hitbox: RectangleHitbox.fromRect(10.5, 2) }),
            houseWall([17], { hitbox: RectangleHitbox.fromRect(22.5, 2) }),

            // small bunker special wall
            houseWall(
                [13, { color: 0x74858b, border: 0x23282a, particle: "hq_tp_wall_particle" }],
                { hitbox: RectangleHitbox.fromRect(9, 2) }
            ),

            // HQ walls (headquarters)
            hqWall(
                [1],
                { hitbox: RectangleHitbox.fromRect(11.4, 2) }
            ),
            hqWall(
                [2],
                { hitbox: RectangleHitbox.fromRect(21.05, 2) }
            ),
            hqWall(
                [3],
                { hitbox: RectangleHitbox.fromRect(9.1, 2) }
            ),
            hqWall(
                [4],
                { hitbox: RectangleHitbox.fromRect(16, 2.1) }
            ),
            hqWall(
                [5],
                { hitbox: RectangleHitbox.fromRect(11.2, 2) }
            ),
            hqWall(
                [6],
                { hitbox: RectangleHitbox.fromRect(39.2, 2) }
            ),
            hqWall(
                [7, true],
                { hitbox: RectangleHitbox.fromRect(3.2, 1.6) }
            ),
            hqWall(
                [8, true],
                { hitbox: RectangleHitbox.fromRect(3.5, 1.6) }
            ),
            hqWall(
                [9],
                { hitbox: RectangleHitbox.fromRect(21, 2.1) }
            ),

            lodgeWall(["1", 9.15]),
            lodgeWall(["2", 9.7]),
            lodgeWall(["3", 9.82]),
            lodgeWall(["4", 15.08]),
            lodgeWall(["5", 19.77]),
            lodgeWall(["6", 20.44]),
            lodgeWall(["7", 26.15]),
            lodgeWall(["8", 27.03]),
            {
                idString: "lodge_secret_room_wall",
                name: "Lodge Secret Room Wall",
                material: "wood",
                hideOnMap: true,
                noResidue: true,
                health: 100,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.95
                },
                hitbox: RectangleHitbox.fromRect(17.62, 1.91),
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                frames: {
                    particle: "lodge_wall_particle"
                },
                role: ObstacleSpecialRoles.Wall
            },

            tentWall([1, "red"]),
            tentWall([2, "green"]),
            tentWall([3, "blue"]),
            tentWall([4, "orange"]),
            tentWall([5, "purple"]),

            bigTentWall([1, "red"]),
            bigTentWall([2, "green"]),
            bigTentWall([3, "blue"]),
            bigTentWall([4, "orange"]),

            portaPottyWall(["Porta Potty Back Wall", "porta_potty_wall_particle", {
                color: 0x1c71d8, borderColor: 0x0d3565
            }], { hitbox: RectangleHitbox.fromRect(12.8, 1.6) }),

            portaPottyWall(["Porta Potty Front Wall", "porta_potty_wall_particle", {
                color: 0x1c71d8, borderColor: 0x0d3565
            }], { hitbox: RectangleHitbox.fromRect(3, 1.6) }),

            portaPottyWall(["Outhouse Back Wall", "outhouse_wall_particle", {
                color: 0x6e4d2f, borderColor: 0x261b14
            }], { hitbox: RectangleHitbox.fromRect(11.71, 1.81) }),

            portaPottyWall(["Outhouse Side Wall", "outhouse_wall_particle", {
                color: 0x6e4d2f, borderColor: 0x261b14
            }], { hitbox: RectangleHitbox.fromRect(1.81, 19.2) }),

            portaPottyWall(["Outhouse Front Wall", "outhouse_wall_particle", {
                color: 0x6e4d2f, borderColor: 0x261b14
            }], { hitbox: RectangleHitbox.fromRect(2.8, 1.81) }),

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
                hitbox: RectangleHitbox.fromRect(9.1, 6.45, Vec.create(0, -0.2)),
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                frames: {
                    particle: "metal_particle"
                },
                reflectBullets: true
            },
            {
                idString: "water_cooler",
                name: "Cool Water",
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
                idString: "fireplace",
                name: "Fireplace",
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
                role: ObstacleSpecialRoles.Activatable,
                allowFlyover: FlyoverPref.Never,
                frames: {
                    particle: "metal_particle"
                },
                reflectBullets: true
            },
            {
                idString: "vending_machine",
                name: "Vending Machine",
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
                role: ObstacleSpecialRoles.Door,
                hingeOffset: Vec.create(-5.5, 0),
                zIndex: ZIndexes.ObstaclesLayer3,
                frames: {
                    particle: "furniture_particle"
                }
            },
            {
                idString: "barn_door",
                name: "Barn Door",
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
                role: ObstacleSpecialRoles.Door,
                hingeOffset: Vec.create(-5.5, 0),
                zIndex: ZIndexes.ObstaclesLayer3,
                frames: {
                    particle: "furniture_particle"
                }
            },
            {
                idString: "aegis_golden_case",
                name: "Golden Aegis Case",
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
            ...withWinterVariation([
                {
                    idString: "dumpster",
                    name: "Dumpster",
                    material: "iron",
                    reflectBullets: true,
                    hasLoot: true,
                    health: 300,
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
                    allowFlyover: FlyoverPref.Always
                }, 2
            ],
            [
                {
                    idString: "trash_bag",
                    name: "Trash Bag",
                    material: "trash_bag",
                    health: 70,
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
                        particle: "flint_stone_particle"
                    },
                    particleVariations: 2
                }
            ]),
            {
                idString: "hay_bale",
                name: "Hay Bale",
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
                role: ObstacleSpecialRoles.Door,
                hingeOffset: Vec.create(-5.5, 0),
                frames: {
                    particle: "furniture_particle"
                }
            },
            {
                idString: "glass_door",
                name: "Glass Door",
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
                role: ObstacleSpecialRoles.Door,
                automatic: true,
                hideWhenOpen: true,
                operationStyle: "slide",
                slideFactor: 0.9,
                frames: {
                    particle: "window_particle"
                }
            },
            // TODO Combine this with glass_door (this is the same as glass_door but the image is in px)
            {
                idString: "bigger_glass_door",
                name: "Bigger Glass Door",
                material: "glass",
                doorSound: "auto_door",
                health: 100,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 1
                },
                hitbox: RectangleHitbox.fromRect(10.86, 1.14),
                rotationMode: RotationMode.Limited,
                noResidue: true,
                role: ObstacleSpecialRoles.Door,
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
                role: ObstacleSpecialRoles.Door,
                hideWhenOpen: true,
                operationStyle: "slide",
                slideFactor: 0.9,
                animationDuration: 500,
                frames: {
                    base: "auto_door"
                },
                tint: 0x401a1a
            },
            {
                idString: "blue_metal_auto_door",
                name: "Blue Metal Automatic Door",
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
                role: ObstacleSpecialRoles.Door,
                hideWhenOpen: true,
                operationStyle: "slide",
                slideFactor: 0.9,
                animationDuration: 500,
                frames: {
                    base: "auto_door"
                },
                tint: 0x1a1a40
            },
            {
                idString: "metal_auto_door",
                name: "Metal Automatic Door",
                material: "metal_heavy",
                doorSound: "metal_auto_door",
                health: 100,
                indestructible: true,
                reflectBullets: true,
                hitbox: RectangleHitbox.fromRect(10.5, 1.62),
                rotationMode: RotationMode.Limited,
                noResidue: true,
                role: ObstacleSpecialRoles.Door,
                automatic: true,
                hideWhenOpen: true,
                operationStyle: "slide",
                slideFactor: 0.9,
                animationDuration: 500,
                frames: {
                    base: "auto_door",
                    particle: "metal_auto_door_particle"
                },
                tint: 0x404040
            },
            {
                idString: "metal_door",
                name: "Metal Door",
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
                role: ObstacleSpecialRoles.Door,
                hingeOffset: Vec.create(-5.5, 0),
                //   zIndex: ZIndexes.ObstaclesLayer3,
                frames: {
                    particle: "metal_particle"
                }
            },
            {
                idString: "vault_door",
                name: "Vault Door",
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                reflectBullets: true,
                hitbox: RectangleHitbox.fromRect(14.2, 1.9, Vec.create(1.1, -0.4)),
                rotationMode: RotationMode.Limited,
                role: ObstacleSpecialRoles.Door,
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
                idString: "tent_window",
                name: "Tent Window",
                material: "wood",
                indestructible: true,
                noBulletCollision: true,
                noMeleeCollision: true,
                health: 100,
                role: ObstacleSpecialRoles.Window,
                invisible: true,
                noHitEffect: true,
                hitbox: RectangleHitbox.fromRect(7.6, 2.5),
                rotationMode: RotationMode.Limited,
                zIndex: ZIndexes.ObstaclesLayer3,
                frames: { }
            },
            {
                idString: "windowed_vault_door",
                name: "Windowed Vault Door",
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                reflectBullets: true,
                hitbox: RectangleHitbox.fromRect(12.83, 1.9, Vec.create(0, -0.4)),
                rotationMode: RotationMode.Limited,
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
                allowFlyover: FlyoverPref.Always,
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
                material: "wood",
                health: 100,
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
                material: "iron",
                health: 125,
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
                zIndex: ZIndexes.ObstaclesLayer4,
                frames: {
                    particle: "couch_part_particle",
                    residue: "brown_couch_part_residue"
                }
            },
            {
                idString: "couch_end_right",
                name: "Couch Part",
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
                zIndex: ZIndexes.ObstaclesLayer2
            },
            {
                idString: "small_table",
                name: "Small Table",
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
                role: ObstacleSpecialRoles.Window
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
                allowFlyover: FlyoverPref.Never,
                rotationMode: RotationMode.Limited,
                role: ObstacleSpecialRoles.Window
            },
            {
                idString: "window2",
                name: "Window",
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
                role: ObstacleSpecialRoles.Window
            },
            {
                idString: "bulletproof_window",
                name: "Bulletproof Window",
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
                hitbox: RectangleHitbox.fromRect(21.7, 1.5, Vec.create(0, -0.4)),
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
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
                role: ObstacleSpecialRoles.Door,
                zIndex: ZIndexes.ObstaclesLayer3,
                hingeOffset: Vec.create(-5.5, 0)
            },
            {
                idString: "outhouse_door",
                name: "Outhouse Door",
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
                role: ObstacleSpecialRoles.Door,
                zIndex: ZIndexes.ObstaclesLayer3,
                hingeOffset: Vec.create(-4.96, 0),
                frames: {
                    particle: "outhouse_wall_particle"
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
                hitbox: RectangleHitbox.fromRect(19.2, 1.9, Vec.create(0, 1.25)),
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                role: ObstacleSpecialRoles.Wall,
                zIndex: ZIndexes.ObstaclesLayer2,
                frames: {
                    particle: "porta_potty_wall_particle"
                }
            },
            {
                idString: "porta_potty_sink_wall_fall",
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
                hitbox: RectangleHitbox.fromRect(19.2, 1.9, Vec.create(0, 1.25)),
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                role: ObstacleSpecialRoles.Wall,
                zIndex: ZIndexes.ObstaclesLayer2,
                frames: {
                    base: "porta_potty_sink_wall",
                    particle: "porta_potty_particle_fall"
                }
            },
            {
                idString: "outhouse_toilet_paper_wall",
                name: "Outhouse Toilet Paper Wall",
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
                role: ObstacleSpecialRoles.Wall,
                zIndex: ZIndexes.ObstaclesLayer2,
                frames: {
                    particle: "outhouse_wall_particle"
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
                hitbox: RectangleHitbox.fromRect(19.2, 1.7, Vec.create(0, -1.15)),
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                role: ObstacleSpecialRoles.Wall,
                zIndex: ZIndexes.ObstaclesLayer2,
                frames: {
                    particle: "porta_potty_wall_particle"
                }
            },
            {
                idString: "hq_toilet_paper_wall",
                name: "Headquarters Toilet Paper Wall",
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
                role: ObstacleSpecialRoles.Wall,
                zIndex: ZIndexes.ObstaclesLayer2,
                frames: {
                    particle: "hq_tp_wall_particle"
                }
            },
            innerConcreteWall([1, RectangleHitbox.fromRect(10.8, 1.9)]),
            innerConcreteWall([2, RectangleHitbox.fromRect(36.7, 1.9)]),
            innerConcreteWall([3, RectangleHitbox.fromRect(39.14, 1.9)]),
            innerConcreteWall([4, RectangleHitbox.fromRect(47.14, 1.9)]),
            {
                idString: "bombed_armory_vault_wall",
                material: "stone",
                hitbox: RectangleHitbox.fromRect(15, 2.04),
                health: 500,
                noResidue: true,
                hideOnMap: true,
                impenetrable: true,
                rotationMode: RotationMode.Limited,
                role: ObstacleSpecialRoles.Wall,
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
                idString: "small_refinery_barrel",
                name: "Small Refinery Barrel",
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
            ...withWinterVariation([
                {
                    idString: "large_refinery_barrel",
                    name: "Large Refinery Barrel",
                    material: "metal_heavy",
                    health: 3500,
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
                    }
                }
            ]),
            {
                idString: "smokestack",
                name: "Smokestack",
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
            gunMount(["mcx_spear", "gun"]),
            gunMount(["stoner_63", "gun"]),
            gunMount(["mini14", "gun"]),
            gunMount(["hp18", "gun"]),
            gunMount(["m590m", "gun"]),
            gunMount(["maul", "melee"], {
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(5.05, 1, Vec.create(0, -1.3)),
                    RectangleHitbox.fromRect(0.8, 3, Vec.create(-1.55, 0.35)),
                    RectangleHitbox.fromRect(0.8, 3, Vec.create(1.55, 0.35))
                )
            }),
            gunMount(["dual_rsh12", "gun", true], {
                frames: {
                    particle: "gun_mount_dual_rsh12_particle",
                    residue: "gun_mount_dual_rsh12_residue"
                },
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(6.5, 0.99, Vec.create(0, -1.36)),
                    RectangleHitbox.fromRect(5.7, 2.5, Vec.create(0, 0.4))
                )
            }),
            {
                idString: "truck",
                name: "Truck",
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
                idString: "trailer",
                name: "Trailer",
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
            controlPanel(["control_panel", "Control Panel"], {
                role: ObstacleSpecialRoles.Activatable,
                sound: {
                    names: ["button_press", "puzzle_solved"]
                },
                frames: {
                    activated: "control_panel_activated"
                }
            }),
            controlPanel(["control_panel2", "Control Panel"]),
            controlPanel(["recorder", "Recorder"], {
                hitbox: RectangleHitbox.fromRect(8.7, 6.34),
                indestructible: true,
                role: ObstacleSpecialRoles.Activatable,
                noInteractMessage: true,
                requiredItem: "heap_sword", // womp womp
                sound: {
                    names: ["speaker_start", "speaker_start"]
                },
                frames: {
                    activated: "recorder_used"
                }
            }),
            controlPanel(["control_panel_small", "Small Control Panel"], {
                hitbox: RectangleHitbox.fromRect(7.5, 8)
            }),
            {
                idString: "small_desk",
                name: "Small Desk",
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
            ...withWinterVariation([
                {
                    idString: "generator",
                    name: "Generator",
                    material: "metal_heavy",
                    health: 200,
                    indestructible: true,
                    reflectBullets: true,
                    rotationMode: RotationMode.Limited,
                    frames: {
                        particle: "super_barrel_particle"
                    },
                    role: ObstacleSpecialRoles.Activatable,
                    sound: {
                        name: "generator_starting",
                        maxRange: 412,
                        falloff: 2
                    },
                    emitParticles: true,
                    requiredItem: "gas_can",
                    hitbox: RectangleHitbox.fromRect(9, 7)
                }
            ]),

            {
                idString: "ship_oil_tank",
                name: "Ship Oil Tank",
                material: "metal_heavy",
                health: 200,
                indestructible: true,
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                hitbox: RectangleHitbox.fromRect(28, 14)
            },
            ...withWinterVariation([
                {
                    idString: "forklift",
                    name: "Forklift",
                    material: "metal_heavy",
                    health: 1000,
                    indestructible: true,
                    reflectBullets: true,
                    hitbox: new GroupHitbox(
                        RectangleHitbox.fromRect(8.15, 17.3, Vec.create(0, -3.8)),
                        RectangleHitbox.fromRect(9.45, 10.6, Vec.create(0, -4.9))
                    ),
                    zIndex: ZIndexes.ObstaclesLayer1 - 2,
                    rotationMode: RotationMode.Limited
                }
            ]),
            {
                idString: "pallet",
                name: "Pallet",
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

            // --------------------------------------------
            // variations no work for some reason
            // (someone fix pls uwu)
            // --------------------------------------------
            {
                idString: "pipe_1",
                name: "Pipe",
                material: "metal_light",
                health: 200,
                indestructible: true,
                hitbox: RectangleHitbox.fromRect(0, 0),
                zIndex: ZIndexes.ObstaclesLayer4,
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Always,
                noBulletCollision: true,
                noMeleeCollision: true,
                noCollisions: true
            },
            {
                idString: "pipe_2",
                name: "Pipe",
                material: "metal_light",
                health: 200,
                indestructible: true,
                hitbox: RectangleHitbox.fromRect(0, 0),
                zIndex: ZIndexes.ObstaclesLayer4,
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Always,
                noBulletCollision: true,
                noMeleeCollision: true,
                noCollisions: true
            },
            {
                idString: "pipe_3",
                name: "Pipe",
                material: "metal_light",
                health: 200,
                indestructible: true,
                hitbox: RectangleHitbox.fromRect(0, 0),
                zIndex: ZIndexes.ObstaclesLayer4,
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Always,
                noBulletCollision: true,
                noMeleeCollision: true,
                noCollisions: true
            },
            {
                idString: "pipe_4",
                name: "Pipe",
                material: "metal_light",
                health: 200,
                indestructible: true,
                hitbox: RectangleHitbox.fromRect(0, 0),
                zIndex: ZIndexes.ObstaclesLayer4,
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Always,
                noCollisions: true
            },
            // --------------------------------------------
            ...withWinterVariation([
                {
                    idString: "bollard",
                    name: "Bollard",
                    material: "metal_heavy",
                    health: 1000,
                    indestructible: true,
                    reflectBullets: true,
                    hitbox: new GroupHitbox(
                        RectangleHitbox.fromRect(8.2, 9.2, Vec.create(-0.36, 0)),
                        new CircleHitbox(3.45, Vec.create(1, 0))
                    ),
                    rotationMode: RotationMode.Limited,
                    allowFlyover: FlyoverPref.Always
                }, 2
            ]),
            {
                idString: "barrier",
                name: "Barrier",
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
                idString: "house_column",
                name: "House Column",
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
                tint: 0xa3917b,
                frames: {
                    base: "column",
                    particle: "wall_particle"
                },
                role: ObstacleSpecialRoles.Wall
            },
            {
                idString: "metal_column",
                name: "Metal Column",
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
                role: ObstacleSpecialRoles.Wall
            },
            {
                idString: "potted_plant",
                name: "Potted Plant",
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
                material: "appliance",
                health: 105,
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
            ...withWinterVariation([
                {
                    idString: "sandbags",
                    name: "Sandbags",
                    material: "sand",
                    health: 1000,
                    indestructible: true,
                    hitbox: RectangleHitbox.fromRect(13.1, 7.7),
                    rotationMode: RotationMode.Limited
                }
            ]),
            {
                idString: "gun_locker",
                name: "Gun Locker",
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
                material: "fence",
                health: 80,
                indestructible: false,
                hitbox: RectangleHitbox.fromRect(1, 10),
                rotationMode: RotationMode.Limited
            },
            ...withWinterVariation([
                {
                    idString: "gun_case",
                    name: "Gun Case",
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
                    hasLoot: true
                }, 3
            ]),
            ...withWinterVariation([
                {
                    idString: "cooler",
                    name: "Cooler",
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
                    hasLoot: true
                }
            ]),
            {
                idString: "m1117",
                name: "M1117",
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
            ...withWinterVariation([
                {
                    idString: "fire_hatchet_case",
                    name: "Fire Hatchet Case",
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
                    reflectBullets: true
                }
            ]),
            {
                idString: "ice_pick_case",
                name: "Ice Pick Case",
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
                material: "stone",
                health: 1000,
                indestructible: true,
                variations: 2,
                role: ObstacleSpecialRoles.Activatable,
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
            mobileHomeWall(["1"], { hitbox: RectangleHitbox.fromRect(7.5, 1.68) }),
            mobileHomeWall(["2"], { hitbox: RectangleHitbox.fromRect(20.6, 1.68) }),
            mobileHomeWall(["3"], { hitbox: RectangleHitbox.fromRect(20.5, 1.68) }),
            mobileHomeWall(["4"], { hitbox: RectangleHitbox.fromRect(10.65, 1.68) }),
            kitchenUnit(["1"], {
                hitbox: RectangleHitbox.fromRect(6.61, 6.61, Vec.create(0, -0.45)),
                frames: {
                    particle: "furniture_particle",
                    residue: "small_drawer_residue"
                }
            }),
            kitchenUnit(["2"], {
                hitbox: RectangleHitbox.fromRect(6.61, 6.61),
                frames: {
                    particle: "furniture_particle",
                    residue: "small_drawer_residue"
                }
            }),
            kitchenUnit(["3"], {
                hitbox: RectangleHitbox.fromRect(9.45, 6.61, Vec.create(0, -0.48)),
                frames: {
                    particle: "furniture_particle",
                    residue: "sink_residue"
                }
            }),
            ...withWinterVariation([
                {
                    idString: "tire",
                    name: "Tire",
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
                        particle: "flint_stone_particle"
                    },
                    particleVariations: 2
                }, 2
            ]),
            {
                idString: "mobile_home_window",
                name: "Mobile Home Window",
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
                role: ObstacleSpecialRoles.Window,
                frames: {
                    particle: "window_particle"
                }
            },
            {
                idString: "lux_crate",
                name: "Lux Crate",
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
            ...withWinterVariation([
                {
                    idString: "grenade_box",
                    name: "Grenade Box",
                    material: "cardboard",
                    health: 60,
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
                    }
                }, 2
            ]),
            {
                idString: "lily_pad",
                name: "Lily Pad",
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
                material: "wood",
                health: 150,
                scale: {
                    spawnMin: 1,
                    spawnMax: 1,
                    destroy: 0.7
                },
                hitbox: RectangleHitbox.fromRect(12, 7, Vec.create(0, -0.1)),
                rotationMode: RotationMode.None,
                zIndex: ZIndexes.UnderwaterPlayers - 1,
                hasLoot: true,
                hideOnMap: true,
                frames: {
                    particle: "chest_particle"
                },
                spawnMode: MapObjectSpawnMode.River,
                allowFlyover: FlyoverPref.Always
            },
            {
                idString: "bunker_entrance",
                name: "Bunker Entrance",
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
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                role: ObstacleSpecialRoles.Stair,
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
            /*   {
                idString: "blue_house_stair",
                name: "Blue House Stair",
                material: "metal_light",
                health: 1000,
                indestructible: true,
                role: ObstacleSpecialRoles.Stair,
                activeEdges: {
                    high: 1,
                    low: 3
                },
                invisible: true,
                hitbox: RectangleHitbox.fromRect(9, 11),
                frames: {
                    particle: "metal_particle"
                },
                rotationMode: RotationMode.Limited
            },
            {
                idString: "blue_house_stair_walls", // to block -1 layer collision funnies
                name: "Blue House Stair",
                material: "metal_light",
                health: 1000,
                indestructible: true,
                activeEdges: {
                    high: 1,
                    low: 3
                },
                invisible: true,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(10, 1.7, Vec.create(0, -6)),
                    RectangleHitbox.fromRect(10, 1.7, Vec.create(0, 6))
                ),
                frames: {
                    particle: "metal_particle"
                },
                rotationMode: RotationMode.Limited
            }, */
            {
                idString: "hq_stair",
                name: "HQ Stair",
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                invisible: true,
                role: ObstacleSpecialRoles.Stair,
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
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                invisible: true,
                role: ObstacleSpecialRoles.Stair,
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
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                invisible: true,
                role: ObstacleSpecialRoles.Stair,
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
                idString: "fire_exit_stair",
                name: "Fire Exit Stair",
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                role: ObstacleSpecialRoles.Stair,
                activeEdges: {
                    high: 0,
                    low: 2
                },
                hitbox: RectangleHitbox.fromRect(13.8, 27.8),
                frames: {
                    particle: "metal_particle"
                },
                rotationMode: RotationMode.Limited,
                zIndex: ZIndexes.BuildingsFloor
            },
            {
                idString: "lodge_stair",
                name: "Lodge Stair",
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                invisible: true,
                role: ObstacleSpecialRoles.Stair,
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
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                invisible: true,
                role: ObstacleSpecialRoles.Stair,
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
                idString: "fire_exit_railing",
                name: "Fire exit railing",
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
                idString: "headquarters_main_desk",
                name: "Headquarters Main Desk",
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
                role: ObstacleSpecialRoles.Activatable,
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
            // --------------------------------------------------------------------------------------------
            {
                idString: "test_wall",
                name: "Test Wall",
                material: "wood",
                health: 200,
                hitbox: RectangleHitbox.fromRect(20, 2),
                rotationMode: RotationMode.Limited,
                wall: {
                    color: 0xffaa00,
                    borderColor: 0xff0000
                }
            },
            {
                idString: "pole",
                name: "Pole",
                material: "fence",
                health: 150,
                scale: {
                    spawnMin: 0.9,
                    spawnMax: 1.1,
                    destroy: 0.5
                },
                noResidue: true,
                role: ObstacleSpecialRoles.Wall,
                spawnMode: MapObjectSpawnMode.GrassAndSand,
                hitbox: new CircleHitbox(1.1),
                rotationMode: RotationMode.None,
                frames: {
                    particle: "metal_particle"
                }
            }
            /* {
                idString: "humvee",
                name: "Humvee",
                material: "metal_heavy",
                health: 1000,
                indestructible: true,
                reflectBullets: true,
                hitbox: new GroupHitbox(
                    RectangleHitbox.fromRect(17, 40, Vec.create(0, -0.4)), // Body
                    RectangleHitbox.fromRect(20.85, 8, Vec.create(0, -14)), // Back wheels
                    RectangleHitbox.fromRect(20.8, 7.5, Vec.create(0, 15.5)), // Front wheels
                    RectangleHitbox.fromRect(2.5, 1, Vec.create(6.9, -20.5)), // Back exhaust
                    RectangleHitbox.fromRect(3.6, 1, Vec.create(-4.15, 20.5)),
                    RectangleHitbox.fromRect(3.6, 1, Vec.create(4.15, 20.5)),
                    RectangleHitbox.fromRect(23.35, 0.9, Vec.create(0, 8.6)) // Front of hood
                ),
                rotationMode: RotationMode.Limited,
                allowFlyover: FlyoverPref.Never,
                frames: {
                    particle: "metal_particle"
                }
            }, */
        ] satisfies readonly Missing[]).map(
            o => {
                const obj = o as Mutable<ObstacleDefinition>;
                if (o.role !== undefined) obj[`is${ObstacleSpecialRoles[o.role] as keyof typeof ObstacleSpecialRoles}`] = true;
                if (o.variations !== undefined) obj.variationBits = Math.ceil(Math.log2(o.variations));
                return o;
            }
        ) as readonly Missing[];
    }
);
