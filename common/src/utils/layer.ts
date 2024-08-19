import { Layer } from "../constants";

/**
 * Returns whether or not the provided layer is a "ground" layer.
 * @param layer The layer to evaluate.
 * @returns `true` if the layer is a "ground" layer; `false` otherwise.
 */
export function isGroundLayer(layer: number | Layer): boolean {
    return layer % 2 === 0;
}

/**
 * Returns whether or not the provided layer is a "stair" layer; stair layers serve as transitions
 * between ground layers.
 * @param layer The layer to evaluate.
 * @returns `true` if the layer is a "stair" layer; `false` otherwise.
 */
export function isStairLayer(layer: number | Layer): boolean {
    return layer % 2 === 1;
}

/**
 * Returns whether or not the two layers are equal.
 * @param focusLayer The reference layer.
 * @param evalLayer The layer to evaluate relative to the reference layer.
 * @returns `true` if the two layers are the same; `false` otherwise.
 */

export function equalLayer(referenceLayer: number | Layer, evalLayer: number | Layer): boolean {
    return referenceLayer === evalLayer;
}

/**
 * Returns whether or not the layer being evaluated is at the same level, or one level immediately above, the reference
 * layer.
 * @param focusLayer The reference layer.
 * @param evalLayer The layer to evaluate relative to the reference layer.
 * @returns `true` if the evaluated layer is the same, or one layer above, the reference layer.
 */
export function equalOrOneAboveLayer(referenceLayer: number | Layer, evalLayer: number | Layer): boolean {
    return (referenceLayer === evalLayer) || (referenceLayer + 1 === evalLayer);
}

/**
 * Returns whether or not the layer being evaluated is at the same level, or one level immediately below, the reference
 * layer.
 * @param focusLayer The reference layer.
 * @param evalLayer The layer to evaluate relative to the reference layer.
 * @returns `true` if the evaluated layer is the same, or one layer above, the reference layer.
 */
export function equalOrOneBelowLayer(referenceLayer: number | Layer, evalLayer: number | Layer): boolean {
    return (referenceLayer === evalLayer) || (referenceLayer - 1 === evalLayer);
}

/**
 * Returns whether or not the layer being evaluated is adjacent (either one above or below) to the
 * given reference layer.
 * @returns `true` if the evaluated layer is a neighbor of the reference layer
 */
export function isAdjacent(num1: number, num2: number): boolean {
    return (num1 - 1 === num2) || (num1 + 1 === num2);
}

/**
 * Returns whether or not the layer being evaluated is identical or adjacent (either one above or below) to the
 * given reference layer.
 * @returns `true` if the evaluated layer is equal to or a neighbor of the reference layer
 */
export function adjacentOrEqualLayer(referenceLayer: number, evalLayer: number): boolean {
    return (referenceLayer - 1 === evalLayer) || (referenceLayer + 1 === evalLayer) || (referenceLayer === evalLayer);
}
