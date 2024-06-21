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
            msg_locked_tooltip: "The game switches between solos and duos every 24 hours, as there aren't enough players for both."
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

export function getTranslatedString(id: string, language: string, replacements?: Record<string, string>) {
    let foundTranslation = TRANSLATIONS["translations"][language][id]
        ?? TRANSLATIONS["translations"][TRANSLATIONS.defaultLanguage][id]
        ?? Loots.reify(id).name;
    if (!replacements) {
        return foundTranslation;
    }
    for (const [search, replace] of Object.entries(replacements)) {
        foundTranslation = foundTranslation.replaceAll(`<${search}>`, replace);
    }
    return foundTranslation;
}

const localStorage = JSON.parse(window.localStorage.getItem("suroi_config") ?? "{}")

let debugTranslationCounter = 0

document.querySelectorAll("body *").forEach((element) => {
    const requestedTranslation = element.getAttribute("translation")
    if (!requestedTranslation) return;

    element.innerHTML = getTranslatedString(requestedTranslation, localStorage["variables"]["cv_language"] ?? defaultClientCVars["cv_language"])
    debugTranslationCounter++
})

console.log("Translated", debugTranslationCounter, "strings")