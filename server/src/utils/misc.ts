import { Constants, GameConstants } from "@common/constants";
import { ColorStyles, styleText } from "@common/utils/ansiColoring";
import { halfπ, τ } from "@common/utils/math";
import { NullString, type ObjectDefinition, type ReferenceTo } from "@common/utils/objectDefinitions";
import { weightedRandom } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";
import { Config } from "../config";

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

export function cleanUsername(name?: string | null): string {
    return (
        !name?.length
        // this rule is stupid
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        || name.length > Constants.PLAYER_NAME_MAX_LENGTH
        || Config.protection?.usernameFilters?.some((regex: RegExp) => regex.test(name))
        || /[^\x20-\x7E]/g.test(name) // extended ASCII chars
    )
        ? GameConstants.player.defaultName
        : name;
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

export const CARDINAL_DIRECTIONS = Array.from({ length: 4 }, (_, i) => i / τ);

export function getPatterningShape(
    spawnCount: number,
    radius: number
): Vector[] {
    const makeSimpleShape = (points: number) => {
        const tauFrac = τ / points;
        return (radius: number, offset = 0): Vector[] => Array.from(
            { length: points },
            (_, i) => Vec.fromPolar(i * tauFrac + offset, radius)
        );
    };

    const [
        makeTriangle,
        makeSquare,
        makePentagon,
        makeHexagon
    ] = [3, 4, 5, 6].map(makeSimpleShape);

    switch (spawnCount) {
        case 1: return [Vec.create(0, 0)];
        case 2: return [
            Vec.create(0, radius),
            Vec.create(0, -radius)
        ];
        case 3: return makeTriangle(radius);
        case 4: return [Vec.create(0, 0), ...makeTriangle(radius)];
        case 5: return [Vec.create(0, 0), ...makeSquare(radius)];
        case 6: return [Vec.create(0, 0), ...makePentagon(radius)];
        case 7: return [Vec.create(0, 0), ...makeHexagon(radius, halfπ)];
        case 8: return [
            Vec.create(0, 0),
            ...makeTriangle(radius / 2),
            ...makeSquare(radius, halfπ)
        ];
        case 9: return [
            Vec.create(0, 0),
            ...makeTriangle(radius / 2),
            ...makePentagon(radius)
        ];
    }

    return [
        ...getPatterningShape(spawnCount - 6, radius * 3 / 4),
        ...makeHexagon(radius, halfπ)
    ];
}
