import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { getPointWithLongerLine } from "@/helpers/angle";
import {
  Angle as AngleType,
  CalculatedAngle,
  Line,
  PointWithIndex,
  Point as PointType,
} from "@/types";
import Point from "./point";
import Connection from "./connection";
import { Text } from "react-konva";
import { throttle } from "lodash";
import { useAppStore } from "@/store";

interface AngleProps {
  angle: AngleType;
  points: PointType[];
  photoMax: {
    x: number;
    y: number;
  };
  setPoints: (points: PointWithIndex[]) => void;
  tool: string;
  curIndex: number;
  photoSize: {
    width: number;
    height: number;
  };
  scale: number;
  handlePhotoAngleValues: (calculateAngle: CalculatedAngle) => void;
}

const Angle = ({
  angle,
  points,
  setPoints,
  curIndex,
  tool,
  photoSize,
  scale,
  handlePhotoAngleValues,
}: AngleProps) => {
  const { lineColor } = useAppStore();
  const [linePoints, setLinePoints] = useState<Line[]>([]);
  const [localPoints, setLocalPoints] = useState<PointWithIndex[]>([]);
  const [calculateAnglesArray, setCalculateAnglesArray] = useState<
    CalculatedAngle[]
  >([]);

  const angleValuesProcessed = useRef<boolean>(false);

  useEffect(() => {
    if (!points || !angle || !angle.Connections) return;

    const neededPoints: PointWithIndex[] = [];

    const pointIndices = new Set<number>();
    angle.Connections.forEach((connection) => {
      pointIndices.add(connection.startIndex);
      pointIndices.add(connection.endIndex);
    });

    Array.from(pointIndices).forEach((index) => {
      if (index >= 0 && index < points.length) {
        const point = points[index];
        let x = point.x;
        let y = point.y;

        if (x === null || y === null) {
          x = photoSize.width / 2 - (Math.random() * photoSize.width) / 4;
          y = photoSize.height / 2 - (Math.random() * photoSize.height) / 4;
        }

        neededPoints.push({
          index,
          point: {
            ...point,
            x,
            y,
            info: point.info || "",
          },
        });
      }
    });

    setLocalPoints(neededPoints);
    angleValuesProcessed.current = false;
  }, [angle, points, photoSize.width, photoSize.height, curIndex, tool]);

  const setPoint = useCallback(
    throttle((index: number, point: PointType) => {
      setLocalPoints((prevPoints) => {
        const pointIndex = prevPoints.findIndex((p) => p.index === index);
        if (pointIndex === -1) return prevPoints;

        const currentPoint = prevPoints[pointIndex].point;
        if (
          typeof currentPoint.x === "number" &&
          typeof currentPoint.y === "number" &&
          typeof point.x === "number" &&
          typeof point.y === "number" &&
          currentPoint.x === point.x &&
          currentPoint.y === point.y
        ) {
          return prevPoints;
        }

        const newPoints = [...prevPoints];
        newPoints[pointIndex] = {
          ...newPoints[pointIndex],
          point: { ...point },
        };
        return newPoints;
      });
    }, 16),
    []
  );

  const innerScale = useMemo(() => scale * 0.002, [scale]);

  const findIntersection = useCallback((line1: Line, line2: Line) => {
    if (
      !line1 ||
      !line2 ||
      typeof line1.start.x !== "number" ||
      typeof line1.start.y !== "number" ||
      typeof line1.end.x !== "number" ||
      typeof line1.end.y !== "number" ||
      typeof line2.start.x !== "number" ||
      typeof line2.start.y !== "number" ||
      typeof line2.end.x !== "number" ||
      typeof line2.end.y !== "number"
    ) {
      return null;
    }

    const { start: p1, end: p2 } = line1;
    const { start: p3, end: p4 } = line2;

    if (
      p1.x === null ||
      p1.y === null ||
      p2.x === null ||
      p2.y === null ||
      p3.x === null ||
      p3.y === null ||
      p4.x === null ||
      p4.y === null
    ) {
      return null;
    }

    const denominator =
      (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);

    if (Math.abs(denominator) < 0.001) {
      return null;
    }

    const a = p1.x * p2.y - p1.y * p2.x;
    const b = p3.x * p4.y - p3.y * p4.x;

    const intersectX = (a * (p3.x - p4.x) - (p1.x - p2.x) * b) / denominator;
    const intersectY = (a * (p3.y - p4.y) - (p1.y - p2.y) * b) / denominator;

    return { x: intersectX, y: intersectY };
  }, []);

  const calculateAngles = useCallback(() => {
    if (!angle || !angle.ShownedAngles || !linePoints.length) return;

    const newCalculatedAngles: CalculatedAngle[] = [];

    angle.ShownedAngles.forEach((showedAngle) => {
      if (
        showedAngle.connectionA.index < 0 ||
        showedAngle.connectionA.index >= linePoints.length ||
        showedAngle.connectionB.index < 0 ||
        showedAngle.connectionB.index >= linePoints.length
      ) {
        return;
      }

      const lineA = linePoints[showedAngle.connectionA.index];
      const lineB = linePoints[showedAngle.connectionB.index];

      if (!lineA || !lineB) return;

      const intersectionPoint = findIntersection(lineA, lineB);
      if (!intersectionPoint) return;

      if (
        typeof lineA.start.x === "number" &&
        typeof lineA.start.y === "number" &&
        typeof lineA.end.x === "number" &&
        typeof lineA.end.y === "number" &&
        typeof lineB.start.x === "number" &&
        typeof lineB.start.y === "number" &&
        typeof lineB.end.x === "number" &&
        typeof lineB.end.y === "number"
      ) {
        const vectorA = {
          x: lineA.end.x - lineA.start.x,
          y: lineA.end.y - lineA.start.y,
        };

        const vectorB = {
          x: lineB.end.x - lineB.start.x,
          y: lineB.end.y - lineB.start.y,
        };

        const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
        const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2);
        const magnitudeB = Math.sqrt(vectorB.x ** 2 + vectorB.y ** 2);

        if (magnitudeA === 0 || magnitudeB === 0) return;

        const cosValue = Math.max(
          -1,
          Math.min(1, dotProduct / (magnitudeA * magnitudeB))
        );
        const angleRadians = Math.acos(cosValue);
        const angleDegrees = (angleRadians * 180) / Math.PI;

        newCalculatedAngles.push({
          x: intersectionPoint.x,
          y: intersectionPoint.y,
          angle: angleDegrees,
        });
      }
    });

    setCalculateAnglesArray(newCalculatedAngles);

    if (newCalculatedAngles.length > 0 && !angleValuesProcessed.current) {
      angleValuesProcessed.current = true;
      if (newCalculatedAngles[0]) {
        handlePhotoAngleValues(newCalculatedAngles[0]);
      }
    }
  }, [linePoints, angle, findIntersection, handlePhotoAngleValues]);

  const updateLinePoints = useCallback(() => {
    if (!angle || !angle.Connections || !localPoints.length) return;

    const newLinePoints: Line[] = [];

    angle.Connections.forEach((connection) => {
      const firstPoint = localPoints.find(
        (p) => p.index === connection.startIndex
      );
      const secondPoint = localPoints.find(
        (p) => p.index === connection.endIndex
      );

      if (
        !firstPoint ||
        !secondPoint ||
        typeof firstPoint.point.x !== "number" ||
        typeof firstPoint.point.y !== "number" ||
        typeof secondPoint.point.x !== "number" ||
        typeof secondPoint.point.y !== "number"
      ) {
        return;
      }

      try {
        if (connection.endOverlap === 0 && connection.startOverlap === 0) {
          newLinePoints.push({
            start: { ...firstPoint.point },
            end: { ...secondPoint.point },
          });
        } else if (
          connection.endOverlap === 0 &&
          connection.startOverlap !== 0
        ) {
          const startPoint = getPointWithLongerLine(
            firstPoint.point,
            secondPoint.point,
            ((connection.startOverlap * 1) / scale) * 20000
          );

          if (
            startPoint &&
            typeof startPoint.x === "number" &&
            typeof startPoint.y === "number"
          ) {
            newLinePoints.push({
              start: startPoint,
              end: { ...secondPoint.point },
            });
          }
        } else if (
          connection.endOverlap !== 0 &&
          connection.startOverlap === 0
        ) {
          const endPoint = getPointWithLongerLine(
            secondPoint.point,
            firstPoint.point,
            ((connection.endOverlap * 1) / scale) * 20000
          );

          if (
            endPoint &&
            typeof endPoint.x === "number" &&
            typeof endPoint.y === "number"
          ) {
            newLinePoints.push({
              start: { ...firstPoint.point },
              end: endPoint,
            });
          }
        } else {
          const startPoint = getPointWithLongerLine(
            firstPoint.point,
            secondPoint.point,
            ((connection.startOverlap * 1) / scale) * 20000
          );

          const endPoint = getPointWithLongerLine(
            secondPoint.point,
            firstPoint.point,
            ((connection.endOverlap * 1) / scale) * 20000
          );

          if (
            startPoint &&
            endPoint &&
            typeof startPoint.x === "number" &&
            typeof startPoint.y === "number" &&
            typeof endPoint.x === "number" &&
            typeof endPoint.y === "number"
          ) {
            newLinePoints.push({
              start: startPoint,
              end: endPoint,
            });
          }
        }
      } catch (error) {
        console.error("Error in line calculation:", error);
      }
    });

    if (JSON.stringify(newLinePoints) !== JSON.stringify(linePoints)) {
      setLinePoints(newLinePoints);
    }
  }, [angle, localPoints]);

  useEffect(() => {
    if (localPoints.length > 0) {
      updateLinePoints();
    }
  }, [localPoints, updateLinePoints]);

  useEffect(() => {
    if (localPoints.length > 0) {
      setPoints(localPoints);
    }
  }, [localPoints, setPoints]);

  useEffect(() => {
    if (linePoints.length > 0) {
      calculateAngles();
    }
  }, [linePoints, calculateAngles]);

  useEffect(() => {
    angleValuesProcessed.current = false;
  }, [tool]);

  const connections = useMemo(() => {
    return linePoints.map((linePoint, index) => (
      <Connection
        key={`connection-${index}`}
        connection={linePoint}
        scale={innerScale}
      />
    ));
  }, [linePoints, innerScale]);

  const angleTexts = useMemo(() => {
    return calculateAnglesArray.map((calculatedAngle, index) => (
      <Text
        key={`angle-${index}`}
        text={`${calculatedAngle.angle.toFixed(1)}°`}
        x={calculatedAngle.x + 10 * innerScale}
        y={calculatedAngle.y - 10 * innerScale}
        fill={lineColor}
        fontSize={20 * innerScale}
        shadowBlur={10}
        perfectDrawEnabled={false}
      />
    ));
  }, [calculateAnglesArray, innerScale, lineColor]);

  const pointComponents = useMemo(() => {
    return localPoints.map((point) => (
      <Point
        key={`point-${point.index}`}
        point={point.point}
        disabled={false}
        info={point.point.info || ""}
        setFunction={(newPoint) => setPoint(point.index, newPoint)}
        scale={innerScale}
      />
    ));
  }, [localPoints, innerScale, setPoint]);

  return (
    <>
      {connections}
      {angleTexts}
      {pointComponents}
    </>
  );
};

export default React.memo(Angle);
