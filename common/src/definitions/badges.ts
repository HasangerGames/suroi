import {
    ObjectDefinitions,
    type ObjectDefinition
} from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly idString: string
    readonly roles?: string | string[]
}

export const Badges = new ObjectDefinitions<BadgeDefinition>([
    {
        idString: "developr",
        name: "Developr",
        roles: "developr"
    },
    {
        idString: "designr",
        name: "Designr",
        roles: "designr"
    },
    {
        idString: "youtubr",
        name: "Youtubr",
        roles: "youtubr"
    },
    {
        idString: "ownr",
        name: "Ownr",
        roles: "hasanger"
    },
    {
        idString: "contributr+",
        name: "Contributr+",
        roles: ["katie", "leia"]
    },
    {
        idString: "bleh",
        name: "Bleh"
    },
    {
        idString: "froog",
        name: "Froog"
    },
    {
        idString: "aegis_logo",
        name: "AEGIS Logo"
    },
    {
        idString: "flint_logo",
        name: "Flint Logo"
    },
    {
        idString: "duel",
        name: "Duel"
    }
]);
