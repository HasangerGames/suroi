import { SendingPacket } from "../../types/sendingPacket";

import {
    ObjectCategory,
    PLAYER_ACTIONS_BITS,
    PacketType,
    PlayerActions
} from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { ObjectType } from "../../../../common/src/utils/objectType";
import { type HealingAction } from "../../inventory/action";

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

        // Max health
        stream.writeBoolean(player.dirty.maxHealth);
        if (player.dirty.maxHealth) {
            stream.writeFloat32(player.maxHealth);
            player.dirty.maxHealth = false;
        }

        // Health
        stream.writeBoolean(player.dirty.health);
        if (player.dirty.health) {
            stream.writeFloat(player.health, 0, player.maxHealth, 8);
            player.dirty.health = false;
        }

        // Max adrenaline
        stream.writeBoolean(player.dirty.maxAdrenaline);
        if (player.dirty.maxAdrenaline) {
            stream.writeFloat32(player.maxAdrenaline);
            player.dirty.maxAdrenaline = false;
        }

        // Adrenaline
        stream.writeBoolean(player.dirty.adrenaline);
        if (player.dirty.adrenaline) {
            stream.writeFloat(player.adrenaline, 0, player.maxAdrenaline, 8);
            player.dirty.adrenaline = false;
        }

        // Zoom
        stream.writeBoolean(player.dirty.zoom);
        if (player.dirty.zoom) {
            stream.writeUint8(player.zoom);
            player.dirty.zoom = false;
        }

        // Action
        stream.writeBoolean(player.dirty.action);
        if (player.dirty.action) {
            player.dirty.action = false;
            stream.writeBits(player.action ? player.action.type : PlayerActions.None, PLAYER_ACTIONS_BITS);

            if (player.action?.type === PlayerActions.UseItem) {
                stream.writeObjectTypeNoCategory((player.action as HealingAction).item);
            }
        }

        // Active player ID
        stream.writeBoolean(player.dirty.activePlayerId);
        if (player.dirty.activePlayerId) {
            stream.writeObjectID(player.id);
            player.dirty.activePlayerId = false;
        }

        // Inventory
        player.inventory.serializeInventory(stream);

        //
        // Objects
        //

        // Full objects
        const fullObjectsDirty = player.fullDirtyObjects.size !== 0;
        stream.writeBoolean(fullObjectsDirty);

        if (fullObjectsDirty) {
            stream.writeUint16(player.fullDirtyObjects.size);

            for (const fullObject of player.fullDirtyObjects) {
                stream.writeObjectType(fullObject.type);
                stream.writeObjectID(fullObject.id);
                fullObject.serializePartial(stream);
                fullObject.serializeFull(stream);
            }
            player.fullDirtyObjects.clear();
        }

        // Partial objects
        const partialObjectsDirty = player.partialDirtyObjects.size !== 0;
        stream.writeBoolean(partialObjectsDirty);

        if (partialObjectsDirty) {
            stream.writeUint16(player.partialDirtyObjects.size);

            for (const partialObject of player.partialDirtyObjects) {
                stream.writeObjectID(partialObject.id);
                partialObject.serializePartial(stream);
            }
            player.partialDirtyObjects.clear();
        }

        // Deleted objects
        const deletedObjectsDirty = player.deletedObjects.size !== 0;
        stream.writeBoolean(deletedObjectsDirty);

        if (deletedObjectsDirty) {
            stream.writeUint16(player.deletedObjects.size);

            for (const deletedObject of player.deletedObjects) {
                stream.writeObjectID(deletedObject.id);
            }

            player.deletedObjects.clear();
        }

        // Bullets
        const bulletsDirty = game.newBullets.size !== 0;
        stream.writeBoolean(bulletsDirty);
        if (bulletsDirty) {
            stream.writeUint8(game.newBullets.size);
            for (const bullet of game.newBullets) {
                stream.writeUint8(bullet.id);
                stream.writeObjectTypeNoCategory(ObjectType.fromString(ObjectCategory.Loot, bullet.source.definition.idString));
                stream.writePosition(bullet.initialPosition);
                stream.writeRotation(bullet.rotation, 16);
            }
        }

        // Deleted bullets
        const deletedBulletsDirty = game.deletedBulletIDs.size !== 0;
        stream.writeBoolean(deletedBulletsDirty);
        if (deletedBulletsDirty) {
            stream.writeUint8(game.deletedBulletIDs.size);
            for (const bulletID of game.deletedBulletIDs) {
                stream.writeUint8(bulletID);
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

        // Gas
        const gasDirty = game.gas.dirty || player.fullUpdate;
        stream.writeBoolean(gasDirty);
        if (gasDirty) {
            stream.writeBits(game.gas.state, 2);
            stream.writeBits(game.gas.initialDuration, 7);
            stream.writePosition(game.gas.oldPosition);
            stream.writePosition(game.gas.newPosition);
            stream.writeFloat(game.gas.oldRadius, 0, 2048, 16);
            stream.writeFloat(game.gas.newRadius, 0, 2048, 16);
        }

        // Gas percentage
        const gasPercentageDirty = game.gas.percentageDirty || player.fullUpdate;
        stream.writeBoolean(gasPercentageDirty);
        if (gasPercentageDirty) {
            stream.writeFloat(game.gas.percentage, 0, 1, 16);
        }

        // Alive count
        const aliveCountDirty = game.aliveCountDirty || player.fullUpdate;
        stream.writeBoolean(aliveCountDirty);
        if (aliveCountDirty) {
            stream.writeBits(game.aliveCount, 7);
        }

        player.fullUpdate = false;
    }
}
