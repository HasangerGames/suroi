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
        roles: "dev"
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
    }
]);
