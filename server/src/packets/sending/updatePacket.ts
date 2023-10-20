import { PacketType } from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { SendingPacket } from "../../types/sendingPacket";

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

        stream.writeBoolean(player.dirty.maxMinStats || player.fullUpdate);
        stream.writeBoolean(player.dirty.health || player.fullUpdate);
        stream.writeBoolean(player.dirty.adrenaline || player.fullUpdate);
        stream.writeBoolean(player.dirty.zoom || player.fullUpdate);
        stream.writeBoolean(player.dirty.activePlayerID || player.fullUpdate);

        const fullObjectsDirty = player.fullDirtyObjects.size !== 0;
        stream.writeBoolean(fullObjectsDirty);

        const partialObjectsDirty = player.partialDirtyObjects.size !== 0;
        stream.writeBoolean(partialObjectsDirty);

        const deletedObjectsDirty = player.deletedObjects.size !== 0;
        stream.writeBoolean(deletedObjectsDirty);

        const bulletsDirty = game.newBullets.size !== 0;
        stream.writeBoolean(bulletsDirty);

        const explosionsDirty = game.explosions.size !== 0;
        stream.writeBoolean(explosionsDirty);

        const emotesDirty = player.emotes.size !== 0;
        stream.writeBoolean(emotesDirty);

        const gasDirty = game.gas.dirty || player.fullUpdate;
        stream.writeBoolean(gasDirty);

        const gasPercentageDirty = game.gas.percentageDirty && !game.gas.dirty;
        stream.writeBoolean(gasPercentageDirty);

        const aliveCountDirty = game.aliveCountDirty || player.fullUpdate;
        stream.writeBoolean(aliveCountDirty);

        // Max health, min/max adren
        if (player.dirty.maxMinStats || player.fullUpdate) {
            stream.writeFloat32(player.maxHealth);
            stream.writeFloat32(player.minAdrenaline);
            stream.writeFloat32(player.maxAdrenaline);
            player.dirty.maxMinStats = false;
        }

        // Health
        if (player.dirty.health || player.fullUpdate) {
            stream.writeFloat(player.health, 0, player.maxHealth, 12);
            player.dirty.health = false;
        }

        // Adrenaline
        if (player.dirty.adrenaline || player.fullUpdate) {
            stream.writeFloat(player.adrenaline, player.minAdrenaline, player.maxAdrenaline, 10);
            player.dirty.adrenaline = false;
        }

        // Zoom
        if (player.dirty.zoom || player.fullUpdate) {
            stream.writeUint8(player.zoom);
            player.dirty.zoom = false;
        }

        // Active player ID
        if (player.dirty.activePlayerID || player.fullUpdate) {
            stream.writeObjectID(player.id);
            player.dirty.activePlayerID = false;
            const spectating = player.spectators.size > 0;
            stream.writeBoolean(spectating);
            if (spectating) {
                stream.writePlayerNameWithColor(player);
            }
        }

        // Inventory
        player.inventory.serializeInventory(stream);

        //
        // Objects
        //

        // Full objects
        if (fullObjectsDirty) {
            stream.writeUint16(player.fullDirtyObjects.size);

            for (const fullObject of player.fullDirtyObjects) {
                stream.writeObjectType(fullObject.createObjectType());
                stream.writeObjectID(fullObject.id);
                fullObject.serializeFull(stream);
            }
            player.fullDirtyObjects.clear();
        }

        // Partial objects
        if (partialObjectsDirty) {
            stream.writeUint16(player.partialDirtyObjects.size);

            for (const partialObject of player.partialDirtyObjects) {
                stream.writeObjectType(partialObject.createObjectType());
                stream.writeObjectID(partialObject.id);
                partialObject.serializePartial(stream);
            }
            player.partialDirtyObjects.clear();
        }

        // Deleted objects
        if (deletedObjectsDirty) {
            stream.writeUint16(player.deletedObjects.size);

            for (const deletedObject of player.deletedObjects) {
                stream.writeObjectID(deletedObject.id);
            }

            player.deletedObjects.clear();
        }

        // Bullets
        if (bulletsDirty) {
            stream.writeUint8(game.newBullets.size);
            for (const bullet of game.newBullets) {
                stream.writeObjectType(bullet.sourceObjectType);
                stream.writePosition(bullet.initialPosition);
                stream.writeRotation(bullet.rotation, 16);
                stream.writeFloat(bullet.variance, 0, 1, 4);
                stream.writeBits(bullet.reflectionCount, 2);
                stream.writeObjectID(bullet.sourceID);
            }
        }

        // Explosions
        if (explosionsDirty) {
            stream.writeUint8(game.explosions.size);
            for (const explosion of game.explosions) {
                explosion.serialize(stream);
            }
        }

        // Emotes
        if (emotesDirty) {
            stream.writeBits(player.emotes.size, 7);

            for (const emote of player.emotes) {
                stream.writeObjectTypeNoCategory(emote.createObjectType());
                stream.writeObjectID(emote.player.id);
            }

            player.emotes.clear();
        }

        // Gas
        if (gasDirty) {
            stream.writeBits(game.gas.state, 2);
            stream.writeBits(game.gas.initialDuration, 7);
            stream.writePosition(game.gas.oldPosition);
            stream.writePosition(game.gas.newPosition);
            stream.writeFloat(game.gas.oldRadius, 0, 2048, 16);
            stream.writeFloat(game.gas.newRadius, 0, 2048, 16);

            // Percentage needs to be sent early when the player is joining,
            // so the duration in gas messages is correct
            stream.writeBoolean(player.fullUpdate);
            if (player.fullUpdate) stream.writeFloat(game.gas.percentage, 0, 1, 16);
        }

        // Gas percentage
        if (gasPercentageDirty) {
            stream.writeFloat(game.gas.percentage, 0, 1, 16);
        }

        // Alive count
        if (aliveCountDirty) {
            stream.writeBits(game.aliveCount, 7);
        }

        player.fullUpdate = false;
    }
}
