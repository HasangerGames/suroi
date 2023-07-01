// An interface to represent a 2D vector. The x and y values are coordinates in a 2D space.
export interface Vector {
    x: number  // Represents the horizontal (x-axis) coordinate of the Vector
    y: number  // Represents the vertical (y-axis) coordinate of the Vector
}

// This function creates a new Vector. Takes in two numbers representing x and y coordinates and returns an object of type Vector.
export function v(x: number, y: number): Vector {
    return { x, y };
}

// This function adds two vectors together. It adds the x and y coordinates of each Vector and returns a new Vector.
export function vAdd(a: Vector, b: Vector): Vector {
    return v(a.x + b.x, a.y + b.y);
}

// This function subtracts one vector from another. It subtracts the x and y coordinates of Vector b from Vector a and returns a new Vector.
export function vSub(a: Vector, b: Vector): Vector {
    return v(a.x - b.x, a.y - b.y);
}

// This function multiplies a vector by a scalar (a single number). It multiplies the x and y coordinates of the Vector by the scalar and returns a new Vector.
export function vMul(a: Vector, n: number): Vector {
    return v(a.x * n, a.y * n);
}

// This function clones (or copies) a vector. It creates a new Vector with the same x and y coordinates as the input Vector.
export function vClone(vector: Vector): Vector {
    return v(vector.x, vector.y);
}

// This function rotates a vector by a given angle (in radians). It uses trigonometric functions to calculate the new coordinates after rotation and returns a new Vector.
export function vRotate(vector: Vector, angle: number): Vector {
    const cos = Math.cos(angle); 
    const sin = Math.sin(angle);
    return v(vector.x * cos - vector.y * sin, vector.x * sin + vector.y * cos);
}
