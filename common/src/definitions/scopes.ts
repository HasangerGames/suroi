import { ItemDefinitions, ItemType, type ItemDefinition } from "../utils/objectDefinitions";

export interface ScopeDefinition extends ItemDefinition {
    readonly itemType: ItemType.Scope
    readonly zoomLevel: number
    readonly giveByDefault: boolean
}

const scope = (magnification: string, zoomLevel: number): Omit<ScopeDefinition, "itemType"> => ({
    idString: `${magnification}_scope`,
    name: `${magnification} Scope`,
    giveByDefault: false,
    zoomLevel
});

export const Scopes = new ItemDefinitions<ScopeDefinition>(ItemType.Scope, [
    {
        ...scope("1x", 70),
        noDrop: true,
        giveByDefault: true
    },
    scope("2x", 100),
    scope("4x", 135),
    scope("8x", 185),
    scope("15x", 255)
]);

export const DEFAULT_SCOPE = Scopes.definitions[0];
