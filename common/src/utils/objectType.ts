import { getDefinitionsForCategory, type ObjectCategory, type ObjectDefinition } from "./objectCategory";

export class ObjectType {
    category: ObjectCategory;
    idNumber: number;
    idString: string;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {}

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
        const definitions: ObjectDefinition[] = getDefinitionsForCategory(category);
        type.idString = definitions[type.idNumber].idString;
        return type;
    }

    static fromString(category: ObjectCategory, idString: string): ObjectType {
        const type = new ObjectType();
        type.category = category;
        type.idString = idString;
        const definitions: ObjectDefinition[] = getDefinitionsForCategory(category);
        for (let i = 0; i < definitions.length; i++) {
            if (definitions[i].idString === idString) type.idNumber = i;
        }
        return type;
    }
}
