import { Config as ClientConfig } from "../../client/src/scripts/config";
import { FireMode } from "../../common/src/constants";
import { Ammos } from "../../common/src/definitions/ammos";
import { Armors, type ArmorDefinition } from "../../common/src/definitions/armors";
import { Backpacks } from "../../common/src/definitions/backpacks";
import { Buildings } from "../../common/src/definitions/buildings";
import { Decals } from "../../common/src/definitions/decals";
import { Emotes } from "../../common/src/definitions/emotes";
import { Explosions } from "../../common/src/definitions/explosions";
import { Guns } from "../../common/src/definitions/guns";
import { HealingItems } from "../../common/src/definitions/healingItems";
import { Helmets } from "../../common/src/definitions/helmets";
import { Loots } from "../../common/src/definitions/loots";
import { Melees } from "../../common/src/definitions/melees";
import { Obstacles, RotationMode } from "../../common/src/definitions/obstacles";
import { Scopes } from "../../common/src/definitions/scopes";
import { Skins } from "../../common/src/definitions/skins";
import { Vests } from "../../common/src/definitions/vests";
import { CircleHitbox, ComplexHitbox, PolygonHitbox, RectangleHitbox, type Hitbox } from "../../common/src/utils/hitbox";
import { FloorTypes } from "../../common/src/utils/mapUtils";
import { ObstacleSpecialRoles, type BaseBulletDefinition, type ItemDefinition, type ObjectDefinition, type ObjectDefinitions, type WearerAttributes } from "../../common/src/utils/objectDefinitions";
import { type Vector } from "../../common/src/utils/vector";
import { Config, GasMode, Config as ServerConfig, SpawnMode } from "./config";
import { GasStages } from "./data/gasStages";
import { LootTables, LootTiers } from "./data/lootTables";
import { Maps } from "./data/maps";
import { ColorStyles, FontStyles, styleText } from "./utils/ansiColoring";

/* eslint-disable @typescript-eslint/no-non-null-assertion */

const absStart = Date.now();
const tester = (() => {
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
        assertWarn(condition: boolean, warningMessage: string, errorPath: string): void {
            if (!condition) warnings.push([errorPath, warningMessage]);
        },
        assertNoDuplicateIDStrings(collection: ObjectDefinition[], collectionName: string, errorPath: string): void {
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
                includeMin: true,
                baseErrorPath
            });
        },
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
                (obj[field] === undefined) || !(equalityFunction ?? ((a, b) => a === b))(obj[field]!, defaultValue),
                `This field is optional and has a default value (${JSON.stringify(defaultValue)}); specifying its default value serves no purpose`,
                errorPath
            );
        }
    };
})();

const validators = Object.freeze({
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
            field: "maxDistance",
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
        } else if (hitbox instanceof ComplexHitbox) {
            hitbox.hitboxes.map(this.hitbox.bind(this, baseErrorPath));
        } else if (hitbox instanceof PolygonHitbox) {
            hitbox.points.map(v => this.vector(baseErrorPath, v));
        }
    }
});

