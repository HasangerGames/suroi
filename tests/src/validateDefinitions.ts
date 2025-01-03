import { HitboxType, RectangleHitbox } from "@common/utils/hitbox";
import { Config as ClientConfig } from "../../client/src/scripts/config";
import { FireMode, GameConstants, Layers } from "../../common/src/constants";
import { Ammos } from "../../common/src/definitions/ammos";
import { Armors, ArmorType } from "../../common/src/definitions/armors";
import { Backpacks } from "../../common/src/definitions/backpacks";
import { Badges } from "../../common/src/definitions/badges";
import { Buildings } from "../../common/src/definitions/buildings";
import { Bullets } from "../../common/src/definitions/bullets";
import { Decals } from "../../common/src/definitions/decals";
import { Emotes } from "../../common/src/definitions/emotes";
import { Explosions } from "../../common/src/definitions/explosions";
import { Guns, type DualGunNarrowing, type SingleGunNarrowing } from "../../common/src/definitions/guns";
import { HealingItems } from "../../common/src/definitions/healingItems";
import { Loots } from "../../common/src/definitions/loots";
import { MapPings } from "../../common/src/definitions/mapPings";
import { Melees } from "../../common/src/definitions/melees";
import { Modes } from "../../common/src/definitions/modes";
import { Obstacles, RotationMode } from "../../common/src/definitions/obstacles";
import { DEFAULT_SCOPE, Scopes } from "../../common/src/definitions/scopes";
import { Skins } from "../../common/src/definitions/skins";
import { SyncedParticles } from "../../common/src/definitions/syncedParticles";
import { Throwables, type ThrowableDefinition } from "../../common/src/definitions/throwables";
import { ColorStyles, FontStyles, styleText } from "../../common/src/utils/ansiColoring";
import { NullString, ObstacleSpecialRoles, type ItemDefinition } from "../../common/src/utils/objectDefinitions";
import { FloorTypes } from "../../common/src/utils/terrain";
import { Vec, type Vector } from "../../common/src/utils/vector";
import { Config, GasMode, Config as ServerConfig, SpawnMode } from "../../server/src/config";
import { GasStages } from "../../server/src/data/gasStages";
import { LootTables, type FullLootTable, type SimpleLootTable, type WeightedItem } from "../../server/src/data/lootTables";
import { Maps, type MapName } from "../../server/src/data/maps";
import { findDupes, logger, safeString, tester, validators } from "./validationUtils";

const testStart = Date.now();

