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

export function vSub(a: Vector, b: Vector): Vector {
    return v(a.x - b.x, a.y - b.y);
}

export function vMul(a: Vector, n: number): Vector {
    return v(a.x * n, a.y * n);
}

export function vClone(vector: Vector): Vector {
    return v(vector.x, vector.y);
}

export function vRotate(vector: Vector, angle: number): Vector {
    const cos = Math.cos(angle); const sin = Math.sin(angle);
    return v(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos);
}
