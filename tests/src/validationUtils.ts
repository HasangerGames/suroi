import { ZIndexes } from "../../common/src/constants";
import { Loots } from "../../common/src/definitions/loots";
import { SyncedParticles, type Animated, type NumericSpecifier, type SyncedParticleSpawnerDefinition, type ValueSpecifier } from "../../common/src/definitions/syncedParticles";
import { HitboxType, type Hitbox } from "../../common/src/utils/hitbox";
import { type EaseFunctions } from "../../common/src/utils/math";
import { type BaseBulletDefinition, type InventoryItemDefinition, type ObjectDefinitions, type WearerAttributes } from "../../common/src/utils/objectDefinitions";
import { type Vector } from "../../common/src/utils/vector";
import { LootTiers, type WeightedItem } from "../../server/src/data/lootTables";

export function findDupes(collection: string[]): { readonly foundDupes: boolean, readonly dupes: Record<string, number> } {
    const dupes: Record<string, number> = {};
    const set = new Set<string>();
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

function safeString(value: unknown): string {
    try {
        return JSON.stringify(value);
    } catch (_) {
        return String(value);
    }
}

export const tester = (() => {
    type Helper<
        PlainValue,
        OtherParams extends object
    > = <Target extends object>(
        params: ({
            readonly obj: Target
            readonly field: keyof Target
            readonly baseErrorPath: string
        } | {
            readonly value: PlainValue
            readonly errorPath: string
        }) & OtherParams
    ) => void;

    function createDualForm<
        PlainValue,
        OtherParams extends object = object
    >(
        predicate: (
            value: PlainValue,
            otherParams: OtherParams,
            forwardTo: <Args extends object, Fn extends Helper<PlainValue, Args>>(fn: Fn, args: Args) => void
        ) => {
            readonly errors?: string[]
            readonly warnings?: string[]
        } | undefined
    ) {
        return <Target extends object>(
            params: ({
                readonly obj: Target
                readonly field: keyof Target
                readonly baseErrorPath: string
            } | {
                readonly value: PlainValue
                readonly errorPath: string
            }) & OtherParams
        ): void => {
            const [value, errorPath] = "value" in params
                ? [
                    params.value,
                    params.errorPath
                ]
                : [
                    params.obj[params.field] as PlainValue,
                    tester.createPath(params.baseErrorPath, `field ${String(params.field)}`)
                ];

            const result = {
                errors: [],
                warnings: [],
                ...(predicate(
                    value,
                    params,
                    (target, args) => {
                        return target({
                            value,
                            errorPath,
                            ...args
                        });
                    }
                ) ?? {})
            };

            if (result === undefined || Number.isNaN(result.errors.length / result.warnings.length)) return;

            const prependErrorPath = (err: string): [string, string] => [errorPath, err];

            tester.errors.push(
                ...result.errors.map(prependErrorPath)
            );
            tester.warnings.push(
                ...result.warnings.map(prependErrorPath)
            );
        };
    }

    const warnings: Array<[string, string]> = [];
    const errors: Array<[string, string]> = [];

    function createPath(...components: string[]): string {
        return components.join(" -> ");
    }

    function assert(condition: boolean, errorMessage: string, errorPath: string): void {
        if (!condition) errors.push([errorPath, errorMessage]);
    }

    function assertWarn(warningCondition: boolean, warningMessage: string, errorPath: string): void {
        if (warningCondition) warnings.push([errorPath, warningMessage]);
    }

    function assertNoDuplicateIDStrings(collection: Array<{ readonly idString: string }>, collectionName: string, errorPath: string): void {
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
            readonly collection: Array<{ readonly idString: string }>
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
            readonly includeMin?: boolean
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

        if (!(value > min || (includeMin === true && value === min))) {
            errors.push(`This field must be greater than ${includeMin ? "or equal to " : ""}${min} (received ${safeString(value)})`);
        }
        if (!(value < max || (includeMax === true && value === max))) {
            errors.push(`This field must be less than ${includeMax ? "or equal to " : ""}${max} (received ${safeString(value)})`);
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
                equalityFunction?: (a: NonNullable<typeof value>, b: typeof value) => boolean
            }
        ) => {
            if ((value !== undefined) && (otherParams.equalityFunction ?? ((a, b) => a === b))(value!, otherParams.defaultValue)) {
                return {
                    warnings: [
                        `This field is optional and has a default value (${safeString(otherParams.defaultValue)}); specifying its default value serves no purpose`
                    ]
                };
            }
        }
    ) as <Target extends object, Key extends keyof Target, ValueType>(
        params: ({
            readonly obj: Target
            readonly field: Key
            readonly baseErrorPath: string
        } | {
            readonly value: ValueType
            readonly errorPath: string
        }) & {
            readonly defaultValue: ValueType
            readonly equalityFunction?: (a: NonNullable<ValueType>, b: ValueType) => boolean
        }
    ) => void;
    // lol

    return Object.freeze({
        get warnings() { return warnings; },
        get errors() { return errors; },
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
        runTestOnArray<T>(array: T[], cb: (obj: T, errorPath: string) => void, baseErrorPath: string) {
            let i = 0;
            for (const element of array) {
                logger.indent(`Validating entry ${i}`, () => {
                    cb(element, this.createPath(baseErrorPath, `entry ${i}`));
                    i++;
                });
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

        if (ballistics.penetration !== undefined) {
            const errorPath = tester.createPath(baseErrorPath, "penetration");

            tester.assertNoPointlessValue({
                obj: ballistics.penetration,
                field: "players",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: ballistics.penetration,
                field: "obstacles",
                defaultValue: false,
                baseErrorPath: errorPath
            });
        }

        tester.assertNoPointlessValue({
            obj: ballistics,
            field: "tracer",
            defaultValue: {},
            equalityFunction: a => Object.keys(a).length === 0,
            baseErrorPath
        });

        if (ballistics.tracer) {
            logger.indent("Validating tracer data", () => {
                const errorPath = tester.createPath(baseErrorPath, "tracer data");
                const tracer = ballistics.tracer!;

                tester.assertNoPointlessValue({
                    obj: tracer,
                    field: "opacity",
                    defaultValue: 1,
                    baseErrorPath: errorPath
                });

                if (tracer.opacity) {
                    tester.assertInBounds({
                        obj: tracer,
                        field: "opacity",
                        min: 0,
                        max: 1,
                        includeMin: true,
                        baseErrorPath: errorPath
                    });
                }

                tester.assertNoPointlessValue({
                    obj: tracer,
                    field: "width",
                    defaultValue: 1,
                    baseErrorPath: errorPath
                });

                if (tracer.width) {
                    tester.assertIsPositiveReal({
                        obj: tracer,
                        field: "width",
                        baseErrorPath: errorPath
                    });
                }

                tester.assertNoPointlessValue({
                    obj: tracer,
                    field: "length",
                    defaultValue: 1,
                    baseErrorPath: errorPath
                });

                if (tracer.length) {
                    tester.assertIsPositiveReal({
                        obj: tracer,
                        field: "length",
                        baseErrorPath: errorPath
                    });
                }

                tester.assertNoPointlessValue({
                    obj: tracer,
                    field: "color",
                    defaultValue: 0xFFFFFF,
                    baseErrorPath: errorPath
                });

                if (tracer.color) {
                    tester.assertIntAndInBounds({
                        obj: tracer,
                        field: "color",
                        min: 0x0,
                        max: 0xFFFFFF,
                        baseErrorPath: errorPath
                    });
                }

                tester.assertNoPointlessValue({
                    obj: tracer,
                    field: "image",
                    defaultValue: "base_trail",
                    baseErrorPath: errorPath
                });

                tester.assertNoPointlessValue({
                    obj: tracer,
                    field: "particle",
                    defaultValue: false,
                    baseErrorPath: errorPath
                });

                tester.assertNoPointlessValue({
                    obj: tracer,
                    field: "zIndex",
                    defaultValue: ZIndexes.Bullets,
                    baseErrorPath: errorPath
                });
            });
        }

        tester.assertNoPointlessValue({
            obj: ballistics,
            field: "rangeVariance",
            defaultValue: 0,
            baseErrorPath
        });

        if (ballistics.rangeVariance) {
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

        tester.assertNoPointlessValue({
            obj: ballistics,
            field: "allowRangeOverride",
            defaultValue: false,
            baseErrorPath
        });

        tester.assertNoPointlessValue({
            obj: ballistics,
            field: "lastShotFX",
            defaultValue: false,
            baseErrorPath
        });

        tester.assertNoPointlessValue({
            obj: ballistics,
            field: "noCollision",
            defaultValue: false,
            baseErrorPath
        });
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
                    tester.runTestOnArray(
                        hitbox.hitboxes,
                        (hitbox, errorPath) => this.hitbox(errorPath, hitbox),
                        baseErrorPath
                    );
                });
                break;
            }
            case HitboxType.Polygon: {
                logger.indent("Validating polygonal hitbox", () => {
                    tester.runTestOnArray(
                        hitbox.points,
                        (point, errorPath) => this.vector(errorPath, point),
                        baseErrorPath
                    );
                });
                break;
            }
        }
    },
    weightedItem(baseErrorPath: string, weightedItem: WeightedItem): void {
        tester.assertNoPointlessValue({
            obj: weightedItem,
            field: "count",
            defaultValue: 1,
            baseErrorPath
        });

        if (weightedItem.count !== undefined) {
            tester.assertIntAndInBounds({
                obj: weightedItem,
                field: "count",
                min: 1,
                max: Infinity,
                includeMin: true,
                includeMax: true,
                baseErrorPath
            });
        }

        tester.assertNoPointlessValue({
            obj: weightedItem,
            field: "spawnSeparately",
            defaultValue: false,
            baseErrorPath
        });

        tester.assertWarn(
            weightedItem.spawnSeparately === true && weightedItem.count === 1,
            "Specifying 'spawnSeparately' for a drop declaration with 'count' 1 is pointless",
            baseErrorPath
        );

        tester.assertIsPositiveFiniteReal({
            obj: weightedItem,
            field: "weight",
            baseErrorPath
        });

        if ("item" in weightedItem) {
            switch (weightedItem.item) {
                case null: {
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
                    tester.assertReferenceExistsArray({
                        obj: weightedItem,
                        field: "item",
                        baseErrorPath,
                        collection: Loots.definitions,
                        collectionName: "Loots"
                    });
                    break;
                }
            }
        } else {
            tester.assertReferenceExistsObject({
                obj: weightedItem,
                field: "tier",
                baseErrorPath,
                collection: LootTiers,
                collectionName: "LootTiers"
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

        if (definition.wearerAttributes) {
            logger.indent("Validating wearer attributes", () => {
                const wearerAttributes = definition.wearerAttributes!;

                tester.assertNoPointlessValue({
                    obj: wearerAttributes,
                    field: "passive",
                    defaultValue: {},
                    equalityFunction: a => Object.keys(a).length === 0,
                    baseErrorPath
                });

                if (wearerAttributes.passive) {
                    logger.indent("Validating passive wearer attributes", () => {
                        validateWearerAttributesInternal(tester.createPath(baseErrorPath, "wearer attributes", "passive"), wearerAttributes.passive!);
                    });
                }

                tester.assertNoPointlessValue({
                    obj: wearerAttributes,
                    field: "active",
                    defaultValue: {},
                    equalityFunction: a => Object.keys(a).length === 0,
                    baseErrorPath
                });

                if (wearerAttributes.active) {
                    logger.indent("Validating active wearer attributes", () => {
                        validateWearerAttributesInternal(tester.createPath(baseErrorPath, "wearer attributes", "active"), wearerAttributes.active!);
                    });
                }

                tester.assertNoPointlessValue({
                    obj: wearerAttributes,
                    field: "on",
                    defaultValue: {},
                    equalityFunction: a => Object.keys(a).length === 0,
                    baseErrorPath
                });

                if (wearerAttributes.on) {
                    logger.indent("Validating on wearer attributes", () => {
                        const on = wearerAttributes.on!;

                        tester.assertNoPointlessValue({
                            obj: on,
                            field: "damageDealt",
                            defaultValue: [],
                            equalityFunction: a => a.length === 0,
                            baseErrorPath
                        });

                        if (on.damageDealt) {
                            logger.indent("Validating on-damage wearer attributes", () => {
                                tester.runTestOnArray(
                                    on.damageDealt!,
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

                        if (on.kill) {
                            logger.indent("Validating on-kill wearer attributes", () => {
                                tester.runTestOnArray(
                                    on.kill!,
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
                    // eslint-disable-next-line yoda
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

        if ("mean" in value) {
            baseValidator(tester.createPath(baseErrorPath, "mean"), value.mean);
            baseValidator(tester.createPath(baseErrorPath, "deviation"), value.deviation);
            return;
        }

        baseValidator(baseErrorPath, value);
    },
    animated<T>(
        baseErrorPath: string,
        animated: Animated<T>,
        baseValidator: (errorPath: string, value: T) => void,
        durationValidator?: (errorPath: string, duration?: NumericSpecifier | "lifetime") => void,
        easingValidator?: (errorPath: string, easing?: keyof typeof EaseFunctions) => void
    ): void {
        this.valueSpecifier(tester.createPath(baseErrorPath, "start"), animated.start, baseValidator);
        this.valueSpecifier(tester.createPath(baseErrorPath, "end"), animated.end, baseValidator);

        (durationValidator ?? (() => {}))(tester.createPath(baseErrorPath, "duration"), animated.duration);
        (easingValidator ?? (() => {}))(tester.createPath(baseErrorPath, "easing"), animated.easing);
    },
    syncedParticleSpawner(baseErrorPath: string, spawner: SyncedParticleSpawnerDefinition): void {
        tester.assertReferenceExists({
            obj: spawner,
            field: "type",
            collection: SyncedParticles,
            collectionName: "SyncedParticles",
            baseErrorPath
        });

        tester.assertIsNaturalFiniteNumber({
            obj: spawner,
            field: "count",
            baseErrorPath
        });

        tester.assertNoPointlessValue({
            obj: spawner,
            field: "deployAnimation",
            defaultValue: {},
            equalityFunction: a => Object.keys(a).length === 0,
            baseErrorPath
        });

        if (spawner.deployAnimation !== undefined) {
            const deployAnimation = spawner.deployAnimation;

            logger.indent("Validating deploy animation", () => {
                const errorPath = tester.createPath(baseErrorPath, "deploy animation");

                tester.assertNoPointlessValue({
                    obj: deployAnimation,
                    field: "duration",
                    defaultValue: 0,
                    baseErrorPath: errorPath
                });

                if (deployAnimation.duration !== undefined) {
                    tester.assertIsPositiveReal({
                        obj: deployAnimation,
                        field: "duration",
                        baseErrorPath: errorPath
                    });
                }

                if (deployAnimation.staggering !== undefined) {
                    const staggering = deployAnimation.staggering;

                    logger.indent("Validating staggering", () => {
                        const errorPath2 = tester.createPath(errorPath, "staggering");

                        tester.assertIsPositiveFiniteReal({
                            obj: staggering,
                            field: "delay",
                            baseErrorPath: errorPath2
                        });

                        tester.assertNoPointlessValue({
                            obj: staggering,
                            field: "spawnPerGroup",
                            defaultValue: 1,
                            baseErrorPath: errorPath2
                        });

                        if (staggering.spawnPerGroup !== undefined) {
                            tester.assertIsNaturalNumber({
                                obj: staggering,
                                field: "spawnPerGroup",
                                baseErrorPath: errorPath2
                            });
                        }

                        tester.assertNoPointlessValue({
                            obj: staggering,
                            field: "initialAmount",
                            defaultValue: 0,
                            baseErrorPath: errorPath2
                        });

                        if (staggering.spawnPerGroup !== undefined) {
                            tester.assertIntAndInBounds({
                                obj: staggering,
                                field: "spawnPerGroup",
                                min: 0,
                                max: spawner.count,
                                includeMin: true,
                                includeMax: true,
                                baseErrorPath: errorPath2
                            });
                        }
                    });
                }
            });
        }

        tester.assertIsPositiveReal({
            obj: spawner,
            field: "spawnRadius",
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
            cb();

            current = currentCopy;
        },
        log(message: string): void {
            current.messages.push(message);
        },
        print() {
            // ┬┆┐─└├

            console.clear();
            (function printInternal(base: LoggingLevel, dashes: boolean[] = []): void {
                const prePrefix = dashes.map(v => `${v ? "┆" : " "} `).join("");

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
