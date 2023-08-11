const badWords: string[] = [
    "nigger",
    "n1gger",
    "n1gg3r",
    "n!gger",
    "n!gg3r",
    "ni99er",
    "ni999er",
    "ni9999er",
    "ni55er",
    "ni555er",
    "ni5555er",

    "nigga",
    "n1gga",
    "nigg@",
    "n1gg@",
    "n!gga",
    "n!gg@",

    "niga",
    "n1ga",
    "nig@",
    "n1g@",
    "n!ga",
    "n!g@",

    "faggot",
    "fagg0t",
    "f@ggot",
    "f@gg0t"
];

export function hasBadWords(text: string): boolean {
    for (const badWord of badWords) {
        if (text.toLowerCase().includes(badWord)) return true;
    }
    return false;
}
