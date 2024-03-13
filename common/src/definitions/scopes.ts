import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface ScopeDefinition extends ItemDefinition {
    readonly itemType: ItemType.Scope
    readonly zoomLevel: number
    readonly giveByDefault: boolean
}

export const Scopes = ObjectDefinitions.create<ScopeDefinition>()(
    defaultTemplate => ({
        [defaultTemplate]: () => ({
            itemType: ItemType.Scope,
            noDrop: false,
            giveByDefault: false
        }),
        scope_factory: (magnification: number) => ({
            idString: `${magnification}x_scope`,
            name: `${magnification}x Scope`
        })
    })
)(
    apply => [
        apply(
            "scope_factory",
            {
                zoomLevel: 48,
                noDrop: true,
                giveByDefault: true
            },
            1
        ),
        apply("scope_factory", { zoomLevel: 62 }, 2),
        apply("scope_factory", { zoomLevel: 83 }, 4),
        apply("scope_factory", { zoomLevel: 116 }, 8),
        apply("scope_factory", { zoomLevel: 178 }, 15)
    ]
);

export const DEFAULT_SCOPE = Scopes.definitions[0];
