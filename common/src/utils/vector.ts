export class Vector {
    x: number;
    y: number;

    static create (x: number, y: number): Vector {
        return { x, y };
    }
}
