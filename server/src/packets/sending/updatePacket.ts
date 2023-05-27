import { SendingPacket } from "../../types/sendingPacket";

import { ObjectCategory, PacketType } from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../../common/src/utils/objectType";

export class UpdatePacket extends SendingPacket {
    override readonly allocBytes = 1 << 13;
    override readonly type = PacketType.Update;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        const player = this.player;
        const game = player.game;

        //
        // Active player data
        //

        // Position and rotation
        player.serializePartial(stream);

        // Health
        stream.writeBoolean(player.dirty.health);
        if (player.dirty.health) {
            stream.writeFloat(player.health, 0, 100, 8);
            player.dirty.health = false;
        }

        // Adrenaline
        stream.writeBoolean(player.dirty.adrenaline);
        if (player.dirty.adrenaline) {
            stream.writeFloat(player.adrenaline, 0, 100, 8);
            player.dirty.adrenaline = false;
        }

        // Active player ID
        stream.writeBoolean(player.dirty.activePlayerId);
        if (player.dirty.activePlayerId) {
            stream.writeUint16(player.id);
            player.dirty.activePlayerId = false;
        }

        // Active item index
        stream.writeBoolean(player.dirty.activeItemIndex);
        if (player.dirty.activeItemIndex) {
            stream.writeUint8(player.activeItemIndex);
            player.dirty.activeItemIndex = false;
        }

        //
        // Objects
        //

        // Full objects
        const fullObjectsDirty = player.fullDirtyObjects.size !== 0;
        stream.writeBoolean(fullObjectsDirty);

        if (fullObjectsDirty) {
            stream.writeUint8(player.fullDirtyObjects.size);
            for (const fullObject of player.fullDirtyObjects) {
                stream.writeObjectType(fullObject.type);
                stream.writeUint16(fullObject.id);
                fullObject.serializePartial(stream);
                fullObject.serializeFull(stream);
            }
            player.fullDirtyObjects.clear();
        }

        // Partial objects
        const partialObjectsDirty = player.partialDirtyObjects.size !== 0;
        stream.writeBoolean(partialObjectsDirty);

        if (partialObjectsDirty) {
            stream.writeUint8(player.partialDirtyObjects.size);
            for (const partialObject of player.partialDirtyObjects) {
                stream.writeUint16(partialObject.id);
                partialObject.serializePartial(stream);
            }
            player.partialDirtyObjects.clear();
        }

        // Deleted objects
        const deletedObjectsDirty = player.deletedObjects.size !== 0;
        stream.writeBoolean(deletedObjectsDirty);

        if (deletedObjectsDirty) {
            stream.writeUint8(player.deletedObjects.size);
            for (const deletedObject of player.deletedObjects) {
                stream.writeUint16(deletedObject.id);
            }

            player.deletedObjects.clear();
        }

        // Bullets
        const bulletsDirty = game.newBullets.size !== 0;
        stream.writeBoolean(bulletsDirty);
        if (bulletsDirty) {
            stream.writeUint8(game.newBullets.size);
            for (const bullet of game.newBullets) {
                stream.writeObjectTypeNoCategory(ObjectType.fromString(ObjectCategory.Loot, bullet.source.idString));
                stream.writePosition(bullet.initialPosition);
                stream.writePosition(bullet.finalPosition);
            }
        }

        // Explosions
        const explosionsDirty = game.explosions.size !== 0;
        stream.writeBoolean(explosionsDirty);
        if (explosionsDirty) {
            stream.writeUint8(game.explosions.size);
            for (const explosion of game.explosions) {
                explosion.serialize(stream);
            }
        }

        const aliveCountDirty: boolean = game.aliveCountDirty || player.fullUpdate;
        stream.writeBoolean(aliveCountDirty);
        if (aliveCountDirty) {
            stream.writeBits(game.aliveCount, 7);
        }

        player.fullUpdate = false;
    }
}
