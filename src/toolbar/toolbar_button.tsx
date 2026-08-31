import { Tool } from "@/data/tools";
import { cn } from "@/lib/utils";
import { basePath } from "@/base-path";

interface ToolbarButtonProps {
  tool: Tool;
  onClickOpen: (codeName: string) => void;
  onClickSet: (codeName: string) => void;
  isTogglable?: boolean;
  isOpen?: boolean;
  activeTool?: string;
}

const ToolbarButton = ({
  tool,
  onClickOpen,
  onClickSet,
  isOpen,
  activeTool
}: ToolbarButtonProps) => {
  return (
    <div className={cn("flex items-center justify-center", isOpen && "gap-2", activeTool === tool.codeName && "border-b-2")}>
      {!tool.hideTool && <button
        className={cn(
          "p-1 cursor-pointer transition-opacity hover:opacity-50",
          tool.disabled && "cursor-not-allowed opacity-50 hover:opacity-50"
        )}
        onClick={() => {
          if (!tool.children) {
            onClickSet(tool.codeName);
          } else {
            onClickOpen(tool.codeName);
          }
        }}
        title={tool.tooltip}>
        {typeof tool.image === "string" ? (
          <img
            src={`${basePath}assets/${tool.image}`}
            alt={`${tool.name}`}
            width={tool.imageSize ?? 24}
            height={tool.imageSize ?? 24}
          />
        ) : tool.image ? (
          tool.image && <tool.image width={30} height={30} stroke={1.5} />
        ) : (
          tool.name
        )}
      </button>}
      {tool.children && (
        <div
          className="flex gap-2 overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            maxWidth: isOpen ? "1000px" : "0",
            opacity: isOpen ? 1 : 0,
          }}>
          {tool.children.map((childTool) => (
            <button
              key={childTool.codeName}
              className={cn(
                "text-nowrap",
                childTool.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer transition-opacity hover:opacity-50",
                activeTool === childTool.codeName && "border-b-2"
              )}
              onClick={() => {
                childTool.disabled ? null : onClickSet(childTool.codeName);
              }}
              title={childTool.tooltip}>
              {typeof childTool.image === "string" ? (
                <img
                  src={`${basePath}assets/${childTool.image}`}
                  alt={`${childTool.name}`}
                  width={24}
                  height={24}
                />
              ) : childTool.image ? (
                childTool.image && <childTool.image width={30}
                  stroke={1.5}
                  className={cn(activeTool === childTool.codeName && "my-1")}
                  height={30} />
              ) : (
                childTool.name
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolbarButton;
