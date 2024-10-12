import { AnimationType, Layer, ObjectCategory, PlayerActions } from "../constants";
import { Armors, type ArmorDefinition } from "../definitions/armors";
import { Backpacks, type BackpackDefinition } from "../definitions/backpacks";
import { Buildings, type BuildingDefinition } from "../definitions/buildings";
import { Decals, type DecalDefinition } from "../definitions/decals";
import { type HealingItemDefinition } from "../definitions/healingItems";
import { Loots, type LootDefinition, type WeaponDefinition } from "../definitions/loots";
import { Obstacles, type ObstacleDefinition } from "../definitions/obstacles";
import { Skins, type SkinDefinition } from "../definitions/skins";
import { SyncedParticles, type SyncedParticleDefinition } from "../definitions/syncedParticles";
import { type ThrowableDefinition } from "../definitions/throwables";
import { type Orientation, type Variation } from "../typings";
import { type Mutable } from "./misc";
import { calculateEnumPacketBits, type SuroiBitStream } from "./suroiBitStream";
import { type Vector } from "./vector";

const ANIMATION_TYPE_BITS = calculateEnumPacketBits(AnimationType);
const PLAYER_ACTIONS_BITS = calculateEnumPacketBits(PlayerActions);

export interface Fullable<T> {
    full?: T
}

type BaseObjectsNetData = {
    [K in ObjectCategory]: Fullable<object> | object
};

export type FullData<Cat extends ObjectCategory> = ObjectsNetData[Cat] & (ObjectsNetData[Cat] extends Fullable<infer S> ? { full: S } : object);

type FullDeserializationType<T extends ObjectCategory> = ObjectsNetData[T] extends { full?: infer Full } ? NonNullable<Full> : undefined;

export interface ObjectsNetData extends BaseObjectsNetData {
    //
    // Player Data
    //
    readonly [ObjectCategory.Player]: {
        readonly position: Vector
        readonly rotation: number
        readonly layer: Layer
        readonly animation?: AnimationType
        readonly action?: ({
            readonly type: Exclude<PlayerActions, PlayerActions.UseItem>
            readonly item?: undefined
        } | {
            readonly type: PlayerActions.UseItem
            readonly item: HealingItemDefinition
        })
        readonly full?: {
            readonly dead: boolean
            readonly downed: boolean
            readonly beingRevived: boolean
            readonly teamID: number
            readonly invulnerable: boolean
            readonly stoppedAttacking: boolean
            readonly activeItem: WeaponDefinition
            readonly skin: SkinDefinition
            readonly helmet?: ArmorDefinition
            readonly vest?: ArmorDefinition
            readonly backpack: BackpackDefinition
        }
    }
    //
    // Obstacle Data
    //
    readonly [ObjectCategory.Obstacle]: {
        readonly scale: number
        readonly dead: boolean
        readonly full?: {
            readonly definition: ObstacleDefinition
            readonly position: Vector
            readonly layer: Layer
            readonly rotation: {
                readonly orientation: Orientation
                readonly rotation: number
            }
            readonly variation?: Variation
            readonly activated?: boolean
            readonly detectedMetal?: boolean
            readonly door?: {
                readonly offset: number
                readonly locked: boolean
            }
        }
    }
    //
    // Loot Data
    //
    readonly [ObjectCategory.Loot]: {
        readonly position: Vector
        readonly layer: Layer
        readonly full?: {
            readonly definition: LootDefinition
            readonly count: number
            readonly isNew: boolean
        }
    }
    //
    // DeathMarker Data
    //
    readonly [ObjectCategory.DeathMarker]: {
        readonly position: Vector
        readonly layer: Layer
        readonly playerID: number
        readonly isNew: boolean
    }
    //
    // Building Data
    //
    readonly [ObjectCategory.Building]: {
        readonly dead: boolean
        readonly puzzle: undefined | {
            readonly solved: boolean
            readonly errorSeq: boolean
        }
        readonly layer: number
        readonly full?: {
            readonly definition: BuildingDefinition
            readonly position: Vector
            readonly orientation: Orientation
        }
    }
    //
    // Decal Data
    //
    readonly [ObjectCategory.Decal]: {
        readonly position: Vector
        readonly rotation: number
        readonly layer: Layer
        readonly definition: DecalDefinition
    }
    //
    // Parachute data
    //
    readonly [ObjectCategory.Parachute]: {
        readonly height: number
        readonly full?: {
            readonly position: Vector
        }
    }
    //
    // Throwable data
    //
    readonly [ObjectCategory.ThrowableProjectile]: {
        readonly position: Vector
        readonly rotation: number
        readonly layer: Layer
        readonly airborne: boolean
        readonly activated: boolean
        readonly full?: {
            readonly definition: ThrowableDefinition
        }
    }
    //
    // Synced particle data
    //
    readonly [ObjectCategory.SyncedParticle]: {
        readonly position: Vector
        readonly rotation: number
        readonly layer: Layer
        readonly scale?: number
        readonly alpha?: number
        readonly full?: {
            readonly definition: SyncedParticleDefinition
            readonly variant?: Variation
        }
    }
}

