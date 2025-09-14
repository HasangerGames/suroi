import { AnimationType, GameConstants, Layer, ObjectCategory, PlayerActions, RotationMode } from "../constants";
import { Armors, type ArmorDefinition } from "../definitions/items/armors";
import { Backpacks, type BackpackDefinition } from "../definitions/items/backpacks";
import { Buildings, type BuildingDefinition } from "../definitions/buildings";
import { Decals, type DecalDefinition } from "../definitions/decals";
import { type HealingItemDefinition } from "../definitions/items/healingItems";
import { Loots, type LootDefinition, type WeaponDefinition } from "../definitions/loots";
import { type MeleeDefinition, Melees } from "../definitions/items/melees";
import { Obstacles, type ObstacleDefinition } from "../definitions/obstacles";
import { Skins, type SkinDefinition } from "../definitions/items/skins";
import { SyncedParticles, type SyncedParticleDefinition } from "../definitions/syncedParticles";
import { Throwables, type ThrowableDefinition } from "../definitions/items/throwables";
import { type Orientation, type Variation } from "../typings";
import { Angle, halfπ } from "./math";
import { type Mutable, type SDeepMutable } from "./misc";
import { type SuroiByteStream } from "./suroiByteStream";
import { type Vector } from "./vector";

export interface Fullable<T> {
    full?: T
}

type BaseObjectsNetData = Record<ObjectCategory, Fullable<object> | object>;

export type FullData<Cat extends ObjectCategory> = ObjectsNetData[Cat] & (ObjectsNetData[Cat] extends Fullable<infer S> ? { full: S } : object);

type FullDeserializationType<T extends ObjectCategory> = ObjectsNetData[T] extends { full?: infer Full } ? NonNullable<Full> : undefined;

