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
    { x: null, y: null, info: "C1" },
    { x: null, y: null, info: "L5" },
    { x: null, y: null, info: "MA" },
    { x: null, y: null, info: "C7" },
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
        point: 3,
        connection: 2,
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
};
