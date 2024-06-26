import { Loots } from "../../common/src/definitions/loots";
import { defaultClientCVars } from "./scripts/utils/console/defaultClientCVars";
import { ENGLISH_TRANSLATIONS } from "./translations/english";

export type TranslationMap = Record<
        string,
        (string | ((replacements: Record<string, string>) => string))
    > & {name: string, flag: string}

export const TRANSLATIONS = {
    defaultLanguage: "en",
    translations: {
        en: ENGLISH_TRANSLATIONS,
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

    let foundTranslation = TRANSLATIONS["translations"][language][id]
        ?? TRANSLATIONS["translations"][TRANSLATIONS.defaultLanguage][id]
        ?? Loots.reify(id).name;

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
    if (!requestedTranslation) return;

    (element as HTMLDivElement).innerText = getTranslatedString(requestedTranslation)
    debugTranslationCounter++
})

console.log("Translated", debugTranslationCounter, "strings")