const logger = (() => {
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

const testStart = Date.now();
logger.log("START");
logger.indent("Validating gas stages", () => {
    for (let i = 0, l = GasStages.length; i < l; i++) {
        const stage = GasStages[i];
        const errorPath = tester.createPath("gas stages", `stage ${i}`);

        logger.indent(`Validating stage ${i}`, () => {
            tester.assertIsPositiveReal({
                obj: stage,
                field: "duration",
                baseErrorPath: errorPath
            });

            tester.assertIsRealNumber({
                obj: stage,
                field: "dps",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveReal({
                obj: stage,
                field: "oldRadius",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveReal({
                obj: stage,
                field: "newRadius",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: stage,
                field: "preventJoin",
                defaultValue: false,
                baseErrorPath: errorPath
            });
        });
    }
});

logger.indent("Validating loot table references", () => {
    logger.indent("Validating loot tables", () => {
        for (const [name, lootData] of Object.entries(LootTables)) {
            logger.indent(`Validating table '${name}'`, () => {
                const errorPath = tester.createPath("loot table references", "loot tables", `table '${name}'`);

                logger.indent("Validating min/max", () => {
                    tester.assertIntAndInBounds({
                        obj: lootData,
                        field: "min",
                        min: 0,
                        max: lootData.max,
                        includeMin: true,
                        includeMax: true,
                        baseErrorPath: errorPath
                    });

                    tester.assertIntAndInBounds({
                        obj: lootData,
                        field: "max",
                        min: lootData.min,
                        max: Infinity,
                        includeMin: true,
                        includeMax: true,
                        baseErrorPath: errorPath
                    });
                });

                logger.indent("Validating drop declaration", () => {
                    const errorPath2 = tester.createPath(errorPath, "drop declaration");

                    for (const entry of lootData.loot.flat()) {
                        tester.assertNoPointlessValue({
                            obj: entry,
                            field: "count",
                            defaultValue: 1,
                            baseErrorPath: errorPath2
                        });

                        if (entry.count !== undefined) {
                            tester.assertIntAndInBounds({
                                obj: entry,
                                field: "count",
                                min: 1,
                                max: Infinity,
                                includeMin: true,
                                includeMax: true,
                                baseErrorPath: errorPath2
                            });
                        }

                        tester.assertNoPointlessValue({
                            obj: entry,
                            field: "spawnSeparately",
                            defaultValue: false,
                            baseErrorPath: errorPath2
                        });

                        tester.assertWarn(
                            entry.spawnSeparately !== true || entry.count !== 1,
                            "Specifying 'spawnSeparately' for a drop declaration with 'count' 1 is pointless",
                            errorPath2
                        );

                        tester.assertIsPositiveFiniteReal({
                            obj: entry,
                            field: "weight",
                            baseErrorPath: errorPath2
                        });

                        if ("item" in entry) {
                            tester.assertReferenceExistsArray({
                                obj: entry,
                                field: "item",
                                baseErrorPath: errorPath2,
                                collection: Loots.definitions,
                                collectionName: "Loots"
                            });
                        } else {
                            tester.assertReferenceExistsObject({
                                obj: entry,
                                field: "tier",
                                baseErrorPath: errorPath2,
                                collection: LootTiers,
                                collectionName: "LootTiers"
                            });
                        }
                    }
                });
            });
        }
    });

    logger.indent("Validating loot tiers", () => {
        for (const [name, lootTierData] of Object.entries(LootTiers)) {
            logger.indent(`Validating tier '${name}'`, () => {
                const errorPath = tester.createPath("loot table references", "loot tiers", `tier '${name}'`);

                for (const entry of lootTierData) {
                    tester.assertNoPointlessValue({
                        obj: entry,
                        field: "count",
                        defaultValue: 1,
                        baseErrorPath: errorPath
                    });

                    if (entry.count !== undefined) {
                        tester.assertIntAndInBounds({
                            obj: entry,
                            field: "count",
                            min: 1,
                            max: Infinity,
                            includeMin: true,
                            includeMax: true,
                            baseErrorPath: errorPath
                        });
                    }

                    tester.assertNoPointlessValue({
                        obj: entry,
                        field: "spawnSeparately",
                        defaultValue: false,
                        baseErrorPath: errorPath
                    });

                    tester.assertWarn(
                        entry.spawnSeparately !== true || entry.count !== 1,
                        "Specifying 'spawnSeparately' for a drop declaration with 'count' 1 is pointless",
                        errorPath
                    );

                    tester.assertIsPositiveFiniteReal({
                        obj: entry,
                        field: "weight",
                        baseErrorPath: errorPath
                    });

                    if ("item" in entry) {
                        tester.assertReferenceExistsArray({
                            obj: entry,
                            field: "item",
                            baseErrorPath: errorPath,
                            collection: Loots.definitions,
                            collectionName: "Loots"
                        });
                    } else {
                        tester.assertReferenceExistsObject({
                            obj: entry,
                            field: "tier",
                            baseErrorPath: errorPath,
                            collection: LootTiers,
                            collectionName: "LootTiers"
                        });
                    }
                }
            });
        }
    });
});

logger.indent("Validating map definitions", () => {
    for (const [name, definition] of Object.entries(Maps)) {
        logger.indent(`Validating map '${name}'`, () => {
            const errorPath = tester.createPath("maps", `map '${name}'`);

            tester.assertNoPointlessValue({
                obj: definition,
                field: "buildings",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                baseErrorPath: errorPath
            });

            if (definition.buildings) {
                const errorPath2 = tester.createPath(errorPath, "buildings");

                logger.indent("Validating buildings", () => {
                    for (const [building] of Object.entries(definition.buildings!)) {
                        tester.assertReferenceExists({
                            obj: { [building]: building },
                            field: building,
                            baseErrorPath: errorPath2,
                            collection: Buildings
                        });

                        tester.assertIsNaturalFiniteNumber({
                            obj: definition.buildings!,
                            field: building,
                            baseErrorPath: errorPath2
                        });
                    }
                });
            }

            tester.assertNoPointlessValue({
                obj: definition,
                field: "obstacles",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                baseErrorPath: errorPath
            });

            if (definition.obstacles) {
                const errorPath2 = tester.createPath(errorPath, "obstacles");

                logger.indent("Validating obstacles", () => {
                    for (const [obstacle] of Object.entries(definition.obstacles!)) {
                        tester.assertReferenceExists({
                            obj: { [obstacle]: obstacle },
                            field: obstacle,
                            baseErrorPath: errorPath2,
                            collection: Obstacles
                        });

                        tester.assertIsNaturalFiniteNumber({
                            obj: definition.obstacles!,
                            field: obstacle,
                            baseErrorPath: errorPath2
                        });
                    }
                });
            }

            tester.assertNoPointlessValue({
                obj: definition,
                field: "specialObstacles",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                baseErrorPath: errorPath
            });

            if (definition.specialObstacles) {
                const errorPath2 = tester.createPath(errorPath, "special obstacles");

                logger.indent("Validating special obstacles", () => {
                    /* eslint-disable @typescript-eslint/no-non-null-assertion */
                    for (const [obstacle, config] of Object.entries(definition.specialObstacles!)) {
                        logger.indent(`Validating config for obstacle '${obstacle}'`, () => {
                            tester.assertReferenceExists({
                                obj: { [obstacle]: obstacle },
                                field: obstacle,
                                baseErrorPath: errorPath2,
                                collection: Obstacles
                            });

                            tester.assertNoPointlessValue({
                                obj: config,
                                field: "spawnProbability",
                                defaultValue: 1,
                                baseErrorPath: errorPath
                            });

                            if (config.spawnProbability) {
                                tester.assertInBounds({
                                    obj: config,
                                    field: "spawnProbability",
                                    min: 0,
                                    max: 1,
                                    includeMin: true,
                                    includeMax: true,
                                    baseErrorPath: errorPath2
                                });
                            }

                            if ("count" in config) {
                                tester.assertIsPositiveFiniteReal({
                                    obj: config,
                                    field: "count",
                                    baseErrorPath: errorPath2
                                });
                            } else {
                                tester.assertInBounds({
                                    obj: config,
                                    field: "min",
                                    min: 0,
                                    max: config.max,
                                    includeMin: true,
                                    includeMax: true,
                                    baseErrorPath: errorPath2
                                });

                                tester.assertInBounds({
                                    obj: config,
                                    field: "max",
                                    min: config.min,
                                    max: Infinity,
                                    includeMin: true,
                                    baseErrorPath: errorPath2
                                });
                            }

                            tester.assertNoPointlessValue({
                                obj: config,
                                field: "radius",
                                defaultValue: 0,
                                baseErrorPath: errorPath
                            });

                            if (config.radius) {
                                tester.assertIsPositiveReal({
                                    obj: config,
                                    field: "radius",
                                    baseErrorPath: errorPath2
                                });
                            }

                            tester.assertNoPointlessValue({
                                obj: config,
                                field: "squareRadius",
                                defaultValue: false,
                                baseErrorPath: errorPath
                            });

                            if (config.squareRadius) {
                                tester.assert(config.radius !== undefined, "squareRadius shouldn't be specified without radius", errorPath2);
                            }
                        });
                    }
                });
            }

            tester.assertNoPointlessValue({
                obj: definition,
                field: "loots",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                baseErrorPath: errorPath
            });

            if (definition.loots) {
                const errorPath2 = tester.createPath(errorPath, "loots");

                logger.indent("Validating loots", () => {
                    /* eslint-disable @typescript-eslint/no-non-null-assertion */
                    for (const [loot] of Object.entries(definition.loots!)) {
                        tester.assertReferenceExistsObject({
                            obj: { [loot]: loot },
                            field: loot,
                            baseErrorPath: errorPath2,
                            collection: LootTables,
                            collectionName: "LootTables"
                        });

                        tester.assertIsNaturalNumber({
                            obj: definition.loots!,
                            field: loot,
                            baseErrorPath: errorPath2
                        });
                    }
                });
            }

            tester.assertIsPositiveFiniteReal({
                obj: definition,
                field: "beachSize",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: definition,
                field: "oceanSize",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: definition,
                field: "places",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (definition.places) {
                logger.indent("Validating place names", () => {
                    tester.assertWarn(
                        definition.places!.length < 1 << 4,
                        `Only the first 16 place names are sent; this map provided ${definition.places!.length} names`,
                        errorPath
                    );

                    for (const place of definition.places!) {
                        validators.vector(errorPath, place.position);

                        tester.assertWarn(
                            place.name.length <= 24,
                            `Place names are limited to 24 characters long, and extra characters will not be sent; received a place name containing ${place.name.length} characters`,
                            errorPath
                        );
                    }
                });
            }
        });
    }
});

// suck it
// eslint-disable-next-line no-inner-declarations
function validateWearerAttributes(baseErrorPath: string, definition: ItemDefinition): void {
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
                            on.damageDealt!.forEach((e, i) =>
                                validateWearerAttributesInternal(
                                    tester.createPath(baseErrorPath, "wearer attributes", "on", "damageDealt", `entry ${i}`),
                                    e
                                )
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
                            on.kill!.forEach((e, i) =>
                                validateWearerAttributesInternal(
                                    tester.createPath(baseErrorPath, "wearer attributes", "on", "kill", `entry ${i}`),
                                    e
                                )
                            );
                        });
                    }
                });
            }
        });
    }
}

