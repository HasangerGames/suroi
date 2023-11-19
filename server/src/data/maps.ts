import { Buildings } from "../../../common/src/definitions/buildings";
import { Loots } from "../../../common/src/definitions/loots";
import { Obstacles } from "../../../common/src/definitions/obstacles";
import { type Variation } from "../../../common/src/typings";
import { circleCollision } from "../../../common/src/utils/math";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { random } from "../../../common/src/utils/random";
import { v, vAdd, vClone, type Vector } from "../../../common/src/utils/vector";
import { type Map } from "../map";
import { Guns } from "../../../common/src/definitions/guns";
import { Player } from "../objects/player";
import { type PlayerContainer } from "../server";
import { type WebSocket } from "uWebSockets.js";
import { type GunItem } from "../inventory/gunItem";
import { Skins } from "../../../common/src/definitions/skins";

interface MapDefinition {
    readonly width: number
    readonly height: number
    readonly oceanSize: number
    readonly beachSize: number
    readonly rivers?: number
    readonly buildings?: Record<string, number>
    readonly obstacles?: Record<string, number>

    readonly loots?: Record<string, number>

    readonly places?: Array<{
        readonly name: string
        readonly position: Vector
    }>

    // Custom callback to generate stuff
    readonly genCallback?: (map: Map) => void
}

