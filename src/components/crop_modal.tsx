import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface CropRect {
  x: number; // 0–1 relative to image width/height
  y: number;
  w: number;
  h: number;
}

interface CropModalProps {
  file: File;
  imageSize: { width: number; height: number };
  fileCount: number;
  onConfirm: (crop: { x: number; y: number; width: number; height: number }) => void;
  onSkip: () => void;
}

type HandleType = "move" | "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r" | "draw";

const MIN_CROP = 0.02;
const HANDLE_PX = 12;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function clampCrop(c: CropRect): CropRect {
  let { x, y, w, h } = c;
  x = clamp(x, 0, 1);
  y = clamp(y, 0, 1);
  w = clamp(w, MIN_CROP, 1 - x);
  h = clamp(h, MIN_CROP, 1 - y);
  return { x, y, w, h };
}

export function CropModal({
  file,
  imageSize,
  fileCount,
  onConfirm,
  onSkip,
}: CropModalProps) {
  const [step, setStep] = useState<"prompt" | "crop">("prompt");
  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 1, h: 1 });
  const [cursor, setCursor] = useState("crosshair");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: HandleType;
    startPx: number;
    startPy: number;
    startCrop: CropRect;
  } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const getRelPos = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      px: (clientX - rect.left) / rect.width,
      py: (clientY - rect.top) / rect.height,
    };
  }, []);

  const getHandle = useCallback(
    (px: number, py: number): HandleType => {
      const rect = containerRef.current?.getBoundingClientRect();
      const hpx = rect ? HANDLE_PX / rect.width : 0.02;
      const hpy = rect ? HANDLE_PX / rect.height : 0.02;
      const { x, y, w, h } = crop;
      // corners first
      if (Math.abs(px - x) < hpx && Math.abs(py - y) < hpy) return "tl";
      if (Math.abs(px - (x + w)) < hpx && Math.abs(py - y) < hpy) return "tr";
      if (Math.abs(px - x) < hpx && Math.abs(py - (y + h)) < hpy) return "bl";
      if (Math.abs(px - (x + w)) < hpx && Math.abs(py - (y + h)) < hpy) return "br";
      // edges
      if (Math.abs(py - y) < hpy && px >= x && px <= x + w) return "t";
      if (Math.abs(py - (y + h)) < hpy && px >= x && px <= x + w) return "b";
      if (Math.abs(px - x) < hpx && py >= y && py <= y + h) return "l";
      if (Math.abs(px - (x + w)) < hpx && py >= y && py <= y + h) return "r";
      if (px >= x && px <= x + w && py >= y && py <= y + h) return "move";
      return "draw";
    },
    [crop]
  );

  const cursorForHandle = (h: HandleType) => {
    if (h === "tl" || h === "br") return "nwse-resize";
    if (h === "tr" || h === "bl") return "nesw-resize";
    if (h === "t" || h === "b") return "ns-resize";
    if (h === "l" || h === "r") return "ew-resize";
    if (h === "move") return "move";
    return "crosshair";
  };

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const pos = getRelPos(e.clientX, e.clientY);
      if (!pos) return;
      const mode = getHandle(pos.px, pos.py);
      dragRef.current = {
        mode,
        startPx: pos.px,
        startPy: pos.py,
        startCrop: { ...crop },
      };
    },
    [getRelPos, getHandle, crop]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getRelPos(e.clientX, e.clientY);
      if (!pos) return;
      setCursor(cursorForHandle(getHandle(pos.px, pos.py)));
    },
    [getRelPos, getHandle]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const pos = getRelPos(e.clientX, e.clientY);
      if (!pos) return;
      const { px, py } = pos;
      const { mode, startPx, startPy, startCrop } = dragRef.current;
      const dx = px - startPx;
      const dy = py - startPy;
      let c = { ...startCrop };

      if (mode === "move") {
        c.x = startCrop.x + dx;
        c.y = startCrop.y + dy;
      } else if (mode === "draw") {
        c = {
          x: Math.min(startPx, px),
          y: Math.min(startPy, py),
          w: Math.abs(dx),
          h: Math.abs(dy),
        };
      } else if (mode === "tl") {
        c.x = startCrop.x + dx;
        c.y = startCrop.y + dy;
        c.w = startCrop.w - dx;
        c.h = startCrop.h - dy;
      } else if (mode === "tr") {
        c.y = startCrop.y + dy;
        c.w = startCrop.w + dx;
        c.h = startCrop.h - dy;
      } else if (mode === "bl") {
        c.x = startCrop.x + dx;
        c.w = startCrop.w - dx;
        c.h = startCrop.h + dy;
      } else if (mode === "br") {
        c.w = startCrop.w + dx;
        c.h = startCrop.h + dy;
      } else if (mode === "t") {
        c.y = startCrop.y + dy;
        c.h = startCrop.h - dy;
      } else if (mode === "b") {
        c.h = startCrop.h + dy;
      } else if (mode === "l") {
        c.x = startCrop.x + dx;
        c.w = startCrop.w - dx;
      } else if (mode === "r") {
        c.w = startCrop.w + dx;
      }

      setCrop(clampCrop(c));
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [getRelPos]);

  const handleConfirm = () => {
    onConfirm({
      x: Math.round(crop.x * imageSize.width),
      y: Math.round(crop.y * imageSize.height),
      width: Math.round(crop.w * imageSize.width),
      height: Math.round(crop.h * imageSize.height),
    });
  };

  if (step === "prompt") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="w-80 rounded-xl bg-card p-6 shadow-2xl">
          <h2 className="mb-2 text-lg font-semibold">Crop images?</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            All {fileCount} images share the same size ({imageSize.width}×
            {imageSize.height}px). Would you like to crop them?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onSkip}>
              No, keep original
            </Button>
            <Button onClick={() => setStep("crop")}>Yes, crop</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex max-h-[95vh] w-[95vw] max-w-5xl flex-col rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Select crop area</h2>
          <span className="tabular-nums text-sm text-muted-foreground">
            {Math.round(crop.w * imageSize.width)} ×{" "}
            {Math.round(crop.h * imageSize.height)} px
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
          <div ref={containerRef} className="relative select-none">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="crop preview"
                className="pointer-events-none block max-h-[70vh] max-w-full"
                draggable={false}
              />
            )}

            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute left-0 right-0 top-0 bg-black/50"
                style={{ height: `${crop.y * 100}%` }}
              />
              <div
                className="absolute left-0 right-0 bg-black/50"
                style={{ top: `${(crop.y + crop.h) * 100}%`, bottom: 0 }}
              />
              <div
                className="absolute bg-black/50"
                style={{
                  top: `${crop.y * 100}%`,
                  height: `${crop.h * 100}%`,
                  left: 0,
                  width: `${crop.x * 100}%`,
                }}
              />
              <div
                className="absolute bg-black/50"
                style={{
                  top: `${crop.y * 100}%`,
                  height: `${crop.h * 100}%`,
                  left: `${(crop.x + crop.w) * 100}%`,
                  right: 0,
                }}
              />

              <div
                className="absolute border-2 border-white"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                }}
              />

              <div
                className="absolute"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)",
                  backgroundSize: "33.33% 33.33%",
                }}
              />

              {(
                [
                  { k: "tl", l: crop.x, t: crop.y },
                  { k: "tr", l: crop.x + crop.w, t: crop.y },
                  { k: "bl", l: crop.x, t: crop.y + crop.h },
                  { k: "br", l: crop.x + crop.w, t: crop.y + crop.h },
                  { k: "t", l: crop.x + crop.w / 2, t: crop.y },
                  { k: "b", l: crop.x + crop.w / 2, t: crop.y + crop.h },
                  { k: "l", l: crop.x, t: crop.y + crop.h / 2 },
                  { k: "r", l: crop.x + crop.w, t: crop.y + crop.h / 2 },
                ] as const
              ).map(({ k, l, t }) => (
                <div
                  key={k}
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white shadow"
                  style={{ left: `${l * 100}%`, top: `${t * 100}%` }}
                />
              ))}
            </div>

            <div
              className="absolute inset-0"
              style={{ cursor }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <Button variant="outline" onClick={() => setStep("prompt")}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSkip}>
              Skip crop
            </Button>
            <Button onClick={handleConfirm}>Apply crop to all</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
