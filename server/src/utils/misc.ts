import { ColorStyles, styleText } from "@common/utils/ansiColoring";
import { NullString, type ObjectDefinition, type ReferenceTo } from "@common/utils/objectDefinitions";
import { weightedRandom } from "@common/utils/random";

export const Logger = {
    log(...message: string[]): void {
        internalLog(message.join(" "));
    },
    warn(...message: string[]): void {
        internalLog(styleText("[WARNING]", ColorStyles.foreground.yellow.normal), message.join(" "));
    }
};

function internalLog(...message: string[]): void {
    const date = new Date();

    console.log(
        styleText(`[${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}]`, ColorStyles.foreground.green.bright),
        message.join(" ")
    );
}

export function getRandomIDString<
    T extends ObjectDefinition,
    Ref extends ReferenceTo<T> | typeof NullString
>(table: Record<Ref, number> | Ref): Ref {
    if (typeof table !== "object") return table;

    const items: Ref[] = [];
    const weights: number[] = [];
    for (const item in table) {
        items.push(item);
        weights.push(table[item]);
    }
    return weightedRandom(items, weights);
}

/**
 * Find and remove an element from an array.
 * @param array The array to iterate over.
 * @param value The value to check for.
 */
export function removeFrom<T>(array: T[], value: NoInfer<T>): void {
    const index = array.indexOf(value);
    if (index !== -1) array.splice(index, 1);
}

export const CARDINAL_DIRECTIONS = Array.from({ length: 4 }, (_, i) => i / 2 * Math.PI);
