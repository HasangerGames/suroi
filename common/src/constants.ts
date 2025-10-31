import type { ItemType, WeaponTypes } from "./definitions/loots";
import { type ModeName } from "./definitions/modes";
import { PlayerModifiers } from "./typings";
import { DefinitionType } from "./utils/objectDefinitions";

const inventorySlotTypings = Object.freeze([DefinitionType.Gun, DefinitionType.Gun, DefinitionType.Melee, DefinitionType.Throwable] as const);
export const GameConstants = {
    // !!!!! NOTE: Increase this every time a byte stream change is made between latest release and master
    // or a new item is added to a definition list
    protocolVersion: 70,
    tps: 40,
    gridSize: 32,
    maxPosition: 1924,
    objectMinScale: 0.15,
    objectMaxScale: 3,
    defaultMode: "halloween" satisfies ModeName as ModeName,
    player: {
        radius: 2.25,
        baseSpeed: 0.03,
        defaultHealth: 100,
        maxAdrenaline: 100,
        maxShield: 100,
        maxInfection: 100,
        inventorySlotTypings,
        maxWeapons: inventorySlotTypings.length,
        nameMaxLength: 16,
        defaultName: "Player",
        defaultSkin: "hazel_jumpsuit",
        killLeaderMinKills: 3,
        maxMouseDist: 256,
        reviveTime: 8,
        maxReviveDist: 5,
        bleedOutDPMs: 0.002, // === 2 dps
        maxPerkCount: 1,
        maxPerks: 4,
        buildingVisionSize: 20,
        rateLimitPunishmentTrigger: 10,
        emotePunishmentTime: 5000, // ms
        rateLimitInterval: 1000,
        combatLogTimeoutMs: 12000,
        defaultModifiers: (): PlayerModifiers => ({
            maxHealth: 1,
            maxAdrenaline: 1,
            maxShield: 1,
            baseSpeed: 1,
            size: 1,
            reload: 1,
            fireRate: 1,
            adrenDrain: 1,

            minAdrenaline: 0,
            hpRegen: 0,
            shieldRegen: 0
        })
    },
    gas: {
        damageScaleFactor: 0.005, // Extra damage, linear per distance unit into the gas
        unscaledDamageDist: 12 // Don't scale damage for a certain distance into the gas
    },
    lootSpawnMaxJitter: 0.7,
    lootRadius: {
        [DefinitionType.Gun]: 3.4,
        [DefinitionType.Ammo]: 2,
        [DefinitionType.Melee]: 3,
        [DefinitionType.Throwable]: 3,
        [DefinitionType.HealingItem]: 2.5,
        [DefinitionType.Armor]: 3,
        [DefinitionType.Backpack]: 3,
        [DefinitionType.Scope]: 3,
        [DefinitionType.Skin]: 3,
        [DefinitionType.Perk]: 3
    } satisfies Record<ItemType, number>,
    defaultSpeedModifiers: {
        [DefinitionType.Gun]: 0.88,
        [DefinitionType.Melee]: 1,
        [DefinitionType.Throwable]: 0.92
    } satisfies Record<WeaponTypes, number>,
    airdrop: {
        fallTime: 8000,
        flyTime: 30000,
        damage: 300
    },
    projectiles: {
        maxHeight: 5,
        gravity: 10,
        distanceToMouseMultiplier: 1.5,
        drag: {
            air: 0.7,
            ground: 3,
            water: 5
        }
    },
    explosionMaxDistSquared: 128 ** 2,
    trailPadding: 384,
    explosionRayDistance: 2
};

export enum ZIndexes {
    Ground,
    BuildingsFloor,
    Decals,
    DeadObstacles,
    DeathMarkers,
    Explosions,
    /**
     * This is the default layer for obstacles
     */
    ObstaclesLayer1,
    Loot,
    GroundedThrowables,
    ObstaclesLayer2,
    TeammateName,
    Bullets,
    DownedPlayers,
    Players,
    /**
     * bushes, tables etc
     */
    ObstaclesLayer3,
    AirborneThrowables,
    /**
     * trees
     */
    ObstaclesLayer4,
    BuildingsCeiling,
    /**
     * obstacles that should show on top of ceilings
     */
    ObstaclesLayer5,
    Emotes,
    Gas
}

export const Z_INDEX_COUNT = Object.keys(ZIndexes).length / 2; // account for double indexing

export enum Layer {
    Basement = -2,
    ToBasement = -1,
    Ground = 0,
    ToUpstairs = 1,
    Upstairs = 2
}

export const enum Layers {
    All,      // Collide with objects on all layers
    Adjacent, // Collide with objects on the same or adjacent layers
    Equal     // Only collide with objects on the same layer
}

export enum TeamMode {
    Solo = 1,
    Duo = 2,
    Squad = 4
}

export enum ObjectCategory {
    Player,
    Obstacle,
    DeathMarker,
    Loot,
    Building,
    Decal,
    Parachute,
    Projectile,
    SyncedParticle
}

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

export enum MapObjectSpawnMode {
    Grass,
    /**
     * Grass, beach and river banks.
     */
    GrassAndSand,
    River,
    Beach,
    Trail,
    Ring
}

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

export const enum AnimationType {
    None,
    Melee,
    Downed,
    ThrowableCook,
    ThrowableThrow,
    GunFire,
    GunFireAlt,
    GunClick,
    Revive
}

export const enum GasState {
    Inactive,
    Waiting,
    Advancing
}

export const enum FireMode {
    Single,
    Burst,
    Auto
}

export const enum InputActions {
    EquipItem,
    EquipLastItem,
    DropWeapon,
    DropItem,
    SwapGunSlots,
    LockSlot,
    UnlockSlot,
    ToggleSlotLock,
    Interact,
    Reload,
    Cancel,
    UseItem,
    Emote,
    MapPing,
    Loot,
    ExplodeC4
}

export const enum SpectateActions {
    BeginSpectating,
    SpectatePrevious,
    SpectateNext,
    SpectateSpecific,
    SpectateKillLeader,
    Report
}

export const enum PlayerActions {
    None,
    Reload,
    UseItem,
    Revive
}

export enum InventoryMessages {
    NotEnoughSpace,
    ItemAlreadyEquipped,
    BetterItemEquipped,
    CannotUseFlare
}