export const Maps: Record<string, MapDefinition> = {
    main: {
        width: 1620,
        height: 1620,
        oceanSize: 128,
        beachSize: 32,
        rivers: 3,
        buildings: {
            port_complex: 1,
            refinery: 1,
            warehouse: 5,
            small_house: 10,
            porta_potty: 15,
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
            oak_tree: 310,
            birch_tree: 50,
            pine_tree: 30,
            regular_crate: 300,
            flint_crate: 6,
            aegis_crate: 6,
            rock: 200,
            bush: 120,
            blueberry_bush: 30,
            barrel: 80,
            super_barrel: 30,
            melee_crate: 1,
            gold_rock: 1,
            flint_stone: 1
        },
        loots: {
            ground_loot: 60
        },
        places: [
            { name: "Banana", position: v(0.23, 0.2) },
            { name: "Takedown", position: v(0.23, 0.8) },
            { name: "Lavlandet", position: v(0.75, 0.2) },
            { name: "Noskin Narrows", position: v(0.72, 0.8) },
            { name: "Mt. Sanger", position: v(0.5, 0.35) },
            { name: "Deepwood", position: v(0.5, 0.65) }
        ]
    },
    debug: {
        width: 1620,
        height: 1620,
        oceanSize: 128,
        beachSize: 32,
        genCallback: (map: Map) => {
            // Generate all buildings

            const buildingPos = v(200, map.height - 600);

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
            const obstaclePos = v(200, 200);

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
            const itemPos = v(map.width / 2, map.height / 2);
            for (const item of Loots.definitions) {
                map.game.addLoot(item, itemPos, 511);

                itemPos.x += 10;
                if (itemPos.x > map.width / 2 + 100) {
                    itemPos.x = map.width / 2;
                    itemPos.y += 10;
                }
            }
        },
        places: [
            { name: "[object Object]", position: v(0.8, 0.7) },
            { name: "Kernel Panic", position: v(0.6, 0.8) },
            { name: "NullPointerException", position: v(0.7, 0.3) },
            { name: "undefined Forest", position: v(0.3, 0.2) },
            { name: "seg. fault\n(core dumped)", position: v(0.3, 0.7) },
            { name: "Can't read props of null", position: v(0.4, 0.5) }
        ]
    },
    halloween: {
        width: 1344,
        height: 1344,
        oceanSize: 128,
        beachSize: 32,
        rivers: 3,
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
            { name: "Pumpkin Patch", position: v(0.23, 0.2) },
            { name: "Reaper", position: v(0.23, 0.8) },
            { name: "Spøkelsesfelt", position: v(0.75, 0.2) },
            { name: "Haunted Hollow", position: v(0.72, 0.8) },
            { name: "Mt. Fang", position: v(0.5, 0.35) },
            { name: "Darkwood", position: v(0.5, 0.65) }
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
                const width = 50;

                const startPos = vClone(pos);
                startPos.x -= width / 2;
                const itemPos = vClone(startPos);

                for (const item of Loots.definitions) {
                    if (
                        ((item.itemType === ItemType.Melee || item.itemType === ItemType.Scope) && item.noDrop === true) ||
                        "ephemeral" in item ||
                        (item.itemType === ItemType.Backpack && item.level === 0) ||
                        item.itemType === ItemType.Skin
                    ) continue;

                    map.game.addLoot(item, itemPos, Infinity);

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
                { id: "rock", pos: v(10, 10) },
                { id: "rock", pos: v(30, 40) },
                { id: "rock", pos: v(30, 80) },
                { id: "regular_crate", pos: v(20, 15) },
                { id: "barrel", pos: v(25, 25) },
                { id: "rock", pos: v(80, 10) },
                { id: "rock", pos: v(60, 15) },
                { id: "oak_tree", pos: v(20, 70) },
                { id: "oil_tank", pos: v(120, 25) },
                { id: "birch_tree", pos: v(110, 50) }
            ];

            const center = v(map.width / 2, map.height / 2);

            for (const obstacle of obstacles) {
                map.generateObstacle(obstacle.id, vAdd(center, obstacle.pos), 0, 1, 1);
                map.generateObstacle(obstacle.id, vAdd(center, v(obstacle.pos.x * -1, obstacle.pos.y)), 0, 1);
                map.generateObstacle(obstacle.id, vAdd(center, v(obstacle.pos.x, obstacle.pos.y * -1)), 0, 1);
                map.generateObstacle(obstacle.id, vAdd(center, v(obstacle.pos.x * -1, obstacle.pos.y * -1)), 0, 1);
            }

            genLoots(vAdd(center, v(-70, 70)), 8, 8);
            genLoots(vAdd(center, v(70, 70)), 8, 8);
            genLoots(vAdd(center, v(-70, -70)), -8, 8);
            genLoots(vAdd(center, v(70, -70)), -8, 8);

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
                for (let i = 0; i < randomObstacles[obstacle]; i++) {
                    const definition = Obstacles.fromString(obstacle);

                    const pos = map.getRandomPosition(definition.spawnHitbox ?? definition.hitbox, {
                        collides: pos => circleCollision(center, 120, pos, 1)
                    });

                    if (!pos) continue;

                    map.generateObstacle(definition, pos, 0, 1);
                }
            }
        },
        places: [
            { name: "stark is noob", position: v(0.5, 0.5) }
        ]
    },
    singleBuilding: {
        width: 1024,
        height: 1024,
        beachSize: 32,
        oceanSize: 32,
        genCallback(map) {
            map.generateBuilding("port_complex", v(this.width / 2, this.height / 2), 0);
        }
    },
    singleObstacle: {
        width: 256,
        height: 256,
        beachSize: 8,
        oceanSize: 8,
        genCallback(map) {
            map.generateObstacle("pumpkin", v(this.width / 2, this.height / 2), 0);
        }
    },
    guns_test: {
        width: 64,
        height: 48 + (16 * Guns.length),
        beachSize: 8,
        oceanSize: 8,
        genCallback(map) {
            for (let i = 0; i < Guns.length; i++) {
                const player = new Player(map.game, { getUserData: () => { return {}; } } as unknown as WebSocket<PlayerContainer>, v(32, 32 + (16 * i)));
                const gun = Guns[i];
                player.inventory.addOrReplaceWeapon(0, gun.idString);
                (player.inventory.getWeapon(0) as GunItem).ammo = gun.capacity;
                player.inventory.items[gun.ammoType] = Infinity;
                player.disableInvulnerability();
                //setInterval(() => player.activeItem.useItem(), 30);
                map.game.addLoot(gun.idString, v(16, 32 + (16 * i)));
                map.game.addLoot(gun.ammoType, v(16, 32 + (16 * i)), Infinity);
                map.game.grid.addObject(player);
            }
        }
    },
    players_test: {
        width: 256,
        height: 256,
        beachSize: 16,
        oceanSize: 16,
        genCallback(map) {
            for (let x = 0; x < 256; x += 16) {
                for (let y = 0; y < 256; y += 16) {
                    const player = new Player(map.game, { getUserData: () => { return {}; } } as unknown as WebSocket<PlayerContainer>, v(x, y));
                    player.disableInvulnerability();
                    player.loadout.skin = Skins.definitions[random(0, Skins.definitions.length - 1)];
                    map.game.grid.addObject(player);
                }
            }
        }
    },
    river: {
        width: 1344,
        height: 1344,
        oceanSize: 144,
        beachSize: 32
    }
};
