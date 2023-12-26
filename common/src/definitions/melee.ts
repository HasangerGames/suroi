import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface SpawnMeleeDefinition extends ItemDefinition {
    readonly itemType: ItemType.Melee
    readonly notInLoadout?: boolean
    readonly grassTint?: boolean
    readonly hideEquipment?: boolean
    readonly roleRequired?: string
}

export const SpawnMelees = new ObjectDefinitions<SpawnMeleeDefinition>([
    {
        idString: "plzwork",
        name: "plzwork",
        itemType: ItemType.Melee,
        roleRequired: "hasanger"
    },
 
]);