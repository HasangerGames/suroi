/**
 * A class that manages a pool of numerical identifiers
 */
export class IDAllocator {
    /**
     * A map associating numbers (indices) with booleans corresponding
     * to whether that ID is free
     */
    private readonly _list: boolean[];

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
        if (bits % 1 !== 0 || bits < 0) {
            throw new RangeError(`Invalid bit count specified (${bits})`);
        }

        this._max = 2 ** bits;

        this._list = Array.from({ length: this._max - 1 }, () => true);
    }

    /**
     * Returns the next ID this allocator has stored
     * @returns An ID guaranteed to be unique among those given by this allocator
     * @throws {Error} If there are no ID's left
     */
    takeNext(): number {
        let index = -1;
        for (let i = 0, l = this._list.length; i < l; i++) {
            if (this._list[i]) {
                index = i;
                break;
            }
        }

        if (index === -1) throw new Error("Out of IDs");

        this._list[index] = false;
        return index;
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
        if (value % 1 !== 0 || value < 0 || value > this._max) {
            throw new RangeError(`Cannot give back a value that is not in range (value: ${value})`);
        }

        this._list[value] = true;
    }
}
