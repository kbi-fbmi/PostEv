import { cn } from "@/lib/utils";
import { useState, forwardRef } from "react";
import ToolbarButton from "@/toolbar/toolbar_button";
import { Tool } from "@/data/tools";
import { useAppStore } from "@/store";
import { ColorPicker } from "./ui/color_picker";

interface ToolbarProps {
  className?: string;
  setTool: (tool: string) => void;
  tool: string;
  tools: Tool[];
}

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, setTool, tools }, ref) => {
    const [isOpen, setIsOpen] = useState<string | null>(null);
    const { lineColor, setLineColor } = useAppStore();

    return (
      <div ref={ref} className={cn("flex justify-center ", className)}>
        <div className="p-2 bg-card shadow-xl ease-in-out duration-200 transition-all overflow-hidden w-screen-dvw">
          <div className="flex items-center justify-center min-w-max gap-4">
            {tools.map((mainTool) => (
              <ToolbarButton
                key={mainTool.codeName}
                tool={mainTool}
                onClickOpen={setIsOpen}
                onClickSet={setTool}
                isOpen={isOpen === mainTool.codeName}
              />
            ))}
            <div className="flex items-center ml-4">
              <ColorPicker
                value={lineColor}
                onChange={setLineColor}
                className="w-8 h-8"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default Toolbar;
