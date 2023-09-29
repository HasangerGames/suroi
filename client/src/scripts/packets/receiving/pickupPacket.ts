import { ObjectCategory } from "../../../../../common/src/constants";
import { type LootDefinition } from "../../../../../common/src/definitions/loots";
import { ItemType } from "../../../../../common/src/utils/objectDefinitions";
import { type SuroiBitStream } from "../../../../../common/src/utils/suroiBitStream";
import { ReceivingPacket } from "../../types/receivingPacket";

export class PickupPacket extends ReceivingPacket {
    override deserialize(stream: SuroiBitStream): void {
        const type = stream.readObjectTypeNoCategory<ObjectCategory.Loot, LootDefinition>(ObjectCategory.Loot);

        let soundID: string;
        switch (type.definition.itemType) { // A switch statement is used here to allow for many more item types in the future
            case ItemType.Ammo:
                soundID = "ammo_pickup";
                break;
            case ItemType.Healing:
                soundID = `${type.idString}_pickup`;
                break;
            case ItemType.Scope:
                soundID = "scope_pickup";
                break;
            default:
                soundID = "pickup";
                break;
        }

        this.game.soundManager.play(`${soundID}`);
    }
}
