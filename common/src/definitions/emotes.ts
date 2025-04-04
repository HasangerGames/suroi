import { ObjectDefinitions, type ObjectDefinition } from "../utils/objectDefinitions";
import { Ammos } from "./items/ammos";
import { Guns } from "./items/guns";
import { HealingItems } from "./items/healingItems";
import { Melees } from "./items/melees";
import { Throwables } from "./items/throwables";

export enum EmoteCategory {
    People,
    Text,
    Memes,
    Icons,
    Misc,
    Team,
    Weapon
}

export interface EmoteDefinition extends ObjectDefinition {
    readonly category: EmoteCategory
    readonly hideInLoadout?: boolean
}

export const Emotes = new ObjectDefinitions<EmoteDefinition>([
    ...Object.entries({
        [EmoteCategory.People]: [
            "Happy Face",
            "Sad Face",
            "Thumbs Up",
            "Thumbs Down",
            "Wave",
            "Disappointed Face",
            "Sobbing Face",
            "Angry Face",
            "Heart Face",
            "Flushed Face",
            "Joyful Face",
            "Cool Face",
            "Upside Down Face",
            "Picasso Face",
            "Alien",
            "Headshot",
            "Panned",
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
            "Nerd Face",
            "Side Eye Face",
            "Man Face",
            "Satisfied Face",
            "Blind Walking",
            "Melting Face",
            "Grimacing Face",
            "Vomiting Face",
            "Screaming Face",
            "Pleading Face",
            "Sad Smiling Face",
            "Triumphant Face",
            "Questioning Face",
            "Shrugging Face",
            "Facepalm",
            "Smirking Face",
            "Blushing Face",
            "Saluting Face",
            "Neutral Face",
            "Relieved Face",
            "Monocle Face",
            "Partying Face",
            "Shushing Face",
            "Sighing Face",
            "Yawning Face",
            "Frustrated Face",
            "Weary Face",
            "Pensive Face",
            "Zipper Mouth Face",
            "Zombie Face"
        ],
        [EmoteCategory.Icons]: [
            "Suroi Logo",
            "AEGIS Logo",
            "Flint Logo",
            "Skull",
            "Duel",
            "Chicken Dinner",
            "Trophy"
        ],
        [EmoteCategory.Memes]: [
            "Troll Face",
            "Clueless",
            "Pog",
            "Froog",
            "Bleh",
            "Muller",
            "Suroi General Chat",
            "RIP",
            "Leosmug",
            "awhhmahgawd",
            "emoji_50",
            "Boykisser",
            "Grr"
        ],
        [EmoteCategory.Text]: [
            "Question Mark",
            "Team = Ban",
            "Hack = Ban",
            "gg",
            "ez",
            "Hi5",
            "oof",
            "real",
            "fake",
            "Colon Three",
            "Lag"
        ],
        [EmoteCategory.Misc]: [
            "Fire",
            "Carrot",
            "Egg",
            "Penguin",
            "Squid",
            "Tomato",
            "Plumpkin",
            "Leek",
            "Eagle",
            "Logged"
        ]
    }).flatMap(([category, names]) =>
        names.map(name => ({
            idString: name.toLowerCase().replaceAll(" ", "_"),
            name,
            category: parseInt(category)
        })
        )),
    ...[
        ...Ammos,
        ...HealingItems
    ].map(({ idString, name }) => ({
        idString,
        name,
        category: EmoteCategory.Team,
        hideInLoadout: true
    })),
    ...[
        ...Guns,
        ...Melees,
        ...Throwables
    ].map(({ idString, name }) => ({
        idString,
        name,
        category: EmoteCategory.Weapon,
        hideInLoadout: true
    }))
]);
