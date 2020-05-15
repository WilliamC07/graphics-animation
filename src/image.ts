import {Edge, EdgeMatrix, PolygonMatrix} from "./matrix";
import {exec} from "child_process";
import {promises as fs} from "fs";
import {dotProduct, calculateSurfaceNormal, Vector, vectorize} from "./utility/math-utility";
import {calculateColor, Color, SymbolColor, viewingVector} from "./render/lighting";

export default class Image {
    public columns: number;
    public rows: number;
    public matrix: string[][];
    /**
     * Keep track of the z coordinate of objected drawn at each pixel
     */
    private zBuffer: number[][];
    private static tempIndex = 0;

    /**
     * Creates a new image.
     * @param columns Amount of rows
     * @param rows Amount of columns
     */
    constructor(columns: number, rows: number){
        this.columns = columns;
        this.rows = rows;
        this.matrix = new Array(rows);
        this.zBuffer = new Array(rows);
        for(let row = 0; row < rows; row++){
            this.matrix[row] = new Array(columns);
            this.zBuffer[row] = new Array(columns).fill(-Infinity);
        }
    }

    /**
     * Draw lines
     * @param edgeMatrix Matrix with edge coordinates
     */
    public drawEdges(edgeMatrix: EdgeMatrix){
        for(let pointIndex = 0; pointIndex < edgeMatrix.length; pointIndex += 2){
            this.line(edgeMatrix[pointIndex][0], edgeMatrix[pointIndex][1], edgeMatrix[pointIndex][2],
                edgeMatrix[pointIndex + 1][0], edgeMatrix[pointIndex + 1][1], edgeMatrix[pointIndex + 1][2], "0 0 0");
        }
    }

    public drawPolygons(polygons: PolygonMatrix, symbolColor: SymbolColor){
        for(let point = 0; point < polygons.length - 2; point+=3){
            const p0 = polygons[point];
            const p1 = polygons[point + 1];
            const p2 = polygons[point + 2];

            // Find surface normal if we were to render the triangle
            const vector0: Vector = vectorize(p1, p0);
            const vector1: Vector = vectorize(p2, p0);
            const surfaceNormal: Vector = calculateSurfaceNormal(vector0, vector1);

            // For the triangle to be drawn, the angle between the surfaceNormal and viewVector needs to be
            // between -90 degrees and 90 degrees
            if(dotProduct(surfaceNormal, viewingVector) > 0) {
                const color = calculateColor(surfaceNormal, symbolColor);

                // organize the points of the triangle by their y values
                let [bottom, middle, top] = [p0, p1, p2];
                if(bottom[1] > top[1]){
                    [bottom, top] = [top, bottom];
                }
                if(bottom[1] > middle[1]){
                    [bottom, middle] = [middle, bottom];
                }
                if(middle[1] > top[1]){
                    [middle, top] = [top, middle];
                }

                let y = bottom[1];
                let x0 = bottom[0];
                let x1 = bottom[0];
                let z0 = bottom[2];
                let z1 = bottom[2];

                // change in x
                const startXDelta = (top[0] - bottom[0]) / (top[1] - bottom[1] + 1);
                let endXDelta = (middle[0] - bottom[0]) / (middle[1] - bottom[1] + 1);
                const endXDeltaFlip = (top[0] - middle[0]) / (top[1] - middle[1] + 1);

                let startZDelta = (top[2] - bottom[2]) / (top[1] - bottom[1] + 1);
                let endZDelta = (middle[2] - bottom[2]) / (middle[1] - bottom[1] + 1);
                let endZDeltaFlip = (top[2] - middle[2]) / (top[1] - middle[1] + 1);

                while(y <= top[1]){
                    this.drawHorizontal(y, Math.floor(x0), Math.floor(x1), z0, z1, color.toString());
                    x0 += startXDelta;
                    x1 += endXDelta;
                    z0 += startZDelta;
                    z1 += endZDelta;
                    // We passed a vertex, so we need to change what deltaX and deltaZ we are using
                    if(y === middle[1]){
                        endXDelta = endXDeltaFlip;
                        endZDelta = endZDeltaFlip;
                        x1 = middle[0];
                        z1 = middle[2];
                    }
                    y++;
                }
            }
        }
    }

    /**
     * To be used with drawPolygon() for Scanline algorithm. Draws a horizontal line between (x0, y) and (x1, y).
     * @param y
     * @param x0
     * @param x1
     * @param color
     */
    private drawHorizontal(y: number, x0: number, x1: number, zStart: number, zEnd: number, color: string){
        if(x0 > x1){
            this.drawHorizontal(y, x1, x0, zEnd, zStart, color);
            return;
        }

        const pixelInLine = x1 - x0 + 1; // add one since we might be drawing a 1 pixel long horizontal
        let deltaZ = (zEnd - zStart) / pixelInLine;
        while(x0 <= x1){
            this.plot(x0, y, zStart, color);
            zStart += deltaZ;
            x0++;
        }
    }

    /**
     * Clears all the points plotted on the image.
     */
    public clear(){
        for(let row = 0; row < this.rows; row++){
            for(let column = 0; column < this.columns; column++){
                this.matrix[row][column] = "";
                this.zBuffer[row][column] = -Infinity;
            }
        }
    }

