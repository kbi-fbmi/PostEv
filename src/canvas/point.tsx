import type { Point } from "@/types";
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Circle, Text } from "react-konva";
import { throttle } from "lodash";
import { useAppStore } from "@/store";

interface PointProps {
  point: Point;
  disabled: boolean;
  info?: string;
  setFunction: (newPoint: Point) => void;
  scale: number;
}

const Point = ({ point, disabled, info, setFunction, scale }: PointProps) => {
  const textRef = useRef<any>(null);
  const [isHover, setIsHover] = useState<boolean>(false);
  const { lineColor } = useAppStore();

  const isSafari = useMemo(() => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }, []);

  const sizing = useMemo(() => {
    const pointSize = scale * 5;
    return {
      pointSize,
      textOffset: pointSize * 1.4,
      fontSize: pointSize * 1.6,
    };
  }, [scale]);

  useEffect(() => {
    if (textRef.current && !isSafari) {
      textRef.current.to({
        fontSize: 0,
        opacity: 0,
        duration: 0,
      });
    }
  }, [isSafari]);

  const handleDragMove = useCallback(
    throttle((e: any) => {
      const x = e.target.x();
      const y = e.target.y();

      if (typeof x === "number" && typeof y === "number") {
        setFunction({
          x,
          y,
          info: info || "",
        });
      }
    }, 16), // ~60fps
    [setFunction, info]
  );

  const handleMouseOver = useCallback(() => {
    if (isSafari) {
      setIsHover(true);
    } else if (textRef.current && point.x && point.y && !disabled) {
      textRef.current.to({
        fontSize: sizing.fontSize,
        y: point.y - sizing.fontSize / 2,
        opacity: 1,
        duration: 0.2,
      });
    }
  }, [isSafari, disabled, point.x, point.y, sizing.fontSize]);

  const handleMouseLeave = useCallback(() => {
    if (isSafari) {
      setIsHover(false);
    } else if (textRef.current && point.x && point.y && !disabled) {
      textRef.current.to({
        fontSize: 0,
        y: point.y,
        opacity: 0,
        duration: 0.2,
      });
    }
  }, [isSafari, disabled, point.x, point.y]);

  if (typeof point.x !== "number" || typeof point.y !== "number") {
    return null;
  }

  const textElement = isSafari ? (
    <Text
      x={point.x + sizing.textOffset}
      y={point.y - sizing.fontSize / 2}
      text={isHover ? info || "" : ""}
      fill={"#fff"}
      opacity={isHover ? 1 : 0}
      fontSize={sizing.fontSize}
      shadowColor="#000"
      shadowBlur={10}
      shadowOffsetX={1}
      shadowOffsetY={1}
      perfectDrawEnabled={false}
    />
  ) : (
    <Text
      ref={textRef}
      x={point.x + sizing.textOffset}
      y={point.y - sizing.fontSize / 2}
      text={info || ""}
      fill={"#fff"}
      opacity={0}
      fontSize={0}
      shadowColor="#000"
      shadowBlur={10}
      perfectDrawEnabled={false}
    />
  );

  return (
    <>
      {textElement}
      <Circle
        x={point.x}
        y={point.y}
        radius={sizing.pointSize * 6}
        strokeWidth={1}
        opacity={0}
        onDragMove={handleDragMove}
        draggable={!disabled}
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
        shadowBlur={10}
        perfectDrawEnabled={false}
        listening={!disabled}
      />
      <Circle
        x={point.x}
        y={point.y}
        radius={sizing.pointSize}
        stroke={lineColor}
        opacity={1}
        strokeWidth={10}
        onDragMove={handleDragMove}
        draggable={!disabled}
        onMouseOver={handleMouseOver}
        shadowBlur={2}
        shadowOpacity={0.5}
        onMouseLeave={handleMouseLeave}
        perfectDrawEnabled={false}
        listening={!disabled}
      />
    </>
  );
};

export default React.memo(Point, (prevProps, nextProps) => {
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.scale === nextProps.scale &&
    prevProps.info === nextProps.info &&
    prevProps.point.x === nextProps.point.x &&
    prevProps.point.y === nextProps.point.y
  );
});
