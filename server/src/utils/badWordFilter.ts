const badWords: string[] = [
    "nigger",
    "n1gger",
    "n1gg3r",

    "nigga",
    "n1gga",
    "nigg@",
    "n1gg@",

    "faggot",
    "fagg0t",
    "f@ggot",
    "f@gg0t"
];

export function hasBadWords(text: string): boolean {
    for (const badWord of badWords) {
        if (text.toLowerCase().includes(badWord) || text.toLowerCase().includes(`${badWord}s`)) return true;
    }
    return false;
}
