import {
    ObjectDefinitions,
    type ObjectDefinition
} from "../utils/objectDefinitions";

export interface BadgeDefinition extends ObjectDefinition {
    readonly idString: string
    readonly notInLoadout?: boolean
    readonly roleRequired: string
}

export const Badges = new ObjectDefinitions<BadgeDefinition>([
    {
        name: "Developer",
        idString: "developer",
        roleRequired: "dev"
    },
    {
        name: "Artist",
        idString: "artist",
        roleRequired: "artist"
    },
    {
        name: "Youtuber",
        idString: "youtuber",
        roleRequired: "youtuber"
    },
    {
        name: "Owner",
        idString: "owner",
        roleRequired: "hasanger"
    }
]);
