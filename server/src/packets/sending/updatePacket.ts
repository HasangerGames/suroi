import { PacketType } from "../../../../common/src/constants";
import { Emotes } from "../../../../common/src/definitions/emotes";
import { Explosions } from "../../../../common/src/definitions/explosions";
import { distanceSquared, lineIntersectsRect2 } from "../../../../common/src/utils/math";
import { ObjectSerializations } from "../../../../common/src/utils/objectsSerializations";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Bullet } from "../../objects/bullet";
import { type Explosion } from "../../objects/explosion";
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
            const killLeader = this.player.game.killLeader;
            const hasKillLeader = killLeader !== undefined;
            if (spectating) {
                stream.writePlayerNameWithColor(player);
                stream.writeBoolean(hasKillLeader);
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
                stream.writeObjectType(fullObject.type);
                stream.writeObjectID(fullObject.id);

                (ObjectSerializations[fullObject.type]
                    .serializeFull as (stream: SuroiBitStream, data: typeof fullObject.data) => void)(stream, fullObject.data);
            }
            player.fullDirtyObjects.clear();
        }

        // Partial objects
        if (partialObjectsDirty) {
            stream.writeUint16(player.partialDirtyObjects.size);

            for (const partialObject of player.partialDirtyObjects) {
                stream.writeObjectType(partialObject.type);
                stream.writeObjectID(partialObject.id);

                (ObjectSerializations[partialObject.type]
                    .serializePartial as (stream: SuroiBitStream, data: typeof partialObject.data) => void)(stream, partialObject.data);
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

        // Cull bullets
        const bullets: Bullet[] = [];
        for (const bullet of game.newBullets) {
            if (lineIntersectsRect2(bullet.initialPosition,
                bullet.finalPosition,
                player.screenHitbox.min,
                player.screenHitbox.max)) {
                bullets.push(bullet);
            }
        }

        // Bullets
        if (bulletsDirty) {
            stream.writeUint8(bullets.length);
            for (const bullet of bullets) {
                bullet.serialize(stream);
            }
        }

        // Cull explosions
        const explosions: Explosion[] = [];
        for (const explosion of game.explosions) {
            if (player.screenHitbox.isPointInside(explosion.position) ||
                distanceSquared(explosion.position, player.position) < 16384) {
                explosions.push(explosion);
            }
        }

        // Explosions
        if (explosionsDirty) {
            stream.writeUint8(explosions.length);
            for (const explosion of explosions) {
                Explosions.writeToStream(stream, explosion.definition);
                stream.writePosition(explosion.position);
            }
        }

        // Emotes
        if (emotesDirty) {
            stream.writeBits(player.emotes.size, 7);
            for (const emote of player.emotes) {
                Emotes.writeToStream(stream, emote.definition);
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
