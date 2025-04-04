import { cn } from "@/lib/utils";
import { UploadIcon } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface FileDragNDropProps {
  setFiles: (files: File[]) => void;
  disabled: boolean;
  open: boolean;
}

const FileDragNDrop = ({ setFiles, disabled, open }: FileDragNDropProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const imageFiles = acceptedFiles.filter((file) => {
        return file.type.startsWith("image/");
      });
      setFiles(imageFiles);
    },
    [setFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/gif": [],
      "image/bmp": [],
      "image/webp": [],
    },
    noDragEventsBubbling: true,
  });

  return (
    <>
      {!disabled && !open && (
        <div
          {...getRootProps()}
          className="w-screen-dvw h-screen-dvw top-0 left-0 right-0 bottom-0 absolute"
        >
          <input {...getInputProps()} className="w-full h-full" />
          <div className="w-full h-full flex items-center justify-center">
            <div
              className={cn(
                "rounded-2xl p-10 bg-card shadow-xl flex items-center justify-center flex-col ease-in-out duration-200 transition-all",
                isDragActive ? "scale-100" : "scale-0"
              )}
            >
              <UploadIcon width={150} height={150} />
              <p>We are holding the photos</p>
              <p className="text-italic">You can drop them here</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileDragNDrop;
