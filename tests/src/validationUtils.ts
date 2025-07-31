import type { BaseBulletDefinition } from "@common/utils/baseBullet";
import { Explosions } from "../../common/src/definitions/explosions";
import { Loots } from "../../common/src/definitions/loots";
import { type Animated, type SyncedParticleDefinition, type ValueSpecifier } from "../../common/src/definitions/syncedParticles";
import { HitboxType, type Hitbox } from "../../common/src/utils/hitbox";
import { type EaseFunctions } from "../../common/src/utils/math";
import { NullString, type InventoryItemDefinition, type ObjectDefinition, type ObjectDefinitions, type ReferenceOrRandom, type WearerAttributes } from "../../common/src/utils/objectDefinitions";
import { type Vector } from "../../common/src/utils/vector";
import { LootTables } from "../../server/src/data/lootTables";
import type { WeightedItem } from "../../server/src/utils/lootHelpers";

export function findDupes<
    K extends string | number | symbol
>(collection: readonly K[]): { readonly foundDupes: boolean, readonly dupes: Record<K, number> } {
    const dupes = {} as Record<K, number>;
    const set = new Set<K>();
    let foundDupes = false;

    for (const item of collection) {
        const oldSize = set.size;
        set.add(item);

        if (oldSize === set.size) { // If the set doesn't grow, then it's a dupe
            foundDupes = true;
            dupes[item] = (dupes[item] ?? 1) + 1;
        }
    }

    return {
        foundDupes,
        dupes
    };
}

export function safeString(value: unknown): string {
    try {
        switch (true) {
            case !Number.isFinite(value) || Number.isNaN(value): return `${value as number}`;
            default: return JSON.stringify(value);
        }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
        return String(value);
    }
}

function convertUnknownErrorToString(err: unknown): string {
    return err instanceof Error
        ? err.stack ?? `${err.name}: ${err.message}`
        : safeString(err);
}

