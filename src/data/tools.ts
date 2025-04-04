import {
  Icon,
  IconBookDownload,
  IconCaretLeft,
  IconCaretRight,
  IconDownload,
  IconFileSpreadsheet,
  IconFlipVertical,
  IconHandStop,
  IconImageInPicture,
  IconProps,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

export interface Tool {
  name: string;
  codeName: string;
  image?: string | ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>;
  children?: ChildTool[];
  disabled?: boolean;
  angle?: boolean;
  tooltip?: string;
}

export interface ChildTool {
  name: string;
  angle?: boolean;
  codeName: string;
  image?: string | ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>;
  disabled?: boolean;
  tooltip?: string;
}

const tools: Tool[] = [
  {
    name: "Drag",
    codeName: "drag",
    image: IconHandStop,
    tooltip: "Drag",
  },
  {
    name: "Front",
    codeName: "front",
    image: "front.svg",
    children: [
      {
        angle: true,
        name: "Pisa",
        codeName: "pisa",
      },
    ],
  },
  {
    name: "Side",
    codeName: "side",
    image: "side.svg",
    children: [
      {
        angle: true,
        name: "Total CC",
        codeName: "totalCC",
      },
      {
        angle: true,
        name: "Upper CC",
        codeName: "upperCC",
      },
    ],
  },
  {
    name: "Back",
    codeName: "backparent",
    image: "back.svg",
    children: [
      {
        angle: true,
        name: "Back",
        codeName: "back",
      },
    ],
  },
  {
    name: "File",
    codeName: "file",
    tooltip: "File",
    children: [
      {
        name: "Previous",
        image: IconCaretLeft,
        codeName: "previous",
        tooltip: "Previous",
      },
      {
        name: "Next",
        image: IconCaretRight,
        codeName: "next",
        tooltip: "Next",
      },
      {
        name: "Export",
        image: IconDownload,
        codeName: "export",
        tooltip: "Export",
      },
      {
        name: "Import",
        image: IconUpload,
        codeName: "import",
        tooltip: "Import",
      },
      {
        name: "Download Image",
        image: IconImageInPicture,
        codeName: "downloadImage",
        tooltip: "Download image with angles",
      },
      {
        name: "Remove Files",
        image: IconTrash,
        codeName: "removeFiles",
        tooltip: "Remove files",
      },
      {
        name: "Download Images",
        image: IconBookDownload,
        codeName: "downloadImages",
        tooltip: "Download images with angles",
      },
      {
        name: "Export Angles",
        image: IconFileSpreadsheet,
        codeName: "exportAngles",
        tooltip: "Export angles",
      },
    ],
  },
  {
    name: "Flip Photo",
    image: IconFlipVertical,
    codeName: "flip",
    tooltip: "Flip photo",
  },
];

export default tools;
