import { ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

export interface EmoteDefinition extends ObjectDefinition {
    readonly isTeamEmote?: boolean
}

export const Emotes = ObjectDefinitions.create<EmoteDefinition>()(
    () => ({
        emote_factory: (name: string) => ({
            idString: name.toLowerCase().replace(/ /g, "_"),
            name
        }),
        team_emote: (idString: string) => ({
            idString,
            name: idString,
            isTeamEmote: true
        })
    })
)(
    ({ simple }) => [
        ...[
            "Happy Face",
            "Sad Face",
            "Thumbs Up",
            "Thumbs Down",
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
            "Suroi Logo",
            "AEGIS Logo",
            "Flint Logo",
            "Team = Ban",
            "gg",
            "ez",
            "Duel",
            "Question Mark",
            "Skull",
            "Troll Face",
            "Clueless",
            "Pog",
            "Froog",
            "Bleh",
            "Suroi General Chat",
            "Fire",
            "RIP",
            "Monkey",
            "Carrot",
            "Tomato",
            "Egg",
            "Squid",
            "Wave",
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
            "Frustrated Face",
            "Chicken Dinner",
            "oof",
            "real"
        ].map(name => simple("emote_factory", name)),
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
