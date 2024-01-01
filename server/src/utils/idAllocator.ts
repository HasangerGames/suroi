interface ListNode {
    prev: ListNode | undefined
    next: ListNode | undefined

    readonly value: number
}

/**
 * A class that manages a pool of numerical identifiers
 */
export class IDAllocator {
    /**
     * The linked list's head
     */
    private _head?: ListNode;

    /**
     * The linked list's tail
     */
    private _tail?: ListNode;

    /**
     * The largest id this allocator can store
     */
    private readonly _max: number;

    /**
     * Whether or not this allocator has an id available for use
     * @returns Whether or not this allocator has an id available for use
     */
    hasIdAvailable(): boolean {
        return this._head !== undefined;
    }

    /**
     * Creates a new `IDAllocator` storing `2 ** n` id's
     * @param bits A positive integer representing the number of bits this allocator should manage
     * @throws {RangeError} If {@linkcode bits} isn't a positive integer
     */
    constructor(bits: number) {
        if (bits % 1 !== 0 || bits < 0) {
            throw new RangeError(`Invalid bit count specified (${bits})`);
        }

        for (
            let i = 0, max = this._max = 1 << bits;
            i < max;
            this.give(i++)
        );
    }

    /**
     * Returns the next ID this allocator has stored
     * @returns An ID guaranteed to be unique among those given by this allocator
     * @throws {Error} If there are no ID's left
     */
    takeNext(): number {
        if (!this.hasIdAvailable()) throw new Error("Out of IDs");

        const value = this._head!.value;
        this._head = this._head!.next;

        if (this._head) {
            this._head.prev = undefined;
        } else {
            this._tail = undefined;
        }

        return value;
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

        const node: ListNode = {
            prev: undefined,
            value,
            next: undefined
        };

        if (this._head === undefined) {
            this._tail = this._head = node;
            return;
        }

        if (this._head === this._tail) {
            this._head.next = this._tail = node;
            node.prev = this._head;
            return;
        }

        node.prev = this._tail;
        this._tail!.next = node;
        this._tail = node;
    }
}
