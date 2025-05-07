import { DefinitionType, ItemType, ObjectDefinitions, type ItemDefinition } from "../../utils/objectDefinitions";

export interface ScopeDefinition extends ItemDefinition {
    readonly defType: DefinitionType.Scope
    readonly itemType: ItemType.Scope
    readonly zoomLevel: number
    readonly giveByDefault?: boolean
}

export const Scopes = new ObjectDefinitions<ScopeDefinition>(([
    ["1x", 70, true],
    ["2x", 100, true],
    ["4x", 130],
    ["8x", 160],
    ["16x", 220]
    // Value 190 reserved for possible 12x scope
] satisfies ReadonlyArray<[string, number, boolean?]>).map(([magnification, zoomLevel, defaultScope]) => ({
    idString: `${magnification}_scope`,
    name: `${magnification} Scope`,
    defType: DefinitionType.Scope,
    itemType: ItemType.Scope,
    noDrop: defaultScope,
    giveByDefault: defaultScope,
    zoomLevel
})));

export const DEFAULT_SCOPE = Scopes.definitions[0];
