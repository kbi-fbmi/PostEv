import {
  Icon,
  IconBodyScan,
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
  hideTool?: boolean;
  groupToggle?: boolean;
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
    name: "Photo manipulation",
    codeName: "photomanipulation",
    hideTool: true,
    children: [
      {
        name: "Drag",
        codeName: "drag",
        image: IconHandStop,
        tooltip: "Drag",
      },
      {
        name: "Flip Photo",
        image: IconFlipVertical,
        codeName: "flip",
        tooltip: "Flip photo",
      },
    ],
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
        tooltip: "Trunk lateral flexion",
      },
    ],
    groupToggle: true,
  },
  {
    name: "Side",
    codeName: "side",
    image: "side.svg",
    children: [
      {
        angle: true,
        name: "TotalCC",
        tooltip: "Total trunk anteflexion",
        codeName: "totalCC",
      },
      {
        angle: true,
        name: "UpperCC",
        tooltip: "Upper trunk anteflexion",
        codeName: "upperCC",
      },
    ],
    groupToggle: true,
  },
  {
    name: "Back",
    codeName: "backparent",
    image: "back.svg",
    children: [
      {
        angle: true,
        name: "Back",
        tooltip: "Posterior trunk lateral flexion",
        codeName: "back",
      },
    ],
    groupToggle: true,
  },
  {
    name: "PhotoSwitch",
    codeName: "photoswitch",
    hideTool: true,
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
    ],
  },
  {
    name: "XRAY",
    codeName: "xray",
    image: IconBodyScan,
    groupToggle: true,
    children: [
      {
        angle: true,
        name: "ApVrt",
        codeName: "apicalVertebra",
        tooltip: "Apical Vertebra (Cobb angle)",
      },
      {
        angle: true,
        name: "CorBl",
        codeName: "coronalBalance",
        tooltip: "Coronal Balance",
      },
      {
        angle: true,
        name: "SagBl",
        codeName: "sagittalBalance",
        tooltip: "Sagittal Balance",
      },
      {
        angle: true,
        name: "ThSAl",
        codeName: "thoricalSagittalAlignment",
        tooltip: "Thorical Sagittal Alignment",
      },
      {
        angle: true,
        name: "ThLmb",
        codeName: "thoracolumbar",
        tooltip: "Thoracolumbar",
      },
      {
        angle: true,
        name: "Cobb",
        codeName: "cebb",
        tooltip: "Cobb",
      },
    ],
  },
  {
    name: "ImportExport",
    codeName: "importexport",
    hideTool: true,
    children: [
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
    ],
  },
  {
    name: "LoadedFilemanagment",
    codeName: "lfmanagment",
    hideTool: true,
    children: [
      {
        name: "Download Image",
        image: IconImageInPicture,
        codeName: "downloadImage",
        tooltip: "Download image with angles",
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
    name: "Remove Files",
    image: IconTrash,
    codeName: "removeFiles",
    tooltip: "Remove files",
  },
];

export default tools;
