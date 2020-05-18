import {dotProduct, normalizeVector, scaleVector, subtractVector, Vector} from "../utility/math-utility";

export interface SymbolColor {
    // ambient, diffuse, specular factor
    blue: [number, number, number],
    green: [number, number, number],
    red: [number, number, number],
}

// the vector the user is looking from
export const viewingVector: Vector = [0, 0, 1];
export function setViewingVector(x: number, y: number, z: number){
    viewingVector[0] = x;
    viewingVector[1] = y;
    viewingVector[2] = z;
}

// light
export const lightVector: Vector = [0.5, 0.75, 1];
export function setLightVector(x: number, y: number, z: number){
    viewingVector[0] = x;
    viewingVector[1] = y;
    viewingVector[2] = z;
}

// color of light
// value range from [0, 255]
export type Color = {
    red: number,
    green: number,
    blue: number
}
export const ambientLightColor: Color = {
    red: 255,
    green: 255,
    blue: 255
};
export const pointLightColor: Color = {
    red: 255,
    green: 255,
    blue: 255
};

export function calculateColor(surfaceNormal: Vector, factor: SymbolColor): String{
    const normalizedLightVector = normalizeVector(lightVector);
    const normalizedSurfaceNormal = normalizeVector(surfaceNormal);

    const diffuseReflectionFactor = Math.max(dotProduct(normalizedSurfaceNormal, normalizedLightVector), 0);

    const AMBIENT = 0;
    const DIFFUSE = 1;
    const SPECULAR = 2;

    // color = ambientColor + diffuseColor + specularColor
    const red = ambientLightColor.red * factor.red[AMBIENT]
        + pointLightColor.red * factor.red[DIFFUSE] * (diffuseReflectionFactor);
        + calculateSpecularColorValue(normalizedSurfaceNormal, normalizedLightVector, pointLightColor.red, factor.red[SPECULAR]);
    const green = ambientLightColor.green * factor.green[AMBIENT]
        + pointLightColor.green * factor.green[DIFFUSE] * (diffuseReflectionFactor)
        + calculateSpecularColorValue(normalizedSurfaceNormal, normalizedLightVector, pointLightColor.green, factor.green[SPECULAR]);
    const blue = ambientLightColor.blue * factor.blue[AMBIENT]
        + pointLightColor.blue * factor.blue[DIFFUSE] * (diffuseReflectionFactor)
        + calculateSpecularColorValue(normalizedSurfaceNormal, normalizedLightVector, pointLightColor.blue, factor.blue[SPECULAR]);

    return `${Math.floor(red)} ${Math.floor(green)} ${Math.floor(blue)}`;
}

function calculateSpecularColorValue(normalizedSurfaceNormal: Vector, normalizedLightVector: Vector, colorValue: number, reflectionFactor: number): number {
    const reflectionVector = subtractVector(scaleVector(normalizedSurfaceNormal, 2 * dotProduct(normalizedSurfaceNormal, normalizedLightVector)), normalizedLightVector);
    const factor = dotProduct(reflectionVector, normalizeVector(viewingVector));
    if(factor < 0){
        // no reflection
        return 0;
    }
    return colorValue * reflectionFactor * Math.pow(factor, 4);
}