logger.log("START");
logger.indent("Validating gas stages", () => {
    tester.runTestOnArray(
        GasStages,
        (stage, errorPath) => {
            tester.assertIsPositiveReal({
                obj: stage,
                field: "duration",
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

            tester.assertIsRealNumber({
                obj: stage,
                field: "dps",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: stage,
                field: "summonAirdrop",
                defaultValue: false,
                baseErrorPath: errorPath
            });
        },
        "gas stages"
    );
});

logger.indent("Validating loot tables", () => {
    const normalTable = LootTables.normal;

    tester.assert(
        normalTable !== undefined,
        "Normal mode loot table missing",
        tester.createPath("loot tables")
    );

    for (const [mode, entries] of Object.entries(LootTables)) {
        logger.indent(`Validating mode '${mode}'`, () => {
            const errorPath = tester.createPath("loot tables", `mode '${mode}'`);

            for (const [name, lootData] of Object.entries(entries)) {
                const errorPath2 = tester.createPath(errorPath, `table '${name}'`);

                if (mode !== "normal") {
                    tester.assert(
                        name in normalTable,
                        `Table '${name}' does not override any existing normal mode table`,
                        errorPath2
                    );
                }

                logger.indent(`Validating table '${name}'`, () => {
                    const isSimple = Array.isArray(lootData);
                    if (!isSimple) {
                        logger.indent("Validating min/max", () => {
                            validators.numericInterval(
                                errorPath2,
                                lootData as FullLootTable,
                                {
                                    globalMin: { value: 0, include: true },
                                    globalMax: { value: Infinity, include: true },
                                    allowDegenerateIntervals: true
                                }
                            );
                        });
                    }

                    logger.indent("Validating drop declaration", () => {
                        const errorPath3 = tester.createPath(errorPath2, "drop declaration");

                        tester.runTestOnArray(
                            isSimple
                                ? (lootData as SimpleLootTable).flat()
                                : (lootData as FullLootTable).loot,
                            (entry, errorPath) => {
                                if (Array.isArray(entry)) {
                                    tester.runTestOnArray(
                                        entry as readonly WeightedItem[],
                                        (loot, errorPath) => {
                                            validators.weightedItem(errorPath, loot);
                                        },
                                        errorPath
                                    );
                                } else {
                                    validators.weightedItem(errorPath, entry);
                                }
                            },
                            errorPath3
                        );
                    });
                });
            }
        });
    }
});

logger.indent("Validating map definitions", () => {
    for (const [name, definition] of Object.entries(Maps)) {
        logger.indent(`Validating map '${name}'`, () => {
            const errorPath = tester.createPath("maps", `map '${name}'`);

            const dimLimit = 2 ** 16 - 1;
            //                    ^^ mapPacket uses 16 bits for dimensions

            tester.assertIntAndInBounds({
                obj: definition,
                field: "width",
                min: 0,
                max: dimLimit,
                includeMin: true,
                baseErrorPath: errorPath
            });

            tester.assertIntAndInBounds({
                obj: definition,
                field: "height",
                min: 0,
                max: dimLimit,
                includeMin: true,
                baseErrorPath: errorPath
            });

            tester.assertIntAndInBounds({
                obj: definition,
                field: "oceanSize",
                min: 0,
                max: dimLimit,
                includeMin: true,
                baseErrorPath: errorPath
            });

            tester.assertIntAndInBounds({
                obj: definition,
                field: "beachSize",
                min: 0,
                max: dimLimit,
                includeMin: true,
                baseErrorPath: errorPath
            });

            const rivers = definition.rivers;
            if (rivers !== undefined) {
                logger.indent(
                    "Validating rivers",
                    () => {
                        const errorPath2 = tester.createPath(errorPath, "river");

                        const maxRivers = 2 ** 4 - 1;
                        //                     ^ mapPacket uses 4 bits for river count

                        validators.minMax(
                            errorPath2,
                            {
                                min: rivers.minAmount,
                                max: rivers.maxAmount
                            },
                            (errorPath, amount) => {
                                tester.assertIntAndInBounds({
                                    value: amount,
                                    min: 0,
                                    max: maxRivers,
                                    includeMin: true,
                                    errorPath
                                });
                            }
                        );

                        tester.assertInBounds({
                            obj: rivers,
                            field: "wideChance",
                            min: 0,
                            max: 1,
                            includeMin: true,
                            includeMax: true,
                            baseErrorPath: errorPath2
                        });

                        const maxRiverWidth = 2 ** 8 - 1;
                        //                         ^ mapPacket uses 8 bits for river width

                        validators.minMax(
                            errorPath2,
                            {
                                min: rivers.minWidth,
                                max: rivers.maxWidth
                            },
                            (errorPath, amount) => {
                                tester.assertIntAndInBounds({
                                    value: amount,
                                    min: 0,
                                    max: maxRiverWidth,
                                    errorPath
                                });
                            }
                        );

                        validators.minMax(
                            errorPath2,
                            {
                                min: rivers.minWideWidth,
                                max: rivers.maxWideWidth
                            },
                            (errorPath, amount) => {
                                tester.assertIntAndInBounds({
                                    value: amount,
                                    min: 0,
                                    max: maxRiverWidth,
                                    errorPath
                                });
                            }
                        );
                    }
                );
            }

            tester.assertValidOrNPV({
                obj: definition,
                field: "bridges",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                validatorIfPresent: bridges => {
                    const errorPath2 = tester.createPath(errorPath, "bridges");

                    logger.indent("Validating bridges", () => {
                        // this field is never actually used so lol
                        tester.assertWarn(
                            true,
                            "Field 'bridges' of MapDefinitions is currently unused by map generation code",
                            errorPath2
                        );

                        tester.runTestOnArray(bridges, (bridge, errorPath) => {
                            tester.assertReferenceExists({
                                value: bridge,
                                collection: Buildings,
                                collectionName: "Buildings",
                                errorPath
                            });

                            const def = Buildings.fromStringSafe(bridge);
                            if (def) {
                                tester.assert(
                                    def.bridgeHitbox !== undefined,
                                    `Map '${name}' specified building '${def.idString}' in its bridges, but said building is not a bridge`,
                                    errorPath2
                                );
                            }
                        }, errorPath2);
                    });
                },
                baseErrorPath: errorPath
            });

            tester.assertValidOrNPV({
                obj: definition,
                field: "majorBuildings",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                validatorIfPresent: majorBuildings => {
                    const errorPath2 = tester.createPath(errorPath, "majorBuildings");

                    logger.indent("Validating major buildings", () => {
                        tester.runTestOnArray(majorBuildings, (majorBuilding, errorPath) => {
                            tester.assertReferenceExists({
                                value: majorBuilding,
                                collection: Buildings,
                                collectionName: "Buildings",
                                errorPath
                            });
                        }, errorPath2);
                    });
                },
                baseErrorPath: errorPath
            });

            tester.assertValidOrNPV({
                obj: definition,
                field: "buildings",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                validatorIfPresent: buildings => {
                    const errorPath2 = tester.createPath(errorPath, "buildings");

                    logger.indent("Validating buildings", () => {
                        for (const [building] of Object.entries(buildings)) {
                            tester.assertReferenceExists({
                                value: building,
                                collection: Buildings,
                                collectionName: "Buildings",
                                errorPath: errorPath2
                            });

                            (
                                (
                                    (
                                        Buildings.fromStringSafe(building) ?? { bridgeHitbox: null }
                                    )?.bridgeHitbox === undefined
                                        ? tester.assertIsNaturalFiniteNumber
                                        : tester.assertIsNaturalNumber
                                ) as (params: {
                                    readonly obj: object
                                    readonly field: string
                                    readonly baseErrorPath: string
                                } | {
                                    readonly value: number
                                    readonly errorPath: string
                                }) => void
                            ).call(
                                tester,
                                {
                                    obj: buildings,
                                    field: building,
                                    baseErrorPath: errorPath2
                                }
                            );
                        }
                    });
                },
                baseErrorPath: errorPath
            });

            tester.assertValidOrNPV({
                obj: definition,
                field: "quadBuildingLimit",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                validatorIfPresent: limits => {
                    const errorPath2 = tester.createPath(errorPath, "quad building limit");

                    logger.indent("Validating quadrant building limits", () => {
                        for (const [building, limit] of Object.entries(limits)) {
                            const errorPath3 = tester.createPath(errorPath2, `building '${building}'`);

                            tester.assertReferenceExists({
                                value: building,
                                collection: Buildings,
                                collectionName: "Buildings",
                                errorPath: errorPath3
                            });

                            tester.assertIsNaturalNumber({
                                value: limit,
                                errorPath: errorPath3
                            });
                        }
                    });
                },
                baseErrorPath: errorPath
            });

            tester.assertValidOrNPV({
                obj: definition,
                field: "obstacles",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                validatorIfPresent: obstacles => {
                    const errorPath2 = tester.createPath(errorPath, "obstacles");

                    logger.indent("Validating obstacles", () => {
                        for (const [obstacle] of Object.entries(obstacles)) {
                            tester.assertReferenceExists({
                                value: obstacle,
                                collection: Obstacles,
                                collectionName: "Obstacles",
                                errorPath: errorPath2
                            });

                            tester.assertIsNaturalFiniteNumber({
                                obj: obstacles,
                                field: obstacle,
                                baseErrorPath: errorPath2
                            });
                        }
                    });
                },
                baseErrorPath: errorPath
            });

            tester.assertValidOrNPV({
                obj: definition,
                field: "obstacleClumps",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                validatorIfPresent: clumps => {
                    const errorPath2 = tester.createPath(errorPath, "clumps");

                    logger.indent("Validating obstacle clumps", () => {
                        tester.runTestOnArray(clumps, (clump, errorPath) => {
                            tester.assertIsNaturalFiniteNumber({
                                obj: clump,
                                field: "clumpAmount",
                                baseErrorPath: errorPath
                            });

                            const actualClumpDataWhyIsThisEvenWrapped = clump.clump;

                            tester.assertValidOrNPV({
                                obj: actualClumpDataWhyIsThisEvenWrapped,
                                field: "obstacles",
                                defaultValue: [],
                                equalityFunction: a => a.length === 0,
                                validatorIfPresent: obstacles => {
                                    const errorPath2 = tester.createPath(errorPath, "obstacles");

                                    logger.indent("Validating clump obstacles", () => {
                                        tester.runTestOnArray(obstacles, (obstacle, errorPath) => {
                                            tester.assertReferenceExists({
                                                value: obstacle,
                                                collection: Obstacles,
                                                collectionName: "Obstacles",
                                                errorPath
                                            });
                                        }, errorPath2);
                                    });
                                },
                                baseErrorPath: errorPath
                            });

                            validators.minMax(
                                errorPath,
                                {
                                    min: actualClumpDataWhyIsThisEvenWrapped.minAmount,
                                    max: actualClumpDataWhyIsThisEvenWrapped.maxAmount
                                },
                                (errorPath, value) => {
                                    tester.assertIsNaturalFiniteNumber({
                                        value,
                                        errorPath
                                    });
                                }
                            );

                            tester.assertIsPositiveFiniteReal({
                                obj: actualClumpDataWhyIsThisEvenWrapped,
                                field: "radius",
                                baseErrorPath: errorPath
                            });

                            tester.assertIsPositiveFiniteReal({
                                obj: actualClumpDataWhyIsThisEvenWrapped,
                                field: "jitter",
                                baseErrorPath: errorPath
                            });
                        }, errorPath2);
                    });
                },
                baseErrorPath: errorPath
            });

            tester.assertValidOrNPV({
                obj: definition,
                field: "loots",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                validatorIfPresent: loots => {
                    const errorPath2 = tester.createPath(errorPath, "loots");

                    logger.indent("Validating loots", () => {
                        for (const [loot] of Object.entries(loots)) {
                            tester.assertReferenceExistsObject({
                                value: loot,
                                errorPath: errorPath2,
                                collection: LootTables.normal,
                                collectionName: "LootTables"
                            });

                            tester.assertIsNaturalFiniteNumber({
                                obj: loots,
                                field: loot,
                                baseErrorPath: errorPath2
                            });
                        }
                    });
                },
                baseErrorPath: errorPath
            });

            tester.assertValidOrNPV({
                obj: definition,
                field: "places",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                validatorIfPresent: places => {
                    logger.indent("Validating place names", () => {
                        const errorPath2 = tester.createPath(errorPath, "placeNames");

                        tester.assertWarn(
                            places.length >= 1 << 4,
                            `Only the first 16 place names are sent; this map provided ${places.length} names`,
                            errorPath2
                        );

                        tester.runTestOnArray(
                            places,
                            (place, errorPath) => {
                                validators.vector(tester.createPath(errorPath, "position"), place.position);

                                tester.assertWarn(
                                    place.name.length > 24,
                                    `Place names are limited to 24 characters long, and extra characters will not be sent; received a place name containing ${place.name.length} characters`,
                                    errorPath
                                );
                            },
                            errorPath2
                        );
                    });
                },
                baseErrorPath: errorPath
            });
        });
    }
});

logger.indent("Validating ammo types", () => {
    tester.assertNoDuplicateIDStrings(Ammos.definitions, "Ammos", "ammos");

    for (const ammo of Ammos) {
        logger.indent(`Validating ammo '${ammo.idString}'`, () => {
            const errorPath = tester.createPath("ammos", `ammo ${ammo.idString}`);

            tester.assertIsNaturalNumber({
                obj: ammo,
                field: "maxStackSize",
                baseErrorPath: errorPath
            });

            logger.indent("Validating characteristic color", () => {
                const color = ammo.characteristicColor;
                const errorPath2 = tester.createPath(errorPath, "characteristic color");

                tester.assertInBounds({
                    obj: color,
                    field: "hue",
                    min: 0,
                    max: 360,
                    includeMin: true,
                    includeMax: true,
                    baseErrorPath: errorPath2
                });

                tester.assertInBounds({
                    obj: color,
                    field: "saturation",
                    min: 0,
                    max: 100,
                    includeMin: true,
                    includeMax: true,
                    baseErrorPath: errorPath2
                });

                tester.assertInBounds({
                    obj: color,
                    field: "lightness",
                    min: 0,
                    max: 100,
                    includeMin: true,
                    includeMax: true,
                    baseErrorPath: errorPath2
                });
            });
        });
    }
});

logger.indent("Validating armor definitions", () => {
    tester.assertNoDuplicateIDStrings(Armors.definitions, "Armors", "armors");

    const errorPath = tester.createPath("armors");
    for (const armor of Armors) {
        logger.indent(`Validating armor '${armor.idString}'`, () => {
            tester.assertIsNaturalNumber({
                obj: armor,
                field: "level",
                baseErrorPath: errorPath
            });

            tester.assertInBounds({
                obj: armor,
                field: "damageReduction",
                min: 0,
                max: 1,
                includeMin: true,
                includeMax: true,
                baseErrorPath: errorPath
            });

            if (armor.armorType === ArmorType.Vest) {
                validators.color(
                    tester.createPath(errorPath, "field 'color'"),
                    armor.color
                );
            }
        });
    }
});

logger.indent("Validating backpack definitions", () => {
    tester.assertNoDuplicateIDStrings(Backpacks.definitions, "Backpacks", "backpacks");

    for (const backpack of Backpacks) {
        const errorPath = tester.createPath("backpacks", `backpack '${backpack.idString}'`);

        logger.indent(`Validating '${backpack.idString}'`, () => {
            tester.assertIsNaturalNumber({
                obj: backpack,
                field: "level",
                baseErrorPath: errorPath
            });

            validators.color(tester.createPath(errorPath, "field 'defaultTint'"), backpack.defaultTint);

            logger.indent("Validating maximum capacities", () => {
                const errorPath2 = tester.createPath(errorPath, "maximum capacities");

                const pool = (HealingItems.definitions as readonly ItemDefinition[]).concat(Ammos.definitions).concat(Throwables.definitions);
                for (const [item] of Object.entries(backpack.maxCapacity)) {
                    tester.assertReferenceExistsArray({
                        value: item,
                        errorPath: errorPath2,
                        collection: pool,
                        collectionName: "HealingItems, Ammos, and Throwables"
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

logger.indent("Validating badge definitions", () => {
    tester.assertNoDuplicateIDStrings(Badges.definitions, "Badges", "badges");

    for (const badge of Badges) {
        const errorPath = tester.createPath("badges", `badge '${badge.idString}'`);

        logger.indent(`Validating '${badge.idString}'`, () => {
            if (badge.roles !== undefined) {
                const roles = badge.roles;
                logger.indent("Validating required roles", () => {
                    tester.runTestOnArray(
                        roles,
                        (role, errorPath) => {
                            tester.assertReferenceExistsObject({
                                value: role,
                                collection: Config.roles,
                                collectionName: "roles",
                                errorPath
                            });
                        },
                        errorPath
                    );
                });
            }
        });
    }
});

logger.indent("Validating building definitions", () => {
    tester.assertNoDuplicateIDStrings(Buildings.definitions, "Buildings", "buildings");

    for (const building of Buildings) {
        logger.indent(`Validating '${building.idString}'`, () => {
            const errorPath = tester.createPath("buildings", `building '${building.idString}'`);

            if (building.hitbox !== undefined) {
                tester.assertNoPointlessValue({
                    obj: building,
                    field: "noCollisions",
                    defaultValue: false,
                    baseErrorPath: errorPath
                });

                tester.assertNoPointlessValue({
                    obj: building,
                    field: "noBulletCollision",
                    defaultValue: false,
                    baseErrorPath: errorPath
                });

                tester.assertNoPointlessValue({
                    obj: building,
                    field: "reflectBullets",
                    defaultValue: false,
                    baseErrorPath: errorPath
                });
            } else {
                tester.assertWarn(
                    "noCollisions" in building,
                    "Specifying 'noCollisions' for a building with no hitbox has no effect",
                    errorPath
                );

                tester.assertWarn(
                    "noBulletCollision" in building,
                    "Specifying 'noBulletCollision' for a building with no hitbox has no effect",
                    errorPath
                );

                tester.assertWarn(
                    "reflectBullets" in building,
                    "Specifying 'reflectBullets' for a building with no hitbox has no effect",
                    errorPath
                );

                tester.assertWarn(
                    "collideWithLayers" in building,
                    "Specifying 'collideWithLayers' for a building with no hitbox has no effect",
                    errorPath
                );
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "visibleFromLayers",
                defaultValue: Layers.Adjacent,
                baseErrorPath: errorPath
            });

            if (building.bulletMask !== undefined) {
                validators.hitbox(
                    tester.createPath(errorPath, "field 'bulletMask'"),
                    building.bulletMask
                );
            }

            if (building.particleVariations) {
                tester.assertIsNaturalFiniteNumber({
                    obj: building,
                    field: "particleVariations",
                    baseErrorPath: errorPath
                });
            }

            if (building.hitbox) {
                validators.hitbox(
                    tester.createPath(errorPath, "hitbox"),
                    building.hitbox
                );
            }

            validators.hitbox(
                tester.createPath(errorPath, "spawn hitbox"),
                building.spawnHitbox
            );

            if (building.ceilingHitbox) {
                validators.hitbox(
                    tester.createPath(errorPath, "ceiling hitbox"),
                    building.ceilingHitbox
                );
            }

            const buildingObstacles = building.obstacles;
            logger.indent("Validating custom obstacles", () => {
                const errorPath2 = tester.createPath(errorPath, "custom obstacles");

                tester.runTestOnIdStringArray(
                    buildingObstacles,
                    (obstacle, errorPath) => {
                        const obstacles: ReadonlyArray<string | typeof NullString> = typeof obstacle.idString === "string"
                            ? [obstacle.idString]
                            : Object.keys(obstacle.idString);

                        tester.assertWarn(
                            typeof obstacle.idString === "object" && Object.keys(obstacle.idString).length === 1,
                            "Specifying a random obstacle is pointless if only one option is given",
                            errorPath
                        );

                        const {
                            foundDupes,
                            dupes
                        } = findDupes(obstacles);

                        tester.assertWarn(
                            foundDupes,
                            `Contained duplicate obstacle entries: ${Object.entries(dupes).map(([k, v]) => `'${k}' => ${v} times`).join("; ")}`,
                            errorPath
                        );

                        for (const idString of obstacles) {
                            if (idString === NullString) continue;
                            logger.indent(`Validating '${idString}'`, () => {
                                const errorPath2 = tester.createPath(errorPath, `obstacle '${idString}'`);
                                const reference = Obstacles.fromStringSafe(idString);

                                tester.assertReferenceExists({
                                    value: idString,
                                    collection: Obstacles,
                                    collectionName: "Obstacles",
                                    errorPath: errorPath2
                                });

                                validators.vector(tester.createPath(errorPath2, "position"), obstacle.position);

                                if (obstacle.rotation !== undefined) {
                                    if (reference) {
                                        const rotationMode = typeof obstacle.idString === "string" ? reference.rotationMode : RotationMode.Full;
                                        const errorPath2 = tester.createPath(errorPath, "field rotation");

                                        switch (rotationMode) {
                                            case RotationMode.Full: {
                                                tester.assertIsFiniteRealNumber({
                                                    obj: obstacle,
                                                    field: "rotation",
                                                    baseErrorPath: errorPath
                                                });
                                                break;
                                            }
                                            case RotationMode.Limited: {
                                                const value = obstacle.rotation;

                                                if (value !== undefined) {
                                                    tester.assert(
                                                        value % 1 === 0 && (0 <= value && value < 4),
                                                        `RotationMode.Limited only allows integers in the range [0, 3] (received ${safeString(value)})`,
                                                        errorPath2
                                                    );
                                                }
                                                break;
                                            }
                                            case RotationMode.Binary: {
                                                const value = obstacle.rotation;

                                                if (value !== undefined) {
                                                    tester.assert(
                                                        value === 0 || value === 1,
                                                        `RotationMode.Binary only allows a value of 0 or 1 (received ${safeString(value)})`,
                                                        errorPath2
                                                    );
                                                }
                                                break;
                                            }
                                            case RotationMode.None: {
                                                tester.assertValidOrNPV({
                                                    obj: obstacle,
                                                    field: "rotation",
                                                    baseErrorPath: errorPath,
                                                    defaultValue: 0,
                                                    validatorIfPresent: (value, errorPath) => {
                                                        tester.assert(
                                                            value === 0,
                                                            `RotationMode.None only allows a value of 0 (received ${safeString(value)})`,
                                                            errorPath
                                                        );
                                                    }
                                                });
                                                break;
                                            }
                                        }
                                    }
                                }

                                if (obstacle.layer !== undefined) {
                                    tester.assertInt({
                                        obj: obstacle,
                                        field: "layer",
                                        baseErrorPath: errorPath2
                                    });
                                }

                                if (obstacle.variation !== undefined) {
                                    if (reference) {
                                        if (reference.variations === undefined) {
                                            tester.assert(
                                                false,
                                                `Cannot specify a variant of an obstacle that has no variations (obstacle '${idString}' has no variations)`,
                                                errorPath
                                            );
                                        } else {
                                            tester.assertIntAndInBounds({
                                                obj: obstacle,
                                                field: "variation",
                                                min: 0,
                                                max: reference.variations - 1,
                                                includeMin: true,
                                                includeMax: true,
                                                baseErrorPath: errorPath
                                            });
                                        }
                                    }
                                }

                                tester.assertValidOrNPV({
                                    obj: obstacle,
                                    field: "scale",
                                    defaultValue: 1,
                                    validatorIfPresent: scale => {
                                        tester.assertIsPositiveFiniteReal({
                                            value: scale,
                                            errorPath
                                        });
                                    },
                                    baseErrorPath: errorPath
                                });

                                if (obstacle.lootSpawnOffset) {
                                    validators.vector(tester.createPath(errorPath, "loot spawn offset"), obstacle.lootSpawnOffset);
                                }

                                tester.assertNoPointlessValue({
                                    obj: obstacle,
                                    field: "puzzlePiece",
                                    defaultValue: false,
                                    baseErrorPath: errorPath
                                });

                                if (reference) {
                                    if (reference.isDoor) {
                                        tester.assertNoPointlessValue({
                                            obj: obstacle,
                                            field: "locked",
                                            defaultValue: false,
                                            baseErrorPath: errorPath
                                        });
                                    } else {
                                        tester.assert(
                                            !("locked" in obstacle),
                                            `Cannot specify 'locked' for an obstacle which is not a door (obstacle '${idString}' is not a door)`,
                                            errorPath
                                        );
                                    }

                                    if (reference.isActivatable) {
                                        tester.assertNoPointlessValue({
                                            obj: obstacle,
                                            field: "activated",
                                            defaultValue: false,
                                            baseErrorPath: errorPath
                                        });
                                    } else {
                                        tester.assert(
                                            !("activated" in obstacle),
                                            `Cannot specify 'activated' for an obstacle which is not a door (obstacle '${idString}' is not a door)`,
                                            errorPath
                                        );
                                    }
                                } else {
                                    tester.assertNoPointlessValue({
                                        obj: obstacle,
                                        field: "locked",
                                        defaultValue: false,
                                        baseErrorPath: errorPath
                                    });

                                    tester.assertNoPointlessValue({
                                        obj: obstacle,
                                        field: "activated",
                                        defaultValue: false,
                                        baseErrorPath: errorPath
                                    });
                                }
                            });
                        }
                    },
                    errorPath2
                );
            });

            const lootSpawners = building.lootSpawners;
            logger.indent("Validating loot spawners", () => {
                const errorPath2 = tester.createPath(errorPath, "loot spawners");

                tester.runTestOnArray(
                    lootSpawners,
                    (spawner, errorPath) => {
                        validators.vector(tester.createPath(errorPath2, "position"), spawner.position);

                        tester.assertReferenceExistsObject({
                            obj: spawner,
                            field: "table",
                            collection: LootTables.normal,
                            collectionName: "LootTables",
                            baseErrorPath: errorPath
                        });
                    },
                    errorPath2
                );
            });

            const buildingSubBuildings = building.subBuildings;
            logger.indent("Validating sub-buildings", () => {
                const errorPath2 = tester.createPath(errorPath, "sub-buildings");

                tester.runTestOnIdStringArray(
                    buildingSubBuildings,
                    (subBuilding, errorPath) => {
                        const subBuildings: Array<string | typeof NullString> = typeof subBuilding.idString === "string"
                            ? [subBuilding.idString]
                            : Object.keys(subBuilding.idString);

                        tester.assertWarn(
                            typeof subBuilding.idString === "object" && Object.keys(subBuilding.idString).length === 1,
                            "Specifying a random sub-building is pointless if only one option is given",
                            errorPath
                        );

                        const {
                            foundDupes,
                            dupes
                        } = findDupes(subBuildings);

                        tester.assertWarn(
                            foundDupes,
                            `Contained duplicate sub-building entries: ${Object.entries(dupes).map(([k, v]) => `'${k}' => ${v} times`).join("; ")}`,
                            errorPath
                        );

                        for (const idString of subBuildings) {
                            if (idString === NullString) continue;
                            logger.indent(`Validating '${idString}'`, () => {
                                tester.assertReferenceExists({
                                    value: idString,
                                    collection: Buildings,
                                    collectionName: "Buildings",
                                    errorPath
                                });
                            });
                        }

                        validators.vector(tester.createPath(errorPath, "position"), subBuilding.position);

                        tester.assertNoPointlessValue({
                            obj: subBuilding,
                            field: "orientation",
                            defaultValue: 0,
                            baseErrorPath: errorPath
                        });

                        if (subBuilding.layer !== undefined) {
                            tester.assertInt({
                                obj: subBuilding,
                                field: "layer",
                                baseErrorPath: errorPath
                            });
                        }
                    },
                    errorPath2
                );
            });

            if (building.puzzle === undefined) {
                logger.indent("Validating no-puzzle conformance", () => {
                    tester.runTestOnIdStringArray(
                        building.obstacles,
                        (obstacle, errorPath) => {
                            tester.assert(
                                !("puzzlePiece" in obstacle),
                                "Obstacle was specified as a puzzle piece, yet its parent building has no puzzle",
                                errorPath
                            );
                        },
                        tester.createPath(errorPath, "puzzle", "obstacles")
                    );
                });
            } else {
                const puzzle = building.puzzle;
                const errorPath2 = tester.createPath(errorPath, "puzzle");

                if (puzzle.triggerOnSolve) {
                    tester.assertReferenceExists({
                        obj: puzzle,
                        field: "triggerOnSolve",
                        collection: Obstacles,
                        collectionName: "Obstacles",
                        baseErrorPath: errorPath2
                    });
                }

                const hasObstacles = building.obstacles.length > 0;

                const definitePuzzleTargets = building.obstacles.filter(o => {
                    switch (typeof o.idString) {
                        case "string": {
                            return o.idString === puzzle.triggerOnSolve;
                        }
                        case "object": {
                            return Object.keys(o.idString).length === 1 && puzzle.triggerOnSolve && puzzle.triggerOnSolve in o.idString;
                        }
                    }
                });

                if (definitePuzzleTargets.length === 0 && puzzle.triggerOnSolve) {
                    const targetMightExist = hasObstacles && building.obstacles.some(o => typeof o.idString === "object" && puzzle.triggerOnSolve && puzzle.triggerOnSolve in o.idString);

                    if (targetMightExist) {
                        tester.assertWarn(
                            true,
                            `This puzzle specified a target of '${puzzle.triggerOnSolve}', but this obstacle is not guaranteed to spawn`,
                            errorPath2
                        );
                    } else {
                        tester.assert(
                            false,
                            `This puzzle specified a target of '${puzzle.triggerOnSolve}', but no instances of this obstacle exist in the building`,
                            errorPath2
                        );
                    }
                } else {
                    const errorPath3 = tester.createPath(errorPath2, "puzzle target");
                    for (const { idString } of definitePuzzleTargets) {
                        const target = typeof idString === "string" ? idString : Object.keys(idString)[0];
                        const reference = Obstacles.fromStringSafe(target);

                        if (!reference) continue;
                        tester.assertWarn(
                            !reference.isActivatable && !reference.isDoor,
                            `Puzzle target '${target}' is neither activatable nor a door`,
                            errorPath3
                        );
                    }
                }

                tester.assertIsPositiveFiniteReal({
                    obj: puzzle,
                    field: "delay",
                    baseErrorPath: errorPath2
                });

                tester.assert(
                    puzzle.order?.length !== 0,
                    "A puzzle's length cannot be 0",
                    errorPath2
                );

                if (puzzle.order !== undefined) {
                    const errorPath3 = tester.createPath(errorPath2, "order");
                    const order = puzzle.order;

                    logger.indent("Validating puzzle order soundness", () => {
                        tester.runTestOnArray(
                            order,
                            (entry, errorPath) => {
                                tester.assert(
                                    building.obstacles.some(o => o.puzzlePiece === entry),
                                    `This puzzle's sequence calls for an element '${entry}', but no obstacle in the containing building provides such an element`,
                                    errorPath
                                );
                            },
                            errorPath3
                        );
                    });

                    const { foundDupes: hasDuplicateElements, dupes: duplicateElements } = findDupes(puzzle.order);

                    for (const [element, count] of Object.entries(duplicateElements)) {
                        const candidateCount = building.obstacles.filter(o => o.puzzlePiece === element).length;

                        tester.assert(
                            (candidateCount ?? -Infinity) >= count,
                            `Puzzle calls for ${count} instances of element '${element}', but only ${candidateCount ?? 0} exist within the building`,
                            errorPath3
                        );
                    }

                    tester.assertWarn(
                        hasDuplicateElements,
                        "This puzzle's sequence has duplicate entries: this thus means that there are multiple valid combinations, since there is no way to distinguish two identical elements",
                        errorPath3
                    );
                }

                tester.assertNoPointlessValue({
                    obj: puzzle,
                    field: "solvedSound",
                    defaultValue: false,
                    baseErrorPath: errorPath2
                });

                tester.assertNoPointlessValue({
                    obj: puzzle,
                    field: "setSolvedImmediately",
                    defaultValue: false,
                    baseErrorPath: errorPath2
                });

                tester.assertNoPointlessValue({
                    obj: puzzle,
                    field: "unlockOnly",
                    defaultValue: false,
                    baseErrorPath: errorPath2
                });
            }

            if (building.sounds !== undefined) {
                const sounds = building.sounds;
                logger.indent("Validating sounds", () => {
                    const errorPath2 = tester.createPath(errorPath, "sounds");

                    if (sounds.position) validators.vector(errorPath2, sounds.position);

                    tester.assertIsPositiveReal({
                        obj: sounds,
                        field: "maxRange",
                        baseErrorPath: errorPath2
                    });

                    tester.assertIsPositiveReal({
                        obj: sounds,
                        field: "falloff",
                        baseErrorPath: errorPath2
                    });
                });
            }

            const floorImages = building.floorImages;
            logger.indent("Validating floor images", () => {
                tester.runTestOnArray(
                    floorImages,
                    (image, errorPath) => {
                        validators.vector(
                            tester.createPath(errorPath, "position"),
                            image.position
                        );

                        tester.assertValidOrNPV({
                            obj: image,
                            field: "rotation",
                            defaultValue: 0,
                            validatorIfPresent(value, errorPath) {
                                tester.assertIsFiniteRealNumber({
                                    value,
                                    errorPath
                                });
                            },
                            baseErrorPath: tester.createPath(errorPath, "rotation")
                        });

                        tester.assertValidOrNPV({
                            obj: image,
                            field: "scale",
                            defaultValue: { x: 1, y: 1 },
                            equalityFunction: Vec.equals,
                            validatorIfPresent(value, errorPath) {
                                validators.vector(
                                    errorPath,
                                    value
                                );
                            },
                            baseErrorPath: tester.createPath(errorPath, "rotation")
                        });

                        tester.assertValidOrNPV({
                            obj: image,
                            field: "tint",
                            defaultValue: 0xFFFFFF,
                            equalityFunction: a => a === 0xFFFFFF || a === "#FFFFFF",
                            validatorIfPresent(value, errorPath) {
                                validators.color(
                                    errorPath,
                                    value
                                );
                            },
                            baseErrorPath: tester.createPath(errorPath, "rotation")
                        });
                    },
                    tester.createPath(errorPath, "floor images")
                );
            });

            const ceilingImages = building.ceilingImages;
            logger.indent("Validating ceiling images", () => {
                tester.runTestOnArray(
                    ceilingImages,
                    (image, errorPath) => {
                        validators.vector(
                            tester.createPath(errorPath, "position"),
                            image.position
                        );

                        tester.assertValidOrNPV({
                            obj: image,
                            field: "rotation",
                            defaultValue: 0,
                            validatorIfPresent(value, errorPath) {
                                tester.assertIsFiniteRealNumber({
                                    value,
                                    errorPath
                                });
                            },
                            baseErrorPath: tester.createPath(errorPath, "rotation")
                        });

                        tester.assertValidOrNPV({
                            obj: image,
                            field: "scale",
                            defaultValue: { x: 1, y: 1 },
                            equalityFunction: Vec.equals,
                            validatorIfPresent(value, errorPath) {
                                validators.vector(
                                    errorPath,
                                    value
                                );
                            },
                            baseErrorPath: tester.createPath(errorPath, "rotation")
                        });

                        tester.assertValidOrNPV({
                            obj: image,
                            field: "tint",
                            defaultValue: 0xFFFFFF,
                            equalityFunction: a => a === 0xFFFFFF || a === "#FFFFFF",
                            validatorIfPresent(value, errorPath) {
                                validators.color(
                                    errorPath,
                                    value
                                );
                            },
                            baseErrorPath: tester.createPath(errorPath, "rotation")
                        });
                    },
                    tester.createPath(errorPath, "ceiling images")
                );
            });

            tester.assertValidOrNPV({
                obj: building,
                field: "visibilityOverrides",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                validatorIfPresent(overrides, errorPath) {
                    tester.runTestOnArray(
                        overrides,
                        (override, errorPath2) => {
                            validators.hitbox(tester.createPath(errorPath2, "collider"), override.collider);
                            tester.assertValidOrNPV({
                                obj: override,
                                field: "layer",
                                defaultValue: 0,
                                validatorIfPresent: (value, errorPath) => {
                                    tester.assertInt({
                                        value,
                                        errorPath
                                    });
                                },
                                baseErrorPath: errorPath2
                            });

                            tester.assertValidOrNPV({
                                obj: override,
                                field: "allow",
                                defaultValue: [],
                                equalityFunction: a => a.length === 0,
                                validatorIfPresent(allow, errorPath) {
                                    tester.runTestOnArray(
                                        allow,
                                        (layer, errorPath) => {
                                            tester.assertInt({
                                                value: layer,
                                                errorPath
                                            });
                                        },
                                        errorPath
                                    );
                                },
                                baseErrorPath: errorPath2
                            });
                        },
                        errorPath
                    );
                },
                baseErrorPath: errorPath
            });

            const wallsToDestroy = building.wallsToDestroy;
            const definiteMatches = building.obstacles?.filter(
                ({ idString: self }) => Obstacles.definitions.find(
                    ({ idString: other }) => typeof self === "string"
                        ? self === other
                        : Object.keys(self).length === 1 && other in self
                )?.isWall
            ).length ?? Infinity;

            const maxPossibleMatches = (
                building.obstacles?.filter(
                    ({ idString: self }) => Obstacles.definitions.find(
                        ({ idString: other }) => typeof self === "object" && Object.keys(self).length > 1 && Object.keys(self).includes(other)
                    )?.isWall
                ).length ?? Infinity
            ) + definiteMatches;

            const wallsDestroyIsValid = wallsToDestroy < maxPossibleMatches;
            const infiniteWallsToDestroy = wallsToDestroy === Infinity;
            tester.assert(
                infiniteWallsToDestroy || wallsDestroyIsValid,
                "This building can never be destroyed because its 'wallsToDestroy' property is larger than the amount of walls present",
                errorPath
            );

            if (wallsDestroyIsValid && !infiniteWallsToDestroy) {
                tester.assertWarn(
                    wallsToDestroy > definiteMatches,
                    "This building's destructibility is not guaranteed, because the amount of walls that spawn may be less than its 'wallsToDestroy' property",
                    errorPath
                );
            }

            tester.assertIntAndInBounds({
                obj: building,
                field: "wallsToDestroy",
                min: 1,
                max: Infinity, // upper bound is already validated elsewhere
                includeMin: true,
                includeMax: true,
                baseErrorPath: errorPath
            });

            const floors = building.floors;
            logger.indent("Validating floors", () => {
                tester.runTestOnArray(
                    floors,
                    (floor, errorPath) => {
                        tester.assertReferenceExistsObject({
                            obj: floor,
                            field: "type",
                            collection: FloorTypes,
                            baseErrorPath: errorPath,
                            collectionName: "Floors"
                        });

                        validators.hitbox(tester.createPath(errorPath, "hitbox"), floor.hitbox);

                        if (floor.layer !== undefined) {
                            tester.assertInt({
                                obj: floor,
                                field: "layer",
                                baseErrorPath: errorPath
                            });
                        }
                    },
                    tester.createPath(errorPath, "floors")
                );
            });

            const groundGraphics = building.groundGraphics;
            logger.indent("Validating ground graphics", () => {
                tester.runTestOnArray(
                    groundGraphics,
                    (graphic, errorPath) => {
                        validators.hitbox(
                            tester.createPath(errorPath, "hitbox"),
                            graphic.hitbox
                        );

                        validators.color(
                            tester.createPath(errorPath, "color"),
                            graphic.color
                        );
                    },
                    tester.createPath(errorPath, "ground graphics")
                );
            });
        });
    }
});

logger.indent("Validating bullets", () => {
    tester.assertNoDuplicateIDStrings(Bullets.definitions, "Bullets", "bullets");

    for (const bullet of Bullets) {
        logger.indent(`Validating bullet '${bullet.idString}'`, () => {
            const errorPath = tester.createPath("bullets", `bullet '${bullet.idString}'`);

            validators.ballistics(errorPath, bullet);
        });
    }
});

logger.indent("Validating decals", () => {
    tester.assertNoDuplicateIDStrings(Decals.definitions, "Decals", "decals");

    for (const decal of Decals) {
        logger.indent(`Validating decal '${decal.idString}'`, () => {
            const errorPath = tester.createPath("decals", `decal '${decal.idString}'`);

            tester.assertIsFiniteRealNumber({
                obj: decal,
                field: "scale",
                baseErrorPath: errorPath
            });
        });
    }
});

logger.indent("Validating emotes", () => {
    tester.assertNoDuplicateIDStrings(Emotes.definitions, "Emotes", "emotes");
});

logger.indent("Validating explosions", () => {
    tester.assertNoDuplicateIDStrings(Explosions.definitions, "Explosions", "explosions");

    for (const explosion of Explosions) {
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

                validators.numericInterval(
                    errorPath2,
                    explosion.radius,
                    {
                        globalMin: { value: 0, include: true }
                    }
                );
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

                validators.color(tester.createPath(errorPath2, "tint"), explosion.animation.tint);

                tester.assertIsFiniteRealNumber({
                    obj: explosion.animation,
                    field: "scale",
                    baseErrorPath: errorPath2
                });
            });

            if (explosion.decal !== undefined) {
                tester.assertReferenceExists({
                    obj: explosion,
                    field: "decal",
                    collection: Decals,
                    collectionName: "Decals",
                    baseErrorPath: errorPath
                });
            }

            tester.assertIsNaturalFiniteNumber({
                obj: explosion,
                field: "shrapnelCount",
                baseErrorPath: errorPath
            });

            logger.indent("Validating ballistics", () => {
                validators.ballistics(
                    tester.createPath(errorPath, "ballistics"),
                    {
                        ...explosion.ballistics,
                        lastShotFX: false
                    }
                );
            });
        });
    }
});

logger.indent("Validating guns", () => {
    tester.assertNoDuplicateIDStrings(Guns.definitions, "Guns", "guns");

    for (const gun of Guns) {
        const errorPath = tester.createPath("guns", `gun '${gun.idString}'`);

        logger.indent(`Validating gun '${gun.idString}'`, () => {
            tester.assertReferenceExistsArray({
                obj: gun,
                field: "ammoType",
                collection: Ammos.definitions,
                collectionName: "Ammos",
                baseErrorPath: errorPath
            });

            tester.assertIsNaturalFiniteNumber({
                obj: gun,
                field: "ammoSpawnAmount",
                baseErrorPath: errorPath
            });

            tester.assertIsNaturalFiniteNumber({
                obj: gun,
                field: "capacity",
                baseErrorPath: errorPath
            });

            tester.assertValidOrNPV({
                obj: gun,
                field: "extendedCapacity",
                defaultValue: gun.capacity,
                validatorIfPresent: (extended, errorPath) => {
                    tester.assertIsNaturalFiniteNumber({
                        value: extended,
                        errorPath
                    });
                },
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: gun,
                field: "reloadTime",
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

            if (gun.shotsPerReload !== undefined) {
                tester.assertIsNaturalFiniteNumber({
                    obj: gun,
                    field: "shotsPerReload",
                    baseErrorPath: errorPath
                });
            }

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

            if (gun.bulletOffset) {
                tester.assertIsFiniteRealNumber({
                    obj: gun,
                    field: "bulletOffset",
                    baseErrorPath: errorPath
                });
            }

            if (gun.fsaReset) {
                tester.assertIsRealNumber({
                    obj: gun,
                    field: "fsaReset",
                    baseErrorPath: errorPath
                });
            }

            tester.assertIsPositiveReal({
                obj: gun,
                field: "jitterRadius",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: gun,
                field: "bulletCount",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: gun,
                field: "length",
                baseErrorPath: errorPath
            });

            if (gun.isDual) {
                logger.indent("Validating dual attributes", () => {
                    const errorPath2 = tester.createPath(errorPath, "dual properties");

                    tester.assertIsPositiveFiniteReal({
                        obj: gun,
                        field: "leftRightOffset",
                        baseErrorPath: errorPath2
                    });

                    tester.assertReferenceExists({
                        obj: gun,
                        field: "singleVariant",
                        collection: Guns,
                        collectionName: "Guns",
                        baseErrorPath: errorPath2
                    });

                    const singleVar = Loots.fromString<SingleGunNarrowing>(gun.singleVariant);

                    const singleDualPtr = singleVar?.dualVariant;
                    tester.assert(
                        singleDualPtr === gun.idString,
                        `This gun specified weapon '${gun.dualVariant}' as its single form, but that weapon ${singleDualPtr === undefined ? "doesn't exist" : `specified its dual form as being '${singleDualPtr}'`}`,
                        errorPath2
                    );

                    if (singleVar) {
                        tester.assert(
                            !singleVar.isDual,
                            `This gun specified weapon '${gun.dualVariant}' as its single form, but that weapon's 'isDual' flag is set to true`,
                            errorPath2
                        );
                    }
                });
            } else {
                logger.indent("Validating fists", () => {
                    const errorPath2 = tester.createPath(errorPath, "fists");

                    const fists = gun.fists;
                    validators.vector(tester.createPath(errorPath2, "left"), fists.left);
                    validators.vector(tester.createPath(errorPath2, "right"), fists.right);

                    tester.assertIsPositiveReal({
                        obj: fists,
                        field: "animationDuration",
                        baseErrorPath: errorPath2
                    });

                    tester.assertIsRealNumber({
                        obj: fists,
                        field: "leftZIndex",
                        baseErrorPath: errorPath2
                    });

                    tester.assertIsRealNumber({
                        obj: fists,
                        field: "rightZIndex",
                        baseErrorPath: errorPath2
                    });
                });

                logger.indent("Validating image", () => {
                    const errorPath2 = tester.createPath(errorPath, "image");
                    const image = gun.image;

                    if (!gun.isDual) {
                        validators.vector(tester.createPath(errorPath2, "position"), image.position);
                    }

                    tester.assertIsRealNumber({
                        obj: image,
                        field: "angle",
                        baseErrorPath: errorPath2
                    });

                    tester.assertIsRealNumber({
                        obj: image,
                        field: "zIndex",
                        baseErrorPath: errorPath2
                    });
                });

                const casings = gun.casingParticles;
                logger.indent("Validating casings", () => {
                    tester.runTestOnArray<NonNullable<SingleGunNarrowing["casingParticles"]>[number]>(
                        casings,
                        (casingSpec, errorPath) => {
                            validators.vector(tester.createPath(errorPath, "position"), casingSpec.position);

                            const ammo = Ammos.fromStringSafe(gun.ammoType);
                            if (ammo) {
                                tester.assertNoPointlessValue({
                                    obj: casingSpec,
                                    field: "frame",
                                    defaultValue: ammo.defaultCasingFrame,
                                    baseErrorPath: errorPath
                                });
                            }

                            tester.assertValidOrNPV({
                                obj: casingSpec,
                                field: "count",
                                defaultValue: 1,
                                validatorIfPresent: (count, errorPath) => {
                                    tester.assertIsPositiveFiniteReal({
                                        value: count,
                                        errorPath
                                    });
                                },
                                baseErrorPath: errorPath
                            });

                            tester.assertValidOrNPV({
                                obj: casingSpec,
                                field: "ejectionDelay",
                                defaultValue: 0,
                                validatorIfPresent: (ejectionDelay, errorPath) => {
                                    tester.assertIsPositiveFiniteReal({
                                        value: ejectionDelay,
                                        errorPath
                                    });
                                },
                                baseErrorPath: errorPath
                            });

                            tester.assertValidOrNPV({
                                obj: casingSpec,
                                field: "velocity",
                                defaultValue: {},
                                equalityFunction: a => Object.keys(a).length === 0,
                                validatorIfPresent: velocity => {
                                    logger.indent("Validating casing velocities", () => {
                                        const errorPathX = tester.createPath(errorPath, "velocity", "x");
                                        const errorPathY = tester.createPath(errorPath, "velocity", "y");

                                        tester.assertValidOrNPV({
                                            obj: velocity,
                                            field: "x",
                                            defaultValue: {
                                                min: -2,
                                                max: 5
                                            },
                                            equalityFunction: (a, b) => a.min === b.min && a.max === b.max,
                                            validatorIfPresent: x => {
                                                validators.numericInterval(
                                                    errorPathX,
                                                    x,
                                                    {
                                                        globalMin: { value: -Infinity, include: false },
                                                        globalMax: { value: Infinity, include: false },
                                                        allowDegenerateIntervals: false
                                                    }
                                                );

                                                tester.assertNoPointlessValue({
                                                    obj: x,
                                                    field: "randomSign",
                                                    defaultValue: false,
                                                    baseErrorPath: errorPathX
                                                });
                                            },
                                            baseErrorPath: errorPathX
                                        });

                                        tester.assertValidOrNPV({
                                            obj: velocity,
                                            field: "y",
                                            defaultValue: {
                                                min: 10,
                                                max: 15
                                            },
                                            equalityFunction: (a, b) => a.min === b.min && a.max === b.max,
                                            validatorIfPresent: y => {
                                                validators.numericInterval(
                                                    errorPathY,
                                                    y,
                                                    {
                                                        globalMin: { value: -Infinity, include: false },
                                                        globalMax: { value: Infinity, include: false },
                                                        allowDegenerateIntervals: false
                                                    }
                                                );

                                                tester.assertNoPointlessValue({
                                                    obj: y,
                                                    field: "randomSign",
                                                    defaultValue: false,
                                                    baseErrorPath: errorPathY
                                                });
                                            },
                                            baseErrorPath: errorPathY
                                        });
                                    });
                                },
                                baseErrorPath: errorPath
                            });

                            tester.assertNoPointlessValue({
                                obj: casingSpec,
                                field: "on",
                                defaultValue: "fire",
                                baseErrorPath: errorPath
                            });
                        },
                        tester.createPath(errorPath, "casings")
                    );
                });

                const gasParticles = gun.gasParticles;
                if (gasParticles) {
                    logger.indent("Validating gas particles", () => {
                        const errorPath2 = tester.createPath(errorPath, "gas particles");

                        tester.assertIsNaturalFiniteNumber({
                            obj: gasParticles,
                            field: "amount",
                            baseErrorPath: errorPath2
                        });

                        validators.minMax(
                            errorPath2,
                            {
                                min: gasParticles.minSize,
                                max: gasParticles.maxSize
                            },
                            (errorPath, value) => {
                                tester.assertIsFiniteRealNumber({
                                    value,
                                    errorPath
                                });
                            }
                        );

                        validators.minMax(
                            errorPath2,
                            {
                                min: gasParticles.minLife,
                                max: gasParticles.maxLife
                            },
                            (errorPath, value) => {
                                tester.assertIsFiniteRealNumber({
                                    value,
                                    errorPath
                                });
                            }
                        );

                        tester.assertIsFiniteRealNumber({
                            obj: gasParticles,
                            field: "spread",
                            baseErrorPath: errorPath
                        });

                        validators.minMax(
                            errorPath2,
                            {
                                min: gasParticles.minSpeed,
                                max: gasParticles.maxSpeed
                            },
                            (errorPath, value) => {
                                tester.assertIsFiniteRealNumber({
                                    value,
                                    errorPath
                                });
                            }
                        );
                    });
                }
            }

            if (gun.dualVariant) {
                tester.assertReferenceExists({
                    field: "dualVariant",
                    obj: gun,
                    collection: Guns,
                    collectionName: "Guns",
                    baseErrorPath: errorPath
                });

                const dualVariant = gun.dualVariant;

                const dualVar = Loots.fromString<DualGunNarrowing>(dualVariant);
                const dualSinglePtr: string | undefined = dualVar?.singleVariant;
                tester.assert(
                    dualSinglePtr === gun.idString,
                    `This gun specified weapon '${dualVariant}' as its dual form, but that weapon ${dualSinglePtr === undefined ? "doesn't exist" : `specified its single form as being '${dualSinglePtr}'`}`,
                    errorPath
                );

                if (dualVar) {
                    tester.assert(
                        dualVar.isDual,
                        `This gun specified weapon '${dualVariant}' as its dual form, but that weapon's 'isDual' flag is set to ${dualVar.isDual}`,
                        errorPath
                    );
                }
            }

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

            validators.wearerAttributes(errorPath, gun);
        });
    }
});

logger.indent("Validating healing items", () => {
    tester.assertNoDuplicateIDStrings(HealingItems.definitions, "HealingItems", "healing items");

    for (const healingItem of HealingItems) {
        const errorPath = tester.createPath("healing items", `healing item '${healingItem.idString}'`);

        logger.indent(`Validating healing item '${healingItem.idString}'`, () => {
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

logger.indent("Validating map pings", () => {
    tester.assertNoDuplicateIDStrings(MapPings.definitions, "MapPings", "map pings");

    for (const mapPing of MapPings) {
        const errorPath = tester.createPath("map pings", `map ping '${mapPing.idString}'`);

        logger.indent(`Validating map ping '${mapPing.idString}'`, () => {
            validators.color(tester.createPath(errorPath, "field color"), mapPing.color);

            tester.assertIsPositiveReal({
                obj: mapPing,
                field: "lifetime",
                baseErrorPath: errorPath
            });
        });
    }
});

logger.indent("Validating melees", () => {
    tester.assertNoDuplicateIDStrings(Melees.definitions, "Melees", "melees");

    for (const melee of Melees) {
        const errorPath = tester.createPath("melees", `melee '${melee.idString}'`);

        logger.indent(`Validating melee '${melee.idString}'`, () => {
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

            tester.assertIsNaturalNumber({
                obj: melee,
                field: "maxTargets",
                baseErrorPath: errorPath
            });

            logger.indent("Validating fists", () => {
                const errorPath2 = tester.createPath(errorPath, "fists");
                const { fists, rotationalAnimation } = melee;

                tester.assertIsPositiveReal({
                    obj: fists,
                    field: "animationDuration",
                    baseErrorPath: errorPath2
                });

                tester.assertNoPointlessValue({
                    obj: fists,
                    field: "randomFist",
                    defaultValue: false,
                    baseErrorPath: errorPath2
                });

                validators.vector(tester.createPath(errorPath2, "left"), fists.left);
                validators.vector(tester.createPath(errorPath2, "right"), fists.right);

                if (!rotationalAnimation) {
                    validators.vector(tester.createPath(errorPath2, "use left"), fists.useLeft);
                    validators.vector(tester.createPath(errorPath2, "use right"), fists.useRight);
                }
            });

            if (melee.image) {
                const image = melee.image;
                logger.indent("Validating image", () => {
                    const errorPath2 = tester.createPath(errorPath, "image");

                    validators.vector(tester.createPath(errorPath2, "position"), image.position);
                    if (!melee.rotationalAnimation) validators.vector(tester.createPath(errorPath2, "use position"), image.usePosition);

                    tester.assertValidOrNPV({
                        obj: image,
                        field: "angle",
                        defaultValue: 0,
                        validatorIfPresent: (angle, errorPath) => {
                            tester.assertIsFiniteRealNumber({
                                value: angle,
                                errorPath
                            });
                        },
                        baseErrorPath: errorPath2
                    });

                    if (image.useAngle) {
                        tester.assertIsFiniteRealNumber({
                            obj: image,
                            field: "useAngle",
                            baseErrorPath: errorPath2
                        });
                    }

                    tester.assertIsRealNumber({
                        obj: image,
                        field: "zIndex",
                        baseErrorPath: errorPath2
                    });

                    tester.assertValidOrNPV({
                        obj: image,
                        field: "lootScale",
                        defaultValue: 1,
                        validatorIfPresent: (lootScale, errorPath) => {
                            tester.assertIsFiniteRealNumber({
                                value: lootScale,
                                errorPath
                            });
                        },
                        baseErrorPath: errorPath2
                    });

                    tester.assertNoPointlessValue({
                        obj: image,
                        field: "separateWorldImage",
                        defaultValue: false,
                        baseErrorPath: errorPath2
                    });
                });
            }

            tester.assert(
                melee.fireMode !== FireMode.Burst,
                "A melee weapon's fire mode cannot be FireMode.Burst",
                errorPath
            );

            validators.wearerAttributes(errorPath, melee);
        });
    }
});

logger.indent("Validating modes", () => {
    for (const [name, mode] of Object.entries(Modes)) {
        logger.indent(`Validating mode '${name}'`, () => {
            const errorPath = tester.createPath("modes", `mode '${name}'`);

            tester.assertNoPointlessValue({
                obj: mode,
                field: "specialMenuMusic",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: mode,
                field: "reskin",
                defaultValue: "",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: mode,
                field: "bulletTrailAdjust",
                defaultValue: "",
                baseErrorPath: errorPath
            });
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

            if (obstacle.scale) {
                const scale = obstacle.scale;
                logger.indent("Validating scaling", () => {
                    const errorPath2 = tester.createPath(errorPath, "scaling");

                    validators.numericInterval(
                        errorPath2,
                        { min: scale.spawnMin, max: scale.spawnMax },
                        {
                            globalMin: { value: -Infinity, include: false },
                            globalMax: { value: Infinity, include: false },
                            allowDegenerateIntervals: true
                        }
                    );

                    tester.assertIsFiniteRealNumber({
                        obj: scale,
                        field: "destroy",
                        baseErrorPath: errorPath2
                    });
                });
            }

            validators.hitbox(tester.createPath(errorPath, "hitbox"), obstacle.hitbox);

            if (obstacle.spawnHitbox) {
                validators.hitbox(tester.createPath(errorPath, "spawn hitbox"), obstacle.spawnHitbox);
            }

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
                tester.assertIsNaturalFiniteNumber({
                    obj: obstacle,
                    field: "particleVariations",
                    baseErrorPath: errorPath
                });
            }

            tester.assertValidOrNPV({
                obj: obstacle,
                field: "lootTable",
                defaultValue: obstacle.idString,
                validatorIfPresent: (lootTable, errorPath) => {
                    if (obstacle.hasLoot || obstacle.spawnWithLoot) {
                        tester.assertReferenceExistsObject({
                            value: lootTable,
                            collection: LootTables.normal,
                            collectionName: "LootTables",
                            errorPath
                        });
                    }
                },
                baseErrorPath: errorPath
            });

            if (obstacle.explosion !== undefined) {
                tester.assertReferenceExists({
                    obj: obstacle,
                    field: "explosion",
                    collection: Explosions,
                    collectionName: "Explosions",
                    baseErrorPath: errorPath
                });
            }

            tester.assertValidOrNPV({
                obj: obstacle,
                field: "hitSoundVariations",
                defaultValue: 1,
                validatorIfPresent(value, errorPath) {
                    tester.assertIntAndInBounds({
                        value,
                        min: 0,
                        max: Infinity,
                        errorPath
                    });
                },
                baseErrorPath: errorPath
            });

            tester.assertWarn(
                obstacle.noResidue && obstacle.frames?.residue !== undefined,
                `Obstacle '${obstacle.idString}' specified a residue image, but also specified the 'noResidue' attribute.`,
                errorPath
            );

            tester.assertWarn(
                obstacle.invisible && obstacle.frames?.base !== undefined,
                `Obstacle '${obstacle.idString}' specified a base image, but also specified the 'invisible' attribute.`,
                errorPath
            );

            if (obstacle.wall !== undefined) {
                validators.color(tester.createPath(errorPath, "wall color"), obstacle.wall.color);
                validators.color(tester.createPath(errorPath, "wall border color"), obstacle.wall.borderColor);
                tester.assertNoPointlessValue({
                    obj: obstacle.wall,
                    field: "rounded",
                    defaultValue: false,
                    baseErrorPath: tester.createPath(errorPath, "wall")
                });
            }

            if (obstacle.imageAnchor !== undefined) {
                validators.vector(tester.createPath(errorPath, "field imageAnchor"), obstacle.imageAnchor);
            }

            if (obstacle.tint !== undefined) {
                validators.color(tester.createPath(errorPath, "tint"), obstacle.tint);
            }

            if (obstacle.particlesOnDestroy !== undefined) {
                const particlesOnDestroy = obstacle.particlesOnDestroy;

                logger.indent("Validating destruction particles", () => {
                    validators.syncedParticleSpawner(tester.createPath(errorPath, "particles on-destroy"), particlesOnDestroy);
                });
            }

            if (obstacle.role !== undefined) {
                const role = obstacle.role;
                logger.indent("Validating role-specific fields", () => {
                    const roleName = ObstacleSpecialRoles[role] as keyof typeof ObstacleSpecialRoles;

                    tester.assert(
                        obstacle.rotationMode !== RotationMode.Full,
                        `An obstacle whose role is '${roleName}' cannot specify a rotation mode of 'Full'`,
                        errorPath
                    );

                    tester.runTestOnArray(
                        Object.keys(ObstacleSpecialRoles)
                            // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
                            .filter(k => Number.isNaN(+k)) as ReadonlyArray<keyof typeof ObstacleSpecialRoles & string>,
                        (key, errorPath) => {
                            const prop = `is${key}` as const;
                            const expected = role === ObstacleSpecialRoles[key];

                            tester.assert(
                                obstacle[prop] === expected || obstacle[prop] === undefined,
                                `An obstacle whose role is '${roleName}' should have property '${prop}' set to ${expected ? "true" : "false, or absent (undefined)"}`,
                                errorPath
                            );
                        },
                        errorPath
                    );

                    switch (role) {
                        case ObstacleSpecialRoles.Door: {
                            tester.assert(
                                obstacle.isDoor,
                                "An obstacle whose role is 'Door' must also have isDoor set to true",
                                errorPath
                            );

                            if (obstacle.operationStyle !== "slide") {
                                validators.vector(tester.createPath(errorPath, "hinge offset"), obstacle.hingeOffset);
                            } else {
                                tester.assertInBounds({
                                    obj: obstacle,
                                    field: "slideFactor",
                                    min: 0,
                                    max: 1,
                                    includeMin: true,
                                    includeMax: true,
                                    baseErrorPath: errorPath
                                });
                            }

                            tester.assertNoPointlessValue({
                                obj: obstacle,
                                field: "locked",
                                defaultValue: false,
                                baseErrorPath: errorPath
                            });

                            tester.assertNoPointlessValue({
                                obj: obstacle,
                                field: "openOnce",
                                defaultValue: false,
                                baseErrorPath: errorPath
                            });

                            tester.assertValidOrNPV({
                                obj: obstacle,
                                field: "animationDuration",
                                defaultValue: 0,
                                validatorIfPresent: (animationDuration, errorPath) => {
                                    tester.assertIsPositiveReal({
                                        value: animationDuration,
                                        errorPath
                                    });
                                },
                                baseErrorPath: errorPath
                            });

                            break;
                        }
                        case ObstacleSpecialRoles.Activatable: {
                            tester.assertNoPointlessValue({
                                obj: obstacle,
                                field: "noInteractMessage",
                                defaultValue: false,
                                baseErrorPath: errorPath
                            });

                            if (obstacle.sound) {
                                const errorPath2 = tester.createPath(errorPath, "sound");

                                if (obstacle.sound.maxRange !== undefined) {
                                    tester.assertIsPositiveReal({
                                        obj: obstacle.sound,
                                        field: "maxRange",
                                        baseErrorPath: errorPath2
                                    });
                                }

                                if (obstacle.sound.falloff !== undefined) {
                                    tester.assertIsPositiveReal({
                                        obj: obstacle.sound,
                                        field: "falloff",
                                        baseErrorPath: errorPath2
                                    });
                                }
                            }

                            if (obstacle.requiredItem !== undefined) {
                                tester.assertReferenceExists({
                                    obj: obstacle,
                                    field: "requiredItem",
                                    collection: Loots,
                                    collectionName: "Loots",
                                    baseErrorPath: errorPath
                                });
                            }

                            tester.assertNoPointlessValue({
                                obj: obstacle,
                                field: "emitParticles",
                                defaultValue: false,
                                baseErrorPath: errorPath
                            });

                            if (obstacle.replaceWith) {
                                const replacement = obstacle.replaceWith;
                                logger.indent("Validating replacement", () => {
                                    const errorPath2 = tester.createPath(errorPath, "replacement");

                                    const obstacles: Array<string | typeof NullString> = typeof replacement.idString === "string"
                                        ? [replacement.idString]
                                        : Object.keys(replacement.idString);

                                    tester.assertWarn(
                                        typeof replacement.idString === "object" && Object.keys(replacement.idString).length === 1,
                                        "Specifying a random obstacle is pointless if only one option is given",
                                        errorPath2
                                    );

                                    const {
                                        foundDupes,
                                        dupes
                                    } = findDupes(obstacles);

                                    tester.assertWarn(
                                        foundDupes,
                                        `Contained duplicate obstacle entries: ${Object.entries(dupes).map(([k, v]) => `'${k}' => ${v} times`).join("; ")}`,
                                        errorPath2
                                    );

                                    for (const idString of obstacles) {
                                        if (idString === NullString) continue;
                                        logger.indent(`Validating '${idString}'`, () => {
                                            tester.assertReferenceExists({
                                                value: idString,
                                                collection: Obstacles,
                                                collectionName: "Obstacles",
                                                errorPath: errorPath2
                                            });
                                        });
                                    }

                                    tester.assertIsPositiveFiniteReal({
                                        obj: replacement,
                                        field: "delay",
                                        baseErrorPath: errorPath2
                                    });
                                });
                            }
                            break;
                        }
                        case ObstacleSpecialRoles.Stair: {
                            tester.assert(
                                obstacle.activeEdges.high !== obstacle.activeEdges.low,
                                "Stair obstacle specified both high and low edge at the same spot",
                                errorPath
                            );

                            // invalid hitboxes shouldn't type-check, but this is more of a sanity check thing
                            const hitbox = obstacle.hitbox;
                            tester.assert(
                                hitbox.type === HitboxType.Rect || hitbox instanceof RectangleHitbox,
                                `Stair obstacle must have a rectangular hitbox (received hitbox of type ${HitboxType[hitbox.type] ?? hitbox.constructor?.name})`,
                                errorPath
                            );
                            break;
                        }
                    }
                });
            }
        });
    }
});

logger.indent("Validating scopes", () => {
    tester.assertNoDuplicateIDStrings(Scopes.definitions, "Scopes", "scopes");

    for (const scope of Scopes) {
        const errorPath = tester.createPath("scopes", `scope '${scope.idString}'`);

        logger.indent(`Validating scope '${scope.idString}'`, () => {
            tester.assertIsPositiveFiniteReal({
                obj: scope,
                field: "zoomLevel",
                baseErrorPath: errorPath
            });
        });
    }

    tester.assert(
        DEFAULT_SCOPE !== undefined,
        "Default scope is undefined (definitions list is empty)",
        tester.createPath("scopes")
    );
});

logger.indent("Validating skins", () => {
    tester.assertNoDuplicateIDStrings(Skins.definitions, "Skins", "skins");

    for (const skin of Skins) {
        logger.indent(`Validating skin '${skin.idString}'`, () => {
            const errorPath = tester.createPath("skins", `skin '${skin.idString}'`);

            if (skin.backpackTint !== undefined) {
                validators.color(tester.createPath(errorPath, "backpack tint"), skin.backpackTint);
            }

            if (skin.rolesRequired !== undefined) {
                tester.runTestOnArray(
                    skin.rolesRequired,
                    (role, errorPath) => {
                        tester.assertReferenceExistsObject({
                            value: role,
                            collection: Config.roles,
                            collectionName: "roles",
                            errorPath
                        });
                    },
                    errorPath
                );
            }
        });
    }
});

logger.indent("Validating synchronized particles", () => {
    tester.assertNoDuplicateIDStrings(SyncedParticles.definitions, "SynchedParticles", "synchedParticles");

    for (const syncedParticle of SyncedParticles) {
        logger.indent(`Validating synced particle '${syncedParticle.idString}'`, () => {
            const errorPath = tester.createPath("synched particles", `synced particle '${syncedParticle.idString}'`);

            const scale = syncedParticle.scale;
            logger.indent("Validating scaling", () => {
                const errorPath2 = tester.createPath(errorPath, "scale");

                const baseValidator = (errorPath: string, n: number): void => {
                    tester.assertIsFiniteRealNumber({
                        value: n,
                        errorPath
                    });
                };

                if (typeof scale === "object" && "start" in scale) {
                    validators.animated(
                        errorPath2,
                        scale,
                        baseValidator,
                        errorPath => tester.assertNoPointlessValue({
                            obj: scale,
                            field: "duration",
                            defaultValue: "lifetime",
                            baseErrorPath: errorPath
                        }),
                        errorPath => tester.assertNoPointlessValue({
                            obj: scale,
                            field: "easing",
                            defaultValue: "linear",
                            baseErrorPath: errorPath
                        })
                    );
                } else {
                    validators.valueSpecifier(
                        errorPath2,
                        scale,
                        baseValidator
                    );
                }
            });

            const alpha = syncedParticle.alpha;
            logger.indent("Validating opacity", () => {
                const errorPath2 = tester.createPath(errorPath, "alpha");

                const baseValidator = (errorPath: string, n: number): void => {
                    tester.assertInBounds({
                        value: n,
                        min: 0,
                        max: 1,
                        includeMin: true,
                        includeMax: true,
                        errorPath
                    });
                };

                if (typeof alpha === "object" && "start" in alpha) {
                    validators.animated(
                        errorPath2,
                        alpha,
                        baseValidator,
                        errorPath => tester.assertNoPointlessValue({
                            obj: alpha,
                            field: "duration",
                            defaultValue: "lifetime",
                            baseErrorPath: errorPath
                        }),
                        errorPath => tester.assertNoPointlessValue({
                            obj: alpha,
                            field: "easing",
                            defaultValue: "linear",
                            baseErrorPath: errorPath
                        })
                    );
                } else {
                    validators.valueSpecifier(
                        errorPath2,
                        alpha,
                        baseValidator
                    );
                }
            });

            const lifetime = syncedParticle.lifetime;
            validators.valueSpecifier(
                errorPath,
                lifetime,
                (errorPath, n) => {
                    tester.assertIsPositiveReal({
                        value: n,
                        errorPath
                    });
                }
            );

            logger.indent("Validating angular velocity", () => {
                const errorPath2 = tester.createPath(errorPath, "angular velocity");

                validators.valueSpecifier(
                    errorPath2,
                    syncedParticle.angularVelocity,
                    (errorPath, angVel) => {
                        tester.assertIsFiniteRealNumber({
                            value: angVel,
                            errorPath
                        });
                    }
                );
            });

            const velocity = syncedParticle.velocity;
            logger.indent("Validating velocity", () => {
                const errorPath2 = tester.createPath(errorPath, "velocity");

                const baseValidator = (errorPath: string, velocity: Vector): void => {
                    validators.vector(errorPath, velocity);
                };

                if (typeof velocity === "object" && "start" in velocity) {
                    validators.animated(
                        errorPath2,
                        velocity,
                        baseValidator,
                        errorPath => tester.assertNoPointlessValue({
                            obj: velocity,
                            field: "duration",
                            defaultValue: "lifetime",
                            baseErrorPath: errorPath
                        }),
                        errorPath => tester.assertNoPointlessValue({
                            obj: velocity,
                            field: "easing",
                            defaultValue: "linear",
                            baseErrorPath: errorPath
                        })
                    );
                } else {
                    validators.valueSpecifier(
                        errorPath2,
                        velocity,
                        baseValidator
                    );
                }
            });

            if (syncedParticle.variations !== undefined) {
                tester.assertIntAndInBounds({
                    obj: syncedParticle,
                    field: "variations",
                    min: 0,
                    max: 8,
                    includeMin: true,
                    baseErrorPath: errorPath
                });

                tester.assert(
                    syncedParticle.variationBits === Math.ceil(Math.ceil(syncedParticle.variations)),
                    `Invalid bit count (${syncedParticle.variationBits}) provided for number of variations (${syncedParticle.variations})`,
                    errorPath
                );
            }

            if (syncedParticle.tint !== undefined) {
                validators.color(tester.createPath(errorPath, "field tint"), syncedParticle.tint);
            }

            if (syncedParticle.hitbox !== undefined) {
                logger.indent("Validating hitbox", () => {
                    validators.hitbox(tester.createPath(errorPath, "hitbox"), syncedParticle.hitbox);
                });

                tester.assertWarn(
                    syncedParticle.snapScopeTo === undefined && syncedParticle.depletePerMs === undefined,
                    "This synced particle specified a hitbox, but nothing happens upon colliding with it",
                    errorPath
                );

                if (syncedParticle.snapScopeTo !== undefined) {
                    tester.assertReferenceExists({
                        obj: syncedParticle,
                        field: "snapScopeTo",
                        collection: Scopes,
                        collectionName: "Scopes",
                        baseErrorPath: errorPath
                    });
                }
            }
        });
    }
});

logger.indent("Validating throwables", () => {
    tester.assertNoDuplicateIDStrings(Throwables.definitions, "Throwables", "throwable");

    for (const throwable of Throwables) {
        const errorPath = tester.createPath("throwable", `throwable '${throwable.idString}'`);

        logger.indent(`Validating throwable '${throwable.idString}'`, () => {
            tester.assertIsFiniteRealNumber({
                obj: throwable,
                field: "fuseTime",
                baseErrorPath: errorPath
            });

            tester.assertIsFiniteRealNumber({
                obj: throwable,
                field: "cookTime",
                baseErrorPath: errorPath
            });

            tester.assertIsFiniteRealNumber({
                obj: throwable,
                field: "throwTime",
                baseErrorPath: errorPath
            });

            tester.assertIsFiniteRealNumber({
                obj: throwable,
                field: "cookSpeedMultiplier",
                baseErrorPath: errorPath
            });

            tester.assertInBounds({
                obj: throwable,
                field: "maxThrowDistance",
                min: 0,
                max: GameConstants.player.maxMouseDist,
                includeMin: true,
                includeMax: true,
                baseErrorPath: errorPath
            });

            logger.indent("Validating image", () => {
                const image = throwable.image;
                const errorPath2 = tester.createPath(errorPath, "image");

                validators.vector(
                    tester.createPath(errorPath2, "position"),
                    image.position
                );

                tester.assertValidOrNPV({
                    obj: image,
                    field: "angle",
                    defaultValue: 0,
                    validatorIfPresent: (angle, errorPath) => {
                        tester.assertIsFiniteRealNumber({
                            value: angle,
                            errorPath
                        });
                    },
                    baseErrorPath: errorPath2
                });

                tester.assertIsRealNumber({
                    obj: image,
                    field: "zIndex",
                    baseErrorPath: errorPath2
                });
            });

            tester.assertIsPositiveReal({
                obj: throwable,
                field: "speedCap",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: throwable,
                field: "hitboxRadius",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveReal({
                obj: throwable,
                field: "fireDelay",
                baseErrorPath: errorPath
            });

            logger.indent("Validating detonation", () => {
                const detonation = throwable.detonation;
                const errorPath2 = tester.createPath(errorPath, "detonation");

                if (detonation.explosion !== undefined) {
                    tester.assertReferenceExists({
                        obj: detonation,
                        field: "explosion",
                        collection: Explosions,
                        collectionName: "Explosions",
                        baseErrorPath: errorPath2
                    });
                }

                if (detonation.particles !== undefined) {
                    validators.syncedParticleSpawner(errorPath2, detonation.particles);
                }
            });

            logger.indent("Validating animations", () => {
                const animation = throwable.animation;
                const errorPath2 = tester.createPath(errorPath, "animations");

                logger.indent("Validating cooking animation", () => {
                    const cooking = animation.cook;
                    const errorPath3 = tester.createPath(errorPath2, "cooking");

                    validators.vector(tester.createPath(errorPath3, "left fist"), cooking.leftFist);
                    validators.vector(tester.createPath(errorPath3, "right fist"), cooking.rightFist);
                });

                logger.indent("Validating throwing animation", () => {
                    const throwing = animation.throw;
                    const errorPath3 = tester.createPath(errorPath2, "throwing");

                    validators.vector(tester.createPath(errorPath3, "left fist"), throwing.leftFist);
                    validators.vector(tester.createPath(errorPath3, "right fist"), throwing.rightFist);
                });
            });

            tester.assertIsRealNumber({
                obj: throwable,
                field: "impactDamage",
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: throwable as ThrowableDefinition & { readonly impactDamage: number },
                field: "obstacleMultiplier",
                defaultValue: 1,
                baseErrorPath: errorPath
            });

            if (throwable.impactDamage !== undefined) {
                tester.assertIsRealNumber({
                    obj: throwable,
                    field: "obstacleMultiplier",
                    baseErrorPath: errorPath
                });
            }

            tester.assertWarn(
                throwable.wearerAttributes !== undefined,
                "Wearer attributes on throwables have not been carefully implemented; results may range from unexpected to completely non-functional",
                errorPath
            );
        });
    }
});

/*

template for collections which are either ObjectDefinition[] or ObjectDefinitions instances

replace {collection variable} with the name of the variable holding the definitions
replace {collection name} with an appropriate name for the collection

code:

logger.indent("Validating {collection name}s", () => {
    tester.assertNoDuplicateIDStrings({collection variable} , "{collection variable}", "{collection name}");
    //                                                     ^ add a ".definitions" here if the collection in question is an instance of ObjectDefinitions

    for (const {collection name} of {collection variable}) {
        const errorPath = tester.createPath("{collection name}", `{collection name} '${{collection name}.idString}'`);

        logger.indent(`Validating {collection name} '${{collection name}.idString}'`, () => {
            // start writing here
        });
    }
});

*/

logger.indent("Validating configurations", () => {
    logger.indent("Validating server config", () => {
        const errorPath = tester.createPath("configs", "server config");

        tester.assertIsNaturalFiniteNumber({
            obj: ServerConfig,
            field: "port",
            baseErrorPath: errorPath
        });

        const [name] = ServerConfig.map.split(":") as [MapName, string[]];
        tester.assertReferenceExistsObject({
            value: name,
            collection: Maps,
            collectionName: "maps",
            errorPath
        });

        switch (ServerConfig.spawn.mode) {
            case SpawnMode.Radius: {
                tester.assertIsPositiveFiniteReal({
                    obj: ServerConfig.spawn,
                    field: "radius",
                    baseErrorPath: errorPath
                });

                const map = Maps[name];
                if (map !== undefined) {
                    validators.vector(
                        tester.createPath(errorPath, "spawn position"),
                        ServerConfig.spawn.position,
                        {
                            min: 0,
                            max: map.width,
                            includeMin: true,
                            includeMax: true
                        },
                        {
                            min: 0,
                            max: map.height,
                            includeMin: true,
                            includeMax: true
                        }
                    );
                }
                break;
            }
            case SpawnMode.Fixed: {
                const map = Maps[name];
                if (map !== undefined) {
                    validators.vector(
                        tester.createPath(errorPath, "spawn position"),
                        ServerConfig.spawn.position,
                        {
                            min: 0,
                            max: map.width,
                            includeMin: true,
                            includeMax: true
                        },
                        {
                            min: 0,
                            max: map.height,
                            includeMin: true,
                            includeMax: true
                        }
                    );
                }
                break;
            }
            case SpawnMode.Normal:
            case SpawnMode.Center:
            default:
                break;
        }

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

        if (ServerConfig.gas.mode === GasMode.Debug) {
            tester.assertNoPointlessValue({
                obj: ServerConfig.gas,
                field: "overridePosition",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveReal({
                obj: ServerConfig.gas,
                field: "overrideDuration",
                baseErrorPath: errorPath
            });
        }

        if (ServerConfig.protection) {
            const protection = ServerConfig.protection;
            logger.indent("Validating protection settings", () => {
                const errorPath2 = tester.createPath(errorPath, "protection settings");

                tester.assertValidOrNPV({
                    obj: protection,
                    field: "maxSimultaneousConnections",
                    defaultValue: Infinity,
                    validatorIfPresent: (maxSimultaneousConnections, errorPath) => {
                        tester.assertIsNaturalFiniteNumber({
                            value: maxSimultaneousConnections,
                            errorPath
                        });
                    },
                    baseErrorPath: errorPath2
                });

                if (protection.maxJoinAttempts) {
                    const errorPath3 = tester.createPath(errorPath2, "max join attempts");

                    tester.assertIsNaturalFiniteNumber({
                        obj: protection.maxJoinAttempts,
                        field: "count",
                        baseErrorPath: errorPath3
                    });

                    tester.assertIsPositiveFiniteReal({
                        obj: protection.maxJoinAttempts,
                        field: "duration",
                        baseErrorPath: errorPath3
                    });
                }

                tester.assertIsPositiveReal({
                    obj: protection,
                    field: "refreshDuration",
                    baseErrorPath: errorPath2
                });
            });
        }

        logger.indent("Validating roles", () => {
            for (const [name, role] of Object.entries(ServerConfig.roles)) {
                logger.indent(`Validating role '${name}'`, () => {
                    const errorPath2 = tester.createPath(errorPath, "roles", `role '${name}'`);

                    tester.assertNoPointlessValue({
                        obj: role,
                        field: "isDev",
                        defaultValue: false,
                        baseErrorPath: errorPath2
                    });
                });
            }
        });

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

const { fatalErrors, errors, warnings } = tester;
const flags = process.argv.slice(2);

const [
    warningsAsErrors,
    printTop,
    printBottom,
    noDetails
] = [
    flags.includes("-Werror"),
    flags.includes("-print-top"),
    flags.includes("-print-bottom"),
    flags.includes("-no-details")
];

const exitCode = +(
    fatalErrors.length > 0
    || errors.length > 0
    || (warningsAsErrors && warnings.length > 0)
);

const wErrorText = warningsAsErrors ? ` ${styleText("(treated as errors)", ColorStyles.foreground.red.bright)}` : "";

const fatalErrorText = fatalErrors.length
    ? styleText(
        `${fatalErrors.length} fatal error${fatalErrors.length === 1 ? "" : "s"}`,
        ColorStyles.background.magenta.normal, FontStyles.bold, FontStyles.underline, FontStyles.italic
    )
    : "";

const errorText = errors.length
    ? styleText(
        `${errors.length} error${errors.length === 1 ? "" : "s"}`,
        ColorStyles.foreground.red.bright, FontStyles.bold, FontStyles.underline
    )
    : styleText(
        "no errors",
        ColorStyles.foreground.green.bright, FontStyles.bold, FontStyles.underline
    );

const warningText = warnings.length
    ? styleText(
        `${warnings.length} warning${warnings.length === 1 ? "" : "s"}${wErrorText}`,
        ColorStyles.foreground.yellow.bright, FontStyles.underline
    )
    : styleText(
        "no warnings",
        ColorStyles.foreground.green.bright, FontStyles.bold, FontStyles.underline
    );

const testRuntime = Date.now() - testStart;

const join = (...ele: ReadonlyArray<string | undefined>): string => {
    return ele
        .filter(((e?: string) => e) as unknown as (e?: string) => e is string)
        .map((v, i, a) => `${v}${i !== a.length - 1 ? ", " : ""}${i === a.length - 2 ? "and " : ""}`)
        .join("");
};

function printResults(): void {
    console.log(`Validation finished with ${join(fatalErrorText, errorText, warningText)}.`);

    fatalErrors.forEach(([path, message]) => {
        console.log(`${styleText(
            path,
            ColorStyles.background.magenta.normal, FontStyles.bold, FontStyles.underline, FontStyles.italic
        )}: ${styleText(message, FontStyles.italic, FontStyles.bold)}`);
    });

    errors.forEach(([path, message]) => {
        console.log(`${styleText(
            path,
            ColorStyles.foreground.red.bright, FontStyles.bold, FontStyles.underline
        )}: ${styleText(message, FontStyles.bold)}`);
    });

    warnings.forEach(([path, message]) => {
        console.log(`${styleText(
            path,
            ColorStyles.foreground.yellow.bright, FontStyles.underline
        )}: ${styleText(message, FontStyles.italic)}`);
    });

    console.log(`Runtime: ${testRuntime}ms`);
}

if (noDetails) {
    printResults();
} else {
    if (printTop || !printBottom) {
        printResults();
    }

    console.log("\nDetails:");
    logger.print();

    if (printBottom) {
        printResults();
    }
}

process.exit(exitCode);