logger.indent("Validating ammo types", () => {
    tester.assertNoDuplicateIDStrings(Ammos, "Ammos", "ammos");

    for (const ammo of Ammos) {
        logger.indent(`Validating ammo '${ammo.idString}'`, () => {
            const errorPath = tester.createPath("ammos", `ammo ${ammo.idString}`);

            tester.assertNoPointlessValue({
                obj: ammo,
                field: "ephemeral",
                defaultValue: false,
                baseErrorPath: errorPath
            });
        });
    }
});

logger.indent("Validating armors", () => {
    tester.assertNoDuplicateIDStrings(Armors, "Armors", "armors");
});

logger.indent("Validating armor definitions", () => {
    function validateArmorDefinition(baseErrorPath: string, definition: ArmorDefinition): void {
        logger.indent(`Validating '${definition.idString}'`, () => {
            tester.assertIsNaturalNumber({
                obj: definition,
                field: "level",
                baseErrorPath
            });

            tester.assertInBounds({
                obj: definition,
                field: "damageReduction",
                min: 0,
                max: 1,
                includeMin: true,
                includeMax: true,
                baseErrorPath
            });

            validateWearerAttributes(baseErrorPath, definition);
        });
    }

    logger.indent("Validating helmet definitions", () => {
        const errorPath = tester.createPath("armors", "helmets");

        tester.assertNoDuplicateIDStrings(Helmets, "Helmets", errorPath);
        Helmets.forEach(validateArmorDefinition.bind(null, errorPath));
    });

    logger.indent("Validating vest definitions", () => {
        const errorPath = tester.createPath("armors", "vests");

        tester.assertNoDuplicateIDStrings(Vests, "Vests", errorPath);
        Vests.forEach(validateArmorDefinition.bind(null, errorPath));
    });
});

logger.indent("Validating backpack definitions", () => {
    tester.assertNoDuplicateIDStrings(Backpacks, "Backpacks", "backpacks");

    for (const backpack of Backpacks) {
        const errorPath = tester.createPath("backpacks", `backpack '${backpack.idString}'`);

        logger.indent(`Validating '${backpack.idString}'`, () => {
            tester.assertIsNaturalNumber({
                obj: backpack,
                field: "level",
                baseErrorPath: errorPath
            });

            validateWearerAttributes(errorPath, backpack);

            logger.indent("Validating maximum capacities", () => {
                const errorPath2 = tester.createPath(errorPath, "maximum capacities");

                for (const [item] of Object.entries(backpack.maxCapacity)) {
                    tester.assertReferenceExistsArray({
                        obj: { [item]: item },
                        field: item,
                        baseErrorPath: errorPath2,
                        collection: (HealingItems as ObjectDefinition[]).concat(Ammos),
                        collectionName: "HealingItems and Ammos"
                    });

                    tester.assertIsNaturalNumber({
                        obj: backpack.maxCapacity,
                        field: item,
                        baseErrorPath: errorPath2
                    });
                }
            });
        });
    }
});

