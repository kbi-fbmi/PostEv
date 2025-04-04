import { Point } from "@/types";

export const getPointWithLongerLine = (
  x: Point,
  y: Point,
  longerBy: number
): Point => {
  if (x.x === null || y.x === null || x.y === null || y.y === null) {
    throw new Error("Points must have x and y values");
  }

  const dx = x.x - y.x;
  const dy = x.y - y.y;

  const length = Math.sqrt(dx ** 2 + dy ** 2);

  const newLength = length + longerBy;

  const unitDx = dx / length;
  const unitDy = dy / length;

  return {
    x: y.x + unitDx * newLength,
    y: y.y + unitDy * newLength,
  };
};

export const calculateAngleAtCentralPoint = (
  sideA: Point,
  centralPoint: Point,
  sideB: Point
): number => {
  if (
    sideA.x === null ||
    sideA.y === null ||
    centralPoint.x === null ||
    centralPoint.y === null ||
    sideB.x === null ||
    sideB.y === null
  ) {
    throw new Error("Points must have x and y values");
  }

  const vectorACentralX = sideA.x - centralPoint.x;
  const vectorACentralY = sideA.y - centralPoint.y;
  const vectorBCentralX = sideB.x - centralPoint.x;
  const vectorBCentralY = sideB.y - centralPoint.y;

  const dotProduct =
    vectorACentralX * vectorBCentralX + vectorACentralY * vectorBCentralY;
  const magnitudeACentral = Math.sqrt(
    vectorACentralX ** 2 + vectorACentralY ** 2
  );
  const magnitudeBCentral = Math.sqrt(
    vectorBCentralX ** 2 + vectorBCentralY ** 2
  );

  if (magnitudeACentral === 0 || magnitudeBCentral === 0) {
    throw new Error("Vector magnitude cannot be zero");
  }

  const cosTheta = dotProduct / (magnitudeACentral * magnitudeBCentral);

  const clippedCosTheta = Math.min(1, Math.max(-1, cosTheta));

  const angleRadians = Math.acos(clippedCosTheta);

  let angleDegrees = angleRadians * (180 / Math.PI);

  if (angleDegrees > 180) {
    angleDegrees = 360 - angleDegrees;
  }

  return parseFloat(angleDegrees.toFixed(3));
};
