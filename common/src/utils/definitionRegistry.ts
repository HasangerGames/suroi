import { type ByteStream } from "./byteStream";
import { type ObjectDefinition, type ObjectDefinitions, type ReferenceTo, type ReifiableDef } from "./objectDefinitions";

/*
    2 bytes = 16 bits = 65536 item schema entries
    that's a lot
    maybe too many

    ObjectCategory is 3 bits
    16 - 3 = 13 bits = 8192 item schema entries

    hmm
    alright, well we could package the object category with the definition
    as a safety measure
    but who says safety says performance penalty
    so…

    there are also other ways of doing safety checks that don't compromise
    the flow of data
*/

const definitions: ObjectDefinition[] = [];
const idStringToNumber = Object.create(null) as Record<string, number>;

export const strictSchemaReads = true;

let initialized = false;

const writeToStream = <S extends ByteStream>(stream: S, def: ReifiableDef<ObjectDefinition>): S => {
    return stream.writeUint16(
        idStringToNumber[typeof def === "string" ? def : def.idString]
    );
};

const readFromStream = <Spec extends ObjectDefinition>(stream: ByteStream): Spec => {
    const idx = stream.readUint16();
    const def = definitions[idx] as Spec;
    if (def === undefined) {
        if (strictSchemaReads) {
            throw new RangeError(`Bad index ${idx}`);
        }
        console.error(`Bad index ${idx}`);
    }
    return def;
};

const fromString = (idString: ReferenceTo<ObjectDefinition>): ObjectDefinition => {
    const def = definitions[idStringToNumber[idString]];
    if (def === undefined) {
        throw new ReferenceError(`idString '${idString}' does not exist in the global registry`);
    }

    return def;
};

const hasString = (idString: ReferenceTo<ObjectDefinition>): boolean => {
    return idString in idStringToNumber;
};

const schemas: ObjectDefinitions[] = [];

export const GlobalRegistrar = {
    register(schema: ObjectDefinitions): void {
        schemas.push(schema);
    },
    writeToStream<S extends ByteStream>(stream: S, def: ReifiableDef<ObjectDefinition>): S {
        init();
        return writeToStream(stream, def);
    },
    readFromStream<Spec extends ObjectDefinition>(stream: ByteStream): Spec {
        init();
        return readFromStream(stream);
    },
    /**
     * Use a specific schema's `fromString` proxy, if you want stricter typings
     */
    fromString(idString: ReferenceTo<ObjectDefinition>): ObjectDefinition {
        init();
        return fromString(idString);
    },
    hasString(idString: ReferenceTo<ObjectDefinition>): boolean {
        init();
        return hasString(idString);
    }
};

function init(): void {
    if (initialized) {
        throw new Error("init called more than once");
    }
    initialized = true;
    // sort the schemas to at least try and ensure that they're registered in the same order
    schemas.sort(({ name: a }, { name: b }) => a < b ? -1 : 1);

    GlobalRegistrar.writeToStream = writeToStream;
    GlobalRegistrar.readFromStream = readFromStream;
    GlobalRegistrar.fromString = fromString;
    GlobalRegistrar.hasString = hasString;
    GlobalRegistrar.register = _ => {
        throw new Error("Cannot register a schema after the registry has been initialized");
    };
    Object.freeze(GlobalRegistrar);

    const schemaCount = schemas.length;

    let totalLength = 0;
    for (let i = 0; i < schemaCount; i++) {
        const { definitions: incoming } = schemas[i];

        const length = incoming.length;
        for (let j = 0; j < length; j++) {
            const def = incoming[j];
            const { idString } = def;
            if (idString in idStringToNumber) {
                throw new Error(`Duplicate idString '${idString}' in registry`);
            }

            definitions.push(def);
            idStringToNumber[idString] = totalLength++;
        }
    }

    if (totalLength > 65536) {
        throw new RangeError("Global registry too large for 2 bytes.");
    }
}
