import { type ObjectDefinition, type ObjectDefinitions } from "./objectDefinitions";
import { ObjectDefinitionsList } from "./objectDefinitionsList";

import { type ObjectCategory } from "../constants";

export class ObjectType {
    category: ObjectCategory;
    idNumber: number;
    idString: string;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {}

    get definition(): ObjectDefinition {
        const definitions: ObjectDefinitions | undefined = ObjectDefinitionsList[this.category];
        if (definitions !== undefined) {
            return definitions.definitions[this.idNumber];
        } else {
            throw new Error(`No definitions found for object category: ${this.category} (object ID = ${this.idString})`);
        }
    }

    static categoryOnly(category: ObjectCategory): ObjectType {
        const type = new ObjectType();
        type.category = category;
        type.idNumber = -1;
        type.idString = "";

        return type;
    }

    static fromNumber(category: ObjectCategory, idNumber: number): ObjectType {
        const type = new ObjectType();
        type.category = category;
        type.idNumber = idNumber;

        const definitions: ObjectDefinitions | undefined = ObjectDefinitionsList[category];
        if (definitions === undefined) {
            throw new Error(`No definitions found for object category: ${category} (object ID = ${idNumber})`);
        }

        type.idString = definitions.definitions[type.idNumber].idString;
        return type;
    }

    static fromString(category: ObjectCategory, idString: string): ObjectType {
        const type = new ObjectType();
        type.category = category;
        type.idString = idString;

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
