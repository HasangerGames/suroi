import { Loots } from "../../common/src/definitions/loots";
import { defaultClientCVars } from "./scripts/utils/console/defaultClientCVars";

export const TRANSLATIONS = {
    defaultLanguage: "en",
    translations: {
        en: {
            name: "English",
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
            msg_your_rank: "Rank",

            go_kills: "Kills:",
            go_damage_done: "Damage Done:",
            go_damage_taken: "Damage Taken:",
            go_time_alive: "Time Alive:"
        },
        hp18: {
            name: "HP-18",
            model_37: "HP-18",
            msg_rotate: "HP-18"
        },
    }
} as {
    readonly defaultLanguage: string,
    readonly translations: Record<string, Record<string, string> & {name: string}>
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