export class ObjectPool<T extends { id: number }> {
    private readonly objects = new Map<number, T>();

    clear(): void {
        this.objects.clear();
    }

    add(object: T): boolean {
        if (this.objects.has(object.id)) return false;
        this.objects.set(object.id, object);
        return true;
    }

    addAll(...objects: T[]): boolean[] {
        return objects.map(this.add.bind(this));
    }

    delete(object: T): boolean {
        return this.objects.delete(object.id);
    }

    has(object: T): boolean {
        return this.objects.has(object.id);
    }

    get(id: number): T | undefined {
        return this.objects.get(id);
    }

    hasID(id: number): boolean {
        return this.objects.has(id);
    }

    deleteByID(id: number): void {
        this.objects.delete(id);
    }

    get size(): number {
        return this.objects.size;
    }

    [Symbol.iterator](): Iterator<T> {
        return this.objects.values();
    }
}
