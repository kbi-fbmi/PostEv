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
import { applyCropToFiles } from "./helpers/crop";
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
  importedZipName?: string;
  setToolbarHeight: (height: number) => void;
  setTool: (tool: string) => void;
  changeTool: (tool: string) => void;
  setFiles: (files: File[], cropped?: boolean) => void;
  applyPreprocessCrop: (crop: { x: number; y: number; width: number; height: number }) => Promise<void>;
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
  setImageAdjust: (brightness: number, contrast: number) => void;
}

const initialTools = toolsData.map((tool) => {
  if (tool.codeName === "flip") return { ...tool, disabled: true };

  if (tool.children) {
    const newChildren = tool.children.map((childTool) => {
      const toolsToDisable = [
        "previous",
        "next",
        "export",
        "downloadImage",
        "removeFiles",
        "downloadImages",
        "exportAngles",
      ];
      if (toolsToDisable.includes(childTool.codeName)) {
        return { ...childTool, disabled: true };
      }
      return childTool;
    });
    return { ...tool, children: newChildren };
  }

  return tool;
}) as Tool[];

const getRootFolderNameFromData = (data: Data[]): string | null => {
  if (!data || data.length === 0) return null;
  const first = data[0];
  const rel = first.file?.webkitRelativePath || "";
  if (!rel) return null;
  const parts = rel.split("/");
  return parts.length > 1 ? parts[parts.length - 2] : null;
};

