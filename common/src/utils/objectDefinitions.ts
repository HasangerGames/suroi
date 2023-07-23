/**
 * A class representing the definitions for some object type
 * @template T The specific type of `ObjectDefinition` this class holds
 */
export class ObjectDefinitions<T extends ObjectDefinition = ObjectDefinition> {
    readonly bitCount: number;
    readonly definitions: T[];

    constructor(definitions: T[]) {
        this.bitCount = Math.ceil(Math.log2(definitions.length));
        this.definitions = definitions;
    }
}

export interface ObjectDefinition {
    readonly idString: string
    readonly name: string
}

// expand this as needed
export enum ItemType {
    Gun,
    Ammo,
    Melee,
    Healing,
    Armor,
    Backpack,
    Scope,
    Skin
}

export interface ItemDefinition extends ObjectDefinition {
    readonly itemType: ItemType
    readonly noDrop?: boolean
}
