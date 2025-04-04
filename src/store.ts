import { create } from "zustand";
import {
  Angles,
  Data,
  PhotoAngleValues,
  PointWithIndex,
  UsedAngle,
  View,
  CalculatedAngle,
} from "./types";
import toolsData, { Tool } from "./data/tools";
import { anglesData } from "./angles";
import { exportPhotosWithJson } from "./helpers/export";
import { importPhotosWithJson } from "./helpers/import";
import JSZip from "jszip";
import { OnUpdateCallback } from "jszip";

interface AppState {
  tool: string;
  tools: Tool[];
  toolbarHeight: number;
  data: Data[] | null;
  view: View;
  photoAngleValues: PhotoAngleValues[];
  download: boolean;
  zipDownload: boolean;
  zipProgress: number;
  lineColor: string;

  setToolbarHeight: (height: number) => void;
  setTool: (tool: string) => void;
  changeTool: (tool: string) => void;
  setFiles: (files: File[]) => void;
  setPoints: (points: PointWithIndex[]) => void;
  handlePhotoAngleValues: (
    calculateAngle: CalculatedAngle,
    index?: number
  ) => void;
  exportAnglesToCSV: () => void;
  handleZipDownload: (stageRef: any) => Promise<void>;
  handleZipImport: (file: File) => Promise<void>;
  setView: (view: View) => void;
  setDownload: (value: boolean) => void;
  handleDisableFilesTools: (index: number) => void;
  setLineColor: (color: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tool: "drag",
  tools: toolsData,
  toolbarHeight: 0,
  data: null,
  view: { tool: "drag", index: 0 },
  photoAngleValues: [],
  download: false,
  zipDownload: false,
  zipProgress: 0,
  lineColor: "#fff",

  setToolbarHeight: (height) => {
    if (get().toolbarHeight !== height) {
      set({ toolbarHeight: height });
    }
  },

  setTool: (tool) => set({ tool }),

  setView: (view) => set({ view }),

  setDownload: (value) => set({ download: value }),

  setLineColor: (color) => set({ lineColor: color }),

  changeTool: (tool) => {
    const { data, view } = get();

    if (tool === "downloadImage") {
      set({ download: true });
      return;
    }

    if (tool === "downloadImages") {
      set({ tool: "downloadImages" });
      return;
    }

    if (tool === "next" || tool === "previous") {
      if (!data) return;

      const curIndex = view.index;
      if (curIndex === -1) return;

      let newIndex = curIndex;
      if (tool === "next") {
        set({ tool: "drag" });
        newIndex = curIndex + 1;
        if (newIndex >= data.length) return;
      } else if (tool === "previous") {
        set({ tool: "drag" });
        newIndex = curIndex - 1;
        if (newIndex < 0) return;
      }

      set({ view: { tool, index: newIndex } });
      get().handleDisableFilesTools(newIndex);
    } else if (tool === "export") {
      const { data, photoAngleValues } = get();
      if (data === null) return;
      exportPhotosWithJson(data, photoAngleValues);
    } else if (tool === "exportAngles") {
      get().exportAnglesToCSV();
    } else if (tool === "import") {
      document.getElementById("import-input")?.click();
    } else if (tool === "removeFiles") {
      const state = get();
      if (!state.data || state.data.length === 0) {
        return;
      }
      set({
        data: null,
        view: { tool: "drag", index: 0 },
        tool: "drag",
      });
    } else if (tool === "flip") {
      const { data, view } = get();
      if (!Array.isArray(data) || !data) return;

      const newData = [...data];
      newData[view.index].isFlipped = !data[view.index].isFlipped;
      set({ data: newData });
    } else {
      const { tools } = get();
      const toolFound = tools.find((t) => t.codeName === tool);

      if (!toolFound) {
        tools.forEach((t) => {
          if (t.children) {
            t.children.forEach((childTool) => {
              if (childTool.codeName === tool) {
                set({ tool: childTool.codeName });

                if (childTool.angle) {
                  const { data, view } = get();
                  if (!Array.isArray(data) || !data) return;

                  const newData = [...data];
                  newData[view.index].lastSelectedAngleTool =
                    childTool.codeName;
                  newData[view.index].usedAngle[
                    childTool.codeName as keyof UsedAngle
                  ] = true;
                  set({ data: newData });
                }
              }
            });
          }
        });
      } else {
        if (toolFound.angle) {
          const { data, view } = get();
          if (!Array.isArray(data) || !data) return;

          const newData = [...data];
          newData[view.index].lastSelectedAngleTool = tool;
          newData[view.index].usedAngle[tool as keyof UsedAngle] = true;
          set({ data: newData });
        }
        set({ tool });
      }
    }
  },

  handleDisableFilesTools: (index) => {
    const { tools, data, photoAngleValues } = get();

    const newTools = tools.map((tool) => {
      if (tool.children) {
        const newChildren = tool.children.map((childTool) => {
          switch (childTool.codeName) {
            case "previous":
              return {
                ...childTool,
                disabled: index === 0 && childTool.codeName === "previous",
              };
            case "next":
              return {
                ...childTool,
                disabled:
                  (data &&
                    index === data.length - 1 &&
                    childTool.codeName === "next") ||
                  !data ||
                  (data && data.length === 0),
              };
            case "removeFiles":
              return {
                ...childTool,
                disabled: !data || (data && data.length === 0),
              };
            case "export":
              return {
                ...childTool,
                disabled: !data || (data && data.length === 0),
              };
            case "import":
              return {
                ...childTool,
                disabled: data && data.length > 0,
              };
            case "downloadImage":
              return {
                ...childTool,
                disabled: !data || (data && data.length === 0),
              };
            case "exportAngles":
              return {
                ...childTool,
                disabled:
                  !data ||
                  (data && data.length === 0) ||
                  photoAngleValues.length === 0,
              };
            default:
              return childTool;
          }
        });

        return {
          ...tool,
          children: newChildren,
        };
      }
      return tool;
    }) as Tool[];

    set({ tools: newTools });
  },

  setFiles: (newFiles) => {
    const state = get();
    if (state.data !== null) return;

    const newData: Data[] = [];
    const newPhotoAngleValues: PhotoAngleValues[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      newData.push({
        file: newFiles[i],
        angle: anglesData,
        isFlipped: false,
        usedAngle: {
          totalCC: false,
          pisa: false,
          back: false,
          upperCC: false,
        },
        lastSelectedAngleTool: null,
      });

      newPhotoAngleValues.push({
        name: newFiles[i].name,
        angles: [],
      });
    }

    set({
      photoAngleValues: newPhotoAngleValues,
      data: newData,
      view: { tool: "drag", index: 0 },
    });
  },

  setPoints: (points) => {
    const { data, view } = get();

    if (
      !points ||
      !data ||
      !data[view.index] ||
      !Array.isArray(points) ||
      points.length === 0
    )
      return;

    const currentData = data[view.index];
    if (!currentData.angle || !currentData.angle.points) return;

    let hasChanges = false;
    const currentPoints = currentData.angle.points;

    for (const newPointWithIndex of points) {
      const pointIndex = newPointWithIndex.index;
      const newPoint = newPointWithIndex.point;

      if (
        pointIndex < 0 ||
        pointIndex >= currentPoints.length ||
        !currentPoints[pointIndex]
      ) {
        continue;
      }

      const currentPoint = currentPoints[pointIndex];

      if (
        typeof currentPoint.x !== "number" ||
        typeof currentPoint.y !== "number" ||
        typeof newPoint.x !== "number" ||
        typeof newPoint.y !== "number"
      ) {
        if (currentPoint.x === null || currentPoint.y === null) {
          hasChanges = true;
          break;
        }
        continue;
      }

      if (
        Math.abs(currentPoint.x - newPoint.x) > 0.001 ||
        Math.abs(currentPoint.y - newPoint.y) > 0.001
      ) {
        hasChanges = true;
        break;
      }
    }

    if (!hasChanges) return;

    const newPoints = [...currentPoints];

    for (const pointWithIndex of points) {
      const index = pointWithIndex.index;
      const point = pointWithIndex.point;

      if (index >= 0 && index < newPoints.length) {
        if (typeof point.x === "number" && typeof point.y === "number") {
          newPoints[index] = { ...newPoints[index], x: point.x, y: point.y };
        }
      }
    }

    const newAngle = {
      ...currentData.angle,
      points: newPoints,
    };

    const newData = [...data];
    newData[view.index] = {
      ...newData[view.index],
      angle: newAngle as Angles,
    };

    set({ data: newData });
  },

  handlePhotoAngleValues: (calculateAngle, index) => {
    const { photoAngleValues, data, view } = get();
    const viewIndex = index !== undefined ? index : view.index;

    if (!data || viewIndex === null || viewIndex >= data.length) return;

    const angleTool = data[viewIndex].lastSelectedAngleTool;
    if (!angleTool) return;

    const newPhotoAngleValues = [...photoAngleValues];
    if (!newPhotoAngleValues[viewIndex]) return;

    const updatedAngles = newPhotoAngleValues[viewIndex].angles.filter(
      (angle) => angle.type !== angleTool
    );

    if (
      angleTool === "totalCC" ||
      angleTool === "pisa" ||
      angleTool === "back" ||
      angleTool === "upperCC"
    ) {
      updatedAngles.push({
        type: angleTool,
        value: calculateAngle,
      });
    }

    newPhotoAngleValues[viewIndex].angles = updatedAngles;
    set({ photoAngleValues: newPhotoAngleValues });
  },

  exportAnglesToCSV: () => {
    const { data, photoAngleValues } = get();

    if (!data || !photoAngleValues || photoAngleValues.length === 0) {
      return;
    }

    let csvContent = "Photo Name,Angle Name,Angle Value\n";

    photoAngleValues.forEach((photo, index) => {
      if (photo.angles.length > 0) {
        photo.angles.forEach((angle) => {
          const photoName = data[index]?.file.name || "Unknown";
          const angleName = angle.type;
          const angleValue = angle.value.angle.toFixed(2);
          csvContent += `${photoName},${angleName},${angleValue}\n`;
        });
      }
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "angle_values.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  handleZipImport: async (file) => {
    if (file && file.type === "application/zip") {
      const { data: newData, photoAngleValues: importedAngleValues } =
        await importPhotosWithJson(file);

      set({
        data: newData,
        view: { tool: "drag", index: 0 },
        photoAngleValues: importedAngleValues,
      });
    }
  },

  handleZipDownload: async (stageRef) => {
    const { data, tool, view } = get();
    if (!data || !stageRef) return;

    const originalView = view;
    const originalTool = tool;

    set({ zipDownload: true, zipProgress: 0 });

    const zip = new JSZip();
    let totalFiles = 0;

    data.forEach((photo) => {
      Object.values(photo.usedAngle).forEach((used: boolean) => {
        if (used) totalFiles++;
      });
    });

    let currentFile = 0;
    if (!stageRef) return;

    const currentScale = stageRef.scale();
    const currentPosition = stageRef.position();
    const currentWidth = stageRef.width();
    const currentHeight = stageRef.height();

    console.log(currentWidth, currentHeight);
    console.log(currentScale);
    console.log(currentPosition);

    try {
      for (let photoIndex = 0; photoIndex < data.length; photoIndex++) {
        const photo = data[photoIndex];
        if (!photo) continue;

        const anglesUsed = Object.keys(photo.usedAngle).filter(
          (key) => photo.usedAngle[key as keyof UsedAngle]
        );

        for (const angleName of anglesUsed) {
          try {
            set({
              view: { tool: angleName, index: photoIndex },
              tool: angleName,
            });

            const newData = [...data];
            if (newData[photoIndex]) {
              newData[photoIndex].lastSelectedAngleTool = angleName;
              set({ data: newData });
            }

            await new Promise((resolve) => setTimeout(resolve, 300));

            const image = new Image();
            image.src = URL.createObjectURL(photo.file);

            await new Promise((resolve) => {
              image.onload = resolve;
            });

            if (
              stageRef.size().width !== image.width ||
              stageRef.size().height !== image.height
            )
              stageRef.size({
                width: image.width,
                height: image.height,
              });

            if (stageRef.scale().x !== 1 || stageRef.scale().y !== 1)
              stageRef.scale({ x: 1, y: 1 });
            if (stageRef.position().x !== 0 || stageRef.position().y !== 0)
              stageRef.position({ x: 0, y: 0 });

            const dataUrl = stageRef.toDataURL({
              pixelRatio: 2,
              mimeType: "image/png",
            });

            const response = await fetch(dataUrl);
            const blob = await response.blob();

            const filename = `${photo.file.name
              .split(".")
              .slice(0, -1)
              .join(".")}_${angleName}.png`;

            zip.file(filename, blob);

            currentFile++;
            set({ zipProgress: (currentFile / totalFiles) * 100 });
          } catch (error) {
            console.error(
              `Error generating image for ${photo.file.name}_${angleName}:`,
              error
            );
            continue;
          }
        }
      }

      const onUpdate: OnUpdateCallback = (metadata) => {
        set({ zipProgress: metadata.percent });
      };

      const content = await zip.generateAsync({ type: "blob" }, onUpdate);

      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "photos.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating ZIP file:", error);
    } finally {
      set({
        view: originalView,
        tool: originalTool,
        zipDownload: false,
        zipProgress: 0,
      });
      stageRef.size({
        width: currentWidth,
        height: currentHeight,
      });
      stageRef.scale(currentScale);
      stageRef.position(currentPosition);
    }
  },
}));
