import { useNavigate } from "react-router-dom";
import { IconBodyScan } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";

const TOOL_LABELS: Record<string, string> = {
  apicalVertebra: "ApVrt",
  coronalBalance: "CorBl",
  sagittalBalance: "SagBl",
};

/** Prompts for a DICOM export when a length tool is picked on an uncalibrated image. */
export function DicomRequiredModal() {
  const navigate = useNavigate();
  const { dicomRequiredTool, setDicomRequiredTool } = useAppStore();

  if (!dicomRequiredTool) return null;

  const label = TOOL_LABELS[dicomRequiredTool] ?? dicomRequiredTool;
  const close = () => setDicomRequiredTool(null);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={close}
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg bg-card p-6 text-card-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-semibold">DICOM data required</h3>
        <p className="mb-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{label}</span> measures a
          distance in centimetres and needs the scale from a DICOM image.
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          Load a DICOM export first: open the files in Preprocess → DICOM,
          generate a ZIP, then import that ZIP back into the app.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              close();
              navigate("/preprocess?mode=dicom");
            }}
          >
            <span className="flex items-center gap-2">
              <IconBodyScan size={16} />
              Go to Preprocess
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