export interface ObjectsNetData extends BaseObjectsNetData {
    //
    // Player Data
    //
    readonly [ObjectCategory.Player]: {
        readonly position: Vector
        readonly rotation: number
        readonly animation?: AnimationType
        readonly action?: ({
            readonly type: Exclude<PlayerActions, PlayerActions.UseItem>
            readonly item?: undefined
        } | {
            readonly type: PlayerActions.UseItem
            readonly item: HealingItemDefinition
        })
        readonly full?: {
            readonly layer: Layer
            readonly dead: boolean
            readonly downed: boolean
            readonly beingRevived: boolean
            readonly teamID: number
            readonly invulnerable: boolean
            readonly activeItem: WeaponDefinition
            readonly sizeMod: number
            readonly reloadMod?: number
            readonly skin: SkinDefinition
            readonly helmet?: ArmorDefinition
            readonly vest?: ArmorDefinition
            readonly backpack: BackpackDefinition
            readonly halloweenThrowableSkin: boolean
            readonly activeDisguise?: ObstacleDefinition
            readonly infected: boolean
            readonly backEquippedMelee?: MeleeDefinition
            readonly hasBubble: boolean
            readonly activeOverdrive: boolean
        }
    }
    //
    // Obstacle Data
    //
    readonly [ObjectCategory.Obstacle]: {
        readonly scale: number
        readonly dead: boolean
        readonly playMaterialDestroyedSound: boolean
        readonly waterOverlay: boolean
        readonly powered: boolean
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
    // Projectile data
    //
    readonly [ObjectCategory.Projectile]: {
        readonly position: Vector
        readonly rotation: number
        readonly layer: Layer
        readonly height: number

        readonly full?: {
            readonly definition: ThrowableDefinition
            readonly halloweenSkin: boolean
            readonly activated: boolean

            readonly c4?: {
                readonly throwerTeamID: number
                readonly tintIndex: number
            }
        }
    }
    //
    // Synced particle data
    //
    readonly [ObjectCategory.SyncedParticle]: {
        readonly definition: SyncedParticleDefinition
        readonly startPosition: Vector
        readonly endPosition: Vector
        readonly layer: Layer
        readonly age: number
        readonly lifetime?: number
        readonly angularVelocity?: number
        readonly scale?: {
            start: number
            end: number
        }
        readonly alpha?: {
            start: number
            end: number
        }
        readonly variant?: Variation
        readonly creatorID?: number
    }
}

interface ObjectSerialization<T extends ObjectCategory> {
    serializePartial: (stream: SuroiByteStream, data: ObjectsNetData[T]) => void
    serializeFull: (stream: SuroiByteStream, data: FullData<T>) => void
    deserializePartial: (stream: SuroiByteStream) => ObjectsNetData[T]
    deserializeFull: (stream: SuroiByteStream) => FullDeserializationType<T>
}

export const ObjectSerializations: { [K in ObjectCategory]: ObjectSerialization<K> } = {
    //
    // Player serialization
    //
    [ObjectCategory.Player]: {
        serializePartial(stream, { position, rotation, animation, action }): void {
            stream.writePosition(position);
            stream.writeRotation2(rotation);

            /*
                4 bits for animation, 2 for action
                each has a "dirty" bit, and that makes 8

                our setup will be
                Nnnn nccC

                N: animation dirty
                n: animation
                c: action
                C: action dirty
            */

            const animationDirty = animation !== undefined;
            const actionDirty = action !== undefined;

            let actAnim = (animationDirty ? 128 : 0) + (actionDirty ? 1 : 0);
            if (animationDirty) {
                actAnim += animation << 3;
            }

            if (actionDirty) {
                actAnim += action.type << 1;
            }

            stream.writeUint8(actAnim);

            if (actionDirty && action.item !== undefined) {
                Loots.writeToStream(stream, action.item);
            }
        },
        serializeFull(
            stream,
            { full: {
                layer,
                dead,
                downed,
                beingRevived,
                teamID,
                invulnerable,
                activeItem,
                sizeMod,
                reloadMod,
                skin,
                helmet,
                vest,
                backpack,
                halloweenThrowableSkin,
                activeDisguise,
                infected,
                backEquippedMelee,
                hasBubble,
                activeOverdrive
            } }
        ): void {
            stream.writeLayer(layer);
            const hasReloadMod = reloadMod !== undefined;
            const hasHelmet = helmet !== undefined;
            const hasVest = vest !== undefined;
            const hasDisguise = activeDisguise !== undefined;
            const hasBackEquippedMelee = backEquippedMelee !== undefined;

            stream.writeBooleanGroup2(
                dead,
                downed,
                beingRevived,
                invulnerable,
                hasReloadMod,
                halloweenThrowableSkin,
                hasHelmet,
                hasVest,
                hasDisguise,
                infected,
                hasBackEquippedMelee,
                hasBubble,
                activeOverdrive
            );
            stream.writeUint8(teamID);
            Loots.writeToStream(stream, activeItem);

            stream.writeFloat(sizeMod, 0, 4, 1);

            if (hasReloadMod) {
                stream.writeFloat(reloadMod, 0, 4, 1);
            }

            Skins.writeToStream(stream, skin);

            if (hasHelmet) Armors.writeToStream(stream, helmet);
            if (hasVest) Armors.writeToStream(stream, vest);
            Backpacks.writeToStream(stream, backpack);

            if (hasDisguise) Obstacles.writeToStream(stream, activeDisguise);
            if (hasBackEquippedMelee) Melees.writeToStream(stream, backEquippedMelee);
        },
        deserializePartial(stream) {
            const data: Mutable<ObjectsNetData[ObjectCategory.Player]> = {
                position: stream.readPosition(),
                rotation: stream.readRotation2()
            };

            // see serialization comment
            const actAnim = stream.readUint8();
            const hasAnimation = (actAnim & 128) !== 0;
            const hasAction = (actAnim & 1) !== 0;

            data.animation = hasAnimation ? (actAnim >> 3) & 15 : undefined;

            const action: PlayerActions | undefined = hasAction ? (actAnim >> 1) & 3 : undefined;
            if (action !== undefined) {
                const act = {
                    type: action
                } as Mutable<NonNullable<ObjectsNetData[ObjectCategory.Player]["action"]>>;

                if (action === PlayerActions.UseItem) {
                    act.item = Loots.readFromStream<HealingItemDefinition>(stream);
                }

                data.action = act;
            }

            return data;
        },
        deserializeFull(stream) {
            const layer = stream.readLayer();
            const [
                dead,
                downed,
                beingRevived,
                invulnerable,
                hasReloadMod,
                halloweenThrowableSkin,
                hasHelmet,
                hasVest,
                hasDisguise,
                infected,
                hasBackEquippedMelee,
                hasBubble,
                activeOverdrive
            ] = stream.readBooleanGroup2();

            return {
                layer,
                dead,
                downed,
                beingRevived,
                invulnerable,
                halloweenThrowableSkin,
                teamID: stream.readUint8(),
                activeItem: Loots.readFromStream(stream),
                sizeMod: stream.readFloat(0, 4, 1),
                reloadMod: hasReloadMod ? stream.readFloat(0, 4, 1) : undefined,
                skin: Skins.readFromStream(stream),
                helmet: hasHelmet ? Armors.readFromStream(stream) : undefined,
                vest: hasVest ? Armors.readFromStream(stream) : undefined,
                backpack: Backpacks.readFromStream(stream),
                activeDisguise: hasDisguise ? Obstacles.readFromStream(stream) : undefined,
                infected,
                backEquippedMelee: hasBackEquippedMelee ? Melees.readFromStream(stream) : undefined,
                hasBubble,
                activeOverdrive
            };
        }
    },
    //
    // Obstacle Serialization
    //
    [ObjectCategory.Obstacle]: {
        serializePartial(stream, data): void {
            stream.writeBooleanGroup(
                data.dead,
                data.playMaterialDestroyedSound,
                data.waterOverlay,
                data.powered
            );
            stream.writeScale(data.scale);
        },
        serializeFull(
            stream,
            {
                full: {
                    position,
                    definition,
                    rotation,
                    door,
                    activated,
                    variation,
                    layer
                }
            }
        ): void {
            Obstacles.writeToStream(stream, definition);

            stream.writePosition(position);
            stream.writeLayer(layer);

            /*
                here we're condensing stuff to try and minimize deadspace
                this is really peak tryharding
                we have:
                - a rotation
                - a variation (maybe)
                possibly one of:
                    - door stuff
                    - activation stuff
            */

            // variations leave at least 5 vacant bits, which is enough for the rest of our data
            let obstacleData = 0;
            if (definition.variations !== undefined && variation !== undefined) {
                // variation being undefined is equivalent to it being 0

                // make the variation stuff take up the MSBs, leaving the LSBs for the other stuff
                obstacleData += variation << (8 - definition.variationBits);
                /*
                    for example, variation = 3, variationBits = 3
                    we then have 0110 0000
                    the 5 least-significant bits are free for use
                */
            }

            if (definition.isDoor && door) {
                // 3 bits
                obstacleData += door.offset * 2 + (door.locked ? 1 : 0);
                //                            ^ shift left by one

                // will result in something like 0110 0101
                // or more generally, xxx00xxx
            } else if (definition.isActivatable) {
                // 1 bit
                obstacleData += activated ? 1 : 0;
                // will result in something like xxx0000x
            }

            /*
                what remains is the door/activation/detector stuff
                door stuff is 3 bits, the other two are 1 bit
                thus, we conclude that obstacleData will never exceed 6 bits

                RotationMode.Full takes a clean 2 bytes, so it's not of a concern
                Limited and Binary take 2 and 1 respectively

                thus we see that if the mode is limited or binary, we can fit
                the rotation and the data in a single 8-bit number

                for example, with variation 3 over 3 bits,
                and door offset of 2 and locked

                we get
                0 1 1 0 0 1 0 1
                |___|     |_| |
                |          | locked
                variation  |
                        offset

                the two middle bits are free to use
            */

            switch (definition.rotationMode) {
                case RotationMode.Full: {
                    // rotation doesn't leave any deadspace, so we write
                    // it and the data

                    // to make deserialization easier though, always write
                    // the obstacle data first
                    stream.writeUint8(obstacleData);
                    stream.writeRotation(rotation.rotation);
                    break;
                }
                case RotationMode.Limited:
                case RotationMode.Binary: {
                    stream.writeUint8(obstacleData + (rotation.rotation << 3));
                    // shift into correct position with a << 3
                    break;
                }
                case RotationMode.None: {
                    // there may be no rotation data, but there's still variation data and
                    // all the other thingies
                    stream.writeUint8(obstacleData);
                    break;
                }
            }
        },
        deserializePartial(stream) {
            const [
                dead,
                playMaterialDestroyedSound,
                waterOverlay,
                powered
            ] = stream.readBooleanGroup();

            return {
                scale: stream.readScale(),
                dead,
                playMaterialDestroyedSound,
                waterOverlay,
                powered
            };
        },
        deserializeFull(stream) {
            const definition = Obstacles.readFromStream(stream);

            const data: SDeepMutable<NonNullable<ObjectsNetData[ObjectCategory.Obstacle]["full"]>> = {
                definition,
                position: stream.readPosition(),
                layer: stream.readLayer(),
                rotation: {
                    orientation: 0,
                    rotation: 0
                }
            };

            // see the comments in serializeFull to understand what's going on
            // "safe" version
            /*
            switch (definition.rotationMode) {
                case RotationMode.Full: {
                    data.rotation.rotation = stream.readRotation();
                    break;
                }
                case RotationMode.Limited:
                case RotationMode.Binary: {
                    data.rotation.orientation = stread.readUint8() as Orientation;
                    data.rotation.rotation = definition.rotationMode === RotationMode.Binary
                        ? orientation * halfπ // sus
                        : -Angle.normalize(orientation) * halfπ;
                    break;
                }
                // case RotationMode.None: {
                //     break;
                // }
            }

            if (definition.variations !== undefined && variation !== undefined) {
                data.variation = stream.readUint8();
            }

            if (definition.isDoor && door) {
                const door = stream.readUint8();
                data.door = {
                    offset: (door >> 1) & 3,
                    locked: (door & 1) === 1
                };
            } else if (definition.isActivatable) {
                data.activated = stream.readUint8() !== 0;
            }
            */
            const obstacleData = stream.readUint8();
            if (definition.variations !== undefined) {
                const bits = 8 - definition.variationBits;
                data.variation = (obstacleData & (0xFF - (2 ** bits - 1))) >> bits as Variation;
                //                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ mask the most significant bits
            }

            if (definition.isDoor) {
                data.door = {
                    offset: (obstacleData >> 1) & 3,
                    locked: (obstacleData & 1) === 1
                };
            } else if (definition.isActivatable) {
                data.activated = (obstacleData & 1) === 1;
            }

            switch (definition.rotationMode) {
                case RotationMode.Full: {
                    data.rotation.rotation = stream.readRotation();
                    break;
                }
                case RotationMode.Limited:
                case RotationMode.Binary: {
                    const orientation = (obstacleData & 0b11000) / 8 as Orientation;

                    data.rotation.orientation = orientation;
                    data.rotation.rotation = definition.rotationMode === RotationMode.Binary
                        ? orientation * halfπ // sus
                        : -Angle.normalize(orientation) * halfπ;
                    break;
                }
                // case RotationMode.None: {
                //     break;
                // }
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
            /*
                package 'isNew' and 'count' in a single 16-bit
                integer—the first bit will be for isNew, the other
                15 will be for the count
            */
            stream.writeUint16(
                (full.isNew ? 32768 : 0) + full.count
                //            ^^^^^ 1 << 15
            );
        },
        deserializePartial(stream) {
            return {
                position: stream.readPosition(),
                layer: stream.readLayer()
            };
        },
        deserializeFull(stream) {
            const definition = Loots.readFromStream(stream);
            const amount = stream.readUint16();
            return {
                definition,
                count: amount & 32767, // mask out the MSB
                isNew: (amount & 32768) !== 0 // extract the MSB
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
            stream.writeUint8(data.isNew ? -1 : 0);
            stream.writeObjectId(data.playerID);
        },
        serializeFull(): void { /* death markers have no full serialization */ },
        deserializePartial(stream) {
            return {
                position: stream.readPosition(),
                layer: stream.readLayer(),
                isNew: stream.readUint8() !== 0,
                playerID: stream.readObjectId()
            };
        },
        deserializeFull() { /* death markers have no full serialization */ }
    },
    //
    // Building Serialization
    //
    [ObjectCategory.Building]: {
        serializePartial(stream, data): void {
            stream.writeBooleanGroup(
                data.dead,
                data.puzzle !== undefined,
                // for now, this is okay, since the space isn't being used
                // up anyways—if space is needed in the future, then
                // these two booleans can be booted off
                data.puzzle?.solved,
                data.puzzle?.errorSeq
            );
            stream.writeLayer(data.layer);
        },
        serializeFull(stream, { full }): void {
            Buildings.writeToStream(stream, full.definition);
            stream.writePosition(full.position);
            stream.writeUint8(full.orientation);
        },
        deserializePartial(stream) {
            const [
                dead,
                hasPuzzle,
                solved,
                errorSeq
            ] = stream.readBooleanGroup();

            return {
                dead,
                puzzle: hasPuzzle
                    ? { solved, errorSeq }
                    : undefined,
                layer: stream.readLayer()
            };
        },
        deserializeFull(stream) {
            return {
                definition: Buildings.readFromStream(stream),
                position: stream.readPosition(),
                orientation: stream.readUint8() as Orientation
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
            stream.writeFloat(data.height, 0, 1, 1);
        },
        serializeFull(stream, { full }) {
            stream.writePosition(full.position);
        },
        deserializePartial(stream) {
            return {
                height: stream.readFloat(0, 1, 1)
            };
        },
        deserializeFull(stream) {
            return {

                position: stream.readPosition()

            };
        }
    },
    [ObjectCategory.SyncedParticle]: {
        serializePartial(stream, data) {
            const {
                definition,
                startPosition,
                endPosition,
                layer,
                age,
                lifetime,
                angularVelocity,
                scale,
                alpha,
                variant,
                creatorID
            } = data;

            SyncedParticles.writeToStream(stream, definition);
            stream.writePosition(startPosition);
            stream.writePosition(endPosition);
            stream.writeLayer(layer);
            stream.writeFloat(age, 0, 1, 1);

            if (typeof definition.lifetime === "object") {
                const { min, max } = definition.lifetime;
                // biome-ignore lint/style/noNonNullAssertion: cannot be undefined here
                stream.writeFloat(lifetime!, min, max, 1);
            }

            if (typeof definition.angularVelocity === "object") {
                const { min, max } = definition.angularVelocity;
                // biome-ignore lint/style/noNonNullAssertion: cannot be undefined here
                stream.writeFloat(angularVelocity!, min, max, 1);
            }

            if (scale !== undefined) {
                stream.writeScale(scale.start);
                stream.writeScale(scale.end);
            }

            if (alpha !== undefined) {
                stream.writeFloat(alpha.start, 0, 1, 1);
                stream.writeFloat(alpha.end, 0, 1, 1);
            }

            if (definition.variations !== undefined && variant !== undefined) {
                stream.writeUint8(variant);
            }

            if (creatorID !== undefined) {
                stream.writeObjectId(creatorID);
            }
        },
        serializeFull() { /* no full serialization */ },
        deserializePartial(stream) {
            const data: Mutable<ObjectsNetData[ObjectCategory.SyncedParticle]> = {
                definition: SyncedParticles.readFromStream(stream),
                startPosition: stream.readPosition(),
                endPosition: stream.readPosition(),
                layer: stream.readLayer(),
                age: stream.readFloat(0, 1, 1)
            };

            const {
                lifetime,
                angularVelocity,
                scale,
                alpha,
                variations,
                hasCreatorID
            } = data.definition;

            if (typeof lifetime === "object") {
                data.lifetime = stream.readFloat(lifetime.min, lifetime.max, 1);
            }

            if (typeof angularVelocity === "object") {
                data.angularVelocity = stream.readFloat(angularVelocity.min, angularVelocity.max, 1);
            }

            if (typeof scale === "object") {
                data.scale = {
                    start: stream.readScale(),
                    end: stream.readScale()
                };
            }

            if (typeof alpha === "object") {
                data.alpha = {
                    start: stream.readFloat(0, 1, 1),
                    end: stream.readFloat(0, 1, 1)
                };
            }

            if (variations !== undefined) {
                data.variant = stream.readUint8() as Variation;
            }

            if (hasCreatorID) {
                data.creatorID = stream.readObjectId();
            }

            return data;
        },
        deserializeFull() { /* no full serialization */ }
    },
    [ObjectCategory.Projectile]: {
        serializePartial(strm, data) {
            strm.writePosition(data.position)
                .writeRotation2(data.rotation)
                .writeLayer(data.layer)
                .writeFloat(data.height, 0, GameConstants.projectiles.maxHeight, 1);
        },
        serializeFull(stream, { full }) {
            Throwables.writeToStream(stream, full.definition);
            stream.writeBooleanGroup(full.halloweenSkin, full.activated);

            if (full.definition.c4 && full.c4) {
                stream.writeUint8(full.c4.throwerTeamID);
                stream.writeUint8(full.c4.tintIndex);
            }
        },
        deserializePartial(stream) {
            return {
                position: stream.readPosition(),
                rotation: stream.readRotation2(),
                layer: stream.readLayer(),
                height: stream.readFloat(0, GameConstants.projectiles.maxHeight, 1)
            };
        },
        deserializeFull(stream) {
            const definition = Throwables.readFromStream(stream);
            const [halloweenSkin, activated] = stream.readBooleanGroup();

            const data: Mutable<ObjectsNetData[ObjectCategory.Projectile]["full"]> = {
                definition,
                halloweenSkin,
                activated
            };

            if (definition.c4) {
                data.c4 = {
                    throwerTeamID: stream.readUint8(),
                    tintIndex: stream.readUint8()
                };
            }

            return data;
        }
    }
};
