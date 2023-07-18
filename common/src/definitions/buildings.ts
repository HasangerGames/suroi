import { type Hitbox, RectangleHitbox } from "../utils/hitbox";
import { type ObjectDefinition, ObjectDefinitions } from "../utils/objectDefinitions";
import { v } from "../utils/vector";

export interface BuildingDefinition extends ObjectDefinition {
    spawnHitbox: Hitbox
}

export const Buildings = new ObjectDefinitions<BuildingDefinition>([
    {
        idString: "test",
        name: "Test!!!!",
        spawnHitbox: new RectangleHitbox(v(-10, 10), v(-10, 10))
    }
]);
