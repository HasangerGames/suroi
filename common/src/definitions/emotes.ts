import { createTemplate, ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";

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
    readonly isWeaponEmote?: boolean
}

const emote = createTemplate<EmoteDefinition>()((name: string, category: EmoteCategory) => ({
    idString: name.toLowerCase().replace(/ /g, "_"),
    name,
    category
}));

export const Emotes = ObjectDefinitions.create<EmoteDefinition>("Emotes", [
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
    ].map(name => emote([name, EmoteCategory.People])),
    ...[
        "Suroi Logo",
        "AEGIS Logo",
        "Flint Logo",
        "Duel",
        "Chicken Dinner",
        "Trophy"
    ].map(name => emote([name, EmoteCategory.Icons])),
    ...[
        "Troll Face",
        "Clueless",
        "Pog",
        "Froog",
        "Bleh",
        "Muller",
        "Suroi General Chat",
        "Fire",
        "RIP",
        "Leosmug",
        "awhhmahgawd",
        "Boykisser"
    ].map(name => emote([name, EmoteCategory.Memes])),
    ...[
        "Question Mark",
        "Team = Ban",
        "Hack = Ban",
        "gg",
        "ez",
        "Hi5",
        "oof",
        "real",
        "fake",
        "Colon Three"
    ].map(name => emote([name, EmoteCategory.Text]))
]);
