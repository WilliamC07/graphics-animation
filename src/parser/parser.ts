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
import {exec, spawn} from "child_process";
import path from 'path'
import {SymbolColor} from "../render/lighting";
import fs from 'fs';

interface ParsedMDLCommand {
    readonly args: null|number[]|string[],
    readonly op: string,
    readonly constants?: string, // refer to MDLSymbol
    readonly knob?: string|null,
    readonly cs?: string|null,
}
type ParsedMDLSymbol = [
    string, // "constants"
    {
        // ambient, diffuse, specular factor
        readonly blue: [number, number, number],
        readonly green: [number, number, number],
        readonly red: [number, number, number],
    }
]
interface ParsedMDL {
    readonly commands: ParsedMDLCommand[],
    readonly symbols: {
        readonly [constantName: string]: ParsedMDLSymbol
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
    python_parser.stdout.on('data', function(data: string){
        data = data.toString();
        if(data.includes("ERROR")){
            printAndDie("Failed to parse the mdl file. Error: " + data.split("\n")[0]);
        }
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
    // error checking pass
    let isAnimation = false;
    let hasVary: boolean = false;
    let frames: number = undefined;
    let basename: string = undefined;
    let varyCommands: ParsedMDLCommand[] = [];
    let knobs: Map<string, number>[]|undefined;
    const writingToDiskPromises = [];

    // determine if is animation or static image being generated from mdl.
    //
    // if it is an animation, read all the required info: "frames", "basename", and "vary"
    for(const command of parsedMDL.commands){
        // Do a strict check
        switch(command.op){
            case 'frames':
                frames = (command.args as number[])[0];
                isAnimation = true;
                break;
            case 'basename':
                basename = (command.args as string[])[0];
                isAnimation = true;
                break;
            case 'vary':
                hasVary = true;
                varyCommands.push(command);
                break;
        }
    }

    // make sure we have all the animation details
    validateMDL(isAnimation, hasVary, frames, basename);

    // keep track of animation commands and knobs for each frame
    if(isAnimation){
        knobs = new Array(frames);
        for(let frame = 0; frame < frames; frame++){
            knobs[frame] = new Map();
        }
    }

    // generate the knob table
    if(isAnimation){
        generateKnobTable(varyCommands, knobs);
    }

    // generate image
    for(let frame = 0; frame < frames; frame++){
        // first element of the stack is an identity matrix
        const transformationStack: Transformer[] = [createTransformer()];
        console.log("frame", frame);
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
                case 'move': move(command.args as number[], transformerPeekStack, command.knob, knobs[frame]); break;
                case 'rotate': rotate(command.args, transformerPeekStack, command.knob, knobs[frame]); break;
                case 'scale': scale(command.args, transformerPeekStack, command.knob, knobs[frame]); break;

                // controls
                case 'display': display(image, edgeMatrix); break;
                case 'save': save((command.args as string[])[0], image, edgeMatrix, polygonMatrix); break;
                case 'clear': clear(edgeMatrix, polygonMatrix, image); break;

                // animation handle
                case 'vary': break;

                // ignore these animation details since they were parsed earlier
                case 'frames': break;
                case 'basename': break;

                default: {
                    throw new Error("Failed to parse: " + command.op);
                }
            }
        }

        // save as special file if animation, otherwise the file should be saved as the provided save filename already
        if(isAnimation){
            const directory = "animation";
            writingToDiskPromises.push(image.saveToDisk(path.join(directory, basename + frame + ".ppm")));
            // clear the old frame
            image.clear();
        }
    }

    if(isAnimation){
        // turn into a gif
        console.log("Waiting to finish writing frames to disk");
        Promise.all(writingToDiskPromises).then(() => {
            console.log("Converting images to gif");
            // convert to gif
            exec(`convert -delay 10 animation/${basename}{0..${frames - 1}}.ppm ${basename}.gif && animate ${basename}.gif`);
        })
    }
}

/**
 * If the mdl file is of animation type, make sure we have all the needed parameters. Exit the program is any fields
 * are missing. <strong>Does not check if vary has the right parameters.</strong>
 * @param isAnimation
 * @param hasVary
 * @param frames
 * @param basename
 */
function validateMDL(isAnimation: boolean, hasVary: boolean, frames: number|undefined, basename: string|undefined){
    if(isAnimation){
        const errors: string[] = [];
        if(!hasVary){
            errors.push("No 'vary' operation found.");
        }
        if(frames == undefined){
            errors.push("No 'frames' set.")
        }
        if(basename == undefined){
            errors.push("No 'basename' set.")
        }

        // print out errors and die
        if(errors.length !== 0 ){
            printAndDie(errors.join(" "));
        }
    }
}

/**
 * Generates a table that stores knob values for every frame.
 * @param varyCommands
 * @param knobs Should be populated with empty maps. Should be length of frames of animation.
 */
function generateKnobTable(varyCommands: ParsedMDLCommand[], knobs: Map<string, number>[]){
    for(const varyCommand of varyCommands){
        const [startFrame, endFrame, startValue, endValue] = (varyCommand.args as number[]);
        if(startFrame > endFrame){
            printAndDie("Start frame must come before the end frame.")
        }

        const step = (endValue - startValue) / (endFrame - startFrame);
        let currentValue = startValue;
        for(let frame = startFrame; frame <= endFrame; frame++) {
            knobs[frame].set(varyCommand.knob, currentValue);
            currentValue += step;
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
function move(args: number[], transformer: Transformer, knob?: string|null, knobsForFrame?: Map<string, number>){
    let [x, y, z] = args;
    if(knob && knobsForFrame.has(knob)){
        x *= knobsForFrame.get(knob);
        y *= knobsForFrame.get(knob);
        z *= knobsForFrame.get(knob);
    }
    toMove(transformer, x, y, z);
}

/**
 * Adds the rotate transformation to the transformer
 * @param args ["x"|"y"|"z", degrees]
 * @param transformer
 * @param knob
 */
function rotate(args: any[], transformer: Transformer, knob?: string|null, knobsForFrame?: Map<string, number>){
    const axis = args[0] as keyof typeof Axis;
    let degrees = args[1];
    if(knob && knobsForFrame.has(knob)){
        degrees *= knobsForFrame.get(knob);
    }
    toRotate(transformer, degrees, Axis[axis]);
}

/**
 * Adds the scale transformation to the transformer
 * @param args [x, y, z]
 * @param transformer
 * @param knob
 */
function scale(args: any[], transformer: Transformer, knob?: string|null, knobsForFrame?: Map<string, number>){
    let [x, y, z] = args;
    if(knob && knobsForFrame.has(knob)){
        x *= knobsForFrame.get(knob);
        y *= knobsForFrame.get(knob);
        z *= knobsForFrame.get(knob);
    }
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

function printAndDie(message: string){
    console.log("\x1b[41m", message);
    console.log("\x1b[41m", "exiting");
    process.exit();
}

export default parse;