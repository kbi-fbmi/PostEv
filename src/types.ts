export interface Angle {
  type: "totalCC" | "upperCC" | "pisa" | "back" | "apicalVertebra" | "coronalBalance" | "sagittalBalance" | "thoricalSagittalAlignment" | "thoracolumbar" | "cebb";
  Connections: Connection[];
  ShownedAngles: ShownedAngle[];
  ParalelLines?: ParalelLine[];
  VerticalLines?: ExtraLine[];
  HorizontalLines?: ExtraLine[];
}

/** Where a generated line should terminate. */
export interface LineLimit {
  /** "connection" — stop at intersection with a Connection by its index.
   *  "point"      — stop at an explicit point by its index.
   *  "verticalLine"  — stop at the vertical line with this index in VerticalLines.
   *  "horizontalLine" — stop at the horizontal line with this index in HorizontalLines. */
  type: "connection" | "point" | "verticalLine" | "horizontalLine";
  index: number;
}

/** A vertical or horizontal reference line drawn on the canvas. */
export interface ExtraLine {
  pointIndex: number;     // the point this line passes through
  startAt?: LineLimit | null; // null / omitted = image edge
  endAt?: LineLimit | null;   // null / omitted = image edge
}

export interface UsedAngle {
  totalCC: boolean;
  pisa: boolean;
  back: boolean;
  upperCC: boolean;
  apicalVertebra: boolean;
  coronalBalance: boolean;
  sagittalBalance: boolean;
  thoricalSagittalAlignment: boolean;
}

export interface ParalelLine {
  /** Which connection's endpoint is the origin of the parallel line. */
  atConnection: number;
  /** Use the "start" or "end" point of that connection as origin. */
  atEnd: "start" | "end";
  /** Draw a line parallel to this connection (same direction + same length). */
  parallelTo: number;
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
  brightness?: number;
  contrast?: number;
  cropped?: boolean;
}

export interface Angles {
  totalCC: Angle;
  upperCC: Angle;
  pisa: Angle;
  back: Angle;
  apicalVertebra: Angle;
  coronalBalance: Angle;
  sagittalBalance: Angle;
  thoricalSagittalAlignment: Angle;
  thoracolumbar: Angle;
  cebb: Angle;
  filename?: string;
  points: Point[];
}

export interface View {
  tool: string;
  index: number;
}

export interface AngleValues {
  type: "totalCC" | "upperCC" | "pisa" | "back" | "apicalVertebra" | "coronalBalance" | "sagittalBalance" | "thoricalSagittalAlignment" | "thoracolumbar" | "cebb";
  value: CalculatedAngle;
}

export interface PhotoAngleValues {
  name: string;
  angles: AngleValues[];
}
