import { Badges } from "@common/definitions/badges";
import { Emotes } from "@common/definitions/emotes";
import { Loots } from "@common/definitions/loots";
import { Numeric } from "@common/utils/math";
import type { TranslationManifest } from "../../../../vite/plugins/translations-plugin";
import { GameConsole } from "../../console/gameConsole";
import { defaultClientCVars } from "../../console/variables";
import { type TranslationKeys } from "./typings";

export type TranslationMap = Partial<Record<TranslationKeys, string>> & TranslationManifest;

let defaultLanguage: string;
let selectedLanguage: string;

export const TRANSLATIONS: {
    get defaultLanguage(): string
    readonly translations: Record<string, TranslationMap>
} = {
    get defaultLanguage(): string {
        if (!setup) {
            throw new Error("Translation API not yet setup");
        }

        return defaultLanguage;
    },
    translations: {
        hp18: {
            name: "HP-18",
            flag: "<img height=\"20\" src=\"./img/game/shared/weapons/hp18.svg\" />",
            percentage: "HP-18%",
            no_resize: true
        }
    }
};

let setup = false;
export async function initTranslation(): Promise<void> {
    if (setup) {
        console.error("Translation API already setup");
        return;
    }

    setup = true;

    defaultLanguage = typeof defaultClientCVars.cv_language === "object"
        ? defaultClientCVars.cv_language.value
        : defaultClientCVars.cv_language;

    selectedLanguage = GameConsole.getBuiltInCVar("cv_language");

    const { manifest, importTranslation } = await import("virtual:translations-manifest") as {
        manifest: Record<string, TranslationManifest>
        importTranslation: (t: string) => Promise<TranslationMap>
    };

    for (
        const [language, content] of await Promise.all(
            Object.entries(manifest)
                .map(async([language, content]): Promise<[string, TranslationMap]> => [
                    language,
                    content.mandatory || language === selectedLanguage || language === defaultLanguage
                        ? await importTranslation(language)
                        : content
                ])
        )
    ) {
        TRANSLATIONS.translations[language] = {
            ...manifest[language],
            ...content
        };
    }

    translateCurrentDOM();
}

export function getTranslatedString(key: TranslationKeys, replacements?: Record<string, string>): string {
    if (!setup) {
        console.error("Translation API not yet setup");
        return key;
    }

    // Easter egg language
    if (selectedLanguage === "hp18") return "HP-18";

    if (key.startsWith("badge_")) {
        key = Badges.reify(key.slice("badge_".length)).idString.replace("bdg_", "badge_") as TranslationKeys;
    }

    const languageData = TRANSLATIONS.translations[selectedLanguage];
    const defaultLanguageData = TRANSLATIONS.translations[defaultLanguage];

    if (!languageData) {
        console.error(`Language ${selectedLanguage} does not exist`);
        return key;
    }

    let foundTranslation: string | undefined;
    foundTranslation = languageData[key];
    foundTranslation ??= defaultLanguageData[key];
    foundTranslation ??= Loots.fromStringSafe(key)?.name;

    foundTranslation ??= key.startsWith("emote_") ? Emotes.fromStringSafe(key.slice("emote_".length))?.name : undefined;
    foundTranslation ??= key.startsWith("bdg_") ? Badges.fromStringSafe(key)?.name : undefined;

    foundTranslation ??= key;

    for (const [search, replace] of Object.entries(replacements ?? {})) {
        foundTranslation = foundTranslation.split(`<${search}>`).join(replace);
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
    element.style.verticalAlign = "middle";
}

function translateCurrentDOM(): void {
    let debugTranslationCounter = 0;
    document.documentElement.lang = TRANSLATIONS.translations[selectedLanguage]?.html_lang ?? "";
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
            && !TRANSLATIONS.translations[selectedLanguage].no_resize
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
            Array.from(Object.entries(TRANSLATIONS.translations)).reduce<{
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
                        "missing keys": Array.from(copy)
                    };

                    return acc;
                },
                {}
            )
        );
    }
}
