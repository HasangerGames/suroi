/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { SendingPacket } from "../../types/sendingPacket";
import { type SuroiBitStream } from "../../../../common/src/utils/suroiBitStream";
import { type Player } from "../../objects/player";
import { PacketType } from "../../../../common/src/constants";
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
        stream.writePosition(p.position);
        stream.writeRotation(p.rotation);

        // Health and adrenaline
        /* stream.writeBoolean(p.healthDirty);
        if (p.healthDirty) stream.writeFloat(p.health, 0, 100, 8);

        stream.writeBoolean(p.adrenalineDirty);
        if (p.adrenalineDirty) stream.writeFloat(p.adrenaline, 0, 100, 8); */

        //
        // Objects
        //

        // Full objects
        const fullObjectsDirty: boolean = (p.fullDirtyObjects.size !== 0);
        stream.writeBoolean(fullObjectsDirty);
        if (fullObjectsDirty) {
            stream.writeUint8(p.fullDirtyObjects.size);
            for (const fullObject of p.fullDirtyObjects) {
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
    }
}
