import { ZIndexes } from "../../common/src/constants";
import { Loots } from "../../common/src/definitions/loots";
import { CircleHitbox, HitboxGroup, PolygonHitbox, RectangleHitbox, type Hitbox } from "../../common/src/utils/hitbox";
import { type BaseBulletDefinition, type ObjectDefinition, type ObjectDefinitions } from "../../common/src/utils/objectDefinitions";
import { type Vector } from "../../common/src/utils/vector";
import { LootTiers, type WeightedItem } from "../../server/src/data/lootTables";

/*
    eslint-disable

    @typescript-eslint/unbound-method,
    object-shorthand
*/

function findDupes(collection: string[]): { readonly foundDupes: boolean, readonly dupes: Record<string, number> } {
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

export const tester = (() => {
    const warnings: Array<[string, string]> = [];
    const errors: Array<[string, string]> = [];

    return {
        get warnings() { return warnings; },
        get errors() { return errors; },
        createPath(...components: string[]) {
            return components.join(" -> ");
        },

        assert(condition: boolean, errorMessage: string, errorPath: string): void {
            if (!condition) errors.push([errorPath, errorMessage]);
        },
        assertWarn(warningCondition: boolean, warningMessage: string, errorPath: string): void {
            if (warningCondition) warnings.push([errorPath, warningMessage]);
        },
        assertNoDuplicateIDStrings(collection: Array<{ readonly idString: string }>, collectionName: string, errorPath: string): void {
            const { foundDupes, dupes } = findDupes(collection.map(v => v.idString));

            this.assert(
                !foundDupes,
                `Collection ${collectionName} contained duplicate entries: ${Object.entries(dupes).map(([k, v]) => `'${k}' => ${v} times`).join("; ")}`,
                errorPath
            );
        },
        assertInt<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
        }) {
            const {
                obj,
                field,
                baseErrorPath
            } = params;

            const value = obj[field] as number;
            const errorPath = this.createPath(baseErrorPath, `field '${String(field)}'`);

            tester.assert(value % 1 === 0, `This field must be an integer (received ${value})`, errorPath);
        },
        assertReferenceExists<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
            collection: ObjectDefinitions
        }) {
            const {
                obj,
                field,
                baseErrorPath,
                collection
            } = params;

            this.assertReferenceExistsArray({
                obj,
                field,
                baseErrorPath,
                collection: collection.definitions,
                collectionName: collection.constructor.name
            });
        },
        assertReferenceExistsArray<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
            collection: ObjectDefinition[]
            collectionName: string
        }) {
            const {
                obj,
                field,
                baseErrorPath,
                collection,
                collectionName
            } = params;

            this.assertReferenceExistsObject({
                obj,
                field,
                baseErrorPath,
                collection: collection.reduce<Record<string, unknown>>(
                    (acc, cur) => {
                        acc[cur.idString] = cur;
                        return acc;
                    },
                    {}
                ),
                collectionName
            });
        },
        assertReferenceExistsObject<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
            collection: Record<string, unknown>
            collectionName: string
        }) {
            const {
                obj,
                field,
                baseErrorPath,
                collection,
                collectionName
            } = params;

            const referenceToValidate = obj[field] as string;
            const errorPath = this.createPath(baseErrorPath, `field '${String(field)}'`);

            tester.assert(
                referenceToValidate in collection,
                `This field attempted to refer to member '${referenceToValidate}' of collection '${collectionName}', but no such member exists.`,
                errorPath
            );
        },
        /**
         * Checks for [-∞, ∞]
         */
        assertIsRealNumber<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
        }): void {
            const {
                obj,
                field,
                baseErrorPath
            } = params;

            this.assertInBounds({
                obj,
                field,
                min: -Infinity,
                max: Infinity,
                includeMin: true,
                includeMax: true,
                baseErrorPath
            });
        },
        /**
         * Checks for ]-∞, ∞[
         */
        assertIsFiniteRealNumber<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
        }): void {
            const {
                obj,
                field,
                baseErrorPath
            } = params;

            this.assertInBounds({
                obj,
                field,
                min: -Infinity,
                max: Infinity,
                baseErrorPath
            });
        },
        /**
         * Checks for `[0, ∞]`
         */
        assertIsPositiveReal<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
        }): void {
            const {
                obj,
                field,
                baseErrorPath
            } = params;

            this.assertInBounds({
                obj,
                field,
                min: 0,
                max: Infinity,
                includeMin: true,
                includeMax: true,
                baseErrorPath
            });
        },
        /**
         * Checks for `[0, ∞[`
         */
        assertIsPositiveFiniteReal<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
        }): void {
            const {
                obj,
                field,
                baseErrorPath
            } = params;

            this.assertInBounds({
                obj,
                field,
                min: 0,
                max: Infinity,
                includeMin: true,
                baseErrorPath
            });
        },
        /**
         * Checks for `[0, ∞] ∩ ℤ`
         */
        assertIsNaturalNumber<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
        }): void {
            if (Number.isFinite(params.obj[params.field])) {
                this.assertInt(params);
            }
            this.assertIsPositiveReal(params);
        },
        /**
         * Checks for `[0, ∞[ ∩ ℤ` (aka `ℕ`)
         */
        assertIsNaturalFiniteNumber<T extends object>(params: {
            obj: T
            field: keyof T
            baseErrorPath: string
        }): void {
            if (Number.isFinite(params.obj[params.field])) {
                this.assertInt(params);
            }
            this.assertIsPositiveFiniteReal(params);
        },
        assertInBounds<T extends object>(params: {
            obj: T
            field: keyof T
            min: number
            max: number
            includeMin?: boolean
            includeMax?: boolean
            baseErrorPath: string
        }): void {
            const {
                obj,
                field,
                min,
                max,
                includeMin,
                includeMax,
                baseErrorPath
            } = params;

            const value = obj[field] as number;
            const errorPath = this.createPath(baseErrorPath, `field '${String(field)}'`);

            tester.assert(value > min || (includeMin === true && value === min), `This field must be greater than ${includeMin ? "or equal to " : ""}${min} (received ${value})`, errorPath);
            tester.assert(value < max || (includeMax === true && value === max), `This field must be less than ${includeMax ? "or equal to " : ""}${max} (received ${value})`, errorPath);
        },
        assertIntAndInBounds<T extends object>(params: {
            obj: T
            field: keyof T
            min: number
            max: number
            includeMin?: boolean
            includeMax?: boolean
            baseErrorPath: string
        }): void {
            if (Number.isFinite(params.obj[params.field])) {
                this.assertInt(params);
            }

            this.assertInBounds(params);
        },
        assertNoPointlessValue<T extends object, K extends keyof T, U>(params: {
            obj: T
            field: K
            defaultValue: U
            equalityFunction?: (a: NonNullable<T[K]>, b: U) => boolean
            baseErrorPath: string
        }): void {
            const {
                obj,
                field,
                equalityFunction,
                defaultValue,
                baseErrorPath
            } = params;

            const errorPath = this.createPath(baseErrorPath, `field '${String(field)}'`);

            // technically we should do "field in obj" here, but meh…
            tester.assertWarn(
                (obj[field] !== undefined) && (equalityFunction ?? ((a, b) => a === b))(obj[field]!, defaultValue),
                `This field is optional and has a default value (${JSON.stringify(defaultValue)}); specifying its default value serves no purpose`,
                errorPath
            );
        },
        runTestOnArray<T>(array: T[], cb: (obj: T, errorPath: string) => void, baseErrorPath: string) {
            let i = 0;
            for (const element of array) {
                cb(element, this.createPath(baseErrorPath, `entry ${i}`));
                i++;
            }
        }
    };
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
            const errorPath3 = tester.createPath(baseErrorPath, "penetration");

            tester.assertNoPointlessValue({
                obj: ballistics.penetration,
                field: "players",
                defaultValue: false,
                baseErrorPath: errorPath3
            });

            tester.assertNoPointlessValue({
                obj: ballistics.penetration,
                field: "obstacles",
                defaultValue: false,
                baseErrorPath: errorPath3
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
            field: "goToMouse",
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
        if (hitbox instanceof CircleHitbox) {
            this.vector(baseErrorPath, hitbox.position);

            tester.assertIsPositiveFiniteReal({
                obj: hitbox,
                field: "radius",
                baseErrorPath
            });
        } else if (hitbox instanceof RectangleHitbox) {
            this.vector(baseErrorPath, hitbox.min);
            this.vector(baseErrorPath, hitbox.max);
        } else if (hitbox instanceof HitboxGroup) {
            hitbox.hitboxes.map(this.hitbox.bind(this, baseErrorPath));
        } else if (hitbox instanceof PolygonHitbox) {
            hitbox.points.map(v => this.vector(baseErrorPath, v));
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
            (function printInternal(base: LoggingLevel, level = 0, dashes: boolean[] = []): void {
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
                            printInternal(message, level + 1, dashes.concat(!isLast));
                        }
                    }
                }
            })(messages);
        }
    };
})();
