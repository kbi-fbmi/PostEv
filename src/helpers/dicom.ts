import * as dicomParser from "dicom-parser";

export interface DicomMetadata {
  dataSet: dicomParser.DataSet;
  rows: number;
  columns: number;
  samplesPerPixel: number;
  photometricInterpretation: string;
  bitsAllocated: number;
  pixelRepresentation: number;
  rescaleIntercept: number;
  rescaleSlope: number;
  windowCenter: number | undefined;
  windowWidth: number | undefined;
  pixelDataOffset: number;
  pixelDataLength: number;
  bigEndian: boolean;
  /** mm between the centers of two adjacent rows (i.e. vertical pixel size). */
  rowSpacingMm: number | null;
  /** mm between the centers of two adjacent columns (i.e. horizontal pixel size). */
  columnSpacingMm: number | null;
  /** Which DICOM tag the spacing came from — ImagerPixelSpacing is the
   *  detector's native pixel size and does NOT account for geometric
   *  magnification (patient-to-detector distance), so it's an approximation
   *  when PixelSpacing (the calibrated tag) isn't present. */
  spacingSource: "PixelSpacing" | "ImagerPixelSpacing" | null;
  transferSyntax: string | null;
}

export interface DicomConvertResult {
  pngBlob: Blob;
  rows: number;
  columns: number;
  rowSpacingMm: number | null;
  columnSpacingMm: number | null;
  spacingSource: "PixelSpacing" | "ImagerPixelSpacing" | null;
  transferSyntax: string | null;
}

// Only plain, byte-for-byte pixel data we can read directly with a DataView
// (little- or big-endian). Compressed syntaxes (JPEG, JPEG2000, JPEG-LS,
// RLE) need an actual image codec to decode and aren't supported here;
// deflated is rare enough in practice to leave unsupported too rather than
// risking silently-wrong pixel decoding.
const SUPPORTED_TRANSFER_SYNTAXES = new Set([
  "1.2.840.10008.1.2", // Implicit VR Little Endian
  "1.2.840.10008.1.2.1", // Explicit VR Little Endian
  "1.2.840.10008.1.2.2", // Explicit VR Big Endian (retired, but still seen)
]);
const BIG_ENDIAN_TRANSFER_SYNTAX = "1.2.840.10008.1.2.2";

function readSpacingPair(
  dataSet: dicomParser.DataSet,
  tag: string
): [number, number] | null {
  const a = dataSet.floatString(tag, 0);
  const b = dataSet.floatString(tag, 1);
  if (typeof a !== "number" || typeof b !== "number" || isNaN(a) || isNaN(b))
    return null;
  return [a, b];
}

/**
 * Parses a DICOM byte stream and pulls out everything needed to know the
 * image's resolution, real-world pixel size, and where its raw pixel data
 * lives — without touching the DOM/canvas, so this half is testable in
 * plain Node/Bun.
 */
export function readDicomMetadata(byteArray: Uint8Array): DicomMetadata {
  const dataSet = dicomParser.parseDicom(byteArray);

  const transferSyntax = dataSet.string("x00020010") ?? null;
  if (transferSyntax && !SUPPORTED_TRANSFER_SYNTAXES.has(transferSyntax)) {
    throw new Error(
      `Unsupported transfer syntax (${transferSyntax}) — only uncompressed DICOM (little- or big-endian) is supported`
    );
  }
  const bigEndian = transferSyntax === BIG_ENDIAN_TRANSFER_SYNTAX;

  const rows = dataSet.uint16("x00280010");
  const columns = dataSet.uint16("x00280011");
  if (!rows || !columns) {
    throw new Error("DICOM file is missing Rows/Columns (0028,0010 / 0028,0011)");
  }

  const pixelDataElement = dataSet.elements.x7fe00010;
  if (!pixelDataElement) {
    throw new Error("DICOM file has no PixelData element (7FE0,0010)");
  }
  if (pixelDataElement.encapsulatedPixelData) {
    throw new Error(
      "DICOM file uses encapsulated (compressed) pixel data, which isn't supported"
    );
  }

  const samplesPerPixel = dataSet.uint16("x00280002") ?? 1;
  if (samplesPerPixel !== 1) {
    throw new Error(
      `Only single-channel (grayscale) DICOM images are supported (SamplesPerPixel=${samplesPerPixel})`
    );
  }

  const photometricInterpretation = (
    dataSet.string("x00280004") ?? "MONOCHROME2"
  ).trim();
  const bitsAllocated = dataSet.uint16("x00280100") ?? 16;
  if (bitsAllocated !== 16 && bitsAllocated !== 8) {
    throw new Error(`Unsupported BitsAllocated (${bitsAllocated})`);
  }
  const pixelRepresentation = dataSet.uint16("x00280103") ?? 0; // 0 = unsigned, 1 = signed
  const rescaleIntercept = dataSet.floatString("x00281052") ?? 0;
  const rescaleSlope = dataSet.floatString("x00281053") ?? 1;
  const windowCenter = dataSet.floatString("x00281050");
  const windowWidth = dataSet.floatString("x00281051");

  // (0028,0030) PixelSpacing is "row spacing \ column spacing" in mm — the
  // calibrated, patient-plane pixel size. Prefer it; fall back to
  // (0018,1164) ImagerPixelSpacing (detector-native, uncalibrated) when
  // PixelSpacing isn't present, which is common for raw CR/DX exports.
  let rowSpacingMm: number | null = null;
  let columnSpacingMm: number | null = null;
  let spacingSource: DicomMetadata["spacingSource"] = null;
  const pixelSpacing = readSpacingPair(dataSet, "x00280030");
  if (pixelSpacing) {
    [rowSpacingMm, columnSpacingMm] = pixelSpacing;
    spacingSource = "PixelSpacing";
  } else {
    const imagerSpacing = readSpacingPair(dataSet, "x00181164");
    if (imagerSpacing) {
      [rowSpacingMm, columnSpacingMm] = imagerSpacing;
      spacingSource = "ImagerPixelSpacing";
    }
  }

  return {
    dataSet,
    rows,
    columns,
    samplesPerPixel,
    photometricInterpretation,
    bitsAllocated,
    pixelRepresentation,
    rescaleIntercept,
    rescaleSlope,
    windowCenter,
    windowWidth,
    pixelDataOffset: pixelDataElement.dataOffset,
    pixelDataLength: pixelDataElement.length,
    bigEndian,
    rowSpacingMm,
    columnSpacingMm,
    spacingSource,
    transferSyntax,
  };
}

