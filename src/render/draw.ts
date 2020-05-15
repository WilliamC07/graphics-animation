import {addEdge, addPolygon, EdgeMatrix, multiply, Point, PolygonMatrix} from "../matrix";

const step = 20;

type Equation = (t: number) => number;

export function drawCircle(cx: number, cy: number, radius: number, edgeMatrix: EdgeMatrix){
    drawEllipse(cx, cy, radius, radius, edgeMatrix);
}

export function drawEllipse(cx: number, cy: number, xRadius: number, yRadius: number, edgeMatrix: EdgeMatrix){
    const equationX: Equation = (t) => cx + xRadius * Math.cos(t);
    const equationY: Equation = (t) => cy + yRadius * Math.sin(t);
    const equationZ: Equation = (t) => t;
    parametric(equationX, equationY, equationZ, 2 * Math.PI, .001, edgeMatrix);
}

/**
 * Construct a curve using the bezier formula.
 * @param x0
 * @param y0
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 * @param x3
 * @param y3
 * @param edgeMatrix
 */
export function bezierCurve(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, edgeMatrix: EdgeMatrix){
    /*
    Same as:
    (t) => (-x0 + 3 * x1 - 3 * x2 + x3) * Math.pow(t, 3) +
           (3 * x0 - 6 * x1 + 3 * x2) * Math.pow(t, 2) +
           (-3 * x0 + 3 * x1) * t +
           (x0);
     */
    const equationX: Equation = (t) => x0 + t * (-3 * x0 + 3 * x1 + t * (3 * x0 - 6 * x1 + 3 * x2 + t * (-x0 + 3 * x1 - 3 * x2 + x3)));
    /*
    Same as:
    (t) => (-y0 + 3 * y1 - 3 * y2 + y3) * Math.pow(t, 3) +
           (3 * y0 - 6 * y1 + 3 * y2) * Math.pow(t, 2) +
           (-3 * y0 + 3 * y1) * t +
           (y0);
     */
    const equationY: Equation = (t) => y0 + t * (-3 * y0 + 3 * y1 + t * (3 * y0 - 6 * y1 + 3 * y2 + t * (-y0 + 3 * y1 - 3 * y2 + y3)));
    const equationZ: Equation = (t) => 0;
    parametric(equationX, equationY, equationZ, 1, .001, edgeMatrix);
}

export function hermiteCurve(x0: number, y0: number, x1: number, y1: number, rx0: number, ry0: number, rx1: number, ry1: number, edgeMatrix: EdgeMatrix){
    // https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Unit_interval_(0,_1)
    // Of the form f(x) = ax^3 + bx^2 + cx + d
    let xCoefficients = [2 * x0 - 2 * x1 + rx0 + rx1,
                         -3 * x0 + 3 * x1 - 2 * rx0 - rx1,
                         rx0,
                         x0];
    const equationX: Equation = (t) => xCoefficients[0] * Math.pow(t, 3) +
                                       xCoefficients[1] * Math.pow(t, 2) +
                                       xCoefficients[2] * t +
                                       xCoefficients[3];

    // Of the form f(x) = ax^3 + bx^2 + cx + d
    let yCoefficients = [2 * y0 - 2 * y1 + ry0 + ry1,
                         -3 * y0 + 3 * y1 - 2 * ry0 - ry1,
                         ry0,
                         y0];
    const equationY: Equation = (t) => yCoefficients[0] * Math.pow(t, 3) +
                                       yCoefficients[1] * Math.pow(t, 2) +
                                       yCoefficients[2] * t +
                                       yCoefficients[3];
    const equationZ: Equation = (t) => 0;
    parametric(equationX, equationY, equationZ, 1, .001, edgeMatrix);
}

/**
 * Dots are vertices that you can see
 *
 |----> This is the (x, y, z)
 |
 .-----.
 | \    \
 |  \    \
 |   .----.
  \  |    |
   \ |    |
    .-----.
 *
 *
 * @param x
 * @param y
 * @param z
 * @param width
 * @param height
 * @param depth
 * @param polygonMatrix
 */
export function drawBox(x: number, y: number, z: number, width: number, height: number, depth: number, polygonMatrix: PolygonMatrix){
    const v: Point[] = [
        [x, y, z],  // 0 a
        [x + width, y, z],  // 1 b
        [x, y - height, z],  // 2 c
        [x + width, y - height, z],  // 3 d
        [x, y, z - depth],  // 4 e
        [x + width, y, z - depth],  // 5 f
        [x, y - height, z - depth],  // 6 g
        [x + width, y - height, z - depth],  // 7 h
    ];

    // front
    addPolygon(polygonMatrix, v[0], v[2], v[3]);
    addPolygon(polygonMatrix, v[0], v[3], v[1]);

    // back
    addPolygon(polygonMatrix, v[7], v[6], v[4]);
    addPolygon(polygonMatrix, v[5], v[7], v[4]);

    // left side
    addPolygon(polygonMatrix, v[4], v[6], v[2]);
    addPolygon(polygonMatrix, v[4], v[2], v[0]);

    // right side
    addPolygon(polygonMatrix, v[3], v[7], v[5]);
    addPolygon(polygonMatrix, v[1], v[3], v[5]);

    // top
    addPolygon(polygonMatrix, v[4], v[0], v[1]);
    addPolygon(polygonMatrix, v[4], v[1], v[5]);

    // bottom
    addPolygon(polygonMatrix, v[2], v[6], v[7]);
    addPolygon(polygonMatrix, v[2], v[7], v[3]);
}

