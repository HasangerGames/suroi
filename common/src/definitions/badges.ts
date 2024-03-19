import {
    ObjectDefinitions,
    type ObjectDefinition
} from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly roles: string[]
}

export const Badges = ObjectDefinitions.create<BadgeDefinition>()(
    defaultFactory => ({
        [defaultFactory]: () => ({
            roles: []
        }),
        badge_factory: (name: string) => ({
            idString: name.toLowerCase().replace(/ /g, "_"),
            name
        })
    })
)(
    apply => [
        apply(
            "badge_factory",
            { roles: ["developr"] },
            "Developr"
        ),
        apply(
            "badge_factory",
            { roles: ["designr"] },
            "Designr"
        ),
        apply(
            "badge_factory",
            { roles: ["composr"] },
            "Composr"
        ),
        apply(
            "badge_factory",
            { roles: ["youtubr", "123op"] },
            "Youtubr"
        ),
        apply(
            "badge_factory",
            { roles: ["hasanger"] },
            "Ownr"
        ),
        apply(
            "badge_factory",
            { roles: ["katie", "leia"] },
            "Contributr+"
        ),
        apply("badge_factory", {}, "Bleh"),
        apply("badge_factory", {}, "Froog"),
        apply("badge_factory", {}, "AEGIS Logo"),
        apply("badge_factory", {}, "Flint Logo"),
        apply("badge_factory", {}, "Duel")
    ]
);
