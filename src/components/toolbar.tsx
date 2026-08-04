import { cn } from "@/lib/utils";
import { useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import ToolbarButton from "@/toolbar/toolbar_button";
import { Tool } from "@/data/tools";
import { useAppStore } from "@/store";
import { ColorPicker } from "./ui/color_picker";
import { ImageAdjust } from "./ui/image_adjust";
import { IconCrop } from "@tabler/icons-react";

interface ToolbarProps {
  className?: string;
  setTool: (tool: string) => void;
  tool: string;
  tools: Tool[];
}

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, tool, setTool, tools }, ref) => {
    const [isOpen, setIsOpen] = useState<string | null>(null);
    const { lineColor, setLineColor, data, view, setImageAdjust } = useAppStore();
    const navigate = useNavigate();

    const photoManipulationTools = tools.find((t) => t.codeName === "photomanipulation")
    const photoSwitch = tools.find((t) => t.codeName === "photoswitch")
    const importExport = tools.find((t) => t.codeName === "importexport")
    const loadedFilemanagment = tools.find((t) => t.codeName === "lfmanagment")
    const removeFiles = tools.find((t) => t.codeName === "removeFiles")
    const xrayTools = tools.find((t) => t.codeName === "xray")

    const measuringTools = tools.filter(
      (t) =>
        t.codeName !== "photomanipulation" && t.codeName !== "photoswitch" && t.codeName !== "importexport" && t.codeName !== "lfmanagment" && t.codeName !== "removeFiles" && t.codeName !== "xray"
    );

    return (
      <div ref={ref} className={cn("flex justify-center", className)}>
        <div className="relative w-screen-dvw flex items-center justify-center overflow-hidden bg-card p-2 shadow-xl transition-all duration-200 ease-in-out">
          <div className="flex min-w-max items-center justify-center">
            {photoManipulationTools && (
              <div className="flex items-center">
                <ToolbarButton
                  key={photoManipulationTools.codeName}
                  tool={photoManipulationTools}
                  onClickOpen={() => { }}
                  onClickSet={setTool}
                  isOpen={true}
                  activeTool={tool}
                />
              </div>
            )}

            <div className="mx-4 h-8 w-[1px] bg-border" />
            {measuringTools.map((mainTool) => {

              return (
                <div
                  key={mainTool.codeName}
                  className={cn(
                    "flex mr-2 items-center overflow-hidden transition-all duration-300 ease-in-out max-w-[400px] opacity-100 "
                  )}>
                  <ToolbarButton
                    tool={mainTool}
                    onClickOpen={(codeName) => {
                      setIsOpen(isOpen === codeName ? null : codeName);
                    }}
                    onClickSet={setTool}
                    isOpen={isOpen === mainTool.codeName}
                    activeTool={tool}
                  />
                </div>
              );
            })}
            <div className="mx-4 h-8 w-[1px] bg-border" />

            {xrayTools && (
              <div className={cn("flex items-center overflow-hidden transition-all duration-300 ease-in-out max-w-[400px] opacity-100", isOpen === xrayTools.codeName && "mr-2")}>
                <ToolbarButton
                  key={xrayTools.codeName}
                  tool={xrayTools}
                  onClickOpen={(codeName) => {
                    setIsOpen(isOpen === codeName ? null : codeName);
                  }}
                  onClickSet={setTool}
                  isOpen={isOpen === xrayTools.codeName}
                  activeTool={tool}
                />
              </div>
            )}

            <div className="mx-4 h-8 w-[1px] bg-border" />

            {photoSwitch && (
              <div className="flex items-center">
                <ToolbarButton
                  key={photoSwitch.codeName}
                  tool={photoSwitch}
                  onClickOpen={() => { }}
                  onClickSet={setTool}
                  isOpen={true}
                  activeTool={tool}
                />
              </div>
            )}

            <div className="mx-4 h-8 w-[1px] bg-border" />

            {importExport && (
              <div className="flex items-center">
                <ToolbarButton
                  key={importExport.codeName}
                  tool={importExport}
                  onClickOpen={() => { }}
                  onClickSet={setTool}
                  isOpen={true}
                  activeTool={tool}
                />
              </div>
            )}

            <div className="mx-4 h-8 w-[1px] bg-border" />

            <button
              title="Preprocess"
              onClick={() => navigate("/preprocess")}
              className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-accent">
              <IconCrop size={18} />
            </button>

            <div className="mx-4 h-8 w-[1px] bg-border" />

            {loadedFilemanagment && (
              <div className="flex items-center">
                <ToolbarButton
                  key={loadedFilemanagment.codeName}
                  tool={loadedFilemanagment}
                  onClickOpen={() => { }}
                  onClickSet={setTool}
                  isOpen={true}
                  activeTool={tool}
                />
              </div>
            )}

            <div className="mx-4 h-8 w-[1px] bg-border/40" />
            {removeFiles && (
              <div className="flex items-center">
                <ToolbarButton
                  key={removeFiles.codeName}
                  tool={removeFiles}
                  onClickOpen={() => { }}
                  onClickSet={setTool}
                  isOpen={true}
                  activeTool={tool}
                />
              </div>
            )}
            <div className="mx-4 h-8 w-[1px] bg-border/40" />
            <div className="flex items-center gap-2">
              <ImageAdjust
                brightness={data?.[view.index]?.brightness ?? 100}
                contrast={data?.[view.index]?.contrast ?? 100}
                onChange={setImageAdjust}
                disabled={!data}
              />
              <ColorPicker
                value={lineColor}
                onChange={setLineColor}
                className="h-8 w-8"
              />
            </div>
          </div>

          {data !== null && data[view.index] && (
            <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-end gap-1 pr-2 text-right text-sm leading-none">
              <div className="max-w-[200px] truncate">
                {data[view.index].file.name.split(".").slice(0, -1).join(".")}
              </div>

              <div className="whitespace-nowrap">
                <span className="mr-1">Angle:</span>
                {data[view.index].lastSelectedAngleTool || "None"}
              </div>

              <div>
                {view.index + 1} /{" "}
                <span className="font-bold">{data.length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default Toolbar;
