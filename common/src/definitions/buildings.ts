import { type Hitbox, RectangleHitbox, ComplexHitbox } from "../utils/hitbox";
import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { type Vector, v } from "../utils/vector";

interface buildingObstacle {
    idString: string
    position: Vector
    rotation?: number
}

export interface BuildingDefinition extends ObjectDefinition {
    spawnHitbox: Hitbox
    ceilingHitbox: Hitbox
    hideOnMap?: boolean
    obstacles: buildingObstacle[]
}

export const Buildings = new ObjectDefinitions<BuildingDefinition>([
    {
        idString: "warehouse",
        name: "Warehouse",
        spawnHitbox: new RectangleHitbox(v(-20, -20), v(20, 20)),
        ceilingHitbox: new ComplexHitbox([
            new RectangleHitbox(v(-16, -16), v(16, 16)),
            new RectangleHitbox(v(-5, 15), v(5, 22))
        ]),
        obstacles: [
            {
                idString: "warehouse_wall_1",
                position: v(-16.4, 0)
            },
            {
                idString: "warehouse_wall_1",
                position: v(16.4, 0)
            },
            {
                idString: "warehouse_wall_2",
                position: v(10.4, -16.7)
            },
            {
                idString: "warehouse_wall_2",
                position: v(-10.4, -16.7)
            },
            {
                idString: "warehouse_wall_3",
                position: v(0, 16.6)
            },
            {
                idString: "regular_crate",
                position: v(-10.5, -10.5)
            },
            {
                idString: "regular_crate",
                position: v(10.5, -10.5)
            },
            {
                idString: "regular_crate",
                position: v(-10.5, 10.5)
            },
            {
                idString: "regular_crate",
                position: v(10.5, 10.5)
            },
            {
                idString: "barrel",
                position: v(0, 11.5)
            }
        ]
    },
    {
        idString: "house",
        name: "House",
        spawnHitbox: new RectangleHitbox(v(-20, -20), v(20, 20)),
        ceilingHitbox: new RectangleHitbox(v(-16, -16), v(16, 16)),
        obstacles: [
            {
                idString: "house_wall_1",
                position: v(0, 12.5)
            },
            {
                idString: "house_wall_2",
                position: v(0, 18.5)
            },
            {
                idString: "house_wall_3",
                position: v(0, 24.5)
            },
            {
                idString: "house_wall_4",
                position: v(0, 30.5)
            }
        ]
    }
]);
