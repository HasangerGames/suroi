import ENGLISH_TRANSLATIONS from "./languages/english";

export type TranslationMap = Record<
    string,
    (string | ((replacements: Record<string, string>) => string))
> & { readonly name: string, readonly flag: string };

export type ValidTranslationKeys = Exclude<keyof typeof ENGLISH_TRANSLATIONS, "name" | "flag">;

export function defineLanguage(
    name: string,
    flag: string,
    content: Partial<Record<ValidTranslationKeys, string>>
): TranslationMap {
    return {
        name,
        flag,
        ...content
    };
}
