const badWords: string[] = [
    "nigger",
    "n1gger",
    "n1gg3r",

    "niggers",
    "n1ggers",
    "n1gg3rs",

    "nigga",
    "n1gga",
    "n1ggas",

    "faggot",
    "fagg0t",

    "faggots",
    "fagg0ts"
];

export function hasBadWords(text: string): boolean {
    for (const badWord of badWords) {
        if (text.toLowerCase().includes(badWord)) return true;
    }
    return false;
}
