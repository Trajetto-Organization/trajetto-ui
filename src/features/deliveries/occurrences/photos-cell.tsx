"use client";

import { useState } from "react";
import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OccurrencePhotosCellProps {
  photos: string[];
  occurrenceTypeName: string;
}

/**
 * Thumbnails opening the same lightbox the detail dialog uses — never a
 * new tab: the signed URLs expire and the manager stays in context.
 */
const OccurrencePhotosCell = ({
  photos,
  occurrenceTypeName,
}: OccurrencePhotosCellProps): JSX.Element => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (photos.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <>
      <div className="flex w-24 flex-wrap gap-1">
        {photos.map((photoUrl, index) => (
          <button
            key={index}
            type="button"
            className="cursor-pointer"
            onClick={() => setPreviewUrl(photoUrl)}
          >
            <img
              src={photoUrl}
              alt={`Foto ${index + 1} da ocorrência`}
              className="h-10 w-10 rounded border object-cover"
            />
          </button>
        ))}
      </div>

      {previewUrl && (
        <Dialog
          open={previewUrl !== null}
          onOpenChange={(open) => !open && setPreviewUrl(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Foto da ocorrência</DialogTitle>
              <DialogDescription>{occurrenceTypeName}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <Image
                src={previewUrl}
                alt="Foto da ocorrência"
                width={800}
                height={600}
                className="max-w-full max-h-96 rounded-lg object-contain"
                // Signed URL — never through Next's optimizer, same rule as
                // the fuel photos.
                unoptimized
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export { OccurrencePhotosCell };
