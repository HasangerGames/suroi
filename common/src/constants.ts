export enum ObjectCategory {
    Player,
    Obstacle,
    Explosion,
    DeathMarker,
    Loot
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
    Ping
}

export enum AnimationType {
    None,
    Punch
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

const calculateEnumPacketBits = (enumeration: Record<string | number, string | number>): number => Math.ceil(Math.log2(Object.keys(enumeration).length));

export const PACKET_TYPE_BITS = calculateEnumPacketBits(PacketType);
export const OBJECT_CATEGORY_BITS = calculateEnumPacketBits(ObjectCategory);
export const OBJECT_ID_BITS = 10;
export const VARIATION_BITS = 3;
export const ANIMATION_TYPE_BITS = calculateEnumPacketBits(AnimationType);
export const KILL_FEED_MESSAGE_TYPE_BITS = 1;
export const INVENTORY_MAX_WEAPONS = 3;
export const MIN_OBJECT_SCALE = 0.25;
export const MAX_OBJECT_SCALE = 2;
export const PLAYER_NAME_MAX_LENGTH = 16;
