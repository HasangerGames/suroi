import { type ItemDefinition, ItemType, ObjectDefinitions } from "../utils/objectDefinitions";

export interface ScopeDefinition extends ItemDefinition {
    readonly itemType: ItemType.Scope
    readonly zoomLevel: number
    readonly giveByDefault?: boolean
}

export const Scopes = new ObjectDefinitions<ScopeDefinition>([
    {
        idString: "1x_scope",
        name: "1x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 48,
        noDrop: true,
        giveByDefault: true
    },
    {
        idString: "2x_scope",
        name: "2x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 62
    },
    {
        idString: "4x_scope",
        name: "4x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 83
    },
    {
        idString: "8x_scope",
        name: "8x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 116
    },
    {
        idString: "15x_scope",
        name: "15x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 178
    }
]);
