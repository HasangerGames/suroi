const badWordRegexes: string[] = [
    /n[i1!]+[g693]+[e3]*[ra@]*/i,
    /f[a@4]+[g9]+[s$5z2]+[o0]+[t+]*/i
];

export function hasBadWords(text: string): boolean {
    for (const badWordRegex of badWordRegexes) {
        if (badWordRegex.test(text)) return true;
    }
    return false;
}
