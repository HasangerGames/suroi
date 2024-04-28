import { ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

export enum EmoteCategory {
    People,
    Text,
    Memes,
    Icons,
    Misc,
    TeamEmote
}

export interface EmoteDefinition extends ObjectDefinition {
    readonly category: EmoteCategory
    readonly isTeamEmote?: boolean
}

export const Emotes = ObjectDefinitions.create<EmoteDefinition>()(
    () => ({
        emote_factory: (name: string, category: EmoteCategory) => ({
            idString: name.toLowerCase().replace(/ /g, "_"),
            name,
            category
        }),
        team_emote: (idString: string) => ({
            idString,
            name: idString,
            isTeamEmote: true,
            category: EmoteCategory.TeamEmote
        })
    })
)(
    ({ simple }) => [
        ...[
            "Happy Face",
            "Sad Face",
            "Thumbs Up",
            "Thumbs Down",
            "Wave",
            "Disappointed Face",
            "Sobbing Face",
            "Angry Face",
            "Heart Face",
            "Joyful Face",
            "Cool Face",
            "Upside Down Face",
            "Picasso Face",
            "Alien",
            "Headshot",
            "Dab",
            "Devil Face",
            "Bandaged Face",
            "Cold Face",
            "Thinking Face",
            "Nervous Face",
            "Sweating Face",
            "Greedy Face",
            "Creepy Clown",
            "Lying Face",
            "Skull",
            "Melting Face",
            "Grimacing Face",
            "Vomiting Face",
            "Screaming Face",
            "Pleading Face",
            "Sad Smiling Face",
            "Triumphant Face",
            "Questioning Face",
            "Smirking Face",
            "Blushing Face",
            "Saluting Face",
            "Neutral Face",
            "Relieved Face",
            "Monocle Face",
            "Partying Face",
            "Shushing Face",
            "Zipper Mouth Face",
            "Sighing Face",
            "Frustrated Face"
        ].map(name => simple("emote_factory", name, EmoteCategory.People)),
        ...[
            "Suroi Logo",
            "AEGIS Logo",
            "Flint Logo",
            "Duel",
            "Chicken Dinner"
        ].map(name => simple("emote_factory", name, EmoteCategory.Icons)),
        ...[
            "Troll Face",
            "Clueless",
            "Pog",
            "Froog",
            "Bleh",
            "Suroi General Chat",
            "Fire",
            "RIP"
        ].map(name => simple("emote_factory", name, EmoteCategory.Memes)),
        ...[
            "Question Mark",
            "Team = Ban",
            "gg",
            "ez",
            "oof",
            "real",
            "Colon Three"
        ].map(name => simple("emote_factory", name, EmoteCategory.Text)),
        ...[
            "Monkey",
            "Carrot",
            "Tomato",
            "Egg",
            "Squid"
        ].map(name => simple("emote_factory", name, EmoteCategory.Misc)),
        ...[
            "9mm",
            "12g",
            "50ae",
            "127mm",
            "556mm",
            "762mm",
            "curadell",
            "gauze",
            "medikit",
            "cola",
            "tablets"
        ].map(idString => simple("team_emote", idString))
    ]
);
