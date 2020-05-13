import {Transformer} from "./transformations";

/**
 * Array of [x, y, z, 1].
 */
export type EdgeMatrix = [number, number, number, number][];
/**
 * Array of [x, y, z, 1].
 */
export type PolygonMatrix = [number, number, number, number][];
/**
 * Represents [x, y, z].
 */
export type Point = [number, number, number];
export type Edge = [number, number, number, number];

export const createEdgeMatrix = (): EdgeMatrix => {
    return [];
};

export const createPolygonMatrix = (): PolygonMatrix => {
    return [];
};

/**
 * Adds the following points to the matrix. The edgeMatrix is defined by a list size N of [x, y, z].
 * @param edgeMatrix to be modified
 * @param point0 Start point of the line
 * @param point1 End point of the line
 * @return The matrix given
 */
export const addEdge = (edgeMatrix: EdgeMatrix|PolygonMatrix, point0: Point, point1: Point): EdgeMatrix => {
    edgeMatrix.push([point0[0], point0[1], point0[2], 1]);
    edgeMatrix.push([point1[0], point1[1], point1[2], 1]);
    return edgeMatrix;
};

export const addPolygon = (polygonMatrix: PolygonMatrix, point0: Point, point1: Point, point2: Point) => {
    polygonMatrix.push([point0[0], point0[1], point0[2], 1]);
    polygonMatrix.push([point1[0], point1[1], point1[2], 1]);
    polygonMatrix.push([point2[0], point2[1], point2[2], 1]);
};

/**
 * Multiplies the two matrix and places the result in the second matrix.
 * @param m1
 * @param m2
 */
export const multiply = (m1: number[][], m2: number[][]) => {
    const [rowsM1, columnsM1] = dimensions(m1);
    const [rowsM2, columnsM2] = dimensions(m2);
    if(columnsM1 !== rowsM2){
        throw new Error(`Dimensions of matrices do not match: Multiplying ${rowsM1} by ${columnsM1} to ${rowsM2} by ${columnsM2}`);
    }

    let resultBuffer = [];
    for(let column2 = 0; column2 < columnsM2; column2++){
        // do the multiplication
        for(let row1 = 0; row1 < rowsM1; row1++){
            let sum = 0;
            for(let column1 = 0; column1 < columnsM1; column1++){
                // column1 index matches up with row2 index
                sum += m1[row1][column1] * m2[column1][column2];
            }
            resultBuffer.push(sum);
        }

        // set the values of m2 to reflect the multiplication
        for(let row2 = 0; row2 < rowsM2; row2++){
            m2[row2][column2] = resultBuffer[row2];
        }

        // reset the resultBuffer for the next multiplication
        resultBuffer = [];
    }
};

/**
 * Applies the transformation to the matrix
 * @param transformer size 4 by 4 matrix
 * @param edgeMatrix size N array of [x, y, z, 1]. We are treating edgeMatrix as:
 *                   [[x, x1, x2, xn],
 *                    [y, y1, y2, yn],
 *                    [z, z1, z2, zn],
 *                    [1,  1,  1,  1]]
 */
export const multiplyEdgeMatrix = (transformer: Transformer, edgeMatrix: EdgeMatrix|PolygonMatrix) => {
    for(let edgeRow = 0; edgeRow < edgeMatrix.length; edgeRow++){
        let resultBuffer = [];
        for(let edgeCol = 0; edgeCol < 4; edgeCol++){
            // edgeMatrix[<ROW_CONSTANT>][edgeCol] looks like [x, y, z, 1]
            let sum = 0;
            for(let transformerCol = 0; transformerCol < 4; transformerCol++){
                sum += transformer[edgeCol][transformerCol] * edgeMatrix[edgeRow][transformerCol];
            }
            resultBuffer.push(sum);
        }

        for(let edgeCol = 0; edgeCol < 4; edgeCol++){
            edgeMatrix[edgeRow][edgeCol] = resultBuffer[edgeCol]
        }
    }
};

export const copyMatrixOver = (source: number[][]|string[][], destination: number[][]|string[][]) => {
    const [rows, columns] = dimensions(source);
    for(let row = 0; row < rows; row++){
        for(let column = 0; column < columns; column++){
            destination[row][column] = source[row][column];
        }
    }
};

/**
 * @return String representation of the matrix
 */
export const toMatrixString = (matrix: number[][]): string => {
    let string = "[";

    for(let row = 0; row < matrix.length; row++){
        string += row === 0 ? "[" : " [";
        for(let column = 0; column < matrix[0].length; column++){
            string += String(matrix[row][column]).padStart(4, " ") + " ";
        }
        string += row === matrix.length - 1 ? "]" : "]\n";
    }

    string += ']';
    return string;
};

export const toInteger = (matrix: number[][]) => {
    const [rows] = dimensions(matrix);
    for(let row = 0; row < rows; row++){
        // only convert x and y values to integer
        for(let column = 0; column < 2; column++){
            matrix[row][column] = Math.floor(matrix[row][column]);
        }
    }
};

/**
 * Get the dimensions of the matrix.
 * @param matrix Matrix to get the dimensions
 * @returns [rows, columns]
 */
export const dimensions = (matrix: number[][]|string[][]): [number, number] => {
    if(matrix.length === 0){
        return [0, 0];
    }else{
        return [matrix.length, matrix[0].length]
    }
};