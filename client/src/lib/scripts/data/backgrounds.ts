import { pickRandomInArray } from "$common/utils/random";

export function randomBackground(): { filename: string, artist: string } {
    const backgrounds: [string, string][] = [
        ["bridge_duel_precisederp.png", "@PreciseDerp"],
        ["gun_vs_c4_precisederp.png", "@PreciseDerp"],
        ["terrorizer_migraine7341.png", "@migraine7341"],
        ["suroi_moment_migraine7341.png", "@migraine7341"],
        ["tango_51_boeing_777.jpg", "Boeing_777"],
        ["winter_confrontation_yoko.png", "Yoko"],
        ["l115a1_sniper_yoko.png", "Yoko"],
        ["untitled_winter_yoko.png", "Yoko"],
        ["harvest_mode_yoko.png", "Yoko"],
        ["hunted_mode_experience_deviouslemon331.png", "DeviousLemon331"],
        ["monument_j.png", "J"],
        ["rounds_j.png", "J"],
        ["most_average_hunted_day_danzan.png", "danzan"],
        ["infection_yoko.png", "Yoko"],
    ];
    const [filename, artist] = pickRandomInArray(backgrounds);
    return { filename, artist };
}
