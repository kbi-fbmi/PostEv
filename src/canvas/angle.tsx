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
import { Line as KonvaLine, Text } from "react-konva";
import { throttle } from "lodash";
import { useAppStore } from "@/store";
import { hasValidPixelSpacing } from "@/helpers/pixelSpacing";

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
  handlePhotoAngleValues: (calculateAngle: CalculatedAngle) => void;
  stageScale: number;
  pixelSpacingMm?: { row: number | null; column: number | null } | null;
}

const Angle = ({
  angle,
  points,
  setPoints,
  curIndex,
  tool,
  photoSize,
  handlePhotoAngleValues,
  stageScale,
  pixelSpacingMm = null,
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

  const getVerticalLine = useCallback((): Line | null => {
    const extraLine = angle.VerticalLines?.[0];
    if (!extraLine) return null;
    const pt = localPoints.find((p) => p.index === extraLine.pointIndex);
    if (
      !pt ||
      typeof pt.point.x !== "number" ||
      typeof pt.point.y !== "number"
    )
      return null;
    return {
      start: { x: pt.point.x, y: 0 },
      end: { x: pt.point.x, y: photoSize.height },
    };
  }, [angle, localPoints, photoSize.height]);

  const resolveHorizontalLimit = useCallback(
    (limit: { type: string; index: number } | null | undefined, fallback: number): number => {
      if (!limit) return fallback;
      if (limit.type === "point") {
        const pt = localPoints.find((p) => p.index === limit.index);
        if (pt && typeof pt.point.x === "number") return pt.point.x;
      }
      if (limit.type === "verticalLine") {
        const vEntry = angle.VerticalLines?.[limit.index];
        if (vEntry) {
          const vPt = localPoints.find((p) => p.index === vEntry.pointIndex);
          if (vPt && typeof vPt.point.x === "number") return vPt.point.x;
        }
      }
      return fallback;
    },
    [angle, localPoints]
  );

  const getHorizontalLine = useCallback((): Line | null => {
    const extraLine = angle.HorizontalLines?.[0];
    if (!extraLine) return null;
    const pt = localPoints.find((p) => p.index === extraLine.pointIndex);
    if (
      !pt ||
      typeof pt.point.x !== "number" ||
      typeof pt.point.y !== "number"
    )
      return null;
    const y = pt.point.y;
    const startX = resolveHorizontalLimit(extraLine.startAt, 0);
    const endX   = resolveHorizontalLimit(extraLine.endAt,   photoSize.width);
    return {
      start: { x: startX, y },
      end:   { x: endX,   y },
    };
  }, [angle, localPoints, photoSize.width, resolveHorizontalLimit]);


  // Perpendicular gap from the `LengthFrom` point to the plumb line, in px and
  // (if calibrated) mm. Horizontal gap scales by column spacing, vertical by row.
  const computeLength = useCallback(():
    | { px: number; mm: number | null }
    | undefined => {
    if (!angle.LengthFrom) return undefined;
    const pt = localPoints.find((p) => p.index === angle.LengthFrom!.fromPointIndex);
    if (!pt || typeof pt.point.x !== "number" || typeof pt.point.y !== "number")
      return undefined;

    const pxLength =
      angle.LengthFrom.referenceLine === "vertical"
        ? (() => {
            const vLine = getVerticalLine();
            if (!vLine || typeof vLine.start.x !== "number") return undefined;
            return Math.abs(pt.point.x - vLine.start.x);
          })()
        : (() => {
            const hLine = getHorizontalLine();
            if (!hLine || typeof hLine.start.y !== "number") return undefined;
            return Math.abs(pt.point.y - hLine.start.y);
          })();

    if (typeof pxLength !== "number") return undefined;

    if (!hasValidPixelSpacing(pixelSpacingMm)) {
      return { px: pxLength, mm: null };
    }

    const spacing =
      angle.LengthFrom.referenceLine === "vertical"
        ? pixelSpacingMm.column
        : pixelSpacingMm.row;

    if (typeof spacing === "number" && !Number.isNaN(spacing) && spacing > 0) {
      return { px: pxLength, mm: pxLength * spacing };
    }

    return { px: pxLength, mm: null };
  }, [angle, localPoints, getVerticalLine, getHorizontalLine, pixelSpacingMm]);

  const calculateAngles = useCallback(() => {
    if (!angle || !angle.ShownedAngles || !linePoints.length) return;

    const newCalculatedAngles: CalculatedAngle[] = [];
    const lengthResult = computeLength();

    if (angle.HorizontalLines?.length) {
      const horizontalLine = getHorizontalLine();
      if (!horizontalLine) return;
      const connLine = linePoints[0]; 
      if (!connLine) return;

      const intersectionPoint = findIntersection(connLine, horizontalLine);
      if (!intersectionPoint) return;

      if (
        typeof connLine.start.x === "number" &&
        typeof connLine.start.y === "number" &&
        typeof connLine.end.x === "number" &&
        typeof connLine.end.y === "number"
      ) {
        const vectorA = {
          x: connLine.end.x - connLine.start.x,
          y: connLine.end.y - connLine.start.y,
        };
        const vectorB = { x: 1, y: 0 };

        const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
        const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2);

        if (magnitudeA === 0) return;

        const cosValue = Math.max(-1, Math.min(1, dotProduct / magnitudeA));
        const angleRadians = Math.acos(cosValue);
        let angleDegrees = (angleRadians * 180) / Math.PI;
        if (angleDegrees > 90) angleDegrees = 180 - angleDegrees;

        newCalculatedAngles.push({
          x: intersectionPoint.x,
          y: intersectionPoint.y,
          angle: angleDegrees,
          length: lengthResult?.mm ?? undefined,
          lengthPx: lengthResult?.px,
        });
      }
    } else if (angle.VerticalLines?.length) {
      const verticalLine = getVerticalLine();
      if (!verticalLine) return;
      const csvlLine = linePoints[0]; 
      if (!csvlLine) return;

      const intersectionPoint = findIntersection(csvlLine, verticalLine);
      if (!intersectionPoint) return;

      if (
        typeof csvlLine.start.x === "number" &&
        typeof csvlLine.start.y === "number" &&
        typeof csvlLine.end.x === "number" &&
        typeof csvlLine.end.y === "number"
      ) {
        const vectorA = {
          x: csvlLine.end.x - csvlLine.start.x,
          y: csvlLine.end.y - csvlLine.start.y,
        };
        const vectorB = { x: 0, y: 1 };

        const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
        const magnitudeA = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2);

        if (magnitudeA === 0) return;

        const cosValue = Math.max(
          -1,
          Math.min(1, dotProduct / magnitudeA)
        );
        const angleRadians = Math.acos(cosValue);
        let angleDegrees = (angleRadians * 180) / Math.PI;
        if (angleDegrees > 90) angleDegrees = 180 - angleDegrees;

        newCalculatedAngles.push({
          x: intersectionPoint.x,
          y: intersectionPoint.y,
          angle: angleDegrees,
          length: lengthResult?.mm ?? undefined,
          lengthPx: lengthResult?.px,
        });
      }
    } else {
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
    }

    setCalculateAnglesArray(newCalculatedAngles);

    if (newCalculatedAngles.length > 0 && !angleValuesProcessed.current) {
      angleValuesProcessed.current = true;
      if (newCalculatedAngles[0]) {
        handlePhotoAngleValues(newCalculatedAngles[0]);
      }
    }
  }, [
    linePoints,
    angle,
    findIntersection,
    handlePhotoAngleValues,
    getVerticalLine,
    getHorizontalLine,
    computeLength,
  ]);

  const updateLinePoints = useCallback(() => {
    if (!angle || !angle.Connections || !localPoints.length) return;

    const newLinePoints: Line[] = [];
    const largerImageDimension = Math.max(photoSize.width, photoSize.height);
    const baseOverlapSize = largerImageDimension / 300;

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
            connection.startOverlap * 1 * baseOverlapSize
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
            connection.endOverlap * 1 * baseOverlapSize
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
            connection.startOverlap * 1 * baseOverlapSize
          );

          const endPoint = getPointWithLongerLine(
            secondPoint.point,
            firstPoint.point,
            connection.endOverlap * 1 * baseOverlapSize
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

    if (angle.ParalelLines) {
      angle.ParalelLines.forEach((paraLine) => {
        const atConn = angle.Connections[paraLine.atConnection];
        if (!atConn) return;
        const originIndex =
          paraLine.atEnd === "start" ? atConn.startIndex : atConn.endIndex;
        const originPt = localPoints.find((p) => p.index === originIndex);
        if (
          !originPt ||
          typeof originPt.point.x !== "number" ||
          typeof originPt.point.y !== "number"
        )
          return;

        const refLine = newLinePoints[paraLine.parallelTo];
        if (
          !refLine ||
          typeof refLine.start.x !== "number" ||
          typeof refLine.start.y !== "number" ||
          typeof refLine.end.x !== "number" ||
          typeof refLine.end.y !== "number"
        )
          return;

        const dx = refLine.end.x - refLine.start.x;
        const dy = refLine.end.y - refLine.start.y;

        newLinePoints.push({
          start: { ...originPt.point },
          end: { x: originPt.point.x + dx, y: originPt.point.y + dy },
        });
      });
    }

    if (JSON.stringify(newLinePoints) !== JSON.stringify(linePoints)) {
      setLinePoints(newLinePoints);
    }
  }, [angle, localPoints, photoSize.width, photoSize.height]);

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
        stageScale={stageScale}
      />
    ));
  }, [linePoints, stageScale]);

  const angleTexts = useMemo(() => {
    const baseFontSize = 20;
    const fontSize = baseFontSize / Math.max(stageScale, 0.001);
    const offset = fontSize * 0.5;
    const angleLabelOffsetX = fontSize * 0.9;

    // Midpoint of the measured connection line, so the length label sits on
    // the line rather than on the angle vertex.
    const seg = linePoints[0];
    const segMid =
      seg &&
      typeof seg.start.x === "number" &&
      typeof seg.start.y === "number" &&
      typeof seg.end.x === "number" &&
      typeof seg.end.y === "number"
        ? { x: (seg.start.x + seg.end.x) / 2, y: (seg.start.y + seg.end.y) / 2 }
        : null;

    return calculateAnglesArray.flatMap((calculatedAngle, index) => {
      const nodes: React.ReactNode[] = [];

      if (!angle.HideAngle) {
        nodes.push(
          <Text
            key={`angle-${index}`}
            text={`${calculatedAngle.angle.toFixed(1)}°`}
            x={calculatedAngle.x + angleLabelOffsetX}
            y={calculatedAngle.y - offset}
            fill={lineColor}
            fontSize={fontSize}
            shadowBlur={10}
            perfectDrawEnabled={false}
          />
        );
      }

      let lengthLabel: string | null = null;
      if (typeof calculatedAngle.length === "number") {
        lengthLabel = `${(calculatedAngle.length / 10).toFixed(1)} cm`;
      } else if (
        typeof calculatedAngle.lengthPx === "number" &&
        angle.LengthFrom
      ) {
        lengthLabel = `${Math.round(calculatedAngle.lengthPx)} px`;
      }

      if (lengthLabel) {
        const anchor = segMid ?? { x: calculatedAngle.x, y: calculatedAngle.y };
        // Konva Text is top-left anchored; offset back by half the box to centre it.
        const boxW = fontSize * 6;
        const boxH = fontSize * 1.4;
        nodes.push(
          <Text
            key={`length-${index}`}
            text={lengthLabel}
            x={anchor.x}
            y={anchor.y}
            width={boxW}
            height={boxH}
            offsetX={boxW / 2}
            offsetY={boxH / 2}
            align="center"
            verticalAlign="middle"
            fill={lineColor}
            fontSize={fontSize}
            shadowBlur={10}
            perfectDrawEnabled={false}
          />
        );
      }

      return nodes;
    });
  }, [
    calculateAnglesArray,
    linePoints,
    stageScale,
    lineColor,
    angle.HideAngle,
    angle.LengthFrom,
  ]);

  const pointComponents = useMemo(() => {
    return localPoints.map((point) => (
      <Point
        key={`point-${point.index}`}
        point={point.point}
        disabled={false}
        info={point.point.info || ""}
        setFunction={(newPoint) => setPoint(point.index, newPoint)}
        stageScale={stageScale}
      />
    ));
  }, [localPoints, stageScale, setPoint]);

  const verticalLineComponent = useMemo(() => {
    if (!angle.VerticalLines?.length) return null;
    const vLine = getVerticalLine();
    if (
      !vLine ||
      typeof vLine.start.x !== "number" ||
      typeof vLine.start.y !== "number" ||
      typeof vLine.end.x !== "number" ||
      typeof vLine.end.y !== "number"
    )
      return null;
    const sx = vLine.start.x;
    const sy = vLine.start.y;
    const ex = vLine.end.x;
    const ey = vLine.end.y;
    const baseStrokeWidth = 2;
    const strokeWidth = baseStrokeWidth / Math.max(stageScale, 0.001);
    return (
      <KonvaLine
        points={[sx, sy, ex, ey]}
        stroke={lineColor}
        strokeWidth={strokeWidth}
        dash={[10 / stageScale, 6 / stageScale]}
        shadowBlur={1}
        shadowOpacity={0.5}
        perfectDrawEnabled={false}
        listening={false}
      />
    );
  }, [angle.VerticalLines, getVerticalLine, stageScale, lineColor]);

  const horizontalLineComponent = useMemo(() => {
    if (!angle.HorizontalLines?.length) return null;
    const hLine = getHorizontalLine();
    if (
      !hLine ||
      typeof hLine.start.x !== "number" ||
      typeof hLine.start.y !== "number" ||
      typeof hLine.end.x !== "number" ||
      typeof hLine.end.y !== "number"
    )
      return null;
    const sx = hLine.start.x;
    const sy = hLine.start.y;
    const ex = hLine.end.x;
    const ey = hLine.end.y;
    const baseStrokeWidth = 2;
    const strokeWidth = baseStrokeWidth / Math.max(stageScale, 0.001);
    return (
      <KonvaLine
        points={[sx, sy, ex, ey]}
        stroke={lineColor}
        strokeWidth={strokeWidth}
        shadowBlur={1}
        shadowOpacity={0.5}
        perfectDrawEnabled={false}
        listening={false}
      />
    );
  }, [angle.HorizontalLines, getHorizontalLine, stageScale, lineColor]);

  return (
    <>
      {verticalLineComponent}
      {horizontalLineComponent}
      {connections}
      {angleTexts}
      {pointComponents}
    </>
  );
};

export default React.memo(Angle);
