export type PixelSpacingMm =
  | { row: number | null; column: number | null }
  | null
  | undefined;

/** True when both axes of DICOM pixel spacing are present and positive, so
 *  pixel distances can be converted to cm. */
export function hasValidPixelSpacing(
  px: PixelSpacingMm
): px is { row: number; column: number } {
  return (
    !!px &&
    px.row != null &&
    px.column != null &&
    px.row > 0 &&
    px.column > 0
  );
}

/** Tools whose readout is a cm distance and so require a calibrated image. */
export const DICOM_REQUIRED_TOOLS = [
  "apicalVertebra",
  "coronalBalance",
  "sagittalBalance",
] as const;
