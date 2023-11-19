import { ObjectCategory, PlayerActions, AnimationType } from "../constants";
import { type HealingItemDefinition } from "../definitions/healingItems";
import { type LootDefinition, Loots } from "../definitions/loots";
import { type ObstacleDefinition, RotationMode, Obstacles } from "../definitions/obstacles";
import { Skins, type SkinDefinition } from "../definitions/skins";
import { type Orientation, type Variation } from "../typings";
import { ObstacleSpecialRoles } from "./objectDefinitions";
import { calculateEnumPacketBits, type SuroiBitStream } from "./suroiBitStream";
import { type Vector } from "./vector";
import { Decals, type DecalDefinition } from "../definitions/decals";
import { type BuildingDefinition, Buildings } from "../definitions/buildings";
import { Armors, type ArmorDefinition } from "../definitions/armors";
import { Backpacks, type BackpackDefinition } from "../definitions/backpacks";

const ANIMATION_TYPE_BITS = calculateEnumPacketBits(AnimationType);
const PLAYER_ACTIONS_BITS = calculateEnumPacketBits(PlayerActions);

export interface ObjectsNetData {
    //
    // Player Data
    //
    [ObjectCategory.Player]: {
        position: Vector
        rotation: number
        animation: {
            type: AnimationType
            seq: boolean
        }
        full?: {
            invulnerable: boolean
            activeItem: LootDefinition
            skin: SkinDefinition
            helmet?: ArmorDefinition
            vest?: ArmorDefinition
            backpack: BackpackDefinition
            action: ({
                seq: number
            }) & ({
                type: Exclude<PlayerActions, PlayerActions.UseItem>
                item?: undefined
            } | {
                type: PlayerActions.UseItem
                item: HealingItemDefinition
            })
        }
    }
    //
    // Obstacle Data
    //
    [ObjectCategory.Obstacle]: {
        scale: number
        dead: boolean
        full?: {
            definition: ObstacleDefinition
            position: Vector
            rotation: {
                orientation: Orientation
                rotation: number
            }
            variation?: Variation
            activated?: boolean
            door?: {
                offset: number
            }
        }
    }
    //
    // Loot Data
    //
    [ObjectCategory.Loot]: {
        position: Vector
        full?: {
            definition: LootDefinition
            count: number
            isNew: boolean
        }
    }
    //
    // DeathMarker Data
    //
    [ObjectCategory.DeathMarker]: {
        position: Vector
        playerId: number
        isNew: boolean
    }
    //
    // Building Data
    //
    [ObjectCategory.Building]: {
        dead: boolean
        full?: {
            definition: BuildingDefinition
            position: Vector
            rotation: Orientation
        }
    }
    //
    // Decal Data
    //
    [ObjectCategory.Decal]: {
        position: Vector
        rotation: number
        definition: DecalDefinition
    }
}

interface ObjectSerialization<T extends ObjectCategory> {
    serializePartial: (stream: SuroiBitStream, data: ObjectsNetData[T]) => void
    serializeFull: (stream: SuroiBitStream, data: Required<ObjectsNetData[T]>) => void
    deserializePartial: (stream: SuroiBitStream) => ObjectsNetData[T]
    deserializeFull: (stream: SuroiBitStream) => Required<ObjectsNetData[T]>
}

