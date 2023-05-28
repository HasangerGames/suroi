const badWords: string[] = ["nigger", "nigga", "n1gger", "n1gg3r", "n1gga", "faggot", "fagg0t"];

export function hasBadWords(text: string): boolean {
    for (const badWord of badWords) {
        if (text.toLowerCase().includes(badWord)) return true;
    }
    return false;
}
