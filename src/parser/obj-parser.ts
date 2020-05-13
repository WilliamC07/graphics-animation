import {Point, createPolygonMatrix, toInteger, PolygonMatrix} from "../matrix";
import Image from "../image";
import {addPolygon} from "../matrix";
import fs from 'fs';

function *getInstructions(fileName: string): IterableIterator<string>{
    const lines: string[] = fs.readFileSync(fileName, "utf-8").split("\n");
    let lineNumber = 0;
    while(lineNumber < lines.length){
        yield lines[lineNumber];
        lineNumber++;
    }
}

export const objParser = (source: string, polygons: PolygonMatrix) => {
    const instructions = getInstructions(source);
    const vertices: Point[] = [];

    let instruction: string = instructions.next().value;
    while(instruction !== undefined) {
        // ignore blank lines
        if(instruction.trim() === ''){
            instruction = instructions.next().value;
            continue;
        }

        const tokens = instruction.split(" ") // get individual parameter in each line
            .filter(val => val.trim() !== ""); // remove extra white space if file poorly formatted
        // @ts-ignore -- will never be undefined
        const keyword = tokens.shift().trim();

        switch(keyword){
            case '#': {
                // ignore comments
            } break;
            case 'mtllib': {
                // Using material file
                // TODO: Parse material file
            } break;
            case 'usemtl': {
                // Using material file
                // TODO: Parse material file
            } break;
            case 'g': {
                // group

            } break;
            case 'o': {
                // no idea
            } break;
            case 'v': {
                // vertices
                const [x, y, z] = tokens.map(val => parseFloat(val));
                vertices.push([x, y, z]);
            } break;
            case 'vt': {
                // texture coordinates
                // ignore for now
            } break;
            case 'vn': {
                // vertex normals
                // ignore for now
            } break;
            case 's': {
                // no idea
            } break;
            case 'f': {
                // Polygonal face element
                // face are parsed as: "f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3 v4/vt4/vn4"
                // (the "v4/vt4/vn4" is there if rectangle base, otherwise triangle based).

                let polygonVertices: Point[] = [];
                // example value of tokens: ["v1/vt1/vn1", "v2/vt2/vn2", "v3/vt3/vn3", "v4/vt4/vn4"] (optional last element)
                for(const token of tokens){
                    // example: token = "3232/5687/4"
                    // pushing 3232 as number type
                    const offset = parseInt(token.split("/")[0]);
                    if(offset < 0){
                        // negative offset refers offset since last vertex added. So -1 means last vertex, -2 means
                        // second last vertex, etc...
                        polygonVertices.push(vertices[vertices.length + offset]);
                    }else{
                        // positive offset refers to offset since first vertex added
                        // .obj uses index base 1. We need base 0, so minus 1
                        polygonVertices.push(vertices[offset - 1])
                    }
                }

                if(tokens.length === 4){
                    // "v4/vt4/vn4" is there
                    /*
                    // Shamelessly borrowed from stackoverflow
                    https://stackoverflow.com/questions/23723993/converting-quadriladerals-in-an-obj-file-into-triangles

                    3-------2
                    |      /|
                    |    /  |
                    |  /    |
                    |/      |
                    0-------1
                     */

                    // example: token = ["3232/5687/4", "3220/5684/4", "3208/5685/4", "3268/5686/4"]
                    addPolygon(polygons, polygonVertices[0], polygonVertices[1], polygonVertices[2]);
                    addPolygon(polygons, polygonVertices[0], polygonVertices[2], polygonVertices[3]);
                }else{
                    // triangular base
                    // already ordered in counterclockwise vertices
                    addPolygon(polygons, polygonVertices[0], polygonVertices[1], polygonVertices[2]);
                }
            } break;
            default:
                console.log(keyword);
        }

        instruction = instructions.next().value;
    }
};

















