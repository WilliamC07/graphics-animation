import {
    addEdge,
    EdgeMatrix,
    multiplyEdgeMatrix, PolygonMatrix,
    toInteger,
} from "../matrix";
import {
    toIdentity,
    toMove,
    toRotate,
    Axis,
    toScale,
    Transformer,
    createTransformer, deepCopyTransformer
} from "../transformations";
import Image from "../image";
import {bezierCurve, drawCircle, hermiteCurve, drawBox, drawSphere, drawTorus} from "../render/draw";
import {objParser} from "./obj-parser";
const {spawn} = require('child_process');
import path from 'path'
import {SymbolColor} from "../render/lighting";

interface ParsedMDLCommand {
    args: null|number[]|string[],
    op: string,
    constants?: string, // refer to MDLSymbol
    knob?: string|null,
    cs?: string|null,
}
type ParsedMDLSymbol = [
    string, // "constants"
    {
        // ambient, diffuse, specular factor
        blue: [number, number, number],
        green: [number, number, number],
        red: [number, number, number],
    }
]
interface ParsedMDL {
    commands: ParsedMDLCommand[],
    symbols: {
        [constantName: string]: ParsedMDLSymbol
    }
}

/**
 * Parses the provided file name to a JSON that can be more easily parsed. Uses a python library to do so.
 * @param fileName
 * @param edgeMatrix
 * @param polygonMatrix
 * @param transformer
 * @param image
 */
const parse = (fileName: string, edgeMatrix: EdgeMatrix, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image) => {
    const file_path = path.join(process.cwd(), fileName);
    const python_parser = spawn('python3', ["./src/parser/ply/main.py", file_path]);
    let parsedMDL;
    python_parser.stdout.on('data', function(data: any){
        parsedMDL = JSON.parse(data.toString());
        parseMDL(parsedMDL, edgeMatrix, polygonMatrix, image);
    });
};

const symbols = new Map<string, SymbolColor>();
// default value if no color is chosen by the mdl file
const DEFAULT_WHITE = "default.white";
symbols.set(DEFAULT_WHITE, {
    red: [0.2, 0.5, 0.5],
    green: [0.2, 0.5, 0.5],
    blue: [0.2, 0.5, 0.5]
});

function parseMDL(parsedMDL: ParsedMDL, edgeMatrix: EdgeMatrix, polygonMatrix: PolygonMatrix, image: Image){
    // parse the symbols out of the MDL
    for(const [symbolName, values] of Object.entries(parsedMDL.symbols)){
        // remove the "constants" entry
        if(values[0] === "constants"){
            // example of values[1]: 0.3
            symbols.set(symbolName, values[1]);
        }
    }
    /* parse the commands */

    // first element of the stack is an identity matrix
    const transformationStack: Transformer[] = [createTransformer()];
    for(const command of parsedMDL.commands){
        const transformerPeekStack = transformationStack[transformationStack.length - 1];

        switch(command.op){
            // constants are parsed out already
            case 'constants': break;

            // 3d shapes
            case 'sphere': sphere(command.args as number[], symbols.get(command.constants), polygonMatrix, transformerPeekStack, image); break;
            case 'box': box(command.args as number[], symbols.get(command.constants), polygonMatrix, transformerPeekStack, image); break;
            case 'torus': torus(command.args as number[], symbols.get(command.constants), polygonMatrix, transformerPeekStack, image); break;
            case 'mesh': mesh(symbols.get(command.constants), (command.args as string[])[0], polygonMatrix, transformerPeekStack, image); break;

            // transformation
            case 'push': push(transformationStack); break;
            case 'pop': pop(transformationStack); break;
            case 'move': move(command.args as number[], transformerPeekStack, command.knob); break;
            case 'rotate': rotate(command.args, transformerPeekStack, command.knob); break;
            case 'scale': scale(command.args, transformerPeekStack, command.knob); break;

            // controls
            case 'display': display(image, edgeMatrix); break;
            case 'save': save((command.args as string[])[0], image, edgeMatrix, polygonMatrix); break;
            case 'clear': clear(edgeMatrix, polygonMatrix, image); break;

            default: {
                throw new Error("Failed to parse: " + command.op);
            }
        }
    }
}

function mesh(color: SymbolColor, fileName: string, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image){
    if(fileName.endsWith(".obj")){
        objParser(fileName, polygonMatrix);
        multiplyEdgeMatrix(transformer, polygonMatrix);
        draw(image, polygonMatrix, color);
    }
}

