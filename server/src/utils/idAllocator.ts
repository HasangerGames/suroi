// kindly shut it
/* eslint-disable @typescript-eslint/no-non-null-assertion */

interface ListNode {
    prev: ListNode | null
    next: ListNode | null

    readonly value: number
}

/**
 * A class that manages a pool of numerical identifiers
 */
export class IDAllocator {
    /**
     * The linked list's tail
     */
    _head: ListNode | null = null;

    /**
     * The linked list's tail
     */
    private _tail: ListNode | null = null;

    /**
     * The largest id this allocator can store
     */
    private readonly _max: number;

    /**
     * Whether or not this allocator has an id available for use
     * @returns Whether or not this allocator has an id available for use
     */
    hasIdAvailable(): boolean {
        return this._head !== null;
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

        this._max = 2 ** bits;

        for (let i = 0, max = this._max; i < max; i++) {
            this.give(i);
        }
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

        if (this._head != null) {
            this._head.prev = null;
        } else {
            this._tail = null;
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
            throw new RangeError(`Cannot give back a value thats not in range (value: ${value})`);
        }

        const node: ListNode = {
            prev: null,
            value,
            next: null
        };

        if (this._head === null && this._tail === null) {
            this._tail = this._head = node;
        } else {
            if (this._head === this._tail) {
                this._head!.next = this._tail = node;
                node.prev = this._head;
            } else {
                node.prev = this._tail;
                this._tail!.next = node;
                this._tail = node;
            }
        }
    }
}