export const tester = (() => {
    type Helper<
        PlainValue,
        OtherParams extends object
    > = {
        <Target extends object>(
            params: {
                readonly obj: Target
                readonly field: keyof Target
                readonly baseErrorPath: string
            } & OtherParams
        ): void
        (
            params: {
                readonly value: PlainValue
                readonly errorPath: string
            } & OtherParams
        ): void
    };

    type ValidationResult = {
        readonly warnings?: string[]
        readonly errors?: string[]
    } | undefined;

    function createDualForm<
        PlainValue,
        OtherParams extends object = object
    >(
        predicate: (
            value: PlainValue,
            otherParams: OtherParams,
            forwardTo: <Args extends object, Fn extends Helper<PlainValue, Args>>(fn: Fn, args: Args) => boolean,
            baseErrorPath: string
        ) => ValidationResult
    ): {
            <Target extends object>(
                params: {
                    readonly obj: Target
                    readonly field: keyof Target
                    readonly baseErrorPath: string
                } & OtherParams
            ): void
            (
                params: {
                    readonly value: PlainValue
                    readonly errorPath: string
                } & OtherParams
            ): void
        } {
        return <Target extends object>(
            params: (
                {
                    readonly obj: Target
                    readonly field: keyof Target
                    readonly baseErrorPath: string
                } | {
                    readonly value: PlainValue
                    readonly errorPath: string
                }
            ) & OtherParams
        ): void => {
            const _fatalErrors: string[] = [];
            const _errors: string[] = [];
            const _warnings: string[] = [];

            let errorPath = "unknown";

            try {
                const plainValue = "value" in params;
                errorPath = plainValue
                    ? params.errorPath
                    : tester.createPath(params.baseErrorPath, `field ${String(params.field)}`);

                const value = plainValue
                    ? params.value
                    : params.obj[params.field] as PlainValue;

                const result = {
                    fatalErrors: [],
                    errors: [],
                    warnings: [],
                    ...(
                        (() => {
                            try {
                                return predicate(
                                    value,
                                    params,
                                    (target, args) => {
                                        const oldErrLen = errors.length;
                                        target({
                                            value,
                                            errorPath,
                                            ...args
                                        });

                                        return errors.length !== oldErrLen;
                                    },
                                    errorPath
                                ) ?? {};
                            } catch (e) {
                                return {
                                    fatalErrors: [
                                        convertUnknownErrorToString(e)
                                    ]
                                };
                            }
                        })()
                    )
                };

                if (result === undefined || result.fatalErrors.length + result.errors.length + result.warnings.length === 0) return;

                _fatalErrors.push(...result.fatalErrors);
                _errors.push(...result.errors);
                _warnings.push(...result.warnings);
            } catch (e) {
                _fatalErrors.push(
                    convertUnknownErrorToString(e)
                );
            }

            const prependErrorPath = (err: string): readonly [string, string] => [errorPath, err];

            tester.fatalErrors.push(
                ..._fatalErrors.map(prependErrorPath)
            );
            tester.errors.push(
                ..._errors.map(prependErrorPath)
            );
            tester.warnings.push(
                ..._warnings.map(prependErrorPath)
            );
        };
    }

    const warnings: Array<readonly [string, string]> = [];
    const errors: Array<readonly [string, string]> = [];
    const fatalErrors: Array<readonly [string, string]> = [];

    function createPath(...components: readonly string[]): string {
        return components.join(" -> ");
    }

    function assert(condition: boolean, errorMessage: string, errorPath: string): boolean {
        if (!condition) errors.push([errorPath, errorMessage]);
        return condition;
    }

    function assertWarn(warningCondition: boolean, warningMessage: string, errorPath: string): void {
        if (warningCondition) warnings.push([errorPath, warningMessage]);
    }

    function assertNoDuplicateIDStrings(collection: ReadonlyArray<{ readonly idString: string }>, collectionName: string, errorPath: string): void {
        const { foundDupes, dupes } = findDupes(collection.map(v => v.idString));

        assert(
            !foundDupes,
            `Collection ${collectionName} contained duplicate entries: ${Object.entries(dupes).map(([k, v]) => `'${k}' => ${v} times`).join("; ")}`,
            errorPath
        );
    }

    const assertInt = createDualForm((value: number) => {
        if (value % 1 === 0) return;

        return {
            errors: [`This value must be an integer (received ${safeString(value)})`]
        };
    });

    const assertReferenceExists = createDualForm((
        value: string,
        otherParams: {
            readonly collection: ObjectDefinitions
            readonly collectionName: string
        },
        forwardTo
    ): undefined => {
        forwardTo(
            assertReferenceExistsArray,
            {
                collection: otherParams.collection.definitions,
                collectionName: otherParams.collectionName
            }
        );
    });

    const assertReferenceExistsArray = createDualForm((
        value: string,
        otherParams: {
            readonly collection: ReadonlyArray<{ readonly idString: string }>
            readonly collectionName: string
        },
        forwardTo
    ): undefined => {
        forwardTo(
            assertReferenceExistsObject,
            {
                collection: otherParams.collection.reduce<Record<string, unknown>>(
                    (acc, cur) => {
                        acc[cur.idString] = cur;
                        return acc;
                    },
                    {}
                ),
                collectionName: otherParams.collectionName
            }
        );
    });

    const assertReferenceExistsObject = createDualForm((
        value: string,
        otherParams: {
            readonly collection: Record<string, unknown>
            readonly collectionName: string
        }
    ) => {
        if (value in otherParams.collection) return;

        return {
            errors: [`This field attempted to refer to member '${value}' of collection '${otherParams.collectionName}', but no such member exists.`]
        };
    });

    const assertInBounds = createDualForm((
        value: number,
        otherParams: {
            readonly min: number
            readonly max: number
            /**
             * `false` by default
             */
            readonly includeMin?: boolean
            /**
             * `false` by default
             */
            readonly includeMax?: boolean
        }
    ) => {
        const {
            min,
            max,
            includeMin,
            includeMax
        } = otherParams;

        const errors: string[] = [];

        const belowMin = !(value > min || (includeMin === true && value === min));
        const aboveMax = !(value < max || (includeMax === true && value === max));

        if (belowMin || aboveMax) {
            errors.push(`This field must be in range ${includeMin ? "]" : "["}${min}, ${max}${includeMax ? "[" : "]"} (received ${safeString(value)})`);
        }

        return {
            errors
        };
    });

    const assertIsRealNumber = createDualForm<number>((value, otherParams, forwardTo): undefined => {
        forwardTo(
            assertInBounds,
            {
                min: -Infinity,
                max: Infinity,
                includeMin: true,
                includeMax: true
            }
        );
    });

    const assertIsFiniteRealNumber = createDualForm<number>((value, otherParams, forwardTo): undefined => {
        forwardTo(
            assertInBounds,
            {
                min: -Infinity,
                max: Infinity
            }
        );
    });

    const assertIsPositiveReal = createDualForm<number>((value, otherParams, forwardTo): undefined => {
        forwardTo(
            assertInBounds,
            {
                min: 0,
                max: Infinity,
                includeMin: true,
                includeMax: true
            }
        );
    });

    const assertIsPositiveFiniteReal = createDualForm<number>((value, otherParams, forwardTo): undefined => {
        forwardTo(
            assertInBounds,
            {
                min: 0,
                max: Infinity,
                includeMin: true
            }
        );
    });

    const assertIsNaturalNumber = createDualForm<number>((value, otherParams, forwardTo): undefined => {
        forwardTo(assertIsPositiveReal, {});

        if (Number.isFinite(value)) {
            forwardTo(assertInt, {});
        }
    });

    const assertIsNaturalFiniteNumber = createDualForm<number>((value, otherParams, forwardTo): undefined => {
        forwardTo(assertIsPositiveFiniteReal, {});

        if (Number.isFinite(value)) {
            forwardTo(assertInt, {});
        }
    });

    const assertIntAndInBounds = createDualForm((
        value: number,
        otherParams: {
            readonly min: number
            readonly max: number
            readonly includeMin?: boolean
            readonly includeMax?: boolean
        },
        forwardTo
    ): undefined => {
        forwardTo(assertInBounds, otherParams);

        if (Number.isFinite(value)) {
            forwardTo(assertInt, {});
        }
    });

    const assertNoPointlessValue = createDualForm(
        (
            value: unknown,
            otherParams: {
                defaultValue: typeof value
                equalityFunction?: (a: Exclude<typeof value, undefined>, b: typeof value) => boolean
            }
        ) => {
            if (value !== undefined && (otherParams.equalityFunction ?? ((a, b) => a === b))(value, otherParams.defaultValue)) {
                return {
                    warnings: [
                        `This field is optional and has a default value (${safeString(otherParams.defaultValue)}); specifying its default value serves no purpose`
                    ]
                };
            }
        }
    ) as {
        <Target extends object, Keys extends keyof Target, Def extends Target[Keys]>(
            params: {
                readonly obj: Target
                readonly field: Keys
                readonly baseErrorPath: string

                readonly defaultValue: Def
                readonly equalityFunction?: (a: NonNullable<Target[Keys]>, b: Def) => boolean
            }
        ): void
        <ValueType>(
            params: {
                readonly value: ValueType
                readonly errorPath: string

                readonly defaultValue: ValueType
                readonly equalityFunction?: (a: NonNullable<ValueType>, b: NonNullable<ValueType>) => boolean
            }
        ): void
    };
    // lol

    const assertValidOrNPV = createDualForm(
        (
            value: unknown,
            otherParams: {
                defaultValue: typeof value
                equalityFunction?: (a: Exclude<typeof value, undefined>, b: typeof value) => boolean
                validatorIfPresent: (val: Exclude<typeof value, undefined>, baseErrorPath: string) => void
            },
            forwardTo,
            baseErrorPath
        ): undefined => {
            if (
                !forwardTo(
                    assertNoPointlessValue,
                    {
                        defaultValue: otherParams.defaultValue,
                        equalityFunction: otherParams.equalityFunction
                    }
                ) && value !== undefined
            ) {
                otherParams.validatorIfPresent(value, baseErrorPath);
            }
        }
    ) as {
        <Target extends object, Keys extends keyof Target, Def extends Target[Keys]>(
            params: {
                readonly obj: Target
                readonly field: Keys
                readonly baseErrorPath: string

                readonly defaultValue: Def
                readonly equalityFunction?: (a: NonNullable<Target[Keys]>, b: Def) => boolean
                readonly validatorIfPresent: (value: NonNullable<Target[Keys]>, baseErrorPath: string) => void
            }
        ): void
        <ValueType>(
            params: {
                readonly value: ValueType
                readonly errorPath: string

                readonly defaultValue: ValueType
                readonly equalityFunction?: (a: NonNullable<ValueType>, b: ValueType) => boolean
                readonly validatorIfPresent: (value: NonNullable<ValueType>, baseErrorPath: string) => void
            }
        ): void
    };

    return Object.freeze({
        get warnings() { return warnings; },
        get errors() { return errors; },
        get fatalErrors() { return fatalErrors; },
        createPath,
        assert,
        assertWarn,
        assertNoDuplicateIDStrings,
        assertInt,
        assertReferenceExists,
        assertReferenceExistsArray,
        assertReferenceExistsObject,
        assertInBounds,
        /**
         * Checks for [-∞, ∞]
         */
        assertIsRealNumber,
        /**
         * Checks for ]-∞, ∞[ (aka `ℝ`)
         */
        assertIsFiniteRealNumber,
        /**
         * Checks for `[0, ∞]`
         */
        assertIsPositiveReal,
        /**
         * Checks for `[0, ∞[` (aka `ℝ⁺ ∪ { 0 }`)
         */
        assertIsPositiveFiniteReal,
        /**
         * Checks for `[0, ∞] ∩ ℤ` (aka `ℤ⁺ ∪ { 0 }`)
         */
        assertIsNaturalNumber,
        /**
         * Checks for `[0, ∞[ ∩ ℤ` (aka `ℕ`)
         */
        assertIsNaturalFiniteNumber,
        assertIntAndInBounds,
        assertNoPointlessValue,
        assertValidOrNPV,
        runTestOnArray<T>(
            array: readonly T[],
            cb: (obj: T, errorPath: string) => void,
            baseErrorPath: string
        ) {
            let i = 0;
            for (const element of array) {
                logger.indent(`Validating entry ${i}`, () => {
                    cb(element, this.createPath(baseErrorPath, `entry ${i}`));
                    i++;
                });
            }
        },
        // too lazy to extract common code out
        runTestOnIdStringArray<T extends { readonly idString: ReferenceOrRandom<ObjectDefinition> }>(
            array: readonly T[],
            cb: (obj: T, errorPath: string) => void,
            baseErrorPath: string
        ) {
            let i = 0;
            for (const element of array) {
                const entryText = `entry ${i} ${typeof element.idString === "string" ? `(id '${element.idString}')` : ""}`;
                logger.indent(
                    `Validating ${entryText}`,
                    () => {
                        cb(element, this.createPath(baseErrorPath, entryText));
                        i++;
                    }
                );
            }
        }
    });
})();

