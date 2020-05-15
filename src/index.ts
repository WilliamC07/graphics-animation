import parse from "./parser/parser";
import Image from "./image";
import {createTransformer, toIdentity, toScale} from "./transformations";
import {createEdgeMatrix, createPolygonMatrix} from "./matrix";
import {objParser} from "./parser/obj-parser";
import {performance} from "perf_hooks";
import fs from 'fs';

const image = new Image(500, 500);
const edges = createEdgeMatrix();
// This will be treated as an edge matrix, but needs to be created into triangles
const polygons = createPolygonMatrix();
const transformer = createTransformer();

// Create a directory for storing animation frames
if(!fs.existsSync("animation")){
    fs.mkdirSync("animation");
}

const startTime = performance.now();

const scriptFileName = process.argv[2]; // 0th argument is 'node', 1st is 'src/index.js' and 2nd is the script file

parse(scriptFileName, edges, polygons, transformer, image);

console.log(`Took ${performance.now() - startTime} milliseconds to generate image`);

const memoryReserved = process.memoryUsage().rss / 1024 / 1024;
const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
const heapReserved = process.memoryUsage().heapTotal / 1024 / 1024;
console.log(`${Math.round(memoryReserved * 100 /100)} MB Total Memory reserved`);
console.log(`${Math.round(heapUsed * 100) / 100} MB Used on Heap (of ${Math.round(heapReserved * 100 / 100)} MB)`);