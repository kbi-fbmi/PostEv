import { Data } from "@/types";
import JSZip from "jszip";

const EXPORT_VERSION = "1.1.0"; 

export const exportPhotosWithJson = async (
  data: Data[],
  photoAngleValues: any[] = [],
  zipName?: string
) => {
  const zip = new JSZip();

  const appInfo = {
    version: EXPORT_VERSION,
    date: new Date().toISOString(),
  };
  zip.file("appinfo.json", JSON.stringify(appInfo, null, 2));

  for (let i = 0; i < data.length; i++) {
    const dataItem = data[i];
    try {
      const filePath = dataItem.file.webkitRelativePath || dataItem.file.name;
      const pathParts = filePath.split("/");
      const fileName = pathParts.pop() || dataItem.file.name;
      const folderPath = pathParts.join("/");

      const match = fileName.match(/(.+)\.([^/.]+)$/);
      const baseName = match ? match[1] : fileName;
      let extension = match ? match[2] : "png";
      if (!extension) extension = "png";

      const imageFilePath = folderPath
        ? `${folderPath}/${baseName}.${extension}`
        : `${baseName}.${extension}`;
      const jsonFilePath = folderPath
        ? `${folderPath}/${baseName}.json`
        : `${baseName}.json`;

      const image = await loadImageFromBlob(dataItem.file);
      const width = image.width;
      const height = image.height;

      const objectUrl = URL.createObjectURL(dataItem.file);
      const imageBlob = await fetch(objectUrl).then((r) => r.blob());
      URL.revokeObjectURL(objectUrl);
      zip.file(imageFilePath, imageBlob);

      const photoAngleValue = photoAngleValues[i] || { angles: [] };

      const relativePoints =
        dataItem.angle?.points?.map((p: any) =>
          p.x != null && p.y != null
            ? { ...p, x: p.x / width, y: p.y / height }
            : { ...p }
        ) || [];

      const relativeAngleValues = (photoAngleValue.angles || []).map((a: any) => {
        const value = a.value || {};
        return {
          ...a,
          value:
            value.x != null && value.y != null
              ? {
                  ...value,
                  x: value.x / width,
                  y: value.y / height,
                }
              : value,
        };
      });

      const relativeAngle = dataItem.angle
        ? { ...dataItem.angle, points: relativePoints }
        : undefined;

      const jsonData = {
        angle: relativeAngle,
        filename: dataItem.angle?.filename || dataItem.file.name,
        isFlipped: dataItem.isFlipped,
        usedAngle: dataItem.usedAngle,
        lastSelectedAngleTool: dataItem.lastSelectedAngleTool,
        originalPath: filePath,
        angleValues: relativeAngleValues,
        cropped: dataItem.cropped,
        // Carry DICOM calibration through export → re-import so cm readouts survive.
        pixelSpacingMm: dataItem.pixelSpacingMm ?? null,
        pixelSpacingSource: dataItem.pixelSpacingSource ?? null,
      };

      zip.file(jsonFilePath, JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.error(`Error processing data item:`, error);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipUrl = URL.createObjectURL(zipBlob);

  const link = document.createElement("a");
  link.href = zipUrl;
  link.download = `${zipName || "exported_files"}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(zipUrl);
};

const loadImageFromBlob = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};