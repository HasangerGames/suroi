const badWords: string[] = [
    "nigger",
    "n1gger",
    "n1gg3r",
    "n!gger",
    "n!gg3r",

    "nigga",
    "n1gga",
    "nigg@",
    "n1gg@",
    "n!gga",
    "n!gg@",

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
