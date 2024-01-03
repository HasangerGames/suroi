import { Config as ClientConfig } from "../../client/src/scripts/config";
import { FireMode } from "../../common/src/constants";
import { Ammos } from "../../common/src/definitions/ammos";
import { Armors } from "../../common/src/definitions/armors";
import { Backpacks } from "../../common/src/definitions/backpacks";
import { Buildings } from "../../common/src/definitions/buildings";
import { Bullets } from "../../common/src/definitions/bullets";
import { Decals } from "../../common/src/definitions/decals";
import { Emotes } from "../../common/src/definitions/emotes";
import { Explosions } from "../../common/src/definitions/explosions";
import { Guns, type DualGunNarrowing, type SingleGunNarrowing } from "../../common/src/definitions/guns";
import { HealingItems } from "../../common/src/definitions/healingItems";
import { Loots } from "../../common/src/definitions/loots";
import { Melees } from "../../common/src/definitions/melees";
import { Modes } from "../../common/src/definitions/modes";
import { Obstacles, RotationMode } from "../../common/src/definitions/obstacles";
import { Scopes } from "../../common/src/definitions/scopes";
import { Skins } from "../../common/src/definitions/skins";
import { Throwables } from "../../common/src/definitions/throwables";
import { ColorStyles, FontStyles, styleText } from "../../common/src/utils/ansiColoring";
import { ObstacleSpecialRoles, type InventoryItemDefinition, type ObjectDefinition, type WearerAttributes } from "../../common/src/utils/objectDefinitions";
import { FloorTypes } from "../../common/src/utils/terrain";
import { Config, GasMode, Config as ServerConfig, SpawnMode } from "../../server/src/config";
import { GasStages } from "../../server/src/data/gasStages";
import { LootTables, LootTiers } from "../../server/src/data/lootTables";
import { Maps } from "../../server/src/data/maps";
import { logger, tester, validators } from "./validationUtils";

/*
    eslint-disable

    @typescript-eslint/unbound-method,
    object-shorthand
*/

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

                    tester.runTestOnArray(
                        lootData.loot.flat(),
                        (entry, errorPath) => {
                            validators.weightedItem(errorPath, entry);
                        },
                        errorPath2
                    );
                });
            });
        }
    });

    logger.indent("Validating loot tiers", () => {
        for (const [name, lootTierData] of Object.entries(LootTiers)) {
            logger.indent(`Validating tier '${name}'`, () => {
                const errorPath = tester.createPath("loot table references", "loot tiers", `tier '${name}'`);

                tester.runTestOnArray(
                    lootTierData,
                    (entry, errorPath) => {
                        validators.weightedItem(errorPath, entry);
                    },
                    errorPath
                );
            });
        }
    });
});

logger.indent("Validating map definitions", () => {
    for (const [name, definition] of Object.entries(Maps)) {
        logger.indent(`Validating map '${name}'`, () => {
            const errorPath = tester.createPath("maps", `map '${name}'`);

            tester.assertIsPositiveFiniteReal({
                obj: definition,
                field: "width",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: definition,
                field: "height",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: definition,
                field: "oceanSize",
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: definition,
                field: "beachSize",
                baseErrorPath: errorPath
            });

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
                field: "loots",
                defaultValue: {},
                equalityFunction: a => Object.keys(a).length === 0,
                baseErrorPath: errorPath
            });

            if (definition.loots) {
                const errorPath2 = tester.createPath(errorPath, "loots");

                logger.indent("Validating loots", () => {
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
                        definition.places!.length >= 1 << 4,
                        `Only the first 16 place names are sent; this map provided ${definition.places!.length} names`,
                        errorPath
                    );

                    tester.runTestOnArray(
                        definition.places!,
                        (place, errorPath) => {
                            validators.vector(errorPath, place.position);

                            tester.assertWarn(
                                place.name.length > 24,
                                `Place names are limited to 24 characters long, and extra characters will not be sent; received a place name containing ${place.name.length} characters`,
                                errorPath
                            );
                        },
                        errorPath
                    );
                });
            }
        });
    }
});

