import {
    ObjectDefinitions,
    type ObjectDefinition
} from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly idString: string
    readonly roleRequired?: string
}

export const Badges = new ObjectDefinitions<BadgeDefinition>([
    {
        idString: "developer",
        name: "Developer",
        roleRequired: "dev"
    },
    {
        idString: "artist",
        name: "Artist",
        roleRequired: "artist"
    },
    {
        idString: "youtuber",
        name: "Youtuber",
        roleRequired: "youtuber"
    },
    {
        idString: "owner",
        name: "Owner",
        roleRequired: "hasanger"
    }
]);
