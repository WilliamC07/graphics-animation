import {Point, Edge} from "../matrix";

export function toRadians (angle: number): number {
    return angle * (Math.PI / 180);
}

export type Vector = [number, number, number];  // [x, y, z]
/**
 * Gives a vector from p0 to p1 (P0 --> P1)
 * @param p0
 * @param p1
 */
export function vectorize(p0: Point|Edge, p1: Point|Edge): Vector{
    return [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
}

export function calculateSurfaceNormal(p0: Vector, p1: Vector): Vector {
    return [p0[1] * p1[2] - p0[2] * p1[1],
        p0[2] * p1[0] - p0[0] * p1[2],
        p0[0] * p1[1] - p0[1] * p1[0]];
}

export function normalizeVector(vector: Vector): Vector {
    const magnitude = Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2) + Math.pow(vector[2], 2));
    return [
        vector[0] / magnitude,
        vector[1] / magnitude,
        vector[2] / magnitude
    ];
}

/**
 * Adds the vectors together and create a new vector
 * @param vector1
 * @param vector2
 * @return added vector
 */
export function addVector(vector1: Vector, vector2: Vector): Vector{
    const resultVector: Vector = [0, 0, 0];
    for(let i = 0; i < vector2.length; i++){
        resultVector[i] = vector1[i] + vector2[i];
    }
    return resultVector;
}

export function subtractVector(vector1: Vector, vector2: Vector): Vector{
    const resultVector: Vector = [0, 0, 0];
    for(let i = 0; i < vector2.length; i++){
        resultVector[i] = vector1[i] - vector2[i];
    }
    return resultVector;
}

export function scaleVector(vector: Vector, factor: number): Vector {
    const scaledVector: Vector = [0, 0, 0];
    for (let i = 0; i < vector.length; i++) {
        scaledVector[i] = vector[i] * factor;
    }
    return scaledVector;
}

export function dotProduct(p0: Vector, p1: Vector): number {
    return p0[0] * p1[0] + p0[1] * p1[1] + p0[2] * p1[2];
}