logger.indent("Validating building definitions", () => {
    tester.assertNoDuplicateIDStrings(Buildings.definitions, "Buildings", "buildings");

    for (const building of Buildings.definitions) {
        logger.indent(`Validating '${building.idString}'`, () => {
            const errorPath = tester.createPath("buildings", `building '${building.idString}'`);

            validators.hitbox(errorPath, building.spawnHitbox);
            if (building.ceilingHitbox) validators.hitbox(errorPath, building.ceilingHitbox);
            if (building.scopeHitbox) validators.hitbox(errorPath, building.scopeHitbox);

            tester.assertNoPointlessValue({
                obj: building,
                field: "obstacles",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.obstacles?.length) {
                logger.indent("Validating custom obstacles", () => {
                    const errorPath2 = tester.createPath(errorPath, "custom obstacles");

                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                    for (const obstacle of building.obstacles!) {
                        for (const idString of (typeof obstacle.idString === "string" ? [obstacle.idString] : Object.keys(obstacle.idString))) {
                            logger.indent(`Validating '${idString}'`, () => {
                                tester.assertReferenceExists({
                                    obj: { idString },
                                    field: "idString",
                                    collection: Obstacles,
                                    baseErrorPath: errorPath2
                                });

                                validators.vector(errorPath2, obstacle.position);

                                if (obstacle.rotation) {
                                    const reference = Obstacles.fromString(idString);

                                    if (reference) {
                                        const rotationMode = reference.rotationMode;

                                        switch (rotationMode) {
                                            case RotationMode.Full: {
                                                tester.assertIsFiniteRealNumber({
                                                    obj: obstacle,
                                                    field: "rotation",
                                                    baseErrorPath: errorPath2
                                                });
                                                break;
                                            }
                                            case RotationMode.Limited: {
                                                tester.assertIntAndInBounds({
                                                    obj: obstacle,
                                                    field: "rotation",
                                                    baseErrorPath: errorPath2,
                                                    min: 0,
                                                    max: 3,
                                                    includeMin: true,
                                                    includeMax: true
                                                });
                                                break;
                                            }
                                            case RotationMode.Binary: {
                                                tester.assertIntAndInBounds({
                                                    obj: obstacle,
                                                    field: "rotation",
                                                    baseErrorPath: errorPath2,
                                                    min: 0,
                                                    max: 1,
                                                    includeMin: true,
                                                    includeMax: true
                                                });
                                                break;
                                            }
                                            case RotationMode.None: {
                                                tester.assertInBounds({
                                                    obj: obstacle,
                                                    field: "rotation",
                                                    baseErrorPath: errorPath2,
                                                    min: 0,
                                                    max: 0,
                                                    includeMin: true,
                                                    includeMax: true
                                                });
                                                break;
                                            }
                                        }
                                    }
                                }

                                tester.assertNoPointlessValue({
                                    obj: obstacle,
                                    field: "scale",
                                    defaultValue: 1,
                                    baseErrorPath: errorPath2
                                });

                                if (obstacle.scale) {
                                    tester.assertIsPositiveFiniteReal({
                                        obj: obstacle,
                                        field: "scale",
                                        baseErrorPath: errorPath2
                                    });
                                }

                                if (obstacle.variation !== undefined) {
                                    const def = Obstacles.fromString(idString);

                                    if (def) {
                                        if (def.variations === undefined) {
                                            tester.assert(
                                                false,
                                                `Cannot specify a variant of an obstacle that has no variations (Obstacle '${idString}' has no variations)`,
                                                errorPath2
                                            );
                                        } else {
                                            tester.assertIntAndInBounds({
                                                obj: obstacle,
                                                field: "variation",
                                                min: 0,
                                                max: def.variations - 1,
                                                baseErrorPath: errorPath2
                                            });
                                        }
                                    }
                                }

                                if (obstacle.lootSpawnOffset) {
                                    validators.vector(errorPath2, obstacle.lootSpawnOffset);
                                }
                            });
                        }
                    }
                });
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "lootSpawners",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.lootSpawners?.length) {
                logger.indent("Validating loot spawners", () => {
                    const errorPath2 = tester.createPath(errorPath, "loot spawners");

                    for (const spawner of building.lootSpawners!) {
                        validators.vector(errorPath2, spawner.position);

                        tester.assertReferenceExistsObject({
                            obj: spawner,
                            field: "table",
                            collection: LootTables,
                            collectionName: "LootTables",
                            baseErrorPath: errorPath2
                        });
                    }
                });
            }

            if (building.ceilingImages?.length) {
                const errorPath2 = tester.createPath(errorPath, "ceiling images");
                for (const image of building.ceilingImages) {
                    validators.vector(errorPath2, image.position);
                }
            }

            if (building.floorImages?.length) {
                const errorPath2 = tester.createPath(errorPath, "floor images");
                for (const image of building.floorImages) {
                    validators.vector(errorPath2, image.position);
                }
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "ceilingImages",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.ceilingImages?.length) {
                const errorPath2 = tester.createPath(errorPath, "ceiling images");
                for (const image of building.ceilingImages) {
                    validators.vector(errorPath2, image.position);
                }
            }

            if (building.wallsToDestroy !== undefined) {
                tester.assertIntAndInBounds({
                    obj: building,
                    field: "wallsToDestroy",
                    min: 1,
                    max: building.obstacles?.filter(o => Obstacles.definitions.find(ob => ob.idString === o.idString)?.role === ObstacleSpecialRoles.Wall).length ?? Infinity,
                    includeMin: true,
                    includeMax: true,
                    baseErrorPath: errorPath
                });
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "groundGraphics",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.groundGraphics?.length) {
                const errorPath2 = tester.createPath(errorPath, "ground graphics");
                for (const graphic of building.groundGraphics) {
                    validators.hitbox(errorPath2, graphic.hitbox);

                    tester.assertIntAndInBounds({
                        obj: graphic,
                        baseErrorPath: errorPath2,
                        field: "color",
                        max: 0xffffff,
                        min: 0,
                        includeMax: true,
                        includeMin: true
                    });
                }
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "floors",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.floors?.length) {
                const errorPath2 = tester.createPath(errorPath, "floors");

                for (const floor of building.floors) {
                    validators.hitbox(errorPath2, floor.hitbox);

                    tester.assertReferenceExistsObject({
                        obj: floor,
                        field: "type",
                        collection: FloorTypes,
                        baseErrorPath: errorPath2,
                        collectionName: "Floors"
                    });
                }
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "rotationMode",
                defaultValue: RotationMode.Limited,
                baseErrorPath: errorPath
            });
        });
    }
});

