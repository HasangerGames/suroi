import { Loots } from "../../common/src/definitions/loots";
import { defaultClientCVars } from "./scripts/utils/console/defaultClientCVars";

export const TRANSLATIONS = {
    defaultLanguage: "en",
    translations: {
        en: {
            name: "English",
            flag: "🇬🇧",

            msg_rotate: "For a better experience, please rotate your device to landscape.",
            msg_loading: "Connecting",

            play_solo: "Play Solo",
            play_duo: "Play Duos",
            play_squad: "Play Squads",
            join_team: "Join Team",
            create_team: "Create Team",
            msg_locked_tooltip: "The game switches between solos and duos every 24 hours, as there aren't enough players for both.",
            rules_and_tutorial: "Rules & Tutorial",
            loadout: "Loadout",
            settings: "Settings",

            featured_youtubr: "Featured Youtubr",
            featured_streamr: "Featured Streamr",

            btn_report: "Report",
            btn_spectate_kill_leader: "Spectate Kill Leader",
            btn_spectate: "Spectate",
            btn_play_again: "Play Again",
            btn_menu: "Menu",

            msg_waiting_for_leader: "Waiting for leader",
            msg_you_died: "You died.",
            msg_player_died: "<player> died.",
            msg_win: "Winner Winner Chicken Dinner!",
            msg_your_rank: "Rank",

            msg_kills: "Kills: <kills>",

            kf_suicide_kill: "<player> commited suicide",
            kf_suicide_downed: "<player> knocked themselves out",
            kf_two_party_kill: "<player> killed <victim>",
            kf_two_party_downed: "<player> knocked out <victim>",
            kf_bleed_out_kill: "<player> bled out",
            kf_bleed_out_downed: "<player bled out non-lethally",
            kf_finished_off_kill: "<player> finished off <victim>",
            kf_finished_off_downed: "<player> gently finished off <victim>",
            kf_finally_killed: "<player> was finally killed",
            kf_finally_downed: "<player> was finally knocked out",
            kf_gas_kill: "<player> died to the gas",
            kf_gas_downed: "<player> was knocked out by the gas",
            kf_airdrop_kill: "<player> was fatally crushed by an airdrop",
            kf_airdrop_downed: "<player> was knocked out by an airdrop",

            go_kills: "Kills:",
            go_damage_done: "Damage Done:",
            go_damage_taken: "Damage Taken:",
            go_time_alive: "Time Alive:",

            languages: "Languages"
        },
        fr: {
            name: "Français",
            flag: "🇫🇷",

            loadout: "Loadout",
            settings: "Réglages",

            languages: "Langues"
        },
    }
} as {
    readonly defaultLanguage: string,
    readonly translations: Record<string, Record<string, string> & {name: string, flag: string}>
}

const localStorage = JSON.parse(window.localStorage.getItem("suroi_config") ?? "{}")

export function getTranslatedString(id: string, replacements?: Record<string, string>) {
    const language = localStorage["variables"]["cv_language"] ?? defaultClientCVars["cv_language"]

    let foundTranslation = TRANSLATIONS["translations"][language][id]
        ?? TRANSLATIONS["translations"][TRANSLATIONS.defaultLanguage][id]
        ?? Loots.reify(id).name;

    if (!foundTranslation) return "";

    if (!replacements) {
        return foundTranslation;
    }

    for (const [search, replace] of Object.entries(replacements)) {
        foundTranslation = foundTranslation.replaceAll(`<${search}>`, replace);
    }
    return foundTranslation;
}

let debugTranslationCounter = 0

document.querySelectorAll("body *").forEach((element) => {
    const requestedTranslation = element.getAttribute("translation")
    if (!requestedTranslation) return;

    (element as HTMLDivElement).innerText = getTranslatedString(requestedTranslation)
    debugTranslationCounter++
})

console.log("Translated", debugTranslationCounter, "strings")