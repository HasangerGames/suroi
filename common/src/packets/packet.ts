import { type SuroiBitStream } from "../utils/suroiBitStream";

/*
    eslint-disable

    @typescript-eslint/explicit-function-return-type
*/

/*
    `@typescript-eslint/explicit-function-return-type`: Most of the return types in this file can't be written out if you wanted to
*/

/**
 * `Input` refers to the type associated with serialization, while `Output`
 * refers to the type associated with deserialization
 */
export type PacketTemplate<Input = unknown, Output = Input> = (new (...args: never[]) => InputPacket<Input> & OutputPacket<Output>) & {
    readonly name: string // === Function.name
    create(value: Input): InputPacket<Input>
    read(stream: SuroiBitStream): OutputPacket<Output>
};

export type InputPacket<Input = unknown> = {
    readonly input: Input
    serialize(stream: SuroiBitStream): void
};

export type OutputPacket<Output = unknown> = {
    readonly output: Output
};

export type Packet<Input = never, Output = unknown> = {
    readonly value: Input | Output
};

export function createPacket<const Name extends string = string>(name: Name) {
    return <const Input, const Output = Input>(
        { serialize, deserialize }: {
            serialize: (stream: SuroiBitStream, value: Input) => void
            deserialize: (stream: SuroiBitStream) => Output
        }
    ) => {
        let constructing = false;
        const cls = {
            [name]: class implements InputPacket<Input>, OutputPacket<Output> {
                static create(value: Input) {
                    constructing = true;
                    const inst = new this(value);
                    constructing = false;
                    return inst;
                }

                static read(stream: SuroiBitStream) {
                    constructing = true;
                    const inst = new this(deserialize(stream));
                    constructing = false;
                    return inst;
                }

                // unsafe—proper usage is up to the caller
                get input(): Input { return this._value as Input; }
                get output(): Output { return this._value as Output; }

                constructor(private readonly _value: Input | Output) {
                    if (!constructing) {
                        throw new Error("Do not manually instantiate a packet, use its static 'create' method instead");
                    }
                }

                serialize(stream: SuroiBitStream): void { serialize(stream, this.input); }
            }
        }[name];

        return cls as PacketTemplate<Input, Output>;
    };
}
