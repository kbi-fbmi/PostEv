import {
  Icon,
  IconBookDownload,
  IconCaretLeft,
  IconCaretRight,
  IconDownload,
  IconFileSpreadsheet,
  IconFlipVertical,
  IconZoomPan,
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
  /** px size for a string (SVG) icon; defaults to 24. */
  imageSize?: number;
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
        image: IconZoomPan,
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
    image: "xray.svg",
    imageSize: 34,
    groupToggle: true,
    // AP-film measurements first, then lateral-film.
    children: [
      {
        angle: true,
        name: "CorBl",
        codeName: "coronalBalance",
        tooltip: "Coronal Balance: C7 midpoint + S1 midpoint — angle vs. vertical and horizontal gap from the C7 plumb line",
      },
      {
        angle: true,
        name: "ApVrt",
        codeName: "apicalVertebra",
        tooltip: "Apical Vertebra: C7 midpoint + midpoint of the most laterally deviated thoracic vertebra — reports the horizontal gap from the C7 plumb line",
      },
      {
        angle: true,
        name: "CorCob",
        codeName: "cebb",
        tooltip: "Coronal Cobb (main curve): I-J along the upper endplate of the upper end vertebra, K-L along the upper endplate of the lower end vertebra",
      },
      {
        angle: true,
        name: "PTCob",
        codeName: "proximalThoracicCobb",
        tooltip: "Proximal Thoracic Cobb: M-N along the upper endplate of Th1, O-P along the lower endplate of Th3",
      },
      {
        angle: true,
        name: "MTCob",
        codeName: "mainThoracicCobb",
        tooltip: "Main Thoracic Cobb: Q-R along the upper endplate of Th3, S-T along the lower endplate of Th12",
      },
      {
        angle: true,
        name: "TLCob",
        codeName: "thoracolumbarCobb",
        tooltip: "Thoracolumbar Cobb: U-V along the upper endplate of Th12, W-X along the lower endplate of L4",
      },
      {
        angle: true,
        name: "SagBl",
        codeName: "sagittalBalance",
        tooltip: "Sagittal Balance: C7 midpoint + posterosuperior corner of S1 — angle vs. horizontal and horizontal gap (SVA) from the C7 plumb line",
      },
      {
        angle: true,
        name: "ThSAl",
        codeName: "thoricalSagittalAlignment",
        tooltip: "Thoracic Sagittal Alignment: A-B along the upper endplate of Th2, C-D along the lower endplate of Th12 — thoracic kyphosis",
      },
      {
        angle: true,
        name: "LSAl",
        codeName: "thoracolumbar",
        tooltip: "Lumbar Sagittal Alignment: E-F along the upper endplate of Th12, G-H along the upper endplate of S1 — lumbar lordosis",
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
