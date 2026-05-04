const DEFAULT_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type CompressionOptions = {
  maxWidth: number;
  maxHeight: number;
  maxBytes?: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось прочитать изображение."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Не удалось подготовить изображение к загрузке."));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });
}

export async function prepareImageForUpload(
  file: File,
  { maxWidth, maxHeight, maxBytes = DEFAULT_MAX_UPLOAD_BYTES }: CompressionOptions
): Promise<File> {
  if (file.type === "image/gif") {
    if (file.size > maxBytes) {
      throw new Error("GIF слишком большой. Сожмите файл или используйте JPG, PNG или WebP.");
    }

    return file;
  }

  const image = await loadImage(file);
  const initialRatio = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  let width = Math.max(1, Math.round(image.naturalWidth * initialRatio));
  let height = Math.max(1, Math.round(image.naturalHeight * initialRatio));

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Браузер не поддерживает обработку изображения.");
  }

  const mimeType = "image/webp";
  const qualities = [0.9, 0.82, 0.74, 0.66];
  let compressed: Blob | null = null;

  for (let resizeStep = 0; resizeStep < 4; resizeStep += 1) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      const candidate = await canvasToBlob(canvas, mimeType, quality);
      if (candidate.size <= maxBytes) {
        compressed = candidate;
        break;
      }
    }

    if (compressed) {
      break;
    }

    width = Math.max(1, Math.round(width * 0.85));
    height = Math.max(1, Math.round(height * 0.85));
  }

  if (!compressed) {
    throw new Error("Файл слишком большой даже после сжатия. Подготовьте изображение меньшего размера.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([compressed], `${baseName}.webp`, { type: mimeType });
}
