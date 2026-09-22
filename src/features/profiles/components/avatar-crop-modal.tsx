"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface AvatarCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onApply: (croppedFile: File, previewUrl: string) => void;
  onClose: () => void;
}

const VIEWPORT_SIZE = 280; // 280x280 square viewport
const OUTPUT_SIZE = 400; // 400x400 output canvas size

export function AvatarCropModal({
  isOpen,
  imageFile,
  onApply,
  onClose,
}: AvatarCropModalProps) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ pointerId: number; startX: number; startY: number; initOffsetX: number; initOffsetY: number } | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  // Clean up object URL helper
  const revokeSourceUrl = useCallback(() => {
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
  }, []);

  // Load image when imageFile changes
  useEffect(() => {
    if (!isOpen || !imageFile) {
      revokeSourceUrl();
      setSourceUrl(null);
      setNaturalSize(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const url = URL.createObjectURL(imageFile);
    activeObjectUrlRef.current = url;
    setSourceUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;

    return () => {
      revokeSourceUrl();
    };
  }, [isOpen, imageFile, revokeSourceUrl]);

  // Calculate layout dimensions
  const baseScale = naturalSize
    ? Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height)
    : 1;

  const currentScale = baseScale * zoom;
  const currentWidth = naturalSize ? naturalSize.width * currentScale : VIEWPORT_SIZE;
  const currentHeight = naturalSize ? naturalSize.height * currentScale : VIEWPORT_SIZE;

  // Maximum allowed pan to keep viewport completely covered
  const maxPanX = Math.max(0, (currentWidth - VIEWPORT_SIZE) / 2);
  const maxPanY = Math.max(0, (currentHeight - VIEWPORT_SIZE) / 2);

  // Clamp offset helper
  const clampOffset = useCallback(
    (x: number, y: number, mx: number, my: number) => ({
      x: Math.min(mx, Math.max(-mx, x)),
      y: Math.min(my, Math.max(-my, y)),
    }),
    [],
  );

  // Clamp offset whenever zoom changes
  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y, maxPanX, maxPanY));
  }, [zoom, maxPanX, maxPanY, clampOffset]);

  // Pointer drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary button
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initOffsetX: offset.x,
      initOffsetY: offset.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const newX = dragStartRef.current.initOffsetX + dx;
    const newY = dragStartRef.current.initOffsetY + dy;

    setOffset(clampOffset(newX, newY, maxPanX, maxPanY));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current && dragStartRef.current.pointerId === e.pointerId) {
      dragStartRef.current = null;
      setIsDragging(false);
    }
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleApply = async () => {
    if (!naturalSize || !sourceUrl || isApplying) return;

    try {
      setIsApplying(true);

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Unable to create canvas rendering context");
      }

      // Calculate source bounding box from natural image
      const imageTopLeftX = (VIEWPORT_SIZE - currentWidth) / 2 + offset.x;
      const imageTopLeftY = (VIEWPORT_SIZE - currentHeight) / 2 + offset.y;

      const sourceCropX = Math.max(0, -imageTopLeftX / currentScale);
      const sourceCropY = Math.max(0, -imageTopLeftY / currentScale);
      const sourceCropSize = VIEWPORT_SIZE / currentScale;

      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = sourceUrl;
      });

      // Enable high quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        img,
        sourceCropX,
        sourceCropY,
        sourceCropSize,
        sourceCropSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );

      if (!blob) {
        throw new Error("Failed to export cropped image");
      }

      const croppedFile = new File([blob], "avatar.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      const previewUrl = URL.createObjectURL(blob);

      onApply(croppedFile, previewUrl);
      revokeSourceUrl();
      onClose();
    } catch (err) {
      console.error("Avatar crop error:", err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md p-6 sm:p-7">
        <DialogHeader>
          <DialogTitle>Crop Profile Photo</DialogTitle>
          <DialogDescription>
            Drag to reposition and zoom to choose which part appears as your avatar.
          </DialogDescription>
        </DialogHeader>

        {/* Viewport & Controls */}
        <div className="flex flex-col items-center gap-5 pt-2">
          {/* Crop Area */}
          <div
            className={`relative flex h-[280px] w-[280px] select-none items-center justify-center overflow-hidden rounded-2xl border border-border bg-neutral-950 shadow-inner ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            touch-action="none"
            title="Drag to reposition, scroll to zoom"
          >
            {sourceUrl && naturalSize && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imageRef}
                src={sourceUrl}
                alt="Source preview"
                draggable={false}
                style={{
                  width: `${currentWidth}px`,
                  height: `${currentHeight}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                className="max-w-none select-none will-change-transform"
              />
            )}

            {/* Circular Mask Overlay */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 280 280"
              aria-hidden="true"
            >
              <defs>
                <mask id="discora-avatar-crop-mask">
                  <rect width="280" height="280" fill="white" />
                  <circle cx="140" cy="140" r="136" fill="black" />
                </mask>
              </defs>
              <rect
                width="280"
                height="280"
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#discora-avatar-crop-mask)"
              />
              <circle
                cx="140"
                cy="140"
                r="136"
                fill="none"
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            </svg>
          </div>

          {/* Controls Bar: Zoom slider and reset */}
          <div className="flex w-full max-w-[280px] flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
                disabled={zoom <= 1}
                aria-label="Zoom out"
                className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 cursor-pointer"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                aria-label="Avatar zoom level"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-muted accent-primary focus:outline-none"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
                disabled={zoom >= 3}
                aria-label="Zoom in"
                className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 cursor-pointer"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleReset}
                title="Reset zoom and position"
                aria-label="Reset zoom and position"
                className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              <span>Drag image to center</span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying || !naturalSize}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {isApplying ? "Applying..." : "Apply Crop"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
