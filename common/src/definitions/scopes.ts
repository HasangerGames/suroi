import { ItemType, ObjectDefinitions, type ItemDefinition } from "../utils/objectDefinitions";

export interface ScopeDefinition extends ItemDefinition {
    readonly itemType: ItemType.Scope
    readonly zoomLevel: number
    readonly giveByDefault: boolean
}

export const Scopes = ObjectDefinitions.withDefault<ScopeDefinition>()(
    "Scopes",
    {
        itemType: ItemType.Scope,
        noDrop: false,
        giveByDefault: false
    },
    ([derive]) => {
        const scope = derive((magnification: number) => ({
            idString: `${magnification}x_scope`,
            name: `${magnification}x Scope`
        }));

        return [
            scope(
                [1],
                {
                    zoomLevel: 70,
                    noDrop: true,
                    giveByDefault: true
                }
            ),
            scope([2], { zoomLevel: 100 }),
            scope([4], { zoomLevel: 135 }),
            scope([8], { zoomLevel: 185 }),
            scope([15], { zoomLevel: 255 })
        ];
    }
);

export const DEFAULT_SCOPE = Scopes.definitions[0];
