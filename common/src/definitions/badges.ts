import { ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly roles?: string[]
}

export const Badges = ObjectDefinitions.create<BadgeDefinition>()(
    () => ({
        badge_factory: (name: string, roles: string[] = []) => ({
            idString: name.toLowerCase().replace(/ /g, "_"),
            name,
            roles
        })
    })
)(
    ({ simple }) => [
        simple("badge_factory", "Youtubr", ["youtubr", "123op"]),
        simple("badge_factory", "Developr", ["developr", "error"]),
        simple("badge_factory", "Lead Designr", ["lead_designr"]),
        simple("badge_factory", "VIP Designr", ["vip_designr"]),
        simple("badge_factory", "Composr", ["composr"]),
        simple("badge_factory", "Lead Composr", ["lead_composr"]),
        simple("badge_factory", "Moderatr", ["moderatr"]),
        simple("badge_factory", "Trial Moderatr", ["trial_moderatr"]),
        simple("badge_factory", "Studio Managr", ["studio_managr"]),
        simple("badge_factory", "Boostr", ["boostr"]),
        simple("badge_factory", "Designr", ["designr"]),
        simple("badge_factory", "Ownr", ["hasanger"]),
        simple("badge_factory", "Contributr+", ["katie", "leia"]),
        simple("badge_factory", "Bleh"),
        simple("badge_factory", "Froog"),
        simple("badge_factory", "AEGIS Logo"),
        simple("badge_factory", "Flint Logo"),
        simple("badge_factory", "Duel"),

        simple("badge_factory", "Suroi Logo"),
        simple("badge_factory", "Fire"),
        simple("badge_factory", "Colon Three"),
        simple("badge_factory", "Suroi General Chat")
    ]
);
