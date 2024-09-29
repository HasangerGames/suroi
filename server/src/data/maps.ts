import { type WebSocket } from "uWebSockets.js";

import { Buildings, type BuildingDefinition } from "@common/definitions/buildings";
import { Loots } from "@common/definitions/loots";
import { Obstacles, RotationMode, type ObstacleDefinition } from "@common/definitions/obstacles";
import { Orientation, type Variation } from "@common/typings";
import { Collision } from "@common/utils/math";
import { ItemType, MapObjectSpawnMode, type ReferenceTo } from "@common/utils/objectDefinitions";
import { random, randomFloat } from "@common/utils/random";
import { Vec, type Vector } from "@common/utils/vector";

import { type GunItem } from "../inventory/gunItem";
import { GameMap } from "../map";
import { Player, type PlayerContainer } from "../objects/player";
import { LootTables } from "./lootTables";
import { Layer } from "@common/constants";
import { Guns } from "@common/definitions";
import { CircleHitbox } from "@common/utils/hitbox";
import { getLootTableLoot } from "../utils/misc";

export interface MapDefinition {
    readonly width: number
    readonly height: number
    readonly oceanSize: number
    readonly beachSize: number
    readonly rivers?: {
        readonly minAmount: number
        readonly maxAmount: number
        readonly maxWideAmount: number
        readonly wideChance: number
        readonly minWidth: number
        readonly maxWidth: number
        readonly minWideWidth: number
        readonly maxWideWidth: number
    }

    readonly bridges?: ReadonlyArray<ReferenceTo<BuildingDefinition>>
    readonly majorBuildings?: ReadonlyArray<ReferenceTo<BuildingDefinition>>
    readonly buildings?: Record<ReferenceTo<BuildingDefinition>, number>
    readonly quadBuildingLimit?: Record<ReferenceTo<BuildingDefinition>, number>
    readonly obstacles?: Record<ReferenceTo<ObstacleDefinition>, number>
    readonly obstacleClumps?: readonly ObstacleClump[]
    readonly loots?: Record<keyof typeof LootTables, number>

    readonly places?: ReadonlyArray<{
        readonly name: string
        readonly position: Vector
    }>

    readonly onGenerate?: (map: GameMap, params: string[]) => void
}

export type ObstacleClump = {
    /**
     * How many of these clumps per map
     */
    readonly clumpAmount: number
    /**
     * Data for any given clump
     */
    readonly clump: {
        /**
         * Id's of obstacles that may appear in the clump
         */
        readonly obstacles: ReadonlyArray<ReferenceTo<ObstacleDefinition>>
        readonly minAmount: number
        readonly maxAmount: number
        readonly radius: number
        readonly jitter: number
    }
};

