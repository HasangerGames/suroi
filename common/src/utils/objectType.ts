import { type ObjectDefinition, type ObjectDefinitions } from "./objectDefinitions";
import { ObjectDefinitionsList } from "./objectDefinitionsList";

import { type ObjectCategory } from "../constants";

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
            throw new Error(`No definitions found for object category: ${category} (object ID = ${idNumber})`);
        }

        type.idString = definitions.definitions[type.idNumber].idString;
        return type;
    }

    static fromString<T extends ObjectCategory = ObjectCategory, U extends ObjectDefinition = ObjectDefinition>(category: T, idString: string): ObjectType<T, U> {
        const type = new ObjectType<T, U>(category, -1, idString);

        const definitions: ObjectDefinitions | undefined = ObjectDefinitionsList[category];
        if (definitions === undefined) {
            throw new Error(`No definitions found for object category: ${category} (object ID = ${idString})`);
        }

        // TODO: Make this more efficient.
        for (let i = 0; i < definitions.definitions.length; i++) {
            if (definitions.definitions[i].idString === idString) type.idNumber = i;
        }

        return type;
    }
}
