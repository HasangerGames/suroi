/* eslint-disable no-multi-spaces */
const badWordRegexes: RegExp[] = [
    /n[i1l!]+[g693]+[e3]*[ra@]*/i,    // N word
    /f[a@4]+[g9]+[s$5z2]+[o0]+[t+]*/i, // F slur
    /n[a@4]+z[i1]+[s$5z2]*/i,          // Nazi references
    /a[d]+[o0]+[l1]+[f]+(\s|\W|_)*h[i1]+[t]+[l1]+[e3]+[r]*/i, // Adolf
    /(?=.*k[i1]+[l1]+[l1]*)(?=.*j[e3]+[w]+[s$5z2]*)/i          // Stuff against jews
];

export function hasBadWords(text: string): boolean {
    for (const badWordRegex of badWordRegexes) {
        if (badWordRegex.test(text)) return true;
    }
    return false;
}
