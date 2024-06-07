import { GameConstants } from "../../../common/src/constants";
import { Config } from "../config";

const badWordRegexes: RegExp[] = [
    /n[i1l!|\\/(){}[\]]+[g693]+[e3]*[ra@]*/i, // N word
    /f[a@4]+[g9]+[s$5z2]+[ao0]+[t+]*/i, // F slur
    /n[a@4]+z[i1]+[s$5z2]*/i, // Nazi references
    /a[d]+[o0]+[/|l1]+[f]+(\s|\W|_)*h[/|!i1]+[t]+[/|!l1]+[e3]+[r]+/i, // Hitler
    /(?=.*k[i1]+[l1]+[l1]*)(?=.*j[e3]+[w]+[s$5z2]*)/i // Antisemitist stuff
    // FIXME too broad, matches "rap"
    // sounds like that * at the end should be a + then
    /// (?=.*m[o0]+[l1]+[e3]+[s$5z2]+[t+]*)|(?=.*r[a@4]+[p]+[e3]*)/i              // Molest and rape
];

export function cleanUsername(name?: string | null): string {
    return (
        !name?.length
        || name.length > 16
        || (Config.censorUsernames && badWordRegexes.some(regex => regex.test(name)))

        || /[^\x20-\x7E]/g.test(name) // extended ASCII chars
    )
        ? GameConstants.player.defaultName
        : name;
}
