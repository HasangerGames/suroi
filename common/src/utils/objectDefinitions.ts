/**
 * A class representing the definitions for some object type
 * @template T The specific type of `ObjectDefinition` this class holds
 */
export class ObjectDefinitions<T extends ObjectDefinition = ObjectDefinition> {
    readonly bitCount: number;
    readonly definitions: T[];

    constructor(bitCount: number, definitions: T[]) {
        this.bitCount = bitCount;
        this.definitions = definitions;
    }
}

export interface ObjectDefinition {
    readonly idString: string
    readonly name: string
}

// expand this as needed
export type ItemTypes = "gun" | "melee";

export interface ItemDefinition extends ObjectDefinition {
    readonly type: ItemTypes
}