logger.indent("Validating decals", () => {
    tester.assertNoDuplicateIDStrings(Decals.definitions, "Decals", "decals");

    for (const decal of Decals.definitions) {
        logger.indent(`Validating decal '${decal.idString}'`, () => {
            const errorPath = tester.createPath("decals", `decal '${decal.idString}'`);

            tester.assertNoPointlessValue({
                obj: decal,
                field: "scale",
                defaultValue: 1,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: decal,
                field: "rotationMode",
                defaultValue: RotationMode.Limited,
                baseErrorPath: errorPath
            });

            if (decal.scale !== undefined) {
                tester.assertIsFiniteRealNumber({
                    obj: decal,
                    field: "scale",
                    baseErrorPath: errorPath
                });
            }

            if (decal.zIndex !== undefined) {
                tester.assertIsFiniteRealNumber({
                    obj: decal,
                    field: "zIndex",
                    baseErrorPath: errorPath
                });
            }
        });
    }
});

logger.indent("Validating emotes", () => {
    tester.assertNoDuplicateIDStrings(Emotes.definitions, "Emotes", "emotes");
});

logger.indent("Validating explosions", () => {
    tester.assertNoDuplicateIDStrings(Explosions.definitions, "Explosions", "explosions");

    for (const explosion of Explosions.definitions) {
        const errorPath = tester.createPath("explosions", `explosion '${explosion.idString}'`);

        logger.indent(`Validating explosion '${explosion.idString}'`, () => {
            tester.assertIsRealNumber({
                obj: explosion,
                field: "damage",
                baseErrorPath: errorPath
            });

            tester.assertIsRealNumber({
                obj: explosion,
                field: "obstacleMultiplier",
                baseErrorPath: errorPath
            });

            logger.indent("Validating radii", () => {
                const errorPath2 = tester.createPath(errorPath, "radii");

                tester.assertInBounds({
                    obj: explosion.radius,
                    field: "min",
                    min: 0,
                    max: explosion.radius.max,
                    includeMax: true,
                    baseErrorPath: errorPath2
                });

                tester.assertInBounds({
                    obj: explosion.radius,
                    field: "max",
                    min: explosion.radius.min,
                    max: Infinity,
                    includeMin: true,
                    baseErrorPath: errorPath2
                });
            });

            logger.indent("Validating camera shake", () => {
                const errorPath2 = tester.createPath(errorPath, "camera shake");

                tester.assertIsPositiveReal({
                    obj: explosion.cameraShake,
                    field: "duration",
                    baseErrorPath: errorPath2
                });

                tester.assertIsPositiveFiniteReal({
                    obj: explosion.cameraShake,
                    field: "intensity",
                    baseErrorPath: errorPath2
                });
            });

            logger.indent("Validating animation", () => {
                const errorPath2 = tester.createPath(errorPath, "animation");

                tester.assertIsPositiveReal({
                    obj: explosion.animation,
                    field: "duration",
                    baseErrorPath: errorPath2
                });

                tester.assertIsFiniteRealNumber({
                    obj: explosion.animation,
                    field: "scale",
                    baseErrorPath: errorPath2
                });
            });

            logger.indent("Validating ballistics", () => {
                const errorPath2 = tester.createPath(errorPath, "ballistics");
                validators.ballistics(errorPath2, explosion.ballistics);
            });

            tester.assertIsNaturalFiniteNumber({
                obj: explosion,
                field: "shrapnelCount",
                baseErrorPath: errorPath
            });

            if (explosion.decal !== undefined) {
                tester.assertReferenceExists({
                    obj: explosion,
                    field: "decal",
                    collection: Decals,
                    baseErrorPath: errorPath
                });
            }
        });
    }
});

