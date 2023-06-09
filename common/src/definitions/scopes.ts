import { type ItemDefinition, ItemType } from "../utils/objectDefinitions";

export interface ScopeDefinition extends ItemDefinition {
    readonly itemType: ItemType.Scope
    readonly zoomLevel: number
}

export const Scopes: ScopeDefinition[] = [
    {
        idString: "1x_scope",
        name: "1x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 48,
        noDrop: true
    },
    {
        idString: "2x_scope",
        name: "2x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 56
    },
    {
        idString: "4x_scope",
        name: "4x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 72
    },
    {
        idString: "8x_scope",
        name: "8x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 96
    },
    {
        idString: "15x_scope",
        name: "15x Scope",
        itemType: ItemType.Scope,
        zoomLevel: 128
    }
];
