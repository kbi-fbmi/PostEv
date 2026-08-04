export async function cropFileRelative(
  file: File,
  crop: { x: number; y: number; w: number; h: number }
): Promise<File> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = url;
  });
  URL.revokeObjectURL(url);

  const px = Math.round(crop.x * img.width);
  const py = Math.round(crop.y * img.height);
  const pw = Math.round(crop.w * img.width);
  const ph = Math.round(crop.h * img.height);

  const canvas = document.createElement("canvas");
  canvas.width = pw;
  canvas.height = ph;
  canvas.getContext("2d")!.drawImage(img, -px, -py);

  const blob = await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), file.type || "image/png")
  );
  return new File([blob], file.name, { type: file.type || "image/png" });
}

export async function applyCropToFiles(
  files: File[],
  crop: { x: number; y: number; width: number; height: number }
): Promise<File[]> {
  return Promise.all(
    files.map(async (file) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = url;
      });
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, -crop.x, -crop.y);

      const blob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), file.type || "image/png")
      );
      const newFile = new File([blob], file.name, {
        type: file.type || "image/png",
      });
      if (file.webkitRelativePath) {
        Object.defineProperty(newFile, "webkitRelativePath", {
          value: file.webkitRelativePath,
          writable: false,
        });
      }
      return newFile;
    })
  );
}
