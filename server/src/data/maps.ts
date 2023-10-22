import { ObjectCategory } from "../../../common/src/constants";
import { Buildings } from "../../../common/src/definitions/buildings";
import { Loots } from "../../../common/src/definitions/loots";
import { Obstacles, RotationMode } from "../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../common/src/typings";
import { circleCollision } from "../../../common/src/utils/math";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { randomPointInsideCircle } from "../../../common/src/utils/random";
import { v, vAdd, vClone, type Vector } from "../../../common/src/utils/vector";
import { type Map } from "../map";
import { Guns } from "../../../common/src/definitions/guns";
import { Player } from "../objects/player";
import { type PlayerContainer } from "../server";
import { type WebSocket } from "uWebSockets.js";
import { type GunItem } from "../inventory/gunItem";

interface MapDefinition {
    readonly width: number
    readonly height: number
    readonly oceanSize: number
    readonly beachSize: number
    readonly rivers?: number
    readonly buildings?: Record<string, number>
    readonly obstacles?: Record<string, number>

    // Obstacles with custom spawn logic
    /* eslint-disable @typescript-eslint/indent */
    readonly specialObstacles?: Record<
        string,
        {
            readonly spawnProbability?: number
            readonly radius?: number
            readonly squareRadius?: boolean
        } & (
            {
                readonly count: number
            } | {
                readonly min: number
                readonly max: number
            }
        )
    >

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
            regular_crate: 155,
            oak_tree: 143,
            rock: 142,
            bush: 87,
            blueberry_bush: 20,
            barrel: 70,
            super_barrel: 20,
            birch_tree: 18,
            pine_tree: 14,
            melee_crate: 1,
            gold_rock: 1,
            flint_stone: 1
        },
        specialObstacles: {
            oil_tank: {
                count: 3,
                radius: 200,
                squareRadius: true
            },
            aegis_crate: {
                min: 3,
                max: 4
            },
            flint_crate: {
                min: 3,
                max: 4
            }
        },
        loots: {
            ground_loot: 40
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
        width: 1024,
        height: 1024,
        beachSize: 16,
        oceanSize: 160,
        genCallback: (map: Map) => {
            // Generate all buildings

            const buildingPos = v(200, map.height - 200);
            const buildingStartPos = vClone(buildingPos);

            const max = {
                [RotationMode.Limited]: 4,
                [RotationMode.Binary]: 2,
                [RotationMode.None]: 1
            };

            for (const building of Buildings.definitions) {
                for (
                    let orientation = 0, limit = max[building.rotationMode ?? RotationMode.Limited];
                    orientation < limit;
                    orientation++
                ) {
                    map.generateBuilding(
                        building.idString,
                        buildingPos,
                        (building.rotationMode === RotationMode.Binary ? 2 : 1) * orientation as Orientation
                    );

                    buildingPos.y -= 125;
                }

                buildingPos.y = buildingStartPos.y;
                buildingPos.x += 125;
            }

            // Generate all obstacles
            const obstaclePos = v(200, 200);

            for (const obstacle of Obstacles.definitions) {
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
    // Arena map to test guns with really bad custom generation code lol
    arena: {
        width: 512,
        height: 512,
        beachSize: 16,
        oceanSize: 80,
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

            const getPos = (): Vector => {
                let pos = vClone(center);
                while (circleCollision(center, 120, pos, 1)) {
                    pos = randomPointInsideCircle(center, 250);
                }
                return pos;
            };

            for (const obstacle in randomObstacles) {
                for (let i = 0; i < randomObstacles[obstacle]; i++) {
                    map.generateObstacle(
                        obstacle,
                        map.getRandomPositionFor(
                            ObjectType.fromString(ObjectCategory.Obstacle, obstacle),
                            1,
                            0,
                            getPos
                        ),
                        0,
                        1
                    );
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
            map.generateBuilding("port", v(this.width / 2, this.height / 2), 0);
        }
    },
    singleObstacle: {
        width: 128,
        height: 128,
        beachSize: 16,
        oceanSize: 16,
        genCallback(map) {
            map.generateObstacle("vault_door", v(this.width / 2, this.height / 2), 0);
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
    river: {
        width: 1344,
        height: 1344,
        oceanSize: 144,
        beachSize: 32
    }
};
