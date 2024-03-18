import { ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly roles: string[]
}

export const Badges = ObjectDefinitions.create<BadgeDefinition>()(
    defaultFactory => ({
        [defaultFactory]: () => ({
            roles: []
        }),
        badge_factory: (name: string, roles: string[] = []) => ({
            idString: name.toLowerCase().replace(/ /g, "_"),
            name,
            roles
        })
    })
)(
    ({ simple }) => [
        simple("badge_factory", "Developr", ["developr"]),
        simple("badge_factory", "Designr", ["designr"]),
        simple("badge_factory", "Composr", ["composr"]),
        simple("badge_factory", "Youtubr", ["youtubr", "123op"]),
        simple("badge_factory", "Ownr", ["hasanger"]),
        simple("badge_factory", "Contributr+", ["katie", "leia"]),
        simple("badge_factory", "Bleh"),
        simple("badge_factory", "Froog"),
        simple("badge_factory", "AEGIS Logo"),
        simple("badge_factory", "Flint Logo"),
        simple("badge_factory", "Duel")
    ]
);
