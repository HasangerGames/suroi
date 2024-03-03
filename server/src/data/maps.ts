import { type WebSocket } from "uWebSockets.js";
import { Buildings, type BuildingDefinition } from "../../../common/src/definitions/buildings";
import { Guns } from "../../../common/src/definitions/guns";
import { Loots } from "../../../common/src/definitions/loots";
import { Obstacles, type ObstacleDefinition } from "../../../common/src/definitions/obstacles";
import { Skins } from "../../../common/src/definitions/skins";
import { type Variation } from "../../../common/src/typings";
import { Collision } from "../../../common/src/utils/math";
import { ItemType, type ReferenceTo } from "../../../common/src/utils/objectDefinitions";
import { pickRandomInArray, random } from "../../../common/src/utils/random";
import { Vec, type Vector } from "../../../common/src/utils/vector";
import { type GunItem } from "../inventory/gunItem";
import { type Map } from "../map";
import { Player } from "../objects/player";
import { type PlayerContainer } from "../server";
import { type LootTables } from "./lootTables";

interface MapDefinition {
    readonly width: number
    readonly height: number
    readonly oceanSize: number
    readonly beachSize: number
    readonly rivers?: {
        readonly minAmount: number
        readonly maxAmount: number
        readonly wideChance: number
        readonly minWidth: number
        readonly maxWidth: number
        readonly minWideWidth: number
        readonly maxWideWidth: number
    }

    readonly bridges?: Array<ReferenceTo<BuildingDefinition>>
    readonly buildings?: Record<ReferenceTo<BuildingDefinition>, number>
    readonly obstacles?: Record<ReferenceTo<ObstacleDefinition>, number>
    readonly loots?: Record<keyof typeof LootTables, number>

    readonly places?: Array<{
        readonly name: string
        readonly position: Vector
    }>

    // Custom callback to generate stuff
    readonly genCallback?: (map: Map) => void
}