export const useAppStore = create<AppState>((set, get) => ({
  tool: "drag",
  tools: initialTools,
  toolbarHeight: 0,
  data: null,
  view: { tool: "drag", index: 0 },
  photoAngleValues: [],
  download: false,
  zipDownload: false,
  zipProgress: 0,
  lineColor: "#88fa2a",
  importedZipName: undefined,

  setToolbarHeight: (height) => {
    if (get().toolbarHeight !== height) {
      set({ toolbarHeight: height });
    }
  },
  setTool: (tool) => set({ tool }),
  setView: (view) => set({ view }),
  setDownload: (value) => set({ download: value }),
  setLineColor: (color) => set({ lineColor: color }),

  setImageAdjust: (brightness, contrast) => {
    const { data, view } = get();
    if (!data) return;
    const newData = [...data];
    newData[view.index] = { ...newData[view.index], brightness, contrast };
    set({ data: newData });
  },

  changeTool: async (tool) => {
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
      } else {
        set({ tool: "drag" });
        newIndex = curIndex - 1;
        if (newIndex < 0) return;
      }
      set({ view: { tool, index: newIndex } });
      get().handleDisableFilesTools(newIndex);
      return;
    }

    if (tool === "export") {
      const { data, photoAngleValues, importedZipName } = get();
      if (!data) return;

      const exportName =
        importedZipName && importedZipName.length > 0
          ? importedZipName 
          : getRootFolderNameFromData(data) || "exported_files";

      await exportPhotosWithJson(data, photoAngleValues, exportName);
      return;
    }

    if (tool === "exportAngles") {
      get().exportAnglesToCSV();
      return;
    }

    if (tool === "import") {
      document.getElementById("import-input")?.click();
      return;
    }

    if (tool === "removeFiles") {
      const state = get();
      if (!state.data || state.data.length === 0) return;
      set({
        data: null,
        view: { tool: "drag", index: 0 },
        tool: "drag",
      });
      get().handleDisableFilesTools(0);
      return;
    }

    if (tool === "flip") {
      const { data, view } = get();
      if (!data) return;
      const newData = [...data];
      newData[view.index].isFlipped = !data[view.index].isFlipped;
      set({ data: newData });
      return;
    }

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
                if (!data) return;
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
        if (!data) return;
        const newData = [...data];
        newData[view.index].lastSelectedAngleTool = tool;
        newData[view.index].usedAngle[tool as keyof UsedAngle] = true;
        set({ data: newData });
      }
      set({ tool });
    }
  },

  handleDisableFilesTools: (index) => {
    const { tools, data, photoAngleValues } = get();
    const noData = !data || data.length === 0;

    const newTools = tools.map((tool) => {
      if (tool.codeName === "flip") {
        return { ...tool, disabled: noData };
      }

      if (tool.children) {
        const newChildren = tool.children.map((childTool) => {
          switch (childTool.codeName) {
            case "previous":
              return { ...childTool, disabled: noData || index === 0 };
            case "next":
              return {
                ...childTool,
                disabled: noData || index === (data ? data.length - 1 : 0),
              };
            case "removeFiles":
            case "export":
            case "downloadImage":
            case "downloadImages":
              return { ...childTool, disabled: noData };
            case "import":
              return { ...childTool, disabled: false };
            case "exportAngles":
              return {
                ...childTool,
                disabled: noData || photoAngleValues.length === 0,
              };
            default:
              return childTool;
          }
        });
        return { ...tool, children: newChildren };
      }

      return tool;
    }) as Tool[];
    set({ tools: newTools });
  },

  setFiles: (newFiles, cropped) => {
    const state = get();
    if (state.data !== null) return;

    const newData: Data[] = [];
    const newPhotoAngleValues: PhotoAngleValues[] = [];

    let rootFolder = "";

    if (newFiles.length > 0 && "webkitRelativePath" in newFiles[0]) {
      const firstPath = (newFiles[0] as any).webkitRelativePath || "";
      const parts = firstPath.split("/").filter(Boolean);
      if (parts.length > 1) rootFolder = parts[0];
    }

    for (const file of newFiles) {
      newData.push({
        file,
        angle: {
          ...anglesData,
          filename: file.name,
        },
        isFlipped: false,
        usedAngle: { totalCC: false, pisa: false, back: false, upperCC: false, apicalVertebra: false, coronalBalance: false, sagittalBalance: false, thoricalSagittalAlignment: false },
        lastSelectedAngleTool: null,
        cropped,
      });
      newPhotoAngleValues.push({ name: file.name, angles: [] });
    }

    set({
      photoAngleValues: newPhotoAngleValues,
      data: newData,
      view: { tool: "drag", index: 0 },
      importedZipName: rootFolder || undefined,
    });
    get().handleDisableFilesTools(0);
  },

  applyPreprocessCrop: async (crop) => {
    const { data, photoAngleValues } = get();
    if (!data) return;
    const croppedFiles = await applyCropToFiles(data.map((d) => d.file), crop);
    const newData = data.map((d, i) => ({
      ...d,
      file: croppedFiles[i],
      cropped: true as const,
      angle: d.angle
        ? {
            ...d.angle,
            points: d.angle.points.map((p) =>
              p.x != null && p.y != null
                ? { ...p, x: p.x - crop.x, y: p.y - crop.y }
                : p
            ),
          }
        : d.angle,
    }));
    const newPhotoAngleValues = photoAngleValues.map((pav) => ({
      ...pav,
      angles: pav.angles.map((a) => ({
        ...a,
        value:
          a.value.x != null && a.value.y != null
            ? { ...a.value, x: a.value.x - crop.x, y: a.value.y - crop.y }
            : a.value,
      })),
    }));
    set({ data: newData, photoAngleValues: newPhotoAngleValues });
  },

  setPoints: (points) => {
    const { data, view } = get();
    if (!points || !data || !data[view.index]) return;

    const currentData = data[view.index];
    if (!currentData.angle || !currentData.angle.points) return;

    const currentPoints = currentData.angle.points;
    const newPoints = [...currentPoints];
    for (const { point, index } of points) {
      if (
        index >= 0 &&
        index < newPoints.length &&
        typeof point.x === "number" &&
        typeof point.y === "number"
      ) {
        newPoints[index] = { ...newPoints[index], x: point.x, y: point.y };
      }
    }

    const newAngle = { ...currentData.angle, points: newPoints } as Angles;
    const newData = [...data];
    newData[view.index] = { ...newData[view.index], angle: newAngle };
    set({ data: newData });
  },

  handlePhotoAngleValues: (calculateAngle, index) => {
    const { photoAngleValues, data, view } = get();
    const viewIndex = index ?? view.index;
    if (!data || viewIndex >= data.length) return;

    const angleTool = data[viewIndex].lastSelectedAngleTool;
    if (!angleTool) return;

    const newPhotoAngleValues = [...photoAngleValues];
    if (!newPhotoAngleValues[viewIndex]) return;

    const updatedAngles = newPhotoAngleValues[viewIndex].angles.filter(
      (angle) => angle.type !== angleTool
    );

    if (["totalCC", "pisa", "back", "upperCC", "apicalVertebra", "coronalBalance", "sagittalBalance", "thoricalSagittalAlignment"].includes(angleTool)) {
      updatedAngles.push({
        type: angleTool as "totalCC" | "pisa" | "back" | "upperCC" | "apicalVertebra" | "coronalBalance" | "sagittalBalance" | "thoricalSagittalAlignment",
        value: calculateAngle,
      });
    }

    newPhotoAngleValues[viewIndex].angles = updatedAngles;
    set({ photoAngleValues: newPhotoAngleValues });
  },

  exportAnglesToCSV: async () => {
    const { data, photoAngleValues } = get();
    if (!data || !photoAngleValues || photoAngleValues.length === 0) return;

    let csvContent = "Photo Name,Angle Name,Angle Value\n";
    for (let idx = 0; idx < photoAngleValues.length; idx++) {
      const photo = photoAngleValues[idx];
      const fileData = data[idx];
      const img = new Image();
      img.src = URL.createObjectURL(fileData.file);
      await new Promise((resolve) => (img.onload = resolve));

      if (photo.angles.length > 0) {
        photo.angles.forEach((angle) => {
          const photoName = fileData.file.name;
          const angleName = angle.type;
          const angleValue = angle.value.angle.toFixed(2);
          csvContent += `${photoName},${angleName},${angleValue}\n`;
        });
      }

      URL.revokeObjectURL(img.src);
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "angle_values.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  handleZipImport: async (file) => {
    const isZip =
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed" ||
      file.name.toLowerCase().endsWith(".zip");

    if (!isZip) {
      throw new Error("Invalid file type. Please upload a zip file.");
    }

    try {
      const { data: newData, photoAngleValues: importedAngleValues } =
        await importPhotosWithJson(file);

      const importedZipName = file.name.replace(/\.zip$/i, "");

      set({
        data: newData,
        view: { tool: "drag", index: 0 },
        photoAngleValues: importedAngleValues,
        importedZipName,
      });
      get().handleDisableFilesTools(0);
    } catch (e) {
      throw e;
    }
  },

  handleZipDownload: async (stageRef) => {
    const { data, tool, view, importedZipName } = get();
    if (!data || !stageRef) return;

    const originalView = view;
    const originalTool = tool;
    set({ zipDownload: true, zipProgress: 0 });

    const zip = new JSZip();
    let totalFiles = 0;

    data.forEach((photo) =>
      Object.values(photo.usedAngle).forEach((used) => {
        if (used) totalFiles++;
      })
    );

    let currentFile = 0;
    const currentScale = stageRef.scale();
    const currentPosition = stageRef.position();
    const currentSize = stageRef.size();

    try {
      for (let photoIndex = 0; photoIndex < data.length; photoIndex++) {
        const photo = data[photoIndex];
        if (!photo) continue;
        
        const originalLastSelectedAngleTool = photo.lastSelectedAngleTool;
        
        const mimeType = photo.file.type || "image/png";
        const extension = mimeType.split("/")[1] || "png";
        const baseName = photo.file.name.split(".").slice(0, -1).join(".");
        const anglesUsed = Object.keys(photo.usedAngle).filter(
          (key) => photo.usedAngle[key as keyof UsedAngle]
        );

        for (const angleName of anglesUsed) {
          set({
            view: { tool: angleName, index: photoIndex },
            tool: angleName,
          });
          
          const newDataArr = [...data];
          newDataArr[photoIndex].lastSelectedAngleTool = angleName;
          set({ data: newDataArr });
          
          await new Promise((r) => setTimeout(r, 100));

          const img = new Image();
          img.src = URL.createObjectURL(photo.file);
          await new Promise((r) => (img.onload = () => r(null)));
          
          await new Promise((r) => setTimeout(r, 400));

          if (
            stageRef.size().width !== img.width ||
            stageRef.size().height !== img.height
          )
            stageRef.size({ width: img.width, height: img.height });

          if (stageRef.scale().x !== 1 || stageRef.scale().y !== 1)
            stageRef.scale({ x: 1, y: 1 });

          if (stageRef.position().x !== 0 || stageRef.position().y !== 0)
            stageRef.position({ x: 0, y: 0 });

          const dataUrl = stageRef.toDataURL({ pixelRatio: 1, mimeType });
          const resp = await fetch(dataUrl);
          const blob = await resp.blob();
          const filename = `${baseName}_${angleName}.${extension}`;
          zip.file(filename, blob);

          currentFile++;
          set({ zipProgress: (currentFile / totalFiles) * 100 });
        }
        
        const restoreDataArr = [...get().data!];
        restoreDataArr[photoIndex].lastSelectedAngleTool = originalLastSelectedAngleTool;
        set({ data: restoreDataArr });
      }

      const onUpdate: OnUpdateCallback = (meta) =>
        set({ zipProgress: meta.percent });
      const content = await zip.generateAsync({ type: "blob" }, onUpdate);

      const rootFolder = getRootFolderNameFromData(data);
      const zipName =
        importedZipName && importedZipName.length > 0
          ? `${importedZipName}_photos.zip`
          : rootFolder
          ? `${rootFolder}_photos.zip`
          : "photos.zip";

      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
    } finally {
      set({
        view: originalView,
        tool: originalTool,
        zipDownload: false,
        zipProgress: 0,
      });
      stageRef.size(currentSize);
      stageRef.scale(currentScale);
      stageRef.position(currentPosition);
    }
  },
}));