    /**
     * Saves the file in the current directory with the given filename and file type. File type determined from
     * characters following the first "." character found in fileName.
     * @param fileName
     */
    public async saveToDisk(fileName: string){
        // create a temporary .ppm file so we can convert it to the file type requested
        const ppmFile = fileName.substring(0, fileName.indexOf(".")) + ".ppm";
        await fs.writeFile(ppmFile, this.toString());

        if(!fileName.endsWith(".ppm")){
            // convert to type requested (type is given by fileName)
            // and delete the temporary .ppm file after
            await new Promise((resolve, reject) => {
                exec(`convert ${ppmFile} ${fileName} && rm ${ppmFile}`, () => {
                    resolve();
                });
            })
        }
    }

    /**
     * Shows the image on the screen for the user to see
     */
    public display(){
        // save file first
        const fileName = `temp${Image.tempIndex++}.ppm`;
        this.saveToDisk(fileName);
        // show the image
        exec(`display ${fileName}`);
    }

    /**
     * Fills in the pixel at the given row and column index with the given color
     * @param col Row index
     * @param row Column index
     * @param z Z value of object that will be drawn
     * @param color String representation of a color P3
     */
    private plot(col: number, row: number, z: number, color: string){
        row = this.rows - 1 - row;
        if(col >= 0 && col < this.columns && row >= 0 && row < this.rows && z >= this.zBuffer[row][col]){
            // row should be counting from the bottom of the screen
            this.matrix[row][col] = color;
            this.zBuffer[row][col] = z;
        }
    }

    /**
     * Draw a line given two points: (Point0 and Point1).
     * @param col0 First point row index
     * @param row0 First point column index
     * @param col1 Second point row index
     * @param row1 Second point column index
     * @param color Color of the string
     * @private
     */
    private line(col0: number, row0: number, z0: number, col1: number, row1: number, z1: number, color: string){
        // Reorder the given points such that Point0 is to the left of Point1 (or same column index)
        // We want to render left to right
        if(col0 > col1){
            this.line(col1, row1, z1, col0, row0, z0, color);
            return;
        }

        if(row1 > row0){
            // Octant 1 or 2

            // These delta values will always be positive or 0
            let deltaRow = row1 - row0; // Think of change in cartesian Y
            let deltaCol = col1 - col0; // Think of change in cartesian X

            // Find if in octant 1 or 2
            if(deltaRow < deltaCol){
                // 1 > slope > 0: Octant 1
                let distance = deltaRow - 2 * deltaCol;
                const numPixels = col1 - col0 + 1;  // add one since we are measuring amount not distance
                const deltaZ = (z1 - z0) / numPixels;

                while(col0 <= col1){
                    this.plot(col0, row0, z0, color);
                    if(distance > 0){
                        row0 += 1;
                        distance += 2 * (-deltaCol);
                    }
                    col0 += 1;
                    z0 += deltaZ;
                    distance += 2 * deltaRow;
                }
            }else{
                // Slope > 1: Octant 2
                let distance = deltaRow - 2 * deltaCol;
                const numPixels = row1 - row0 + 1;  // add one since we are measuring amount not distance
                const deltaZ = (z1 - z0) / numPixels;
                while(row0 <= row1){
                    this.plot(col0, row0, z0, color);
                    if(distance < 0){
                        col0 += 1;
                        distance += 2 * deltaRow;
                    }
                    row0 += 1;
                    z0 += deltaZ;
                    distance += 2 * -deltaCol;
                }
            }
        }else{
            // Octant 7 or 8

            let deltaRow = row1 - row0; // Think of change in cartesian Y. Always negative
            let deltaCol = col1 - col0; // Think of change in cartesian X. Always positive

            if(Math.abs(deltaRow) < Math.abs(deltaCol)){
                // Octant 8
                let distance = 2 * deltaRow + deltaCol;
                const numPixels = col1 - col0 + 1;  // add one since we are measuring amount not distance
                const deltaZ = (z1 - z0) / numPixels;
                while(col0 <= col1){
                    this.plot(col0, row0, z0, color);
                    if(distance < 0){
                        row0 -= 1;
                        distance += 2 * deltaCol;
                    }
                    col0 += 1;
                    z0 += deltaZ;
                    distance += 2 * deltaRow;
                }
            }else{
                // Octant 7
                let distance = deltaRow + 2 * deltaCol;
                const numPixels = row1 - row0 + 1;  // add one since we are measuring amount not distance
                const deltaZ = (z1 - z0) / numPixels;
                while(row0 >= row1){
                    this.plot(col0, row0, z0, color);
                    if(distance > 0){
                        col0 += 1;
                        distance += 2 * deltaRow;
                    }
                    row0 -= 1;
                    z0 += deltaZ;
                    distance += 2 * deltaCol;
                }
            }
        }
    }

    /**
     * Converts this image to a string
     * @returns String representation of the image that follows PPM P3 specifications
     */
    toString(): string{
        let string = `P3\n${this.columns} ${this.rows}\n255\n`;
        for(let row = 0; row < this.rows; row++){
            for(let column = 0; column < this.columns; column++){
                const color = this.matrix[row][column];
                if(color === undefined || color === ""){
                    // No color, default to white
                    string += "255 255 255\n";
                }else{
                    string += color + "\n";
                }
            }
        }
        return string;
    }
}