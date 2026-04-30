import { useCallback, useEffect, useRef, useState } from "react";
import Toolbar from "./components/toolbar";
import FileDragNDrop from "./components/file_drag_n_drop";
import Canvas from "./canvas";
import NoFiles from "./components/no_files";
import { Angles, CalculatedAngle, Point } from "./types";
import { useAppStore } from "./store";
import { Toaster } from "./components/ui/toaster";
import { useToast } from "./hooks/use-toast";
import { CropModal } from "./components/crop_modal";

async function getImageSize(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject();
    };
    img.src = url;
  });
}

async function applyCropToFiles(
  files: File[],
  crop: { x: number; y: number; width: number; height: number }
): Promise<File[]> {
  return Promise.all(
    files.map(async (file) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = url;
      });
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, -crop.x, -crop.y);

      const blob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), file.type || "image/png")
      );
      const newFile = new File([blob], file.name, {
        type: file.type || "image/png",
      });
      if (file.webkitRelativePath) {
        Object.defineProperty(newFile, "webkitRelativePath", {
          value: file.webkitRelativePath,
          writable: false,
        });
      }
      return newFile;
    })
  );
}

function App() {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const disableToolsInitializedRef = useRef(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const {
    tool,
    tools,
    toolbarHeight,
    data,
    view,
    download,
    zipDownload,
    zipProgress,
    setToolbarHeight,
    changeTool,
    setFiles,
    setPoints,
    handlePhotoAngleValues,
    handleZipDownload,
    handleZipImport,
    setDownload,
    setTool,
    handleDisableFilesTools,
  } = useAppStore();

  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingImageSize, setPendingImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleIncomingFiles = useCallback(
    async (files: File[]) => {
      if (files.length < 2) {
        setFiles(files);
        return;
      }
      try {
        const sizes = await Promise.all(files.map(getImageSize));
        const first = sizes[0];
        const allSame = sizes.every(
          (s) => s.width === first.width && s.height === first.height
        );
        if (!allSame) {
          setFiles(files);
          return;
        }
        setPendingFiles(files);
        setPendingImageSize(first);
      } catch {
        setFiles(files);
      }
    },
    [setFiles]
  );

  const handleCropConfirm = useCallback(
    async (crop: { x: number; y: number; width: number; height: number }) => {
      if (!pendingFiles) return;
      const croppedFiles = await applyCropToFiles(pendingFiles, crop);
      setPendingFiles(null);
      setPendingImageSize(null);
      setFiles(croppedFiles);
    },
    [pendingFiles, setFiles]
  );

  const handleCropSkip = useCallback(() => {
    if (!pendingFiles) return;
    const files = pendingFiles;
    setPendingFiles(null);
    setPendingImageSize(null);
    setFiles(files);
  }, [pendingFiles, setFiles]);

  useEffect(() => {
    const newHeight = toolbarRef.current?.clientHeight || 0;
    if (newHeight !== toolbarHeight) {
      setToolbarHeight(newHeight);
    }
  }, [toolbarRef.current?.clientHeight, setToolbarHeight, toolbarHeight]);

  useEffect(() => {
    if (data && !disableToolsInitializedRef.current) {
      disableToolsInitializedRef.current = true;
      handleDisableFilesTools(view.index);

      return () => {
        disableToolsInitializedRef.current = false;
      };
    }
  }, [data, handleDisableFilesTools, view.index]);

  useEffect(() => {
    const handleDownloadImages = async () => {
      if (tool === "downloadImages" && !isDownloading && stageRef.current) {
        try {
          setIsDownloading(true);
          await handleZipDownload(stageRef.current);
          setTool("drag");
        } catch (error) {
          console.error("Error during zip download:", error);
        } finally {
          setIsDownloading(false);
        }
      }
    };

    handleDownloadImages();
  }, [tool, handleZipDownload, setTool, isDownloading]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        changeTool("next");
      } else if (event.key === "ArrowLeft") {
        changeTool("previous");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [changeTool]);

  const handleFileInput = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await handleZipImport(file);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Import failed",
          description: error instanceof Error ? error.message : "An unknown error occurred while importing the file.",
        });
      }
    }
    event.target.value = "";
  };

  const getCurrentAngle = (): Angles | null => {
    if (
      data === null ||
      view.index === null ||
      view.index >= data.length ||
      tool === null
    )
      return null;

    const currentAngle = data[view.index]?.angle;
    if (!currentAngle) return null;

    return (currentAngle as Angles) || null;
  };

  const getCurrentAnglePoints = (): Point[] | null => {
    if (data === null || view.index === null || tool === null) return null;

    const currentAngle = data[view.index]?.angle;
    if (!currentAngle) return null;

    return currentAngle.points;
  };

  const handleCanvasPhotoAngleValues = (calcAngle: CalculatedAngle) => {
    handlePhotoAngleValues(calcAngle, view.index);
  };

  return (
    <div className="relative h-screen-dvh w-screen-dvw">
      <Toolbar
        setTool={changeTool}
        tool={tool}
        ref={toolbarRef}
        className="fixed top-0 z-20 w-full"
        tools={tools}
      />
      {data === null && <NoFiles />}
      <div
        style={{
          marginTop: toolbarHeight,
          height: `calc(100vh - ${toolbarHeight}px)`,
        }}>
        <input
          type="file"
          accept="application/zip,application/x-zip-compressed,.zip"
          id="import-input"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
        {data !== null && data[view.index] && (
          <>
            <Canvas
              tool={tool}
              imageFile={data[view.index].file}
              toolbarHeight={toolbarHeight}
              lastAngleTool={data[view.index].lastSelectedAngleTool}
              angles={getCurrentAngle() || ({} as Angles)}
              curIndex={view.index}
              download={download}
              setDownload={setDownload}
              isFlipped={data[view.index].isFlipped}
              setPoints={setPoints}
              points={getCurrentAnglePoints() || []}
              stageRef={stageRef}
              handlePhotoAngleValues={handleCanvasPhotoAngleValues}
              brightness={data[view.index].brightness ?? 100}
              contrast={data[view.index].contrast ?? 100}
            />
          </>
        )}
        <FileDragNDrop
          setFiles={handleIncomingFiles}
          disabled={data !== null}
          open={tool === "file"}
        />
      </div>
      {zipDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-4">
            <h3 className="mb-2 text-lg font-bold">Preparing ZIP file...</h3>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full w-full bg-blue-500 transition-all duration-300"
                style={{ width: `${zipProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {pendingFiles && pendingImageSize && (
        <CropModal
          file={pendingFiles[0]}
          imageSize={pendingImageSize}
          fileCount={pendingFiles.length}
          onConfirm={handleCropConfirm}
          onSkip={handleCropSkip}
        />
      )}
      <Toaster />
    </div>
  );
}

export default App;