export const ObjectSerializations: { [K in ObjectCategory]: ObjectSerialization<K> } = {
    //
    // Player serialization
    //
    [ObjectCategory.Player]: {
        serializePartial(stream, data): void {
            stream.writePosition(data.position);
            stream.writeRotation(data.rotation, 16);
            stream.writeBits(data.animation.type, ANIMATION_TYPE_BITS);
            stream.writeBoolean(data.animation.seq);
        },
        serializeFull(stream, data): void {
            this.serializePartial(stream, data);

            const full = data.full;
            stream.writeBoolean(full.invulnerable);
            Loots.writeToStream(stream, full.activeItem);
            Skins.writeToStream(stream, full.skin);
            Backpacks.writeToStream(stream, full.backpack);

            stream.writeBits(full.action.type, PLAYER_ACTIONS_BITS);
            stream.writeBits(full.action.seq, 2);
            if (full.action.item) {
                Loots.writeToStream(stream, full.action.item);
            }

            stream.writeBoolean(full.helmet !== undefined);
            if (full.helmet) {
                Armors.writeToStream(stream, full.helmet);
            }
            stream.writeBoolean(full.vest !== undefined);
            if (full.vest) {
                Armors.writeToStream(stream, full.vest);
            }
        },
        deserializePartial(stream) {
            return {
                position: stream.readPosition(),
                rotation: stream.readRotation(16),
                fullUpdate: false,
                animation: {
                    type: stream.readBits(ANIMATION_TYPE_BITS),
                    seq: stream.readBoolean()
                }
            };
        },
        deserializeFull(stream) {
            const partial = this.deserializePartial(stream);

            const full: ObjectsNetData[ObjectCategory.Player]["full"] = {
                invulnerable: stream.readBoolean(),
                activeItem: Loots.readFromStream(stream),
                skin: Skins.readFromStream(stream),
                backpack: Backpacks.readFromStream(stream),
                action: {
                    type: stream.readBits(PLAYER_ACTIONS_BITS),
                    seq: stream.readBits(2)
                }
            };

            if (full.action && full.action.type === PlayerActions.UseItem) {
                full.action.item = Loots.readFromStream(stream);
            }

            if (stream.readBoolean()) {
                full.helmet = Armors.readFromStream<ArmorDefinition>(stream);
            }
            if (stream.readBoolean()) {
                full.vest = Armors.readFromStream<ArmorDefinition>(stream);
            }

            return {
                ...partial,
                full
            };
        }
    },
    //
    // Obstacle Serialization
    //
    [ObjectCategory.Obstacle]: {
        serializePartial(stream, data): void {
            stream.writeScale(data.scale);
            stream.writeBoolean(data.dead);
        },
        serializeFull(stream, data): void {
            this.serializePartial(stream, data);
            const full = data.full;
            Obstacles.writeToStream(stream, full.definition);

            stream.writePosition(full.position);
            stream.writeObstacleRotation(full.rotation.rotation, full.definition.rotationMode);
            if (full.definition.variations !== undefined && full.variation !== undefined) {
                stream.writeVariation(full.variation);
            }
            if (full.definition.role === ObstacleSpecialRoles.Door && full.door) {
                stream.writeBits(full.door.offset, 2);
            } else if (full.definition.role === ObstacleSpecialRoles.Activatable) {
                stream.writeBoolean(full.activated ?? false);
            }
        },
        deserializePartial(stream) {
            const data: ObjectsNetData[ObjectCategory.Obstacle] = {
                scale: stream.readScale(),
                dead: stream.readBoolean()
            };
            return data;
        },
        deserializeFull(stream) {
            const partial = this.deserializePartial(stream);

            const definition = Obstacles.readFromStream(stream);

            const full: ObjectsNetData[ObjectCategory.Obstacle]["full"] = {
                definition,
                position: stream.readPosition(),
                rotation: stream.readObstacleRotation(definition.rotationMode),
                variation: definition.variations ? stream.readVariation() : undefined
            };

            if (definition.role === ObstacleSpecialRoles.Door) {
                full.door = { offset: stream.readBits(2) };
            } else if (definition.role === ObstacleSpecialRoles.Activatable) {
                full.activated = stream.readBoolean();
            }
            return {
                ...partial, full
            };
        }
    },
    //
    // Loot Serialization
    //
    [ObjectCategory.Loot]: {
        serializePartial(stream, data): void {
            stream.writePosition(data.position);
        },
        serializeFull(stream, data): void {
            this.serializePartial(stream, data);
            Loots.writeToStream(stream, data.full.definition);
            stream.writeBits(data.full.count, 9);
            stream.writeBoolean(data.full.isNew);
        },
        deserializePartial(stream) {
            return {
                position: stream.readPosition()
            };
        },
        deserializeFull(stream) {
            return {
                ...this.deserializePartial(stream),
                full: {
                    definition: Loots.readFromStream(stream),
                    count: stream.readBits(9),
                    isNew: stream.readBoolean()
                }
            };
        }
    },
    //
    // Death Marker Serialization
    //
    [ObjectCategory.DeathMarker]: {
        serializePartial(stream, data): void {
            stream.writePosition(data.position);
            stream.writeBoolean(data.isNew);
            stream.writeObjectID(data.playerId);
        },
        serializeFull(stream, data): void {
            this.serializePartial(stream, data);
        },
        deserializePartial(stream) {
            const position = stream.readPosition();
            const isNew = stream.readBoolean();
            const playerId = stream.readObjectID();

            return {
                position,
                isNew,
                playerId
            };
        },
        deserializeFull(stream) {
            return this.deserializePartial(stream);
        }
    },
    //
    // Building Serialization
    //
    [ObjectCategory.Building]: {
        serializePartial(stream, data): void {
            stream.writeBoolean(data.dead);
        },
        serializeFull(stream, data): void {
            this.serializePartial(stream, data);
            Buildings.writeToStream(stream, data.full.definition);
            stream.writePosition(data.full.position);
            stream.writeBits(data.full.rotation, 2);
        },
        deserializePartial(stream) {
            return {
                dead: stream.readBoolean()
            };
        },
        deserializeFull(stream) {
            return {
                ...this.deserializePartial(stream),
                full: {
                    definition: Buildings.readFromStream(stream),
                    position: stream.readPosition(),
                    rotation: stream.readBits(2) as Orientation
                }
            };
        }
    },
    //
    // Decal Serialization
    //
    [ObjectCategory.Decal]: {
        serializePartial(stream, data): void {
            Decals.writeToStream(stream, data.definition);
            stream.writePosition(data.position);
            stream.writeObstacleRotation(data.rotation, data.definition.rotationMode ?? RotationMode.Limited);
        },
        serializeFull(stream, data): void {
            this.serializePartial(stream, data);
        },
        deserializePartial(stream) {
            const definition = Decals.readFromStream(stream);
            return {
                definition,
                position: stream.readPosition(),
                rotation: stream.readObstacleRotation(definition.rotationMode ?? RotationMode.Limited).rotation
            };
        },
        deserializeFull(stream) {
            return this.deserializePartial(stream);
        }
    }
};
