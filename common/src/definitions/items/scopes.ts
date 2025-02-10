import { ItemType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";

export interface ScopeDefinition extends ItemDefinition {
    readonly itemType: ItemType.Scope
    readonly zoomLevel: number
    readonly giveByDefault?: boolean
}

export const Scopes = new ObjectDefinitions<ScopeDefinition>(([
    ["1x", 80, true],
    ["2x", 110, true],
    ["4x", 140],
    ["8x", 170],
    ["16x", 220]
] satisfies ReadonlyArray<[string, number, boolean?]>).map(([magnification, zoomLevel, defaultScope]) => ({
    idString: `${magnification}_scope`,
    name: `${magnification} Scope`,
    itemType: ItemType.Scope,
    noDrop: defaultScope,
    giveByDefault: defaultScope,
    zoomLevel
})));

export const DEFAULT_SCOPE = Scopes.definitions[0];
