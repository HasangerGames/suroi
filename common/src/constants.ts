import { Ammos } from "./definitions/ammos.js";
import { HealingItems } from "./definitions/healingItems.js";
import { Scopes } from "./definitions/scopes.js";
import { ItemType } from "./utils/objectDefinitions.js";

export enum ObjectCategory {
    Player,
    Obstacle,
    DeathMarker,
    Loot,
    Building,
    Decal,
    Parachute
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
    Gun,
    GunAlt,
    GunClick,
    LastShot
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
    SpectateKillLeader,
    Report
}

export enum PlayerActions {
    None,
    Reload,
    UseItem
}

export enum KillType {
    Suicide,
    TwoPartyInteraction,
    Gas,
    Airdrop
}

export const DEFAULT_INVENTORY: Record<string, number> = {};

for (const item of [...HealingItems, ...Ammos, ...Scopes]) {
    let amount = 0;

    switch (true) {
        case item.itemType === ItemType.Ammo && item.ephemeral: amount = Infinity; break;
        case item.itemType === ItemType.Scope && item.giveByDefault: amount = 1; break;
    }

    DEFAULT_INVENTORY[item.idString] = amount;
}

export const GameConstants = {
    // !!!!! NOTE: Increase this every time a bit stream change is made between latest release and master
    // or a new item is added to a definition list
    protocolVersion: 9,
    gridSize: 32,
    // ticks per second
    tps: 30,
    maxPosition: 1632,
    player: {
        radius: 2.25,
        nameMaxLength: 16,
        defaultName: "Player",
        defaultHealth: 100,
        maxAdrenaline: 100,
        maxWeapons: 3,
        killLeaderMinKills: 3,
        maxMouseDist: 128
    },
    airdrop: {
        fallTime: 8000,
        flyTime: 30000,
        damage: 300
    }
};

export enum ZIndexes {
    Ground,
    UnderWaterDeathMarkers,
    UnderWaterDeadObstacles,
    UnderWaterObstacles,
    UnderWaterLoot,
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
