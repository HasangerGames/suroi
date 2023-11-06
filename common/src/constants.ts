export enum ObjectCategory {
    Player,
    Obstacle,
    DeathMarker,
    Loot,
    Building,
    Decal
}

export enum PacketType {
    Join,
    Joined,
    Map,
    Update,
    Input,
    GameOver,
    KillFeed,
    Pickup,
    Ping,
    Spectate,
    Report
}

export enum AnimationType {
    None,
    Melee,
    Gun,
    GunClick
}

export enum KillFeedMessageType {
    Kill,
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
    DropItem,
    SwapGunSlots,
    Interact,
    Reload,
    Cancel,
    UseItem,
    TopEmoteSlot,
    RightEmoteSlot,
    BottomEmoteSlot,
    LeftEmoteSlot
}

export enum SpectateActions {
    BeginSpectating,
    SpectatePrevious,
    SpectateNext,
    SpectateSpecific,
    Report,
    SpectateKillLeader
}

export enum PlayerActions {
    None,
    Reload,
    UseItem
}

// ArmorType has to be in constants.ts and not armors.ts, or it'll cause recursive import issues
export enum ArmorType {
    Helmet,
    Vest
}

// !!!!! NOTE: Increase this every time a bit stream change is made between latest release and master
// or a new item is added to a definition list
export const PROTOCOL_VERSION = 2;

export const MIN_OBJECT_SCALE = 0.25;
export const MAX_OBJECT_SCALE = 2;

export const TICKS_PER_SECOND = 30;
export const GRID_SIZE = 16;

export const PLAYER_RADIUS = 2.25;
export const PLAYER_NAME_MAX_LENGTH = 16;
export const DEFAULT_USERNAME = "Player";
export const INVENTORY_MAX_WEAPONS = 3;
export const KILL_LEADER_MIN_KILLS = 3;
export const MAX_MOUSE_DISTANCE = 128;

export enum ZIndexes {
    Ground,
    Decals,
    DeadObstacles,
    DeathMarkers,
    /**
     * This is the default layer for obstacles
     */
    ObstaclesLayer1,
    Loot,
    ObstaclesLayer2,
    Bullets,
    Players,
    /**
     * bushes, tables etc
     */
    ObstaclesLayer3,
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
