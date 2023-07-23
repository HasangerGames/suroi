import { type Variation } from "../typings";
import { type Hitbox, RectangleHitbox, ComplexHitbox } from "../utils/hitbox";
import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { type Vector, v } from "../utils/vector";

interface buildingObstacle {
    idString: string
    position: Vector
    rotation?: number
    variation?: Variation
    scale?: number
}

export interface BuildingDefinition extends ObjectDefinition {
    spawnHitbox: Hitbox
    ceilingHitbox: Hitbox
    hideOnMap?: boolean
    obstacles: buildingObstacle[]

    floorImagePos: Vector
    ceilingImagePos: Vector
}

export const Buildings = new ObjectDefinitions<BuildingDefinition>([
    /*
    {
        idString: "warehouse",
        name: "Warehouse",
        spawnHitbox: new RectangleHitbox(v(-20, -20), v(20, 20)),
        ceilingHitbox: new ComplexHitbox([
            new RectangleHitbox(v(-16, -16), v(16, 16)),
            new RectangleHitbox(v(-5, 15), v(5, 22))
        ]),

        floorImagePos: v(0, 2.35),
        ceilingImagePos: v(0, 0),
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
    },*/
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
             // Bathroom Left
             {
                idString: "house_wall_3",
                position: v(-3.6, -8),
                rotation: 1
             },
             // Bathroom Top
             {
                idString: "house_wall_2",
                position: v(-1.5, 2.4)
             },
             //Entrance Right
             {
                idString: "house_wall_3",
                position: v(-25.2, -8),
                rotation: 1
             },
             // Kitchen Top
             {
                idString: "house_wall_2",
                position: v(-20.4, 2.4)
             },
             // Living Room Bottom Right
             {
                idString: "house_wall_2",
                position: v(6.1, 14.6)
             },
             // Living Room Left
             {
                idString: "house_wall_3",
                position: v(-18.25, 25),
                rotation: 1
             },
             // Living Room Bottom Left
             {
                idString: "house_wall_3",
                position: v(-18, 14.4)
             },
             {
                idString: "house_wall_2",
                position: v(-42, 14.4)
             },
             // House Exterior
             {
                idString: "house_exterior",
                position: v(0, 2.6)
             },
        ]
    }
]);
