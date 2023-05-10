/*
Copyright (C) 2023 Henry Sanger (https://suroi.io)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { type ObjectCategory, ObjectDefinitionsList } from "./constants";

export abstract class ObjectDefinitions {
    readonly bitCount: number;
    readonly definitions: ObjectDefinition[];
}

export interface ObjectDefinition { idString: string }

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
        // TODO Make this more efficient
        for (let i = 0; i < definitions.definitions.length; i++) {
            if (definitions[i].idString === idString) type.idNumber = i;
        }
        return type;
    }
}