/**
 * Add points to edgeMatrix to render a sphere
 * @param polygonMatrix
 * @param centerX Center x coordinate of sphere
 * @param centerY Center y coordinate of sphere
 * @param centerZ Center z coordinate of sphere
 * @param radius Radius of the sphere
 */
export function drawSphere(polygonMatrix: PolygonMatrix, centerX: number, centerY: number, centerZ: number, radius: number){
    const points: Point[][] = generateSpherePoints(centerX, centerY, centerZ, radius);
    for(let arc = 0; arc < points.length; arc++){
        for (let point = 0; point < points[arc].length; point++){
            if(point < points[arc].length - 1){
                // cannot render triangle on very last point (which is a pole)
                addPolygon(polygonMatrix, points[arc][point],
                    points[arc][point + 1],
                    points[(arc + 1) % points.length][point + 1]);
                addPolygon(polygonMatrix, points[arc][point],
                    points[(arc + 1) % points.length][point + 1],
                    points[(arc + 1) % points.length][point]);
            }
        }
    }
}

function generateSpherePoints(centerX: number, centerY: number, centerZ: number, radius: number): Point[][]{
    const points: Point[][] = [];
    for(let sphereStep = 0; sphereStep < step; sphereStep++){
        const sphereRotation = (sphereStep / step) * (2 * Math.PI);  // full rotation about sphere center since we are using semicircle
        const arcPoints: Point[] = [];
        for(let circleStep = 0; circleStep < step; circleStep++){
            const circleRotation = (circleStep / (step - 1)) * (Math.PI); // half a circle
            // Parametric function w/ 2 variables (rotation of sphere and circle)
            const circleX = radius * Math.cos(circleRotation) + centerX;
            const circleY = radius * Math.sin(circleRotation) * Math.cos(sphereRotation) + centerY;
            const circleZ = radius * Math.sin(circleRotation) * Math.sin(sphereRotation) + centerZ;
            // Draw a single pixel instead of lines (assignment detail)
            arcPoints.push([circleX, circleY, circleZ]);
        }
        points.push(arcPoints);
    }
    return points;
}

/**
 * Draws a torus.
 * @param polygonMatrix EdgeMatrix
 * @param centerX Center x coordinate of torus
 * @param centerY Center y coordinate of torus
 * @param centerZ Center z coordinate of torus
 * @param radius1 Distance from center to center of circular cross-section
 * @param radius2 Radius of the circular cross-section
 */
export function drawTorus(polygonMatrix: PolygonMatrix, centerX: number, centerY: number, centerZ: number, radius1: number, radius2: number){
    const points: Point[][] = generateTorusPoints(centerX, centerY, centerZ, radius1, radius2);
    for(let circle = 0; circle < points.length; circle++){
        for(let point = 0; point < points[circle].length; point++){
            addPolygon(polygonMatrix, points[circle][point],
                points[(circle + 1) % step][point],
                points[(circle + 1) % step][(point + 1) % step]);
            addPolygon(polygonMatrix, points[circle][point],
                points[(circle + 1) % step][(point + 1) % step],
                points[circle][(point + 1) % step]);
        }
    }
}

function generateTorusPoints(centerX: number, centerY: number, centerZ: number, radius1: number, radius2: number): Point[][]{
    const points: Point[][] = [];
    for(let torusStep = 0; torusStep < step; torusStep++){
        const torusRotation = (torusStep / step) * (2 * Math.PI);  // full rotation about sphere center since we are using semicircle
        const circlePoints: Point[] = [];
        for(let circleStep = 0; circleStep < step; circleStep++){
            const circleRotation = (circleStep / step) * (2 * Math.PI); // half a circle
            // Parametric function w/ 2 variables (rotation of sphere and circle)
            const circleX = Math.cos(torusRotation) * (radius1 * Math.cos(circleRotation) + radius2)+ centerX;
            const circleY = radius1 * Math.sin(circleRotation)+ centerY;
            const circleZ = -Math.sin(torusRotation) * (radius1 * Math.cos(circleRotation) + radius2)+ centerZ;
            // Draw a single pixel instead of lines (assignment detail)
            circlePoints.push([circleX, circleY, circleZ]);
        }
        points.push(circlePoints);
    }
    return points;
}

/**
 * Using a parametric equation where:
 *  x = equationX(t)
 *  y = equationY(t)
 *  and t is the independent variable whose value goes from 0 inclusive to 1 inclusive
 *
 * @param equationX
 * @param equationY
 * @param equationZ
 * @param coefficient
 * @param deltaStep Since t is from [0, 1], we need to step through it. For example, if this were .01, we would
 *                  iterate through {.01, .02, .03, ..., 1}.
 * @param edgeMatrix
 * @return Points on the parametric equation [x, y, z]
 */
function parametric(equationX: Equation, equationY: Equation, equationZ: Equation, coefficient: number,
                    deltaStep: number, edgeMatrix: EdgeMatrix){
    // How many times we will calculate (x, y) from equationX and equationY
    // Need to convert to integer so we can iterate using a for-loop
    const totalIterations = Math.floor(1 / deltaStep);

    // Finds all the point on the parametric function
    const points: Point[] = [];
    for(let currentStep = 0; currentStep < totalIterations; currentStep++){
        // Convert from integer from back to floating point value between 0 and 1
        const originalStep = currentStep * deltaStep;
        const parameter = coefficient * originalStep;
        points.push([equationX(parameter), equationY(parameter), equationZ(parameter)]);
    }

    // Creates lines to join the point of the parametric function
    for(let i = 0; i < points.length - 1; i++) {
        addEdge(edgeMatrix, points[i], points[i + 1]);
    }

    return points;
}