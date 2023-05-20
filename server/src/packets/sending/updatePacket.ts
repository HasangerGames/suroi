import { SendingPacket } from "../../types/sendingPacket";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";
import { AnimationType, PacketType } from "../../../../common/src/constants";
import { type GameObject } from "../../types/gameObject";

export class UpdatePacket extends SendingPacket {
    constructor(player: Player) {
        super(player);
        this.type = PacketType.Update;
        this.allocBytes = 8192;
    }

    serialize(stream: SuroiBitStream): void {
        super.serialize(stream);
        const p = this.player;

        //
        // Active player data
        //

        // Position and rotation
        p.serializePartial(stream);
        p.animation = AnimationType.None;

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
        const fullObjectsDirty: boolean = (p.fullDirtyObjects.size !== 0);
        stream.writeBoolean(fullObjectsDirty);
        if (fullObjectsDirty) {
            stream.writeUint8(p.fullDirtyObjects.size);
            for (const fullObject of p.fullDirtyObjects) {
                stream.writeObjectType(fullObject.type);
                stream.writeUint16(fullObject.id);
                fullObject.serializePartial(stream);
                fullObject.serializeFull(stream);
            }
            p.fullDirtyObjects = new Set<GameObject>();
        }

        // Partial objects
        const partialObjectsDirty: boolean = (p.partialDirtyObjects.size !== 0);
        stream.writeBoolean(partialObjectsDirty);
        if (partialObjectsDirty) {
            stream.writeUint8(p.partialDirtyObjects.size);
            for (const partialObject of p.partialDirtyObjects) {
                stream.writeUint16(partialObject.id);
                partialObject.serializePartial(stream);
            }
            p.partialDirtyObjects = new Set<GameObject>();
        }

        // Deleted objects
        const deletedObjectsDirty: boolean = (p.deletedObjects.size !== 0);
        stream.writeBoolean(deletedObjectsDirty);
        if (deletedObjectsDirty) {
            stream.writeUint8(p.deletedObjects.size);
            for (const deletedObject of p.deletedObjects) {
                stream.writeUint16(deletedObject.id);
            }
            p.deletedObjects = new Set<GameObject>();
        }

        // Explosions
        const explosionsDirty = p.game.explosions.size !== 0;
        stream.writeBoolean(explosionsDirty);
        if (explosionsDirty) {
            stream.writeUint8(p.game.explosions.size);
            for (const explosion of p.game.explosions) {
                explosion.serializeFull(stream);
            }
        }
    }
}
