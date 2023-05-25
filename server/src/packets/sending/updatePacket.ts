import { SendingPacket } from "../../types/sendingPacket";

import { PacketType } from "../../../../common/src/constants";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";

export class UpdatePacket extends SendingPacket {
    override readonly allocBytes = 1 << 13;
    override readonly type = PacketType.Update;

    override serialize(stream: SuroiBitStream): void {
        super.serialize(stream);

        const p = this.player;
        const game = p.game;

        //
        // Active player data
        //

        // Position and rotation
        p.serializePartial(stream);

        // Health
        stream.writeBoolean(p.healthDirty);
        if (p.healthDirty) {
            stream.writeFloat(p.health, 0, 100, 8);
            p.healthDirty = false;
        }

        // Adrenaline
        stream.writeBoolean(p.adrenalineDirty);
        if (p.adrenalineDirty) {
            stream.writeFloat(p.adrenaline, 0, 100, 8);
            p.adrenalineDirty = false;
        }

        // Active player ID
        stream.writeBoolean(p.activePlayerIDDirty);
        if (p.activePlayerIDDirty) {
            stream.writeUint16(p.id);
            p.activePlayerIDDirty = false;
        }

        //
        // Objects
        //

        // Full objects
        const fullObjectsDirty = p.fullDirtyObjects.size !== 0;
        stream.writeBoolean(fullObjectsDirty);

        if (fullObjectsDirty) {
            stream.writeUint8(p.fullDirtyObjects.size);
            for (const fullObject of p.fullDirtyObjects) {
                stream.writeObjectType(fullObject.type);
                stream.writeUint16(fullObject.id);
                fullObject.serializePartial(stream);
                fullObject.serializeFull(stream);
            }
            p.fullDirtyObjects.clear();
        }

        // Partial objects
        const partialObjectsDirty = p.partialDirtyObjects.size !== 0;
        stream.writeBoolean(partialObjectsDirty);

        if (partialObjectsDirty) {
            stream.writeUint8(p.partialDirtyObjects.size);
            for (const partialObject of p.partialDirtyObjects) {
                stream.writeUint16(partialObject.id);
                partialObject.serializePartial(stream);
            }
            p.partialDirtyObjects.clear();
        }

        // Deleted objects
        const deletedObjectsDirty = p.deletedObjects.size !== 0;
        stream.writeBoolean(deletedObjectsDirty);

        if (deletedObjectsDirty) {
            stream.writeUint8(p.deletedObjects.size);
            for (const deletedObject of p.deletedObjects) {
                stream.writeUint16(deletedObject.id);
            }

            p.deletedObjects.clear();
        }

        // Bullets
        const bulletsDirty = game.newBullets.size !== 0;
        stream.writeBoolean(bulletsDirty);
        if (bulletsDirty) {
            stream.writeUint8(game.newBullets.size);
            for (const bullet of game.newBullets) {
                stream.writeObjectTypeNoCategory(bullet.type);
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

        const aliveCountDirty: boolean = game.aliveCountDirty || p.fullUpdate;
        stream.writeBoolean(aliveCountDirty);
        if (aliveCountDirty) {
            stream.writeBits(game.aliveCount, 7);
        }

        p.fullUpdate = false;
    }
}
