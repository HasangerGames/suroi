import { type Variation } from "../typings";
import { type Hitbox, RectangleHitbox, ComplexHitbox } from "../utils/hitbox";
import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { weightedRandom } from "../utils/random";
import { type Vector, v } from "../utils/vector";

interface buildingObstacle {
    id: string
    position: Vector
    rotation?: number
    variation?: Variation
    scale?: number
}

interface LootSpawner {
    position: Vector
    table: string
}

export interface BuildingDefinition extends ObjectDefinition {
    spawnHitbox: Hitbox
    ceilingHitbox: Hitbox
    hideOnMap?: boolean
    obstacles: buildingObstacle[]

    lootSpawners?: LootSpawner[]

    floorImagePos: Vector
    ceilingImagePos: Vector
}

export const Buildings = new ObjectDefinitions<BuildingDefinition>([
    {
        idString: "warehouse",
        name: "Warehouse",
        spawnHitbox: new RectangleHitbox(v(-30, -44), v(30, 44)),
        ceilingHitbox: new ComplexHitbox([
            new RectangleHitbox(v(-20, -40), v(20, 40))
        ]),

        floorImagePos: v(0, 0.31),
        ceilingImagePos: v(0, 0),
        obstacles: [
            {
                id: "warehouse_wall_1",
                position: v(-20, 0),
                rotation: 1
            },
            {
                id: "warehouse_wall_1",
                position: v(20, 0),
                rotation: 1
            },
            {
                id: "warehouse_wall_2",
                position: v(14, -34.4)
            },
            {
                id: "warehouse_wall_2",
                position: v(-14, -34.4)
            },
            {
                id: "warehouse_wall_2",
                position: v(14, 34.4)
            },
            {
                id: "warehouse_wall_2",
                position: v(-14, 34.4)
            },
            {
                id: "regular_crate",
                position: v(14, 28.5)
            },
            {
                id: "regular_crate",
                position: v(-14, 28.5)
            },
            {
                // TODO: better way of adding random obstacles
                get id() {
                    return weightedRandom(["regular_crate", "flint_crate"], [0.7, 0.3]);
                },
                position: v(-14, -28.5)
            },
            {
                id: "barrel",
                position: v(14.6, -29.2)
            }
        ],

        lootSpawners: [
            {
                position: v(0, 0),
                table: "warehouse"
            }
        ]
    },
    {
        idString: "house",
        name: "House",
        spawnHitbox: new RectangleHitbox(v(-20, -20), v(20, 20)),
        ceilingHitbox: new ComplexHitbox([
            new RectangleHitbox(v(-49, -35), v(15, 22)),
            new RectangleHitbox(v(15, -37), v(48, 6)),
            new RectangleHitbox(v(-43, -15), v(-19, 32))
        ]),
        floorImagePos: v(0, 0),
        ceilingImagePos: v(0, -3.5),
        obstacles: [
            {
                id: "house_exterior",
                position: v(0, 2.6)
            },
            // Bathroom Left
            {
                id: "house_wall_3",
                position: v(-3.6, -8),
                rotation: 1
            },
            // Bathroom Top
            {
                id: "house_wall_2",
                position: v(-3, 2.4)
            },
            //Entrance Right
            {
                id: "house_wall_3",
                position: v(-3.6, -8),
                rotation: 1
            }
        ]
    }
]);
