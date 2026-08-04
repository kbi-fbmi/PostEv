import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import {
  IconArrowLeft, IconLoader2, IconUpload, IconFolder,
  IconCrop, IconFaceId, IconRun, IconDownload,
} from "@tabler/icons-react";
import { cropFileRelative } from "@/helpers/crop";
import { anglesData } from "@/angles";
import { UsedAngle } from "@/types";
import {
  calculatePoseAngle, confirmSidePose, findClosestPoint,
  findFurthestPoint, findPoseOrientation, midpoint, Pt,
} from "@/helpers/poseMath";

interface CropRect { x: number; y: number; w: number; h: number }
interface CropPct { top: number; left: number; right: number; bottom: number }
type Handle = "move"|"tl"|"tr"|"bl"|"br"|"t"|"b"|"l"|"r"|"draw";

const MIN = 0.005, HP = 12;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function clampCrop(c: CropRect): CropRect {
  const x = clamp(c.x, 0, 1-MIN), y = clamp(c.y, 0, 1-MIN);
  return { x, y, w: clamp(c.w, MIN, 1-x), h: clamp(c.h, MIN, 1-y) };
}
const rectToPct = (c: CropRect): CropPct => {
  const r = (v: number) => Math.round(v*10000)/100;
  return { left: r(c.x), top: r(c.y), right: r(1-c.x-c.w), bottom: r(1-c.y-c.h) };
};
const pctToRect = (p: CropPct): CropRect =>
  clampCrop({ x: p.left/100, y: p.top/100, w: (100-p.left-p.right)/100, h: (100-p.top-p.bottom)/100 });

interface FileEntry { file: File; path: string; }

async function readEntryRecursive(
  entry: FileSystemEntry,
  prefix = ""
): Promise<FileEntry[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) =>
      (entry as FileSystemFileEntry).file(res, rej)
    );
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    return [{ file, path }];
  }
  const dir = entry as FileSystemDirectoryEntry;
  const reader = dir.createReader();
  const allEntries: FileSystemEntry[] = [];
  const readBatch = () =>
    new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
  let batch = await readBatch();
  while (batch.length > 0) { allEntries.push(...batch); batch = await readBatch(); }
  const nested = await Promise.all(
    allEntries.map(e => readEntryRecursive(e, prefix ? `${prefix}/${entry.name}` : entry.name))
  );
  return nested.flat();
}

function isImageFile(f: File) { return f.type.startsWith("image/"); }

type ModelState = "idle"|"loading"|"ready"|"error";
type PoseType = "front"|"back"|"left"|"right";

interface BlurResult { entry: FileEntry; previewUrl: string; blob: Blob; faceCount: number; }

interface AnalysisResult {
  entry: FileEntry;
  imageW: number; imageH: number;
  poseType: PoseType;
  landmarks: { x: number; y: number; z: number; visibility?: number }[];
  namedPoints: Record<string, Pt>;
  angles: { pisa?: number; totalCC?: number; upperCC?: number; back?: number };
}

const WASM     = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_POSE = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

