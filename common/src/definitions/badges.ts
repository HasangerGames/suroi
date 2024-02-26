import {
    ObjectDefinitions,
    type ObjectDefinition
} from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly roles?: string | string[]
}

export const Badges = new ObjectDefinitions<BadgeDefinition>([
    {
        idString: "developer",
        name: "Developer",
        roles: "dev"
    },
    {
        idString: "artist",
        name: "Artist",
        roles: "artist"
    },
    {
        idString: "youtuber",
        name: "Youtuber",
        roles: "youtuber"
    },
    {
        idString: "owner",
        name: "Owner",
        roles: "hasanger"
    }
]);
