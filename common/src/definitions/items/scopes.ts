import { ItemType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";

export interface ScopeDefinition extends ItemDefinition {
    readonly itemType: ItemType.Scope
    readonly zoomLevel: number
    readonly giveByDefault?: boolean
}

const scope = (magnification: string, zoomLevel: number): ScopeDefinition => ({
    idString: `${magnification}_scope`,
    name: `${magnification} Scope`,
    itemType: ItemType.Scope,
    zoomLevel
});

export const Scopes = new ObjectDefinitions<ScopeDefinition>([
    {
        ...scope("1x", 80),
        noDrop: true,
        giveByDefault: true
    },
    scope("2x", 110),
    scope("4x", 140),
    scope("8x", 170),
    scope("16x", 220)
]);

export const DEFAULT_SCOPE = Scopes.definitions[0];