logger.indent("Validating guns", () => {
    tester.assertNoDuplicateIDStrings(Guns, "Guns", "guns");

    for (const gun of Guns) {
        const errorPath = tester.createPath("guns", `gun '${gun.idString}'`);

        logger.indent(`Validating gun '${gun.idString}'`, () => {
            tester.assertNoPointlessValue({
                obj: gun,
                field: "noDrop",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertReferenceExistsArray({
                obj: gun,
                field: "ammoType",
                collection: Ammos,
                collectionName: "Ammos",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: gun,
                field: "ammoSpawnAmount",
                defaultValue: 0,
                baseErrorPath: errorPath
            });

            if (gun.ammoSpawnAmount !== undefined) {
                tester.assertIsNaturalFiniteNumber({
                    obj: gun,
                    field: "ammoSpawnAmount",
                    baseErrorPath: errorPath
                });
            }

            tester.assertIsNaturalFiniteNumber({
                obj: gun,
                field: "capacity",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: gun,
                field: "reloadTime",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: gun,
                field: "singleReload",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: gun,
                field: "infiniteAmmo",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: gun,
                field: "fireDelay",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: gun,
                field: "switchDelay",
                baseErrorPath: errorPath
            });

            tester.assertIsFiniteRealNumber({
                obj: gun,
                field: "speedMultiplier",
                baseErrorPath: errorPath
            });

            tester.assertIsFiniteRealNumber({
                obj: gun,
                field: "recoilMultiplier",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: gun,
                field: "recoilDuration",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveReal({
                obj: gun,
                field: "shotSpread",
                baseErrorPath: errorPath
            });

            tester.assertIsRealNumber({
                obj: gun,
                field: "moveSpread",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: gun,
                field: "jitterRadius",
                defaultValue: 0,
                baseErrorPath: errorPath
            });

            if (gun.jitterRadius !== undefined) {
                tester.assertIsPositiveReal({
                    obj: gun,
                    field: "jitterRadius",
                    baseErrorPath: errorPath
                });
            }

            tester.assertNoPointlessValue({
                obj: gun,
                field: "consistentPatterning",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: gun,
                field: "noQuickswitch",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: gun,
                field: "bulletCount",
                defaultValue: 1,
                baseErrorPath: errorPath
            });

            if (gun.bulletCount) {
                tester.assertIsPositiveFiniteReal({
                    obj: gun,
                    field: "bulletCount",
                    baseErrorPath: errorPath
                });
            }

            tester.assertIsPositiveFiniteReal({
                obj: gun,
                field: "length",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: gun,
                field: "killstreak",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: gun,
                field: "shootOnRelease",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            logger.indent("Validating fists", () => {
                const errorPath2 = tester.createPath(errorPath, "fists");

                validators.vector(errorPath2, gun.fists.left);
                validators.vector(errorPath2, gun.fists.right);

                tester.assertIsPositiveReal({
                    obj: gun.fists,
                    field: "animationDuration",
                    baseErrorPath: errorPath2
                });
            });

            logger.indent("Validating image", () => {
                const errorPath2 = tester.createPath(errorPath, "image");

                validators.vector(errorPath2, gun.image.position);

                tester.assertNoPointlessValue({
                    obj: gun.image,
                    field: "angle",
                    defaultValue: 0,
                    baseErrorPath: errorPath
                });

                if (gun.image.angle !== undefined) {
                    tester.assertIsRealNumber({
                        obj: gun.image,
                        field: "angle",
                        baseErrorPath: errorPath2
                    });
                }
            });

            if (gun.casingParticles !== undefined) {
                const casings = gun.casingParticles;
                logger.indent("Validating casings", () => {
                    const errorPath2 = tester.createPath(errorPath, "casings");
                    validators.vector(errorPath2, casings.position);

                    tester.assertNoPointlessValue({
                        obj: casings,
                        field: "count",
                        defaultValue: 1,
                        baseErrorPath: errorPath
                    });

                    if (casings.count !== undefined) {
                        tester.assertIsPositiveFiniteReal({
                            obj: casings,
                            field: "count",
                            baseErrorPath: errorPath
                        });
                    }

                    tester.assertNoPointlessValue({
                        obj: casings,
                        field: "spawnOnReload",
                        defaultValue: false,
                        baseErrorPath: errorPath
                    });

                    tester.assertNoPointlessValue({
                        obj: casings,
                        field: "ejectionDelay",
                        defaultValue: 0,
                        baseErrorPath: errorPath
                    });

                    if (casings.ejectionDelay !== undefined) {
                        tester.assertIsPositiveFiniteReal({
                            obj: casings,
                            field: "ejectionDelay",
                            baseErrorPath: errorPath
                        });
                    }
                });
            }

            tester.assertNoPointlessValue({
                obj: gun,
                field: "noMuzzleFlash",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            logger.indent("Validating ballistics", () => {
                validators.ballistics(
                    tester.createPath(errorPath, "ballistics"),
                    gun.ballistics
                );
            });

            if (gun.fireMode === FireMode.Burst) {
                logger.indent("Validating burst properties", () => {
                    const errorPath2 = tester.createPath(errorPath, "burst properties");

                    tester.assertIsNaturalFiniteNumber({
                        obj: gun.burstProperties,
                        field: "shotsPerBurst",
                        baseErrorPath: errorPath2
                    });

                    tester.assertIsPositiveReal({
                        obj: gun.burstProperties,
                        field: "burstCooldown",
                        baseErrorPath: errorPath2
                    });
                });
            }

            validateWearerAttributes(errorPath, gun);
        });
    }
});

logger.indent("Validating healing items", () => {
    tester.assertNoDuplicateIDStrings(HealingItems, "HealingItems", "healing items");

    for (const healingItem of HealingItems) {
        const errorPath = tester.createPath("healing items", `healing item '${healingItem.idString}'`);

        logger.indent(`Validating healingItem '${healingItem.idString}'`, () => {
            tester.assertIsRealNumber({
                obj: healingItem,
                field: "restoreAmount",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: healingItem,
                field: "useTime",
                baseErrorPath: errorPath
            });
        });
    }
});

logger.indent("Validating loots", () => {
    tester.assertNoDuplicateIDStrings(Loots.definitions, "Loots", "loots");
});

logger.indent("Validating melees", () => {
    tester.assertNoDuplicateIDStrings(Melees, "Melees", "melees");

    for (const melee of Melees) {
        const errorPath = tester.createPath("melees", `melee '${melee.idString}'`);

        logger.indent(`Validating melee '${melee.idString}'`, () => {
            tester.assertNoPointlessValue({
                obj: melee,
                field: "noDrop",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertIsRealNumber({
                obj: melee,
                field: "damage",
                baseErrorPath: errorPath
            });

            tester.assertIsRealNumber({
                obj: melee,
                field: "obstacleMultiplier",
                baseErrorPath: errorPath
            });

            if (melee.piercingMultiplier !== undefined) {
                tester.assertIsRealNumber({
                    obj: melee,
                    field: "piercingMultiplier",
                    baseErrorPath: errorPath
                });
            }

            tester.assertIsPositiveReal({
                obj: melee,
                field: "radius",
                baseErrorPath: errorPath
            });

            validators.vector(errorPath, melee.offset);

            tester.assertIsPositiveReal({
                obj: melee,
                field: "cooldown",
                baseErrorPath: errorPath
            });

            tester.assertIsFiniteRealNumber({
                obj: melee,
                field: "speedMultiplier",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: melee,
                field: "killstreak",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertIsNaturalNumber({
                obj: melee,
                field: "maxTargets",
                baseErrorPath: errorPath
            });

            logger.indent("Validating fists", () => {
                const errorPath2 = tester.createPath(errorPath, "fists");
                const fists = melee.fists;

                validators.vector(errorPath2, fists.left);
                validators.vector(errorPath2, fists.right);

                validators.vector(errorPath2, fists.useLeft);
                validators.vector(errorPath2, fists.useRight);

                tester.assertIsPositiveReal({
                    obj: fists,
                    field: "animationDuration",
                    baseErrorPath: errorPath2
                });
            });

            if (melee.image) {
                logger.indent("Validating image", () => {
                    const errorPath2 = tester.createPath(errorPath, "image");
                    const image = melee.image!;

                    validators.vector(errorPath2, image.position);
                    validators.vector(errorPath2, image.usePosition);

                    tester.assertNoPointlessValue({
                        obj: image,
                        field: "angle",
                        defaultValue: 0,
                        baseErrorPath: errorPath
                    });

                    if (image.angle) {
                        tester.assertIsFiniteRealNumber({
                            obj: image,
                            field: "angle",
                            baseErrorPath: errorPath2
                        });
                    }

                    if (image.useAngle) {
                        tester.assertIsFiniteRealNumber({
                            obj: image,
                            field: "useAngle",
                            baseErrorPath: errorPath2
                        });
                    }

                    tester.assertNoPointlessValue({
                        obj: image,
                        field: "lootScale",
                        defaultValue: 1,
                        baseErrorPath: errorPath
                    });

                    if (image.lootScale) {
                        tester.assertIsFiniteRealNumber({
                            obj: image,
                            field: "lootScale",
                            baseErrorPath: errorPath2
                        });
                    }
                });
            }

            validateWearerAttributes(errorPath, melee);
        });
    }
});

logger.indent("Validating obstacles", () => {
    tester.assertNoDuplicateIDStrings(Obstacles.definitions, "Obstacles", "obstacles");

    for (const obstacle of Obstacles.definitions) {
        const errorPath = tester.createPath("obstacles", `obstacle '${obstacle.idString}'`);

        logger.indent(`Validating obstacle '${obstacle.idString}'`, () => {
            tester.assertIsPositiveReal({
                obj: obstacle,
                field: "health",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "indestructible",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "impenetrable",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "noResidue",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "invisible",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "hideOnMap",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            logger.indent("Validating scaling", () => {
                const errorPath2 = tester.createPath(errorPath, "scaling");

                tester.assertInBounds({
                    obj: obstacle.scale,
                    field: "spawnMin",
                    min: -Infinity,
                    max: obstacle.scale.spawnMax,
                    includeMax: true,
                    baseErrorPath: errorPath2
                });

                tester.assertInBounds({
                    obj: obstacle.scale,
                    field: "spawnMax",
                    min: obstacle.scale.spawnMin,
                    max: Infinity,
                    includeMin: true,
                    baseErrorPath: errorPath2
                });

                tester.assertIsFiniteRealNumber({
                    obj: obstacle.scale,
                    field: "destroy",
                    baseErrorPath: errorPath2
                });
            });

            validators.hitbox(errorPath, obstacle.hitbox);

            if (obstacle.spawnHitbox) {
                validators.hitbox(errorPath, obstacle.spawnHitbox);
            }

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "noCollisions",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            if (obstacle.variations) {
                tester.assertIntAndInBounds({
                    obj: obstacle,
                    field: "variations",
                    min: 0,
                    max: 8,
                    includeMin: true,
                    baseErrorPath: errorPath
                });
            }

            if (obstacle.particleVariations) {
                tester.assertIntAndInBounds({
                    obj: obstacle,
                    field: "particleVariations",
                    min: 0,
                    max: 8,
                    includeMin: true,
                    baseErrorPath: errorPath
                });
            }

            if (obstacle.zIndex) {
                tester.assertIsFiniteRealNumber({
                    obj: obstacle,
                    field: "zIndex",
                    baseErrorPath: errorPath
                });
            }

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "hasLoot",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "spawnWithLoot",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            if (obstacle.hasLoot === true || obstacle.spawnWithLoot === true) {
                tester.assertReferenceExistsObject({
                    obj: obstacle,
                    field: "idString",
                    collection: LootTables,
                    collectionName: "LootTables",
                    baseErrorPath: errorPath
                });
            }

            if (obstacle.explosion !== undefined) {
                tester.assertReferenceExists({
                    obj: obstacle,
                    field: "explosion",
                    collection: Explosions,
                    baseErrorPath: errorPath
                });
            }

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "noMeleeCollision",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "reflectBullets",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertWarn(
                obstacle.noResidue !== true || obstacle.frames?.residue === undefined,
                `Obstacle '${obstacle.idString}' specified a residue image, but also specified the 'noResidue' attribute.`,
                errorPath
            );

            tester.assertWarn(
                obstacle.invisible !== true || obstacle.frames?.base === undefined,
                `Obstacle '${obstacle.idString}' specified a base image, but also specified the 'invisible' attribute.`,
                errorPath
            );

            tester.assertNoPointlessValue({
                obj: obstacle,
                field: "frames",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                baseErrorPath: errorPath
            });

            if (obstacle.role !== undefined) {
                tester.assert(
                    obstacle.rotationMode !== RotationMode.Full,
                    `An obstacle whose role is '${ObstacleSpecialRoles[obstacle.role]}' cannot specify a rotation mode of 'Full'`,
                    errorPath
                );

                if (obstacle.role === ObstacleSpecialRoles.Door && obstacle.operationStyle !== "slide") {
                    validators.vector(errorPath, obstacle.hingeOffset);
                }
            }
        });
    }
});

logger.indent("Validating scopes", () => {
    tester.assertNoDuplicateIDStrings(Scopes, "Scopes", "scopes");

    for (const scope of Scopes) {
        const errorPath = tester.createPath("scopes", `scope '${scope.idString}'`);

        logger.indent(`Validating scope '${scope.idString}'`, () => {
            tester.assertIsPositiveFiniteReal({
                obj: scope,
                field: "zoomLevel",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: scope,
                field: "noDrop",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: scope,
                field: "giveByDefault",
                defaultValue: false,
                baseErrorPath: errorPath
            });
        });
    }
});

logger.indent("Validating skins", () => {
    tester.assertNoDuplicateIDStrings(Skins, "Skins", "skins");

    for (const skin of Skins) {
        logger.indent(`Validating skin '${skin.idString}'`, () => {
            const errorPath = tester.createPath("skins", `skin '${skin.idString}'`);

            tester.assertNoPointlessValue({
                obj: skin,
                field: "noDrop",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: skin,
                field: "notInLoadout",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            if (skin.roleRequired !== undefined) {
                tester.assertReferenceExistsObject({
                    obj: skin,
                    field: "roleRequired",
                    collection: Config.roles,
                    collectionName: "roles",
                    baseErrorPath: errorPath
                });
            }
        });
    }
});

logger.indent("Validating configurations", () => {
    logger.indent("Validating server config", () => {
        const errorPath = tester.createPath("configs", "server config");

        if (ServerConfig.spawn.mode === SpawnMode.Radius) {
            tester.assertIsFiniteRealNumber({
                obj: ServerConfig.spawn,
                field: "radius",
                baseErrorPath: errorPath
            });
        }

        if (ServerConfig.gas.mode === GasMode.Debug) {
            tester.assertIsPositiveReal({
                obj: ServerConfig.gas,
                field: "overrideDuration",
                baseErrorPath: errorPath
            });
        }

        tester.assertReferenceExistsObject({
            obj: ServerConfig,
            field: "mapName",
            collection: Maps,
            collectionName: "maps",
            baseErrorPath: errorPath
        });

        tester.assertIsNaturalNumber({
            obj: ServerConfig,
            field: "maxPlayersPerGame",
            baseErrorPath: errorPath
        });

        tester.assertIsNaturalNumber({
            obj: ServerConfig,
            field: "maxGames",
            baseErrorPath: errorPath
        });

        tester.assertIsPositiveFiniteReal({
            obj: ServerConfig,
            field: "movementSpeed",
            baseErrorPath: errorPath
        });

        if (ServerConfig.protection) {
            logger.indent("Validating protection settings", () => {
                const protection = ServerConfig.protection!;
                const errorPath2 = tester.createPath(errorPath, "protection settings");

                tester.assertIsNaturalFiniteNumber({
                    obj: protection,
                    field: "maxSimultaneousConnections",
                    baseErrorPath: errorPath2
                });

                if (protection.maxJoinAttempts) {
                    tester.assertIsNaturalFiniteNumber({
                        obj: protection.maxJoinAttempts,
                        field: "count",
                        baseErrorPath: errorPath2
                    });

                    tester.assertIsPositiveFiniteReal({
                        obj: protection.maxJoinAttempts,
                        field: "duration",
                        baseErrorPath: errorPath2
                    });
                }

                tester.assertIsPositiveReal({
                    obj: protection,
                    field: "refreshDuration",
                    baseErrorPath: errorPath2
                });
            });
        }

        tester.assertNoPointlessValue({
            obj: ServerConfig,
            field: "disableLobbyClearing",
            defaultValue: false,
            baseErrorPath: errorPath
        });
    });

    logger.indent("Validating client config", () => {
        const errorPath = tester.createPath("configs", "client config");

        tester.assertReferenceExistsObject({
            obj: ClientConfig,
            field: "defaultRegion",
            collection: ClientConfig.regions,
            collectionName: "regions",
            baseErrorPath: errorPath
        });
    });
});

logger.print();

const { errors, warnings } = tester;
const exitCode = +(errors.length > 0);
const errorText = errors.length
    ? styleText(`${errors.length} error${errors.length === 1 ? "" : "s"}`, ColorStyles.foreground.red.bright, FontStyles.bold, FontStyles.underline)
    : styleText("no errors", ColorStyles.foreground.green.bright, FontStyles.bold, FontStyles.underline);
const warningText = warnings.length
    ? styleText(`${warnings.length} warning${warnings.length === 1 ? "" : "s"}`, ColorStyles.foreground.yellow.bright, FontStyles.underline)
    : styleText("no warnings", ColorStyles.foreground.green.bright, FontStyles.bold, FontStyles.underline);

console.log(`Validation finished with ${errorText} and ${warningText}.`);

errors.forEach(([path, message]) => {
    console.log(`${styleText(path, ColorStyles.foreground.red.normal, FontStyles.italic)}: ${styleText(message, FontStyles.bold)}`);
});

warnings.forEach(([path, message]) => {
    console.log(`${styleText(path, ColorStyles.foreground.yellow.normal)}: ${styleText(message, FontStyles.italic)}`);
});

const totalRuntime = Date.now() - absStart;
const testRuntime = Date.now() - testStart;
console.log(`Validation took ${totalRuntime}ms (${totalRuntime - testRuntime}ms for setup; ${testRuntime}ms for validation)`);
process.exit(exitCode);
