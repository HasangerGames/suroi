import { ObjectCategory } from "../../../common/src/constants";
import { Buildings } from "../../../common/src/definitions/buildings";
import { Loots } from "../../../common/src/definitions/loots";
import { Obstacles } from "../../../common/src/definitions/obstacles";
import { type Orientation, type Variation } from "../../../common/src/typings";
import { ObjectType } from "../../../common/src/utils/objectType";
import { v } from "../../../common/src/utils/vector";
import { type Map } from "../map";

interface mapDefinition {

    buildings?: Record<string, number>

    obstacles?: Record<string, number>

    // Obstacles with custom spawn logic
    specialObstacles?: Record<string, {
        spawnProbability?: number
        radius?: number
        squareRadius?: boolean
    }
    &
    ({
        count: number
    } |
    {
        min: number
        max: number
    })
    >

    loots?: Record<string, number>

    // Custom callback to generate stuff
    genCallback?: (map: Map) => void
}

export const Maps: Record<string, mapDefinition> = {
    main: {
        buildings: {
            warehouse: 10,
            house: 10
        },
        obstacles: {
            oil_tank: 6,
            regular_crate: 150,
            oak_tree: 140,
            pine_tree: 12,
            birch_tree: 16,
            rock: 140,
            bush: 85,
            blueberry_bush: 20,
            barrel: 70,
            super_barrel: 20,
            gauze_crate: 1,
            cola_crate: 1,
            melee_crate: 1,
            gold_rock: 1
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
        }
    },
    debug: {
        genCallback: (map: Map) => {
            // Generate all Buildings

            const buildingPos = v(map.width / 2, map.height / 2 + 30);

            for (const building of Buildings.definitions) {
                for (let orientation = 0; orientation < 4; orientation++) {
                    map.generateBuilding(ObjectType.fromString(ObjectCategory.Building, building.idString), buildingPos, orientation as Orientation);
                    buildingPos.y += 40;
                }
            }

            // Generate all Obstacles
            const obstaclePos = v(map.width / 2 - 140, map.height / 2);

            for (const obstacle of Obstacles.definitions) {
                for (let i = 0; i < (obstacle.variations ?? 1); i++) {
                    map.genObstacle(obstacle.idString, obstaclePos, 0, 1, i as Variation);

                    obstaclePos.x += 20;
                    if (obstaclePos.x > map.width / 2 - 20) {
                        obstaclePos.x = map.width / 2 - 140;
                        obstaclePos.y -= 20;
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
                    itemPos.y -= 10;
                }
            }
        }
    }
};
