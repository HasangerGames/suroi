import { Badges } from "$common/definitions/badges";
import { Emotes } from "$common/definitions/emotes";
import { Loots } from "$common/definitions/loots";
import { m } from "$lib/paraglide/messages";

export type TranslationKeys = keyof typeof m;

export function translate(key: TranslationKeys, inputs?: any): string {
    let foundTranslation: string | undefined;
    foundTranslation = m[key]?.(inputs);
    if (foundTranslation === key) foundTranslation = undefined;

    foundTranslation ??= key.startsWith("emote_") ? Emotes.fromStringSafe(key.slice("emote_".length))?.name : undefined;
    foundTranslation ??= key.startsWith("bdg_") ? Badges.fromStringSafe(key)?.name : undefined;
    foundTranslation ??= Loots.fromStringSafe(key)?.name;

    foundTranslation ??= key;

    return foundTranslation;
}