export default function PreprocessPage() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [mode, setMode] = useState<"crop"|"face"|"posture">("crop");
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [imageUrl, setImageUrl] = useState("");
  const [crop, setCrop] = useState<CropRect>({ x:0,y:0,w:1,h:1 });
  const [applying, setApplying] = useState(false);
  const [cursor, setCursor] = useState("crosshair");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{mode: Handle; sx:number; sy:number; sc:CropRect}|null>(null);

  const [modelState, setModelState] = useState<ModelState>("idle");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [resultIdx, setResultIdx] = useState(0);
  const [blurring, setBlurring] = useState(false);
  const [blurResults, setBlurResults] = useState<BlurResult[]>([]);
  const [blurIdx, setBlurIdx] = useState(0);
  const modelsRef = useRef<{
    poseLandmarker?: import("@mediapipe/tasks-vision").PoseLandmarker;
  } | null>(null);
  const overlayRef   = useRef<HTMLCanvasElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  const pct = rectToPct(crop);

  useEffect(() => {
    if (!entries[0]) { setImageUrl(""); return; }
    const url = URL.createObjectURL(entries[0].file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [entries]);

  useEffect(() => {
    return () => { blurResults.forEach(r => URL.revokeObjectURL(r.previewUrl)); };
  }, [blurResults]);

  useEffect(() => {
    if (mode === "crop") return;
    let cancelled = false;
    setModelState("loading");
    modelsRef.current?.poseLandmarker?.close();
    modelsRef.current = null;

    (async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM);
        const pl = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_POSE, delegate: "GPU" },
          runningMode: "IMAGE", numPoses: mode === "face" ? 10 : 1,
          outputSegmentationMasks: mode === "posture",
        });
        if (cancelled) { pl.close(); return; }
        modelsRef.current = { poseLandmarker: pl };
        if (!cancelled) setModelState("ready");
      } catch { if (!cancelled) setModelState("error"); }
    })();

    return () => {
      cancelled = true;
      modelsRef.current?.poseLandmarker?.close();
      modelsRef.current = null;
      setModelState("idle");
    };
  }, [mode]);

  useEffect(() => {
    const r = results[resultIdx];
    if (!r || !overlayRef.current) return;
    const img = previewImgRef.current;
    if (img && !img.complete) img.onload = () => overlayRef.current && drawOverlay(overlayRef.current, r);
    else if (img) drawOverlay(overlayRef.current, r);
  }, [results, resultIdx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        if (mode === "posture") setResultIdx(i => Math.max(0, i - 1));
        else if (mode === "face") setBlurIdx(i => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        if (mode === "posture") setResultIdx(i => Math.min(results.length - 1, i + 1));
        else if (mode === "face") setBlurIdx(i => Math.min(blurResults.length - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, results.length, blurResults.length]);

  const getRelPos = useCallback((cx: number, cy: number) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { px: (cx-r.left)/r.width, py: (cy-r.top)/r.height };
  }, []);

  const getHandle = useCallback((px: number, py: number): Handle => {
    const r = containerRef.current?.getBoundingClientRect();
    const hx = r?HP/r.width:0.02, hy = r?HP/r.height:0.02;
    const {x,y,w,h} = crop;
    if (Math.abs(px-x)<hx && Math.abs(py-y)<hy) return "tl";
    if (Math.abs(px-(x+w))<hx && Math.abs(py-y)<hy) return "tr";
    if (Math.abs(px-x)<hx && Math.abs(py-(y+h))<hy) return "bl";
    if (Math.abs(px-(x+w))<hx && Math.abs(py-(y+h))<hy) return "br";
    if (Math.abs(py-y)<hy && px>=x && px<=x+w) return "t";
    if (Math.abs(py-(y+h))<hy && px>=x && px<=x+w) return "b";
    if (Math.abs(px-x)<hx && py>=y && py<=y+h) return "l";
    if (Math.abs(px-(x+w))<hx && py>=y && py<=y+h) return "r";
    if (px>=x && px<=x+w && py>=y && py<=y+h) return "move";
    return "draw";
  }, [crop]);

  const cursorFor = (h: Handle) => {
    if (h==="tl"||h==="br") return "nwse-resize";
    if (h==="tr"||h==="bl") return "nesw-resize";
    if (h==="t"||h==="b")   return "ns-resize";
    if (h==="l"||h==="r")   return "ew-resize";
    if (h==="move")          return "move";
    return "crosshair";
  };

  const onCropMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getRelPos(e.clientX, e.clientY);
    if (!pos) return;
    dragRef.current = { mode: getHandle(pos.px,pos.py), sx:pos.px, sy:pos.py, sc:{...crop} };
  }, [getRelPos, getHandle, crop]);

  const onCropMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getRelPos(e.clientX, e.clientY);
    if (!pos) return;
    setCursor(cursorFor(getHandle(pos.px, pos.py)));
  }, [getRelPos, getHandle]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const pos = getRelPos(e.clientX, e.clientY);
      if (!pos) return;
      const {mode:h, sx, sy, sc} = dragRef.current;
      const dx=pos.px-sx, dy=pos.py-sy;
      let c = {...sc};
      if (h==="move") { c.x=sc.x+dx; c.y=sc.y+dy; }
      else if (h==="draw") { c={x:Math.min(sx,pos.px),y:Math.min(sy,pos.py),w:Math.abs(dx),h:Math.abs(dy)}; }
      else if (h==="tl") { c.x=sc.x+dx; c.y=sc.y+dy; c.w=sc.w-dx; c.h=sc.h-dy; }
      else if (h==="tr") { c.y=sc.y+dy; c.w=sc.w+dx; c.h=sc.h-dy; }
      else if (h==="bl") { c.x=sc.x+dx; c.w=sc.w-dx; c.h=sc.h+dy; }
      else if (h==="br") { c.w=sc.w+dx; c.h=sc.h+dy; }
      else if (h==="t")  { c.y=sc.y+dy; c.h=sc.h-dy; }
      else if (h==="b")  { c.h=sc.h+dy; }
      else if (h==="l")  { c.x=sc.x+dx; c.w=sc.w-dx; }
      else if (h==="r")  { c.w=sc.w+dx; }
      setCrop(clampCrop(c));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [getRelPos]);

  const clearAll = () => {
    blurResults.forEach(r => URL.revokeObjectURL(r.previewUrl));
    setEntries([]);
    setCrop({x:0,y:0,w:1,h:1});
    setResults([]); setResultIdx(0);
    setBlurResults([]); setBlurIdx(0);
  };

  const loadEntries = (list: FileEntry[]) => {
    const imgs = list.filter(e => isImageFile(e.file));
    if (!imgs.length) return;
    setEntries(imgs);
    setCrop({x:0,y:0,w:1,h:1});
    setResults([]); setResultIdx(0);
    setBlurResults([]); setBlurIdx(0);
  };

  const handleFilePick = (files: FileList|null) => {
    if (!files) return;
    const es: FileEntry[] = Array.from(files).map(f => ({
      file: f,
      path: (f as any).webkitRelativePath || f.name,
    }));
    loadEntries(es);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const items = Array.from(e.dataTransfer.items);
    const fsEntries = items
      .map(i => i.webkitGetAsEntry())
      .filter(Boolean) as FileSystemEntry[];
    const all: FileEntry[] = [];
    for (const fe of fsEntries) all.push(...(await readEntryRecursive(fe)));
    if (all.length) loadEntries(all);
    else {
      const files = Array.from(e.dataTransfer.files);
      loadEntries(files.map(f => ({ file: f, path: f.name })));
    }
  }, []);

  const handlePctChange = (key: keyof CropPct, val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)||n<0) return;
    setCrop(pctToRect({...pct, [key]: n}));
  };

  const handleCropProcess = async () => {
    if (!entries.length) return;
    setApplying(true);
    try {
      const zip = new JSZip();
      for (const e of entries) {
        const cropped = await cropFileRelative(e.file, crop);
        zip.file(e.path, cropped);
      }
      const blob = await zip.generateAsync({type:"blob"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="preprocessed.zip";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } finally { setApplying(false); }
  };

  const handleBlurFaces = async () => {
    if (!entries.length || !modelsRef.current?.poseLandmarker) return;
    setBlurring(true); setProgress(0);
    blurResults.forEach(r => URL.revokeObjectURL(r.previewUrl));
    setBlurResults([]); setBlurIdx(0);
    const pl = modelsRef.current.poseLandmarker;
    const newResults: BlurResult[] = [];
    const HEAD_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    for (let i = 0; i < entries.length; i++) {
      setProgress(Math.round((i / entries.length) * 100));
      const entry = entries[i];
      try {
        const bitmap = await createImageBitmap(entry.file);
        const w = bitmap.width, h = bitmap.height;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
        bitmap.close();

        const poseResult = pl.detect(canvas);
        let faceCount = 0;

        for (const lmSet of poseResult.landmarks) {
          const vis = HEAD_IDS.map(idx => lmSet[idx]).filter(lm => (lm.visibility ?? 0) > 0.1);
          if (vis.length < 1) continue;

          const xs = vis.map(lm => lm.x * w);
          const ys = vis.map(lm => lm.y * h);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const spanX = maxX - minX, spanY = maxY - minY;
          const faceSize = Math.max(spanX, spanY);

          const x = Math.floor(Math.max(0, minX - spanX * 0.9));
          const y = Math.floor(Math.max(0, minY - faceSize * 2.8));
          const x2 = Math.floor(Math.min(w, maxX + spanX * 0.9));
          const y2 = Math.floor(Math.min(h, maxY + spanY * 1.2));
          const fw = x2 - x, fh = y2 - y;
          if (fw <= 0 || fh <= 0) continue;
          faceCount++;

          const faceRef = Math.min(fw, fh);
          const GRID = Math.max(4, Math.round(faceRef / 20));
          const blurPx = Math.max(2, Math.round(faceRef / GRID * 0.5));
          const tiny = document.createElement("canvas");
          tiny.width = GRID; tiny.height = GRID;
          tiny.getContext("2d")!.drawImage(canvas, x, y, fw, fh, 0, 0, GRID, GRID);
          const pix = document.createElement("canvas");
          pix.width = fw; pix.height = fh;
          const pc = pix.getContext("2d")!;
          pc.imageSmoothingEnabled = false;
          pc.drawImage(tiny, 0, 0, GRID, GRID, 0, 0, fw, fh);
          let src = document.createElement("canvas");
          src.width = fw; src.height = fh;
          const sc = src.getContext("2d")!;
          sc.filter = `blur(${blurPx}px)`;
          sc.drawImage(pix, 0, 0);

          const maskC = document.createElement("canvas");
          maskC.width = fw; maskC.height = fh;
          const mc = maskC.getContext("2d")!;
          mc.filter = `blur(${Math.round(Math.min(fw, fh) * 0.06)}px)`;
          mc.fillStyle = "white";
          mc.beginPath();
          mc.ellipse(fw / 2, fh / 2, fw / 2 * 0.92, fh / 2 * 0.92, 0, 0, Math.PI * 2);
          mc.fill();

          const composed = document.createElement("canvas");
          composed.width = fw; composed.height = fh;
          const cc = composed.getContext("2d")!;
          cc.drawImage(src, 0, 0);
          cc.globalCompositeOperation = "destination-in";
          cc.drawImage(maskC, 0, 0);
          canvas.getContext("2d")!.drawImage(composed, 0, 0, fw, fh, x, y, fw, fh);
        }

        poseResult.segmentationMasks?.forEach(m => { try { m.close(); } catch {} });

        const blob = await new Promise<Blob>(res =>
          canvas.toBlob(b => res(b!), entry.file.type || "image/jpeg", 0.92)
        );
        newResults.push({ entry, previewUrl: URL.createObjectURL(blob), blob, faceCount });
      } catch (e) {
        console.error("blur failed", entry.path, e);
      }
    }

    setProgress(100);
    setBlurResults(newResults);
    setBlurIdx(0);
    setBlurring(false);
  };

  const downloadBlurZip = async () => {
    if (!blurResults.length) return;
    const zip = new JSZip();
    for (const r of blurResults) zip.file(r.entry.path, r.blob);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a"); a.href = url; a.download = "blurred_faces.zip";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPoseZip = async () => {
    if (!results.length) return;
    const zip = new JSZip();
    zip.file("appinfo.json", JSON.stringify({ version: "1.1.0", date: new Date().toISOString() }, null, 2));

    for (const r of results) {
      const { entry, imageW, imageH, poseType, namedPoints, angles } = r;
      const norm = ([x, y]: Pt) => ({ x: x / imageW, y: y / imageH });

      const points = anglesData.points.map(p => ({ ...p, x: null as number | null, y: null as number | null }));
      const sp = (idx: number, pt: Pt | undefined) => {
        if (!pt) return;
        const n = norm(pt); points[idx] = { ...points[idx], x: n.x, y: n.y };
      };

      const usedAngle: UsedAngle = {
        totalCC: false, pisa: false, back: false, upperCC: false,
        apicalVertebra: false, coronalBalance: false, sagittalBalance: false, thoricalSagittalAlignment: false,
      };
      const angleValues: { type: string; value: { angle: number; x: number; y: number } }[] = [];
      let lastSelectedAngleTool: string | null = null;

      if (poseType === "left" || poseType === "right") {
        sp(0, namedPoints["LM"]);
        sp(1, namedPoints["L5"]);
        sp(2, namedPoints["C7"]);
        sp(3, namedPoints["furthest"]);
        if (angles.totalCC != null) {
          usedAngle.totalCC = true; lastSelectedAngleTool = "totalCC";
          const v = norm(namedPoints["L5"]);
          angleValues.push({ type: "totalCC", value: { angle: angles.totalCC, ...v } });
        }
        if (angles.upperCC != null && namedPoints["furthest"]) {
          usedAngle.upperCC = true;
          const v = norm(namedPoints["furthest"]);
          angleValues.push({ type: "upperCC", value: { angle: angles.upperCC, ...v } });
        }
      } else if (poseType === "front") {
        sp(4, namedPoints["LM"]);
        sp(5, namedPoints["L5"]);
        sp(6, namedPoints["C7"]);
        if (angles.pisa != null) {
          usedAngle.pisa = true; lastSelectedAngleTool = "pisa";
          const v = norm(namedPoints["L5"]);
          angleValues.push({ type: "pisa", value: { angle: angles.pisa, ...v } });
        }
      } else {
        sp(7, namedPoints["C7"]);
        sp(8, namedPoints["L5"]);
        sp(9, namedPoints["LM"]);
        if (angles.back != null) {
          usedAngle.back = true; lastSelectedAngleTool = "back";
          const v = norm(namedPoints["L5"]);
          angleValues.push({ type: "back", value: { angle: angles.back, ...v } });
        }
      }

      const fname = entry.file.name;
      const m = fname.match(/(.+)\.([^/.]+)$/);
      const base = m ? m[1] : fname, ext = m ? m[2] : "jpg";
      const dir = entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : "";
      const imgPath  = dir ? `${dir}/${base}.${ext}` : `${base}.${ext}`;
      const jsonPath = dir ? `${dir}/${base}.json` : `${base}.json`;

      const url = URL.createObjectURL(entry.file);
      const blob = await fetch(url).then(r => r.blob());
      URL.revokeObjectURL(url);
      zip.file(imgPath, blob);

      zip.file(jsonPath, JSON.stringify({
        angle: { ...anglesData, points, filename: fname },
        filename: fname,
        isFlipped: false,
        usedAngle,
        lastSelectedAngleTool,
        originalPath: entry.path,
        angleValues,
        cropped: false,
      }, null, 2));
    }

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content); a.download = "pose_analysis.zip";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const analyzeFiles = async () => {
    if (!entries.length || !modelsRef.current?.poseLandmarker) return;
    setAnalyzing(true); setProgress(0); setResults([]);
    const pl = modelsRef.current.poseLandmarker;
    const out: AnalysisResult[] = [];

    for (let i = 0; i < entries.length; i++) {
      setProgress(Math.round((i/entries.length)*100));
      const entry = entries[i];
      try {
        const bitmap = await createImageBitmap(entry.file);
        const imgW=bitmap.width, imgH=bitmap.height;
        const poseResult = pl.detect(bitmap);
        bitmap.close();

        if (!poseResult.landmarks.length) continue;
        const lm = poseResult.landmarks[0];
        const px = (idx: number): Pt => [lm[idx].x*imgW, lm[idx].y*imgH];

        const lShoulder=px(11), rShoulder=px(12);
        const lHip=px(23), rHip=px(24);
        const lAnkle=px(27), rAnkle=px(28);
        const lToe=px(31), rToe=px(32);
        const c7=midpoint(lShoulder,rShoulder), l5=midpoint(lHip,rHip);
        const midAnkles=midpoint(lAnkle,rAnkle), midToes=midpoint(lToe,rToe);

        const named: Record<string,Pt> = {
          C7:c7, L5:l5, midAnkles, midToes,
          lShoulder, rShoulder, lHip, rHip, lAnkle, rAnkle,
        };

        const isSide = confirmSidePose(c7, l5, lShoulder, rShoulder);
        const noseVis = lm[0]?.visibility ?? 0;
        let poseType: PoseType;
        let orientation = 0;

        if (isSide) {
          orientation = findPoseOrientation(midAnkles, lToe, rToe);
          poseType = orientation>0 ? "left" : "right";
        } else {
          poseType = noseVis>0.5 ? "front" : "back";
        }

        const angles: AnalysisResult["angles"] = {};

        if (isSide) {
          const ankle = poseType==="left" ? lAnkle : rAnkle;
          named["LM"] = ankle;

          const segMask = poseResult.segmentationMasks?.[0];
          if (segMask) {
            const f32 = segMask.getAsFloat32Array();
            const mw=segMask.width, mh=segMask.height;
            segMask.close();
            const bin = new Uint8Array(f32.length);
            for (let j=0; j<f32.length; j++) bin[j] = f32[j]>0.5?1:0;
            const toM = ([x,y]: Pt): Pt => [x/imgW*mw, y/imgH*mh];
            const frM = ([x,y]: Pt): Pt => [x/mw*imgW, y/mh*imgH];

            const newC7 = frM(findClosestPoint(bin, mw, mh, toM(c7), orientation));
            const newL5 = frM(findClosestPoint(bin, mw, mh, toM(l5), orientation));
            named["C7"] = newC7;
            named["L5"] = newL5;

            angles.totalCC = calculatePoseAngle(newC7, newL5, ankle);

            const furthest = frM(findFurthestPoint(bin, mw, mh, toM(newL5), toM(newC7), -orientation, 0.1));
            named["furthest"] = furthest;
            angles.upperCC = calculatePoseAngle(newC7, furthest, newL5);
          } else {
            angles.totalCC = calculatePoseAngle(c7, l5, ankle);
          }
        } else if (poseType==="front") {
          named["LM"] = midToes;
          angles.pisa = calculatePoseAngle(c7, l5, midToes);
        } else {
          named["LM"] = midAnkles;
          angles.back = calculatePoseAngle(c7, l5, midAnkles);
        }

        poseResult.segmentationMasks?.forEach(m => { try { m.close(); } catch {} });
        out.push({ entry, imageW:imgW, imageH:imgH, poseType, landmarks:lm as any, namedPoints:named, angles });
      } catch {}
    }

    setResults(out); setResultIdx(0); setProgress(100); setAnalyzing(false);
  };

  const drawOverlay = (canvas: HTMLCanvasElement, r: AnalysisResult) => {
    const img = previewImgRef.current;
    if (!img) return;
    const dw=img.clientWidth, dh=img.clientHeight;
    canvas.width=dw; canvas.height=dh;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, dw, dh);
    const sx=dw/r.imageW, sy=dh/r.imageH;
    const dp = ([x,y]: Pt): Pt => [x*sx, y*sy];
    const np=r.namedPoints;
    const line=(a:Pt,b:Pt,c:Pt,col:string)=>{
      ctx.strokeStyle=col; ctx.lineWidth=3;
      const [ax,ay]=dp(a),[bx,by]=dp(b),[cx,cy]=dp(c);
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.lineTo(cx,cy); ctx.stroke();
    };
    if (np["C7"] && np["L5"] && np["LM"])
      line(np["C7"], np["L5"], np["LM"], "#ff8800");
    if (np["furthest"])
      line(np["C7"], np["furthest"], np["L5"], "#ff00ff");

    const LABELS: Record<string,string> =
      r.poseType === "front"
        ? { C7:"Jugulum", L5:"Symphysis", LM:"Midpoint feet" }
        : r.poseType === "back"
        ? { C7:"C7", L5:"L5", LM:"MA" }
        : { C7:"C7", L5:"L5", LM:"LM", furthest:"FC" };
    ctx.font="bold 11px sans-serif";
    for (const [name,pt] of Object.entries(np)) {
      const label=LABELS[name]; if (!label) continue;
      const [x,y]=dp(pt);
      ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2);
      ctx.fillStyle="#ff2222"; ctx.fill();
      ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.strokeText(label,x+8,y+4);
      ctx.fillStyle="#fff"; ctx.fillText(label,x+8,y+4);
    }

    ctx.font="bold 15px sans-serif";
    Object.entries(r.angles).filter(([,v])=>v!=null).forEach(([k,v],i)=>{
      const t=`${k}: ${v!.toFixed(1)}°`;
      ctx.lineWidth=3; ctx.strokeStyle="#000"; ctx.strokeText(t,10,24+i*22);
      ctx.fillStyle="#ff2222"; ctx.fillText(t,10,24+i*22);
    });
  };

  const dropZone = (
    <div
      className={`relative flex flex-col rounded-lg border-2 border-dashed transition-colors ${dragOver?"border-primary bg-primary/5":"border-border hover:border-primary"}`}
      onDrop={handleDrop}
      onDragOver={e=>{e.preventDefault();setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}>
      <div className="flex flex-col items-center gap-1.5 px-4 py-4 text-muted-foreground">
        <IconUpload size={20}/>
        <span className="text-xs text-center">Drop images or folders here</span>
      </div>
      <div className="flex border-t border-border">
        <button
          onClick={()=>fileInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1 py-2 text-xs hover:bg-muted transition-colors rounded-bl-md">
          <IconUpload size={12}/> Files
        </button>
        <div className="w-px bg-border"/>
        <button
          onClick={()=>folderInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1 py-2 text-xs hover:bg-muted transition-colors rounded-br-md">
          <IconFolder size={12}/> Folder
        </button>
      </div>
      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
        onChange={e=>{handleFilePick(e.target.files); e.target.value="";}}/>
      <input ref={folderInputRef} type="file" multiple className="hidden"
        {...{webkitdirectory:"", mozdirectory:""} as any}
        onChange={e=>{handleFilePick(e.target.files); e.target.value="";}}/>
    </div>
  );

  const fileList = entries.length > 0 && (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{entries.length} image{entries.length!==1?"s":""}</div>
      <div className="max-h-24 overflow-y-auto rounded border border-border bg-muted/30 p-2 text-xs text-muted-foreground space-y-0.5">
        {entries.map((e,i)=><div key={i} className="truncate" title={e.path}>{e.path}</div>)}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3 shadow-sm">
        <Button variant="ghost" size="sm" onClick={()=>navigate("/")} className="gap-1">
          <IconArrowLeft size={16}/> Back
        </Button>
        <span className="font-semibold">Preprocess</span>
        {entries.length>0 && (
          <>
            <span className="text-sm text-muted-foreground">{entries.length} image{entries.length!==1?"s":""}</span>
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground hover:text-foreground">Clear</Button>
          </>
        )}
        <div className="ml-auto flex rounded-lg border border-border overflow-hidden text-sm">
          <button onClick={()=>setMode("crop")}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode==="crop"?"bg-primary text-primary-foreground":"hover:bg-muted"}`}>
            <IconCrop size={14}/> Crop
          </button>
          <button onClick={()=>setMode("face")}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode==="face"?"bg-primary text-primary-foreground":"hover:bg-muted"}`}>
            <IconFaceId size={14}/> Face
          </button>
          <button onClick={()=>setMode("posture")}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${mode==="posture"?"bg-primary text-primary-foreground":"hover:bg-muted"}`}>
            <IconRun size={14}/> Posture
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-72 shrink-0 flex-col gap-4 border-r bg-card p-4 overflow-y-auto">
          {dropZone}
          {fileList}

          {mode==="crop" ? (
            <>
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Crop (% removed per side)</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {(["top","left","right","bottom"] as const).map(k=>(
                    <label key={k} className="flex flex-col gap-1">
                      <span className="text-xs capitalize text-muted-foreground">{k}</span>
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" max="99" step="0.1" value={pct[k]}
                          onChange={e=>handlePctChange(k,e.target.value)}
                          className="w-full rounded border border-input bg-background px-2 py-1 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/>
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="rounded bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
                  Keeps <span className="font-medium text-foreground">{(100-pct.left-pct.right).toFixed(1)}% × {(100-pct.top-pct.bottom).toFixed(1)}%</span>
                </div>
              </div>
              <div className="mt-auto">
                <Button className="w-full" disabled={!entries.length||applying} onClick={handleCropProcess}>
                  {applying?<span className="flex items-center gap-2"><IconLoader2 size={16} className="animate-spin"/>Processing…</span>:"Process & Download ZIP"}
                </Button>
              </div>
            </>
          ) : mode==="face" ? (
            <>
              {blurring && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{progress}%</div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{width:`${progress}%`}}/>
                  </div>
                </div>
              )}

              {blurResults.length>0 && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase text-muted-foreground">{blurIdx+1}/{blurResults.length}</span>
                    <div className="flex gap-1">
                      <button disabled={blurIdx===0} onClick={()=>setBlurIdx(i=>i-1)} className="rounded px-1.5 py-0.5 text-xs hover:bg-muted disabled:opacity-40">◀</button>
                      <button disabled={blurIdx===blurResults.length-1} onClick={()=>setBlurIdx(i=>i+1)} className="rounded px-1.5 py-0.5 text-xs hover:bg-muted disabled:opacity-40">▶</button>
                    </div>
                  </div>
                  <div className="truncate text-xs text-muted-foreground" title={blurResults[blurIdx].entry.path}>{blurResults[blurIdx].entry.path}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Faces:</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${blurResults[blurIdx].faceCount===0?"bg-red-500":"bg-green-500"}`}>
                      {blurResults[blurIdx].faceCount}
                    </span>
                    {blurResults[blurIdx].faceCount===0 && <span className="text-xs text-red-400">none detected</span>}
                  </div>
                </div>
              )}

              <div className="mt-auto flex flex-col gap-2">
                <Button className="w-full" disabled={!entries.length||modelState==="loading"||modelState==="error"||blurring} onClick={handleBlurFaces}>
                  {modelState==="loading"
                    ? <span className="flex items-center gap-2"><IconLoader2 size={16} className="animate-spin"/>Loading…</span>
                    : modelState==="error"
                    ? <span className="flex items-center gap-2"><IconFaceId size={16}/>Model failed</span>
                    : blurring
                    ? <span className="flex items-center gap-2"><IconLoader2 size={16} className="animate-spin"/>Processing…</span>
                    : <span className="flex items-center gap-2"><IconFaceId size={16}/>Blur Faces</span>}
                </Button>
                {blurResults.length>0 && (
                  <Button variant="outline" className="w-full" onClick={downloadBlurZip}>
                    <span className="flex items-center gap-2"><IconDownload size={16}/>Download ZIP</span>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              {analyzing && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{progress}%</div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{width:`${progress}%`}}/>
                  </div>
                </div>
              )}

              {results.length>0 && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase text-muted-foreground">{resultIdx+1}/{results.length}</span>
                    <div className="flex gap-1">
                      <button disabled={resultIdx===0} onClick={()=>setResultIdx(i=>i-1)} className="rounded px-1.5 py-0.5 text-xs hover:bg-muted disabled:opacity-40">◀</button>
                      <button disabled={resultIdx===results.length-1} onClick={()=>setResultIdx(i=>i+1)} className="rounded px-1.5 py-0.5 text-xs hover:bg-muted disabled:opacity-40">▶</button>
                    </div>
                  </div>
                  {(()=>{
                    const r=results[resultIdx];
                    return (
                      <>
                        <div className="truncate text-xs text-muted-foreground" title={r.entry.path}>{r.entry.path}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Pose:</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                            r.poseType==="left"||r.poseType==="right"?"bg-blue-500":
                            r.poseType==="front"?"bg-green-500":"bg-orange-500"
                          }`}>{r.poseType}</span>
                        </div>
                        {Object.entries(r.angles).filter(([,v])=>v!=null).map(([k,v])=>(
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-semibold tabular-nums">{v!.toFixed(1)}°</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="mt-auto flex flex-col gap-2">
                <Button className="w-full" disabled={!entries.length||modelState==="loading"||modelState==="error"||analyzing} onClick={analyzeFiles}>
                  {modelState==="loading"
                    ? <span className="flex items-center gap-2"><IconLoader2 size={16} className="animate-spin"/>Loading…</span>
                    : modelState==="error"
                    ? <span className="flex items-center gap-2"><IconRun size={16}/>Model failed</span>
                    : analyzing
                    ? <span className="flex items-center gap-2"><IconLoader2 size={16} className="animate-spin"/>Analyzing…</span>
                    : <span className="flex items-center gap-2"><IconRun size={16}/>Analyze All</span>}
                </Button>
                {results.length>0 && (
                  <Button variant="outline" className="w-full" onClick={downloadPoseZip}>
                    <span className="flex items-center gap-2"><IconDownload size={16}/>Save ZIP for Main App</span>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden bg-muted/20 p-4">
          {mode==="face" && blurResults[blurIdx] ? (
            <div className="relative select-none">
              <img
                key={blurResults[blurIdx].entry.path+blurIdx}
                src={blurResults[blurIdx].previewUrl}
                alt="blurred preview"
                className="pointer-events-none block max-h-[80vh] max-w-full"
                draggable={false}
              />
              {blurResults[blurIdx].faceCount===0 && (
                <div className="absolute bottom-2 left-2 rounded bg-red-500/90 px-2 py-1 text-xs text-white">
                  No faces detected
                </div>
              )}
            </div>
          ) : mode==="crop" && imageUrl ? (
            <div ref={containerRef} className="relative select-none">
              <img src={imageUrl} alt="preview" className="pointer-events-none block max-h-[80vh] max-w-full" draggable={false}/>
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-0 right-0 top-0 bg-black/50" style={{height:`${crop.y*100}%`}}/>
                <div className="absolute left-0 right-0 bg-black/50" style={{top:`${(crop.y+crop.h)*100}%`,bottom:0}}/>
                <div className="absolute bg-black/50" style={{top:`${crop.y*100}%`,height:`${crop.h*100}%`,left:0,width:`${crop.x*100}%`}}/>
                <div className="absolute bg-black/50" style={{top:`${crop.y*100}%`,height:`${crop.h*100}%`,left:`${(crop.x+crop.w)*100}%`,right:0}}/>
                <div className="absolute border-2 border-white" style={{left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.w*100}%`,height:`${crop.h*100}%`}}/>
                <div className="absolute" style={{
                  left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.w*100}%`,height:`${crop.h*100}%`,
                  backgroundImage:"linear-gradient(to right,rgba(255,255,255,0.2) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.2) 1px,transparent 1px)",
                  backgroundSize:"33.33% 33.33%",
                }}/>
                {([
                  {k:"tl",l:crop.x,t:crop.y},{k:"tr",l:crop.x+crop.w,t:crop.y},
                  {k:"bl",l:crop.x,t:crop.y+crop.h},{k:"br",l:crop.x+crop.w,t:crop.y+crop.h},
                  {k:"t",l:crop.x+crop.w/2,t:crop.y},{k:"b",l:crop.x+crop.w/2,t:crop.y+crop.h},
                  {k:"l",l:crop.x,t:crop.y+crop.h/2},{k:"r",l:crop.x+crop.w,t:crop.y+crop.h/2},
                ] as const).map(({k,l,t})=>(
                  <div key={k} className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white shadow" style={{left:`${l*100}%`,top:`${t*100}%`}}/>
                ))}
              </div>
              <div className="absolute inset-0" style={{cursor}} onMouseDown={onCropMouseDown} onMouseMove={onCropMouseMove}/>
            </div>
          ) : mode==="posture" && results[resultIdx] ? (
            <div className="relative select-none">
              <img
                ref={previewImgRef}
                key={results[resultIdx].entry.path+resultIdx}
                src={URL.createObjectURL(results[resultIdx].entry.file)}
                alt="analyzed"
                className="pointer-events-none block max-h-[80vh] max-w-full"
                draggable={false}
                onLoad={()=>overlayRef.current&&drawOverlay(overlayRef.current,results[resultIdx])}
              />
              <canvas ref={overlayRef} className="pointer-events-none absolute inset-0"/>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <IconUpload size={32} className="opacity-30"/>
              <span className="text-sm">
                {mode==="posture" ? "Load images and click Analyze All"
                  : mode==="face" ? "Load images and click Blur Faces (Preview)"
                  : "Load images or a folder to preview"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
