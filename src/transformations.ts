import {copyMatrixOver, multiply} from "./matrix";
import {toRadians} from "./utility/math-utility";

export type Transformer = number[][];
export enum TransformationTypes {
    move = "move",
    scale = "scale",
    rotate = "rotate",
}
export enum Axis {
    x,
    y,
    z
}

/**
 * Converts the given matrix into an identity matrix, that is:
 * [[ 1 0 0 0 ]
    [ 0 1 0 0 ]
    [ 0 0 1 0 ]
    [ 0 0 0 1 ]]
 * @param matrix Matrix to be modified
 * @return The matrix given in the parameter
 */
export const toIdentity = (matrix: Transformer): Transformer => {
    for(let row = 0; row < matrix.length; row++){
        for(let column = 0; column < matrix[0].length; column++){
            if(row === column){
                matrix[row][column] = 1;
            }else{
                matrix[row][column] = 0;
            }
        }
    }
    return matrix;
};

/**
 * Creates an identity matrix.
 * @return identity matrix of size 4x4
 */
export const createTransformer = (): Transformer => {
    const matrix = new Array(4);
    for(let row = 0; row < 4; row++){
        matrix[row] = new Array(4);
    }
    toIdentity(matrix);
    return matrix;
};

export const deepCopyTransformer = (transformer: Transformer): Transformer => {
    const matrix: Transformer = createTransformer();

    for(let r = 0; r < 4; r++){
        for(let c = 0; c < 4; c++){
            matrix[r][c] = transformer[r][c];
        }
    }

    return matrix;
};

/**
 * Makes the transformation matrix to perform a rotation about the given axis by degrees.
 * @param transformer The transformation matrix
 * @param degrees Degree to rotate the image
 * @param axis Either: 'x', 'y', or 'z'
 * @return The given transformation matrix
 */
export const toRotate = (transformer: Transformer, degrees: number, axis: Axis): Transformer => {
    const tempMatrix = createTransformer();
    if(axis === Axis.x){
        tempMatrix[0] = [1, 0, 0, 0];
        tempMatrix[1] = [0, Math.cos(toRadians(degrees)), -Math.sin(toRadians(degrees)), 0];
        tempMatrix[2] = [0, Math.sin(toRadians(degrees)), Math.cos(toRadians(degrees)), 0];
        tempMatrix[3] = [0, 0, 0, 1];
    }else if(axis === Axis.y){
        tempMatrix[0] = [Math.cos(toRadians(degrees)), 0, Math.sin(toRadians(degrees)), 0];
        tempMatrix[1] = [0, 1, 0 ,0];
        tempMatrix[2] = [-Math.sin(toRadians(degrees)), 0, Math.cos(toRadians(degrees)), 0];
        tempMatrix[3] = [0, 0, 0, 1];
    }else if(axis === Axis.z){
        tempMatrix[0] = [Math.cos(toRadians(degrees)), -Math.sin(toRadians(degrees)), 0, 0];
        tempMatrix[1] = [Math.sin(toRadians(degrees)), Math.cos(toRadians(degrees)), 0, 0];
        tempMatrix[2] = [0, 0, 1, 0];
        tempMatrix[3] = [0, 0, 0, 1];
    }else{
        throw new Error(`Do not understand rotation about ${axis}-axis`)
    }
    multiply(transformer, tempMatrix);
    copyMatrixOver(tempMatrix, transformer);
    return transformer;
};

/**
 * Makes the transformation matrix to perform a translation with the given values.
 * @param transformer The transformation matrix
 * @param x translate x by this amount
 * @param y translate y by this amount
 * @param z translate z by this amount
 * @return The given transformation matrix
 */
export const toMove = (transformer: Transformer, x: number, y: number, z: number): Transformer => {
    const tempMatrix = createTransformer();
    tempMatrix[0] = [1, 0, 0, x];
    tempMatrix[1] = [0, 1, 0, y];
    tempMatrix[2] = [0, 0, 1, z];
    tempMatrix[3] = [0, 0, 0, 1];
    multiply(transformer, tempMatrix);
    copyMatrixOver(tempMatrix, transformer);
    return transformer;
};

/**
 * Makes the transformation matrix to perform a translation with the given values.
 * @param transformer The transformation matrix
 * @param x scale x by this amount
 * @param y scale y by this amount
 * @param z scale z by this amount
 * @return The transformation matrix
 */
export const toScale = (transformer: Transformer, x: number, y: number, z: number): Transformer => {
    const tempMatrix = createTransformer();
    tempMatrix[0] = [x, 0, 0, 0];
    tempMatrix[1] = [0, y, 0, 0];
    tempMatrix[2] = [0, 0, z, 0];
    tempMatrix[3] = [0, 0, 0, 1];
    multiply(transformer, tempMatrix);
    copyMatrixOver(tempMatrix, transformer);
    return transformer;
};