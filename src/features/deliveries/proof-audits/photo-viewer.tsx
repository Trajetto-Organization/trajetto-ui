"use client";

import { useState } from "react";

import {
  ImageOff,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface ProofPhotoViewerProps {
  url: string | null;
  alt: string;
}

const ZOOM_STEPS = [1, 1.5, 2, 3];

/**
 * The receipt photo, with the two controls that decide whether a person can
 * actually judge it.
 *
 * Rotation first, because it is the one that matters most and is easiest to
 * overlook: a driver photographs a receipt lying on a truck seat, and the
 * picture arrives sideways. A reviewer squinting at a rotated signature
 * approves things they cannot read, which is the exact failure the queue
 * exists to prevent.
 *
 * Zoom in fixed steps rather than a pinch or a slider: the decision is "can I
 * read the signature", and three presses that land on 3× beat a continuous
 * control that has to be aimed.
 */
const ProofPhotoViewer = ({
  url,
  alt,
}: ProofPhotoViewerProps): JSX.Element => {
  const [rotation, setRotation] = useState<number>(0);
  const [zoomIndex, setZoomIndex] = useState<number>(0);

  if (!url) {
    return (
      <div
        className="flex h-64 flex-col items-center justify-center gap-2
        rounded-lg border-2 border-dashed text-muted-foreground"
      >
        <ImageOff className="h-8 w-8" />
        <p className="text-sm">A foto deste comprovante não está disponível.</p>
      </div>
    );
  }

  const zoom = ZOOM_STEPS[zoomIndex];

  return (
    <div className="space-y-2">
      <div className="relative h-64 overflow-auto rounded-lg border bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          style={{
            transform: `rotate(${rotation}deg) scale(${zoom})`,
            transformOrigin: "center center",
          }}
          className="mx-auto h-full object-contain transition-transform"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRotation((current) => (current + 90) % 360)}
          className="gap-2"
        >
          <RotateCw className="h-4 w-4" />
          Girar
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={zoomIndex === 0}
          onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
          {zoom}×
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={zoomIndex === ZOOM_STEPS.length - 1}
          onClick={() =>
            setZoomIndex((current) =>
              Math.min(ZOOM_STEPS.length - 1, current + 1),
            )
          }
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline underline-offset-2 text-muted-foreground
          hover:text-foreground"
        >
          Abrir em tamanho real
        </a>
      </div>
    </div>
  );
};

export { ProofPhotoViewer, ZOOM_STEPS };
