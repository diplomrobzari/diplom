'use client';

import { useMemo, useRef, useState } from "react";

type Props = {
  imageUrl: string;
  fileName: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
  busy?: boolean;
};

const CROP_SIZE = 320;
const OUTPUT_SIZE = 512;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function AvatarCropModal({
  imageUrl,
  fileName,
  onCancel,
  onConfirm,
  busy = false,
}: Props) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const baseScale = useMemo(() => {
    return Math.max(CROP_SIZE / naturalSize.width, CROP_SIZE / naturalSize.height);
  }, [naturalSize.height, naturalSize.width]);

  const displayScale = baseScale * zoom;
  const displayWidth = naturalSize.width * displayScale;
  const displayHeight = naturalSize.height * displayScale;
  const maxOffsetX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
  const maxOffsetY = Math.max(0, (displayHeight - CROP_SIZE) / 2);

  const setClampedOffset = (nextX: number, nextY: number) => {
    setOffset({
      x: clamp(nextX, -maxOffsetX, maxOffsetX),
      y: clamp(nextY, -maxOffsetY, maxOffsetY),
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!loaded || busy) return;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    setClampedOffset(dragStartRef.current.offsetX + deltaX, dragStartRef.current.offsetY + deltaY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current) {
      dragStartRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleZoomChange = (nextZoom: number) => {
    setZoom(nextZoom);
    setOffset((prev) => ({
      x: clamp(prev.x, -Math.max(0, (naturalSize.width * baseScale * nextZoom - CROP_SIZE) / 2), Math.max(0, (naturalSize.width * baseScale * nextZoom - CROP_SIZE) / 2)),
      y: clamp(prev.y, -Math.max(0, (naturalSize.height * baseScale * nextZoom - CROP_SIZE) / 2), Math.max(0, (naturalSize.height * baseScale * nextZoom - CROP_SIZE) / 2)),
    }));
  };

  const createCroppedBlob = async () => {
    const image = imageRef.current;
    if (!image) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;

    const left = (CROP_SIZE - displayWidth) / 2 + offset.x;
    const top = (CROP_SIZE - displayHeight) / 2 + offset.y;
    const sourceX = clamp(-left / displayScale, 0, naturalSize.width);
    const sourceY = clamp(-top / displayScale, 0, naturalSize.height);
    const sourceSize = Math.min(naturalSize.width - sourceX, naturalSize.height - sourceY, CROP_SIZE / displayScale);

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (blob) {
      await onConfirm(blob);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-[#7D39EB]">Обрезка аватарки</h3>
          <p className="mt-1 text-sm text-gray-600">
            Перетащите изображение и настройте масштаб. В профиль сохранится квадрат.
          </p>
          <p className="mt-1 truncate text-xs text-gray-400">{fileName}</p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex justify-center">
            <div
              className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 touch-none"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Предпросмотр аватарки"
                onLoad={(event) => {
                  setNaturalSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  });
                  setLoaded(true);
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 select-none"
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  maxWidth: "none",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 border-[3px] border-white/80 shadow-[0_0_0_9999px_rgba(17,24,39,0.35)]" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
              <span>Масштаб</span>
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
              className="w-full accent-[#7D39EB]"
              disabled={!loaded || busy}
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1" disabled={busy}>
              Отмена
            </button>
            <button type="button" onClick={createCroppedBlob} className="btn-primary flex-1" disabled={!loaded || busy}>
              {busy ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
