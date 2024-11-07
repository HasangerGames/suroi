import { Badges } from "../../common/src/definitions/badges";
import { Emotes } from "../../common/src/definitions/emotes";
import { Loots } from "../../common/src/definitions/loots";
import { type Game } from "./scripts/game";
import { defaultClientCVars } from "./scripts/utils/console/defaultClientCVars";
import { Numeric } from "../../common/src/utils/math";
import { type TranslationKeys } from "./typings/translations";
import type { TranslationManifest, TranslationsManifest } from "../../translations/src/processTranslations";
import TRANSLATIONS_MANIFEST from "./translationsManifest.json";

export type TranslationMap = Partial<Record<TranslationKeys, string>> & TranslationManifest;

let defaultLanguage: string;
let selectedLanguage: string;

export const TRANSLATIONS = {
    get defaultLanguage(): string {
        if (!setup) {
            throw new Error("Translation API not yet setup");
        }

        return defaultLanguage;
    },
    translations: {
        hp18: {
            name: "HP-18",
            flag: "<img height=\"20\" src=\"./img/killfeed/hp18_killfeed.svg\" />",
            percentage: "HP-18%"
        }
    }
} as {
    get defaultLanguage(): string
    translations: Record<string, TranslationMap>
};

export const NO_SPACE_LANGUAGES = ["zh", "tw", "hk_mo", "jp"];

let setup = false;
export async function initTranslation(game: Game): Promise<void> {
    if (setup) {
        console.error("Translation API already setup");
        return;
    }

    setup = true;

    defaultLanguage = typeof defaultClientCVars.cv_language === "object"
        ? defaultClientCVars.cv_language.value
        : defaultClientCVars.cv_language;

    selectedLanguage = game.console.getBuiltInCVar("cv_language");

    const loadedLanguages = await Promise.all(Object.entries(TRANSLATIONS_MANIFEST as TranslationsManifest)
        .filter(([language, content]) => content.mandatory || language === selectedLanguage || language === defaultLanguage)
        .map(async([language, _]) => [language, await (await fetch(`/translations/${language}.json`)).json()] as [string, TranslationMap]));

    for (const [language, content] of loadedLanguages) {
        TRANSLATIONS.translations[language] = {
            ...(TRANSLATIONS_MANIFEST as TranslationsManifest)[language],
            ...content
        };
    }

    Object.entries(TRANSLATIONS_MANIFEST as TranslationsManifest)
        .filter(([language, content]) => !(content.mandatory || language === selectedLanguage || language === defaultLanguage))
        .forEach(([language, content]) => TRANSLATIONS.translations[language] = content);

    translateCurrentDOM();
}

export function getTranslatedString(key: TranslationKeys, replacements?: Record<string, string>): string {
    if (!setup) {
        console.error("Translation API not yet setup");
        return key;
    }

    // Easter egg language
    if (selectedLanguage === "hp18") return "HP-18";

    if (key.startsWith("emote_")) {
        return Emotes.reify(key.slice("emote_".length)).name;
    }

    if (key.startsWith("badge_")) {
        return Badges.reify(key.slice("badge_".length)).name;
    }

    let foundTranslation: string;
    try {
        foundTranslation = TRANSLATIONS.translations[selectedLanguage]?.[key]
        ?? TRANSLATIONS.translations[defaultLanguage]?.[key]
        ?? Loots.reify(key).name;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
        foundTranslation = "no translation found";
    }

    if (foundTranslation === "no translation found") return key;

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
    if (!element.textContent) return;

    const MIN_FONT_SIZE = element.parentElement?.classList.contains("tab") ? 12.5 : 15;
    const FONT_WIDTH_PER_CHARACTER = 10;

    // I love math
    const buttonText = element.textContent.replace(/\s+/g, " ");
    const textWidth = buttonText.length * FONT_WIDTH_PER_CHARACTER;
    const buttonWidth = element.getBoundingClientRect().width;

    let fontSize: number;

    switch (selectedLanguage) {
        case "ta": // has very long strings
            fontSize = Numeric.clamp(
                buttonWidth / textWidth * FONT_WIDTH_PER_CHARACTER,
                MIN_FONT_SIZE - 2,
                13
            );
            break;
        default:
            fontSize = Numeric.clamp(
                buttonWidth / textWidth * FONT_WIDTH_PER_CHARACTER,
                MIN_FONT_SIZE - 2,
                20
            );
            break;
    }

    element.style.fontSize = `${fontSize}px`;
}

function translateCurrentDOM(): void {
    let debugTranslationCounter = 0;

    document.querySelectorAll("body *").forEach(element => {
        if (!(element instanceof HTMLElement)) return; // ignore non-html elements (like svg and mathml)

        const requestedTranslation = element.getAttribute("translation");
        if (!requestedTranslation) return;

        const translatedString = getTranslatedString(requestedTranslation as TranslationKeys); // We pray

        element[
            element.getAttribute("use-html") === null
                ? "innerText"
                : "innerHTML"
        ] = translatedString;

        // Decrease font size for those languages have have really long stuff in buttons
        if (
            (element.classList.contains("btn") || element.parentElement?.classList.contains("btn") || element.parentElement?.classList.contains("tab"))
            && translatedString.length >= 10
            && !["en", "hp18"].includes(selectedLanguage) // <- why? (because we do not want text measurements on English or HP-18)
        ) {
            adjustFontSize(element);
        }

        debugTranslationCounter++;
    });

    if (printTranslationDebug) {
        console.log("Translated", debugTranslationCounter, "strings");
        console.log("With language as", selectedLanguage, "and default as", defaultLanguage);

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
