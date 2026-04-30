import { Angles } from "./types";

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
    { x: null, y: null, info: "CSVL" },
    { x: null, y: null, info: "CSVL" },
    { x: null, y: null, info: "C7" },
    { x: null, y: null, info: "L5" },
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
  apicalVertebra: {
    type: "apicalVertebra",
    VerticalLines: [{ pointIndex: 11 }],
    Connections: [
      { startIndex: 11, endIndex: 12, startOverlap: 0, endOverlap: 0 },
    ],
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
  coronalBalance: {
    type: "coronalBalance",
    VerticalLines: [{ pointIndex: 11 }],
    Connections: [
      { startIndex: 11, endIndex: 13, startOverlap: 0, endOverlap: 0 },
    ],
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
};