export const Maps: Record<string, MapDefinition> = {
    main: {
        width: 1632,
        height: 1632,
        oceanSize: 128,
        beachSize: 32,
        rivers: {
            minAmount: 3,
            maxAmount: 3,
            wideChance: 0.35,
            minWidth: 12,
            maxWidth: 18,
            minWideWidth: 25,
            maxWideWidth: 30
        },
        bridges: [
            "small_bridge"
        ],
        buildings: {
            port_complex: 1,
            sea_traffic_control: 1,
            tugboat_white: 5,
            tugboat_red: 1,
            armory: 1,
            refinery: 1,
            warehouse: 5,
            small_house: 6,
            mobile_home: 9,
            porta_potty: 12,
            container_3: 1,
            container_4: 2,
            container_5: 1,
            container_6: 2,
            container_7: 1,
            container_8: 2,
            container_9: 1,
            container_10: 2
        },
        obstacles: {
            oil_tank: 10,
            // christmas_tree: 1, // winter mode
            oak_tree: 250,
            birch_tree: 25,
            pine_tree: 15,
            regular_crate: 150,
            flint_crate: 5,
            aegis_crate: 5,
            grenade_crate: 40,
            rock: 150,
            river_chest: 1,
            river_rock: 45,
            bush: 110,
            lily_pad: 20,
            blueberry_bush: 30,
            barrel: 80,
            viking_chest: 1,
            super_barrel: 30,
            melee_crate: 1,
            gold_rock: 1,
            flint_stone: 1
        },
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
        genCallback: (map: Map) => {
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
                    map.generateObstacle(obstacle.idString, obstaclePos, 0, 1, i as Variation);

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
                map.game.addLoot(item, itemPos, Infinity);

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
            minWideWidth: 25,
            maxWideWidth: 30
        },
        buildings: {
            refinery: 1,
            warehouse: 4,
            small_house: 5,
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
        genCallback: (map: Map) => {
            // Function to generate all game loot items
            const genLoots = (pos: Vector, yOff: number, xOff: number): void => {
                const width = 70;

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

                for (const item of Loots.definitions) {
                    if (
                        ((item.itemType === ItemType.Melee || item.itemType === ItemType.Scope) && item.noDrop === true) ||
                        "ephemeral" in item ||
                        (item.itemType === ItemType.Backpack && item.level === 0) ||
                        item.itemType === ItemType.Skin
                    ) continue;

                    map.game.addLoot(item, itemPos, countMap[item.itemType] ?? 1).velocity = Vec.create(0, 0);

                    itemPos.x += xOff;
                    if (
                        (xOff > 0 && itemPos.x > startPos.x + width) ||
                        (xOff < 0 && itemPos.x < startPos.x - width)
                    ) {
                        itemPos.x = startPos.x;
                        itemPos.y -= yOff;
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
                map.generateObstacle(obstacle.id, Vec.add(center, obstacle.pos), 0, 1, 1);
                map.generateObstacle(obstacle.id, Vec.add(center, Vec.create(obstacle.pos.x * -1, obstacle.pos.y)), 0, 1);
                map.generateObstacle(obstacle.id, Vec.add(center, Vec.create(obstacle.pos.x, obstacle.pos.y * -1)), 0, 1);
                map.generateObstacle(obstacle.id, Vec.add(center, Vec.create(obstacle.pos.x * -1, obstacle.pos.y * -1)), 0, 1);
            }

            genLoots(Vec.add(center, Vec.create(-70, 80)), 8, 8);
            genLoots(Vec.add(center, Vec.create(70, 80)), 8, 8);
            genLoots(Vec.add(center, Vec.create(-70, -80)), -8, 8);
            genLoots(Vec.add(center, Vec.create(70, -80)), -8, 8);

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
                for (let i = 0; i < limit; i++) {
                    const definition = Obstacles.fromString(obstacle);
                    const pos = map.getRandomPosition(
                        definition.spawnHitbox ?? definition.hitbox,
                        {
                            collides: pos => Collision.circleCollision(center, 130, pos, 1)
                        }
                    );

                    if (!pos) continue;

                    map.generateObstacle(definition, pos, 0, 1);
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
        oceanSize: 32,
        genCallback(map) {
            //map.game.grid.addObject(new Decal(map.game, "sea_traffic_control_decal", Vec.create(this.width / 2, this.height / 2), 0));
            map.generateBuilding("tugboat_red", Vec.create(this.width / 2, this.height / 2), 0);
        }
    },
    singleObstacle: {
        width: 256,
        height: 256,
        beachSize: 8,
        oceanSize: 8,
        genCallback(map) {
            map.generateObstacle("barrel", Vec.create(this.width / 2, this.height / 2), 0);
        }
    },
    singleGun: {
        width: 256,
        height: 256,
        beachSize: 8,
        oceanSize: 8,
        genCallback(map) {
            map.game.addLoot("vector", Vec.create(this.width / 2, this.height / 2 - 10));
            map.game.addLoot("9mm", Vec.create(this.width / 2, this.height / 2 - 10), Infinity);
        }
    },
    gunsTest: {
        width: 64,
        height: 48 + (16 * Guns.length),
        beachSize: 8,
        oceanSize: 8,
        genCallback(map) {
            for (let i = 0; i < Guns.length; i++) {
                const player = new Player(map.game, { getUserData: () => { return {}; } } as unknown as WebSocket<PlayerContainer>, Vec.create(32, 32 + (16 * i)));
                const gun = Guns[i];
                player.inventory.addOrReplaceWeapon(0, gun.idString);
                (player.inventory.getWeapon(0) as GunItem).ammo = gun.capacity;
                player.inventory.items.setItem(gun.ammoType, Infinity);
                player.disableInvulnerability();
                // setInterval(() => player.activeItem.useItem(), 30);
                map.game.addLoot(gun.idString, Vec.create(16, 32 + (16 * i)));
                map.game.addLoot(gun.ammoType, Vec.create(16, 32 + (16 * i)), Infinity);
                map.game.grid.addObject(player);
            }
        }
    },
    obstaclesTest: {
        width: 128,
        height: 48 + (32 * Obstacles.definitions.length),
        beachSize: 4,
        oceanSize: 4,
        genCallback(map) {
            for (let i = 0; i < Obstacles.definitions.length; i++) {
                const obstacle = Obstacles.definitions[i];
                // setInterval(() => player.activeItem.useItem(), 30);
                map.generateObstacle(obstacle.idString, Vec.create(map.width / 2, 40 * i), 0, 1, i as Variation);
            }
        }
    },
    playersTest: {
        width: 256,
        height: 256,
        beachSize: 16,
        oceanSize: 16,
        genCallback(map) {
            for (let x = 0; x < 256; x += 16) {
                for (let y = 0; y < 256; y += 16) {
                    const player = new Player(map.game, { getUserData: () => { return {}; } } as unknown as WebSocket<PlayerContainer>, Vec.create(x, y));
                    player.disableInvulnerability();
                    player.loadout.skin = pickRandomInArray(Skins.definitions);
                    map.game.grid.addObject(player);
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
    }
};
