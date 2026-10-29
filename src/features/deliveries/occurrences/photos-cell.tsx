"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ImageInspector } from "../proof-audits/image-inspector";
import { occurrenceImages } from "./occurrence-images";

interface OccurrencePhotosCellProps {
  photos: string[];
  occurrenceTypeName: string;

  /** DELIVERED rows (decision 14.3): signed URL of the receipt photo. */
  receiptPhoto?: string | null;

  /** DELIVERED rows: signed URL of the on-screen signature. */
  signature?: string | null;

  /** DELIVERED rows: who received, as the driver typed it. */
  receivedBy?: string | null;
}

/**
 * Thumbnails opening the photo inspector (zoom, pan, rotation, lens) in a
 * dialog — never a new tab: the signed URLs expire and the manager stays in
 * context. A damaged box or a smudged document number has to be readable,
 * which a fixed-size preview was not (DLVB-06).
 *
 * A proof row leads with its receipt and signature, and says who received
 * (design §7.3).
 */
const OccurrencePhotosCell = ({
  photos,
  occurrenceTypeName,
  receiptPhoto,
  signature,
  receivedBy,
}: OccurrencePhotosCellProps): JSX.Element => {
  // The index, not the URL: a refresh signs every URL again, and the open
  // image (and its zoom) must survive that.
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const images = occurrenceImages({
    photos,
    receipt_photo: receiptPhoto,
    signature,
  });

  if (images.length === 0 && !receivedBy) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const preview = previewIndex === null ? null : (images[previewIndex] ?? null);

  return (
    <>
      <div className="w-24 space-y-1">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {images.map((image, index) => (
              <button
                key={index}
                type="button"
                className="cursor-pointer"
                aria-label={`Abrir ${image.label === "Canhoto" ? "o" : "a"} ${image.label.toLowerCase()} da ocorrência`}
                onClick={() => setPreviewIndex(index)}
              >
                <img
                  src={image.url}
                  alt={`${image.label} da ocorrência`}
                  className={`h-10 w-10 rounded border ${
                    image.contain ? "bg-white object-contain" : "object-cover"
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        {receivedBy && (
          <p
            className="text-xs text-muted-foreground [overflow-wrap:anywhere]"
            title={receivedBy}
          >
            Quem recebeu: {receivedBy}
          </p>
        )}
      </div>

      {preview && (
        <Dialog open onOpenChange={(open) => !open && setPreviewIndex(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{preview.label} da ocorrência</DialogTitle>
              <DialogDescription>{occurrenceTypeName}</DialogDescription>
            </DialogHeader>

            {/* A new image is a new inspection; see ImageInspector. */}
            <ImageInspector
              key={previewIndex}
              url={preview.url}
              alt={`${preview.label} da ocorrência: ${occurrenceTypeName}`}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export { OccurrencePhotosCell };
