import { Angles, UsedAngle } from "./types";

// Shared "no tool used yet" baseline; keep in sync with UsedAngle.
export const defaultUsedAngle: UsedAngle = {
  totalCC: false, pisa: false, back: false, upperCC: false,
  apicalVertebra: false, coronalBalance: false, sagittalBalance: false,
  thoricalSagittalAlignment: false, thoracolumbar: false, cebb: false,
  proximalThoracicCobb: false, mainThoracicCobb: false, thoracolumbarCobb: false,
};

export const anglesData: Angles = {
  points: [
    { x: null, y: null, info: "LM" },
    { x: null, y: null, info: "L5" },
    { x: null, y: null, info: "C7" },
    { x: null, y: null, info: "FC" },
    { x: null, y: null, info: "Midpoint feet" },
    { x: null, y: null, info: "Symphysis" },
    { x: null, y: null, info: "Jugulum" },
    { x: null, y: null, info: "C7" },
    { x: null, y: null, info: "L5" },
    { x: null, y: null, info: "MA" },
    { x: null, y: null, info: "C7" },
    { x: null, y: null, info: "C7" },
    { x: null, y: null, info: "Apex" },
    { x: null, y: null, info: "S1" },
    { x: null, y: null, info: "C7" },
    { x: null, y: null, info: "S1" },
    { x: null, y: null, info: "A" },
    { x: null, y: null, info: "B" },
    { x: null, y: null, info: "C" },
    { x: null, y: null, info: "D" },
    {x: null, y: null, info: "E"},
    {x: null, y: null, info: "F"},
    {x: null, y: null, info: "G"},
    {x: null, y: null, info: "H"},
    {x: null, y: null, info: "I"},
    {x: null, y: null, info: "J"},
    {x: null, y: null, info: "K"},
    {x: null, y: null, info: "L"},
    {x: null, y: null, info: "M"},
    {x: null, y: null, info: "N"},
    {x: null, y: null, info: "O"},
    {x: null, y: null, info: "P"},
    {x: null, y: null, info: "Q"},
    {x: null, y: null, info: "R"},
    {x: null, y: null, info: "S"},
    {x: null, y: null, info: "T"},
    {x: null, y: null, info: "U"},
    {x: null, y: null, info: "V"},
    {x: null, y: null, info: "W"},
    {x: null, y: null, info: "X"},
  ],
  totalCC: {
    type: "totalCC",
    Connections: [
      { startIndex: 0, endIndex: 1, startOverlap: 0, endOverlap: 20 },
      { startIndex: 1, endIndex: 2, startOverlap: 0, endOverlap: 0 },
    ],
    ShownedAngles: [
      {
        connectionA: {
          index: 0,
          where: "end",
        },
        connectionB: {
          index: 1,
          where: "start",
        },
      },
    ],
  },
  upperCC: {
    type: "upperCC",
    Connections: [
      { startIndex: 1, endIndex: 3, startOverlap: 0, endOverlap: 20 },
      { startIndex: 3, endIndex: 2, startOverlap: 0, endOverlap: 0 },
      { startIndex: 1, endIndex: 2, startOverlap: 0, endOverlap: 0 },
    ],
    ShownedAngles: [
      {
        connectionA: {
          index: 0,
          where: "end",
        },
        connectionB: {
          index: 1,
          where: "start",
        },
      },
    ],
    ParalelLines: [
      {
        atConnection: 0,
        atEnd: "end",
        parallelTo: 2,
      },
    ],
  },
  pisa: {
    type: "pisa",
    Connections: [
      { startIndex: 4, endIndex: 5, startOverlap: 0, endOverlap: 20 },
      { startIndex: 5, endIndex: 6, startOverlap: 0, endOverlap: 0 },
    ],
    ShownedAngles: [
      {
        connectionA: {
          index: 0,
          where: "end",
        },
        connectionB: {
          index: 1,
          where: "start",
        },
      },
    ],
  },
  back: {
    type: "back",
    Connections: [
      { startIndex: 7, endIndex: 8, startOverlap: 0, endOverlap: 0 },
      { startIndex: 8, endIndex: 9, startOverlap: 0, endOverlap: 0 },
    ],
    ShownedAngles: [
      {
        connectionA: {
          index: 0,
          where: "end",
        },
        connectionB: {
          index: 1,
          where: "start",
        },
      },
    ],
  },
  // C7 (11) + apex (12). Reports the horizontal gap to the C7 plumb line, not an angle.
  apicalVertebra: {
    type: "apicalVertebra",
    VerticalLines: [{ pointIndex: 11 }],
    Connections: [
      { startIndex: 11, endIndex: 12, startOverlap: 0, endOverlap: 0 },
    ],
    LengthFrom: { fromPointIndex: 12, referenceLine: "vertical" },
    HideAngle: true,
    ShownedAngles: [
      {
        connectionA: {
          index: 0,
          where: "start",
        },
        connectionB: {
          index: 1,
          where: "start",
        },
      },
    ],
  },
  // C7 (11) + S1 (13). Angle vs. vertical plus the horizontal gap from S1 to the C7 plumb line.
  coronalBalance: {
    type: "coronalBalance",
    VerticalLines: [{ pointIndex: 11 }],
    Connections: [
      { startIndex: 11, endIndex: 13, startOverlap: 0, endOverlap: 0 },
    ],
    LengthFrom: { fromPointIndex: 13, referenceLine: "vertical" },
    ShownedAngles: [
      {
        connectionA: {
          index: 0,
          where: "start",
        },
        connectionB: {
          index: 1,
          where: "start",
        },
      },
    ],
  },
  // C7 (14) + posterosuperior corner of S1 (15, not L5). Angle vs. horizontal plus the SVA gap.
  sagittalBalance: {
    type: "sagittalBalance",
    VerticalLines: [{ pointIndex: 14 }],
    HorizontalLines: [
      {
        pointIndex: 15,
        startAt: { type: "verticalLine", index: 0 },
        endAt: { type: "point", index: 15 },
      },
    ],
    Connections: [
      { startIndex: 14, endIndex: 15, startOverlap: 0, endOverlap: 0 },
    ],
    LengthFrom: { fromPointIndex: 15, referenceLine: "vertical" },
    ShownedAngles: [
      {
        connectionA: {
          index: 0,
          where: "end",
        },
        connectionB: {
          index: 1,
          where: "end",
        },
      },
    ],
  },
  thoricalSagittalAlignment: {
    type: "thoricalSagittalAlignment",
    Connections: [
      { startIndex: 16, endIndex: 17, startOverlap: 0, endOverlap: 0 },
      { startIndex: 18, endIndex: 19, startOverlap: 0, endOverlap: 0 },
    ],
    ParalelLines: [
      {
        atConnection: 1,
        atEnd: "start",
        parallelTo: 0,
      },
    ],
    ShownedAngles: [
      {
        connectionA: { index: 1, where: "start" },
        connectionB: { index: 2, where: "start" },
      },
    ],
  },
  thoracolumbar: {
    type: "thoracolumbar",
    Connections: [
      { startIndex: 20, endIndex: 21, startOverlap: 0, endOverlap: 0 },
      { startIndex: 22, endIndex: 23, startOverlap: 0, endOverlap: 0 },
    ],
    ParalelLines: [
      {
        atConnection: 1,
        atEnd: "start",
        parallelTo: 0,
      },
    ],
    ShownedAngles: [
      {
        connectionA: { index: 1, where: "start" },
        connectionB: { index: 2, where: "start" },
      },
    ],
  },
  cebb: {
    type: "cebb",
    Connections: [
      { startIndex: 24, endIndex: 25, startOverlap: 0, endOverlap: 0 },
      { startIndex: 26, endIndex: 27, startOverlap: 0, endOverlap: 0 },
    ],
    ParalelLines: [
      {
        atConnection: 1,
        atEnd: "start",
        parallelTo: 0,
      },
    ],
    ShownedAngles: [
      {
        connectionA: { index: 1, where: "start" },
        connectionB: { index: 2, where: "start" },
      },
    ],
  },
  // Proximal thoracic curve: Th1 upper endplate (M-N) vs Th3 lower endplate (O-P).
  proximalThoracicCobb: {
    type: "proximalThoracicCobb",
    Connections: [
      { startIndex: 28, endIndex: 29, startOverlap: 0, endOverlap: 0 },
      { startIndex: 30, endIndex: 31, startOverlap: 0, endOverlap: 0 },
    ],
    ParalelLines: [
      {
        atConnection: 1,
        atEnd: "start",
        parallelTo: 0,
      },
    ],
    ShownedAngles: [
      {
        connectionA: { index: 1, where: "start" },
        connectionB: { index: 2, where: "start" },
      },
    ],
  },
  // Main thoracic curve: Th3 upper endplate (Q-R) vs Th12 lower endplate (S-T).
  mainThoracicCobb: {
    type: "mainThoracicCobb",
    Connections: [
      { startIndex: 32, endIndex: 33, startOverlap: 0, endOverlap: 0 },
      { startIndex: 34, endIndex: 35, startOverlap: 0, endOverlap: 0 },
    ],
    ParalelLines: [
      {
        atConnection: 1,
        atEnd: "start",
        parallelTo: 0,
      },
    ],
    ShownedAngles: [
      {
        connectionA: { index: 1, where: "start" },
        connectionB: { index: 2, where: "start" },
      },
    ],
  },
  // Thoracolumbar curve (coronal Cobb): Th12 upper endplate (U-V) vs L4 lower endplate (W-X).
  thoracolumbarCobb: {
    type: "thoracolumbarCobb",
    Connections: [
      { startIndex: 36, endIndex: 37, startOverlap: 0, endOverlap: 0 },
      { startIndex: 38, endIndex: 39, startOverlap: 0, endOverlap: 0 },
    ],
    ParalelLines: [
      {
        atConnection: 1,
        atEnd: "start",
        parallelTo: 0,
      },
    ],
    ShownedAngles: [
      {
        connectionA: { index: 1, where: "start" },
        connectionB: { index: 2, where: "start" },
      },
    ],
  },
};
