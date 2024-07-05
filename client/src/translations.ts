import { Badges } from "../../common/src/definitions/badges";
import { Emotes } from "../../common/src/definitions/emotes";
import { Loots } from "../../common/src/definitions/loots";
import { type Game } from "./scripts/game";
import { defaultClientCVars } from "./scripts/utils/console/defaultClientCVars";
import { CHINESE_SIMPLIFIED_TRANSLATIONS } from "./translations/chinese_simplified";
import { CZECH_TRANSLATIONS } from "./translations/czech";
import { ENGLISH_TRANSLATIONS } from "./translations/english";
import { ESTONIAN_TRANSLATIONS } from "./translations/estonian";
import { FRENCH_TRANSLATIONS } from "./translations/french";
import { GERMAN_TRANSLATIONS } from "./translations/german";
import { GREEK_TRANSLATIONS } from "./translations/greek";
import { HUNGARIAN_TRANSLATIONS } from "./translations/hungarian";
import { JAPANESE_TRANSLATIONS } from "./translations/japanese";
import { RUSSIAN_TRANSLATIONS } from "./translations/russian";
import { TAMIL_TRANSLATIONS } from "./translations/tamil";
import { TURKISH_TRANSLATIONS } from "./translations/turkısh";
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
        gr: GREEK_TRANSLATIONS,
        tr: TURKISH_TRANSLATIONS,
        fr: FRENCH_TRANSLATIONS,
        ru: RUSSIAN_TRANSLATIONS,
        de: GERMAN_TRANSLATIONS,
        zn: CHINESE_SIMPLIFIED_TRANSLATIONS,
        jp: JAPANESE_TRANSLATIONS,
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

const printTranslationDebug = false;

function adjustFontSize(element: HTMLElement): void {
    if (element.textContent) {
        const isTabElem = element.parentElement?.classList.contains("tab");

        const buttonText = element.textContent.trim();
        const textWidth = buttonText.length * 10;
        const buttonWidth = element.getBoundingClientRect().width;
        const fontSize = `${Math.max(isTabElem && language !== "ta" ? 85 : 65, Math.min(language === "ta" ? 65 : 80, (buttonWidth / textWidth) * 100))}%`; // womp womp

        element.style.fontSize = fontSize;
    }
}

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
            (element.classList.contains("btn") || element.parentElement?.classList.contains("btn") || element.parentElement?.classList.contains("tab"))
            && translatedString.length >= 10
            && !["en", "hp18"].includes(language) // <- why? (because we do not want text measurements on English or HP-18)
        ) {
            adjustFontSize(element);
        }

        debugTranslationCounter++;
    });

    if (language !== "en") { // temporary until we translate killfeed
        const pepedls = document.getElementById("toggle-text-kill-feed-option")!.innerHTML;
        document.getElementById("toggle-text-kill-feed-option")!.innerHTML = `<i class="fa-solid fa-lock"></i> ${pepedls}`;
    }

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
