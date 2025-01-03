import { Ammos } from "./definitions/ammos";
import { HealingItems } from "./definitions/healingItems";
import { type Mode } from "./definitions/modes";
import { Scopes } from "./definitions/scopes";
import { Throwables } from "./definitions/throwables";
import { freezeDeep } from "./utils/misc";
import { ItemType } from "./utils/objectDefinitions";

export const enum Constants {
    MAX_POSITION = 1924,
    MIN_OBJECT_SCALE = 0.15,
    MAX_OBJECT_SCALE = 3,
    PLAYER_NAME_MAX_LENGTH = 16
}

/* eslint-disable @typescript-eslint/prefer-literal-enum-member */
// the point of "derived" is to have them not be hardcoded

export const enum Derived {
    OBJECT_SCALE_DIFF = Constants.MAX_OBJECT_SCALE - Constants.MIN_OBJECT_SCALE,
    DOUBLE_MAX_POS = 2 * Constants.MAX_POSITION
}

export const DEFAULT_INVENTORY: Record<string, number> = Object.create(null) as Record<string, number>;

for (const item of [...HealingItems, ...Ammos, ...Scopes, ...Throwables]) {
    let amount = 0;

    switch (true) {
        case item.itemType === ItemType.Ammo && item.ephemeral: amount = Infinity; break;
        case item.itemType === ItemType.Scope && item.giveByDefault: amount = 1; break;
    }

    DEFAULT_INVENTORY[item.idString] = amount;
}

Object.freeze(DEFAULT_INVENTORY);

export const itemKeys: readonly string[] = Object.keys(DEFAULT_INVENTORY);
export const itemKeysLength = itemKeys.length;

const inventorySlotTypings = Object.freeze([ItemType.Gun, ItemType.Gun, ItemType.Melee, ItemType.Throwable] as const);
export const GameConstants = freezeDeep({
    // !!!!! NOTE: Increase this every time a bit stream change is made between latest release and master
    // or a new item is added to a definition list
    protocolVersion: 43,
    gridSize: 32,
    maxPosition: Constants.MAX_POSITION,
    modeName: "fall" satisfies Mode as Mode,
    player: {
        radius: 2.25,
        baseSpeed: 0.02655,
        defaultHealth: 100,
        maxAdrenaline: 100,
        inventorySlotTypings,
        maxWeapons: inventorySlotTypings.length,
        nameMaxLength: Constants.PLAYER_NAME_MAX_LENGTH,
        defaultName: "Player",
        defaultSkin: "hazel_jumpsuit",
        killLeaderMinKills: 3,
        maxMouseDist: 256,
        reviveTime: 8,
        maxReviveDist: 5,
        bleedOutDPMs: 0.002, // === 2 dps
        maxPerkCount: 1,
        rateLimitPunishmentTrigger: 10,
        emotePunishmentTime: 5000, // ms
        rateLimitInterval: 1000
    },
    gas: {
        damageScaleFactor: 0.005, // Extra damage, linear per distance unit into the gas
        unscaledDamageDist: 12 // Don't scale damage for a certain distance into the gas
    },
    lootSpawnDistance: 0.7,
    airdrop: {
        fallTime: 8000,
        flyTime: 30000,
        damage: 300
    },
    riverPadding: 64,
    trailPadding: 384
});

export enum ZIndexes {
    Ground,
    UnderWaterDeathMarkers,
    UnderWaterDeadObstacles,
    UnderWaterObstacles,
    UnderWaterLoot,
    UnderwaterGroundedThrowables,
    UnderwaterDownedPlayers,
    UnderwaterPlayers,
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

export const enum Layer {
    Basement1 = -2,
    ToBasement1 = -1,
    Ground = 0,
    ToFloor1 = 1,
    Floor1 = 2
}

export const enum Layers {
    All,      // Collide with objects on all layers
    Adjacent, // Collide with objects on the same or adjacent layers
    Equal     // Only collide with objects on the same layer
}

export enum TeamSize {
    Solo = 1,
    Duo = 2,
    Trio = 3,
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
    ThrowableProjectile,
    SyncedParticle
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
    LastShot,
    Revive
}

export const enum KillfeedMessageType {
    DeathOrDown,
    KillLeaderAssigned,
    KillLeaderDeadOrDisconnected,
    KillLeaderUpdated
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

export enum KillfeedEventType {
    Suicide,
    NormalTwoParty,
    FinishedOff,
    FinallyKilled,
    Gas,
    BleedOut,
    Airdrop
}

export const enum KillfeedEventSeverity {
    Kill,
    Down
}

export enum InventoryMessages {
    NotEnoughSpace,
    ItemAlreadyEquipped,
    BetterItemEquipped,
    CannotUseRadio,
    RadioOverused
}

// i'm putting this here because placing it in objectDefinitions.ts or
// in bullets.ts causes circular imports
export const defaultBulletTemplate = {
    tracer: {
        opacity: 1,
        width: 1,
        length: 1,
        image: "base_trail",
        particle: false,
        zIndex: ZIndexes.Bullets
    },
    allowRangeOverride: false,
    lastShotFX: false,
    noCollision: false
};

export const TentTints = {
    red: 0xb24c4c,
    green: 0x90b24c,
    blue: 0x4c7fb2,
    orange: 0xc67438,
    purple: 0x994cb2
};
