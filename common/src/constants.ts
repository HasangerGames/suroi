import { Ammos } from "./definitions/ammos";
import { HealingItems } from "./definitions/healingItems";
import { Scopes } from "./definitions/scopes";
import { Throwables } from "./definitions/throwables";
import { freezeDeep } from "./utils/misc";
import { ItemType } from "./utils/objectDefinitions";

export enum TeamSize {
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
    ThrowableProjectile,
    SyncedParticle
}

export enum PacketType {
    Join,
    Joined,
    Map,
    Update,
    Input,
    GameOver,
    Pickup,
    Ping,
    Spectate,
    Report,
    MapPing
}

export enum AnimationType {
    None,
    Melee,
    ThrowableCook,
    ThrowableThrow,
    Gun,
    GunAlt,
    GunClick,
    LastShot,
    Revive
}

export enum KillfeedMessageType {
    DeathOrDown,
    KillLeaderAssigned,
    KillLeaderDead,
    KillLeaderUpdated
}

export enum GasState {
    Inactive,
    Waiting,
    Advancing
}

export enum FireMode {
    Single,
    Burst,
    Auto
}

export enum InputActions {
    EquipItem,
    EquipLastItem,
    DropWeapon,
    DropItem,
    SwapGunSlots,
    Interact,
    Reload,
    Cancel,
    UseItem,
    Emote,
    MapPing,
    Loot
}

export enum SpectateActions {
    BeginSpectating,
    SpectatePrevious,
    SpectateNext,
    SpectateSpecific,
    SpectateKillLeader,
    Report
}

export enum PlayerActions {
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

export enum KillfeedEventSeverity {
    Kill,
    Down
}

export const DEFAULT_INVENTORY: Record<string, number> = {};

for (const item of [...HealingItems, ...Ammos, ...Scopes, ...Throwables]) {
    let amount = 0;

    switch (true) {
        case item.itemType === ItemType.Ammo && item.ephemeral: amount = Infinity; break;
        case item.itemType === ItemType.Scope && item.giveByDefault: amount = 1; break;
    }

    DEFAULT_INVENTORY[item.idString] = amount;
}

Object.freeze(DEFAULT_INVENTORY);

const tickrate = 40;
const inventorySlotTypings = Object.freeze([ItemType.Gun, ItemType.Gun, ItemType.Melee, ItemType.Throwable] as const);
export const GameConstants = freezeDeep({
    // !!!!! NOTE: Increase this every time a bit stream change is made between latest release and master
    // or a new item is added to a definition list
    protocolVersion: 20,
    gridSize: 32,
    tickrate,
    // this is fine cause the object is frozen anyways, so
    // these two attributes can't ever be desynced
    msPerTick: 1000 / tickrate,
    bleedOutDPMs: 0.002, // === 2 dps
    maxPosition: 1632,
    player: {
        radius: 2.25,
        nameMaxLength: 16,
        defaultName: "Player",
        defaultSkin: "hazel_jumpsuit",
        defaultHealth: 100,
        maxAdrenaline: 100,
        inventorySlotTypings,
        maxWeapons: inventorySlotTypings.length,
        killLeaderMinKills: 3,
        maxMouseDist: 128,
        reviveTime: 8,
        maxReviveDist: 5
    },
    airdrop: {
        fallTime: 8000,
        flyTime: 30000,
        damage: 300
    }
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
    /**
     * This is the default layer for obstacles
     */
    ObstaclesLayer1,
    Loot,
    GroundedThrowables,
    ObstaclesLayer2,
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

// i'm putting this here because placing it in objectDefinitions.ts or
// in bullets.ts causes circular imports
export const defaultBulletTemplate = {
    penetration: {
        players: false,
        obstacles: false
    },
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
