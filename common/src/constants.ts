export enum ObjectCategory {
    Player,
    Obstacle,
    Bullet,
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

export enum WeaponType {
    Melee,
    Gun
}

export enum KillFeedMessageType {
    Kill,
    Join
}

export enum GasMode {
    Inactive,
    Waiting,
    Advancing
}

// NOTE: remember to increase these values when adding stuff to enums

export const PACKET_TYPE_BITS = 4;
export const OBJECT_CATEGORY_BITS = 3;
export const VARIATION_BITS = 3;
export const ANIMATION_TYPE_BITS = 1;
export const WEAPON_TYPE_BITS = 1;
export const KILL_FEED_MESSAGE_TYPE_BITS = 1;
export const MIN_OBJECT_SCALE = 0.25;
export const MAX_OBJECT_SCALE = 2;
export const PLAYER_NAME_MAX_LENGTH = 16;
