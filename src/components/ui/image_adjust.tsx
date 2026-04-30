import { useState } from "react";
import { IconAdjustments } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ImageAdjustProps {
  brightness: number;
  contrast: number;
  onChange: (brightness: number, contrast: number) => void;
  disabled?: boolean;
}

export function ImageAdjust({
  brightness,
  contrast,
  onChange,
  disabled,
}: ImageAdjustProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          className="h-8 w-8"
          size="icon"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          <IconAdjustments size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Brightness</span>
              <span className="tabular-nums">{brightness}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={brightness}
              onChange={(e) => onChange(Number(e.target.value), contrast)}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Contrast</span>
              <span className="tabular-nums">{contrast}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={contrast}
              onChange={(e) => onChange(brightness, Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onChange(100, 100)}
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