const maps = {
    main: {
        width: 1632,
        height: 1632,
        oceanSize: 128,
        beachSize: 32,
        rivers: {
            minAmount: 2,
            maxAmount: 3,
            maxWideAmount: 1,
            wideChance: 0.35,
            minWidth: 12,
            maxWidth: 18,
            minWideWidth: 25,
            maxWideWidth: 30
        },
        buildings: {
            large_bridge: 2,
            small_bridge: Infinity,
            port_complex: 1,
            sea_traffic_control: 1,
            tugboat_red: 1,
            tugboat_white: 5,
            armory: 1,
            headquarters: 1,
            small_bunker: 1,
            refinery: 1,
            warehouse: 5,
            // firework_warehouse: 1, // birthday mode
            green_house: 3,
            blue_house: 3,
            red_house: 3,
            red_house_v2: 3,
            construction_site: 1,
            mobile_home: 10,
            porta_potty: 12,
            container_3: 2,
            container_4: 2,
            container_5: 2,
            container_6: 2,
            container_7: 1,
            container_8: 2,
            container_9: 1,
            container_10: 2
        },
        majorBuildings: ["armory", "refinery", "port_complex", "headquarters"],
        quadBuildingLimit: {
            red_house: 1,
            red_house_v2: 1,
            warehouse: 2,
            green_house: 1,
            blue_house: 1,
            mobile_home: 3,
            porta_potty: 3,
            construction_site: 1
        },
        obstacles: {
            oil_tank: 12,
            // christmas_tree: 1, // winter mode
            oak_tree: 100,
            birch_tree: 20,
            pine_tree: 10,
            loot_tree: 1,
            regular_crate: 160,
            flint_crate: 5,
            aegis_crate: 5,
            grenade_crate: 35,
            rock: 150,
            river_chest: 1,
            river_rock: 45,
            bush: 110,
            // birthday_cake: 100, // birthday mode
            lily_pad: 20,
            blueberry_bush: 30,
            barrel: 80,
            viking_chest: 1,
            super_barrel: 30,
            melee_crate: 1,
            gold_rock: 1,
            loot_barrel: 1,
            flint_stone: 1
        },
        obstacleClumps: [
            {
                clumpAmount: 100,
                clump: {
                    minAmount: 2,
                    maxAmount: 3,
                    jitter: 5,
                    obstacles: ["oak_tree"],
                    radius: 12
                }
            },
            {
                clumpAmount: 25,
                clump: {
                    minAmount: 2,
                    maxAmount: 3,
                    jitter: 5,
                    obstacles: ["birch_tree"],
                    radius: 12
                }
            },
            {
                clumpAmount: 4,
                clump: {
                    minAmount: 2,
                    maxAmount: 3,
                    jitter: 5,
                    obstacles: ["pine_tree"],
                    radius: 12
                }
            }
        ],
        loots: {
            ground_loot: 60
        },
        places: [
            { name: "Banana", position: Vec.create(0.23, 0.2) },
            { name: "Takedown", position: Vec.create(0.23, 0.8) },
            { name: "Lavlandet", position: Vec.create(0.75, 0.2) },
            { name: "Noskin Narrows", position: Vec.create(0.72, 0.8) },
            { name: "Mt. Sanger", position: Vec.create(0.5, 0.35) },
            { name: "Deepwood", position: Vec.create(0.5, 0.65) }
        ]
    },
    fall: {
        width: 1632,
        height: 1632,
        oceanSize: 128,
        beachSize: 32,
        rivers: {
            minAmount: 2,
            maxAmount: 2,
            wideChance: 0.35,
            minWidth: 12,
            maxWidth: 18,
            minWideWidth: 25,
            maxWideWidth: 28
        },
        buildings: {
            small_bridge: Infinity,
            sea_traffic_control: 1,
            //    small_bunker: 1,
            construction_site: 1,
            barn: 3,
            porta_potty: 6,
            warehouse: 4
        },
        quadBuildingLimit: {
            barn: 2,
            warehouse: 2,
            porta_potty: 3
        },
        obstacles: {
            oil_tank: 12,
            oak_tree: 150,
            birch_tree_fall: 20,
            maple_tree: 50,
            pine_tree: 70,
            dormant_oak_tree: 15,
            stump: 30,
            regular_crate: 180,
            flint_crate: 5,
            aegis_crate: 5,
            grenade_crate: 35,
            rock: 180,
            river_chest: 1,
            river_rock: 45,
            vibrant_bush: 200,
            lily_pad: 40,
            barrel: 80,
            viking_chest: 1,
            super_barrel: 30,
            melee_crate: 1,
            gold_rock: 1,
            loot_tree: 1,
            loot_barrel: 1,
            flint_stone: 1
        },
        obstacleClumps: [
            {
                clumpAmount: 80,
                clump: {
                    minAmount: 2,
                    maxAmount: 3,
                    jitter: 5,
                    obstacles: ["oak_tree"],
                    radius: 12
                }
            },
            {
                clumpAmount: 15,
                clump: {
                    minAmount: 2,
                    maxAmount: 3,
                    jitter: 5,
                    obstacles: ["birch_tree_fall"],
                    radius: 12
                }
            },
            {
                clumpAmount: 15,
                clump: {
                    minAmount: 2,
                    maxAmount: 3,
                    jitter: 5,
                    obstacles: ["pine_tree"],
                    radius: 12
                }
            }
        ],
        loots: {
            ground_loot: 60
        },
        places: [
            { name: "Banana", position: Vec.create(0.23, 0.2) },
            { name: "Takedown", position: Vec.create(0.23, 0.8) },
            { name: "Lavlandet", position: Vec.create(0.75, 0.2) },
            { name: "Noskin Narrows", position: Vec.create(0.72, 0.8) },
            { name: "Mt. Sanger", position: Vec.create(0.5, 0.35) },
            { name: "Deepwood", position: Vec.create(0.5, 0.65) }
        ]
    },
    debug: {
        width: 1620,
        height: 1620,
        oceanSize: 128,
        beachSize: 32,
        onGenerate(map) {
            // Generate all buildings

            const buildingPos = Vec.create(200, map.height - 600);

            for (const building of Buildings.definitions) {
                map.generateBuilding(building.idString, buildingPos);
                const rect = building.spawnHitbox.toRectangle();
                buildingPos.x += rect.max.x - rect.min.x;

                buildingPos.x += 20;
                if (buildingPos.x > map.width - 300) {
                    buildingPos.x = 200 - 140;
                    buildingPos.y += 200;
                }
            }

            // Generate all obstacles
            const obstaclePos = Vec.create(200, 200);

            for (const obstacle of Obstacles.definitions) {
                if (obstacle.invisible) continue;
                for (let i = 0; i < (obstacle.variations ?? 1); i++) {
                    map.generateObstacle(obstacle.idString, obstaclePos, { variation: i as Variation });

                    obstaclePos.x += 20;
                    if (obstaclePos.x > map.width / 2 - 20) {
                        obstaclePos.x = map.width / 2 - 140;
                        obstaclePos.y += 20;
                    }
                }
            }

            // Generate all Loots
            const itemPos = Vec.create(map.width / 2, map.height / 2);
            for (const item of Loots.definitions) {
                map.game.addLoot(item, itemPos, 0, { count: Infinity, pushVel: 0, jitterSpawn: false });

                itemPos.x += 10;
                if (itemPos.x > map.width / 2 + 100) {
                    itemPos.x = map.width / 2;
                    itemPos.y += 10;
                }
            }
        },
        places: [
            { name: "[object Object]", position: Vec.create(0.8, 0.7) },
            { name: "Kernel Panic", position: Vec.create(0.6, 0.8) },
            { name: "NullPointerException", position: Vec.create(0.7, 0.3) },
            { name: "undefined Forest", position: Vec.create(0.3, 0.2) },
            { name: "seg. fault\n(core dumped)", position: Vec.create(0.3, 0.7) },
            { name: "Can't read props of null", position: Vec.create(0.4, 0.5) }
        ]
    },
    halloween: {
        width: 1344,
        height: 1344,
        oceanSize: 128,
        beachSize: 32,
        rivers: {
            minAmount: 1,
            maxAmount: 3,
            wideChance: 0.2,
            minWidth: 10,
            maxWidth: 16,
            maxWideAmount: 1,
            minWideWidth: 25,
            maxWideWidth: 30
        },
        buildings: {
            refinery: 1,
            warehouse: 4,
            red_house: 5,
            porta_potty: 10,
            container_3: 1,
            container_4: 1,
            container_5: 1,
            container_6: 1,
            container_7: 1,
            container_8: 1,
            container_9: 1,
            container_10: 1
        },
        obstacles: {
            oil_tank: 6,
            oak_tree: 143,
            birch_tree: 18,
            pine_tree: 14,
            regular_crate: 155,
            rock: 142,
            bush: 87,
            blueberry_bush: 20,
            barrel: 70,
            super_barrel: 20,
            melee_crate: 1,
            gold_rock: 1,
            flint_stone: 1,
            pumpkin: 75
        },
        loots: {
            ground_loot: 40
        },
        places: [
            { name: "Pumpkin Patch", position: Vec.create(0.23, 0.2) },
            { name: "Reaper", position: Vec.create(0.23, 0.8) },
            { name: "Spøkelsesfelt", position: Vec.create(0.75, 0.2) },
            { name: "Haunted Hollow", position: Vec.create(0.72, 0.8) },
            { name: "Mt. Fang", position: Vec.create(0.5, 0.35) },
            { name: "Darkwood", position: Vec.create(0.5, 0.65) }
        ]
    },
    // Arena map to test guns with really bad custom generation code lol
    arena: {
        width: 512,
        height: 512,
        beachSize: 16,
        oceanSize: 40,
        onGenerate(map) {
            // Function to generate all game loot items
            const genLoots = (pos: Vector, ySpacing: number, xSpacing: number): void => {
                const width = 73;

                const startPos = Vec.clone(pos);
                startPos.x -= width / 2;
                const itemPos = Vec.clone(startPos);

                const countMap = {
                    [ItemType.Gun]: 1,
                    [ItemType.Ammo]: Infinity,
                    [ItemType.Melee]: 1,
                    [ItemType.Throwable]: Infinity,
                    [ItemType.Healing]: Infinity,
                    [ItemType.Armor]: 1,
                    [ItemType.Backpack]: 1,
                    [ItemType.Scope]: 1,
                    [ItemType.Skin]: 1
                };

                const game = map.game;
                for (const item of Loots.definitions) {
                    if (
                        ((item.itemType === ItemType.Melee || item.itemType === ItemType.Scope) && item.noDrop)
                        || ("ephemeral" in item && item.ephemeral)
                        || (item.itemType === ItemType.Backpack && item.level === 0)
                        || item.itemType === ItemType.Skin
                    ) continue;

                    game.addLoot(item, itemPos, 0, { count: countMap[item.itemType] ?? 1, pushVel: 0, jitterSpawn: false });

                    itemPos.x += xSpacing;
                    if (
                        (xSpacing > 0 && itemPos.x > startPos.x + width)
                        || (xSpacing < 0 && itemPos.x < startPos.x - width)
                    ) {
                        itemPos.x = startPos.x;
                        itemPos.y -= ySpacing;
                    }
                }
            };

            // Fixed obstacles
            const obstacles = [
                { id: "rock", pos: Vec.create(10, 10) },
                { id: "rock", pos: Vec.create(25, 40) },
                { id: "rock", pos: Vec.create(25, 80) },
                { id: "regular_crate", pos: Vec.create(20, 15) },
                { id: "barrel", pos: Vec.create(25, 25) },
                { id: "rock", pos: Vec.create(80, 10) },
                { id: "rock", pos: Vec.create(60, 15) },
                { id: "oak_tree", pos: Vec.create(20, 70) },
                { id: "oil_tank", pos: Vec.create(120, 25) },
                { id: "birch_tree", pos: Vec.create(120, 50) }
            ];

            const center = Vec.create(map.width / 2, map.height / 2);

            for (const obstacle of obstacles) {
                const { id, pos } = obstacle;
                const { x: posX, y: posY } = pos;

                map.generateObstacle(id, Vec.add(center, pos));
                map.generateObstacle(id, Vec.add(center, Vec.create(-posX, posY)));
                map.generateObstacle(id, Vec.add(center, Vec.create(posX, -posY)));
                map.generateObstacle(id, Vec.add(center, Vec.create(-posX, -posY)));
            }

            genLoots(Vec.add(center, Vec.create(-70, 90)), 8, 8);
            genLoots(Vec.add(center, Vec.create(70, 90)), 8, 8);
            genLoots(Vec.add(center, Vec.create(-70, -90)), -8, 8);
            genLoots(Vec.add(center, Vec.create(70, -90)), -8, 8);

            // Generate random obstacles around the center
            const randomObstacles: MapDefinition["obstacles"] = {
                oak_tree: 50,
                rock: 50,
                bush: 20,
                birch_tree: 5,
                barrel: 15,
                super_barrel: 2
            };

            for (const obstacle in randomObstacles) {
                const limit = randomObstacles[obstacle];
                const definition = Obstacles.fromString(obstacle);

                for (let i = 0; i < limit; i++) {
                    const pos = map.getRandomPosition(
                        definition.spawnHitbox ?? definition.hitbox,
                        {
                            collides: pos => Collision.circleCollision(center, 150, pos, 1)
                        }
                    );

                    if (!pos) continue;

                    map.generateObstacle(definition, pos);
                }
            }
        },
        places: [
            { name: "stark is noob", position: Vec.create(0.5, 0.5) }
        ]
    },
    singleBuilding: {
        width: 1024,
        height: 1024,
        beachSize: 32,
        oceanSize: 64,
        onGenerate(map, [building]) {
            // map.game.grid.addObject(new Decal(map.game, "sea_traffic_control_decal", Vec.create(this.width / 2, this.height / 2), 0));
            /* for (let i = 0; i < 10; i++) {
                map.generateBuilding(`container_${i + 1}`, Vec.create((this.width / 2) + 15 * i, this.height / 2 - 15), 0);
            } */
            map.generateBuilding(building, Vec.create(this.width / 2, this.height / 2), 0);
        }
    },
    singleObstacle: {
        width: 256,
        height: 256,
        beachSize: 8,
        oceanSize: 8,
        onGenerate(map, [obstacle]) {
            map.generateObstacle(obstacle, Vec.create(this.width / 2, this.height / 2), { layer: 0, rotation: 0 });
        }
    },
    singleGun: {
        width: 256,
        height: 256,
        beachSize: 8,
        oceanSize: 8,
        onGenerate(map, [gun]) {
            map.game.addLoot(gun, Vec.create(this.width / 2, this.height / 2 - 10), 0);
            map.game.addLoot(Guns.fromString(gun).ammoType, Vec.create(this.width / 2, this.height / 2 - 10), 0, { count: Infinity });
        }
    },
    gunsTest: (() => {
        const Guns = Loots.byType(ItemType.Gun);

        return {
            width: 64,
            height: 48 + (16 * Guns.length),
            beachSize: 8,
            oceanSize: 8,
            onGenerate(map) {
                for (let i = 0, l = Guns.length; i < l; i++) {
                    const player = new Player(
                        map.game,
                        { getUserData: () => { return {}; } } as unknown as WebSocket<PlayerContainer>,
                        Vec.create(32, 32 + (16 * i))
                    );
                    const gun = Guns[i];

                    player.inventory.addOrReplaceWeapon(0, gun.idString);
                    (player.inventory.getWeapon(0) as GunItem).ammo = gun.capacity;
                    player.inventory.items.setItem(gun.ammoType, Infinity);
                    player.disableInvulnerability();
                    // setInterval(() => player.activeItem.useItem(), 30);
                    map.game.addLoot(gun.idString, Vec.create(16, 32 + (16 * i)), 0);
                    map.game.addLoot(gun.ammoType, Vec.create(16, 32 + (16 * i)), 0, { count: Infinity });
                    map.game.grid.addObject(player);
                }
            }
        };
    })(),
    obstaclesTest: {
        width: 128,
        height: 48 + (32 * Obstacles.definitions.length),
        beachSize: 4,
        oceanSize: 4,
        onGenerate(map) {
            for (let i = 0; i < Obstacles.definitions.length; i++) {
                const obstacle = Obstacles.definitions[i];
                // setInterval(() => player.activeItem.useItem(), 30);
                map.generateObstacle(obstacle.idString, Vec.create(map.width / 2, 40 * i), { variation: i as Variation });
            }
        }
    },
    obstaclesTest2: {
        width: 128,
        height: 128,
        beachSize: 0,
        oceanSize: 0,
        onGenerate(map) {
            for (let x = 0; x <= 128; x += 16) {
                for (let y = 0; y <= 128; y += 16) {
                    map.generateObstacle("flint_crate", Vec.create(x, y));
                }
            }
        }
    },
    playersTest: {
        width: 256,
        height: 256,
        beachSize: 16,
        oceanSize: 16,
        onGenerate(map) {
            for (let x = 0; x < 256; x += 16) {
                for (let y = 0; y < 256; y += 16) {
                    /* const player = new Player(map.game, { getUserData: () => { return {}; } } as unknown as WebSocket<PlayerContainer>, Vec.create(x, y));
                    player.disableInvulnerability();
                    player.loadout.skin = pickRandomInArray(Skins.definitions);
                    map.game.grid.addObject(player); */
                    if (random(0, 1) === 1) map.generateObstacle("barrel", Vec.create(x, y));
                }
            }
        }
    },
    river: {
        width: 1344,
        height: 1344,
        oceanSize: 144,
        beachSize: 32
    },
    armory: {
        width: 850,
        height: 850,
        oceanSize: 144,
        beachSize: 32,
        buildings: {
            armory: 1
        },
        obstacles: {
            regular_crate: 30,
            grenade_crate: 15,
            toilet: 20,
            aegis_crate: 10,
            flint_crate: 10,
            melee_crate: 5,
            birch_tree: 30,
            pine_tree: 30,
            rock: 30,
            barrel: 15
        }
    },
    new_port: {
        width: 875,
        height: 875,
        oceanSize: 144,
        beachSize: 32,
        buildings: {
            port_complex: 1
        },
        obstacles: {
            regular_crate: 30,
            grenade_crate: 15,
            toilet: 20,
            aegis_crate: 10,
            flint_crate: 10,
            melee_crate: 5,
            birch_tree: 30,
            pine_tree: 30,
            rock: 30,
            barrel: 15
        }
    },
    gallery: {
        width: 1024,
        height: 1024,
        beachSize: 64,
        oceanSize: 64,
        onGenerate(map) {
            const targetBuildingIdString = "headquarters";
            map.generateBuilding(targetBuildingIdString, Vec.create(this.width / 2, this.height / 2), 0);

            const buildings = {
                red_house: ~~Math.random(),
                blue_house: ~~Math.random(),
                green_house: ~~Math.random(),
                red_house_v2: ~~Math.random(),
                mobile_home: ~~(Math.random() * 5) + 3,
                porta_potty: ~~(Math.random() * 5) + 3,
                warehouse: 1,
                container_3: 1,
                container_4: 1,
                container_5: 1,
                container_6: 1,
                container_7: 1,
                container_8: 1,
                container_9: 1,
                container_10: 1,
                small_bunker: 1
            };

            const obstacles = {
                oil_tank: 5,
                oak_tree: 40,
                birch_tree: 40,
                box: 50,
                pine_tree: 30,
                regular_crate: 75,
                fridge: 40,
                flint_crate: 12,
                aegis_crate: 12,
                grenade_crate: 30,
                rock: 45,
                bush: 25,
                blueberry_bush: 25,
                barrel: 40,
                gun_case: 15,
                super_barrel: 15,
                briefcase: 4,
                melee_crate: 4,
                gold_rock: 1,
                loot_tree: 1,
                loot_barrel: 1,

                viking_chest: Math.random() > 0.9 ? 1 : 0,
                river_chest: Math.random() > 0.9 ? 1 : 0,
                tango_crate: Math.random() > 0.8 ? 1 : 0,
                lux_crate: Math.random() > 0.8 ? 1 : 0
            };

            const loots = {
                ground_loot: 40,
                regular_crate: 40
            };

            Object.entries(buildings).forEach(([building, count]) => {
                const definition = Buildings.reify(building);

                const { rotationMode } = definition;
                let attempts = 0;

                for (let i = 0; i < count; i++) {
                    let validPositionFound = false;

                    while (!validPositionFound && attempts < 100) {
                        let orientation = GameMap.getRandomBuildingOrientation(rotationMode);

                        const position = map.getRandomPosition(definition.spawnHitbox, {
                            orientation,
                            spawnMode: definition.spawnMode,
                            orientationConsumer: (newOrientation: Orientation) => {
                                orientation = newOrientation;
                            },
                            maxAttempts: 400
                        });

                        if (!position) {
                            attempts++;
                            continue;
                        }

                        map.generateBuilding(definition, position, orientation);
                        validPositionFound = true;
                    }

                    attempts = 0; // Reset attempts counter for the next building
                }
            });

            Object.entries(obstacles).forEach(([obstacle, count]) => {
                const def = Obstacles.reify(obstacle);

                const { scale = { spawnMin: 1, spawnMax: 1 }, variations, rotationMode } = def;
                const { spawnMin, spawnMax } = scale;
                const effSpawnHitbox = def.spawnHitbox ?? def.hitbox;

                for (let i = 0; i < count; i++) {
                    const scale = randomFloat(spawnMin ?? 1, spawnMax ?? 1);
                    const variation = (variations !== undefined ? random(0, variations - 1) : 0) as Variation;
                    const rotation = GameMap.getRandomRotation(rotationMode);

                    let orientation: Orientation = 0;

                    if (rotationMode === RotationMode.Limited) {
                        orientation = rotation as Orientation;
                    }

                    const position = map.getRandomPosition(effSpawnHitbox, {
                        scale,
                        orientation,
                        spawnMode: def.spawnMode
                    });

                    if (!position) {
                        continue;
                    }

                    map.generateObstacle(def, position, { layer: Layer.Ground, scale, variation });
                }
            });

            Object.entries(loots ?? {}).forEach(([loot_, count]) => {
                for (let i = 0; i < count; i++) {
                    const loot = getLootTableLoot(LootTables[loot_].loot.flat());

                    const position = map.getRandomPosition(
                        new CircleHitbox(5),
                        { spawnMode: MapObjectSpawnMode.GrassAndSand }
                    );

                    if (!position) {
                        continue;
                    }

                    for (const item of loot) {
                        map.game.addLoot(
                            item.idString,
                            position,
                            Layer.Ground,
                            { count: item.count, jitterSpawn: false }
                        );
                    }
                }
            });
        },
        places: [
            { name: "pap's lonely place", position: Vec.create(0.5, 0.5) }
        ]
    }
} satisfies Record<string, MapDefinition>;

export type MapName = keyof typeof maps;
export const Maps: Record<MapName, MapDefinition> = maps;
