import { Layer } from "../constants";

/**
 * Returns whether or not the provided layer is a transitionary layer.
 * @param layer The layer to evaluate.
 * @returns `true` if the layer is a transitionary layer; `false` otherwise.
 */
export function isTransitionaryLayer(layer: number | Layer): boolean {
    return (layer % 2 === 0);
}

/**
 * Returns whether or not the two layers are equal.
 * @param focusLayer The reference layer.
 * @param evalLayer The layer to evaluate relative to the reference layer.
 * @returns `true` if the two layers are the same; `false` otherwise.
 */

export function equalLayer(referenceLayer: number | Layer, evalLayer: number | Layer): boolean {
    return (referenceLayer === evalLayer);
}

/**
 * Returns whether or not the layer being evaluted is at the same level, or one level immediately above, the reference
 * layer.
 * @param focusLayer The reference layer.
 * @param evalLayer The layer to evaluate relative to the reference layer.
 * @returns `true` if the evaluated layer is the same, or one layer above, the reference layer.
 */
export function equalOrOneAboveLayer(referenceLayer: number | Layer, evalLayer: number | Layer): boolean {
    return (referenceLayer === evalLayer) || (referenceLayer + 1 === evalLayer);
}

/**
 * Returns whether or not the layer being evaluted is at the same level, or one level immediately below, the reference
 * layer.
 * @param focusLayer The reference layer.
 * @param evalLayer The layer to evaluate relative to the reference layer.
 * @returns `true` if the evaluated layer is the same, or one layer above, the reference layer.
 */
export function equalOrOneBelowLayer(referenceLayer: number | Layer, evalLayer: number | Layer): boolean {
    return (referenceLayer === evalLayer) || (referenceLayer - 1 === evalLayer);
}

//
// Game objects can belong to the following layers:
//   0: ground layer
//   1: stairs
//   2: ground and stairs (both)
//   3: bunker and stairs (both)
//
// Objects on the same layer should interact with one another.
export function sameLayer(num1: number, num2: number): boolean {
    const n1 = num1 - 1;
    const n2 = num1 + 1;
    return ((n1 == num2) || (n2 == num2) || (num1 === num2));
}
