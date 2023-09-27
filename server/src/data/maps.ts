import { ObjectCategory } from "../../../common/src/constants";
import { Buildings } from "../../../common/src/definitions/buildings";
import { type LootDefinition, Loots } from "../../../common/src/definitions/loots";
import { Obstacles } from "../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../common/src/typings";
import { circleCollision } from "../../../common/src/utils/math";
import { ItemType } from "../../../common/src/utils/objectDefinitions";
import { ObjectType } from "../../../common/src/utils/objectType";
import { randomPointInsideCircle } from "../../../common/src/utils/random";
import { type Vector, v, vAdd, vClone } from "../../../common/src/utils/vector";
import { type Map } from "../map";

interface MapDefinition {
    readonly width: number
    readonly height: number
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
        name: string
        position: Vector
    }>

    // Custom callback to generate stuff
    readonly genCallback?: (map: Map) => void
}

export const Maps: Record<string, MapDefinition> = {
    main: {
        width: 1024,
        height: 1024,
        buildings: {
            refinery: 1,
            warehouse: 4,
            small_house: 5,
            porta_potty: 10
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
            { name: "Banana", position: v(0.14, 0.12) },
            { name: "Takedown", position: v(0.14, 0.88) },
            { name: "Lavlandet", position: v(0.88, 0.12) },
            { name: "Noskin Narrows", position: v(0.82, 0.88) },
            { name: "Mt. Sanger", position: v(0.5, 0.3) },
            { name: "Deepwood", position: v(0.5, 0.7) }
        ]
    },
    debug: {
        width: 1024,
        height: 1024,
        genCallback: (map: Map) => {
            // Generate all Buildings

            const buildingPos = v(map.width / 2, map.height / 2 - 50);
            const buildingStartPos = vClone(buildingPos);

            for (const building of Buildings.definitions.filter(definition => definition.idString !== "porta_potty")) {
                for (let orientation = 0; orientation < 4; orientation++) {
                    map.generateBuilding(ObjectType.fromString(ObjectCategory.Building, building.idString), buildingPos, orientation as Orientation);
                    buildingPos.y -= 100;
                }
                buildingPos.y = buildingStartPos.y;
                buildingPos.x += 100;
            }

            // Generate all Obstacles
            const obstaclePos = v(map.width / 2 - 140, map.height / 2);

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
                map.game.addLoot(ObjectType.fromString(ObjectCategory.Loot, item.idString), itemPos, 511);

                itemPos.x += 10;
                if (itemPos.x > map.width / 2 + 100) {
                    itemPos.x = map.width / 2;
                    itemPos.y += 10;
                }
            }
        },
        places: [
            { name: "[object Object]", position: v(0.2, 0.2) },
            { name: "Kernel Panic", position: v(0.8, 0.8) },
            { name: "undefined Forest", position: v(0.5, 0.3) },
            { name: "Memory Leak", position: v(0.5, 0.7) }
        ]
    },
    // Arena map to test guns with really bad custom generation code lol
    arena: {
        width: 512,
        height: 512,
        genCallback: (map: Map) => {
            // Function to generate all game loot items
            const genLoots = (pos: Vector, yOff: number, xOff: number): void => {
                const width = 50;

                const startPos = vClone(pos);
                startPos.x -= width / 2;
                const itemPos = vClone(startPos);

                for (const item of Loots.definitions) {
                    const itemType = ObjectType.fromString<ObjectCategory.Loot, LootDefinition>(ObjectCategory.Loot, item.idString);
                    const def = itemType.definition;

                    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
                    if (((def.itemType === ItemType.Melee || def.itemType === ItemType.Scope) && def.noDrop) ||
                        "ephemeral" in def ||
                        (def.itemType === ItemType.Backpack && def.level === 0) ||
                        def.itemType === ItemType.Skin) continue;

                    map.game.addLoot(itemType, itemPos, Infinity);

                    itemPos.x += xOff;
                    if ((xOff > 0 && itemPos.x > startPos.x + width) || (xOff < 0 && itemPos.x < startPos.x - width)) {
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
                const obstacleType = ObjectType.fromString(ObjectCategory.Obstacle, obstacle);
                for (let i = 0; i < randomObstacles[obstacle]; i++) {
                    map.generateObstacle(obstacle, map.getRandomPositionFor(obstacleType, 1, 0, getPos), 0, 1);
                }
            }
        },
        places: [
            { name: "stark is noob", position: v(0.5, 0.5) }
        ]
    },
    refinery: {
        width: 512,
        height: 512,
        genCallback(map) {
            map.generateBuilding(ObjectType.fromString(ObjectCategory.Building, "refinery"), v(this.width / 2, this.height / 2), 0);
        }
    },
    small_house: {
        width: 512,
        height: 512,
        genCallback(map) {
            map.generateBuilding(ObjectType.fromString(ObjectCategory.Building, "small_house"), v(this.width / 2, this.height / 2), 0);
        }
    }
};