// suck it
// eslint-disable-next-line no-inner-declarations
function validateWearerAttributes(baseErrorPath: string, definition: InventoryItemDefinition): void {
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
                                tester.createPath(baseErrorPath, "wearer attributes", "kill", "damageDealt")
                            );
                        });
                    }
                });
            }
        });
    }
}

logger.indent("Validating ammo types", () => {
    tester.assertNoDuplicateIDStrings(Ammos.definitions, "Ammos", "ammos");

    for (const ammo of Ammos) {
        logger.indent(`Validating ammo '${ammo.idString}'`, () => {
            const errorPath = tester.createPath("ammos", `ammo ${ammo.idString}`);

            tester.assertNoPointlessValue({
                obj: ammo,
                field: "noDrop",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: ammo,
                field: "hideUnlessPresent",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertNoPointlessValue({
                obj: ammo,
                field: "ephemeral",
                defaultValue: false,
                baseErrorPath: errorPath
            });
        });
    }
});

logger.indent("Validating armor definitions", () => {
    tester.assertNoDuplicateIDStrings(Armors.definitions, "Armors", "armors");

    const errorPath = tester.createPath("armors");

    tester.assertNoDuplicateIDStrings(Armors.definitions, "Helmets", errorPath);
    for (const armor of Armors) {
        logger.indent(`Validating '${armor.idString}'`, () => {
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

            logger.indent("Validating maximum capacities", () => {
                const errorPath2 = tester.createPath(errorPath, "maximum capacities");

                for (const [item] of Object.entries(backpack.maxCapacity)) {
                    tester.assertReferenceExistsArray({
                        obj: { [item]: item },
                        field: item,
                        baseErrorPath: errorPath2,
                        collection: (HealingItems.definitions as ObjectDefinition[]).concat(Ammos.definitions).concat(Throwables),
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

logger.indent("Validating building definitions", () => {
    tester.assertNoDuplicateIDStrings(Buildings.definitions, "Buildings", "buildings");

    for (const building of Buildings) {
        logger.indent(`Validating '${building.idString}'`, () => {
            const errorPath = tester.createPath("buildings", `building '${building.idString}'`);

            validators.hitbox(errorPath, building.spawnHitbox);
            if (building.ceilingHitbox) validators.hitbox(errorPath, building.ceilingHitbox);
            if (building.scopeHitbox) validators.hitbox(errorPath, building.scopeHitbox);

            tester.assertNoPointlessValue({
                obj: building,
                field: "hideOnMap",
                defaultValue: false,
                baseErrorPath: errorPath
            });

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

                    tester.runTestOnArray(
                        building.obstacles!,
                        (obstacle, errorPath) => {
                            for (
                                const idString of (
                                    typeof obstacle.idString === "string"
                                        ? [obstacle.idString]
                                        : Object.keys(obstacle.idString)
                                )
                            ) {
                                logger.indent(`Validating '${idString}'`, () => {
                                    tester.assertReferenceExists({
                                        obj: { idString },
                                        field: "idString",
                                        collection: Obstacles,
                                        baseErrorPath: errorPath
                                    });

                                    validators.vector(errorPath, obstacle.position);

                                    if (obstacle.rotation) {
                                        const reference = Obstacles.fromString(idString);

                                        if (reference) {
                                            const rotationMode = typeof obstacle.idString === "string" ? reference.rotationMode : RotationMode.Full;

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
                                                    tester.assertIntAndInBounds({
                                                        obj: obstacle,
                                                        field: "rotation",
                                                        baseErrorPath: errorPath,
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
                                                        baseErrorPath: errorPath,
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
                                                        baseErrorPath: errorPath,
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

                                    if (obstacle.variation !== undefined) {
                                        const def = Obstacles.fromString(idString);

                                        if (def) {
                                            if (def.variations === undefined) {
                                                tester.assert(
                                                    false,
                                                    `Cannot specify a variant of an obstacle that has no variations (Obstacle '${idString}' has no variations)`,
                                                    errorPath
                                                );
                                            } else {
                                                tester.assertIntAndInBounds({
                                                    obj: obstacle,
                                                    field: "variation",
                                                    min: 0,
                                                    max: def.variations - 1,
                                                    baseErrorPath: errorPath
                                                });
                                            }
                                        }
                                    }

                                    tester.assertNoPointlessValue({
                                        obj: obstacle,
                                        field: "scale",
                                        defaultValue: 1,
                                        baseErrorPath: errorPath
                                    });

                                    if (obstacle.scale) {
                                        tester.assertIsPositiveFiniteReal({
                                            obj: obstacle,
                                            field: "scale",
                                            baseErrorPath: errorPath
                                        });
                                    }

                                    if (obstacle.lootSpawnOffset) {
                                        validators.vector(errorPath, obstacle.lootSpawnOffset);
                                    }
                                });
                            }
                        },
                        errorPath2
                    );
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

                    tester.runTestOnArray(
                        building.lootSpawners!,
                        (spawner, errorPath) => {
                            validators.vector(errorPath2, spawner.position);

                            tester.assertReferenceExistsObject({
                                obj: spawner,
                                field: "table",
                                collection: LootTables,
                                collectionName: "LootTables",
                                baseErrorPath: errorPath
                            });
                        },
                        errorPath2
                    );
                });
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "subBuildings",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.subBuildings?.length) {
                logger.indent("Validating sub-buildings", () => {
                    const errorPath2 = tester.createPath(errorPath, "sub-buildings");

                    tester.runTestOnArray(
                        building.subBuildings!,
                        (subBuilding, errorPath) => {
                            for (
                                const idString of (
                                    typeof subBuilding.idString === "string"
                                        ? [subBuilding.idString]
                                        : Object.keys(subBuilding.idString)
                                )
                            ) {
                                logger.indent(`Validating '${idString}'`, () => {
                                    tester.assertReferenceExists({
                                        obj: { idString },
                                        field: "idString",
                                        collection: Buildings,
                                        baseErrorPath: errorPath
                                    });
                                });
                            }

                            validators.vector(errorPath, subBuilding.position);

                            tester.assertNoPointlessValue({
                                obj: subBuilding,
                                field: "orientation",
                                defaultValue: 0,
                                baseErrorPath: errorPath
                            });
                        },
                        errorPath2
                    );
                });
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "decals",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.decals?.length) {
                logger.indent("Validating decals", () => {
                    const errorPath2 = tester.createPath(errorPath, "decals");
                    tester.runTestOnArray(
                        building.decals!,
                        (decal, errorPath) => {
                            tester.assertReferenceExists({
                                obj: decal,
                                field: "idString",
                                collection: Decals,
                                baseErrorPath: errorPath
                            });

                            validators.vector(errorPath, decal.position);

                            tester.assertNoPointlessValue({
                                obj: decal,
                                field: "orientation",
                                defaultValue: 0,
                                baseErrorPath: errorPath
                            });

                            tester.assertNoPointlessValue({
                                obj: decal,
                                field: "scale",
                                defaultValue: 1,
                                baseErrorPath: errorPath
                            });

                            if (decal.scale !== undefined) {
                                tester.assertIsFiniteRealNumber({
                                    obj: decal,
                                    field: "scale",
                                    baseErrorPath: errorPath
                                });
                            }
                        },
                        errorPath2
                    );
                });
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "floorImages",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.floorImages?.length) {
                tester.runTestOnArray(
                    building.floorImages,
                    (image, errorPath) => {
                        validators.vector(errorPath, image.position);
                    },
                    tester.createPath(errorPath, "floor images")
                );
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "ceilingImages",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.ceilingImages?.length) {
                tester.runTestOnArray(
                    building.ceilingImages,
                    (image, errorPath) => {
                        validators.vector(errorPath, image.position);
                    },
                    tester.createPath(errorPath, "ceiling images")
                );
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
                field: "floors",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.floors?.length) {
                tester.runTestOnArray(
                    building.floors,
                    (floor, errorPath) => {
                        validators.hitbox(errorPath, floor.hitbox);

                        tester.assertReferenceExistsObject({
                            obj: floor,
                            field: "type",
                            collection: FloorTypes,
                            baseErrorPath: errorPath,
                            collectionName: "Floors"
                        });
                    },
                    tester.createPath(errorPath, "floors")
                );
            }

            tester.assertNoPointlessValue({
                obj: building,
                field: "groundGraphics",
                defaultValue: [],
                equalityFunction: a => a.length === 0,
                baseErrorPath: errorPath
            });

            if (building.groundGraphics?.length) {
                tester.runTestOnArray(
                    building.groundGraphics,
                    (graphic, errorPath) => {
                        validators.hitbox(errorPath, graphic.hitbox);

                        tester.assertIntAndInBounds({
                            obj: graphic,
                            baseErrorPath: errorPath,
                            field: "color",
                            max: 0xffffff,
                            min: 0,
                            includeMax: true,
                            includeMin: true
                        });
                    },
                    tester.createPath(errorPath, "ground graphics")
                );
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

            tester.assertNoPointlessValue({
                obj: decal,
                field: "scale",
                defaultValue: 1,
                baseErrorPath: errorPath
            });

            if (decal.scale !== undefined) {
                tester.assertIsFiniteRealNumber({
                    obj: decal,
                    field: "scale",
                    baseErrorPath: errorPath
                });
            }

            tester.assertNoPointlessValue({
                obj: decal,
                field: "rotationMode",
                defaultValue: RotationMode.Limited,
                baseErrorPath: errorPath
            });

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

                tester.assertInBounds({
                    obj: explosion.radius,
                    field: "min",
                    min: 0,
                    max: explosion.radius.max,
                    includeMin: true,
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

            tester.assertIsNaturalFiniteNumber({
                obj: explosion,
                field: "shrapnelCount",
                baseErrorPath: errorPath
            });

            logger.indent("Validating ballistics", () => {
                const errorPath2 = tester.createPath(errorPath, "ballistics");
                validators.ballistics(errorPath2, explosion.ballistics);
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
                collection: Ammos.definitions,
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

            if (gun.isDual) {
                logger.indent("Validating dual attributes", () => {
                    const errorPath2 = tester.createPath(errorPath, "dual properties");

                    tester.assertIsPositiveFiniteReal({
                        obj: gun,
                        field: "leftRightOffset",
                        baseErrorPath: errorPath2
                    });

                    tester.assertReferenceExistsArray({
                        obj: gun,
                        field: "singleVariant",
                        collection: Guns,
                        collectionName: "Guns",
                        baseErrorPath: errorPath2
                    });

                    const singleDualPtr = Loots.fromString<SingleGunNarrowing>(gun.singleVariant)?.dualVariant;
                    tester.assert(
                        singleDualPtr === gun.idString,
                        `This gun specified weapon '${gun.dualVariant}' as its single form, but that weapon ${singleDualPtr === undefined ? "doesn't exist" : `specified its dual form as being '${singleDualPtr}'`}`,
                        errorPath2
                    );
                });
            } else {
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

                    if (!gun.isDual) {
                        validators.vector(errorPath2, gun.image.position);
                    }

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
                            baseErrorPath: errorPath2
                        });

                        if (casings.count !== undefined) {
                            tester.assertIsPositiveFiniteReal({
                                obj: casings,
                                field: "count",
                                baseErrorPath: errorPath2
                            });
                        }

                        tester.assertNoPointlessValue({
                            obj: casings,
                            field: "spawnOnReload",
                            defaultValue: false,
                            baseErrorPath: errorPath2
                        });

                        tester.assertNoPointlessValue({
                            obj: casings,
                            field: "ejectionDelay",
                            defaultValue: 0,
                            baseErrorPath: errorPath2
                        });

                        if (casings.ejectionDelay !== undefined) {
                            tester.assertIsPositiveFiniteReal({
                                obj: casings,
                                field: "ejectionDelay",
                                baseErrorPath: errorPath2
                            });
                        }

                        tester.assertNoPointlessValue({
                            obj: casings,
                            field: "velocity",
                            defaultValue: {},
                            equalityFunction: a => Object.keys(a).length === 0,
                            baseErrorPath: errorPath2
                        });

                        if (casings.velocity) {
                            logger.indent("Validating casing velocities", () => {
                                const velocity = casings.velocity!;

                                tester.assertNoPointlessValue({
                                    obj: velocity,
                                    field: "x",
                                    defaultValue: {},
                                    equalityFunction: a => Object.keys(a).length === 0,
                                    baseErrorPath: errorPath2
                                });

                                if (velocity.x) {
                                    tester.assertInBounds({
                                        obj: velocity.x,
                                        field: "min",
                                        min: -Infinity,
                                        max: velocity.x.max,
                                        includeMin: false,
                                        baseErrorPath: errorPath2
                                    });

                                    tester.assertInBounds({
                                        obj: velocity.x,
                                        field: "max",
                                        min: velocity.x.min,
                                        max: Infinity,
                                        includeMax: false,
                                        baseErrorPath: errorPath2
                                    });

                                    tester.assertNoPointlessValue({
                                        obj: velocity.x,
                                        field: "randomSign",
                                        defaultValue: false,
                                        baseErrorPath: errorPath2
                                    });
                                }

                                tester.assertNoPointlessValue({
                                    obj: velocity,
                                    field: "y",
                                    defaultValue: {},
                                    equalityFunction: a => Object.keys(a).length === 0,
                                    baseErrorPath: errorPath2
                                });

                                if (velocity.y) {
                                    tester.assertInBounds({
                                        obj: velocity.y,
                                        field: "min",
                                        min: -Infinity,
                                        max: velocity.y.max,
                                        includeMin: false,
                                        baseErrorPath: errorPath2
                                    });

                                    tester.assertInBounds({
                                        obj: velocity.y,
                                        field: "max",
                                        min: velocity.y.min,
                                        max: Infinity,
                                        includeMax: false,
                                        baseErrorPath: errorPath2
                                    });

                                    tester.assertNoPointlessValue({
                                        obj: velocity.y,
                                        field: "randomSign",
                                        defaultValue: false,
                                        baseErrorPath: errorPath2
                                    });
                                }
                            });
                        }
                    });
                }
            }

            tester.assertNoPointlessValue({
                obj: gun,
                field: "dualVariant",
                defaultValue: "",
                baseErrorPath: errorPath
            });

            if (gun.dualVariant) {
                tester.assertReferenceExistsArray({
                    obj: gun,
                    field: "dualVariant",
                    collection: Guns,
                    collectionName: "Guns",
                    baseErrorPath: errorPath
                });

                const dualSinglePtr: string | undefined = Loots.fromString<DualGunNarrowing>(gun.dualVariant)?.singleVariant;
                tester.assert(
                    dualSinglePtr === gun.idString,
                    `This gun specified weapon '${gun.dualVariant}' as its dual form, but that weapon ${dualSinglePtr === undefined ? "doesn't exist" : `specified its single form as being '${dualSinglePtr}'`}`,
                    errorPath
                );
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
    tester.assertNoDuplicateIDStrings(HealingItems.definitions, "HealingItems", "healing items");

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

                validators.vector(errorPath2, fists.left);
                validators.vector(errorPath2, fists.right);

                validators.vector(errorPath2, fists.useLeft);
                validators.vector(errorPath2, fists.useRight);
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

                    tester.assertNoPointlessValue({
                        obj: image,
                        field: "separateWorldImage",
                        defaultValue: false,
                        baseErrorPath: errorPath
                    });
                });
            }

            validateWearerAttributes(errorPath, melee);
        });
    }
});

logger.indent("Validating modes", () => {
    tester.assertNoDuplicateIDStrings(Modes, "Modes", "modes");

    for (const mode of Modes) {
        logger.indent(`Validating mode '${mode.idString}'`, () => {
            const errorPath = tester.createPath("modes", `mode '${mode.idString}'`);

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

                if (obstacle.scale) {
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
                }
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
                tester.assertIsNaturalFiniteNumber({
                    obj: obstacle,
                    field: "particleVariations",
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
                obstacle.noResidue === true && obstacle.frames?.residue !== undefined,
                `Obstacle '${obstacle.idString}' specified a residue image, but also specified the 'noResidue' attribute.`,
                errorPath
            );

            tester.assertWarn(
                obstacle.invisible === true && obstacle.frames?.base !== undefined,
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
    tester.assertNoDuplicateIDStrings(Scopes.definitions, "Scopes", "scopes");

    for (const scope of Scopes) {
        const errorPath = tester.createPath("scopes", `scope '${scope.idString}'`);

        logger.indent(`Validating scope '${scope.idString}'`, () => {
            tester.assertNoPointlessValue({
                obj: scope,
                field: "noDrop",
                defaultValue: false,
                baseErrorPath: errorPath
            });

            tester.assertIsPositiveFiniteReal({
                obj: scope,
                field: "zoomLevel",
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
    tester.assertNoDuplicateIDStrings(Skins.definitions, "Skins", "skins");

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

        tester.assertIsNaturalFiniteNumber({
            obj: ServerConfig,
            field: "port",
            baseErrorPath: errorPath
        });

        tester.assertReferenceExistsObject({
            obj: ServerConfig,
            field: "mapName",
            collection: Maps,
            collectionName: "maps",
            baseErrorPath: errorPath
        });

        switch (ServerConfig.spawn.mode) {
            case SpawnMode.Normal: {
                // nothing to do
                break;
            }
            case SpawnMode.Random: {
                // nothing to do
                break;
            }
            case SpawnMode.Center: {
                // nothing to do
                break;
            }
            case SpawnMode.Radius: {
                tester.assertIsFiniteRealNumber({
                    obj: ServerConfig.spawn,
                    field: "radius",
                    baseErrorPath: errorPath
                });
                break;
            }
            case SpawnMode.Fixed: {
                const map = Maps[ServerConfig.mapName];

                validators.vector(
                    errorPath,
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
                break;
            }
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

        switch (ServerConfig.gas.mode) {
            case GasMode.Normal: {
                // nothing to do
                break;
            }
            case GasMode.Debug: {
                tester.assertIsPositiveReal({
                    obj: ServerConfig.gas,
                    field: "overrideDuration",
                    baseErrorPath: errorPath
                });
                break;
            }
            case GasMode.Disabled: {
                // nothing to do
                break;
            }
        }

        tester.assertIsPositiveFiniteReal({
            obj: ServerConfig,
            field: "movementSpeed",
            baseErrorPath: errorPath
        });

        if (ServerConfig.protection) {
            logger.indent("Validating protection settings", () => {
                const protection = ServerConfig.protection!;
                const errorPath2 = tester.createPath(errorPath, "protection settings");

                tester.assertNoPointlessValue({
                    obj: protection,
                    field: "maxSimultaneousConnections",
                    defaultValue: Infinity,
                    baseErrorPath: errorPath2
                });

                if (protection.maxSimultaneousConnections !== undefined) {
                    tester.assertIsNaturalFiniteNumber({
                        obj: protection,
                        field: "maxSimultaneousConnections",
                        baseErrorPath: errorPath2
                    });
                }

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

        logger.indent("Validating roles", () => {
            for (const [name, role] of Object.entries(ServerConfig.roles)) {
                logger.indent(`Validating role '${name}'`, () => {
                    const errorPath2 = tester.createPath(errorPath, "roles", `role '${name}'`);

                    tester.assertNoPointlessValue({
                        obj: role,
                        field: "noPrivileges",
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

const testRuntime = Date.now() - testStart;
console.log(`Validation took ${testRuntime}ms`);
process.exit(exitCode);