function bezier(parameter: string, edgeMatrix: EdgeMatrix){
    const [x0, y0, x1, y1, x2, y2, x3, y3] = parameter.split(" ").map(val => parseInt(val));
    bezierCurve(x0, y0, x1, y1, x2, y2, x3, y3, edgeMatrix);
}

function box(args: number[], color: SymbolColor, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image){
    const [x, y, z, width, height, depth] = args;
    drawBox(x, y, z, width, height, depth, polygonMatrix);
    multiplyEdgeMatrix(transformer, polygonMatrix);
    draw(image, polygonMatrix, color);
}

function circle(parameter: string, edgeMatrix: EdgeMatrix){
    const [cx, cy, cz, r] = parameter.split(" ").map(val => parseInt(val));
    drawCircle(cx, cy, r, edgeMatrix);
}

function clear(edgeMatrix: EdgeMatrix, polygonMatrix: PolygonMatrix, image: Image){
    edgeMatrix.length = 0;
    polygonMatrix.length = 0;
    image.clear();
}

function display(image: Image, edgeMatrix: EdgeMatrix){
    toInteger(edgeMatrix);
    image.drawEdges(edgeMatrix);
    image.display();
}

function hermite(parameter: string, edgeMatrix: EdgeMatrix){
    const [x0, y0, x1, y1, rx0, ry0, rx1, ry1] = parameter.split(" ").map(val => parseInt(val));
    hermiteCurve(x0, y0, x1, y1, rx0, ry0, rx1, ry1, edgeMatrix);
}

function line(parameter: string, edgeMatrix: EdgeMatrix){
    const [x0, y0, z0, x1, y1, z1] = parameter.split(" ").map(value => parseInt(value));
    addEdge(edgeMatrix, [x0, y0, z0], [x1, y1, z1]);
}

/**
 * Adds the move transformation to the transformer
 * @param args [x, y, z]
 * @param transformer Transformer to be modified
 * @param knob
 */
function move(args: number[], transformer: Transformer, knob?: string|null){
    const [x, y, z] = args;
    toMove(transformer, x, y, z);
}

/**
 * Adds the rotate transformation to the transformer
 * @param args ["x"|"y"|"z", degrees]
 * @param transformer
 * @param knob
 */
function rotate(args: any[], transformer: Transformer, knob?: string|null){
    const axis = args[0] as keyof typeof Axis;
    const degrees = args[1];
    toRotate(transformer, degrees, Axis[axis]);
}

/**
 * Adds the scale transformation to the transformer
 * @param args [x, y, z]
 * @param transformer
 * @param knob
 */
function scale(args: any[], transformer: Transformer, knob?: string|null){
    const [x, y, z] = args;
    toScale(transformer, x, y, z);
}

function sphere(args: number[], color: SymbolColor, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image, cs?: string){
    const [x, y, z, radius] = args;
    drawSphere(polygonMatrix, x, y, z, radius);
    multiplyEdgeMatrix(transformer, polygonMatrix);
    draw(image, polygonMatrix, color);
}

function torus(args: number[], color: SymbolColor, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image){
    const [x, y, z, radius1, radius2] = args;
    drawTorus(polygonMatrix, x, y, z, radius1, radius2);
    multiplyEdgeMatrix(transformer, polygonMatrix);
    draw(image, polygonMatrix, color);
}

function pop(transformationStack: Transformer[]){
    transformationStack.pop();
}

function push(transformationStack: Transformer[]){
    // push deep copy on
    const peekStack: Transformer = transformationStack[transformationStack.length - 1];
    transformationStack.push(deepCopyTransformer(peekStack));
}

function save(fileName: string, image: Image, edgeMatrix: EdgeMatrix, polygonMatrix: PolygonMatrix){
    if(!fileName.endsWith(".png")){
        fileName += ".png";
    }
    console.log("saving as", fileName);
    image.saveToDisk(fileName);
    image.clear();
}

function draw(image: Image, polygonMatrix: PolygonMatrix, symbolColor: SymbolColor){
    if(symbolColor == undefined){
        symbolColor = symbols.get(DEFAULT_WHITE);
    }
    toInteger(polygonMatrix);
    image.drawPolygons(polygonMatrix, symbolColor);
    // clear polygon drawn
    polygonMatrix.length = 0;
}

export default parse;