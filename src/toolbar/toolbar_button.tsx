import { Tool } from "@/data/tools";
import { cn } from "@/lib/utils";

interface ToolbarButtonProps {
  tool: Tool;
  onClickOpen: (codeName: string) => void;
  onClickSet: (codeName: string) => void;
  isOpen?: boolean;
}

const ToolbarButton = ({
  tool,
  onClickOpen,
  onClickSet,
  isOpen,
}: ToolbarButtonProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className="p-1"
        onClick={() => {
          if (!tool.children) {
            onClickSet(tool.codeName);
          } else {
            onClickOpen(tool.codeName);
          }
        }}
        title={tool.tooltip}
      >
        {typeof tool.image === "string" ? (
          <img
            src={`/assets/${tool.image}`}
            alt={`${tool.name}`}
            width={24}
            height={24}
          />
        ) : tool.image ? (
          tool.image && <tool.image width={30} height={30} stroke={1.5} />
        ) : (
          tool.name
        )}
      </button>
      {tool.children && (
        <div
          className="flex gap-2 overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            maxWidth: isOpen ? "1000px" : "0",
            opacity: isOpen ? 1 : 0,
          }}
        >
          {tool.children.map((childTool) => (
            <button
              key={childTool.codeName}
              className={cn(
                "text-nowrap",
                childTool.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => {
                childTool.disabled ? null : onClickSet(childTool.codeName);
              }}
              title={childTool.tooltip}
            >
              {typeof childTool.image === "string" ? (
                <img
                  src={`/assets/${childTool.image}`}
                  alt={`${childTool.name}`}
                  width={24}
                  height={24}
                />
              ) : childTool.image ? (
                childTool.image && <childTool.image width={24} height={24} />
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
