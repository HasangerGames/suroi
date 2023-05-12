export interface Vector {
    x: number
    y: number
}

export function v(x: number, y: number): Vector {
    return { x, y };
}

export function vAdd(a: Vector, b: Vector): Vector {
    return v(a.x + b.x, a.y + b.y);
}

export function vMul(a: Vector, n: number): Vector {
    return v(a.x * n, a.y * n);
}

export function cloneVector(vector: Vector): Vector {
    return v(vector.x, vector.y);
}