/** Renders the decoded, windowed grayscale pixel data onto a canvas and
 *  exports it as a PNG blob. Needs a DOM (canvas), unlike readDicomMetadata. */
async function renderToPng(meta: DicomMetadata): Promise<Blob> {
  const {
    dataSet, rows, columns, bitsAllocated, pixelRepresentation,
    rescaleIntercept, rescaleSlope, windowCenter, windowWidth,
    photometricInterpretation, pixelDataOffset, pixelDataLength, bigEndian,
  } = meta;

  const byteArray = dataSet.byteArray;
  const view = new DataView(
    (byteArray as Uint8Array).buffer,
    (byteArray as Uint8Array).byteOffset + pixelDataOffset,
    pixelDataLength
  );
  const pixelCount = rows * columns;
  const littleEndian = !bigEndian;

  // Raw stored value per pixel, before rescale.
  const raw = new Float64Array(pixelCount);
  if (bitsAllocated === 16) {
    for (let i = 0; i < pixelCount; i++) {
      raw[i] = pixelRepresentation === 1
        ? view.getInt16(i * 2, littleEndian)
        : view.getUint16(i * 2, littleEndian);
    }
  } else {
    for (let i = 0; i < pixelCount; i++) {
      raw[i] = pixelRepresentation === 1
        ? view.getInt8(i)
        : view.getUint8(i);
    }
  }

  // Rescale (identity for most plain radiographs) then window to 0-255.
  const rescaled = new Float64Array(pixelCount);
  let dataMin = Infinity;
  let dataMax = -Infinity;
  for (let i = 0; i < pixelCount; i++) {
    const v = raw[i] * rescaleSlope + rescaleIntercept;
    rescaled[i] = v;
    if (v < dataMin) dataMin = v;
    if (v > dataMax) dataMax = v;
  }

  let lo: number;
  let hi: number;
  if (typeof windowCenter === "number" && typeof windowWidth === "number" && windowWidth > 0) {
    lo = windowCenter - windowWidth / 2;
    hi = windowCenter + windowWidth / 2;
  } else {
    // No windowing info: fall back to a full min/max stretch.
    lo = dataMin;
    hi = dataMax > dataMin ? dataMax : dataMin + 1;
  }
  const range = hi - lo || 1;
  const invert = photometricInterpretation === "MONOCHROME1";

  const canvas = document.createElement("canvas");
  canvas.width = columns;
  canvas.height = rows;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(columns, rows);
  for (let i = 0; i < pixelCount; i++) {
    let norm = (rescaled[i] - lo) / range;
    norm = Math.max(0, Math.min(1, norm));
    let gray = Math.round(norm * 255);
    if (invert) gray = 255 - gray;
    const o = i * 4;
    imageData.data[o] = gray;
    imageData.data[o + 1] = gray;
    imageData.data[o + 2] = gray;
    imageData.data[o + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas PNG export failed"))),
      "image/png"
    )
  );
}

/**
 * True only for DICOM files that have both image geometry and physical pixel
 * spacing metadata; those are the ones we can reliably preview/export.
 */
export function hasRequiredDicomGeometryAndSpacing(meta: DicomMetadata): boolean {
  return Boolean(
    meta.rows &&
    meta.columns &&
    meta.rowSpacingMm != null &&
    meta.columnSpacingMm != null
  );
}

/**
 * Parses one DICOM file into a viewable PNG plus the metadata needed to
 * convert on-image pixel distances to real-world millimeters.
 */
export async function parseDicomToPng(file: File): Promise<DicomConvertResult> {
  const buffer = await file.arrayBuffer();
  const meta = readDicomMetadata(new Uint8Array(buffer));
  if (!hasRequiredDicomGeometryAndSpacing(meta)) {
    throw new Error("DICOM file is missing image resolution or pixel spacing metadata");
  }
  const pngBlob = await renderToPng(meta);
  return {
    pngBlob,
    rows: meta.rows,
    columns: meta.columns,
    rowSpacingMm: meta.rowSpacingMm,
    columnSpacingMm: meta.columnSpacingMm,
    spacingSource: meta.spacingSource,
    transferSyntax: meta.transferSyntax,
  };
}

export async function isDicomFile(file: File): Promise<boolean> {
  const name = file.name;
  if (name.toUpperCase() === "DICOMDIR") return false;
  if (/\.(dcm|dicom)$/i.test(name)) return true;
  if (file.size < 132) return false;

  try {
    const header = new Uint8Array(await file.slice(128, 132).arrayBuffer());
    return (
      header.length === 4 &&
      header[0] === 0x44 &&
      header[1] === 0x49 &&
      header[2] === 0x43 &&
      header[3] === 0x4d
    );
  } catch {
    return false;
  }
}
