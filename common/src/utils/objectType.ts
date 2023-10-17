import { ObjectCategory } from "../constants";
import { type ObjectDefinition, type ObjectDefinitions } from "./objectDefinitions";
import { Obstacles } from "../definitions/obstacles";
import { Explosions } from "../definitions/explosions";
import { Loots } from "../definitions/loots";
import { Buildings } from "../definitions/buildings";
import { Emotes } from "../definitions/emotes";
import { Decals } from "../definitions/decals";

export const ObjectDefinitionsList: Record<ObjectCategory, ObjectDefinitions | undefined> = {
    [ObjectCategory.Player]: undefined,
    [ObjectCategory.Obstacle]: Obstacles,
    [ObjectCategory.DeathMarker]: undefined,
    [ObjectCategory.Loot]: Loots,
    [ObjectCategory.Building]: Buildings,
    [ObjectCategory.Decal]: Decals,
    [ObjectCategory.Explosion]: Explosions,
    [ObjectCategory.Emote]: Emotes
};

export class ObjectType<T extends ObjectCategory = ObjectCategory, U extends ObjectDefinition = ObjectDefinition> {
    category: T;
    idNumber: number;
    idString: string;

    private constructor(category: T, idNumber: number, idString: string) {
        this.category = category;
        this.idNumber = idNumber;
        this.idString = idString;
    }

    get definition(): U {
        const definitions: ObjectDefinitions<U> | undefined = ObjectDefinitionsList[this.category] as ObjectDefinitions<U>;
        if (definitions !== undefined) {
            return definitions.definitions[this.idNumber];
        } else {
            throw new Error(`No definitions found for object category: ${this.category} (object ID = ${this.idString})`);
        }
    }

    static categoryOnly<T extends ObjectCategory = ObjectCategory, U extends ObjectDefinition = ObjectDefinition>(category: T): ObjectType<T, U> {
        return new ObjectType(category, -1, "");
    }

    static fromNumber<T extends ObjectCategory = ObjectCategory, U extends ObjectDefinition = ObjectDefinition>(category: T, idNumber: number): ObjectType<T, U> {
        const type = new ObjectType<T, U>(category, idNumber, "");

        const definitions: ObjectDefinitions | undefined = ObjectDefinitionsList[category];
        if (definitions === undefined) {
            throw new Error(`No definitions found for object category: ${ObjectCategory[category]} (object ID = ${idNumber})`);
        }

        const definition = definitions.definitions[type.idNumber];
        if (definition === undefined) {
            throw new Error(`ID number out of range (ID = ${idNumber}, category = ${ObjectCategory[category]})`);
        }

        type.idString = definition.idString;
        return type;
    }

    static fromString<T extends ObjectCategory = ObjectCategory, U extends ObjectDefinition = ObjectDefinition>(category: T, idString: string): ObjectType<T, U> {
        const definitions = ObjectDefinitionsList[category];
        if (definitions === undefined) {
            throw new Error(`No definitions found for object category: ${ObjectCategory[category]} (object ID = ${idString})`);
        }
        return new ObjectType<T, U>(category, definitions.idStringToNumber[idString], idString);
    }
}
