import { Queue } from "../../../common/src/utils/misc";

/**
 * A class that manages a pool of numerical identifiers
 *
 * Ostensibly a proxy for a {@link Queue}, with some extra validation for inputs
 */
export class IDAllocator {
    /**
     * Internal backing queue
     */
    private readonly _internal = new Queue<number>();

    /**
     * The largest id this allocator can store
     */
    private readonly _max: number;

    /**
     * Creates a new `IDAllocator` storing `2 ** n` id's
     * @param bits A positive integer representing the number of bits this allocator should manage
     * @throws {RangeError} If {@linkcode bits} isn't a positive integer
     */
    constructor(bits: number) {
        if (bits % 1 || bits < 0) {
            throw new RangeError(`Invalid bit count specified (${bits})`);
        }

        for (
            let i = 0, max = this._max = 1 << bits;
            i < max;
            this.give(i++)
        );
    }

    /**
     * Whether or not this allocator has an ID available for use
     * @returns Whether or not this allocator has an ID available for use
     */
    hasIdAvailable(): boolean {
        return this._internal.has();
    }

    /**
     * Returns the next ID this allocator has stored
     * @returns An ID guaranteed to be unique among those given by this allocator
     * @throws {Error} If there are no ID's left
     */
    takeNext(): number {
        return this._internal.dequeue();
    }

    /**
     * Returns a value to the pool of available ID's
     *
     * **Warning:** No mechanism exists to ensure that the given ID isn't already in the pool. It is the caller's
     * responsibility to ensure that the unique ID's given by this allocator remain unique, notably by ensuring that
     * they are deallocated with the right allocator and that ID's are never changed
     *
     * @param value The ID to return
     * @throws {RangeError} If the given value isn't a positive integer, or is out of this allocator's range
     */
    give(value: number): void {
        if (value % 1 || value < 0 || value > this._max) {
            throw new RangeError(`Cannot give back a value that is not in range (value: ${value})`);
        }

        this._internal.enqueue(value);
    }
}