export const validators = Object.freeze({
    ballistics(baseErrorPath: string, ballistics: BaseBulletDefinition): void {
        tester.assertIsRealNumber({
            obj: ballistics,
            field: "damage",
            baseErrorPath
        });

        tester.assertIsRealNumber({
            obj: ballistics,
            field: "obstacleMultiplier",
            baseErrorPath
        });

        tester.assertIsPositiveFiniteReal({
            obj: ballistics,
            field: "speed",
            baseErrorPath
        });

        tester.assertIsPositiveFiniteReal({
            obj: ballistics,
            field: "range",
            baseErrorPath
        });

        const tracer = ballistics.tracer;
        if (tracer) {
            logger.indent("Validating tracer data", () => {
                const errorPath = tester.createPath(baseErrorPath, "tracer data");

                tester.assertValidOrNPV({
                    obj: tracer,
                    field: "opacity",
                    defaultValue: 1,
                    validatorIfPresent: (value, errorPath) => {
                        tester.assertInBounds({
                            value,
                            min: 0,
                            max: 1,
                            includeMin: true,
                            includeMax: true,
                            errorPath
                        });
                    },
                    baseErrorPath: errorPath
                });

                tester.assertValidOrNPV({
                    obj: tracer,
                    field: "width",
                    defaultValue: 1,
                    validatorIfPresent: (value, errorPath) => {
                        tester.assertIsPositiveReal({
                            value,
                            errorPath
                        });
                    },
                    baseErrorPath: errorPath
                });

                tester.assertValidOrNPV({
                    obj: tracer,
                    field: "length",
                    defaultValue: 1,
                    validatorIfPresent: (value, errorPath) => {
                        tester.assertIsPositiveReal({
                            value,
                            errorPath
                        });
                    },
                    baseErrorPath: errorPath
                });

                if (tracer.color !== undefined) {
                    tester.assertIntAndInBounds({
                        obj: tracer,
                        field: "color",
                        min: -1, // <- random color
                        max: 0xFFFFFF,
                        baseErrorPath: errorPath,
                        includeMin: true,
                        includeMax: true
                    });
                }

                if (tracer.saturatedColor !== undefined) {
                    tester.assertIntAndInBounds({
                        obj: tracer,
                        field: "saturatedColor",
                        min: -1, // <- random color
                        max: 0xFFFFFF,
                        baseErrorPath: errorPath,
                        includeMin: true,
                        includeMax: true
                    });
                }
            });
        }

        const trail = ballistics.trail;
        if (trail) {
            logger.indent("Validating trail", () => {
                const errorPath = tester.createPath(baseErrorPath, "trail");

                tester.assertIsPositiveFiniteReal({
                    obj: trail,
                    field: "interval",
                    baseErrorPath: errorPath
                });

                tester.assertValidOrNPV({
                    obj: trail,
                    field: "amount",
                    defaultValue: 1,
                    validatorIfPresent: amount => {
                        tester.assertIsNaturalFiniteNumber({
                            value: amount,
                            errorPath
                        });
                    },
                    baseErrorPath: errorPath
                });

                validators.minMax(
                    tester.createPath(errorPath, "scale"),
                    trail.scale,
                    (errorPath, scale) => {
                        tester.assertIsFiniteRealNumber({
                            value: scale,
                            errorPath
                        });
                    }
                );

                validators.minMax(
                    tester.createPath(errorPath, "alpha"),
                    trail.alpha,
                    (errorPath, alpha) => {
                        tester.assertInBounds({
                            value: alpha,
                            min: 0,
                            max: 1,
                            includeMin: true,
                            includeMax: true,
                            errorPath
                        });
                    }
                );

                validators.minMax(
                    tester.createPath(errorPath, "spreadSpeed"),
                    trail.spreadSpeed,
                    (errorPath, spreadSpeed) => {
                        tester.assertIsFiniteRealNumber({
                            value: spreadSpeed,
                            errorPath
                        });
                    }
                );

                validators.minMax(
                    tester.createPath(errorPath, "lifetime"),
                    trail.lifetime,
                    (errorPath, lifetime) => {
                        tester.assertIsPositiveReal({
                            value: lifetime,
                            errorPath
                        });
                    }
                );

                tester.assertIntAndInBounds({
                    obj: trail,
                    field: "tint",
                    min: -1, // <- random color
                    max: 0xFFFFFF,
                    baseErrorPath: errorPath,
                    includeMin: true,
                    includeMax: true
                });
            });
        }

        if (ballistics.rangeVariance !== undefined) {
            tester.assertInBounds({
                obj: ballistics,
                field: "rangeVariance",
                min: 0,
                max: 1,
                includeMax: true,
                includeMin: true,
                baseErrorPath
            });
        }

        if (ballistics.onHitExplosion !== undefined) {
            tester.assertReferenceExists({
                obj: ballistics,
                field: "onHitExplosion",
                collection: Explosions,
                collectionName: "Explosions",
                baseErrorPath
            });

            tester.assertNoPointlessValue({
                obj: ballistics,
                field: "explodeOnImpact",
                defaultValue: false,
                baseErrorPath
            });
        }
    },
    vector(
        baseErrorPath: string,
        vector: Vector,
        xBounds?: {
            readonly intOnly?: boolean
            readonly min: number
            readonly max: number
            readonly includeMin?: boolean
            readonly includeMax?: boolean
        },
        yBounds?: {
            readonly intOnly?: boolean
            readonly min: number
            readonly max: number
            readonly includeMin?: boolean
            readonly includeMax?: boolean
        }
    ): void {
        (
            xBounds?.intOnly === true
                ? tester.assertIntAndInBounds<Vector>
                : tester.assertInBounds<Vector>
        ).call(
            tester,
            {
                obj: vector,
                field: "x",
                min: xBounds?.min ?? -Infinity,
                max: xBounds?.max ?? Infinity,
                includeMin: xBounds?.includeMin,
                includeMax: xBounds?.includeMax,
                baseErrorPath
            }
        );

        (
            yBounds?.intOnly === true
                ? tester.assertIntAndInBounds<Vector>
                : tester.assertInBounds<Vector>
        ).call(
            tester,
            {
                obj: vector,
                field: "y",
                min: yBounds?.min ?? -Infinity,
                max: yBounds?.max ?? Infinity,
                includeMin: yBounds?.includeMin,
                includeMax: yBounds?.includeMax,
                baseErrorPath
            }
        );
    },
    hitbox(baseErrorPath: string, hitbox: Hitbox): void {
        switch (hitbox.type) {
            case HitboxType.Circle: {
                this.vector(tester.createPath(baseErrorPath, "center"), hitbox.position);

                tester.assertIsPositiveFiniteReal({
                    obj: hitbox,
                    field: "radius",
                    baseErrorPath
                });
                break;
            }
            case HitboxType.Rect: {
                this.vector(tester.createPath(baseErrorPath, "min"), hitbox.min);
                this.vector(tester.createPath(baseErrorPath, "max"), hitbox.max);
                break;
            }
            case HitboxType.Group: {
                logger.indent("Validating hitbox group", () => {
                    const hitboxes = hitbox.hitboxes;
                    switch (hitboxes.length) {
                        case 0: {
                            tester.assert(
                                false,
                                "Received hitbox group with no hitboxes",
                                baseErrorPath
                            );
                            break;
                        }
                        case 1: {
                            tester.assertWarn(
                                false,
                                "Received hitbox group with only 1 hitbox",
                                baseErrorPath
                            );
                            break;
                        }
                    }

                    tester.runTestOnArray(
                        hitboxes,
                        (hitbox, errorPath) => this.hitbox(errorPath, hitbox),
                        baseErrorPath
                    );
                });
                break;
            }
            case HitboxType.Polygon: {
                logger.indent("Validating polygonal hitbox", () => {
                    const points = hitbox.points;
                    switch (points.length) {
                        case 0: {
                            tester.assert(
                                false,
                                "Received polygonal hitbox with no points",
                                baseErrorPath
                            );
                            break;
                        }
                        case 1: {
                            tester.assertWarn(
                                false,
                                "Received polygonal hitbox with only 1 point",
                                baseErrorPath
                            );
                            break;
                        }
                        case 2: {
                            tester.assertWarn(
                                false,
                                "Received polygonal hitbox with only 2 points",
                                baseErrorPath
                            );
                            break;
                        }
                    }

                    tester.runTestOnArray(
                        points,
                        (point, errorPath) => this.vector(errorPath, point),
                        baseErrorPath
                    );
                });
                break;
            }
        }
    },
    weightedItem(baseErrorPath: string, weightedItem: WeightedItem): void {
        tester.assertValidOrNPV({
            obj: weightedItem,
            field: "count",
            defaultValue: 1,
            validatorIfPresent: count => {
                tester.assertIntAndInBounds({
                    value: count,
                    min: 1,
                    max: Infinity,
                    includeMin: true,
                    includeMax: true,
                    errorPath: baseErrorPath
                });
            },
            baseErrorPath
        });

        tester.assertNoPointlessValue({
            obj: weightedItem,
            field: "spawnSeparately",
            defaultValue: false,
            baseErrorPath
        });

        tester.assertWarn(
            weightedItem.spawnSeparately === true && weightedItem.count === 1,
            "Specifying 'count' of 1 for a drop declaration marked as 'spawnSeparately' is pointless",
            baseErrorPath
        );

        tester.assertIsPositiveFiniteReal({
            obj: weightedItem,
            field: "weight",
            baseErrorPath
        });

        if ("item" in weightedItem) {
            switch (weightedItem.item) {
                case NullString: {
                    tester.assertWarn(
                        weightedItem.count !== undefined,
                        "Specifying a count for a no-item drop is pointless",
                        baseErrorPath
                    );

                    tester.assertWarn(
                        weightedItem.spawnSeparately !== undefined,
                        "Specifying 'spawnSeparately' for a no-item drop is pointless",
                        baseErrorPath
                    );
                    break;
                }
                default: {
                    tester.assertReferenceExists({
                        obj: weightedItem,
                        field: "item",
                        baseErrorPath,
                        collection: Loots,
                        collectionName: "Loots"
                    });
                    break;
                }
            }
        } else {
            tester.assertReferenceExistsObject({
                obj: weightedItem,
                field: "table",
                baseErrorPath,
                collection: LootTables.normal,
                collectionName: "LootTables"
            });
        }
    },
    wearerAttributes(baseErrorPath: string, definition: InventoryItemDefinition): void {
        function validateWearerAttributesInternal(baseErrorPath: string, attributes: WearerAttributes): void {
            tester.assertNoPointlessValue({
                obj: attributes,
                field: "maxAdrenaline",
                defaultValue: 1,
                baseErrorPath
            });

            if (attributes.maxAdrenaline) {
                tester.assertIsPositiveReal({
                    obj: attributes,
                    field: "maxAdrenaline",
                    baseErrorPath
                });
            }

            tester.assertNoPointlessValue({
                obj: attributes,
                field: "minAdrenaline",
                defaultValue: 0,
                baseErrorPath
            });

            if (attributes.minAdrenaline) {
                tester.assertIsPositiveReal({
                    obj: attributes,
                    field: "minAdrenaline",
                    baseErrorPath
                });
            }

            tester.assertNoPointlessValue({
                obj: attributes,
                field: "maxHealth",
                defaultValue: 1,
                baseErrorPath
            });

            if (attributes.maxHealth) {
                tester.assertIsPositiveReal({
                    obj: attributes,
                    field: "maxHealth",
                    baseErrorPath
                });
            }

            tester.assertNoPointlessValue({
                obj: attributes,
                field: "speedBoost",
                defaultValue: 1,
                baseErrorPath
            });

            if (attributes.speedBoost) {
                tester.assertIsPositiveReal({
                    obj: attributes,
                    field: "speedBoost",
                    baseErrorPath
                });
            }
        }

        const wearerAttributes = definition.wearerAttributes;
        if (wearerAttributes) {
            logger.indent("Validating wearer attributes", () => {
                tester.assertNoPointlessValue({
                    obj: wearerAttributes,
                    field: "passive",
                    defaultValue: {},
                    equalityFunction: a => Object.keys(a).length === 0,
                    baseErrorPath
                });

                const passive = wearerAttributes.passive;
                if (passive) {
                    logger.indent("Validating passive wearer attributes", () => {
                        validateWearerAttributesInternal(tester.createPath(baseErrorPath, "wearer attributes", "passive"), passive);
                    });
                }

                tester.assertNoPointlessValue({
                    obj: wearerAttributes,
                    field: "active",
                    defaultValue: {},
                    equalityFunction: a => Object.keys(a).length === 0,
                    baseErrorPath
                });

                const active = wearerAttributes.active;
                if (active) {
                    logger.indent("Validating active wearer attributes", () => {
                        validateWearerAttributesInternal(tester.createPath(baseErrorPath, "wearer attributes", "active"), active);
                    });
                }

                tester.assertNoPointlessValue({
                    obj: wearerAttributes,
                    field: "on",
                    defaultValue: {},
                    equalityFunction: a => Object.keys(a).length === 0,
                    baseErrorPath
                });

                const on = wearerAttributes.on;
                if (on) {
                    logger.indent("Validating on wearer attributes", () => {
                        tester.assertNoPointlessValue({
                            obj: on,
                            field: "damageDealt",
                            defaultValue: [],
                            equalityFunction: a => a.length === 0,
                            baseErrorPath
                        });

                        const damageDealt = on.damageDealt;
                        if (damageDealt) {
                            logger.indent("Validating on-damage wearer attributes", () => {
                                tester.runTestOnArray(
                                    damageDealt,
                                    (entry, errorPath) => {
                                        validateWearerAttributesInternal(errorPath, entry);
                                    },
                                    tester.createPath(baseErrorPath, "wearer attributes", "on", "damageDealt")
                                );
                            });
                        }

                        tester.assertNoPointlessValue({
                            obj: on,
                            field: "kill",
                            defaultValue: [],
                            equalityFunction: a => a.length === 0,
                            baseErrorPath
                        });

                        const kill = on.kill;
                        if (kill) {
                            logger.indent("Validating on-kill wearer attributes", () => {
                                tester.runTestOnArray(
                                    kill,
                                    (entry, errorPath) => {
                                        validateWearerAttributesInternal(errorPath, entry);
                                    },
                                    tester.createPath(baseErrorPath, "wearer attributes", "on", "kill")
                                );
                            });
                        }
                    });
                }
            });
        }
    },
    color(baseErrorPath: string, color: number | `#${string}`): void {
        switch (typeof color) {
            case "number": {
                tester.assert(

                    !(color % 1) && 0 <= color && color <= 0xffffff,
                    `Color '${color}' is not a valid hexadecimal color`,
                    baseErrorPath
                );
                break;
            }
            case "string": {
                tester.assert(
                    color.match(/^#([0-9a-fA-F]{1,2}){3,4}$/) !== null,
                    `Color '${color}' is not a valid hexadecimal color`,
                    baseErrorPath
                );
                break;
            }
        }
    },
    minMax<T>(
        baseErrorPath: string,
        obj: { readonly min: T, readonly max: T },
        baseValidator: (errorPath: string, value: T) => void,
        comparator?: (a: T, b: T) => number
    ): void {
        baseValidator(tester.createPath(baseErrorPath, "min"), obj.min);
        baseValidator(tester.createPath(baseErrorPath, "max"), obj.max);

        if (comparator) {
            tester.assert(
                comparator(obj.min, obj.max) <= 0,
                "The specified maximum must be greater than or equal to the specified minimum",
                baseErrorPath
            );

            tester.assert(
                comparator(obj.max, obj.min) >= 0,
                "The specified minimum must be smaller than or equal to the specified maximum",
                baseErrorPath
            );
        }
    },
    numericInterval(
        baseErrorPath: string,
        interval: { readonly min: number, readonly max: number },
        options?: {
            readonly globalMin?: { readonly value: number, readonly include?: boolean }
            readonly globalMax?: { readonly value: number, readonly include?: boolean }
            readonly allowDegenerateIntervals?: boolean
        }
    ) {
        const {
            globalMin: { value: globalMin, include: includeGlobalMin },
            globalMax: { value: globalMax, include: includeGlobalMax },
            allowDegenerateIntervals
        } = {
            globalMin: { value: -Infinity, include: true },
            globalMax: { value: Infinity, include: true },
            allowDegenerateIntervals: true,
            ...(options ?? {})
        };

        const { min, max } = interval;

        if (
            !tester.assert(
                globalMin < min || (includeGlobalMin === true && globalMin === min),
                `Interval's minimum must be larger than ${includeGlobalMin ? "or equal to " : ""}${globalMin} (received ${min})`,
                baseErrorPath
            )
        ) return;

        if (
            !tester.assert(
                min <= max,
                `Interval described by min/max is invalid: [${min}, ${max}]`,
                baseErrorPath
            )
        ) return;

        if (
            !tester.assert(
                min !== max || (allowDegenerateIntervals && min === max),
                `Degenerate interval not allowed: [${min}, ${max}]`,
                baseErrorPath
            )
        ) return;

        tester.assert(
            max < globalMax || (includeGlobalMax === true && globalMax === max),
            `Interval's maximum must be smaller than ${includeGlobalMax ? "or equal to " : ""}${globalMax} (received ${max})`,
            baseErrorPath
        );
    },
    valueSpecifier<T>(
        baseErrorPath: string,
        value: ValueSpecifier<T>,
        baseValidator: (errorPath: string, value: T) => void,
        comparator?: (a: T, b: T) => number
    ): void {
        if (typeof value !== "object" || value === null) {
            baseValidator(baseErrorPath, value);
            return;
        }

        if ("min" in value) {
            this.minMax(
                baseErrorPath,
                value,
                baseValidator,
                comparator
            );
            return;
        }

        baseValidator(baseErrorPath, value);
    },
    animated<T>(
        baseErrorPath: string,
        animated: Animated<T>,
        baseValidator: (errorPath: string, value: T) => void,
        easingValidator?: (errorPath: string, easing?: keyof typeof EaseFunctions) => void
    ): void {
        this.valueSpecifier(tester.createPath(baseErrorPath, "start"), animated.start, baseValidator);
        this.valueSpecifier(tester.createPath(baseErrorPath, "end"), animated.end, baseValidator);

        // (durationValidator ?? (() => { /* no-op */ }))(tester.createPath(baseErrorPath, "duration"), animated.duration);
        (easingValidator ?? (() => { /* no-op */ }))(tester.createPath(baseErrorPath, "easing"), animated.easing);
    },
    syncedParticleSpawner(baseErrorPath: string, spawner: NonNullable<SyncedParticleDefinition["spawner"]>): void {
        tester.assertIsNaturalFiniteNumber({
            obj: spawner,
            field: "count",
            baseErrorPath
        });

        if (spawner.staggering !== undefined) {
            const staggering = spawner.staggering;

            logger.indent("Validating staggering", () => {
                const errorPath2 = tester.createPath(baseErrorPath, "staggering");

                tester.assertIsPositiveFiniteReal({
                    obj: staggering,
                    field: "delay",
                    baseErrorPath: errorPath2
                });

                tester.assertNoPointlessValue({
                    obj: staggering,
                    field: "initialAmount",
                    defaultValue: 0,
                    baseErrorPath: errorPath2
                });
            });
        }

        tester.assertIsPositiveReal({
            obj: spawner,
            field: "radius",
            baseErrorPath
        });
    }
});

export const logger = (() => {
    interface LoggingLevel {
        readonly title: string
        readonly messages: Array<string | LoggingLevel>
    }
    const messages: LoggingLevel = {
        title: "Validating idString references",
        messages: []
    };
    let current = messages;

    return {
        indent(reason: string, cb: () => void): void {
            const nextLevel: LoggingLevel = {
                title: reason,
                messages: []
            };
            const currentCopy = current;

            current.messages.push(nextLevel);
            current = nextLevel;
            try {
                cb();
            } catch (e) {
                tester.fatalErrors.push([
                    "unknown",
                    convertUnknownErrorToString(e)
                ]);
            }

            current = currentCopy;
        },
        log(message: string): void {
            current.messages.push(message);
        },
        print() {
            // ┬│┐─└├

            (function printInternal(base: LoggingLevel, dashes: boolean[] = []): void {
                const prePrefix = dashes.map(v => `${v ? "│" : " "} `).join("");

                for (let i = 0, l = base.messages.length; i < l; i++) {
                    const message = base.messages[i];
                    const isLast = i === l - 1;

                    const basePrefix = `${isLast ? "└" : "├"}─`;
                    if (typeof message === "string") {
                        console.log(`${prePrefix}${basePrefix} ${message}`);
                    } else {
                        const prefix = `${message.messages.length ? "┬" : "─"}─`;
                        console.log(`${prePrefix}${basePrefix}${prefix} ${message.title}`);

                        if (message.messages.length) {
                            printInternal(message, dashes.concat(!isLast));
                        }
                    }
                }
            })(messages);
        }
    };
})();