interface ObjectSerialization<T extends ObjectCategory> {
    serializePartial: (stream: SuroiBitStream, data: ObjectsNetData[T]) => void
    serializeFull: (stream: SuroiBitStream, data: FullData<T>) => void
    deserializePartial: (stream: SuroiBitStream) => ObjectsNetData[T]
    deserializeFull: (stream: SuroiBitStream) => FullDeserializationType<T>
}

export const ObjectSerializations: { [K in ObjectCategory]: ObjectSerialization<K> } = {
    //
    // Player serialization
    //
    [ObjectCategory.Player]: {
        serializePartial(stream, data): void {
            const { position, rotation, layer, animation, action } = data;

            stream.writePosition(position);
            stream.writeRotation(rotation, 16);
            stream.writeLayer(layer);

            const animationDirty = animation !== undefined;
            stream.writeBoolean(animationDirty);
            if (animationDirty) {
                stream.writeBits(animation, ANIMATION_TYPE_BITS);
            }

            const actionDirty = action !== undefined;
            stream.writeBoolean(actionDirty);
            if (actionDirty) {
                stream.writeBits(action.type, PLAYER_ACTIONS_BITS);
                if (action.item) {
                    Loots.writeToStream(stream, action.item);
                }
            }
        },
        serializeFull(stream, data): void {
            const { full: {
                dead,
                downed,
                beingRevived,
                teamID,
                invulnerable,
                stoppedAttacking,
                activeItem,
                skin,
                backpack,
                helmet,
                vest
            } } = data;

            stream.writeBoolean(dead);
            stream.writeBoolean(downed);
            stream.writeBoolean(beingRevived);
            stream.writeUint8(teamID);
            stream.writeBoolean(invulnerable);
            stream.writeBoolean(stoppedAttacking);
            Loots.writeToStream(stream, activeItem);
            Skins.writeToStream(stream, skin);
            Backpacks.writeToStream(stream, backpack);

            stream.writeBoolean(helmet !== undefined);
            if (helmet) {
                Armors.writeToStream(stream, helmet);
            }
            stream.writeBoolean(vest !== undefined);
            if (vest) {
                Armors.writeToStream(stream, vest);
            }
        },
        deserializePartial(stream) {
            const data: Mutable<ObjectsNetData[ObjectCategory.Player]> = {
                position: stream.readPosition(),
                rotation: stream.readRotation(16),
                layer: stream.readLayer(),
                animation: stream.readBoolean() ? stream.readBits(ANIMATION_TYPE_BITS) : undefined
            };

            if (stream.readBoolean()) { // action dirty
                const action: Mutable<NonNullable<ObjectsNetData[ObjectCategory.Player]["action"]>> = {
                    type: stream.readBits(PLAYER_ACTIONS_BITS),
                    item: undefined as HealingItemDefinition | undefined
                };

                if (action.type === PlayerActions.UseItem) {
                    action.item = Loots.readFromStream(stream);
                }

                data.action = action;
            }

            return data;
        },
        deserializeFull(stream) {
            const data: Mutable<ObjectsNetData[ObjectCategory.Player]["full"]> = {
                dead: stream.readBoolean(),
                downed: stream.readBoolean(),
                beingRevived: stream.readBoolean(),
                teamID: stream.readUint8(),
                invulnerable: stream.readBoolean(),
                stoppedAttacking: stream.readBoolean(),
                activeItem: Loots.readFromStream(stream),
                skin: Skins.readFromStream(stream),
                backpack: Backpacks.readFromStream(stream)
            };

            if (stream.readBoolean()) {
                data.helmet = Armors.readFromStream<ArmorDefinition>(stream);
            }

            if (stream.readBoolean()) {
                data.vest = Armors.readFromStream<ArmorDefinition>(stream);
            }

            return data;
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
        serializeFull(stream, { full }): void {
            Obstacles.writeToStream(stream, full.definition);

            stream.writePosition(full.position);
            stream.writeObstacleRotation(full.rotation.rotation, full.definition.rotationMode);
            stream.writeLayer(full.layer);
            if (full.definition.variations !== undefined && full.variation !== undefined) {
                // if the unserialized form is present, the serialized form should also be present
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                stream.writeBits(full.variation, full.definition.variationBits!);
            }

            if (full.definition.isDoor && full.door) {
                stream.writeBits(full.door.offset, 2);
                stream.writeBoolean(full.door.locked);
            } else if (full.definition.isActivatable) {
                stream.writeBoolean(full.activated ?? false);
            } else if (full.definition.detector) {
                stream.writeBoolean(full.detectedMetal ?? false);
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
            const definition = Obstacles.readFromStream(stream);

            const data: Mutable<ObjectsNetData[ObjectCategory.Obstacle]["full"]> = {
                definition,
                position: stream.readPosition(),
                rotation: stream.readObstacleRotation(definition.rotationMode),
                layer: stream.readLayer(),
                // serialized & unserialized co-defined
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                variation: definition.variations ? stream.readBits(definition.variationBits!) as Variation : undefined
            };

            if (definition.isDoor) {
                data.door = {
                    offset: stream.readBits(2),
                    locked: stream.readBoolean()
                };
            } else if (definition.isActivatable) {
                data.activated = stream.readBoolean();
            } else if (definition.detector) {
                data.detectedMetal = stream.readBoolean();
            }
            return data;
        }
    },
    //
    // Loot Serialization
    //
    [ObjectCategory.Loot]: {
        serializePartial(stream, data): void {
            stream.writePosition(data.position);
            stream.writeLayer(data.layer);
        },
        serializeFull(stream, { full }): void {
            Loots.writeToStream(stream, full.definition);
            stream.writeBits(full.count, 9);
            stream.writeBoolean(full.isNew);
        },
        deserializePartial(stream) {
            return {
                position: stream.readPosition(),
                layer: stream.readLayer()
            };
        },
        deserializeFull(stream) {
            return {
                definition: Loots.readFromStream(stream),
                count: stream.readBits(9),
                isNew: stream.readBoolean()
            };
        }
    },
    //
    // Death Marker Serialization
    //
    [ObjectCategory.DeathMarker]: {
        serializePartial(stream, data): void {
            stream.writePosition(data.position);
            stream.writeLayer(data.layer);
            stream.writeBoolean(data.isNew);
            stream.writeObjectID(data.playerID);
        },
        serializeFull(): void { /* death markers have no full serialization */ },
        deserializePartial(stream) {
            const position = stream.readPosition();
            const layer = stream.readLayer();
            const isNew = stream.readBoolean();
            const playerID = stream.readObjectID();

            return {
                position,
                layer,
                isNew,
                playerID
            };
        },
        deserializeFull() { /* death markers have no full serialization */ }
    },
    //
    // Building Serialization
    //
    [ObjectCategory.Building]: {
        serializePartial(stream, data): void {
            stream.writeBoolean(data.dead);
            stream.writeBoolean(!!data.puzzle);
            if (data.puzzle) {
                stream.writeBoolean(data.puzzle.solved);
                stream.writeBoolean(data.puzzle.errorSeq);
            }
            stream.writeLayer(data.layer);
        },
        serializeFull(stream, { full }): void {
            Buildings.writeToStream(stream, full.definition);
            stream.writePosition(full.position);
            stream.writeBits(full.orientation, 2);
        },
        deserializePartial(stream) {
            return {
                dead: stream.readBoolean(),
                puzzle: stream.readBoolean() // is puzzle
                    ? {
                        solved: stream.readBoolean(),
                        errorSeq: stream.readBoolean()
                    }
                    : undefined,
                layer: stream.readLayer()
            };
        },
        deserializeFull(stream) {
            return {
                definition: Buildings.readFromStream(stream),
                position: stream.readPosition(),
                orientation: stream.readBits(2) as Orientation
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
            stream.writeObstacleRotation(data.rotation, data.definition.rotationMode);
            stream.writeLayer(data.layer);
        },
        serializeFull(): void { /* decals have no full serialization */ },
        deserializePartial(stream) {
            const definition = Decals.readFromStream(stream);
            return {
                definition,
                position: stream.readPosition(),
                rotation: stream.readObstacleRotation(definition.rotationMode).rotation,
                layer: stream.readLayer()
            };
        },
        deserializeFull() { /* decals have no full serialization */ }
    },
    [ObjectCategory.Parachute]: {
        serializePartial(stream, data) {
            stream.writeFloat(data.height, 0, 1, 8);
        },
        serializeFull(stream, { full }) {
            stream.writePosition(full.position);
        },
        deserializePartial(stream) {
            return {
                height: stream.readFloat(0, 1, 8)
            };
        },
        deserializeFull(stream) {
            return {

                position: stream.readPosition()

            };
        }
    },
    [ObjectCategory.ThrowableProjectile]: {
        serializePartial(stream, data) {
            stream.writePosition(data.position);
            stream.writeRotation(data.rotation, 16);
            stream.writeLayer(data.layer);
            stream.writeBoolean(data.airborne);
            stream.writeBoolean(data.activated);
        },
        serializeFull(stream, { full }) {
            Loots.writeToStream(stream, full.definition);
        },
        deserializePartial(stream) {
            return {
                position: stream.readPosition(),
                rotation: stream.readRotation(16),
                layer: stream.readLayer(),
                airborne: stream.readBoolean(),
                activated: stream.readBoolean()
            };
        },
        deserializeFull(stream) {
            return {
                definition: Loots.readFromStream(stream)

            };
        }
    },
    [ObjectCategory.SyncedParticle]: {
        serializePartial(stream, data) {
            const { position, rotation, layer, scale, alpha } = data;

            stream.writePosition(position);
            stream.writeRotation(rotation, 8);
            stream.writeLayer(layer);

            const writeScale = scale !== undefined;
            stream.writeBoolean(writeScale);
            if (writeScale) {
                stream.writeScale(scale);
            }

            const writeAlpha = alpha !== undefined;
            stream.writeBoolean(writeAlpha);
            if (writeAlpha) {
                stream.writeFloat(alpha, 0, 1, 8);
            }
        },
        serializeFull(stream, { full }) {
            SyncedParticles.writeToStream(stream, full.definition);

            const variant = full.variant;
            stream.writeBoolean(variant !== undefined);
            if (variant !== undefined) {
                // serialized & deserialized co-defined
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                stream.writeBits(variant, full.definition.variationBits!);
            }
        },
        deserializePartial(stream) {
            const data: Mutable<ObjectsNetData[ObjectCategory.SyncedParticle]> = {
                position: stream.readPosition(),
                rotation: stream.readRotation(8),
                layer: stream.readLayer()
            };

            if (stream.readBoolean()) { // scale
                data.scale = stream.readScale();
            }

            if (stream.readBoolean()) { // alpha
                data.alpha = stream.readFloat(0, 1, 8);
            }

            return data;
        },
        deserializeFull(stream) {
            const definition = SyncedParticles.readFromStream(stream);
            return {
                definition,
                // we're assuming that the serialized form is already present if this method is being called
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                variant: stream.readBoolean() ? stream.readBits(definition.variationBits!) as Variation : undefined
            };
        }
    }
};
