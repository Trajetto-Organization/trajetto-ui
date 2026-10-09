"use client";

import { cn } from "@/lib/utils";
import React from "react";

import { useSharedLayout } from "@/hooks/use-shared-layout";
import { Upload } from "lucide-react";

import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";

import type { FileUploadProps } from "./file-upload.types";

import { ZoomIn, ZoomOut } from "lucide-react";
import { useFileUpload } from "./hooks";

const FileUpload = ({
  onChange,
  singleFile = false,
  maxSize,
  accept = "image/*",
  enableCrop = false,
  onCropComplete,
  onCropStateChange,
  croppedBlob,
  UploadButton,
  BackButton,
  onBackToUpload,
  onGenerateCropReady,
}: FileUploadProps): JSX.Element => {
  const {
    crop,
    zoom,
    getRootProps,
    handleClick,
    handleInternalBackToUpload,
    isDragActive,
    onCropChange,
    onCropCompleteCallback,
    onZoomChange,
    showCrop,
    showFileInfo,
    fileInputRef,
    handleFileChange,
    files,
    imageSrc,
    setZoom,
  } = useFileUpload({
    accept,
    enableCrop,
    maxSize,
    singleFile,
    onChange,
    onCropComplete,
    onCropStateChange,
    onBackToUpload,
    onGenerateCropReady,
    croppedBlob,
  });

  return (
    <div
      className={cn(
        "w-full h-full",
        showCrop ? "space-y-6" : "flex items-center justify-center",
      )}
    >
      {/* File Upload Area - Hide when showing crop */}
      {!showCrop && (
        <div
          {...getRootProps()}
          className="w-full h-full flex items-center justify-center"
        >
          <div
            onClick={handleClick}
            className="pt-[3.1rem] pb-14 px-6 group/file block rounded-lg
            cursor-pointer w-full relative overflow-hidden"
          >
            <input
              ref={fileInputRef}
              id="file-upload-handle"
              type="file"
              accept={accept}
              multiple={!singleFile}
              onChange={(e) =>
                handleFileChange(Array.from(e.target.files || []))
              }
              className="hidden"
            />
            <div
              className="absolute inset-0 
              [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"
            >
              <GridPattern />
            </div>
            <div className="flex flex-col items-center justify-center">
              <p
                className="relative z-20 font-sans font-bold 
                text-neutral-700 dark:text-neutral-300 text-xl"
              >
                Upload de Avatar
              </p>
              <p
                className="relative z-20 font-sans font-normal 
              text-neutral-400 dark:text-neutral-400 text-base mt-2"
              >
                Arraste ou solte seus arquivos aqui
              </p>
              {maxSize && (
                <p
                  className="relative z-20 font-sans font-normal 
                  text-neutral-500 dark:text-neutral-500 text-sm mt-4"
                >
                  Tamanho máximo: {maxSize}MB
                </p>
              )}
              <div className="relative w-full mt-10 max-w-xl mx-auto">
                {!enableCrop &&
                  files.length > 0 &&
                  files.map((file, idx) => (
                    <FileCard
                      key={"file" + idx}
                      sharedId={
                        idx === 0 ? "file-upload" : "file-upload-" + idx
                      }
                      className={cn(
                        "relative overflow-hidden z-40 bg-white dark:bg-neutral-900 flex flex-col items-start justify-start md:h-24 p-4 mt-4 w-full mx-auto rounded-md",
                        "shadow-sm",
                      )}
                    >
                      <div
                        className="flex justify-between 
                        w-full items-center gap-4"
                      >
                        <p
                          className="animate-fade-in text-base text-foreground 
                          dark:text-neutral-300 truncate max-w-xs"
                        >
                          {file.name}
                        </p>
                        <p
                          className="animate-fade-in rounded-lg px-2 py-1 w-fit shrink-0 
                          text-sm text-neutral-600 dark:bg-neutral-800 
                          dark:text-white shadow-input"
                        >
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>

                      <div
                        className="flex text-sm md:flex-row flex-col items-start 
                        md:items-center w-full mt-2 justify-between 
                        text-neutral-600 dark:text-neutral-400"
                      >
                        <p
                          className="animate-fade-in px-1 py-0.5 rounded-md 
                          bg-gray-100 dark:bg-neutral-800"
                        >
                          {file.type}
                        </p>

                        <p className="animate-fade-in">
                          modified{" "}
                          {new Date(file.lastModified).toLocaleDateString(
                            "pt-BR",
                          )}
                        </p>
                      </div>
                    </FileCard>
                  ))}
                {!showFileInfo && (
                  <DropBox
                    sharedId="file-upload"
                    // The wrapper carries the hover offset so the card is free
                    // to keep its own transform for the shared-layout FLIP.
                    wrapperClassName={cn(
                      "hover-peek relative z-40 mt-4 w-full max-w-[8rem] mx-auto",
                      "group-hover/file:translate-x-5 group-hover/file:-translate-y-5 group-hover/file:opacity-90",
                    )}
                    className={cn(
                      "relative group-hover/file:shadow-2xl bg-white dark:bg-neutral-900 flex items-center justify-center h-32 w-full rounded-md",
                      "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]",
                    )}
                  >
                    {isDragActive ? (
                      <p
                        className="animate-fade-in text-muted-foreground flex 
                        flex-col items-center"
                      >
                        Soltar
                        <Upload
                          className="h-4 w-4 text-muted-foreground 
                          dark:text-neutral-400"
                        />
                      </p>
                    ) : (
                      <Upload
                        className="h-4 w-4 text-muted-foreground
                        dark:text-neutral-300"
                      />
                    )}
                  </DropBox>
                )}

                {!showFileInfo && (
                  <div
                    className="absolute opacity-0 group-hover/file:opacity-100
                    transition-opacity duration-200 border border-dashed
                    border-sky-400 inset-0 z-30 bg-transparent flex items-center
                    justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crop Section - Replaces upload area */}
      {showCrop && (
        <>
          <div
            className="relative w-full h-[400px] 
            bg-muted rounded-lg overflow-hidden"
          >
            <Cropper
              image={imageSrc as string}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteCallback}
              onZoomChange={onZoomChange}
            />
          </div>

          {/* Zoom Slider */}
          <div className="space-y-2">
            <div
              className="flex items-center justify-between 
              text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <ZoomOut className="w-4 h-4" />
                <span>Zoom</span>
              </div>
              <ZoomIn className="w-4 h-4" />
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* File Information */}
          {files[0] && (
            <div
              className={cn(
                "animate-fade-up",
                "relative overflow-hidden bg-white dark:bg-neutral-900 flex flex-col items-start justify-start p-4 w-full rounded-md border",
                "shadow-sm",
              )}
            >
              <div className="flex justify-between w-full items-center gap-4">
                <p
                  className="animate-fade-in text-base text-foreground 
                  dark:text-neutral-300 truncate max-w-xs"
                >
                  {files[0].name}
                </p>
                <p
                  className="animate-fade-in rounded-lg px-2 py-1 w-fit shrink-0 
                  text-sm text-neutral-600 dark:bg-neutral-800 
                  dark:text-white shadow-input"
                >
                  {(files[0].size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>

              <div
                className="flex text-sm md:flex-row flex-col items-start 
                md:items-center w-full mt-2 justify-between 
                text-neutral-600 dark:text-neutral-400"
              >
                <p
                  className="animate-fade-in px-1 py-0.5 rounded-md 
                  bg-gray-100 dark:bg-neutral-800"
                >
                  {files[0].type}
                </p>

                <p className="animate-fade-in">
                  modified{" "}
                  {new Date(files[0].lastModified).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          )}

          {/* Hidden input for cropped blob */}
          {croppedBlob && (
            <input
              type="hidden"
              name="avatar"
              value="cropped-blob-placeholder"
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {BackButton &&
              React.cloneElement(BackButton as React.ReactElement, {
                onClick: handleInternalBackToUpload,
              })}
            {UploadButton}
          </div>
        </>
      )}
    </div>
  );
};

function GridPattern(): JSX.Element {
  const columns = 41;
  const rows = 11;

  return (
    <div
      className="flex bg-gray-100 dark:bg-neutral-900 
      shrink-0 flex-wrap justify-center items-center 
      gap-x-px gap-y-px scale-105"
    >
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 dark:bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        }),
      )}
    </div>
  );
}

export { FileUpload };

interface SharedBoxProps {
  sharedId: string;
  className?: string;

  // Applied to an outer element when the box needs a transform of its own —
  // the box itself cannot carry one, since the FLIP owns its transform.
  wrapperClassName?: string;
  children?: React.ReactNode;
}

/**
 * The two halves of the old `layoutId="file-upload"` pair.
 *
 * They are never mounted at the same time: the drop box shows while there is
 * no file, the card shows once there is one. `useSharedLayout` remembers the
 * box of whichever rendered last and morphs the new one out of it — the same
 * FLIP that framer-motion's `layoutId` performs, in about forty lines.
 */
const DropBox = ({
  sharedId,
  className,
  wrapperClassName,
  children,
}: SharedBoxProps) => {
  const ref = useSharedLayout<HTMLDivElement>(sharedId);

  return (
    <div className={wrapperClassName}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </div>
  );
};

const FileCard = ({ sharedId, className, children }: SharedBoxProps) => {
  const ref = useSharedLayout<HTMLDivElement>(sharedId);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};
