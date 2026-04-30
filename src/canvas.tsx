import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import {
  Angles,
  Angle as AngleType,
  CalculatedAngle,
  Point,
  PointWithIndex,
} from "./types";
import Angle from "./canvas/angle";
import { throttle } from "lodash";

interface CanvasProps {
  imageFile: File;
  toolbarHeight: number;
  tool: string;
  angles: Angles;
  setPoints: (points: PointWithIndex[]) => void;
  download: boolean | null;
  setDownload: (download: boolean) => void;
  isFlipped: boolean;
  points: Point[];
  lastAngleTool: string | null;
  curIndex: number;
  stageRef: React.RefObject<any>;
  handlePhotoAngleValues: (calculateAngle: CalculatedAngle) => void;
  brightness?: number;
  contrast?: number;
}

const Canvas: React.FC<CanvasProps> = ({
  imageFile,
  toolbarHeight,
  tool,
  angles,
  setPoints,
  download,
  setDownload,
  isFlipped,
  points,
  lastAngleTool,
  curIndex,
  handlePhotoAngleValues,
  stageRef,
  brightness = 100,
  contrast = 100,
}) => {
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number }>(
    { width: 0, height: 0 }
  );

  const filteredImage = useMemo(() => {
    if (!image) return undefined;
    if (brightness === 100 && contrast === 100) return image;
    const offscreen = document.createElement("canvas");
    offscreen.width = image.width;
    offscreen.height = image.height;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return image;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(image, 0, 0);
    return offscreen;
  }, [image, brightness, contrast]);

  const throttledSetPoints = useMemo(
    () => throttle((points: PointWithIndex[]) => setPoints(points), 50),
    [setPoints]
  );

  useEffect(() => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageFile);

    img.onload = () => {
      setImage(img);
      setPhotoSize({ width: img.width, height: img.height });
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  useEffect(() => {
    if (!image || !stageRef.current) return;

    const stage = stageRef.current;
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight - toolbarHeight;
    const adjustedWidth = containerWidth * 0.95;
    const adjustedHeight = containerHeight * 0.95;
    const imageAspect = image.width / image.height;

    let newWidth, newHeight, newScale;

    if (adjustedWidth / adjustedHeight > imageAspect) {
      newHeight = adjustedHeight;
      newWidth = newHeight * imageAspect;
    } else {
      newWidth = adjustedWidth;
      newHeight = newWidth / imageAspect;
    }

    newScale = newWidth / image.width;

    const posX = (containerWidth - newWidth) / 2;
    const posY = (containerHeight - newHeight) / 2;

    setScale(newScale);
    setPosition({ x: posX, y: posY });

    stage.width(containerWidth);
    stage.height(containerHeight);
  }, [image, toolbarHeight, stageRef]);

  const handleWheel = useCallback(
    throttle((e) => {
      if (tool !== "drag") return;

      e.evt.preventDefault();
      const stage = e.target.getStage();
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const scaleBy = 1.05;
      const newScale =
        e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      setScale(newScale);
      setPosition({
        x: -(mousePointTo.x - pointer.x / newScale) * newScale,
        y: -(mousePointTo.y - pointer.y / newScale) * newScale,
      });
    }, 16),
    [tool]
  );

  const downloadImage = useCallback(() => {
    if (!stageRef.current || !image) return;

    const mimeType = imageFile.type || "image/png";
    const extension = mimeType.split("/")[1] || "png";
    const baseName = imageFile.name.split(".").slice(0, -1).join(".");

    const currentScale = scale;
    const currentPosition = position;
    const currentWidth = stageRef.current.width();
    const currentHeight = stageRef.current.height();

    stageRef.current.size({
      width: image.width,
      height: image.height,
    });
    stageRef.current.scale({ x: 1, y: 1 });
    stageRef.current.position({ x: 0, y: 0 });

    setTimeout(() => {
      const uri = stageRef.current.toDataURL({
        pixelRatio: 1,
        mimeType,
      });

      stageRef.current.scale({ x: currentScale, y: currentScale });
      stageRef.current.position(currentPosition);
      stageRef.current.size({
        width: currentWidth,
        height: currentHeight,
      });

      const link = document.createElement("a");
      link.download = `${baseName}.${extension}`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 50);
  }, [image, position, scale, imageFile, stageRef]);

  useEffect(() => {
    if (download) {
      downloadImage();
      setDownload(false);
    }
  }, [download, setDownload, downloadImage]);

  const handleMouseEnter = useCallback(
    (e: any) => {
      if (tool !== "drag") return;

      const container = e.target.getStage()?.container();
      if (container) {
        container.style.cursor = "grab";
      }
    },
    [tool]
  );

  const handleMouseLeave = useCallback((e: any) => {
    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = "default";
    }
  }, []);

  const AngleComponent = useMemo(() => {
    if (!angles || !lastAngleTool) return null;

    return (
      <Angle
        angle={angles[lastAngleTool as keyof Angles] as AngleType}
        points={points}
        curIndex={curIndex}
        photoMax={{ x: 100, y: 100 }}
        setPoints={throttledSetPoints}
        tool={tool}
        photoSize={photoSize}
        handlePhotoAngleValues={handlePhotoAngleValues}
        stageScale={scale}
      />
    );
  }, [
    angles,
    lastAngleTool,
    points,
    curIndex,
    throttledSetPoints,
    tool,
    scale,
    photoSize,
    handlePhotoAngleValues,
  ]);

  return (
    <Stage
      ref={stageRef}
      draggable={tool === "drag"}
      width={window.innerWidth}
      height={window.innerHeight - toolbarHeight}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      onWheel={handleWheel}
      perfectDrawEnabled={false}>
      <Layer>
        <KonvaImage
          image={filteredImage}
          scaleX={isFlipped ? -1 : 1}
          x={isFlipped ? image?.width || 0 : 0}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          listening={tool === "drag"}
          perfectDrawEnabled={false}
        />
        {AngleComponent}
      </Layer>
    </Stage>
  );
};

export default React.memo(Canvas);
