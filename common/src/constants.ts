export enum ObjectCategory {
    Player, Obstacle, DeathMarker
}

export enum PacketType {
    Join, Joined, Map, Update, Input
}

export enum AnimationType {
    None, Punch
}

export const PACKET_TYPE_BITS = 3;
export const OBJECT_CATEGORY_BITS = 2;
export const VARIATION_BITS = 3;
export const ANIMATION_TYPE_BITS = 1;
export const MIN_OBJECT_SCALE = 0.25, MAX_OBJECT_SCALE = 2;
