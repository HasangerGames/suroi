import { Badges } from "../../common/src/definitions/badges";
import { Emotes } from "../../common/src/definitions/emotes";
import { Loots } from "../../common/src/definitions/loots";
import { defaultClientCVars } from "./scripts/utils/console/defaultClientCVars";
import { CHINESE_SIMPLIFIED_TRANSLATIONS } from "./translations/chinese_simplified";
import { ENGLISH_TRANSLATIONS } from "./translations/english";
import { TAMIL_TRANSLATIONS } from "./translations/tamil";

export type TranslationMap = Record<
        string,
        (string | ((replacements: Record<string, string>) => string))
    > & {name: string, flag: string}

export const TRANSLATIONS = {
    defaultLanguage: "en",
    translations: {
        en: ENGLISH_TRANSLATIONS,
        zn: CHINESE_SIMPLIFIED_TRANSLATIONS,
        ta: TAMIL_TRANSLATIONS,
        fr: {
            name: "Français",
            flag: "🇫🇷",

            loadout: "Loadout",
            settings: "Réglages",

            languages: "Langues"
        },
        hp18: {
            name: "HP-18",
            flag: `<img height="20" src="./img/game/weapons/hp18.svg" />`
        }
    }
} as {
    readonly defaultLanguage: string,
    readonly translations: Record<string, TranslationMap>
}

const localStorage = JSON.parse(window.localStorage.getItem("suroi_config") ?? "{}")

export function getTranslatedString(id: string, replacements?: Record<string, string>) {
    const language = localStorage["variables"]["cv_language"] ?? defaultClientCVars["cv_language"]

    // Easter egg language
    if (language === "hp18") return "HP-18"

    if (id.startsWith("emote_")) {
        return Emotes.reify(id.slice("emote_".length)).name
    }

    if (id.startsWith("badge_")) {
        return Badges.reify(id.slice("badge_".length)).name
    }

    let foundTranslation
    try {
        foundTranslation = TRANSLATIONS["translations"][language][id]
            ?? TRANSLATIONS["translations"][TRANSLATIONS.defaultLanguage][id]
            ?? Loots.reify(id).name;
    } catch(_) {
        foundTranslation = ""
    }

    if (!foundTranslation) return "";

    if (foundTranslation instanceof Function) {
        return foundTranslation(replacements ?? {})
    }

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
    const useHtml = element.getAttribute("use-html")
    if (!requestedTranslation) return;

    if (useHtml === null) {
        (element as HTMLDivElement).innerText = getTranslatedString(requestedTranslation)
    } else {
        element.innerHTML = getTranslatedString(requestedTranslation)
    }
    debugTranslationCounter++
})

console.log("Translated", debugTranslationCounter, "strings")