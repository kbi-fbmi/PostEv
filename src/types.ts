export interface Angle {
  type: "totalCC" | "upperCC" | "pisa" | "back";
  Connections: Connection[];
  ShownedAngles: ShownedAngle[];
  ParalelLines?: ParalelLine[];
}

export interface UsedAngle {
  totalCC: boolean;
  pisa: boolean;
  back: boolean;
  upperCC: boolean;
}

export interface ParalelLine {
  point: number;
  connection: number;
}

export interface Point {
  x: number | null;
  y: number | null;
  info?: string;
}

export interface Connection {
  startIndex: number;
  endIndex: number;
  startOverlap: number;
  endOverlap: number;
}

export interface Line {
  start: Point;
  end: Point;
}

export interface ShownedAngle {
  connectionA: {
    index: number;
    where: "end" | "start";
  };
  connectionB: {
    index: number;
    where: "end" | "start";
  };
}

export interface CalculatedAngle {
  x: number;
  y: number;
  angle: number;
}

export interface PointWithIndex {
  index: number;
  point: Point;
}

export interface Data {
  file: File;
  angle: Angles | null;
  isFlipped: boolean;
  usedAngle: UsedAngle;
  lastSelectedAngleTool: string | null;
}

export interface Angles {
  totalCC: Angle;
  upperCC: Angle;
  pisa: Angle;
  back: Angle;
  filename?: string;
  points: Point[];
}

export interface View {
  tool: string;
  index: number;
}

export interface AngleValues {
  type: "totalCC" | "upperCC" | "pisa" | "back";
  value: CalculatedAngle;
}

export interface PhotoAngleValues {
  name: string;
  angles: AngleValues[];
}
