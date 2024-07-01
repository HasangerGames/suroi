import { Badges } from "../../common/src/definitions/badges";
import { Emotes } from "../../common/src/definitions/emotes";
import { Loots } from "../../common/src/definitions/loots";
import type { Game } from "./scripts/game";
import { defaultClientCVars } from "./scripts/utils/console/defaultClientCVars";
import { CHINESE_SIMPLIFIED_TRANSLATIONS } from "./translations/chinese_simplified";
import { CZECH_TRANSLATIONS } from "./translations/czech";
import { ENGLISH_TRANSLATIONS } from "./translations/english";
import { ESTONIAN_TRANSLATIONS } from "./translations/estonian";
import { FRENCH_TRANSLATIONS } from "./translations/french";
import { GERMAN_TRANSLATIONS } from "./translations/german";
import { HUNGARIAN_TRANSLATIONS } from "./translations/hungarian";
import { TAMIL_TRANSLATIONS } from "./translations/tamil";
import { VIETNAMESE_TRANSLATIONS } from "./translations/vietnamese";

export type TranslationMap = Record<
    string,
    (string | ((replacements: Record<string, string>) => string))
> & { readonly name: string, readonly flag: string };

let defaultLanguage: string;
let language: string;

export const TRANSLATIONS = {
    get defaultLanguage(): string {
        if (!setup) {
            throw new Error("Translation API not yet setup");
        }

        return defaultLanguage;
    },
    translations: {
        en: ENGLISH_TRANSLATIONS,
        fr: FRENCH_TRANSLATIONS,
        de: GERMAN_TRANSLATIONS,
        zn: CHINESE_SIMPLIFIED_TRANSLATIONS,
        vi: VIETNAMESE_TRANSLATIONS,
        ta: TAMIL_TRANSLATIONS,
        hu: HUNGARIAN_TRANSLATIONS,
        et: ESTONIAN_TRANSLATIONS,
        cz: CZECH_TRANSLATIONS,
        hp18: {
            name: "HP-18",
            flag: "<img height=\"20\" src=\"./img/game/weapons/hp18.svg\" />"
        }
    }
} as {
    get defaultLanguage(): string
    readonly translations: Record<string, TranslationMap>
};

let setup = false;
export function initTranslation(game: Game): void {
    if (setup) {
        console.error("Translation API already setup");
        return;
    }

    setup = true;

    defaultLanguage = typeof defaultClientCVars.cv_language === "object"
        ? defaultClientCVars.cv_language.value
        : defaultClientCVars.cv_language;

    language = game.console.getBuiltInCVar("cv_language");

    translateCurrentDOM();
}

export function getTranslatedString(key: string, replacements?: Record<string, string>): string {
    if (!setup) {
        console.error("Translation API not yet setup");
        return key;
    }

    // Easter egg language
    if (language === "hp18") return "HP-18";

    if (key.startsWith("emote_")) {
        return Emotes.reify(key.slice("emote_".length)).name;
    }

    if (key.startsWith("badge_")) {
        return Badges.reify(key.slice("badge_".length)).name;
    }

    let foundTranslation: TranslationMap[string];
    try {
        foundTranslation = TRANSLATIONS.translations[language]?.[key]
        ?? TRANSLATIONS.translations[defaultLanguage]?.[key]
        ?? Loots.reify(key).name;
    } catch (_) {
        foundTranslation = "";
    }

    if (!foundTranslation) return key;

    if (foundTranslation instanceof Function) {
        return foundTranslation(replacements ?? {});
    }

    if (!replacements) {
        return foundTranslation;
    }

    for (const [search, replace] of Object.entries(replacements)) {
        foundTranslation = foundTranslation.replaceAll(`<${search}>`, replace);
    }

    return foundTranslation;
}

const printTranslationDebug = true;

function translateCurrentDOM(): void {
    let debugTranslationCounter = 0;

    document.querySelectorAll("body *").forEach(element => {
        if (!(element instanceof HTMLElement)) return; // ignore non-html elements (like svg and mathml)

        const requestedTranslation = element.getAttribute("translation");
        if (!requestedTranslation) return;

        const translatedString = getTranslatedString(requestedTranslation);

        element[
            element.getAttribute("use-html") === null
                ? "innerText"
                : "innerHTML"
        ] = translatedString;

        // Decrease font size for those languages have have really long stuff in buttons
        if (
            (element.classList.contains("btn") || element.parentElement?.classList.contains("btn"))
            && translatedString.length >= 12
            && language !== "en" // <- why?
        ) {
            element.style.fontSize = "70%"; // <- extract to css class?
        }

        debugTranslationCounter++;
    });

    if (printTranslationDebug) {
        console.log("Translated", debugTranslationCounter, "strings");
        console.log("With language as", language, "and default as", defaultLanguage);

        const reference = new Set(Object.keys(TRANSLATIONS.translations[TRANSLATIONS.defaultLanguage]));

        console.table(
            [...Object.entries(TRANSLATIONS.translations)].reduce<{
                [K in keyof typeof TRANSLATIONS.translations]: {
                    readonly "translation coverage (%)": number
                    readonly "missing keys": readonly string[]
                }
            }>(
                (acc, [language, languageInfo]) => {
                    const copy = new Set(reference);

                    for (const key of Object.keys(languageInfo)) {
                        copy.delete(key);
                    }

                    acc[language] = {
                        "translation coverage (%)": 100 * (1 - copy.size / reference.size),
                        "missing keys": [...copy]
                    };

                    return acc;
                },
                {}
            )
        );
    }
}
