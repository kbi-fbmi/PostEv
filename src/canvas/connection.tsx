import { useMemo } from "react";
import { Line } from "react-konva";
import { Line as LineType } from "@/types";
import { useAppStore } from "@/store";

interface ConnectionProps {
  connection: LineType;
  scale: number;
}

const Connection = ({ connection, scale }: ConnectionProps) => {
  const { start, end } = connection;
  const { lineColor } = useAppStore();

  const lineData = useMemo(() => {
    if (
      typeof start?.x !== "number" ||
      typeof start?.y !== "number" ||
      typeof end?.x !== "number" ||
      typeof end?.y !== "number"
    ) {
      return null;
    }

    return {
      points: [start.x, start.y, end.x, end.y],
      strokeWidth: scale * 2,
    };
  }, [start?.x, start?.y, end?.x, end?.y, scale]);

  if (!lineData) return null;

  return (
    <Line
      points={lineData.points}
      stroke={lineColor}
      strokeWidth={lineData.strokeWidth}
      shadowBlur={1}
      shadowOpacity={0.5}
      perfectDrawEnabled={false}
      listening={false}
    />
  );
};

export default Connection;
