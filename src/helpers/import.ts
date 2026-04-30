import JSZip from "jszip";
import { Data, PhotoAngleValues } from "../types";

export const importPhotosWithJson = async (
  file: File
): Promise<{ data: Data[]; photoAngleValues: PhotoAngleValues[] }> => {
  const zip = await JSZip.loadAsync(file);
  
  const allFiles = Object.keys(zip.files);
  if (allFiles.length === 0) {
    throw new Error("The zip file is empty. Please upload a valid exported file.");
  }

  const jsonFiles = allFiles.filter(
    (filename) =>
      filename.endsWith(".json") && !filename.includes("appinfo.json")
  );

  if (jsonFiles.length === 0) {
    throw new Error("Invalid zip file format. No photo metadata found. Please upload a file exported from this application.");
  }

  const newData: Data[] = [];
  const newPhotoAngleValues: PhotoAngleValues[] = [];

  let version = "1.0.0";
  if (zip.files["appinfo.json"]) {
    try {
      const infoContent = await zip.file("appinfo.json")!.async("text");
      const info = JSON.parse(infoContent);
      version = info.version || "1.0.0";
    } catch (err) {
      console.warn("Could not parse appinfo.json:", err);
    }
  }

  for (const jsonPath of jsonFiles) {
    try {
      const jsonContent = await zip.file(jsonPath)?.async("text");
      if (!jsonContent) continue;

      const metadata = JSON.parse(jsonContent);
      const baseName = jsonPath.replace(/\.json$/i, "");

      const extensions = ["png", "jpg", "jpeg", "webp"];
      let imageZipObject = null;
      let foundExt = "png";

      for (const ext of extensions) {
        const testPath = `${baseName}.${ext}`;
        if (zip.files[testPath]) {
          imageZipObject = zip.files[testPath];
          foundExt = ext;
          break;
        }
      }

      if (!imageZipObject) continue;

      const blob = await imageZipObject.async("blob");
      const reconstructedFile = new File(
        [blob],
        metadata.filename || `${baseName.split("/").pop()}.${foundExt}`,
        { type: `image/${foundExt === "jpg" ? "jpeg" : foundExt}` }
      );

      if (metadata.originalPath) {
        Object.defineProperty(reconstructedFile, "webkitRelativePath", {
          value: metadata.originalPath,
          writable: false,
        });
      }

      const versionNum = parseFloat(version);
      let convertedAngles: any[] = [];

      switch (true) {
        // v1.0.0 
        case versionNum < 1.1:
          convertedAngles = metadata.angleValues || [];
          break;

        // v1.1.0 
        case versionNum >= 1.1 && versionNum < 1.2: {
          const img = await loadImageFromBlob(blob);
          const width = img.width;
          const height = img.height;

          const scaledPoints = (metadata.angle?.points || []).map((p: any) =>
            p.x != null && p.y != null
              ? { ...p, x: p.x * width, y: p.y * height }
              : { ...p }
          );

          if (metadata.angle) {
            metadata.angle.points = scaledPoints;
          }

          convertedAngles = (metadata.angleValues || []).map((a: any) => {
            const v = a.value || {};
            return {
              ...a,
              value:
                v.x != null && v.y != null
                  ? {
                      ...v,
                      x: v.x * width,
                      y: v.y * height,
                    }
                  : v,
            };
          });
          break;
        }

        case versionNum >= 1.2:
          console.warn(
            `Importer: Unhandled version ${version}. Data may be incomplete.`
          );
          convertedAngles = metadata.angleValues || [];
          break;

        default:
          convertedAngles = metadata.angleValues || [];
          break;
      }

      newData.push({
        file: reconstructedFile,
        angle: metadata.angle,
        isFlipped: metadata.isFlipped,
        usedAngle: metadata.usedAngle,
        lastSelectedAngleTool: metadata.lastSelectedAngleTool,
        cropped: metadata.cropped,
      });

      newPhotoAngleValues.push({
        name: metadata.filename,
        angles: convertedAngles,
      });
    } catch (error) {
      console.error("Error processing file:", error);
    }
  }

  if (newData.length === 0) {
    throw new Error("No valid photos found in the zip file. The file may have an incorrect format or missing images.");
  }

  return { data: newData, photoAngleValues: newPhotoAngleValues };
};

const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
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