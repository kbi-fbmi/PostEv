import { Data, PhotoAngleValues } from "@/types";
import JSZip from "jszip";

export const importPhotosWithJson = async (zipFile: File): Promise<{ data: Data[], photoAngleValues: PhotoAngleValues[] }> => {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipFile);

  let version = "1.0.0";
  if (zipContent.files["appinfo.json"]) {
    try {
      const appInfoJson = await zipContent.files["appinfo.json"].async(
        "string"
      );
      const appInfo = JSON.parse(appInfoJson);
      version = appInfo.version;
    } catch (error) {
      console.error("Error parsing appinfo.json:", error);
    }
  }

  switch (version) {
    case "1.0.0":
      return await processVersion1_0_0(zipContent);
    default:
      console.warn(`Unknown version: ${version}. Using default processing.`);
      return await processVersion1_0_0(zipContent);
  }
};

async function processVersion1_0_0(zipContent: JSZip): Promise<{ data: Data[], photoAngleValues: PhotoAngleValues[] }> {
  const files: Data[] = [];
  const photoAngleValues: PhotoAngleValues[] = [];
  const processedFiles = new Set<string>();

  // First, collect all JSON files and their corresponding image files
  const fileMap = new Map<
    string,
    { json: string; imagePath: string; fullPath: string }
  >();

  for (const fileName in zipContent.files) {
    const file = zipContent.files[fileName];
    if (file.dir || fileName === "appinfo.json") continue;

    const pathParts = fileName.split("/");
    const fileNameWithExt = pathParts.pop() || "";
    const folderPath = pathParts.join("/");
    const baseName = fileNameWithExt.replace(/\.[^/.]+$/, "");
    const extension = fileNameWithExt.split(".").pop()?.toLowerCase();

    if (extension === "json") {
      const imagePath = folderPath
        ? `${folderPath}/${baseName}.png`
        : `${baseName}.png`;
      if (zipContent.files[imagePath]) {
        const fullPath = folderPath ? `${folderPath}/${baseName}` : baseName;
        fileMap.set(fullPath, {
          json: fileName,
          imagePath: imagePath,
          fullPath: fullPath,
        });
      }
    }
  }

  // Process each file pair
  for (const [_, { json, imagePath, fullPath }] of fileMap) {
    try {
      if (processedFiles.has(fullPath)) continue;

      const jsonEntry = zipContent.files[json];
      const imageEntry = zipContent.files[imagePath];

      if (!jsonEntry || !imageEntry) continue;

      const jsonData = await jsonEntry.async("string");
      const parsedData = JSON.parse(jsonData);

      const imageBlob = await imageEntry.async("blob");
      // Create File object with the full path information
      const imageFile = new File(
        [imageBlob],
        imagePath.split("/").pop() || "",
        {
          type: "image/png",
        }
      );
      // Add the webkitRelativePath manually
      Object.defineProperty(imageFile, "webkitRelativePath", {
        value: parsedData.originalPath || imagePath,
        writable: false,
      });

      files.push({
        file: imageFile,
        angle: parsedData.angle,
        isFlipped: parsedData.isFlipped,
        usedAngle: parsedData.usedAngle,
        lastSelectedAngleTool: parsedData.lastSelectedAngleTool,
      });

      // Add photo angle values
      photoAngleValues.push({
        name: imageFile.name,
        angles: parsedData.angleValues || []
      });

      processedFiles.add(fullPath);
    } catch (error) {
      console.error(`Error processing file pair for ${fullPath}:`, error);
    }
  }

  return { data: files, photoAngleValues };
}
