import { Layer, Layers, ZIndexes } from "../constants";
import { type CommonGameObject } from "./gameObject";
import { HitboxType, type Hitbox, type RectangleHitbox } from "./hitbox";
import { type ObjectDefinition } from "./objectDefinitions";
import { type Vector } from "./vector";

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
    return layer % 2 !== 0;
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

export function equivLayer(
    referenceObject: {
        layer: Layer
        definition: {
            collideWithLayers?: Layers
            isStair?: boolean
        }
    },
    evalObject: { layer: Layer }
): boolean {
    if (referenceObject.definition.isStair) return adjacentOrEqualLayer(referenceObject.layer, evalObject.layer);

    switch (referenceObject.definition.collideWithLayers) {
        case Layers.All: return true;
        case Layers.Adjacent: return adjacentOrEqualLayer(referenceObject.layer, evalObject.layer);
        case Layers.Equal:
        default:
            return equalLayer(referenceObject.layer, evalObject.layer);
    }
}

export function adjacentOrEquivLayer(
    referenceObject: CommonGameObject,
    evalLayer: Layer
): boolean {
    const buildingOrObstacle = referenceObject.isObstacle || referenceObject.isBuilding;

    return (
        !buildingOrObstacle
        || referenceObject.definition.collideWithLayers !== Layers.Equal
        || equalLayer(referenceObject.layer, evalLayer)
    ) && (
        (
            buildingOrObstacle
            && referenceObject.definition.collideWithLayers === Layers.All
        )
        || adjacentOrEqualLayer(referenceObject.layer, evalLayer)
    );
}

/**
 * Determines whether a given object is visible from layer `observerLayer`, whilst taking into account any
 * visibility overrides in any buildings specified in `collisionCandidates`
 * @param observerLayer The layer from which we are attempting to observe the object
 * @param object The object which we are trying to observe
 * @param collisionCandidates A list of objects the observer is colliding with (or more generally, a list of
 * objects in which the visibility overrides to be honored will be contained). Omitting this parameter simply
 * leads to no visibility overrides being considered
 * @param colliderPredicate A function that, given a collider, determines whether `object` is within it. If
 * omitted, it defaults to `object.hitbox?.collidesWith(collider)`
 */
export function isVisibleFromLayer(
    observerLayer: Layer,
    object: {
        isBuilding?: boolean
        layer: Layer
        hitbox?: Hitbox
        position: Vector
        definition?: ObjectDefinition
    },
    collisionCandidates?: readonly CommonGameObject[],
    colliderPredicate?: (collider: Hitbox) => boolean
): boolean {
    const objectLayer = object.layer;
    const objectHitbox = object.hitbox;

    const defaultColliderPredicate = (collider: Hitbox): boolean => {
        switch (collider.type) {
            case HitboxType.Group:
                for (const hitbox of collider.hitboxes) {
                    if (objectHitbox?.toRectangle().isFullyWithin(hitbox as RectangleHitbox)) return true;
                }
                return false;
            case HitboxType.Rect:
                return !!objectHitbox?.toRectangle().isFullyWithin(collider);
            default:
                return false;
        }
    };

    return ( // the object is visible if…
        adjacentOrEqualLayer(observerLayer, objectLayer) // the layers are adjacent.
        || (object.definition && (object.definition as { visibleFromLayers?: Layers }).visibleFromLayers === Layers.All) // or it appears on all layers
        || ( // otherwise…
            objectLayer < observerLayer // it must be below us
            && ( // and the ground layer mustn't be between us and it (aka object on -1, us on 1).
                objectLayer >= Layer.Ground
                || observerLayer < Layer.Ground
            )
        )
        || ( // other- otherwise…
            !object.isBuilding // the object isn't a building (vis overrides don't apply to those)
            && !!collisionCandidates?.some( // and there exists a building 'bu' such that
                o => o.isBuilding
                    && !o.dead // bu is not dead
                    && o.definition.visibilityOverrides?.some( // and bu has some visibility override 'ov' such that
                        override => (override.layer ?? 0) + o.layer === objectLayer as number // ov is on the object's layer
                            && (colliderPredicate ??= defaultColliderPredicate)(override.collider.transform(o.position, 1, o.orientation)) // ov's collider collides with the object's hitbox
                            && override.allow?.includes(observerLayer) // and the player's layer is whitelisted.
                    )
            )
        )
    )/* && ( // and…
        || !collisionCandidates?.some( // there is no building 'bu' such that
            o => o.isBuilding
            && !o.dead // bu is not dead
            && o.definition.visibilityOverrides?.some( // and bu has some visibility override 'ov' such that
                override => (override.layer ?? 0) + o.layer === objectLayer as number // ov is on the object's layer
                && (colliderPredicate ??= c => !!objectHitbox?.collidesWith(c))(override.collider.transform(o.position, 1, o.orientation)) // ov's collider collides with the object's hitbox
                && override.deny?.includes(observerLayer) // and the player's layer is blacklisted
            )
        )
    ) */; // blacklisting code commented out since it's unused rn (uncomment the collidingObjects var too)
}

const layerCount = Object.keys(ZIndexes).length / 2; // account for double-indexing

export function getEffectiveZIndex(orig: ZIndexes, layer = Layer.Ground, gameLayer = Layer.Ground): number {
    // if (
    //     !isGroundLayer(layer)
    //     && !equalLayer(gameLayer, Layer.Basement1)
    //     && !equalLayer(layer, gameLayer)
    // ) return orig; // hahaha no stair glitch for u

    if (layer > Layer.Ground || (gameLayer < Layer.Ground && layer < Layer.Ground)) {
        layer = Layer.Floor1;
    }

    return orig + layer * layerCount;
}
