import { useEffect, useRef, useState } from "react";
import Toolbar from "./components/toolbar";
import FileDragNDrop from "./components/file_drag_n_drop";
import Canvas from "./canvas";
import NoFiles from "./components/no_files";
import { Angles, CalculatedAngle, Point } from "./types";
import { useAppStore } from "./store";

function App() {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const disableToolsInitializedRef = useRef(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
      await handleZipImport(file);
    }
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
    <div className="w-screen-dvw h-screen-dvh relative">
      <Toolbar
        setTool={changeTool}
        tool={tool}
        ref={toolbarRef}
        className="fixed top-0 w-full z-20"
        tools={tools}
      />
      {data === null && <NoFiles />}
      <div
        style={{
          marginTop: toolbarHeight,
          height: `calc(100vh - ${toolbarHeight}px)`,
        }}
      >
        <input
          type="file"
          accept=".zip"
          id="import-input"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
        {data !== null && data[view.index] && (
          <>
            <div
              style={{
                marginTop: toolbarHeight,
              }}
              className="pr-2 p-1/2 text-right"
            >
              <div>
                <span className="font-bold">Úhel:</span>{" "}
                {data[view.index].lastSelectedAngleTool || "Žádný"}
              </div>
              <div>
                {view.index + 1}/
                <span className="font-bold">{data.length}</span>
              </div>
            </div>
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
            />
          </>
        )}
        <FileDragNDrop
          setFiles={setFiles}
          disabled={data !== null}
          open={tool === "file"}
        />
      </div>
      {zipDownload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-2">Připravuji ZIP soubor...</h3>
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="w-full h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${zipProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
