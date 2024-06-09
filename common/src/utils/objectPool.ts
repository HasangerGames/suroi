import { ObjectCategory } from "../constants";

interface GameObject<T extends ObjectCategory = ObjectCategory> {
    readonly type: T
    readonly id: number
}

export class ObjectPool<Mapping extends { [Cat in ObjectCategory]: GameObject<Cat> }> {
    private readonly _objects = new Map<number, GameObject>();

    private readonly _byCategory: { [C in ObjectCategory]: Set<GameObject<C>> };

    getCategory<C extends ObjectCategory>(key: C): Set<Mapping[C]> {
        return this._byCategory[key] as Set<Mapping[C]>;
    }

    constructor() {
        this._byCategory = Object.keys(ObjectCategory)
            .filter(e => !Number.isNaN(+e)) // ignore double indexing (extract enum members)
            .reduce(
                (acc, cur) => {
                    acc[cur as `${ObjectCategory}`] = new Set<Mapping[ObjectCategory[`${ObjectCategory}` & keyof typeof ObjectCategory]]>();
                    return acc;
                },
                {} as ObjectPool<Mapping>["_byCategory"]
            );
    }

    clear(): void {
        this._objects.clear();
        Object.values(this._byCategory).forEach(e => e.clear());
    }

    add<Cat extends ObjectCategory>(object: Mapping[Cat]): void {
        this._objects.set(object.id, object);
        this.getCategory(object.type as Cat).add(object);
    }

    delete<Cat extends ObjectCategory>(object: Mapping[Cat]): void {
        this.getCategory(object.type as Cat).delete(object);
        this._objects.delete(object.id);
    }

    has(object: GameObject): boolean {
        return this._objects.has(object.id);
    }

    categoryHas<Cat extends ObjectCategory>(object: Mapping[Cat]): boolean {
        return this.getCategory(object.type as Cat).has(object);
    }

    get(id: number): Mapping[ObjectCategory] | undefined {
        return this._objects.get(id) as Mapping[ObjectCategory] | undefined;
    }

    hasId(id: number): boolean {
        return this._objects.has(id);
    }

    get size(): number {
        return this._objects.size;
    }

    [Symbol.iterator](): Iterator<Mapping[ObjectCategory]> {
        return this._objects.values() as Iterator<Mapping[ObjectCategory]>;
    }
}
