import { version } from "../../package.json";
import type { ItemType, WeaponType } from "./definitions/loots";
import { GameMode } from "./schemas/misc";

const inventorySlotTypings = Object.freeze(["gun", "gun", "melee", "throwable"] as const);
export const GameConstants = {
    // !!!!! NOTE: Increase this every time a byte stream change is made between latest release and master
    // or a new item is added to a definition list
    protocolVersion: 77,
    tps: 40,
    gridSize: 32,
    maxPosition: 1924,
    objectMinScale: 0.15,
    objectMaxScale: 3,
    defaultMode: "normal" satisfies GameMode as GameMode,
    player: {
        radius: 2.25,
        baseSpeed: 0.03,
        defaultHealth: 100,
        maxAdrenaline: 100,
        maxShield: 100,
        maxInfection: 100,
        inventorySlotTypings,
        maxWeapons: inventorySlotTypings.length,
        maxPerks: 4,
        nameMaxLength: 16,
        defaultName: "Player",
        defaultSkin: "hazel_jumpsuit",
        killLeaderMinKills: 3,
        killCreditTimeoutMs: 12000,
        maxMouseDist: 256,
        reviveDurationMs: 8,
        reviveMaxDistSquared: 49,
        knockedOutDamageAmount: 1,
        knockedOutDamageIntervalMs: 500,
        buildingVisionSize: 20,
        emoteLimit: {
            triggerAmount: 10,
            triggerDurationMs: 5000,
            punishmentDurationMs: 5000
        },
        defaultModifiers: {
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
        },
        ice: {
            acceleration: 2.5,
            friction: 0.2,
            movingFriction: 0.45
        }
    },
    gas: {
        damageScaleFactor: 0.005, // Extra damage, linear per distance unit into the gas
        unscaledDamageDist: 12 // Don't scale damage for a certain distance into the gas
    },
    loot: {
        maxSpawnJitter: 0.7,
        drag: 0.003,
        iceDrag: 0.0008,
        radius: {
            "gun": 3.4,
            "ammo": 2,
            "melee": 3,
            "throwable": 3,
            "healingItem": 2.5,
            "armor": 3,
            "backpack": 3,
            "scope": 3,
            "skin": 3,
            "perk": 3
        } satisfies Record<ItemType, number>
    },
    defaultSpeedModifiers: {
        ["gun"]: 0.88,
        ["melee"]: 1,
        ["throwable"]: 0.92
    } satisfies Record<WeaponType, number>,
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
            ice: 1,
            water: 5
        }
    },
    explosionMaxDistSquared: 128 ** 2,
    trailPadding: 384,
    explosionRayDistance: 2,
};
console.log(JSON.stringify(GameConstants, null, 4));

export const GAME_VERSION = version;

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
    PlayerParticles,
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
    EquipOtherWeapon,
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
