export enum ObjectCategory {
    Player,
    Obstacle,
    Explosion,
    DeathMarker,
    Loot,
    Building,
    Emote
}

export enum PacketType {
    Join,
    Joined,
    Map,
    Update,
    Input,
    GameOver,
    Kill,
    KillFeed,
    Pickup,
    Ping,
    Item,
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
    Join
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
    None,
    EquipItem,
    DropItem,
    SwapGunSlots,
    Interact,
    Reload,
    Cancel,
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
    Report
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

const calculateEnumPacketBits = (enumeration: Record<string | number, string | number>): number => Math.ceil(Math.log2(Object.keys(enumeration).length / 2));

export const PACKET_TYPE_BITS = calculateEnumPacketBits(PacketType);
export const OBJECT_CATEGORY_BITS = calculateEnumPacketBits(ObjectCategory);
export const OBJECT_ID_BITS = 12;
export const VARIATION_BITS = 3;
export const ANIMATION_TYPE_BITS = calculateEnumPacketBits(AnimationType);
export const INPUT_ACTIONS_BITS = calculateEnumPacketBits(InputActions);
export const SPECTATE_ACTIONS_BITS = calculateEnumPacketBits(SpectateActions);
export const PLAYER_ACTIONS_BITS = calculateEnumPacketBits(PlayerActions);
export const KILL_FEED_MESSAGE_TYPE_BITS = calculateEnumPacketBits(KillFeedMessageType);
export const INVENTORY_MAX_WEAPONS = 3;
export const MIN_OBJECT_SCALE = 0.25;
export const MAX_OBJECT_SCALE = 2;
export const PLAYER_NAME_MAX_LENGTH = 16;
export const TICK_SPEED = 30;

export const PLAYER_RADIUS = 2.25;

export const LootRadius = {
    0: 3.4, // Gun
    1: 2, // Ammo
    2: 3, // Melee
    3: 2.5, // Healing
    4: 3, // Armor
    5: 3, // Backpack
    6: 3, // Scope
    7: 3 // Skin
};
